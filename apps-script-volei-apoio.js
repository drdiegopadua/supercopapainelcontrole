// ============================================================
//  SUPERCOPA AFC — Vôlei: Atleta Destaque + Melhores do
//  Campeonato + Destaque da Galera (tudo numa planilha só)
// ============================================================
//
// Isso substitui, só para o Vôlei, o que hoje está espalhado em
// 3 planilhas/scripts diferentes do Basquete. Uma planilha, três
// abas, um único Apps Script.
//
// COMO USAR:
// 1. Acesse https://script.google.com e clique em "Novo projeto"
// 2. Apague o conteúdo padrão e cole todo este arquivo
// 3. Rode a função "criarPlanilhaVolei" uma vez (autorize sua
//    conta na primeira execução).
// 4. Veja o log (menu "Execuções"): vai aparecer o link da
//    planilha criada.
// 5. Clique em "Implantar" > "Nova implantação"
//    - Tipo: "Aplicativo da Web"
//    - Executar como: "Eu" (sua conta)
//    - Quem tem acesso: "Qualquer pessoa"
// 6. Copie a URL gerada (termina em /exec) e me envie aqui no
//    chat — é o que eu uso para ligar o Painel Admin e o app.

const ABA_DESTAQUE = 'Destaque';
const ABA_PREMIACAO_V = 'Premiacao';
const ABA_GALERA = 'Galera';
const ABA_INSCRICOES = 'Inscricoes';

// Pasta de escudos no Drive (mesma de sempre, compartilhada como
// "Qualquer pessoa com o link"):
// https://drive.google.com/drive/folders/1u8SuBSGXJHnzonB7rQKxfu6TeYyxymr_
const FOLDER_ID_ESCUDOS = '1u8SuBSGXJHnzonB7rQKxfu6TeYyxymr_';

const HEADERS_INSCRICOES = [
  'Carimbo de data/hora', 'Modalidade', 'Nome da Equipe', 'Nome do Responsável', 'Instagram',
  'Telefone/WhatsApp', 'Cidade', 'Precisa de Alojamento', 'Pessoas no Alojamento',
  'Como conheceu a Supercopa', 'Termo de Alojamento', 'Termo de Compromisso',
  'Link do Escudo', 'Status'
];

// ── SÚMULA DIGITAL (jogos/placar do Vôlei) ─────────────────
// Planilha separada, só de jogos/placar (Fase de Grupos + Mata-Mata):
// https://docs.google.com/spreadsheets/d/12-yxLsIplLMAj0Y9jCpzl2OGJLKPhy_lWAtvYP-Vvh8/edit
const ABA_SUMULAS = 'Sumulas';
const JOGOS_SHEET_ID = '12-yxLsIplLMAj0Y9jCpzl2OGJLKPhy_lWAtvYP-Vvh8';
const ABA_GRUPOS = 'Fase de Grupos';
const ABA_MATA = 'Mata-Mata';

// Linha (1-indexed) de cada jogo dentro da planilha de jogos.
const ROW_MAP_GRUPOS = {
  A1: 11, A2: 12, A3: 13,
  B1: 23, B2: 24, B3: 25,
  C1: 35, C2: 36, C3: 37,
  D1: 47, D2: 48, D3: 49
};
const ROW_MAP_MATA = {
  Q1: 6, Q2: 7, Q3: 8, Q4: 9,
  SF1: 13, SF2: 14,
  FINAL: 18
};

const HEADERS_SUMULAS = [
  'ID Jogo', 'Aba', 'Linha', 'Equipe Casa', 'Equipe Visitante',
  'Titulares Casa', 'Líbero Casa', 'Titulares Visitante', 'Líbero Visitante',
  'Sets', 'Timeouts Casa', 'Timeouts Visitante', 'Cartões', 'Substituições',
  'Árbitro', 'Anotador', 'Local', 'Status', 'Atualizado em'
];

// ── CADASTRO DE ATLETAS (número + nome por time) ────────────
const ABA_ATLETAS = 'Atletas';
const HEADERS_ATLETAS = ['Equipe', 'Numero', 'Nome', 'Tipo', 'Cadastrado em'];
const LIMITE_ATLETAS = 14;
const LIMITE_COMISSAO = 2;

// ── PIN DE ACESSO POR EQUIPE (protege o cadastro de atletas) ──
const ABA_EQUIPES_PIN = 'EquipesPin';
const HEADERS_EQUIPES_PIN = ['Equipe', 'PIN', 'Gerado em'];

// ── CONFIRMAÇÃO DE PRESENÇA (equipe aceita o convite/termo) ───
const ABA_CONFIRMACOES = 'Confirmacoes';
const HEADERS_CONFIRMACOES = ['Equipe', 'Confirmado em', 'Termo Aceito'];

// Prazo final pra equipe cadastrar/editar atletas pelo app (depois
// disso só o painel admin consegue editar).
const PRAZO_CADASTRO_ATLETAS = new Date('2026-11-27T13:00:00');

// ── SÚMULA AO VIVO (console de arbitragem, dentro do painel) ──
const ABA_PARTIDAS = 'Partidas';
const PLACAR_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbznh7KfIJxIEF-aWd2TMIZ8l2XWdFoKrjU5xdo7HCRtRzYBkAL0v3AgucYRRj9b9eQH/exec';

const HEADERS_PARTIDAS = [
  'ID Jogo', 'Aba', 'Linha', 'Equipe Casa', 'Equipe Visitante',
  'Elenco Casa', 'Elenco Visitante',
  'Arbitro1', 'Arbitro2', 'Apontador',
  'SetAtual', 'PontosCasa', 'PontosVisitante', 'SetsCasa', 'SetsVisitante',
  'Sacando', 'RotacaoCasa', 'RotacaoVisitante', 'PrimeiroSaqueSet',
  'HistoricoSets', 'Timeouts', 'Cartoes', 'Substituicoes', 'EventosLog',
  'Status', 'LinkPDF', 'CriadoEm', 'AtualizadoEm',
  'CapitaoCasa', 'CapitaoVisitante', 'Observacoes',
  'HistoricoPontos', 'CapitaoQuadraCasa', 'CapitaoQuadraVisitante', 'RotacaoConfirmadaSet',
  'EscalacoesPorSet', 'HorariosSets'
];
// Índices das colunas (0-based) para referência rápida.
const PC = {
  id:0, aba:1, linha:2, equipeCasa:3, equipeVisitante:4,
  elencoCasa:5, elencoVisitante:6,
  arbitro1:7, arbitro2:8, apontador:9,
  setAtual:10, pontosCasa:11, pontosVisitante:12, setsCasa:13, setsVisitante:14,
  sacando:15, rotacaoCasa:16, rotacaoVisitante:17, primeiroSaqueSet:18,
  historicoSets:19, timeouts:20, cartoes:21, substituicoes:22, eventosLog:23,
  status:24, linkPdf:25, criadoEm:26, atualizadoEm:27,
  capitaoCasa:28, capitaoVisitante:29, observacoes:30,
  historicoPontos:31, capitaoQuadraCasa:32, capitaoQuadraVisitante:33,
  rotacaoConfirmadaSet:34,
  // escalacoesPorSet guarda, pra cada set (chave "1","2","3"), a
  // escalação (rotação + capitão de quadra) confirmada naquele set —
  // sem isso, a súmula final só saberia a escalação do ÚLTIMO set,
  // já que rotacaoCasa/rotacaoVisitante são sobrescritos a cada set.
  // horariosSets guarda a hora de início de cada set (pro "HORÁRIO DE
  // INÍCIO/FIM" oficial da súmula).
  escalacoesPorSet:35, horariosSets:36
};

function criarPlanilhaVolei() {
  const ss = SpreadsheetApp.create('Supercopa Vôlei 2026 - Destaque, Premiação e Galera');

  const shDestaque = ss.getSheets()[0];
  shDestaque.setName(ABA_DESTAQUE);
  shDestaque.getRange(1, 1, 1, 6).setValues([['Modalidade', 'Jogo', 'Nome', 'Equipe', 'Observação', 'Data/Hora']]);
  shDestaque.setFrozenRows(1);

  const shPremiacao = ss.insertSheet(ABA_PREMIACAO_V);
  shPremiacao.getRange(1, 1, 1, 4).setValues([['Categoria', 'Nome', 'Equipe', 'Atualizado em']]);
  shPremiacao.setFrozenRows(1);

  const shGalera = ss.insertSheet(ABA_GALERA);
  shGalera.getRange(1, 1, 1, 3).setValues([['Data-Hora', 'Atleta', 'Time']]);
  shGalera.setFrozenRows(1);

  const shInscricoes = ss.insertSheet(ABA_INSCRICOES);
  shInscricoes.getRange(1, 1, 1, HEADERS_INSCRICOES.length).setValues([HEADERS_INSCRICOES]);
  shInscricoes.setFrozenRows(1);

  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());

  Logger.log('====================================================');
  Logger.log('Planilha criada: ' + ss.getUrl());
  Logger.log('====================================================');
}

// Rode esta função UMA VEZ na planilha já existente para criar (ou
// corrigir o cabeçalho de) a aba "Inscricoes", sem mexer nas outras
// três abas (Destaque, Premiacao, Galera).
function configurarInscricoes() {
  const ss = getSS_();
  let sh = ss.getSheetByName(ABA_INSCRICOES);
  if (!sh) sh = ss.insertSheet(ABA_INSCRICOES);
  sh.getRange(1, 1, 1, HEADERS_INSCRICOES.length).setValues([HEADERS_INSCRICOES]);
  sh.setFrozenRows(1);
  Logger.log('Aba "Inscricoes" configurada em: ' + ss.getUrl());
}

// Rode esta função UMA VEZ para desfazer o teste de diagnóstico que
// foi gravado por engano na aba "Destaque" (linha de cabeçalho
// sobrescrita + linha de teste "TESTE DIAGNOSTICO"). Não mexe em
// mais nada.
function repararAbaDestaque() {
  const sh = getSS_().getSheetByName(ABA_DESTAQUE);
  const max = sh.getMaxColumns();
  if (max > 6) sh.getRange(1, 7, 1, max - 6).clearContent();
  sh.getRange(1, 1, 1, 6).setValues([['Modalidade', 'Jogo', 'Nome', 'Equipe', 'Observação', 'Data/Hora']]);
  const rows = sh.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if ((rows[i][2] || '').toString().trim() === 'TESTE DIAGNOSTICO') sh.deleteRow(i + 1);
  }
  Logger.log('Aba "Destaque" reparada.');
}

function getSS_() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('Rode criarPlanilhaVolei() primeiro.');
  return SpreadsheetApp.openById(id);
}

// Rode esta função DIRETO NO EDITOR (▶ Executar) uma vez. Ela só
// tenta abrir a planilha de jogos/placar do Vôlei e ler o nome —
// isso força o Google a pedir autorização de acesso a essa planilha
// especificamente, caso ainda não tenha sido concedida. Depois de
// rodar (e autorizar, se pedir), o "Salvar Súmula" passa a
// conseguir escrever o placar lá também.
function testarAcessoJogos() {
  try {
    const ss = SpreadsheetApp.openById(JOGOS_SHEET_ID);
    Logger.log('OK — consegui abrir: ' + ss.getName() + ' (' + ss.getUrl() + ')');
    const sh = ss.getSheetByName(ABA_GRUPOS);
    Logger.log('OK — aba "' + ABA_GRUPOS + '" encontrada, linha 11: ' + JSON.stringify(sh.getRange(11, 1, 1, 3).getValues()));
  } catch (ex) {
    Logger.log('ERRO: ' + ex.message);
  }
}

// Rode esta função UMA VEZ para criar a aba "Sumulas" (não mexe em
// mais nada nas outras abas).
function configurarSumulas() {
  const ss = getSS_();
  let sh = ss.getSheetByName(ABA_SUMULAS);
  if (!sh) sh = ss.insertSheet(ABA_SUMULAS);
  sh.getRange(1, 1, 1, HEADERS_SUMULAS.length).setValues([HEADERS_SUMULAS]);
  sh.setFrozenRows(1);
  Logger.log('Aba "Sumulas" configurada em: ' + ss.getUrl());
}

// Rode esta função UMA VEZ para criar a aba "Atletas" (cadastro de
// número + nome por time). Não mexe em mais nada nas outras abas.
function configurarAtletas() {
  const ss = getSS_();
  let sh = ss.getSheetByName(ABA_ATLETAS);
  if (!sh) sh = ss.insertSheet(ABA_ATLETAS);
  sh.getRange(1, 1, 1, HEADERS_ATLETAS.length).setValues([HEADERS_ATLETAS]);
  sh.setFrozenRows(1);
  Logger.log('Aba "Atletas" configurada em: ' + ss.getUrl());
}

// Rode esta função UMA VEZ para criar a aba "EquipesPin" (PINs de
// acesso por equipe). Não mexe em mais nada nas outras abas.
function configurarEquipesPin() {
  const ss = getSS_();
  let sh = ss.getSheetByName(ABA_EQUIPES_PIN);
  if (!sh) sh = ss.insertSheet(ABA_EQUIPES_PIN);
  sh.getRange(1, 1, 1, HEADERS_EQUIPES_PIN.length).setValues([HEADERS_EQUIPES_PIN]);
  sh.setFrozenRows(1);
  Logger.log('Aba "EquipesPin" configurada em: ' + ss.getUrl());
}

// Rode esta função UMA VEZ para criar a aba "Partidas" (console de
// arbitragem ao vivo). Não mexe em mais nada nas outras abas.
function configurarPartidas() {
  const ss = getSS_();
  let sh = ss.getSheetByName(ABA_PARTIDAS);
  if (!sh) sh = ss.insertSheet(ABA_PARTIDAS);
  sh.getRange(1, 1, 1, HEADERS_PARTIDAS.length).setValues([HEADERS_PARTIDAS]);
  sh.setFrozenRows(1);
  Logger.log('Aba "Partidas" configurada em: ' + ss.getUrl());
}

// Serializa as ações que leem+alteram+gravam a mesma linha da aba
// Partidas. Sem isso, dois clientes (painel + app do 2º árbitro,
// ou o poll de 4s e um clique) podem ler o mesmo estado ao mesmo
// tempo e um write "atropelar" o outro — placar errado, evento
// sumindo, ou a planilha travando na escrita concorrente (o que
// pode aparecer no navegador como "Failed to fetch").
function comLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}

