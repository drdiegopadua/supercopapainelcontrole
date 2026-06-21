// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// APPS SCRIPT â€” BASQUETE (SUPERCOPA)
// Planilha ID: 1S3rUVU18W64c4okkxGOYnSLtW-aSyo47l3tos7u-8j0
//
// SETUP (faÃ§a UMA VEZ apÃ³s colar o cÃ³digo):
//   1. Cole este cÃ³digo inteiro substituindo o anterior
//   2. Salve (Ctrl+S)
//   3. No menu: Executar â†’ configurarTrigger
//   4. Autorize as permissÃµes quando solicitado
//   Isso cria o trigger automÃ¡tico a cada 30 min para o bolÃ£o.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

var SHEET_ID = '1S3rUVU18W64c4okkxGOYnSLtW-aSyo47l3tos7u-8j0';

// â”€â”€ TRIGGER SETUP (execute uma Ãºnica vez) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// VERIFICAÃ‡ÃƒO AUTOMÃTICA DO BOLÃƒO (roda a cada 30 min)
// LÃª os resultados reais dos jogos, compara com os palpites
// e atualiza a aba Bolao com acertos/erros e % geral.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function verificarBolao() {
  var ss = SpreadsheetApp.openById(SHEET_ID);

  // â”€â”€ 1. Ler palpites do bolÃ£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  var bolaoSheet = ss.getSheetByName('Bolao');
  if (!bolaoSheet || bolaoSheet.getLastRow() <= 1) return; // sem dados

  // Garante cabeÃ§alhos com colunas extras
  var header = bolaoSheet.getRange(1, 1, 1, 6).getValues()[0];
  if (!header[3] || header[3] === '') {
    bolaoSheet.getRange(1, 4).setValue('Resultado');
    bolaoSheet.getRange(1, 5).setValue('Acerto');
    bolaoSheet.getRange(1, 6).setValue('% Acerto Geral');
  }

  var lastRow = bolaoSheet.getLastRow();
  // LÃª linhas de dados (a partir da linha 2)
  var bets = bolaoSheet.getRange(2, 1, lastRow - 1, 3).getValues();
  // bets[i] = [Nome, Time (palpite), Data]

  // â”€â”€ 2. Descobrir o campeÃ£o atual (Mata-Mata) â”€â”€â”€â”€â”€â”€â”€â”€â”€
  var campeao = getCampeaoAtual(ss);

  // â”€â”€ 3. Ler resultados da fase de grupos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Para pontuaÃ§Ã£o parcial: verificar se o time do palpite
  // ganhou jogos na fase de grupos (1 acerto por vitÃ³ria)
  var resultadosGrupos = getResultadosGrupos(ss);

  // â”€â”€ 4. Calcular acertos por palpite â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // Verificar se hÃ¡ campeÃ£o definido
    if (campeao) {
      var acertouCampeao = normalizar(timePalpite) === normalizar(campeao);
      resultados.push([
        acertouCampeao ? 'CampeÃ£o: ' + campeao : 'Eliminado',
        acertouCampeao ? 'SIM' : 'NÃƒO',
        ''  // % serÃ¡ calculado apÃ³s
      ]);
      if (acertouCampeao) totalAcertos++;
    } else {
      // Fase em andamento: verificar vitÃ³rias do time escolhido
      var vitorias = contarVitorias(timePalpite, resultadosGrupos);
      var totalJogos = resultadosGrupos.length;
      var status = 'Em andamento (' + vitorias + ' vitÃ³ria' + (vitorias !== 1 ? 's' : '') + ')';
      // "Acerto parcial" = time ganhou pelo menos 1 jogo
      var acertoParcial = vitorias > 0;
      resultados.push([status, acertoParcial ? 'PARCIAL' : 'AGUARDANDO', '']);
      if (acertoParcial) totalAcertos++;
    }
  });

  // â”€â”€ 5. Calcular % geral â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  var pctGeral = totalValidos > 0
    ? Math.round((totalAcertos / totalValidos) * 100)
    : 0;

  // â”€â”€ 6. Gravar resultados na aba Bolao â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  resultados.forEach(function(r, i) {
    var row = i + 2; // linha na planilha (dados comeÃ§am na linha 2)
    bolaoSheet.getRange(row, 4).setValue(r[0]); // Resultado
    bolaoSheet.getRange(row, 5).setValue(r[1]); // Acerto
    // % sÃ³ na primeira linha de dados para referÃªncia
    if (i === 0) {
      bolaoSheet.getRange(row, 6).setValue(pctGeral + '%');
    } else {
      bolaoSheet.getRange(row, 6).setValue('');
    }
  });

  // % geral no cabeÃ§alho da coluna F
  bolaoSheet.getRange(1, 6).setValue('% Acerto: ' + pctGeral + '%');

  // â”€â”€ 7. Salvar % na aba Config (para a TV exibir) â”€â”€â”€â”€â”€
  salvarConfigInterno(ss, {
    'BOLAO_PCT_ACERTO': pctGeral + '%',
    'BOLAO_ACERTOS': totalAcertos.toString(),
    'BOLAO_TOTAL': totalValidos.toString(),
    'BOLAO_CAMPEAO': campeao || '',
    'BOLAO_ATUALIZADO': Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')
  });

  Logger.log('BolÃ£o verificado: ' + totalAcertos + '/' + totalValidos + ' (' + pctGeral + '%)');
}

