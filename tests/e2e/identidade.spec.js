// @ts-check
// Camada de identidade (RN58, RN74): a Identidade define o usuário e leva só o nome.
// Cada DID tem uma Identidade ativa por emissor; a nova substitui a anterior.
const { test, expect } = require('@playwright/test');
const { WORDS, preparar, aba, toast, fecharSheet, payloadDe, vigiarCsp } = require('./helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {import('@playwright/test').Page} */ let emissor;
let primeira = '';
/** @type {string[]} */ const violacoesCsp = [];

/** Pede a Identidade na carteira e confere o pedido no emissor, deixando o formulário de emissão aberto. */
async function pedirIdentidade(nome) {
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="ask"]');
  await carteira.fill('#aqN', nome);
  await carteira.selectOption('#aqT', 'IdentityCredential');
  await carteira.click('#aqGo');
  await expect(carteira.locator('#aqOut')).toBeVisible();
  const pedido = await carteira.inputValue('#aqJ');
  await fecharSheet(carteira);
  await aba(emissor, 'vIssue');
  if (await emissor.locator('#iNew').isVisible()) await emissor.click('#iNew');
  await emissor.fill('#iqT', pedido);
  await emissor.click('#iqGo');
  await expect(emissor.locator('#iWho')).toContainText('Pedido conferido');
  await expect(emissor.locator('#iType')).toHaveValue('IdentityCredential');
}

test.beforeAll(async ({ browser }) => {
  carteira = await (await browser.newContext()).newPage();
  emissor = await (await browser.newContext()).newPage();
  vigiarCsp(carteira, violacoesCsp);
  vigiarCsp(emissor, violacoesCsp);
  await preparar(emissor, 'emissor-systekna.html', WORDS.emissor);
  await preparar(carteira, 'carteira-systekna.html', WORDS.carteira);
});

test.afterAll(async () => {
  await carteira?.context().close();
  await emissor?.context().close();
});

test('01 · a carteira pede Identidade, Crachá, Acesso ou Personalizado; a Identidade vem primeiro', async () => {
  await aba(emissor, 'vIssue');
  await expect(emissor.locator('#iType option').first()).toHaveText('Identidade');
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="ask"]');
  await expect(carteira.locator('#aqT option')).toHaveText(['Identidade', 'Crachá', 'Acesso', 'Personalizado']);
  await fecharSheet(carteira);
});

test('02 · Identidade leva só o nome: KYC, atributos e nome vazio são recusados', async () => {
  await pedirIdentidade('Ana Teste');
  await expect(emissor.locator('#iClaims [data-ck]')).toHaveCount(1);
  await expect(emissor.locator('#iClaims [data-ck]')).toHaveValue('nome');

  await emissor.click('#iAdd');
  await emissor.locator('#iClaims [data-ck]').nth(1).fill('kycValidado');
  await emissor.locator('#iClaims [data-cv]').nth(1).fill('true');
  await emissor.click('#iGo');
  await expect(toast(emissor)).toHaveText('O KYC ainda não existe nesta versão. Tire o campo “kycValidado”.');

  await emissor.locator('#iClaims [data-ck]').nth(1).fill('cargo');
  await emissor.click('#iGo');
  await expect(toast(emissor)).toHaveText('A Identidade leva só o nome. Tire o campo “cargo”.');

  await emissor.locator('#iClaims [data-rm]').nth(1).click();
  await emissor.locator('#iClaims [data-ck]').nth(0).fill('apelido');
  await emissor.click('#iGo');
  await expect(toast(emissor)).toHaveText('A Identidade precisa do nome.');
  await emissor.locator('#iClaims [data-ck]').nth(0).fill('nome');

  await emissor.click('#iGo');
  await expect(emissor.locator('#iOk')).toContainText('Identidade para Ana Teste');
  primeira = await emissor.inputValue('#iJwt');
  expect(Object.keys(payloadDe(primeira).vc.credentialSubject).sort()).toEqual(['id', 'nome']);
});

test('03 · nova Identidade para o mesmo DID revoga a anterior', async () => {
  await pedirIdentidade('Ana Teste Silva');
  await emissor.click('#iGo');
  await expect(emissor.locator('#iOk')).toContainText('Identidade para Ana Teste Silva');
  await aba(emissor, 'vPanel');
  await expect(emissor.locator('#pAtos')).toContainText('revogada: Substituída por nova Identidade');
  const situacao = await emissor.evaluate(jti => st.issued.filter(i => i.type === 'IdentityCredential').map(i => [i.jti === jti, i.revoked]), payloadDe(primeira).jti);
  expect(situacao).toEqual([[true, true], [false, false]]);
});

test('04 · nenhum fluxo esbarrou na CSP', async () => {
  expect(violacoesCsp).toEqual([]);
});
