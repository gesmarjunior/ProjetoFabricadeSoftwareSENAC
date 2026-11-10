import { pageHeading } from '../components/layout.js';
import { escapeHtml as e, options } from '../utils/html.js';
import {
  pointTypes,
  pointMaterials,
  accessOptions,
  filterCollectionPoints,
  hasPointCoordinates,
  pointMapUrl,
  validateCollectionPoint,
} from '../services/collectionPointService.js';

function sourceLink(url, label) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return '';
    return `<a target="_blank" rel="noopener noreferrer" href="${e(url)}">${e(label)} ↗</a>`;
  } catch {
    return '';
  }
}

export function collectionPointCards(rows) {
  if (!rows.length) return '<p class="empty-state">Nenhum local encontrado com estes filtros.</p>';
  return rows
    .map(
      (row) => `<article class="panel collection-card" data-point-id="${e(row.id)}">
    <div class="collection-card-heading"><div><p class="collection-type">${e(row.site_type)}</p><h3>${e(row.name)}</h3></div><span class="collection-badge">${row.publication_status === 'pending' ? 'Minha sugestão · aguardando validação' : row.source_kind === 'municipal_partial' ? 'Fonte municipal · detalhes a confirmar' : 'Cadastro validado'}</span></div>
    <p class="collection-address">${e(row.address)}<br />${e(row.district)} · Itumbiara / GO</p><p>${e(row.description)}</p>
    <h4>Materiais aceitos</h4><ul class="material-tags">${row.accepted_materials.map((material) => `<li>${e(material)}</li>`).join('')}</ul>
    <p><strong>Não recebe:</strong> ${e(row.rejected_materials || 'Confirme as restrições com a unidade.')}</p>
    <p><strong>Funcionamento:</strong> ${e(row.opening_hours || 'Horários não informados; confirme com a unidade.')}</p>
    <p><strong>Acesso:</strong> ${e(row.access_conditions)}</p>
    <p class="location-status">${hasPointCoordinates(row) ? (row.location_precision === 'confirmed' ? 'Localização confirmada.' : 'Localização aproximada — referência do bairro ou povoado, não da entrada.') : 'Localização ainda não informada; cadastro disponível na lista.'}</p>
    <details><summary>Origem e confirmação das informações</summary><p>${e(row.source_notes || 'Informação enviada por visitante e ainda não validada.')}</p><p>${e(row.location_notes || 'A posição precisa de confirmação antes de usar como destino.')}</p>${sourceLink(row.source_url, 'Consultar fonte')}${sourceLink(row.location_source_url, 'Consultar referência de localização')}</details>
    <div class="button-row"><a class="button secondary" target="_blank" rel="noopener noreferrer" href="${e(pointMapUrl(row))}">Consultar endereço ↗</a>${row.publication_status === 'published' ? `<a class="text-link" href="#/collection-points/suggest/${encodeURIComponent(row.id)}">Sugerir correção</a>` : ''}</div>
    </article>`,
    )
    .join('');
}

export function collectionPointsPage(rows) {
  return `${pageHeading('Pontos de coleta', 'Encontre ecopontos e outros destinos de resíduos em Itumbiara.', '<a class="button" href="#/collection-points/new">Cadastrar local</a>')}
    <p class="notice">Os ecopontos listados não recebem lixo doméstico comum. Restos de comida e resíduos de banheiro devem seguir a coleta domiciliar regular.</p>
    <section class="panel collection-explore" aria-label="Mapa e filtros dos locais de coleta">
      <details class="collection-filter-panel" open><summary>Filtrar locais por bairro, tipo ou material</summary>
      <form id="point-filters" class="collection-filters" aria-label="Filtros dos locais de coleta">
        <div class="field"><label for="point-search">Nome, endereço ou bairro</label><input id="point-search" name="search" type="search" placeholder="Buscar um local" /></div>
        <div class="field"><label for="point-type">Tipo de local</label><select id="point-type" name="type">${options(pointTypes, '', 'Todos os tipos')}</select></div>
        <div class="field"><label for="point-material">Material</label><select id="point-material" name="material">${options(pointMaterials, '', 'Todos os materiais')}</select></div>
        <button class="button secondary" type="reset">Limpar filtros</button>
      </form></details>
      <div id="collection-map" class="map full-map" aria-label="Mapa dos locais de coleta de Itumbiara"></div>
      <p class="map-note" data-map-status>Os marcadores aproximados indicam o bairro ou povoado. Confirme a entrada da unidade antes de ir.</p>
    </section><div class="results-heading collection-results"><h2>Locais de coleta</h2><p id="point-count" role="status">${rows.length} locais encontrados</p></div>
    <div id="collection-list" class="collection-grid">${collectionPointCards(rows)}</div>
    <p class="help-text">Aterros sanitários e estações de transbordo podem ter acesso restrito. O cadastro de uma unidade não autoriza a entrega de resíduos.</p>`;
}

export function bindCollectionPoints(rows, map) {
  const form = document.querySelector('#point-filters');
  form.closest('details').open = window.matchMedia('(min-width: 700px)').matches;
  let disposed = false;
  let resetTimer;
  function update() {
    if (disposed) return;
    const selected = filterCollectionPoints(rows, Object.fromEntries(new FormData(form)));
    document.querySelector('#collection-list').innerHTML = collectionPointCards(selected);
    document.querySelector('#point-count').textContent =
      `${selected.length} locais encontrados · ${selected.filter(hasPointCoordinates).length} no mapa`;
    map.update(selected);
  }
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', (event) => event.preventDefault());
  form.addEventListener('reset', () => {
    resetTimer = setTimeout(update, 0);
  });
  update();
  return () => {
    disposed = true;
    clearTimeout(resetTimer);
  };
}

