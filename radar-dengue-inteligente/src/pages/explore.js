import { config } from '../config.js';
import { pageHeading } from '../components/layout.js';
import { filters, readFilters } from '../components/filters.js';
import { occurrenceList } from '../components/occurrences.js';
import { filterOccurrences } from '../utils/data.js';
import { icon } from '../utils/icons.js';

export function explorePage(rows, isMap = false) {
  return `${pageHeading(isMap ? (config.kind === 'waste' ? 'Mapa de ocorrências' : 'Mapa de risco ambiental') : 'Acompanhamento dos registros', isMap ? 'Veja os registros perto de você e filtre por bairro ou situação.' : 'Consulte os registros e acompanhe o que mudou no seu bairro.', `<a class="button" href="#/new">${icon('plus')}Novo registro</a>`)}
    <section class="panel explore-panel">${filters(rows)}${isMap ? '<div id="occurrences-map" class="map full-map" aria-label="Mapa filtrado dos registros"></div><p class="map-note" data-map-status>Amplie o mapa para ver os registros mais próximos.</p>' : '<label class="checkbox mine-filter"><input id="only-mine" type="checkbox" /> <span>Mostrar somente meus registros</span></label>'}
    <div class="results-heading"><h2>${isMap ? 'Registros no mapa' : 'Registros da comunidade'}</h2><p id="filter-count" role="status">${rows.length} registros encontrados</p></div><div id="filtered-list">${occurrenceList(rows)}</div></section>`;
}

export function bindExplore(rows, map) {
  const form = document.querySelector('#filters');
  const mine = document.querySelector('#only-mine');
  function update() {
    const filtered = filterOccurrences(rows, {
      ...readFilters(form),
      onlyMine: mine?.checked || false,
    });
    document.querySelector('#filter-count').textContent =
      `${filtered.length} registros encontrados`;
    document.querySelector('#filtered-list').innerHTML = occurrenceList(filtered);
    map?.update(filtered);
  }
  form.addEventListener('change', update);
  form.addEventListener('reset', () => {
    if (mine) mine.checked = false;
    setTimeout(update, 0);
  });
  mine?.addEventListener('change', update);
}
