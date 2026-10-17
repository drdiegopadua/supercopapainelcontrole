// Supercopa AFC — API da súmula no Supabase (Edge Function "api").
// Mesmas ações/respostas do Apps Script; o que ainda não foi migrado é repassado a ele.
// Deploy: Dashboard > Edge Functions > Deploy a new function > nome "api" > colar > DESLIGAR "Verify JWT".
import { createClient } from "npm:@supabase/supabase-js@2";

const APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbwwTT4C5NQ6awTRsdzl-t__mKxK0LdMlUKoPVxla43Xj5k_BsKoS5PJGIk-4wNJuDe0Kw/exec";
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
  await sincronizarJogo({ id: jogo.id, status: "em_andamento", setsCasa: 0, setsVisitante: 0, historicoSets: [] }, null);   // o jogo passa a "ao vivo" no site/app/TV
  return { ok: true, estado: { ...estado, id: jogo.id, status: "em_andamento", equipeCasa: d.equipeA || "", equipeVisitante: d.equipeB || "", linkPdf: "" } };
}

async function acaoSimples(tipo: string, d: Any) {
  const r = await mutar(d.id, (e, log) => aplicarEvento(e, log, tipo, d));
  if (r.ok) {
    await sb.from("partida_eventos").insert({ partida_id: idNorm(d.id), tipo, dados: d });
    if (r._setFechado) { await sincronizarJogo(r.estado); }
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
  if (r._setFechado) { await sincronizarJogo(r.estado); }
  return { ok: true, estado: r.estado, erros, processados: eventos.length - erros.length };
}

async function finalizar(d: Any) {
  const r = await mutar(d.id, (e) => { e.status = "finalizada"; if (d.linkPdf) e.linkPdf = d.linkPdf; return {}; });
  if (r.ok) { await sincronizarJogo(r.estado); }
  delete r._setFechado;
  return r;
}
async function reabrir(d: Any) {
  const r = await mutar(d.id, (e) => {
    if (e.status !== "finalizada") return { erro: "A partida não está finalizada." };
    e.status = e.setsCasa >= 2 || e.setsVisitante >= 2 ? "sets_completos" : "em_andamento";
    return {};
  });
  if (r.ok) await sincronizarJogo(r.estado, null);
  delete r._setFechado;
  return r;
}
async function excluir(d: Any) {
  const id = idNorm(d.id);
  if (!(await carregar(id))) return { ok: false, erro: "Partida não encontrada: " + d.id };
  await sb.from("partidas").delete().eq("id", id);   // eventos saem em cascata
  { const ref = refJogo(id); if (ref) await sb.from("jogos").update({ status: "agendado", sets_casa: 0, sets_visitante: 0, parciais: [], wo: null }).eq("modalidade", ref.mod).eq("id", ref.jid).then(() => {}, () => {}); }
  await sb.from("lotes").delete().eq("partida_id", id);
  return { ok: true };
}

// Login do painel: a lista de usuários mora no Apps Script (lento e às vezes dá 404 do Google).
// Por isso: cache de 30 min por instância, até 3 tentativas e recusa explícita nunca é repetida.
const loginCache = new Map<string, { usuario: string; papel: string; ate: number }>();
async function hashLogin(auth: Any) {
  const buf = new TextEncoder().encode(String(auth?.usuario || "").toLowerCase() + "\u0000" + String(auth?.senha || ""));
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", buf))].map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function loginPainelAS(auth: Any): Promise<{ ok: boolean; usuario?: string; papel?: string; erro?: string; falha?: boolean }> {
  if (!auth || !auth.usuario || !auth.senha) return { ok: false, erro: "Login inválido." };
  const k = await hashLogin(auth);
  const c = loginCache.get(k);
  if (c && c.ate > Date.now()) return { ok: true, usuario: c.usuario, papel: c.papel };
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(APPS_SCRIPT, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ acao: "loginPainel", auth }), signal: AbortSignal.timeout(35000) });
      const j = await r.json();
      if (!j.ok) { loginCache.delete(k); return { ok: false, erro: "Login inválido." }; }
      loginCache.set(k, { usuario: j.usuario, papel: j.papel, ate: Date.now() + 30 * 60 * 1000 });
      return { ok: true, usuario: j.usuario, papel: j.papel };
    } catch (_) { await new Promise((res) => setTimeout(res, 600)); }
  }
  return { ok: false, erro: "Não foi possível validar o login agora. Tente de novo em instantes.", falha: true };
}
// ════════ Usuários do painel (senhas só como hash PBKDF2) ════════
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const deHex = (s: string) => new Uint8Array((s.match(/../g) || []).map((h) => parseInt(h, 16)));
async function derivar(senha: string, sal: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: deHex(sal), iterations: 100000 }, k, 256));
}
const novoSal = () => hex(crypto.getRandomValues(new Uint8Array(16)));
const PAPEIS_PAINEL = ["admin", "organizacao", "mesa", "juiz"];
let usuariosMigrados = false;
async function temUsuarios() {
  if (usuariosMigrados) return true;
  const { count } = await sb.from("usuarios_painel").select("chave", { count: "exact", head: true });
  usuariosMigrados = (count || 0) > 0;
  return usuariosMigrados;
}
async function loginLocal(auth: Any): Promise<{ ok: boolean; usuario?: string; papel?: string; erro?: string }> {
  const k = chaveEq(auth?.usuario), senha = (auth?.senha || "").toString();
  if (!k || !senha) return { ok: false, erro: "Login inválido." };
  const { data: u } = await sb.from("usuarios_painel").select("*").eq("chave", k).maybeSingle();
  if (!u) { await derivar(senha, novoSal()); return { ok: false, erro: "Usuário ou senha incorretos." }; }   // mesmo tempo de resposta
  if (u.bloqueado_ate && new Date(u.bloqueado_ate) > new Date()) return { ok: false, erro: "Muitas tentativas erradas. Aguarde alguns minutos e tente de novo." };
  if ((await derivar(senha, u.sal)) === u.hash) {
    if (u.falhas) await sb.from("usuarios_painel").update({ falhas: 0, bloqueado_ate: null }).eq("chave", k);
    return { ok: true, usuario: u.usuario, papel: u.papel };
  }
  const falhas = (u.falhas || 0) + 1;
  await sb.from("usuarios_painel").update(falhas >= 5 ? { falhas: 0, bloqueado_ate: new Date(Date.now() + 10 * 60000).toISOString() } : { falhas }).eq("chave", k);
  return { ok: false, erro: "Usuário ou senha incorretos." };
}
async function autenticar(auth: Any) { return (await temUsuarios()) ? await loginLocal(auth) : await loginPainelAS(auth); }
async function gravarUsuario(usuario: string, senha: string, papelU: string) {
  const sal = novoSal();
  const { error } = await sb.from("usuarios_painel").upsert({ chave: chaveEq(usuario), usuario, papel: papelU, sal, hash: await derivar(senha, sal), falhas: 0, bloqueado_ate: null, atualizado_em: new Date().toISOString() });
  return error;
}
async function listarUsuarios() { const { data } = await sb.from("usuarios_painel").select("usuario,papel").order("usuario"); return data || []; }
// espelha a mudança no Apps Script (que ainda valida o login do envio de fotos); não bloqueia se ele estiver lento
async function espelharNoAS(corpo: Any) { try { await fetch(APPS_SCRIPT, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(corpo), signal: AbortSignal.timeout(20000) }); } catch (_) { /* melhor esforço */ } }

async function loginPainelAcao(d: Any) {
  const j = await autenticar(d.auth || d);
  return j.ok ? { ok: true, usuario: j.usuario, papel: j.papel } : { ok: false, erro: j.erro === "Login inválido." ? "Usuário ou senha incorretos." : j.erro };
}
async function listarUsuariosPainel(d: Any) {
  const c: Any = await papel(d.auth, ["admin"]); if (c.erro) return { ok: false, erro: c.erro };
  return { ok: true, usuarios: await listarUsuarios() };
}
async function salvarUsuarioPainel(d: Any) {
  const c: Any = await papel(d.auth, ["admin"]); if (c.erro) return { ok: false, erro: c.erro };
  const usuario = (d.usuario || "").toString().trim(), senha = (d.senha || "").toString();
  if (usuario.length < 3) return { ok: false, erro: "O usuário precisa ter pelo menos 3 caracteres." };
  if (!PAPEIS_PAINEL.includes(d.papel)) return { ok: false, erro: "Perfil inválido." };
  const lista: Any[] = await listarUsuarios();
  const ex: Any = lista.find((x) => chaveEq(x.usuario) === chaveEq(usuario));
  if (ex) {
    if (senha && senha.length < 4) return { ok: false, erro: "A senha precisa ter pelo menos 4 caracteres." };
    if (ex.papel === "admin" && d.papel !== "admin" && lista.filter((x) => x.papel === "admin").length < 2) return { ok: false, erro: "Precisa existir pelo menos um administrador." };
    if (senha) { const e = await gravarUsuario(ex.usuario, senha, d.papel); if (e) return { ok: false, erro: e.message }; }
    else await sb.from("usuarios_painel").update({ papel: d.papel, atualizado_em: new Date().toISOString() }).eq("chave", chaveEq(usuario));
  } else {
    if (senha.length < 4) return { ok: false, erro: "A senha precisa ter pelo menos 4 caracteres." };
    const e = await gravarUsuario(usuario, senha, d.papel); if (e) return { ok: false, erro: e.message };
  }
  await espelharNoAS({ acao: "salvarUsuarioPainel", auth: d.auth, usuario, senha, papel: d.papel });
  return { ok: true };
}
async function removerUsuarioPainel(d: Any) {
  const c: Any = await papel(d.auth, ["admin"]); if (c.erro) return { ok: false, erro: c.erro };
  const alvo = chaveEq(d.usuario);
  const lista: Any[] = await listarUsuarios();
  const x: Any = lista.find((u) => chaveEq(u.usuario) === alvo);
  if (!x) return { ok: false, erro: "Usuário não encontrado." };
  if (x.papel === "admin" && lista.filter((u) => u.papel === "admin").length < 2) return { ok: false, erro: "Precisa existir pelo menos um administrador." };
  await sb.from("usuarios_painel").delete().eq("chave", alvo);
  await espelharNoAS({ acao: "removerUsuarioPainel", auth: d.auth, usuario: d.usuario });
  return { ok: true };
}
// Senha de liberação (cadastro de atleta no painel). Padrão 5912 até alguém trocar.
async function senhaAdminOk(senha: Any) {
  senha = (senha || "").toString();
  if (!(await temUsuarios())) {
    try { const r = await fetch(APPS_SCRIPT + "?action=verificarSenhaAdmin&senha=" + encodeURIComponent(senha), { signal: AbortSignal.timeout(30000) }); return !!(await r.json()).ok; } catch (_) { return false; }
  }
  const { data } = await sb.from("config").select("valor").eq("chave", "senha_admin").maybeSingle();
  if (!data) return senha === "5912";
  return (await derivar(senha, data.valor.sal)) === data.valor.hash;
}
async function gravarSenhaAdmin(nova: string) {
  const sal = novoSal();
  await sb.from("config").upsert({ chave: "senha_admin", valor: { sal, hash: await derivar(nova, sal) }, atualizado_em: new Date().toISOString() });
}
async function trocarSenhaAdmin(d: Any) {
  if (!(await senhaAdminOk(d.senhaAtual))) return { ok: false, erro: "Senha atual incorreta." };
  const nova = (d.novaSenha || "").toString().trim();
  if (nova.length < 4) return { ok: false, erro: "A nova senha precisa ter pelo menos 4 caracteres." };
  await gravarSenhaAdmin(nova);
  return { ok: true };
}
// Importa os usuários do Apps Script (rodado uma vez pelo editor dele). Só administrador. Pode repetir.
async function importarUsuarios(d: Any) {
  const c: Any = await papel(d.auth, ["admin"]); if (c.erro) return { ok: false, erro: c.erro };
  let n = 0;
  for (const u of d.usuarios || []) {
    if (!u.usuario || !u.senha || !PAPEIS_PAINEL.includes(u.papel)) continue;
    const e = await gravarUsuario(String(u.usuario).trim(), String(u.senha), u.papel); if (!e) n++;
  }
  if (d.senhaAdmin) await gravarSenhaAdmin(String(d.senhaAdmin));
  usuariosMigrados = false;
  return { ok: true, usuarios: n, senhaAdmin: !!d.senhaAdmin };
}

