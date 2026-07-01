// ============================================================
// COPA AFOHAND 2026 — Destaque da Galera
// Planilha ID: 1jGuJHUHyY3p-PQHm7HmNjcYry_xPheuOT2RmVFHh_Go
//
// PASSO A PASSO:
// 1. Abra a planilha:
//    https://docs.google.com/spreadsheets/d/1jGuJHUHyY3p-PQHm7HmNjcYry_xPheuOT2RmVFHh_Go
// 2. Clique em: Extensoes > Apps Script
// 3. Apague tudo que tiver la e cole este codigo abaixo
// 4. Salve com Ctrl+S
// 5. Clique em "Implantar" > "Gerenciar implantacoes" > editar (lapis)
//    a implantacao ja existente > Versao: Nova versao > Implantar
//    (se for a primeira vez, use "Nova implantacao" com Tipo: App da
//    Web / Executar como: seu e-mail / Quem tem acesso: Qualquer pessoa)
// 6. A URL /exec continua a mesma de sempre, nao precisa trocar em
//    nenhum app que ja use essa planilha.
// ============================================================

var SHEET_ID = '1jGuJHUHyY3p-PQHm7HmNjcYry_xPheuOT2RmVFHh_Go';

function getSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  return ss.getSheetByName('Página1') || ss.getSheetByName('Pagina1') || ss.getSheets()[0];
}

// ══════════════════════════════════════════════════════════
// doGet — status da API + ranking (?action=ranking&modalidade=X)
// ══════════════════════════════════════════════════════════
function doGet(e) {
  try {
    var action = (e.parameter.action || '').toString();

    if (action === 'ranking') {
      var modalidade = (e.parameter.modalidade || '').toString().trim().toLowerCase();
      var sheet = getSheet();
      var dados = sheet.getDataRange().getValues();

      // Colunas: A=Timestamp B=NomeVotante C=Telefone D=Modalidade E=Time F=Atleta
      var contagem = {}; // chave "atleta||time" -> {atleta, time, votos}
      for (var i = 1; i < dados.length; i++) {
        var row = dados[i];
        var modRow = (row[3] || '').toString().trim().toLowerCase();
        if (modalidade && modRow && modRow !== modalidade) continue;
        var time = (row[4] || '').toString().trim();
        var atleta = (row[5] || '').toString().trim();
        if (!atleta) continue;
        var chave = atleta + '||' + time;
        if (!contagem[chave]) contagem[chave] = { atleta: atleta, time: time, votos: 0 };
        contagem[chave].votos++;
      }

      var ranking = Object.keys(contagem).map(function(k) { return contagem[k]; });
      ranking.sort(function(a, b) { return b.votos - a.votos; });
      ranking = ranking.slice(0, 10);

      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, ranking: ranking }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, msg: 'AFOHAND Galera API ativa' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, ranking: [], erro: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ══════════════════════════════════════════════════════════
// doPost — grava o voto
// ══════════════════════════════════════════════════════════
function doPost(e) {
  try {
    var sheet = getSheet();
    var d = JSON.parse(e.postData.contents);

    // Cabecalho automatico se a planilha estiver vazia
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Data/Hora', 'Nome', 'Telefone', 'Modalidade', 'Time', 'Atleta', 'Num Atleta']);
    }

    // Aceita tanto os nomes de campo antigos (nome/naipe) quanto os
    // que o app da Supercopa envia hoje (nomeVotante/modalidade), para
    // nao quebrar nenhum app que ja esteja usando essa planilha.
    var nome       = d.nome       || d.nomeVotante || '';
    var telefone   = d.telefone   || '';
    var modalidade = d.naipe      || d.modalidade  || '';
    var time       = d.time       || '';
    var atleta     = d.atleta     || '';
    var num        = d.num        || '';

    sheet.appendRow([
      new Date(),
      nome,
      telefone,
      modalidade,
      time,
      atleta,
      num
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
