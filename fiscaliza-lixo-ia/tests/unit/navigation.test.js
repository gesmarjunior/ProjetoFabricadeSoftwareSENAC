import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reviewPage, bindReview } from '../../src/pages/review.js';
import { detailsPage, bindDetails } from '../../src/pages/details.js';
import { classify } from '../../src/services/classificationService.js';
import { createSubmission } from '../../src/services/submissionService.js';
import { validInput } from './fixtures.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function submit(form) {
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

async function pendingStatusPage() {
  const request = deferred();
  const row = {
    ...validInput(),
    ...classify(validInput()),
    id: 'existing-record',
    status: 'Recebido',
    is_owner: true,
    image_path: null,
    created_at: '2026-11-03T15:00:00Z',
    status_history: [],
  };
  const app = {
    repo: { updateStatus: vi.fn(() => request.promise) },
    notify: vi.fn(),
    render: vi.fn().mockResolvedValue(undefined),
  };
  document.body.innerHTML = await detailsPage(row, app.repo);
  const cleanup = bindDetails(app, row);
  document.querySelector('#next-status').value = 'Em análise';
  submit(document.querySelector('#status-form'));
  expect(app.repo.updateStatus).toHaveBeenCalledWith(row.id, 'Em análise');
  cleanup();
  document.body.innerHTML = '<main><h1>Outra página</h1></main>';
  return { request, app };
}

describe('respostas assíncronas depois de sair da página', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    sessionStorage.clear();
    location.hash = '/review';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('salvamento antigo preserva novo rascunho e não redireciona quem já saiu', async () => {
    const request = deferred();
    const repo = { create: vi.fn(() => request.promise) };
    const app = {
      mode: 'local',
      draft: validInput(),
      submission: createSubmission(repo),
      notify: vi.fn(),
      saveDraft: vi.fn(function (draft) {
        this.draft = draft;
      }),
      clearDraft: vi.fn(function () {
        this.draft = {};
      }),
    };
    document.body.innerHTML = reviewPage(app.draft);
    const cleanup = bindReview(app);
    document.querySelector('[name="classification_reviewed"]').checked = true;
    submit(document.querySelector('#review-form'));
    expect(repo.create).toHaveBeenCalledOnce();
    expect(app.submission.pending).toBe(true);

    cleanup();
    const newDraft = validInput({
      description: 'Um novo rascunho iniciado durante o envio anterior.',
    });
    app.draft = newDraft;
    location.hash = '/new';
    document.body.innerHTML = '<main><h1>Novo registro</h1></main>';
    request.resolve({ id: 'saved-previous-draft' });

    await vi.waitFor(() => expect(app.notify).toHaveBeenCalledWith('Registro salvo.'));
    expect(app.draft).toBe(newDraft);
    expect(app.clearDraft).not.toHaveBeenCalled();
    expect(location.hash).toBe('#/new');
    expect(document.body.textContent).toBe('Novo registro');
    expect(app.submission.pending).toBe(false);
  });

  it('reusa a chave do rascunho ao recarregar depois de uma resposta perdida', async () => {
    const repo = {
      create: vi
        .fn()
        .mockRejectedValueOnce(new Error('Resposta perdida'))
        .mockResolvedValueOnce({ id: 'saved-once' }),
    };
    function makeApp(draft) {
      return {
        mode: 'local',
        draft,
        submission: createSubmission(repo),
        notify: vi.fn(),
        saveDraft(value) {
          this.draft = value;
          sessionStorage.setItem('retry-draft-test', JSON.stringify(value));
        },
        clearDraft: vi.fn(),
      };
    }
    const app = makeApp(validInput());
    document.body.innerHTML = reviewPage(app.draft);
    const cleanup = bindReview(app);
    document.querySelector('[name="classification_reviewed"]').checked = true;
    submit(document.querySelector('#review-form'));
    await vi.waitFor(() =>
      expect(document.querySelector('#review-feedback').textContent).toContain('Resposta perdida'),
    );
    const firstRequestId = repo.create.mock.calls[0][1].requestId;
    expect(firstRequestId).toBe(app.draft.submission_request_id);
    cleanup();

    const restored = makeApp(JSON.parse(sessionStorage.getItem('retry-draft-test')));
    document.body.innerHTML = reviewPage(restored.draft);
    bindReview(restored);
    document.querySelector('[name="classification_reviewed"]').checked = true;
    submit(document.querySelector('#review-form'));
    await vi.waitFor(() => expect(location.hash).toBe('#/details/saved-once'));
    expect(repo.create).toHaveBeenCalledTimes(2);
    expect(repo.create.mock.calls[1][1].requestId).toBe(firstRequestId);
    expect(repo.create.mock.calls[1][0]).not.toHaveProperty('submission_request_id');
  });

  it('corrigir a categoria encerra a tentativa anterior antes de outro envio', () => {
    const app = {
      draft: validInput({ submission_request_id: crypto.randomUUID() }),
      saveDraft(draft) {
        this.draft = draft;
      },
    };
    document.body.innerHTML = reviewPage(app.draft);
    bindReview(app);
    const classification = document.querySelector('[name="classification"]');
    classification.value = 'Outro';
    classification.dispatchEvent(new Event('change', { bubbles: true }));
    expect(app.draft.classification).toBe('Outro');
    expect(app.draft).not.toHaveProperty('submission_request_id');
    expect(app.draft.classification_reviewed).toBe(false);
  });

  it('erro de status após desmontagem notifica sem acessar o formulário removido', async () => {
    const { request, app } = await pendingStatusPage();
    request.reject(new Error('Conexão interrompida'));

    await vi.waitFor(() =>
      expect(app.notify).toHaveBeenCalledWith(
        'Não foi possível atualizar o status: Conexão interrompida',
      ),
    );
    expect(document.querySelector('#status-feedback')).toBeNull();
    expect(document.body.textContent).toBe('Outra página');
    expect(app.render).not.toHaveBeenCalled();
  });

  it('sucesso de status após desmontagem não renderiza novamente a página atual', async () => {
    const { request, app } = await pendingStatusPage();
    request.resolve({ status: 'Em análise' });

    await vi.waitFor(() => expect(app.notify).toHaveBeenCalledWith('Status atualizado.'));
    expect(app.render).not.toHaveBeenCalled();
    expect(document.body.textContent).toBe('Outra página');
  });
});
