import { beforeEach, describe, expect, it, vi } from 'vitest';
import { healthFacilityCatalog } from '../../src/repositories/healthFacilityCatalog.js';
import {
  HealthFacilityRepository,
  facilityColumns,
} from '../../src/repositories/HealthFacilityRepository.js';
import {
  validateHealthFacility,
  healthFacilityPayload,
  filterHealthFacilities,
  hasFacilityCoordinates,
  facilityMapUrl,
} from '../../src/services/healthFacilityService.js';
import {
  healthFacilityCards,
  healthFacilityForm,
  bindHealthFacilityForm,
} from '../../src/pages/healthFacilities.js';
const input = (changes = {}) => ({
  id: crypto.randomUUID(),
  name: 'Unidade de teste',
  facility_type: 'Unidade básica de saúde',
  address: 'Rua de teste, 100',
  district: 'Centro',
  description: 'Dados institucionais de uma unidade de teste.',
  vaccination_status: 'unknown',
  medical_care_status: 'unknown',
  latitude: '',
  longitude: '',
  information_reviewed: true,
  ...changes,
});

describe('dados institucionais e disponibilidade de serviços', () => {
  it('mantém doze unidades, usa o endereço de endemias informado pelo usuário e não confirma vacinação sem fonte atual', () => {
    expect(healthFacilityCatalog).toHaveLength(12);
    for (const row of healthFacilityCatalog) {
      expect(validateHealthFacility(row)).toEqual({});
      expect(hasFacilityCoordinates(row)).toBe(true);
      expect(row.location_precision).toBe('approximate');
      expect(row.vaccination_status).not.toBe('reported');
    }
    const endemias = healthFacilityCatalog.find(
      (row) => row.facility_type === 'Centro de endemias',
    );
    expect(endemias.address).toBe('Rua Wilson Barbosa, 325');
    expect(endemias.district).toBe('Jardim América');
    expect(endemias.source_notes).toContain('usuário');
    expect(endemias.medical_care_status).toBe('not_reported');
    expect(
      healthFacilityCatalog.find((row) => row.facility_type === 'Vigilância sanitária')
        .source_notes,
    ).toContain('divergência');
  });
  it.each([
    [{ name: '' }, 'name'],
    [{ address: 'Rua' }, 'address'],
    [{ district: 'x' }, 'district'],
    [{ description: 'curta' }, 'description'],
    [{ facility_type: 'Falso' }, 'facility_type'],
    [{ vaccination_status: 'agora' }, 'vaccination_status'],
    [{ medical_care_status: 'garantido' }, 'medical_care_status'],
    [{ phone: 'javascript:alert(1)' }, 'phone'],
    [{ cnes_code: '123' }, 'cnes_code'],
    [{ source_url: 'javascript:alert(1)' }, 'source_url'],
    [{ source_url: 'https://usuario:senha@example.com' }, 'source_url'],
    [{ vaccination_status: 'reported' }, 'source_url'],
    [{ medical_care_status: 'reported' }, 'source_url'],
    [{ opening_hours: 'x'.repeat(301) }, 'opening_hours'],
    [{ service_notes: 'x'.repeat(701) }, 'service_notes'],
    [{ latitude: '-18', longitude: '' }, 'coordinates'],
    [{ latitude: true, longitude: '-49' }, 'coordinates'],
    [{ latitude: 'NaN', longitude: '-49' }, 'coordinates'],
    [{ latitude: '-91', longitude: '-49' }, 'coordinates'],
    [{ latitude: '-18', longitude: '181' }, 'coordinates'],
    [{ information_reviewed: false }, 'information_reviewed'],
  ])('rejeita informação inválida ou alegação sem fonte: %j', (changes, field) =>
    expect(validateHealthFacility(input(changes))).toHaveProperty(field),
  );
  it('permite declarar serviço com fonte, mas não admite privilégios ou conferência forjados no payload', () => {
    const row = healthFacilityPayload(
      input({
        vaccination_status: 'reported',
        source_url: 'https://example.org/unidade',
        publication_status: 'published',
        source_kind: 'official_partial',
        sources_checked_on: '2026-11-10',
        created_by: 'outro',
        location_precision: 'confirmed',
        latitude: '-18.4',
        longitude: '-49.2',
      }),
    );
    expect(row).not.toHaveProperty('publication_status');
    expect(row).not.toHaveProperty('sources_checked_on');
    expect(row).not.toHaveProperty('source_kind');
    expect(row).not.toHaveProperty('created_by');
    expect(row.location_precision).toBe('approximate');
  });
  it('filtra sem acentos e distingue vacinação possível de oferta informada', () => {
    expect(
      filterHealthFacilities(healthFacilityCatalog, { search: 'vigilancia sanitaria' }),
    ).toHaveLength(1);
    expect(filterHealthFacilities(healthFacilityCatalog, { service: 'surveillance' })).toHaveLength(
      2,
    );
    expect(filterHealthFacilities(healthFacilityCatalog, { service: 'medical' })).toHaveLength(10);
    expect(filterHealthFacilities(healthFacilityCatalog, { service: 'vaccination' })).toHaveLength(
      0,
    );
    expect(
      filterHealthFacilities(healthFacilityCatalog, { service: 'possible_vaccination' }),
    ).toHaveLength(8);
    expect(filterHealthFacilities(healthFacilityCatalog, { search: '3033589' })).toHaveLength(1);
  });
  it('usa endereço textual enquanto não existe confirmação da entrada', () => {
    const row = healthFacilityCatalog[0];
    expect(decodeURIComponent(facilityMapUrl(row))).toContain(row.address);
    expect(facilityMapUrl({ ...row, location_precision: 'confirmed' })).toContain(
      encodeURIComponent(`${row.latitude},${row.longitude}`),
    );
    expect(hasFacilityCoordinates({ ...row, latitude: null })).toBe(false);
  });
  it('escapa conteúdo, limita links a HTTPS e não converte telefone curto em destino presumido', () => {
    const html = healthFacilityCards([
      {
        ...healthFacilityCatalog[0],
        name: '<img src=x onerror=alert(1)>',
        source_url: 'javascript:alert(1)',
        phone: '3433-0377',
      },
    ]);
    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain('href="tel:3433');
    expect(healthFacilityCards([healthFacilityCatalog[0]])).toContain('tel:6434330497');
  });
});

