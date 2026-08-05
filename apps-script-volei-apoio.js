// ============================================================
//  SUPERCOPA AFC — Vôlei: Atleta Destaque + Melhores do
//  Campeonato + Destaque da Galera (tudo numa planilha só)
// ============================================================
//
// Isso substitui, só para o Vôlei, o que hoje está espalhado em
// 3 planilhas/scripts diferentes do Basquete. Uma planilha, três
// abas, um único Apps Script.
//
// COMO USAR:
// 1. Acesse https://script.google.com e clique em "Novo projeto"
// 2. Apague o conteúdo padrão e cole todo este arquivo
// 3. Rode a função "criarPlanilhaVolei" uma vez (autorize sua
//    conta na primeira execução).
// 4. Veja o log (menu "Execuções"): vai aparecer o link da
//    planilha criada.
// 5. Clique em "Implantar" > "Nova implantação"
//    - Tipo: "Aplicativo da Web"
//    - Executar como: "Eu" (sua conta)
//    - Quem tem acesso: "Qualquer pessoa"
// 6. Copie a URL gerada (termina em /exec) e me envie aqui no
//    chat — é o que eu uso para ligar o Painel Admin e o app.

const ABA_DESTAQUE = 'Destaque';
const ABA_PREMIACAO_V = 'Premiacao';
const ABA_GALERA = 'Galera';
const ABA_INSCRICOES = 'Inscricoes';

// Pasta de escudos no Drive (mesma de sempre, compartilhada como
// "Qualquer pessoa com o link"):
// https://drive.google.com/drive/folders/1u8SuBSGXJHnzonB7rQKxfu6TeYyxymr_
const FOLDER_ID_ESCUDOS = '1u8SuBSGXJHnzonB7rQKxfu6TeYyxymr_';

const HEADERS_INSCRICOES = [
  'Carimbo de data/hora', 'Modalidade', 'Nome da Equipe', 'Nome do Responsável', 'Instagram',
  'Telefone/WhatsApp', 'Cidade', 'Precisa de Alojamento', 'Pessoas no Alojamento',
  'Como conheceu a Supercopa', 'Termo de Alojamento', 'Termo de Compromisso',
  'Link do Escudo', 'Status'
];

// ── SÚMULA DIGITAL (jogos/placar do Vôlei) ─────────────────
// Planilha separada, só de jogos/placar (Fase de Grupos + Mata-Mata):
// https://docs.google.com/spreadsheets/d/12-yxLsIplLMAj0Y9jCpzl2OGJLKPhy_lWAtvYP-Vvh8/edit
const ABA_SUMULAS = 'Sumulas';
const JOGOS_SHEET_ID = '12-yxLsIplLMAj0Y9jCpzl2OGJLKPhy_lWAtvYP-Vvh8';
const ABA_GRUPOS = 'Fase de Grupos';
const ABA_MATA = 'Mata-Mata';

// Linha (1-indexed) de cada jogo dentro da planilha de jogos.
const ROW_MAP_GRUPOS = {
  A1: 11, A2: 12, A3: 13,
  B1: 23, B2: 24, B3: 25,
  C1: 35, C2: 36, C3: 37,
  D1: 47, D2: 48, D3: 49
};
const ROW_MAP_MATA = {
  Q1: 6, Q2: 7, Q3: 8, Q4: 9,
  SF1: 13, SF2: 14,
  FINAL: 18
};

const HEADERS_SUMULAS = [
  'ID Jogo', 'Aba', 'Linha', 'Equipe Casa', 'Equipe Visitante',
  'Titulares Casa', 'Líbero Casa', 'Titulares Visitante', 'Líbero Visitante',
  'Sets', 'Timeouts Casa', 'Timeouts Visitante', 'Cartões', 'Substituições',
  'Árbitro', 'Anotador', 'Local', 'Status', 'Atualizado em'
];

// ── CADASTRO DE ATLETAS (número + nome por time) ────────────
const ABA_ATLETAS = 'Atletas';
const HEADERS_ATLETAS = ['Equipe', 'Numero', 'Nome', 'Tipo', 'Cadastrado em'];
const LIMITE_ATLETAS = 14;
const LIMITE_COMISSAO = 2;

// ── PIN DE ACESSO POR EQUIPE (protege o cadastro de atletas) ──
const ABA_EQUIPES_PIN = 'EquipesPin';
const HEADERS_EQUIPES_PIN = ['Equipe', 'PIN', 'Gerado em'];

// ── SÚMULA AO VIVO (console de arbitragem, dentro do painel) ──
const ABA_PARTIDAS = 'Partidas';
const PLACAR_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbznh7KfIJxIEF-aWd2TMIZ8l2XWdFoKrjU5xdo7HCRtRzYBkAL0v3AgucYRRj9b9eQH/exec';

const HEADERS_PARTIDAS = [
  'ID Jogo', 'Aba', 'Linha', 'Equipe Casa', 'Equipe Visitante',
  'Elenco Casa', 'Elenco Visitante',
  'Arbitro1', 'Arbitro2', 'Apontador',
  'SetAtual', 'PontosCasa', 'PontosVisitante', 'SetsCasa', 'SetsVisitante',
  'Sacando', 'RotacaoCasa', 'RotacaoVisitante', 'PrimeiroSaqueSet',
  'HistoricoSets', 'Timeouts', 'Cartoes', 'Substituicoes', 'EventosLog',
  'Status', 'LinkPDF', 'CriadoEm', 'AtualizadoEm',
  'CapitaoCasa', 'CapitaoVisitante', 'Observacoes',
  'HistoricoPontos', 'CapitaoQuadraCasa', 'CapitaoQuadraVisitante', 'RotacaoConfirmadaSet'
];
// Índices das colunas (0-based) para referência rápida.
const PC = {
  id:0, aba:1, linha:2, equipeCasa:3, equipeVisitante:4,
  elencoCasa:5, elencoVisitante:6,
  arbitro1:7, arbitro2:8, apontador:9,
  setAtual:10, pontosCasa:11, pontosVisitante:12, setsCasa:13, setsVisitante:14,
  sacando:15, rotacaoCasa:16, rotacaoVisitante:17, primeiroSaqueSet:18,
  historicoSets:19, timeouts:20, cartoes:21, substituicoes:22, eventosLog:23,
  status:24, linkPdf:25, criadoEm:26, atualizadoEm:27,
  capitaoCasa:28, capitaoVisitante:29, observacoes:30,
  historicoPontos:31, capitaoQuadraCasa:32, capitaoQuadraVisitante:33,
  rotacaoConfirmadaSet:34
};

function criarPlanilhaVolei() {
  const ss = SpreadsheetApp.create('Supercopa Vôlei 2026 - Destaque, Premiação e Galera');

  const shDestaque = ss.getSheets()[0];
  shDestaque.setName(ABA_DESTAQUE);
  shDestaque.getRange(1, 1, 1, 6).setValues([['Modalidade', 'Jogo', 'Nome', 'Equipe', 'Observação', 'Data/Hora']]);
  shDestaque.setFrozenRows(1);

  const shPremiacao = ss.insertSheet(ABA_PREMIACAO_V);
  shPremiacao.getRange(1, 1, 1, 4).setValues([['Categoria', 'Nome', 'Equipe', 'Atualizado em']]);
  shPremiacao.setFrozenRows(1);

  const shGalera = ss.insertSheet(ABA_GALERA);
  shGalera.getRange(1, 1, 1, 3).setValues([['Data-Hora', 'Atleta', 'Time']]);
  shGalera.setFrozenRows(1);

  const shInscricoes = ss.insertSheet(ABA_INSCRICOES);
  shInscricoes.getRange(1, 1, 1, HEADERS_INSCRICOES.length).setValues([HEADERS_INSCRICOES]);
  shInscricoes.setFrozenRows(1);

  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());

  Logger.log('====================================================');
  Logger.log('Planilha criada: ' + ss.getUrl());
  Logger.log('====================================================');
}

