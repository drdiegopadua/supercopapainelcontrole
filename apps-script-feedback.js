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
// Depois de rodar o passo 3, você pode editar as perguntas
// normalmente pela interface do Google Forms (o link de edição
// aparece no log). Só não mude a ORDEM das perguntas, senão o
// dashboard lê a coluna errada.

function criarFormularioFeedback() {
  const form = FormApp.create('Feedback Supercopa AFC 2026');
  form.setDescription('Sua opinião ajuda a Supercopa AFC a ficar cada vez melhor! Leva menos de 2 minutos. 🏀🏐');
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);

  form.addMultipleChoiceItem()
    .setTitle('Qual modalidade você acompanhou?')
    .setChoiceValues(['Vôlei', 'Basquete', 'Ambas'])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Qual time você torce ou está ligado?')
    .setRequired(false);

  form.addScaleItem()
    .setTitle('Nota geral para o evento')
    .setBounds(0, 10)
    .setLabels('Muito ruim', 'Excelente')
    .setRequired(true);

  form.addScaleItem()
    .setTitle('Organização e infraestrutura (local, horários, estrutura)')
    .setBounds(1, 5)
    .setLabels('Ruim', 'Ótima')
    .setRequired(true);

  form.addScaleItem()
    .setTitle('Arbitragem')
    .setBounds(1, 5)
    .setLabels('Ruim', 'Ótima')
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Você usa o app da Supercopa?')
    .setChoiceValues(['Sim, uso sempre', 'Já usei algumas vezes', 'Não conhecia'])
    .setRequired(false);

  form.addScaleItem()
    .setTitle('De 0 a 10, o quanto você recomendaria a Supercopa para amigos e família?')
    .setBounds(0, 10)
    .setLabels('Não recomendaria', 'Com certeza')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('O que você mais gostou?')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('O que podemos melhorar?')
    .setRequired(false);

  form.addTextItem()
    .setTitle('Seu nome (opcional)')
    .setRequired(false);

  form.addTextItem()
    .setTitle('WhatsApp (opcional, caso tenha sorteios/brindes)')
    .setRequired(false);

  // Cria e vincula a planilha de respostas
  const ss = SpreadsheetApp.create('Feedback Supercopa AFC 2026 - Respostas');
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
    const sheet = ss.getSheets()[0];
    const rows = sheet.getDataRange().getValues();
    const headers = rows.shift();

    const respostas = rows.map(r => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = r[i]);
      return obj;
    });

    return ContentService.createTextOutput(JSON.stringify({ ok: true, headers: headers, respostas: respostas }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (ex) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: ex.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
