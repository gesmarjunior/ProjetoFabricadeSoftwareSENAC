import { validateOccurrence } from '../utils/validation.js';
import { classify } from './classificationService.js';
import { config } from '../config.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const inputFields = [
  'description',
  'district',
  'latitude',
  'longitude',
  'image',
  'recurrent',
  'privacy_confirmed',
  'classification_reviewed',
  ...(config.kind === 'waste'
    ? ['category', 'volume', 'sensitive_area']
    : ['container_type', 'standing_water', 'outdoor_area']),
];

/** Uma instância por formulário evita persistências duplicadas durante uma requisição. */
export function createSubmission(repository) {
  let pending = false;
  let snapshot = null;
  let requestId;
  let lastSuppliedId;
  return {
    get pending() {
      return pending;
    },
    async submit(input) {
      if (pending) throw new Error('O registro já está sendo salvo. Aguarde.');
      const errors = validateOccurrence(input);
      if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
      if (input.classification_reviewed !== true)
        throw new Error('Confirme ou corrija a classificação antes de salvar.');
      const { submission_request_id: suppliedId, ...occurrence } = input;
      if (suppliedId !== undefined && !UUID_PATTERN.test(suppliedId))
        throw new Error(
          'O identificador do envio é inválido. Volte ao formulário e revise o registro.',
        );
      const nextSnapshot = JSON.stringify(inputFields.map((field) => occurrence[field]));
      if (nextSnapshot !== snapshot || suppliedId !== lastSuppliedId) {
        const reusedIdWithNewContent =
          snapshot !== null &&
          nextSnapshot !== snapshot &&
          (suppliedId === lastSuppliedId || suppliedId === requestId);
        requestId = reusedIdWithNewContent
          ? crypto.randomUUID()
          : suppliedId || crypto.randomUUID();
        snapshot = nextSnapshot;
        lastSuppliedId = suppliedId;
      }
      pending = true;
      try {
        return await repository.create(
          { ...occurrence, ...classify(occurrence), classification_reviewed: true },
          { requestId },
        );
      } finally {
        pending = false;
      }
    },
  };
}
