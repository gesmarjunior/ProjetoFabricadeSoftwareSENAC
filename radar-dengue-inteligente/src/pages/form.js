import { config } from '../config.js';
import { escapeHtml as e, options } from '../utils/html.js';
import { icon } from '../utils/icons.js';
import { pageHeading } from '../components/layout.js';
import { validateOccurrence } from '../utils/validation.js';
import { prepareImage } from '../services/imageService.js';
import { approximateCoordinates } from '../utils/data.js';

function checkbox(name, label, checked) {
  return `<label class="checkbox"><input type="checkbox" name="${name}"${checked ? ' checked' : ''} /> <span>${label}</span></label><span class="field-error" id="error-${name}"></span>`;
}
function field(name, label, control, hint = '') {
  return `<div class="field"><label for="${name}">${label} <span aria-hidden="true">*</span><span class="sr-only"> obrigatório</span></label>${control}${hint ? `<small>${hint}</small>` : ''}<span class="field-error" id="error-${name}"></span></div>`;
}

export function formPage(draft = {}) {
  const categoryField = config.kind === 'waste' ? 'category' : 'container_type';
  return `${pageHeading(config.kind === 'waste' ? 'Registrar uma ocorrência' : 'Registrar possível criadouro', 'Seu olhar ajuda a cuidar da comunidade. Campos com * são obrigatórios.')}
    <ol class="steps" aria-label="Etapas do registro"><li aria-current="step"><b>1</b> Registro</li><li><b>2</b> Revisão</li><li><b>3</b> Acompanhamento</li></ol>
    <form id="occurrence-form" class="registration-form" novalidate><div class="form-main"><section class="panel form-panel"><h2>O que você observou?</h2>
    ${field('description', 'Descrição', `<textarea id="description" name="description" rows="4" maxlength="1000" placeholder="Descreva a situação sem incluir nomes, endereços completos ou outros dados pessoais." aria-describedby="error-description">${e(draft.description || '')}</textarea>`)}
    <div class="field-pair">${field(categoryField, config.kind === 'waste' ? 'Categoria' : 'Tipo de recipiente', `<select id="${categoryField}" name="${categoryField}" aria-describedby="error-${categoryField}">${options(config.categories, draft[categoryField], 'Selecione uma opção')}</select>`)}${config.kind === 'waste' ? field('volume', 'Volume', `<select id="volume" name="volume" aria-describedby="error-volume">${options(['Pequeno', 'Médio', 'Grande'], draft.volume, 'Selecione o volume')}</select>`) : ''}</div>
    <fieldset><legend>Condições do ambiente</legend>${config.kind === 'waste' ? checkbox('sensitive_area', 'Há uma área sensível próxima (escola, curso d’água ou unidade de saúde).', draft.sensitive_area) : `${checkbox('standing_water', 'Há água parada visível.', draft.standing_water)}${checkbox('outdoor_area', 'O recipiente está em uma área externa.', draft.outdoor_area)}`}${checkbox('recurrent', 'A situação já aconteceu neste local.', draft.recurrent)}</fieldset></section>
    <section class="panel form-panel"><h2>Onde aconteceu?</h2><p>Informe o bairro e use sua localização para indicar onde aconteceu.</p>${field('district', 'Bairro', `<input id="district" name="district" maxlength="80" value="${e(draft.district || '')}" placeholder="Ex.: Centro" aria-describedby="error-district" />`)}
    <button id="geolocation" class="button secondary" type="button">${icon('pin')}Usar minha localização</button><p id="location-message" role="status" class="help-text">Você também pode preencher as coordenadas manualmente.</p><div class="field-pair">${field('latitude', 'Latitude aproximada', `<input id="latitude" name="latitude" type="number" step="0.001" min="-90" max="90" value="${e(draft.latitude ?? '')}" placeholder="-16.680" aria-describedby="error-latitude" />`)}${field('longitude', 'Longitude aproximada', `<input id="longitude" name="longitude" type="number" step="0.001" min="-180" max="180" value="${e(draft.longitude ?? '')}" placeholder="-49.260" aria-describedby="error-longitude" />`)}</div></section></div>
    <aside class="form-aside"><section class="panel form-panel"><h2>Foto do local</h2><div class="photo-upload">${icon('camera')}<p>Uma foto ajuda a documentar a situação.</p><label class="button secondary upload-label" for="image">Selecionar foto <span aria-hidden="true">*</span></label><input class="sr-only" id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Foto do local obrigatória" aria-describedby="image-help error-image" /><small id="image-help">JPEG, PNG ou WebP · até 5 MB.</small></div><img id="image-preview" class="image-preview" alt="Prévia da foto selecionada para o registro"${draft.image ? ` src="${e(draft.image)}"` : ' hidden'} /><p id="image-state" role="status">${draft.image ? 'Foto selecionada.' : ''}</p><span class="field-error" id="error-image"></span><div class="privacy-note">${icon('shield')}<p>Não fotografe pessoas, placas, documentos ou interiores de residências. Não se coloque em risco para fazer o registro.</p></div>${checkbox('privacy_confirmed', 'Confirmo que a foto não expõe pessoas, placas, documentos ou interiores de residências.', draft.privacy_confirmed)}</section><div id="form-feedback" role="alert" class="feedback"></div><button class="button full-width" type="submit">Continuar ${icon('arrow')}</button><p class="help-text">Você poderá conferir tudo antes de salvar.</p></aside></form>`;
}

