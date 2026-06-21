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
// ════════════════════════════════════════════════════════

var SHEET_ID = '1S3rUVU18W64c4okkxGOYnSLtW-aSyo47l3tos7u-8j0';

// ── TRIGGER SETUP (execute uma única vez) ───────────────
function configurarTrigger() {
  // Remove triggers antigos para evitar duplicatas
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'verificarBolao') {
      ScriptApp.deleteTrigger(t);
    }
  });
  // Cria trigger a cada 30 minutos
  ScriptApp.newTrigger('verificarBolao')
    .timeBased()
    .everyMinutes(30)
    .create();
  Logger.log('Trigger criado: verificarBolao a cada 30 minutos');
}

// ══════════════════════════════════════════════════════════
// VERIFICAÇÃO AUTOMÁTICA DO BOLÃO (roda a cada 30 min)
// Lê os resultados reais dos jogos, compara com os palpites
// e atualiza a aba Bolao com acertos/erros e % geral.
// ══════════════════════════════════════════════════════════
function verificarBolao() {
  var ss = SpreadsheetApp.openById(SHEET_ID);

  // ── 1. Ler palpites do bolão ─────────────────────────
  var bolaoSheet = ss.getSheetByName('Bolao');
  if (!bolaoSheet || bolaoSheet.getLastRow() <= 1) return; // sem dados

  // Garante cabeçalhos com colunas extras
  var header = bolaoSheet.getRange(1, 1, 1, 6).getValues()[0];
  if (!header[3] || header[3] === '') {
    bolaoSheet.getRange(1, 4).setValue('Resultado');
    bolaoSheet.getRange(1, 5).setValue('Acerto');
    bolaoSheet.getRange(1, 6).setValue('% Acerto Geral');
  }

  var lastRow = bolaoSheet.getLastRow();
  // Lê linhas de dados (a partir da linha 2)
  var bets = bolaoSheet.getRange(2, 1, lastRow - 1, 3).getValues();
  // bets[i] = [Nome, Time (palpite), Data]

  // ── 2. Descobrir o campeão atual (Mata-Mata) ─────────
  var campeao = getCampeaoAtual(ss);

  // ── 3. Ler resultados da fase de grupos ─────────────
  // Para pontuação parcial: verificar se o time do palpite
  // ganhou jogos na fase de grupos (1 acerto por vitória)
  var resultadosGrupos = getResultadosGrupos(ss);

  // ── 4. Calcular acertos por palpite ─────────────────
  var totalAcertos = 0;
  var totalValidos = 0;
  var resultados = []; // [resultado_texto, acerto_sim_nao, %]

  bets.forEach(function(bet) {
    var nomePalpite = (bet[0] || '').toString().trim();
    var timePalpite = (bet[1] || '').toString().trim();
    if (!timePalpite) {
      resultados.push(['', '', '']);
      return;
    }

    totalValidos++;

    // Verificar se há campeão definido
    if (campeao) {
      var acertouCampeao = normalizar(timePalpite) === normalizar(campeao);
      resultados.push([
        acertouCampeao ? 'Campeão: ' + campeao : 'Eliminado',
        acertouCampeao ? 'SIM' : 'NÃO',
        ''  // % será calculado após
      ]);
      if (acertouCampeao) totalAcertos++;
    } else {
      // Fase em andamento: verificar vitórias do time escolhido
      var vitorias = contarVitorias(timePalpite, resultadosGrupos);
      var totalJogos = resultadosGrupos.length;
      var status = 'Em andamento (' + vitorias + ' vitória' + (vitorias !== 1 ? 's' : '') + ')';
      // "Acerto parcial" = time ganhou pelo menos 1 jogo
      var acertoParcial = vitorias > 0;
      resultados.push([status, acertoParcial ? 'PARCIAL' : 'AGUARDANDO', '']);
      if (acertoParcial) totalAcertos++;
    }
  });

  // ── 5. Calcular % geral ──────────────────────────────
  var pctGeral = totalValidos > 0
    ? Math.round((totalAcertos / totalValidos) * 100)
    : 0;

  // ── 6. Gravar resultados na aba Bolao ────────────────
  resultados.forEach(function(r, i) {
    var row = i + 2; // linha na planilha (dados começam na linha 2)
    bolaoSheet.getRange(row, 4).setValue(r[0]); // Resultado
    bolaoSheet.getRange(row, 5).setValue(r[1]); // Acerto
    // % só na primeira linha de dados para referência
    if (i === 0) {
      bolaoSheet.getRange(row, 6).setValue(pctGeral + '%');
    } else {
      bolaoSheet.getRange(row, 6).setValue('');
    }
  });

  // % geral no cabeçalho da coluna F
  bolaoSheet.getRange(1, 6).setValue('% Acerto: ' + pctGeral + '%');

  // ── 7. Salvar % na aba Config (para a TV exibir) ─────
  salvarConfigInterno(ss, {
    'BOLAO_PCT_ACERTO': pctGeral + '%',
    'BOLAO_ACERTOS': totalAcertos.toString(),
    'BOLAO_TOTAL': totalValidos.toString(),
    'BOLAO_CAMPEAO': campeao || '',
    'BOLAO_ATUALIZADO': Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')
  });

  Logger.log('Bolão verificado: ' + totalAcertos + '/' + totalValidos + ' (' + pctGeral + '%)');
}

