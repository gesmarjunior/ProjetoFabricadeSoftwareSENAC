import { config } from '../config.js';
import { options } from '../utils/html.js';

export function filters(rows) {
  return `<form id="filters" class="filters" aria-label="Filtros dos registros"><div class="field"><label for="period">Período</label><select id="period" name="period"><option value="">Todo o período</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option></select></div><div class="field"><label for="priority">${config.kind === 'waste' ? 'Prioridade' : 'Risco ambiental'}</label><select id="priority" name="priority">${options(['Baixo', 'Médio', 'Alto', 'Crítico'], '', 'Todos os níveis')}</select></div><div class="field"><label for="filter-category">${config.kind === 'waste' ? 'Categoria' : 'Recipiente'}</label><select id="filter-category" name="category">${options(config.categories, '', 'Todas as categorias')}</select></div><div class="field"><label for="filter-status">Status</label><select id="filter-status" name="status">${options(config.statuses, '', 'Todos os status')}</select></div><div class="field"><label for="filter-district">Bairro</label><select id="filter-district" name="district">${options([...new Set(rows.map((row) => row.district))].sort(), '', 'Todos os bairros')}</select></div><button class="button secondary" type="reset">Limpar filtros</button></form>`;
}

export function readFilters(form) {
  const values = Object.fromEntries(new FormData(form));
  return { ...values, risk: values.priority, period: values.period || 'all' };
}
