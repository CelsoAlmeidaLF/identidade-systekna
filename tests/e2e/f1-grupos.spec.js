// @ts-check
// F1.1 (plan.md): grupos no emissor, credencial MembroDoGrupo com validade obrigatória e convite do emissor.
const { test, expect } = require('@playwright/test');
const { WORDS, preparar, aba, toast, fecharSheet, vigiarCsp, payloadDe } = require('./helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {import('@playwright/test').Page} */ let emissor;
/** @type {string[]} */ const violacoesCsp = [];
let familia = '';
let amigos = '';

/** Gera um pedido assinado na carteira e devolve o token. */
async function pedir(nome) {
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="ask"]');
  await carteira.fill('#aqN', nome);
  await carteira.selectOption('#aqT', 'MembroDoGrupo');
  await carteira.click('#aqGo');
  await expect(carteira.locator('#aqOut')).toBeVisible();
  const tok = await carteira.inputValue('#aqJ');
  await fecharSheet(carteira);
  return tok;
}

async function conferirPedido(tok) {
  await aba(emissor, 'vIssue');
  if (await emissor.locator('#iOut').isVisible()) await emissor.click('#iNew');
  await emissor.fill('#iqT', tok);
  await emissor.click('#iqGo');
  await expect(emissor.locator('#iForm')).toBeVisible();
  await expect(emissor.locator('#iWho')).toContainText('Pedido conferido');
  await emissor.selectOption('#iType', 'MembroDoGrupo');
}

/** Emite a credencial do grupo para o pedido e devolve o token. */
async function emitirNoGrupo(tok, grupo) {
  await conferirPedido(tok);
  await emissor.selectOption('#iGrp', { label: grupo });
  await emissor.click('#iGo');
  await expect(emissor.locator('#iOk')).toContainText('Credencial emitida');
  return emissor.inputValue('#iJwt');
}

async function criarGrupo(nome, dias) {
  await aba(emissor, 'vGov');
  await emissor.click('#gGrpAdd');
  await emissor.fill('#ng', nome);
  await emissor.selectOption('#ngD', String(dias));
  await emissor.click('#ngGo');
  await expect(toast(emissor)).toHaveText('Grupo criado');
}

async function abrirGrupo(nome) {
  await aba(emissor, 'vGov');
  await emissor.locator('#gGroups [data-grp]', { hasText: nome }).click();
  await expect(emissor.locator('#sheetBody h3')).toHaveText(nome);
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

test('sem grupos, a credencial de grupo pede para criar um antes', async () => {
  await conferirPedido(await pedir('Maria Teste'));
  await expect(emissor.locator('#iClaims')).toContainText('Crie um grupo em Governança antes de emitir.');
  await expect(emissor.locator('#iDaysF')).toBeHidden();
});

test('cria grupos com validade própria e não aceita nome repetido', async () => {
  await criarGrupo('Família', 180);
  await criarGrupo('Amigos', 30);
  await expect(emissor.locator('#gGroups')).toContainText('Família');
  await expect(emissor.locator('#gGroups')).toContainText('validade de 6 meses');
  await expect(emissor.locator('#gGroups')).toContainText('validade de 1 mês');
  await emissor.click('#gGrpAdd');
  await emissor.fill('#ng', 'familia');
  await emissor.click('#ngGo');
  await expect(emissor.locator('#ngH')).toHaveText('Já existe um grupo com este nome.');
  await fecharSheet(emissor);
});

test('uma credencial por grupo para a mesma pessoa, com a chave de cifragem e a validade do grupo', async () => {
  const xCarteira = await carteira.evaluate(() => ses.xMb);
  familia = await emitirNoGrupo(await pedir('Maria Teste'), 'Família (6 meses)');
  amigos = await emitirNoGrupo(await pedir('Maria Teste'), 'Amigos (1 mês)');

  const f = payloadDe(familia), a = payloadDe(amigos);
  expect(f.vc.type).toEqual(['VerifiableCredential', 'MembroDoGrupo']);
  expect(f.vc.credentialSubject).toMatchObject({ grupo: 'Família', nome: 'Maria Teste', chaveCifragem: xCarteira });
  expect(a.vc.credentialSubject.grupo).toBe('Amigos');
  expect(f.exp - f.iat).toBe(180 * 86400);
  expect(a.exp - a.iat).toBe(30 * 86400);
  expect(f.jti).not.toBe(a.jti);
});

test('o livro registra a entrada no grupo', async () => {
  await aba(emissor, 'vPanel');
  await expect(emissor.locator('#pAtos')).toContainText('Amigos: Maria Teste entrou no grupo');
  await expect(emissor.locator('#pAtos')).toContainText('Grupo Família criado');
});

test('revogar a pessoa de Amigos não afeta a credencial dela em Família', async () => {
  await abrirGrupo('Amigos');
  await emissor.locator('#sgM [data-iss]').click();
  await emissor.click('#rvGo');
  await emissor.click('#cfOk');
  await expect(toast(emissor)).toHaveText('Credencial revogada');

  await abrirGrupo('Amigos');
  await expect(emissor.locator('#sgM')).toContainText('Revogada');
  await fecharSheet(emissor);
  await abrirGrupo('Família');
  await expect(emissor.locator('#sgM')).toContainText('Ativa');
  await expect(emissor.locator('#sgM')).not.toContainText('Revogada');
  await fecharSheet(emissor);
});

test('o emissor recusa emitir credencial de grupo sem validade', async () => {
  const erro = await emissor.evaluate(async () => {
    try { await issue(ses.did, 'MembroDoGrupo', { grupo: 'Família' }, 0); return null; } catch (e) { return e.message; }
  });
  expect(erro).toBe('Credencial de grupo exige validade.');
});

test('pedido sem a chave de cifragem (carteira antiga) não vira credencial de grupo', async () => {
  const antigo = await carteira.evaluate(async () => {
    const iat = now();
    return signJWT('pedido+jwt', { iss: ses.did, sub: ses.did, aud: 'emissor', name: 'Maria Teste', wanted: 'MembroDoGrupo', nonce: b64u.enc(rnd(16)), iat, exp: iat + 600 });
  });
  await conferirPedido(antigo);
  await emissor.selectOption('#iGrp', { label: 'Família (6 meses)' });
  await emissor.click('#iGo');
  await expect(toast(emissor)).toHaveText('O pedido não traz a chave de cifragem. Peça um pedido novo pela carteira atualizada.');
  await expect(emissor.locator('#iOut')).toBeHidden();
});

test('grupo arquivado sai da lista de emissão', async () => {
  await abrirGrupo('Amigos');
  await emissor.click('#sgA');
  await expect(emissor.locator('#gGroups')).toContainText('Arquivado');
  await conferirPedido(await pedir('Maria Teste'));
  await expect(emissor.locator('#iGrp option')).toHaveText(['Família (6 meses)']);
});

test('convite do emissor é um token assinado com o DID e o nome dele', async () => {
  await aba(emissor, 'vGov');
  await emissor.click('#gInv');
  const tok = await emissor.inputValue('#gInvT');
  const r = await emissor.evaluate(t => verifyJWT(t, 'emissor+jwt'), tok);
  const didEmissor = await emissor.evaluate(() => ses.did);
  expect(r.ok).toBe(true);
  expect(r.payload).toMatchObject({ iss: didEmissor, name: 'Emissor de Credenciais Systekna' });
  expect(r.payload.exp - r.payload.iat).toBe(30 * 86400);
  await fecharSheet(emissor);
});

test('nenhuma violação de CSP', () => {
  expect(violacoesCsp).toEqual([]);
});
