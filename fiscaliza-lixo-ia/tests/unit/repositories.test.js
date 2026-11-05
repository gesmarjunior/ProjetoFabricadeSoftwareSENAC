import { beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '../../src/config.js';
import { LocalOccurrenceRepository } from '../../src/repositories/LocalOccurrenceRepository.js';
import { SupabaseOccurrenceRepository } from '../../src/repositories/SupabaseOccurrenceRepository.js';
import { OccurrenceRepository } from '../../src/repositories/OccurrenceRepository.js';
import { validInput, sampleImage } from './fixtures.js';

function mockClient() {
  const client = {
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: { user: { id: 'user-one' } } }, error: null }),
      signInAnonymously: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: 'user-new' } }, error: null }),
    },
    from: vi.fn(),
    rpc: vi.fn(),
    storage: { from: vi.fn() },
  };
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    single: vi.fn(),
  };
  for (const key of ['select', 'eq', 'order', 'insert', 'update'])
    query[key].mockReturnValue(query);
  query.range.mockResolvedValue({ data: [], count: 0, status: 200, error: null });
  query.maybeSingle.mockResolvedValue({ data: null, status: 200, error: null });
  query.single.mockResolvedValue({
    data: { id: 'saved-id', status: 'Recebido', user_id: 'user-one' },
    error: null,
  });
  client.from.mockReturnValue(query);
  const communityQuery = { eq: vi.fn(), order: vi.fn(), range: vi.fn(), maybeSingle: vi.fn() };
  communityQuery.eq.mockReturnValue(communityQuery);
  communityQuery.order.mockReturnValue(communityQuery);
  communityQuery.range.mockResolvedValue({ data: [], count: 0, status: 200, error: null });
  communityQuery.maybeSingle.mockResolvedValue({ data: null, status: 200, error: null });
  client.rpc.mockReturnValue(communityQuery);
  const storage = {
    upload: vi.fn().mockResolvedValue({ data: { path: 'photo.jpg' }, error: null }),
    remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    createSignedUrl: vi
      .fn()
      .mockResolvedValue({ data: { signedUrl: 'https://example.test/signed-photo' }, error: null }),
  };
  client.storage.from.mockReturnValue(storage);
  return { client, query, communityQuery, storage };
}

describe('contrato localStorage', () => {
  let repo;
  beforeEach(async () => {
    localStorage.clear();
    repo = new LocalOccurrenceRepository();
    await repo.init();
  });

  it('inicializa seis dados fictícios e usuário persistente', async () => {
    const rows = await repo.list();
    expect(rows).toHaveLength(6);
    expect(rows.every((row) => row.is_demo && !row.is_owner)).toBe(true);
    const again = new LocalOccurrenceRepository();
    await again.init();
    expect(again.userId).toBe(repo.userId);
    expect(await again.list()).toHaveLength(6);
  });
  it('cria, isola mutações e persiste após nova instância', async () => {
    const record = await repo.create(validInput());
    expect(record).toMatchObject({
      status: 'Recebido',
      is_demo: false,
      is_owner: true,
      latitude: -16.681,
      longitude: -49.261,
      image_path: sampleImage,
    });
    expect(record.status_history).toHaveLength(1);
    record.description = 'Mutação externa';
    expect((await repo.get(record.id)).description).not.toBe('Mutação externa');
    const again = new LocalOccurrenceRepository();
    await again.init();
    expect(await again.list()).toHaveLength(7);
    expect((await again.get(record.id)).is_owner).toBe(true);
    expect(await repo.getImageUrl(record.image_path)).toBe(sampleImage);
    expect(await repo.getImageUrl(null)).toBeNull();
  });
  it('valida campos e revisão também na fronteira do repositório', async () => {
    await expect(repo.create({})).rejects.toThrow('Descreva');
    await expect(repo.create(validInput({ classification_reviewed: false }))).rejects.toThrow(
      'confirmada',
    );
    expect(await repo.list()).toHaveLength(6);
  });
  it('atualiza somente status próprio e acrescenta histórico', async () => {
    const record = await repo.create(validInput());
    const updated = await repo.updateStatus(record.id, 'Em análise');
    expect(updated.status_history.map((row) => row.status)).toEqual(['Recebido', 'Em análise']);
    expect(updated.is_owner).toBe(true);
    await expect(repo.updateStatus(record.id, 'Recebido')).rejects.toThrow('não é permitida');
    const community = (await repo.list()).find((row) => !row.is_owner);
    await expect(repo.updateStatus(community.id, 'Em análise')).rejects.toThrow('somente');
    await expect(repo.updateStatus('missing', 'Em análise')).rejects.toThrow('não encontrado');
    await expect(repo.get('missing')).rejects.toThrow('não encontrado');
  });
  it('explica formato corrompido, storage bloqueado e quota cheia', async () => {
    localStorage.setItem(repo.key, '{bad');
    await expect(repo.list()).rejects.toThrow('corrompidos');
    localStorage.setItem(repo.key, '{}');
    await expect(repo.list()).rejects.toThrow('formato inválido');
    const blocked = new LocalOccurrenceRepository({
      getItem() {
        throw new Error('Bloqueado');
      },
    });
    await expect(blocked.init()).rejects.toThrow('abrir os dados locais');
    const full = new LocalOccurrenceRepository({
      setItem() {
        throw new Error('Quota');
      },
    });
    expect(() => full.write([])).toThrow('armazenamento pode estar cheio');
  });
});

