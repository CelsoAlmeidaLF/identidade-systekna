// @ts-check
// O serviço se chamava "Cartório Digital" e passou a ser "Emissor de Credenciais", para não sugerir
// fé pública. O endereço antigo redireciona e os dados de quem já usava continuam no mesmo banco.
const { test, expect } = require('@playwright/test');
const { WORDS, preparar, aba } = require('./helpers');

const textoVisivel = page => page.evaluate(() => document.body.innerText);

test('o endereço antigo leva ao Emissor de Credenciais', async ({ page }) => {
  await page.goto('cartorio-systekna.html');
  await expect(page).toHaveURL(/emissor-systekna\.html$/);
  await expect(page.locator('#sWelcome h1')).toHaveText('Emissor de Credenciais');
});

test('nenhuma tela mostra "cartório" e os dados ficam no banco de antes', async ({ page }) => {
  await page.goto('emissor-systekna.html');
  expect(await textoVisivel(page)).not.toMatch(/cart[óo]rio/i);
  await preparar(page, 'emissor-systekna.html', WORDS.emissor);
  for (const v of await page.locator('.dock [data-v]').evaluateAll(bs => bs.map(b => b.getAttribute('data-v')))) {
    await aba(page, /** @type {string} */ (v));
    expect(await textoVisivel(page), v).not.toMatch(/cart[óo]rio/i);
  }
  // Quem instituiu o serviço com o nome antigo continua abrindo o mesmo livro.
  const bancos = await page.evaluate(async () => (await indexedDB.databases()).map(d => d.name));
  expect(bancos).toContain('systekna-cartorio');
});
