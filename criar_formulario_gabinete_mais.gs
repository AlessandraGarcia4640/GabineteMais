/**
 * GABINETE+ — GERADOR DO QUESTIONARIO NO GOOGLE FORMS
 *
 * COMO USAR
 * 1. Acesse https://script.google.com e clique em "Novo projeto".
 * 2. Apague o conteúdo de Code.gs e cole todo este arquivo.
 * 3. No seletor de funções, escolha criarFormularioGabineteMais.
 * 4. Clique em "Executar" e autorize o acesso solicitado pelo Google.
 * 5. Ao terminar, abra o "Registro de execução". Ele mostrará três links:
 *    edição do formulário, formulário para os participantes e planilha.
 *
 * Execute apenas uma vez. Cada execução cria um novo formulário e uma nova
 * planilha no Google Drive da conta que executou o script.
 */

function criarFormularioGabineteMais() {
  const titulo =
    'Diagnóstico do ingresso e da aprendizagem das funções de assessoria de gabinete no TRT9';

  const descricao = [
    'Este formulário integra o levantamento acadêmico do Projeto Gabinete+ e tem por objetivo compreender o nível de conhecimento prévio e as formas de aprendizagem das funções de assessoria de gabinete no TRT9.',
    '',
    'Ao responder, considere a primeira vez em que você começou a exercer funções de assessoria em gabinete no TRT9.',
    '',
    'A participação é voluntária. O formulário não solicita nome, e-mail ou identificação do gabinete. As respostas serão analisadas e apresentadas apenas de forma agrupada, como parte dos dados do projeto e de sua apresentação acadêmica na Universidade de Coimbra, em outubro.',
    '',
    'Tempo estimado de resposta: 4 a 6 minutos.'
  ].join('\n');

  const form = FormApp.create(titulo);
  form
    .setDescription(descricao)
    .setCollectEmail(false)
    .setLimitOneResponsePerUser(false)
    .setShowLinkToRespondAgain(false)
    .setAllowResponseEdits(false)
    .setPublishingSummary(false)
    .setShuffleQuestions(false)
    .setProgressBar(true)
    .setIsQuiz(false)
    .setConfirmationMessage(
      'Agradecemos sua participação. Sua resposta foi registrada e será utilizada somente de forma agrupada no levantamento acadêmico do Projeto Gabinete+.'
    );

  // Consentimento: item introdutório, não contabilizado entre as dez perguntas.
  adicionarMultiplaEscolha(
    form,
    'Consentimento para participação',
    ['Li as informações acima e concordo voluntariamente em participar.'],
    true,
    false,
    'Se não desejar participar, feche o formulário sem enviá-lo.'
  );

  adicionarMultiplaEscolha(
    form,
    '1. Há quanto tempo você exerce ou exerceu funções de assessoria em gabinete no TRT9?',
    [
      'Menos de 1 ano',
      'De 1 a 3 anos',
      'De 4 a 6 anos',
      'De 7 a 10 anos',
      'Mais de 10 anos'
    ],
    true
  );

  adicionarMultiplaEscolha(
    form,
    '2. Antes de assumir a função, você já havia trabalhado em atividade semelhante?',
    [
      'Sim, no próprio TRT9',
      'Sim, em outro órgão do Poder Judiciário',
      'Sim, fora do Poder Judiciário',
      'Não'
    ],
    true
  );

  form
    .addScaleItem()
    .setTitle(
      '3. Antes de iniciar, qual era o seu nível geral de conhecimento sobre as funções que exerceria?'
    )
    .setBounds(1, 5)
    .setLabels('1 — Nenhum conhecimento', '5 — Conhecimento muito elevado')
    .setRequired(true);

  adicionarCaixasSelecao(
    form,
    '4. Quais atividades da função você já conhecia antes de começar?',
    [
      'Elaboração de minutas',
      'Pesquisa jurídica',
      'Uso dos sistemas processuais',
      'Gestão de processos e prazos',
      'Organização do fluxo do gabinete',
      'Rotinas administrativas',
      'Comunicação com magistrados e equipe',
      'Nenhuma das atividades listadas'
    ],
    true,
    true
  );

  adicionarCaixasSelecao(
    form,
    '5. Como você adquiriu o conhecimento que já possuía antes de assumir a função?',
    [
      'Experiência anterior no Poder Judiciário',
      'Experiência profissional fora do Poder Judiciário',
      'Formação acadêmica',
      'Cursos ou capacitações',
      'Estudo por iniciativa própria',
      'Orientação informal de colegas',
      'Não possuía conhecimento prévio'
    ],
    true,
    true
  );

  adicionarMultiplaEscolha(
    form,
    '6. Ao iniciar, você recebeu uma apresentação ou orientação estruturada sobre suas atribuições?',
    [
      'Sim, de forma completa',
      'Sim, mas apenas parcialmente',
      'Não',
      'Não me recordo'
    ],
    true
  );

  const formasAprendizagem = [
    'Orientação de colegas da mesma assessoria',
    'Orientação do(a) assessor(a) que estava deixando a função',
    'Orientação do(a) magistrado(a)',
    'Consulta a manuais ou procedimentos escritos da unidade',
    'Consulta a modelos internos de ações anteriores',
    'Participação em cursos ou treinamentos',
    'Observação da rotina de trabalho',
    'Prática, tentativa e erro',
    'Estudo individual'
  ];

  adicionarCaixasSelecao(
    form,
    '7. Nos primeiros três meses de atuação, quais foram as principais formas pelas quais você aprendeu a exercer suas funções?',
    formasAprendizagem,
    true,
    true
  );

  adicionarMultiplaEscolha(
    form,
    '8. Qual dessas formas de aprendizagem foi a mais importante para sua adaptação?',
    formasAprendizagem,
    true,
    true
  );

  adicionarMultiplaEscolha(
    form,
    '9. Quanto tempo você levou para se sentir capaz de exercer as principais atividades com razoável autonomia?',
    [
      'Imediatamente',
      'Menos de 1 mês',
      'De 1 a 3 meses',
      'De 4 a 6 meses',
      'De 7 a 12 meses',
      'Mais de 1 ano',
      'Ainda não me sinto plenamente autônomo(a)'
    ],
    true
  );

  adicionarCaixasSelecao(
    form,
    '10. Quais tipos de orientação, treinamento ou recurso teriam tornado o início da sua atuação mais seguro e eficiente?',
    [
      'Treinamento oferecido pela Escola Judicial',
      'Treinamento interno antes do início da atuação',
      'Treinamento durante o primeiro mês de atuação',
      'Estudo individual orientado',
      'Manual ou lista de procedimentos e modelos internos'
    ],
    true,
    true
  );

  // Cria e vincula uma planilha para receber e tabular as respostas.
  const planilha = SpreadsheetApp.create(
    'Respostas — Diagnóstico de assessoria de gabinete — Projeto Gabinete+'
  );
  form.setDestination(FormApp.DestinationType.SPREADSHEET, planilha.getId());

  criarAbasDeApoio(planilha, form);

  if (form.supportsAdvancedResponderPermissions()) {
    form.setPublished(true);
  } else {
    form.setAcceptingResponses(true);
  }

  const resultado = {
    edicaoDoFormulario: form.getEditUrl(),
    formularioParaResponder: form.getPublishedUrl(),
    planilhaDeRespostas: planilha.getUrl()
  };

  console.log('FORMULÁRIO CRIADO COM SUCESSO');
  console.log('Edição do formulário: ' + resultado.edicaoDoFormulario);
  console.log('Link para os participantes: ' + resultado.formularioParaResponder);
  console.log('Planilha de respostas: ' + resultado.planilhaDeRespostas);

  return resultado;
}

