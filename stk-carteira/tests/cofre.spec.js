// @ts-check
// Cofre da carteira, na aba Identidade. Desde a 0.28.0 guarda só anotações (título e texto), cifradas no aparelho,
// buscáveis, e de volta pelo backup (copiado ou baixado como arquivo). Itens de outros tipos (0.26 e 0.27) ficam
// guardados, mas não aparecem.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const { WORDS, vigiarCsp, preparar, aba, toast, fecharSheet, telaDoPin, digitarPin } = require('../../compartilhado/tests/helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let page;
/** @type {string[]} */ const csp = [];

async function nova(titulo, texto) {
  await page.click('#cfNovo');
  await page.fill('#cfT', titulo);
  await page.fill('#cfX', texto);
  await page.click('#cfSalvar');
}
const item = titulo => page.locator('#cfL [data-cf]').filter({ hasText: titulo });

test.beforeAll(async ({ browser }) => {
  const ctx = await browser.newContext();
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  page = await ctx.newPage();
  vigiarCsp(page, csp);
  await preparar(page, 'carteira-systekna.html', WORDS.carteira);
  await aba(page, 'vId');
});
test.afterAll(async () => { await page?.context().close(); });

test('o cofre começa vazio e só oferece anotação', async () => {
  await expect(page.locator('#cfL .empty')).toContainText('Cofre vazio');
  await expect(page.locator('#cfNovo')).toHaveText('Nova anotação');
  await page.click('#cfNovo');
  await expect(page.locator('#sheetBody h3')).toHaveText('Nova anotação');
  await expect(page.locator('#cfKind')).toHaveCount(0);
  await page.click('#cfSalvar');
  await expect(page.locator('#cfH')).toHaveText('Dê um título à anotação.');
  await page.fill('#cfT', 'Sem texto');
  await page.click('#cfSalvar');
  await expect(page.locator('#cfH')).toHaveText('Escreva o texto da anotação.');
  await fecharSheet(page);
});

test('guarda anotações cifradas; o texto aparece, é copiado e entra na busca', async () => {
  await nova('Lembretes', 'Renovar o seguro em março\nLevar documentos');
  await expect(toast(page)).toHaveText('Anotação guardada');
  await nova('Ideias', 'Viagem para o litoral');
  await expect(page.locator('#cfN')).toHaveText('2 anotações');
  await expect(item('Lembretes')).toContainText('Renovar o seguro em março');
  expect(await page.evaluate(async () => JSON.stringify(await DB.get('items')))).not.toContain('seguro');

  await item('Lembretes').click();
  await expect(page.locator('#cfTexto')).toHaveText('Renovar o seguro em março\nLevar documentos');
  await page.click('#cfCp');
  await expect(toast(page)).toHaveText('Texto copiado');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Renovar o seguro em março\nLevar documentos');
  await fecharSheet(page);

  await page.fill('#cfBusca', 'litoral');
  await expect(page.locator('#cfL [data-cf]')).toHaveCount(1);
  await expect(item('Ideias')).toBeVisible();
  await page.fill('#cfBusca', 'nada disso');
  await expect(page.locator('#cfL .empty')).toHaveText('Nada encontrado.');
  await page.fill('#cfBusca', '');
  await expect(page.locator('#cfL [data-cf]')).toHaveCount(2);
});

test('editar e apagar (com confirmação)', async () => {
  await item('Ideias').click();
  await page.click('#cfEd');
  await page.fill('#cfT', 'Ideias de viagem');
  await page.click('#cfSalvar');
  await expect(toast(page)).toHaveText('Anotação atualizada');
  await expect(item('Ideias de viagem')).toBeVisible();
  await nova('Rascunho', 'apagar depois');
  await item('Rascunho').click();
  await page.click('#cfDel');
  await page.click('#cfOk');
  await expect(toast(page)).toHaveText('Anotação apagada');
  await expect(page.locator('#cfL [data-cf]')).toHaveCount(2);
});

test('itens de outros tipos (da 0.26 e 0.27) ficam guardados, mas não aparecem', async () => {
  await page.evaluate(async () => {
    const ts = Date.now();
    await saveItem({ type: 'cofre', kind: 'senha', titulo: 'Senha antiga', campos: { senha: 'x' }, created: ts, updated: ts });
    renderCofre();
  });
  await expect(page.locator('#cfL [data-cf]')).toHaveCount(2);
  await expect(page.locator('#cfN')).toHaveText('2 anotações');
  expect(await page.evaluate(() => ses.items.filter(i => i.data.type === 'cofre').length)).toBe(3);
});

test('bloquear esconde o cofre; desbloquear traz de volta', async () => {
  await page.click('#lockBtn');
  await expect(page.locator('#cfL')).toBeEmpty();
  await telaDoPin(page, 'Digite seu PIN');
  await digitarPin(page);
  await expect(page.locator('#sApp')).toBeVisible();
  await aba(page, 'vId');
  await expect(page.locator('#cfL [data-cf]')).toHaveCount(2);
});

test('o cofre volta pelo backup baixado como arquivo, em outro aparelho', async ({ browser }) => {
  await aba(page, 'vSet');
  await page.click('#commonSet [data-cs="export"]');
  await expect(page.locator('#bkT')).toBeVisible(); // pequeno: também dá para copiar
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bkA')]);
  expect(dl.suggestedFilename()).toMatch(/^backup-carteira-\d{4}-\d{2}-\d{2}\.txt$/);
  const caminho = /** @type {string} */ (await dl.path());
  expect(fs.readFileSync(caminho, 'utf8')).toBe(await page.inputValue('#bkT'));
  await fecharSheet(page);

  const outro = await (await browser.newContext()).newPage();
  vigiarCsp(outro, csp);
  await preparar(outro, 'carteira-systekna.html', WORDS.carteira);
  await aba(outro, 'vSet');
  await outro.click('#commonSet [data-cs="import"]');
  await outro.setInputFiles('#riA', caminho);
  await expect(outro.locator('#riH')).toContainText('Arquivo escolhido');
  await outro.click('#riGo');
  await expect(toast(outro)).toHaveText('0 credenciais restauradas e 2 anotações do cofre');
  await aba(outro, 'vId');
  await expect(outro.locator('#cfL [data-cf]')).toHaveCount(2);
  await outro.context().close();
});

test('nenhuma violação de CSP', () => { expect(csp).toEqual([]); });