// ── Retorna o campeão do mata-mata (se houver) ──────────
function getCampeaoAtual(ss) {
  var sheet = ss.getSheetByName('Mata-Mata');
  if (!sheet || sheet.getLastRow() < 2) return null;

  var data = sheet.getDataRange().getValues();
  // Percorre todas as linhas procurando a final (última linha com resultado)
  // Estrutura esperada: Time A | Placar A | Placar B | Time B | (opcional: Fase)
  var campeao = null;
  data.forEach(function(row) {
    var timeA = (row[0] || '').toString().trim();
    var placA = parseInt(row[1]) || 0;
    var placB = parseInt(row[2]) || 0;
    var timeB = (row[3] || '').toString().trim();
    var fase  = (row[4] || '').toString().toLowerCase();

    // Final identificada por "final" na coluna fase, ou última linha com placar
    if ((fase.includes('final') || fase === 'f') && timeA && timeB && (placA > 0 || placB > 0)) {
      campeao = placA > placB ? timeA : (placB > placA ? timeB : null);
    }
  });

  // Se não achou via coluna fase, pega a última linha com dois times e placar diferente
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

// ── Lê resultados da fase de grupos ─────────────────────
// Retorna array de { timeA, placA, placB, timeB, vencedor }
function getResultadosGrupos(ss) {
  var sheet = ss.getSheetByName('Fase de Grupos');
  if (!sheet || sheet.getLastRow() < 2) return [];

  var data = sheet.getDataRange().getValues();
  var jogos = [];
  data.slice(1).forEach(function(row) { // pula cabeçalho
    var timeA = (row[0] || '').toString().trim();
    var placA = parseInt(row[1]);
    var placB = parseInt(row[2]);
    var timeB = (row[3] || '').toString().trim();
    if (timeA && timeB && !isNaN(placA) && !isNaN(placB)) {
      jogos.push({
        timeA: timeA,
        placA: placA,
        placB: placB,
        timeB: timeB,
        vencedor: placA > placB ? timeA : (placB > placA ? timeB : null)
      });
    }
  });
  return jogos;
}

// ── Conta quantos jogos um time venceu ──────────────────
function contarVitorias(time, jogos) {
  var n = normalizar(time);
  return jogos.filter(function(j) {
    return j.vencedor && normalizar(j.vencedor) === n;
  }).length;
}

// ── Normaliza string para comparação (sem acento/maiúsculas) ─
function normalizar(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

// ── Grava chave-valor na aba Config (uso interno) ────────
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

    // ── salvar_config ───────────────────────────────────
    if (mode === 'salvar_config') {
      salvarConfigInterno(ss, body.data || {});
      return jsonResponse({ ok: true, mode: 'salvar_config' });
    }

    // ── adicionar_bolao ─────────────────────────────────
    if (mode === 'adicionar_bolao') {
      // Verifica se o bolão do esporte está aberto
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
      if (!bolaoAberto) {
        return jsonResponse({ ok: false, erro: 'Bolão ' + esporte + ' está fechado no momento.' });
      }

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

    // ── atualizarPlacarBasquete (modo existente) ─────────
    if (mode === 'placar_basquete' || mode === 'atualizar_placar') {
      var sheet = ss.getSheetByName('Fase de Grupos');
      if (!sheet) return jsonResponse({ ok: false, erro: 'Aba Fase de Grupos não encontrada' });

      var linha = parseInt(body.linha);
      if (isNaN(linha) || linha < 2) return jsonResponse({ ok: false, erro: 'Linha inválida' });

      if (body.timeA) sheet.getRange(linha, 1).setValue(body.timeA);
      if (body.placA !== undefined) sheet.getRange(linha, 2).setValue(body.placA);
      if (body.placB !== undefined) sheet.getRange(linha, 3).setValue(body.placB);
      if (body.timeB) sheet.getRange(linha, 4).setValue(body.timeB);

      // Após atualizar placar, roda verificação do bolão imediatamente
      verificarBolao();

      return jsonResponse({ ok: true, mode: 'placar_basquete', linha: linha });
    }

    // ── adicionar linha (modo existente) ────────────────
    if (mode === 'adicionar_linha') {
      var sheetName = body.aba || 'Fase de Grupos';
      var s = ss.getSheetByName(sheetName);
      if (!s) return jsonResponse({ ok: false, erro: 'Aba não encontrada: ' + sheetName });
      s.appendRow(body.dados || []);
      return jsonResponse({ ok: true, mode: 'adicionar_linha' });
    }

    // ── substituir linha (modo existente) ───────────────
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

// ── doGet ────────────────────────────────────────────────
function doGet(e) {
  return ContentService
    .createTextOutput('Supercopa Basquete Apps Script v6 OK')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ── Helper ───────────────────────────────────────────────
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
