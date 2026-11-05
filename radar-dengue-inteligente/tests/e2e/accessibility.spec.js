import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import { openRoute, openReview, saveOccurrence, preparePage } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await preparePage(page);
});

for (const screen of ['início', 'formulário', 'resultado', 'mapa', 'detalhes']) {
  test(`acessibilidade Axe: ${screen}`, async ({ page }) => {
    if (screen === 'resultado') await openReview(page);
    else if (screen === 'detalhes') await saveOccurrence(page);
    else await openRoute(page, { início: '/', formulário: '/new', mapa: '/map' }[screen]);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
    if (screen === 'mapa') {
      // O Axe pode omitir os clusters do Leaflet; a contagem também precisa ser legível.
      const contrastRatios = await page.locator('.marker-cluster > div').evaluateAll((clusters) => {
        const parse = (color) => {
          const values = color.match(/[\d.]+/g).map(Number);
          return [...values.slice(0, 3), values[3] ?? 1];
        };
        const mix = (foreground, background) =>
          foreground
            .slice(0, 3)
            .map(
              (channel, index) => channel * foreground[3] + background[index] * (1 - foreground[3]),
            );
        const luminance = (color) =>
          color
            .map((channel) => channel / 255)
            .map((channel) =>
              channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
            )
            .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
        return clusters.map((cluster) => {
          const ancestors = [];
          for (let node = cluster; node; node = node.parentElement) ancestors.unshift(node);
          const background = ancestors.reduce(
            (color, node) => mix(parse(getComputedStyle(node).backgroundColor), color),
            [255, 255, 255],
          );
          const text = mix(parse(getComputedStyle(cluster).color), background);
          const levels = [luminance(background), luminance(text)].sort((a, b) => a - b);
          return (levels[1] + 0.05) / (levels[0] + 0.05);
        });
      });
      expect(contrastRatios.length).toBeGreaterThan(0);
      for (const ratio of contrastRatios) expect(ratio).toBeGreaterThanOrEqual(4.5);
      for (const control of await page.locator('.leaflet-control-zoom a').all()) {
        const bounds = await control.boundingBox();
        expect(bounds.width).toBeGreaterThanOrEqual(44);
        expect(bounds.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
}
