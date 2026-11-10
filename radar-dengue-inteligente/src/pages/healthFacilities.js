import { pageHeading } from '../components/layout.js';
import { escapeHtml as e, options } from '../utils/html.js';
import {
  facilityTypes,
  serviceStatusLabels,
  filterHealthFacilities,
  hasFacilityCoordinates,
  facilityMapUrl,
  validateHealthFacility,
} from '../services/healthFacilityService.js';

function sourceLink(url, label) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return '';
    return `<a target="_blank" rel="noopener noreferrer" href="${e(url)}">${e(label)} ↗</a>`;
  } catch {
    return '';
  }
}
function phoneLink(phone) {
  if (!phone) return 'Não informado; consulte a fonte ou a unidade.';
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? `<a href="tel:${digits}">${e(phone)}</a>` : e(phone);
}

export function healthFacilityCards(rows) {
  if (!rows.length)
    return '<p class="empty-state">Nenhuma unidade encontrada com estes filtros.</p>';
  return rows
    .map(
      (row) => `<article class="panel health-card" data-facility-id="${e(row.id)}">
    <div class="health-card-heading"><div><p class="health-type">${e(row.facility_type)}</p><h3>${e(row.name)}</h3></div><span class="health-badge">${row.publication_status === 'pending' ? 'Minha sugestão · aguardando validação' : row.source_kind === 'official_partial' ? 'Fonte oficial · confirme os dados atuais' : 'Cadastro validado'}</span></div>
    <p class="health-address">${e(row.address)}<br />${e(row.district)} · Itumbiara / GO</p><p>${e(row.description)}</p>
    <dl class="health-services"><div><dt>Atendimento médico</dt><dd>${e(serviceStatusLabels[row.medical_care_status] || serviceStatusLabels.unknown)}</dd></div><div><dt>Vacinação</dt><dd>${e(serviceStatusLabels[row.vaccination_status] || serviceStatusLabels.unknown)}</dd></div></dl>
    <p><strong>Contato institucional:</strong> ${phoneLink(row.phone)}</p><p><strong>Horário cadastrado:</strong> ${e(row.opening_hours || 'Não informado; confirme com a unidade.')}</p>
    ${row.service_notes ? `<p>${e(row.service_notes)}</p>` : ''}
    <p class="health-location">${hasFacilityCoordinates(row) ? (row.location_precision === 'confirmed' ? 'Localização confirmada.' : 'Localização aproximada — referência da região, não da entrada.') : 'Localização ainda não informada; cadastro disponível na lista.'}</p>
    <details><summary>Fontes e confirmação das informações</summary><p>${e(row.source_notes || 'Informações enviadas por visitante, ainda não validadas.')}</p>${row.sources_checked_on ? `<p>Fontes consultadas em ${e(row.sources_checked_on.split('-').reverse().join('/'))}.</p>` : ''}<p>${e(row.location_notes || 'A posição precisa de confirmação antes de usar como destino.')}</p>${row.cnes_code ? `<p>CNES: ${e(row.cnes_code)}</p>` : ''}${sourceLink(row.source_url, 'Consultar fonte')}${sourceLink(row.location_source_url, 'Consultar referência da localização')}</details>
    <div class="button-row"><a class="button secondary" target="_blank" rel="noopener noreferrer" href="${e(facilityMapUrl(row))}">Consultar endereço ↗</a>${row.publication_status === 'published' ? `<a class="text-link" href="#/health-services/suggest/${encodeURIComponent(row.id)}">Sugerir correção</a>` : ''}</div></article>`,
    )
    .join('');
}

