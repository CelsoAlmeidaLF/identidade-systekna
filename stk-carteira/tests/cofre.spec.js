// @ts-check
// Cofre da carteira (0.26.0), na aba Identidade: senhas, anotações, cartões (crédito, débito e outros) e contas
// bancárias. Tudo cifrado no aparelho, velado na tela, buscável, e de volta pelo backup cifrado.
// Documentos (0.27.0): datas, anexo (foto ou PDF até 2 MB), aviso de vencimento e backup grande baixado como arquivo.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const { WORDS, vigiarCsp, preparar, aba, toast, fecharSheet, telaDoPin, digitarPin } = require('../../compartilhado/tests/helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let page;
/** @type {string[]} */ const csp = [];

/** Abre Novo item, escolhe o tipo, preenche título e campos e salva. */
async function novo(kind, titulo, campos) {
  await page.click('#cfNovo');
  await page.click(`#cfKind [data-kind="${kind}"]`);
  await page.fill('#cfT', titulo);
  for (const [k, v] of Object.entries(campos)) {
    const el = page.locator(`#cfCampos [data-k="${k}"]`);
    if (await el.evaluate(e => e.tagName) === 'SELECT') await el.selectOption(v); else await el.fill(v);
  }
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

test('o cofre começa vazio, na aba Identidade', async () => {
  await expect(page.locator('#cfL .empty')).toContainText('Cofre vazio');
  await expect(page.locator('.dock [data-v]')).toHaveCount(3); // o rodapé não muda: Credenciais, Identidade e Ajustes, mais o + e Apresentar
});

test('guarda uma senha cifrada: velada na tela, copiada sem aparecer', async () => {
  await novo('senha', 'E-mail pessoal', { site: 'mail.exemplo.com', usuario: 'maria@exemplo.com', senha: 'segredo-123' });
  await expect(toast(page)).toHaveText('Guardado no cofre');
  await expect(item('E-mail pessoal')).toContainText('Senha · maria@exemplo.com');
  // No armazenamento só há texto cifrado.
  expect(await page.evaluate(async () => JSON.stringify(await DB.get('items')))).not.toContain('segredo-123');

  await item('E-mail pessoal').click();
  await expect(page.locator('#cfv-senha')).toHaveText('••••••');
  await page.click('[data-cp="senha"]');
  await expect(toast(page)).toContainText('Senha copiado');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('segredo-123');
  await expect(page.locator('#cfv-senha')).toHaveText('••••••');
  await page.click('[data-ver="senha"]');
  await expect(page.locator('#cfv-senha')).toHaveText('segredo-123');
  await fecharSheet(page);
});

test('cartão de crédito: confere o número e a validade, mostra a bandeira e só o final', async () => {
  await novo('cartao', 'Cartão do banco', { tipo: 'Crédito', nomeCartao: 'MARIA TESTE', numero: '4111 1111 1111 1112', validade: '08/29', cvv: '123' });
  await expect(page.locator('#cfH')).toHaveText('O número do cartão não confere. Confira os dígitos.');
  await page.fill('#cfCampos [data-k="numero"]', '4111 1111 1111 1111');
  await page.fill('#cfCampos [data-k="validade"]', '13/29');
  await page.click('#cfSalvar');
  await expect(page.locator('#cfH')).toHaveText('Validade no formato MM/AA, por exemplo 08/29.');
  await page.fill('#cfCampos [data-k="validade"]', '08/29');
  await page.click('#cfSalvar');
  await expect(item('Cartão do banco')).toContainText('Cartão · Crédito · Visa · •••• 1111');

  await item('Cartão do banco').click();
  await expect(page.locator('#cfv-numero')).toHaveText('•••• 1111');
  await expect(page.locator('#cfv-cvv')).toHaveText('••••••');
  await expect(page.locator('#sheetBody')).toContainText('Visa');
  await page.click('[data-ver="numero"]');
  await expect(page.locator('#cfv-numero')).toHaveText('4111 1111 1111 1111');
  await fecharSheet(page);

  // Outros cartões (plano de saúde, fidelidade) não passam pela conferência de cartão de pagamento.
  await novo('cartao', 'Plano de saúde', { tipo: 'Outro (plano de saúde, fidelidade…)', numero: '000123456' });
  await expect(item('Plano de saúde')).toBeVisible();
});

test('conta bancária e anotação; a busca olha os campos que não são segredo', async () => {
  await novo('conta', 'Conta do Itaú', { banco: 'Itaú', agencia: '1234', conta: '56789-0', tipoConta: 'Corrente', titular: 'Maria Teste', pix: 'maria@exemplo.com' });
  await expect(item('Conta do Itaú')).toContainText('Conta bancária · Itaú · ag. 1234 · conta 56789-0');
  await novo('anotacao', 'Lembretes', { texto: 'Renovar o seguro em março\nLevar documentos' });
  await expect(item('Lembretes')).toContainText('Anotação · Renovar o seguro em março');
  await expect(page.locator('#cfN')).toHaveText('5 itens');

  await page.fill('#cfBusca', 'itau');
  await expect(page.locator('#cfL [data-cf]')).toHaveCount(1);
  await page.fill('#cfBusca', 'segredo-123'); // a senha não entra na busca
  await expect(page.locator('#cfL .empty')).toHaveText('Nada encontrado.');
  await page.fill('#cfBusca', '');
  await page.dispatchEvent('#cfBusca', 'input');
  await expect(page.locator('#cfL [data-cf]')).toHaveCount(5);
});

test('editar e apagar (com confirmação)', async () => {
  await item('Lembretes').click();
  await page.click('#cfEd');
  await page.fill('#cfT', 'Lembretes da casa');
  await page.click('#cfSalvar');
  await expect(toast(page)).toHaveText('Item atualizado');
  await expect(item('Lembretes da casa')).toBeVisible();

  await item('Plano de saúde').click();
  await page.click('#cfDel');
  await page.click('#cfOk');
  await expect(toast(page)).toHaveText('Item apagado');
  await expect(page.locator('#cfL [data-cf]')).toHaveCount(4);
});

test('bloquear esconde o cofre; desbloquear traz tudo de volta', async () => {
  await page.click('#lockBtn');
  await expect(page.locator('#cfL')).toBeEmpty();
  await telaDoPin(page, 'Digite seu PIN');
  await digitarPin(page);
  await expect(page.locator('#sApp')).toBeVisible();
  await aba(page, 'vId');
  await expect(page.locator('#cfL [data-cf]')).toHaveCount(4);
});

test('o cofre volta pelo backup cifrado em outro aparelho', async ({ browser }) => {
  await aba(page, 'vSet');
  await page.click('#commonSet [data-cs="export"]');
  const backup = await page.inputValue('#bkT');
  expect(backup).not.toContain('Itaú');
  await fecharSheet(page);
  const outro = await (await browser.newContext()).newPage();
  vigiarCsp(outro, csp);
  await preparar(outro, 'carteira-systekna.html', WORDS.carteira);
  await aba(outro, 'vSet');
  await outro.click('#commonSet [data-cs="import"]');
  await outro.fill('#riT', backup);
  await outro.click('#riGo');
  await expect(toast(outro)).toHaveText('0 credenciais restauradas e 4 itens do cofre');
  await aba(outro, 'vId');
  await expect(outro.locator('#cfL [data-cf]')).toHaveCount(4);
  await outro.context().close();
});

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEUlEQVR4nGP4z8DwH4QZYAwAR8oH+WdZbrcAAAAASUVORK5CYII=', 'base64');
const dia = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
const br = iso => iso.split('-').reverse().join('/');

test('documento com foto: datas, prévia da foto, anexo baixado igual e aviso de vencimento', async () => {
  await aba(page, 'vId');
  await page.click('#cfNovo');
  await page.click('#cfKind [data-kind="documento"]');
  await page.fill('#cfT', 'RG da Maria');
  await page.selectOption('#cfCampos [data-k="tipoDoc"]', 'RG');
  await page.fill('#cfCampos [data-k="numero"]', 'MG-12.345.678');
  await page.fill('#cfCampos [data-k="titular"]', 'Maria Teste');
  await page.fill('#cfCampos [data-k="emissao"]', dia(-400));
  await page.fill('#cfCampos [data-k="validade"]', dia(-500));
  await page.setInputFiles('#cfAx', { name: 'texto.txt', mimeType: 'text/plain', buffer: Buffer.from('oi') });
  await expect(page.locator('#cfH')).toHaveText('O anexo precisa ser uma foto ou um PDF.');
  await page.setInputFiles('#cfAx', { name: 'grande.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(2.1 * 1024 * 1024) });
  await expect(page.locator('#cfH')).toHaveText('O arquivo tem 2,1 MB. O limite é 2 MB.');
  await page.setInputFiles('#cfAx', { name: 'rg.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.locator('#cfAxInfo')).toContainText('rg.png');
  await page.click('#cfSalvar');
  await expect(page.locator('#cfH')).toHaveText('A validade vem antes da emissão.');
  await page.fill('#cfCampos [data-k="validade"]', dia(10));
  await page.click('#cfSalvar');
  await expect(item('RG da Maria')).toContainText(`Documento · RG · Maria Teste · válido até ${br(dia(10))} · com anexo`);

  await item('RG da Maria').click();
  await expect(page.locator('#cfVenc')).toHaveText('Documento vence em 10 dias');
  await expect(page.locator('#sheetBody')).toContainText('MG-12.345.678');
  await expect.poll(() => page.evaluate(() => /** @type {HTMLCanvasElement} */ (document.querySelector('#cfPrev'))?.width)).toBe(2);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#cfAxB')]);
  expect(dl.suggestedFilename()).toBe('rg.png');
  expect(fs.readFileSync(/** @type {string} */ (await dl.path())).equals(PNG)).toBe(true);
  await fecharSheet(page);

  await aba(page, 'vCreds');
  await expect(page.locator('#cAvisos')).toContainText(`Documento vence em 10 dias · ${br(dia(10))}`);
  await page.click('#cAvisos [data-cfav]');
  await expect(page.locator('#cfVenc')).toBeVisible();
  await fecharSheet(page);
});

test('documento vencido aparece como "venceu"; tirar a foto do documento', async () => {
  await aba(page, 'vId');
  await novo('documento', 'CNH antiga', { tipoDoc: 'CNH', validade: dia(-1) });
  await aba(page, 'vCreds');
  await expect(page.locator('#cAvisos [data-cfav]').first()).toContainText('Documento venceu há 1 dia');
  await expect(page.locator('#cAvisos [data-cfav]')).toHaveCount(2);

  await aba(page, 'vId');
  await item('RG da Maria').click();
  await page.click('#cfEd');
  await page.click('#cfAxTira');
  await page.click('#cfSalvar');
  await expect(item('RG da Maria')).not.toContainText('com anexo');
});

test('backup grande (com PDF anexo) sai como arquivo e volta pelo arquivo', async ({ browser }) => {
  await aba(page, 'vId');
  await page.click('#cfNovo');
  await page.click('#cfKind [data-kind="documento"]');
  await page.fill('#cfT', 'Passaporte');
  await page.selectOption('#cfCampos [data-k="tipoDoc"]', 'Passaporte');
  const pdf = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(1.5 * 1024 * 1024, 7)]);
  await page.setInputFiles('#cfAx', { name: 'passaporte.pdf', mimeType: 'application/pdf', buffer: pdf });
  await page.click('#cfSalvar');
  await expect(item('Passaporte')).toContainText('com anexo');

  await aba(page, 'vSet');
  await page.click('#commonSet [data-cs="export"]');
  await expect(page.locator('#bkG')).toContainText('por causa dos anexos');
  await expect(page.locator('#bkT')).toHaveCount(0);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bkA')]);
  expect(dl.suggestedFilename()).toMatch(/^backup-carteira-\d{4}-\d{2}-\d{2}\.txt$/);
  const caminho = /** @type {string} */ (await dl.path());
  expect(fs.readFileSync(caminho, 'utf8').startsWith('scb1.')).toBe(true);
  await fecharSheet(page);

  const outro = await (await browser.newContext()).newPage();
  vigiarCsp(outro, csp);
  await preparar(outro, 'carteira-systekna.html', WORDS.carteira);
  await aba(outro, 'vSet');
  await outro.click('#commonSet [data-cs="import"]');
  await outro.setInputFiles('#riA', caminho);
  await expect(outro.locator('#riH')).toContainText('Arquivo escolhido');
  await outro.click('#riGo');
  await expect(toast(outro)).toHaveText('0 credenciais restauradas e 7 itens do cofre');
  expect(await outro.evaluate(() => b64u.dec(ses.items.find(i => i.data.titulo === 'Passaporte').data.anexo.b64).length)).toBe(pdf.length);
  await outro.context().close();
});

test('nenhuma violação de CSP', () => { expect(csp).toEqual([]); });
