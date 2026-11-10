export const pointTypes = [
  'Ecoponto',
  'Coleta seletiva',
  'Cooperativa de reciclagem',
  'Aterro sanitário',
  'Estação de transbordo',
  'Outro',
];
export const pointMaterials = [
  'Entulho',
  'Poda e galhadas',
  'Papel e papelão',
  'Plástico',
  'Metal',
  'Vidro',
  'Pneus',
  'Eletrônicos',
  'Óleo de cozinha',
  'Volumosos',
  'Rejeitos',
];
export const accessOptions = [
  'Confirmar antes da entrega',
  'Entrega voluntária',
  'Acesso restrito / agendamento',
];

/** Somente dados de estabelecimentos públicos: nenhuma identificação pessoal. */
export function validateCollectionPoint(input) {
  const errors = {};
  for (const [field, label, min, max] of [
    ['name', 'Nome', 3, 160],
    ['address', 'Endereço', 8, 300],
    ['district', 'Bairro ou povoado', 2, 100],
    ['description', 'Descrição', 10, 1000],
  ]) {
    const text = typeof input[field] === 'string' ? input[field].trim() : '';
    if (text.length < min || text.length > max)
      errors[field] = `${label}: informe de ${min} a ${max} caracteres.`;
  }
  if (!pointTypes.includes(input.site_type)) errors.site_type = 'Selecione o tipo de local.';
  if (
    !Array.isArray(input.accepted_materials) ||
    !input.accepted_materials.length ||
    !input.accepted_materials.every((item) => pointMaterials.includes(item))
  )
    errors.accepted_materials = 'Selecione ao menos um material aceito.';
  if (
    input.site_type === 'Ecoponto' &&
    Array.isArray(input.accepted_materials) &&
    input.accepted_materials.includes('Rejeitos')
  )
    errors.accepted_materials = 'Os ecopontos de Itumbiara não recebem lixo doméstico comum.';
  if (!accessOptions.includes(input.access_conditions))
    errors.access_conditions = 'Informe as condições de acesso.';
  for (const field of ['opening_hours', 'rejected_materials', 'source_url']) {
    if (input[field] != null && (typeof input[field] !== 'string' || input[field].length > 500))
      errors[field] = 'Use até 500 caracteres.';
  }
  if (input.source_url) {
    try {
      const url = new URL(input.source_url);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    } catch {
      errors.source_url = 'Informe um link HTTPS válido, sem credenciais.';
    }
  }
  const hasLat = input.latitude !== '' && input.latitude != null;
  const hasLng = input.longitude !== '' && input.longitude != null;
  const coordinate = (value) =>
    (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) &&
    Number.isFinite(Number(value));
  if (
    hasLat !== hasLng ||
    (hasLat &&
      (!coordinate(input.latitude) ||
        !coordinate(input.longitude) ||
        Number(input.latitude) < -90 ||
        Number(input.latitude) > 90 ||
        Number(input.longitude) < -180 ||
        Number(input.longitude) > 180))
  )
    errors.coordinates = 'Informe latitude e longitude válidas juntas, ou deixe ambas vazias.';
  if (input.information_reviewed !== true)
    errors.information_reviewed = 'Confira as informações antes de enviar.';
  return errors;
}

export function collectionPointPayload(input) {
  const errors = validateCollectionPoint(input);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const located = input.latitude !== '' && input.latitude != null;
  return {
    id: input.id,
    replaces_id: input.replaces_id || null,
    name: input.name.trim(),
    site_type: input.site_type,
    address: input.address.trim(),
    district: input.district.trim(),
    description: input.description.trim(),
    accepted_materials: [...new Set(input.accepted_materials)],
    opening_hours: (input.opening_hours || '').trim(),
    rejected_materials: (input.rejected_materials || '').trim(),
    access_conditions: input.access_conditions,
    source_url: (input.source_url || '').trim(),
    latitude: located ? Number(input.latitude) : null,
    longitude: located ? Number(input.longitude) : null,
    location_precision: located ? 'approximate' : 'pending',
    information_reviewed: true,
  };
}

export function filterCollectionPoints(rows, { search = '', type = '', material = '' } = {}) {
  const normalize = (text) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const term = normalize(search.trim());
  return rows.filter(
    (row) =>
      (!type || row.site_type === type) &&
      (!material || row.accepted_materials.includes(material)) &&
      (!term || normalize(`${row.name} ${row.address} ${row.district}`).includes(term)),
  );
}

export function hasPointCoordinates(row) {
  return (
    row.latitude != null &&
    row.longitude != null &&
    Number.isFinite(Number(row.latitude)) &&
    Number.isFinite(Number(row.longitude)) &&
    Math.abs(Number(row.latitude)) <= 90 &&
    Math.abs(Number(row.longitude)) <= 180
  );
}

export function pointMapUrl(row) {
  const query =
    row.location_precision === 'confirmed' && hasPointCoordinates(row)
      ? `${row.latitude},${row.longitude}`
      : `${row.name}, ${row.address}, Itumbiara, GO`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