// ── doPost ──────────────────────────────────────────────────
function doPost(e) {
  try {
    const dados = JSON.parse(e.postData.contents);
    const acao = dados.acao || dados.action || '';

    // ATLETA DESTAQUE POR JOGO
    if (acao === 'adicionar') {
      getSS_().getSheetByName(ABA_DESTAQUE).appendRow(dados.linha);
      return okJson({ ok: true });
    }
    if (acao === 'excluir') {
      const sh = getSS_().getSheetByName(ABA_DESTAQUE);
      const rowIndex = parseInt(dados.rowIndex);
      if (rowIndex >= 2 && rowIndex <= sh.getLastRow()) sh.deleteRow(rowIndex);
      return okJson({ ok: true });
    }

    // MELHORES DO CAMPEONATO
    if (acao === 'salvarPremiacao') {
      return okJson(salvarPremiacaoV_(dados.categoria, dados.nome, dados.equipe));
    }
    if (acao === 'excluirPremiacao') {
      return okJson(excluirPremiacaoV_(dados.categoria));
    }

    // DESTAQUE DA GALERA — voto
    if (acao === 'votar' || acao === 'votar_atleta') {
      const nomeAtleta = (dados.atleta || '').toString().trim();
      const timeAtleta = (dados.time || '').toString().trim();
      if (!nomeAtleta) return okJson({ ok: false, erro: 'Nome do atleta obrigatório' });
      const agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
      getSS_().getSheetByName(ABA_GALERA).appendRow([agora, nomeAtleta, timeAtleta]);
      return okJson({ ok: true });
    }

    // INSCRIÇÃO DE EQUIPES
    if (acao === 'inscrever') {
      return okJson(inscreverEquipeV_(dados));
    }

    // SÚMULA DIGITAL (simples, mobile — legado)
    if (acao === 'salvarSumula') {
      return okJson(salvarSumula_(dados));
    }

    // CADASTRO DE ATLETAS (painel — sem PIN, já é área administrativa)
    if (acao === 'cadastrarAtleta') return okJson(cadastrarAtleta_(dados));
    if (acao === 'removerAtleta') return okJson(removerAtleta_(dados));

    // PIN DE ACESSO DA EQUIPE (gerado pelo painel, usado pelo app)
    if (acao === 'gerarPinEquipe') return okJson(gerarPinEquipe_(dados));

    // CADASTRO DE ATLETAS (app — exige PIN da equipe)
    if (acao === 'cadastrarAtletaApp') return okJson(cadastrarAtletaApp_(dados));
    if (acao === 'removerAtletaApp') return okJson(removerAtletaApp_(dados));

    // CONFIRMAÇÃO DE PRESENÇA (equipe assina o termo pelo link do convite)
    if (acao === 'confirmarPresenca') return okJson(confirmarPresenca_(dados));

    // CONSOLE DE ARBITRAGEM AO VIVO (com lock — várias fontes podem
    // escrever na mesma partida ao mesmo tempo: painel, 2º árbitro, poll)
    if (acao === 'criarPartida') return okJson(comLock_(() => criarPartida_(dados)));
    if (acao === 'ponto') return okJson(comLock_(() => registrarPonto_(dados)));
    if (acao === 'desfazerPonto') return okJson(comLock_(() => desfazerPonto_(dados)));
    if (acao === 'pontoMenos') return okJson(comLock_(() => pontoMenos_(dados)));
    if (acao === 'definirCapitaoQuadra') return okJson(comLock_(() => definirCapitaoQuadra_(dados)));
    if (acao === 'definirEscalacaoSet') return okJson(comLock_(() => definirEscalacaoSet_(dados)));
    if (acao === 'timeout') return okJson(comLock_(() => registrarTimeout_(dados)));
    if (acao === 'atualizarObservacoes') return okJson(comLock_(() => atualizarObservacoes_(dados)));
    if (acao === 'excluirPartida') return okJson(comLock_(() => excluirPartida_(dados)));
    if (acao === 'cartao') return okJson(comLock_(() => registrarCartao_(dados)));
    if (acao === 'substituicao') return okJson(comLock_(() => registrarSubstituicao_(dados)));
    if (acao === 'removerEvento') return okJson(comLock_(() => removerEvento_(dados)));
    if (acao === 'finalizarPartida') return okJson(comLock_(() => finalizarPartida_(dados)));
    if (acao === 'uploadPdfSumula') return okJson(uploadPdfSumula_(dados));

    // SÚMULA 2.0 — lote de eventos, juízes, assinaturas, cadastro com senha
    if (acao === 'processarEventosLote') return okJson(comLock_(() => processarEventosLote_(dados)));
    if (acao === 'cadastrarJuiz') return okJson(cadastrarJuiz_(dados));
    if (acao === 'trocarSenhaAdmin') return okJson(trocarSenhaAdmin_(dados));
    if (acao === 'loginPainel') return okJson(loginPainel_(dados));
    if (acao === 'listarUsuariosPainel') return okJson(listarUsuariosPainel_(dados));
    if (acao === 'salvarUsuarioPainel') return okJson(salvarUsuarioPainel_(dados));
    if (acao === 'removerUsuarioPainel') return okJson(removerUsuarioPainel_(dados));
    if (acao === 'salvarAviso') return okJson(salvarAviso_(dados));
    if (acao === 'excluirAviso') return okJson(excluirAviso_(dados));
    if (acao === 'aceitarTermoLgpd') return okJson(aceitarTermoLgpd_(dados));
    if (acao === 'registrarWO') return okJson(comLock_(() => registrarWO_(dados)));
    if (acao === 'uploadFotoJogo') return okJson(uploadFotoJogo_(dados));
    if (acao === 'saudeSistema') return okJson(saudeSistema_(dados));
    if (acao === 'reabrirPartida') return okJson(comLock_(() => reabrirPartida_(dados)));
    if (acao === 'registrarPresenca') return okJson(registrarPresenca_(dados));
    if (acao === 'removerJuiz') return okJson(removerJuiz_(dados));
    if (acao === 'salvarAssinatura') return okJson(salvarAssinatura_(dados));
    if (acao === 'cadastrarAtletaAdmin') {
      if ((dados.senha || '').toString() !== getSenhaAdmin_()) return okJson({ ok: false, erro: 'Senha incorreta.' });
      return okJson(cadastrarAtleta_(dados));
    }
    if (acao === 'removerAtletaAdmin') {
      if ((dados.senha || '').toString() !== getSenhaAdmin_()) return okJson({ ok: false, erro: 'Senha incorreta.' });
      return okJson(removerAtleta_(dados));
    }

    return okJson({ ok: false, erro: 'ação inválida: ' + acao });
  } catch (ex) {
    return okJson({ ok: false, erro: ex.message });
  }
}

// ── doGet ───────────────────────────────────────────────────
function doGet(e) {
  try {
    const action = (e.parameter && e.parameter.action) || '';

    if (action === 'premiacao') return okJson(listarPremiacaoV_());
    if (action === 'ranking' || action === 'ranking_atleta') return okJson({ ok: true, ranking: montarRankingGaleraV_() });
    if (action === 'destaques') return okJson(listarDestaquesV_());
    if (action === 'inscricoes') return okJson(listarInscricoesV_());
    if (action === 'jogo') return okJson(carregarJogoSumula_((e.parameter && e.parameter.id) || ''));
    if (action === 'sumula') return okJson({ ok: true, sumula: buscarSumula_((e.parameter && e.parameter.id) || '') });
    if (action === 'partida') return okJson(carregarPartida_((e.parameter && e.parameter.id) || ''));
    if (action === 'partidasFinalizadas') return okJson({ ok: true, partidas: listarPartidasFinalizadas_() });
    if (action === 'partidasAoVivo') return okJson({ ok: true, partidas: listarPartidasAoVivo_() });
    if (action === 'atletasTime') return okJson(atletasTime_((e.parameter && e.parameter.equipe) || ''));
    if (action === 'atletasEquipe') return okJson({ ok: true, atletas: listarAtletasEquipe_((e.parameter && e.parameter.equipe) || '') });
    if (action === 'atletasTodos') return okJson({ ok: true, atletas: listarTodosAtletas_() });
    if (action === 'equipesConhecidas') return okJson({ ok: true, equipes: listarEquipesConhecidas_() });
    // Só as equipes com PIN gerado (de verdade selecionadas/convidadas) — usado
    // na tela de cadastro de atletas do app, pra não listar as ~40 inscrições.
    if (action === 'equipesComPin') return okJson({ ok: true, equipes: listarEquipesComPin_() });
    if (action === 'statusConfirmacao') return okJson(statusConfirmacao_((e.parameter && e.parameter.equipe) || ''));
    // Só o painel usa isso (área administrativa) — lista quem já confirmou presença.
    if (action === 'confirmacoes') return okJson({ ok: true, confirmacoes: listarConfirmacoes_() });
    if (action === 'temPinEquipe') return okJson({ ok: true, temPin: !!buscarPinEquipe_((e.parameter && e.parameter.equipe) || '') });
    // Só o painel usa isso (área administrativa) — devolve o PIN de verdade.
    if (action === 'verPinEquipeAdmin') return okJson({ ok: true, pin: buscarPinEquipe_((e.parameter && e.parameter.equipe) || '') });
    if (action === 'verificarPinEquipe') {
      const okPin = verificarPin_((e.parameter && e.parameter.equipe) || '', (e.parameter && e.parameter.pin) || '');
      return okJson({ ok: okPin });
    }
    if (action === 'statusCadastroEquipes') return okJson({ ok: true, equipes: statusCadastroEquipes_() });
    if (action === 'avisos') return okJson({ ok: true, avisos: listarAvisos_(false) });
    if (action === 'statusTermo') return okJson(Object.assign({ ok: true, versao: TERMO_LGPD_VERSAO }, statusTermoLgpd_((e.parameter && e.parameter.equipe) || '')));
    if (action === 'fotosJogo') return okJson({ ok: true, fotos: fotosJogo_((e.parameter && e.parameter.jogo) || '') });
    if (action === 'verificarSenhaAdmin') return okJson({ ok: ((e.parameter && e.parameter.senha) || '') === getSenhaAdmin_() });
    if (action === 'partidasTodas') return okJson({ ok: true, partidas: listarPartidasTodas_() });
    if (action === 'relatorioCartoes') return okJson({ ok: true, cartoes: relatorioCartoes_() });
    if (action === 'listarPresencas') return okJson({ ok: true, presencas: listarPresencas_((e.parameter && e.parameter.jogo) || '') });
    if (action === 'listarJuizes') return okJson({ ok: true, juizes: listarJuizes_() });
    if (action === 'assinaturasEquipe') return okJson({ ok: true, assinaturas: assinaturasEquipe_((e.parameter && e.parameter.equipe) || '') });
    if (action === 'atletasEquipeApp') {
      const eq = (e.parameter && e.parameter.equipe) || '';
      const pin = (e.parameter && e.parameter.pin) || '';
      if (!verificarPin_(eq, pin)) return okJson({ ok: false, erro: 'PIN incorreto.' });
      return okJson({ ok: true, atletas: listarAtletasEquipe_(eq) });
    }

    return okJson({ ok: true, msg: 'Supercopa Vôlei — Destaque/Premiação/Galera OK' });
  } catch (ex) {
    return okJson({ ok: false, erro: ex.message });
  }
}

// ============================================================
//  ATLETA DESTAQUE
// ============================================================
function listarDestaquesV_() {
  const sh = getSS_().getSheetByName(ABA_DESTAQUE);
  if (sh.getLastRow() < 2) return { ok: true, destaques: [] };
  const rows = sh.getDataRange().getValues().slice(1);
  const destaques = rows.map((r, i) => ({
    _linha: i + 2, modalidade: r[0], jogo: r[1], nome: r[2], equipe: r[3], observacao: r[4], dataHora: r[5]
  })).filter(d => d.nome);
  return { ok: true, destaques: destaques };
}

// ============================================================
//  MELHORES DO CAMPEONATO
// ============================================================
function salvarPremiacaoV_(categoria, nome, equipe) {
  if (!categoria || !nome) return { ok: false, erro: 'Categoria e nome são obrigatórios' };
  const sh = getSS_().getSheetByName(ABA_PREMIACAO_V);
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][0] || '').toString().trim() === categoria) {
      sh.getRange(i + 1, 2, 1, 3).setValues([[nome, equipe || '', new Date().toLocaleString('pt-BR')]]);
      return { ok: true };
    }
  }
  sh.appendRow([categoria, nome, equipe || '', new Date().toLocaleString('pt-BR')]);
  return { ok: true };
}

function excluirPremiacaoV_(categoria) {
  const sh = getSS_().getSheetByName(ABA_PREMIACAO_V);
  const rows = sh.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if ((rows[i][0] || '').toString().trim() === categoria) { sh.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: true };
}

function listarPremiacaoV_() {
  const sh = getSS_().getSheetByName(ABA_PREMIACAO_V);
  if (sh.getLastRow() < 2) return { premiacao: [] };
  const rows = sh.getDataRange().getValues().slice(1);
  const premiacao = rows.map(r => ({
    categoria: (r[0] || '').toString().trim(),
    nome: (r[1] || '').toString().trim(),
    equipe: (r[2] || '').toString().trim(),
    atualizado: (r[3] || '').toString().trim()
  })).filter(p => p.categoria);
  return { premiacao: premiacao };
}

// ============================================================
//  DESTAQUE DA GALERA
// ============================================================
function montarRankingGaleraV_() {
  const sh = getSS_().getSheetByName(ABA_GALERA);
  if (sh.getLastRow() <= 1) return [];
  const rows = sh.getDataRange().getValues().slice(1);
  const contagem = {};
  rows.forEach(r => {
    const key = (r[1] || '').toString().trim();
    if (!key) return;
    if (!contagem[key]) contagem[key] = { atleta: key, time: (r[2] || '').toString().trim(), votos: 0 };
    contagem[key].votos++;
  });
  return Object.values(contagem).sort((a, b) => b.votos - a.votos).slice(0, 10);
}

