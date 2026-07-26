// ============================================================
// SUPERCOPA AFC 2026 — Apps Script da Planilha PALPITES
// ID: 13tlftQg-pxNUaaFq0Q4xoNi9HmeTtROesg7asZoLz7A
//
// Bolão removido — nao usamos mais essa funcionalidade. Este
// script agora cuida so de: Quiz, Push (notificacoes) e
// Instalacoes do PWA.
// ============================================================

const ABA_QUIZ      = 'QUIZ';
const ABA_PUSH      = 'PUSH_SUBS';
const ABA_INSTALL   = 'INSTALACOES';
const ABA_ACESSOS   = 'ACESSOS';

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
    if (data.tipo === 'quiz' || !data.tipo) {
      const sh = getOrCreate(ss, ABA_QUIZ,
        ['Data/Hora','Nome','WhatsApp','Acertos','Total','% Acerto','Tempo(s)']);
      sh.appendRow([now(), data.nome, data.fone||'—',
        data.acertos, data.total, (data.pct||data.percentual)+'%', data.tempo||data.tempo_segundos||'—']);
      return ok();
    }

    // APP INSTALADO (PWA) — registra 1x por dispositivo
    if (data.tipo === 'app_install') {
      return okJson(registrarInstalacao(ss, data.deviceId || ''));
    }

    // ACESSO AO APP — registra visita (1x por sessão, controlado no cliente)
    if (data.tipo === 'app_acesso') {
      return okJson(registrarAcesso(ss, data.deviceId || ''));
    }

    return ok();
  } catch(ex) { return ok(); }
}

// ── doGet ───────────────────────────────────────────────────
function doGet(e) {
  try {
    const action = e.parameter.action || '';
    const ss     = SpreadsheetApp.getActiveSpreadsheet();

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

    if (action === 'push_subscriptions') {
      return okJson(getPushSubscriptions());
    }

    if (action === 'count_installs') {
      return okJson(contarInstalacoes(ss));
    }

    if (action === 'count_acessos') {
      return okJson(contarAcessos(ss));
    }

    if (action === 'listar_edicoes') {
      return okJson(listarEdicoesArquivadas());
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

// ============================================================
//  ACESSOS AO APP (visitas)
// ============================================================

function registrarAcesso(ss, deviceId) {
  if (!deviceId) return { ok: false, erro: 'deviceId ausente' };
  const sheet = getOrCreate(ss, ABA_ACESSOS, ['DeviceId', 'Primeira visita', 'Última visita', 'Visitas']);
  const dados = sheet.getDataRange().getValues();
  const agora = new Date().toLocaleString('pt-BR');

  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] === deviceId) {
      sheet.getRange(i + 1, 3).setValue(agora);
      sheet.getRange(i + 1, 4).setValue((parseInt(dados[i][3]) || 0) + 1);
      return { ok: true, novo: false };
    }
  }
  sheet.appendRow([deviceId, agora, agora, 1]);
  return { ok: true, novo: true };
}

function contarAcessos(ss) {
  const sheet = ss.getSheetByName(ABA_ACESSOS);
  if (!sheet || sheet.getLastRow() < 2) return { unicos: 0, total: 0 };
  const dados = sheet.getDataRange().getValues().slice(1);
  let total = 0;
  dados.forEach(r => { total += parseInt(r[3]) || 0; });
  return { unicos: dados.length, total: total };
}

function contarInstalacoes(ss) {
  const sheet = ss.getSheetByName(ABA_INSTALL);
  if (!sheet || sheet.getLastRow() < 2) return { total: 0 };
  return { total: sheet.getLastRow() - 1 };
}