export function healthFacilitiesPage(rows) {
  return `${pageHeading('Serviços de saúde', 'Encontre endemias, vigilância e unidades de saúde de Itumbiara.', '<a class="button" href="#/health-services/new">Cadastrar unidade</a>')}
  <p class="notice">Confirme com a unidade atendimento, horários, vacina disponível, estoque e público atendido. Um registro de vacinação não confirma oferta atual de vacina contra dengue.</p>
  <section class="panel health-explore" aria-label="Mapa e filtros dos serviços de saúde"><details class="health-filter-panel" open><summary>Filtrar por bairro, tipo ou serviço</summary>
  <form id="health-filters" class="health-filters" aria-label="Filtros dos serviços de saúde"><div class="field"><label for="health-search">Nome, endereço, bairro ou CNES</label><input type="search" id="health-search" name="search" placeholder="Buscar uma unidade" /></div>
  <div class="field"><label for="health-type">Tipo de unidade</label><select id="health-type" name="type">${options(facilityTypes, '', 'Todos os tipos')}</select></div>
  <div class="field"><label for="health-service">Serviço</label><select id="health-service" name="service"><option value="">Todos os serviços</option><option value="medical">Atendimento médico informado</option><option value="vaccination">Vacinação informada na fonte</option><option value="possible_vaccination">Vacinação a confirmar</option><option value="surveillance">Endemias e vigilâncias</option></select></div><button class="button secondary" type="reset">Limpar filtros</button></form></details>
  <div id="health-map" class="map full-map" aria-label="Mapa dos serviços de saúde de Itumbiara"></div><p class="map-note" data-map-status>Marcadores aproximados indicam referências de regiões. Confirme a entrada da unidade antes de ir.</p></section>
  <div class="results-heading health-results"><h2>Unidades e serviços</h2><p id="health-count" role="status">${rows.length} unidades encontradas</p></div><div id="health-list" class="health-grid">${healthFacilityCards(rows)}</div>`;
}