async function papel(auth: Any, aceitos: string[]) {
  const j = await autenticar(auth);
  if (!j.ok) return { erro: j.erro };
  if (!aceitos.includes(j.papel!)) return { erro: "Seu perfil não tem permissão para essa ação." };
  return { usuario: j.usuario };
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
  if (r.ok) {
    
    await sincronizarJogo(r.estado, d.equipeFaltou === "B" ? "visitante" : "casa");
    await sb.from("wo_registros").insert({ jogo: idNorm(d.id), equipe_faltou: faltou, adversario: faltouB ? d.equipeA : d.equipeB, motivo: d.motivo || "", registrado_por: c.usuario });
  }
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

// ════════ Equipes: PIN, confirmação, atletas, LGPD, assinaturas, juízes ════════
const LIMITE_ATLETAS = 14, LIMITE_COMISSAO = 2;
const PRAZO_CADASTRO_ATLETAS = new Date("2026-11-27T13:00:00-03:00");
const TERMO_LGPD_VERSAO = "2026-1";
const chaveEq = (s: Any) => (s || "").toString().trim().toLowerCase();
const fmtBR = (v: Any): string => {
  if (!v) return "";
  const p = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(new Date(v));
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g("day")}/${g("month")}/${g("year")} ${g("hour") === "24" ? "00" : g("hour")}:${g("minute")}:${g("second")}`;
};
const brParaIso = (s: string): string | null => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2}):(\d{2}))?$/.exec((s || "").trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}T${m[4] || "00"}:${m[5] || "00"}:${m[6] || "00"}-03:00` : null;
};
const SENHA_OK = (senha: string) => senhaAdminOk(senha);

function normalizarTipo(t: Any) {
  t = (t || "").toString().trim();
  if (t === "Técnico" || t === "Auxiliar Técnico") return t;
  if (t === "Comissão Técnica") return "Técnico";
  return "Atleta";
}
const ehComissao = (t: string) => t === "Técnico" || t === "Auxiliar Técnico" || t === "Comissão Técnica";
const atletaOut = (a: Any) => ({ equipe: a.equipe, numero: (a.numero || "").toString(), nome: a.nome, tipo: a.tipo || "Atleta" });

async function atletasDe(equipe: string) {
  const { data } = await sb.from("atletas").select("equipe,numero,nome,tipo,id").ilike("equipe", equipe.trim().replace(/[%_]/g, (c) => "\\" + c)).order("id");
  return (data || []).filter((a: Any) => chaveEq(a.equipe) === chaveEq(equipe) && a.nome);
}
async function cadastrarAtleta(d: Any) {
  const equipe = (d.equipe || "").toString().trim(), numero = (d.numero || "").toString().trim(), nome = (d.nome || "").toString().trim();
  const tipo = normalizarTipo(d.tipo);
  if (!equipe || !nome) return { ok: false, erro: "Equipe e nome são obrigatórios." };
  const lista = await atletasDe(equipe);
  if (numero) {
    const ex = lista.find((a: Any) => (a.numero || "").toString().trim() === numero);
    if (ex) { await sb.from("atletas").update({ nome, tipo }).eq("id", ex.id); return { ok: true, atualizado: true }; }
  }
  if (ehComissao(tipo)) {
    if (lista.some((a: Any) => normalizarTipo(a.tipo) === tipo)) return { ok: false, erro: "Essa equipe já tem um(a) " + tipo + " cadastrado(a)." };
    if (lista.filter((a: Any) => ehComissao(normalizarTipo(a.tipo))).length >= LIMITE_COMISSAO) return { ok: false, erro: "Limite de " + LIMITE_COMISSAO + " membros da comissão técnica já foi atingido pra essa equipe." };
  } else if (lista.filter((a: Any) => normalizarTipo(a.tipo) === "Atleta").length >= LIMITE_ATLETAS) {
    return { ok: false, erro: "Limite de " + LIMITE_ATLETAS + " atletas já foi atingido pra essa equipe." };
  }
  const { error } = await sb.from("atletas").insert({ equipe, numero, nome, tipo });
  return error ? { ok: false, erro: error.message } : { ok: true };
}
async function removerAtleta(d: Any) {
  const lista = await atletasDe((d.equipe || "").toString());
  const numero = (d.numero || "").toString().trim(), nome = (d.nome || "").toString().trim();
  const alvo = [...lista].reverse().find((a: Any) => (numero ? (a.numero || "").toString().trim() === numero : true) && (a.nome || "").toString().trim() === nome);
  if (!alvo) return { ok: false, erro: "Atleta não encontrado." };
  await sb.from("atletas").delete().eq("id", alvo.id);
  return { ok: true };
}

async function pinDe(equipe: string): Promise<string | null> {
  const k = chaveEq(equipe); if (!k) return null;
  const { data } = await sb.from("equipes_pin").select("pin").eq("chave", k).maybeSingle();
  return data ? data.pin : null;
}
async function pinOk(equipe: string, pin: Any) { const r = await pinDe(equipe); return !!r && r === (pin || "").toString().trim(); }
async function gerarPin(d: Any) {
  const equipe = (d.equipe || "").toString().trim();
  if (!equipe) return { ok: false, erro: "Equipe é obrigatória." };
  const pin = String(1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000));
  const { error } = await sb.from("equipes_pin").upsert({ chave: chaveEq(equipe), equipe, pin, gerado_em: new Date().toISOString() });
  return error ? { ok: false, erro: error.message } : { ok: true, equipe, pin };
}
// Define um PIN específico para uma equipe (ex.: equipe da casa). Só administrador; PIN = 4 dígitos.
async function definirPinEquipe(d: Any) {
  const c: Any = await papel(d.auth, ["admin"]); if (c.erro) return { ok: false, erro: c.erro };
  const equipe = (d.equipe || "").toString().trim(), pin = (d.pin || "").toString().trim();
  if (!equipe) return { ok: false, erro: "Equipe é obrigatória." };
  if (!/^\d{4}$/.test(pin)) return { ok: false, erro: "O PIN precisa ter exatamente 4 números." };
  const { error } = await sb.from("equipes_pin").upsert({ chave: chaveEq(equipe), equipe, pin, gerado_em: new Date().toISOString() });
  return error ? { ok: false, erro: error.message } : { ok: true, equipe, pin };
}
async function confirmarPresenca(d: Any) {
  if (!(await pinOk(d.equipe, d.pin))) return { ok: false, erro: "PIN incorreto. Confirme o PIN da sua equipe." };
  const agora = new Date().toISOString();
  const { error } = await sb.from("confirmacoes").upsert({ chave: chaveEq(d.equipe), equipe: (d.equipe || "").toString().trim(), confirmado_em: agora, termo: "Sim" });
  return error ? { ok: false, erro: error.message } : { ok: true, confirmadoEm: fmtBR(agora) };
}
async function listarConfirmacoes() {
  const { data } = await sb.from("confirmacoes").select("equipe,confirmado_em");
  return (data || []).map((c: Any) => ({ equipe: c.equipe, confirmadoEm: fmtBR(c.confirmado_em) })).sort((a: Any, b: Any) => a.equipe.localeCompare(b.equipe));
}
async function equipesComPin() {
  const conf = new Set((await listarConfirmacoes()).map((c: Any) => chaveEq(c.equipe)));
  const { data } = await sb.from("equipes_pin").select("equipe");
  const nomes = (data || []).map((r: Any) => r.equipe).filter((n: string) => n && conf.has(chaveEq(n)));
  const escudos: Record<string, string> = {};
  const { data: insc } = await sb.from("inscricoes").select("nome_equipe,escudo_url");
  (insc || []).forEach((r: Any) => { const n = (r.nome_equipe || "").toString().trim(); if (n) escudos[n] = (r.escudo_url || "").toString().trim(); });
  return nomes.sort().map((n: string) => ({ equipe: n, escudo: escudos[n] || "" }));
}
async function statusCadastro() {
  const [{ data: pins }, conf, { data: ats }, { data: cons }, { data: ass }] = await Promise.all([
    sb.from("equipes_pin").select("equipe,gerado_em"), listarConfirmacoes(),
    sb.from("atletas").select("equipe,tipo,nome"), sb.from("consentimentos").select("chave,versao"), sb.from("assinaturas").select("chave,papel"),
  ]);
  const confirmou: Any = {}; conf.forEach((c: Any) => (confirmou[chaveEq(c.equipe)] = c.confirmadoEm));
  const lgpd = new Set((cons || []).filter((c: Any) => c.versao === TERMO_LGPD_VERSAO).map((c: Any) => c.chave));
  const assSet = new Set((ass || []).map((a: Any) => a.chave + "|" + a.papel));
  return (pins || []).map((p: Any) => p).sort((a: Any, b: Any) => a.equipe.localeCompare(b.equipe)).map((p: Any) => {
    const k = chaveEq(p.equipe);
    const lista = (ats || []).filter((a: Any) => chaveEq(a.equipe) === k && a.nome);
    return {
      equipe: p.equipe, confirmou: !!confirmou[k], geradoEm: fmtBR(p.gerado_em), confirmadoEm: confirmou[k] || "",
      atletas: lista.filter((a: Any) => (a.tipo || "Atleta") === "Atleta").length,
      tecnico: lista.some((a: Any) => a.tipo === "Técnico" || a.tipo === "Comissão Técnica"),
      auxiliar: lista.some((a: Any) => a.tipo === "Auxiliar Técnico"),
      assTecnico: assSet.has(k + "|tecnico"), assCapitao: assSet.has(k + "|capitao"), lgpd: lgpd.has(k),
    };
  });
}
async function aceitarTermo(d: Any) {
  const equipe = (d.equipe || "").toString().trim(), nome = (d.nome || "").toString().trim();
  if (!equipe) return { ok: false, erro: "Equipe obrigatória." };
  if (!(await pinOk(equipe, d.pin))) return { ok: false, erro: "PIN incorreto." };
  if (nome.length < 5) return { ok: false, erro: "Digite o nome completo do responsável." };
  const { error } = await sb.from("consentimentos").insert({ chave: chaveEq(equipe), equipe, responsavel: nome, versao: TERMO_LGPD_VERSAO });
  return error ? { ok: false, erro: error.message } : { ok: true };
}
async function statusTermo(equipe: string) {
  const { data } = await sb.from("consentimentos").select("responsavel,aceito_em").eq("chave", chaveEq(equipe)).eq("versao", TERMO_LGPD_VERSAO).order("aceito_em", { ascending: false }).limit(1);
  const c = data && data[0];
  return c ? { ok: true, versao: TERMO_LGPD_VERSAO, aceito: true, em: fmtBR(c.aceito_em), responsavel: c.responsavel } : { ok: true, versao: TERMO_LGPD_VERSAO, aceito: false };
}
const assinaturaInvalida = (s: Any) => {
  s = (s || "").toString();
  if (s.indexOf("data:image/png;base64,") !== 0) return "Assinatura inválida.";
  if (s.length > 45000) return "Assinatura muito grande — desenhe de forma mais simples.";
  return "";
};
async function listarJuizes() {
  const { data } = await sb.from("juizes").select("nome,assinatura_url");
  return (data || []).map((j: Any) => ({ nome: j.nome, assinatura: j.assinatura_url || "" })).sort((a: Any, b: Any) => a.nome.localeCompare(b.nome));
}
async function cadastrarJuiz(d: Any) {
  const nome = (d.nome || "").toString().trim();
  if (!nome) return { ok: false, erro: "Informe o nome do juiz." };
  const e = assinaturaInvalida(d.assinatura); if (e) return { ok: false, erro: e };
  const ex = (await listarJuizes()).find((j: Any) => chaveEq(j.nome) === chaveEq(nome));
  if (ex) { await sb.from("juizes").update({ assinatura_url: d.assinatura }).eq("nome", ex.nome); return { ok: true, atualizado: true }; }
  const { error } = await sb.from("juizes").insert({ nome, assinatura_url: d.assinatura });
  return error ? { ok: false, erro: error.message } : { ok: true };
}
async function removerJuiz(d: Any) {
  const ex = (await listarJuizes()).find((j: Any) => chaveEq(j.nome) === chaveEq(d.nome));
  if (!ex) return { ok: false, erro: "Juiz não encontrado." };
  await sb.from("juizes").delete().eq("nome", ex.nome);
  return { ok: true };
}
async function assinaturasEquipe(equipe: string) {
  const { data } = await sb.from("assinaturas").select("papel,assinatura").eq("chave", chaveEq(equipe));
  const o: Any = {}; (data || []).forEach((a: Any) => (o[a.papel] = a.assinatura)); return o;
}
async function salvarAssinatura(d: Any) {
  const equipe = (d.equipe || "").toString().trim();
  const papel = d.papel === "capitao" ? "capitao" : d.papel === "tecnico" ? "tecnico" : "";
  if (!equipe || !papel) return { ok: false, erro: "Equipe e papel são obrigatórios." };
  if (!(await pinOk(equipe, d.pin))) return { ok: false, erro: "PIN incorreto." };
  const e = assinaturaInvalida(d.assinatura); if (e) return { ok: false, erro: e };
  const { error } = await sb.from("assinaturas").upsert({ chave: chaveEq(equipe), equipe, papel, assinatura: d.assinatura, atualizado_em: new Date().toISOString() });
  return error ? { ok: false, erro: error.message } : { ok: true };
}
const PRAZO_MSG = "Prazo de cadastro/edição de atletas encerrado em 27/11/2026 às 13h.";

