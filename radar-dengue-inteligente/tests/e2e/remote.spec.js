import { createServer } from 'vite';
import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { config } from '../../src/config.js';

let server;
const port = config.kind === 'waste' ? 4174 : 4274;

test.beforeAll(async () => {
  // Um segundo Vite local exercita o ramo remoto sem conta ou banco real.
  server = await createServer({
    root: fileURLToPath(new URL('../..', import.meta.url)),
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
        'https://unavailable.example.supabase.co',
      ),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(
        'sb_publishable_browser_test_only',
      ),
    },
    server: { host: '127.0.0.1', port, strictPort: true },
  });
  await server.listen();
});

test.afterAll(async () => {
  await server?.close();
});

test('indisponibilidade do Supabase apresenta erro sem fingir sincronização', async ({ page }) => {
  let remoteAttempts = 0;
  await page.route('https://unavailable.example.supabase.co/**', (route) => {
    remoteAttempts += 1;
    return route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'supabase.auth: Anonymous sign-ins are disabled (42501)' }),
    });
  });
  await page.goto(`http://127.0.0.1:${port}/`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Não foi possível abrir o aplicativo',
  );
  await expect(page.getByRole('alert')).toContainText(
    /não foi possível|indisponível|conexão|conectar|erro/i,
  );
  expect(remoteAttempts).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/supabase|anonymous|42501|Demonstração/i);
  await expect(page.locator('body')).not.toContainText('salvo com sucesso');
});
