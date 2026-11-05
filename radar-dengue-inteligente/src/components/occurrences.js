import { escapeHtml as e, riskBadge } from '../utils/html.js';
import { formatDate } from '../utils/data.js';
import { icon } from '../utils/icons.js';
import { config } from '../config.js';

export function occurrenceList(rows, { compact = false } = {}) {
  if (!rows.length)
    return '<div class="empty-state"><h2>Nenhum registro encontrado</h2><p>Altere os filtros ou registre uma nova observação na sua comunidade.</p><a class="button" href="#/new">Novo registro</a></div>';
  return `<div class="occurrence-list" data-testid="occurrence-list">${rows.map((row) => `<a class="occurrence-row" href="#/details/${encodeURIComponent(row.id)}"><span class="row-symbol">${icon('pin')}</span><span class="row-copy"><strong>${e(row.classification)}</strong><span>${e(row.district)} · <time datetime="${e(row.created_at)}">${e(formatDate(row.created_at))}</time></span>${compact ? '' : `<small>${e(row.status)}${row.is_owner ? ' · Seu registro' : ' · Comunitário'}</small>`}</span>${riskBadge(row.risk_level)}${icon('arrow')}</a>`).join('')}</div>`;
}

export function metrics(totals) {
  return `<div class="metrics"><div><span>Total de registros</span><strong data-testid="total-occurrences">${totals.total}</strong></div><div><span>Em acompanhamento</span><strong>${totals.open}</strong></div><div><span>Resolvidos</span><strong>${totals.resolved}</strong></div><div><span>${config.kind === 'waste' ? 'Prioridade crítica' : 'Risco ambiental crítico'}</span><strong>${totals.critical}</strong></div></div>`;
}
