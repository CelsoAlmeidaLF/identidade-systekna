// @ts-check
// Cenário 1 (03/10/2026): a Carteira guarda até 3 identidades das mesmas 12 palavras (Pessoal, Profissional e
// uma personalizada), cada uma com DID próprio. A pessoa solicita a aprovação à Governança (STK), que aprova
// ou recusa. O pedido leva nome e apelido; a aprovação leva só o nome; a recusa fica só no livro da STK.
const { test, expect } = require('@playwright/test');
const { WORDS, vigiarCsp, preparar, aba, toast, fecharSheet, payloadDe, bloquearEDesbloquear } = require('./helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {import('@playwright/test').Page} */ let gov;
/** @type {string[]} */ const violacoesCsp = [];
const DID_PESSOAL = 'did:key:z6MkuKwMejuU5tavPVP5ZVWg9W1z28SY62DNXp3aBzyMsLXr';
const DIA = 86_400;
let didProfissional = '';
let didAssociacao = '';

const cartao = n => carteira.locator(`#idList .idp[data-n="${n}"]`);

async function solicitar(n, nome) {
  await aba(carteira, 'vId');
  await carteira.click(`#idList [data-idask="${n}"]`);
  await expect(carteira.locator('#aqI')).toHaveValue(String(n));
  await carteira.fill('#aqN', nome);
  await carteira.click('#aqGo');
  await expect(carteira.locator('#aqOut')).toBeVisible();
  const tok = await carteira.inputValue('#aqJ');
  await fecharSheet(carteira);
  return tok;
}

async function conferir(tok) {
  await aba(gov, 'vIssue');
  if (await gov.locator('#iOut').isVisible()) await gov.click('#iNew');
  await gov.fill('#iqT', tok);
  await gov.click('#iqGo');
}

async function aprovar() {
  const anterior = await gov.inputValue('#iJwt');
  await gov.click('#iGo');
  await expect(gov.locator('#iJwt')).not.toHaveValue(anterior);
  await expect(gov.locator('#iOk')).toContainText('Identidade aprovada');
  return gov.inputValue('#iJwt');
}

async function receber(tok) {
  await aba(carteira, 'vId');
  await carteira.click('#idList [data-idget="0"]');
  await carteira.fill('#rcT', tok);
  await carteira.click('#rcGo');
  await expect(toast(carteira)).toHaveText('Credencial guardada');
  await aba(carteira, 'vId');
}

test.beforeAll(async ({ browser }) => {
  [carteira, gov] = await Promise.all([1, 2].map(async () => (await browser.newContext()).newPage()));
  for (const p of [carteira, gov]) vigiarCsp(p, violacoesCsp);
  await preparar(gov, 'governanca-systekna.html', WORDS.emissor);
  await preparar(carteira, 'carteira-systekna.html', WORDS.carteira);
});

test.afterAll(async () => {
  for (const p of [carteira, gov]) await p?.context().close();
});

test.describe('identidades na carteira', () => {
  test('a carteira começa com a identidade Pessoal, de sempre, sem aprovação', async () => {
    await aba(carteira, 'vId');
    await expect(carteira.locator('#idList .idp')).toHaveCount(1);
    await expect(cartao(0)).toContainText('Pessoal');
    await expect(cartao(0)).toContainText('Sem aprovação');
    expect(await carteira.evaluate(() => ses.did)).toBe(DID_PESSOAL);
  });

  test('Profissional e personalizada saem das mesmas 12 palavras, com DIDs próprios', async () => {
    await carteira.click('#idNew');
    await expect(carteira.locator('#niC [data-novo="1"]')).toHaveAttribute('aria-pressed', 'true');
    await carteira.click('#niGo');
    await expect(toast(carteira)).toHaveText('Identidade criada');
    await expect(cartao(1)).toContainText('Profissional');

    await carteira.click('#idNew');
    await expect(carteira.locator('#niF')).toBeVisible();
    await carteira.fill('#niA', 'pessoal');
    await carteira.click('#niGo');
    await expect(toast(carteira)).toHaveText('Já existe uma identidade com esse apelido');
    await carteira.fill('#niA', 'Associação');
    await carteira.click('#niGo');
    await expect(toast(carteira)).toHaveText('Identidade criada');
    await expect(cartao(2)).toContainText('Associação');
    // Limite de 3 identidades.
    await expect(carteira.locator('#idNew')).toHaveCount(0);

    const dids = await carteira.evaluate(() => identidades().map(x => x.id.did));
    [, didProfissional, didAssociacao] = dids;
    expect(dids[0]).toBe(DID_PESSOAL);
    expect(new Set(dids).size).toBe(3);
    // Determinístico: as mesmas palavras e o mesmo número recriam o mesmo DID.
    const recalculado = await carteira.evaluate(async palavras => (await deriveIdentity(await wordsToSeed(palavras.split(' ')), 'perfil/1')).did, WORDS.carteira);
    expect(recalculado).toBe(didProfissional);
  });
});

test.describe('solicitar e aprovar', () => {
  test('o pedido sai assinado pela identidade escolhida, com nome e apelido', async () => {
    const pedido = await solicitar(1, 'Maria Teste');
    expect(pedido).toMatch(/^SYSTEKNA:PEDIDO-APROVACAO:/);
    const p = payloadDe(pedido);
    expect([p.iss, p.sub, p.name, p.apelido, p.wanted]).toEqual([didProfissional, didProfissional, 'Maria Teste', 'Profissional', 'IdentityCredential']);
    await expect(cartao(1)).toContainText('Aguardando aprovação');
    await expect(cartao(0)).toContainText('Sem aprovação');

    await conferir(pedido);
    await expect(gov.locator('#iWho')).toContainText('Maria Teste (Profissional) controla');
    await expect(gov.locator('#iIdNome')).toHaveText('Maria Teste');
    await expect(gov.locator('#iIdApelido')).toHaveText('Profissional');
    await expect(gov.locator('#iDays')).toHaveValue('365');
    await expect(gov.locator('#iRec')).toBeVisible();
  });

  test('a STK aprova: a aprovação leva só o nome e vale 1 ano', async () => {
    const tok = await aprovar();
    expect(tok).toMatch(/^SYSTEKNA:APROVACAO:/);
    const p = payloadDe(tok);
    expect(p.sub).toBe(didProfissional);
    expect(p.vc.credentialSubject).toEqual({ id: didProfissional, nome: 'Maria Teste' });
    expect(p.exp - p.iat).toBe(365 * DIA);
    expect(await gov.evaluate(() => st.book.at(-1).text)).toBe('Identidade aprovada para Maria Teste (Profissional)');

    await receber(tok);
    await expect(cartao(1)).toContainText('Aprovada até');
    await expect(cartao(1)).toContainText('Maria Teste');
    await expect(cartao(0)).toContainText('Sem aprovação');
  });

  test('a STK escolhe a validade', async () => {
    await conferir(await solicitar(2, 'Maria Teste'));
    await gov.selectOption('#iDays', '30');
    const p = payloadDe(await aprovar());
    expect(p.sub).toBe(didAssociacao);
    expect(p.exp - p.iat).toBe(30 * DIA);
  });

  test('a recusa fica no livro com o motivo e a carteira continua aguardando', async () => {
    const pedido = await solicitar(0, 'Maria Teste');
    await conferir(pedido);
    await gov.click('#iRec');
    await gov.selectOption('#rcM', 'Dados não conferem');
    await gov.click('#rcGo');
    await expect(toast(gov)).toHaveText('Pedido recusado');
    await expect(gov.locator('#iqH')).toHaveText('Pedido recusado: Dados não conferem. Registrado no livro.');
    await expect(gov.locator('#iForm')).toBeHidden();
    expect(await gov.evaluate(() => st.book.at(-1).text)).toBe('Identidade de Maria Teste (Pessoal) recusada: Dados não conferem');
    expect(await gov.evaluate(() => st.issued.filter(i => i.sub === ses.did).length)).toBe(0);

    await conferir(pedido);
    await expect(gov.locator('#iqH')).toHaveText('Este pedido já foi recusado. A pessoa pode enviar um pedido novo.');
    await aba(carteira, 'vId');
    await expect(cartao(0)).toContainText('Aguardando aprovação');
  });
});

test('a identidade aprovada é apresentada pelo DID dela', async () => {
  await aba(gov, 'vVerify');
  await gov.selectOption('#vType', 'IdentityCredential');
  await gov.click('#vGen');
  const desafio = await gov.inputValue('#vChalT');
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="show"]');
  await carteira.fill('#apT', desafio);
  await carteira.click('#apGo');
  const opcoes = carteira.locator('#apC [data-pk]');
  // Só a aprovação da Profissional foi recebida na carteira; o cartão mostra a qual identidade ela pertence.
  await expect(opcoes).toHaveCount(1);
  await expect(opcoes.filter({ hasText: 'Profissional' })).toHaveCount(1);
  await opcoes.filter({ hasText: 'Profissional' }).click();
  await carteira.click('#apSign');
  const prova = await carteira.inputValue('#apJ');
  await fecharSheet(carteira);
  expect(payloadDe(prova).iss).toBe(didProfissional);

  await gov.fill('#vpT', prova);
  await gov.click('#vpGo');
  await expect(gov.locator('#vpOut')).toContainText('Apresentação aprovada');
});

