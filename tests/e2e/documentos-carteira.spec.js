// @ts-check
// Documento no cofre da carteira: titular, tipo, validade com aviso, CPF conferido e envio cifrado para um contato.
const { test, expect } = require('@playwright/test');
const { WORDS, preparar, aba, toast, fecharSheet, vigiarCsp } = require('./helpers');

test.describe.configure({ mode: 'serial' });

// Segunda pessoa: frase BIP39 de teste com checksum válido (vetor Trezor).
const PALAVRAS_MAE = 'letter advice cage absurd amount doctor acoustic avoid letter advice cage above';

/** @type {import('@playwright/test').Page} */ let eu;
/** @type {import('@playwright/test').Page} */ let mae;
/** @type {string[]} */ const violacoesCsp = [];

/** Data local AAAA-MM-DD daqui a n dias. */
const diaDaqui = n => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

async function novoDocumento(campos) {
  await eu.click('#dockAdd');
  await eu.click('#sheetBody [data-act="item"]');
  await eu.click('#sheetBody [data-t="doc"]');
  await eu.fill('#eTitle', campos.titulo);
  if (campos.titular) await eu.fill('[data-k="holder"]', campos.titular);
  if (campos.tipo) await eu.selectOption('[data-k="kind"]', campos.tipo);
  if (campos.numero) await eu.fill('[data-k="num"]', campos.numero);
  if (campos.validade) await eu.fill('[data-k="exp"]', campos.validade);
  await eu.click('#eSave');
}

const abrirItem = titulo => eu.locator('#vList [data-id]', { hasText: titulo }).click();

test.beforeAll(async ({ browser }) => {
  eu = await (await browser.newContext()).newPage();
  mae = await (await browser.newContext()).newPage();
  vigiarCsp(eu, violacoesCsp);
  vigiarCsp(mae, violacoesCsp);
  await preparar(eu, 'carteira-systekna.html', WORDS.carteira);
  await preparar(mae, 'carteira-systekna.html', PALAVRAS_MAE);
});

test.afterAll(async () => {
  await eu?.context().close();
  await mae?.context().close();
});

test('o formulário de documento tem titular, tipo e validade como data', async () => {
  await eu.click('#dockAdd');
  await eu.click('#sheetBody [data-act="item"]');
  await eu.click('#sheetBody [data-t="doc"]');
  await expect(eu.locator('[data-k="holder"]')).toHaveAttribute('placeholder', 'Ex.: Eu, Mãe, Filho');
  await expect(eu.locator('[data-k="kind"] option')).toHaveText(['Escolha', 'RG', 'CPF', 'CNH', 'Passaporte', 'Cartão SUS', 'Outro']);
  await expect(eu.locator('[data-k="exp"]')).toHaveAttribute('type', 'date');
  await fecharSheet(eu);
});

test('CPF inválido não é guardado; válido é guardado com pontuação', async () => {
  await novoDocumento({ titulo: 'CPF da Mãe', titular: 'Mãe', tipo: 'cpf', numero: '529.982.247-26' });
  await expect(toast(eu)).toHaveText('CPF inválido: confira os números.');
  await expect(eu.locator('#eSave')).toBeVisible();

  await eu.fill('[data-k="num"]', '52998224725');
  await eu.click('#eSave');
  await expect(toast(eu)).toHaveText('Guardado no cofre');
  const num = await eu.evaluate(() => ses.items.find(i => i.data.title === 'CPF da Mãe').data.fields.num);
  expect(num).toBe('529.982.247-25');
});

