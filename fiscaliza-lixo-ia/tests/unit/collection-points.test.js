import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CollectionPointRepository,
  pointColumns,
} from '../../src/repositories/CollectionPointRepository.js';
import { collectionPointCatalog } from '../../src/repositories/collectionPointCatalog.js';
import {
  validateCollectionPoint,
  collectionPointPayload,
  filterCollectionPoints,
  hasPointCoordinates,
  pointMapUrl,
} from '../../src/services/collectionPointService.js';
import {
  collectionPointCards,
  collectionPointForm,
  bindCollectionPointForm,
} from '../../src/pages/collectionPoints.js';

const input = (overrides = {}) => ({
  id: crypto.randomUUID(),
  name: 'Coleta de teste',
  site_type: 'Coleta seletiva',
  address: 'Rua de teste, 10',
  district: 'Centro',
  description: 'Estabelecimento de teste para reciclagem.',
  accepted_materials: ['Metal'],
  access_conditions: 'Confirmar antes da entrega',
  latitude: '',
  longitude: '',
  information_reviewed: true,
  ...overrides,
});

describe('catálogo e regras dos locais de coleta', () => {
  it('preserva cinco locais de Itumbiara, com centroides explicitamente aproximados', () => {
    expect(collectionPointCatalog).toHaveLength(5);
    for (const row of collectionPointCatalog) {
      expect(validateCollectionPoint(row)).toEqual({});
      expect(row.location_precision).toBe('approximate');
      expect(hasPointCoordinates(row)).toBe(true);
      expect(row.latitude).toBeLessThan(-18.3);
      expect(row.accepted_materials).not.toContain('Rejeitos');
    }
    expect(
      collectionPointCatalog.find((row) => row.catalog_key.includes('pneus')).accepted_materials,
    ).toEqual(['Pneus']);
  });
  it.each([
    [{ name: '' }, 'name'],
    [{ address: 'Rua' }, 'address'],
    [{ district: 'x' }, 'district'],
    [{ description: 'curta' }, 'description'],
    [{ site_type: 'Falso' }, 'site_type'],
    [{ accepted_materials: [] }, 'accepted_materials'],
    [{ accepted_materials: ['Radioativo'] }, 'accepted_materials'],
    [{ access_conditions: 'Aberto' }, 'access_conditions'],
    [{ information_reviewed: false }, 'information_reviewed'],
    [{ latitude: '-18', longitude: '' }, 'coordinates'],
    [{ latitude: 'NaN', longitude: '-49' }, 'coordinates'],
    [{ latitude: '-91', longitude: '-49' }, 'coordinates'],
    [{ latitude: '-18', longitude: '181' }, 'coordinates'],
    [{ source_url: 'javascript:alert(1)' }, 'source_url'],
    [{ source_url: 'https://usuario:senha@example.com' }, 'source_url'],
    [{ opening_hours: 'a'.repeat(501) }, 'opening_hours'],
  ])('rejeita informação incompleta ou inválida: %j', (changes, field) => {
    expect(validateCollectionPoint(input(changes))).toHaveProperty(field);
  });
  it('não aceita lixo comum em ecoponto, mas permite especificar rejeitos em aterro', () => {
    expect(
      validateCollectionPoint(input({ site_type: 'Ecoponto', accepted_materials: ['Rejeitos'] })),
    ).toHaveProperty('accepted_materials');
    expect(
      validateCollectionPoint(
        input({ site_type: 'Aterro sanitário', accepted_materials: ['Rejeitos'] }),
      ),
    ).toEqual({});
  });
  it('não permite promover uma sugestão pela composição do payload', () => {
    const row = collectionPointPayload(
      input({
        publication_status: 'published',
        created_by: 'outro',
        source_kind: 'municipal_partial',
        location_precision: 'confirmed',
        latitude: '-18.4',
        longitude: '-49.2',
      }),
    );
    expect(row).not.toHaveProperty('publication_status');
    expect(row).not.toHaveProperty('created_by');
    expect(row).not.toHaveProperty('source_kind');
    expect(row.location_precision).toBe('approximate');
    expect(collectionPointPayload(input()).latitude).toBeNull();
  });
  it('busca sem acentos e combina filtros de tipo/material', () => {
    expect(filterCollectionPoints(collectionPointCatalog, { search: 'saude' })).toHaveLength(1);
    expect(
      filterCollectionPoints(collectionPointCatalog, { type: 'Ecoponto', material: 'Pneus' }),
    ).toHaveLength(1);
    expect(
      filterCollectionPoints(collectionPointCatalog, { type: 'Aterro sanitário' }),
    ).toHaveLength(0);
  });
  it('consulta o endereço textual quando o marcador é apenas aproximado', () => {
    const row = collectionPointCatalog[0];
    expect(decodeURIComponent(pointMapUrl(row))).toContain(row.address);
    expect(pointMapUrl({ ...row, location_precision: 'confirmed' })).toContain(
      encodeURIComponent(`${row.latitude},${row.longitude}`),
    );
    expect(hasPointCoordinates({ ...row, latitude: null })).toBe(false);
  });
  it('escapa conteúdo de visitantes e não transforma URL maliciosa em link', () => {
    const html = collectionPointCards([
      {
        ...collectionPointCatalog[0],
        name: '<img src=x onerror=alert(1)>',
        source_url: 'javascript:alert(1)',
      },
    ]);
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('&lt;img');
  });
});

