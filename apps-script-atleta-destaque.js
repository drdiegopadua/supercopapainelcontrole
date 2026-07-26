// ============================================================
// SUPERCOPA AFC 2026 — Apps Script da Planilha ATLETA DESTAQUE
// ID: 18wKa_PWsVDBJdMw5wJLFs-1Qtcx5C1zdzlE_lK2Wzgo
//
// Cuida de:
//  - Atleta Destaque por jogo (aba "Basquete")
//  - Melhores do Campeonato: MVP, Melhor Ala, Melhor Armador,
//    Melhor Pivô (aba "Premiacao")
//  - Arquivamento por edição (pra zerar sem perder histórico)
//
// COMO USAR: abra o Apps Script vinculado a esta planilha
// (Extensões > Apps Script), apague todo o conteúdo do arquivo
// e cole este texto inteiro no lugar. Depois: Implantar >
// Gerenciar implantações > editar (ícone de lápis) > Nova versão
// > Implantar. A URL do /exec continua a mesma, não precisa
// trocar em nenhum lugar do painel/app/TV.
//
// Quando a edição de Basquete terminar: rode arquivarEdicaoAtual()
// uma vez (com NOME_EDICAO_ATUAL = 'BASQUETE_2026') pra arquivar
// os destaques e a premiação, e deixar tudo zerado pra edição do
// Vôlei.
// ============================================================

const ABA_ATLETA_DESTAQUE = 'Basquete';
const ABA_PREMIACAO       = 'Premiacao';

// ── doPost ──────────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // MELHORES DO CAMPEONATO (MVP / Ala / Armador / Pivô)
    if (data.acao === 'salvarPremiacao') {
      return okJson(salvarPremiacao_(data.categoria, data.nome, data.equipe));
    }
    if (data.acao === 'excluirPremiacao') {
      return okJson(excluirPremiacao_(data.categoria));
    }

    // CONFIG DA TV (telas selecionadas no painel → TV lê e aplica sozinha)
    if (data.acao === 'salvarTvConfig') {
      return okJson(salvarTvConfig_(data.codes));
    }

    // ATLETA DESTAQUE POR JOGO
    if (data.acao === 'adicionar') {
      const sh = getAbaAtletaDestaque_();
      sh.appendRow(data.linha);
      return okJson({ ok: true });
    }
    if (data.acao === 'excluir') {
      const sh = getAbaAtletaDestaque_();
      const rowIndex = parseInt(data.rowIndex);
      if (rowIndex >= 2 && rowIndex <= sh.getLastRow()) {
        sh.deleteRow(rowIndex);
      }
      return okJson({ ok: true });
    }

    return okJson({ ok: false, erro: 'ação inválida' });
  } catch (ex) {
    return okJson({ ok: false, erro: ex.message });
  }
}

// ── doGet ───────────────────────────────────────────────────
function doGet(e) {
  try {
    const action = (e.parameter && e.parameter.action) || '';

    if (action === 'premiacao') {
      return okJson(listarPremiacao_());
    }

    if (action === 'listar_edicoes') {
      return okJson(listarEdicoesArquivadas());
    }

    return okJson({ erro: 'ação inválida' });
  } catch (ex) {
    return okJson({ erro: ex.message });
  }
}

// ============================================================
//  ATLETA DESTAQUE POR JOGO (aba "Basquete")
// ============================================================
function getAbaAtletaDestaque_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ABA_ATLETA_DESTAQUE);
  if (!sh) {
    sh = ss.insertSheet(ABA_ATLETA_DESTAQUE);
    sh.appendRow(['Modalidade', 'Jogo', 'Nome', 'Equipe', 'Observação', 'Data/Hora']);
  }
  return sh;
}

// ============================================================
//  MELHORES DO CAMPEONATO (aba "Premiacao")
// ============================================================
function getAbaPremiacao_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ABA_PREMIACAO);
  if (!sh) {
    sh = ss.insertSheet(ABA_PREMIACAO);
    sh.appendRow(['Categoria', 'Nome', 'Equipe', 'Atualizado em']);
  }
  return sh;
}

