// ============================================================
// SUPERCOPA AFC 2026 — Apps Script da Planilha PALPITES
// ID: 13tlftQg-pxNUaaFq0Q4xoNi9HmeTtROesg7asZoLz7A
// ============================================================

const ABA_PALPITES  = 'PALPITES';
const ABA_DETALHE   = 'PALPITES_DETALHE';
const ABA_CAMPEAO   = 'CAMPEAO';
const ABA_QUIZ      = 'QUIZ';
const ABA_CONFIGS   = 'CONFIGS';
const ABA_PUSH      = 'PUSH_SUBS';
const ABA_INSTALL   = 'INSTALACOES';

// ── doPost ──────────────────────────────────────────────────
function doPost(e) {
  try {
    const ss   = SpreadsheetApp.getActiveSpreadsheet();
    const data = JSON.parse(e.postData.contents);

    // PUSH — salvar subscrição
    if (data.tipo === 'push_subscribe') {
      return okJson(savePushSubscription(data.subscription));
    }

    // PUSH — remover subscrição
    if (data.tipo === 'push_unsubscribe') {
      return okJson(removePushSubscription(data.endpoint));
    }

    // PUSH — limpar todas
    if (data.tipo === 'push_limpar') {
      const sheet = ss.getSheetByName(ABA_PUSH);
      if (sheet) sheet.clearContents();
      return okJson({ ok: true });
    }

    // QUIZ
    if (!data.tipo) {
      const sh = getOrCreate(ss, ABA_QUIZ,
        ['Data/Hora','Nome','WhatsApp','Acertos','Total','% Acerto','Tempo(s)']);
      sh.appendRow([now(), data.nome, data.fone||'—',
        data.acertos, data.total, data.percentual+'%', data.tempo_segundos||'—']);
      return ok();
    }

    // BOLÃO SÁBADO (Vôlei) e BOLÃO BASQUETE — mesma lógica
    if (data.tipo === 'bolao_sabado' || data.tipo === 'bolao_basquete') {
      // Detecta esporte
      let esporte = data.esporte || '';
      if (!esporte) {
        if (data.tipo === 'bolao_basquete') {
          esporte = 'Basquete';
        } else if (data.detalhe) {
          try {
            const det = JSON.parse(data.detalhe);
            esporte = Array.isArray(det) && det.length <= 6 ? 'Basquete' : 'Volei';
          } catch(e) { esporte = 'Volei'; }
        } else {
          esporte = 'Volei';
        }
      }

      const sh = getOrCreate(ss, ABA_PALPITES,
        ['timestamp','PALPITE','NOME','WHATSAPP','% ACERTO','ESPORTE']);
      sh.appendRow([now(), data.palpite, data.nome, data.fone||'—', '', esporte]);

      const shD = getOrCreate(ss, ABA_DETALHE,
        ['timestamp','Nome','WhatsApp','DetalheJSON','Esporte']);
      shD.appendRow([now(), data.nome, data.fone||'—', data.detalhe||'', esporte]);

      return ok();
    }

    // BOLÃO CAMPEÃO
    if (data.tipo === 'bolao_campeao') {
      const sh = getOrCreate(ss, ABA_CAMPEAO,
        ['Data/Hora','Nome','WhatsApp','Palpite Campeão','Acertou?']);
      sh.appendRow([now(), data.nome, data.fone||'—',
        data.palpite.replace('Campeão: ',''), '']);
      return ok();
    }

    // ATUALIZAR PORCENTAGENS
    if (data.tipo === 'atualizar_porcentagens') {
      atualizarPct(ss, data.vencedores || {});
      return ok();
    }

    // SALVAR JOGOS BLOQUEADOS/ABERTOS
    if (data.tipo === 'blocked_games') {
      return okJson(salvarBlockedGames(data.blocked || {}));
    }

    // REINICIAR PALPITE
    if (data.tipo === 'reiniciar_palpite') {
      return okJson(excluirPalpite(ss, data.nome));
    }

    // APP INSTALADO (PWA) — registra 1x por dispositivo
    if (data.tipo === 'app_install') {
      return okJson(registrarInstalacao(ss, data.deviceId || ''));
    }

    return ok();
  } catch(ex) { return ok(); }
}

