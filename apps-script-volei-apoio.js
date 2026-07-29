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

    // SÚMULA DIGITAL
    if (acao === 'salvarSumula') {
      return okJson(salvarSumula_(dados));
    }

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
function resolverJogoSumula_(id) {
  id = (id || '').toString().trim().toUpperCase();
  if (ROW_MAP_GRUPOS[id]) return { aba: ABA_GRUPOS, linha: ROW_MAP_GRUPOS[id], id: id };
  if (ROW_MAP_MATA[id]) return { aba: ABA_MATA, linha: ROW_MAP_MATA[id], id: id };
  return null;
}

function carregarJogoSumula_(id) {
  const jogo = resolverJogoSumula_(id);
  if (!jogo) return { ok: false, erro: 'Jogo não encontrado: ' + id };

  const shJogo = SpreadsheetApp.openById(JOGOS_SHEET_ID).getSheetByName(jogo.aba);
  const row = shJogo.getRange(jogo.linha, 1, 1, 17).getValues()[0];

  const equipeA = (row[1] || '').toString().trim();
  const equipeB = (row[11] || '').toString().trim();

  return {
    ok: true,
    id: jogo.id,
    aba: jogo.aba,
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

  // 1) Grava o placar simplificado na planilha de jogos (mesmo
  //    lugar que o site/app e o painel já leem).
  const shJogo = SpreadsheetApp.openById(JOGOS_SHEET_ID).getSheetByName(jogo.aba);
  const linhaAtual = shJogo.getRange(jogo.linha, 1, 1, 17).getValues()[0];
  const numeroJogo = linhaAtual[0] || '';

  shJogo.getRange(jogo.linha, 1, 1, 17).setValues([[
    numeroJogo,
    d.equipeA || '',
    (sets[0].a || '').toString(), (sets[1].a || '').toString(), (sets[2].a || '').toString(),
    setsVencidosA.toString(),
    'X',
    (sets[0].b || '').toString(), (sets[1].b || '').toString(), (sets[2].b || '').toString(),
    setsVencidosB.toString(),
    d.equipeB || '',
    setsVencidosA.toString(), setsVencidosB.toString(),
    vencedor,
    d.data || linhaAtual[15] || '',
    d.local || linhaAtual[16] || ''
  ]]);

  // 2) Grava/atualiza o registro completo da súmula.
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
//  HELPER
// ============================================================
function okJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