// Copia o que já existe nas planilhas (somente admin). Pode rodar de novo sem duplicar.
async function migrarDoSheets(d: Any) {
  const c: Any = await papel(d.auth, ["admin"]);
  if (c.erro) return { ok: false, erro: c.erro };
  const get = async (q: string) => (await (await fetch(APPS_SCRIPT + "?" + q)).json());
  const rel: Any = { pins: 0, confirmacoes: 0, atletas: 0, juizes: 0, assinaturas: 0, termos: 0, avisos: [] };
  const st = (await get("action=statusCadastroEquipes")).equipes || [];
  for (const e of st) {
    const pin = (await get("action=verPinEquipeAdmin&equipe=" + encodeURIComponent(e.equipe))).pin;
    if (!pin) { rel.avisos.push("sem PIN: " + e.equipe); continue; }
    await sb.from("equipes_pin").upsert({ chave: chaveEq(e.equipe), equipe: e.equipe, pin, gerado_em: brParaIso(e.geradoEm) || new Date().toISOString() }); rel.pins++;
    if (e.confirmou) { await sb.from("confirmacoes").upsert({ chave: chaveEq(e.equipe), equipe: e.equipe, confirmado_em: brParaIso(e.confirmadoEm) || new Date().toISOString(), termo: "Sim" }); rel.confirmacoes++; }
    const ass = (await get("action=assinaturasEquipe&equipe=" + encodeURIComponent(e.equipe))).assinaturas || {};
    for (const papelA of Object.keys(ass)) if (ass[papelA]) { await sb.from("assinaturas").upsert({ chave: chaveEq(e.equipe), equipe: e.equipe, papel: papelA, assinatura: ass[papelA] }); rel.assinaturas++; }
    const t = await get("action=statusTermo&equipe=" + encodeURIComponent(e.equipe));
    if (t.aceito) {
      const ja = await sb.from("consentimentos").select("id").eq("chave", chaveEq(e.equipe)).eq("versao", TERMO_LGPD_VERSAO).limit(1);
      if (!ja.data?.length) { await sb.from("consentimentos").insert({ chave: chaveEq(e.equipe), equipe: e.equipe, responsavel: t.responsavel || "", aceito_em: brParaIso(t.em) || new Date().toISOString(), versao: TERMO_LGPD_VERSAO }); rel.termos++; }
    }
  }
  for (const a of (await get("action=atletasTodos")).atletas || []) {
    const r = await cadastrarAtleta(a); if (r.ok) rel.atletas++; else rel.avisos.push(a.equipe + "/" + a.nome + ": " + r.erro);
  }
  for (const j of (await get("action=listarJuizes")).juizes || []) {
    const r = await cadastrarJuiz({ nome: j.nome, assinatura: j.assinatura }); if (r.ok) rel.juizes++; else rel.avisos.push("juiz " + j.nome + ": " + r.erro);
  }
  return { ok: true, ...rel };
}

// ════════ Avisos, presenças, premiação, destaques, galera, saúde ════════
async function listarAvisos() {
  const { data } = await sb.from("avisos").select("*").eq("ativo", true).order("criado_em", { ascending: false }).limit(60);
  const l = (data || []).map((a: Any) => ({ id: String(a.id), criadoEm: fmtBR(a.criado_em), titulo: a.titulo || "", texto: a.texto || "", fixado: !!a.fixado, ativo: a.ativo !== false }));
  l.sort((a: Any, b: Any) => (b.fixado ? 1 : 0) - (a.fixado ? 1 : 0));
  return l.slice(0, 30);
}
async function salvarAviso(d: Any) {
  const c: Any = await papel(d.auth, ["admin", "organizacao"]); if (c.erro) return { ok: false, erro: c.erro };
  const titulo = (d.titulo || "").toString().trim(), texto = (d.texto || "").toString().trim();
  if (!titulo) return { ok: false, erro: "Informe o título do aviso." };
  const fixado = d.fixado === true || d.fixado === "true";
  if (d.id) {
    const { data } = await sb.from("avisos").update({ titulo, texto, fixado }).eq("id", d.id).select("id");
    return data && data.length ? { ok: true } : { ok: false, erro: "Aviso não encontrado." };
  }
  const { error } = await sb.from("avisos").insert({ titulo, texto, fixado, ativo: true });
  return error ? { ok: false, erro: error.message } : { ok: true };
}
async function excluirAviso(d: Any) {
  const c: Any = await papel(d.auth, ["admin", "organizacao"]); if (c.erro) return { ok: false, erro: c.erro };
  const { data } = await sb.from("avisos").delete().eq("id", d.id || -1).select("id");
  return data && data.length ? { ok: true } : { ok: false, erro: "Aviso não encontrado." };
}
async function registrarPresenca(d: Any) {
  const equipe = (d.equipe || "").toString().trim(), nome = (d.nome || "").toString().trim();
  if (!equipe || !nome) return { ok: false, erro: "Equipe e nome são obrigatórios." };
  const { error } = await sb.from("presencas").insert({ jogo: (d.jogo || "").toString().trim(), equipe, numero: (d.numero || "").toString(), nome, tipo: (d.tipo || "Atleta").toString() });
  if (error) return error.code === "23505" ? { ok: true, jaRegistrado: true } : { ok: false, erro: error.message };
  return { ok: true, jaRegistrado: false };
}
async function listarPresencas(jogo: string) {
  let q = sb.from("presencas").select("*").order("id");
  if (jogo) q = q.eq("jogo", jogo);
  const { data } = await q;
  return (data || []).map((r: Any) => ({ em: fmtBR(r.registrado_em), jogo: r.jogo, equipe: r.equipe, numero: r.numero, nome: r.nome, tipo: r.tipo }));
}
async function rankingGalera() {
  const cont: Any = {};
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from("galera_votos").select("atleta,time").order("id").range(de, de + 999);
    (data || []).forEach((r: Any) => { const k = (r.atleta || "").trim(); if (!k) return; (cont[k] = cont[k] || { atleta: k, time: (r.time || "").trim(), votos: 0 }).votos++; });
    if (!data || data.length < 1000) break;
  }
  return Object.values(cont).sort((a: Any, b: Any) => b.votos - a.votos).slice(0, 10);
}
async function atletasTimeDestaque(equipe: string) {
  const eq = chaveEq(equipe); if (!eq) return { ok: true, atletas: [] };
  const nomes = new Set<string>();
  const { data: ds } = await sb.from("destaques").select("nome,equipe");
  (ds || []).forEach((r: Any) => { if (chaveEq(r.equipe) === eq && (r.nome || "").trim()) nomes.add(r.nome.trim()); });
  const { data: gs } = await sb.from("galera_votos").select("atleta,time");
  (gs || []).forEach((r: Any) => { if (chaveEq(r.time) === eq && (r.atleta || "").trim()) nomes.add(r.atleta.trim()); });
  return { ok: true, atletas: [...nomes].sort() };
}
async function saudeSistema(d: Any) {
  const t0 = Date.now();
  const itens: Any[] = [];
  const add = (nome: string, status: string, detalhe: string) => itens.push({ nome, status, detalhe });
  let extra: Any[] = [];
  const c: Any = await papel(d.auth, ["admin", "organizacao"]);
  if (c.erro) return { ok: false, erro: c.erro };
  try {
    const tb = Date.now();
    const { data, error } = await sb.from("partidas").select("id,status");
    if (error) throw new Error(error.message);
    add("Banco de dados (Supabase)", "ok", "respondeu em " + (Date.now() - tb) + " ms");
    const reais = (data || []).filter((p: Any) => !ehTeste(p.id));
    const aoVivo = reais.filter((p: Any) => p.status === "em_andamento").length, falta = reais.filter((p: Any) => p.status === "sets_completos").length;
    add("Partidas", falta ? "aviso" : "ok", reais.length + " súmulas · " + aoVivo + " ao vivo" + (falta ? " · " + falta + " esperando finalizar" : ""));
  } catch (ex) { add("Banco de dados (Supabase)", "erro", (ex as Error).message); }
  try {
    const st = await statusCadastro();
    const ok = st.filter((e: Any) => e.confirmou && e.atletas >= 6 && e.tecnico && e.assTecnico && e.assCapitao && e.lgpd).length;
    add("Cadastro das equipes", ok === st.length && st.length ? "ok" : "aviso", ok + " de " + st.length + " equipes completas (atletas, técnico, assinaturas e termo)");
  } catch (ex) { add("Cadastro das equipes", "erro", (ex as Error).message); }
  add("Backup diário", "aviso", "Confira a pasta 'Supercopa - Backup Supabase' no Drive (gerada às ~3h)");
  extra.forEach((i) => itens.push(i));
  const encerrado = new Date() >= PRAZO_CADASTRO_ATLETAS;
  add("Prazo de cadastro de atletas", encerrado ? "aviso" : "ok", encerrado ? "Encerrado" : "Aberto até 27/11 13:00");
  return { ok: true, itens, ms: Date.now() - t0 };
}

// Apaga somente dados de TESTE (nomes/jogos que começam com "TESTE" ou equipe "ZZ ...") — só administrador.
async function limparTestes(d: Any) {
  const c: Any = await papel(d.auth, ["admin"]);
  if (c.erro) return { ok: false, erro: c.erro };
  const n: Any = {};
  const del = async (tab: string, col: string, padrao: string) => { const { data } = await sb.from(tab).delete().ilike(col, padrao).select("*"); n[tab + "." + col] = (data || []).length; };
  await del("galera_votos", "atleta", "TESTE%");
  await del("presencas", "jogo", "TESTE%");
  await del("wo_registros", "jogo", "TESTE%");
  await del("destaques", "jogo", "TESTE%");
  await del("premiacao", "categoria", "TESTE%");
  await del("avisos", "titulo", "TESTE%");
  await del("atletas", "equipe", "ZZ %");
  await del("partidas", "id", "TESTE%");
  { const { data } = await sb.from("votos_destaque").delete().eq("teste", true).select("id"); n["votos_destaque.teste"] = (data || []).length; }
  await del("inscricoes", "nome_equipe", "TESTE%");
  await del("quiz_respostas", "nome", "TESTE%");
  await del("feedback", "time", "TESTE%");
  await del("acessos", "device_id", "teste-%");
  await del("instalacoes", "device_id", "teste-%");
  return { ok: true, removidos: n };
}

// ==CLASS-INICIO==
// ════════ Classificação automática (Regulamento de Voleibol, art. 17-19 e 34) ════════
// Pontos: vitória 2x0 = 3 · vitória 2x1 = 2 · derrota 1x2 = 1 · derrota 0x2 = 0 · W.O.: vitória 3 / derrota 0 (placar 2x0, 25x0 e 25x0).
// W.O. de ambas as equipes (as duas incompletas): nenhuma pontua.
// Ordem: pontos → vitórias → saldo de sets → saldo de pontos → sorteio (sorteio_ordem informado pela organização).
type JogoC = { id: string; fase: string; grupo?: string | null; casa?: string | null; visitante?: string | null; status: string; setsCasa: number; setsVisitante: number; parciais?: { a: number; b: number }[]; wo?: string | null };
type EquipeC = { nome: string; grupo?: string | null; ordem?: number; sorteioOrdem?: number | null };
type LinhaC = { pos: number; equipe: string; jogos: number; pontos: number; vitorias: number; derrotas: number; setsPro: number; setsContra: number; saldoSets: number; pontosPro: number; pontosContra: number; saldoPontos: number; empateSorteio: boolean; sorteioOrdem: number | null };

function jogoDecidido(j: JogoC) { return j.status === "finalizado" || j.status === "wo"; }

function calcularGrupo(equipes: EquipeC[], jogos: JogoC[]): { tabela: LinhaC[]; completo: boolean; jogosFeitos: number; jogosTotal: number } {
  const L: Record<string, LinhaC> = {};
  equipes.forEach((e) => { L[e.nome] = { pos: 0, equipe: e.nome, jogos: 0, pontos: 0, vitorias: 0, derrotas: 0, setsPro: 0, setsContra: 0, saldoSets: 0, pontosPro: 0, pontosContra: 0, saldoPontos: 0, empateSorteio: false, sorteioOrdem: e.sorteioOrdem ?? null }; });
  let feitos = 0;
  for (const j of jogos) {
    if (!jogoDecidido(j)) continue;
    const a = j.casa ? L[j.casa] : undefined, b = j.visitante ? L[j.visitante] : undefined;
    if (!a || !b) continue;
    feitos++;
    a.jogos++; b.jogos++;
    if (j.wo === "ambos") continue;   // as duas incompletas: ninguém pontua
    let sc = j.setsCasa, sv = j.setsVisitante, pa = 0, pb = 0;
    if (j.wo === "casa") { sc = 0; sv = 2; pa = 0; pb = 50; }          // casa faltou: visitante vence 2x0, 25x0 duplo
    else if (j.wo === "visitante") { sc = 2; sv = 0; pa = 50; pb = 0; }
    else { for (const p of j.parciais || []) { pa += Number(p.a) || 0; pb += Number(p.b) || 0; } }
    a.setsPro += sc; a.setsContra += sv; b.setsPro += sv; b.setsContra += sc;
    a.pontosPro += pa; a.pontosContra += pb; b.pontosPro += pb; b.pontosContra += pa;
    const casaVenceu = sc > sv;
    const venc = casaVenceu ? a : b, perd = casaVenceu ? b : a;
    const wo = j.wo === "casa" || j.wo === "visitante";
    venc.vitorias++; perd.derrotas++;
    if (wo) { venc.pontos += 3; }
    else if (Math.min(sc, sv) === 0) { venc.pontos += 3; }
    else { venc.pontos += 2; perd.pontos += 1; }
  }
  const tabela = Object.values(L);
  tabela.forEach((l) => { l.saldoSets = l.setsPro - l.setsContra; l.saldoPontos = l.pontosPro - l.pontosContra; });
  const cmp = (x: LinhaC, y: LinhaC) =>
    y.pontos - x.pontos || y.vitorias - x.vitorias || y.saldoSets - x.saldoSets || y.saldoPontos - x.saldoPontos ||
    ((x.sorteioOrdem ?? 1e9) - (y.sorteioOrdem ?? 1e9));
  const bruto = (x: LinhaC, y: LinhaC) => y.pontos - x.pontos || y.vitorias - x.vitorias || y.saldoSets - x.saldoSets || y.saldoPontos - x.saldoPontos;
  tabela.sort((x, y) => cmp(x, y) || x.equipe.localeCompare(y.equipe));
  tabela.forEach((l, i) => { l.pos = i + 1; });
  // empate que só o sorteio resolve: iguais em tudo e sem ordem de sorteio definida (ou ordem igual)
  tabela.forEach((l, i) => {
    const viz = [tabela[i - 1], tabela[i + 1]].filter(Boolean) as LinhaC[];
    l.empateSorteio = viz.some((v) => bruto(l, v) === 0 && (l.sorteioOrdem === null || v.sorteioOrdem === null || l.sorteioOrdem === v.sorteioOrdem));
  });
  const total = jogos.length;
  return { tabela, completo: total > 0 && feitos === total, jogosFeitos: feitos, jogosTotal: total };
}

