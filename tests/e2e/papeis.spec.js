// @ts-check
// Papéis (RN67 a RN73): a credencial diz o papel num sistema, e o desafio exige sistema e papel mínimo.
// A carteira e o emissor rodam em contextos separados; os tokens passam pelas caixas de texto.
const { test, expect } = require('@playwright/test');
const { WORDS, preparar, aba, toast, fecharSheet, payloadDe, vigiarCsp } = require('./helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {import('@playwright/test').Page} */ let emissor;
let operador = '';
/** @type {string[]} */ const violacoesCsp = [];

async function acaoCarteira(acao) {
  await carteira.click('#dockAdd');
  await carteira.click(`#sheetBody [data-act="${acao}"]`);
}

async function pedirPapel() {
  await acaoCarteira('ask');
  await carteira.fill('#aqN', 'Ana Papel');
  await carteira.selectOption('#aqT', 'RoleCredential');
  await carteira.click('#aqGo');
  await expect(carteira.locator('#aqOut')).toBeVisible();
  const pedido = await carteira.inputValue('#aqJ');
  await fecharSheet(carteira);
  await aba(emissor, 'vIssue');
  if (await emissor.locator('#iNew').isVisible()) await emissor.click('#iNew');
  await emissor.fill('#iqT', pedido);
  await emissor.click('#iqGo');
  await expect(emissor.locator('#iWho')).toContainText('Pedido conferido');
}

/** Preenche sistema e papel (o nome já vem do pedido) e tenta emitir. */
async function emitir(sistema, papel, dias = '365') {
  const valores = emissor.locator('#iClaims .claim [data-cv]');
  await valores.nth(1).fill(sistema);
  await valores.nth(2).fill(papel);
  await emissor.selectOption('#iDays', dias);
  await emissor.click('#iGo');
}

async function receberNaCarteira(token) {
  await acaoCarteira('get');
  await carteira.fill('#rcT', token);
  await carteira.click('#rcGo');
  await expect(toast(carteira)).toHaveText('Credencial guardada');
}

async function desafioDePapel(sistema, papelMin) {
  await aba(emissor, 'vVerify');
  await emissor.selectOption('#vType', 'RoleCredential');
  await emissor.fill('#vSis', sistema);
  await emissor.selectOption('#vPapel', papelMin);
  await emissor.click('#vGen');
  await expect(emissor.locator('#vChal')).toBeVisible();
  return emissor.inputValue('#vChalT');
}

/** Devolve a apresentação assinada, ou null se a carteira disser que nenhuma credencial serve. */
async function apresentar(desafio) {
  await acaoCarteira('show');
  await carteira.fill('#apT', desafio);
  await carteira.click('#apGo');
  const assinar = carteira.locator('#apSign');
  const nenhuma = carteira.locator('#apStep').getByText('Nenhuma credencial serve');
  await expect(assinar.or(nenhuma)).toBeVisible();
  if (await nenhuma.isVisible()) { await fecharSheet(carteira); return null; }
  await assinar.click();
  await expect(carteira.locator('#apJ')).toBeVisible();
  const vp = await carteira.inputValue('#apJ');
  await fecharSheet(carteira);
  return vp;
}

/** Assina a apresentação direto na carteira, sem o filtro da tela, como faria uma carteira adulterada. */
async function apresentacaoAMao(desafio, vc) {
  const { nonce } = payloadDe(desafio);
  const aud = await emissor.evaluate(() => ses.did);
  return carteira.evaluate(([a, n, v]) => {
    const iat = now();
    return signJWT('vp+jwt', { iss: ses.did, sub: ses.did, aud: a, nonce: n, iat, exp: iat + 300,
      vp: { '@context': VC_CONTEXT, type: ['VerifiablePresentation'], holder: ses.did, verifiableCredential: [v] } });
  }, [aud, nonce, vc]);
}

async function conferir(vp) {
  await aba(emissor, 'vVerify');
  await emissor.fill('#vpT', vp);
  await emissor.click('#vpGo');
  return emissor.locator('#vpOut');
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

test('01 · papel fora da lista, sem validade ou acima de 1 ano é recusado', async () => {
  await pedirPapel();
  await expect(emissor.locator('#iType')).toHaveValue('RoleCredential');
  await expect(emissor.locator('#iDays')).toHaveValue('365');

  await emitir('Portal de Clientes', 'chefe');
  await expect(toast(emissor)).toHaveText('O papel deve ser leitor, operador ou admin.');
  await emitir('Portal de Clientes', 'operador', '0');
  await expect(toast(emissor)).toHaveText('A credencial de papel precisa de validade.');
  await emitir('Portal de Clientes', 'operador', '1825');
  await expect(toast(emissor)).toHaveText('A credencial de papel vale no máximo 1 ano.');
  await emitir('', 'operador');
  await expect(toast(emissor)).toHaveText('Informe o sistema em que o papel vale.');
  await expect(emissor.locator('#iOut')).toBeHidden();
});

test('02 · papel válido é emitido e a carteira mostra papel e sistema', async () => {
  await emitir('Portal de Clientes', 'Operador');
  await expect(emissor.locator('#iOk')).toContainText('Papel para Ana Papel');
  operador = await emissor.inputValue('#iJwt');
  const sujeito = payloadDe(operador).vc.credentialSubject;
  expect(sujeito.papel).toBe('operador');
  expect(Object.keys(sujeito).sort()).toEqual(['id', 'nome', 'papel', 'sistema']);

  await receberNaCarteira(operador);
  await expect(carteira.locator('#cList')).toContainText('Operador em Portal de Clientes');
});

test('03 · desafio de papel igual ou abaixo é aprovado e mostra o que o papel pode', async () => {
  // O sistema é comparado sem diferenciar maiúscula nem acento.
  const vp = await apresentar(await desafioDePapel('portal de clientes', 'leitor'));
  expect(vp).not.toBeNull();
  const out = await conferir(/** @type {string} */ (vp));
  await expect(out).toContainText('Apresentação aprovada');
  await expect(out.locator('.chk.no')).toHaveCount(0);
  await expect(out).toContainText('Pode: ver, criar, editar.');
});

test('04 · papel abaixo do mínimo ou de outro sistema não é oferecido pela carteira', async () => {
  expect(await apresentar(await desafioDePapel('Portal de Clientes', 'admin'))).toBeNull();
  expect(await apresentar(await desafioDePapel('Financeiro', 'leitor'))).toBeNull();
});

test('05 · apresentação montada à mão com papel insuficiente é recusada pelo emissor', async () => {
  const desafio = await desafioDePapel('Portal de Clientes', 'admin');
  const vp = await apresentacaoAMao(desafio, operador);
  const out = await conferir(vp);
  await expect(out).toContainText('Apresentação recusada');
  await expect(out.locator('.chk.no')).toHaveCount(1);
  await expect(out.locator('.chk.no')).toContainText('O desafio pedia Admin ou acima, e veio Operador.');
});

test('06 · novo papel no mesmo sistema revoga o anterior e vale no lugar dele', async () => {
  await pedirPapel();
  await emitir('Portal de Clientes', 'admin');
  await expect(emissor.locator('#iOk')).toContainText('Credencial emitida');
  const admin = await emissor.inputValue('#iJwt');
  await aba(emissor, 'vPanel');
  await expect(emissor.locator('#pAtos')).toContainText('revogada: Substituída por novo papel');

  await receberNaCarteira(admin);
  await expect(carteira.locator('#cList')).toContainText('Admin em Portal de Clientes');
  const out = await conferir(/** @type {string} */ (await apresentar(await desafioDePapel('Portal de Clientes', 'admin'))));
  await expect(out).toContainText('Apresentação aprovada');
  await expect(out).toContainText('Pode: ver, criar, editar, apagar, gerenciar acessos.');
});

test('07 · o papel substituído é recusado como revogado', async () => {
  const desafio = await desafioDePapel('Portal de Clientes', 'leitor');
  const vp = await apresentacaoAMao(desafio, operador);
  const out = await conferir(vp);
  await expect(out).toContainText('Apresentação recusada');
  await expect(out).toContainText('Substituída por novo papel');
});

test('08 · nenhum fluxo de papéis esbarrou na CSP', async () => {
  expect(violacoesCsp).toEqual([]);
});