// ============================================================
//  ARQUIVAMENTO POR EDIÇÃO
// ============================================================
// Renomeia as abas atuais de INSTALACOES/ACESSOS/QUIZ para um nome
// de arquivo (ex: "INSTALACOES_BASQUETE_2026"), preservando todos os
// dados. As abas originais (INSTALACOES/ACESSOS/QUIZ) são recriadas
// vazias, para a nova edição contar do zero. Rode isso manualmente
// quando uma edição terminar e a próxima for começar.
//
// Uso: mude NOME_EDICAO_ATUAL abaixo para o nome da edição que está
// TERMINANDO (ex: 'BASQUETE_2026'), rode arquivarEdicaoAtual() uma
// vez, e pronto — os contadores voltam a zero para a próxima edição.

function arquivarEdicaoAtual() {
  const NOME_EDICAO_ATUAL = 'BASQUETE_2026'; // <<< ajuste antes de rodar

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  [ABA_INSTALL, ABA_ACESSOS, ABA_QUIZ].forEach(nomeAba => {
    const sheet = ss.getSheetByName(nomeAba);
    if (!sheet) return; // nada a arquivar
    const novoNome = nomeAba + '_' + NOME_EDICAO_ATUAL;
    if (ss.getSheetByName(novoNome)) {
      Logger.log('Já existe uma aba chamada ' + novoNome + ' — pulando ' + nomeAba + '.');
      return;
    }
    sheet.setName(novoNome);
    Logger.log('Arquivado: ' + nomeAba + ' → ' + novoNome);
  });

  Logger.log('Arquivamento concluído. As próximas instalações/acessos/quiz vão criar abas novas (' +
    ABA_INSTALL + ', ' + ABA_ACESSOS + ', ' + ABA_QUIZ + ') automaticamente.');
}

// Lista todas as edições arquivadas + os dados atuais (edição em
// andamento). Usado pelo Painel Admin na página "Edições".
function listarEdicoesArquivadas() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets().map(s => s.getName());

    // Descobre os sufixos de edição a partir das abas arquivadas
    // (ex: "INSTALACOES_BASQUETE_2026" -> "BASQUETE_2026")
    const edicoes = new Set();
    sheets.forEach(nome => {
      [ABA_INSTALL, ABA_ACESSOS, ABA_QUIZ].forEach(base => {
        if (nome.indexOf(base + '_') === 0) edicoes.add(nome.slice(base.length + 1));
      });
    });

    const contarSheet = (nome) => {
      const sh = ss.getSheetByName(nome);
      if (!sh || sh.getLastRow() < 2) return 0;
      return sh.getLastRow() - 1;
    };
    const somarAcessos = (nome) => {
      const sh = ss.getSheetByName(nome);
      if (!sh || sh.getLastRow() < 2) return 0;
      const rows = sh.getDataRange().getValues().slice(1);
      let total = 0;
      rows.forEach(r => { total += parseInt(r[3]) || 0; });
      return total;
    };

    const resultado = [];
    edicoes.forEach(ed => {
      resultado.push({
        edicao: ed,
        instalacoes: contarSheet(ABA_INSTALL + '_' + ed),
        acessosUnicos: contarSheet(ABA_ACESSOS + '_' + ed),
        acessosTotais: somarAcessos(ABA_ACESSOS + '_' + ed),
        quizRespostas: contarSheet(ABA_QUIZ + '_' + ed)
      });
    });

    // Edição atual (em andamento, abas sem sufixo)
    resultado.push({
      edicao: 'ATUAL',
      instalacoes: contarSheet(ABA_INSTALL),
      acessosUnicos: contarSheet(ABA_ACESSOS),
      acessosTotais: somarAcessos(ABA_ACESSOS),
      quizRespostas: contarSheet(ABA_QUIZ)
    });

    return { ok: true, edicoes: resultado };
  } catch (ex) {
    return { ok: false, erro: ex.message };
  }
}

// ============================================================
//  LIMPEZA — execute 1x para remover o gatilho antigo do bolão
// ============================================================

function removerGatilhosAntigos() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'verificarEAtualizarPorcentagens') {
      ScriptApp.deleteTrigger(t);
    }
  });
  Logger.log('Gatilhos antigos removidos.');
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