// ============================================================
//  INSCRIÇÃO DE EQUIPES
// ============================================================
function inscreverEquipeV_(dados) {
  const nomeEquipe = (dados.nomeEquipe || '').toString().trim();
  if (!nomeEquipe) return { ok: false, status: 'erro', erro: 'Nome da equipe é obrigatório.', msg: 'Nome da equipe é obrigatório.' };

  const shCheck = getSS_().getSheetByName(ABA_INSCRICOES);
  if (shCheck && shCheck.getLastRow() >= 2) {
    const rows = shCheck.getDataRange().getValues();
    const headers = rows[0];
    const colEquipe = headers.indexOf('Nome da Equipe');
    const colModalidade = headers.indexOf('Modalidade');
    const jaInscrita = rows.slice(1).some(r =>
      (r[colEquipe] || '').toString().trim().toLowerCase() === nomeEquipe.toLowerCase() &&
      (r[colModalidade] || '').toString().trim().toLowerCase() === (dados.modalidade || '').toString().trim().toLowerCase()
    );
    if (jaInscrita) {
      const msg = 'Essa equipe já está inscrita nessa modalidade. Se precisar corrigir algo, fale com a organização.';
      return { ok: false, status: 'erro', erro: msg, msg: msg };
    }
  }

  let linkEscudo = '';
  if (dados.escudoBase64) {
    const partes = dados.escudoBase64.split(',');
    const bytes = Utilities.base64Decode(partes[1] || partes[0]);
    const blob = Utilities.newBlob(bytes, 'image/png', dados.escudoNome || 'escudo.png');
    const folder = DriveApp.getFolderById(FOLDER_ID_ESCUDOS);
    const file = folder.createFile(blob);
    // Não chama file.setSharing() aqui: a pasta já está compartilhada como
    // "Qualquer pessoa com o link" e o arquivo herda essa permissão sozinho.
    linkEscudo = file.getUrl();
  }

  const ss = getSS_();
  let sh = ss.getSheetByName(ABA_INSCRICOES);
  if (!sh) {
    sh = ss.insertSheet(ABA_INSCRICOES);
    sh.getRange(1, 1, 1, HEADERS_INSCRICOES.length).setValues([HEADERS_INSCRICOES]);
    sh.setFrozenRows(1);
  }

  sh.appendRow([
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

  return { ok: true, status: 'ok' };
}

function listarInscricoesV_() {
  const sh = getSS_().getSheetByName(ABA_INSCRICOES);
  if (!sh || sh.getLastRow() < 2) return { ok: true, headers: HEADERS_INSCRICOES, inscricoes: [] };
  const rows = sh.getDataRange().getValues();
  const headers = rows.shift();
  const inscricoes = rows.map((r, i) => {
    const obj = { _linha: i + 2 };
    headers.forEach((h, j) => obj[h] = r[j]);
    return obj;
  }).filter(o => o['Nome da Equipe']);
  return { ok: true, headers: headers, inscricoes: inscricoes };
}

// ============================================================
//  SÚMULA DIGITAL
// ============================================================
// IDs que começam com "TESTE" são um modo sandbox: usados pra
// treinar/testar o console de arbitragem sem tocar em nenhuma
// linha real da planilha de jogos, e ficam de fora das listagens
// públicas (partidasAoVivo/partidasFinalizadas) — não aparecem
// no site nem no app.
function ehJogoTeste_(id) {
  return /^TESTE/.test((id || '').toString().trim().toUpperCase());
}

function resolverJogoSumula_(id) {
  id = (id || '').toString().trim().toUpperCase();
  if (ehJogoTeste_(id)) return { aba: 'TESTE', linha: 0, id: id };
  if (ROW_MAP_GRUPOS[id]) return { aba: ABA_GRUPOS, linha: ROW_MAP_GRUPOS[id], id: id };
  if (ROW_MAP_MATA[id]) return { aba: ABA_MATA, linha: ROW_MAP_MATA[id], id: id };
  return null;
}

function carregarJogoSumula_(id) {
  const jogo = resolverJogoSumula_(id);
  if (!jogo) return { ok: false, erro: 'Jogo não encontrado: ' + id };

  if (jogo.aba === 'TESTE') {
    return { ok: true, id: jogo.id, aba: 'TESTE', linha: 0, numero: jogo.id, equipeA: '', equipeB: '', sets: [{ a: '', b: '' }, { a: '', b: '' }, { a: '', b: '' }], sumula: buscarSumula_(id) };
  }

  const shJogo = SpreadsheetApp.openById(JOGOS_SHEET_ID).getSheetByName(jogo.aba);
  const row = shJogo.getRange(jogo.linha, 1, 1, 17).getValues()[0];

  const equipeA = (row[1] || '').toString().trim();
  const equipeB = (row[11] || '').toString().trim();

  return {
    ok: true,
    id: jogo.id,
    aba: jogo.aba,
    linha: jogo.linha,
    numero: row[0],
    equipeA: equipeA,
    equipeB: equipeB,
    sets: [
      { a: row[2], b: row[7] },
      { a: row[3], b: row[8] },
      { a: row[4], b: row[9] }
    ],
    sumula: buscarSumula_(id)
  };
}

function buscarSumula_(id) {
  id = (id || '').toString().trim().toUpperCase();
  if (!id) return null;
  const sh = getSS_().getSheetByName(ABA_SUMULAS);
  if (!sh || sh.getLastRow() < 2) return null;
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][0] || '').toString().trim().toUpperCase() === id) {
      return {
        idJogo: rows[i][0], aba: rows[i][1], linha: rows[i][2],
        equipeCasa: rows[i][3], equipeVisitante: rows[i][4],
        titularesCasa: parseJson_(rows[i][5], []), liberoCasa: rows[i][6],
        titularesVisitante: parseJson_(rows[i][7], []), liberoVisitante: rows[i][8],
        sets: parseJson_(rows[i][9], []),
        timeoutsCasa: parseJson_(rows[i][10], []), timeoutsVisitante: parseJson_(rows[i][11], []),
        cartoes: parseJson_(rows[i][12], []), substituicoes: parseJson_(rows[i][13], []),
        arbitro: rows[i][14], anotador: rows[i][15], local: rows[i][16],
        status: rows[i][17], atualizadoEm: rows[i][18]
      };
    }
  }
  return null;
}

function parseJson_(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch (ex) { return fallback; }
}

function salvarSumula_(d) {
  const jogo = resolverJogoSumula_(d.id);
  if (!jogo) return { ok: false, erro: 'Jogo não encontrado: ' + d.id };

  const sets = (d.sets || []).slice(0, 3);
  while (sets.length < 3) sets.push({ a: '', b: '' });

  const setsVencidosA = sets.filter(s => parseInt(s.a || 0) > parseInt(s.b || 0)).length;
  const setsVencidosB = sets.filter(s => parseInt(s.b || 0) > parseInt(s.a || 0)).length;
  let vencedor = '—';
  if (setsVencidosA > setsVencidosB) vencedor = d.equipeA || '';
  else if (setsVencidosB > setsVencidosA) vencedor = d.equipeB || '';

  // O placar simplificado (Fase de Grupos/Mata-Mata) é gravado pelo
  // PRÓPRIO sumula.html, direto no Apps Script que já tem permissão
  // de escrita naquela planilha (o mesmo do botão "Enviar Placar"
  // no painel) — este script não tem acesso de escrita lá.

  // Grava/atualiza o registro completo da súmula.
  const ss = getSS_();
  let sh = ss.getSheetByName(ABA_SUMULAS);
  if (!sh) {
    sh = ss.insertSheet(ABA_SUMULAS);
    sh.getRange(1, 1, 1, HEADERS_SUMULAS.length).setValues([HEADERS_SUMULAS]);
    sh.setFrozenRows(1);
  }

  const agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  const linhaDados = [
    jogo.id, jogo.aba, jogo.linha, d.equipeA || '', d.equipeB || '',
    JSON.stringify(d.titularesA || []), d.liberoA || '',
    JSON.stringify(d.titularesB || []), d.liberoB || '',
    JSON.stringify(sets),
    JSON.stringify(d.timeoutsA || []), JSON.stringify(d.timeoutsB || []),
    JSON.stringify(d.cartoes || []), JSON.stringify(d.substituicoes || []),
    d.arbitro || '', d.anotador || '', d.local || '',
    d.status || 'Encerrada', agora
  ];

  const rows = sh.getDataRange().getValues();
  let achou = false;
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][0] || '').toString().trim().toUpperCase() === jogo.id) {
      sh.getRange(i + 1, 1, 1, linhaDados.length).setValues([linhaDados]);
      achou = true;
      break;
    }
  }
  if (!achou) sh.appendRow(linhaDados);

  return { ok: true, setsVencidosA: setsVencidosA, setsVencidosB: setsVencidosB, vencedor: vencedor };
}

// ============================================================
//  CONSOLE DE ARBITRAGEM AO VIVO — PARTIDAS
// ============================================================
function getPartidasSheet_() {
  const ss = getSS_();
  let sh = ss.getSheetByName(ABA_PARTIDAS);
  if (!sh) {
    sh = ss.insertSheet(ABA_PARTIDAS);
    sh.getRange(1, 1, 1, HEADERS_PARTIDAS.length).setValues([HEADERS_PARTIDAS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function acharLinhaPartida_(sh, id) {
  id = (id || '').toString().trim().toUpperCase();
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][PC.id] || '').toString().trim().toUpperCase() === id) return { linha: i + 1, dados: rows[i] };
  }
  return null;
}

function linhaParaEstado_(row) {
  const estado = {
    id: row[PC.id], aba: row[PC.aba], linha: row[PC.linha],
    equipeCasa: row[PC.equipeCasa], equipeVisitante: row[PC.equipeVisitante],
    elencoCasa: parseJson_(row[PC.elencoCasa], { titulares: [], libero: null }),
    elencoVisitante: parseJson_(row[PC.elencoVisitante], { titulares: [], libero: null }),
    arbitro1: row[PC.arbitro1], arbitro2: row[PC.arbitro2], apontador: row[PC.apontador],
    setAtual: Number(row[PC.setAtual]) || 1, pontosCasa: Number(row[PC.pontosCasa]) || 0, pontosVisitante: Number(row[PC.pontosVisitante]) || 0,
    setsCasa: Number(row[PC.setsCasa]) || 0, setsVisitante: Number(row[PC.setsVisitante]) || 0,
    sacando: row[PC.sacando],
    rotacaoCasa: parseJson_(row[PC.rotacaoCasa], []), rotacaoVisitante: parseJson_(row[PC.rotacaoVisitante], []),
    primeiroSaqueSet: row[PC.primeiroSaqueSet],
    historicoSets: parseJson_(row[PC.historicoSets], []),
    timeouts: parseJson_(row[PC.timeouts], []),
    cartoes: parseJson_(row[PC.cartoes], []),
    substituicoes: parseJson_(row[PC.substituicoes], []),
    status: row[PC.status], linkPdf: row[PC.linkPdf],
    criadoEm: row[PC.criadoEm], atualizadoEm: row[PC.atualizadoEm],
    capitaoCasa: row[PC.capitaoCasa] || '', capitaoVisitante: row[PC.capitaoVisitante] || '',
    observacoes: row[PC.observacoes] || '',
    historicoPontos: parseJson_(row[PC.historicoPontos], []),
    capitaoQuadraCasa: row[PC.capitaoQuadraCasa] || row[PC.capitaoCasa] || '',
    capitaoQuadraVisitante: row[PC.capitaoQuadraVisitante] || row[PC.capitaoVisitante] || '',
    rotacaoConfirmadaSet: Number(row[PC.rotacaoConfirmadaSet]) || 1,
    escalacoesPorSet: parseJson_(row[PC.escalacoesPorSet], {}),
    horariosSets: parseJson_(row[PC.horariosSets], {})
  };
  // Rede de segurança: se por qualquer motivo (concorrência, cota do
  // Google, etc.) a linha ficou com 2 sets pra um lado mas o status
  // não foi atualizado pra "sets_completos", corrige na leitura —
  // evita o sintoma de pedir escalação de um set que nunca deveria
  // ter começado numa partida já decidida.
  if (estado.status === 'em_andamento' && (estado.setsCasa >= 2 || estado.setsVisitante >= 2)) {
    estado.status = 'sets_completos';
  }
  return estado;
}

function criarPartida_(d) {
  const jogo = resolverJogoSumula_(d.id);
  if (!jogo) return { ok: false, erro: 'Jogo não encontrado: ' + d.id };

  const sh = getPartidasSheet_();
  const existente = acharLinhaPartida_(sh, jogo.id);
  const agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  const sacaPrimeiro = (d.sacaPrimeiro === 'B') ? 'B' : 'A';
  const rotA = (d.elencoCasa && d.elencoCasa.titulares) ? d.elencoCasa.titulares.slice(0, 6) : [];
  const rotB = (d.elencoVisitante && d.elencoVisitante.titulares) ? d.elencoVisitante.titulares.slice(0, 6) : [];

  const linhaDados = [];
  linhaDados[PC.id] = jogo.id;
  linhaDados[PC.aba] = jogo.aba;
  linhaDados[PC.linha] = jogo.linha;
  linhaDados[PC.equipeCasa] = d.equipeA || '';
  linhaDados[PC.equipeVisitante] = d.equipeB || '';
  linhaDados[PC.elencoCasa] = JSON.stringify(d.elencoCasa || { titulares: [], libero: null });
  linhaDados[PC.elencoVisitante] = JSON.stringify(d.elencoVisitante || { titulares: [], libero: null });
  linhaDados[PC.arbitro1] = d.arbitro1 || '';
  linhaDados[PC.arbitro2] = d.arbitro2 || '';
  linhaDados[PC.apontador] = d.apontador || '';
  linhaDados[PC.setAtual] = 1;
  linhaDados[PC.pontosCasa] = 0;
  linhaDados[PC.pontosVisitante] = 0;
  linhaDados[PC.setsCasa] = 0;
  linhaDados[PC.setsVisitante] = 0;
  linhaDados[PC.sacando] = sacaPrimeiro;
  linhaDados[PC.rotacaoCasa] = JSON.stringify(rotA);
  linhaDados[PC.rotacaoVisitante] = JSON.stringify(rotB);
  linhaDados[PC.primeiroSaqueSet] = sacaPrimeiro;
  linhaDados[PC.historicoSets] = JSON.stringify([]);
  linhaDados[PC.timeouts] = JSON.stringify([]);
  linhaDados[PC.cartoes] = JSON.stringify([]);
  linhaDados[PC.substituicoes] = JSON.stringify([]);
  linhaDados[PC.eventosLog] = JSON.stringify([]);
  linhaDados[PC.status] = 'em_andamento';
  linhaDados[PC.linkPdf] = '';
  linhaDados[PC.criadoEm] = agora;
  linhaDados[PC.atualizadoEm] = agora;
  linhaDados[PC.capitaoCasa] = d.capitaoCasa || '';
  linhaDados[PC.capitaoVisitante] = d.capitaoVisitante || '';
  linhaDados[PC.observacoes] = '';
  linhaDados[PC.historicoPontos] = JSON.stringify([]);
  linhaDados[PC.capitaoQuadraCasa] = d.capitaoCasa || '';
  linhaDados[PC.capitaoQuadraVisitante] = d.capitaoVisitante || '';
  linhaDados[PC.rotacaoConfirmadaSet] = 1;
  linhaDados[PC.escalacoesPorSet] = JSON.stringify({});
  linhaDados[PC.horariosSets] = JSON.stringify({ 1: agora });

  const existenteInfo = acharLinhaPartida_(sh, jogo.id);
  if (existenteInfo) {
    sh.getRange(existenteInfo.linha, 1, 1, linhaDados.length).setValues([linhaDados]);
  } else {
    sh.appendRow(linhaDados);
  }

  return { ok: true, estado: linhaParaEstado_(linhaDados) };
}