// â”€â”€ Retorna o campeÃ£o do mata-mata (se houver) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getCampeaoAtual(ss) {
  var sheet = ss.getSheetByName('Mata-Mata');
  if (!sheet || sheet.getLastRow() < 2) return null;

  var data = sheet.getDataRange().getValues();
  // Percorre todas as linhas procurando a final (Ãºltima linha com resultado)
  // Estrutura esperada: Time A | Placar A | Placar B | Time B | (opcional: Fase)
  var campeao = null;
  data.forEach(function(row) {
    var timeA = (row[0] || '').toString().trim();
    var placA = parseInt(row[1]) || 0;
    var placB = parseInt(row[2]) || 0;
    var timeB = (row[3] || '').toString().trim();
    var fase  = (row[4] || '').toString().toLowerCase();

    // Final identificada por "final" na coluna fase, ou Ãºltima linha com placar
    if ((fase.includes('final') || fase === 'f') && timeA && timeB && (placA > 0 || placB > 0)) {
      campeao = placA > placB ? timeA : (placB > placA ? timeB : null);
    }
  });

  // Se nÃ£o achou via coluna fase, pega a Ãºltima linha com dois times e placar diferente
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

// â”€â”€ LÃª resultados da fase de grupos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Retorna array de { timeA, placA, placB, timeB, vencedor }
function getResultadosGrupos(ss) {
  var sheet = ss.getSheetByName('Fase de Grupos');
  if (!sheet || sheet.getLastRow() < 2) return [];

  var data = sheet.getDataRange().getValues();
  var jogos = [];
  data.slice(1).forEach(function(row) { // pula cabeÃ§alho
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

// â”€â”€ Conta quantos jogos um time venceu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function contarVitorias(time, jogos) {
  var n = normalizar(time);
  return jogos.filter(function(j) {
    return j.vencedor && normalizar(j.vencedor) === n;
  }).length;
}

// â”€â”€ Normaliza string para comparaÃ§Ã£o (sem acento/maiÃºsculas) â”€
function normalizar(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[Ì€-Í¯]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

// â”€â”€ Grava chave-valor na aba Config (uso interno) â”€â”€â”€â”€â”€â”€â”€â”€
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// doPost â€” recebe requisiÃ§Ãµes do painel de controle
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var mode = body.mode || body.tipo || '';
    var ss   = SpreadsheetApp.openById(SHEET_ID);

    // â”€â”€ salvar_config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (mode === 'salvar_config') {
      salvarConfigInterno(ss, body.data || {});
      return jsonResponse({ ok: true, mode: 'salvar_config' });
    }

    // â”€â”€ adicionar_bolao â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (mode === 'adicionar_bolao') {
      // Verifica se o bolÃ£o do esporte estÃ¡ aberto
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
        return jsonResponse({ ok: false, erro: 'BolÃ£o ' + esporte + ' estÃ¡ fechado no momento.' });
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

    // â”€â”€ atualizarPlacarBasquete (modo existente) â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (mode === 'placar_basquete' || mode === 'atualizar_placar') {
      var sheet = ss.getSheetByName('Fase de Grupos');
      if (!sheet) return jsonResponse({ ok: false, erro: 'Aba Fase de Grupos nÃ£o encontrada' });

      var linha = parseInt(body.linha);
      if (isNaN(linha) || linha < 2) return jsonResponse({ ok: false, erro: 'Linha invÃ¡lida' });

      if (body.timeA) sheet.getRange(linha, 1).setValue(body.timeA);
      if (body.placA !== undefined) sheet.getRange(linha, 2).setValue(body.placA);
      if (body.placB !== undefined) sheet.getRange(linha, 3).setValue(body.placB);
      if (body.timeB) sheet.getRange(linha, 4).setValue(body.timeB);

      // ApÃ³s atualizar placar, roda verificaÃ§Ã£o do bolÃ£o imediatamente
      verificarBolao();

      return jsonResponse({ ok: true, mode: 'placar_basquete', linha: linha });
    }

    // â”€â”€ adicionar linha (modo existente) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (mode === 'adicionar_linha') {
      var sheetName = body.aba || 'Fase de Grupos';
      var s = ss.getSheetByName(sheetName);
      if (!s) return jsonResponse({ ok: false, erro: 'Aba nÃ£o encontrada: ' + sheetName });
      s.appendRow(body.dados || []);
      return jsonResponse({ ok: true, mode: 'adicionar_linha' });
    }

    // â”€â”€ substituir linha (modo existente) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (mode === 'substituir_linha') {
      var sheetName2 = body.aba || 'Fase de Grupos';
      var s2 = ss.getSheetByName(sheetName2);
      if (!s2) return jsonResponse({ ok: false, erro: 'Aba nÃ£o encontrada: ' + sheetName2 });
      var ln = parseInt(body.linha);
      var dados = body.dados || [];
      if (!isNaN(ln) && ln >= 1 && dados.length > 0) {
        s2.getRange(ln, 1, 1, dados.length).setValues([dados]);
      }
      return jsonResponse({ ok: true, mode: 'substituir_linha' });
    }

    // â”€â”€ votar_atleta â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (mode === 'votar_atleta') {
      var nomeAtleta = (body.atleta || '').toString().trim();
      var timeAtleta = (body.time || '').toString().trim();
      if (!nomeAtleta) return jsonResponse({ ok: false, erro: 'Nome do atleta obrigatorio' });

      var ssVotos = SpreadsheetApp.openById('1VS2RWX50aGYquB_AE-X9HQCcTvHsOEJwPcFAJjvD99c');
      var votos = ssVotos.getSheets()[0];
      if (votos.getLastRow() === 0) {
        votos.appendRow(['Data-Hora', 'Atleta', 'Time']);
      }
      var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
      votos.appendRow([agora, nomeAtleta, timeAtleta]);
      return jsonResponse({ ok: true, mode: 'votar_atleta' });
    }

    // -- ranking_atleta (GET-like via POST) ------------
if (mode === 'ranking_atleta') {
      var ssVotos2 = SpreadsheetApp.openById('1VS2RWX50aGYquB_AE-X9HQCcTvHsOEJwPcFAJjvD99c');
      var votosSheet = ssVotos2.getSheets()[0];
      if (!votosSheet || votosSheet.getLastRow() <= 1) return jsonResponse({ ok: true, ranking: [] });
      var rows = votosSheet.getDataRange().getValues().slice(1);
      var contagem = {};
      rows.forEach(function(r) {
        var key = (r[1] || '').toString().trim();
        if (!key) return;
        if (!contagem[key]) contagem[key] = { atleta: key, time: (r[2]||'').toString().trim(), votos: 0 };
        contagem[key].votos++;
      });
      var ranking = Object.values(contagem).sort(function(a,b){ return b.votos - a.votos; }).slice(0, 10);
      return jsonResponse({ ok: true, ranking: ranking });
    }

    return jsonResponse({ ok: false, erro: 'modo desconhecido: ' + mode });

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, erro: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// â”€â”€ doGet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function doGet(e) {
  return ContentService
    .createTextOutput('Supercopa Basquete Apps Script v6 OK')
    .setMimeType(ContentService.MimeType.TEXT);
}

// â”€â”€ Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
