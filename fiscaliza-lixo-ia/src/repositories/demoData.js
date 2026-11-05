import { config } from '../config.js';
import { classify } from '../services/classificationService.js';

/** Exemplos inteiramente fictícios; as coordenadas são aproximadas em Goiânia. */
export function createDemoData() {
  const districts = [
    'Setor Central',
    'Jardim América',
    'Setor Bueno',
    'Campinas',
    'Setor Central',
    'Jardim América',
  ];
  return Array.from({ length: 6 }, (_, index) => {
    const category = config.categories[index % config.categories.length];
    const input = {
      ...(config.kind === 'waste'
        ? {
            category,
            volume: ['Pequeno', 'Médio', 'Grande'][index % 3],
            sensitive_area: index % 2 === 0,
          }
        : { container_type: category, standing_water: index % 2 === 0, outdoor_area: true }),
      recurrent: index % 3 === 0,
    };
    const created_at = `2026-11-0${(index % 3) + 1}T12:00:00.000Z`;
    const status = [
      'Recebido',
      'Em análise',
      config.kind === 'waste' ? 'Encaminhado' : 'Orientação enviada',
      'Resolvido',
      'Recebido',
      'Descartado',
    ][index];
    return {
      ...input,
      ...classify(input),
      id: `00000000-0000-4000-8000-00000000000${index + 1}`,
      user_id: null,
      created_at,
      updated_at: created_at,
      image_path: './example-occurrence.png',
      description: `Exemplo fictício: ${category.toLocaleLowerCase('pt-BR')} em área pública. Dados criados para aprendizagem.`,
      latitude: -16.68 + index * 0.007,
      longitude: -49.26 - index * 0.006,
      district: districts[index],
      status,
      status_history: [
        { status: 'Recebido', created_at },
        ...(status === 'Recebido' ? [] : [{ status, created_at }]),
      ],
      classification_reviewed: true,
      is_demo: true,
      is_owner: false,
    };
  });
}