function carregarPartida_(id) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + id };
  return { ok: true, estado: linhaParaEstado_(info.dados) };
}

// Limite do Google Sheets: 50.000 caracteres por célula. Passar disso derruba a gravação
// no meio da linha (placar salvo, mas histórico/escalação/hora não) e a resposta vira uma
// página de erro HTML. Estas travas garantem que nenhuma célula chega perto do limite.
const LIMITE_CELULA_ = 45000;
function cabeNaCelula_(valor) {
  let s = JSON.stringify(valor);
  if (s.length <= LIMITE_CELULA_) return s;
  if (Array.isArray(valor)) {
    const l = valor.slice();
    while (l.length > 1 && s.length > LIMITE_CELULA_) { l.shift(); s = JSON.stringify(l); }
  }
  return s.length <= LIMITE_CELULA_ ? s : '[]';
}

function salvarLinhaPartida_(sh, linhaNum, estado) {
  const linhaDados = [];
  linhaDados[PC.id] = estado.id;
  linhaDados[PC.aba] = estado.aba;
  linhaDados[PC.linha] = estado.linha;
  linhaDados[PC.equipeCasa] = estado.equipeCasa;
  linhaDados[PC.equipeVisitante] = estado.equipeVisitante;
  linhaDados[PC.elencoCasa] = JSON.stringify(estado.elencoCasa || {});
  linhaDados[PC.elencoVisitante] = JSON.stringify(estado.elencoVisitante || {});
  linhaDados[PC.arbitro1] = estado.arbitro1;
  linhaDados[PC.arbitro2] = estado.arbitro2;
  linhaDados[PC.apontador] = estado.apontador;
  linhaDados[PC.setAtual] = estado.setAtual;
  linhaDados[PC.pontosCasa] = estado.pontosCasa;
  linhaDados[PC.pontosVisitante] = estado.pontosVisitante;
  linhaDados[PC.setsCasa] = estado.setsCasa;
  linhaDados[PC.setsVisitante] = estado.setsVisitante;
  linhaDados[PC.sacando] = estado.sacando;
  linhaDados[PC.rotacaoCasa] = JSON.stringify(estado.rotacaoCasa || []);
  linhaDados[PC.rotacaoVisitante] = JSON.stringify(estado.rotacaoVisitante || []);
  linhaDados[PC.primeiroSaqueSet] = estado.primeiroSaqueSet;
  linhaDados[PC.historicoSets] = JSON.stringify(estado.historicoSets || []);
  linhaDados[PC.timeouts] = JSON.stringify(estado.timeouts || []);
  linhaDados[PC.cartoes] = JSON.stringify(estado.cartoes || []);
  linhaDados[PC.substituicoes] = JSON.stringify(estado.substituicoes || []);
  linhaDados[PC.eventosLog] = cabeNaCelula_(estado._eventosLog || []);
  linhaDados[PC.status] = estado.status;
  linhaDados[PC.linkPdf] = estado.linkPdf || '';
  linhaDados[PC.criadoEm] = estado.criadoEm;
  linhaDados[PC.atualizadoEm] = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  linhaDados[PC.capitaoCasa] = estado.capitaoCasa || '';
  linhaDados[PC.capitaoVisitante] = estado.capitaoVisitante || '';
  linhaDados[PC.observacoes] = (estado.observacoes || '').toString().slice(0, 40000);
  linhaDados[PC.historicoPontos] = cabeNaCelula_(estado.historicoPontos || []);
  linhaDados[PC.capitaoQuadraCasa] = estado.capitaoQuadraCasa || '';
  linhaDados[PC.capitaoQuadraVisitante] = estado.capitaoQuadraVisitante || '';
  linhaDados[PC.rotacaoConfirmadaSet] = estado.rotacaoConfirmadaSet || 1;
  linhaDados[PC.escalacoesPorSet] = JSON.stringify(estado.escalacoesPorSet || {});
  linhaDados[PC.horariosSets] = JSON.stringify(estado.horariosSets || {});
  sh.getRange(linhaNum, 1, 1, linhaDados.length).setValues([linhaDados]);
}

function rotacionar_(arr) {
  if (!arr || arr.length < 2) return arr || [];
  return arr.slice(1).concat([arr[0]]);
}

// Aplica um ponto pra equipe informada diretamente no objeto estado
// (rotação/saque/placar/fechamento de set). Usado tanto pelo ponto
// manual quanto pelo cartão vermelho (que soma ponto pro adversário).
function aplicarPontoNoEstado_(estado, equipe) {
  if (equipe !== estado.sacando) {
    if (equipe === 'A') estado.rotacaoCasa = rotacionar_(estado.rotacaoCasa);
    else estado.rotacaoVisitante = rotacionar_(estado.rotacaoVisitante);
    estado.sacando = equipe;
  }

  if (equipe === 'A') estado.pontosCasa++; else estado.pontosVisitante++;
  // .concat em vez de .push pra não mutar o array que já foi
  // guardado no snapshot de desfazer (senão o undo desfaria errado).
  // Guarda hora e placar resultante — usado no PDF pra mostrar o
  // histórico ponto a ponto de cada set com horário.
  estado.historicoPontos = (estado.historicoPontos || []).concat([{
    set: estado.setAtual, equipe: equipe, hora: new Date().toLocaleTimeString('pt-BR'),
    pontosCasa: estado.pontosCasa, pontosVisitante: estado.pontosVisitante
  }]);

  let setFechado = false;
  const a = estado.pontosCasa, b = estado.pontosVisitante;
  if ((a >= 25 || b >= 25) && Math.abs(a - b) >= 2) {
    setFechado = true;
    estado.historicoSets.push({ a: a, b: b });
    if (a > b) estado.setsCasa++; else estado.setsVisitante++;
    estado.pontosCasa = 0; estado.pontosVisitante = 0;
    estado.setAtual++;
    estado.primeiroSaqueSet = (estado.primeiroSaqueSet === 'A') ? 'B' : 'A';
    estado.sacando = estado.primeiroSaqueSet;
    if (estado.setsCasa >= 2 || estado.setsVisitante >= 2) estado.status = 'sets_completos';
    estado.horariosSets = estado.horariosSets || {};
    estado.horariosSets[estado.setAtual] = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  }
  return setFechado;
}

// O log de eventos (usado só pra "desfazer último evento") guardava
// TODOS os snapshots da partida desde o início, sem limite — numa
// partida de teste reaproveitada por várias sessões isso passou de
// 50.000 caracteres numa única célula da planilha (limite do Sheets)
// e toda gravação passou a falhar. O desfazer só usa o último
// snapshot (rawEventos.pop()), então guardar mais que uns poucos é
// desperdício puro — por isso o cap aqui.
var EVENTOS_LOG_MAX_ = 10;
function empurrarEventoLog_(rawEventos, estado) {
  rawEventos.push(snapshotEstado_(estado));
  if (rawEventos.length > EVENTOS_LOG_MAX_) {
    rawEventos.splice(0, rawEventos.length - EVENTOS_LOG_MAX_);
  }
  return rawEventos;
}

function snapshotEstado_(estado) {
  return {
    setAtual: estado.setAtual, pontosCasa: estado.pontosCasa, pontosVisitante: estado.pontosVisitante,
    setsCasa: estado.setsCasa, setsVisitante: estado.setsVisitante, sacando: estado.sacando,
    rotacaoCasa: estado.rotacaoCasa, rotacaoVisitante: estado.rotacaoVisitante,
    primeiroSaqueSet: estado.primeiroSaqueSet, historicoSets: estado.historicoSets, status: estado.status,
    histN: (estado.historicoPontos || []).length
  };
}

function registrarPonto_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  if (estado.status !== 'em_andamento') return { ok: false, erro: 'Partida não está em andamento.' };
  if ((estado.rotacaoConfirmadaSet || 1) < estado.setAtual) return { ok: false, erro: 'Confirme a escalação (ordem de saque) do set ' + estado.setAtual + ' antes de pontuar.' };
  const equipe = d.equipe === 'B' ? 'B' : 'A';

  // snapshot para permitir desfazer
  const rawEventos = parseJson_(info.dados[PC.eventosLog], []);
  estado._eventosLog = empurrarEventoLog_(rawEventos, estado);

  const setFechado = aplicarPontoNoEstado_(estado, equipe);

  salvarLinhaPartida_(sh, info.linha, estado);

  if (setFechado) {
    try { empurrarPlacarParaJogos_(estado); } catch (ex) { /* não interrompe o fluxo */ }
  }

  delete estado._eventosLog;
  return { ok: true, estado: estado };
}

// Correção manual: tira 1 ponto do time (marcação errada), sem
// mexer em rotação/saque — é só ajuste de placar, não um rally.
function pontoMenos_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  if (estado.status !== 'em_andamento') return { ok: false, erro: 'Partida não está em andamento.' };
  const equipe = d.equipe === 'B' ? 'B' : 'A';

  const rawEventos = parseJson_(info.dados[PC.eventosLog], []);
  estado._eventosLog = empurrarEventoLog_(rawEventos, estado);

  if (equipe === 'A') estado.pontosCasa = Math.max(0, estado.pontosCasa - 1);
  else estado.pontosVisitante = Math.max(0, estado.pontosVisitante - 1);

  // Remove o último ponto marcado desse time no histórico (não
  // necessariamente o último ponto geral, já que a correção pode
  // ser feita bem depois do lance).
  const hist = (estado.historicoPontos || []).slice();
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i].equipe === equipe) { hist.splice(i, 1); break; }
  }
  estado.historicoPontos = hist;

  salvarLinhaPartida_(sh, info.linha, estado);
  delete estado._eventosLog;
  return { ok: true, estado: estado };
}

// Define quem é o capitão "em quadra" no momento (pode ser diferente
// do capitão oficial se ele tiver sido substituído ou não estiver
// entre os titulares) — regra do vôlei exige sempre ter um em quadra.
function definirCapitaoQuadra_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  if (d.equipe === 'B') estado.capitaoQuadraVisitante = d.numero || '';
  else estado.capitaoQuadraCasa = d.numero || '';
  estado._eventosLog = parseJson_(info.dados[PC.eventosLog], []);
  salvarLinhaPartida_(sh, info.linha, estado);
  delete estado._eventosLog;
  return { ok: true, estado: estado };
}

// A cada set novo o técnico pode escalar a quadra numa ordem
// diferente (regra do vôlei) — isso registra a escalação enviada
// pra esse set e libera a pontuação (registrarPonto_ bloqueia até
// aqui ser chamado).
function definirEscalacaoSet_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  if (estado.status !== 'em_andamento') return { ok: false, erro: 'Partida não está em andamento.' };
  const rotA = (d.rotacaoCasa || []).slice(0, 6);
  const rotB = (d.rotacaoVisitante || []).slice(0, 6);
  if (rotA.filter(p => p && p.nome).length < 6 || rotB.filter(p => p && p.nome).length < 6) {
    return { ok: false, erro: 'Preencha as 6 posições de quadra das duas equipes.' };
  }
  estado.rotacaoCasa = rotA;
  estado.rotacaoVisitante = rotB;
  estado.rotacaoConfirmadaSet = estado.setAtual;
  if (d.capitaoQuadraCasa) estado.capitaoQuadraCasa = d.capitaoQuadraCasa;
  if (d.capitaoQuadraVisitante) estado.capitaoQuadraVisitante = d.capitaoQuadraVisitante;
  // Guarda a escalação confirmada DESTE set à parte — rotacaoCasa/
  // rotacaoVisitante vão ser sobrescritas na escalação do próximo
  // set, então sem isso a súmula final só saberia a escalação do
  // último set jogado.
  estado.escalacoesPorSet = estado.escalacoesPorSet || {};
  estado.escalacoesPorSet[estado.setAtual] = {
    rotacaoCasa: rotA, rotacaoVisitante: rotB,
    capitaoQuadraCasa: estado.capitaoQuadraCasa, capitaoQuadraVisitante: estado.capitaoQuadraVisitante
  };
  estado._eventosLog = parseJson_(info.dados[PC.eventosLog], []);
  salvarLinhaPartida_(sh, info.linha, estado);
  delete estado._eventosLog;
  return { ok: true, estado: estado };
}

function desfazerPonto_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  const rawEventos = parseJson_(info.dados[PC.eventosLog], []);
  if (!rawEventos.length) return { ok: false, erro: 'Nada para desfazer.' };
  const snap = rawEventos.pop();
  estado.setAtual = snap.setAtual; estado.pontosCasa = snap.pontosCasa; estado.pontosVisitante = snap.pontosVisitante;
  estado.setsCasa = snap.setsCasa; estado.setsVisitante = snap.setsVisitante; estado.sacando = snap.sacando;
  estado.rotacaoCasa = snap.rotacaoCasa; estado.rotacaoVisitante = snap.rotacaoVisitante;
  estado.primeiroSaqueSet = snap.primeiroSaqueSet; estado.historicoSets = snap.historicoSets; estado.status = snap.status;
  estado.historicoPontos = snap.historicoPontos ? snap.historicoPontos : (estado.historicoPontos || []).slice(0, snap.histN || 0);
  estado._eventosLog = rawEventos;
  salvarLinhaPartida_(sh, info.linha, estado);
  delete estado._eventosLog;
  return { ok: true, estado: estado };
}

function registrarTimeout_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  const equipe = d.equipe === 'B' ? 'B' : 'A';
  const jaPedidos = estado.timeouts.filter(t => t.equipe === equipe && t.set === estado.setAtual).length;
  if (jaPedidos >= 2) return { ok: false, erro: 'Essa equipe já pediu os 2 tempos técnicos permitidos neste set.' };
  estado.timeouts.push({ equipe: equipe, set: estado.setAtual, hora: new Date().toLocaleTimeString('pt-BR') });
  estado._eventosLog = parseJson_(info.dados[PC.eventosLog], []);
  salvarLinhaPartida_(sh, info.linha, estado);
  delete estado._eventosLog;
  return { ok: true, estado: estado };
}

// Apaga uma partida da aba "Partidas" (não mexe na planilha de
// jogos nem desfaz nenhum placar já publicado lá). Usado pra
// limpar partidas de teste/engano.
function excluirPartida_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  sh.deleteRow(info.linha);
  return { ok: true };
}

