// @ts-check
// Critérios de aceite da seção 7 de identidade-soberana-systekna-arquitetura.md.
// A carteira e o emissor rodam em contextos de navegador separados (sem
// armazenamento compartilhado). Os tokens passam de um para o outro pelo
// valor das caixas de texto, como no copiar e colar manual.
const { test, expect } = require('@playwright/test');
const { receberPedido, WORDS, preparar, bloquearEDesbloquear, aba, toast, fecharSheet, vigiarCsp } = require('../../compartilhado/tests/helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {import('@playwright/test').Page} */ let emissor;
let pedido = '';
let credencial = '';
let apresentacao = '';
/** @type {string[]} */ const violacoesCsp = [];

async function acaoCarteira(acao) {
  await carteira.click('#dockAdd');
  await carteira.click(`#sheetBody [data-act="${acao}"]`);
}

async function receberNaCarteira(token) {
  await acaoCarteira('get');
  await carteira.fill('#rcT', token);
  await carteira.click('#rcGo');
  await expect(toast(carteira)).toHaveText('Credencial guardada');
}

async function gerarDesafio(tipo = 'any') {
  await aba(emissor, 'vVerify');
  await emissor.selectOption('#vType', tipo);
  await emissor.click('#vGen');
  await expect(emissor.locator('#vChal')).toBeVisible();
  return emissor.inputValue('#vChalT');
}

/** Lê o desafio na carteira. Devolve a apresentação assinada, ou null se nenhuma credencial servir. */
async function apresentar(desafio) {
  await acaoCarteira('show');
  await carteira.fill('#apT', desafio);
  await carteira.click('#apGo');
  const assinar = carteira.locator('#apSign');
  const nenhuma = carteira.locator('#apStep').getByText('Nenhuma credencial serve');
  await expect(assinar.or(nenhuma)).toBeVisible();
  if (await nenhuma.isVisible()) return null;
  await assinar.click();
  await expect(carteira.locator('#apJ')).toBeVisible();
  return carteira.inputValue('#apJ');
}

async function conferirApresentacao(token) {
  await aba(emissor, 'vVerify');
  await emissor.fill('#vpT', token);
  await emissor.click('#vpGo');
  return emissor.locator('#vpOut');
}

test.beforeAll(async ({ browser }) => {
  carteira = await (await browser.newContext()).newPage();
  emissor = await (await browser.newContext()).newPage();
  vigiarCsp(carteira, violacoesCsp);
  vigiarCsp(emissor, violacoesCsp);
  await preparar(emissor, 'governanca-systekna.html', WORDS.emissor);
  await preparar(carteira, 'carteira-systekna.html', WORDS.carteira);
});

test.afterAll(async () => {
  await carteira?.context().close();
  await emissor?.context().close();
});

test('01 · Governança criada com o livro aberto e íntegro', async () => {
  await expect(emissor.locator('#pBook')).toContainText('Livro íntegro');
  await expect(emissor.locator('#pAtos')).toContainText('Livro aberto e Governança criada');
});

test('02 · pedido válido é conferido e o mesmo pedido reenviado é recusado', async () => {
  await acaoCarteira('ask');
  await carteira.fill('#aqN', 'Maria Teste');
  await carteira.click('#aqGo');
  await expect(carteira.locator('#aqOut')).toBeVisible();
  pedido = await carteira.inputValue('#aqJ');
  await fecharSheet(carteira);

  await receberPedido(emissor, pedido);
  await expect(emissor.locator('#iWho')).toContainText('Pedido conferido');

  // Emite a credencial para que o pedido conste como atendido.
  await emissor.click('#iGo');
  await expect(emissor.locator('#iOk')).toContainText('Credencial emitida');
  credencial = await emissor.inputValue('#iJwt');

  await emissor.click('#iNew');
  await emissor.fill('#iqT', pedido);
  await emissor.click('#iqGo');
  await expect(emissor.locator('#iqH')).toContainText('já foi atendido');
  await expect(emissor.locator('#iForm')).toBeHidden();
});

test('03 · credencial emitida é aceita pela carteira do titular', async () => {
  await receberNaCarteira(credencial);
  await expect(carteira.locator('#cList')).toContainText('Identidade');
  await expect(carteira.locator('#cList')).toContainText('Maria Teste');
});

test('04 · apresentação com desafio é aprovada em todos os pontos', async () => {
  apresentacao = await apresentar(await gerarDesafio());
  expect(apresentacao).toBeTruthy();
  await fecharSheet(carteira);

  const out = await conferirApresentacao(apresentacao);
  await expect(out).toContainText('Apresentação aprovada');
  await expect(out.locator('.chk.no')).toHaveCount(0);
});

test('05 · a mesma apresentação reenviada é recusada (desafio já usado)', async () => {
  const out = await conferirApresentacao(apresentacao);
  await expect(out).toContainText('Apresentação recusada');
  await expect(out).toContainText('Este desafio já foi usado');
});

test('06 · credencial colada sem apresentação é recusada com explicação', async () => {
  const out = await conferirApresentacao(credencial);
  await expect(out).toContainText('Apresentação recusada');
  await expect(out).toContainText('credencial sozinha, sem apresentação');
});

test('07 · desafio que exige um tipo que a carteira não tem mostra "nenhuma credencial serve"', async () => {
  const resultado = await apresentar(await gerarDesafio('CustomCredential'));
  expect(resultado).toBeNull();
  await fecharSheet(carteira);
});

test('08 · após a revogação, uma nova apresentação é recusada', async () => {
  await aba(emissor, 'vGov');
  await emissor.locator('#gIssued [data-iss]').first().click();
  await emissor.click('#rvGo');
  await emissor.click('#cfOk');
  await expect(toast(emissor)).toHaveText('Credencial revogada');

  const nova = await apresentar(await gerarDesafio());
  expect(nova).toBeTruthy();
  await fecharSheet(carteira);

  const out = await conferirApresentacao(/** @type {string} */ (nova));
  await expect(out).toContainText('Apresentação recusada');
  await expect(out.locator('.chk.no')).toContainText('Revogada');
});

test('11 · adulterar um ato do livro é detectado no ato exato', async () => {
  const original = await emissor.evaluate(() => {
    const t = st.book[1].text;
    st.book[1].text = 'Texto adulterado';
    return t;
  });
  try {
    await aba(emissor, 'vPanel');
    await emissor.click('#pAll');
    await emissor.click('#bkChk');
    await expect(emissor.locator('#bkRes')).toContainText('A corrente se rompe no ato nº 2');
  } finally {
    await emissor.evaluate(t => { st.book[1].text = t; }, original);
  }
  await emissor.click('#bkChk');
  await expect(emissor.locator('#bkRes')).toContainText('conferem do primeiro ao último');
  await fecharSheet(emissor);
});

test('12 · bloquear e desbloquear preserva todos os atos', async () => {
  const antes = await emissor.evaluate(() => st.book.map(e => e.hash));
  expect(antes.length).toBeGreaterThan(5);

  await bloquearEDesbloquear(emissor);

  const depois = await emissor.evaluate(() => st.book.map(e => e.hash));
  expect(depois).toEqual(antes);
  await expect(emissor.locator('#pBook')).toContainText('Livro íntegro');
});

test('nenhuma violação de CSP em todo o fluxo acima', () => {
  expect(violacoesCsp).toEqual([]);
});