export function bindForm(app) {
  const form = document.querySelector('#occurrence-form');
  let image = app.draft.image || '';
  let preparing = false;
  let leave = false;
  let imageVersion = 0;
  function read() {
    const data = Object.fromEntries(new FormData(form));
    for (const name of [
      'sensitive_area',
      'recurrent',
      'standing_water',
      'outdoor_area',
      'privacy_confirmed',
    ])
      data[name] = Boolean(form.elements[name]?.checked);
    return { ...data, image };
  }
  function preserve() {
    app.saveDraft(read());
  }
  form.addEventListener('input', preserve);
  form.elements.image.addEventListener('change', async () => {
    const file = form.elements.image.files[0];
    if (!file) return;
    const version = ++imageVersion;
    preparing = true;
    form.querySelector('[type=submit]').disabled = true;
    document.querySelector('#image-state').textContent = 'Preparando a imagem…';
    document.querySelector('#error-image').textContent = '';
    try {
      const prepared = await prepareImage(file);
      if (leave || version !== imageVersion) return;
      image = prepared;
      const preview = document.querySelector('#image-preview');
      preview.src = image;
      preview.hidden = false;
      document.querySelector('#image-state').textContent = 'Foto pronta para revisão.';
      preserve();
    } catch (error) {
      if (leave || version !== imageVersion) return;
      image = '';
      const preview = document.querySelector('#image-preview');
      preview.hidden = true;
      preview.removeAttribute('src');
      document.querySelector('#image-state').textContent = '';
      document.querySelector('#error-image').textContent = error.message;
      form.elements.image.setAttribute('aria-invalid', 'true');
      preserve();
    } finally {
      if (version === imageVersion) {
        preparing = false;
        if (!leave) form.querySelector('[type=submit]').disabled = false;
      }
    }
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (preparing) return;
    const input = read();
    const errors = validateOccurrence(input);
    form
      .querySelectorAll('[aria-invalid]')
      .forEach((control) => control.removeAttribute('aria-invalid'));
    form.querySelectorAll('.field-error').forEach((message) => {
      message.textContent = '';
    });
    if (Object.keys(errors).length) {
      for (const [name, message] of Object.entries(errors)) {
        const control = form.elements[name];
        control?.setAttribute('aria-invalid', 'true');
        control?.setAttribute('aria-describedby', `error-${name}`);
        form.querySelector(`#error-${name}`).textContent = message;
      }
      document.querySelector('#form-feedback').textContent =
        'Confira os campos indicados. Seu preenchimento foi preservado.';
      form.elements[Object.keys(errors)[0]]?.focus();
      return;
    }
    const coordinates = approximateCoordinates(input.latitude, input.longitude);
    app.saveDraft({ ...input, ...coordinates, classification_reviewed: false });
    location.hash = '/review';
  });
  document.querySelector('#geolocation').addEventListener('click', () => {
    const button = document.querySelector('#geolocation');
    const message = document.querySelector('#location-message');
    if (!navigator.geolocation) {
      message.textContent = 'Geolocalização indisponível. Preencha as coordenadas manualmente.';
      return;
    }
    button.disabled = true;
    message.textContent = 'Buscando sua localização aproximada…';
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (leave) return;
        const rounded = approximateCoordinates(coords.latitude, coords.longitude);
        form.elements.latitude.value = rounded.latitude;
        form.elements.longitude.value = rounded.longitude;
        message.textContent = 'Localização aproximada preenchida. Confira antes de continuar.';
        button.disabled = false;
        preserve();
      },
      () => {
        if (leave) return;
        message.textContent =
          'Não foi possível obter sua localização. Preencha as coordenadas manualmente.';
        button.disabled = false;
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  });
  return () => {
    leave = true;
  };
}