function atualizarObservacoes_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  estado.observacoes = (d.observacoes || '').toString();
  estado._eventosLog = parseJson_(info.dados[PC.eventosLog], []);
  salvarLinhaPartida_(sh, info.linha, estado);
  delete estado._eventosLog;
  return { ok: true, estado: estado };
}

function registrarCartao_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  estado.cartoes.push({ equipe: d.equipe, jogador: d.jogador || '', tipo: d.tipo || 'Amarelo', motivo: d.motivo || '', set: estado.setAtual });

  // Cartão vermelho soma ponto automático pro adversário (regra CBV).
  const rawEventos = parseJson_(info.dados[PC.eventosLog], []);
  let setFechado = false;
  if (d.tipo === 'Vermelho' && estado.status === 'em_andamento') {
    empurrarEventoLog_(rawEventos, estado);
    const equipeAdversaria = d.equipe === 'A' ? 'B' : 'A';
    setFechado = aplicarPontoNoEstado_(estado, equipeAdversaria);
  }
  estado._eventosLog = rawEventos;

  salvarLinhaPartida_(sh, info.linha, estado);

  if (setFechado) {
    try { empurrarPlacarParaJogos_(estado); } catch (ex) { /* não interrompe o fluxo */ }
  }

  delete estado._eventosLog;
  return { ok: true, estado: estado };
}

function registrarSubstituicao_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  estado.substituicoes.push({ equipe: d.equipe, saiu: d.saiu || '', entrou: d.entrou || '', set: estado.setAtual });
  const rot = d.equipe === 'A' ? estado.rotacaoCasa : estado.rotacaoVisitante;
  const idx = rot.findIndex(p => (p.nome || '') === d.saiu);
  if (idx >= 0) rot[idx] = { numero: d.numeroEntrou || '', nome: d.entrou || '' };
  estado._eventosLog = parseJson_(info.dados[PC.eventosLog], []);
  salvarLinhaPartida_(sh, info.linha, estado);
  delete estado._eventosLog;
  return { ok: true, estado: estado };
}

function removerEvento_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  const chave = { timeout: 'timeouts', cartao: 'cartoes', substituicao: 'substituicoes' }[d.tipo];
  if (chave && estado[chave] && d.index >= 0 && d.index < estado[chave].length) estado[chave].splice(d.index, 1);
  estado._eventosLog = parseJson_(info.dados[PC.eventosLog], []);
  salvarLinhaPartida_(sh, info.linha, estado);
  delete estado._eventosLog;
  return { ok: true, estado: estado };
}

function finalizarPartida_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  estado.status = 'finalizada';
  if (d.linkPdf) estado.linkPdf = d.linkPdf;
  estado._eventosLog = parseJson_(info.dados[PC.eventosLog], []);
  salvarLinhaPartida_(sh, info.linha, estado);
  delete estado._eventosLog;
  try { empurrarPlacarParaJogos_(estado, true); } catch (ex) { /* não interrompe */ }
  return { ok: true, estado: estado };
}

// Rode esta função DIRETO NO EDITOR (▶ Executar) uma vez. Ela só
// tenta chamar o outro Apps Script (o que grava na Fase de Grupos)
// — isso força o Google a pedir autorização de "conexões externas"
// caso ainda não tenha sido concedida.
function testarUrlFetch() {
  try {
    const resp = UrlFetchApp.fetch(PLACAR_SCRIPT_URL + '?action=teste', { muteHttpExceptions: true });
    Logger.log('OK — status: ' + resp.getResponseCode() + ' — corpo: ' + resp.getContentText().slice(0, 200));
  } catch (ex) {
    Logger.log('ERRO: ' + ex.message);
  }
}

function empurrarPlacarParaJogos_(estado, isFinal) {
  const jogo = resolverJogoSumula_(estado.id);
  if (!jogo || jogo.aba === 'TESTE') return;
  const hs = estado.historicoSets || [];
  const numero = /^[A-D]\d$/.test(estado.id) ? estado.id.slice(1) : estado.id;
  let vencedor = '';
  if (isFinal) {
    if (estado.setsCasa > estado.setsVisitante) vencedor = estado.equipeCasa;
    else if (estado.setsVisitante > estado.setsCasa) vencedor = estado.equipeVisitante;
  }
  const dadosArray = [
    numero, estado.equipeCasa,
    (hs[0] ? hs[0].a : '').toString(), (hs[1] ? hs[1].a : '').toString(), (hs[2] ? hs[2].a : '').toString(),
    estado.setsCasa.toString(), 'X',
    (hs[0] ? hs[0].b : '').toString(), (hs[1] ? hs[1].b : '').toString(), (hs[2] ? hs[2].b : '').toString(),
    estado.setsVisitante.toString(), estado.equipeVisitante,
    estado.setsCasa.toString(), estado.setsVisitante.toString(),
    vencedor, '', ''
  ];
  UrlFetchApp.fetch(PLACAR_SCRIPT_URL, {
    method: 'post',
    contentType: 'text/plain',
    payload: JSON.stringify({ acao: 'atualizar_placar_volei', aba: jogo.aba, linha: jogo.linha, dados: dadosArray }),
    muteHttpExceptions: true
  });
}

function listarPartidasAoVivo_() {
  const sh = getPartidasSheet_();
  if (sh.getLastRow() < 2) return [];
  const rows = sh.getDataRange().getValues().slice(1);
  return rows.filter(r => (r[PC.status] === 'em_andamento' || r[PC.status] === 'sets_completos') && !ehJogoTeste_(r[PC.id])).map(r => ({
    id: r[PC.id], equipeCasa: r[PC.equipeCasa], equipeVisitante: r[PC.equipeVisitante],
    setAtual: r[PC.setAtual], pontosCasa: r[PC.pontosCasa], pontosVisitante: r[PC.pontosVisitante],
    setsCasa: r[PC.setsCasa], setsVisitante: r[PC.setsVisitante],
    historicoSets: parseJson_(r[PC.historicoSets], []),
    status: r[PC.status]
  }));
}

function listarPartidasFinalizadas_() {
  const sh = getPartidasSheet_();
  if (sh.getLastRow() < 2) return [];
  const rows = sh.getDataRange().getValues().slice(1);
  return rows.filter(r => r[PC.status] === 'finalizada' && !ehJogoTeste_(r[PC.id])).map(r => ({
    id: r[PC.id], equipeCasa: r[PC.equipeCasa], equipeVisitante: r[PC.equipeVisitante],
    setsCasa: r[PC.setsCasa], setsVisitante: r[PC.setsVisitante],
    historicoSets: parseJson_(r[PC.historicoSets], []),
    linkPdf: r[PC.linkPdf], atualizadoEm: r[PC.atualizadoEm]
  })).reverse();
}

function atletasTime_(equipe) {
  equipe = (equipe || '').toString().trim().toLowerCase();
  if (!equipe) return { ok: true, atletas: [] };
  const nomes = {};
  const ss = getSS_();
  [ABA_DESTAQUE].forEach(nomeAba => {
    const sh = ss.getSheetByName(nomeAba);
    if (!sh || sh.getLastRow() < 2) return;
    const rows = sh.getDataRange().getValues().slice(1);
    rows.forEach(r => {
      const eq = (r[3] || '').toString().trim().toLowerCase();
      const nome = (r[2] || '').toString().trim();
      if (eq === equipe && nome) nomes[nome] = true;
    });
  });
  const shGalera = ss.getSheetByName(ABA_GALERA);
  if (shGalera && shGalera.getLastRow() >= 2) {
    const rows = shGalera.getDataRange().getValues().slice(1);
    rows.forEach(r => {
      const eq = (r[2] || '').toString().trim().toLowerCase();
      const nome = (r[1] || '').toString().trim();
      if (eq === equipe && nome) nomes[nome] = true;
    });
  }
  return { ok: true, atletas: Object.keys(nomes).map(n => ({ nome: n })) };
}

// ============================================================
//  CADASTRO DE ATLETAS
// ============================================================
function getAtletasSheet_() {
  const ss = getSS_();
  let sh = ss.getSheetByName(ABA_ATLETAS);
  if (!sh) {
    sh = ss.insertSheet(ABA_ATLETAS);
    sh.getRange(1, 1, 1, HEADERS_ATLETAS.length).setValues([HEADERS_ATLETAS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

// Tipos aceitos: 'Atleta' (até 14 por equipe) e os dois papéis fixos
// da comissão técnica, 'Técnico' e 'Auxiliar Técnico' (1 de cada,
// até 2 no total). 'Comissão Técnica' genérico ainda é aceito como
// entrada pra não quebrar registros antigos, mas vira 'Técnico'.
function normalizarTipoAtleta_(tipoBruto) {
  const t = (tipoBruto || '').toString().trim();
  if (t === 'Técnico' || t === 'Auxiliar Técnico') return t;
  if (t === 'Comissão Técnica') return 'Técnico';
  return 'Atleta';
}
function ehComissaoTecnica_(tipo) { return tipo === 'Técnico' || tipo === 'Auxiliar Técnico' || tipo === 'Comissão Técnica'; }

function cadastrarAtleta_(d) {
  const equipe = (d.equipe || '').toString().trim();
  const numero = (d.numero || '').toString().trim();
  const nome = (d.nome || '').toString().trim();
  const tipo = normalizarTipoAtleta_(d.tipo);
  if (!equipe || !nome) return { ok: false, erro: 'Equipe e nome são obrigatórios.' };

  const sh = getAtletasSheet_();
  const rows = sh.getDataRange().getValues();

  // Atualiza se já existir o mesmo número nessa equipe; senão adiciona.
  if (numero) {
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][0] || '').toString().trim().toLowerCase() === equipe.toLowerCase() &&
          (rows[i][1] || '').toString().trim() === numero) {
        sh.getRange(i + 1, 3, 1, 2).setValues([[nome, tipo]]);
        return { ok: true, atualizado: true };
      }
    }
  }

  const ehComissao = ehComissaoTecnica_(tipo);
  const linhasEquipe = rows.slice(1).filter(r => (r[0] || '').toString().trim().toLowerCase() === equipe.toLowerCase());

  if (ehComissao) {
    // Não deixa cadastrar dois "Técnico" ou dois "Auxiliar Técnico" na mesma equipe.
    const jaTemEsseCargo = linhasEquipe.some(r => normalizarTipoAtleta_(r[3]) === tipo);
    if (jaTemEsseCargo) return { ok: false, erro: 'Essa equipe já tem um(a) ' + tipo + ' cadastrado(a).' };
    const totalComissao = linhasEquipe.filter(r => ehComissaoTecnica_(normalizarTipoAtleta_(r[3]))).length;
    if (totalComissao >= LIMITE_COMISSAO) return { ok: false, erro: 'Limite de ' + LIMITE_COMISSAO + ' membros da comissão técnica já foi atingido pra essa equipe.' };
  } else {
    const totalAtletas = linhasEquipe.filter(r => normalizarTipoAtleta_(r[3]) === 'Atleta').length;
    if (totalAtletas >= LIMITE_ATLETAS) return { ok: false, erro: 'Limite de ' + LIMITE_ATLETAS + ' atletas já foi atingido pra essa equipe.' };
  }

  const agora = new Date();
  sh.appendRow([equipe, numero, nome, tipo, agora]);
  return { ok: true };
}

function removerAtleta_(d) {
  const equipe = (d.equipe || '').toString().trim().toLowerCase();
  const numero = (d.numero || '').toString().trim();
  const nome = (d.nome || '').toString().trim();
  const sh = getAtletasSheet_();
  const rows = sh.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    const eqOk = (rows[i][0] || '').toString().trim().toLowerCase() === equipe;
    const numOk = numero ? (rows[i][1] || '').toString().trim() === numero : true;
    const nomeOk = (rows[i][2] || '').toString().trim() === nome;
    if (eqOk && numOk && nomeOk) { sh.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: false, erro: 'Atleta não encontrado.' };
}

function listarAtletasEquipe_(equipe) {
  equipe = (equipe || '').toString().trim().toLowerCase();
  if (!equipe) return [];
  const sh = getAtletasSheet_();
  if (sh.getLastRow() < 2) return [];
  const rows = sh.getDataRange().getValues().slice(1);
  return rows.filter(r => (r[0] || '').toString().trim().toLowerCase() === equipe)
    .map(r => ({ equipe: r[0], numero: (r[1] || '').toString(), nome: r[2], tipo: (r[3] || 'Atleta').toString() }))
    .filter(a => a.nome);
}

function listarTodosAtletas_() {
  const sh = getAtletasSheet_();
  if (sh.getLastRow() < 2) return [];
  const rows = sh.getDataRange().getValues().slice(1);
  return rows.map(r => ({ equipe: r[0], numero: (r[1] || '').toString(), nome: r[2], tipo: (r[3] || 'Atleta').toString() })).filter(a => a.nome);
}

// ============================================================
//  PIN DE ACESSO POR EQUIPE
// ============================================================
function getEquipesPinSheet_() {
  const ss = getSS_();
  let sh = ss.getSheetByName(ABA_EQUIPES_PIN);
  if (!sh) {
    sh = ss.insertSheet(ABA_EQUIPES_PIN);
    sh.getRange(1, 1, 1, HEADERS_EQUIPES_PIN.length).setValues([HEADERS_EQUIPES_PIN]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function buscarPinEquipe_(equipe) {
  equipe = (equipe || '').toString().trim().toLowerCase();
  if (!equipe) return null;
  const sh = getEquipesPinSheet_();
  if (sh.getLastRow() < 2) return null;
  const rows = sh.getDataRange().getValues().slice(1);
  for (let i = 0; i < rows.length; i++) {
    if ((rows[i][0] || '').toString().trim().toLowerCase() === equipe) return (rows[i][1] || '').toString();
  }
  return null;
}

function verificarPin_(equipe, pin) {
  const real = buscarPinEquipe_(equipe);
  if (!real) return false;
  return real === (pin || '').toString().trim();
}

// Chamado pelo painel: gera (ou substitui) o PIN de 4 dígitos de
// uma equipe, pra você mandar junto do convite/confirmação.
function gerarPinEquipe_(d) {
  migrarDatasConvitesUmaVez_();
  const equipe = (d.equipe || '').toString().trim();
  if (!equipe) return { ok: false, erro: 'Equipe é obrigatória.' };

  const pin = (Math.floor(1000 + Math.random() * 9000)).toString();
  const sh = getEquipesPinSheet_();
  const rows = sh.getDataRange().getValues();
  const agora = new Date();

  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][0] || '').toString().trim().toLowerCase() === equipe.toLowerCase()) {
      sh.getRange(i + 1, 2, 1, 2).setValues([[pin, agora]]);
      return { ok: true, equipe: equipe, pin: pin };
    }
  }
  sh.appendRow([equipe, pin, agora]);
  return { ok: true, equipe: equipe, pin: pin };
}

