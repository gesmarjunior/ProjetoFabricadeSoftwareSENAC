import { config } from '../config.js';

export const statuses = [
  'Recebido',
  'Em análise',
  config.kind === 'waste' ? 'Encaminhado' : 'Orientação enviada',
  'Resolvido',
  'Descartado',
];

export function allowedTransitions(status) {
  const forwarded = statuses[2];
  const transitions = {
    Recebido: ['Em análise', 'Descartado'],
    'Em análise': [forwarded, 'Resolvido', 'Descartado'],
    [forwarded]: ['Em análise', 'Resolvido', 'Descartado'],
    Resolvido: ['Em análise'],
    Descartado: [],
  };
  return transitions[status] || [];
}

export function canTransition(from, to) {
  return allowedTransitions(from).includes(to);
}

export function assertTransition(from, to) {
  if (!canTransition(from, to))
    throw new Error(`A alteração de ${from} para ${to} não é permitida.`);
}
