// @ts-check
// A versão do código (package.json) aparece discretamente nas boas-vindas, no PIN e em Ajustes → Sobre.
const { test, expect } = require('@playwright/test');
const { WORDS, preparar, aba, telaDoPin } = require('./helpers');
const { version } = require('../../package.json');

const APPS = [
  { arquivo: 'carteira-systekna.html', palavras: WORDS.carteira, ajustes: 'vSet', nome: 'Carteira' },
  { arquivo: 'governanca-systekna.html', palavras: WORDS.emissor, ajustes: 'vGov', nome: 'Governança' },
];

for (const app of APPS) {
  test(`${app.nome}: versão ${version} nas boas-vindas, no PIN e em Sobre`, async ({ page }) => {
    await page.goto(app.arquivo);
    await expect(page.locator('#sWelcome .ver')).toHaveText(`Versão ${version}`);
    // O rodapé de inicialização some quando a primeira tela abre.
    await expect(page.locator('.ver.boot')).toBeHidden();

    await preparar(page, app.arquivo, app.palavras);
    await aba(page, app.ajustes);
    await expect(page.locator('#csVer')).toHaveText(`${app.nome} · versão ${version}`);

    await page.click('#lockBtn');
    await telaDoPin(page, 'Digite seu PIN');
    await expect(page.locator('#sPin .ver')).toHaveText(`Versão ${version}`);
  });
}

test('nenhum marcador de versão sobra sem trocar nos HTML gerados', async ({ request }) => {
  for (const app of APPS) {
    const html = await (await request.get(app.arquivo)).text();
    expect(html).not.toContain('{{versao}}');
    expect(html).toContain(`const APP_VERSION='${version}'`);
  }
});
