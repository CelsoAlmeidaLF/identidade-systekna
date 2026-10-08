// @ts-check
// Cenário 2 (aprovado em 03/10/2026): o Serviço solicita à STK a aprovação de emissão de crachás (CV:KEY) dos apps
// dele; a STK aprova (pode desmarcar apps) ou recusa. Para um app novo, o serviço pede só ele, e várias aprovações
// ficam ativas ao mesmo tempo. Menu + no centro do rodapé, como na carteira.
const { test, expect } = require('@playwright/test');
const { WORDS, vigiarCsp, preparar, aba, toast, fecharSheet, payloadDe, bloquearEDesbloquear } = require('./helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let srv;
/** @type {import('@playwright/test').Page} */ let gov;
/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {string[]} */ const violacoesCsp = [];
let didSrv = '', didGov = '', didCarteira = '';
const DIA = 86_400;
const agora = () => Math.floor(Date.now() / 1000);

async function menu(acao) {
  await srv.click('#dockAdd');
  await srv.click(`#sheetBody [data-act="${acao}"]`);
}

async function adicionarApp(app) {
  await srv.fill('#saA', app);
  await srv.click('#saAdd');
}

/** Solicita pela tela com os apps dados; devolve o pedido assinado. */
async function solicitar(apps, nome) {
  await menu('ask');
  if (nome) await srv.fill('#saN', nome);
  for (const a of apps) await adicionarApp(a);
  await srv.click('#saGo');
  await expect(srv.locator('#saOut')).toBeVisible();
  const tok = await srv.inputValue('#saJ');
  await fecharSheet(srv);
  return tok;
}

async function conferirNaStk(tok) {
  await aba(gov, 'vIssue');
  if (await gov.locator('#iOut').isVisible()) await gov.click('#iNew');
  await gov.fill('#iqT', tok);
  await gov.click('#iqGo');
  await expect(gov.locator('#iWho')).toContainText('Pedido conferido');
}

async function aprovarNaStk() {
  const anterior = await gov.inputValue('#iJwt');
  await gov.click('#iGo');
  await expect(gov.locator('#iJwt')).not.toHaveValue(anterior);
  await expect(gov.locator('#iOk')).toContainText('Emissão aprovada');
  return gov.inputValue('#iJwt');
}

async function receber(tok) {
  await menu('get');
  await expect(srv.locator('#sheetBody h3')).toHaveText('Receber aprovação de emissão');
  await srv.fill('#srT', tok);
  await srv.click('#srGo');
  await expect(toast(srv)).toHaveText('Aprovação de emissão guardada');
}

test.beforeAll(async ({ browser }) => {
  [srv, gov, carteira] = await Promise.all([1, 2, 3].map(async () => (await browser.newContext()).newPage()));
  for (const p of [srv, gov, carteira]) vigiarCsp(p, violacoesCsp);
  await preparar(gov, 'governanca-systekna.html', WORDS.emissor);
  await preparar(srv, 'servicos-systekna.html', WORDS.servico);
  await preparar(carteira, 'carteira-systekna.html', WORDS.carteira);
  [didSrv, didGov, didCarteira] = await Promise.all([srv, gov, carteira].map(p => p.evaluate(() => ses.did)));
});

test.afterAll(async () => {
  for (const p of [srv, gov, carteira]) await p?.context().close();
});

test('rodapé com o + no centro e o menu com as três ações', async () => {
  const botoes = srv.locator('.dock > button');
  await expect(botoes).toHaveText(['Painel', 'Crachás', '', 'Portaria', 'Serviço']);
  await expect(botoes.nth(2)).toHaveId('dockAdd');
  await srv.click('#dockAdd');
  await expect(srv.locator('#sheetBody [data-act] b')).toHaveText(['Solicitar aprovação de emissão', 'Receber aprovação de emissão', 'Cartão do serviço']);
  await fecharSheet(srv);
  await expect(srv.locator('#pCred')).toContainText('Governança não informada');
});

let pedido1 = '';

test('solicitar: Governança informada uma vez, nome e apps; fica aguardando', async () => {
  await menu('ask');
  await srv.fill('#saN', 'Academia Boa Forma');
  await adicionarApp('Portaria');
  await adicionarApp('Aulas');
  await adicionarApp('portaria');
  await expect(srv.locator('#saH')).toHaveText('portaria já está na lista.');
  await adicionarApp('Lixo');
  await srv.click('#saL [data-rm="2"]');
  await expect(srv.locator('#saL .tx b')).toHaveText(['Portaria', 'Aulas']);

  await srv.fill('#saG', didSrv);
  await srv.click('#saGo');
  await expect(srv.locator('#saH')).toHaveText('Este é o DID do próprio serviço.');
  await srv.fill('#saG', didGov);
  await srv.click('#saGo');
  await expect(srv.locator('#saOut')).toBeVisible();
  pedido1 = await srv.inputValue('#saJ');
  await fecharSheet(srv);

  expect(pedido1).toMatch(/^SYSTEKNA:PEDIDO-CREDENCIAMENTO:/);
  const p = payloadDe(pedido1);
  expect([p.iss, p.aud, p.name, p.apps, p.wanted]).toEqual([didSrv, didGov, 'Academia Boa Forma', ['Portaria', 'Aulas'], 'ServiceAccreditationCredential']);
  await aba(srv, 'vPanel');
  await expect(srv.locator('#pAprov .pend')).toContainText('Aguardando aprovação');
  await expect(srv.locator('#pAprov .pend')).toContainText('Portaria · Aulas');
  await aba(srv, 'vSrv');
  await expect(srv.locator('#sNome')).toHaveText('Academia Boa Forma');
  await expect(srv.locator('#sGovD')).toHaveText(await srv.evaluate(d => shortDid(d), didGov));
});

test('a STK vê o cartão, desmarca um app e aprova a emissão', async () => {
  await conferirNaStk(pedido1);
  await expect(gov.locator('#iSrvNome')).toHaveText('Academia Boa Forma');
  await expect(gov.locator('#iTypeF')).toBeHidden();
  await expect(gov.locator('#iClaims')).toBeHidden();
  await expect(gov.locator('#iGo')).toHaveText('Aprovar emissão');
  await expect(gov.locator('#iSrvApps [data-app]')).toHaveCount(2);
  await gov.click('#iSrvApps [data-app="Aulas"]');
  const p = payloadDe(await aprovarNaStk());
  expect(p.sub).toBe(didSrv);
  expect(p.vc.credentialSubject).toEqual({ id: didSrv, servico: 'Academia Boa Forma', apps: ['Portaria'] });
  expect(p.exp - p.iat).toBe(365 * DIA);
});

test('sem nenhum app marcado, a STK não aprova', async () => {
  const tok = await solicitar(['Aulas']);
  await conferirNaStk(tok);
  await gov.click('#iSrvApps [data-app="Aulas"]');
  const antes = await gov.evaluate(() => st.issued.length);
  await gov.click('#iGo');
  await expect(toast(gov)).toHaveText('Escolha ao menos um app');
  expect(await gov.evaluate(() => st.issued.length)).toBe(antes);
});

test('o Serviços guarda a aprovação e mostra o cartão no Painel', async () => {
  await receber(await gov.inputValue('#iJwt'));
  // Um cartão por app, agrupados sob a organização aprovada pela Governança.
  await expect(srv.locator('#pOrgN')).toHaveText('Academia Boa Forma');
  await expect(srv.locator('#pOrgG')).toHaveText('Ecossistema aprovado pela Governança Systekna');
  const card = srv.locator('#pAprov .cred');
  await expect(card).toHaveCount(1);
  await expect(card.locator('.tipo')).toHaveText('App: Portaria');
  await expect(card.locator('.main')).toHaveCount(0);
  await expect(card.locator('.did .mono')).toHaveAttribute('title', didSrv);
  await expect(card.locator('.emissor')).toHaveText('Governança Systekna');
  await expect(card.locator('.pill')).toContainText('Até ');
  await card.locator('.did .cp').click();
  await expect(toast(srv)).toHaveText('DID copiado');
  // O pedido de Portaria saiu de "aguardando"; o de Aulas (pedido no teste anterior) continua.
  await expect(srv.locator('#pAprov .pend')).toHaveCount(1);
  await expect(srv.locator('#pAprov .pend')).toContainText('Aulas');
  await expect(srv.locator('#pCred')).toBeEmpty();
});

let pedidoPiscina = '';

test('app novo: pede só ele, e as duas aprovações ficam ativas', async () => {
  await menu('ask');
  await expect(srv.locator('#saOk')).toContainText('Portaria');
  await adicionarApp('Portaria');
  await expect(srv.locator('#saH')).toHaveText('Portaria já está aprovado.');
  await fecharSheet(srv);

  pedidoPiscina = await solicitar(['Piscina']);
  expect(payloadDe(pedidoPiscina).apps).toEqual(['Piscina']);
  await conferirNaStk(pedidoPiscina);
  await gov.selectOption('#iDays', '30');
  const tok = await aprovarNaStk();
  expect(payloadDe(tok).exp - payloadDe(tok).iat).toBe(30 * DIA);
  await receber(tok);

  await expect(srv.locator('#pAprov .cred')).toHaveCount(2);
  await expect(srv.locator('#pAprov .cred .tipo')).toHaveText(['App: Portaria', 'App: Piscina']);
  await expect(srv.locator('#pAprov .cred[data-app="Piscina"] .pill')).toContainText('Até ');
  expect(await srv.evaluate(() => credApps().sort())).toEqual(['Piscina', 'Portaria']);
  await expect(srv.locator('#sP')).toHaveText('2');
  // Na STK, as duas aprovações do serviço continuam ativas.
  expect(await gov.evaluate(d => st.issued.filter(i => i.sub === d && i.type === 'ServiceAccreditationCredential' && !i.revoked).length, didSrv)).toBe(2);
});

test('na STK, o cartão avisa quando um app já tem aprovação ativa', async () => {
  const iat = agora();
  const repetido = await srv.evaluate(async t => embrulhar(await signJWT('pedido+jwt', { iss: ses.did, sub: ses.did, aud: 'emissor', name: 'Academia Boa Forma', wanted: 'ServiceAccreditationCredential', apps: ['Portaria'], note: '', nonce: 'repetido', iat: t, exp: t + 3600 })), iat);
  await conferirNaStk(repetido);
  await expect(gov.locator('#iSrvApps [data-app="Portaria"]')).toContainText('Já aprovado até');
});

test('a STK recusa: fica no livro com o motivo e o serviço continua aguardando', async () => {
  const tok = await solicitar(['Sauna']);
  await conferirNaStk(tok);
  await gov.click('#iRec');
  await gov.selectOption('#rcM', 'Apps não autorizados');
  await gov.click('#rcGo');
  await expect(toast(gov)).toHaveText('Pedido recusado');
  expect(await gov.evaluate(() => st.book.at(-1).text)).toBe('Aprovação de emissão de Academia Boa Forma recusada: Apps não autorizados');
  await aba(srv, 'vPanel');
  await expect(srv.locator('#pAprov .pend').filter({ hasText: 'Sauna' })).toContainText('Aguardando aprovação');
});

test('o crachá de cada app leva a aprovação dele e nunca passa da validade dela', async () => {
  // A carteira tem a Identidade aprovada pela STK.
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="ask"]');
  await carteira.fill('#aqN', 'Maria Teste');
  await carteira.click('#aqGo');
  const pedidoId = await carteira.inputValue('#aqJ');
  await fecharSheet(carteira);
  await aba(gov, 'vIssue');
  if (await gov.locator('#iOut').isVisible()) await gov.click('#iNew');
  await gov.fill('#iqT', pedidoId);
  await gov.click('#iqGo');
  const anterior = await gov.inputValue('#iJwt');
  await gov.click('#iGo');
  await expect(gov.locator('#iJwt')).not.toHaveValue(anterior);
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="get"]');
  await carteira.fill('#rcT', await gov.inputValue('#iJwt'));
  await carteira.click('#rcGo');
  await expect(toast(carteira)).toHaveText('Credencial guardada');
  const identidade = await carteira.evaluate(() => creds()[0].data.jwt);

  const iat = agora();
  const pedidoCracha = await carteira.evaluate(async ([s, id, t]) => embrulhar(await signJWT('pedido+jwt', { iss: ses.did, sub: ses.did, aud: s, name: 'Maria Teste', wanted: 'BadgeCredential', apps: ['Portaria', 'Piscina'], identidade: id, note: '', nonce: 'cracha-1', iat: t, exp: t + 3600 })), [didSrv, identidade, iat]);
  await aba(srv, 'vBadge');
  await srv.fill('#cqT', pedidoCracha);
  await srv.click('#cqGo');
  await expect(srv.locator('#cWho')).toContainText('Pedido conferido');
  await srv.selectOption('#cDays', '0');
  await srv.click('#cGo');
  await expect(srv.locator('#cOut')).toBeVisible();
  const [portaria, piscina] = await Promise.all([0, 1].map(i => srv.inputValue(`#cList [data-cracha="${i}"]`)));
  const aprov = await srv.evaluate(() => st.aprovacoes.map(a => ({ apps: a.apps, jwt: a.jwt, exp: a.exp })));
  const de = app => aprov.find(a => a.apps.includes(app));
  expect(payloadDe(portaria).vc.evidence[0].credenciamento).toBe(de('Portaria').jwt);
  expect(payloadDe(piscina).vc.evidence[0].credenciamento).toBe(de('Piscina').jwt);
  expect(payloadDe(portaria).exp).toBe(de('Portaria').exp);
  expect(payloadDe(piscina).exp).toBe(de('Piscina').exp);

  // Portaria do app da segunda aprovação.
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="get"]');
  await carteira.fill('#rcT', piscina);
  await carteira.click('#rcGo');
  await expect(toast(carteira)).toHaveText('Credencial guardada');
  await aba(srv, 'vGate');
  await srv.selectOption('#gaApp', 'Piscina');
  await srv.click('#gaGen');
  await expect(srv.locator('#gaChal')).toBeVisible();
  await carteira.click('#dockShow');
  await carteira.fill('#apT', await srv.inputValue('#gaChalT'));
  await carteira.click('#apGo');
  await carteira.locator('#apC [data-pk]').filter({ hasText: 'Crachá' }).first().click();
  await carteira.click('#apSign');
  const prova = await carteira.inputValue('#apJ');
  await fecharSheet(carteira);
  await srv.fill('#gaPT', prova);
  await srv.click('#gaGo');
  await expect(srv.locator('#gaOut')).toContainText('Acesso liberado');
  await expect(srv.locator('#gaOut .chk.ok').filter({ hasText: 'Aprovação de emissão vigente' })).toHaveCount(1);
});

