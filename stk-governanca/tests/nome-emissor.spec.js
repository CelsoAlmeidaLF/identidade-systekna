// @ts-check
// O serviço se chamava "Cartório Digital", depois "Emissor de Credenciais", e hoje é a "Governança Systekna".
// Os redirecionamentos dos endereços antigos foram retirados (03/10/2026); os dados de quem já usava continuam no mesmo banco.
const { test, expect } = require('@playwright/test');
const { WORDS, preparar, aba } = require('../../compartilhado/tests/helpers');

const textoVisivel = page => page.evaluate(() => document.body.innerText);

test('nenhuma tela mostra "cartório" e os dados ficam no banco de antes', async ({ page }) => {
  await page.goto('governanca-systekna.html');
  expect(await textoVisivel(page)).not.toMatch(/cart[óo]rio/i);
  await preparar(page, 'governanca-systekna.html', WORDS.emissor);
  for (const v of await page.locator('.dock [data-v]').evaluateAll(bs => bs.map(b => b.getAttribute('data-v')))) {
    await aba(page, /** @type {string} */ (v));
    expect(await textoVisivel(page), v).not.toMatch(/cart[óo]rio/i);
  }
  // Quem começou com o nome antigo continua abrindo o mesmo livro.
  const bancos = await page.evaluate(async () => (await indexedDB.databases()).map(d => d.name));
  expect(bancos).toContain('systekna-cartorio');
});