// ── doGet ───────────────────────────────────────────────────
function doGet(e) {
  try {
    const action = e.parameter.action || 'ranking_sabado';
    const sport  = (e.parameter.sport || 'volei').toString().toLowerCase();
    const ss     = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'ranking_sabado') {
      const shD = ss.getSheetByName(ABA_DETALHE);
      if (!shD || shD.getLastRow() < 2) {
        const total = sport === 'basquete' ? 6 : 12;
        return okJson({ ranking: [], jogosComResultado: 0, totalJogos: total });
      }

      const rows = shD.getDataRange().getValues().slice(1);
      const porFone = {};

      rows.forEach(r => {
        const fone = r[2].toString().trim();
        if (!fone) return;

        // Detecta esporte: coluna 4 (índice 4) tem esporte se adicionado após atualização
        let esporteRow = (r[4] || '').toString().trim().toLowerCase();
        if (!esporteRow) {
          // fallback pela quantidade de palpites no JSON
          try {
            const det = JSON.parse(r[3] || '[]');
            esporteRow = Array.isArray(det) && det.length <= 6 ? 'basquete' : 'volei';
          } catch(ex) { esporteRow = 'volei'; }
        }

        if (esporteRow !== sport) return;
        porFone[fone] = r; // sempre sobrescreve: mantém a submissão mais recente
      });

      // Fallback: incluir pessoas que estão no PALPITES mas não no PALPITES_DETALHE
      const shP = ss.getSheetByName(ABA_PALPITES);
      if (shP && shP.getLastRow() >= 2) {
        const rowsP = shP.getDataRange().getValues().slice(1);
        rowsP.forEach(rp => {
          const fone = (rp[3]||'').toString().trim();
          if (!fone || porFone[fone]) return;
          let esp = (rp[5]||'').toString().trim().toLowerCase();
          if (!esp) esp = 'volei';
          if (esp !== sport) return;
          let pctPre = parseFloat((rp[4]||'0').toString().replace('%','').replace(',','.')) || 0;
          if (pctPre > 0 && pctPre <= 1) pctPre = Math.round(pctPre * 10000) / 100;
          // Parsear texto "Jogo1(GA): EQUIPE | Jogo2(GA): EQUIPE | ..." em detalheJSON
          const palpiteText = (rp[1]||'').toString();
          const detalhe = [];
          palpiteText.split('|').forEach(part => {
            const m = part.trim().match(/Jogo(\d+)\(G([A-Z])\):\s*(.+)/);
            if (m) detalhe.push({jogo: parseInt(m[1]), grupo: m[2], vencedor: m[3].trim()});
          });
          porFone[fone] = {_fb: true, nome: (rp[2]||'').toString().trim(), fone, pctPre, detalhe: JSON.stringify(detalhe)};
        });
      }

      const totalJogos = sport === 'basquete' ? 6 : 12;
      const ranking = Object.values(porFone).map(r => {
        if (r._fb) return {nome: r.nome, fone: r.fone, detalheJSON: r.detalhe || '[]', acertos: 0, pct: null, pctPre: r.pctPre};
        return {
          nome:        r[1].toString().trim(),
          fone:        r[2].toString().trim(),
          detalheJSON: r[3].toString().trim(),
          acertos:     0,
          pct:         null
        };
      });

      return okJson({ ranking, jogosComResultado: 0, totalJogos });
    }

    if (action === 'ranking_campeao') {
      const sh = ss.getSheetByName(ABA_CAMPEAO);
      if (!sh || sh.getLastRow() < 2) return okJson({ ranking: [], campeaoReal: null });
      const rows = sh.getDataRange().getValues().slice(1);
      const porFone = {};
      rows.forEach(r => { const f = r[2].toString().trim(); if(!porFone[f]) porFone[f]=r; });
      const ranking = Object.values(porFone).map(r => ({
        nome: r[1].toString().trim(),
        fone: r[2].toString().trim(),
        palpite: r[3].toString().trim(),
        acertou: r[4].toString().trim() === 'SIM'
      }));
      ranking.sort((a,b) => (b.acertou?1:0)-(a.acertou?1:0));
      return okJson({ ranking, campeaoReal: null });
    }

    if (action === 'ranking_quiz') {
      const sh = ss.getSheetByName(ABA_QUIZ);
      if (!sh || sh.getLastRow() < 2) return okJson({ ranking: [] });
      const rows = sh.getDataRange().getValues().slice(1);
      const porFone = {};
      rows.forEach(r => {
        const fone = r[2].toString().trim();
        if (!fone) return;
        const pct = parseFloat((r[5]||'0').toString().replace('%','')) || 0;
        const pctEx = parseFloat((porFone[fone]?.[5]||'0').toString().replace('%','')) || 0;
        if (!porFone[fone] || pct > pctEx) porFone[fone] = r;
      });
      const ranking = Object.values(porFone).map(r => {
        let pctNum = parseFloat((r[5]||'0').toString().replace('%','').replace(',','.')) || 0;
        if (pctNum > 0 && pctNum <= 1) pctNum = Math.round(pctNum * 10000) / 100;
        return {
          nome:    r[1].toString().trim(),
          fone:    r[2].toString().trim(),
          acertos: parseInt(r[3]||0),
          total:   parseInt(r[4]||0),
          pct:     pctNum.toFixed(2),
          tempo:   r[6].toString().trim()
        };
      });
      ranking.sort((a,b) => (parseFloat(b.pct)||0)-(parseFloat(a.pct)||0) || (parseFloat(a.tempo)||999)-(parseFloat(b.tempo)||999));
      return okJson({ ranking });
    }

    if (action === 'blocked_games') {
      return okJson(getBlockedGames());
    }

    if (action === 'push_subscriptions') {
      return okJson(getPushSubscriptions());
    }

    if (action === 'count_installs') {
      return okJson(contarInstalacoes(ss));
    }

    return okJson({ erro: 'ação inválida' });
  } catch(ex) { return okJson({ erro: ex.message }); }
}


