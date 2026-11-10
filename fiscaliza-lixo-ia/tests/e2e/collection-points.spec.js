import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { preparePage, collectBrowserErrors } from './helpers.js';

test.beforeEach(async ({ page }) => preparePage(page));
async function openPoints(page, path = '/collection-points') {
  await page.goto('/#' + path);
  await expect(page.getByRole('main')).toHaveAttribute('aria-busy', 'false');
}

test('cinco ecopontos de Itumbiara, filtros e marcadores aproximados', async ({ page }) => {
  const errors = collectBrowserErrors(page);
  await openPoints(page);
  await expect(page.locator('[data-point-id]')).toHaveCount(5);
  await expect(page.getByRole('main')).toContainText('bairro ou povoado');
  await page.getByLabel('Material', { exact: true }).selectOption('Pneus');
  await expect(page.locator('[data-point-id]')).toHaveCount(1);
  await expect(page.locator('.map-marker')).toHaveCount(1);
  await expect(page.locator('[data-point-id]')).toContainText(
    'Qualquer material diferente de pneus',
  );
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await page.getByLabel('Nome, endereço ou bairro').fill('santa rosa');
  await expect(page.locator('[data-point-id]')).toHaveCount(1);
  await page.getByLabel('Tipo de local').selectOption('Aterro sanitário');
  await expect(page.getByText('Nenhum local encontrado com estes filtros.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('cadastro persiste como sugestão e não substitui locais publicados', async ({
  page,
  browser,
}) => {
  const errors = collectBrowserErrors(page);
  await openPoints(page, '/collection-points/new');
  await page.getByLabel('Nome do local *', { exact: true }).fill('Coleta seletiva de teste');
  await page.getByLabel('Tipo de local *', { exact: true }).selectOption('Coleta seletiva');
  await page.getByLabel('Endereço *', { exact: true }).fill('Rua de teste, 100 — Itumbiara');
  await page.getByLabel('Bairro ou povoado *', { exact: true }).fill('Centro');
  await page
    .getByLabel('Descrição *', { exact: true })
    .fill('Local fictício usado somente nos testes de demonstração.');
  await page.getByLabel('Metal', { exact: true }).check();
  await page.getByLabel('Latitude', { exact: true }).fill('-18.42');
  await page.getByLabel('Longitude', { exact: true }).fill('-49.21');
  await page.getByLabel('Conferi as informações', { exact: false }).check();
  await page.getByRole('button', { name: 'Enviar para validação' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pontos de coleta');
  await expect(page.locator('[data-point-id]')).toHaveCount(6);
  await expect(
    page.getByText('Minha sugestão · aguardando validação', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-point-id]')).toHaveCount(6);
  const context = await browser.newContext();
  const other = await context.newPage();
  await preparePage(other);
  await openPoints(other);
  await expect(other.locator('[data-point-id]')).toHaveCount(5);
  await context.close();
  expect(errors).toEqual([]);
});

test('correção é enviada para validação sem alterar o cadastro original', async ({ page }) => {
  await openPoints(page);
  await page.getByRole('link', { name: 'Sugerir correção' }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Corrigir informações de um local',
  );
  const name = await page.getByLabel('Nome do local *', { exact: true }).inputValue();
  await page.getByLabel('Endereço *', { exact: true }).fill('Endereço atualizado de teste, 200');
  await page.getByLabel('Conferi as informações', { exact: false }).check();
  await page.getByRole('button', { name: 'Enviar para validação' }).click();
  await expect(page.locator('[data-point-id]')).toHaveCount(6);
  const rows = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('waste-collection-points-v1')),
  );
  expect(rows[0].replaces_id).toBeTruthy();
  expect(rows[0].name).toBe(name);
});

for (const path of ['/collection-points', '/collection-points/new']) {
  test('acessibilidade e responsividade: ' + path, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openPoints(page, path);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}

test('no celular o mapa aparece antes de expandir os filtros', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPoints(page);
  const box = await page.locator('#collection-map').boundingBox();
  expect(box.y).toBeLessThan(650);
  await page.getByText('Filtrar locais por bairro, tipo ou material', { exact: true }).click();
  await page.getByLabel('Material', { exact: true }).selectOption('Pneus');
  await expect(page.locator('[data-point-id]')).toHaveCount(1);
});