function adicionarMultiplaEscolha(
  form,
  titulo,
  opcoes,
  obrigatoria,
  permitirOutra,
  textoAjuda
) {
  const item = form
    .addMultipleChoiceItem()
    .setTitle(titulo)
    .setChoiceValues(opcoes)
    .setRequired(Boolean(obrigatoria));

  if (permitirOutra) item.showOtherOption(true);
  if (textoAjuda) item.setHelpText(textoAjuda);
  return item;
}

function adicionarCaixasSelecao(
  form,
  titulo,
  opcoes,
  obrigatoria,
  permitirOutra
) {
  const item = form
    .addCheckboxItem()
    .setTitle(titulo)
    .setChoiceValues(opcoes)
    .setRequired(Boolean(obrigatoria));

  if (permitirOutra) item.showOtherOption(true);
  return item;
}

function criarAbasDeApoio(planilha, form) {
  const leiaMe = planilha.getSheets()[0];
  leiaMe.setName('Leia-me');
  leiaMe.getRange('A1:B6').setValues([
    ['Projeto', 'Gabinete+'],
    ['Formulário', form.getTitle()],
    ['Link de edição', form.getEditUrl()],
    ['Link para responder', form.getPublishedUrl()],
    ['Observação', 'As questões com caixas de seleção aparecerão na planilha com as alternativas separadas por vírgulas.'],
    ['Privacidade', 'Não publicar respostas individuais; apresentar somente resultados agrupados.']
  ]);
  leiaMe.getRange('A1:A6').setFontWeight('bold');
  leiaMe.getRange('A1:B6').setWrap(true).setVerticalAlignment('top');
  leiaMe.setColumnWidth(1, 150);
  leiaMe.setColumnWidth(2, 650);

  const dicionario = planilha.insertSheet('Dicionário de dados');
  const linhas = [
    ['Variável', 'Pergunta', 'Tipo', 'Orientação para análise'],
    ['consentimento', 'Consentimento para participação', 'Categórica', 'Manter somente respostas com concordância.'],
    ['tempo_funcao', '1. Tempo de exercício da função', 'Ordinal', 'Apresentar frequências e percentuais por faixa.'],
    ['experiencia_anterior', '2. Experiência anterior semelhante', 'Nominal', 'Apresentar frequências e percentuais.'],
    ['conhecimento_previo', '3. Nível geral de conhecimento prévio', 'Escala 1–5', 'Calcular mediana, amplitude e distribuição; com amostra pequena, exibir também contagens.'],
    ['atividades_conhecidas', '4. Atividades conhecidas antes do início', 'Múltipla resposta', 'Contar cada alternativa separadamente; a soma dos percentuais pode superar 100%.'],
    ['origem_conhecimento', '5. Como adquiriu conhecimento prévio', 'Múltipla resposta', 'Contar cada alternativa separadamente.'],
    ['orientacao_estruturada', '6. Recebimento de orientação estruturada', 'Ordinal', 'Comparar com conhecimento prévio e tempo até autonomia.'],
    ['formas_aprendizagem', '7. Formas de aprendizagem nos três primeiros meses', 'Múltipla resposta', 'Contar cada alternativa separadamente.'],
    ['forma_mais_importante', '8. Forma mais importante para adaptação', 'Nominal', 'Apresentar a alternativa mais frequente e as demais contagens.'],
    ['tempo_autonomia', '9. Tempo até razoável autonomia', 'Ordinal', 'Apresentar distribuição; comparar com orientação estruturada.'],
    ['recursos_desejados', '10. Recursos que tornariam o início mais seguro e eficiente', 'Múltipla resposta', 'Contar cada alternativa; usar para priorizar as entregas do Gabinete+.']
  ];

  dicionario.getRange(1, 1, linhas.length, linhas[0].length).setValues(linhas);
  dicionario.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#d9ead3');
  dicionario.getRange(1, 1, linhas.length, 4).setWrap(true).setVerticalAlignment('top');
  dicionario.setFrozenRows(1);
  dicionario.setColumnWidth(1, 190);
  dicionario.setColumnWidth(2, 360);
  dicionario.setColumnWidth(3, 150);
  dicionario.setColumnWidth(4, 520);
  SpreadsheetApp.flush();
}