// Rode esta função UMA VEZ na planilha já existente para criar (ou
// corrigir o cabeçalho de) a aba "Inscricoes", sem mexer nas outras
// três abas (Destaque, Premiacao, Galera).
function configurarInscricoes() {
  const ss = getSS_();
  let sh = ss.getSheetByName(ABA_INSCRICOES);
  if (!sh) sh = ss.insertSheet(ABA_INSCRICOES);
  sh.getRange(1, 1, 1, HEADERS_INSCRICOES.length).setValues([HEADERS_INSCRICOES]);
  sh.setFrozenRows(1);
  Logger.log('Aba "Inscricoes" configurada em: ' + ss.getUrl());
}

// Rode esta função UMA VEZ para desfazer o teste de diagnóstico que
// foi gravado por engano na aba "Destaque" (linha de cabeçalho
// sobrescrita + linha de teste "TESTE DIAGNOSTICO"). Não mexe em
// mais nada.
function repararAbaDestaque() {
  const sh = getSS_().getSheetByName(ABA_DESTAQUE);
  const max = sh.getMaxColumns();
  if (max > 6) sh.getRange(1, 7, 1, max - 6).clearContent();
  sh.getRange(1, 1, 1, 6).setValues([['Modalidade', 'Jogo', 'Nome', 'Equipe', 'Observação', 'Data/Hora']]);
  const rows = sh.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if ((rows[i][2] || '').toString().trim() === 'TESTE DIAGNOSTICO') sh.deleteRow(i + 1);
  }
  Logger.log('Aba "Destaque" reparada.');
}

function getSS_() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('Rode criarPlanilhaVolei() primeiro.');
  return SpreadsheetApp.openById(id);
}

// Rode esta função DIRETO NO EDITOR (▶ Executar) uma vez. Ela só
// tenta abrir a planilha de jogos/placar do Vôlei e ler o nome —
// isso força o Google a pedir autorização de acesso a essa planilha
// especificamente, caso ainda não tenha sido concedida. Depois de
// rodar (e autorizar, se pedir), o "Salvar Súmula" passa a
// conseguir escrever o placar lá também.
function testarAcessoJogos() {
  try {
    const ss = SpreadsheetApp.openById(JOGOS_SHEET_ID);
    Logger.log('OK — consegui abrir: ' + ss.getName() + ' (' + ss.getUrl() + ')');
    const sh = ss.getSheetByName(ABA_GRUPOS);
    Logger.log('OK — aba "' + ABA_GRUPOS + '" encontrada, linha 11: ' + JSON.stringify(sh.getRange(11, 1, 1, 3).getValues()));
  } catch (ex) {
    Logger.log('ERRO: ' + ex.message);
  }
}

// Rode esta função UMA VEZ para criar a aba "Sumulas" (não mexe em
// mais nada nas outras abas).
function configurarSumulas() {
  const ss = getSS_();
  let sh = ss.getSheetByName(ABA_SUMULAS);
  if (!sh) sh = ss.insertSheet(ABA_SUMULAS);
  sh.getRange(1, 1, 1, HEADERS_SUMULAS.length).setValues([HEADERS_SUMULAS]);
  sh.setFrozenRows(1);
  Logger.log('Aba "Sumulas" configurada em: ' + ss.getUrl());
}

// Rode esta função UMA VEZ para criar a aba "Atletas" (cadastro de
// número + nome por time). Não mexe em mais nada nas outras abas.
function configurarAtletas() {
  const ss = getSS_();
  let sh = ss.getSheetByName(ABA_ATLETAS);
  if (!sh) sh = ss.insertSheet(ABA_ATLETAS);
  sh.getRange(1, 1, 1, HEADERS_ATLETAS.length).setValues([HEADERS_ATLETAS]);
  sh.setFrozenRows(1);
  Logger.log('Aba "Atletas" configurada em: ' + ss.getUrl());
}

// Rode esta função UMA VEZ para criar a aba "EquipesPin" (PINs de
// acesso por equipe). Não mexe em mais nada nas outras abas.
function configurarEquipesPin() {
  const ss = getSS_();
  let sh = ss.getSheetByName(ABA_EQUIPES_PIN);
  if (!sh) sh = ss.insertSheet(ABA_EQUIPES_PIN);
  sh.getRange(1, 1, 1, HEADERS_EQUIPES_PIN.length).setValues([HEADERS_EQUIPES_PIN]);
  sh.setFrozenRows(1);
  Logger.log('Aba "EquipesPin" configurada em: ' + ss.getUrl());
}

// Rode esta função UMA VEZ para criar a aba "Partidas" (console de
// arbitragem ao vivo). Não mexe em mais nada nas outras abas.
function configurarPartidas() {
  const ss = getSS_();
  let sh = ss.getSheetByName(ABA_PARTIDAS);
  if (!sh) sh = ss.insertSheet(ABA_PARTIDAS);
  sh.getRange(1, 1, 1, HEADERS_PARTIDAS.length).setValues([HEADERS_PARTIDAS]);
  sh.setFrozenRows(1);
  Logger.log('Aba "Partidas" configurada em: ' + ss.getUrl());
}

// ── doPost ──────────────────────────────────────────────────
function doPost(e) {
  try {
    const dados = JSON.parse(e.postData.contents);
    const acao = dados.acao || dados.action || '';

    // ATLETA DESTAQUE POR JOGO
    if (acao === 'adicionar') {
      getSS_().getSheetByName(ABA_DESTAQUE).appendRow(dados.linha);
      return okJson({ ok: true });
    }
    if (acao === 'excluir') {
      const sh = getSS_().getSheetByName(ABA_DESTAQUE);
      const rowIndex = parseInt(dados.rowIndex);
      if (rowIndex >= 2 && rowIndex <= sh.getLastRow()) sh.deleteRow(rowIndex);
      return okJson({ ok: true });
    }

    // MELHORES DO CAMPEONATO
    if (acao === 'salvarPremiacao') {
      return okJson(salvarPremiacaoV_(dados.categoria, dados.nome, dados.equipe));
    }
    if (acao === 'excluirPremiacao') {
      return okJson(excluirPremiacaoV_(dados.categoria));
    }

    // DESTAQUE DA GALERA — voto
    if (acao === 'votar' || acao === 'votar_atleta') {
      const nomeAtleta = (dados.atleta || '').toString().trim();
      const timeAtleta = (dados.time || '').toString().trim();
      if (!nomeAtleta) return okJson({ ok: false, erro: 'Nome do atleta obrigatório' });
      const agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
      getSS_().getSheetByName(ABA_GALERA).appendRow([agora, nomeAtleta, timeAtleta]);
      return okJson({ ok: true });
    }

    // INSCRIÇÃO DE EQUIPES
    if (acao === 'inscrever') {
      return okJson(inscreverEquipeV_(dados));
    }

    // SÚMULA DIGITAL (simples, mobile — legado)
    if (acao === 'salvarSumula') {
      return okJson(salvarSumula_(dados));
    }

    // CADASTRO DE ATLETAS (painel — sem PIN, já é área administrativa)
    if (acao === 'cadastrarAtleta') return okJson(cadastrarAtleta_(dados));
    if (acao === 'removerAtleta') return okJson(removerAtleta_(dados));

    // PIN DE ACESSO DA EQUIPE (gerado pelo painel, usado pelo app)
    if (acao === 'gerarPinEquipe') return okJson(gerarPinEquipe_(dados));

    // CADASTRO DE ATLETAS (app — exige PIN da equipe)
    if (acao === 'cadastrarAtletaApp') return okJson(cadastrarAtletaApp_(dados));
    if (acao === 'removerAtletaApp') return okJson(removerAtletaApp_(dados));

    // CONSOLE DE ARBITRAGEM AO VIVO
    if (acao === 'criarPartida') return okJson(criarPartida_(dados));
    if (acao === 'ponto') return okJson(registrarPonto_(dados));
    if (acao === 'desfazerPonto') return okJson(desfazerPonto_(dados));
    if (acao === 'pontoMenos') return okJson(pontoMenos_(dados));
    if (acao === 'definirCapitaoQuadra') return okJson(definirCapitaoQuadra_(dados));
    if (acao === 'definirEscalacaoSet') return okJson(definirEscalacaoSet_(dados));
    if (acao === 'timeout') return okJson(registrarTimeout_(dados));
    if (acao === 'atualizarObservacoes') return okJson(atualizarObservacoes_(dados));
    if (acao === 'excluirPartida') return okJson(excluirPartida_(dados));
    if (acao === 'cartao') return okJson(registrarCartao_(dados));
    if (acao === 'substituicao') return okJson(registrarSubstituicao_(dados));
    if (acao === 'removerEvento') return okJson(removerEvento_(dados));
    if (acao === 'finalizarPartida') return okJson(finalizarPartida_(dados));
    if (acao === 'uploadPdfSumula') return okJson(uploadPdfSumula_(dados));

    return okJson({ ok: false, erro: 'ação inválida: ' + acao });
  } catch (ex) {
    return okJson({ ok: false, erro: ex.message });
  }
}