test('o Cartão do serviço leva todas as aprovações válidas', async () => {
  await menu('card');
  const cartao = await srv.inputValue('#scJ');
  await fecharSheet(srv);
  const p = payloadDe(cartao);
  expect(p.apps.sort()).toEqual(['Piscina', 'Portaria']);
  expect(p.aprovacoes).toHaveLength(2);
});

test('tocar no cartão de um app gera o Cartão só daquele app, com a aprovação dele', async () => {
  await aba(srv, 'vPanel');
  await srv.click('#pAprov [data-app="Piscina"]');
  await expect(srv.locator('#sheetBody h3')).toHaveText('Cartão do app Piscina');
  const cartao = await srv.inputValue('#scJ');
  await fecharSheet(srv);
  expect(cartao).toMatch(/^SYSTEKNA:CARTAO-APP:ey/);
  const p = payloadDe(cartao);
  const aprov = await srv.evaluate(() => st.aprovacoes.map(a => ({ apps: a.apps, jwt: a.jwt, exp: a.exp })));
  const piscina = aprov.find(a => a.apps.includes('Piscina'));
  expect([p.iss, p.app, p.apps, p.aprovacoes, p.exp]).toEqual([didSrv, 'Piscina', ['Piscina'], [piscina.jwt], piscina.exp]);
  expect(await carteira.evaluate(async t => (await verifyJWT(t, 'cartao+jwt')).ok, cartao)).toBe(true);

  // O copiar do cartão só copia o DID, não abre o Cartão do app.
  await srv.click('#pAprov [data-app="Piscina"] [data-copydid]');
  await expect(toast(srv)).toHaveText('DID copiado');
  await expect(srv.locator('#sheetBody h3')).toBeHidden();
});

test('app com a aprovação vencida não tem cartão', async () => {
  const antes = await srv.evaluate(async () => { const a = st.aprovacoes.find(x => x.apps.includes('Piscina')), e = a.exp; a.exp = now() - 60; await save(); renderPanel(); return e; });
  await srv.click('#pAprov [data-app="Piscina"]');
  await expect(toast(srv)).toHaveText('A aprovação de emissão deste app venceu.');
  await expect(srv.locator('#sheetBody h3')).toBeHidden();
  await srv.evaluate(async e => { st.aprovacoes.find(x => x.apps.includes('Piscina')).exp = e; await save(); renderPanel(); }, antes);
});

test('um serviço da 0.18 (credenciamento único) vira uma aprovação de emissão', async () => {
  await srv.evaluate(async () => { st.cred = st.aprovacoes[0]; delete st.aprovacoes; await save(); });
  await bloquearEDesbloquear(srv);
  expect(await srv.evaluate(() => [st.aprovacoes.length, 'cred' in st])).toEqual([1, false]);
});

test('nenhuma violação de CSP em todo o fluxo acima', () => {
  expect(violacoesCsp).toEqual([]);
  expect(didCarteira).toMatch(/^did:key:/);
});
