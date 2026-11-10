export const facilityTypes = [
  'Centro de endemias',
  'Vigilância sanitária',
  'Vigilância epidemiológica',
  'Unidade básica de saúde',
  'Centro de saúde',
  'UPA / pronto atendimento',
  'Hospital',
  'Ponto de vacinação',
  'Outro',
];
export const serviceStatusLabels = {
  unknown: 'A confirmar com a unidade',
  reported: 'Informado na fonte; confirme a oferta atual',
  not_reported: 'Não informado para esta unidade',
};

export function validateHealthFacility(input) {
  const errors = {};
  for (const [field, label, min, max] of [
    ['name', 'Nome', 3, 160],
    ['address', 'Endereço', 8, 300],
    ['district', 'Bairro ou região', 2, 100],
    ['description', 'Descrição', 10, 1000],
  ]) {
    const value = typeof input[field] === 'string' ? input[field].trim() : '';
    if (value.length < min || value.length > max)
      errors[field] = `${label}: informe de ${min} a ${max} caracteres.`;
  }
  if (!facilityTypes.includes(input.facility_type))
    errors.facility_type = 'Selecione o tipo de serviço.';
  for (const field of ['vaccination_status', 'medical_care_status']) {
    if (!Object.hasOwn(serviceStatusLabels, input[field]))
      errors[field] = 'Informe se o serviço é conhecido ou precisa de confirmação.';
  }
  for (const [field, max] of [
    ['phone', 30],
    ['opening_hours', 300],
    ['service_notes', 700],
    ['source_url', 500],
  ]) {
    if (input[field] != null && (typeof input[field] !== 'string' || input[field].length > max))
      errors[field] = `Use até ${max} caracteres.`;
  }
  if (input.phone && !/^[\d\s()+-]+$/.test(input.phone))
    errors.phone = 'Informe somente um telefone institucional, com números e DDD.';
  if (input.cnes_code && !/^\d{7}$/.test(input.cnes_code))
    errors.cnes_code = 'O código CNES deve conter sete dígitos.';
  if (input.source_url) {
    try {
      const url = new URL(input.source_url);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    } catch {
      errors.source_url = 'Informe um link HTTPS válido, sem credenciais.';
    }
  }
  if (
    (input.vaccination_status === 'reported' || input.medical_care_status === 'reported') &&
    !(typeof input.source_url === 'string' && input.source_url.trim())
  )
    errors.source_url =
      'Informe uma fonte para o serviço declarado; sem confirmação, selecione “A confirmar”.';
  const hasLat = input.latitude !== '' && input.latitude != null,
    hasLng = input.longitude !== '' && input.longitude != null;
  const coordinate = (value) =>
    (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) &&
    Number.isFinite(Number(value));
  if (
    hasLat !== hasLng ||
    (hasLat &&
      (!coordinate(input.latitude) ||
        !coordinate(input.longitude) ||
        Math.abs(Number(input.latitude)) > 90 ||
        Math.abs(Number(input.longitude)) > 180))
  )
    errors.coordinates = 'Informe latitude e longitude válidas juntas, ou deixe ambas vazias.';
  if (input.information_reviewed !== true)
    errors.information_reviewed = 'Confira as informações antes de enviar.';
  return errors;
}

export function healthFacilityPayload(input) {
  const errors = validateHealthFacility(input);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const located = input.latitude !== '' && input.latitude != null;
  return {
    id: input.id,
    replaces_id: input.replaces_id || null,
    name: input.name.trim(),
    facility_type: input.facility_type,
    address: input.address.trim(),
    district: input.district.trim(),
    description: input.description.trim(),
    phone: (input.phone || '').trim(),
    opening_hours: (input.opening_hours || '').trim(),
    cnes_code: (input.cnes_code || '').trim(),
    source_url: (input.source_url || '').trim(),
    service_notes: (input.service_notes || '').trim(),
    vaccination_status: input.vaccination_status,
    medical_care_status: input.medical_care_status,
    latitude: located ? Number(input.latitude) : null,
    longitude: located ? Number(input.longitude) : null,
    location_precision: located ? 'approximate' : 'pending',
    information_reviewed: true,
  };
}

export function filterHealthFacilities(rows, { search = '', type = '', service = '' } = {}) {
  const normalize = (text) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const term = normalize(search.trim());
  return rows.filter(
    (row) =>
      (!type || row.facility_type === type) &&
      (!term ||
        normalize(`${row.name} ${row.address} ${row.district} ${row.cnes_code || ''}`).includes(
          term,
        )) &&
      (!service ||
        (service === 'medical' && row.medical_care_status === 'reported') ||
        (service === 'vaccination' && row.vaccination_status === 'reported') ||
        (service === 'possible_vaccination' && row.vaccination_status === 'unknown') ||
        (service === 'surveillance' &&
          ['Centro de endemias', 'Vigilância sanitária', 'Vigilância epidemiológica'].includes(
            row.facility_type,
          ))),
  );
}

export function hasFacilityCoordinates(row) {
  return (
    row.latitude != null &&
    row.longitude != null &&
    Number.isFinite(Number(row.latitude)) &&
    Number.isFinite(Number(row.longitude)) &&
    Math.abs(Number(row.latitude)) <= 90 &&
    Math.abs(Number(row.longitude)) <= 180
  );
}
export function facilityMapUrl(row) {
  const query =
    row.location_precision === 'confirmed' && hasFacilityCoordinates(row)
      ? `${row.latitude},${row.longitude}`
      : `${row.name}, ${row.address}, Itumbiara, GO`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