// ── doGet ───────────────────────────────────────────────────
function doGet(e) {
  try {
    const action = (e.parameter && e.parameter.action) || '';

    if (action === 'premiacao') return okJson(listarPremiacaoV_());
    if (action === 'ranking' || action === 'ranking_atleta') return okJson({ ok: true, ranking: montarRankingGaleraV_() });
    if (action === 'destaques') return okJson(listarDestaquesV_());
    if (action === 'inscricoes') return okJson(listarInscricoesV_());
    if (action === 'jogo') return okJson(carregarJogoSumula_((e.parameter && e.parameter.id) || ''));
    if (action === 'sumula') return okJson({ ok: true, sumula: buscarSumula_((e.parameter && e.parameter.id) || '') });
    if (action === 'partida') return okJson(carregarPartida_((e.parameter && e.parameter.id) || ''));
    if (action === 'partidasFinalizadas') return okJson({ ok: true, partidas: listarPartidasFinalizadas_() });
    if (action === 'partidasAoVivo') return okJson({ ok: true, partidas: listarPartidasAoVivo_() });
    if (action === 'atletasTime') return okJson(atletasTime_((e.parameter && e.parameter.equipe) || ''));
    if (action === 'atletasEquipe') return okJson({ ok: true, atletas: listarAtletasEquipe_((e.parameter && e.parameter.equipe) || '') });
    if (action === 'atletasTodos') return okJson({ ok: true, atletas: listarTodosAtletas_() });
    if (action === 'equipesConhecidas') return okJson({ ok: true, equipes: listarEquipesConhecidas_() });
    if (action === 'temPinEquipe') return okJson({ ok: true, temPin: !!buscarPinEquipe_((e.parameter && e.parameter.equipe) || '') });
    // Só o painel usa isso (área administrativa) — devolve o PIN de verdade.
    if (action === 'verPinEquipeAdmin') return okJson({ ok: true, pin: buscarPinEquipe_((e.parameter && e.parameter.equipe) || '') });
    if (action === 'verificarPinEquipe') {
      const okPin = verificarPin_((e.parameter && e.parameter.equipe) || '', (e.parameter && e.parameter.pin) || '');
      return okJson({ ok: okPin });
    }
    if (action === 'atletasEquipeApp') {
      const eq = (e.parameter && e.parameter.equipe) || '';
      const pin = (e.parameter && e.parameter.pin) || '';
      if (!verificarPin_(eq, pin)) return okJson({ ok: false, erro: 'PIN incorreto.' });
      return okJson({ ok: true, atletas: listarAtletasEquipe_(eq) });
    }

    return okJson({ ok: true, msg: 'Supercopa Vôlei — Destaque/Premiação/Galera OK' });
  } catch (ex) {
    return okJson({ ok: false, erro: ex.message });
  }
}

// ============================================================
//  ATLETA DESTAQUE
// ============================================================
function listarDestaquesV_() {
  const sh = getSS_().getSheetByName(ABA_DESTAQUE);
  if (sh.getLastRow() < 2) return { ok: true, destaques: [] };
  const rows = sh.getDataRange().getValues().slice(1);
  const destaques = rows.map((r, i) => ({
    _linha: i + 2, modalidade: r[0], jogo: r[1], nome: r[2], equipe: r[3], observacao: r[4], dataHora: r[5]
  })).filter(d => d.nome);
  return { ok: true, destaques: destaques };
}

// ============================================================
//  MELHORES DO CAMPEONATO
// ============================================================
function salvarPremiacaoV_(categoria, nome, equipe) {
  if (!categoria || !nome) return { ok: false, erro: 'Categoria e nome são obrigatórios' };
  const sh = getSS_().getSheetByName(ABA_PREMIACAO_V);
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][0] || '').toString().trim() === categoria) {
      sh.getRange(i + 1, 2, 1, 3).setValues([[nome, equipe || '', new Date().toLocaleString('pt-BR')]]);
      return { ok: true };
    }
  }
  sh.appendRow([categoria, nome, equipe || '', new Date().toLocaleString('pt-BR')]);
  return { ok: true };
}

function excluirPremiacaoV_(categoria) {
  const sh = getSS_().getSheetByName(ABA_PREMIACAO_V);
  const rows = sh.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if ((rows[i][0] || '').toString().trim() === categoria) { sh.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: true };
}

function listarPremiacaoV_() {
  const sh = getSS_().getSheetByName(ABA_PREMIACAO_V);
  if (sh.getLastRow() < 2) return { premiacao: [] };
  const rows = sh.getDataRange().getValues().slice(1);
  const premiacao = rows.map(r => ({
    categoria: (r[0] || '').toString().trim(),
    nome: (r[1] || '').toString().trim(),
    equipe: (r[2] || '').toString().trim(),
    atualizado: (r[3] || '').toString().trim()
  })).filter(p => p.categoria);
  return { premiacao: premiacao };
}

// ============================================================
//  DESTAQUE DA GALERA
// ============================================================
function montarRankingGaleraV_() {
  const sh = getSS_().getSheetByName(ABA_GALERA);
  if (sh.getLastRow() <= 1) return [];
  const rows = sh.getDataRange().getValues().slice(1);
  const contagem = {};
  rows.forEach(r => {
    const key = (r[1] || '').toString().trim();
    if (!key) return;
    if (!contagem[key]) contagem[key] = { atleta: key, time: (r[2] || '').toString().trim(), votos: 0 };
    contagem[key].votos++;
  });
  return Object.values(contagem).sort((a, b) => b.votos - a.votos).slice(0, 10);
}

// ============================================================
//  INSCRIÇÃO DE EQUIPES
// ============================================================
function inscreverEquipeV_(dados) {
  const nomeEquipe = (dados.nomeEquipe || '').toString().trim();
  if (!nomeEquipe) return { ok: false, status: 'erro', erro: 'Nome da equipe é obrigatório.', msg: 'Nome da equipe é obrigatório.' };

  const shCheck = getSS_().getSheetByName(ABA_INSCRICOES);
  if (shCheck && shCheck.getLastRow() >= 2) {
    const rows = shCheck.getDataRange().getValues();
    const headers = rows[0];
    const colEquipe = headers.indexOf('Nome da Equipe');
    const colModalidade = headers.indexOf('Modalidade');
    const jaInscrita = rows.slice(1).some(r =>
      (r[colEquipe] || '').toString().trim().toLowerCase() === nomeEquipe.toLowerCase() &&
      (r[colModalidade] || '').toString().trim().toLowerCase() === (dados.modalidade || '').toString().trim().toLowerCase()
    );
    if (jaInscrita) {
      const msg = 'Essa equipe já está inscrita nessa modalidade. Se precisar corrigir algo, fale com a organização.';
      return { ok: false, status: 'erro', erro: msg, msg: msg };
    }
  }

  let linkEscudo = '';
  if (dados.escudoBase64) {
    const partes = dados.escudoBase64.split(',');
    const bytes = Utilities.base64Decode(partes[1] || partes[0]);
    const blob = Utilities.newBlob(bytes, 'image/png', dados.escudoNome || 'escudo.png');
    const folder = DriveApp.getFolderById(FOLDER_ID_ESCUDOS);
    const file = folder.createFile(blob);
    // Não chama file.setSharing() aqui: a pasta já está compartilhada como
    // "Qualquer pessoa com o link" e o arquivo herda essa permissão sozinho.
    linkEscudo = file.getUrl();
  }

  const ss = getSS_();
  let sh = ss.getSheetByName(ABA_INSCRICOES);
  if (!sh) {
    sh = ss.insertSheet(ABA_INSCRICOES);
    sh.getRange(1, 1, 1, HEADERS_INSCRICOES.length).setValues([HEADERS_INSCRICOES]);
    sh.setFrozenRows(1);
  }

  sh.appendRow([
    new Date(),
    dados.modalidade || '',
    dados.nomeEquipe || '',
    dados.nomeResp || '',
    dados.instagram || '',
    dados.telefone || '',
    dados.cidade || '',
    dados.alojamento === 'sim' ? 'Sim' : 'Não',
    dados.alojamento === 'sim' ? (dados.alojQty || '') : '',
    dados.comoConheceu || '',
    dados.termoAloj ? 'Assinado' : '',
    dados.termoComp ? 'Assinado' : '',
    linkEscudo,
    'Pendente'
  ]);

  return { ok: true, status: 'ok' };
}