export function bindHealthFacilities(rows, map) {
  const form = document.querySelector('#health-filters');
  form.closest('details').open = window.matchMedia('(min-width:700px)').matches;
  let disposed = false,
    resetTimer;
  function update() {
    if (disposed) return;
    const filtered = filterHealthFacilities(rows, Object.fromEntries(new FormData(form)));
    document.querySelector('#health-list').innerHTML = healthFacilityCards(filtered);
    document.querySelector('#health-count').textContent =
      `${filtered.length} ${filtered.length === 1 ? 'unidade encontrada' : 'unidades encontradas'} · ${filtered.filter(hasFacilityCoordinates).length} no mapa`;
    map.update(filtered);
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

export function healthFacilityForm(row = null) {
  const value = (key) => e(row?.[key] ?? '');
  const statusOptions = (selected = 'unknown') =>
    Object.entries(serviceStatusLabels)
      .map(
        ([key, label]) =>
          `<option value="${key}"${key === selected ? ' selected' : ''}>${e(label)}</option>`,
      )
      .join('');
  return `${pageHeading(row ? 'Corrigir informações de uma unidade' : 'Cadastrar serviço de saúde', 'Envie dados institucionais de uma unidade em Itumbiara. A sugestão aguardará validação.')}
  <form id="health-facility-form" class="registration-form" novalidate><div><section class="panel form-panel"><h2>${row ? e(row.name) : 'Sobre a unidade'}</h2>
  <p class="help-text">Informe apenas dados institucionais públicos. Não inclua nomes de pacientes, sintomas, documentos ou informações clínicas pessoais.</p>
  <div class="field"><label for="facility-name">Nome da unidade *</label><input id="facility-name" name="name" value="${value('name')}" minlength="3" maxlength="160" required /></div>
  <div class="field"><label for="facility-type">Tipo de unidade *</label><select id="facility-type" name="facility_type" required>${options(facilityTypes, row?.facility_type, 'Selecione o tipo')}</select></div>
  <div class="field"><label for="facility-address">Endereço *</label><input id="facility-address" name="address" value="${value('address')}" minlength="8" maxlength="300" required /></div>
  <div class="field"><label for="facility-district">Bairro ou região *</label><input id="facility-district" name="district" value="${value('district')}" maxlength="100" required /></div><p class="help-text">Município: Itumbiara / GO.</p>
  <div class="field"><label for="facility-description">Descrição da unidade *</label><textarea id="facility-description" name="description" minlength="10" maxlength="1000" rows="3" required>${value('description')}</textarea></div>
  <div class="field"><label for="facility-phone">Telefone institucional</label><input id="facility-phone" name="phone" type="tel" value="${value('phone')}" maxlength="30" /></div>
  <div class="field"><label for="facility-cnes">Código CNES (sete dígitos, se houver)</label><input id="facility-cnes" name="cnes_code" inputmode="numeric" pattern="[0-9]{7}" maxlength="7" value="${value('cnes_code')}" /></div>
  </section></div><div><section class="panel form-panel"><h2>Serviços e localização</h2>
  <div class="field"><label for="facility-care">Atendimento médico *</label><select id="facility-care" name="medical_care_status">${statusOptions(row?.medical_care_status)}</select></div>
  <div class="field"><label for="facility-vaccine">Vacinação *</label><select id="facility-vaccine" name="vaccination_status">${statusOptions(row?.vaccination_status)}</select></div>
  <p class="help-text">Não presuma vacinação a partir do nome da unidade. Uma campanha anterior não confirma vacina, estoque ou público atendido hoje.</p>
  <div class="field"><label for="facility-hours">Horário de funcionamento</label><input id="facility-hours" name="opening_hours" value="${value('opening_hours')}" maxlength="300" /></div>
  <div class="field"><label for="facility-notes">Informações de atendimento e vacinação</label><textarea id="facility-notes" name="service_notes" maxlength="700" rows="3">${value('service_notes')}</textarea></div>
  <div class="field"><label for="facility-source">Fonte das informações (link HTTPS)</label><input id="facility-source" name="source_url" type="url" maxlength="500" value="${value('source_url')}" placeholder="https://…" /></div>
  <div class="field-pair"><div class="field"><label for="facility-lat">Latitude</label><input id="facility-lat" name="latitude" type="number" min="-90" max="90" step="any" value="${value('latitude')}" /></div><div class="field"><label for="facility-lng">Longitude</label><input id="facility-lng" name="longitude" type="number" min="-180" max="180" step="any" value="${value('longitude')}" /></div></div>
  <p class="help-text">Coordenadas opcionais. Digite os valores ou selecione uma referência aproximada no mapa. Não informe sua residência.</p><div id="health-picker" class="map health-picker" aria-label="Escolher localização da unidade"></div><p class="help-text" id="health-picked" role="status"></p>
  <label class="checkbox"><input name="information_reviewed" type="checkbox" required /><span>Conferi os dados institucionais e entendo que aguardam validação. *</span></label><div id="health-form-errors" role="alert" tabindex="-1"></div><div class="button-row"><button class="button" type="submit">Enviar para validação</button><a class="button secondary" href="#/health-services">Cancelar</a></div>
  </section></div></form>`;
}

export function bindHealthFacilityForm(app, original = null) {
  const form = document.querySelector('#health-facility-form'),
    id = crypto.randomUUID();
  let saving = false,
    disposed = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saving) return;
    const data = new FormData(form),
      input = {
        ...Object.fromEntries(data),
        id,
        replaces_id: original?.id || null,
        information_reviewed: data.has('information_reviewed'),
      };
    const errors = validateHealthFacility(input),
      box = document.querySelector('#health-form-errors');
    box.innerHTML = Object.keys(errors).length
      ? `<ul>${Object.values(errors)
          .map((message) => `<li>${e(message)}</li>`)
          .join('')}</ul>`
      : '';
    if (Object.keys(errors).length) {
      box.focus();
      return;
    }
    saving = true;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Enviando…';
    try {
      await app.healthRepo.create(input);
      if (!disposed) {
        location.hash = '#/health-services';
        app.notify('Sugestão enviada. Ela aparecerá para todos após validação.');
      }
    } catch (error) {
      if (!disposed) {
        box.textContent = error.message;
        box.focus();
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
