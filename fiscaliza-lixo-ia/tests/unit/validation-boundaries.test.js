import { describe, expect, it } from 'vitest';
import { config } from '../../src/config.js';
import {
  validateOccurrence,
  validateImage,
  validCoordinate,
  MAX_IMAGE_BYTES,
} from '../../src/utils/validation.js';
import { aggregateOccurrences, filterOccurrences, formatDate } from '../../src/utils/data.js';
import { validInput } from './fixtures.js';

describe('tipos inesperados não viram dados válidos nem interrompem a validação', () => {
  it.each([undefined, null, [], true, 12, 'rascunho inválido'])(
    'produz mensagens de campo para entrada %s',
    (input) => {
      expect(validateOccurrence(input)).toMatchObject({
        description: expect.any(String),
        district: expect.any(String),
        image: expect.any(String),
        privacy_confirmed: expect.any(String),
      });
    },
  );

  it('rejeita relato e bairro não textuais e confirmação de privacidade como string', () => {
    const input = validInput({ description: 123, district: ['Teste'], privacy_confirmed: 'false' });
    expect(validateOccurrence(input)).toMatchObject({
      description: expect.any(String),
      district: expect.any(String),
      privacy_confirmed: expect.any(String),
    });
    expect(input.description).toBe(123);
  });

  it.each([true, false, [], [0], {}, ' ', '\t\n', NaN, Infinity, '0x10', '0b10', '0o10'])(
    'não interpreta %s como coordenada zero',
    (value) => {
      expect(validCoordinate(value, -90, 90)).toBe(false);
    },
  );

  it.each([0, '0', ' 0 ', -90, 90, '-16.680', '-1.5e1', '+16.5', '.5'])(
    'preserva coordenadas numéricas válidas %s',
    (value) => {
      expect(validCoordinate(value, -90, 90)).toBe(true);
    },
  );

  it('condições ambientais aceitam booleanos e rejeitam strings que alterariam a pontuação', () => {
    const condition = config.kind === 'waste' ? 'sensitive_area' : 'standing_water';
    const errors = validateOccurrence(validInput({ recurrent: 'false', [condition]: 'false' }));
    expect(errors.recurrent).toContain('Sim ou Não');
    expect(errors[condition]).toContain('Sim ou Não');
    expect(validateOccurrence(validInput({ recurrent: false, [condition]: false }))).toEqual({});
  });
});

describe('tamanho binário e sintaxe da imagem base64', () => {
  it.each(['A', 'Y===', 'YQ=A', 'YQ===', 'YQ', ''])(
    'rejeita base64 incompleto ou padding inválido: %s',
    (encoded) => {
      expect(validateImage(`data:image/jpeg;base64,${encoded}`)).toContain('válida');
    },
  );

  it.each([undefined, NaN, Infinity, -1, 0, 1.5])(
    'rejeita tamanho de arquivo inválido %s',
    (size) => {
      expect(validateImage({ type: 'image/jpeg', size })).toContain('vazio');
    },
  );

  it('aceita exatamente 5 MiB e rejeita um byte extra sem contar o cabeçalho data URL', () => {
    // Mesmo comprimento base64, mas o padding determina quantos bytes existem.
    const fullGroups = 'AAAA'.repeat(Math.floor(MAX_IMAGE_BYTES / 3));
    expect(validateImage(`data:image/jpeg;base64,${fullGroups}AAA=`)).toBe('');
    expect(validateImage(`data:image/png;base64,${fullGroups}AAAA`)).toContain('5 MB');
    expect(validateImage('data:image/webp;base64,YQ==')).toBe('');
  });
});

describe('indicadores seguem o mesmo calendário de São Paulo exibido nas datas', () => {
  it('o período móvel de sete dias inclui o limite exato e conserva os meses locais dos registros', () => {
    const values = [
      '2026-11-01T01:29:59.999Z',
      '2026-11-01T01:30:00.000Z',
      '2026-11-01T03:00:00.000Z',
    ];
    const rows = values.map((created_at, index) => ({
      id: String(index),
      classification: 'Pneu',
      district: 'Teste',
      status: 'Recebido',
      risk_level: 'Baixo',
      created_at,
    }));
    const filtered = filterOccurrences(rows, { period: '7' }, new Date('2026-11-08T01:30:00.000Z'));
    expect(filtered.map((row) => row.id)).toEqual(['1', '2']);
    expect(aggregateOccurrences(filtered).byMonth).toEqual([
      { label: '2026-10', count: 1 },
      { label: '2026-11', count: 1 },
    ]);
  });

  it.each([
    ['2026-11-01T01:30:00.000Z', '2026-10', '31/10/2026'],
    ['2026-11-01T03:00:00.000Z', '2026-11', '01/11/2026'],
    ['2027-01-01T01:00:00.000Z', '2026-12', '31/12/2026'],
  ])('agrupa %s no mês local %s', (created_at, month, visibleDate) => {
    const row = {
      classification: 'Pneu',
      district: 'Teste',
      status: 'Recebido',
      risk_level: 'Baixo',
      created_at,
    };
    expect(aggregateOccurrences([row]).byMonth).toEqual([{ label: month, count: 1 }]);
    expect(formatDate(created_at)).toBe(visibleDate);
  });
});
