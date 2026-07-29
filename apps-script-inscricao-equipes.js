// ============================================================
//  DESATIVADO — não use mais este arquivo.
//  A inscrição de equipes foi incorporada ao
//  apps-script-volei-apoio.js (aba "Inscricoes" na planilha
//  "Supercopa Vôlei 2026 - Destaque, Premiação e Galera"),
//  para não espalhar em mais uma planilha/script separado.
//  Mantido aqui só como histórico.
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
// Planilha de inscrições (Vôlei 2026):
// https://docs.google.com/spreadsheets/d/1kmDTtkWMY0tWbzvtoqks9UYbNvlf5Mtp5I3A6DLFDXY/edit
//
// Pasta de escudos no Drive (mesma de sempre):
// https://drive.google.com/drive/folders/1u8SuBSGXJHnzonB7rQKxfu6TeYyxymr_
//
// COMO USAR (passo a passo):
// 1. Acesse o projeto do Apps Script já existente (o mesmo de antes)
// 2. Apague o conteúdo e cole todo este arquivo atualizado
// 3. Rode a função "configurarInscricao" uma vez (autorize sua
//    conta na primeira execução) — ela cria a linha de cabeçalho
//    na planilha nova, caso ainda não exista.
// 4. Clique em "Implantar" > "Gerenciar implantações" > editar (ícone
//    de lápis) > no dropdown "Versão" escolha "Nova versão" > Implantar
//    (mantém a mesma URL /exec, não precisa mudar nada no site)
// 5. Se a URL mudar por algum motivo, me envie aqui no chat.

const SHEET_ID = '1kmDTtkWMY0tWbzvtoqks9UYbNvlf5Mtp5I3A6DLFDXY';
const FOLDER_ID = '1u8SuBSGXJHnzonB7rQKxfu6TeYyxymr_';

const HEADERS = [
  'Carimbo de data/hora', 'Modalidade', 'Nome da Equipe', 'Nome do Responsável', 'Instagram',
  'Telefone/WhatsApp', 'Cidade', 'Precisa de Alojamento', 'Pessoas no Alojamento',
  'Como conheceu a Supercopa', 'Termo de Alojamento', 'Termo de Compromisso',
  'Link do Escudo', 'Status'
];

function configurarInscricao() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  // Sempre reescreve o cabeçalho da linha 1 (não mexe nas linhas de dados abaixo).
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
  Logger.log('Planilha configurada: ' + SpreadsheetApp.openById(SHEET_ID).getUrl());
  Logger.log('Pasta de escudos: ' + DriveApp.getFolderById(FOLDER_ID).getUrl());
}

// Rode esta função direto no editor (▶ Executar, selecionando "testarUploadEscudo"
// no menu ao lado do botão) para ver exatamente onde o Drive está recusando.
// O log completo aparece automaticamente depois de rodar (menu "Execuções" à esquerda).
function testarUploadEscudo() {
  try {
    Logger.log('1) Abrindo a pasta...');
    const folder = DriveApp.getFolderById(FOLDER_ID);
    Logger.log('   OK — pasta: ' + folder.getName());

    Logger.log('2) Criando arquivo de teste...');
    const bytes = Utilities.base64Decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    const blob = Utilities.newBlob(bytes, 'image/png', 'teste-diagnostico.png');
    const file = folder.createFile(blob);
    Logger.log('   OK — arquivo criado: ' + file.getUrl());

    Logger.log('3) Pulando setSharing() — o arquivo já herda o compartilhamento da pasta.');

    Logger.log('4) Apagando arquivo de teste...');
    file.setTrashed(true);
    Logger.log('TUDO OK! O upload de escudo deveria funcionar normalmente.');
  } catch (ex) {
    Logger.log('ERRO: ' + ex.message);
    Logger.log('STACK: ' + ex.stack);
  }
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
      // Não chama file.setSharing() aqui: a pasta já está compartilhada como
      // "Qualquer pessoa com o link" e o arquivo herda essa permissão sozinho.
      // Forçar setSharing() no arquivo individual dá "Acesso negado: DriveApp."
      // nessa conta.
      linkEscudo = file.getUrl();
    }

    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    sheet.appendRow([
      new Date(),
      dados.modalidade || '',
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
