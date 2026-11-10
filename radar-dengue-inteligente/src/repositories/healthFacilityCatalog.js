const cnesUrl = (code) =>
  `https://cnes2.datasus.gov.br/Exibe_Ficha_Estabelecimento.asp?VCo_Unidade=521150${code}`;
const common = {
  publication_status: 'published',
  source_kind: 'official_partial',
  sources_checked_on: '2026-11-10',
  vaccination_status: 'unknown',
  medical_care_status: 'reported',
  information_reviewed: true,
  phone: '',
  service_notes:
    'Confirme com a unidade os serviços, a agenda, as vacinas disponíveis e o público atendido. Este cadastro não confirma vacinação contra dengue.',
  source_notes:
    'Dados cadastrais consultados no CNES em 10/11/2026. Cadastro e horários informados não representam agenda, estoque de vacinas ou disponibilidade em tempo real.',
  location_precision: 'approximate',
};

/** Referências de bairros; endereço cadastral e entrada física são informações distintas. */
export const healthFacilityCatalog = [
  {
    ...common,
    id: 'ce3ba068-ea53-4647-8db1-321de1000001',
    catalog_key: 'itumbiara-endemias',
    name: 'Núcleo Municipal de Controle de Endemias',
    facility_type: 'Centro de endemias',
    cnes_code: '3033589',
    address: 'Rua Wilson Barbosa, 325',
    district: 'Jardim América',
    phone: '(64) 3433-0497',
    description:
      'Centro/Departamento de Endemias de Itumbiara, cadastrado no CNES como unidade de vigilância em saúde.',
    vaccination_status: 'not_reported',
    medical_care_status: 'not_reported',
    opening_hours: 'Segunda a sexta, das 7h às 17h, conforme CNES; confirme o atendimento.',
    service_notes:
      'Serviço de prevenção e controle de endemias. A fonte consultada não informa vacinação ou consultas médicas nesta unidade.',
    source_url: cnesUrl('3033589'),
    latitude: -18.4072186,
    longitude: -49.2055438,
    source_notes:
      'Existência, CNES, contato e horário consultados no CNES em 10/11/2026. Endereço atual na Rua Wilson Barbosa, 325, Jardim América informado pelo usuário nesta data. O CNES ainda apresenta Rua 7 de Setembro, 136, Alto da Boa Vista; confirme contato e horário com a unidade.',
    location_notes:
      'Centro aproximado do Jardim América no OpenStreetMap, consultado em 10/11/2026; não representa a entrada.',
    location_source_url:
      'https://www.openstreetmap.org/search?query=Jardim%20Am%C3%A9rica%2C%20Itumbiara',
  },
  {
    ...common,
    id: 'ce3ba068-ea53-4647-8db1-321de1000002',
    catalog_key: 'itumbiara-vigilancia-sanitaria',
    name: 'Vigilância Sanitária Municipal',
    facility_type: 'Vigilância sanitária',
    cnes_code: '3495353',
    address: 'Rua Wilson Barbosa, 325 — junto ao NABS',
    district: 'Jardim América',
    phone: '(64) 99660-6814',
    description:
      'Serviço municipal de vigilância sanitária, com mudança de endereço comunicada pela prefeitura em 19/12/2025.',
    vaccination_status: 'not_reported',
    medical_care_status: 'not_reported',
    opening_hours:
      'Segunda a sexta, das 7h às 11h e das 13h às 17h, conforme comunicado municipal; confirme.',
    service_notes:
      'A fonte consultada não apresenta este endereço como ponto de vacinação ou de consultas médicas.',
    source_url: 'https://itumbiara.go.gov.br/vigilancia-sanitaria-municipal-em-novo-local/',
    source_notes:
      'Adotado o comunicado municipal de mudança de 19/12/2025. O CNES ainda apresenta endereço diferente na Rua Cruz de Malta; essa divergência precisa de conferência com a unidade.',
    latitude: -18.4072186,
    longitude: -49.2055438,
    location_notes:
      'Centro aproximado do Jardim América no OpenStreetMap, consultado em 10/11/2026; não representa a entrada.',
    location_source_url:
      'https://www.openstreetmap.org/search?query=Jardim%20Am%C3%A9rica%2C%20Itumbiara',
  },
  {
    ...common,
    id: 'ce3ba068-ea53-4647-8db1-321de1000003',
    catalog_key: 'itumbiara-nabs',
    name: 'NABS — Núcleo de Ações Básicas em Saúde',
    facility_type: 'Centro de saúde',
    cnes_code: '4071468',
    address: 'Rua Wilson Barbosa, 325',
    district: 'Jardim América',
    phone: '(64) 3431-8619',
    description:
      'Unidade municipal de saúde cadastrada no CNES. Consulte os serviços disponíveis e a forma de acesso.',
    opening_hours: 'Segunda a sexta, das 7h às 17h, conforme CNES; confirme o atendimento.',
    source_url: cnesUrl('4071468'),
    latitude: -18.4072186,
    longitude: -49.2055438,
    location_notes:
      'Centro aproximado do Jardim América no OpenStreetMap, consultado em 10/11/2026; não representa a entrada.',
    location_source_url:
      'https://www.openstreetmap.org/search?query=Jardim%20Am%C3%A9rica%2C%20Itumbiara',
  },
  {
    ...common,
    id: 'ce3ba068-ea53-4647-8db1-321de1000004',
    catalog_key: 'itumbiara-cais',
    name: 'CAIS — Centro de Assistência Integrada à Saúde',
    facility_type: 'Centro de saúde',
    cnes_code: '2789620',
    address: 'Rua Amadeu Machado Filho, 130',
    district: 'Anhanguera',
    phone: '(64) 3433-0495',
    description:
      'Unidade municipal cadastrada no CNES como clínica/centro de especialidade. Confirme os serviços e a forma de encaminhamento.',
    opening_hours: 'Segunda a sexta, das 7h às 17h, conforme CNES; confirme o atendimento.',
    source_url: cnesUrl('2789620'),
    latitude: -18.42,
    longitude: -49.22,
    location_notes:
      'Referência aproximada do município. O endereço do CNES e os resultados de geocodificação divergem quanto ao bairro; a posição da unidade ainda precisa ser conferida.',
    location_source_url: 'https://www.openstreetmap.org/search?query=Itumbiara%2C%20Goi%C3%A1s',
  },
  ...[
    [
      '0005',
      'luiz-carneiro',
      'Clínica Popular Dr. Luiz Gonzaga Carneiro de Moura',
      '0800058',
      'Av. Castelândia, 230',
      'Maria Luiza Machado',
      -18.382853,
      -49.2245019,
      '',
    ],
    [
      '0006',
      'mario-guedes',
      'Clínica Popular Dr. Mário Guedes',
      '0800007',
      'Av. Rio de Janeiro, esquina com Rua Londres, s/n',
      'Nossa Senhora da Saúde',
      -18.3933113,
      -49.1985249,
      '',
    ],
    [
      '0007',
      'dionaria',
      'UBS Dionária Ferreira Gomes',
      '0533734',
      'Rua V4, esquina com V19, 01',
      'Vila Vitória II',
      -18.4175889,
      -49.2411927,
      '3433-0377',
    ],
    [
      '0008',
      'reginaldo',
      'Clínica Popular Dr. Reginaldo Custódio Pereira',
      '0800023',
      'Av. Tabelião Bartolomeu Dias, 55',
      'Planalto',
      -18.4061399,
      -49.2380702,
      '',
    ],
    [
      '0009',
      'genesio',
      'Clínica Popular Dr. Genésio Borges de Andrade',
      '0800015',
      'Av. Washington Luiz, 761',
      'Afonso Pena',
      -18.4018421,
      -49.212052,
      '',
    ],
    [
      '0010',
      'padua-peppe',
      'Clínica Popular Dr. Antônio de Pádua Peppe',
      '0800031',
      'Av. Equador, s/n',
      'Dona Marolina',
      -18.4094212,
      -49.2721883,
      '',
    ],
  ].map(([suffix, key, name, code, address, district, latitude, longitude, phone]) => ({
    ...common,
    id: `ce3ba068-ea53-4647-8db1-321de100${suffix}`,
    catalog_key: `itumbiara-${key}`,
    name,
    facility_type: 'Unidade básica de saúde',
    cnes_code: code,
    address,
    district,
    latitude,
    longitude,
    phone,
    description:
      'Unidade municipal de atenção básica cadastrada no CNES. Confirme o atendimento e a oferta de vacinação diretamente com a unidade.',
    opening_hours:
      code === '0533734'
        ? 'Segunda a sexta, das 7h às 22h, conforme CNES; confirme os horários de cada serviço.'
        : 'Segunda a sexta, das 7h às 19h, conforme CNES; confirme os horários de cada serviço.',
    source_url: cnesUrl(code),
    location_notes: `Centro aproximado da região de ${district} no OpenStreetMap, consultado em 10/11/2026; não representa a entrada.`,
    location_source_url: `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${district}, Itumbiara`)}`,
  })),
  {
    ...common,
    id: 'ce3ba068-ea53-4647-8db1-321de1000011',
    catalog_key: 'itumbiara-upa-ciro-garcia',
    name: 'UPA Dr. Ciro Garcia',
    facility_type: 'UPA / pronto atendimento',
    cnes_code: '9211349',
    address: 'Av. Ernesto Rocha, 209',
    district: 'Juca Arantes',
    phone: '(64) 3433-0440',
    description:
      'Unidade municipal cadastrada no CNES como pronto atendimento. Confirme os serviços e a porta de acesso.',
    vaccination_status: 'not_reported',
    opening_hours:
      'Serviço 24 horas, conforme cadastro CNES; confirme a disponibilidade de cada serviço.',
    source_url: cnesUrl('9211349'),
    latitude: -18.3999928,
    longitude: -49.2448076,
    location_notes:
      'Centro aproximado do bairro Juca Arantes no OpenStreetMap, consultado em 10/11/2026; não representa a entrada.',
    location_source_url: 'https://www.openstreetmap.org/search?query=Juca%20Arantes%2C%20Itumbiara',
  },
  {
    ...common,
    id: 'ce3ba068-ea53-4647-8db1-321de1000012',
    catalog_key: 'itumbiara-hospital-modesto',
    name: 'Hospital Municipal Modesto de Carvalho',
    facility_type: 'Hospital',
    cnes_code: '2789647',
    address: 'Rua João Henrique Duarte, s/n',
    district: 'Alto da Boa Vista',
    description:
      'Hospital municipal cadastrado no CNES. Confirme a porta de atendimento e os serviços disponíveis.',
    vaccination_status: 'not_reported',
    opening_hours:
      'Serviço 24 horas, conforme cadastro CNES; confirme a disponibilidade de cada serviço.',
    source_url: cnesUrl('2789647'),
    latitude: -18.411561,
    longitude: -49.2069448,
    source_notes:
      'Cadastro CNES consultado em 10/11/2026. O telefone apresenta DDD divergente e não foi reproduzido; confirme o contato institucional.',
    location_notes:
      'Centro aproximado do bairro Alto da Boa Vista no OpenStreetMap, consultado em 10/11/2026; não representa a entrada.',
    location_source_url:
      'https://www.openstreetmap.org/search?query=Alto%20da%20Boa%20Vista%2C%20Itumbiara',
  },
];
