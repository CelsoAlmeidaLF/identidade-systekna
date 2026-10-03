// @ts-check
// O serviço se chamava "Cartório Digital", depois "Emissor de Credenciais", e hoje é a "Governança Systekna".
// Os endereços antigos redirecionam e os dados de quem já usava continuam no mesmo banco.
const { test, expect } = require('@playwright/test');
const { WORDS, preparar, aba } = require('./helpers');

const textoVisivel = page => page.evaluate(() => document.body.innerText);

for (const antigo of ['cartorio-systekna.html', 'emissor-systekna.html']) {
  test(`o endereço antigo ${antigo} leva à Governança Systekna`, async ({ page }) => {
    await page.goto(antigo);
    await expect(page).toHaveURL(/governanca-systekna\.html$/);
    await expect(page.locator('#sWelcome h1')).toHaveText('Governança Systekna');
  });
}

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
