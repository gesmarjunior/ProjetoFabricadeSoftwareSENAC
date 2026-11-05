import { test, expect } from '@playwright/test';
import { config } from '../../src/config.js';
import {
  preparePage,
  collectBrowserErrors,
  openRoute,
  fillValidForm,
  openReview,
  saveOccurrence,
  expectNoHorizontalOverflow,
} from './helpers.js';

test.beforeEach(async ({ page }) => {
  await preparePage(page);
});

test('início identifica demonstração, dados fictícios e carrega sem erros', async ({ page }) => {
  const errors = collectBrowserErrors(page);
  await openRoute(page);
  await expect(page.locator('body')).toContainText('Demonstração');
  await expect(page.locator('body')).toContainText(/dados de exemplo/i);
  expect(errors).toEqual([]);
});

test('navega pelas nove telas e mantém o título principal', async ({ page }) => {
  const errors = collectBrowserErrors(page);
  for (const route of ['/', '/new', '/map', '/dashboard', '/guidance', '/tracking', '/about']) {
    await openRoute(page, route);
  }
  await saveOccurrence(page);
  expect(errors).toEqual([]);
});

test('descarta os frames pendentes ao sair do mapa', async ({ page }) => {
  const errors = collectBrowserErrors(page);
  await page.addInitScript(() => {
    let nextFrameId = 0;
    const pendingFrames = new Map();
    window.requestAnimationFrame = (callback) => {
      const id = ++nextFrameId;
      pendingFrames.set(id, callback);
      return id;
    };
    window.cancelAnimationFrame = (id) => pendingFrames.delete(id);
    window.flushTestFrames = () => {
      const frames = [...pendingFrames.values()];
      pendingFrames.clear();
      frames.forEach((callback) => callback(performance.now()));
    };
  });
  await openRoute(page, '/map');
  await openRoute(page, '/new');
  await page.evaluate(() => window.flushTestFrames());
  await expect(page.locator('#occurrence-form')).toBeVisible();
  expect(errors).toEqual([]);
});

test('formulário vazio apresenta mensagens e foco acessíveis', async ({ page }) => {
  await openRoute(page, '/new');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page).toHaveURL(/#\/new$/);
  await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
  await expect(page.locator('main')).toContainText(/descrição|obrigatóri|informe/i);
});

test('calcula risco, permite correção humana e exige confirmação', async ({ page }) => {
  await openReview(page);
  await expect(page.locator('#score-result .score-display strong')).toContainText('100');
  await expect(page.locator('main')).toContainText('Crítico');
  await page.locator('[name="classification"]').selectOption({ label: 'Outro' });
  await expect(page.locator('[name="classification"]')).toHaveValue('Outro');
  await expect(page.locator('#score-result .score-display strong')).toContainText(
    config.kind === 'waste' ? '80' : '85',
  );
  await expect(page.locator('main')).toContainText(/regra|pontuaç|pontos/i);
  await page.getByRole('button', { name: 'Confirmar e salvar', exact: true }).click();
  await expect(page).toHaveURL(/#\/review$/);
  await page.locator('[name="classification_reviewed"]').check();
  await page.getByRole('button', { name: 'Confirmar e salvar', exact: true }).click();
  await expect(page).toHaveURL(/#\/details\//);
  await expect(page.locator('main')).toContainText('Outro');
});

test('salva, recarrega e encontra o registro no acompanhamento e mapa', async ({ page }) => {
  const detailsUrl = await saveOccurrence(page);
  await page.reload();
  await expect(page).toHaveURL(detailsUrl);
  await expect(page.locator('main')).toContainText('Bairro de Teste');
  await openRoute(page, '/tracking');
  await expect(page.locator('main')).toContainText('Bairro de Teste');
  await openRoute(page, '/map');
  await page.locator('[name="district"]').selectOption({ label: 'Bairro de Teste' });
  await expect(page.locator('main')).toContainText('Bairro de Teste');
});

test('altera status do próprio registro e conserva histórico após atualizar', async ({ page }) => {
  await saveOccurrence(page);
  await page.getByLabel('Novo status', { exact: true }).selectOption({ label: 'Em análise' });
  await page.getByRole('button', { name: 'Atualizar status', exact: true }).click();
  await expect(page.locator('main')).toContainText('Em análise');
  await page.reload();
  await expect(page.locator('main')).toContainText('Em análise');
  await expect(page.locator('main')).toContainText('Recebido');
});

test('indicadores calculados aumentam após salvar um registro', async ({ page }) => {
  await openRoute(page, '/dashboard');
  const before = Number(await page.getByTestId('total-occurrences').textContent());
  await saveOccurrence(page);
  await openRoute(page, '/dashboard');
  await expect(page.getByTestId('total-occurrences')).toHaveText(String(before + 1));
});

test('filtros de lista e mapa mostram estado vazio e podem ser limpos', async ({ page }) => {
  await saveOccurrence(page);
  for (const route of ['/tracking', '/map']) {
    await openRoute(page, route);
    await page.locator('[name="district"]').selectOption({ label: 'Bairro de Teste' });
    await page.locator('[name="category"]').selectOption({ label: 'Pneu' });
    await page.locator('[name="priority"]').selectOption({ label: 'Crítico' });
    await page.locator('[name="period"]').selectOption('7');
    await expect(page.locator('#filter-count')).toHaveText(/^1 registro/);
    await page.locator('[name="status"]').selectOption({ label: 'Resolvido' });
    await expect(page.locator('main')).toContainText(/nenhum|nenhuma|0 registro/i);
    await page.locator('[name="status"]').selectOption('');
    await expect(page.locator('main')).toContainText('Bairro de Teste');
    await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
    await expect(page.locator('#filter-count')).toHaveText(/^7 registros/);
  }
});

test('falha de localização é clara e permite informar coordenadas', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(_success, failure) {
          failure({ code: 1, message: 'Permissão negada no teste.' });
        },
      },
    });
  });
  await openRoute(page, '/new');
  await page.getByRole('button', { name: 'Usar minha localização', exact: true }).click();
  await expect(page.locator('#location-message')).toContainText(
    /não foi possível|permissão|manualmente/i,
  );
  await page.locator('[name="latitude"]').fill('-16.680');
  await page.locator('[name="longitude"]').fill('-49.250');
  await expect(page.locator('[name="latitude"]')).toHaveValue('-16.680');
});

