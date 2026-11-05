import { beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '../../src/config.js';
import {
  categoryPoints,
  volumePoints,
  riskLevel,
  classify,
  reviewClassification,
} from '../../src/services/classificationService.js';
import {
  validateOccurrence,
  validateImage,
  validCoordinate,
  MAX_IMAGE_BYTES,
} from '../../src/utils/validation.js';
import {
  allowedTransitions,
  canTransition,
  assertTransition,
  statuses,
} from '../../src/utils/status.js';
import {
  aggregateOccurrences,
  filterOccurrences,
  approximateCoordinates,
  formatDate,
  distanceKm,
} from '../../src/utils/data.js';
import { createSubmission } from '../../src/services/submissionService.js';

export const image = 'data:image/jpeg;base64,YQ==';
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
    image,
    privacy_confirmed: true,
    classification_reviewed: true,
    ...overrides,
  };
}

describe('regras transparentes e revisão humana', () => {
  for (const [category, points] of Object.entries(categoryPoints)) {
    it(`pontua ${category} com ${points} pontos e orientação`, () => {
      const input = validInput({
        category,
        container_type: category,
        sensitive_area: false,
        recurrent: false,
        standing_water: false,
        outdoor_area: false,
        volume: 'Pequeno',
      });
      const result = classify(input);
      expect(result.risk_score).toBe(points + (config.kind === 'waste' ? 5 : 0));
      expect(result.breakdown.reduce((sum, row) => sum + row.points, 0)).toBe(result.risk_score);
      expect(result.classification).toBe(category);
      expect(result.guidance.length).toBeGreaterThan(20);
    });
  }
  for (const [score, level] of [
    [0, 'Baixo'],
    [30, 'Baixo'],
    [31, 'Médio'],
    [60, 'Médio'],
    [61, 'Alto'],
    [80, 'Alto'],
    [81, 'Crítico'],
    [100, 'Crítico'],
  ]) {
    it(`limite exato ${score}: ${level}`, () => expect(riskLevel(score)).toBe(level));
  }
  it.each([-1, 101, NaN, Infinity, '30'])('rejeita pontuação inválida %s', (score) =>
    expect(() => riskLevel(score)).toThrow(),
  );
  it('confirma e corrige recalculando o resultado', () => {
    const input = validInput();
    const category = config.categories.at(-1);
    const reviewed = reviewClassification(input, category);
    expect(reviewed.classification_reviewed).toBe(true);
    expect(reviewed.classification).toBe(category);
    expect(reviewed[config.kind === 'waste' ? 'category' : 'container_type']).toBe(category);
    expect(input.classification).toBeUndefined();
    expect(reviewed.risk_score).toBe(classify(reviewed).risk_score);
  });
  it('não aceita categoria desconhecida', () =>
    expect(() => classify(validInput({ category: 'X', container_type: 'X' }))).toThrow(
      'categoria',
    ));
  if (config.kind === 'waste') {
    it.each(Object.entries(volumePoints))('volume %s soma %s', (volume, points) => {
      expect(classify(validInput({ category: 'Eletrônico', volume })).risk_score).toBe(
        30 + points + 20 + 25,
      );
    });
    it('não aceita volume desconhecido', () =>
      expect(() => classify(validInput({ volume: 'X' }))).toThrow('volume'));
  }
  it('respeita o máximo de 100 e todas as condições desmarcadas', () => {
    const category = config.kind === 'waste' ? 'Eletrônico' : 'Pneu';
    expect(classify(validInput({ category, container_type: category })).risk_score).toBe(100);
    expect(
      classify(
        validInput({
          category,
          container_type: category,
          recurrent: false,
          sensitive_area: false,
          standing_water: false,
          outdoor_area: false,
          volume: 'Pequeno',
        }),
      ).risk_score,
    ).toBe(config.kind === 'waste' ? 35 : 25);
  });
});