describe('persistência e falhas', () => {
  beforeEach(() => localStorage.clear());
  it('persiste uma sugestão pendente e evita duplicação na repetição do mesmo envio', async () => {
    const repo = new HealthFacilityRepository(null, localStorage),
      row = input();
    await repo.create(row);
    await repo.create(row);
    const rows = await repo.list();
    expect(rows).toHaveLength(13);
    expect(rows[12].publication_status).toBe('pending');
    await expect(repo.create({ ...row, name: 'Outra intenção' })).rejects.toThrow('identificador');
  });
  it('preserva dados locais corrompidos', async () => {
    localStorage.setItem('dengue-health-facilities-v1', '{inválido');
    await expect(new HealthFacilityRepository(null, localStorage).list()).rejects.toThrow(
      'corrompidos',
    );
    expect(localStorage.getItem('dengue-health-facilities-v1')).toBe('{inválido');
  });
  it('rejeita formato local incorreto', async () => {
    localStorage.setItem('dengue-health-facilities-v1', '[{}]');
    await expect(new HealthFacilityRepository(null, localStorage).list()).rejects.toThrow(
      'inválido',
    );
  });
  it('pagina o diretório e oculta identificadores de autoria', async () => {
    expect(facilityColumns).not.toContain('created_by');
    const pages = [
      { data: healthFacilityCatalog.slice(0, 5), count: 12 },
      { data: healthFacilityCatalog.slice(5), count: 12 },
    ];
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn(() => Promise.resolve(pages.shift())),
    };
    expect(await new HealthFacilityRepository({ from: () => query }).list()).toHaveLength(12);
    expect(query.range).toHaveBeenCalledTimes(2);
  });
  it('falha de rede não produz um catálogo local como falso sucesso', async () => {
    const q = {
      select: () => q,
      order: () => q,
      range: () => Promise.resolve({ error: { code: 'network' } }),
    };
    await expect(new HealthFacilityRepository({ from: () => q }).list()).rejects.toThrow(
      'carregar',
    );
  });
  it('reconcilia resposta perdida apenas quando corresponde ao mesmo envio pendente', async () => {
    const submitted = input(),
      saved = { ...healthFacilityPayload(submitted), publication_status: 'pending' };
    const insert = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ error: { code: '23505' } }),
      },
      read = { eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: saved }) };
    const repo = new HealthFacilityRepository({
      from: () => ({ insert: () => insert, select: () => read }),
    });
    expect(await repo.create(submitted)).toEqual(saved);
    read.single.mockResolvedValue({ data: { ...saved, publication_status: 'published' } });
    await expect(repo.create(submitted)).rejects.toThrow('confirmar');
  });
  it('retorna o envio remoto confirmado e propaga erros de acesso', async () => {
    const submitted = input(),
      saved = { ...healthFacilityPayload(submitted), publication_status: 'pending' },
      q = { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: saved }) };
    const repo = new HealthFacilityRepository({ from: () => ({ insert: () => q }) });
    expect(await repo.create(submitted)).toEqual(saved);
    q.single.mockResolvedValue({ error: { code: '42501' } });
    await expect(repo.create(submitted)).rejects.toThrow('confirmar');
  });
});

it('envio concluído após sair da página não redireciona a pessoa', async () => {
  let finish;
  const pending = new Promise((resolve) => {
      finish = resolve;
    }),
    app = { healthRepo: { create: vi.fn(() => pending) }, notify: vi.fn() };
  document.body.innerHTML = healthFacilityForm();
  const form = document.querySelector('form'),
    row = input();
  for (const name of ['name', 'address', 'district', 'description'])
    form.elements[name].value = row[name];
  form.elements.facility_type.value = row.facility_type;
  form.elements.information_reviewed.checked = true;
  const cleanup = bindHealthFacilityForm(app);
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  expect(app.healthRepo.create).toHaveBeenCalledOnce();
  cleanup();
  location.hash = '#/about';
  document.body.innerHTML = '<h1>Outra tela</h1>';
  finish({ id: row.id });
  await pending;
  await Promise.resolve();
  expect(location.hash).toBe('#/about');
  expect(app.notify).not.toHaveBeenCalled();
});
