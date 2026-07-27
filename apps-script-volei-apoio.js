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

  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());

  Logger.log('====================================================');
  Logger.log('Planilha criada: ' + ss.getUrl());
  Logger.log('====================================================');
}

function getSS_() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('Rode criarPlanilhaVolei() primeiro.');
  return SpreadsheetApp.openById(id);
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
//  HELPER
// ============================================================
function okJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
