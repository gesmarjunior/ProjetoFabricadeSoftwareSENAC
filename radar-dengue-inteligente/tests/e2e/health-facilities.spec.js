import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { preparePage, collectBrowserErrors } from './helpers.js';
test.beforeEach(async ({ page }) => preparePage(page));
async function openHealth(page, path = '/health-services') {
  await page.goto('/#' + path);
  await expect(page.getByRole('main')).toHaveAttribute('aria-busy', 'false');
}

test('catálogo institucional, endereço atualizado de endemias e filtros de serviços', async ({
  page,
}) => {
  const errors = collectBrowserErrors(page);
  await openHealth(page);
  await expect(page.locator('.mode-banner')).toContainText('Catálogo de referência');
  await expect(page.locator('[data-facility-id]')).toHaveCount(12);
  await page.getByLabel('Tipo de unidade', { exact: true }).selectOption('Centro de endemias');
  await expect(page.locator('[data-facility-id]')).toHaveCount(1);
  await expect(page.locator('[data-facility-id]')).toContainText('Rua Wilson Barbosa, 325');
  await expect(page.locator('.map-marker')).toHaveCount(1);
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await page.getByLabel('Serviço', { exact: true }).selectOption('possible_vaccination');
  await expect(page.locator('[data-facility-id]')).toHaveCount(8);
  await page.getByLabel('Serviço', { exact: true }).selectOption('vaccination');
  await expect(page.getByText('Nenhuma unidade encontrada com estes filtros.')).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await page.getByLabel('Nome, endereço, bairro ou CNES').fill('3033589');
  await expect(page.locator('[data-facility-id]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('cadastro aguarda validação e só aparece para o próprio navegador', async ({
  page,
  browser,
}) => {
  const errors = collectBrowserErrors(page);
  await openHealth(page, '/health-services/new');
  await page.getByLabel('Nome da unidade *', { exact: true }).fill('Unidade de teste local');
  await page.getByLabel('Tipo de unidade *', { exact: true }).selectOption('Ponto de vacinação');
  await page.getByLabel('Endereço *', { exact: true }).fill('Rua pública de teste, 100');
  await page.getByLabel('Bairro ou região *', { exact: true }).fill('Centro');
  await page
    .getByLabel('Descrição da unidade *', { exact: true })
    .fill('Unidade fictícia usada apenas em testes locais.');
  await page.locator('#health-picker').click({ position: { x: 130, y: 90 } });
  await expect(page.locator('#health-picker .map-marker')).toBeVisible();
  await expect(page.getByLabel('Latitude', { exact: true })).not.toHaveValue('');
  await page.getByLabel('Conferi os dados institucionais', { exact: false }).check();
  await page.getByRole('button', { name: 'Enviar para validação' }).click();
  await expect(page.locator('[data-facility-id]')).toHaveCount(13);
  await expect(
    page.getByText('Minha sugestão · aguardando validação', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-facility-id]')).toHaveCount(13);
  const context = await browser.newContext(),
    other = await context.newPage();
  await preparePage(other);
  await openHealth(other);
  await expect(other.locator('[data-facility-id]')).toHaveCount(12);
  await context.close();
  expect(errors).toEqual([]);
});

test('alegação de vacinação exige fonte e correção não altera a unidade original', async ({
  page,
}) => {
  await openHealth(page);
  await page.getByRole('link', { name: 'Sugerir correção' }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Corrigir informações de uma unidade',
  );
  await expect(page.locator('#health-picker .map-marker')).toBeVisible();
  await page.getByLabel('Endereço *', { exact: true }).fill('Endereço de teste corrigido, 200');
  await page.getByLabel('Vacinação *', { exact: true }).selectOption('reported');
  await page.getByLabel('Fonte das informações (link HTTPS)').fill('');
  await page.getByLabel('Conferi os dados institucionais', { exact: false }).check();
  await page.getByRole('button', { name: 'Enviar para validação' }).click();
  await expect(page.getByRole('alert')).toContainText('Informe uma fonte');
  await page
    .getByLabel('Fonte das informações (link HTTPS)')
    .fill('https://example.org/fonte-de-teste');
  await page.getByRole('button', { name: 'Enviar para validação' }).click();
  await expect(page.locator('[data-facility-id]')).toHaveCount(13);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('dengue-health-facilities-v1')),
  );
  expect(saved[0].replaces_id).toBeTruthy();
});

for (const path of ['/health-services', '/health-services/new'])
  test('acessibilidade e celular: ' + path, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openHealth(page, path);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
test('no celular, filtros recolhidos deixam espaço para o mapa', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHealth(page);
  const box = await page.locator('#health-map').boundingBox();
  expect(box.y).toBeLessThan(670);
  await page.getByText('Filtrar por bairro, tipo ou serviço', { exact: true }).click();
  await page.getByLabel('Tipo de unidade', { exact: true }).selectOption('Vigilância sanitária');
  await expect(page.locator('[data-facility-id]')).toHaveCount(1);
});