// ============================================================
//  PUSH SUBSCRIPTIONS
// ============================================================

function getPushSubscriptions() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(ABA_PUSH);
    if (!sheet || sheet.getLastRow() < 1) return { subscriptions: [] };
    const rows = sheet.getDataRange().getValues();
    const subs = rows.map(r => {
      try { return JSON.parse(r[0]); } catch { return null; }
    }).filter(s => s && s.endpoint);
    return { subscriptions: subs };
  } catch(e) {
    return { subscriptions: [] };
  }
}

function savePushSubscription(subJson) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let sheet   = ss.getSheetByName(ABA_PUSH);
    if (!sheet) sheet = ss.insertSheet(ABA_PUSH);
    const sub = JSON.parse(subJson);
    if (sheet.getLastRow() > 0) {
      const rows = sheet.getDataRange().getValues();
      const jaExiste = rows.some(r => {
        try { return JSON.parse(r[0]).endpoint === sub.endpoint; } catch { return false; }
      });
      if (jaExiste) return { ok: true };
    }
    sheet.appendRow([subJson]);
    return { ok: true };
  } catch(e) {
    return { ok: false, erro: e.message };
  }
}

function removePushSubscription(endpoint) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(ABA_PUSH);
    if (!sheet || sheet.getLastRow() < 1) return { ok: true };
    const rows = sheet.getDataRange().getValues();
    for (let i = rows.length - 1; i >= 0; i--) {
      try {
        if (JSON.parse(rows[i][0]).endpoint === endpoint)
          sheet.deleteRow(i + 1);
      } catch {}
    }
    return { ok: true };
  } catch(e) {
    return { ok: false, erro: e.message };
  }
}


// ============================================================
//  INSTALAÇÕES DO APP (PWA)
// ============================================================

function registrarInstalacao(ss, deviceId) {
  if (!deviceId) return { ok: false, erro: 'deviceId ausente' };
  const sheet = getOrCreate(ss, ABA_INSTALL, ['DeviceId', 'Primeira vez', 'Última vez', 'Plataforma']);
  const dados = sheet.getDataRange().getValues();
  const agora = new Date().toLocaleString('pt-BR');

  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] === deviceId) {
      sheet.getRange(i + 1, 3).setValue(agora); // só atualiza "última vez"
      return { ok: true, novo: false };
    }
  }
  sheet.appendRow([deviceId, agora, agora, '']);
  return { ok: true, novo: true };
}

function contarInstalacoes(ss) {
  const sheet = ss.getSheetByName(ABA_INSTALL);
  if (!sheet || sheet.getLastRow() < 2) return { total: 0 };
  return { total: sheet.getLastRow() - 1 };
}


// ============================================================
//  BLOCKED GAMES
// ============================================================

function salvarBlockedGames(blocked) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreate(ss, ABA_CONFIGS, ['chave', 'valor', 'atualizado']);
  const dados = sheet.getDataRange().getValues();
  const json  = JSON.stringify(blocked);
  const agora = new Date().toLocaleString('pt-BR');

  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] === 'blocked_games') {
      sheet.getRange(i + 1, 2).setValue(json);
      sheet.getRange(i + 1, 3).setValue(agora);
      return { ok: true, blocked };
    }
  }
  sheet.appendRow(['blocked_games', json, agora]);
  return { ok: true, blocked };
}

