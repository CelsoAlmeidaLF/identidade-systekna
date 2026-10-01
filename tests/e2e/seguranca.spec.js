// @ts-check
// CSP e fonte local: só o script da própria página roda, e nada é buscado fora do site.
const { test, expect } = require('@playwright/test');
const { vigiarCsp } = require('./helpers');

for (const arquivo of ['carteira-systekna.html', 'emissor-systekna.html']) {
  test.describe(arquivo, () => {
    test('nenhuma requisição sai do site e a fonte vem de fonts/', async ({ page, baseURL }) => {
      const origem = new URL(/** @type {string} */ (baseURL)).origin;
      const externas = [];
      const fontes = [];
      page.on('request', r => {
        const u = new URL(r.url());
        if (!['data:', 'blob:'].includes(u.protocol) && u.origin !== origem) externas.push(r.url());
        if (r.resourceType() === 'font') fontes.push(u.pathname);
      });
      await page.goto(arquivo);
      await expect(page.locator('#sWelcome')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.fonts.check('600 16px "Open Sans"'))).toBe(true);
      expect(externas).toEqual([]);
      expect(fontes.some(p => p.endsWith('/fonts/open-sans-latin.woff2'))).toBe(true);
    });

    test('script injetado na página não roda (CSP)', async ({ page }) => {
      const violacoes = vigiarCsp(page);
      await page.goto(arquivo);
      await expect(page.locator('#sWelcome')).toBeVisible();
      // Simula um XSS: um <script> inline e um atributo onerror inseridos no DOM.
      await page.evaluate(() => {
        const s = document.createElement('script');
        s.textContent = 'window.__invadido = true';
        document.body.appendChild(s);
        document.body.insertAdjacentHTML('beforeend', '<img src="x" onerror="window.__invadido2 = true">');
      });
      await expect.poll(() => violacoes.length).toBeGreaterThanOrEqual(2);
      expect(await page.evaluate(() => [window.__invadido, window.__invadido2])).toEqual([undefined, undefined]);
    });

    test('CSP traz o hash exato do script da página', async ({ page }) => {
      await page.goto(arquivo);
      const { csp, hash } = await page.evaluate(async () => {
        const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') || '';
        const code = document.querySelector('script')?.textContent || '';
        const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
        return { csp, hash: 'sha256-' + btoa(String.fromCharCode(...new Uint8Array(d))) };
      });
      expect(csp).toContain(`script-src '${hash}'`);
      expect(csp).toContain("default-src 'none'");
      expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    });
  });
}
