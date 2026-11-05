import { config } from '../config.js';
import { OccurrenceRepository } from './OccurrenceRepository.js';
import { approximateCoordinates } from '../utils/data.js';
import { assertTransition } from '../utils/status.js';
import { classify } from '../services/classificationService.js';
import { validateOccurrence } from '../utils/validation.js';

function assertResult(result, context) {
  if (result.error)
    throw new Error(`${context}. Tente novamente em instantes.`, { cause: result.error });
  return result.data;
}

const PAGE_SIZE = 250;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** O avanço usa a quantidade recebida, pois o servidor pode limitar páginas a menos de 250. */
async function fetchAllPages(makeQuery, context) {
  const rows = [];
  const ids = new Set();
  let total;
  do {
    const result = await makeQuery()
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(rows.length, rows.length + PAGE_SIZE - 1);
    const page = assertResult(result, context) || [];
    if (!Number.isSafeInteger(result.count) || result.count < 0)
      throw new Error(
        `${context}: o servidor não informou o total necessário para carregar todos os registros.`,
      );
    if (total !== undefined && total !== result.count)
      throw new Error(`${context}: os registros mudaram durante a leitura. Tente novamente.`);
    total = result.count;
    if (
      !Array.isArray(page) ||
      rows.length + page.length > total ||
      (!page.length && rows.length < total)
    )
      throw new Error(`${context}: o servidor retornou uma página incompleta. Tente novamente.`);
    for (const row of page) {
      if (!row?.id || ids.has(row.id))
        throw new Error(
          `${context}: a paginação retornou registros repetidos ou inválidos. Tente novamente.`,
        );
      ids.add(row.id);
      rows.push(row);
    }
  } while (rows.length < total);
  return rows;
}

function responseStatus(result) {
  return Number(result?.status ?? result?.error?.statusCode ?? result?.error?.status);
}

function isConflict(result) {
  return (
    responseStatus(result) === 409 ||
    ['23505', 'Duplicate'].includes(result?.error?.code) ||
    result?.error?.error === 'Duplicate'
  );
}

function isDefinitiveRejection(result) {
  const status = responseStatus(result);
  if (status === 0 || status === 408 || status >= 500) return false;
  if (status >= 400 && status < 500) return true;
  const code = result?.error?.code || '';
  return /^[0-9A-Z]{5}$/.test(code) && !code.startsWith('08') && code !== '40003';
}

function uncertainSave(error) {
  return new Error(
    'Não foi possível confirmar se o registro foi salvo. Confira o acompanhamento antes de tentar novamente.',
    { cause: error },
  );
}

export class SupabaseOccurrenceRepository extends OccurrenceRepository {
  constructor(client) {
    super();
    this.client = client;
    this.userId = null;
  }

  async init() {
    const data = assertResult(
      await this.client.auth.getSession(),
      'Não foi possível recuperar a sessão',
    );
    if (data.session) this.userId = data.session.user.id;
    else {
      const auth = assertResult(
        await this.client.auth.signInAnonymously(),
        'Não foi possível conectar ao aplicativo',
      );
      this.userId = auth.user.id;
    }
    return this;
  }

  async list() {
    const [own, community] = await Promise.all([
      fetchAllPages(
        () =>
          this.client.from(config.table).select('*', { count: 'exact' }).eq('user_id', this.userId),
        'Não foi possível carregar seus registros',
      ),
      fetchAllPages(
        () => this.communityQuery({ count: 'exact' }),
        'Não foi possível carregar o mapa comunitário',
      ),
    ]);
    const ownIds = new Set(own.map((row) => row.id));
    return [
      ...own.map((row) => ({ ...row, is_owner: true })),
      ...community.filter((row) => !ownIds.has(row.id)).map((row) => ({ ...row, is_owner: false })),
    ].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  }

  async get(id) {
    const own = assertResult(
      await this.client
        .from(config.table)
        .select('*')
        .eq('user_id', this.userId)
        .eq('id', id)
        .maybeSingle(),
      'Não foi possível carregar o registro',
    );
    if (own) return { ...own, is_owner: true };
    const row = assertResult(
      await this.communityQuery().eq('id', id).maybeSingle(),
      'Não foi possível carregar o registro comunitário',
    );
    if (!row) throw new Error('Registro não encontrado ou não disponível.');
    return { ...row, is_owner: false };
  }

