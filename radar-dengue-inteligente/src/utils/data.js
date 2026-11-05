export function approximateCoordinates(latitude, longitude) {
  return {
    latitude: Math.round(Number(latitude) * 1000) / 1000,
    longitude: Math.round(Number(longitude) * 1000) / 1000,
  };
}

export function formatDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Data indisponível';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

export function filterOccurrences(rows, filters = {}, now = new Date()) {
  return rows.filter((row) => {
    const category = row.category || row.container_type || row.classification;
    if (filters.category && category !== filters.category) return false;
    if (
      (filters.risk || filters.risk_level) &&
      row.risk_level !== (filters.risk || filters.risk_level)
    )
      return false;
    if (filters.status && row.status !== filters.status) return false;
    if (filters.district && row.district !== filters.district) return false;
    if (filters.onlyMine && !row.is_owner) return false;
    if (
      filters.period &&
      filters.period !== 'all' &&
      new Date(row.created_at).getTime() < now.getTime() - Number(filters.period) * 86400000
    )
      return false;
    if (
      filters.search &&
      !`${row.description || ''} ${row.district} ${category}`
        .toLocaleLowerCase('pt-BR')
        .includes(filters.search.toLocaleLowerCase('pt-BR'))
    )
      return false;
    return true;
  });
}

const monthFormatter = new Intl.DateTimeFormat('en', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
});

function localMonth(value) {
  const parts = monthFormatter.formatToParts(new Date(value));
  return `${parts.find((part) => part.type === 'year').value}-${parts.find((part) => part.type === 'month').value}`;
}

function groupBy(rows, key) {
  const counts = new Map();
  for (const row of rows) {
    const label = key(row);
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'));
}

export function aggregateOccurrences(rows) {
  return {
    total: rows.length,
    resolved: rows.filter((row) => row.status === 'Resolvido').length,
    open: rows.filter((row) => !['Resolvido', 'Descartado'].includes(row.status)).length,
    critical: rows.filter((row) => row.risk_level === 'Crítico').length,
    byCategory: groupBy(rows, (row) => row.classification),
    byDistrict: groupBy(rows, (row) => row.district),
    byStatus: groupBy(rows, (row) => row.status),
    byRisk: groupBy(rows, (row) => row.risk_level),
    byMonth: groupBy(rows, (row) => localMonth(row.created_at)).sort((a, b) =>
      a.label.localeCompare(b.label),
    ),
  };
}

export function distanceKm(from, to) {
  const radians = (angle) => (angle * Math.PI) / 180;
  const latDiff = radians(to.latitude - from.latitude);
  const lonDiff = radians(to.longitude - from.longitude);
  const term =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(lonDiff / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(term), Math.sqrt(1 - term));
}
