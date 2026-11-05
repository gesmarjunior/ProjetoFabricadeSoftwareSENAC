export function escapeHtml(value = '') {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
}

export function options(items, selected = '', placeholder = '') {
  return `${placeholder ? `<option value="">${escapeHtml(placeholder)}</option>` : ''}${items.map((item) => `<option value="${escapeHtml(item)}"${item === selected ? ' selected' : ''}>${escapeHtml(item)}</option>`).join('')}`;
}

export function riskBadge(level) {
  const variant =
    { Baixo: 'low', Médio: 'medium', Alto: 'high', Crítico: 'critical' }[level] || 'low';
  return `<span class="risk-badge ${variant}"><span aria-hidden="true">●</span> ${escapeHtml(level)}</span>`;
}
