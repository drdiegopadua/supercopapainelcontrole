// ══════════════════════════════════════════════════════════
// APPS SCRIPT – BASQUETE (SUPERCOPA)
// Planilha ID: 1S3rUVU18W64c4okkxGOYnSLtW-aSyo47l3tos7u-8j0
//
// SETUP (faça UMA VEZ após colar o código):
//   1. Cole este código inteiro substituindo o anterior
//   2. Salve (Ctrl+S)
//   3. No menu: Executar → configurarTrigger
//   4. Autorize as permissões quando solicitado
//   Isso cria o trigger automático a cada 30 min para o bolão.
//
// ARQUIVAMENTO DE EDIÇÃO (Destaque da Galera):
//   Quando a edição de Basquete terminar, rode arquivarEdicaoGalera()
//   uma vez (ajuste NOME_EDICAO_ATUAL antes) pra arquivar todos os
//   votos e começar a contagem do Vôlei do zero, sem perder nada.
// ══════════════════════════════════════════════════════════

var SHEET_ID = '1S3rUVU18W64c4okkxGOYnSLtW-aSyo47l3tos7u-8j0';
var VOTOS_SHEET_ID = '1VS2RWX50aGYquB_AE-X9HQCcTvHsOEJwPcFAJjvD99c';

// ── TRIGGER SETUP (execute uma única vez) ──────────────────
function configurarTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'verificarBolao') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('verificarBolao')
    .timeBased()
    .everyMinutes(30)
    .create();
  Logger.log('Trigger criado: verificarBolao a cada 30 minutos');
}

// ══════════════════════════════════════════════════════════
// VERIFICAÇÃO AUTOMÁTICA DO BOLÃO (roda a cada 30 min)
// ══════════════════════════════════════════════════════════
function verificarBolao() {
  var ss = SpreadsheetApp.openById(SHEET_ID);

  var bolaoSheet = ss.getSheetByName('Bolao');
  if (!bolaoSheet || bolaoSheet.getLastRow() <= 1) return;

  var header = bolaoSheet.getRange(1, 1, 1, 6).getValues()[0];
  if (!header[3] || header[3] === '') {
    bolaoSheet.getRange(1, 4).setValue('Resultado');
    bolaoSheet.getRange(1, 5).setValue('Acerto');
    bolaoSheet.getRange(1, 6).setValue('% Acerto Geral');
  }

  var lastRow = bolaoSheet.getLastRow();
  var bets = bolaoSheet.getRange(2, 1, lastRow - 1, 3).getValues();

  var campeao = getCampeaoAtual(ss);
  var resultadosGrupos = getResultadosGrupos(ss);

  var totalAcertos = 0;
  var totalValidos = 0;
  var resultados = [];

  bets.forEach(function(bet) {
    var timePalpite = (bet[1] || '').toString().trim();
    if (!timePalpite) { resultados.push(['', '', '']); return; }
    totalValidos++;
    if (campeao) {
      var acertouCampeao = normalizar(timePalpite) === normalizar(campeao);
      resultados.push([
        acertouCampeao ? 'Campeão: ' + campeao : 'Eliminado',
        acertouCampeao ? 'SIM' : 'NÃO', ''
      ]);
      if (acertouCampeao) totalAcertos++;
    } else {
      var vitorias = contarVitorias(timePalpite, resultadosGrupos);
      var status = 'Em andamento (' + vitorias + ' vitória' + (vitorias !== 1 ? 's' : '') + ')';
      resultados.push([status, vitorias > 0 ? 'PARCIAL' : 'AGUARDANDO', '']);
      if (vitorias > 0) totalAcertos++;
    }
  });

  var pctGeral = totalValidos > 0 ? Math.round((totalAcertos / totalValidos) * 100) : 0;

  resultados.forEach(function(r, i) {
    var row = i + 2;
    bolaoSheet.getRange(row, 4).setValue(r[0]);
    bolaoSheet.getRange(row, 5).setValue(r[1]);
    if (i === 0) bolaoSheet.getRange(row, 6).setValue(pctGeral + '%');
    else bolaoSheet.getRange(row, 6).setValue('');
  });

  bolaoSheet.getRange(1, 6).setValue('% Acerto: ' + pctGeral + '%');

  salvarConfigInterno(ss, {
    'BOLAO_PCT_ACERTO': pctGeral + '%',
    'BOLAO_ACERTOS': totalAcertos.toString(),
    'BOLAO_TOTAL': totalValidos.toString(),
    'BOLAO_CAMPEAO': campeao || '',
    'BOLAO_ATUALIZADO': Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')
  });

  Logger.log('Bolão verificado: ' + totalAcertos + '/' + totalValidos + ' (' + pctGeral + '%)');
}

