import { expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { config } from '../../src/config.js';

const tinyPng =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jucsAAAAASUVORK5CYII=';

const routeHeadings = {
  '/': config.homeTitle,
  '/new': config.kind === 'waste' ? 'Registrar uma ocorrência' : 'Registrar possível criadouro',
  '/review': 'Confira seu registro',
  '/map': config.kind === 'waste' ? 'Mapa de ocorrências' : 'Mapa de risco ambiental',
  '/details': 'Detalhes do registro',
  '/dashboard':
    config.kind === 'waste' ? 'Indicadores da comunidade' : 'Indicadores de prevenção ambiental',
  '/guidance': config.kind === 'waste' ? 'Descarte correto' : 'Orientação e encaminhamento',
  '/tracking': 'Acompanhamento dos registros',
  '/about': 'Sobre o aplicativo',
};

/** Instale antes de navegar para acompanhar erros durante todo o fluxo. */
export function collectBrowserErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

/** Uma página de erro também tem h1; confirme identidade, tela e término dos binds. */
export async function expectRouteReady(page, route) {
  const key = route.startsWith('/details/') ? '/details' : route;
  const expectedHeading = routeHeadings[key];
  if (!expectedHeading) throw new Error(`Rota sem contrato de teste: ${route}`);
  const main = page.getByRole('main');
  await expect(main).toBeVisible();
  await expect(main).toHaveAttribute('aria-busy', 'false');
  await expect(main.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(main.getByRole('heading', { level: 1 })).toHaveText(expectedHeading, {
    useInnerText: true,
  });
  const escapedName = config.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await expect(page).toHaveTitle(new RegExp(`${escapedName}$`));
  const alerts = await main.getByRole('alert').allTextContents();
  expect(
    alerts.map((message) => message.trim()).filter(Boolean),
    'A tela inicial não deve exibir erros.',
  ).toEqual([]);
}

export async function preparePage(page) {
  await page.addInitScript(() => {
    const NativeDate = Date;
    const frozen = new NativeDate('2026-11-03T15:00:00.000Z').getTime();
    window.Date = class extends NativeDate {
      constructor(...args) {
        super(...(args.length ? args : [frozen]));
      }

      static now() {
        return frozen;
      }
    };
  });
  // Mapas continuam com marcadores/atribuição, sem depender de rede externa no CI.
  await page.route(/^https:\/\/(?:[abc]\.)?tile\.openstreetmap\.org\//, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(tinyPng, 'base64'),
    }),
  );
}

export async function openRoute(page, route = '/') {
  await page.goto(`/#${route}`);
  await expectRouteReady(page, route);
}

export async function fillValidForm(
  page,
  { description, district, navigate = true, examplePhoto = false } = {},
) {
  if (navigate) await openRoute(page, '/new');
  await page
    .locator('textarea[name="description"]')
    .fill(description || 'Registro fictício para verificar o fluxo completo.');
  await page.locator('[name="district"]').fill(district || 'Bairro de Teste');
  await page.locator('[name="latitude"]').fill('-16.680');
  await page.locator('[name="longitude"]').fill('-49.250');
  await page.locator('[name="image"]').setInputFiles({
    name: 'local-ficticio.png',
    mimeType: 'image/png',
    buffer: examplePhoto
      ? readFileSync(new URL('../../public/example-occurrence.png', import.meta.url))
      : Buffer.from(tinyPng, 'base64'),
  });
  await page.locator('[name="privacy_confirmed"]').check();
  if (await page.locator('[name="volume"]').count()) {
    await page.locator('[name="category"]').selectOption({ label: 'Pneu' });
    await page.locator('[name="volume"]').selectOption({ label: 'Grande' });
    await page.locator('[name="sensitive_area"]').check();
  } else {
    await page.locator('[name="container_type"]').selectOption({ label: 'Pneu' });
    await page.locator('[name="standing_water"]').check();
    await page.locator('[name="outdoor_area"]').check();
  }
  await page.locator('[name="recurrent"]').check();
}

export async function openReview(page, options = {}) {
  await fillValidForm(page, options);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page).toHaveURL(/#\/review$/);
  await expectRouteReady(page, '/review');
  await expect(page.locator('[name="classification"]')).toBeVisible();
}

export async function saveOccurrence(page, { correct = false, examplePhoto = false } = {}) {
  await openReview(page, { examplePhoto });
  if (correct) {
    await page.locator('[name="classification"]').selectOption({ label: 'Outro' });
  }
  await page.locator('[name="classification_reviewed"]').check();
  await page.getByRole('button', { name: 'Confirmar e salvar', exact: true }).click();
  await expect(page).toHaveURL(/#\/details\/[^/]+$/);
  await expectRouteReady(page, new URL(page.url()).hash.slice(1));
  await expect(page.locator('main')).toContainText('Recebido');
  return page.url();
}

export async function expectNoHorizontalOverflow(page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
}
