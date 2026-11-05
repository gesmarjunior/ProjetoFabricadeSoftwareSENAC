import { config } from '../config.js';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateImage(image) {
  if (!image) return 'Adicione uma foto do local sem pessoas ou dados pessoais.';
  if (typeof image === 'string') {
    const match = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
    if (!match || match[1].length % 4 !== 0) return 'Use uma imagem JPEG, PNG ou WebP válida.';
    const encoded = match[1];
    const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
    const bytes = (encoded.length / 4) * 3 - padding;
    if (bytes > MAX_IMAGE_BYTES) return 'A imagem deve ter no máximo 5 MB.';
    return '';
  }
  if (!IMAGE_TYPES.includes(image.type)) return 'Use uma imagem JPEG, PNG ou WebP.';
  if (!Number.isSafeInteger(image.size) || image.size <= 0)
    return 'O arquivo de imagem está vazio ou tem tamanho inválido.';
  if (image.size > MAX_IMAGE_BYTES) return 'A imagem deve ter no máximo 5 MB.';
  return '';
}

export function validCoordinate(value, min, max) {
  return (
    (typeof value === 'number' ||
      (typeof value === 'string' &&
        /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()))) &&
    Number.isFinite(Number(value)) &&
    Number(value) >= min &&
    Number(value) <= max
  );
}

/** Retorna mensagens por campo; não modifica os dados preenchidos. */
export function validateOccurrence(input) {
  const values = input !== null && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const errors = {};
  const description = typeof values.description === 'string' ? values.description.trim() : '';
  const district = typeof values.district === 'string' ? values.district.trim() : '';
  if (description.length < 10 || description.length > 1000)
    errors.description = 'Descreva a situação com 10 a 1.000 caracteres.';
  if (district.length < 2 || district.length > 80)
    errors.district = 'Informe o bairro com 2 a 80 caracteres.';
  if (!validCoordinate(values.latitude, -90, 90))
    errors.latitude = 'Informe uma latitude válida entre -90 e 90.';
  if (!validCoordinate(values.longitude, -180, 180))
    errors.longitude = 'Informe uma longitude válida entre -180 e 180.';
  const field = config.kind === 'waste' ? 'category' : 'container_type';
  if (!config.categories.includes(values[field])) errors[field] = 'Selecione uma categoria válida.';
  if (config.kind === 'waste' && !['Pequeno', 'Médio', 'Grande'].includes(values.volume))
    errors.volume = 'Selecione o volume dos resíduos.';
  const conditions =
    config.kind === 'waste'
      ? ['recurrent', 'sensitive_area']
      : ['recurrent', 'standing_water', 'outdoor_area'];
  for (const condition of conditions) {
    if (values[condition] !== undefined && typeof values[condition] !== 'boolean')
      errors[condition] = 'Informe Sim ou Não para esta condição.';
  }
  if (values.privacy_confirmed !== true)
    errors.privacy_confirmed = 'Confirme que a foto e o relato não expõem dados pessoais.';
  const imageError = validateImage(values.image);
  if (imageError) errors.image = imageError;
  return errors;
}