function salvarPremiacao_(categoria, nome, equipe) {
  if (!categoria || !nome) return { ok: false, erro: 'Categoria e nome são obrigatórios' };
  const sh = getAbaPremiacao_();
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

function excluirPremiacao_(categoria) {
  const sh = getAbaPremiacao_();
  const rows = sh.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if ((rows[i][0] || '').toString().trim() === categoria) {
      sh.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: true };
}

function listarPremiacao_() {
  const sh = getAbaPremiacao_();
  if (sh.getLastRow() < 2) return { premiacao: [] };
  const rows = sh.getDataRange().getValues().slice(1);
  const premiacao = rows.map(function(r) {
    return {
      categoria: (r[0] || '').toString().trim(),
      nome: (r[1] || '').toString().trim(),
      equipe: (r[2] || '').toString().trim(),
      atualizado: (r[3] || '').toString().trim()
    };
  }).filter(function(p) { return p.categoria; });
  return { premiacao: premiacao };
}

// ============================================================
//  CONFIG DA TV (aba "ConfigTV")
// ============================================================
function salvarTvConfig_(codes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('ConfigTV');
  if (!sh) {
    sh = ss.insertSheet('ConfigTV');
    sh.appendRow(['Codes', 'Atualizado em']);
  }
  sh.getRange(2, 1, 1, 2).setValues([[(codes || '').toString(), new Date().toLocaleString('pt-BR')]]);
  return { ok: true };
}

// ============================================================
//  ARQUIVAMENTO POR EDIÇÃO
// ============================================================
// Renomeia as abas "Basquete" (destaques) e "Premiacao" (melhores
// do campeonato) para um nome de arquivo (ex: "Basquete_BASQUETE_2026"),
// preservando todos os dados. As abas originais são recriadas vazias
// automaticamente na próxima vez que alguém salvar um destaque/prêmio,
// então a próxima edição (Vôlei) começa do zero.
//
// Rode manualmente quando uma edição terminar: ajuste
// NOME_EDICAO_ATUAL abaixo pro nome da edição que está TERMINANDO.

function arquivarEdicaoAtual() {
  const NOME_EDICAO_ATUAL = 'BASQUETE_2026'; // <<< ajuste antes de rodar

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  [ABA_ATLETA_DESTAQUE, ABA_PREMIACAO].forEach(nomeAba => {
    const sheet = ss.getSheetByName(nomeAba);
    if (!sheet) return;
    const novoNome = nomeAba + '_' + NOME_EDICAO_ATUAL;
    if (ss.getSheetByName(novoNome)) {
      Logger.log('Já existe uma aba chamada ' + novoNome + ' — pulando ' + nomeAba + '.');
      return;
    }
    sheet.setName(novoNome);
    Logger.log('Arquivado: ' + nomeAba + ' → ' + novoNome);
  });

  Logger.log('Arquivamento concluído. As próximas ações vão recriar as abas ' +
    ABA_ATLETA_DESTAQUE + ' e ' + ABA_PREMIACAO + ' automaticamente.');
}

// Lista as edições arquivadas + a edição atual. Usado pelo Painel
// Admin na página "Edições".
function listarEdicoesArquivadas() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets().map(s => s.getName());

    const edicoes = new Set();
    sheets.forEach(nome => {
      [ABA_ATLETA_DESTAQUE, ABA_PREMIACAO].forEach(base => {
        if (nome.indexOf(base + '_') === 0) edicoes.add(nome.slice(base.length + 1));
      });
    });

    const contarLinhas = (nome) => {
      const sh = ss.getSheetByName(nome);
      return (sh && sh.getLastRow() >= 2) ? sh.getLastRow() - 1 : 0;
    };
    const listarPremiacaoDe = (nome) => {
      const sh = ss.getSheetByName(nome);
      if (!sh || sh.getLastRow() < 2) return [];
      return sh.getDataRange().getValues().slice(1).map(r => ({
        categoria: (r[0] || '').toString().trim(),
        nome: (r[1] || '').toString().trim(),
        equipe: (r[2] || '').toString().trim()
      })).filter(p => p.categoria);
    };

    const resultado = [];
    edicoes.forEach(ed => {
      resultado.push({
        edicao: ed,
        destaques: contarLinhas(ABA_ATLETA_DESTAQUE + '_' + ed),
        premiacao: listarPremiacaoDe(ABA_PREMIACAO + '_' + ed)
      });
    });
    resultado.push({
      edicao: 'ATUAL',
      destaques: contarLinhas(ABA_ATLETA_DESTAQUE),
      premiacao: listarPremiacaoDe(ABA_PREMIACAO)
    });

    return { ok: true, edicoes: resultado };
  } catch (ex) {
    return { ok: false, erro: ex.message };
  }
}

// ============================================================
//  HELPER
// ============================================================
function okJson(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
