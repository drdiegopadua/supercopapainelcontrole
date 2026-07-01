// ════════════════════════════════════════════════════════
// APPS SCRIPT — DESTAQUE DA GALERA (votação de atletas)
//
// SETUP (faça UMA VEZ):
//   1. Crie uma planilha nova no Google Sheets, com o nome que
//      quiser (ex: "SUPERCOPA - GALERA").
//   2. Copie o ID dela na barra de endereço:
//      https://docs.google.com/spreadsheets/d/ESSE_PEDACO_AQUI/edit
//   3. Nessa planilha: Extensões → Apps Script
//   4. Apague o código padrão e cole este arquivo inteiro
//   5. Substitua o valor de SHEET_ID abaixo pelo ID que você copiou
//   6. Salve (Ctrl+S)
//   7. Implantar → Nova implantação → tipo "Aplicativo da Web"
//      - Executar como: Eu (seu e-mail)
//      - Quem pode acessar: Qualquer pessoa
//      → Implantar → autorize as permissões quando pedir
//   8. Copie a URL do aplicativo da web gerada (termina em /exec)
//   9. No supercopa-app/index.html, troque o valor de GALERA_URL
//      por essa URL nova (ela está em pelo menos 2 lugares:
//      const GALERA_URL='...' e dentro de _submitVotoGalera)
// ════════════════════════════════════════════════════════

var SHEET_ID = 'COLE_AQUI_O_ID_DA_SUA_PLANILHA';
var ABA_VOTOS = 'Votos';

function getSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(ABA_VOTOS);
  if (!sheet) {
    sheet = ss.insertSheet(ABA_VOTOS);
    sheet.appendRow(['Data/Hora', 'Modalidade', 'Telefone', 'NomeVotante', 'Atleta', 'Time']);
  }
  return sheet;
}

// ══════════════════════════════════════════════════════════
// doPost — recebe votos do app
// ══════════════════════════════════════════════════════════
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    if (body.action === 'votar') {
      var modalidade = (body.modalidade || '').toString().trim();
      var telefone   = (body.telefone || '').toString().trim();
      var nomeVotante = (body.nomeVotante || '').toString().trim();
      var atleta     = (body.atleta || '').toString().trim();
      var time       = (body.time || '').toString().trim();

      if (!modalidade || !atleta) {
        return jsonResponse({ ok: false, erro: 'Dados incompletos' });
      }

      var sheet = getSheet();
      var dados = sheet.getDataRange().getValues();

      // 1 voto por telefone por modalidade — se já votou, atualiza o voto
      // (permite trocar de atleta, mas não conta 2x pela mesma pessoa)
      var linhaExistente = -1;
      if (telefone) {
        for (var i = 1; i < dados.length; i++) {
          if ((dados[i][1] || '').toString().trim() === modalidade &&
              (dados[i][2] || '').toString().trim() === telefone) {
            linhaExistente = i + 1;
            break;
          }
        }
      }

      var agora = new Date().toLocaleString('pt-BR');
      if (linhaExistente > 0) {
        sheet.getRange(linhaExistente, 1, 1, 6).setValues([[agora, modalidade, telefone, nomeVotante, atleta, time]]);
      } else {
        sheet.appendRow([agora, modalidade, telefone, nomeVotante, atleta, time]);
      }

      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, erro: 'ação inválida' });

  } catch (err) {
    return jsonResponse({ ok: false, erro: err.message });
  }
}

// ══════════════════════════════════════════════════════════
// doGet — devolve o ranking pro app/TV
// ══════════════════════════════════════════════════════════
function doGet(e) {
  try {
    var action = (e.parameter.action || '').toString();

    if (action === 'ranking') {
      var modalidade = (e.parameter.modalidade || '').toString().trim();
      var sheet = getSheet();
      var dados = sheet.getDataRange().getValues();

      var contagem = {}; // atleta -> {atleta, time, votos}
      for (var i = 1; i < dados.length; i++) {
        var row = dados[i];
        var modRow = (row[1] || '').toString().trim();
        if (modalidade && modRow !== modalidade) continue;
        var atleta = (row[4] || '').toString().trim();
        var time = (row[5] || '').toString().trim();
        if (!atleta) continue;
        if (!contagem[atleta]) contagem[atleta] = { atleta: atleta, time: time, votos: 0 };
        contagem[atleta].votos++;
      }

      var ranking = Object.keys(contagem).map(function(k) { return contagem[k]; });
      ranking.sort(function(a, b) { return b.votos - a.votos; });
      ranking = ranking.slice(0, 10);

      return jsonResponse({ ranking: ranking });
    }

    return ContentService
      .createTextOutput('Supercopa Galera Apps Script v1 OK')
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    return jsonResponse({ ranking: [], erro: err.message });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