test('rejeita arquivo inadequado e preserva a descrição', async ({ page }) => {
  await openRoute(page, '/new');
  await page
    .locator('textarea[name="description"]')
    .fill('Uma descrição importante que deve permanecer.');
  await page.locator('[name="image"]').setInputFiles({
    name: 'arquivo.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('arquivo inválido'),
  });
  await expect(page.locator('#error-image')).toContainText(/JPEG|PNG|WebP|imagem/i);
  await expect(page.locator('textarea[name="description"]')).toHaveValue(
    'Uma descrição importante que deve permanecer.',
  );
});

test('erro recuperável ao salvar preserva a revisão e permite tentar novamente', async ({
  page,
}) => {
  await openReview(page);
  await page.locator('[name="classification_reviewed"]').check();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.restoreTestStorage = () => {
      Storage.prototype.setItem = original;
    };
    Storage.prototype.setItem = function (key, value) {
      if (key.endsWith('-occurrences-v1'))
        throw new DOMException('Limite de teste.', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Confirmar e salvar', exact: true }).click();
  await expect(page).toHaveURL(/#\/review$/);
  await expect(page.locator('[role="alert"]')).toContainText(/armazenamento|salvar|preservad/i);
  await expect(page.locator('[name="classification_reviewed"]')).toBeChecked();
  await page.evaluate(() => window.restoreTestStorage());
  await page.getByRole('button', { name: 'Confirmar e salvar', exact: true }).click();
  await expect(page).toHaveURL(/#\/details\//);
});

test('registros comunitários fictícios não oferecem alteração de status', async ({ page }) => {
  await openRoute(page, '/details/00000000-0000-4000-8000-000000000001');
  await expect(page.locator('main')).toContainText('Exemplo fictício');
  await expect(page.getByRole('button', { name: 'Atualizar status', exact: true })).toHaveCount(0);
});

test('impede envio duplicado e mantém um único novo registro', async ({ page }) => {
  await openReview(page);
  await page.locator('[name="classification_reviewed"]').check();
  await page.getByRole('button', { name: 'Confirmar e salvar', exact: true }).dblclick();
  await expect(page).toHaveURL(/#\/details\//);
  await openRoute(page, '/dashboard');
  await expect(page.getByTestId('total-occurrences')).toHaveText('7');
});

test('atalho de teclado preserva o formulário e mantém o foco visível', async ({ page }) => {
  await openRoute(page, '/new');
  await page.getByRole('link', { name: 'Pular para o conteúdo', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.locator('textarea[name="description"]').focus();
  await expect(page.locator('textarea[name="description"]')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('[name="category"], [name="container_type"]').first()).toBeFocused();
  await fillValidForm(page, { navigate: false });
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page).toHaveURL(/#\/review$/);
});

for (const viewport of [
  { width: 320, height: 720 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  test(`não apresenta overflow nas telas em ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    for (const route of ['/', '/new', '/map', '/dashboard', '/guidance', '/tracking', '/about']) {
      await openRoute(page, route);
      await expectNoHorizontalOverflow(page);
    }
    await openReview(page);
    await expectNoHorizontalOverflow(page);
    await page.locator('[name="classification_reviewed"]').check();
    await page.getByRole('button', { name: 'Confirmar e salvar', exact: true }).click();
    await expect(page).toHaveURL(/#\/details\//);
    await expectNoHorizontalOverflow(page);
  });
}
