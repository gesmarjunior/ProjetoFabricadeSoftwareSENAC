import { test, expect } from '@playwright/test';
import { openRoute, openReview, saveOccurrence, preparePage } from '../e2e/helpers.js';

const screens = {
  inicio: '/',
  formulario: '/new',
  resultado: 'review',
  mapa: '/map',
  detalhes: 'details',
  indicadores: '/dashboard',
  orientacoes: '/guidance',
  acompanhamento: '/tracking',
  sobre: '/about',
};
const sizes = [
  { name: 'celular', width: 390, height: 844, screens: Object.keys(screens) },
  {
    name: 'desktop',
    width: 1440,
    height: 900,
    screens: ['inicio', 'formulario', 'resultado', 'mapa', 'indicadores'],
  },
  { name: 'tablet', width: 768, height: 1024, screens: ['inicio', 'formulario'] },
];

test.beforeEach(async ({ page }) => {
  await preparePage(page);
});

for (const size of sizes) {
  for (const screen of size.screens) {
    test(`${size.name}: ${screen}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      if (screens[screen] === 'review') await openReview(page, { examplePhoto: true });
      else if (screens[screen] === 'details') await saveOccurrence(page, { examplePhoto: true });
      else await openRoute(page, screens[screen]);
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await expect(page).toHaveScreenshot(`${size.name}-${screen}.png`, {
        fullPage: true,
        mask: [page.locator('time'), page.locator('[data-testid="occurrence-id"]')],
      });
    });
  }
}
