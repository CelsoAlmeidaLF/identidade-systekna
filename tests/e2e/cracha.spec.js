// @ts-check
// F10: duas camadas na carteira, com cadeia de confiança na STK.
//   Identidade (DID:KEY): quem é o usuário. USER pede → STK aprova.
//   Crachá (CV:KEY): o que o usuário acessa e em qual sistema (app + papel). USER envia o DID aprovado
//   e os apps → SRV credenciado pela STK aprova um crachá por app. O usuário pode ter N crachás.
// Três contextos separados (carteira, STK, Serviço 1); os tokens passam pelas caixas de texto.
const { test, expect } = require('@playwright/test');
const { WORDS, preparar, aba, toast, fecharSheet, payloadDe, vigiarCsp } = require('./helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {import('@playwright/test').Page} */ let stk;
/** @type {import('@playwright/test').Page} */ let servico;
let identidade = '';
let credenciamento = '';
let crachaAgenda = '';
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
  await expect(emissor.locator('#iOk')).toContainText('Credencial aprovada');
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

async function desafioDeCracha(emissor, app, papelMin) {
  await aba(emissor, 'vVerify');
  await emissor.selectOption('#vType', 'BadgeCredential');
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

test('01 · a STK (raiz) aprova Identidade e credencia serviço; a carteira pede só Identidade ou Crachá', async () => {
  await aba(stk, 'vIssue');
  await expect(stk.locator('#iType option')).toHaveText(['Identidade', 'Credenciamento']);
  await acaoCarteira('ask');
  await expect(carteira.locator('#aqT option')).toHaveText(['Identidade (DID:KEY), aprovada pela STK', 'Crachá (CV:KEY), aprovado pelo serviço']);
  // Sem Identidade aprovada, não há pedido de crachá.
  await carteira.selectOption('#aqT', 'BadgeCredential');
  await expect(carteira.locator('#aqH')).toHaveText('Para pedir crachá, você precisa da Identidade aprovada pela STK. Peça a Identidade primeiro.');
  await expect(carteira.locator('#aqNF')).toBeHidden();
  await expect(carteira.locator('#aqSF')).toBeVisible();
  await carteira.click('#aqGo');
  await expect(carteira.locator('#aqOut')).toBeHidden();
  await fecharSheet(carteira);
});

test('02 · USER pede a Identidade e a STK aprova: o cartão mostra o DID:KEY', async () => {
  await conferirPedido(stk, await pedirNaCarteira('IdentityCredential'));
  await emitir(stk, ['Ana Acesso']);
  identidade = await emitido(stk);
  await receberNaCarteira(identidade);
  const cartao = carteira.locator('#cList .cred.g-IdentityCredential');
  await expect(cartao).toContainText('Ana Acesso');
  await expect(cartao.locator('.key')).toContainText('DID:KEY');
  await expect(cartao).toContainText('Aprovada por Emissor de Credenciais Systekna');
});

test('03 · a STK não aprova crachá', async () => {
  const pedido = await pedirNaCarteira('BadgeCredential', 'App Agenda');
  expect(payloadDe(pedido)).toMatchObject({ wanted: 'BadgeCredential', identidade, name: 'Ana Acesso', servicos: 'App Agenda' });
  await conferirPedido(stk, pedido);
  await expect(stk.locator('#iWho')).toContainText('Este emissor não emite Crachá');
  await expect(stk.locator('#iWho')).toContainText('Crachá é aprovado pelo serviço credenciado pela STK.');
});

test('04 · o SRV pede credenciamento e a STK credencia os apps dele', async () => {
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

test('05 · o SRV importa o credenciamento (depois de confiar na STK) e passa a aprovar só crachás', async () => {
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
  await expect(servico.locator('#gRole')).toHaveText('Serviço credenciado por STK: aprova Crachás para App Agenda, App Financeiro.');
  await aba(servico, 'vIssue');
  await expect(servico.locator('#iType option')).toHaveText(['Crachá']);
  const recusa = await servico.evaluate(sub => issue(sub, 'IdentityCredential', { nome: 'X' }, 0, '', null).then(() => '', e => e.message), payloadDe(identidade).sub);
  expect(recusa).toBe('Este emissor é um serviço credenciado: ele aprova Crachás para os apps dele. Identidades e credenciamentos são aprovados pela STK.');
});

test('06 · USER envia o DID aprovado e os apps; o SRV aprova um crachá (CV:KEY) por app', async () => {
  // Com a política padrão, a Identidade da STK é recusada: a revogação dela não pode ser conferida aqui.
  await conferirPedido(servico, await pedirNaCarteira('BadgeCredential', 'App Agenda, App Financeiro'));
  await expect(servico.locator('#iWho')).toContainText('Identidade não aceita');
  await aceitarStatusNaoVerificavel(servico);

  await conferirPedido(servico, await pedirNaCarteira('BadgeCredential', 'app agenda, App Financeiro'));
  await expect(servico.locator('#iWho')).toContainText('Ana Acesso, aprovada por STK.');
  await expect(servico.locator('#iWho')).toContainText('Apps pedidos');
  await expect(servico.locator('#iTypeF')).toBeHidden();
  const agenda = servico.locator('#iAcc [data-acc="App Agenda"]'), fin = servico.locator('#iAcc [data-acc="App Financeiro"]');
  await expect(agenda.locator('[data-on]')).toBeChecked();
  await expect(fin.locator('[data-on]')).toBeChecked();
  await agenda.locator('[data-papel]').selectOption('operador');
  await servico.selectOption('#iDays', '0');
  await servico.click('#iGo');
  await expect(toast(servico)).toHaveText('O Crachá precisa de validade.');
  await servico.selectOption('#iDays', '365');
  await servico.click('#iGo');
  const linhas = (await emitido(servico)).split('\n');
  expect(linhas).toHaveLength(2);
  crachaAgenda = linhas[0];
  await expect(servico.locator('#iOk')).toContainText('2 crachás para Ana Acesso');
  const c = payloadDe(crachaAgenda);
  expect(c.vc.type).toEqual(['VerifiableCredential', 'BadgeCredential']);
  expect(c.vc.credentialSubject).toEqual({ id: c.sub, app: 'App Agenda', papel: 'operador' });
  expect(c.vc.evidence).toEqual([{ type: 'Credenciamento', jwt: credenciamento }]);

  await receberNaCarteira(linhas.join('\n'), '2 credenciais guardadas');
  await expect(carteira.locator('#cList')).toContainText('Operador em App Agenda');
  await expect(carteira.locator('#cList')).toContainText('Leitor em App Financeiro');
});

test('07 · cada crachá mostra o CV:KEY e a cor separa Identidade de Crachá', async () => {
  await expect(carteira.locator('#cList .legend')).toHaveText(/Identidade \(DID:KEY\): quem você é.*Crachá \(CV:KEY\): o que você acessa/);
  const crachas = carteira.locator('#cList .cred.g-BadgeCredential');
  await expect(crachas).toHaveCount(2);
  await expect(crachas.first().locator('.key')).toContainText('CV:KEY');
  await expect(crachas.first()).toContainText('Aprovada por Serviço 1');
  const fundo = sel => carteira.locator(sel).first().evaluate(e => getComputedStyle(e).backgroundImage);
  expect(await fundo('.cred.g-IdentityCredential')).not.toBe(await fundo('.cred.g-BadgeCredential'));
  // Crachás do mesmo serviço: mesma bolinha; a Identidade (STK) não tem.
  const bolinhas = await crachas.locator('.srvdot').evaluateAll(l => l.map(e => e.style.getPropertyValue('--sc')));
  expect(new Set(bolinhas).size).toBe(1);
  await expect(carteira.locator('#cList .cred.g-IdentityCredential .srvdot')).toHaveCount(0);
  // O detalhe mostra o CV:KEY inteiro (o número da credencial).
  await carteira.locator('#cList .cred', { hasText: 'App Agenda' }).click();
  await expect(carteira.locator('#sheetBody')).toContainText(payloadDe(crachaAgenda).jti);
  await fecharSheet(carteira);
});

test('08 · o SRV confere o crachá com a Identidade junto', async () => {
  const vp = await apresentar(await desafioDeCracha(servico, 'App Agenda', 'leitor'));
  expect(payloadDe(/** @type {string} */ (vp)).vp.verifiableCredential).toEqual([crachaAgenda, identidade]);
  const out = await conferir(servico, /** @type {string} */ (vp));
  await expect(out).toContainText('Apresentação aprovada');
  await expect(out.locator('.chk.no')).toHaveCount(0);
  await expect(out).toContainText('Crachá de Ana Acesso');
  await expect(out).toContainText('Pode: ver, criar, editar.');
  expect(await apresentar(await desafioDeCracha(servico, 'App Agenda', 'admin'))).toBeNull();
  expect(await apresentar(await desafioDeCracha(servico, 'Outro App', 'leitor'))).toBeNull();
});

test('09 · crachá apresentado sem a Identidade é recusado', async () => {
  const out = await conferir(servico, await apresentacaoAMao(servico, await desafioDeCracha(servico, 'App Agenda', 'leitor'), [crachaAgenda]));
  await expect(out).toContainText('Apresentação recusada');
  await expect(out.locator('.chk.no')).toHaveCount(1);
  await expect(out.locator('.chk.no')).toContainText('Falta a Identidade');
});

test('10 · a STK aceita o crachá do SRV pelo credenciamento e recusa depois de revogá-lo', async () => {
  await aceitarStatusNaoVerificavel(stk);
  let out = await conferir(stk, /** @type {string} */ (await apresentar(await desafioDeCracha(stk, 'App Agenda', 'leitor'))));
  await expect(out).toContainText('Apresentação aprovada');
  await expect(out).toContainText('Serviço 1 é credenciado por Emissor de Credenciais Systekna para App Agenda.');
  await aba(stk, 'vGov');
  await stk.click(`#gIssued [data-iss="${payloadDe(credenciamento).vc.credentialStatus.statusListIndex}"]`);
  await stk.click('#rvGo');
  await stk.click('#cfOk');
  await expect(toast(stk)).toHaveText('Credencial revogada');
  out = await conferir(stk, /** @type {string} */ (await apresentar(await desafioDeCracha(stk, 'App Agenda', 'leitor'))));
  await expect(out).toContainText('Apresentação recusada');
  await expect(out.locator('.chk.no')).toContainText('O credenciamento: revogação em');
});

test('10b · revogar um crachá no SRV vale só para aquele app', async () => {
  await aba(servico, 'vGov');
  await servico.click(`#gIssued [data-iss="${payloadDe(crachaAgenda).vc.credentialStatus.statusListIndex}"]`);
  await servico.click('#rvGo');
  await servico.click('#cfOk');
  await expect(toast(servico)).toHaveText('Credencial revogada');
  let out = await conferir(servico, /** @type {string} */ (await apresentar(await desafioDeCracha(servico, 'App Agenda', 'leitor'))));
  await expect(out).toContainText('Apresentação recusada');
  out = await conferir(servico, /** @type {string} */ (await apresentar(await desafioDeCracha(servico, 'App Financeiro', 'leitor'))));
  await expect(out).toContainText('Apresentação aprovada');
});

test('11 · nenhum fluxo esbarrou na CSP', async () => {
  expect(violacoesCsp).toEqual([]);
});
