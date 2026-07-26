// ============================================================
//  SUPERCOPA AFC — Inscrição de Equipes (formulário único)
// ============================================================
//
// O QUE ESSE ARQUIVO FAZ:
// 1) Recebe as inscrições enviadas pelo formulário do site
//    (inscricao.html) e grava na planilha abaixo, incluindo o
//    upload do escudo do time (salvo na pasta do Drive abaixo).
// 2) Expõe um endpoint (doGet) que o Painel Admin usa para
//    listar as equipes inscritas.
//
// Planilha de inscrições:
// https://docs.google.com/spreadsheets/d/1hM1wRtCW-3GjQGB9flO3_sH5LAmOnjii7yN8d_Ob7VI/edit
//
// Pasta de escudos no Drive:
// https://drive.google.com/drive/folders/1u8SuBSGXJHnzonB7rQKxfu6TeYyxymr_
//
// COMO USAR (passo a passo):
// 1. Acesse https://script.google.com e clique em "Novo projeto"
// 2. Apague o conteúdo padrão e cole todo este arquivo
// 3. Rode a função "configurarInscricao" uma vez (autorize sua
//    conta na primeira execução) — ela cria a linha de cabeçalho
//    na planilha, caso ainda não exista.
// 4. Clique em "Implantar" > "Nova implantação"
//    - Tipo: "Aplicativo da Web"
//    - Executar como: "Eu" (sua conta)
//    - Quem tem acesso: "Qualquer pessoa"
// 5. Copie a URL gerada (termina em /exec) e me envie aqui no
//    chat — é o que eu uso para ligar o formulário do site e
//    o dashboard do Painel Admin.

const SHEET_ID = '1hM1wRtCW-3GjQGB9flO3_sH5LAmOnjii7yN8d_Ob7VI';
const FOLDER_ID = '1u8SuBSGXJHnzonB7rQKxfu6TeYyxymr_';

const HEADERS = [
  'Carimbo de data/hora', 'Nome da Equipe', 'Nome do Responsável', 'Instagram',
  'Telefone/WhatsApp', 'Cidade', 'Precisa de Alojamento', 'Pessoas no Alojamento',
  'Como conheceu a Supercopa', 'Termo de Alojamento', 'Termo de Compromisso',
  'Link do Escudo', 'Status'
];

function configurarInscricao() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  const primeiraLinha = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const jaTemCabecalho = primeiraLinha.some(v => String(v).trim() !== '');
  if (!jaTemCabecalho) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
  Logger.log('Planilha configurada: ' + SpreadsheetApp.openById(SHEET_ID).getUrl());
  Logger.log('Pasta de escudos: ' + DriveApp.getFolderById(FOLDER_ID).getUrl());
}

function doPost(e) {
  try {
    const dados = JSON.parse(e.postData.contents);

    let linkEscudo = '';
    if (dados.escudoBase64) {
      const partes = dados.escudoBase64.split(',');
      const bytes = Utilities.base64Decode(partes[1] || partes[0]);
      const blob = Utilities.newBlob(bytes, 'image/png', dados.escudoNome || 'escudo.png');
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      linkEscudo = file.getUrl();
    }

    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
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
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    const rows = sheet.getDataRange().getValues();
    const headers = rows.shift();

    const inscricoes = rows.map((r, i) => {
      const obj = { _linha: i + 2 };
      headers.forEach((h, j) => obj[h] = r[j]);
      return obj;
    }).filter(o => o['Nome da Equipe']);

    return ContentService.createTextOutput(JSON.stringify({ ok: true, headers: headers, inscricoes: inscricoes }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (ex) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: ex.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
