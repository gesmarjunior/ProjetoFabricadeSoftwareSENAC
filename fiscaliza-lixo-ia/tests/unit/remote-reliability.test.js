import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseOccurrenceRepository } from '../../src/repositories/SupabaseOccurrenceRepository.js';
import { createSubmission } from '../../src/services/submissionService.js';
import { validInput } from './fixtures.js';

const REQUEST_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = 'user-one';
const ok = (data, count) => ({ data, count, status: 200, error: null });
const fail = (message, status = 0, code = '') => ({ data: null, status, error: { message, code } });

/** Um servidor em memória: cada chamada cria um builder e aplica filtros antes de responder. */
function createServer({ ownRows = [], communityRows = [], cap = 250 } = {}) {
  const server = {
    rows: [...ownRows],
    communityRows,
    photos: new Set(),
    requests: [],
    insertResults: [],
    insertActions: [],
    lookupCalls: 0,
  };
  function publicRow(row) {
    const {
      user_id: owner,
      image_path: photo,
      description: report,
      status_history: history,
      ...safe
    } = row;
    void owner;
    void photo;
    void report;
    void history;
    return safe;
  }
  function builder(kind) {
    const filters = [];
    const orders = [];
    let selection;
    let payload;
    const query = {
      select(_columns, options) {
        selection = options;
        return query;
      },
      eq(key, value) {
        filters.push([key, value]);
        return query;
      },
      order(key, options) {
        orders.push([key, options]);
        return query;
      },
      insert(value) {
        payload = value;
        return query;
      },
      async range(start, end) {
        const rows = matching().sort(
          (a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id),
        );
        server.requests.push({ kind, filters, orders, selection, start, end });
        const result = ok(rows.slice(start, Math.min(end + 1, start + cap)), rows.length);
        return server.rangeOverride?.(kind, start, result) ?? result;
      },
      async maybeSingle() {
        server.lookupCalls += 1;
        server.requests.push({ kind, filters, lookup: true });
        const result = ok(matching()[0] || null);
        return server.lookupOverride?.(kind, filters, result, server.lookupCalls) ?? result;
      },
      async single() {
        server.insert.mock.calls.push([payload]);
        const commit = () => {
          const row = {
            ...payload,
            id: `saved-${server.rows.length + 1}`,
            created_at: '2026-11-04T12:00:00Z',
          };
          server.rows.push(row);
          return row;
        };
        let result;
        const action = server.insertActions.shift();
        if (action) result = await action(payload, commit);
        else if (server.rows.some((row) => row.image_path === payload.image_path))
          result = fail('image_path já existe', 409, '23505');
        else result = ok(commit());
        server.insertResults.push(result);
        return result;
      },
    };
    function matching() {
      const rows =
        kind === 'own' ? server.rows : [...server.rows, ...server.communityRows].map(publicRow);
      return rows.filter((row) => filters.every(([key, value]) => row[key] === value));
    }
    return query;
  }
  server.insert = { mock: { calls: [] } };
  server.storage = {
    upload: vi.fn(async (path) => {
      if (server.photos.has(path))
        return { data: null, error: { statusCode: '409', message: 'The resource already exists' } };
      server.photos.add(path);
      return ok({ path });
    }),
    remove: vi.fn(async (paths) => {
      paths.forEach((path) => server.photos.delete(path));
      return ok([]);
    }),
  };
  server.client = {
    from: vi.fn(() => builder('own')),
    rpc: vi.fn((_name, _args, options) => {
      const query = builder('community');
      return query.select('*', options);
    }),
    storage: { from: vi.fn(() => server.storage) },
  };
  server.repo = new SupabaseOccurrenceRepository(server.client);
  server.repo.userId = USER_ID;
  return server;
}

