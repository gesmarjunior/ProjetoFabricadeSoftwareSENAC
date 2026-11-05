import { config } from '../config.js';
import { pageHeading } from '../components/layout.js';
import { escapeHtml as e, options, riskBadge } from '../utils/html.js';
import { formatDate } from '../utils/data.js';
import { allowedTransitions } from '../utils/status.js';
import { classify } from '../services/classificationService.js';
import { breakdown } from './review.js';
import { icon } from '../utils/icons.js';

export async function detailsPage(row, repo) {
  const transitions = allowedTransitions(row.status);
  const privateVisible = row.is_owner || row.is_demo;
  const photo = privateVisible && row.image_path ? await repo.getImageUrl(row.image_path) : null;

  return `${pageHeading(
    'Detalhes do registro',
    `Localização aproximada · ${e(row.district)}`,
    '<a class="button secondary" href="#/tracking">Ver acompanhamento</a>',
  )}
    <p class="record-meta">
      <span data-testid="occurrence-id">Registro #${e(row.id.slice(0, 8).toUpperCase())}</span> ·
      ${row.is_demo ? 'Exemplo fictício' : row.is_owner ? 'Seu registro' : 'Registro comunitário'}
    </p>
    <div class="details-grid">
      <div>
        <section class="panel form-panel">
          ${
            photo
              ? `<img class="detail-photo" src="${e(photo)}" alt="${row.is_demo ? 'Imagem fictícia de demonstração do registro' : 'Foto enviada pelo autor do registro'}" />`
              : privateVisible
                ? '<p class="help-text">Foto indisponível no momento.</p>'
                : ''
          }
          <div class="detail-title"><h2>${e(row.classification)}</h2>${riskBadge(row.risk_level)}</div>
          ${row.description && privateVisible ? `<p>${e(row.description)}</p>` : ''}
          <dl class="detail-facts">
            <div><dt>Bairro</dt><dd>${e(row.district)}</dd></div>
            <div><dt>Status</dt><dd>${e(row.status)}</dd></div>
            <div><dt>Data do registro</dt><dd><time datetime="${e(row.created_at)}">${e(formatDate(row.created_at))}</time></dd></div>
            <div><dt>Local aproximado</dt><dd>${e(row.latitude)}, ${e(row.longitude)}</dd></div>
            <div><dt>${config.riskLabel}</dt><dd>${row.risk_score}/100 · ${e(row.risk_level)}</dd></div>
          </dl>
        </section>
        ${
          privateVisible
            ? `<section class="panel form-panel">
          <h2>Histórico de status</h2>
          <ol class="timeline">${
            (row.status_history || [])
              .map(
                (entry) =>
                  `<li><strong>${e(entry.status)}</strong><time datetime="${e(entry.created_at)}">${e(formatDate(entry.created_at))}</time></li>`,
              )
              .join('') || '<li>Nenhuma atualização registrada.</li>'
          }</ol>
          ${
            row.is_owner && transitions.length
              ? `<form id="status-form">
                <div class="field">
                  <label for="next-status">Novo status</label>
                  <select name="status" id="next-status">${options(transitions)}</select>
                </div>
                <p class="help-text">Atualize o andamento conforme a situação do local.</p>
                <div id="status-feedback" role="alert" class="feedback"></div>
                <button class="button" type="submit">Atualizar status</button>
              </form>`
              : row.is_owner
                ? '<p class="help-text">Registro encerrado.</p>'
                : ''
          }
        </section>`
            : ''
        }
      </div>
      <aside>
        <section class="panel form-panel">
          <h2>${config.kind === 'waste' ? 'Orientação para o destino correto' : 'Orientação preventiva'}</h2>
          <p>${e(row.guidance || config.notice)}</p>
          <a class="button secondary" href="#/guidance">${config.kind === 'waste' ? 'Ver orientações de descarte' : 'Ver medidas preventivas'} ${icon('arrow')}</a>
        </section>
        <section class="panel form-panel">
          <h2>Entenda ${config.kind === 'waste' ? 'a prioridade' : 'o risco ambiental'}</h2>
          ${
            row.breakdown
              ? breakdown(row)
              : privateVisible
                ? breakdown(classify(row))
                : `<p>${row.risk_score} de 100 pontos</p><a href="#/about">Como esse resultado é calculado?</a>`
          }
        </section>
      </aside>
    </div>`;
}
export function bindDetails(app, row) {
  const form = document.querySelector('#status-form');
  let active = true;
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button');
    if (button.disabled) return;
    button.disabled = true;
    button.textContent = 'Atualizando…';
    try {
      await app.repo.updateStatus(row.id, form.elements.status.value);
      app.notify('Status atualizado.');
      if (active) await app.render();
    } catch (error) {
      if (!active) {
        app.notify(`Não foi possível atualizar o status: ${error.message}`);
        return;
      }
      document.querySelector('#status-feedback').textContent = error.message;
      button.disabled = false;
      button.textContent = 'Atualizar status';
    }
  });
  return () => {
    active = false;
  };
}