test('as identidades continuam depois de bloquear e voltam pelo backup em outro aparelho', async ({ browser }) => {
  await bloquearEDesbloquear(carteira);
  await aba(carteira, 'vId');
  await expect(carteira.locator('#idList .idp')).toHaveCount(3);
  await expect(cartao(1)).toContainText('Aprovada até');

  await aba(carteira, 'vSet');
  await carteira.click('#commonSet [data-cs="export"]');
  const backup = await carteira.inputValue('#bkT');
  await fecharSheet(carteira);

  const outro = await (await browser.newContext()).newPage();
  vigiarCsp(outro, violacoesCsp);
  await preparar(outro, 'carteira-systekna.html', WORDS.carteira);
  await aba(outro, 'vSet');
  await outro.click('#commonSet [data-cs="import"]');
  await outro.fill('#riT', backup);
  await outro.click('#riGo');
  await expect(toast(outro)).toContainText('restaurad');
  expect(await outro.evaluate(() => identidades().map(x => [x.apelido, x.id.did])))
    .toEqual([['Pessoal', DID_PESSOAL], ['Profissional', didProfissional], ['Associação', didAssociacao]]);
  await outro.context().close();
});

test('nenhuma violação de CSP em todo o fluxo acima', () => {
  expect(violacoesCsp).toEqual([]);
});