function rows(count, owner = USER_ID, offset = 0) {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${String(index + offset).padStart(6, '0')}`,
    user_id: owner,
    created_at: new Date(Date.UTC(2026, 10, 4, 0, index + offset)).toISOString(),
    image_path: `${owner}/photo-${index + offset}.jpg`,
    description: 'Relato privado que não pode aparecer na projeção comunitária.',
    status_history: [{ status: 'Recebido', created_at: '2026-11-04T00:00:00Z' }],
  }));
}

describe('leitura remota completa e direta', () => {
  it('carrega mais de mil registros mesmo com cap menor que a página solicitada', async () => {
    const server = createServer({
      ownRows: rows(1203),
      communityRows: rows(4, 'other-user', 2000),
      cap: 37,
    });
    const result = await server.repo.list();
    expect(result).toHaveLength(1207);
    expect(result.filter((row) => row.is_owner)).toHaveLength(1203);
    expect(
      result
        .filter((row) => !row.is_owner)
        .every(
          (row) =>
            !('user_id' in row) &&
            !('description' in row) &&
            !('image_path' in row) &&
            !('status_history' in row),
        ),
    ).toBe(true);
    for (const request of server.requests) {
      expect(request.end - request.start + 1).toBe(250);
      expect(request.selection).toEqual({ count: 'exact' });
      expect(request.orders).toEqual([
        ['created_at', { ascending: false }],
        ['id', { ascending: false }],
      ]);
    }
    expect(server.requests.some((request) => request.start === 37)).toBe(true);
    expect(new Set(result.map((row) => row.id)).size).toBe(1207);
  });

  it('consulta um registro antigo pelo ID sem baixar toda a listagem', async () => {
    const own = rows(1203);
    const community = rows(2, 'other-user', 2000);
    const server = createServer({ ownRows: own, communityRows: community });
    expect(await server.repo.get(own[0].id)).toMatchObject({ id: own[0].id, is_owner: true });
    expect(await server.repo.get(community[0].id)).toMatchObject({
      id: community[0].id,
      is_owner: false,
    });
    expect(
      server.requests.every(
        (request) => request.lookup && request.filters.some(([key]) => key === 'id'),
      ),
    ).toBe(true);
    await expect(server.repo.get('missing')).rejects.toThrow('não encontrado');
  });

  it.each(['missing-count', 'empty-page', 'repeated-page', 'changed-total', 'oversized-page'])(
    'não apresenta total falso quando o servidor retorna %s',
    async (scenario) => {
      const server = createServer({ ownRows: rows(10), cap: 4 });
      server.rangeOverride = (kind, start, result) => {
        if (kind !== 'own') return result;
        if (scenario === 'missing-count') return { ...result, count: null };
        if (scenario === 'oversized-page') return { ...result, count: 0 };
        if (start !== 4) return result;
        if (scenario === 'empty-page') return { ...result, data: [] };
        if (scenario === 'repeated-page')
          return { ...result, data: server.rows.slice(-4).reverse() };
        return { ...result, count: 11 };
      };
      await expect(server.repo.list()).rejects.toThrow(/total|incompleta|repetidos|mudaram/);
      expect(server.requests.length).toBeLessThan(10);
    },
  );
});

describe('envio remoto e tentativas idempotentes', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ blob: async () => new Blob(['photo'], { type: 'image/jpeg' }) }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('recupera INSERT confirmado no servidor cuja resposta se perdeu e não apaga a foto', async () => {
    const server = createServer();
    server.insertActions.push((_payload, commit) => {
      commit();
      return fail('Failed to fetch');
    });
    const saved = await server.repo.create(validInput(), { requestId: REQUEST_ID });
    expect(saved.is_owner).toBe(true);
    expect(server.rows).toHaveLength(1);
    expect(server.photos.has(`${USER_ID}/${REQUEST_ID}.jpg`)).toBe(true);
    expect(server.storage.remove).not.toHaveBeenCalled();
    const repeated = await server.repo.create(validInput(), { requestId: REQUEST_ID });
    expect(repeated.id).toBe(saved.id);
    expect(server.insert.mock.calls).toHaveLength(1);
    expect(server.storage.upload).toHaveBeenCalledOnce();
  });

  it('mantém a chave e recupera o registro após falha de reconciliação e nova tentativa', async () => {
    const server = createServer();
    const service = createSubmission(server.repo);
    server.insertActions.push((_payload, commit) => {
      commit();
      return fail('resposta perdida', 503);
    });
    server.lookupOverride = (_kind, _filters, result, call) =>
      call === 2 ? fail('rede indisponível', 503) : result;
    await expect(service.submit(validInput())).rejects.toThrow('Confira o acompanhamento');
    expect(server.storage.remove).not.toHaveBeenCalled();
    const path = server.rows[0].image_path;
    await expect(service.submit(validInput())).resolves.toMatchObject({ image_path: path });
    expect(server.rows).toHaveLength(1);
    expect(server.insert.mock.calls).toHaveLength(1);
    expect(server.photos.has(path)).toBe(true);
  });

  it('duas tentativas concorrentes usam a mesma foto e recuperam o conflito 23505', async () => {
    const server = createServer();
    const [first, second] = await Promise.all([
      server.repo.create(validInput(), { requestId: REQUEST_ID }),
      server.repo.create(validInput(), { requestId: REQUEST_ID }),
    ]);
    expect(first.id).toBe(second.id);
    expect(server.rows).toHaveLength(1);
    expect(server.photos.size).toBe(1);
    expect(server.insertResults.some((result) => result.error?.code === '23505')).toBe(true);
    expect(server.storage.remove).not.toHaveBeenCalled();
  });

  it.each([0, 503, 408])(
    'preserva foto e orienta conferência quando o INSERT retorna status %s sem confirmação',
    async (status) => {
      const server = createServer();
      server.insertActions.push(() => fail('Servidor indisponível', status));
      await expect(server.repo.create(validInput(), { requestId: REQUEST_ID })).rejects.toThrow(
        'Confira o acompanhamento',
      );
      expect(server.photos.size).toBe(1);
      expect(server.storage.remove).not.toHaveBeenCalled();
      await expect(
        server.repo.create(validInput(), { requestId: REQUEST_ID }),
      ).resolves.toMatchObject({ is_owner: true });
      expect(server.rows).toHaveLength(1);
      expect(server.photos.size).toBe(1);
      expect(server.storage.upload.mock.calls[0][0]).toBe(server.storage.upload.mock.calls[1][0]);
    },
  );

  it('rejeição de rede após commit também é reconciliada antes de qualquer remoção', async () => {
    const server = createServer();
    server.insertActions.push((_payload, commit) => {
      commit();
      throw new TypeError('conexão perdida');
    });
    await expect(
      server.repo.create(validInput(), { requestId: REQUEST_ID }),
    ).resolves.toMatchObject({ is_owner: true });
    expect(server.rows).toHaveLength(1);
    expect(server.storage.remove).not.toHaveBeenCalled();
  });

  it('rejeição de rede sem commit deixa a foto para retry com a mesma chave', async () => {
    const server = createServer();
    server.insertActions.push(() => {
      throw new TypeError('conexão perdida');
    });
    await expect(server.repo.create(validInput(), { requestId: REQUEST_ID })).rejects.toThrow(
      'Confira o acompanhamento',
    );
    expect(server.rows).toHaveLength(0);
    expect(server.photos.size).toBe(1);
    expect(server.storage.remove).not.toHaveBeenCalled();
  });

  it('remove foto somente após rejeição definitiva comprovada sem registro existente', async () => {
    const server = createServer();
    server.insertActions.push(() => fail('categoria recusada', 400, '23514'));
    await expect(server.repo.create(validInput(), { requestId: REQUEST_ID })).rejects.toThrow(
      'Não foi possível salvar o registro',
    );
    expect(server.photos.size).toBe(0);
    expect(server.storage.remove).toHaveBeenCalledWith([`${USER_ID}/${REQUEST_ID}.jpg`]);
    expect(server.lookupCalls).toBe(2);
  });

  it('SQLSTATE definitivo também permite compensação; falha de cleanup mantém o erro original', async () => {
    const server = createServer();
    server.insertActions.push(() => ({
      data: null,
      error: { message: 'acesso negado', code: '42501' },
    }));
    server.storage.remove.mockRejectedValueOnce(new TypeError('rede durante remoção'));
    await expect(server.repo.create(validInput(), { requestId: REQUEST_ID })).rejects.toThrow(
      'Não foi possível concluir o envio da foto',
    );
    expect(server.photos.size).toBe(1);
  });

  it('conflito sem linha visível ainda não autoriza apagar a foto', async () => {
    const server = createServer();
    server.insertActions.push(() => fail('unique conflict', 409, '23505'));
    await expect(server.repo.create(validInput(), { requestId: REQUEST_ID })).rejects.toThrow(
      'Confira o acompanhamento',
    );
    expect(server.storage.remove).not.toHaveBeenCalled();
  });

  it('falha na conferência inicial não envia nem remove foto', async () => {
    const server = createServer();
    server.lookupOverride = () => {
      throw new TypeError('sem rede');
    };
    await expect(server.repo.create(validInput(), { requestId: REQUEST_ID })).rejects.toThrow(
      'Confira o acompanhamento',
    );
    expect(server.storage.upload).not.toHaveBeenCalled();
    expect(server.storage.remove).not.toHaveBeenCalled();
  });

  it('upload interrompido não envia linha nem tenta apagar um arquivo incerto', async () => {
    const server = createServer();
    server.storage.upload.mockRejectedValueOnce(new TypeError('upload interrompido'));
    await expect(server.repo.create(validInput(), { requestId: REQUEST_ID })).rejects.toThrow(
      'Confira o acompanhamento',
    );
    expect(server.insert.mock.calls).toHaveLength(0);
    expect(server.storage.remove).not.toHaveBeenCalled();
  });

  it('upload recusado definitivamente mostra erro sem inserir linha', async () => {
    const server = createServer();
    server.storage.upload.mockResolvedValueOnce({
      data: null,
      error: { message: 'upload negado', statusCode: '403' },
    });
    await expect(server.repo.create(validInput(), { requestId: REQUEST_ID })).rejects.toThrow(
      'Não foi possível enviar a foto',
    );
    expect(server.insert.mock.calls).toHaveLength(0);
  });

  it('não declara sucesso para uma resposta de INSERT sem dados', async () => {
    const server = createServer();
    server.insertActions.push(() => ok(null));
    await expect(server.repo.create(validInput(), { requestId: REQUEST_ID })).rejects.toThrow(
      'confirmar',
    );
    expect(server.photos.size).toBe(1);
  });

  it('valida autoria e chave antes de enviar a foto', async () => {
    const server = createServer();
    await expect(server.repo.create(validInput(), { requestId: '../other' })).rejects.toThrow(
      'identificador',
    );
    server.repo.userId = null;
    await expect(server.repo.create(validInput())).rejects.toThrow('Recarregue');
    expect(server.storage.upload).not.toHaveBeenCalled();
  });

  it('service usa nonce persistido, retém chave no retry e renova quando campos relevantes mudam', async () => {
    const repository = {
      create: vi.fn().mockRejectedValueOnce(new Error('rede')).mockResolvedValue({ id: 'saved' }),
    };
    const service = createSubmission(repository);
    const input = validInput({ submission_request_id: REQUEST_ID });
    await expect(service.submit(input)).rejects.toThrow('rede');
    await service.submit({ ...input, risk_score: 999, breakdown: [] });
    const [first, second] = repository.create.mock.calls;
    expect(first[1]).toEqual({ requestId: REQUEST_ID });
    expect(second[1]).toEqual(first[1]);
    expect(first[0]).not.toHaveProperty('submission_request_id');
    repository.create.mockRejectedValueOnce(new Error('rede no conteúdo alterado'));
    await expect(
      service.submit({ ...input, description: 'Outro relato fictício com conteúdo alterado.' }),
    ).rejects.toThrow('rede no conteúdo alterado');
    const changedRequestId = repository.create.mock.calls[2][1].requestId;
    expect(changedRequestId).not.toBe(REQUEST_ID);
    await service.submit({ ...input, description: 'Outro relato fictício com conteúdo alterado.' });
    expect(repository.create.mock.calls[3][1].requestId).toBe(changedRequestId);
    await expect(
      service.submit(validInput({ submission_request_id: 'unsafe/path' })),
    ).rejects.toThrow('identificador');
  });

  it('uma nova nonce permite um novo registro intencional com o mesmo conteúdo', async () => {
    const secondId = '22222222-2222-4222-8222-222222222222';
    const repository = { create: vi.fn().mockResolvedValue({ id: 'saved' }) };
    const service = createSubmission(repository);
    await service.submit(validInput({ submission_request_id: REQUEST_ID }));
    await service.submit(validInput({ submission_request_id: secondId }));
    await service.submit(validInput({ submission_request_id: secondId, risk_score: 999 }));
    expect(repository.create.mock.calls.map((call) => call[1].requestId)).toEqual([
      REQUEST_ID,
      secondId,
      secondId,
    ]);
  });
});