function getBlockedGames() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ABA_CONFIGS);
  if (!sheet) return { blocked: {} };
  const dados = sheet.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] === 'blocked_games') {
      try { return { blocked: JSON.parse(dados[i][1] || '{}') }; } catch { return { blocked: {} }; }
    }
  }
  return { blocked: {} };
}


// ============================================================
//  REINICIAR PALPITE
// ============================================================

function excluirPalpite(ss, nomeBusca) {
  if (!nomeBusca || nomeBusca.trim() === '') return { ok: false, erro: 'Nome não informado' };

  const nomeLimpo = nomeBusca.trim().toLowerCase();
  let totalExcluidos = 0;
  const abas = [
    { nome: ABA_PALPITES, colunaNome: 2 },
    { nome: ABA_DETALHE,  colunaNome: 1 },
    { nome: ABA_CAMPEAO,  colunaNome: 1 }
  ];

  abas.forEach(function(aba) {
    const sheet = ss.getSheetByName(aba.nome);
    if (!sheet || sheet.getLastRow() < 2) return;
    const dados = sheet.getDataRange().getValues();
    for (let i = dados.length - 1; i >= 1; i--) {
      const nomeNaPlanilha = String(dados[i][aba.colunaNome] || '').trim().toLowerCase();
      if (nomeNaPlanilha === nomeLimpo) { sheet.deleteRow(i + 1); totalExcluidos++; }
    }
  });

  return {
    ok: true,
    mensagem: totalExcluidos > 0
      ? '✅ ' + totalExcluidos + ' registro(s) de "' + nomeBusca + '" excluído(s)'
      : '⚠️ Nenhum palpite encontrado para "' + nomeBusca + '"',
    totalExcluidos
  };
}


// ============================================================
//  PORCENTAGENS
// ============================================================

function atualizarPct(ss, vencedores) {
  const shPalp = ss.getSheetByName(ABA_PALPITES);
  const shDet  = ss.getSheetByName(ABA_DETALHE);
  if (!shPalp || !shDet || shPalp.getLastRow() < 2) return;

  const porFone = {};
  if (shDet.getLastRow() > 1) {
    shDet.getDataRange().getValues().slice(1).forEach(r => {
      const fone = r[2].toString().trim();
      if (!porFone[fone]) {
        try { porFone[fone] = JSON.parse(r[3]); } catch(e) { porFone[fone] = []; }
      }
    });
  }

  if (Object.keys(vencedores).length === 0) return;

  const rows = shPalp.getDataRange().getValues();
  rows.slice(1).forEach((r, i) => {
    const fone = r[3].toString().trim();
    const pals = porFone[fone] || [];
    let acertos = 0;
    pals.forEach(p => {
      if (vencedores[p.jogo] && vencedores[p.jogo] === p.vencedor) acertos++;
    });
    const totalJogos = pals.length <= 6 ? 6 : 12;
    const pct = (acertos / totalJogos * 100).toFixed(2) + '%';
    shPalp.getRange(i + 2, 5).setValue(pct);
  });
}


// ============================================================
//  AUTO-VERIFICAÇÃO · gatilho a cada 1 minuto
// ============================================================

const VOLEI_SHEET_ID_V = "12-yxLsIplLMAj0Y9jCpzl2OGJLKPhy_lWAtvYP-Vvh8";
const BASQ_SHEET_ID_V  = "1S3rUVU18W64c4okkxGOYnSLtW-aSyo47l3tos7u-8j0";
const API_KEY_V        = "AIzaSyBzIsc4TKy_he2P8PcOgOzs8Eor3EVHBzw";

function lerAba_(sheetId, range) {
  const url = "https://sheets.googleapis.com/v4/spreadsheets/"
    + sheetId + "/values/" + encodeURIComponent(range)
    + "?key=" + API_KEY_V;
  const res  = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const json = JSON.parse(res.getContentText());
  return json.values || [];
}

function buscarVencedoresVolei_() {
  const data = lerAba_(VOLEI_SHEET_ID_V, "'Fase de Grupos'!A1:O49");
  const venc = {};
  let num = 1;
  [[10,11,12],[22,23,24],[34,35,36],[46,47,48]].forEach(function(rows) {
    rows.forEach(function(r) {
      const v = ((data[r] || [])[14] || "").toString().trim();
      if (v && v !== "A DEFINIR" && v !== "—") venc[num] = v;
      num++;
    });
  });
  return venc;
}