function listarInscricoesV_() {
  const sh = getSS_().getSheetByName(ABA_INSCRICOES);
  if (!sh || sh.getLastRow() < 2) return { ok: true, headers: HEADERS_INSCRICOES, inscricoes: [] };
  const rows = sh.getDataRange().getValues();
  const headers = rows.shift();
  const inscricoes = rows.map((r, i) => {
    const obj = { _linha: i + 2 };
    headers.forEach((h, j) => obj[h] = r[j]);
    return obj;
  }).filter(o => o['Nome da Equipe']);
  return { ok: true, headers: headers, inscricoes: inscricoes };
}

// ============================================================
//  SÚMULA DIGITAL
// ============================================================
// IDs que começam com "TESTE" são um modo sandbox: usados pra
// treinar/testar o console de arbitragem sem tocar em nenhuma
// linha real da planilha de jogos, e ficam de fora das listagens
// públicas (partidasAoVivo/partidasFinalizadas) — não aparecem
// no site nem no app.
function ehJogoTeste_(id) {
  return /^TESTE/.test((id || '').toString().trim().toUpperCase());
}

function resolverJogoSumula_(id) {
  id = (id || '').toString().trim().toUpperCase();
  if (ehJogoTeste_(id)) return { aba: 'TESTE', linha: 0, id: id };
  if (ROW_MAP_GRUPOS[id]) return { aba: ABA_GRUPOS, linha: ROW_MAP_GRUPOS[id], id: id };
  if (ROW_MAP_MATA[id]) return { aba: ABA_MATA, linha: ROW_MAP_MATA[id], id: id };
  return null;
}

function carregarJogoSumula_(id) {
  const jogo = resolverJogoSumula_(id);
  if (!jogo) return { ok: false, erro: 'Jogo não encontrado: ' + id };

  if (jogo.aba === 'TESTE') {
    return { ok: true, id: jogo.id, aba: 'TESTE', linha: 0, numero: jogo.id, equipeA: '', equipeB: '', sets: [{ a: '', b: '' }, { a: '', b: '' }, { a: '', b: '' }], sumula: buscarSumula_(id) };
  }

  const shJogo = SpreadsheetApp.openById(JOGOS_SHEET_ID).getSheetByName(jogo.aba);
  const row = shJogo.getRange(jogo.linha, 1, 1, 17).getValues()[0];

  const equipeA = (row[1] || '').toString().trim();
  const equipeB = (row[11] || '').toString().trim();

  return {
    ok: true,
    id: jogo.id,
    aba: jogo.aba,
    linha: jogo.linha,
    numero: row[0],
    equipeA: equipeA,
    equipeB: equipeB,
    sets: [
      { a: row[2], b: row[7] },
      { a: row[3], b: row[8] },
      { a: row[4], b: row[9] }
    ],
    sumula: buscarSumula_(id)
  };
}

function buscarSumula_(id) {
  id = (id || '').toString().trim().toUpperCase();
  if (!id) return null;
  const sh = getSS_().getSheetByName(ABA_SUMULAS);
  if (!sh || sh.getLastRow() < 2) return null;
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][0] || '').toString().trim().toUpperCase() === id) {
      return {
        idJogo: rows[i][0], aba: rows[i][1], linha: rows[i][2],
        equipeCasa: rows[i][3], equipeVisitante: rows[i][4],
        titularesCasa: parseJson_(rows[i][5], []), liberoCasa: rows[i][6],
        titularesVisitante: parseJson_(rows[i][7], []), liberoVisitante: rows[i][8],
        sets: parseJson_(rows[i][9], []),
        timeoutsCasa: parseJson_(rows[i][10], []), timeoutsVisitante: parseJson_(rows[i][11], []),
        cartoes: parseJson_(rows[i][12], []), substituicoes: parseJson_(rows[i][13], []),
        arbitro: rows[i][14], anotador: rows[i][15], local: rows[i][16],
        status: rows[i][17], atualizadoEm: rows[i][18]
      };
    }
  }
  return null;
}

function parseJson_(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch (ex) { return fallback; }
}

function salvarSumula_(d) {
  const jogo = resolverJogoSumula_(d.id);
  if (!jogo) return { ok: false, erro: 'Jogo não encontrado: ' + d.id };

  const sets = (d.sets || []).slice(0, 3);
  while (sets.length < 3) sets.push({ a: '', b: '' });

  const setsVencidosA = sets.filter(s => parseInt(s.a || 0) > parseInt(s.b || 0)).length;
  const setsVencidosB = sets.filter(s => parseInt(s.b || 0) > parseInt(s.a || 0)).length;
  let vencedor = '—';
  if (setsVencidosA > setsVencidosB) vencedor = d.equipeA || '';
  else if (setsVencidosB > setsVencidosA) vencedor = d.equipeB || '';

  // O placar simplificado (Fase de Grupos/Mata-Mata) é gravado pelo
  // PRÓPRIO sumula.html, direto no Apps Script que já tem permissão
  // de escrita naquela planilha (o mesmo do botão "Enviar Placar"
  // no painel) — este script não tem acesso de escrita lá.

  // Grava/atualiza o registro completo da súmula.
  const ss = getSS_();
  let sh = ss.getSheetByName(ABA_SUMULAS);
  if (!sh) {
    sh = ss.insertSheet(ABA_SUMULAS);
    sh.getRange(1, 1, 1, HEADERS_SUMULAS.length).setValues([HEADERS_SUMULAS]);
    sh.setFrozenRows(1);
  }

  const agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  const linhaDados = [
    jogo.id, jogo.aba, jogo.linha, d.equipeA || '', d.equipeB || '',
    JSON.stringify(d.titularesA || []), d.liberoA || '',
    JSON.stringify(d.titularesB || []), d.liberoB || '',
    JSON.stringify(sets),
    JSON.stringify(d.timeoutsA || []), JSON.stringify(d.timeoutsB || []),
    JSON.stringify(d.cartoes || []), JSON.stringify(d.substituicoes || []),
    d.arbitro || '', d.anotador || '', d.local || '',
    d.status || 'Encerrada', agora
  ];

  const rows = sh.getDataRange().getValues();
  let achou = false;
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][0] || '').toString().trim().toUpperCase() === jogo.id) {
      sh.getRange(i + 1, 1, 1, linhaDados.length).setValues([linhaDados]);
      achou = true;
      break;
    }
  }
  if (!achou) sh.appendRow(linhaDados);

  return { ok: true, setsVencidosA: setsVencidosA, setsVencidosB: setsVencidosB, vencedor: vencedor };
}

// ============================================================
//  CONSOLE DE ARBITRAGEM AO VIVO — PARTIDAS
// ============================================================
function getPartidasSheet_() {
  const ss = getSS_();
  let sh = ss.getSheetByName(ABA_PARTIDAS);
  if (!sh) {
    sh = ss.insertSheet(ABA_PARTIDAS);
    sh.getRange(1, 1, 1, HEADERS_PARTIDAS.length).setValues([HEADERS_PARTIDAS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function acharLinhaPartida_(sh, id) {
  id = (id || '').toString().trim().toUpperCase();
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][PC.id] || '').toString().trim().toUpperCase() === id) return { linha: i + 1, dados: rows[i] };
  }
  return null;
}

