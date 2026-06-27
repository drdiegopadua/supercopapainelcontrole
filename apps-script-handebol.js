// ============================================================
// AFOHAND — Apps Script da Planilha de Placares
// ID: 1CT9nND4HHVakDZHydtDyF6g2ULwuF8iMpyE9OqaMQVU
// Cole este código no Apps Script, salve e reimplante como
// Web App (acesso: Qualquer pessoa) para uma nova versão.
// ============================================================

const SS_ID = '1CT9nND4HHVakDZHydtDyF6g2ULwuF8iMpyE9OqaMQVU';

function doGet(e) {
  return okJson({ ok: true });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SS_ID);

    // Fase de Grupos (Masculino e Feminino)
    if (data.tipo === 'placar_handebol') {
      // range ex: "'Fase de Grupos-Fem'!D5:F5"
      // Extrai nome da aba e celula dinamicamente
      const m = data.range.match(/^'?([^'!]+)'?!(.+)$/);
      const shName   = m ? m[1] : 'Fase de Grupos';
      const cellPart = m ? m[2] : data.range;
      const sh = ss.getSheetByName(shName);
      if (!sh) return okJson({ ok: false, msg: 'Aba nao encontrada: ' + shName });
      const startCol = cellPart.split(':')[0].replace(/[^A-Za-z]/g, '');
      const row      = parseInt(cellPart.split(':')[0].replace(/[A-Za-z]/g, ''));
      const vals     = data.valores[0];
      if (startCol === 'D') {
        sh.getRange(row, 4).setValue(vals[0]);
        sh.getRange(row, 6).setValue(vals[2]);
      } else if (startCol === 'N') {
        sh.getRange(row, 14).setValue(vals[0]);
        sh.getRange(row, 16).setValue(vals[2]);
      }
      return okJson({ ok: true });
    }

    // Mata-Mata (Masculino e Feminino)
    if (data.tipo === 'placar_handebol_mm') {
      // data.aba vem como 'Mata-Mata' ou 'Mata-Mata-Fem'
      const shName = data.aba || 'Mata-Mata';
      const sh = ss.getSheetByName(shName);
      if (!sh) return okJson({ ok: false, msg: 'Aba nao encontrada: ' + shName });
      const row = data.golRow;
      sh.getRange(row, 2).setValue(data.golsA);
      sh.getRange(row, 8).setValue(data.golsB);
      return okJson({ ok: true });
    }

    // Destaque da Galera COROA
    if (data.tipo === 'voto_destaque') {
      const VOTE_SS_ID = '1jGuJHUHyY3p-PQHm7HmNjcYry_xPheuOT2RmVFHh_Go';
      const sh = SpreadsheetApp.openById(VOTE_SS_ID).getActiveSheet();
      sh.appendRow([new Date(), data.nome, data.telefone, data.modalidade, data.time, data.atleta]);
      return okJson({ success: true });
    }

    return okJson({ ok: false, msg: 'tipo desconhecido' });
  } catch(err) {
    return okJson({ erro: err.message });
  }
}

function okJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