  communityQuery(options = {}) {
    return this.client.rpc(
      config.kind === 'waste'
        ? 'get_fiscaliza_community_occurrences'
        : 'get_dengue_community_occurrences',
      {},
      options,
    );
  }

  async findOwnByImagePath(path) {
    return assertResult(
      await this.client
        .from(config.table)
        .select('*')
        .eq('user_id', this.userId)
        .eq('image_path', path)
        .maybeSingle(),
      'Não foi possível conferir o envio anterior',
    );
  }

  async reconcile(path, originalError) {
    try {
      const row = await this.findOwnByImagePath(path);
      return row ? { ...row, is_owner: true } : null;
    } catch (error) {
      throw uncertainSave(
        new Error(`${originalError?.message || 'Envio não confirmado.'} ${error.message}`, {
          cause: error,
        }),
      );
    }
  }

  /** requestId identifica uma tentativa lógica; o índice único protege respostas perdidas e concorrência. */
  async create(input, { requestId = crypto.randomUUID() } = {}) {
    const errors = validateOccurrence(input);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
    if (input.classification_reviewed !== true)
      throw new Error('A classificação precisa ser confirmada.');
    if (!this.userId) throw new Error('Recarregue a página para continuar seu registro.');
    if (!UUID_PATTERN.test(requestId)) throw new Error('O identificador do envio é inválido.');
    const path = `${this.userId}/${requestId}.jpg`;
    const previous = await this.reconcile(path);
    if (previous) return previous;
    const analysis = classify(input);
    const blob = await (await fetch(input.image)).blob();
    let upload;
    try {
      upload = await this.client.storage
        .from(config.bucket)
        .upload(path, blob, { contentType: blob.type, upsert: false });
    } catch (error) {
      throw uncertainSave(error);
    }
    if (upload.error && !isConflict(upload)) {
      if (!isDefinitiveRejection(upload)) throw uncertainSave(upload.error);
      assertResult(upload, 'Não foi possível enviar a foto');
    }
    const payload = {
      user_id: this.userId,
      image_path: path,
      description: input.description.trim(),
      district: input.district.trim(),
      ...approximateCoordinates(input.latitude, input.longitude),
      classification: analysis.classification,
      classification_reviewed: true,
      risk_score: analysis.risk_score,
      risk_level: analysis.risk_level,
      guidance: analysis.guidance,
      status: 'Recebido',
      recurrent: Boolean(input.recurrent),
      ...(config.kind === 'waste'
        ? {
            category: input.category,
            volume: input.volume,
            sensitive_area: Boolean(input.sensitive_area),
          }
        : {
            container_type: input.container_type,
            standing_water: Boolean(input.standing_water),
            outdoor_area: Boolean(input.outdoor_area),
          }),
    };
    let result;
    try {
      result = await this.client.from(config.table).insert(payload).select('*').single();
    } catch (error) {
      const recovered = await this.reconcile(path, error);
      if (recovered) return recovered;
      throw uncertainSave(error);
    }
    if (!result.error && result.data?.id) return { ...result.data, is_owner: true };
    const recovered = await this.reconcile(path, result.error);
    if (recovered) return recovered;
    if (isConflict(result) || !isDefinitiveRejection(result)) throw uncertainSave(result.error);
    let cleanupFailed;
    try {
      cleanupFailed = Boolean((await this.client.storage.from(config.bucket).remove([path])).error);
    } catch {
      cleanupFailed = true;
    }
    const extra = cleanupFailed ? ' Não foi possível concluir o envio da foto.' : '';
    throw new Error(`Não foi possível salvar o registro.${extra} Tente novamente em instantes.`, {
      cause: result.error,
    });
  }

  async updateStatus(id, status) {
    const current = await this.get(id);
    if (!current.is_owner) throw new Error('Você pode alterar somente seus próprios registros.');
    assertTransition(current.status, status);
    const data = assertResult(
      await this.client
        .from(config.table)
        .update({ status })
        .eq('id', id)
        .eq('user_id', this.userId)
        .select('*')
        .single(),
      'Não foi possível atualizar o status',
    );
    return { ...data, is_owner: true };
  }

  async getImageUrl(path) {
    if (!path) return null;
    const data = assertResult(
      await this.client.storage.from(config.bucket).createSignedUrl(path, 300),
      'Não foi possível carregar a foto',
    );
    return data.signedUrl;
  }
}
