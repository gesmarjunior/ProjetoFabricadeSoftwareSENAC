import { afterEach, describe, expect, it, vi } from 'vitest';
import { detailsPage } from '../../src/pages/details.js';
import { createDemoData } from '../../src/repositories/demoData.js';

afterEach(() => document.body.replaceChildren());

describe('conteúdo dos detalhes do registro', () => {
  it.each([
    {
      is_demo: true,
    },
    {
      is_demo: false,
    },
  ])('distingue exemplos e registros reais (is_demo=$is_demo)', async ({ is_demo }) => {
    const row = { ...createDemoData()[0], is_demo, is_owner: false, image_path: null };
    const repo = { getImageUrl: vi.fn() };
    document.body.innerHTML = await detailsPage(row, repo);

    expect(Boolean(document.querySelector('.timeline'))).toBe(is_demo);
    expect(document.body.textContent).not.toMatch(
      /somente o autor|disponíveis apenas|privados e ficam/i,
    );
    if (!is_demo) expect(document.body.textContent).not.toContain(row.description);
    expect(document.querySelector('#status-form')).toBeNull();
    expect(repo.getImageUrl).not.toHaveBeenCalled();
  });

  it('exibe bairro e relato hostis como texto, sem injetar elementos ou eventos', async () => {
    const district = '<svg onload="alert(1)">Bairro</svg>';
    const description = '<img src=x onerror="alert(1)"><script>alert(1)</script>';
    const row = {
      ...createDemoData()[0],
      district,
      description,
      is_demo: false,
      is_owner: true,
      image_path: null,
    };
    document.body.innerHTML = await detailsPage(row, { getImageUrl: vi.fn() });

    expect(document.body.textContent).toContain(district);
    expect(document.body.textContent).toContain(description);
    expect(document.querySelector('script, img, [onload], [onerror]')).toBeNull();
    expect(document.querySelector('#status-form')).not.toBeNull();
  });
});