function getCampeaoAtual(ss) {
  var sheet = ss.getSheetByName('Mata-Mata');
  if (!sheet || sheet.getLastRow() < 2) return null;
  var data = sheet.getDataRange().getValues();
  var campeao = null;
  data.forEach(function(row) {
    var timeA = (row[0] || '').toString().trim();
    var placA = parseInt(row[1]) || 0;
    var placB = parseInt(row[2]) || 0;
    var timeB = (row[3] || '').toString().trim();
    var fase  = (row[4] || '').toString().toLowerCase();
    if ((fase.includes('final') || fase === 'f') && timeA && timeB && (placA > 0 || placB > 0)) {
      campeao = placA > placB ? timeA : (placB > placA ? timeB : null);
    }
  });
  if (!campeao) {
    for (var i = data.length - 1; i >= 1; i--) {
      var r = data[i];
      var tA = (r[0] || '').toString().trim();
      var pA = parseInt(r[1]) || 0;
      var pB = parseInt(r[2]) || 0;
      var tB = (r[3] || '').toString().trim();
      if (tA && tB && pA !== pB) { campeao = pA > pB ? tA : tB; break; }
    }
  }
  return campeao;
}

function getResultadosGrupos(ss) {
  var sheet = ss.getSheetByName('Fase de Grupos');
  if (!sheet || sheet.getLastRow() < 2) return [];
  var data = sheet.getDataRange().getValues();
  var jogos = [];
  data.slice(1).forEach(function(row) {
    var timeA = (row[0] || '').toString().trim();
    var placA = parseInt(row[1]);
    var placB = parseInt(row[2]);
    var timeB = (row[3] || '').toString().trim();
    if (timeA && timeB && !isNaN(placA) && !isNaN(placB)) {
      jogos.push({ timeA, placA, placB, timeB, vencedor: placA > placB ? timeA : (placB > placA ? timeB : null) });
    }
  });
  return jogos;
}

function contarVitorias(time, jogos) {
  var n = normalizar(time);
  return jogos.filter(function(j) { return j.vencedor && normalizar(j.vencedor) === n; }).length;
}

function normalizar(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').trim();
}

function salvarConfigInterno(ss, kvMap) {
  var cfg = ss.getSheetByName('Config');
  if (!cfg) cfg = ss.insertSheet('Config');
  var values = cfg.getLastRow() > 0 ? cfg.getDataRange().getValues() : [];
  Object.keys(kvMap).forEach(function(key) {
    var val = kvMap[key];
    var found = false;
    for (var i = 0; i < values.length; i++) {
      if (values[i][0] && values[i][0].toString().trim() === key) {
        cfg.getRange(i + 1, 2).setValue(val);
        values[i][1] = val;
        found = true;
        break;
      }
    }
    if (!found) { cfg.appendRow([key, val]); values.push([key, val]); }
  });
}

// ── Ranking de votos (usado por doPost e doGet) ────────────
function montarRankingVotos() {
  var ssVotos = SpreadsheetApp.openById(VOTOS_SHEET_ID);
  var votosSheet = ssVotos.getSheets()[0];
  if (!votosSheet || votosSheet.getLastRow() <= 1) return [];
  var rows = votosSheet.getDataRange().getValues().slice(1);
  var contagem = {};
  rows.forEach(function(r) {
    var key = (r[1] || '').toString().trim();
    if (!key) return;
    if (!contagem[key]) contagem[key] = { atleta: key, time: (r[2] || '').toString().trim(), votos: 0 };
    contagem[key].votos++;
  });
  return Object.values(contagem).sort(function(a, b) { return b.votos - a.votos; }).slice(0, 10);
}

// ══════════════════════════════════════════════════════════
// ARQUIVAMENTO DA EDIÇÃO — Destaque da Galera
// ══════════════════════════════════════════════════════════
// Renomeia a aba de votos atual (ex: "Basquete") para um nome de
// arquivo (ex: "Basquete_BASQUETE_2026"), preservando todos os
// votos, e cria uma aba nova "Basquete" (vazia, na posição 0) para
// a próxima edição (Vôlei) contar os votos do zero.
//
// Rode manualmente quando a edição de Basquete terminar.

