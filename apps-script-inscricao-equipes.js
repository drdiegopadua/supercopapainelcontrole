// ============================================================
//  SUPERCOPA AFC — Inscrição de Equipes (formulário único)
// ============================================================
//
// O QUE ESSE ARQUIVO FAZ:
// 1) Recebe as inscrições enviadas pelo formulário do site
//    (inscricao.html) e grava numa planilha, incluindo o
//    upload do escudo do time (salvo no Google Drive).
// 2) Expõe um endpoint (doGet) que o Painel Admin usa para
//    listar as equipes inscritas.
//
// COMO USAR (passo a passo):
// 1. Acesse https://script.google.com e clique em "Novo projeto"
// 2. Apague o conteúdo padrão e cole todo este arquivo
// 3. Rode a função "criarPlanilhaInscricao" uma vez (autorize
//    sua conta na primeira execução).
// 4. Veja o log (menu "Execuções"): vai aparecer o link da
//    planilha criada e da pasta de escudos no Drive.
// 5. Clique em "Implantar" > "Nova implantação"
//    - Tipo: "Aplicativo da Web"
//    - Executar como: "Eu" (sua conta)
//    - Quem tem acesso: "Qualquer pessoa"
// 6. Copie a URL gerada (termina em /exec) e me envie aqui no
//    chat — é o que eu uso para ligar o formulário do site e
//    o dashboard do Painel Admin.

function criarPlanilhaInscricao() {
  const ss = SpreadsheetApp.create('Inscrições de Equipes - Supercopa AFC 2026');
  const sheet = ss.getSheets()[0];
  sheet.setName('Inscrições');
  sheet.getRange(1, 1, 1, 13).setValues([[
    'Carimbo de data/hora', 'Nome da Equipe', 'Nome do Responsável', 'Instagram',
    'Telefone/WhatsApp', 'Cidade', 'Precisa de Alojamento', 'Pessoas no Alojamento',
    'Como conheceu a Supercopa', 'Termo de Alojamento', 'Termo de Compromisso',
    'Link do Escudo', 'Status'
  ]]);
  sheet.setFrozenRows(1);

  const folder = DriveApp.createFolder('Escudos - Inscrições Supercopa 2026');

  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());
  PropertiesService.getScriptProperties().setProperty('FOLDER_ID', folder.getId());

  Logger.log('====================================================');
  Logger.log('Planilha de inscrições: ' + ss.getUrl());
  Logger.log('Pasta de escudos no Drive: ' + folder.getUrl());
  Logger.log('====================================================');
}

function doPost(e) {
  try {
    const sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
    const folderId = PropertiesService.getScriptProperties().getProperty('FOLDER_ID');
    if (!sheetId || !folderId) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: 'Rode criarPlanilhaInscricao() primeiro.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const dados = JSON.parse(e.postData.contents);

    let linkEscudo = '';
    if (dados.escudoBase64) {
      const partes = dados.escudoBase64.split(',');
      const bytes = Utilities.base64Decode(partes[1] || partes[0]);
      const blob = Utilities.newBlob(bytes, 'image/png', dados.escudoNome || 'escudo.png');
      const folder = DriveApp.getFolderById(folderId);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      linkEscudo = file.getUrl();
    }

    const sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
    sheet.appendRow([
      new Date(),
      dados.nomeEquipe || '',
      dados.nomeResp || '',
      dados.instagram || '',
      dados.telefone || '',
      dados.cidade || '',
      dados.alojamento === 'sim' ? 'Sim' : 'Não',
      dados.alojamento === 'sim' ? (dados.alojQty || '') : '',
      dados.comoConheceu || '',
      dados.termoAloj ? 'Assinado' : '',
      dados.termoComp ? 'Assinado' : '',
      linkEscudo,
      'Pendente'
    ]);

    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (ex) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'erro', ok: false, msg: ex.message, erro: ex.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Web App — usado pelo Painel Admin para listar as equipes inscritas
function doGet(e) {
  try {
    const sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
    if (!sheetId) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: 'Nenhuma inscrição ainda. Rode criarPlanilhaInscricao() primeiro.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
    const rows = sheet.getDataRange().getValues();
    const headers = rows.shift();

    const inscricoes = rows.map((r, i) => {
      const obj = { _linha: i + 2 };
      headers.forEach((h, j) => obj[h] = r[j]);
      return obj;
    });

    return ContentService.createTextOutput(JSON.stringify({ ok: true, headers: headers, inscricoes: inscricoes }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (ex) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: ex.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
