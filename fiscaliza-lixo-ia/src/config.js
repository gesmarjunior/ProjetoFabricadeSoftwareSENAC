export const config = {
  kind: 'waste',
  name: 'FiscalizaLixo IA',
  shortName: 'FiscalizaLixo IA',
  subtitle: 'Uma cidade melhor começa com você.',
  table: 'fiscaliza_occurrences',
  bucket: 'fiscaliza-photos',
  categories: [
    'Entulho',
    'Lixo doméstico',
    'Reciclável',
    'Eletrônico',
    'Poda/Galhos',
    'Pneu',
    'Outro',
  ],
  statuses: ['Recebido', 'Em análise', 'Encaminhado', 'Resolvido', 'Descartado'],
  riskLabel: 'Prioridade estimada',
  guidanceLabel: 'Descarte correto',
  homeTitle: 'Pequenas atitudes.\nUma cidade mais limpa.',
  homeDescription:
    'Encontrou resíduos descartados irregularmente? Registre o local, acompanhe a ocorrência e descubra o destino correto.',
  notice:
    'A classificação usa regras transparentes e as informações do formulário. A foto não é analisada por inteligência artificial.',
};