test('lista mostra tipo e titular, e avisa do vencimento próximo e do vencido', async () => {
  await novoDocumento({ titulo: 'CNH', titular: 'Eu', tipo: 'cnh', numero: '12345678900', validade: diaDaqui(12) });
  await novoDocumento({ titulo: 'Passaporte', titular: 'Eu', tipo: 'passaporte', numero: 'FZ123456', validade: diaDaqui(-3) });
  await novoDocumento({ titulo: 'RG', titular: 'Eu', tipo: 'rg', numero: '12.345.678-9', validade: diaDaqui(400) });

  const linha = t => eu.locator('#vList [data-id]', { hasText: t });
  await expect(linha('CPF da Mãe')).toContainText('CPF, Mãe');
  await expect(linha('CNH')).toContainText('Vence em 12 dias');
  await expect(linha('Passaporte')).toContainText('Vencido');
  await expect(linha('RG').locator('.pill')).toHaveCount(0);

  // A busca acha pelo titular e pelo tipo.
  await eu.fill('#vSearch', 'mae');
  await expect(eu.locator('#vList [data-id]')).toHaveCount(1);
  await eu.fill('#vSearch', 'passaporte');
  await expect(eu.locator('#vList [data-id]')).toHaveCount(1);
  await eu.fill('#vSearch', '');
});

test('o detalhe mostra o tipo pelo nome, a validade com o estado e avisa que não é prova', async () => {
  await abrirItem('CNH');
  await expect(eu.locator('#sheetBody')).toContainText('Vence em 12 dias');
  await expect(eu.locator('#sheetBody [data-v="kind"]')).toHaveText('CNH');
  await expect(eu.locator('#sheetBody')).toContainText('Não é prova de identidade.');
  await fecharSheet(eu);
});

test('validade antiga em texto livre continua guardada e aparece como texto, sem aviso', async () => {
  await eu.evaluate(() => saveItem({ type: 'doc', title: 'Título de eleitor', fields: { num: '1234', exp: 'indeterminada' }, created: Date.now(), updated: Date.now() }));
  await eu.evaluate(() => renderVault());
  await expect(eu.locator('#vList [data-id]', { hasText: 'Título de eleitor' }).locator('.pill')).toHaveCount(0);
  await abrirItem('Título de eleitor');
  await expect(eu.locator('#sheetBody [data-v="exp"]')).toHaveText('indeterminada');
  await eu.click('#iEdit');
  await expect(eu.locator('[data-k="exp"]')).not.toHaveAttribute('type', 'date');
  await expect(eu.locator('[data-k="exp"]')).toHaveValue('indeterminada');
  await fecharSheet(eu);
});

test('sem contatos, o envio pede para importar um cartão', async () => {
  await abrirItem('CPF da Mãe');
  await eu.click('#iSend');
  await expect(eu.locator('#sdC')).toContainText('A agenda está vazia.');
  await fecharSheet(eu);
});

test('documento enviado cifrado só abre na carteira do contato', async () => {
  // Contato direto na agenda; a importação do cartão tem os próprios testes (f1-agenda).
  const quem = await mae.evaluate(() => ({ did: ses.did, x: ses.xMb }));
  await eu.evaluate(c => saveItem({ type: 'contact', did: c.did, x: c.x, apelido: 'Mãe', name: 'Mãe', groups: [], created: Date.now(), updated: Date.now() }), quem);

  await aba(eu, 'vVault');
  await abrirItem('CPF da Mãe');
  await eu.click('#iSend');
  await eu.locator('#sdC [data-ct]', { hasText: 'Mãe' }).click();
  await expect(eu.locator('#sdOut')).toContainText('Cifrado para Mãe');
  const pacote = await eu.inputValue('#sdT');
  expect(pacote.startsWith('smsg1.')).toBe(true);
  expect(pacote).not.toContain('529');
  await fecharSheet(eu);

  // A mãe abre.
  await aba(mae, 'vId');
  await mae.click('#mSeg button:has-text("Abrir")');
  await mae.fill('#mIn', pacote);
  await mae.click('#mOpen');
  await expect(mae.locator('#mOpenOut')).toContainText('Tipo: CPF');
  await expect(mae.locator('#mOpenOut')).toContainText('Número: 529.982.247-25');
  await expect(mae.locator('#mOpenOut')).toContainText('Titular: Mãe');

  // O próprio remetente não abre: foi cifrado só para a mãe.
  await aba(eu, 'vId');
  await eu.click('#mSeg button:has-text("Abrir")');
  await eu.fill('#mIn', pacote);
  await eu.click('#mOpen');
  await expect(eu.locator('#mOpenOut')).toContainText('não foi cifrada para a sua chave');
});

test('nenhuma violação de CSP', () => {
  expect(violacoesCsp).toEqual([]);
});
