// ============================================================
//  SUPERCOPA AFC — Apps Script para listar fotos/videos de uma
//  pasta do Google Drive (usado na aba "Basquete" da Galeria do app)
// ============================================================
//
// COMO IMPLANTAR:
// 1. Acesse https://script.google.com e clique em "Novo projeto"
// 2. Apague o conteudo padrao e cole todo este arquivo
// 3. Clique em "Implantar" > "Nova implantacao"
// 4. Tipo: "Aplicativo da Web"
//    - Executar como: "Eu" (sua conta)
//    - Quem tem acesso: "Qualquer pessoa"
// 5. Clique em "Implantar", autorize o acesso quando pedir
// 6. Copie a URL gerada (termina em /exec) e me mande aqui no chat
//
// A pasta do Drive ja esta configurada com o ID correto abaixo.
// Nao precisa mexer no Google Cloud Console nem em chave de API.

const FOLDER_ID = '1vEa7KjtSEIaVx4jURw9MBMQ0RZE6V6AE';

function doGet(e) {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = folder.getFiles();
    const out = [];

    while (files.hasNext()) {
      const f = files.next();
      const mime = f.getMimeType();
      const isImage = mime.indexOf('image/') === 0;
      const isVideo = mime.indexOf('video/') === 0;
      if (!isImage && !isVideo) continue;

      out.push({
        id: f.getId(),
        name: f.getName(),
        isVideo: isVideo,
        dataModificacao: f.getLastUpdated().getTime()
      });
    }

    // Mais recentes primeiro
    out.sort(function (a, b) { return b.dataModificacao - a.dataModificacao; });

    return ContentService.createTextOutput(JSON.stringify({ ok: true, files: out }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (ex) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: ex.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
