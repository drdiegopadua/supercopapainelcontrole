// ════════════════════════════════════════════════════════
// APPS SCRIPT — BASQUETE (SUPERCOPA)
// Planilha ID: 1S3rUVU18W64c4okkxGOYnSLtW-aSyo47l3tos7u-8j0
//
// SETUP (faça UMA VEZ após colar o código):
//   1. Cole este código inteiro substituindo o anterior
//   2. Salve (Ctrl+S)
//   3. No menu: Executar → configurarTrigger
//   4. Autorize as permissões quando solicitado
//   Isso cria o trigger automático a cada 30 min para o bolão.
//   5. Implantar → Gerenciar implantações → editar (lápis) →
//      Nova versão → Implantar (ESSENCIAL, sem isso a correção
//      do placar de basquete não entra em vigor).
// ════════════════════════════════════════════════════════

var SHEET_ID = '1S3rUVU18W64c4okkxGOYnSLtW-aSyo47l3tos7u-8j0';

// ── TRIGGER SETUP (execute uma única vez) ───────────────
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
    if (!timePalpite) {
      resultados.push(['', '', '']);
      return;
    }

    totalValidos++;

    if (campeao) {
      var acertouCampeao = normalizar(timePalpite) === normalizar(campeao);
      resultados.push([
        acertouCampeao ? 'Campeão: ' + campeao : 'Eliminado',
        acertouCampeao ? 'SIM' : 'NÃO',
        ''
      ]);
      if (acertouCampeao) totalAcertos++;
    } else {
      var vitorias = contarVitorias(timePalpite, resultadosGrupos);
      var status = 'Em andamento (' + vitorias + ' vitória' + (vitorias !== 1 ? 's' : '') + ')';
      var acertoParcial = vitorias > 0;
      resultados.push([status, acertoParcial ? 'PARCIAL' : 'AGUARDANDO', '']);
      if (acertoParcial) totalAcertos++;
    }
  });

  var pctGeral = totalValidos > 0
    ? Math.round((totalAcertos / totalValidos) * 100)
    : 0;

  resultados.forEach(function(r, i) {
    var row = i + 2;
    bolaoSheet.getRange(row, 4).setValue(r[0]);
    bolaoSheet.getRange(row, 5).setValue(r[1]);
    bolaoSheet.getRange(row, 6).setValue(i === 0 ? pctGeral + '%' : '');
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
      if (tA && tB && pA !== pB) {
        campeao = pA > pB ? tA : tB;
        break;
      }
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
      jogos.push({
        timeA: timeA, placA: placA, placB: placB, timeB: timeB,
        vencedor: placA > placB ? timeA : (placB > placA ? timeB : null)
      });
    }
  });
  return jogos;
}

function contarVitorias(time, jogos) {
  var n = normalizar(time);
  return jogos.filter(function(j) {
    return j.vencedor && normalizar(j.vencedor) === n;
  }).length;
}

function normalizar(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
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
    if (!found) {
      cfg.appendRow([key, val]);
      values.push([key, val]);
    }
  });
}

// ══════════════════════════════════════════════════════════
// doPost — recebe requisições do painel de controle
// ══════════════════════════════════════════════════════════
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var mode = body.mode || body.tipo || '';
    var ss   = SpreadsheetApp.openById(SHEET_ID);

    if (mode === 'salvar_config') {
      salvarConfigInterno(ss, body.data || {});
      return jsonResponse({ ok: true, mode: 'salvar_config' });
    }

    if (mode === 'adicionar_bolao') {
      var bolao = ss.getSheetByName('Bolao');
      if (!bolao) {
        bolao = ss.insertSheet('Bolao');
        bolao.appendRow(['Nome', 'Time', 'Data', 'Resultado', 'Acerto', '% Acerto Geral']);
      } else if (bolao.getLastRow() === 0) {
        bolao.appendRow(['Nome', 'Time', 'Data', 'Resultado', 'Acerto', '% Acerto Geral']);
      }
      bolao.appendRow([body.nome || '', body.time || '', new Date(), '', '', '']);
      verificarBolao();
      return jsonResponse({ ok: true, mode: 'adicionar_bolao' });
    }

    if (mode === 'placar_basquete' || mode === 'atualizar_placar') {
      var sheet = ss.getSheetByName('Fase de Grupos');
      if (!sheet) return jsonResponse({ ok: false, erro: 'Aba Fase de Grupos não encontrada' });
      var linha = parseInt(body.linha);
      if (isNaN(linha) || linha < 2) return jsonResponse({ ok: false, erro: 'Linha inválida' });

      // Estrutura real confirmada na planilha 'Fase de Grupos':
      // Grupo A: A=JOGO B=EQUIPE1 C=(vazia) D=PTS1 E=X F=PTS2 G=EQUIPE2 H=(vazia) I=RESULTADO
      // Grupo B: K=JOGO L=EQUIPE1 M=(vazia) N=PTS1 O=X P=PTS2 Q=EQUIPE2 R=(vazia) S=RESULTADO
      var grupo = (body.grupo || 'A').toString().toUpperCase();
      var off = grupo === 'B' ? 10 : 0;
      var colJogo      = 1 + off;  // A ou K
      var colEquipe1   = 2 + off;  // B ou L
      var colPts1      = 4 + off;  // D ou N
      var colPts2      = 6 + off;  // F ou P
      var colEquipe2   = 7 + off;  // G ou Q
      var colResultado = 9 + off;  // I ou S

      var placA = body.placA;
      var placB = body.placB;
      var vencedor = body.vencedor;
      if (!vencedor) {
        var pa = parseInt(placA) || 0, pb = parseInt(placB) || 0;
        vencedor = pa > pb ? body.timeA : (pb > pa ? body.timeB : 'EMPATE');
      }

      if (body.jogo !== undefined) sheet.getRange(linha, colJogo).setValue(body.jogo);
      if (body.timeA)              sheet.getRange(linha, colEquipe1).setValue(body.timeA);
      if (placA !== undefined)     sheet.getRange(linha, colPts1).setValue(placA);
      if (placB !== undefined)     sheet.getRange(linha, colPts2).setValue(placB);
      if (body.timeB)              sheet.getRange(linha, colEquipe2).setValue(body.timeB);
      sheet.getRange(linha, colResultado).setValue(vencedor);

      verificarBolao();
      return jsonResponse({ ok: true, mode: 'placar_basquete', linha: linha, grupo: grupo });
    }

    if (mode === 'adicionar_linha') {
      var sheetName = body.aba || 'Fase de Grupos';
      var s = ss.getSheetByName(sheetName);
      if (!s) return jsonResponse({ ok: false, erro: 'Aba não encontrada: ' + sheetName });
      s.appendRow(body.dados || []);
      return jsonResponse({ ok: true, mode: 'adicionar_linha' });
    }

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

    return jsonResponse({ ok: false, erro: 'modo desconhecido: ' + mode });

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, erro: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput('Supercopa Basquete Apps Script v7 OK')
    .setMimeType(ContentService.MimeType.TEXT);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
