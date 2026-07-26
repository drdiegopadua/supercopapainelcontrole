// ============================================================
//  SUPERCOPA AFC — Formulário de Feedback + Dashboard
// ============================================================
//
// O QUE ESSE ARQUIVO FAZ:
// 1) Cria automaticamente um Google Formulário de feedback da
//    Supercopa, já com uma Planilha Google vinculada para salvar
//    as respostas (você não precisa criar nada manualmente).
// 2) Expõe um endpoint (doGet) que o Painel Admin usa para ler
//    as respostas e montar o dashboard.
//
// As respostas vão direto para a planilha já existente:
// https://docs.google.com/spreadsheets/d/1InodiEZbZfBtawwDSGWLkfFp4xwK9aSWKbqc9TPRPCw/edit
//
// COMO USAR (passo a passo):
// 1. Acesse https://script.google.com e clique em "Novo projeto"
// 2. Apague o conteúdo padrão e cole todo este arquivo
// 3. No topo, clique em "criarFormularioFeedback" (seletor de função)
//    e clique em "Executar" (▶). Na primeira vez vai pedir para
//    autorizar — autorize com sua conta Google.
// 4. Abra "Execução" > veja o log: vai aparecer o LINK DO FORMULÁRIO
//    (esse é o link que você envia para as pessoas preencherem) e
//    o link de edição das perguntas.
// 5. Depois, clique em "Implantar" > "Nova implantação"
//    - Tipo: "Aplicativo da Web"
//    - Executar como: "Eu" (sua conta)
//    - Quem tem acesso: "Qualquer pessoa"
// 6. Clique em "Implantar", autorize se pedir, copie a URL gerada
//    (termina em /exec) e me envie aqui no chat — é o que eu uso
//    para ligar o dashboard no Painel Admin.
//
// Depois de rodar o passo 3, você pode editar o TEXTO das perguntas
// normalmente pela interface do Google Forms (o link de edição
// aparece no log). Só não mude a ORDEM das perguntas, senão o
// dashboard lê a coluna errada.

const FEEDBACK_SHEET_ID = '1InodiEZbZfBtawwDSGWLkfFp4xwK9aSWKbqc9TPRPCw';

function criarFormularioFeedback() {
  const form = FormApp.create('Feedback Supercopa AFC 2026');
  form.setDescription('Sua opinião ajuda a Supercopa AFC a ficar cada vez melhor! Leva menos de 1 minuto. 🏀🏐');
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);

  form.addScaleItem()
    .setTitle('1. Qual sua nota para a organização e infraestrutura?')
    .setBounds(1, 10)
    .setLabels('Péssima', 'Excelente')
    .setRequired(true);

  form.addScaleItem()
    .setTitle('2. Qual sua nota para a arbitragem?')
    .setBounds(1, 10)
    .setLabels('Péssima', 'Excelente')
    .setRequired(true);

  form.addScaleItem()
    .setTitle('3. O que você achou do app da Supercopa?')
    .setBounds(1, 10)
    .setLabels('Não gostei', 'Adorei')
    .setRequired(true);

  form.addScaleItem()
    .setTitle('4. Qual sua nota geral para o evento?')
    .setBounds(1, 10)
    .setLabels('Péssimo', 'Excelente')
    .setRequired(true);

  form.addScaleItem()
    .setTitle('5. Recomendaria a Supercopa?')
    .setBounds(1, 10)
    .setLabels('Não recomendaria', 'Com certeza')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('6. Pontos positivos')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('7. Pontos a melhorar')
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('8. Seu time')
    .setChoiceValues(['CT das Montanhas', 'São Pedro Basquete', 'Central Serrano Basquete', 'Aracruz Basquete', 'Marlins', 'Crossover Basquete'])
    .setRequired(true);

  // Vincula a planilha já existente (cria uma aba "Form Responses 1" nela com as colunas)
  const ss = SpreadsheetApp.openById(FEEDBACK_SHEET_ID);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // Guarda o ID da planilha para o doGet usar depois
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());

  Logger.log('====================================================');
  Logger.log('LINK PARA ENVIAR ÀS PESSOAS (formulário):');
  Logger.log(form.getPublishedUrl());
  Logger.log('----------------------------------------------------');
  Logger.log('LINK PARA VOCÊ EDITAR AS PERGUNTAS:');
  Logger.log(form.getEditUrl());
  Logger.log('----------------------------------------------------');
  Logger.log('Planilha de respostas: ' + ss.getUrl());
  Logger.log('====================================================');
}

// Web App — usado pelo Painel Admin para montar o dashboard
function doGet(e) {
  try {
    const sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
    if (!sheetId) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: 'Formulário ainda não foi criado. Rode criarFormularioFeedback() primeiro.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const ss = SpreadsheetApp.openById(sheetId);
    const sheets = ss.getSheets();

    // A aba de respostas do Forms pode se chamar "Form Responses 1" (conta em
    // inglês) ou "Respostas ao formulário 1" (conta em português). Em vez de
    // confiar só no nome, escolhe a aba com mais colunas preenchidas na
    // primeira linha (a de respostas tem 9: carimbo de data/hora + 8 perguntas).
    let sheet = sheets.find(s => /form responses|respostas ao formul/i.test(s.getName()));
    if (!sheet) {
      sheet = sheets.reduce((best, s) => {
        const cols = s.getLastColumn();
        return (!best || cols > best.getLastColumn()) ? s : best;
      }, null);
    }

    const rows = sheet.getDataRange().getValues();
    const headers = rows.shift();

    const respostas = rows.map(r => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = r[i]);
      return obj;
    });

    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      headers: headers,
      respostas: respostas,
      debug: { abaUsada: sheet.getName(), todasAbas: sheets.map(s => s.getName()) }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (ex) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: ex.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