function cadastrarAtletaApp_(d) {
  if (!verificarPin_(d.equipe, d.pin)) return { ok: false, erro: 'PIN incorreto. Confirme o PIN da sua equipe.' };
  if (new Date() > PRAZO_CADASTRO_ATLETAS) return { ok: false, erro: 'Prazo de cadastro/edição de atletas encerrado em 27/11/2026 às 13h.' };
  return cadastrarAtleta_(d);
}

function removerAtletaApp_(d) {
  if (!verificarPin_(d.equipe, d.pin)) return { ok: false, erro: 'PIN incorreto. Confirme o PIN da sua equipe.' };
  if (new Date() > PRAZO_CADASTRO_ATLETAS) return { ok: false, erro: 'Prazo de cadastro/edição de atletas encerrado em 27/11/2026 às 13h.' };
  return removerAtleta_(d);
}

// ============================================================
//  EQUIPES COM PIN E PRESENÇA CONFIRMADA (só quem recebeu o convite
//  E assinou o termo de presença — usado no app pra não listar nem
//  as ~40 inscrições nem as que só receberam o PIN mas ainda não
//  confirmaram) + escudo de cada uma (vem da aba Inscricoes)
// ============================================================
function listarEquipesComPin_() {
  const sh = getEquipesPinSheet_();
  if (sh.getLastRow() < 2) return [];
  const confirmadas = {};
  listarConfirmacoes_().forEach(c => { confirmadas[c.equipe.toLowerCase()] = true; });

  const nomes = sh.getDataRange().getValues().slice(1)
    .map(r => (r[0] || '').toString().trim())
    .filter(n => n && confirmadas[n.toLowerCase()]);

  const escudos = {};
  try {
    const shInsc = getSS_().getSheetByName(ABA_INSCRICOES);
    if (shInsc && shInsc.getLastRow() >= 2) {
      const rows = shInsc.getDataRange().getValues();
      const headers = rows[0];
      const colEquipe = headers.indexOf('Nome da Equipe');
      const colEscudo = headers.indexOf('Link do Escudo');
      if (colEquipe >= 0 && colEscudo >= 0) {
        rows.slice(1).forEach(r => {
          const n = (r[colEquipe] || '').toString().trim();
          if (n) escudos[n] = (r[colEscudo] || '').toString().trim();
        });
      }
    }
  } catch (ex) { /* escudo é opcional, não quebra o fluxo */ }

  return nomes.sort().map(n => ({ equipe: n, escudo: escudos[n] || '' }));
}

// ============================================================
//  CONFIRMAÇÃO DE PRESENÇA (equipe assina o termo depois do convite)
// ============================================================
function getConfirmacoesSheet_() {
  const ss = getSS_();
  let sh = ss.getSheetByName(ABA_CONFIRMACOES);
  if (!sh) {
    sh = ss.insertSheet(ABA_CONFIRMACOES);
    sh.getRange(1, 1, 1, HEADERS_CONFIRMACOES.length).setValues([HEADERS_CONFIRMACOES]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function confirmarPresenca_(d) {
  migrarDatasConvitesUmaVez_();
  if (!verificarPin_(d.equipe, d.pin)) return { ok: false, erro: 'PIN incorreto. Confirme o PIN da sua equipe.' };
  const equipe = (d.equipe || '').toString().trim();
  const sh = getConfirmacoesSheet_();
  const rows = sh.getDataRange().getValues();
  const agora = new Date();
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][0] || '').toString().trim().toLowerCase() === equipe.toLowerCase()) {
      // Já tinha confirmado antes — só atualiza a data (reenvio do mesmo termo).
      sh.getRange(i + 1, 2, 1, 2).setValues([[agora, 'Sim']]);
      return { ok: true, confirmadoEm: dataBR_(agora) };
    }
  }
  sh.appendRow([equipe, agora, 'Sim']);
  return { ok: true, confirmadoEm: dataBR_(agora) };
}

// Convites e confirmações antigos foram gravados como texto dd/MM/yyyy; a planilha
// (em formato de data dos EUA) leu como MM/dd e trocou dia por mês. Roda uma única
// vez (e antes de qualquer gravação nova) e desfaz a troca.
function migrarDatasConvitesUmaVez_() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('DATAS_CONVITES_MIGRADAS')) return;
  const trocar = v => (v instanceof Date && v.getDate() <= 12)
    ? new Date(v.getFullYear(), v.getDate() - 1, v.getMonth() + 1, v.getHours(), v.getMinutes(), v.getSeconds())
    : v;
  const corrige = (sh, col) => {
    if (sh.getLastRow() < 2) return;
    const r = sh.getRange(2, col, sh.getLastRow() - 1, 1);
    r.setValues(r.getValues().map(x => [trocar(x[0])]));
  };
  corrige(getEquipesPinSheet_(), 3);
  corrige(getConfirmacoesSheet_(), 2);
  props.setProperty('DATAS_CONVITES_MIGRADAS', '1');
}

// A planilha converte o texto da data em data de verdade; devolve sempre dd/MM/yyyy HH:mm:ss.
function dataBR_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  return (v || '').toString();
}

function statusConfirmacao_(equipe) {
  equipe = (equipe || '').toString().trim().toLowerCase();
  if (!equipe) return { ok: true, confirmado: false };
  const sh = getConfirmacoesSheet_();
  if (sh.getLastRow() < 2) return { ok: true, confirmado: false };
  const rows = sh.getDataRange().getValues().slice(1);
  for (let i = 0; i < rows.length; i++) {
    if ((rows[i][0] || '').toString().trim().toLowerCase() === equipe) {
      return { ok: true, confirmado: true, confirmadoEm: dataBR_(rows[i][1]) };
    }
  }
  return { ok: true, confirmado: false };
}

function listarConfirmacoes_() {
  migrarDatasConvitesUmaVez_();
  const sh = getConfirmacoesSheet_();
  if (sh.getLastRow() < 2) return [];
  return sh.getDataRange().getValues().slice(1)
    .map(r => ({ equipe: (r[0] || '').toString(), confirmadoEm: dataBR_(r[1]) }))
    .filter(c => c.equipe)
    .sort((a, b) => a.equipe.localeCompare(b.equipe));
}

function listarEquipesConhecidas_() {
  const nomes = {};
  const ss = getSS_();
  const shInsc = ss.getSheetByName(ABA_INSCRICOES);
  if (shInsc && shInsc.getLastRow() >= 2) {
    const rows = shInsc.getDataRange().getValues();
    const headers = rows[0];
    const colEquipe = headers.indexOf('Nome da Equipe');
    if (colEquipe >= 0) {
      rows.slice(1).forEach(r => { const n = (r[colEquipe] || '').toString().trim(); if (n) nomes[n] = true; });
    }
  }
  try {
    const shJogos = SpreadsheetApp.openById(JOGOS_SHEET_ID).getSheetByName(ABA_GRUPOS);
    const rows = shJogos.getDataRange().getValues();
    Object.keys(ROW_MAP_GRUPOS).forEach(id => {
      const linha = ROW_MAP_GRUPOS[id] - 1;
      const a = (rows[linha] && rows[linha][1] || '').toString().trim();
      const b = (rows[linha] && rows[linha][11] || '').toString().trim();
      if (a) nomes[a] = true;
      if (b) nomes[b] = true;
    });
  } catch (ex) { /* leitura é opcional, não quebra o fluxo */ }
  return Object.keys(nomes).sort();
}

// ── PDF DA SÚMULA ───────────────────────────────────────────
function getPdfFolder_() {
  let id = PropertiesService.getScriptProperties().getProperty('PDF_FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (ex) { /* recria abaixo */ }
  }
  const folder = DriveApp.createFolder('Supercopa Vôlei - Súmulas PDF');
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  PropertiesService.getScriptProperties().setProperty('PDF_FOLDER_ID', folder.getId());
  return folder;
}

function uploadPdfSumula_(d) {
  if (!d.pdfBase64) return { ok: false, erro: 'PDF vazio.' };
  const bytes = Utilities.base64Decode(d.pdfBase64.split(',').pop());
  const blob = Utilities.newBlob(bytes, 'application/pdf', d.nomeArquivo || ('sumula-' + d.id + '.pdf'));
  const folder = getPdfFolder_();
  const file = folder.createFile(blob);
  return { ok: true, link: file.getUrl(), linkDownload: 'https://drive.google.com/uc?export=download&id=' + file.getId() };
}

// ============================================================
//  SÚMULA 2.0 — lote de eventos, juízes e assinaturas
// ============================================================
const SENHA_ADMIN_PADRAO_ = '5912';
function getSenhaAdmin_() {
  return PropertiesService.getScriptProperties().getProperty('SENHA_ADMIN') || SENHA_ADMIN_PADRAO_;
}
const ABA_JUIZES = 'Juizes';
const ABA_ASSINATURAS = 'Assinaturas';
const LIMITE_ASSINATURA_CHARS = 45000;

