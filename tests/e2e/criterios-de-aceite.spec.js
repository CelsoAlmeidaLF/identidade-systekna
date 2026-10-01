// @ts-check
// Critérios de aceite da seção 7 de identidade-soberana-systekna-arquitetura.md.
// A carteira e o cartório rodam em contextos de navegador separados (sem
// armazenamento compartilhado). Os tokens passam de um para o outro pelo
// valor das caixas de texto, como no copiar e colar manual.
const { test, expect } = require('@playwright/test');

const PIN = '135790';
// Frases BIP39 de teste com checksum válido: as identidades ficam iguais a cada execução.
const WORDS_CARTEIRA = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const WORDS_CARTORIO = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong';

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {import('@playwright/test').Page} */ let cartorio;
let didCarteira = '';
let pedido = '';
let credencial = '';
let apresentacao = '';

async function digitarPin(page) {
  await page.keyboard.type(PIN);
}

/** Entra pelo caminho "Recuperar com 12 palavras" e cria o PIN. */
async function instituir(page, arquivo, palavras) {
  await page.goto(`/${arquivo}`);
  await page.click('#goRecover');
  await page.fill('#recWords', palavras);
  await page.click('#recGo');
  await expect(page.locator('#pinTitle')).toHaveText('Crie um PIN de 6 dígitos');
  await digitarPin(page);
  await expect(page.locator('#pinTitle')).toHaveText('Repita o PIN');
  await digitarPin(page);
  await expect(page.locator('#sApp')).toBeVisible();
}

const aba = (page, view) => page.click(`.dock [data-v="${view}"]`);
const toast = page => page.locator('#toast span');

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
  await aba(cartorio, 'vVerify');
  await cartorio.selectOption('#vType', tipo);
  await cartorio.click('#vGen');
  await expect(cartorio.locator('#vChal')).toBeVisible();
  return cartorio.inputValue('#vChalT');
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
  await aba(cartorio, 'vVerify');
  await cartorio.fill('#vpT', token);
  await cartorio.click('#vpGo');
  return cartorio.locator('#vpOut');
}

async function fecharSheet(page) {
  // Toca no canto de cima, fora da folha, como o usuário faria.
  await page.click('#scrim', { position: { x: 10, y: 10 } });
  await expect(page.locator('#sheet')).not.toHaveClass(/open/);
}

test.beforeAll(async ({ browser }) => {
  carteira = await (await browser.newContext()).newPage();
  cartorio = await (await browser.newContext()).newPage();
  await instituir(cartorio, 'cartorio-systekna.html', WORDS_CARTORIO);
  await instituir(carteira, 'carteira-systekna.html', WORDS_CARTEIRA);
  didCarteira = await carteira.evaluate(() => ses.did);
});

test.afterAll(async () => {
  await carteira?.context().close();
  await cartorio?.context().close();
});

test('01 · cartório instituído com o livro aberto e íntegro', async () => {
  await expect(cartorio.locator('#pBook')).toContainText('Livro íntegro');
  await expect(cartorio.locator('#pAtos')).toContainText('Livro aberto e cartório instituído');
});

test('02 · pedido válido é conferido e o mesmo pedido reenviado é recusado', async () => {
  await acaoCarteira('ask');
  await carteira.fill('#aqN', 'Maria Teste');
  await carteira.click('#aqGo');
  await expect(carteira.locator('#aqOut')).toBeVisible();
  pedido = await carteira.inputValue('#aqJ');
  await fecharSheet(carteira);

  await aba(cartorio, 'vIssue');
  await cartorio.fill('#iqT', pedido);
  await cartorio.click('#iqGo');
  await expect(cartorio.locator('#iWho')).toContainText('Pedido conferido');

  // Emite a credencial para que o pedido conste como atendido.
  await cartorio.click('#iGo');
  await expect(cartorio.locator('#iOk')).toContainText('Credencial emitida');
  credencial = await cartorio.inputValue('#iJwt');

  await cartorio.click('#iNew');
  await cartorio.fill('#iqT', pedido);
  await cartorio.click('#iqGo');
  await expect(cartorio.locator('#iqH')).toContainText('já foi atendido');
  await expect(cartorio.locator('#iForm')).toBeHidden();
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
  const resultado = await apresentar(await gerarDesafio('ResidenceCredential'));
  expect(resultado).toBeNull();
  await fecharSheet(carteira);
});