function linhaParaEstado_(row) {
  return {
    id: row[PC.id], aba: row[PC.aba], linha: row[PC.linha],
    equipeCasa: row[PC.equipeCasa], equipeVisitante: row[PC.equipeVisitante],
    elencoCasa: parseJson_(row[PC.elencoCasa], { titulares: [], libero: null }),
    elencoVisitante: parseJson_(row[PC.elencoVisitante], { titulares: [], libero: null }),
    arbitro1: row[PC.arbitro1], arbitro2: row[PC.arbitro2], apontador: row[PC.apontador],
    setAtual: row[PC.setAtual], pontosCasa: row[PC.pontosCasa], pontosVisitante: row[PC.pontosVisitante],
    setsCasa: row[PC.setsCasa], setsVisitante: row[PC.setsVisitante],
    sacando: row[PC.sacando],
    rotacaoCasa: parseJson_(row[PC.rotacaoCasa], []), rotacaoVisitante: parseJson_(row[PC.rotacaoVisitante], []),
    primeiroSaqueSet: row[PC.primeiroSaqueSet],
    historicoSets: parseJson_(row[PC.historicoSets], []),
    timeouts: parseJson_(row[PC.timeouts], []),
    cartoes: parseJson_(row[PC.cartoes], []),
    substituicoes: parseJson_(row[PC.substituicoes], []),
    status: row[PC.status], linkPdf: row[PC.linkPdf],
    criadoEm: row[PC.criadoEm], atualizadoEm: row[PC.atualizadoEm],
    capitaoCasa: row[PC.capitaoCasa] || '', capitaoVisitante: row[PC.capitaoVisitante] || '',
    observacoes: row[PC.observacoes] || '',
    historicoPontos: parseJson_(row[PC.historicoPontos], []),
    capitaoQuadraCasa: row[PC.capitaoQuadraCasa] || row[PC.capitaoCasa] || '',
    capitaoQuadraVisitante: row[PC.capitaoQuadraVisitante] || row[PC.capitaoVisitante] || '',
    rotacaoConfirmadaSet: row[PC.rotacaoConfirmadaSet] || 1
  };
}

function criarPartida_(d) {
  const jogo = resolverJogoSumula_(d.id);
  if (!jogo) return { ok: false, erro: 'Jogo não encontrado: ' + d.id };

  const sh = getPartidasSheet_();
  const existente = acharLinhaPartida_(sh, jogo.id);
  const agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  const sacaPrimeiro = (d.sacaPrimeiro === 'B') ? 'B' : 'A';
  const rotA = (d.elencoCasa && d.elencoCasa.titulares) ? d.elencoCasa.titulares.slice(0, 6) : [];
  const rotB = (d.elencoVisitante && d.elencoVisitante.titulares) ? d.elencoVisitante.titulares.slice(0, 6) : [];

  const linhaDados = [];
  linhaDados[PC.id] = jogo.id;
  linhaDados[PC.aba] = jogo.aba;
  linhaDados[PC.linha] = jogo.linha;
  linhaDados[PC.equipeCasa] = d.equipeA || '';
  linhaDados[PC.equipeVisitante] = d.equipeB || '';
  linhaDados[PC.elencoCasa] = JSON.stringify(d.elencoCasa || { titulares: [], libero: null });
  linhaDados[PC.elencoVisitante] = JSON.stringify(d.elencoVisitante || { titulares: [], libero: null });
  linhaDados[PC.arbitro1] = d.arbitro1 || '';
  linhaDados[PC.arbitro2] = d.arbitro2 || '';
  linhaDados[PC.apontador] = d.apontador || '';
  linhaDados[PC.setAtual] = 1;
  linhaDados[PC.pontosCasa] = 0;
  linhaDados[PC.pontosVisitante] = 0;
  linhaDados[PC.setsCasa] = 0;
  linhaDados[PC.setsVisitante] = 0;
  linhaDados[PC.sacando] = sacaPrimeiro;
  linhaDados[PC.rotacaoCasa] = JSON.stringify(rotA);
  linhaDados[PC.rotacaoVisitante] = JSON.stringify(rotB);
  linhaDados[PC.primeiroSaqueSet] = sacaPrimeiro;
  linhaDados[PC.historicoSets] = JSON.stringify([]);
  linhaDados[PC.timeouts] = JSON.stringify([]);
  linhaDados[PC.cartoes] = JSON.stringify([]);
  linhaDados[PC.substituicoes] = JSON.stringify([]);
  linhaDados[PC.eventosLog] = JSON.stringify([]);
  linhaDados[PC.status] = 'em_andamento';
  linhaDados[PC.linkPdf] = '';
  linhaDados[PC.criadoEm] = agora;
  linhaDados[PC.atualizadoEm] = agora;
  linhaDados[PC.capitaoCasa] = d.capitaoCasa || '';
  linhaDados[PC.capitaoVisitante] = d.capitaoVisitante || '';
  linhaDados[PC.observacoes] = '';
  linhaDados[PC.historicoPontos] = JSON.stringify([]);
  linhaDados[PC.capitaoQuadraCasa] = d.capitaoCasa || '';
  linhaDados[PC.capitaoQuadraVisitante] = d.capitaoVisitante || '';
  linhaDados[PC.rotacaoConfirmadaSet] = 1;

  const existenteInfo = acharLinhaPartida_(sh, jogo.id);
  if (existenteInfo) {
    sh.getRange(existenteInfo.linha, 1, 1, linhaDados.length).setValues([linhaDados]);
  } else {
    sh.appendRow(linhaDados);
  }

  return { ok: true, estado: linhaParaEstado_(linhaDados) };
}

function carregarPartida_(id) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + id };
  return { ok: true, estado: linhaParaEstado_(info.dados) };
}

function salvarLinhaPartida_(sh, linhaNum, estado) {
  const linhaDados = [];
  linhaDados[PC.id] = estado.id;
  linhaDados[PC.aba] = estado.aba;
  linhaDados[PC.linha] = estado.linha;
  linhaDados[PC.equipeCasa] = estado.equipeCasa;
  linhaDados[PC.equipeVisitante] = estado.equipeVisitante;
  linhaDados[PC.elencoCasa] = JSON.stringify(estado.elencoCasa || {});
  linhaDados[PC.elencoVisitante] = JSON.stringify(estado.elencoVisitante || {});
  linhaDados[PC.arbitro1] = estado.arbitro1;
  linhaDados[PC.arbitro2] = estado.arbitro2;
  linhaDados[PC.apontador] = estado.apontador;
  linhaDados[PC.setAtual] = estado.setAtual;
  linhaDados[PC.pontosCasa] = estado.pontosCasa;
  linhaDados[PC.pontosVisitante] = estado.pontosVisitante;
  linhaDados[PC.setsCasa] = estado.setsCasa;
  linhaDados[PC.setsVisitante] = estado.setsVisitante;
  linhaDados[PC.sacando] = estado.sacando;
  linhaDados[PC.rotacaoCasa] = JSON.stringify(estado.rotacaoCasa || []);
  linhaDados[PC.rotacaoVisitante] = JSON.stringify(estado.rotacaoVisitante || []);
  linhaDados[PC.primeiroSaqueSet] = estado.primeiroSaqueSet;
  linhaDados[PC.historicoSets] = JSON.stringify(estado.historicoSets || []);
  linhaDados[PC.timeouts] = JSON.stringify(estado.timeouts || []);
  linhaDados[PC.cartoes] = JSON.stringify(estado.cartoes || []);
  linhaDados[PC.substituicoes] = JSON.stringify(estado.substituicoes || []);
  linhaDados[PC.eventosLog] = JSON.stringify(estado._eventosLog || []);
  linhaDados[PC.status] = estado.status;
  linhaDados[PC.linkPdf] = estado.linkPdf || '';
  linhaDados[PC.criadoEm] = estado.criadoEm;
  linhaDados[PC.atualizadoEm] = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  linhaDados[PC.capitaoCasa] = estado.capitaoCasa || '';
  linhaDados[PC.capitaoVisitante] = estado.capitaoVisitante || '';
  linhaDados[PC.observacoes] = estado.observacoes || '';
  linhaDados[PC.historicoPontos] = JSON.stringify(estado.historicoPontos || []);
  linhaDados[PC.capitaoQuadraCasa] = estado.capitaoQuadraCasa || '';
  linhaDados[PC.capitaoQuadraVisitante] = estado.capitaoQuadraVisitante || '';
  linhaDados[PC.rotacaoConfirmadaSet] = estado.rotacaoConfirmadaSet || 1;
  sh.getRange(linhaNum, 1, 1, linhaDados.length).setValues([linhaDados]);
}