export function collectionPointForm(row = null) {
  const value = (key) => e(row?.[key] ?? '');
  return `${pageHeading(row ? 'Corrigir informações de um local' : 'Cadastrar local de coleta', 'Envie informações de um estabelecimento em Itumbiara. O cadastro será analisado antes da publicação.')}
    <form id="collection-point-form" class="registration-form" novalidate>
      <div><section class="panel form-panel"><h2>${row ? e(row.name) : 'Sobre o local'}</h2>
        <div class="field"><label for="site-name">Nome do local *</label><input id="site-name" name="name" value="${value('name')}" minlength="3" maxlength="160" required /></div>
        <div class="field"><label for="site-type">Tipo de local *</label><select id="site-type" name="site_type" required>${options(pointTypes, row?.site_type, 'Selecione o tipo')}</select></div>
        <div class="field"><label for="site-address">Endereço *</label><input id="site-address" name="address" value="${value('address')}" minlength="8" maxlength="300" required /></div>
        <div class="field"><label for="site-district">Bairro ou povoado *</label><input id="site-district" name="district" value="${value('district')}" maxlength="100" required /></div>
        <p class="help-text">Município: Itumbiara / GO.</p>
        <div class="field"><label for="site-description">Descrição *</label><textarea id="site-description" name="description" minlength="10" maxlength="1000" rows="3" required>${value('description')}</textarea></div>
        <fieldset class="material-options"><legend>Materiais aceitos *</legend>${pointMaterials.map((material, index) => `<label class="checkbox" for="material-${index}"><input id="material-${index}" name="accepted_materials" type="checkbox" value="${e(material)}"${row?.accepted_materials.includes(material) ? ' checked' : ''} /><span>${e(material)}</span></label>`).join('')}</fieldset>
        <p class="help-text">Ecopontos não recebem lixo doméstico comum. Não marque materiais cujo recebimento você desconhece.</p>
        <div class="field"><label for="site-rejected">Materiais não aceitos</label><textarea id="site-rejected" name="rejected_materials" maxlength="500" rows="2">${value('rejected_materials')}</textarea></div>
      </section></div>
      <div><section class="panel form-panel"><h2>Entrega e localização</h2>
        <div class="field"><label for="site-hours">Horário de funcionamento</label><input id="site-hours" name="opening_hours" value="${value('opening_hours')}" maxlength="500" placeholder="Informe somente se souber" /></div>
        <div class="field"><label for="site-access">Condições de acesso *</label><select id="site-access" name="access_conditions">${options(accessOptions, row?.access_conditions || accessOptions[0])}</select></div>
        <div class="field"><label for="site-source">Fonte das informações (link HTTPS)</label><input id="site-source" name="source_url" type="url" value="${value('source_url')}" maxlength="500" placeholder="https://…" /></div>
        <div class="field-pair"><div class="field"><label for="site-lat">Latitude</label><input id="site-lat" name="latitude" type="number" step="any" min="-90" max="90" value="${value('latitude')}" /></div><div class="field"><label for="site-lng">Longitude</label><input id="site-lng" name="longitude" type="number" step="any" min="-180" max="180" value="${value('longitude')}" /></div></div>
        <p class="help-text">Coordenadas opcionais. Digite os valores ou clique no mapa para selecionar uma referência aproximada. Não informe sua residência.</p>
        <div id="point-picker" class="map point-picker" aria-label="Escolher localização do estabelecimento"></div><p id="picked-location" class="help-text" role="status"></p>
        <label class="checkbox"><input type="checkbox" name="information_reviewed" required /><span>Conferi as informações e entendo que o cadastro aguardará validação. *</span></label>
        <div id="point-form-errors" role="alert" tabindex="-1"></div>
        <div class="button-row"><button class="button" type="submit">Enviar para validação</button><a class="button secondary" href="#/collection-points">Cancelar</a></div>
      </section></div>
    </form>`;
}

export function bindCollectionPointForm(app, original = null) {
  const form = document.querySelector('#collection-point-form');
  const id = crypto.randomUUID();
  let saving = false;
  let disposed = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saving) return;
    const data = new FormData(form);
    const input = {
      ...Object.fromEntries(data),
      id,
      replaces_id: original?.id || null,
      accepted_materials: data.getAll('accepted_materials'),
      information_reviewed: data.has('information_reviewed'),
    };
    const errors = validateCollectionPoint(input);
    const errorBox = document.querySelector('#point-form-errors');
    errorBox.innerHTML = Object.keys(errors).length
      ? `<ul>${Object.values(errors)
          .map((message) => `<li>${e(message)}</li>`)
          .join('')}</ul>`
      : '';
    if (Object.keys(errors).length) {
      errorBox.focus();
      return;
    }
    saving = true;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Enviando…';
    try {
      await app.pointRepo.create(input);
      if (!disposed) {
        location.hash = '#/collection-points';
        app.notify('Sugestão enviada. Ela aparecerá para todos após validação.');
      }
    } catch (error) {
      if (!disposed) {
        errorBox.textContent = error.message;
        errorBox.focus();
      }
    } finally {
      saving = false;
      if (!disposed) {
        button.disabled = false;
        button.textContent = 'Enviar para validação';
      }
    }
  });
  return () => {
    disposed = true;
  };
}
