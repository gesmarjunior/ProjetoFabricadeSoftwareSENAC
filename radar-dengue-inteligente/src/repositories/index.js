import { createClient } from '@supabase/supabase-js';
import { LocalOccurrenceRepository } from './LocalOccurrenceRepository.js';
import { SupabaseOccurrenceRepository } from './SupabaseOccurrenceRepository.js';
import { HealthFacilityRepository } from './HealthFacilityRepository.js';

/** Falha remota nunca ativa silenciosamente o modo local. */
export function createRepository(environment = import.meta.env) {
  const url = environment.VITE_SUPABASE_URL;
  const key = environment.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url && !key)
    return {
      mode: 'local',
      repo: new LocalOccurrenceRepository(),
      healthRepo: new HealthFacilityRepository(null, globalThis.localStorage),
    };
  if (!url || !key)
    throw new Error(
      'Configuração incompleta: informe VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.',
    );
  const client = createClient(url, key);
  return {
    mode: 'supabase',
    repo: new SupabaseOccurrenceRepository(client),
    healthRepo: new HealthFacilityRepository(client),
  };
}