function arquivarEdicaoGalera() {
  var NOME_EDICAO_ATUAL = 'BASQUETE_2026'; // <<< ajuste antes de rodar

  var ssVotos = SpreadsheetApp.openById(VOTOS_SHEET_ID);
  var atual = ssVotos.getSheets()[0];
  var nomeOriginal = atual.getName();
  var novoNome = nomeOriginal + '_' + NOME_EDICAO_ATUAL;

  if (ssVotos.getSheetByName(novoNome)) {
    Logger.log('Já existe uma aba chamada ' + novoNome + ' — nada a fazer.');
    return;
  }

  atual.setName(novoNome);
  var nova = ssVotos.insertSheet(nomeOriginal, 0);
  nova.appendRow(['DATA-HORA', 'ATLETA VOTADO', 'TIME']);

  Logger.log('Votos arquivados em: ' + novoNome);
  Logger.log('Nova aba de votos (vazia): ' + nomeOriginal);
}

// Lista o ranking de cada edição arquivada + a edição atual.
// Usado pelo Painel Admin na página "Edições".
function listarEdicoesGalera() {
  try {
    var ssVotos = SpreadsheetApp.openById(VOTOS_SHEET_ID);
    var todasAbas = ssVotos.getSheets();
    var atual = todasAbas[0];

    function rankingDeAba(sheet) {
      if (!sheet || sheet.getLastRow() <= 1) return [];
      var rows = sheet.getDataRange().getValues().slice(1);
      var contagem = {};
      rows.forEach(function(r) {
        var key = (r[1] || '').toString().trim();
        if (!key) return;
        if (!contagem[key]) contagem[key] = { atleta: key, time: (r[2] || '').toString().trim(), votos: 0 };
        contagem[key].votos++;
      });
      return Object.values(contagem).sort(function(a, b) { return b.votos - a.votos; }).slice(0, 10);
    }

    var resultado = [];
    todasAbas.forEach(function(sh) {
      if (sh.getName() === atual.getName()) return;
      var ranking = rankingDeAba(sh);
      resultado.push({
        edicao: sh.getName(),
        totalVotos: ranking.reduce(function(acc, x) { return acc + x.votos; }, 0),
        ranking: ranking
      });
    });
    var rankingAtual = rankingDeAba(atual);
    resultado.push({
      edicao: 'ATUAL',
      totalVotos: rankingAtual.reduce(function(acc, x) { return acc + x.votos; }, 0),
      ranking: rankingAtual
    });

    return { ok: true, edicoes: resultado };
  } catch (ex) {
    return { ok: false, erro: ex.message };
  }
}