function calcularClassificacao(equipes: EquipeC[], jogos: JogoC[]) {
  const grupos = [...new Set(equipes.map((e) => e.grupo).filter(Boolean) as string[])].sort();
  return grupos.map((g) => {
    const eq = equipes.filter((e) => e.grupo === g).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    const r = calcularGrupo(eq, jogos.filter((j) => j.fase === "grupos" && j.grupo === g));
    return { grupo: g, ...r };
  });
}

// Mata-mata: '1A' = 1º do grupo A (só vale com o grupo completo), 'V:Q1' = vencedor do jogo Q1.
function resolverOrigem(origem: string | null | undefined, clas: ReturnType<typeof calcularClassificacao>, jogos: JogoC[]): string | null {
  if (!origem) return null;
  const m = /^(\d)([A-Z])$/.exec(origem.trim().toUpperCase());
  if (m) { const g = clas.find((x) => x.grupo === m[2]); return g && g.completo ? (g.tabela[Number(m[1]) - 1]?.equipe || null) : null; }
  const v = /^V:(.+)$/.exec(origem.trim());
  if (v) {
    const j = jogos.find((x) => x.id === v[1]);
    if (!j || !jogoDecidido(j)) return null;
    if (j.wo === "ambos") return null;
    const casaVenceu = j.wo === "visitante" ? true : j.wo === "casa" ? false : j.setsCasa > j.setsVisitante;
    return (casaVenceu ? j.casa : j.visitante) || null;
  }
  return null;
}

// Sorteio das quartas: pote dos 1ºs colocados x pote dos 2ºs colocados (um de cada por enfrentamento).
type PoteItem = { equipe: string; grupo: string; ref: string };
function calcularPotes(clas: ReturnType<typeof calcularClassificacao>) {
  const grupos = clas.length;
  const incompletos = clas.filter((g) => !g.completo).map((g) => g.grupo);
  const empates = clas.filter((g) => g.completo && g.tabela.some((l) => l.empateSorteio)).map((g) => g.grupo);
  let motivo = "";
  if (!grupos) motivo = "Ainda não há grupos cadastrados.";
  else if (incompletos.length) motivo = "Faltam jogos nos grupos: " + incompletos.join(", ") + ".";
  else if (empates.length) motivo = "Há empate que só o sorteio resolve nos grupos: " + empates.join(", ") + ". Informe a ordem do sorteio em Equipes.";
  const liberado = !motivo;
  const pote = (pos: number): PoteItem[] => clas.filter((g) => g.tabela[pos - 1]).map((g) => ({ equipe: g.tabela[pos - 1].equipe, grupo: g.grupo, ref: pos + g.grupo }));
  return { liberado, motivo, primeiros: liberado ? pote(1) : [], segundos: liberado ? pote(2) : [] };
}
function validarSorteioQuarta(potes: ReturnType<typeof calcularPotes>, quartas: { id: string; casa?: string | null; visitante?: string | null; status: string }[], jogoId: string, primeiro: string, segundo: string) {
  if (!potes.liberado) return { erro: potes.motivo };
  const q = quartas.find((x) => x.id === jogoId);
  if (!q) return { erro: "Jogo das quartas não encontrado: " + jogoId };
  if (q.status !== "agendado") return { erro: "Esse jogo já começou ou foi finalizado — não dá para trocar o enfrentamento." };
  const p1 = potes.primeiros.find((x) => x.equipe === primeiro), p2 = potes.segundos.find((x) => x.equipe === segundo);
  if (!p1) return { erro: "'" + primeiro + "' não está no pote dos 1ºs colocados." };
  if (!p2) return { erro: "'" + segundo + "' não está no pote dos 2ºs colocados." };
  const usados = new Set<string>();
  quartas.filter((x) => x.id !== jogoId).forEach((x) => { if (x.casa) usados.add(x.casa); if (x.visitante) usados.add(x.visitante); });
  if (usados.has(primeiro)) return { erro: primeiro + " já foi sorteada em outro jogo das quartas." };
  if (usados.has(segundo)) return { erro: segundo + " já foi sorteada em outro jogo das quartas." };
  return { ok: true, p1, p2, aviso: p1.grupo === p2.grupo ? "Atenção: as duas equipes são do mesmo grupo (já se enfrentaram na fase de grupos)." : null };
}
// ==CLASS-FIM==

// ════════ Torneio: equipes por grupo, jogos, mata-mata ════════
const MODALIDADE_PADRAO = "volei";
const modOf = (d: Any) => (d?.modalidade || MODALIDADE_PADRAO).toString();
const jogoParaC = (j: Any): JogoC => ({ id: j.id, fase: j.fase, grupo: j.grupo, casa: j.casa, visitante: j.visitante, status: j.status, setsCasa: j.sets_casa || 0, setsVisitante: j.sets_visitante || 0, parciais: j.parciais || [], wo: j.wo });

async function carregarTorneio(mod: string) {
  const [{ data: eq, error: e1 }, { data: jg, error: e2 }] = await Promise.all([
    sb.from("torneio_equipes").select("*").eq("modalidade", mod),
    sb.from("jogos").select("*").eq("modalidade", mod).order("ordem").order("id"),
  ]);
  if (e1 || e2) throw new Error((e1 || e2)!.message);
  return { equipes: eq || [], jogos: jg || [] };
}
async function montarTorneio(mod: string) {
  const { equipes, jogos } = await carregarTorneio(mod);
  const eqC: EquipeC[] = equipes.map((e: Any) => ({ nome: e.nome, grupo: e.grupo, ordem: e.ordem, sorteioOrdem: e.sorteio_ordem }));
  const base = jogos.map(jogoParaC);
  const clas = calcularClassificacao(eqC, base);
  // mata-mata: equipe efetiva = nome explícito, senão resolvida pela origem (1A, 2B, V:Q1...), senão "Aguardando"
  // Resolve fase por fase (quartas → semifinais → final): as semifinais só têm nomes depois que as quartas definem os vencedores,
  // e a final depende dos nomes já resolvidos das semifinais.
  const ordemFase: Any = { grupos: 0, quartas: 1, semifinal: 2, final: 3 };
  const porId: Any = {}; base.forEach((b) => (porId[b.id] = b));
  const efet: Any = {};
  [...jogos].sort((a: Any, b: Any) => (ordemFase[a.fase] ?? 9) - (ordemFase[b.fase] ?? 9) || (a.ordem || 0) - (b.ordem || 0)).forEach((j: Any) => {
    const r = (lado: "casa" | "visitante") => j[lado] || resolverOrigem(lado === "casa" ? j.origem_casa : j.origem_visitante, clas, Object.values(porId) as JogoC[]);
    const c = r("casa"), v = r("visitante");
    efet[j.id] = { casa: c, visitante: v };
    porId[j.id].casa = c; porId[j.id].visitante = v;
  });
  const lista = jogos.map((j: Any) => {
    const casa = efet[j.id].casa, visitante = efet[j.id].visitante;
    const rotulo = (o: string | null) => (o ? (/^V:/.test(o) ? "Vencedor " + o.slice(2) : o.replace(/^(\d)([A-Z])$/, "$1º Grupo $2")) : "");
    return {
      id: j.id, fase: j.fase, grupo: j.grupo, rodada: j.rodada, ordem: j.ordem,
      casa: casa || "Aguardando", visitante: visitante || "Aguardando",
      casaDefinida: !!casa, visitanteDefinida: !!visitante,
      origemCasa: j.origem_casa, origemVisitante: j.origem_visitante, rotuloCasa: rotulo(j.origem_casa), rotuloVisitante: rotulo(j.origem_visitante),
      data: j.data, hora: j.hora ? String(j.hora).slice(0, 5) : null, quadra: j.quadra,
      status: j.status, setsCasa: j.sets_casa, setsVisitante: j.sets_visitante, parciais: j.parciais || [], wo: j.wo || null,
      vencedor: jogoDecidido(jogoParaC(j)) && j.wo !== "ambos" ? (j.wo === "casa" ? visitante : j.wo === "visitante" ? casa : j.sets_casa > j.sets_visitante ? casa : visitante) : null,
      atualizadoEm: j.atualizado_em,
    };
  });
  const final = lista.find((j: Any) => j.fase === "final");
  return {
    ok: true, modalidade: mod, geradoEm: new Date().toISOString(),
    equipes: equipes.map((e: Any) => ({ nome: e.nome, grupo: e.grupo, ordem: e.ordem, sorteioOrdem: e.sorteio_ordem, escudo: e.escudo })),
    grupos: clas, jogos: lista, campeao: final && final.vencedor ? final.vencedor : null,
    alertas: clas.filter((g) => g.completo && g.tabela.some((l) => l.empateSorteio)).map((g) => "Grupo " + g.grupo + ": empate que só o sorteio resolve — informe a ordem do sorteio."),
    potes: (() => {
      const p = calcularPotes(clas);
      const usados = new Set<string>();
      lista.filter((j: Any) => j.fase === "quartas").forEach((j: Any) => { if (j.casaDefinida) usados.add(j.casa); if (j.visitanteDefinida) usados.add(j.visitante); });
      return { ...p, primeiros: p.primeiros.map((x) => ({ ...x, sorteada: usados.has(x.equipe) })), segundos: p.segundos.map((x) => ({ ...x, sorteada: usados.has(x.equipe) })) };
    })(),
  };
}
function refJogo(id: string): { mod: string; jid: string } | null {
  id = idNorm(id);
  if (ehTeste(id)) { const j = id.replace(/^TESTE/, ""); return j ? { mod: "teste", jid: j } : null; }   // TESTEA1 treina o jogo A1 da chave de teste
  return { mod: MODALIDADE_PADRAO, jid: id };
}
async function sincronizarJogo(e: Any, wo?: string | null) {
  const ref = e && refJogo(e.id); if (!ref) return;
  const status = e.status === "finalizada" ? (wo ? "wo" : "finalizado") : "ao_vivo";
  const upd: Any = { sets_casa: e.setsCasa || 0, sets_visitante: e.setsVisitante || 0, parciais: e.historicoSets || [], status, atualizado_em: new Date().toISOString() };
  if (wo !== undefined) upd.wo = wo || null;
  try { await sb.from("jogos").update(upd).eq("modalidade", ref.mod).eq("id", ref.jid); } catch (_) { /* a súmula nunca pode falhar por causa disso */ }
}
async function jogoDaTabela(d: Any) {   // ação "jogo" (dados do jogo para abrir a súmula); cai no Apps Script se a tabela ainda estiver vazia
  const id = idNorm(d.id);
  if (ehTeste(id)) return { ok: true, id, aba: "TESTE", linha: 0, numero: id, equipeA: "", equipeB: "", sets: [{ a: "", b: "" }, { a: "", b: "" }, { a: "", b: "" }], sumula: null };
  const t = await montarTorneio(MODALIDADE_PADRAO);
  if (!t.jogos.length) return null;
  const j: Any = t.jogos.find((x: Any) => x.id === id);
  const info = resolverJogo(id);
  if (!j || !info) return { ok: false, erro: "Jogo não encontrado: " + id };
  const sets = [0, 1, 2].map((i) => ({ a: j.parciais[i] ? j.parciais[i].a : "", b: j.parciais[i] ? j.parciais[i].b : "" }));
  return { ok: true, id, aba: info.aba, linha: info.linha, numero: /^[A-D]\d$/.test(id) ? Number(id.slice(1)) : id, equipeA: j.casaDefinida ? j.casa : "", equipeB: j.visitanteDefinida ? j.visitante : "", sets, sumula: null };
}