test('08 · após a revogação, uma nova apresentação é recusada', async () => {
  await aba(cartorio, 'vGov');
  await cartorio.locator('#gIssued [data-iss]').first().click();
  await cartorio.click('#rvGo');
  await cartorio.click('#cfOk');
  await expect(toast(cartorio)).toHaveText('Credencial revogada');

  const nova = await apresentar(await gerarDesafio());
  expect(nova).toBeTruthy();
  await fecharSheet(carteira);

  const out = await conferirApresentacao(/** @type {string} */ (nova));
  await expect(out).toContainText('Apresentação recusada');
  await expect(out.locator('.chk.no')).toContainText('Revogada');
});

test('09 e 10 · documento registrado confere, arquivo alterado falha e o certificado entra na carteira', async () => {
  const original = { name: 'contrato.txt', mimeType: 'text/plain', buffer: Buffer.from('Contrato de teste Systekna\n') };
  const alterado = { ...original, buffer: Buffer.from('Contrato de teste Systekna!\n') };

  await aba(cartorio, 'vDocs');
  await cartorio.setInputFiles('#dFile', original);
  await expect(cartorio.locator('#dInfo')).toContainText('SHA-256');
  await cartorio.fill('#dName', 'Maria Teste');
  await cartorio.fill('#dDid', didCarteira);
  await cartorio.click('#dGo');
  await expect(cartorio.locator('#dOk')).toContainText('Registro nº 1');
  const certificado = await cartorio.inputValue('#dJwt');

  await cartorio.click('#dSeg button:has-text("Conferir")');
  await cartorio.fill('#cT', certificado);

  await cartorio.setInputFiles('#cFile', original);
  await expect(cartorio.locator('#cInfo')).toContainText('SHA-256');
  await cartorio.click('#cGo');
  await expect(cartorio.locator('#cOut')).toContainText('Documento autêntico');

  await cartorio.setInputFiles('#cFile', alterado);
  await expect(cartorio.locator('#cInfo')).toContainText('SHA-256');
  await cartorio.click('#cGo');
  await expect(cartorio.locator('#cOut')).toContainText('Documento não confere');

  // Critério 10: com DID informado, o certificado vai para a carteira.
  await receberNaCarteira(certificado);
  await expect(carteira.locator('#cList')).toContainText('Registro de documento');
  await expect(carteira.locator('#cList')).toContainText('contrato.txt');
});

test('11 · adulterar um ato do livro é detectado no ato exato', async () => {
  const original = await cartorio.evaluate(() => {
    const t = st.book[1].text;
    st.book[1].text = 'Texto adulterado';
    return t;
  });
  try {
    await aba(cartorio, 'vPanel');
    await cartorio.click('#pAll');
    await cartorio.click('#bkChk');
    await expect(cartorio.locator('#bkRes')).toContainText('A corrente se rompe no ato nº 2');
  } finally {
    await cartorio.evaluate(t => { st.book[1].text = t; }, original);
  }
  await cartorio.click('#bkChk');
  await expect(cartorio.locator('#bkRes')).toContainText('conferem do primeiro ao último');
  await fecharSheet(cartorio);
});

test('12 · bloquear e desbloquear preserva todos os atos', async () => {
  const antes = await cartorio.evaluate(() => st.book.map(e => e.hash));
  expect(antes.length).toBeGreaterThan(5);

  await cartorio.click('#lockBtn');
  await expect(cartorio.locator('#pinTitle')).toHaveText('Digite seu PIN');
  await digitarPin(cartorio);
  await expect(cartorio.locator('#sApp')).toBeVisible();

  const depois = await cartorio.evaluate(() => st.book.map(e => e.hash));
  expect(depois).toEqual(antes);
  await expect(cartorio.locator('#pBook')).toContainText('Livro íntegro');
});
