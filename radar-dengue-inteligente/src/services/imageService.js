import { validateImage } from '../utils/validation.js';

export function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Não foi possível ler a foto. Escolha outro arquivo.'));
    reader.readAsDataURL(file);
  });
}

/** Reencodar remove metadados EXIF e limita o lado maior a 1600 pixels. */
export async function prepareImage(file) {
  const error = validateImage(file);
  if (error) throw new Error(error);
  const source = await readImage(file);
  const image = new Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('A foto está corrompida ou não pode ser aberta.'));
    image.src = source;
  });
  const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context)
    throw new Error('O navegador não conseguiu preparar a foto. Tente outro navegador.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const result = canvas.toDataURL('image/jpeg', 0.8);
  const outputError = validateImage(result);
  if (outputError) throw new Error(outputError);
  return result;
}
