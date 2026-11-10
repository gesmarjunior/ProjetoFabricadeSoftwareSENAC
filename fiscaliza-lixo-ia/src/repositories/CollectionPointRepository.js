import { collectionPointCatalog } from './collectionPointCatalog.js';
import {
  collectionPointPayload,
  validateCollectionPoint,
} from '../services/collectionPointService.js';

export const pointColumns =
  'id,replaces_id,catalog_key,name,site_type,address,district,description,accepted_materials,rejected_materials,opening_hours,access_conditions,source_url,source_kind,source_notes,latitude,longitude,location_precision,location_notes,location_source_url,publication_status,created_at,information_reviewed';
const storageKey = 'waste-collection-points-v1';

function sameSubmission(row, payload) {
  return (
    row?.publication_status === 'pending' &&
    Object.entries(payload).every(([field, value]) =>
      typeof value === 'number'
        ? Number(row[field]) === value
        : JSON.stringify(row[field]) === JSON.stringify(value),
    )
  );
}

/** RLS limita sugestões a seu autor; a projeção não expõe o identificador do autor. */
export class CollectionPointRepository {
  constructor(client = null, storage = null) {
    this.client = client;
    this.storage = storage;
  }

  async list() {
    if (!this.client) {
      const raw = this.storage.getItem(storageKey);
      let saved;
      try {
        saved = raw ? JSON.parse(raw) : [];
      } catch {
        throw new Error('Os locais salvos neste navegador estão corrompidos.');
      }
      if (
        !Array.isArray(saved) ||
        saved.some(
          (row) =>
            !row?.id ||
            Object.keys(validateCollectionPoint(row)).length ||
            row.publication_status !== 'pending',
        )
      )
        throw new Error('Os locais salvos neste navegador estão em formato inválido.');
      return structuredClone([...collectionPointCatalog, ...saved]);
    }
    const rows = [];
    let total;
    do {
      const result = await this.client
        .from('fiscaliza_collection_points')
        .select(pointColumns, { count: 'exact' })
        .order('name')
        .order('id')
        .range(rows.length, rows.length + 199);
      if (result.error)
        throw new Error('Não foi possível carregar os locais de coleta.', { cause: result.error });
      if (
        !Number.isSafeInteger(result.count) ||
        result.count < 0 ||
        !Array.isArray(result.data) ||
        (total !== undefined && total !== result.count) ||
        (!result.data.length && rows.length < result.count)
      )
        throw new Error('A lista de locais mudou. Atualize para tentar novamente.');
      total = result.count;
      rows.push(...result.data);
      if (rows.length > total || new Set(rows.map((row) => row.id)).size !== rows.length)
        throw new Error('A lista de locais está incompleta ou repetida.');
    } while (rows.length < total);
    return rows;
  }

  async create(input) {
    const payload = collectionPointPayload(input);
    if (!this.client) {
      const rows = (await this.list()).filter((row) => row.publication_status === 'pending');
      const existing = rows.find((row) => row.id === payload.id);
      if (existing) {
        if (sameSubmission(existing, payload)) return existing;
        throw new Error('Este identificador já foi usado. Abra um novo cadastro.');
      }
      const row = {
        ...payload,
        publication_status: 'pending',
        source_kind: 'community',
        source_notes: '',
        location_notes: '',
        location_source_url: '',
        created_at: new Date().toISOString(),
      };
      try {
        this.storage.setItem(storageKey, JSON.stringify([...rows, row]));
      } catch (error) {
        throw new Error(
          'Não foi possível guardar a sugestão neste navegador. Mantenha os dados e tente novamente.',
          { cause: error },
        );
      }
      return row;
    }
    const result = await this.client
      .from('fiscaliza_collection_points')
      .insert(payload)
      .select(pointColumns)
      .single();
    if (!result.error) return result.data;
    // Uma resposta perdida pode ser repetida com a mesma chave, sem novo cadastro.
    if (result.error.code === '23505') {
      const existing = await this.client
        .from('fiscaliza_collection_points')
        .select(pointColumns)
        .eq('id', payload.id)
        .single();
      if (!existing.error && sameSubmission(existing.data, payload)) return existing.data;
    }
    throw new Error('Não foi possível confirmar o cadastro. Mantenha os dados e tente novamente.', {
      cause: result.error,
    });
  }
}