describe('validação de campos e fotos', () => {
  it('aceita um formulário completo', () => expect(validateOccurrence(validInput())).toEqual({}));
  it('retorna mensagens acessíveis para os campos vazios', () => {
    const errors = validateOccurrence({});
    expect(errors).toMatchObject({
      description: expect.any(String),
      district: expect.any(String),
      latitude: expect.any(String),
      longitude: expect.any(String),
      image: expect.any(String),
      privacy_confirmed: expect.any(String),
    });
    expect(errors[config.kind === 'waste' ? 'category' : 'container_type']).toContain('categoria');
    if (config.kind === 'waste') expect(errors.volume).toContain('volume');
  });
  it('limita descrição e bairro sem modificar input', () => {
    const input = validInput({ description: 'a'.repeat(1001), district: 'b'.repeat(81) });
    expect(validateOccurrence(input)).toMatchObject({
      description: expect.any(String),
      district: expect.any(String),
    });
    expect(input.description).toHaveLength(1001);
  });
  it.each(['', null, undefined, NaN, Infinity, -91, 91])('rejeita latitude %s', (value) =>
    expect(validCoordinate(value, -90, 90)).toBe(false),
  );
  it.each([-90, 0, 90, '0'])('aceita latitude %s', (value) =>
    expect(validCoordinate(value, -90, 90)).toBe(true),
  );
  it('valida tipo, vazio, tamanho e data URL', () => {
    expect(validateImage(null)).toContain('foto');
    expect(validateImage({ type: 'image/svg+xml', size: 20 })).toContain('JPEG');
    expect(validateImage({ type: 'image/png', size: 0 })).toContain('vazio');
    expect(validateImage({ type: 'image/webp', size: MAX_IMAGE_BYTES + 1 })).toContain('5 MB');
    expect(validateImage({ type: 'image/jpeg', size: 50 })).toBe('');
    expect(validateImage(image)).toBe('');
    expect(validateImage('javascript:alert(1)')).toContain('válida');
    expect(validateImage(`data:image/jpeg;base64,${'Y'.repeat(MAX_IMAGE_BYTES * 2)}`)).toContain(
      '5 MB',
    );
  });
});

describe('transições explícitas de status', () => {
  it('permite análise, encaminhamento, conclusão e reabertura', () => {
    expect(canTransition('Recebido', 'Em análise')).toBe(true);
    expect(canTransition('Em análise', statuses[2])).toBe(true);
    expect(canTransition(statuses[2], 'Resolvido')).toBe(true);
    expect(canTransition('Resolvido', 'Em análise')).toBe(true);
    expect(() => assertTransition('Recebido', 'Em análise')).not.toThrow();
  });
  it('recusa pulo inicial, repetição, estado inexistente e saída de descarte', () => {
    expect(canTransition('Recebido', 'Resolvido')).toBe(false);
    expect(canTransition('Em análise', 'Em análise')).toBe(false);
    expect(allowedTransitions('Descartado')).toEqual([]);
    expect(allowedTransitions('Inválido')).toEqual([]);
    expect(() => assertTransition('Recebido', 'Resolvido')).toThrow('não é permitida');
  });
});