function rotacionar_(arr) {
  if (!arr || arr.length < 2) return arr || [];
  return arr.slice(1).concat([arr[0]]);
}

// Aplica um ponto pra equipe informada diretamente no objeto estado
// (rotação/saque/placar/fechamento de set). Usado tanto pelo ponto
// manual quanto pelo cartão vermelho (que soma ponto pro adversário).
function aplicarPontoNoEstado_(estado, equipe) {
  if (equipe !== estado.sacando) {
    if (equipe === 'A') estado.rotacaoCasa = rotacionar_(estado.rotacaoCasa);
    else estado.rotacaoVisitante = rotacionar_(estado.rotacaoVisitante);
    estado.sacando = equipe;
  }

  if (equipe === 'A') estado.pontosCasa++; else estado.pontosVisitante++;
  // .concat em vez de .push pra não mutar o array que já foi
  // guardado no snapshot de desfazer (senão o undo desfaria errado).
  estado.historicoPontos = (estado.historicoPontos || []).concat([{ set: estado.setAtual, equipe: equipe }]);

  let setFechado = false;
  const a = estado.pontosCasa, b = estado.pontosVisitante;
  if ((a >= 25 || b >= 25) && Math.abs(a - b) >= 2) {
    setFechado = true;
    estado.historicoSets.push({ a: a, b: b });
    if (a > b) estado.setsCasa++; else estado.setsVisitante++;
    estado.pontosCasa = 0; estado.pontosVisitante = 0;
    estado.setAtual++;
    estado.primeiroSaqueSet = (estado.primeiroSaqueSet === 'A') ? 'B' : 'A';
    estado.sacando = estado.primeiroSaqueSet;
    if (estado.setsCasa >= 2 || estado.setsVisitante >= 2) estado.status = 'sets_completos';
  }
  return setFechado;
}

function snapshotEstado_(estado) {
  return {
    setAtual: estado.setAtual, pontosCasa: estado.pontosCasa, pontosVisitante: estado.pontosVisitante,
    setsCasa: estado.setsCasa, setsVisitante: estado.setsVisitante, sacando: estado.sacando,
    rotacaoCasa: estado.rotacaoCasa, rotacaoVisitante: estado.rotacaoVisitante,
    primeiroSaqueSet: estado.primeiroSaqueSet, historicoSets: estado.historicoSets, status: estado.status,
    historicoPontos: estado.historicoPontos
  };
}

function registrarPonto_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  if (estado.status !== 'em_andamento') return { ok: false, erro: 'Partida não está em andamento.' };
  if ((estado.rotacaoConfirmadaSet || 1) < estado.setAtual) return { ok: false, erro: 'Confirme a escalação (ordem de saque) do set ' + estado.setAtual + ' antes de pontuar.' };
  const equipe = d.equipe === 'B' ? 'B' : 'A';

  // snapshot para permitir desfazer
  const rawEventos = parseJson_(info.dados[PC.eventosLog], []);
  rawEventos.push(snapshotEstado_(estado));
  estado._eventosLog = rawEventos;

  const setFechado = aplicarPontoNoEstado_(estado, equipe);

  salvarLinhaPartida_(sh, info.linha, estado);

  if (setFechado) {
    try { empurrarPlacarParaJogos_(estado); } catch (ex) { /* não interrompe o fluxo */ }
  }

  delete estado._eventosLog;
  return { ok: true, estado: estado };
}

// Correção manual: tira 1 ponto do time (marcação errada), sem
// mexer em rotação/saque — é só ajuste de placar, não um rally.
function pontoMenos_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  if (estado.status !== 'em_andamento') return { ok: false, erro: 'Partida não está em andamento.' };
  const equipe = d.equipe === 'B' ? 'B' : 'A';

  const rawEventos = parseJson_(info.dados[PC.eventosLog], []);
  rawEventos.push(snapshotEstado_(estado));
  estado._eventosLog = rawEventos;

  if (equipe === 'A') estado.pontosCasa = Math.max(0, estado.pontosCasa - 1);
  else estado.pontosVisitante = Math.max(0, estado.pontosVisitante - 1);

  // Remove o último ponto marcado desse time no histórico (não
  // necessariamente o último ponto geral, já que a correção pode
  // ser feita bem depois do lance).
  const hist = (estado.historicoPontos || []).slice();
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i].equipe === equipe) { hist.splice(i, 1); break; }
  }
  estado.historicoPontos = hist;

  salvarLinhaPartida_(sh, info.linha, estado);
  delete estado._eventosLog;
  return { ok: true, estado: estado };
}

// Define quem é o capitão "em quadra" no momento (pode ser diferente
// do capitão oficial se ele tiver sido substituído ou não estiver
// entre os titulares) — regra do vôlei exige sempre ter um em quadra.
function definirCapitaoQuadra_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  if (d.equipe === 'B') estado.capitaoQuadraVisitante = d.numero || '';
  else estado.capitaoQuadraCasa = d.numero || '';
  estado._eventosLog = parseJson_(info.dados[PC.eventosLog], []);
  salvarLinhaPartida_(sh, info.linha, estado);
  delete estado._eventosLog;
  return { ok: true, estado: estado };
}

// A cada set novo o técnico pode escalar a quadra numa ordem
// diferente (regra do vôlei) — isso registra a escalação enviada
// pra esse set e libera a pontuação (registrarPonto_ bloqueia até
// aqui ser chamado).
function definirEscalacaoSet_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  if (estado.status !== 'em_andamento') return { ok: false, erro: 'Partida não está em andamento.' };
  const rotA = (d.rotacaoCasa || []).slice(0, 6);
  const rotB = (d.rotacaoVisitante || []).slice(0, 6);
  if (rotA.filter(p => p && p.nome).length < 6 || rotB.filter(p => p && p.nome).length < 6) {
    return { ok: false, erro: 'Preencha as 6 posições de quadra das duas equipes.' };
  }
  estado.rotacaoCasa = rotA;
  estado.rotacaoVisitante = rotB;
  estado.rotacaoConfirmadaSet = estado.setAtual;
  if (d.capitaoQuadraCasa) estado.capitaoQuadraCasa = d.capitaoQuadraCasa;
  if (d.capitaoQuadraVisitante) estado.capitaoQuadraVisitante = d.capitaoQuadraVisitante;
  estado._eventosLog = parseJson_(info.dados[PC.eventosLog], []);
  salvarLinhaPartida_(sh, info.linha, estado);
  delete estado._eventosLog;
  return { ok: true, estado: estado };
}

function desfazerPonto_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  const rawEventos = parseJson_(info.dados[PC.eventosLog], []);
  if (!rawEventos.length) return { ok: false, erro: 'Nada para desfazer.' };
  const snap = rawEventos.pop();
  estado.setAtual = snap.setAtual; estado.pontosCasa = snap.pontosCasa; estado.pontosVisitante = snap.pontosVisitante;
  estado.setsCasa = snap.setsCasa; estado.setsVisitante = snap.setsVisitante; estado.sacando = snap.sacando;
  estado.rotacaoCasa = snap.rotacaoCasa; estado.rotacaoVisitante = snap.rotacaoVisitante;
  estado.primeiroSaqueSet = snap.primeiroSaqueSet; estado.historicoSets = snap.historicoSets; estado.status = snap.status;
  estado.historicoPontos = snap.historicoPontos || [];
  estado._eventosLog = rawEventos;
  salvarLinhaPartida_(sh, info.linha, estado);
  delete estado._eventosLog;
  return { ok: true, estado: estado };
}

function registrarTimeout_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  estado.timeouts.push({ equipe: d.equipe, set: estado.setAtual, hora: new Date().toLocaleTimeString('pt-BR') });
  estado._eventosLog = parseJson_(info.dados[PC.eventosLog], []);
  salvarLinhaPartida_(sh, info.linha, estado);
  delete estado._eventosLog;
  return { ok: true, estado: estado };
}

// Apaga uma partida da aba "Partidas" (não mexe na planilha de
// jogos nem desfaz nenhum placar já publicado lá). Usado pra
// limpar partidas de teste/engano.
function excluirPartida_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  sh.deleteRow(info.linha);
  return { ok: true };
}

