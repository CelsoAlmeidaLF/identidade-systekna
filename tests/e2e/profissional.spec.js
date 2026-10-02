// @ts-check
// Identidade define o usuário; a credencial Profissional é atributo dela (RN67 a RN76).
// A Profissional diz o papel num sistema, e o desafio exige sistema e papel mínimo.
// A carteira e o emissor rodam em contextos separados; os tokens passam pelas caixas de texto.
const { test, expect } = require('@playwright/test');
const { WORDS, preparar, aba, toast, fecharSheet, payloadDe, vigiarCsp } = require('./helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {import('@playwright/test').Page} */ let emissor;
let identidade = '';
let operador = '';
/** @type {string[]} */ const violacoesCsp = [];

async function acaoCarteira(acao) {
  await carteira.click('#dockAdd');
  await carteira.click(`#sheetBody [data-act="${acao}"]`);
}

/** Pede a credencial na carteira e confere o pedido no emissor, deixando o formulário de emissão aberto. */
async function pedir(tipo) {
  await acaoCarteira('ask');
  await carteira.fill('#aqN', 'Ana Papel');
  await carteira.selectOption('#aqT', tipo);
  await carteira.click('#aqGo');
  await expect(carteira.locator('#aqOut')).toBeVisible();
  const pedido = await carteira.inputValue('#aqJ');
  await fecharSheet(carteira);
  await aba(emissor, 'vIssue');
  if (await emissor.locator('#iNew').isVisible()) await emissor.click('#iNew');
  await emissor.fill('#iqT', pedido);
  await emissor.click('#iqGo');
  await expect(emissor.locator('#iWho')).toContainText('Pedido conferido');
  await expect(emissor.locator('#iType')).toHaveValue(tipo);
}

/** Preenche sistema e papel e tenta emitir a Profissional. */
async function emitir(sistema, papel, dias = '365') {
  const valores = emissor.locator('#iClaims .claim [data-cv]');
  await valores.nth(0).fill(sistema);
  await valores.nth(1).fill(papel);
  await emissor.selectOption('#iDays', dias);
  await emissor.click('#iGo');
}

async function receberNaCarteira(token) {
  await acaoCarteira('get');
  await carteira.fill('#rcT', token);
  await carteira.click('#rcGo');
  await expect(toast(carteira)).toHaveText('Credencial guardada');
}

async function desafioProfissional(sistema, papelMin) {
  await aba(emissor, 'vVerify');
  await emissor.selectOption('#vType', 'ProfessionalCredential');
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
async function apresentacaoAMao(desafio, credenciais) {
  const { nonce } = payloadDe(desafio);
  const aud = await emissor.evaluate(() => ses.did);
  return carteira.evaluate(([a, n, v]) => {
    const iat = now();
    return signJWT('vp+jwt', { iss: ses.did, sub: ses.did, aud: a, nonce: n, iat, exp: iat + 300,
      vp: { '@context': VC_CONTEXT, type: ['VerifiablePresentation'], holder: ses.did, verifiableCredential: v } });
  }, [aud, nonce, credenciais]);
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

test('01 · os tipos de credencial são Identidade, Profissional e Personalizado', async () => {
  await aba(emissor, 'vIssue');
  await expect(emissor.locator('#iType option')).toHaveText(['Identidade', 'Profissional', 'Personalizado']);
});

test('02 · Profissional sem Identidade ativa é recusada', async () => {
  await pedir('ProfessionalCredential');
  await emitir('Portal de Clientes', 'operador');
  await expect(toast(emissor)).toHaveText('Esta pessoa ainda não tem Identidade ativa neste emissor. Emita a Identidade primeiro.');
  await expect(emissor.locator('#iOut')).toBeHidden();
});

test('03 · Identidade leva só o nome: KYC e atributos são recusados', async () => {
  await pedir('IdentityCredential');
  await expect(emissor.locator('#iClaims [data-ck]')).toHaveCount(1);
  await expect(emissor.locator('#iClaims [data-ck]')).toHaveValue('nome');

  await emissor.click('#iAdd');
  await emissor.locator('#iClaims [data-ck]').nth(1).fill('kycValidado');
  await emissor.locator('#iClaims [data-cv]').nth(1).fill('true');
  await emissor.click('#iGo');
  await expect(toast(emissor)).toHaveText('O KYC ainda não existe nesta versão. Tire o campo “kycValidado”.');

  await emissor.locator('#iClaims [data-ck]').nth(1).fill('cargo');
  await emissor.click('#iGo');
  await expect(toast(emissor)).toHaveText('A Identidade leva só o nome. Atributos vão na credencial Profissional. Tire o campo “cargo”.');

  await emissor.locator('#iClaims [data-rm]').nth(1).click();
  await emissor.click('#iGo');
  await expect(emissor.locator('#iOk')).toContainText('Identidade para Ana Papel');
  identidade = await emissor.inputValue('#iJwt');
  expect(Object.keys(payloadDe(identidade).vc.credentialSubject).sort()).toEqual(['id', 'nome']);
  await receberNaCarteira(identidade);
});

test('04 · Profissional fora da lista, sem validade, acima de 1 ano ou sem sistema é recusada', async () => {
  await pedir('ProfessionalCredential');
  await expect(emissor.locator('#iDays')).toHaveValue('365');

  await emitir('Portal de Clientes', 'chefe');
  await expect(toast(emissor)).toHaveText('O papel deve ser leitor, operador ou admin.');
  await emitir('Portal de Clientes', 'operador', '0');
  await expect(toast(emissor)).toHaveText('A credencial Profissional precisa de validade.');
  await emitir('Portal de Clientes', 'operador', '1825');
  await expect(toast(emissor)).toHaveText('A credencial Profissional vale no máximo 1 ano.');
  await emitir('', 'operador');
  await expect(toast(emissor)).toHaveText('Informe o sistema em que o papel vale.');
  await expect(emissor.locator('#iOut')).toBeHidden();
});

test('05 · Profissional válida leva só sistema e papel, e a carteira mostra os dois', async () => {
  await emitir('Portal de Clientes', 'Operador');
  await expect(emissor.locator('#iOk')).toContainText('Profissional para Ana Papel');
  operador = await emissor.inputValue('#iJwt');
  const sujeito = payloadDe(operador).vc.credentialSubject;
  expect(sujeito.papel).toBe('operador');
  expect(Object.keys(sujeito).sort()).toEqual(['id', 'papel', 'sistema']);

  await receberNaCarteira(operador);
  await expect(carteira.locator('#cList')).toContainText('Operador em Portal de Clientes');
});

test('06 · desafio Profissional é aprovado com a Identidade junto e mostra quem é e o que pode', async () => {
  // O sistema é comparado sem diferenciar maiúscula nem acento.
  const vp = await apresentar(await desafioProfissional('portal de clientes', 'leitor'));
  expect(vp).not.toBeNull();
  const creds = payloadDe(/** @type {string} */ (vp)).vp.verifiableCredential;
  expect(creds).toEqual([operador, identidade]);
  const out = await conferir(/** @type {string} */ (vp));
  await expect(out).toContainText('Apresentação aprovada');
  await expect(out.locator('.chk.no')).toHaveCount(0);
  await expect(out).toContainText('Profissional de Ana Papel');
  await expect(out).toContainText('Pode: ver, criar, editar.');
});

test('07 · papel abaixo do mínimo ou de outro sistema não é oferecido pela carteira', async () => {
  expect(await apresentar(await desafioProfissional('Portal de Clientes', 'admin'))).toBeNull();
  expect(await apresentar(await desafioProfissional('Financeiro', 'leitor'))).toBeNull();
});

test('08 · apresentação montada à mão com papel insuficiente é recusada pelo emissor', async () => {
  const out = await conferir(await apresentacaoAMao(await desafioProfissional('Portal de Clientes', 'admin'), [operador, identidade]));
  await expect(out).toContainText('Apresentação recusada');
  await expect(out.locator('.chk.no')).toHaveCount(1);
  await expect(out.locator('.chk.no')).toContainText('O desafio pedia Admin ou acima, e veio Operador.');
});

test('09 · Profissional apresentada sem a Identidade é recusada', async () => {
  const out = await conferir(await apresentacaoAMao(await desafioProfissional('Portal de Clientes', 'leitor'), [operador]));
  await expect(out).toContainText('Apresentação recusada');
  await expect(out.locator('.chk.no')).toHaveCount(1);
  await expect(out.locator('.chk.no')).toContainText('veio sem a Identidade');
});

test('10 · novo papel no mesmo sistema revoga o anterior e vale no lugar dele', async () => {
  await pedir('ProfessionalCredential');
  await emitir('Portal de Clientes', 'admin');
  await expect(emissor.locator('#iOk')).toContainText('Credencial emitida');
  const admin = await emissor.inputValue('#iJwt');
  await aba(emissor, 'vPanel');
  await expect(emissor.locator('#pAtos')).toContainText('revogada: Substituída por novo papel');

  await receberNaCarteira(admin);
  await expect(carteira.locator('#cList')).toContainText('Admin em Portal de Clientes');
  const out = await conferir(/** @type {string} */ (await apresentar(await desafioProfissional('Portal de Clientes', 'admin'))));
  await expect(out).toContainText('Apresentação aprovada');
  await expect(out).toContainText('Pode: ver, criar, editar, apagar, gerenciar acessos.');
});

test('11 · o papel substituído é recusado como revogado', async () => {
  const out = await conferir(await apresentacaoAMao(await desafioProfissional('Portal de Clientes', 'leitor'), [operador, identidade]));
  await expect(out).toContainText('Apresentação recusada');
  await expect(out).toContainText('Substituída por novo papel');
});

test('12 · revogar a Identidade revoga a Profissional junto', async () => {
  await aba(emissor, 'vGov');
  const id = payloadDe(identidade).vc.credentialStatus.statusListIndex;
  await emissor.click(`#gIssued [data-iss="${id}"]`);
  await emissor.click('#rvGo');
  await expect(emissor.locator('#sheetBody')).toContainText('Os papéis desta pessoa também serão revogados.');
  await emissor.click('#cfOk');
  await expect(toast(emissor)).toHaveText('Credencial revogada');
  await aba(emissor, 'vPanel');
  await expect(emissor.locator('#pAtos')).toContainText('revogada: Identidade revogada');

  const vp = await apresentar(await desafioProfissional('Portal de Clientes', 'leitor'));
  const out = await conferir(/** @type {string} */ (vp));
  await expect(out).toContainText('Apresentação recusada');
  await expect(out).toContainText('Identidade revogada');
});

test('13 · nenhum fluxo esbarrou na CSP', async () => {
  expect(violacoesCsp).toEqual([]);
});