function abaOuCria_(nome, headers) {
  const ss = getSS_();
  let sh = ss.getSheetByName(nome);
  if (!sh) {
    sh = ss.insertSheet(nome);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function agoraStr_() {
  return new Date();
}

function assinaturaValida_(s) {
  s = (s || '').toString();
  if (s.indexOf('data:image/png;base64,') !== 0) return 'Assinatura inválida.';
  if (s.length > LIMITE_ASSINATURA_CHARS) return 'Assinatura muito grande — desenhe de forma mais simples.';
  return '';
}

// Aplica vários eventos (ponto, tempo, cartão...) numa única chamada:
// lê a linha da partida UMA vez, aplica tudo em memória na ordem em que
// o painel registrou e grava UMA vez. O servidor continua dono das regras
// do jogo (mesmas funções de rotação/fechamento de set).
function aplicarEventoLote_(estado, log, tipo, dd) {
  const eq = dd.equipe === 'B' ? 'B' : 'A';
  if (tipo === 'ponto') {
    if (estado.status !== 'em_andamento') return { erro: 'Partida não está em andamento.' };
    if ((estado.rotacaoConfirmadaSet || 1) < estado.setAtual) return { erro: 'Confirme a escalação do set ' + estado.setAtual + ' antes de pontuar.' };
    empurrarEventoLog_(log, estado);
    return { setFechado: aplicarPontoNoEstado_(estado, eq) };
  }
  if (tipo === 'pontoMenos') {
    if (estado.status !== 'em_andamento') return { erro: 'Partida não está em andamento.' };
    empurrarEventoLog_(log, estado);
    if (eq === 'A') estado.pontosCasa = Math.max(0, estado.pontosCasa - 1);
    else estado.pontosVisitante = Math.max(0, estado.pontosVisitante - 1);
    const hist = (estado.historicoPontos || []).slice();
    for (let i = hist.length - 1; i >= 0; i--) { if (hist[i].equipe === eq) { hist.splice(i, 1); break; } }
    estado.historicoPontos = hist;
    return {};
  }
  if (tipo === 'timeout') {
    const jaPedidos = estado.timeouts.filter(t => t.equipe === eq && t.set === estado.setAtual).length;
    if (jaPedidos >= 2) return { erro: 'Essa equipe já pediu os 2 tempos técnicos permitidos neste set.' };
    estado.timeouts.push({ equipe: eq, set: estado.setAtual, hora: new Date().toLocaleTimeString('pt-BR') });
    return {};
  }
  if (tipo === 'cartao') {
    estado.cartoes.push({ equipe: dd.equipe, jogador: dd.jogador || '', tipo: dd.tipo || 'Amarelo', motivo: dd.motivo || '', set: estado.setAtual });
    if (dd.tipo === 'Vermelho' && estado.status === 'em_andamento') {
      empurrarEventoLog_(log, estado);
      return { setFechado: aplicarPontoNoEstado_(estado, dd.equipe === 'A' ? 'B' : 'A') };
    }
    return {};
  }
  if (tipo === 'substituicao') {
    estado.substituicoes.push({ equipe: dd.equipe, saiu: dd.saiu || '', entrou: dd.entrou || '', set: estado.setAtual });
    const rot = dd.equipe === 'A' ? estado.rotacaoCasa : estado.rotacaoVisitante;
    const idx = rot.findIndex(p => p && (p.nome || '') === dd.saiu);
    if (idx >= 0) rot[idx] = { numero: dd.numeroEntrou || '', nome: dd.entrou || '' };
    return {};
  }
  if (tipo === 'definirEscalacaoSet') {
    if (estado.status !== 'em_andamento') return { erro: 'Partida não está em andamento.' };
    const rotA = (dd.rotacaoCasa || []).slice(0, 6);
    const rotB = (dd.rotacaoVisitante || []).slice(0, 6);
    if (rotA.filter(p => p && p.nome).length < 6 || rotB.filter(p => p && p.nome).length < 6) return { erro: 'Preencha as 6 posições de quadra das duas equipes.' };
    estado.rotacaoCasa = rotA;
    estado.rotacaoVisitante = rotB;
    estado.rotacaoConfirmadaSet = estado.setAtual;
    if (dd.capitaoQuadraCasa) estado.capitaoQuadraCasa = dd.capitaoQuadraCasa;
    if (dd.capitaoQuadraVisitante) estado.capitaoQuadraVisitante = dd.capitaoQuadraVisitante;
    estado.escalacoesPorSet = estado.escalacoesPorSet || {};
    estado.escalacoesPorSet[estado.setAtual] = {
      rotacaoCasa: rotA, rotacaoVisitante: rotB,
      capitaoQuadraCasa: estado.capitaoQuadraCasa, capitaoQuadraVisitante: estado.capitaoQuadraVisitante
    };
    return {};
  }
  if (tipo === 'definirCapitaoQuadra') {
    if (dd.equipe === 'B') estado.capitaoQuadraVisitante = dd.numero || '';
    else estado.capitaoQuadraCasa = dd.numero || '';
    return {};
  }
  if (tipo === 'atualizarObservacoes') {
    estado.observacoes = (dd.observacoes || '').toString();
    return {};
  }
  if (tipo === 'removerEvento') {
    const chave = { timeout: 'timeouts', cartao: 'cartoes', substituicao: 'substituicoes' }[dd.tipo];
    if (chave && estado[chave] && dd.index >= 0 && dd.index < estado[chave].length) estado[chave].splice(dd.index, 1);
    return {};
  }
  return { erro: 'tipo inválido: ' + tipo };
}

function processarEventosLote_(d) {
  const eventos = d.eventos || [];
  // loteId garante que um reenvio (resposta perdida) não aplique os
  // mesmos pontos duas vezes.
  const cache = CacheService.getScriptCache();
  const chaveLote = d.loteId ? ('lote_' + d.id + '_' + d.loteId) : '';
  if (chaveLote && cache.get(chaveLote)) {
    const atualDup = carregarPartida_(d.id);
    return atualDup.ok ? { ok: true, estado: atualDup.estado, erros: [], processados: 0, duplicado: true } : atualDup;
  }
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  const log = parseJson_(info.dados[PC.eventosLog], []);
  const erros = [];
  let setFechado = false;
  eventos.forEach((ev, i) => {
    try {
      const r = aplicarEventoLote_(estado, log, ev.tipo, ev.dados || {});
      if (r && r.erro) erros.push({ indice: i, tipo: ev.tipo, erro: r.erro });
      else if (r && r.setFechado) setFechado = true;
    } catch (ex) {
      erros.push({ indice: i, tipo: ev.tipo, erro: ex.message });
    }
  });
  estado._eventosLog = log;
  salvarLinhaPartida_(sh, info.linha, estado);
  delete estado._eventosLog;
  if (chaveLote) cache.put(chaveLote, '1', 21600);
  if (setFechado) {
    try { empurrarPlacarParaJogos_(estado); } catch (ex) { /* não interrompe o fluxo */ }
  }
  return { ok: true, estado: estado, erros: erros, processados: eventos.length - erros.length };
}

function listarJuizes_() {
  const sh = abaOuCria_(ABA_JUIZES, ['Nome', 'Assinatura', 'Criado em']);
  const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues() : [];
  return rows.filter(r => r[0]).map(r => ({ nome: r[0].toString(), assinatura: (r[1] || '').toString() }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

function cadastrarJuiz_(d) {
  const nome = (d.nome || '').toString().trim();
  if (!nome) return { ok: false, erro: 'Informe o nome do juiz.' };
  const erroAss = assinaturaValida_(d.assinatura);
  if (erroAss) return { ok: false, erro: erroAss };
  const sh = abaOuCria_(ABA_JUIZES, ['Nome', 'Assinatura', 'Criado em']);
  const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues() : [];
  const idx = rows.findIndex(r => r[0].toString().trim().toLowerCase() === nome.toLowerCase());
  if (idx >= 0) {
    sh.getRange(idx + 2, 2).setValue(d.assinatura);
    return { ok: true, atualizado: true };
  }
  sh.appendRow([nome, d.assinatura, agoraStr_()]);
  return { ok: true };
}

function removerJuiz_(d) {
  const nome = (d.nome || '').toString().trim().toLowerCase();
  const sh = abaOuCria_(ABA_JUIZES, ['Nome', 'Assinatura', 'Criado em']);
  const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues() : [];
  const idx = rows.findIndex(r => r[0].toString().trim().toLowerCase() === nome);
  if (idx < 0) return { ok: false, erro: 'Juiz não encontrado.' };
  sh.deleteRow(idx + 2);
  return { ok: true };
}

function assinaturasEquipe_(equipe) {
  const sh = abaOuCria_(ABA_ASSINATURAS, ['Equipe', 'Papel', 'Assinatura', 'Atualizado em']);
  const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues() : [];
  const alvo = (equipe || '').toString().trim().toLowerCase();
  const out = {};
  rows.forEach(r => {
    if (r[0].toString().trim().toLowerCase() === alvo) out[r[1].toString()] = (r[2] || '').toString();
  });
  return out;
}

// App da equipe: exige o PIN da equipe (mesmo padrão do cadastro de atletas).
function salvarAssinatura_(d) {
  const equipe = (d.equipe || '').toString().trim();
  const papel = d.papel === 'capitao' ? 'capitao' : (d.papel === 'tecnico' ? 'tecnico' : '');
  if (!equipe || !papel) return { ok: false, erro: 'Equipe e papel são obrigatórios.' };
  if (!verificarPin_(equipe, d.pin)) return { ok: false, erro: 'PIN incorreto.' };
  const erroAss = assinaturaValida_(d.assinatura);
  if (erroAss) return { ok: false, erro: erroAss };
  const sh = abaOuCria_(ABA_ASSINATURAS, ['Equipe', 'Papel', 'Assinatura', 'Atualizado em']);
  const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues() : [];
  const idx = rows.findIndex(r => r[0].toString().trim().toLowerCase() === equipe.toLowerCase() && r[1] === papel);
  if (idx >= 0) sh.getRange(idx + 2, 3, 1, 2).setValues([[d.assinatura, agoraStr_()]]);
  else sh.appendRow([equipe, papel, d.assinatura, agoraStr_()]);
  return { ok: true };
}

// Painel: situação do cadastro de cada equipe com PIN (atletas, comissão
// técnica e assinaturas) — pra cobrar quem ainda falta.
function statusCadastroEquipes_() {
  migrarDatasConvitesUmaVez_();
  const shPin = getEquipesPinSheet_();
  if (shPin.getLastRow() < 2) return [];
  const confirmou = {};
  listarConfirmacoes_().forEach(c => { confirmou[c.equipe.toLowerCase()] = c.confirmadoEm; });
  const gerado = {};
  const tz = Session.getScriptTimeZone();
  shPin.getDataRange().getValues().slice(1).forEach(r => {
    const n = (r[0] || '').toString().trim().toLowerCase();
    if (n) gerado[n] = (r[2] instanceof Date) ? Utilities.formatDate(r[2], tz, 'dd/MM/yyyy HH:mm:ss') : (r[2] || '').toString();
  });
  const porEquipe = {};
  listarTodosAtletas_().forEach(a => {
    const k = (a.equipe || '').toString().trim().toLowerCase();
    (porEquipe[k] = porEquipe[k] || []).push(a);
  });
  const lgpdOk = {};
  try {
    const shL = abaOuCria_(ABA_CONSENTIMENTOS, HEADERS_CONSENTIMENTOS);
    if (shL.getLastRow() > 1) shL.getRange(2, 1, shL.getLastRow() - 1, 4).getValues().forEach(r => { if (r[3] === TERMO_LGPD_VERSAO) lgpdOk[(r[0] || '').toString().trim().toLowerCase()] = true; });
  } catch (ex) { /* sem o dado de LGPD segue */ }
  const shAss = abaOuCria_(ABA_ASSINATURAS, ['Equipe', 'Papel', 'Assinatura', 'Atualizado em']);
  const assRows = shAss.getLastRow() > 1 ? shAss.getRange(2, 1, shAss.getLastRow() - 1, 3).getValues() : [];
  const ass = {};
  assRows.forEach(r => { if (r[2]) ass[(r[0] || '').toString().trim().toLowerCase() + '|' + r[1]] = true; });
  return shPin.getDataRange().getValues().slice(1)
    .map(r => (r[0] || '').toString().trim()).filter(Boolean).sort()
    .map(nome => {
      const k = nome.toLowerCase();
      const lista = porEquipe[k] || [];
      return {
        equipe: nome,
        confirmou: !!confirmou[k],
        geradoEm: gerado[k] || '',
        confirmadoEm: confirmou[k] || '',
        atletas: lista.filter(a => a.tipo === 'Atleta').length,
        tecnico: lista.some(a => a.tipo === 'Técnico' || a.tipo === 'Comissão Técnica'),
        auxiliar: lista.some(a => a.tipo === 'Auxiliar Técnico'),
        assTecnico: !!ass[k + '|tecnico'],
        assCapitao: !!ass[k + '|capitao'],
        lgpd: !!lgpdOk[k]
      };
    });
}

// ── Senha de liberação (cadastro de atleta no painel) ──────────
function trocarSenhaAdmin_(d) {
  if ((d.senhaAtual || '').toString() !== getSenhaAdmin_()) return { ok: false, erro: 'Senha atual incorreta.' };
  const nova = (d.novaSenha || '').toString().trim();
  if (nova.length < 4) return { ok: false, erro: 'A nova senha precisa ter pelo menos 4 caracteres.' };
  PropertiesService.getScriptProperties().setProperty('SENHA_ADMIN', nova);
  return { ok: true };
}

// ── Resumo dos jogos / reabrir súmula ───────────────────────────
function listarPartidasTodas_() {
  const sh = getPartidasSheet_();
  if (sh.getLastRow() < 2) return [];
  return sh.getDataRange().getValues().slice(1)
    .filter(r => r[PC.id] && !ehJogoTeste_(r[PC.id]))
    .map(r => ({
      id: r[PC.id], equipeCasa: r[PC.equipeCasa], equipeVisitante: r[PC.equipeVisitante],
      setAtual: r[PC.setAtual], pontosCasa: r[PC.pontosCasa], pontosVisitante: r[PC.pontosVisitante],
      setsCasa: r[PC.setsCasa], setsVisitante: r[PC.setsVisitante],
      status: r[PC.status], linkPdf: r[PC.linkPdf]
    }));
}

function reabrirPartida_(d) {
  const sh = getPartidasSheet_();
  const info = acharLinhaPartida_(sh, d.id);
  if (!info) return { ok: false, erro: 'Partida não encontrada: ' + d.id };
  const estado = linhaParaEstado_(info.dados);
  if (estado.status !== 'finalizada') return { ok: false, erro: 'A partida não está finalizada.' };
  estado.status = (estado.setsCasa >= 2 || estado.setsVisitante >= 2) ? 'sets_completos' : 'em_andamento';
  estado._eventosLog = parseJson_(info.dados[PC.eventosLog], []);
  salvarLinhaPartida_(sh, info.linha, estado);
  delete estado._eventosLog;
  return { ok: true, estado: estado };
}

// ── Relatório de cartões (todas as partidas reais) ──────────────
function relatorioCartoes_() {
  const sh = getPartidasSheet_();
  if (sh.getLastRow() < 2) return [];
  const out = [];
  sh.getDataRange().getValues().slice(1).forEach(r => {
    if (!r[PC.id] || ehJogoTeste_(r[PC.id])) return;
    const cartoes = parseJson_(r[PC.cartoes], []);
    cartoes.forEach(c => {
      out.push({
        jogo: r[PC.id],
        equipe: c.equipe === 'A' ? r[PC.equipeCasa] : r[PC.equipeVisitante],
        adversario: c.equipe === 'A' ? r[PC.equipeVisitante] : r[PC.equipeCasa],
        set: c.set, jogador: c.jogador || '', tipo: c.tipo || '', motivo: c.motivo || '',
        status: r[PC.status]
      });
    });
  });
  return out;
}

// ── Presença na entrada (leitura do QR da carteirinha) ──────────
const ABA_PRESENCAS = 'Presencas';
const HEADERS_PRESENCAS = ['Registrado em', 'Jogo', 'Equipe', 'Número', 'Nome', 'Tipo'];
function registrarPresenca_(d) {
  const equipe = (d.equipe || '').toString().trim();
  const nome = (d.nome || '').toString().trim();
  if (!equipe || !nome) return { ok: false, erro: 'Equipe e nome são obrigatórios.' };
  const jogo = (d.jogo || '').toString().trim();
  const sh = abaOuCria_(ABA_PRESENCAS, HEADERS_PRESENCAS);
  const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues() : [];
  const ja = rows.some(r => r[1] === jogo && r[2] === equipe && r[3].toString() === (d.numero || '').toString() && r[4] === nome);
  if (ja) return { ok: true, jaRegistrado: true };
  sh.appendRow([agoraStr_(), jogo, equipe, (d.numero || '').toString(), nome, (d.tipo || 'Atleta').toString()]);
  return { ok: true, jaRegistrado: false };
}
function listarPresencas_(jogo) {
  const sh = abaOuCria_(ABA_PRESENCAS, HEADERS_PRESENCAS);
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues()
    .filter(r => !jogo || r[1] === jogo)
    .map(r => ({ em: dataBR_(r[0]), jogo: r[1], equipe: r[2], numero: r[3].toString(), nome: r[4], tipo: r[5] }));
}

// ── Backup diário da planilha ───────────────────────────────────
// Rode configurarBackupDiario() UMA vez no editor (▶ Executar) e
// autorize. Depois disso o Google faz uma cópia por dia, de madrugada,
// numa pasta "Supercopa Vôlei - Backups", mantendo as últimas 14.
function backupPlanilha_() {
  const ss = getSS_();
  const pastas = DriveApp.getFoldersByName('Supercopa Vôlei - Backups');
  const pasta = pastas.hasNext() ? pastas.next() : DriveApp.createFolder('Supercopa Vôlei - Backups');
  const nome = 'Backup ' + ss.getName() + ' ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH-mm');
  DriveApp.getFileById(ss.getId()).makeCopy(nome, pasta);
  const arquivos = [];
  const it = pasta.getFiles();
  while (it.hasNext()) { const a = it.next(); arquivos.push({ f: a, t: a.getDateCreated().getTime() }); }
  arquivos.sort((a, b) => b.t - a.t);
  arquivos.slice(14).forEach(x => x.f.setTrashed(true));
  return nome;
}
function backupDiario() { backupPlanilha_(); }
function configurarBackupDiario() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'backupDiario').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('backupDiario').timeBased().everyDays(1).atHour(3).create();
  const nome = backupPlanilha_();
  Logger.log('Backup agendado (todo dia ~3h). Primeira cópia criada agora: ' + nome);
}

// ============================================================
//  USUÁRIOS E PAPÉIS DO PAINEL
//  admin: tudo · organizacao: tudo menos usuários · mesa: só súmula
//  · juiz: só acompanha (PWA do árbitro 2)
// ============================================================
const PAPEIS_PAINEL = ['admin', 'organizacao', 'mesa', 'juiz'];
function usuariosPainel_() {
  let l = [];
  try { l = JSON.parse(PropertiesService.getScriptProperties().getProperty('USUARIOS_PAINEL') || '[]'); } catch (e) { l = []; }
  if (!l.length) l = [{ usuario: 'Diego', senha: '5912', papel: 'admin' }];
  return l;
}
function salvarUsuariosPainel_(l) {
  PropertiesService.getScriptProperties().setProperty('USUARIOS_PAINEL', JSON.stringify(l));
}
function autenticarPainel_(auth) {
  if (!auth) return null;
  const u = (auth.usuario || '').toString().trim().toLowerCase();
  const s = (auth.senha || '').toString();
  if (!u || !s) return null;
  const f = usuariosPainel_().find(x => (x.usuario || '').toString().toLowerCase() === u && (x.senha || '').toString() === s);
  return f ? { usuario: f.usuario, papel: f.papel } : null;
}
function exigirPapel_(auth, papeis) {
  const u = autenticarPainel_(auth);
  if (!u) return { erro: 'Login inválido.' };
  if (papeis.indexOf(u.papel) < 0) return { erro: 'Seu perfil não tem permissão para essa ação.' };
  return { usuario: u };
}
function loginPainel_(d) {
  const u = autenticarPainel_(d.auth || d);
  return u ? { ok: true, usuario: u.usuario, papel: u.papel } : { ok: false, erro: 'Usuário ou senha incorretos.' };
}
function listarUsuariosPainel_(d) {
  const c = exigirPapel_(d.auth, ['admin']); if (c.erro) return { ok: false, erro: c.erro };
  return { ok: true, usuarios: usuariosPainel_().map(u => ({ usuario: u.usuario, papel: u.papel })) };
}
function salvarUsuarioPainel_(d) {
  const c = exigirPapel_(d.auth, ['admin']); if (c.erro) return { ok: false, erro: c.erro };
  const usuario = (d.usuario || '').toString().trim();
  const senha = (d.senha || '').toString();
  if (!usuario || usuario.length < 3) return { ok: false, erro: 'O usuário precisa ter pelo menos 3 caracteres.' };
  if (PAPEIS_PAINEL.indexOf(d.papel) < 0) return { ok: false, erro: 'Perfil inválido.' };
  const l = usuariosPainel_();
  const i = l.findIndex(x => x.usuario.toLowerCase() === usuario.toLowerCase());
  if (i >= 0) {
    if (senha) { if (senha.length < 4) return { ok: false, erro: 'A senha precisa ter pelo menos 4 caracteres.' }; l[i].senha = senha; }
    if (l[i].papel === 'admin' && d.papel !== 'admin' && l.filter(x => x.papel === 'admin').length < 2) return { ok: false, erro: 'Precisa existir pelo menos um administrador.' };
    l[i].papel = d.papel;
  } else {
    if (senha.length < 4) return { ok: false, erro: 'A senha precisa ter pelo menos 4 caracteres.' };
    l.push({ usuario: usuario, senha: senha, papel: d.papel });
  }
  salvarUsuariosPainel_(l);
  return { ok: true };
}
function removerUsuarioPainel_(d) {
  const c = exigirPapel_(d.auth, ['admin']); if (c.erro) return { ok: false, erro: c.erro };
  const alvo = (d.usuario || '').toString().trim().toLowerCase();
  const l = usuariosPainel_();
  const x = l.find(u => u.usuario.toLowerCase() === alvo);
  if (!x) return { ok: false, erro: 'Usuário não encontrado.' };
  if (x.papel === 'admin' && l.filter(u => u.papel === 'admin').length < 2) return { ok: false, erro: 'Precisa existir pelo menos um administrador.' };
  salvarUsuariosPainel_(l.filter(u => u.usuario.toLowerCase() !== alvo));
  return { ok: true };
}

// ============================================================
//  MURAL DE AVISOS (publicados no painel, exibidos no app)
// ============================================================
const ABA_AVISOS = 'Avisos';
const HEADERS_AVISOS = ['ID', 'Criado em', 'Título', 'Texto', 'Fixado', 'Ativo'];
function listarAvisos_(incluirInativos) {
  const sh = abaOuCria_(ABA_AVISOS, HEADERS_AVISOS);
  if (sh.getLastRow() < 2) return [];
  const l = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues()
    .map(r => ({ id: r[0].toString(), criadoEm: dataBR_(r[1]), titulo: r[2].toString(), texto: r[3].toString(), fixado: r[4] === true || r[4] === 'TRUE' || r[4] === 'true', ativo: !(r[5] === false || r[5] === 'FALSE' || r[5] === 'false') }))
    .filter(a => a.id && (incluirInativos || a.ativo));
  l.reverse();
  l.sort((a, b) => (b.fixado ? 1 : 0) - (a.fixado ? 1 : 0));
  return l.slice(0, 30);
}
function salvarAviso_(d) {
  const c = exigirPapel_(d.auth, ['admin', 'organizacao']); if (c.erro) return { ok: false, erro: c.erro };
  const titulo = (d.titulo || '').toString().trim();
  const texto = (d.texto || '').toString().trim();
  if (!titulo) return { ok: false, erro: 'Informe o título do aviso.' };
  const sh = abaOuCria_(ABA_AVISOS, HEADERS_AVISOS);
  const fixado = d.fixado === true || d.fixado === 'true';
  if (d.id) {
    const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues() : [];
    const i = rows.findIndex(r => r[0].toString() === d.id.toString());
    if (i < 0) return { ok: false, erro: 'Aviso não encontrado.' };
    sh.getRange(i + 2, 3, 1, 3).setValues([[titulo, texto, fixado]]);
    return { ok: true };
  }
  sh.appendRow(['A' + Date.now(), agoraStr_(), titulo, texto, fixado, true]);
  return { ok: true };
}
function excluirAviso_(d) {
  const c = exigirPapel_(d.auth, ['admin', 'organizacao']); if (c.erro) return { ok: false, erro: c.erro };
  const sh = abaOuCria_(ABA_AVISOS, HEADERS_AVISOS);
  const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues() : [];
  const i = rows.findIndex(r => r[0].toString() === (d.id || '').toString());
  if (i < 0) return { ok: false, erro: 'Aviso não encontrado.' };
  sh.deleteRow(i + 2);
  return { ok: true };
}

// ============================================================
//  LGPD — termo de consentimento por equipe
// ============================================================
const TERMO_LGPD_VERSAO = '2026-1';
const ABA_CONSENTIMENTOS = 'Consentimentos';
const HEADERS_CONSENTIMENTOS = ['Equipe', 'Responsável', 'Aceito em', 'Versão'];
function aceitarTermoLgpd_(d) {
  const equipe = (d.equipe || '').toString().trim();
  const nome = (d.nome || '').toString().trim();
  if (!equipe) return { ok: false, erro: 'Equipe obrigatória.' };
  if (!verificarPin_(equipe, d.pin)) return { ok: false, erro: 'PIN incorreto.' };
  if (nome.length < 5) return { ok: false, erro: 'Digite o nome completo do responsável.' };
  abaOuCria_(ABA_CONSENTIMENTOS, HEADERS_CONSENTIMENTOS).appendRow([equipe, nome, agoraStr_(), TERMO_LGPD_VERSAO]);
  return { ok: true };
}
function statusTermoLgpd_(equipe) {
  const alvo = (equipe || '').toString().trim().toLowerCase();
  const sh = abaOuCria_(ABA_CONSENTIMENTOS, HEADERS_CONSENTIMENTOS);
  if (sh.getLastRow() < 2 || !alvo) return { aceito: false };
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
  for (let i = rows.length - 1; i >= 0; i--) {
    if ((rows[i][0] || '').toString().trim().toLowerCase() === alvo && rows[i][3] === TERMO_LGPD_VERSAO) return { aceito: true, em: dataBR_(rows[i][2]), responsavel: rows[i][1].toString() };
  }
  return { aceito: false };
}

// ============================================================
//  W.O. — equipe não compareceu
// ============================================================
function registrarWO_(d) {
  const c = exigirPapel_(d.auth, ['admin', 'organizacao']); if (c.erro) return { ok: false, erro: c.erro };
  if (!d.id || !d.equipeA || !d.equipeB) return { ok: false, erro: 'Jogo e equipes são obrigatórios.' };
  const sh = getPartidasSheet_();
  if (acharLinhaPartida_(sh, d.id)) return { ok: false, erro: 'Esse jogo já tem súmula. Use "Reabrir" se precisar corrigir.' };
  const faltouB = d.equipeFaltou === 'B';
  const criada = criarPartida_({
    id: d.id, equipeA: d.equipeA, equipeB: d.equipeB, arbitro1: '', arbitro2: '', apontador: '', sacaPrimeiro: 'A',
    elencoCasa: { titulares: [], libero: null }, elencoVisitante: { titulares: [], libero: null }, capitaoCasa: '', capitaoVisitante: ''
  });
  if (!criada.ok) return criada;
  const info = acharLinhaPartida_(sh, d.id);
  const estado = linhaParaEstado_(info.dados);
  estado.historicoSets = faltouB ? [{ a: 25, b: 0 }, { a: 25, b: 0 }] : [{ a: 0, b: 25 }, { a: 0, b: 25 }];
  estado.setsCasa = faltouB ? 2 : 0;
  estado.setsVisitante = faltouB ? 0 : 2;
  estado.setAtual = 3; estado.pontosCasa = 0; estado.pontosVisitante = 0;
  estado.status = 'finalizada';
  const faltou = faltouB ? d.equipeB : d.equipeA;
  estado.observacoes = 'W.O. — ' + faltou + ' não compareceu.' + (d.motivo ? ' ' + d.motivo : '');
  estado._eventosLog = [];
  salvarLinhaPartida_(sh, info.linha, estado);
  delete estado._eventosLog;
  try { empurrarPlacarParaJogos_(estado, true); } catch (ex) { /* não interrompe */ }
  abaOuCria_('WO', ['Registrado em', 'Jogo', 'Equipe que faltou', 'Adversário', 'Motivo', 'Registrado por'])
    .appendRow([agoraStr_(), d.id, faltou, faltouB ? d.equipeA : d.equipeB, d.motivo || '', c.usuario.usuario]);
  return { ok: true, estado: estado };
}

// ============================================================
//  FOTOS POR JOGO
// ============================================================
function getFotosFolder_() {
  const id = PropertiesService.getScriptProperties().getProperty('FOTOS_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (ex) { /* recria */ } }
  const pasta = DriveApp.createFolder('Supercopa Vôlei - Fotos dos jogos');
  pasta.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  PropertiesService.getScriptProperties().setProperty('FOTOS_FOLDER_ID', pasta.getId());
  return pasta;
}
function uploadFotoJogo_(d) {
  const c = exigirPapel_(d.auth, ['admin', 'organizacao', 'mesa']); if (c.erro) return { ok: false, erro: c.erro };
  const jogo = (d.jogo || '').toString().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!jogo) return { ok: false, erro: 'Jogo obrigatório.' };
  if (!d.imagemBase64) return { ok: false, erro: 'Imagem vazia.' };
  const bytes = Utilities.base64Decode(d.imagemBase64.split(',').pop());
  if (bytes.length > 6 * 1024 * 1024) return { ok: false, erro: 'Imagem muito grande (máx. 6 MB).' };
  const blob = Utilities.newBlob(bytes, 'image/jpeg', jogo + '__' + Date.now() + '.jpg');
  const arq = getFotosFolder_().createFile(blob);
  return { ok: true, id: arq.getId() };
}
function fotosJogo_(jogo) {
  const j = (jogo || '').toString().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!j) return [];
  const out = [];
  const it = getFotosFolder_().searchFiles("title contains '" + j + "__'");
  while (it.hasNext() && out.length < 60) {
    const a = it.next();
    if (a.getName().indexOf(j + '__') !== 0) continue;
    out.push({ id: a.getId(), em: a.getDateCreated().getTime() });
  }
  out.sort((a, b) => a.em - b.em);
  return out.map(x => ({ id: x.id, thumb: 'https://drive.google.com/thumbnail?id=' + x.id + '&sz=w600', full: 'https://drive.google.com/thumbnail?id=' + x.id + '&sz=w1600' }));
}

// ============================================================
//  SAÚDE DO SISTEMA
// ============================================================
function saudeSistema_(d) {
  const c = exigirPapel_(d.auth, ['admin', 'organizacao']); if (c.erro) return { ok: false, erro: c.erro };
  const t0 = Date.now();
  const itens = [];
  const add = (nome, status, detalhe) => itens.push({ nome: nome, status: status, detalhe: detalhe });
  try {
    const ss = getSS_();
    add('Planilha principal', 'ok', ss.getName());
    ['Partidas', 'Atletas', 'EquipesPin', 'Confirmacoes'].forEach(n => { if (!ss.getSheetByName(n)) add('Aba ' + n, 'erro', 'não encontrada'); });
  } catch (ex) { add('Planilha principal', 'erro', ex.message); }
  try {
    const partidas = listarPartidasTodas_();
    const aoVivo = partidas.filter(p => p.status === 'em_andamento').length;
    const faltaFinalizar = partidas.filter(p => p.status === 'sets_completos').length;
    add('Partidas', faltaFinalizar ? 'aviso' : 'ok', partidas.length + ' súmulas · ' + aoVivo + ' ao vivo' + (faltaFinalizar ? ' · ' + faltaFinalizar + ' esperando finalizar' : ''));
  } catch (ex) { add('Partidas', 'erro', ex.message); }
  try {
    const status = statusCadastroEquipes_();
    const completas = status.filter(e => e.confirmou && e.atletas >= 6 && e.tecnico && e.assTecnico && e.assCapitao && e.lgpd).length;
    add('Cadastro das equipes', completas === status.length && status.length ? 'ok' : 'aviso', completas + ' de ' + status.length + ' equipes completas (atletas, técnico, assinaturas e termo)');
  } catch (ex) { add('Cadastro das equipes', 'erro', ex.message); }
  try {
    const gatilho = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'backupDiario');
    const pastas = DriveApp.getFoldersByName('Supercopa Vôlei - Backups');
    let ultimo = 0, qtd = 0;
    if (pastas.hasNext()) { const it = pastas.next().getFiles(); while (it.hasNext()) { const a = it.next(); qtd++; ultimo = Math.max(ultimo, a.getDateCreated().getTime()); } }
    if (!gatilho) add('Backup diário', 'erro', 'Não agendado — rode configurarBackupDiario no editor do Apps Script');
    else if (!ultimo) add('Backup diário', 'aviso', 'Agendado, mas ainda sem cópia');
    else {
      const horas = Math.round((Date.now() - ultimo) / 3600000);
      add('Backup diário', horas > 36 ? 'aviso' : 'ok', 'Última cópia há ' + horas + ' h · ' + qtd + ' cópias guardadas');
    }
  } catch (ex) { add('Backup diário', 'aviso', 'Não consegui verificar (' + ex.message + ')'); }
  try {
    const props = PropertiesService.getScriptProperties();
    add('Pasta de PDFs', props.getProperty('PDF_FOLDER_ID') ? 'ok' : 'aviso', props.getProperty('PDF_FOLDER_ID') ? 'configurada' : 'será criada no primeiro PDF');
  } catch (ex) { /* ignora */ }
  try {
    const termo = new Date() >= PRAZO_CADASTRO_ATLETAS;
    add('Prazo de cadastro de atletas', termo ? 'aviso' : 'ok', termo ? 'Encerrado' : 'Aberto até ' + Utilities.formatDate(PRAZO_CADASTRO_ATLETAS, Session.getScriptTimeZone(), 'dd/MM HH:mm'));
  } catch (ex) { /* ignora */ }
  return { ok: true, itens: itens, ms: Date.now() - t0 };
}

// ============================================================
//  HELPER
// ============================================================
function okJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
