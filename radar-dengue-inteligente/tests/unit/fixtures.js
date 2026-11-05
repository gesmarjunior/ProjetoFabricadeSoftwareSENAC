import { config } from '../../src/config.js';

export const sampleImage = 'data:image/jpeg;base64,YQ==';
export function validInput(overrides = {}) {
  return {
    category: config.categories[0],
    container_type: config.categories[0],
    volume: 'Grande',
    sensitive_area: true,
    standing_water: true,
    outdoor_area: true,
    recurrent: true,
    description: 'Relato fictício de descarte em área pública.',
    district: 'Setor Central',
    latitude: -16.681234,
    longitude: -49.261234,
    image: sampleImage,
    privacy_confirmed: true,
    classification_reviewed: true,
    ...overrides,
  };
}
