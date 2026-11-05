import { config } from '../config.js';
import { pageHeading } from '../components/layout.js';
import { classify, confirmClassification } from '../services/classificationService.js';
import { escapeHtml as e, options, riskBadge } from '../utils/html.js';
import { icon } from '../utils/icons.js';

export function breakdown(result) {
  return `<dl class="breakdown">${result.breakdown.map(({ label, points }) => `<div><dt>${e(label)}</dt><dd>${points} pontos</dd></div>`).join('')}<div class="breakdown-total"><dt>Total</dt><dd>${result.risk_score} / 100 pontos</dd></div></dl>`;
}

export function reviewPage(draft) {
  if (!draft.image)
    return `${pageHeading('Revise antes de salvar', 'Para obter uma análise, primeiro preencha um novo registro.')}<a class="button" href="#/new">Novo registro</a>`;
  const result = classify(draft);
  return `${pageHeading('Confira seu registro', 'Confira os detalhes e as orientações antes de salvar.')}
    <ol class="steps" aria-label="Etapas do registro"><li><b>1</b> Registro</li><li aria-current="step"><b>2</b> Revisão</li><li><b>3</b> Acompanhamento</li></ol>
    <div class="review-grid"><section class="panel form-panel"><h2>${config.kind === 'waste' ? 'Prioridade do registro' : 'Risco ambiental'}</h2><div id="score-result" aria-live="polite">${scoreResult(result)}</div>${config.kind === 'dengue' ? '<p class="help-text">Este resultado orienta a prevenção e não confirma a presença de mosquito ou doença.</p>' : ''}</section>
    <section class="panel form-panel"><h2>Detalhes do registro</h2><img class="review-photo" src="${e(draft.image)}" alt="Foto selecionada para o registro" /><p>${e(draft.description)}</p><p class="help-text">${e(draft.district)} · ${e(draft.latitude)}, ${e(draft.longitude)} (aproximado)</p><form id="review-form" novalidate><div class="field"><label for="classification">${config.kind === 'waste' ? 'Tipo de material' : 'Tipo de recipiente'}</label><select name="classification" id="classification">${options(config.categories, result.classification)}</select><small>Escolha a opção que melhor descreve o que você encontrou.</small></div><label class="checkbox"><input type="checkbox" name="classification_reviewed" /> <span>Conferi as informações e as orientações.</span></label><div id="review-feedback" role="alert" class="feedback"></div><div class="button-row"><a class="button secondary" href="#/new">Voltar e editar</a><button class="button" type="submit">${icon('check')}Confirmar e salvar</button></div></form></section></div>`;
}
function scoreResult(result) {
  return `<p class="label">${config.riskLabel}</p><div class="score-display"><strong>${result.risk_score}<small>/100</small></strong>${riskBadge(result.risk_level)}</div><p><strong>${e(result.classification)}</strong></p><details><summary>Entenda este resultado</summary>${breakdown(result)}</details><div class="guidance-box"><h3>${config.kind === 'waste' ? 'Destino e cuidado' : 'Orientação preventiva'}</h3><p>${e(result.guidance)}</p></div>`;
}

export function bindReview(app) {
  const form = document.querySelector('#review-form');
  if (!form) return;
  let active = true;
  form.elements.classification.addEventListener('change', () => {
    const revised = confirmClassification(app.draft, form.elements.classification.value);
    delete revised.submission_request_id;
    app.saveDraft({
      ...revised,
      classification_reviewed: false,
    });
    form.elements.classification_reviewed.checked = false;
    document.querySelector('#score-result').innerHTML = scoreResult(classify(app.draft));
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (app.submission.pending) return;
    const feedback = document.querySelector('#review-feedback');
    if (!form.elements.classification_reviewed.checked) {
      feedback.textContent = 'Confirme que revisou a classificação e a orientação antes de salvar.';
      form.elements.classification_reviewed.setAttribute('aria-invalid', 'true');
      form.elements.classification_reviewed.focus();
      return;
    }
    const button = form.querySelector('[type=submit]');
    button.disabled = true;
    button.textContent = 'Salvando registro…';
    feedback.textContent = '';
    // A chave acompanha o rascunho para recuperar um envio mesmo após recarregar a aba.
    if (!app.draft.submission_request_id) {
      app.saveDraft({ ...app.draft, submission_request_id: crypto.randomUUID() });
    }
    const submittedDraft = app.draft;
    const input = confirmClassification(submittedDraft, form.elements.classification.value);
    try {
      const saved = await app.submission.submit(input);
      if (app.draft === submittedDraft) app.clearDraft();
      app.notify('Registro salvo.');
      if (active) location.hash = `/details/${saved.id}`;
    } catch (error) {
      if (!active) {
        app.notify(`Não foi possível salvar: ${error.message} Seu rascunho foi preservado.`);
        return;
      }
      feedback.textContent = `Não foi possível salvar: ${error.message} Seu rascunho foi preservado.`;
      button.disabled = false;
      button.textContent = 'Confirmar e salvar';
    }
  });
  return () => {
    active = false;
  };
}
