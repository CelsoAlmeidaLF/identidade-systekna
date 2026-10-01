// @ts-check
// App instalável (PWA): manifesto, ícones, service worker, funcionamento sem internet e botão de instalar.
const { test, expect } = require('@playwright/test');

const APPS = [
  { arquivo: 'carteira-systekna.html', manifesto: 'carteira.webmanifest', nome: 'Carteira' },
  { arquivo: 'emissor-systekna.html', manifesto: 'emissor.webmanifest', nome: 'Emissor' },
];

/** Espera o service worker assumir a página (o primeiro carregamento só o instala). */
async function comServiceWorker(page, arquivo) {
  await page.goto(arquivo);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
}

for (const app of APPS) {
  test.describe(app.nome, () => {
    test('manifesto válido para instalação, com ícones que carregam', async ({ page, request }) => {
      await page.goto(app.arquivo);
      const href = await page.locator('link[rel="manifest"]').getAttribute('href');
      expect(href).toBe(app.manifesto);

      const res = await request.get(app.manifesto);
      expect(res.ok()).toBe(true);
      const m = await res.json();
      expect(m).toMatchObject({ short_name: app.nome, display: 'standalone', start_url: `./${app.arquivo}`, scope: `./${app.arquivo}`, id: `./${app.arquivo}` });
      expect(m.name).toBeTruthy();

      // O Chrome exige ícones de 192 e 512 px para oferecer a instalação.
      const tamanhos = m.icons.map(i => i.sizes);
      expect(tamanhos).toEqual(expect.arrayContaining(['192x192', '512x512']));
      expect(m.icons.some(i => i.purpose === 'maskable')).toBe(true);
      for (const icone of m.icons) {
        const r = await request.get(icone.src);
        expect(r.ok(), icone.src).toBe(true);
        expect(r.headers()['content-type']).toContain('image/png');
      }
      const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
      expect((await request.get(/** @type {string} */ (apple))).ok()).toBe(true);
    });

    test('o próprio Chrome considera o app instalável', async ({ page, context }) => {
      await comServiceWorker(page, app.arquivo);
      const cdp = await context.newCDPSession(page);
      const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
      // Os contextos do Playwright são anônimos, e o Chrome nunca instala em janela anônima.
      // Qualquer outro motivo (manifesto, ícone, service worker) reprova o teste.
      expect(installabilityErrors.map(e => e.errorId).filter(id => id !== 'in-incognito')).toEqual([]);
      const { errors } = await cdp.send('Page.getAppManifest');
      expect(errors).toEqual([]);
    });

    test('abre sem internet depois da primeira visita', async ({ page, context }) => {
      await comServiceWorker(page, app.arquivo);
      await context.setOffline(true);
      try {
        await page.reload();
        await expect(page.locator('#sWelcome')).toBeVisible();
        await expect(page.locator('#goCreate')).toBeEnabled();
      } finally {
        await context.setOffline(false);
      }
    });

    test('botão "Instalar no celular" aparece quando o navegador oferece a instalação', async ({ page }) => {
      await page.goto(app.arquivo);
      await expect(page.locator('#goInstall')).toBeHidden();

      // Simula o evento que o Chrome dispara quando o app pode ser instalado.
      await page.evaluate(() => {
        const e = new Event('beforeinstallprompt', { cancelable: true });
        Object.assign(e, {
          prompt: () => { window.__instalacaoPedida = true; return Promise.resolve(); },
          userChoice: Promise.resolve({ outcome: 'accepted' }),
        });
        dispatchEvent(e);
      });
      await expect(page.locator('#goInstall')).toBeVisible();
      await page.click('#goInstall');
      await expect.poll(() => page.evaluate(() => window.__instalacaoPedida)).toBe(true);
    });
  });
}
