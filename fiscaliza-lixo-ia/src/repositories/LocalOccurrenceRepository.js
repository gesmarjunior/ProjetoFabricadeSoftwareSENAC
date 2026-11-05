import { config } from '../config.js';
import { OccurrenceRepository } from './OccurrenceRepository.js';
import { createDemoData } from './demoData.js';
import { assertTransition } from '../utils/status.js';
import { approximateCoordinates } from '../utils/data.js';
import { classify, riskLevel } from '../services/classificationService.js';
import { validateOccurrence } from '../utils/validation.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

const corruptedDataMessage =
  'Os dados locais estão corrompidos ou em formato inválido. Exporte uma cópia antes de limpar os dados do site.';
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isText = (value) => typeof value === 'string' && value.trim().length > 0;

function isDate(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    return false;
  // Date.parse normaliza datas como 30 de fevereiro; não aceite esse conteúdo.
  const calendarDate = value.slice(0, 10);
  const parsedDay = new Date(`${calendarDate}T00:00:00.000Z`);
  return (
    Number.isFinite(parsedDay.getTime()) && parsedDay.toISOString().slice(0, 10) === calendarDate
  );
}

function isCoordinate(value, minimum, maximum) {
  return (
    (typeof value === 'number' || isText(value)) &&
    Number.isFinite(Number(value)) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

function hasValidOptionalFields(row) {
  const booleanFields = [
    'is_demo',
    'classification_reviewed',
    'recurrent',
    ...(config.kind === 'waste' ? ['sensitive_area'] : ['standing_water', 'outdoor_area']),
  ];
  if (booleanFields.some((field) => row[field] !== undefined && typeof row[field] !== 'boolean'))
    return false;
  if (row.updated_at !== undefined && !isDate(row.updated_at)) return false;
  if (row.user_id !== undefined && row.user_id !== null && !isText(row.user_id)) return false;
  if (
    ['image_path', 'description', 'guidance'].some(
      (field) => row[field] !== undefined && row[field] !== null && typeof row[field] !== 'string',
    )
  )
    return false;
  if (
    row.breakdown !== undefined &&
    row.breakdown !== null &&
    (!Array.isArray(row.breakdown) ||
      !row.breakdown.every(
        (entry) =>
          isObject(entry) &&
          isText(entry.label) &&
          Number.isFinite(entry.points) &&
          entry.points >= 0 &&
          entry.points <= 100,
      ))
  )
    return false;
  return true;
}

/** Valida apenas os campos que as telas e mutações locais precisam consumir. */
function isStoredOccurrence(row) {
  if (!isObject(row)) return false;
  const category = config.kind === 'waste' ? row.category : row.container_type;
  if (
    !isText(row.id) ||
    !isDate(row.created_at) ||
    !isText(row.district) ||
    !config.statuses.includes(row.status) ||
    !config.categories.includes(category) ||
    row.classification !== category ||
    !isCoordinate(row.latitude, -90, 90) ||
    !isCoordinate(row.longitude, -180, 180) ||
    !Number.isInteger(row.risk_score) ||
    row.risk_score < 0 ||
    row.risk_score > 100
  )
    return false;
  if (row.risk_level !== riskLevel(row.risk_score)) return false;
  if (config.kind === 'waste' && !['Pequeno', 'Médio', 'Grande'].includes(row.volume)) return false;
  if (
    !Array.isArray(row.status_history) ||
    !row.status_history.every(
      (entry) =>
        isObject(entry) && config.statuses.includes(entry.status) && isDate(entry.created_at),
    )
  )
    return false;
  return hasValidOptionalFields(row);
}

export class LocalOccurrenceRepository extends OccurrenceRepository {
  constructor(storage = localStorage) {
    super();
    this.storage = storage;
    this.key = `${config.kind}-occurrences-v1`;
    this.userKey = `${config.kind}-anonymous-user-v1`;
    this.userId = null;
  }

  async init() {
    try {
      // Ausência é diferente de conteúdo vazio ou inválido: nunca substitua uma cópia existente.
      if (this.storage.getItem(this.key) === null) this.write(createDemoData());
      this.read();
      this.userId = this.storage.getItem(this.userKey) || crypto.randomUUID();
      this.storage.setItem(this.userKey, this.userId);
    } catch (error) {
      throw new Error(
        `Não foi possível abrir os dados locais. Verifique o armazenamento do navegador. ${error.message}`,
        { cause: error },
      );
    }
    return this;
  }

  read() {
    let value;
    try {
      value = JSON.parse(this.storage.getItem(this.key));
    } catch {
      throw new Error(corruptedDataMessage);
    }
    if (!Array.isArray(value) || !value.every(isStoredOccurrence))
      throw new Error(corruptedDataMessage);
    if (new Set(value.map((row) => row.id)).size !== value.length)
      throw new Error(corruptedDataMessage);
    return value;
  }

  write(rows) {
    try {
      this.storage.setItem(this.key, JSON.stringify(rows));
    } catch {
      throw new Error(
        'Não foi possível salvar no dispositivo. O armazenamento pode estar cheio ou bloqueado. Seus campos foram preservados.',
      );
    }
  }

  async list() {
    return clone(this.read()).map((row) => ({
      ...row,
      is_owner: !row.is_demo && row.user_id === this.userId,
    }));
  }

  async get(id) {
    const row = (await this.list()).find((item) => item.id === id);
    if (!row) throw new Error('Registro não encontrado.');
    return row;
  }

  async create(input) {
    const errors = validateOccurrence(input);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
    if (input.classification_reviewed !== true)
      throw new Error('A classificação precisa ser confirmada.');
    const now = new Date().toISOString();
    const record = {
      ...input,
      ...classify(input),
      ...approximateCoordinates(input.latitude, input.longitude),
      id: crypto.randomUUID(),
      user_id: this.userId,
      created_at: now,
      updated_at: now,
      description: input.description.trim(),
      district: input.district.trim(),
      image_path: input.image,
      status: 'Recebido',
      status_history: [{ status: 'Recebido', created_at: now }],
      is_demo: false,
      is_owner: true,
    };
    delete record.image;
    this.write([record, ...this.read()]);
    return clone(record);
  }

  async updateStatus(id, status) {
    const rows = this.read();
    const index = rows.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Registro não encontrado.');
    const row = rows[index];
    if (row.is_demo || row.user_id !== this.userId)
      throw new Error('Você pode alterar somente os registros criados neste dispositivo.');
    assertTransition(row.status, status);
    const updated_at = new Date().toISOString();
    rows[index] = {
      ...row,
      status,
      updated_at,
      status_history: [...row.status_history, { status, created_at: updated_at }],
    };
    this.write(rows);
    return { ...clone(rows[index]), is_owner: true };
  }

  async getImageUrl(path) {
    return path || null;
  }
}