// ══════════════════════════════════════════════════════════
// doPost – recebe requisições do painel de controle e do app
// ══════════════════════════════════════════════════════════
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var mode = body.mode || body.tipo || '';

    // ── compatibilidade com o app (que manda "action") ─────
    if (!mode && body.action === 'votar') mode = 'votar_atleta';
    if (!mode && body.action === 'ranking') mode = 'ranking_atleta';

    var ss = SpreadsheetApp.openById(SHEET_ID);

    // ── salvar_config ──────────────────────────────────────
    if (mode === 'salvar_config') {
      salvarConfigInterno(ss, body.data || {});
      return jsonResponse({ ok: true, mode: 'salvar_config' });
    }

    // ── adicionar_bolao ────────────────────────────────────
    if (mode === 'adicionar_bolao') {
      var esporte = (body.esporte || 'basquete').toUpperCase();
      var configKey = 'BOLAO_' + esporte + '_ABERTO';
      var cfgSheet = ss.getSheetByName('Config');
      var bolaoAberto = false;
      if (cfgSheet && cfgSheet.getLastRow() > 0) {
        var cfgVals = cfgSheet.getDataRange().getValues();
        for (var ci = 0; ci < cfgVals.length; ci++) {
          if (cfgVals[ci][0] && cfgVals[ci][0].toString().trim() === configKey) {
            bolaoAberto = cfgVals[ci][1].toString().trim() === 'SIM';
            break;
          }
        }
      }
      if (!bolaoAberto) return jsonResponse({ ok: false, erro: 'Bolão ' + esporte + ' está fechado no momento.' });
      var bolao = ss.getSheetByName('Bolao');
      if (!bolao) {
        bolao = ss.insertSheet('Bolao');
        bolao.appendRow(['Nome', 'Time', 'Esporte', 'Data', 'Resultado', 'Acerto', '% Acerto Geral']);
      } else if (bolao.getLastRow() === 0) {
        bolao.appendRow(['Nome', 'Time', 'Esporte', 'Data', 'Resultado', 'Acerto', '% Acerto Geral']);
      }
      bolao.appendRow([body.nome || '', body.time || '', esporte, new Date(), '', '', '']);
      verificarBolao();
      return jsonResponse({ ok: true, mode: 'adicionar_bolao' });
    }

    // ── placar_basquete ────────────────────────────────────
    if (mode === 'placar_basquete' || mode === 'atualizar_placar') {
      var sheet = ss.getSheetByName('Fase de Grupos');
      if (!sheet) return jsonResponse({ ok: false, erro: 'Aba Fase de Grupos não encontrada' });
      var linha = parseInt(body.linha);
      if (isNaN(linha) || linha < 2) return jsonResponse({ ok: false, erro: 'Linha inválida' });
      if (body.timeA) sheet.getRange(linha, 1).setValue(body.timeA);
      if (body.placA !== undefined) sheet.getRange(linha, 2).setValue(body.placA);
      if (body.placB !== undefined) sheet.getRange(linha, 3).setValue(body.placB);
      if (body.timeB) sheet.getRange(linha, 4).setValue(body.timeB);
      verificarBolao();
      return jsonResponse({ ok: true, mode: 'placar_basquete', linha: linha });
    }

    // ── adicionar_linha ────────────────────────────────────
    if (mode === 'adicionar_linha') {
      var sheetName = body.aba || 'Fase de Grupos';
      var s = ss.getSheetByName(sheetName);
      if (!s) return jsonResponse({ ok: false, erro: 'Aba não encontrada: ' + sheetName });
      s.appendRow(body.dados || []);
      return jsonResponse({ ok: true, mode: 'adicionar_linha' });
    }

    // ── substituir_linha ───────────────────────────────────
    if (mode === 'substituir_linha') {
      var sheetName2 = body.aba || 'Fase de Grupos';
      var s2 = ss.getSheetByName(sheetName2);
      if (!s2) return jsonResponse({ ok: false, erro: 'Aba não encontrada: ' + sheetName2 });
      var ln = parseInt(body.linha);
      var dados = body.dados || [];
      if (!isNaN(ln) && ln >= 1 && dados.length > 0) {
        s2.getRange(ln, 1, 1, dados.length).setValues([dados]);
      }
      return jsonResponse({ ok: true, mode: 'substituir_linha' });
    }

    // ── votar_atleta ───────────────────────────────────────
    if (mode === 'votar_atleta') {
      var nomeAtleta = (body.atleta || '').toString().trim();
      var timeAtleta = (body.time || '').toString().trim();
      if (!nomeAtleta) return jsonResponse({ ok: false, erro: 'Nome do atleta obrigatorio' });
      var ssVotos = SpreadsheetApp.openById(VOTOS_SHEET_ID);
      var votos = ssVotos.getSheets()[0];
      if (votos.getLastRow() === 0) {
        votos.appendRow(['Data-Hora', 'Atleta', 'Time']);
      }
      var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
      votos.appendRow([agora, nomeAtleta, timeAtleta]);
      return jsonResponse({ ok: true, mode: 'votar_atleta' });
    }

    // ── ranking_atleta ─────────────────────────────────────
    if (mode === 'ranking_atleta') {
      return jsonResponse({ ok: true, ranking: montarRankingVotos() });
    }

    return jsonResponse({ ok: false, erro: 'modo desconhecido: ' + mode });

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, erro: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ══════════════════════════════════════════════════════════
// doGet – ranking (usado pelo app: GALERA_URL?action=ranking)
// ══════════════════════════════════════════════════════════
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'ranking') {
    try {
      return jsonResponse({ ok: true, ranking: montarRankingVotos() });
    } catch (err) {
      return jsonResponse({ ok: false, erro: err.message });
    }
  }
  if (action === 'listar_edicoes') {
    try {
      return jsonResponse(listarEdicoesGalera());
    } catch (err) {
      return jsonResponse({ ok: false, erro: err.message });
    }
  }
  return ContentService
    .createTextOutput('Supercopa Basquete Apps Script v6 OK')
    .setMimeType(ContentService.MimeType.TEXT);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