const PODE_EDITAR_TORNEIO = ["admin", "organizacao"];
async function salvarEquipeTorneio(d: Any) {
  const c: Any = await papel(d.auth, PODE_EDITAR_TORNEIO); if (c.erro) return { ok: false, erro: c.erro };
  const nome = (d.nome || "").toString().trim(); if (!nome) return { ok: false, erro: "Informe o nome da equipe." };
  const reg: Any = { modalidade: modOf(d), nome, atualizado_em: new Date().toISOString() };
  if (d.grupo !== undefined) reg.grupo = d.grupo ? String(d.grupo).trim().toUpperCase().slice(0, 2) : null;
  if (d.ordem !== undefined) reg.ordem = Number(d.ordem) || 0;
  if (d.sorteioOrdem !== undefined) reg.sorteio_ordem = d.sorteioOrdem === null || d.sorteioOrdem === "" ? null : Number(d.sorteioOrdem);
  if (d.escudo !== undefined) reg.escudo = d.escudo || null;
  const { error } = await sb.from("torneio_equipes").upsert(reg);
  return error ? { ok: false, erro: error.message } : { ok: true };
}
async function removerEquipeTorneio(d: Any) {
  const c: Any = await papel(d.auth, PODE_EDITAR_TORNEIO); if (c.erro) return { ok: false, erro: c.erro };
  const mod = modOf(d), nome = (d.nome || "").toString().trim();
  const { data: usado } = await sb.from("jogos").select("id,status").eq("modalidade", mod).or("casa.eq." + nome + ",visitante.eq." + nome);
  if ((usado || []).some((j: Any) => j.status !== "agendado") && !d.forcar) return { ok: false, erro: "A equipe já tem jogo em andamento ou finalizado. Confirme para remover mesmo assim." };
  await sb.from("jogos").update({ casa: null }).eq("modalidade", mod).eq("casa", nome);
  await sb.from("jogos").update({ visitante: null }).eq("modalidade", mod).eq("visitante", nome);
  await sb.from("torneio_equipes").delete().eq("modalidade", mod).eq("nome", nome);
  return { ok: true };
}
async function salvarJogo(d: Any) {
  const c: Any = await papel(d.auth, PODE_EDITAR_TORNEIO); if (c.erro) return { ok: false, erro: c.erro };
  const id = idNorm(d.id); if (!id) return { ok: false, erro: "Informe o ID do jogo." };
  const reg: Any = { modalidade: modOf(d), id, atualizado_em: new Date().toISOString() };
  const campos: Any = { fase: "fase", grupo: "grupo", rodada: "rodada", ordem: "ordem", casa: "casa", visitante: "visitante", origemCasa: "origem_casa", origemVisitante: "origem_visitante", data: "data", hora: "hora", quadra: "quadra" };
  for (const k of Object.keys(campos)) if (d[k] !== undefined) reg[campos[k]] = d[k] === "" ? null : d[k];
  if (reg.fase && !["grupos", "quartas", "semifinal", "final"].includes(reg.fase)) return { ok: false, erro: "Fase inválida." };
  const { data: ex } = await sb.from("jogos").select("id").eq("modalidade", reg.modalidade).eq("id", id).maybeSingle();
  if (!ex && !reg.fase) return { ok: false, erro: "Jogo novo precisa da fase." };
  const { error } = ex ? await sb.from("jogos").update(reg).eq("modalidade", reg.modalidade).eq("id", id) : await sb.from("jogos").insert(reg);
  return error ? { ok: false, erro: error.message } : { ok: true };
}
async function excluirJogoTorneio(d: Any) {
  const c: Any = await papel(d.auth, PODE_EDITAR_TORNEIO); if (c.erro) return { ok: false, erro: c.erro };
  const { data } = await sb.from("jogos").delete().eq("modalidade", modOf(d)).eq("id", idNorm(d.id)).select("id");
  return data && data.length ? { ok: true } : { ok: false, erro: "Jogo não encontrado." };
}
// Sorteio das quartas: a organização escolhe 1 equipe do pote dos 1ºs e 1 do pote dos 2ºs para cada jogo.
async function sortearQuarta(d: Any) {
  const c: Any = await papel(d.auth, PODE_EDITAR_TORNEIO); if (c.erro) return { ok: false, erro: c.erro };
  const mod = modOf(d), jogoId = idNorm(d.jogo);
  const t = await montarTorneio(mod);
  const quartas = t.jogos.filter((j: Any) => j.fase === "quartas").map((j: Any) => ({ id: j.id, casa: j.casaDefinida ? j.casa : null, visitante: j.visitanteDefinida ? j.visitante : null, status: j.status }));
  const v: Any = validarSorteioQuarta(calcularPotes(t.grupos), quartas, jogoId, (d.primeiro || "").toString(), (d.segundo || "").toString());
  if (v.erro) return { ok: false, erro: v.erro };
  const { error } = await sb.from("jogos").update({ casa: v.p1.equipe, visitante: v.p2.equipe, origem_casa: v.p1.ref, origem_visitante: v.p2.ref, atualizado_em: new Date().toISOString() }).eq("modalidade", mod).eq("id", jogoId);
  if (error) return { ok: false, erro: error.message };
  return { ok: true, aviso: v.aviso, torneio: await montarTorneio(mod) };
}
async function desfazerSorteioQuarta(d: Any) {
  const c: Any = await papel(d.auth, PODE_EDITAR_TORNEIO); if (c.erro) return { ok: false, erro: c.erro };
  const mod = modOf(d), jogoId = idNorm(d.jogo);
  const { data: j } = await sb.from("jogos").select("status,fase").eq("modalidade", mod).eq("id", jogoId).maybeSingle();
  if (!j || j.fase !== "quartas") return { ok: false, erro: "Jogo das quartas não encontrado." };
  if (j.status !== "agendado") return { ok: false, erro: "Esse jogo já começou ou foi finalizado." };
  await sb.from("jogos").update({ casa: null, visitante: null, origem_casa: null, origem_visitante: null, atualizado_em: new Date().toISOString() }).eq("modalidade", mod).eq("id", jogoId);
  return { ok: true, torneio: await montarTorneio(mod) };
}
// Resultado lançado à mão (contingência: internet/aparelho da súmula caiu, ou jogo sem súmula digital).
async function lancarResultado(d: Any) {
  const c: Any = await papel(d.auth, ["admin", "organizacao", "mesa"]); if (c.erro) return { ok: false, erro: c.erro };
  const mod = modOf(d), id = idNorm(d.id);
  const { data: j } = await sb.from("jogos").select("*").eq("modalidade", mod).eq("id", id).maybeSingle();
  if (!j) return { ok: false, erro: "Jogo não encontrado: " + id };
  const wo = d.wo === "casa" || d.wo === "visitante" || d.wo === "ambos" ? d.wo : null;
  let parciais: Any[] = [], sc = 0, sv = 0;
  if (!wo) {
    parciais = (d.parciais || []).map((p: Any) => ({ a: Number(p.a), b: Number(p.b) }));
    if (!parciais.length || parciais.some((p) => !Number.isFinite(p.a) || !Number.isFinite(p.b) || p.a < 0 || p.b < 0 || p.a === p.b)) return { ok: false, erro: "Informe o placar de cada set (sem empate)." };
    parciais.forEach((p, i) => { const alvo = i === 2 ? 15 : 25; if (Math.max(p.a, p.b) < alvo || Math.abs(p.a - p.b) < 2) return; if (p.a > p.b) sc++; else sv++; });
    const invalido = parciais.some((p, i) => { const alvo = i === 2 ? 15 : 25; return Math.max(p.a, p.b) < alvo || Math.abs(p.a - p.b) < 2 || (Math.max(p.a, p.b) > alvo && Math.abs(p.a - p.b) !== 2); });
    if (invalido) return { ok: false, erro: "Algum set tem placar inválido (vai a 25, o 3º a 15, com 2 de diferença)." };
    if (parciais.length > 3 || Math.max(sc, sv) !== 2 || sc === sv || (parciais.length === 3 && Math.min(sc, sv) !== 1) || (parciais.length === 2 && Math.min(sc, sv) !== 0)) return { ok: false, erro: "O jogo é melhor de 3 sets: o vencedor precisa ter 2 sets." };
  }
  const upd = { sets_casa: sc, sets_visitante: sv, parciais, wo, status: wo ? "wo" : "finalizado", versao: (j.versao || 0) + 1, atualizado_em: new Date().toISOString() };
  const { error } = await sb.from("jogos").update(upd).eq("modalidade", mod).eq("id", id);
  if (error) return { ok: false, erro: error.message };
  await sb.from("partida_eventos").insert({ partida_id: id, tipo: "resultadoManual", dados: { por: c.usuario, parciais, wo } }).then(() => {}, () => {});
  return { ok: true, torneio: await montarTorneio(mod) };
}
// Cria a chave: 4 grupos de 3, 12 jogos de grupo, 4 quartas (sorteadas depois), 2 semifinais (V Q1xQ2, V Q3xQ4) e a final. Só administrador.
async function semearTorneio(d: Any) {
  const c: Any = await papel(d.auth, ["admin"]); if (c.erro) return { ok: false, erro: c.erro };
  const mod = modOf(d);
  const { data: ja } = await sb.from("jogos").select("id").eq("modalidade", mod).limit(1);
  if (ja && ja.length && !d.forcar) return { ok: false, erro: "A chave já existe. Use forcar:true para recriar (os jogos atuais serão apagados)." };
  if (ja && ja.length) await sb.from("jogos").delete().eq("modalidade", mod);
  const grupos: Any = d.grupos || {};
  const letras = Object.keys(grupos).sort();
  const equipes: Any[] = [], jogos: Any[] = []; let ordem = 0;
  for (const g of letras) {
    const nomes: string[] = (grupos[g] || []).map((n: string) => String(n).trim()).filter(Boolean);
    nomes.forEach((nome, i) => equipes.push({ modalidade: mod, nome, grupo: g, ordem: i }));
    const pares = [[0, 1], [0, 2], [1, 2]];
    pares.forEach(([a, b], i) => jogos.push({ modalidade: mod, id: g + (i + 1), fase: "grupos", grupo: g, rodada: i + 1, ordem: ++ordem, casa: nomes[a] || null, visitante: nomes[b] || null }));
  }
  const mm = [
    ["Q1", "quartas", null, null], ["Q2", "quartas", null, null], ["Q3", "quartas", null, null], ["Q4", "quartas", null, null],   // definidas por sorteio (potes de 1ºs e 2ºs)
    ["SF1", "semifinal", "V:Q1", "V:Q2"], ["SF2", "semifinal", "V:Q3", "V:Q4"], ["FINAL", "final", "V:SF1", "V:SF2"],
  ];
  mm.forEach(([id, fase, oc, ov]: Any) => jogos.push({ modalidade: mod, id, fase, origem_casa: oc, origem_visitante: ov, ordem: ++ordem }));
  if (equipes.length) await sb.from("torneio_equipes").upsert(equipes);
  const { error } = await sb.from("jogos").insert(jogos);
  return error ? { ok: false, erro: error.message } : { ok: true, jogos: jogos.length, equipes: equipes.length };
}

// ════════ Notícias do app ════════
async function listarNoticias() {
  const { data } = await sb.from("noticias").select("*").order("id");
  return (data || []).map((n: Any) => ({
    id: String(n.id), ic: n.icone || "📰", cat: n.categoria || "Notícia", titulo: n.titulo || "", data: n.data_txt || "", corpo: n.corpo || "",
    hora: new Date(n.criado_em).toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }),
  }));
}
async function salvarNoticia(d: Any) {
  const c: Any = await papel(d.auth, ["admin", "organizacao"]); if (c.erro) return { ok: false, erro: c.erro };
  const titulo = (d.titulo || "").toString().trim();
  if (!titulo) return { ok: false, erro: "Digite o título da notícia." };
  const reg: Any = {
    icone: (d.ic || "📰").toString().trim() || "📰", categoria: (d.cat || "Notícia").toString().trim() || "Notícia", titulo,
    data_txt: (d.data || "").toString().trim(), corpo: (d.corpo || "").toString().trim(), atualizado_em: new Date().toISOString(),
  };
  if (d.id) {
    const { data } = await sb.from("noticias").update(reg).eq("id", d.id).select("id");
    return data && data.length ? { ok: true, id: String(d.id) } : { ok: false, erro: "Notícia não encontrada." };
  }
  const { data, error } = await sb.from("noticias").insert(reg).select("id").single();
  return error ? { ok: false, erro: error.message } : { ok: true, id: String(data.id) };
}
async function excluirNoticia(d: Any) {
  const c: Any = await papel(d.auth, ["admin", "organizacao"]); if (c.erro) return { ok: false, erro: c.erro };
  const { data } = await sb.from("noticias").delete().eq("id", d.id || -1).select("id");
  return data && data.length ? { ok: true } : { ok: false, erro: "Notícia não encontrada." };
}
async function importarNoticias(d: Any) {
  const c: Any = await papel(d.auth, ["admin"]); if (c.erro) return { ok: false, erro: c.erro };
  const { data: ex } = await sb.from("noticias").select("titulo");
  const tem = new Set((ex || []).map((n: Any) => chaveEq(n.titulo)));
  let n = 0;
  for (const x of d.noticias || []) {
    const titulo = (x.titulo || "").toString().trim(); if (!titulo || tem.has(chaveEq(titulo))) continue;
    await sb.from("noticias").insert({ icone: x.ic || "📰", categoria: x.cat || "Notícia", titulo, data_txt: x.data || "", corpo: x.corpo || "" }); n++;
  }
  return { ok: true, importadas: n };
}