function atualizarObservacoes_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  estado.observacoes = (d.observacoes || '').toString();
  estado._eventosLog = parseJson_(info.dados[PC.eventosLog], []);
  salvarLinhaPartida_(sh, info.linha, estado);
  delete estado._eventosLog;
  return { ok: true, estado: estado };
}

function registrarCartao_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  estado.cartoes.push({ equipe: d.equipe, jogador: d.jogador || '', tipo: d.tipo || 'Amarelo', motivo: d.motivo || '', set: estado.setAtual });

  // Cartão vermelho soma ponto automático pro adversário (regra CBV).
  const rawEventos = parseJson_(info.dados[PC.eventosLog], []);
  let setFechado = false;
  if (d.tipo === 'Vermelho' && estado.status === 'em_andamento') {
    rawEventos.push(snapshotEstado_(estado));
    const equipeAdversaria = d.equipe === 'A' ? 'B' : 'A';
    setFechado = aplicarPontoNoEstado_(estado, equipeAdversaria);
  }
  estado._eventosLog = rawEventos;

  salvarLinhaPartida_(sh, info.linha, estado);

  if (setFechado) {
    try { empurrarPlacarParaJogos_(estado); } catch (ex) { /* não interrompe o fluxo */ }
  }

  delete estado._eventosLog;
  return { ok: true, estado: estado };
}

function registrarSubstituicao_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  estado.substituicoes.push({ equipe: d.equipe, saiu: d.saiu || '', entrou: d.entrou || '', set: estado.setAtual });
  const rot = d.equipe === 'A' ? estado.rotacaoCasa : estado.rotacaoVisitante;
  const idx = rot.findIndex(p => (p.nome || '') === d.saiu);
  if (idx >= 0) rot[idx] = { numero: d.numeroEntrou || '', nome: d.entrou || '' };
  estado._eventosLog = parseJson_(info.dados[PC.eventosLog], []);
  salvarLinhaPartida_(sh, info.linha, estado);
  delete estado._eventosLog;
  return { ok: true, estado: estado };
}

function removerEvento_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  const chave = { timeout: 'timeouts', cartao: 'cartoes', substituicao: 'substituicoes' }[d.tipo];
  if (chave && estado[chave] && d.index >= 0 && d.index < estado[chave].length) estado[chave].splice(d.index, 1);
  estado._eventosLog = parseJson_(info.dados[PC.eventosLog], []);
  salvarLinhaPartida_(sh, info.linha, estado);
  delete estado._eventosLog;
  return { ok: true, estado: estado };
}

function finalizarPartida_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  estado.status = 'finalizada';
  if (d.linkPdf) estado.linkPdf = d.linkPdf;
  estado._eventosLog = parseJson_(info.dados[PC.eventosLog], []);
  salvarLinhaPartida_(sh, info.linha, estado);
  delete estado._eventosLog;
  try { empurrarPlacarParaJogos_(estado, true); } catch (ex) { /* não interrompe */ }
  return { ok: true, estado: estado };
}

// Rode esta função DIRETO NO EDITOR (▶ Executar) uma vez. Ela só
// tenta chamar o outro Apps Script (o que grava na Fase de Grupos)
// — isso força o Google a pedir autorização de "conexões externas"
// caso ainda não tenha sido concedida.
function testarUrlFetch() {
  try {
    const resp = UrlFetchApp.fetch(PLACAR_SCRIPT_URL + '?action=teste', { muteHttpExceptions: true });
    Logger.log('OK — status: ' + resp.getResponseCode() + ' — corpo: ' + resp.getContentText().slice(0, 200));
  } catch (ex) {
    Logger.log('ERRO: ' + ex.message);
  }
}

function empurrarPlacarParaJogos_(estado, isFinal) {
  const jogo = resolverJogoSumula_(estado.id);
  if (!jogo || jogo.aba === 'TESTE') return;
  const hs = estado.historicoSets || [];
  const numero = /^[A-D]\d$/.test(estado.id) ? estado.id.slice(1) : estado.id;
  let vencedor = '';
  if (isFinal) {
    if (estado.setsCasa > estado.setsVisitante) vencedor = estado.equipeCasa;
    else if (estado.setsVisitante > estado.setsCasa) vencedor = estado.equipeVisitante;
  }
  const dadosArray = [
    numero, estado.equipeCasa,
    (hs[0] ? hs[0].a : '').toString(), (hs[1] ? hs[1].a : '').toString(), (hs[2] ? hs[2].a : '').toString(),
    estado.setsCasa.toString(), 'X',
    (hs[0] ? hs[0].b : '').toString(), (hs[1] ? hs[1].b : '').toString(), (hs[2] ? hs[2].b : '').toString(),
    estado.setsVisitante.toString(), estado.equipeVisitante,
    estado.setsCasa.toString(), estado.setsVisitante.toString(),
    vencedor, '', ''
  ];
  UrlFetchApp.fetch(PLACAR_SCRIPT_URL, {
    method: 'post',
    contentType: 'text/plain',
    payload: JSON.stringify({ acao: 'atualizar_placar_volei', aba: jogo.aba, linha: jogo.linha, dados: dadosArray }),
    muteHttpExceptions: true
  });
}

function listarPartidasAoVivo_() {
  const sh = getPartidasSheet_();
  if (sh.getLastRow() < 2) return [];
  const rows = sh.getDataRange().getValues().slice(1);
  return rows.filter(r => (r[PC.status] === 'em_andamento' || r[PC.status] === 'sets_completos') && !ehJogoTeste_(r[PC.id])).map(r => ({
    id: r[PC.id], equipeCasa: r[PC.equipeCasa], equipeVisitante: r[PC.equipeVisitante],
    setAtual: r[PC.setAtual], pontosCasa: r[PC.pontosCasa], pontosVisitante: r[PC.pontosVisitante],
    setsCasa: r[PC.setsCasa], setsVisitante: r[PC.setsVisitante],
    historicoSets: parseJson_(r[PC.historicoSets], []),
    status: r[PC.status]
  }));
}

function listarPartidasFinalizadas_() {
  const sh = getPartidasSheet_();
  if (sh.getLastRow() < 2) return [];
  const rows = sh.getDataRange().getValues().slice(1);
  return rows.filter(r => r[PC.status] === 'finalizada' && !ehJogoTeste_(r[PC.id])).map(r => ({
    id: r[PC.id], equipeCasa: r[PC.equipeCasa], equipeVisitante: r[PC.equipeVisitante],
    setsCasa: r[PC.setsCasa], setsVisitante: r[PC.setsVisitante],
    historicoSets: parseJson_(r[PC.historicoSets], []),
    linkPdf: r[PC.linkPdf], atualizadoEm: r[PC.atualizadoEm]
  })).reverse();
}

function atletasTime_(equipe) {
  equipe = (equipe || '').toString().trim().toLowerCase();
  if (!equipe) return { ok: true, atletas: [] };
  const nomes = {};
  const ss = getSS_();
  [ABA_DESTAQUE].forEach(nomeAba => {
    const sh = ss.getSheetByName(nomeAba);
    if (!sh || sh.getLastRow() < 2) return;
    const rows = sh.getDataRange().getValues().slice(1);
    rows.forEach(r => {
      const eq = (r[3] || '').toString().trim().toLowerCase();
      const nome = (r[2] || '').toString().trim();
      if (eq === equipe && nome) nomes[nome] = true;
    });
  });
  const shGalera = ss.getSheetByName(ABA_GALERA);
  if (shGalera && shGalera.getLastRow() >= 2) {
    const rows = shGalera.getDataRange().getValues().slice(1);
    rows.forEach(r => {
      const eq = (r[2] || '').toString().trim().toLowerCase();
      const nome = (r[1] || '').toString().trim();
      if (eq === equipe && nome) nomes[nome] = true;
    });
  }
  return { ok: true, atletas: Object.keys(nomes).map(n => ({ nome: n })) };
}