describe('filtros, formatação e indicadores', () => {
  const rows = [
    {
      id: 'a',
      classification: 'A',
      category: 'A',
      district: 'Centro',
      status: 'Recebido',
      risk_level: 'Crítico',
      created_at: '2026-11-02T12:00:00Z',
      is_owner: true,
      description: 'Água parada',
    },
    {
      id: 'b',
      classification: 'B',
      container_type: 'B',
      district: 'Sul',
      status: 'Resolvido',
      risk_level: 'Baixo',
      created_at: '2026-10-01T12:00:00Z',
      is_owner: false,
    },
    {
      id: 'c',
      classification: 'A',
      district: 'Centro',
      status: 'Descartado',
      risk_level: 'Médio',
      created_at: '2026-11-01T12:00:00Z',
      is_owner: true,
    },
  ];
  it('combina filtros e trata resultados vazios', () => {
    expect(filterOccurrences(rows)).toHaveLength(3);
    expect(
      filterOccurrences(
        rows,
        {
          category: 'A',
          district: 'Centro',
          status: 'Recebido',
          risk: 'Crítico',
          onlyMine: true,
          search: 'ÁGUA',
          period: '7',
        },
        new Date('2026-11-03T12:00:00Z'),
      ).map((row) => row.id),
    ).toEqual(['a']);
    for (const filter of [
      { category: 'X' },
      { district: 'X' },
      { status: 'X' },
      { risk_level: 'X' },
      { search: 'inexistente' },
    ])
      expect(filterOccurrences(rows, filter)).toEqual([]);
    expect(filterOccurrences(rows, { onlyMine: true })).toHaveLength(2);
    expect(filterOccurrences(rows, { period: '7' }, new Date('2026-11-03T12:00:00Z'))).toHaveLength(
      2,
    );
    expect(filterOccurrences(rows, { period: 'all', search: 'sul' })).toHaveLength(1);
  });
  it('calcula indicadores a partir das linhas', () => {
    expect(aggregateOccurrences(rows)).toMatchObject({
      total: 3,
      open: 1,
      resolved: 1,
      critical: 1,
      byCategory: [
        { label: 'A', count: 2 },
        { label: 'B', count: 1 },
      ],
      byMonth: [
        { label: '2026-10', count: 1 },
        { label: '2026-11', count: 2 },
      ],
    });
    expect(aggregateOccurrences([])).toMatchObject({ total: 0, open: 0, byRisk: [] });
  });
  it('formata datas em São Paulo e aproxima coordenadas', () => {
    expect(formatDate('2026-11-03T12:00:00Z')).toBe('03/11/2026');
    expect(formatDate('xxx')).toBe('Data indisponível');
    expect(approximateCoordinates(-16.681234, '-49.261876')).toEqual({
      latitude: -16.681,
      longitude: -49.262,
    });
    expect(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 })).toBe(0);
    expect(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 })).toBeCloseTo(
      111.195,
      2,
    );
  });
});

describe('envio com revisão, erros e exclusão mútua', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('envia um resultado revisado e recalcula campos', async () => {
    const repository = { create: vi.fn().mockResolvedValue({ id: 'saved' }) };
    const service = createSubmission(repository);
    await expect(service.submit(validInput({ risk_score: 999 }))).resolves.toEqual({ id: 'saved' });
    expect(repository.create.mock.calls[0][0].risk_score).toBeLessThanOrEqual(100);
    expect(service.pending).toBe(false);
  });
  it('rejeita formulário inválido e revisão ausente', async () => {
    const repository = { create: vi.fn() };
    const service = createSubmission(repository);
    await expect(service.submit({})).rejects.toThrow('Descreva');
    await expect(service.submit(validInput({ classification_reviewed: false }))).rejects.toThrow(
      'Confirme',
    );
    expect(repository.create).not.toHaveBeenCalled();
  });
  it('impede duplicação e libera após sucesso', async () => {
    let finish;
    const repository = {
      create: vi.fn(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      ),
    };
    const service = createSubmission(repository);
    const first = service.submit(validInput());
    expect(service.pending).toBe(true);
    await expect(service.submit(validInput())).rejects.toThrow('já está sendo salvo');
    finish({ id: 'one' });
    await first;
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(service.pending).toBe(false);
  });
  it('propaga erro e permite tentar novamente com os dados preservados', async () => {
    const repository = {
      create: vi
        .fn()
        .mockRejectedValueOnce(new Error('Sem rede'))
        .mockResolvedValueOnce({ id: 'retry' }),
    };
    const service = createSubmission(repository);
    const input = validInput();
    await expect(service.submit(input)).rejects.toThrow('Sem rede');
    expect(service.pending).toBe(false);
    await expect(service.submit(input)).resolves.toEqual({ id: 'retry' });
    expect(input.description).toContain('Relato fictício');
  });
});