function buscarVencedoresBasquete_() {
  const data = lerAba_(BASQ_SHEET_ID_V, "'Fase de Grupos'!A1:S15");
  const venc = {};
  let num = 1;
  [4,5,6].forEach(function(r) {
    const v = ((data[r] || [])[8] || "").toString().trim();
    if (v && v !== "—") venc[num] = v;
    num++;
  });
  [4,5,6].forEach(function(r) {
    const v = ((data[r] || [])[18] || "").toString().trim();
    if (v && v !== "—") venc[num] = v;
    num++;
  });
  return venc;
}

function parsearPalpiteTexto_(texto) {
  const resultado = {};
  if (!texto) return resultado;
  texto.split("|").forEach(function(parte) {
    const match = parte.trim().match(/Jogo(\d+)\([^)]+\):\s*(.+)/i);
    if (match) resultado[parseInt(match[1])] = match[2].trim();
  });
  return resultado;
}

function verificarEAtualizarPorcentagens() {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const shPalp  = ss.getSheetByName(ABA_PALPITES);
  const shDet   = ss.getSheetByName(ABA_DETALHE);
  if (!shPalp || shPalp.getLastRow() < 2) return;

  var vencVolei = {};
  var vencBasq  = {};
  try { vencVolei = buscarVencedoresVolei_();   } catch(e) { Logger.log("Erro vôlei: " + e);    }
  try { vencBasq  = buscarVencedoresBasquete_(); } catch(e) { Logger.log("Erro basquete: " + e); }

  const temVolei = Object.keys(vencVolei).length > 0;
  const temBasq  = Object.keys(vencBasq).length  > 0;
  if (!temVolei && !temBasq) { Logger.log("Nenhum resultado ainda."); return; }

  const porFoneDetalhe = {};
  if (shDet && shDet.getLastRow() > 1) {
    shDet.getDataRange().getValues().slice(1).forEach(function(r) {
      const fone = r[2].toString().trim();
      if (!porFoneDetalhe[fone]) {
        try { porFoneDetalhe[fone] = JSON.parse(r[3]); } catch(e) { porFoneDetalhe[fone] = []; }
      }
    });
  }

  const rows = shPalp.getDataRange().getValues();
  rows.slice(1).forEach(function(row, i) {
    const textoPalpite = (row[1] || "").toString();
    const fone         = (row[3] || "").toString().trim();
    const esporteLinha = (row[5] || "").toString().trim().toLowerCase();
    if (!textoPalpite) return;

    var palpitesArr = porFoneDetalhe[fone] || [];
    if (palpitesArr.length === 0) {
      const parsed = parsearPalpiteTexto_(textoPalpite);
      palpitesArr = Object.keys(parsed).map(function(j) {
        return { jogo: parseInt(j), vencedor: parsed[j] };
      });
    }
    if (palpitesArr.length === 0) return;

    const ehBasquete = esporteLinha === 'basquete' ||
      (esporteLinha !== 'volei' && palpitesArr.length <= 6);

    if (!esporteLinha) {
      shPalp.getRange(i + 2, 6).setValue(ehBasquete ? 'Basquete' : 'Volei');
    }

    const totalJogos = ehBasquete ? 6 : 12;
    const vencedores = ehBasquete ? vencBasq : vencVolei;
    if (Object.keys(vencedores).length === 0) return;

    var acertos = 0;
    palpitesArr.forEach(function(p) {
      const vReal = vencedores[p.jogo] || "";
      if (vReal && vReal.toLowerCase() === (p.vencedor || "").toLowerCase()) acertos++;
    });

    shPalp.getRange(i + 2, 5).setValue((acertos / totalJogos * 100).toFixed(2) + "%");
  });

  Logger.log("✅ Porcentagens atualizadas: " + new Date().toLocaleString("pt-BR"));
}

function criarGatilho() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "verificarEAtualizarPorcentagens") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("verificarEAtualizarPorcentagens")
    .timeBased().everyMinutes(1).create();
  Logger.log("✅ Gatilho criado!");
}


// ============================================================
//  HELPERS
// ============================================================

function getOrCreate(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.getRange(1,1,1,headers.length)
      .setFontWeight('bold')
      .setBackground('#0E3B78')
      .setFontColor('#ffffff');
  }
  return sh;
}

function now() { return new Date().toLocaleString('pt-BR'); }

function ok() {
  return ContentService
    .createTextOutput(JSON.stringify({status:'ok'}))
    .setMimeType(ContentService.MimeType.JSON);
}

function okJson(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}