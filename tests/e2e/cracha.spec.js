// @ts-check
// F10: crachá e acesso com cadeia de confiança na STK.
//   USER pede a Identidade → STK aprova (DID aprovado). STK credencia o SRV.
//   USER envia o DID aprovado pedindo o crachá e os serviços → SRV aprova o crachá e os acessos.
//   O acesso só vale com o crachá do mesmo SRV e a Identidade da STK.
// Três contextos separados (carteira, STK, Serviço 1); os tokens passam pelas caixas de texto.
const { test, expect } = require('@playwright/test');
const { WORDS, preparar, aba, toast, fecharSheet, payloadDe, vigiarCsp } = require('./helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {import('@playwright/test').Page} */ let stk;
/** @type {import('@playwright/test').Page} */ let servico;
let identidade = '';
let credenciamento = '';
let cracha = '';
let acessoAgenda = '';
/** @type {string[]} */ const violacoesCsp = [];

async function acaoCarteira(acao) {
  await carteira.click('#dockAdd');
  await carteira.click(`#sheetBody [data-act="${acao}"]`);
}

/** Pede na carteira e devolve o pedido assinado. Para Acesso, o nome vem da Identidade. */
async function pedirNaCarteira(tipo, servicos = '') {
  await acaoCarteira('ask');
  await carteira.selectOption('#aqT', tipo);
  if (tipo === 'IdentityCredential') await carteira.fill('#aqN', 'Ana Acesso');
  else await carteira.fill('#aqS', servicos);
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

async function receberNaCarteira(token, aviso = 'Credencial guardada') {
  await acaoCarteira('get');
  await carteira.fill('#rcT', token);
  await carteira.click('#rcGo');
  await expect(toast(carteira)).toHaveText(aviso);
}

/** Assina a apresentação direto na carteira, sem o filtro da tela, como faria uma carteira adulterada. */
async function apresentacaoAMao(emissor, desafio, credenciais) {
  const { nonce } = payloadDe(desafio);
  const aud = await emissor.evaluate(() => ses.did);
  return carteira.evaluate(([a, n, v]) => {
    const iat = now();
    return signJWT('vp+jwt', { iss: ses.did, sub: ses.did, aud: a, nonce: n, iat, exp: iat + 300,
      vp: { '@context': VC_CONTEXT, type: ['VerifiablePresentation'], holder: ses.did, verifiableCredential: v } });
  }, [aud, nonce, credenciais]);
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

test('01 · a STK (raiz) aprova Identidade e credencia serviço; a carteira pede Identidade, Crachá, Acesso ou Personalizado', async () => {
  await aba(stk, 'vIssue');
  await expect(stk.locator('#iType option')).toHaveText(['Identidade', 'Credenciamento', 'Personalizado']);
  await acaoCarteira('ask');
  await expect(carteira.locator('#aqT option')).toHaveText(['Identidade', 'Crachá', 'Acesso', 'Personalizado']);
  // Sem Identidade aprovada, não há pedido de crachá.
  await carteira.selectOption('#aqT', 'BadgeCredential');
  await expect(carteira.locator('#aqH')).toHaveText('Para pedir crachá ou acesso, você precisa de uma Identidade aprovada. Peça a Identidade primeiro.');
  await expect(carteira.locator('#aqNF')).toBeHidden();
  await expect(carteira.locator('#aqSF')).toBeVisible();
  await carteira.click('#aqGo');
  await expect(carteira.locator('#aqOut')).toBeHidden();
  await fecharSheet(carteira);
});

test('02 · USER pede a Identidade e a STK aprova (DID aprovado)', async () => {
  await conferirPedido(stk, await pedirNaCarteira('IdentityCredential'));
  await emitir(stk, ['Ana Acesso']);
  identidade = await emitido(stk);
  await receberNaCarteira(identidade);
});

test('03 · sem crachá não há pedido de acesso, e a STK não emite crachá', async () => {
  await acaoCarteira('ask');
  await carteira.selectOption('#aqT', 'AccessCredential');
  await expect(carteira.locator('#aqH')).toHaveText('Para pedir acesso, você precisa do crachá do serviço. Peça o crachá primeiro.');
  await fecharSheet(carteira);
  const pedido = await pedirNaCarteira('BadgeCredential', 'App Agenda');
  expect(payloadDe(pedido)).toMatchObject({ wanted: 'BadgeCredential', identidade, name: 'Ana Acesso', servicos: 'App Agenda' });
  await conferirPedido(stk, pedido);
  await expect(stk.locator('#iWho')).toContainText('Este emissor não emite Crachá');
});

test('04 · o SRV pede credenciamento e a STK credencia os serviços dele', async () => {
  await aba(servico, 'vGov');
  await servico.click('#gCred [data-cr="ask"]');
  await servico.fill('#caO', 'App Agenda, App Financeiro');
  await servico.click('#caGo');
  const pedido = await servico.inputValue('#caJ');
  await fecharSheet(servico);
  await conferirPedido(stk, pedido);
  await expect(stk.locator('#iType')).toHaveValue('AccreditationCredential');
  await emitir(stk, ['Serviço 1', 'App Agenda,  App Financeiro']);
  credenciamento = await emitido(stk);
  expect(payloadDe(credenciamento).vc.credentialSubject.apps).toBe('App Agenda, App Financeiro');
});

test('05 · o SRV importa o credenciamento (depois de confiar na STK) e passa a dar crachá e acesso', async () => {
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
  await expect(servico.locator('#gRole')).toHaveText('Serviço credenciado por STK: dá Crachá e Acesso a App Agenda, App Financeiro.');
  await aba(servico, 'vIssue');
  await expect(servico.locator('#iType option')).toHaveText(['Crachá', 'Acesso', 'Personalizado']);
  const recusa = await servico.evaluate(sub => issue(sub, 'IdentityCredential', { nome: 'X' }, 0, '', null).then(() => '', e => e.message), payloadDe(identidade).sub);
  expect(recusa).toBe('Este emissor é um serviço credenciado: ele dá Crachá e Acesso aos serviços dele. Identidades e credenciamentos são aprovados pela STK.');
});

test('06 · USER envia o DID aprovado pedindo o crachá e os serviços; o SRV aprova crachá e acessos juntos', async () => {
  // Com a política padrão, a Identidade da STK é recusada: a revogação dela não pode ser conferida aqui.
  await conferirPedido(servico, await pedirNaCarteira('BadgeCredential', 'App Agenda'));
  await expect(servico.locator('#iWho')).toContainText('Identidade não aceita');
  await aceitarStatusNaoVerificavel(servico);

  await conferirPedido(servico, await pedirNaCarteira('BadgeCredential', 'app agenda'));
  await expect(servico.locator('#iWho')).toContainText('Ana Acesso, aprovada por STK.');
  await expect(servico.locator('#iWho')).toContainText('Serviços pedidos');
  await expect(servico.locator('#iType')).toHaveValue('BadgeCredential');
  const agenda = servico.locator('#iAcc [data-acc="App Agenda"]'), fin = servico.locator('#iAcc [data-acc="App Financeiro"]');
  await expect(agenda.locator('[data-on]')).toBeChecked();
  await expect(fin.locator('[data-on]')).not.toBeChecked();
  await agenda.locator('[data-papel]').selectOption('operador');
  await emitir(servico, ['funcionário']);
  const linhas = (await emitido(servico)).split('\n');
  expect(linhas).toHaveLength(2);
  [cracha, acessoAgenda] = linhas;
  await expect(servico.locator('#iOk')).toContainText('Crachá e 1 acesso para Ana Acesso');
  const c = payloadDe(cracha), a = payloadDe(acessoAgenda);
  expect(c.vc.credentialSubject).toEqual({ id: c.sub, categoria: 'funcionário' });
  expect(c.vc.evidence).toEqual([{ type: 'Credenciamento', jwt: credenciamento }]);
  expect(a.vc.credentialSubject).toEqual({ id: a.sub, app: 'App Agenda', papel: 'operador' });

  await receberNaCarteira(linhas.join('\n'), '2 credenciais guardadas');
  await expect(carteira.locator('#cList')).toContainText('Funcionário de Serviço 1');
  await expect(carteira.locator('#cList')).toContainText('Operador em App Agenda');
});

test('07 · com o crachá, USER pede outro serviço; sem crachá o SRV não dá acesso', async () => {
  const semCracha = await servico.evaluate(([sub, id]) => issue(sub, 'AccessCredential', { app: 'App Agenda', papel: 'leitor' }, 365, '', null, { identidade: id }).then(() => '', e => e.message), [await stk.evaluate(() => ses.did), identidade]);
  expect(semCracha).toBe('Esta pessoa ainda não tem crachá deste serviço. Emita o crachá primeiro.');

  await conferirPedido(servico, await pedirNaCarteira('AccessCredential', 'App Financeiro'));
  await expect(servico.locator('#iType')).toHaveValue('AccessCredential');
  await emitir(servico, ['App Financeiro', 'leitor']);
  await receberNaCarteira(await emitido(servico));
  await expect(carteira.locator('#cList')).toContainText('Leitor em App Financeiro');
});

test('08 · o SRV confere o acesso com Identidade e crachá juntos', async () => {
  const vp = await apresentar(await desafioDeAcesso(servico, 'App Agenda', 'leitor'));
  expect(payloadDe(/** @type {string} */ (vp)).vp.verifiableCredential).toEqual([acessoAgenda, identidade, cracha]);
  const out = await conferir(servico, /** @type {string} */ (vp));
  await expect(out).toContainText('Apresentação aprovada');
  await expect(out.locator('.chk.no')).toHaveCount(0);
  await expect(out).toContainText('Funcionário de Serviço 1.');
  await expect(out).toContainText('Pode: ver, criar, editar.');
  expect(await apresentar(await desafioDeAcesso(servico, 'App Agenda', 'admin'))).toBeNull();
});

test('09 · acesso apresentado sem o crachá é recusado', async () => {
  const out = await conferir(servico, await apresentacaoAMao(servico, await desafioDeAcesso(servico, 'App Agenda', 'leitor'), [acessoAgenda, identidade]));
  await expect(out).toContainText('Apresentação recusada');
  await expect(out.locator('.chk.no')).toHaveCount(1);
  await expect(out.locator('.chk.no')).toContainText('Falta o crachá');
});

test('10 · a STK aceita o acesso do SRV pelo credenciamento e recusa depois de revogá-lo', async () => {
  await aceitarStatusNaoVerificavel(stk);
  let out = await conferir(stk, /** @type {string} */ (await apresentar(await desafioDeAcesso(stk, 'App Agenda', 'leitor'))));
  await expect(out).toContainText('Apresentação aprovada');
  await expect(out).toContainText('Serviço 1 é credenciado por Emissor de Credenciais Systekna para App Agenda.');
  await aba(stk, 'vGov');
  await stk.click(`#gIssued [data-iss="${payloadDe(credenciamento).vc.credentialStatus.statusListIndex}"]`);
  await stk.click('#rvGo');
  await stk.click('#cfOk');
  await expect(toast(stk)).toHaveText('Credencial revogada');
  out = await conferir(stk, /** @type {string} */ (await apresentar(await desafioDeAcesso(stk, 'App Agenda', 'leitor'))));
  await expect(out).toContainText('Apresentação recusada');
  await expect(out.locator('.chk.no')).toContainText('O credenciamento: revogação em');
});

test('10b · revogar o crachá no SRV derruba os acessos da pessoa', async () => {
  await aba(servico, 'vGov');
  await servico.click(`#gIssued [data-iss="${payloadDe(cracha).vc.credentialStatus.statusListIndex}"]`);
  await servico.click('#rvGo');
  await expect(servico.locator('#sheetBody')).toContainText('Os acessos desta pessoa também serão revogados.');
  await servico.click('#cfOk');
  await expect(toast(servico)).toHaveText('Credencial revogada');
  await aba(servico, 'vPanel');
  await expect(servico.locator('#pAtos')).toContainText('revogada: Crachá revogado');
  const out = await conferir(servico, /** @type {string} */ (await apresentar(await desafioDeAcesso(servico, 'App Financeiro', 'leitor'))));
  await expect(out).toContainText('Apresentação recusada');
  await expect(out).toContainText('Crachá revogado');
});

test('11 · nenhum fluxo esbarrou na CSP', async () => {
  expect(violacoesCsp).toEqual([]);
});