// ════════ Inscrições das equipes (escudo no Storage) ════════
const HEADERS_INSCRICOES = ["Carimbo de data/hora", "Modalidade", "Nome da Equipe", "Nome do Responsável", "Instagram", "Telefone/WhatsApp", "Cidade", "Precisa de Alojamento", "Pessoas no Alojamento", "Como conheceu a Supercopa", "Termo de Alojamento", "Termo de Compromisso", "Link do Escudo", "Status"];
const TIPOS_IMG: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "equipe";

async function guardarEscudo(nomeEquipe: string, base64: string): Promise<{ url?: string; erro?: string }> {
  const m = /^data:([a-z]+\/[a-z0-9.+-]+);base64,(.*)$/is.exec(base64 || "");
  const tipo = m ? m[1].toLowerCase() : "image/png";
  const ext = TIPOS_IMG[tipo];
  if (!ext) return { erro: "O escudo precisa ser uma imagem PNG, JPG, WEBP ou GIF." };
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob((m ? m[2] : base64).replace(/\s/g, "")), (c) => c.charCodeAt(0)); } catch (_) { return { erro: "Imagem do escudo inválida." }; }
  if (bytes.length > 4 * 1024 * 1024) return { erro: "O escudo é muito grande (máximo 4 MB)." };
  const nomeArq = slug(nomeEquipe) + "." + ext;
  // 1) Google Drive (pasta de escudos de sempre), pelo Apps Script
  try {
    const r = await fetch(APPS_SCRIPT, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ acao: "uploadEscudo", escudoBase64: base64, escudoNome: nomeArq }), signal: AbortSignal.timeout(40000) });
    const j = await r.json();
    if (j && j.ok && j.link) return { url: j.link };
  } catch (_) { /* cai para a reserva */ }
  // 2) Reserva: Storage do Supabase (a inscrição nunca se perde se o Drive/Apps Script estiver fora)
  const caminho = Date.now() + "-" + nomeArq;
  const { error } = await sb.storage.from("escudos").upload(caminho, bytes, { contentType: tipo, upsert: false });
  if (error) return { erro: "Não foi possível guardar o escudo: " + error.message };
  return { url: Deno.env.get("SUPABASE_URL")! + "/storage/v1/object/public/escudos/" + caminho };
}
async function inscrever(d: Any) {
  const nome = (d.nomeEquipe || "").toString().trim();
  const falha = (msg: string) => ({ ok: false, status: "erro", erro: msg, msg });
  if (!nome) return falha("Nome da equipe é obrigatório.");
  const modalidade = (d.modalidade || "").toString().trim();
  const { data: ja } = await sb.from("inscricoes").select("id").ilike("nome_equipe", nome.replace(/[%_]/g, (c) => "\\" + c)).ilike("modalidade", modalidade.replace(/[%_]/g, (c) => "\\" + c)).limit(1);
  if (ja && ja.length) return falha("Essa equipe já está inscrita nessa modalidade. Se precisar corrigir algo, fale com a organização.");
  let escudo = "";
  if (d.escudoBase64) { const r = await guardarEscudo(nome, d.escudoBase64); if (r.erro) return falha(r.erro); escudo = r.url!; }
  const alojSim = d.alojamento === "sim";
  const { error } = await sb.from("inscricoes").insert({
    modalidade, nome_equipe: nome, responsavel: (d.nomeResp || "").toString(), instagram: (d.instagram || "").toString(), telefone: (d.telefone || "").toString(),
    cidade: (d.cidade || "").toString(), alojamento: alojSim ? "Sim" : "Não", pessoas_alojamento: alojSim && d.alojQty ? Number(d.alojQty) || null : null,
    como_conheceu: (d.comoConheceu || "").toString(), termo_aloj: d.termoAloj ? "Assinado" : "", termo_comp: d.termoComp ? "Assinado" : "", escudo_url: escudo,
  });
  if (error) return error.code === "23505" ? falha("Essa equipe já está inscrita nessa modalidade. Se precisar corrigir algo, fale com a organização.") : falha(error.message);
  return { ok: true, status: "ok" };
}
async function listarInscricoes() {
  const { data } = await sb.from("inscricoes").select("*").order("id");
  const inscricoes = (data || []).filter((r: Any) => r.nome_equipe).map((r: Any) => ({
    _linha: r.id, "Carimbo de data/hora": r.carimbo, "Modalidade": r.modalidade, "Nome da Equipe": r.nome_equipe, "Nome do Responsável": r.responsavel,
    "Instagram": r.instagram, "Telefone/WhatsApp": r.telefone, "Cidade": r.cidade, "Precisa de Alojamento": r.alojamento,
    "Pessoas no Alojamento": r.pessoas_alojamento == null ? "" : r.pessoas_alojamento, "Como conheceu a Supercopa": r.como_conheceu,
    "Termo de Alojamento": r.termo_aloj, "Termo de Compromisso": r.termo_comp, "Link do Escudo": r.escudo_url, "Status": r.status,
  }));
  return { ok: true, headers: HEADERS_INSCRICOES, inscricoes };
}
// Equipes confirmadas para o site/app (sem telefone): dados da inscrição + escudo.
function escudoPublico(u: string) {
  const m = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=)([A-Za-z0-9_-]+)/.exec(u || "");
  return m ? "https://lh3.googleusercontent.com/d/" + m[1] + "=w320" : (u || "");
}
const CASA_DEFAULT: Record<string, Any> = { "ct das montanhas": { cidade: "Afonso Cláudio - ES", instagram: "@ctdasmontanhas", responsavel: "Caio Rebuli", alojamento: "Equipe da casa", como: "Equipe da casa" } };
async function timesPublicos() {
  const conf = await listarConfirmacoes();
  const { data: insc } = await sb.from("inscricoes").select("nome_equipe,cidade,instagram,responsavel,alojamento,pessoas_alojamento,como_conheceu,carimbo,escudo_url").ilike("modalidade", "v%lei");
  const por: Record<string, Any> = {};
  (insc || []).forEach((r: Any) => { por[chaveEq(r.nome_equipe || "")] = r; });
  const times = conf.map((c: Any) => {
    const k = chaveEq(c.equipe), r = por[k], d = CASA_DEFAULT[k] || {};
    let ig = ((r && r.instagram) || d.instagram || "").toString().trim(); if (ig && !ig.startsWith("@") && !/\s/.test(ig)) ig = "@" + ig;
    const aloj = r ? (r.alojamento === "Sim" ? "Sim" + (r.pessoas_alojamento ? " · " + r.pessoas_alojamento + " pessoas" : "") : "Não") : (d.alojamento || "");
    return { nome: c.equipe, cidade: ((r && r.cidade) || d.cidade || "").toString().trim(), instagram: ig, responsavel: ((r && r.responsavel) || d.responsavel || "").toString().trim(), alojamento: aloj, inscritaEm: r && r.carimbo ? String(r.carimbo).slice(0, 10) : "", como: (r && r.como_conheceu) || d.como || "", escudo: escudoPublico(r && r.escudo_url) };
  });
  return { ok: true, vagas: 12, times };
}

async function equipesConhecidas() {
  const nomes = new Set<string>();
  const [{ data: i }, { data: e }] = await Promise.all([sb.from("inscricoes").select("nome_equipe"), sb.from("torneio_equipes").select("nome").eq("modalidade", "volei")]);
  (i || []).forEach((r: Any) => { const n = (r.nome_equipe || "").trim(); if (n) nomes.add(n); });
  (e || []).forEach((r: Any) => { const n = (r.nome || "").trim(); if (n) nomes.add(n); });
  return [...nomes].sort((a, b) => a.localeCompare(b));
}
// Importa as inscrições antigas e copia os escudos do Drive para o Storage (só administrador; pode repetir).
async function importarInscricoes(d: Any) {
  const c: Any = await papel(d.auth, ["admin"]); if (c.erro) return { ok: false, erro: c.erro };
  const rel: Any = { importadas: 0, jaExistiam: 0, escudosCopiados: 0, escudosMantidosNoDrive: 0, avisos: [] };
  for (const r of d.inscricoes || []) {
    const nome = (r["Nome da Equipe"] || "").toString().trim(); if (!nome) continue;
    const modalidade = (r["Modalidade"] || "").toString().trim();
    const { data: ja } = await sb.from("inscricoes").select("id,escudo_url").ilike("nome_equipe", nome.replace(/[%_]/g, (x: string) => "\\" + x)).ilike("modalidade", modalidade.replace(/[%_]/g, (x: string) => "\\" + x)).limit(1);
    let escudo = (r["Link do Escudo"] || "").toString();
    const drive = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=)([A-Za-z0-9_-]+)/.exec(escudo);
    const registro = ja && ja[0];
    if (drive && d.copiarEscudos && !(registro && !/drive\.google\.com/.test(registro.escudo_url || ""))) {
      try {
        const resp = await fetch("https://drive.google.com/uc?export=download&id=" + drive[1], { signal: AbortSignal.timeout(25000) });
        const tipo = (resp.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
        const buf = new Uint8Array(await resp.arrayBuffer());
        if (resp.ok && TIPOS_IMG[tipo] && buf.length > 0 && buf.length <= 4 * 1024 * 1024) {
          const caminho = Date.now() + "-" + slug(nome) + "." + TIPOS_IMG[tipo];
          const { error } = await sb.storage.from("escudos").upload(caminho, buf, { contentType: tipo, upsert: false });
          if (!error) { escudo = Deno.env.get("SUPABASE_URL")! + "/storage/v1/object/public/escudos/" + caminho; rel.escudosCopiados++; }
          else { rel.escudosMantidosNoDrive++; rel.avisos.push(nome + ": " + error.message); }
        } else { rel.escudosMantidosNoDrive++; rel.avisos.push(nome + ": Drive devolveu " + (tipo || resp.status)); }
      } catch (ex) { rel.escudosMantidosNoDrive++; rel.avisos.push(nome + ": " + (ex as Error).message); }
    }
    if (registro) {
      rel.jaExistiam++;
      if (escudo && escudo !== registro.escudo_url) await sb.from("inscricoes").update({ escudo_url: escudo }).eq("id", registro.id);
      continue;
    }
    const aloj = r["Pessoas no Alojamento"];
    const { error } = await sb.from("inscricoes").insert({
      carimbo: r["Carimbo de data/hora"] || new Date().toISOString(), modalidade, nome_equipe: nome, responsavel: r["Nome do Responsável"] || "", instagram: r["Instagram"] || "",
      telefone: r["Telefone/WhatsApp"] || "", cidade: r["Cidade"] || "", alojamento: r["Precisa de Alojamento"] || "Não", pessoas_alojamento: aloj === "" || aloj == null ? null : Number(aloj) || null,
      como_conheceu: r["Como conheceu a Supercopa"] || "", termo_aloj: r["Termo de Alojamento"] || "", termo_comp: r["Termo de Compromisso"] || "", escudo_url: escudo, status: r["Status"] || "Pendente",
    });
    if (error) rel.avisos.push(nome + ": " + error.message); else rel.importadas++;
  }
  return { ok: true, ...rel };
}

