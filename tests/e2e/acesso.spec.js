// @ts-check
// F10: acesso aos serviços com cadeia de confiança na STK.
//   STK (raiz) aprova Identidades e credencia serviços; o Serviço 1 (SRV credenciado) dá Acesso
//   a quem tem Identidade da STK. A STK não dá acesso, e o SRV não aprova identidade.
// Três contextos separados (carteira, STK, Serviço 1); os tokens passam pelas caixas de texto.
const { test, expect } = require('@playwright/test');
const { WORDS, preparar, aba, toast, fecharSheet, payloadDe, vigiarCsp } = require('./helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {import('@playwright/test').Page} */ let stk;
/** @type {import('@playwright/test').Page} */ let servico;
let identidade = '';
let credenciamento = '';
/** @type {string[]} */ const violacoesCsp = [];

async function acaoCarteira(acao) {
  await carteira.click('#dockAdd');
  await carteira.click(`#sheetBody [data-act="${acao}"]`);
}

/** Pede na carteira e devolve o pedido assinado. Para Acesso, o nome vem da Identidade. */
async function pedirNaCarteira(tipo, nota = '') {
  await acaoCarteira('ask');
  await carteira.selectOption('#aqT', tipo);
  if (tipo !== 'AccessCredential') await carteira.fill('#aqN', 'Ana Acesso');
  await carteira.fill('#aqO', nota);
  await carteira.click('#aqGo');
  await expect(carteira.locator('#aqOut')).toBeVisible();
  const pedido = await carteira.inputValue('#aqJ');
  await fecharSheet(carteira);
  return pedido;
}

async function conferirPedido(emissor, pedido) {
  await aba(emissor, 'vIssue');
  if (await emissor.locator('#iOut').isVisible()) await emissor.click('#iNew');
  await emissor.fill('#iqT', pedido);
  await emissor.click('#iqGo');
  await expect(emissor.locator('#iWho')).toContainText('Pedido conferido');
}

/** Preenche os valores dos campos na ordem e emite; devolve o token ou null se recusado. */
async function emitir(emissor, valores, dias = '365') {
  for (let i = 0; i < valores.length; i++) await emissor.locator('#iClaims [data-cv]').nth(i).fill(valores[i]);
  await emissor.selectOption('#iDays', dias);
  await emissor.click('#iGo');
}

async function emitido(emissor) {
  // O texto da emissão anterior fica no elemento escondido: espera o resultado novo aparecer.
  await expect(emissor.locator('#iOut')).toBeVisible();
  await expect(emissor.locator('#iOk')).toContainText('Credencial emitida');
  return emissor.inputValue('#iJwt');
}

async function receberNaCarteira(token) {
  await acaoCarteira('get');
  await carteira.fill('#rcT', token);
  await carteira.click('#rcGo');
  await expect(toast(carteira)).toHaveText('Credencial guardada');
}

async function desafioDeAcesso(emissor, app, papelMin) {
  await aba(emissor, 'vVerify');
  await emissor.selectOption('#vType', 'AccessCredential');
  await emissor.fill('#vApp', app);
  await emissor.selectOption('#vPapel', papelMin);
  await emissor.click('#vGen');
  await expect(emissor.locator('#vChal')).toBeVisible();
  return emissor.inputValue('#vChalT');
}

/** Devolve a apresentação, ou null se a carteira disser que nenhuma credencial serve. */
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

async function conferir(emissor, vp) {
  await aba(emissor, 'vVerify');
  await emissor.fill('#vpT', vp);
  await emissor.click('#vpGo');
  return emissor.locator('#vpOut');
}

async function confiarEm(emissor, nome, did) {
  await aba(emissor, 'vGov');
  await emissor.click('#gTrustAdd');
  await emissor.fill('#tn', nome);
  await emissor.fill('#td', did);
  await emissor.click('#tGo');
  await expect(toast(emissor)).toHaveText('Emissor adicionado');
}

async function aceitarStatusNaoVerificavel(emissor) {
  await aba(emissor, 'vGov');
  await emissor.click('#gPol');
  await emissor.click('#cfOk');
  await expect(emissor.locator('#gPolV')).toHaveText('Aceitar');
}

test.beforeAll(async ({ browser }) => {
  carteira = await (await browser.newContext()).newPage();
  stk = await (await browser.newContext()).newPage();
  servico = await (await browser.newContext()).newPage();
  for (const p of [carteira, stk, servico]) vigiarCsp(p, violacoesCsp);
  await preparar(stk, 'emissor-systekna.html', WORDS.emissor);
  await preparar(servico, 'emissor-systekna.html', WORDS.outroEmissor);
  await preparar(carteira, 'carteira-systekna.html', WORDS.carteira);
  await aba(servico, 'vGov');
  await servico.fill('#gName', 'Serviço 1');
  await servico.click('#gNameS');
  await expect(toast(servico)).toHaveText('Nome salvo');
});

test.afterAll(async () => {
  for (const p of [carteira, stk, servico]) await p?.context().close();
});

test('01 · a STK (raiz) emite Identidade, Credenciamento e Personalizado; a carteira pede Identidade, Acesso ou Personalizado', async () => {
  await aba(stk, 'vIssue');
  await expect(stk.locator('#iType option')).toHaveText(['Identidade', 'Credenciamento', 'Personalizado']);
  await aba(stk, 'vGov');
  await expect(stk.locator('#gRole')).toContainText('Raiz: aprova Identidades e credencia serviços.');
  await acaoCarteira('ask');
  await expect(carteira.locator('#aqT option')).toHaveText(['Identidade', 'Acesso', 'Personalizado']);
  // Sem Identidade, a carteira não monta pedido de acesso.
  await carteira.selectOption('#aqT', 'AccessCredential');
  await expect(carteira.locator('#aqH')).toHaveText('Para pedir acesso, você precisa de uma Identidade aprovada. Peça a Identidade primeiro.');
  await expect(carteira.locator('#aqNF')).toBeHidden();
  await carteira.click('#aqGo');
  await expect(carteira.locator('#aqOut')).toBeHidden();
  await fecharSheet(carteira);
});

test('02 · a STK aprova a Identidade do cliente', async () => {
  await conferirPedido(stk, await pedirNaCarteira('IdentityCredential'));
  await emitir(stk, ['Ana Acesso']);
  identidade = await emitido(stk);
  await receberNaCarteira(identidade);
});

test('03 · a STK não dá acesso: o pedido de acesso aponta para um serviço credenciado', async () => {
  const pedido = await pedirNaCarteira('AccessCredential', 'App Agenda');
  expect(payloadDe(pedido)).toMatchObject({ identidade, name: 'Ana Acesso' });
  await conferirPedido(stk, pedido);
  await expect(stk.locator('#iWho')).toContainText('Este emissor não emite Acesso');
  await expect(stk.locator('#iWho')).toContainText('Só um serviço credenciado pela STK dá Acesso.');
  const recusa = await stk.evaluate(([sub, id]) => issue(sub, 'AccessCredential', { app: 'App Agenda', papel: 'leitor' }, 365, '', null, { identidade: id }).then(() => '', e => e.message), [payloadDe(pedido).iss, identidade]);
  expect(recusa).toBe('Só um serviço credenciado pela STK dá Acesso. Este emissor aprova Identidades e credencia serviços.');
});

test('04 · o Serviço 1 pede credenciamento e a STK credencia os apps dele', async () => {
  await aba(servico, 'vGov');
  await servico.click('#gCred [data-cr="ask"]');
  await servico.fill('#caO', 'App Agenda, App Financeiro');
  await servico.click('#caGo');
  const pedido = await servico.inputValue('#caJ');
  await fecharSheet(servico);
  expect(payloadDe(pedido)).toMatchObject({ wanted: 'AccreditationCredential', name: 'Serviço 1' });

  await conferirPedido(stk, pedido);
  await expect(stk.locator('#iType')).toHaveValue('AccreditationCredential');
  await expect(stk.locator('#iClaims [data-cv]').first()).toHaveValue('Serviço 1');
  await emitir(stk, ['Serviço 1', 'App Agenda,  App Financeiro'], '0');
  await expect(toast(stk)).toHaveText('O Credenciamento precisa de validade.');
  await emitir(stk, ['Serviço 1', 'App Agenda,  App Financeiro']);
  credenciamento = await emitido(stk);
  expect(payloadDe(credenciamento).vc.credentialSubject.apps).toBe('App Agenda, App Financeiro');
});

test('05 · o Serviço 1 só importa o credenciamento depois de confiar na STK, e vira SRV', async () => {
  await aba(servico, 'vGov');
  await servico.click('#gCred [data-cr="imp"]');
  await servico.fill('#ciT', credenciamento);
  await servico.click('#ciGo');
  await expect(servico.locator('#ciH')).toContainText('que não está na lista de confiança');
  await fecharSheet(servico);

  await confiarEm(servico, 'STK', await stk.evaluate(() => ses.did));
  await servico.click('#gCred [data-cr="imp"]');
  await servico.fill('#ciT', credenciamento);
  await servico.click('#ciGo');
  await expect(toast(servico)).toHaveText('Credenciamento importado');
  await expect(servico.locator('#gCred')).toContainText('Serviço 1: App Agenda, App Financeiro');
  await expect(servico.locator('#gRole')).toHaveText('Serviço credenciado por STK: dá Acesso a App Agenda, App Financeiro.');
  await aba(servico, 'vIssue');
  await expect(servico.locator('#iType option')).toHaveText(['Acesso', 'Personalizado']);
});

test('06 · o SRV não aprova Identidade nem credencia serviço', async () => {
  const recusa = await servico.evaluate(sub => issue(sub, 'IdentityCredential', { nome: 'X' }, 0, '', null).then(() => '', e => e.message), payloadDe(identidade).sub);
  expect(recusa).toBe('Este emissor é um serviço credenciado: ele dá Acesso aos apps dele. Identidades e credenciamentos são aprovados pela STK.');
  await conferirPedido(servico, await pedirNaCarteira('IdentityCredential'));
  await expect(servico.locator('#iWho')).toContainText('Este emissor não emite Identidade');
});

test('07 · o SRV dá acesso só a apps credenciados e a quem tem Identidade da STK', async () => {
  // Com a política padrão, a Identidade da STK é recusada: a revogação dela não pode ser conferida aqui.
  await conferirPedido(servico, await pedirNaCarteira('AccessCredential', 'App Agenda'));
  await expect(servico.locator('#iWho')).toContainText('Identidade não aceita');
  await expect(servico.locator('#iWho')).toContainText('mude a política de status não verificável');

  await aceitarStatusNaoVerificavel(servico);
  await conferirPedido(servico, await pedirNaCarteira('AccessCredential', 'App Agenda'));
  await expect(servico.locator('#iType')).toHaveValue('AccessCredential');
  await expect(servico.locator('#iWho')).toContainText('Ana Acesso, aprovada por STK.');
  await emitir(servico, ['App Agenda', 'chefe']);
  await expect(toast(servico)).toHaveText('O papel deve ser leitor, operador ou admin.');
  await emitir(servico, ['App Agenda', 'admin'], '0');
  await expect(toast(servico)).toHaveText('O Acesso precisa de validade.');
  await emitir(servico, ['Portal STK', 'admin']);
  await expect(toast(servico)).toHaveText('O credenciamento de STK não inclui o app “Portal STK”. Apps autorizados: App Agenda, App Financeiro.');
  await emitir(servico, ['app agenda', 'Admin']);
  const acesso = await emitido(servico);
  const p = payloadDe(acesso);
  expect(p.vc.credentialSubject).toEqual({ id: p.sub, app: 'app agenda', papel: 'admin' });
  expect(p.vc.evidence).toEqual([{ type: 'Credenciamento', jwt: credenciamento }]);
  await receberNaCarteira(acesso);
  await expect(carteira.locator('#cList')).toContainText('Admin em app agenda');
});

test('08 · o SRV confere o acesso com a Identidade junto e mostra o que o papel pode', async () => {
  const vp = await apresentar(await desafioDeAcesso(servico, 'App Agenda', 'operador'));
  expect(payloadDe(/** @type {string} */ (vp)).vp.verifiableCredential[1]).toBe(identidade);
  const out = await conferir(servico, /** @type {string} */ (vp));
  await expect(out).toContainText('Apresentação aprovada');
  await expect(out.locator('.chk.no')).toHaveCount(0);
  await expect(out).toContainText('Acesso de Ana Acesso');
  await expect(out).toContainText('Pode: ver, criar, editar, apagar, gerenciar acessos.');
  expect(await apresentar(await desafioDeAcesso(servico, 'App Financeiro', 'leitor'))).toBeNull();
});

test('09 · a STK aceita o acesso do SRV pelo credenciamento e recusa depois de revogá-lo', async () => {
  await aceitarStatusNaoVerificavel(stk);
  let out = await conferir(stk, /** @type {string} */ (await apresentar(await desafioDeAcesso(stk, 'App Agenda', 'leitor'))));
  await expect(out).toContainText('Apresentação aprovada');
  await expect(out).toContainText('Serviço 1 é credenciado por Emissor de Credenciais Systekna para app agenda.');

  await aba(stk, 'vGov');
  const n = payloadDe(credenciamento).vc.credentialStatus.statusListIndex;
  await stk.click(`#gIssued [data-iss="${n}"]`);
  await stk.click('#rvGo');
  await stk.click('#cfOk');
  await expect(toast(stk)).toHaveText('Credencial revogada');
  out = await conferir(stk, /** @type {string} */ (await apresentar(await desafioDeAcesso(stk, 'App Agenda', 'leitor'))));
  await expect(out).toContainText('Apresentação recusada');
  await expect(out.locator('.chk.no')).toContainText('O credenciamento: revogação em');
});

test('10 · a Identidade revogada pela STK derruba o acesso na verificação da STK', async () => {
  await aba(stk, 'vGov');
  const n = payloadDe(identidade).vc.credentialStatus.statusListIndex;
  await stk.click(`#gIssued [data-iss="${n}"]`);
  await stk.click('#rvGo');
  await stk.click('#cfOk');
  await expect(toast(stk)).toHaveText('Credencial revogada');
  const out = await conferir(stk, /** @type {string} */ (await apresentar(await desafioDeAcesso(stk, 'App Agenda', 'leitor'))));
  await expect(out).toContainText('Apresentação recusada');
  await expect(out).toContainText('A Identidade: revogação em');
});

test('11 · nenhum fluxo esbarrou na CSP', async () => {
  expect(violacoesCsp).toEqual([]);
});
