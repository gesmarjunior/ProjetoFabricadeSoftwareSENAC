import { beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '../../src/config.js';
import { createDemoData } from '../../src/repositories/demoData.js';
import { LocalOccurrenceRepository } from '../../src/repositories/LocalOccurrenceRepository.js';
import { validInput } from './fixtures.js';

const categoryField = config.kind === 'waste' ? 'category' : 'container_type';
const booleanField = config.kind === 'waste' ? 'sensitive_area' : 'standing_water';
const example = () => createDemoData()[0];

describe('integridade dos registros persistidos no dispositivo', () => {
  let repo;
  beforeEach(() => {
    localStorage.clear();
    repo = new LocalOccurrenceRepository();
  });

  it.each([
    ['JSON inválido', '{not-json'],
    ['conteúdo vazio já existente', ''],
    ['valor nulo', 'null'],
    ['objeto no lugar da lista', '{}'],
    ['linha nula', '[null]'],
    ['linha vazia', '[{}]'],
    ['linha primitiva', '[42]'],
    ['linha que é uma lista', '[[]]'],
  ])('recusa %s sem substituir o conteúdo existente', async (_label, original) => {
    localStorage.setItem(repo.key, original);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    try {
      await expect(repo.init()).rejects.toThrow(/corrompidos.*Exporte uma cópia/);
      expect(localStorage.getItem(repo.key)).toBe(original);
      expect(write).not.toHaveBeenCalled();
    } finally {
      write.mockRestore();
    }
  });

  it.each([
    ['ID ausente', { id: undefined }],
    ['ID vazio', { id: ' ' }],
    ['data ausente', { created_at: undefined }],
    ['data inválida', { created_at: 'não é uma data' }],
    ['data nula', { created_at: null }],
    ['data com dia inexistente', { created_at: '2026-02-30T12:00:00Z' }],
    ['atualização inválida', { updated_at: '2026-13-01T12:00:00Z' }],
    ['bairro ausente', { district: undefined }],
    ['bairro objeto', { district: {} }],
    ['latitude fora do limite', { latitude: -91 }],
    ['latitude nula', { latitude: null }],
    ['latitude booleana', { latitude: false }],
    ['latitude vazia', { latitude: '' }],
    ['longitude fora do limite', { longitude: 181 }],
    ['longitude não numérica', { longitude: 'oeste' }],
    ['status desconhecido', { status: 'Status inexistente' }],
    ['classificação desconhecida', { classification: 'Não classificado' }],
    ['categoria desconhecida', { [categoryField]: 'Categoria inexistente' }],
    ['pontuação negativa', { risk_score: -1 }],
    ['pontuação acima de cem', { risk_score: 101 }],
    ['pontuação fracionada', { risk_score: 30.5 }],
    ['pontuação textual', { risk_score: '30' }],
    ['nível desconhecido', { risk_level: 'Urgente' }],
    ['nível incompatível com os pontos', { risk_score: 100, risk_level: 'Baixo' }],
    ['histórico nulo', { status_history: null }],
    ['histórico objeto', { status_history: {} }],
    ['histórico com entrada nula', { status_history: [null] }],
    ['histórico com entrada vazia', { status_history: [{}] }],
    [
      'histórico com status inválido',
      { status_history: [{ status: 'Desconhecido', created_at: '2026-11-01T12:00:00Z' }] },
    ],
    [
      'histórico com data inválida',
      { status_history: [{ status: 'Recebido', created_at: 'ontem' }] },
    ],
    ['autoria objeto', { user_id: {} }],
    ['foto objeto', { image_path: {} }],
    ['descrição objeto', { description: {} }],
    ['orientação objeto', { guidance: {} }],
    ['origem com tipo inválido', { is_demo: 'true' }],
    ['confirmação com tipo inválido', { classification_reviewed: 'sim' }],
    ['campo de condição com tipo inválido', { [booleanField]: 'false' }],
    ['reincidência com tipo inválido', { recurrent: 1 }],
    ['pontuação detalhada que não é lista', { breakdown: {} }],
    ['pontuação detalhada com entrada nula', { breakdown: [null] }],
    ['pontuação detalhada sem rótulo', { breakdown: [{ points: 10 }] }],
    ['pontuação detalhada textual', { breakdown: [{ label: 'Categoria', points: '10' }] }],
    ['pontuação detalhada negativa', { breakdown: [{ label: 'Categoria', points: -1 }] }],
  ])('recusa %s e mantém o JSON original intacto', async (_label, overrides) => {
    const original = ` \n${JSON.stringify([{ ...example(), ...overrides }], null, 2)}\n `;
    localStorage.setItem(repo.key, original);
    await expect(repo.list()).rejects.toThrow(/corrompidos.*Exporte uma cópia/);
    expect(localStorage.getItem(repo.key)).toBe(original);
  });

  it('recusa identificadores duplicados sem escolher ou apagar uma das linhas', () => {
    const rows = createDemoData().slice(0, 2);
    rows[1].id = rows[0].id;
    const original = JSON.stringify(rows);
    localStorage.setItem(repo.key, original);
    expect(() => repo.read()).toThrow('formato inválido');
    expect(localStorage.getItem(repo.key)).toBe(original);
  });

  it('mantém a lista vazia existente sem criar novamente os exemplos', async () => {
    const original = ' \n[]\n ';
    localStorage.setItem(repo.key, original);
    await repo.init();
    expect(await repo.list()).toEqual([]);
    expect(localStorage.getItem(repo.key)).toBe(original);
  });

  it('aceita registros legados sem acrescentar metadados opcionais ou normalizar o JSON', async () => {
    const row = example();
    row.id = 'registro-legado';
    row.latitude = String(row.latitude);
    row.longitude = String(row.longitude);
    row.status_history = [];
    for (const field of [
      'updated_at',
      'user_id',
      'image_path',
      'description',
      'guidance',
      'classification_reviewed',
      'breakdown',
      'is_demo',
      'is_owner',
      'recurrent',
      'sensitive_area',
      'standing_water',
      'outdoor_area',
    ])
      delete row[field];
    const original = `\n${JSON.stringify([row], null, 2)}\n`;
    localStorage.setItem(repo.key, original);
    await repo.init();
    expect(await repo.list()).toEqual([{ ...row, is_owner: false }]);
    expect(localStorage.getItem(repo.key)).toBe(original);
  });

  it('preserva registros válidos, permite atualização própria e mantém os exemplos somente para leitura', async () => {
    await repo.init();
    const seed = (await repo.list())[0];
    await expect(repo.updateStatus(seed.id, 'Em análise')).rejects.toThrow('somente');
    const saved = await repo.create(validInput());
    await repo.updateStatus(saved.id, 'Em análise');
    const original = localStorage.getItem(repo.key);
    const reopened = new LocalOccurrenceRepository();
    await reopened.init();
    expect((await reopened.get(saved.id)).status_history.map((entry) => entry.status)).toEqual([
      'Recebido',
      'Em análise',
    ]);
    expect(localStorage.getItem(repo.key)).toBe(original);
    expect((await reopened.get(seed.id)).is_owner).toBe(false);
  });

  it('um exemplo marcado como fictício nunca ganha permissão de alteração', async () => {
    await repo.init();
    const row = { ...example(), user_id: repo.userId };
    const original = JSON.stringify([row]);
    localStorage.setItem(repo.key, original);
    expect((await repo.get(row.id)).is_owner).toBe(false);
    await expect(repo.updateStatus(row.id, 'Em análise')).rejects.toThrow('somente');
    expect(localStorage.getItem(repo.key)).toBe(original);
  });

  if (config.kind === 'waste')
    it('recusa volume que impediria apresentar a soma nos detalhes', () => {
      const original = JSON.stringify([{ ...example(), volume: 'Volume inexistente' }]);
      localStorage.setItem(repo.key, original);
      expect(() => repo.read()).toThrow('corrompidos');
      expect(localStorage.getItem(repo.key)).toBe(original);
    });
});