// ============================================================
//  CADASTRO DE ATLETAS
// ============================================================
function getAtletasSheet_() {
  const ss = getSS_();
  let sh = ss.getSheetByName(ABA_ATLETAS);
  if (!sh) {
    sh = ss.insertSheet(ABA_ATLETAS);
    sh.getRange(1, 1, 1, HEADERS_ATLETAS.length).setValues([HEADERS_ATLETAS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function cadastrarAtleta_(d) {
  const equipe = (d.equipe || '').toString().trim();
  const numero = (d.numero || '').toString().trim();
  const nome = (d.nome || '').toString().trim();
  const tipo = (d.tipo || '').toString().trim() === 'Comissão Técnica' ? 'Comissão Técnica' : 'Atleta';
  if (!equipe || !nome) return { ok: false, erro: 'Equipe e nome são obrigatórios.' };

  const sh = getAtletasSheet_();
  const rows = sh.getDataRange().getValues();

  // Atualiza se já existir o mesmo número nessa equipe; senão adiciona.
  if (numero) {
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][0] || '').toString().trim().toLowerCase() === equipe.toLowerCase() &&
          (rows[i][1] || '').toString().trim() === numero) {
        sh.getRange(i + 1, 3, 1, 2).setValues([[nome, tipo]]);
        return { ok: true, atualizado: true };
      }
    }
  }

  const limite = tipo === 'Comissão Técnica' ? LIMITE_COMISSAO : LIMITE_ATLETAS;
  const jaTem = rows.slice(1).filter(r =>
    (r[0] || '').toString().trim().toLowerCase() === equipe.toLowerCase() &&
    ((r[3] || 'Atleta').toString().trim() === tipo)
  ).length;
  if (jaTem >= limite) {
    const rotulo = tipo === 'Comissão Técnica' ? 'membros da comissão técnica' : 'atletas';
    return { ok: false, erro: 'Limite de ' + limite + ' ' + rotulo + ' já foi atingido pra essa equipe.' };
  }

  const agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  sh.appendRow([equipe, numero, nome, tipo, agora]);
  return { ok: true };
}

function removerAtleta_(d) {
  const equipe = (d.equipe || '').toString().trim().toLowerCase();
  const numero = (d.numero || '').toString().trim();
  const nome = (d.nome || '').toString().trim();
  const sh = getAtletasSheet_();
  const rows = sh.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    const eqOk = (rows[i][0] || '').toString().trim().toLowerCase() === equipe;
    const numOk = numero ? (rows[i][1] || '').toString().trim() === numero : true;
    const nomeOk = (rows[i][2] || '').toString().trim() === nome;
    if (eqOk && numOk && nomeOk) { sh.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: false, erro: 'Atleta não encontrado.' };
}

function listarAtletasEquipe_(equipe) {
  equipe = (equipe || '').toString().trim().toLowerCase();
  if (!equipe) return [];
  const sh = getAtletasSheet_();
  if (sh.getLastRow() < 2) return [];
  const rows = sh.getDataRange().getValues().slice(1);
  return rows.filter(r => (r[0] || '').toString().trim().toLowerCase() === equipe)
    .map(r => ({ equipe: r[0], numero: (r[1] || '').toString(), nome: r[2], tipo: (r[3] || 'Atleta').toString() }))
    .filter(a => a.nome);
}

function listarTodosAtletas_() {
  const sh = getAtletasSheet_();
  if (sh.getLastRow() < 2) return [];
  const rows = sh.getDataRange().getValues().slice(1);
  return rows.map(r => ({ equipe: r[0], numero: (r[1] || '').toString(), nome: r[2], tipo: (r[3] || 'Atleta').toString() })).filter(a => a.nome);
}

// ============================================================
//  PIN DE ACESSO POR EQUIPE
// ============================================================
function getEquipesPinSheet_() {
  const ss = getSS_();
  let sh = ss.getSheetByName(ABA_EQUIPES_PIN);
  if (!sh) {
    sh = ss.insertSheet(ABA_EQUIPES_PIN);
    sh.getRange(1, 1, 1, HEADERS_EQUIPES_PIN.length).setValues([HEADERS_EQUIPES_PIN]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function buscarPinEquipe_(equipe) {
  equipe = (equipe || '').toString().trim().toLowerCase();
  if (!equipe) return null;
  const sh = getEquipesPinSheet_();
  if (sh.getLastRow() < 2) return null;
  const rows = sh.getDataRange().getValues().slice(1);
  for (let i = 0; i < rows.length; i++) {
    if ((rows[i][0] || '').toString().trim().toLowerCase() === equipe) return (rows[i][1] || '').toString();
  }
  return null;
}

function verificarPin_(equipe, pin) {
  const real = buscarPinEquipe_(equipe);
  if (!real) return false;
  return real === (pin || '').toString().trim();
}

// Chamado pelo painel: gera (ou substitui) o PIN de 4 dígitos de
// uma equipe, pra você mandar junto do convite/confirmação.
function gerarPinEquipe_(d) {
  const equipe = (d.equipe || '').toString().trim();
  if (!equipe) return { ok: false, erro: 'Equipe é obrigatória.' };

  const pin = (Math.floor(1000 + Math.random() * 9000)).toString();
  const sh = getEquipesPinSheet_();
  const rows = sh.getDataRange().getValues();
  const agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');

  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][0] || '').toString().trim().toLowerCase() === equipe.toLowerCase()) {
      sh.getRange(i + 1, 2, 1, 2).setValues([[pin, agora]]);
      return { ok: true, equipe: equipe, pin: pin };
    }
  }
  sh.appendRow([equipe, pin, agora]);
  return { ok: true, equipe: equipe, pin: pin };
}

function cadastrarAtletaApp_(d) {
  if (!verificarPin_(d.equipe, d.pin)) return { ok: false, erro: 'PIN incorreto. Confirme o PIN da sua equipe.' };
  return cadastrarAtleta_(d);
}

function removerAtletaApp_(d) {
  if (!verificarPin_(d.equipe, d.pin)) return { ok: false, erro: 'PIN incorreto. Confirme o PIN da sua equipe.' };
  return removerAtleta_(d);
}

function listarEquipesConhecidas_() {
  const nomes = {};
  const ss = getSS_();
  const shInsc = ss.getSheetByName(ABA_INSCRICOES);
  if (shInsc && shInsc.getLastRow() >= 2) {
    const rows = shInsc.getDataRange().getValues();
    const headers = rows[0];
    const colEquipe = headers.indexOf('Nome da Equipe');
    if (colEquipe >= 0) {
      rows.slice(1).forEach(r => { const n = (r[colEquipe] || '').toString().trim(); if (n) nomes[n] = true; });
    }
  }
  try {
    const shJogos = SpreadsheetApp.openById(JOGOS_SHEET_ID).getSheetByName(ABA_GRUPOS);
    const rows = shJogos.getDataRange().getValues();
    Object.keys(ROW_MAP_GRUPOS).forEach(id => {
      const linha = ROW_MAP_GRUPOS[id] - 1;
      const a = (rows[linha] && rows[linha][1] || '').toString().trim();
      const b = (rows[linha] && rows[linha][11] || '').toString().trim();
      if (a) nomes[a] = true;
      if (b) nomes[b] = true;
    });
  } catch (ex) { /* leitura é opcional, não quebra o fluxo */ }
  return Object.keys(nomes).sort();
}

// ── PDF DA SÚMULA ───────────────────────────────────────────
function getPdfFolder_() {
  let id = PropertiesService.getScriptProperties().getProperty('PDF_FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (ex) { /* recria abaixo */ }
  }
  const folder = DriveApp.createFolder('Supercopa Vôlei - Súmulas PDF');
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  PropertiesService.getScriptProperties().setProperty('PDF_FOLDER_ID', folder.getId());
  return folder;
}

function uploadPdfSumula_(d) {
  if (!d.pdfBase64) return { ok: false, erro: 'PDF vazio.' };
  const bytes = Utilities.base64Decode(d.pdfBase64.split(',').pop());
  const blob = Utilities.newBlob(bytes, 'application/pdf', d.nomeArquivo || ('sumula-' + d.id + '.pdf'));
  const folder = getPdfFolder_();
  const file = folder.createFile(blob);
  return { ok: true, link: file.getUrl(), linkDownload: 'https://drive.google.com/uc?export=download&id=' + file.getId() };
}

// ============================================================
//  HELPER
// ============================================================
function okJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