// ════════ Quiz, acessos, instalações e feedback ════════
const FEEDBACK_HEADERS = ["Carimbo de data/hora", "1. Qual sua nota para a organização e infraestrutura?", "2. Qual sua nota para a arbitragem?", "3. O que você achou do app da Supercopa?", "4. Qual sua nota geral para o evento?", "5. Recomendaria a Supercopa?", "6. Pontos positivos", "7. Pontos a melhorar", "8. Seu time"];
const devOk = (s: Any) => { s = (s || "").toString().trim(); return s && s.length <= 120 ? s : ""; };
async function paginar(tab: string, cols: string, ordem = "id") {
  const out: Any[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from(tab).select(cols).order(ordem).range(de, de + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}
async function registrarVisita(plataforma: "app" | "site", deviceId: Any) {
  const id = devOk(deviceId); if (!id) return { ok: false, erro: "deviceId ausente" };
  const agora = new Date().toISOString();
  await sb.from("acessos_log").insert({ data: agora.slice(0, 10), plataforma });
  const { data: ex } = await sb.from("acessos").select("visitas").eq("device_id", id).eq("plataforma", plataforma).maybeSingle();
  if (ex) { await sb.from("acessos").update({ ultima: agora, visitas: (ex.visitas || 0) + 1 }).eq("device_id", id).eq("plataforma", plataforma); return { ok: true, novo: false }; }
  await sb.from("acessos").insert({ device_id: id, plataforma, primeira: agora, ultima: agora, visitas: 1 });
  return { ok: true, novo: true };
}
async function registrarInstalacao(deviceId: Any) {
  const id = devOk(deviceId); if (!id) return { ok: false, erro: "deviceId ausente" };
  const { data: ex } = await sb.from("instalacoes").select("device_id").eq("device_id", id).maybeSingle();
  if (ex) { await sb.from("instalacoes").update({ ultima: new Date().toISOString() }).eq("device_id", id); return { ok: true, novo: false }; }
  await sb.from("instalacoes").insert({ device_id: id });
  return { ok: true, novo: true };
}
async function legado(chave: string) { const { data } = await sb.from("contadores_legados").select("valor").eq("chave", chave).maybeSingle(); return data ? data.valor : 0; }
async function contarAcessos(plataforma: "app" | "site") {
  const linhas = await paginar("acessos", "visitas,plataforma,device_id", "device_id");
  const meus = linhas.filter((r) => r.plataforma === plataforma);
  return { unicos: meus.length + await legado(plataforma + "_unicos"), total: meus.reduce((s, r) => s + (r.visitas || 0), 0) + await legado(plataforma + "_total") };
}
async function contarInstalacoes() {
  const { count } = await sb.from("instalacoes").select("device_id", { count: "exact", head: true });
  return { total: (count || 0) + await legado("instalacoes") };
}
async function acessosLog() {
  const l = await paginar("acessos_log", "data,plataforma");
  return { ok: true, log: l.map((r) => ({ data: r.data, plataforma: r.plataforma })) };
}
async function registrarQuiz(d: Any) {
  const num = (x: Any) => { const n = parseFloat((x ?? "0").toString().replace("%", "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
  const nome = (d.nome || "").toString().trim().slice(0, 120);
  if (!nome) return { ok: false, erro: "Nome obrigatório" };
  const { error } = await sb.from("quiz_respostas").insert({ nome, fone: (d.fone || "—").toString().trim().slice(0, 40), acertos: Math.max(0, parseInt(d.acertos) || 0), total: Math.max(0, parseInt(d.total) || 0), pct: num(d.pct ?? d.percentual), tempo: (d.tempo ?? d.tempo_segundos ?? "—").toString().slice(0, 20) });
  return error ? { ok: false, erro: error.message } : { ok: true, status: "ok" };
}
async function rankingQuiz() {
  const rows = await paginar("quiz_respostas", "*");
  const porFone: Any = {};
  rows.forEach((r) => { const fone = (r.fone || "").trim(); if (!fone) return; if (!porFone[fone] || Number(r.pct) > Number(porFone[fone].pct)) porFone[fone] = r; });
  const ranking = Object.values(porFone).map((r: Any) => { let p = Number(r.pct) || 0; if (p > 0 && p <= 1) p = Math.round(p * 10000) / 100; return { nome: (r.nome || "").trim(), fone: (r.fone || "").trim(), acertos: r.acertos, total: r.total, pct: p.toFixed(2), tempo: (r.tempo || "").trim() }; });
  ranking.sort((a: Any, b: Any) => (parseFloat(b.pct) || 0) - (parseFloat(a.pct) || 0) || (parseFloat(a.tempo) || 999) - (parseFloat(b.tempo) || 999));
  return { ranking };
}
async function registrarFeedback(d: Any) {
  const n = (x: Any) => { const v = parseInt(x); return v >= 1 && v <= 10 ? v : null; };
  if ([d.organizacao, d.arbitragem, d.app, d.notaGeral, d.recomendaria].every((x) => n(x) === null)) return { ok: false, erro: "Responda pelo menos uma nota." };
  const { error } = await sb.from("feedback").insert({ organizacao: n(d.organizacao), arbitragem: n(d.arbitragem), app: n(d.app), nota_geral: n(d.notaGeral), recomendaria: n(d.recomendaria), positivos: (d.positivos || "").toString().slice(0, 2000), melhorar: (d.melhorar || "").toString().slice(0, 2000), time: (d.time || "").toString().slice(0, 120) });
  return error ? { ok: false, erro: error.message } : { ok: true };
}
async function listarFeedback() {
  const l = await paginar("feedback", "*");
  const respostas = l.map((r) => { const o: Any = {}; const v = [r.criado_em, r.organizacao, r.arbitragem, r.app, r.nota_geral, r.recomendaria, r.positivos, r.melhorar, r.time]; FEEDBACK_HEADERS.forEach((h, i) => (o[h] = v[i] ?? "")); return o; });
  return { ok: true, headers: FEEDBACK_HEADERS, respostas };
}
// Importa os números e o log do Apps Script antigo (só administrador; pode repetir).
async function importarLegado(d: Any) {
  const c: Any = await papel(d.auth, ["admin"]); if (c.erro) return { ok: false, erro: c.erro };
  for (const [k, v] of Object.entries(d.contadores || {})) await sb.from("contadores_legados").upsert({ chave: k, valor: Number(v) || 0 });
  let log = 0;
  if (Array.isArray(d.acessosLog)) {
    await sb.from("acessos_log").delete().eq("legado", true);
    const linhas = d.acessosLog.filter((x: Any) => /^\d{4}-\d{2}-\d{2}$/.test(x.data) && ["app", "site"].includes(x.plataforma)).map((x: Any) => ({ data: x.data, plataforma: x.plataforma, legado: true }));
    for (let i = 0; i < linhas.length; i += 500) { const { error } = await sb.from("acessos_log").insert(linhas.slice(i, i + 500)); if (error) return { ok: false, erro: error.message }; log += Math.min(500, linhas.length - i); }
  }
  return { ok: true, contadores: Object.keys(d.contadores || {}).length, log };
}
async function excluirInscricao(d: Any) {
  const c: Any = await papel(d.auth, ["admin"]); if (c.erro) return { ok: false, erro: c.erro };
  const { data } = await sb.from("inscricoes").delete().eq("id", d.id || -1).select("id");
  return data && data.length ? { ok: true } : { ok: false, erro: "Inscrição não encontrada." };
}

// ════════ Votação do Atleta Destaque (1 voto por WhatsApp e por aparelho) ════════
const normN = (s: Any) => (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
async function configVotacao() {
  const { data } = await sb.from("config").select("valor").eq("chave", "votacao_destaque").maybeSingle();
  const v: Any = (data && data.valor) || {};
  const aberta = v.aberta !== false && !(v.encerraEm && new Date(v.encerraEm) < new Date());
  return { aberta, encerraEm: v.encerraEm || null, manual: v.aberta === false };
}
// Atletas que JOGARAM em partidas já encerradas (titulares, líbero, escalações de cada set e quem entrou por substituição).
async function elegiveisDestaque(incluirTeste: boolean) {
  const { data } = await sb.from("partidas").select("id,equipe_casa,equipe_visitante,estado").eq("status", "finalizada");
  const porEquipe: Record<string, Record<string, { numero: string; nome: string }>> = {};
  const add = (eq: string, p: Any) => {
    if (!eq || !p || !(p.nome || "").toString().trim()) return;
    const k = normN(p.nome), m = (porEquipe[eq] = porEquipe[eq] || {});
    if (!m[k] || (!m[k].numero && p.numero)) m[k] = { numero: (p.numero || "").toString(), nome: p.nome.toString().trim() };
  };
  (data || []).filter((r: Any) => incluirTeste || !ehTeste(r.id)).forEach((r: Any) => {
    const e = r.estado || {};
    [["A", r.equipe_casa, e.elencoCasa, "rotacaoCasa"], ["B", r.equipe_visitante, e.elencoVisitante, "rotacaoVisitante"]].forEach(([lado, eq, elenco, rot]: Any) => {
      ((elenco && elenco.titulares) || []).forEach((p: Any) => add(eq, p));
      if (elenco && elenco.libero) add(eq, elenco.libero);
      Object.values(e.escalacoesPorSet || {}).forEach((s: Any) => (s[rot] || []).forEach((p: Any) => add(eq, p)));
      (e[rot] || []).forEach((p: Any) => add(eq, p));
    });
    // quem entrou por substituição só tem o nome (o número vem do cadastro/elenco quando existir)
    (e.substituicoes || []).forEach((s: Any) => add(s.equipe === "A" ? r.equipe_casa : r.equipe_visitante, { nome: s.entrou, numero: "" }));
  });
  // completa o número com o cadastro de atletas
  const { data: cad } = await sb.from("atletas").select("equipe,numero,nome,tipo");
  (cad || []).forEach((a: Any) => {
    if ((a.tipo || "Atleta") !== "Atleta") return;
    const eq = Object.keys(porEquipe).find((x) => chaveEq(x) === chaveEq(a.equipe));
    if (eq && porEquipe[eq][normN(a.nome)] && !porEquipe[eq][normN(a.nome)].numero) porEquipe[eq][normN(a.nome)].numero = (a.numero || "").toString();
  });
  const num = (x: string) => (parseInt(x) >= 0 ? parseInt(x) : 9999);
  return Object.keys(porEquipe).sort((a, b) => a.localeCompare(b)).map((eq) => ({
    equipe: eq, atletas: Object.values(porEquipe[eq]).sort((a, b) => num(a.numero) - num(b.numero) || a.nome.localeCompare(b.nome)),
  }));
}
async function dadosVotacao(d: Any) {
  const [cfg, equipes, { count }] = await Promise.all([configVotacao(), elegiveisDestaque(d.teste === "1" || d.teste === true), sb.from("votos_destaque").select("id", { count: "exact", head: true }).eq("teste", d.teste === "1" || d.teste === true)]);
  return { ok: true, aberta: cfg.aberta, encerraEm: cfg.encerraEm, equipes, totalVotos: count || 0 };
}
async function rankingDestaque(d: Any) {
  const teste = d.teste === "1" || d.teste === true;
  const linhas: Any[] = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from("votos_destaque").select("equipe,atleta_nome,atleta_numero").eq("teste", teste).order("id").range(de, de + 999);
    linhas.push(...(data || [])); if (!data || data.length < 1000) break;
  }
  const mapa: Record<string, Any> = {};
  linhas.forEach((v) => { const k = chaveEq(v.equipe) + "|" + normN(v.atleta_nome); (mapa[k] = mapa[k] || { equipe: v.equipe, nome: v.atleta_nome, numero: v.atleta_numero, votos: 0 }).votos++; });
  const total = linhas.length;
  const ranking = Object.values(mapa).sort((a: Any, b: Any) => b.votos - a.votos || a.nome.localeCompare(b.nome)).slice(0, 20).map((r: Any, i: number) => ({ pos: i + 1, ...r, pct: total ? Math.round((r.votos / total) * 1000) / 10 : 0 }));
  const cfg = await configVotacao();
  return { ok: true, ranking, totalVotos: total, aberta: cfg.aberta, atualizadoEm: new Date().toISOString() };
}
async function sha256Hex(s: string) { return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((x) => x.toString(16).padStart(2, "0")).join(""); }
function normalizarTelefone(raw: Any): string | null {
  let n = (raw || "").toString().replace(/\D/g, "");
  if (n.startsWith("55") && n.length >= 12) n = n.slice(2);
  if (n.length === 11 && n[2] === "9") return n;       // celular com 9
  if (n.length === 10) return n;                       // fixo/antigo
  return null;
}
async function votarDestaque(d: Any) {
  const teste = d.teste === true || d.teste === "1";
  const cfg = await configVotacao();
  if (!cfg.aberta) return { ok: false, erro: "A votação está encerrada.", encerrada: true };
  const nome = (d.nome || "").toString().trim().replace(/\s+/g, " ");
  if (nome.length < 3 || nome.length > 80) return { ok: false, erro: "Digite seu nome (mínimo 3 letras)." };
  const tel = normalizarTelefone(d.whatsapp);
  if (!tel) return { ok: false, erro: "Digite um WhatsApp válido com DDD, ex.: (27) 99999-9999." };
  if (!d.aceite) return { ok: false, erro: "Marque que concorda com as regras da votação." };
  const eqs = await elegiveisDestaque(teste);
  const eq = eqs.find((e) => chaveEq(e.equipe) === chaveEq(d.equipe));
  const at = eq && eq.atletas.find((a) => normN(a.nome) === normN(d.atletaNome));
  if (!eq || !at) return { ok: false, erro: "Esse atleta não está disponível para voto (só quem já jogou em partida encerrada)." };
  const dev = devOk(d.deviceId);
  const hash = await sha256Hex("sc-destaque|" + tel);
  const { error } = await sb.from("votos_destaque").insert({ tel_hash: hash, tel_final: tel.slice(-4), device_id: dev || null, nome_votante: nome, equipe: eq.equipe, atleta_numero: at.numero, atleta_nome: at.nome, teste });
  if (error) {
    if (error.code === "23505") return { ok: false, erro: "Este WhatsApp ou este aparelho já votou. Cada pessoa vota apenas 1 vez.", jaVotou: true };
    return { ok: false, erro: error.message };
  }
  return { ok: true, voto: { equipe: eq.equipe, nome: at.nome, numero: at.numero }, ...(await rankingDestaque({ teste })) };
}
async function definirVotacao(d: Any) {
  const c: Any = await papel(d.auth, ["admin", "organizacao"]); if (c.erro) return { ok: false, erro: c.erro };
  const valor: Any = { aberta: d.aberta !== false, encerraEm: d.encerraEm || null };
  await sb.from("config").upsert({ chave: "votacao_destaque", valor, atualizado_em: new Date().toISOString() });
  return { ok: true, ...(await configVotacao()) };
}
async function listarVotosDestaque(d: Any) {
  const c: Any = await papel(d.auth, ["admin", "organizacao"]); if (c.erro) return { ok: false, erro: c.erro };
  const { data } = await sb.from("votos_destaque").select("id,criado_em,nome_votante,tel_final,equipe,atleta_nome,atleta_numero,teste").order("id", { ascending: false }).limit(100);
  return { ok: true, votos: (data || []).map((v: Any) => ({ ...v, criado_em: fmtBR(v.criado_em) })) };
}
async function anularVotoDestaque(d: Any) {
  const c: Any = await papel(d.auth, ["admin"]); if (c.erro) return { ok: false, erro: c.erro };
  const { data } = await sb.from("votos_destaque").delete().eq("id", d.id || -1).select("id");
  return data && data.length ? { ok: true } : { ok: false, erro: "Voto não encontrado." };
}

// Tira uma equipe da lista de convites (PIN, confirmação, termo, assinaturas e atletas). Só administrador.
// Por segurança recusa equipe que já confirmou presença ou já tem atletas, a menos que venha forcar:true.
async function removerEquipe(d: Any) {
  const c: Any = await papel(d.auth, ["admin"]);
  if (c.erro) return { ok: false, erro: c.erro };
  const equipe = (d.equipe || "").toString().trim(), k = chaveEq(equipe);
  if (!k) return { ok: false, erro: "Equipe é obrigatória." };
  const { data: pin } = await sb.from("equipes_pin").select("equipe").eq("chave", k).maybeSingle();
  if (!pin) return { ok: false, erro: "Equipe não está na lista de convites." };
  const { data: conf } = await sb.from("confirmacoes").select("chave").eq("chave", k).maybeSingle();
  const atletas = await atletasDe(pin.equipe);
  if ((conf || atletas.length) && !d.forcar) return { ok: false, erro: "Essa equipe " + (conf ? "já confirmou presença" : "") + (conf && atletas.length ? " e " : "") + (atletas.length ? "tem " + atletas.length + " atleta(s) cadastrado(s)" : "") + ". Confirme com forcar:true para remover mesmo assim." };
  for (const tab of ["equipes_pin", "confirmacoes", "consentimentos", "assinaturas"]) await sb.from(tab).delete().eq("chave", k);
  for (const a of atletas) await sb.from("atletas").delete().eq("id", a.id);
  return { ok: true, removida: pin.equipe, atletasRemovidos: atletas.length };
}

// Exportação completa (backup) — só administrador.
async function exportarTudo(d: Any) {
  const c: Any = await papel(d.auth, ["admin"]);
  if (c.erro) return { ok: false, erro: c.erro };
  const out: Any = { geradoEm: new Date().toISOString() };
  for (const tab of ["partidas", "partida_eventos", "atletas", "equipes_pin", "confirmacoes", "consentimentos", "assinaturas", "juizes", "avisos"]) {
    const linhas: Any[] = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await sb.from(tab).select("*").range(de, de + 999);
      if (error) return { ok: false, erro: tab + ": " + error.message };
      linhas.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    out[tab] = linhas;
  }
  return { ok: true, backup: out };
}

async function rotear(acao: string, d: Any, ehGet: boolean): Promise<Any | null> {
  switch (acao) {
    case "exportarTudo": return await exportarTudo(d);
    case "removerEquipe": return await removerEquipe(d);
    case "votarDestaque": return await votarDestaque(d);
    case "definirVotacao": return await definirVotacao(d);
    case "listarVotosDestaque": return await listarVotosDestaque(d);
    case "anularVotoDestaque": return await anularVotoDestaque(d);
    case "tipo:quiz": return await registrarQuiz(d);
    case "tipo:app_install": return await registrarInstalacao(d.deviceId);
    case "tipo:app_acesso": return await registrarVisita("app", d.deviceId);
    case "tipo:site_acesso": return await registrarVisita("site", d.deviceId);
    case "tipo:push_subscribe": case "tipo:push_unsubscribe": case "tipo:push_limpar": return { ok: true };   // push usa servidor próprio (Render)
    case "feedback": return ehGet ? await listarFeedback() : await registrarFeedback(d);
    case "importarLegado": return await importarLegado(d);
    case "excluirInscricao": return await excluirInscricao(d);
    case "inscrever": return await inscrever(d);
    case "importarInscricoes": return await importarInscricoes(d);
    case "salvarNoticia": return await salvarNoticia(d);
    case "excluirNoticia": return await excluirNoticia(d);
    case "importarNoticias": return await importarNoticias(d);
    case "salvarEquipeTorneio": return await salvarEquipeTorneio(d);
    case "removerEquipeTorneio": return await removerEquipeTorneio(d);
    case "salvarJogo": return await salvarJogo(d);
    case "excluirJogoTorneio": return await excluirJogoTorneio(d);
    case "lancarResultado": return await lancarResultado(d);
    case "semearTorneio": return await semearTorneio(d);
    case "sortearQuarta": return await sortearQuarta(d);
    case "desfazerSorteioQuarta": return await desfazerSorteioQuarta(d);
    case "loginPainel": return await loginPainelAcao(d);
    case "listarUsuariosPainel": return await listarUsuariosPainel(d);
    case "salvarUsuarioPainel": return await salvarUsuarioPainel(d);
    case "removerUsuarioPainel": return await removerUsuarioPainel(d);
    case "trocarSenhaAdmin": return await trocarSenhaAdmin(d);
    case "importarUsuarios": return await importarUsuarios(d);
    case "limparTestes": return await limparTestes(d);
    case "salvarAviso": return await salvarAviso(d);
    case "excluirAviso": return await excluirAviso(d);
    case "registrarPresenca": return await registrarPresenca(d);
    case "saudeSistema": return await saudeSistema(d);
    case "salvarPremiacao": {
      if (!d.categoria || !d.nome) return { ok: false, erro: "Categoria e nome são obrigatórios" };
      const { error } = await sb.from("premiacao").upsert({ categoria: String(d.categoria).trim(), nome: d.nome, equipe: d.equipe || "", atualizado: fmtBR(new Date()) });
      return error ? { ok: false, erro: error.message } : { ok: true };
    }
    case "excluirPremiacao": await sb.from("premiacao").delete().eq("categoria", String(d.categoria || "").trim()); return { ok: true };
    case "adicionar": {
      const l = d.linha || [];
      const { error } = await sb.from("destaques").insert({ modalidade: String(l[0] ?? ""), jogo: String(l[1] ?? ""), nome: String(l[2] ?? ""), equipe: String(l[3] ?? ""), observacao: String(l[4] ?? ""), data_hora: String(l[5] ?? "") });
      return error ? { ok: false, erro: error.message } : { ok: true };
    }
    case "excluir": { const id = parseInt(d.rowIndex); if (id > 0) await sb.from("destaques").delete().eq("id", id); return { ok: true }; }
    case "votar": case "votar_atleta": {
      const atleta = (d.atleta || "").toString().trim(), time = (d.time || "").toString().trim();
      if (!atleta) return { ok: false, erro: "Nome do atleta obrigatório" };
      const { error } = await sb.from("galera_votos").insert({ atleta, time });
      return error ? { ok: false, erro: error.message } : { ok: true };
    }
    case "migrarDoSheets": return await migrarDoSheets(d);
    case "cadastrarAtleta": return await cadastrarAtleta(d);
    case "removerAtleta": return await removerAtleta(d);
    case "cadastrarAtletaApp": case "removerAtletaApp":
      if (!(await pinOk(d.equipe, d.pin))) return { ok: false, erro: "PIN incorreto. Confirme o PIN da sua equipe." };
      if (new Date() > PRAZO_CADASTRO_ATLETAS) return { ok: false, erro: PRAZO_MSG };
      return acao === "cadastrarAtletaApp" ? await cadastrarAtleta(d) : await removerAtleta(d);
    case "cadastrarAtletaAdmin": case "removerAtletaAdmin":
      if (!(await SENHA_OK(d.senha))) return { ok: false, erro: "Senha incorreta." };
      return acao === "cadastrarAtletaAdmin" ? await cadastrarAtleta(d) : await removerAtleta(d);
    case "gerarPinEquipe": return await gerarPin(d);
    case "definirPinEquipe": return await definirPinEquipe(d);
    case "confirmarPresenca": return await confirmarPresenca(d);
    case "aceitarTermoLgpd": return await aceitarTermo(d);
    case "cadastrarJuiz": return await cadastrarJuiz(d);
    case "removerJuiz": return await removerJuiz(d);
    case "salvarAssinatura": return await salvarAssinatura(d);
  }
  if (ehGet) {
    switch (acao) {
      case "atletasEquipe": return { ok: true, atletas: (await atletasDe(d.equipe || "")).map(atletaOut) };
      case "atletasTodos": { const { data } = await sb.from("atletas").select("equipe,numero,nome,tipo").order("id"); return { ok: true, atletas: (data || []).filter((a: Any) => a.nome).map(atletaOut) }; }
      case "atletasEquipeApp":
        if (!(await pinOk(d.equipe, d.pin))) return { ok: false, erro: "PIN incorreto." };
        return { ok: true, atletas: (await atletasDe(d.equipe)).map(atletaOut) };
      case "temPinEquipe": return { ok: true, temPin: !!(await pinDe(d.equipe || "")) };
      case "verPinEquipeAdmin": return { ok: true, pin: await pinDe(d.equipe || "") };
      case "verificarPinEquipe": return { ok: await pinOk(d.equipe || "", d.pin) };
      case "statusConfirmacao": {
        const { data } = await sb.from("confirmacoes").select("confirmado_em").eq("chave", chaveEq(d.equipe)).maybeSingle();
        return data ? { ok: true, confirmado: true, confirmadoEm: fmtBR(data.confirmado_em) } : { ok: true, confirmado: false };
      }
      case "confirmacoes": return { ok: true, confirmacoes: await listarConfirmacoes() };
      case "equipesComPin": return { ok: true, equipes: await equipesComPin() };
      case "statusCadastroEquipes": return { ok: true, equipes: await statusCadastro() };
      case "statusTermo": return await statusTermo(d.equipe || "");
      case "listarJuizes": return { ok: true, juizes: await listarJuizes() };
      case "votacao": return await dadosVotacao(d);
      case "rankingDestaque": return await rankingDestaque(d);
      case "ranking_quiz": return await rankingQuiz();
      case "count_installs": return await contarInstalacoes();
      case "count_acessos": return await contarAcessos("app");
      case "count_acessos_site": return await contarAcessos("site");
      case "acessos_log": return await acessosLog();
      case "feedback": return await listarFeedback();
      case "inscricoes": return await listarInscricoes();
      case "equipesConhecidas": return { ok: true, equipes: await equipesConhecidas() };
      case "timesPublicos": return await timesPublicos();
      case "noticias": return { ok: true, noticias: await listarNoticias() };
      case "torneio": case "classificacao": return await montarTorneio(modOf(d));
      case "jogo": { const r = await jogoDaTabela(d); if (r) return r; break; }
      case "verificarSenhaAdmin": return { ok: await senhaAdminOk(d.senha) };
      case "avisos": return { ok: true, avisos: await listarAvisos() };
      case "listarPresencas": return { ok: true, presencas: await listarPresencas(d.jogo || "") };
      case "ranking": case "ranking_atleta": return { ok: true, ranking: await rankingGalera() };
      case "atletasTime": return await atletasTimeDestaque(d.equipe || "");
      case "premiacao": { const { data } = await sb.from("premiacao").select("*"); return { premiacao: (data || []).map((p: Any) => ({ categoria: p.categoria, nome: p.nome, equipe: p.equipe || "", atualizado: p.atualizado || "" })) }; }
      case "destaques": { const { data } = await sb.from("destaques").select("*").order("id"); return { ok: true, destaques: (data || []).filter((r: Any) => r.nome).map((r: Any) => ({ _linha: r.id, modalidade: r.modalidade, jogo: r.jogo, nome: r.nome, equipe: r.equipe, observacao: r.observacao, dataHora: r.data_hora })) }; }
      case "assinaturasEquipe": return { ok: true, assinaturas: await assinaturasEquipe(d.equipe || "") };
    }
  }
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
    let chave = d.acao || d.action || (d.tipo ? "tipo:" + d.tipo : "");
    if (!chave && d.nome !== undefined && d.acertos !== undefined) chave = "tipo:quiz";   // quiz antigo: sem "tipo"
    const r = await rotear(chave, d, false);
    if (r) return json(r);
    const p = await fetch(APPS_SCRIPT, { method: "POST", headers: { "Content-Type": "text/plain" }, body: corpo });   // repasse
    return new Response(await p.text(), { headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
  } catch (ex) {
    return json({ ok: false, erro: (ex as Error).message });
  }
});
