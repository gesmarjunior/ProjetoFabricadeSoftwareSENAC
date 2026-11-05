export const config = {
  kind: 'dengue',
  name: 'Radar da Dengue Inteligente',
  shortName: 'Radar da Dengue',
  subtitle: 'Cuidar do ambiente é prevenir.',
  table: 'dengue_occurrences',
  bucket: 'dengue-photos',
  categories: [
    'Pneu',
    'Balde/Vaso/Recipiente',
    'Caixa d’água/Reservatório',
    'Lixo/Garrafa/Lata',
    'Calha/Laje',
    'Outro',
  ],
  statuses: ['Recebido', 'Em análise', 'Orientação enviada', 'Resolvido', 'Descartado'],
  riskLabel: 'Risco ambiental estimado',
  guidanceLabel: 'Orientações',
  homeTitle: 'Pequenos cuidados.\nMais proteção para todos.',
  homeDescription:
    'Observe o ambiente, registre um possível criadouro e acompanhe ações de prevenção na sua comunidade.',
  notice:
    'A ferramenta não substitui equipes de saúde ou vigilância. O risco ambiental estimado usa regras, sem confirmar presença de mosquito ou doença.',
};
