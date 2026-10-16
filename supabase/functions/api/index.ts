// Supercopa AFC — API da súmula no Supabase (Edge Function "api").
// Mesmas ações/respostas do Apps Script; o que ainda não foi migrado é repassado a ele.
// Deploy: Dashboard > Edge Functions > Deploy a new function > nome "api" > colar > DESLIGAR "Verify JWT".
import { createClient } from "npm:@supabase/supabase-js@2";

const APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbwwTT4C5NQ6awTRsdzl-t__mKxK0LdMlUKoPVxla43Xj5k_BsKoS5PJGIk-4wNJuDe0Kw/exec";
const PLACAR_SCRIPT = "https://script.google.com/macros/s/AKfycbznh7KfIJxIEF-aWd2TMIZ8l2XWdFoKrjU5xdo7HCRtRzYBkAL0v3AgucYRRj9b9eQH/exec";
const TZ = "America/Sao_Paulo";
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const ROW_MAP_GRUPOS: Record<string, number> = { A1: 11, A2: 12, A3: 13, B1: 23, B2: 24, B3: 25, C1: 35, C2: 36, C3: 37, D1: 47, D2: 48, D3: 49 };
const ROW_MAP_MATA: Record<string, number> = { Q1: 6, Q2: 7, Q3: 8, Q4: 9, SF1: 13, SF2: 14, FINAL: 18 };

// deno-lint-ignore no-explicit-any
type Any = any;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };
const json = (o: Any) => new Response(JSON.stringify(o), { headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });

// ── utilidades ──
function agoraStr(): string {
  const p = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g("day")}/${g("month")}/${g("year")} ${g("hour") === "24" ? "00" : g("hour")}:${g("minute")}:${g("second")}`;
}
const horaPt = () => new Date().toLocaleTimeString("pt-BR", { timeZone: TZ });
const idNorm = (s: Any) => (s || "").toString().trim().toUpperCase();
const ehTeste = (id: string) => /^TESTE/.test(idNorm(id));

function resolverJogo(id: string) {
  id = idNorm(id);
  if (ehTeste(id)) return { aba: "TESTE", linha: 0, id };
  if (ROW_MAP_GRUPOS[id]) return { aba: "Fase de Grupos", linha: ROW_MAP_GRUPOS[id], id };
  if (ROW_MAP_MATA[id]) return { aba: "Mata-Mata", linha: ROW_MAP_MATA[id], id };
  return null;
}

// ── motor do jogo (porta fiel do Apps Script) ──
const rotacionar = (arr: Any[]) => (!arr || arr.length < 2 ? arr || [] : arr.slice(1).concat([arr[0]]));
const EVENTOS_LOG_MAX = 10;

function snapshot(e: Any) {
  return {
    setAtual: e.setAtual, pontosCasa: e.pontosCasa, pontosVisitante: e.pontosVisitante, setsCasa: e.setsCasa, setsVisitante: e.setsVisitante,
    sacando: e.sacando, rotacaoCasa: e.rotacaoCasa, rotacaoVisitante: e.rotacaoVisitante, primeiroSaqueSet: e.primeiroSaqueSet,
    historicoSets: e.historicoSets, status: e.status, histN: (e.historicoPontos || []).length,
  };
}
function empurrarLog(log: Any[], e: Any) {
  log.push(snapshot(e));
  if (log.length > EVENTOS_LOG_MAX) log.splice(0, log.length - EVENTOS_LOG_MAX);
  return log;
}

function aplicarPonto(e: Any, equipe: string): boolean {
  if (equipe !== e.sacando) {
    if (equipe === "A") e.rotacaoCasa = rotacionar(e.rotacaoCasa); else e.rotacaoVisitante = rotacionar(e.rotacaoVisitante);
    e.sacando = equipe;
  }
  if (equipe === "A") e.pontosCasa++; else e.pontosVisitante++;
  e.historicoPontos = (e.historicoPontos || []).concat([{ set: e.setAtual, equipe, hora: horaPt(), pontosCasa: e.pontosCasa, pontosVisitante: e.pontosVisitante }]);
  let setFechado = false;
  const a = e.pontosCasa, b = e.pontosVisitante;
  const alvo = e.setAtual === 3 ? 15 : 25;   // CBV: 3º set decisivo vai a 15
  if ((a >= alvo || b >= alvo) && Math.abs(a - b) >= 2) {
    setFechado = true;
    e.historicoSets.push({ a, b });
    if (a > b) e.setsCasa++; else e.setsVisitante++;
    e.pontosCasa = 0; e.pontosVisitante = 0; e.setAtual++;
    e.primeiroSaqueSet = e.primeiroSaqueSet === "A" ? "B" : "A";
    e.sacando = e.primeiroSaqueSet;
    if (e.setsCasa >= 2 || e.setsVisitante >= 2) e.status = "sets_completos";
    e.horariosSets = e.horariosSets || {};
    e.horariosSets[e.setAtual] = agoraStr();
  }
  return setFechado;
}

function validarSubCbv(e: Any, equipe: string, saiu: string, entrou: string): string {
  const rot = (equipe === "A" ? e.rotacaoCasa : e.rotacaoVisitante) || [];
  const emQuadra = (n: string) => rot.some((p: Any) => p && (p.nome || "") === n);
  if (!saiu || !entrou) return "Informe quem sai e quem entra.";
  if (saiu === entrou) return "Quem sai e quem entra não podem ser a mesma pessoa.";
  if (!emQuadra(saiu)) return saiu + " não está em quadra.";
  if (emQuadra(entrou)) return entrou + " já está em quadra.";
  const subsSet = (e.substituicoes || []).filter((x: Any) => x.equipe === equipe && x.set === e.setAtual);
  if (subsSet.length >= 6) return "Limite CBV: máximo de 6 substituições por equipe por set.";
  const envolvidos = (n: string) => subsSet.filter((x: Any) => x.saiu === n || x.entrou === n).length;
  if (envolvidos(saiu) >= 2) return saiu + " já saiu e voltou neste set — não pode ser substituído(a) de novo.";
  if (envolvidos(entrou) >= 2) return entrou + " já saiu e voltou neste set — não pode entrar de novo.";
  const entrouAntes = subsSet.find((x: Any) => x.entrou === saiu);
  if (entrouAntes && entrouAntes.saiu !== entrou) return saiu + " entrou no lugar de " + entrouAntes.saiu + " — só " + entrouAntes.saiu + " pode voltar no lugar dele(a).";
  const saiuAntes = subsSet.find((x: Any) => x.saiu === entrou);
  if (saiuAntes && saiuAntes.entrou !== saiu) return entrou + " saiu para " + saiuAntes.entrou + " — só pode voltar no lugar de " + saiuAntes.entrou + ".";
  if (!entrouAntes && !saiuAntes && subsSet.some((x: Any) => x.saiu === saiu || x.entrou === entrou)) return "Troca inválida pelas regras CBV (jogador já envolvido em outra substituição neste set).";
  return "";
}

function aplicarEvento(e: Any, log: Any[], tipo: string, dd: Any): { erro?: string; setFechado?: boolean } {
  const eq = dd.equipe === "B" ? "B" : "A";
  if (tipo === "ponto") {
    if (e.status !== "em_andamento") return { erro: "Partida não está em andamento." };
    if ((e.rotacaoConfirmadaSet || 1) < e.setAtual) return { erro: "Confirme a escalação do set " + e.setAtual + " antes de pontuar." };
    empurrarLog(log, e);
    return { setFechado: aplicarPonto(e, eq) };
  }
  if (tipo === "pontoMenos") {
    if (e.status !== "em_andamento") return { erro: "Partida não está em andamento." };
    empurrarLog(log, e);
    if (eq === "A") e.pontosCasa = Math.max(0, e.pontosCasa - 1); else e.pontosVisitante = Math.max(0, e.pontosVisitante - 1);
    const hist = (e.historicoPontos || []).slice();
    for (let i = hist.length - 1; i >= 0; i--) { if (hist[i].equipe === eq) { hist.splice(i, 1); break; } }
    e.historicoPontos = hist;
    return {};
  }
  if (tipo === "timeout") {
    const ja = e.timeouts.filter((t: Any) => t.equipe === eq && t.set === e.setAtual).length;
    if (ja >= 2) return { erro: "Essa equipe já pediu os 2 tempos técnicos permitidos neste set." };
    e.timeouts.push({ equipe: eq, set: e.setAtual, hora: horaPt() });
    return {};
  }
  if (tipo === "cartao") {
    e.cartoes.push({ equipe: dd.equipe, jogador: dd.jogador || "", tipo: dd.tipo || "Amarelo", motivo: dd.motivo || "", set: e.setAtual });
    if (dd.tipo === "Vermelho" && e.status === "em_andamento") {
      empurrarLog(log, e);
      return { setFechado: aplicarPonto(e, dd.equipe === "A" ? "B" : "A") };
    }
    return {};
  }
  if (tipo === "substituicao") {
    const erro = validarSubCbv(e, dd.equipe, dd.saiu, dd.entrou);
    if (erro) return { erro };
    e.substituicoes.push({ equipe: dd.equipe, saiu: dd.saiu || "", entrou: dd.entrou || "", set: e.setAtual });
    const rot = dd.equipe === "A" ? e.rotacaoCasa : e.rotacaoVisitante;
    const idx = rot.findIndex((p: Any) => p && (p.nome || "") === dd.saiu);
    if (idx >= 0) rot[idx] = { numero: dd.numeroEntrou || "", nome: dd.entrou || "" };
    return {};
  }
  if (tipo === "definirEscalacaoSet") {
    if (e.status !== "em_andamento") return { erro: "Partida não está em andamento." };
    const rotA = (dd.rotacaoCasa || []).slice(0, 6), rotB = (dd.rotacaoVisitante || []).slice(0, 6);
    if (rotA.filter((p: Any) => p && p.nome).length < 6 || rotB.filter((p: Any) => p && p.nome).length < 6) return { erro: "Preencha as 6 posições de quadra das duas equipes." };
    e.rotacaoCasa = rotA; e.rotacaoVisitante = rotB; e.rotacaoConfirmadaSet = e.setAtual;
    if (dd.capitaoQuadraCasa) e.capitaoQuadraCasa = dd.capitaoQuadraCasa;
    if (dd.capitaoQuadraVisitante) e.capitaoQuadraVisitante = dd.capitaoQuadraVisitante;
    e.escalacoesPorSet = e.escalacoesPorSet || {};
    e.escalacoesPorSet[e.setAtual] = { rotacaoCasa: rotA, rotacaoVisitante: rotB, capitaoQuadraCasa: e.capitaoQuadraCasa, capitaoQuadraVisitante: e.capitaoQuadraVisitante };
    return {};
  }
  if (tipo === "definirCapitaoQuadra") {
    if (dd.equipe === "B") e.capitaoQuadraVisitante = dd.numero || ""; else e.capitaoQuadraCasa = dd.numero || "";
    return {};
  }
  if (tipo === "atualizarObservacoes") { e.observacoes = (dd.observacoes || "").toString(); return {}; }
  if (tipo === "removerEvento") {
    const chave = ({ timeout: "timeouts", cartao: "cartoes", substituicao: "substituicoes" } as Any)[dd.tipo];
    if (chave && e[chave] && dd.index >= 0 && dd.index < e[chave].length) e[chave].splice(dd.index, 1);
    return {};
  }
  if (tipo === "desfazer") {
    if (!log.length) return { erro: "Nada para desfazer." };
    const s = log.pop();
    e.setAtual = s.setAtual; e.pontosCasa = s.pontosCasa; e.pontosVisitante = s.pontosVisitante; e.setsCasa = s.setsCasa; e.setsVisitante = s.setsVisitante;
    e.sacando = s.sacando; e.rotacaoCasa = s.rotacaoCasa; e.rotacaoVisitante = s.rotacaoVisitante; e.primeiroSaqueSet = s.primeiroSaqueSet;
    e.historicoSets = s.historicoSets; e.status = s.status;
    e.historicoPontos = s.historicoPontos ? s.historicoPontos : (e.historicoPontos || []).slice(0, s.histN || 0);
    return {};
  }
  return { erro: "tipo inválido: " + tipo };
}

// ── persistência ──
function paraEstado(row: Any): Any {
  const e = { ...row.estado, id: row.id, status: row.status, equipeCasa: row.equipe_casa, equipeVisitante: row.equipe_visitante, linkPdf: row.link_pdf || "" };
  if (e.status === "em_andamento" && (e.setsCasa >= 2 || e.setsVisitante >= 2)) e.status = "sets_completos";
  return e;
}
async function carregar(id: string) {
  const { data, error } = await sb.from("partidas").select("*").eq("id", idNorm(id)).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// Lê → aplica → grava com controle de versão (retenta se outro aparelho gravou no meio).
async function mutar(id: string, fn: (e: Any, log: Any[]) => Any): Promise<Any> {
  for (let t = 0; t < 12; t++) {
    const row = await carregar(id);
    if (!row) return { ok: false, erro: "Partida não encontrada: " + id };
    const e = paraEstado(row);
    const log = row.log || [];
    const r = fn(e, log) || {};
    if (r.erro && !r.salvar) return { ok: false, erro: r.erro };
    e.atualizadoEm = agoraStr();
    const { id: _i, status, equipeCasa, equipeVisitante, linkPdf, ...resto } = e;
    const { data, error } = await sb.from("partidas").update({
      estado: resto, status, link_pdf: linkPdf || null, log, versao: row.versao + 1, atualizado_em: new Date().toISOString(),
    }).eq("id", row.id).eq("versao", row.versao).select("id");
    if (error) throw new Error(error.message);
    if (data && data.length) return { ok: true, estado: e, _setFechado: !!r.setFechado };
    await new Promise((res) => setTimeout(res, 15 + Math.random() * 60));
  }
  return { ok: false, erro: "Muitos aparelhos gravando ao mesmo tempo — tente de novo." };
}

async function empurrarPlacar(e: Any, final = false) {
  const j = resolverJogo(e.id);
  if (!j || j.aba === "TESTE") return;
  const hs = e.historicoSets || [];
  const numero = /^[A-D]\d$/.test(e.id) ? e.id.slice(1) : e.id;
  let vencedor = "";
  if (final) vencedor = e.setsCasa > e.setsVisitante ? e.equipeCasa : e.setsVisitante > e.setsCasa ? e.equipeVisitante : "";
  const s = (x: Any) => (x === undefined || x === null ? "" : String(x));
  const dados = [numero, e.equipeCasa, s(hs[0]?.a), s(hs[1]?.a), s(hs[2]?.a), s(e.setsCasa), "X", s(hs[0]?.b), s(hs[1]?.b), s(hs[2]?.b), s(e.setsVisitante), e.equipeVisitante, s(e.setsCasa), s(e.setsVisitante), vencedor, "", ""];
  try {
    await fetch(PLACAR_SCRIPT, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ acao: "atualizar_placar_volei", aba: j.aba, linha: j.linha, dados }) });
  } catch (_) { /* não interrompe o fluxo */ }
}

// ── ações ──
async function criarPartida(d: Any) {
  const jogo = resolverJogo(d.id);
  if (!jogo) return { ok: false, erro: "Jogo não encontrado: " + d.id };
  const saca = d.sacaPrimeiro === "B" ? "B" : "A";
  const ec = d.elencoCasa || { titulares: [], libero: null }, ev = d.elencoVisitante || { titulares: [], libero: null };
  const agora = agoraStr();
  const estado = {
    aba: jogo.aba, linha: jogo.linha, elencoCasa: ec, elencoVisitante: ev,
    arbitro1: d.arbitro1 || "", arbitro2: d.arbitro2 || "", apontador: d.apontador || "",
    setAtual: 1, pontosCasa: 0, pontosVisitante: 0, setsCasa: 0, setsVisitante: 0, sacando: saca,
    rotacaoCasa: (ec.titulares || []).slice(0, 6), rotacaoVisitante: (ev.titulares || []).slice(0, 6), primeiroSaqueSet: saca,
    historicoSets: [], timeouts: [], cartoes: [], substituicoes: [], criadoEm: agora, atualizadoEm: agora,
    capitaoCasa: d.capitaoCasa || "", capitaoVisitante: d.capitaoVisitante || "", observacoes: "", historicoPontos: [],
    capitaoQuadraCasa: d.capitaoCasa || "", capitaoQuadraVisitante: d.capitaoVisitante || "", rotacaoConfirmadaSet: 1,
    escalacoesPorSet: {}, horariosSets: { 1: agora },
  };
  const ex = await carregar(jogo.id);
  if (ex) { await sb.from("partida_eventos").delete().eq("partida_id", jogo.id); await sb.from("lotes").delete().eq("partida_id", jogo.id); }
  const { error } = await sb.from("partidas").upsert({
    id: jogo.id, aba: jogo.aba, linha: jogo.linha, equipe_casa: d.equipeA || "", equipe_visitante: d.equipeB || "",
    estado, status: "em_andamento", link_pdf: null, log: [], versao: (ex?.versao || 0) + 1, atualizado_em: new Date().toISOString(),
  });
  if (error) return { ok: false, erro: error.message };
  return { ok: true, estado: { ...estado, id: jogo.id, status: "em_andamento", equipeCasa: d.equipeA || "", equipeVisitante: d.equipeB || "", linkPdf: "" } };
}

async function acaoSimples(tipo: string, d: Any) {
  const r = await mutar(d.id, (e, log) => aplicarEvento(e, log, tipo, d));
  if (r.ok) {
    await sb.from("partida_eventos").insert({ partida_id: idNorm(d.id), tipo, dados: d });
    if (r._setFechado) await empurrarPlacar(r.estado);
  }
  delete r._setFechado;
  return r;
}

async function processarLote(d: Any) {
  const eventos: Any[] = d.eventos || [];
  const id = idNorm(d.id);
  if (d.loteId) {
    const { error } = await sb.from("lotes").insert({ partida_id: id, lote_id: String(d.loteId) });
    if (error) {
      if (error.code === "23505") {   // já processado: devolve o estado atual (reenvio após resposta perdida)
        const row = await carregar(id);
        return row ? { ok: true, estado: paraEstado(row), erros: [], processados: 0, duplicado: true } : { ok: false, erro: "Partida não encontrada: " + id };
      }
      throw new Error(error.message);
    }
  }
  const erros: Any[] = [];
  const r = await mutar(id, (e, log) => {
    erros.length = 0;
    let setFechado = false;
    eventos.forEach((ev, i) => {
      try {
        const x = aplicarEvento(e, log, ev.tipo, ev.dados || {});
        if (x.erro) erros.push({ indice: i, tipo: ev.tipo, erro: x.erro }); else if (x.setFechado) setFechado = true;
      } catch (ex) { erros.push({ indice: i, tipo: ev.tipo, erro: (ex as Error).message }); }
    });
    return { setFechado, salvar: true };
  });
  if (!r.ok) { if (d.loteId) await sb.from("lotes").delete().eq("partida_id", id).eq("lote_id", String(d.loteId)); return r; }
  if (eventos.length) await sb.from("partida_eventos").insert(eventos.map((ev) => ({ partida_id: id, lote_id: d.loteId ? String(d.loteId) : null, tipo: ev.tipo, dados: ev.dados || {} })));
  if (r._setFechado) await empurrarPlacar(r.estado);
  return { ok: true, estado: r.estado, erros, processados: eventos.length - erros.length };
}

async function finalizar(d: Any) {
  const r = await mutar(d.id, (e) => { e.status = "finalizada"; if (d.linkPdf) e.linkPdf = d.linkPdf; return {}; });
  if (r.ok) await empurrarPlacar(r.estado, true);
  delete r._setFechado;
  return r;
}
async function reabrir(d: Any) {
  const r = await mutar(d.id, (e) => {
    if (e.status !== "finalizada") return { erro: "A partida não está finalizada." };
    e.status = e.setsCasa >= 2 || e.setsVisitante >= 2 ? "sets_completos" : "em_andamento";
    return {};
  });
  delete r._setFechado;
  return r;
}
async function excluir(d: Any) {
  const id = idNorm(d.id);
  if (!(await carregar(id))) return { ok: false, erro: "Partida não encontrada: " + d.id };
  await sb.from("partidas").delete().eq("id", id);   // eventos saem em cascata
  await sb.from("lotes").delete().eq("partida_id", id);
  return { ok: true };
}

async function papel(auth: Any, aceitos: string[]) {
  try {
    const r = await fetch(APPS_SCRIPT, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ acao: "loginPainel", auth }) });
    const j = await r.json();
    if (!j.ok) return { erro: "Login inválido." };
    if (!aceitos.includes(j.papel)) return { erro: "Seu perfil não tem permissão para essa ação." };
    return { usuario: j.usuario };
  } catch (_) { return { erro: "Não foi possível validar o login." }; }
}
async function registrarWO(d: Any) {
  const c: Any = await papel(d.auth, ["admin", "organizacao"]);
  if (c.erro) return { ok: false, erro: c.erro };
  if (!d.id || !d.equipeA || !d.equipeB) return { ok: false, erro: "Jogo e equipes são obrigatórios." };
  if (await carregar(d.id)) return { ok: false, erro: 'Esse jogo já tem súmula. Use "Reabrir" se precisar corrigir.' };
  const criada = await criarPartida({ id: d.id, equipeA: d.equipeA, equipeB: d.equipeB, sacaPrimeiro: "A", elencoCasa: { titulares: [], libero: null }, elencoVisitante: { titulares: [], libero: null } });
  if (!criada.ok) return criada;
  const faltouB = d.equipeFaltou === "B";
  const faltou = faltouB ? d.equipeB : d.equipeA;
  const r = await mutar(d.id, (e) => {
    e.historicoSets = faltouB ? [{ a: 25, b: 0 }, { a: 25, b: 0 }] : [{ a: 0, b: 25 }, { a: 0, b: 25 }];
    e.setsCasa = faltouB ? 2 : 0; e.setsVisitante = faltouB ? 0 : 2; e.setAtual = 3; e.pontosCasa = 0; e.pontosVisitante = 0;
    e.status = "finalizada";
    e.observacoes = "W.O. — " + faltou + " não compareceu." + (d.motivo ? " " + d.motivo : "");
    return {};
  });
  if (r.ok) await empurrarPlacar(r.estado, true);
  delete r._setFechado;
  return r;
}

async function listar(filtro: (e: Any) => boolean, campos: string[]) {
  const { data, error } = await sb.from("partidas").select("id,status,equipe_casa,equipe_visitante,link_pdf,estado,atualizado_em").order("atualizado_em", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).filter((r: Any) => r.id && !ehTeste(r.id)).map((r: Any) => paraEstado(r)).filter(filtro).map((e: Any) => {
    const o: Any = {}; campos.forEach((c) => (o[c] = e[c])); return o;
  });
}

async function rotear(acao: string, d: Any, ehGet: boolean): Promise<Any | null> {
  switch (acao) {
    case "criarPartida": return await criarPartida(d);
    case "ponto": case "pontoMenos": case "timeout": case "cartao": case "substituicao": case "definirEscalacaoSet":
    case "definirCapitaoQuadra": case "atualizarObservacoes": case "removerEvento": return await acaoSimples(acao, d);
    case "desfazerPonto": return await acaoSimples("desfazer", d);
    case "processarEventosLote": return await processarLote(d);
    case "finalizarPartida": return await finalizar(d);
    case "reabrirPartida": return await reabrir(d);
    case "excluirPartida": return await excluir(d);
    case "registrarWO": return await registrarWO(d);
  }
  if (ehGet) {
    if (acao === "partida") { const r = await carregar(d.id || ""); return r ? { ok: true, estado: paraEstado(r) } : { ok: false, erro: "Partida não encontrada: " + d.id }; }
    if (acao === "partidasAoVivo") return { ok: true, partidas: await listar((e) => e.status === "em_andamento" || e.status === "sets_completos", ["id", "equipeCasa", "equipeVisitante", "setAtual", "pontosCasa", "pontosVisitante", "setsCasa", "setsVisitante", "historicoSets", "status"]) };
    if (acao === "partidasFinalizadas") return { ok: true, partidas: (await listar((e) => e.status === "finalizada", ["id", "equipeCasa", "equipeVisitante", "setsCasa", "setsVisitante", "historicoSets", "linkPdf", "atualizadoEm"])).reverse() };
    if (acao === "partidasTodas") return { ok: true, partidas: await listar(() => true, ["id", "equipeCasa", "equipeVisitante", "setAtual", "pontosCasa", "pontosVisitante", "setsCasa", "setsVisitante", "status", "linkPdf"]) };
    if (acao === "relatorioCartoes") {
      const { data } = await sb.from("partidas").select("id,status,equipe_casa,equipe_visitante,estado");
      const out: Any[] = [];
      (data || []).filter((r: Any) => !ehTeste(r.id)).forEach((r: Any) => (r.estado?.cartoes || []).forEach((c: Any) => out.push({
        jogo: r.id, equipe: c.equipe === "A" ? r.equipe_casa : r.equipe_visitante, adversario: c.equipe === "A" ? r.equipe_visitante : r.equipe_casa,
        set: c.set, jogador: c.jogador || "", tipo: c.tipo || "", motivo: c.motivo || "", status: r.status,
      })));
      return { ok: true, cartoes: out };
    }
  }
  return null;   // não migrado → Apps Script
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  try {
    if (req.method === "GET") {
      const q = Object.fromEntries(url.searchParams);
      const r = await rotear(q.action || "", q, true);
      if (r) return json(r);
      const p = await fetch(APPS_SCRIPT + url.search);   // repasse
      return new Response(await p.text(), { headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
    }
    const corpo = await req.text();
    const d = JSON.parse(corpo || "{}");
    const r = await rotear(d.acao || d.action || "", d, false);
    if (r) return json(r);
    const p = await fetch(APPS_SCRIPT, { method: "POST", headers: { "Content-Type": "text/plain" }, body: corpo });   // repasse
    return new Response(await p.text(), { headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
  } catch (ex) {
    return json({ ok: false, erro: (ex as Error).message });
  }
});
