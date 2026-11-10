const municipalSource =
  'https://itumbiara.go.gov.br/4o-ecoponto-de-itumbiara-e-entregue-no-bairro-zenon-borges-guimaraes/';
const common = {
  site_type: 'Ecoponto',
  publication_status: 'published',
  source_kind: 'municipal_partial',
  opening_hours: '',
  access_conditions: 'Confirmar antes da entrega',
  information_reviewed: true,
  rejected_materials: 'Lixo doméstico comum: restos de comida, resíduos de banheiro e similares.',
  source_url: municipalSource,
  location_precision: 'pending',
  latitude: null,
  longitude: null,
  source_notes:
    'Existência confirmada em notícia municipal. Detalhamento de materiais e endereços complementares informado pelo usuário; confirme com a unidade antes de levar resíduos.',
};

/** Referências aproximadas de ruas são identificadas; não representam a entrada da unidade. */
export const collectionPointCatalog = [
  {
    ...common,
    id: 'ad033cb4-d39a-46f4-9164-3054b7acc001',
    catalog_key: 'itumbiara-zenon',
    name: 'Ecoponto Zenon Borges Guimarães',
    district: 'Zenon Borges Guimarães',
    address: 'Av. Zenith Guimarães Santos — Setor Comercial / Zenon Borges Guimarães',
    description:
      'Unidade municipal para resíduos de construção, podas e materiais reaproveitáveis.',
    accepted_materials: [
      'Entulho',
      'Poda e galhadas',
      'Metal',
      'Plástico',
      'Papel e papelão',
      'Vidro',
    ],
    latitude: -18.402986,
    longitude: -49.2480214,
    location_precision: 'approximate',
    location_notes:
      'Centro aproximado do bairro Zenon Borges Guimarães no OpenStreetMap, consultado em 10/11/2026. Não representa a entrada da unidade.',
    location_source_url:
      'https://www.openstreetmap.org/search?query=Zenon%20Borges%20Guimar%C3%A3es%2C%20Itumbiara',
  },
  {
    ...common,
    id: 'ad033cb4-d39a-46f4-9164-3054b7acc002',
    catalog_key: 'itumbiara-dona-sinica',
    name: 'Ecoponto Nossa Senhora da Saúde / Dona Sinica',
    district: 'Dona Sinica / Nossa Senhora da Saúde',
    address: 'Rua Juriti, Qd. 47, Lt. 47 — Conjunto Habitacional Wilsina Barbosa Araújo',
    description: 'Atende a região e bairros próximos para evitar o descarte em terrenos baldios.',
    accepted_materials: ['Entulho', 'Poda e galhadas', 'Papel e papelão', 'Plástico', 'Metal'],
    latitude: -18.3909243,
    longitude: -49.1940763,
    location_precision: 'approximate',
    location_notes:
      'Centro aproximado do bairro Dona Sinica no OpenStreetMap, consultado em 10/11/2026. Não representa a entrada da unidade.',
    location_source_url: 'https://www.openstreetmap.org/search?query=Dona%20Sinica%2C%20Itumbiara',
  },
  {
    ...common,
    id: 'ad033cb4-d39a-46f4-9164-3054b7acc003',
    catalog_key: 'itumbiara-pneus-santa-rita',
    name: 'Ecoponto de Pneus — Santa Rita',
    district: 'Santa Rita',
    address: 'Rua 9, esquina com Rua 18, nº 815 — Santa Rita',
    description:
      'Unidade especializada no recebimento de pneus inservíveis de carros, motos, caminhões e bicicletas.',
    accepted_materials: ['Pneus'],
    rejected_materials:
      'Qualquer material diferente de pneus, inclusive entulho e lixo doméstico comum.',
    source_url:
      'https://itumbiara.go.gov.br/descarte-de-pneus-agora-no-ecoponto-do-bairro-santa-rita/',
    source_notes:
      'A prefeitura confirma a esquina das ruas 9 e 18 e a destinação para pneus. O nº 815 foi informado pelo usuário e ainda precisa de confirmação.',
    latitude: -18.373519,
    longitude: -49.2146137,
    location_precision: 'approximate',
    location_notes:
      'Centro aproximado do bairro Santa Rita no OpenStreetMap, consultado em 10/11/2026. Não representa a entrada da unidade.',
    location_source_url: 'https://www.openstreetmap.org/search?query=Santa%20Rita%2C%20Itumbiara',
  },
  {
    ...common,
    id: 'ad033cb4-d39a-46f4-9164-3054b7acc004',
    catalog_key: 'itumbiara-sarandi',
    name: 'Ecoponto de Sarandi',
    district: 'Povoado de Sarandi',
    address: 'Povoado de Sarandi — zona rural de Itumbiara',
    description:
      'Unidade descentralizada para resíduos de quintais, galhadas e pequenos entulhos de obras.',
    accepted_materials: ['Poda e galhadas', 'Entulho', 'Volumosos'],
    latitude: -18.3616942,
    longitude: -49.3707025,
    location_precision: 'approximate',
    location_notes:
      'Centro aproximado do povoado Sarandi no OpenStreetMap, consultado em 10/11/2026. Não representa a entrada da unidade.',
    location_source_url: 'https://www.openstreetmap.org/search?query=Sarandi%2C%20Itumbiara',
  },
  {
    ...common,
    id: 'ad033cb4-d39a-46f4-9164-3054b7acc005',
    catalog_key: 'itumbiara-santa-rosa',
    name: 'Ecoponto de Santa Rosa do Meia Ponte',
    district: 'Santa Rosa do Meia Ponte',
    address: 'Povoado de Santa Rosa do Meia Ponte — zona rural de Itumbiara',
    description:
      'Unidade descentralizada para resíduos de quintais, galhadas e pequenos entulhos de obras.',
    accepted_materials: ['Poda e galhadas', 'Entulho', 'Volumosos'],
    latitude: -18.3371477,
    longitude: -49.6107957,
    location_precision: 'approximate',
    location_notes:
      'Centro aproximado de Santa Rosa do Meia Ponte no OpenStreetMap, consultado em 10/11/2026. Não representa a entrada da unidade.',
    location_source_url:
      'https://www.openstreetmap.org/search?query=Santa%20Rosa%20do%20Meia%20Ponte%2C%20Itumbiara',
  },
];