describe('persistência e isolamento de sugestões', () => {
  beforeEach(() => localStorage.clear());
  it('salva uma única sugestão pendente, preserva os cinco locais e reusa a chave em nova tentativa', async () => {
    const repo = new CollectionPointRepository(null, localStorage),
      row = input();
    await repo.create(row);
    await repo.create(row);
    const listed = await new CollectionPointRepository(null, localStorage).list();
    expect(listed).toHaveLength(6);
    expect(listed[5].publication_status).toBe('pending');
  });
  it('não substitui dados locais corrompidos por um catálogo vazio', async () => {
    localStorage.setItem('waste-collection-points-v1', '{quebrado');
    await expect(new CollectionPointRepository(null, localStorage).list()).rejects.toThrow(
      'corrompidos',
    );
    expect(localStorage.getItem('waste-collection-points-v1')).toBe('{quebrado');
  });
  it('rejeita registros locais incompatíveis', async () => {
    localStorage.setItem('waste-collection-points-v1', '[{}]');
    await expect(new CollectionPointRepository(null, localStorage).list()).rejects.toThrow(
      'inválido',
    );
  });
  it('percorre páginas do catálogo sem expor identificadores de autores', async () => {
    expect(pointColumns).not.toContain('created_by');
    const pages = [
      { data: collectionPointCatalog.slice(0, 2), count: 5 },
      { data: collectionPointCatalog.slice(2), count: 5 },
    ];
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn(() => Promise.resolve(pages.shift())),
    };
    const repo = new CollectionPointRepository({ from: () => query });
    expect(await repo.list()).toHaveLength(5);
    expect(query.range).toHaveBeenCalledTimes(2);
  });
  it('não simula sucesso local quando a rede falha', async () => {
    const query = {
      select: () => query,
      order: () => query,
      range: () => Promise.resolve({ error: new Error('network') }),
    };
    await expect(new CollectionPointRepository({ from: () => query }).list()).rejects.toThrow(
      'carregar',
    );
  });
  it('reconcilia uma resposta perdida somente com o mesmo envio pendente', async () => {
    const submitted = input({ latitude: '-18.4', longitude: '-49.2' });
    const saved = { ...collectionPointPayload(submitted), publication_status: 'pending' };
    const insert = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ error: { code: '23505' } }),
    };
    const read = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: saved }),
    };
    const client = { from: () => ({ insert: vi.fn(() => insert), select: vi.fn(() => read) }) };
    expect(await new CollectionPointRepository(client).create(submitted)).toEqual(saved);
    read.single.mockResolvedValue({ data: { ...saved, publication_status: 'published' } });
    await expect(new CollectionPointRepository(client).create(submitted)).rejects.toThrow(
      'confirmar',
    );
  });
  it('envio remoto bem-sucedido retorna a sugestão, enquanto falha preserva o modo remoto', async () => {
    const row = input();
    const saved = { ...collectionPointPayload(row), publication_status: 'pending' };
    const query = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: saved }),
    };
    const repo = new CollectionPointRepository({ from: () => ({ insert: () => query }) });
    expect(await repo.create(row)).toEqual(saved);
    query.single.mockResolvedValue({ error: { code: '42501' } });
    await expect(repo.create(row)).rejects.toThrow('confirmar');
  });
});

describe('envio que termina depois da navegação', () => {
  it('não redireciona uma tela que já foi fechada', async () => {
    let finish;
    const request = new Promise((resolve) => {
      finish = resolve;
    });
    const app = { pointRepo: { create: vi.fn(() => request) }, notify: vi.fn() };
    document.body.innerHTML = collectionPointForm();
    const form = document.querySelector('form');
    const row = input();
    for (const name of ['name', 'address', 'district', 'description'])
      form.elements[name].value = row[name];
    form.elements.site_type.value = row.site_type;
    form.querySelector('[value="Metal"]').checked = true;
    form.elements.information_reviewed.checked = true;
    const dispose = bindCollectionPointForm(app);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(app.pointRepo.create).toHaveBeenCalledOnce();
    dispose();
    location.hash = '#/about';
    document.body.innerHTML = '<h1>Outra tela</h1>';
    finish({ id: row.id });
    await request;
    await Promise.resolve();
    expect(location.hash).toBe('#/about');
    expect(app.notify).not.toHaveBeenCalled();
  });
});
