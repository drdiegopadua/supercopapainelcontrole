// ════════════════════════════════════════════════════════
// APPS SCRIPT — BASQUETE (SUPERCOPA)
// Cole este código no editor do Google Apps Script vinculado
// à planilha ID: 1S3rUVU18W64c4okkxGOYnSLtW-aSyo47l3tos7u-8j0
//
// IMPORTANTE: mantenha todo o código existente do doPost e
// adicione os novos blocos dentro do mesmo doPost, antes do
// return ContentService...
// ════════════════════════════════════════════════════════

var SHEET_ID = '1S3rUVU18W64c4okkxGOYnSLtW-aSyo47l3tos7u-8j0';

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var mode = body.mode || body.tipo || '';
    var ss   = SpreadsheetApp.openById(SHEET_ID);

    // ── MODO: salvar_config ─────────────────────────────
    // Recebe: { mode: 'salvar_config', data: { CHAVE: 'valor', ... } }
    // Grava na aba 'Config' como pares chave-valor (A=chave, B=valor)
    if (mode === 'salvar_config') {
      var cfg = ss.getSheetByName('Config');
      if (!cfg) cfg = ss.insertSheet('Config');

      var kvMap = body.data || {};
      Object.keys(kvMap).forEach(function(key) {
        var val    = kvMap[key];
        var values = cfg.getDataRange().getValues();
        var found  = false;
        for (var i = 0; i < values.length; i++) {
          if (values[i][0] && values[i][0].toString().trim() === key) {
            cfg.getRange(i + 1, 2).setValue(val);
            found = true;
            break;
          }
        }
        if (!found) {
          cfg.appendRow([key, val]);
        }
      });

      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, mode: 'salvar_config' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── MODO: adicionar_bolao ───────────────────────────
    // Recebe: { mode: 'adicionar_bolao', nome: '...', time: '...' }
    // Adiciona uma linha na aba 'Bolao' com cabeçalho Nome/Time/Data
    if (mode === 'adicionar_bolao') {
      var bolao = ss.getSheetByName('Bolao');
      if (!bolao) {
        bolao = ss.insertSheet('Bolao');
        bolao.appendRow(['Nome', 'Time', 'Data']);
      } else if (bolao.getLastRow() === 0) {
        bolao.appendRow(['Nome', 'Time', 'Data']);
      }
      bolao.appendRow([body.nome || '', body.time || '', new Date()]);

      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, mode: 'adicionar_bolao' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── MODOS EXISTENTES (placar basquete, etc.) ────────
    // Mantenha aqui todo o código existente do seu doPost
    // para os outros modos (placar_basquete, placar_handebol, etc.)
    // Exemplo:
    //
    // if (mode === 'placar_basquete') { ... }
    // if (mode === 'placar_handebol') { ... }
    //
    // (cole o código existente do seu doPost abaixo desta linha)

    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, erro: 'modo desconhecido: ' + mode }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, erro: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── doGet (leitura — mantido para compatibilidade) ──────
function doGet(e) {
  return ContentService
    .createTextOutput('Supercopa Basquete Apps Script OK')
    .setMimeType(ContentService.MimeType.TEXT);
}
