import { describe, expect, it, vi } from 'vitest';
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ marker: 'remote-client' })),
}));
import { createRepository } from '../../src/repositories/index.js';
import { LocalOccurrenceRepository } from '../../src/repositories/LocalOccurrenceRepository.js';
import { SupabaseOccurrenceRepository } from '../../src/repositories/SupabaseOccurrenceRepository.js';

describe('seleção explícita de persistência', () => {
  it('sem variáveis usa somente o modo local', () => {
    const result = createRepository({});
    expect(result.mode).toBe('local');
    expect(result.repo).toBeInstanceOf(LocalOccurrenceRepository);
  });
  it.each([
    { VITE_SUPABASE_URL: 'https://example.supabase.co' },
    { VITE_SUPABASE_PUBLISHABLE_KEY: 'public-example' },
  ])('configuração incompleta não é silenciosamente ignorada', (env) =>
    expect(() => createRepository(env)).toThrow('incompleta'),
  );
  it('com configuração usa o adaptador remoto', () => {
    const result = createRepository({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'public-example',
    });
    expect(result.mode).toBe('supabase');
    expect(result.repo).toBeInstanceOf(SupabaseOccurrenceRepository);
    expect(result.repo.client.marker).toBe('remote-client');
  });
});