describe('adaptador Supabase com cliente mockado', () => {
  let repo, client, query, communityQuery, storage;
  beforeEach(async () => {
    ({ client, query, communityQuery, storage } = mockClient());
    repo = new SupabaseOccurrenceRepository(client);
    await repo.init();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ blob: async () => new Blob(['photo'], { type: 'image/jpeg' }) }),
    );
  });

  it('reusa sessão existente ou autentica anonimamente', async () => {
    expect(repo.userId).toBe('user-one');
    expect(client.auth.signInAnonymously).not.toHaveBeenCalled();
    client.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    await repo.init();
    expect(repo.userId).toBe('user-new');
    expect(client.auth.signInAnonymously).toHaveBeenCalledOnce();
  });
  it('propaga erro de sessão e de autenticação sem fallback silencioso', async () => {
    client.auth.getSession.mockResolvedValueOnce({ data: null, error: { message: 'offline' } });
    await expect(repo.init()).rejects.toMatchObject({
      message: expect.stringContaining('Não foi possível recuperar a sessão'),
      cause: { message: 'offline' },
    });
    client.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    client.auth.signInAnonymously.mockResolvedValueOnce({
      data: null,
      error: { message: 'disabled' },
    });
    await expect(repo.init()).rejects.toMatchObject({
      message: expect.stringContaining('Não foi possível conectar ao aplicativo'),
      cause: { message: 'disabled' },
    });
  });
  it('combina somente registros próprios e projeção comunitária sem duplicação', async () => {
    const own = { id: 'mine', user_id: 'user-one', created_at: '2026-11-03T12:00:00Z' };
    query.range.mockResolvedValueOnce({ data: [own], count: 1, error: null });
    communityQuery.range.mockResolvedValueOnce({
      data: [
        { id: 'mine', created_at: own.created_at },
        { id: 'community', created_at: '2026-11-01T12:00:00Z', district: 'Centro' },
      ],
      count: 2,
      error: null,
    });
    const rows = await repo.list();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 'mine', is_owner: true });
    expect(rows[1]).toMatchObject({ id: 'community', is_owner: false });
    expect(rows[1]).not.toHaveProperty('user_id');
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-one');
    expect(client.rpc).toHaveBeenCalledWith(
      config.kind === 'waste'
        ? 'get_fiscaliza_community_occurrences'
        : 'get_dengue_community_occurrences',
      {},
      { count: 'exact' },
    );
    await expect(repo.get('missing')).rejects.toThrow('não encontrado');
  });
  it('suporta lista vazia e propaga erros de cada fonte', async () => {
    query.range.mockResolvedValueOnce({ data: null, count: 0, error: null });
    communityQuery.range.mockResolvedValueOnce({ data: null, count: 0, error: null });
    expect(await repo.list()).toEqual([]);
    query.range.mockResolvedValueOnce({ data: null, error: { message: 'table denied' } });
    await expect(repo.list()).rejects.toThrow('Não foi possível carregar seus registros');
    communityQuery.range.mockResolvedValueOnce({ data: null, error: { message: 'rpc denied' } });
    await expect(repo.list()).rejects.toThrow('Não foi possível carregar o mapa comunitário');
  });
  it('faz upload privado e envia somente colunas permitidas', async () => {
    const result = await repo.create(
      validInput({ id: 'forged', user_id: 'other', status_history: [] }),
    );
    expect(result.is_owner).toBe(true);
    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-one\/.+\.jpg$/),
      expect.any(Blob),
      { contentType: 'image/jpeg', upsert: false },
    );
    const payload = query.insert.mock.calls[0][0];
    expect(payload).toMatchObject({
      user_id: 'user-one',
      status: 'Recebido',
      classification_reviewed: true,
      latitude: -16.681,
    });
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('status_history');
    expect(payload).not.toHaveProperty('image');
    expect(payload).not.toHaveProperty('is_demo');
    expect(client.storage.from).toHaveBeenCalledWith(config.bucket);
  });
  it('valida dados e revisão antes de upload', async () => {
    await expect(repo.create({})).rejects.toThrow('Descreva');
    await expect(repo.create(validInput({ classification_reviewed: false }))).rejects.toThrow(
      'confirmada',
    );
    expect(storage.upload).not.toHaveBeenCalled();
  });
  it('mostra erro de upload e remove foto órfã quando insert falha', async () => {
    storage.upload.mockResolvedValueOnce({ data: null, error: { message: 'network' } });
    await expect(repo.create(validInput())).rejects.toThrow('Confira o acompanhamento');
    expect(query.insert).not.toHaveBeenCalled();
    query.single.mockResolvedValueOnce({
      data: null,
      status: 403,
      error: { code: '42501', message: 'database unavailable' },
    });
    await expect(repo.create(validInput())).rejects.toThrow('Não foi possível salvar o registro');
    expect(storage.remove).toHaveBeenCalledOnce();
    query.single.mockResolvedValueOnce({
      data: null,
      status: 403,
      error: { code: '42501', message: 'denied' },
    });
    storage.remove.mockResolvedValueOnce({ data: null, error: { message: 'cleanup denied' } });
    await expect(repo.create(validInput())).rejects.toThrow(
      'Não foi possível concluir o envio da foto',
    );
  });
  it('atualiza somente status próprio e trata falha do banco', async () => {
    const row = { id: 'mine', is_owner: true, status: 'Recebido' };
    vi.spyOn(repo, 'get').mockResolvedValue(row);
    expect((await repo.updateStatus('mine', 'Em análise')).is_owner).toBe(true);
    expect(query.update).toHaveBeenCalledWith({ status: 'Em análise' });
    expect(query.eq).toHaveBeenCalledWith('id', 'mine');
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-one');
    await expect(repo.updateStatus('mine', 'Resolvido')).rejects.toThrow('não é permitida');
    repo.get.mockResolvedValueOnce({ ...row, is_owner: false });
    await expect(repo.updateStatus('community', 'Em análise')).rejects.toThrow('somente');
    query.single.mockResolvedValueOnce({ data: null, error: { message: 'update denied' } });
    await expect(repo.updateStatus('mine', 'Em análise')).rejects.toThrow(
      'Não foi possível atualizar o status',
    );
  });
  it('foto usa URL assinada curta e erros explícitos', async () => {
    expect(await repo.getImageUrl(null)).toBeNull();
    expect(await repo.getImageUrl('user-one/image.jpg')).toBe('https://example.test/signed-photo');
    expect(storage.createSignedUrl).toHaveBeenCalledWith('user-one/image.jpg', 300);
    storage.createSignedUrl.mockResolvedValueOnce({ data: null, error: { message: '' } });
    await expect(repo.getImageUrl('bad')).rejects.toThrow('Tente novamente');
  });
});

describe('contrato abstrato de repositório', () => {
  it.each(['init', 'list', 'get', 'create', 'updateStatus', 'getImageUrl'])(
    '%s exige implementação',
    async (method) => {
      await expect(new OccurrenceRepository()[method]()).rejects.toThrow('Implemente');
    },
  );
});
