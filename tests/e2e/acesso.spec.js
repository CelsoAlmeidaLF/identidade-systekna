// @ts-check
// Cenário 3 (aprovado em 03/10/2026): a pessoa solicita acesso a um app aprovado; o Serviço aprova (emite o crachá
// CV:KEY) ou recusa (recusa assinada para o cliente). O crachá tem cartão próprio na carteira e dá acesso pela portaria.
const { test, expect } = require('@playwright/test');
const { WORDS, vigiarCsp, preparar, aba, toast, fecharSheet, payloadDe } = require('./helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {import('@playwright/test').Page} */ let gov;
/** @type {import('@playwright/test').Page} */ let srv;
/** @type {string[]} */ const violacoesCsp = [];
let didSrv = '', didGov = '', didProf = '', aprovProf = '', cartao = '';

async function menuCarteira(acao) {
  await carteira.click('#dockAdd');
  await carteira.click(`#sheetBody [data-act="${acao}"]`);
}

/** STK aprova o pedido colado (identidade ou emissão) e devolve a aprovação. */
async function aprovarNaStk(pedido) {
  await aba(gov, 'vIssue');
  if (await gov.locator('#iOut').isVisible()) await gov.click('#iNew');
  await gov.fill('#iqT', pedido);
  await gov.click('#iqGo');
  const anterior = await gov.inputValue('#iJwt');
  await gov.click('#iGo');
  await expect(gov.locator('#iJwt')).not.toHaveValue(anterior);
  return gov.inputValue('#iJwt');
}

async function solicitarIdentidade(n, nome, perfil) {
  await menuCarteira('ask');
  await carteira.click(`#aqL [data-n="${n}"]`);
  await carteira.fill('#aqN', nome);
  if (perfil) await carteira.selectOption('#aqP', perfil);
  await carteira.click('#aqGo');
  await expect(carteira.locator('#aqOut')).toBeVisible();
  await expect(carteira.locator('#aqJ')).not.toHaveValue('');
  const tok = await carteira.inputValue('#aqJ');
  await fecharSheet(carteira);
  return tok;
}

async function receberIdentidade(tok) {
  await menuCarteira('get');
  await carteira.fill('#rcT', tok);
  await carteira.click('#rcGo');
  await expect(toast(carteira)).toHaveText('Credencial guardada');
}

/** Lê o cartão na carteira, escolhe apps e a identidade, assina e devolve o pedido. */
async function pedirAcesso(apps, identidade) {
  await menuCarteira('access');
  await carteira.fill('#paC', cartao);
  await carteira.click('#paLer');
  await expect(carteira.locator('#paApps')).toBeVisible();
  for (const a of apps) await carteira.click(`#paApps [data-app="${a}"]`);
  if (identidade !== undefined) await carteira.selectOption('#paI', String(identidade));
  await carteira.click('#paGo');
  await expect(carteira.locator('#paOut')).toBeVisible();
  await expect(carteira.locator('#paJ')).not.toHaveValue('');
  const tok = await carteira.inputValue('#paJ');
  await fecharSheet(carteira);
  return tok;
}

async function conferirNoServico(tok) {
  await aba(srv, 'vBadge');
  if (await srv.locator('#cOut').isVisible()) await srv.click('#cNew');
  await srv.fill('#cqT', tok);
  await srv.click('#cqGo');
}

async function receberCracha(tok) {
  await menuCarteira('badge');
  await expect(carteira.locator('#sheetBody h3')).toHaveText('Receber crachá de acesso');
  await carteira.fill('#rbT', tok);
  await carteira.click('#rbGo');
}

test.beforeAll(async ({ browser }) => {
  [carteira, gov, srv] = await Promise.all([1, 2, 3].map(async () => (await browser.newContext()).newPage()));
  for (const p of [carteira, gov, srv]) vigiarCsp(p, violacoesCsp);
  await preparar(gov, 'governanca-systekna.html', WORDS.emissor);
  await preparar(srv, 'servicos-systekna.html', WORDS.servico);
  await preparar(carteira, 'carteira-systekna.html', WORDS.carteira);
  [didSrv, didGov] = await Promise.all([srv, gov].map(p => p.evaluate(() => ses.did)));

  // Identidades aprovadas pela STK: a nº 0 e uma Profissional.
  await receberIdentidade(await aprovarNaStk(await solicitarIdentidade(0, 'Maria Silva')));
  const pedidoProf = await solicitarIdentidade('novo', 'Maria S. Consultora', 'profissional');
  didProf = payloadDe(pedidoProf).iss;
  aprovProf = await aprovarNaStk(pedidoProf);
  await receberIdentidade(aprovProf);

  // Serviço com Câmbio e Taxômetro aprovados pela STK.
  await srv.click('#dockAdd');
  await srv.click('#sheetBody [data-act="ask"]');
  await srv.fill('#saN', 'Meus Serviços Financeiros');
  for (const a of ['Câmbio', 'Taxômetro']) { await srv.fill('#saA', a); await srv.click('#saAdd'); }
  await srv.fill('#saG', didGov);
  await srv.click('#saGo');
  // Espera o pedido assinado aparecer: a assinatura termina depois do clique.
  await expect(srv.locator('#saJ')).not.toHaveValue('');
  const pedidoSrv = await srv.inputValue('#saJ');
  await fecharSheet(srv);
  const aprovSrv = await aprovarNaStk(pedidoSrv);
  await srv.click('#dockAdd');
  await srv.click('#sheetBody [data-act="get"]');
  await srv.fill('#srT', aprovSrv);
  await srv.click('#srGo');
  await expect(toast(srv)).toHaveText('Aprovação de emissão guardada');
  await srv.click('#dockAdd');
  await srv.click('#sheetBody [data-act="card"]');
  await expect(srv.locator('#scJ')).not.toHaveValue('');
  cartao = await srv.inputValue('#scJ');
  await fecharSheet(srv);
});

test.afterAll(async () => {
  for (const p of [carteira, gov, srv]) await p?.context().close();
});

test('o menu + da carteira tem as cinco ações', async () => {
  await carteira.click('#dockAdd');
  await expect(carteira.locator('#sheetBody [data-act] b')).toHaveText([
    'Solicitar aprovação de identidade', 'Receber aprovação de identidade', 'Solicitar acesso a um app', 'Receber crachá de acesso', 'Apresentar credencial',
  ]);
  await fecharSheet(carteira);
});

test('a carteira lê o Cartão do serviço e mostra só as identidades aprovadas', async () => {
  await menuCarteira('access');
  await carteira.fill('#paC', cartao);
  await carteira.click('#paLer');
  await expect(carteira.locator('#paStep')).toContainText('Meus Serviços Financeiros');
  await expect(carteira.locator('#paApps [data-app]')).toHaveText(['Câmbio', 'Taxômetro']);
  await expect(carteira.locator('#paI option')).toHaveText(['Maria Silva · Identidade', 'Maria S. Consultora · Profissional']);
  await fecharSheet(carteira);
});

test('cartão alterado ou com apps de outra Governança é recusado; sem identidade aprovada também', async ({ browser }) => {
  const ler = async (page, texto) => {
    await page.click('#dockAdd');
    await page.click('#sheetBody [data-act="access"]');
    await page.fill('#paC', texto);
    await page.click('#paLer');
    const h = await page.locator('#paH').textContent();
    await fecharSheet(page);
    return h;
  };
  const [pre, h, , sig] = cartao.match(/^(SYSTEKNA:CARTAO-SERVICO:)([^.]+)\.([^.]+)\.(.+)$/).slice(1);
  const alterado = `${pre}${h}.${Buffer.from(JSON.stringify({ ...payloadDe(cartao), apps: ['Tudo'] })).toString('base64url')}.${sig}`;
  expect(await ler(carteira, alterado)).toBe('A assinatura do cartão não confere: ele foi alterado.');

  // Cartão com uma aprovação que não veio da Governança da identidade (assinada pelo próprio serviço).
  const falso = await srv.evaluate(async () => {
    const iat = now();
    const aprov = await signJWT('vc+jwt', { iss: ses.did, sub: ses.did, iat, nbf: iat, jti: 'urn:uuid:' + crypto.randomUUID(), vc: { '@context': VC_CONTEXT, type: ['VerifiableCredential', 'ServiceAccreditationCredential'], issuer: { id: ses.did, name: 'Falsa' }, credentialSubject: { id: ses.did, servico: 'X', apps: ['Câmbio'] } } });
    return embrulhar(await signJWT('cartao+jwt', { iss: ses.did, name: 'X', apps: ['Câmbio'], aprovacoes: [aprov], iat }));
  });
  expect(await ler(carteira, falso)).toBe('Este serviço não tem apps aprovados pela mesma Governança da sua identidade.');

  const nova = await (await browser.newContext()).newPage();
  vigiarCsp(nova, violacoesCsp);
  await preparar(nova, 'carteira-systekna.html', WORDS.outroEmissor);
  expect(await ler(nova, cartao)).toBe('Você ainda não tem identidade aprovada. Use + › Solicitar aprovação de identidade.');
  await nova.context().close();
});

/** Gera no Serviço o Cartão do app, tocando no cartão dele no painel. */
async function cartaoDoApp(app) {
  await aba(srv, 'vPanel');
  await srv.click(`#pAprov [data-app="${app}"]`);
  await expect(srv.locator('#scJ')).not.toHaveValue('');
  const tok = await srv.inputValue('#scJ');
  await fecharSheet(srv);
  return tok;
}

test('o Cartão do app mostra só aquele app, já marcado', async () => {
  const doApp = await cartaoDoApp('Câmbio');
  expect(doApp).toMatch(/^SYSTEKNA:CARTAO-APP:/);
  await menuCarteira('access');
  await carteira.fill('#paC', doApp);
  await carteira.click('#paLer');
  await expect(carteira.locator('#paStep')).toContainText('Câmbio · Meus Serviços Financeiros');
  await expect(carteira.locator('#paApps [data-app]')).toHaveText(['Câmbio']);
  await expect(carteira.locator('#paApps [data-app="Câmbio"]')).toHaveAttribute('aria-pressed', 'true');
  await carteira.selectOption('#paI', '0');
  await carteira.click('#paGo');
  await expect(carteira.locator('#paJ')).not.toHaveValue('');
  const p = payloadDe(await carteira.inputValue('#paJ'));
  expect([p.aud, p.apps]).toEqual([didSrv, ['Câmbio']]);
  await fecharSheet(carteira);
  // O pedido de teste sai da lista para não atrapalhar os próximos passos.
  await carteira.evaluate(async n => { const it = ses.items.find(i => i.data.type === 'acesso' && i.data.nonce === n); ses.items = ses.items.filter(i => i !== it); await persistItems(); }, p.nonce);
});

test('Cartão do app alterado ou com app fora da aprovação é recusado', async () => {
  const ler = async texto => {
    await menuCarteira('access');
    await carteira.fill('#paC', texto);
    await carteira.click('#paLer');
    const h = await carteira.locator('#paH').textContent();
    await fecharSheet(carteira);
    return h;
  };
  const doApp = await cartaoDoApp('Câmbio');
  const [pre, h, , sig] = doApp.match(/^(SYSTEKNA:CARTAO-APP:)([^.]+)\.([^.]+)\.(.+)$/).slice(1);
  const alterado = `${pre}${h}.${Buffer.from(JSON.stringify({ ...payloadDe(doApp), app: 'Taxômetro', apps: ['Taxômetro'] })).toString('base64url')}.${sig}`;
  expect(await ler(alterado)).toBe('A assinatura do cartão não confere: ele foi alterado.');

  // Assinado pelo serviço, mas com um app que a aprovação da Governança não cobre.
  const fora = await srv.evaluate(async () => {
    const a = st.aprovacoes[0];
    return embrulhar(await signJWT('cartao+jwt', { iss: ses.did, name: nomeServico(), app: 'Piscina', apps: ['Piscina'], aprovacoes: [a.jwt], iat: now() }));
  });
  expect(await ler(fora)).toBe('Este app não foi aprovado pela mesma Governança da sua identidade.');
});

let pedidoCambio = '';

test('o pedido sai assinado pela identidade escolhida, com a aprovação dela, e fica aguardando', async () => {
  pedidoCambio = await pedirAcesso(['Câmbio'], 1);
  expect(pedidoCambio).toMatch(/^SYSTEKNA:PEDIDO-CRACHA:/);
  const p = payloadDe(pedidoCambio);
  expect([p.iss, p.aud, p.apps, p.perfil, p.name, p.wanted]).toEqual([didProf, didSrv, ['Câmbio'], 'Profissional', 'Maria S. Consultora', 'BadgeCredential']);
  expect(p.identidade).toBe(aprovProf.replace(/^SYSTEKNA:[A-Z-]+:/, ''));
  await aba(carteira, 'vCreds');
  await expect(carteira.locator('#cList .acesso')).toContainText('Acesso a Câmbio');
  await expect(carteira.locator('#cList .acesso')).toContainText('Aguardando');
});

let cracha = '';

test('o Serviço vê o cartão de análise e aprova o acesso', async () => {
  await conferirNoServico(pedidoCambio);
  await expect(srv.locator('#cNome')).toHaveText('Maria S. Consultora');
  await expect(srv.locator('#cPerfil')).toHaveText('Profissional');
  await expect(srv.locator('#cGo')).toHaveText('Aprovar acesso');
  await expect(srv.locator('#cRec')).toBeVisible();
  await expect(srv.locator('#cApps [data-app="Câmbio"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(srv.locator('#cApps [data-app="Taxômetro"]')).toHaveAttribute('aria-pressed', 'false');
  await srv.click('#cGo');
  await expect(srv.locator('#cOut')).toBeVisible();
  cracha = await srv.inputValue('#cList [data-cracha="0"]');
  expect(cracha).toMatch(/^SYSTEKNA:CRACHA:/);
  expect(payloadDe(cracha).sub).toBe(didProf);
});

test('a carteira recebe o crachá e mostra o cartão próprio com a cv:key', async () => {
  await receberCracha(cracha);
  await expect(toast(carteira)).toHaveText('Crachá guardado');
  const card = carteira.locator('#cList .cred.cracha');
  await expect(card).toHaveCount(1);
  await expect(card.locator('.tipo')).toHaveText('CRACHÁ: APP Câmbio');
  await expect(card.locator('.main')).toHaveText('Meus Serviços Financeiros');
  const cv = await carteira.evaluate(j => cvKey(j), payloadDe(cracha).jti);
  expect(cv).toMatch(/^cv:key:z[1-9A-HJ-NP-Za-km-z]{20,23}$/);
  await expect(card.locator('.did .cv')).toHaveText(cv);
  await expect(card.locator('.quem')).toHaveText('Identidade: Profissional');
  await expect(card.locator('.pill')).toContainText('Até ');
  await card.locator('.did .cp').click();
  await expect(toast(carteira)).toHaveText('cv:key copiada');
  // O pedido atendido saiu de "aguardando".
  await expect(carteira.locator('#cList .acesso')).toHaveCount(0);
});

test('o Serviço recusa: a recusa assinada chega à carteira como "Recusado: motivo"', async () => {
  const pedido = await pedirAcesso(['Taxômetro'], 0);
  await conferirNoServico(pedido);
  await srv.click('#cRec');
  await srv.selectOption('#rxM', 'Não é cliente');
  await srv.click('#rxGo');
  await expect(toast(srv)).toHaveText('Pedido recusado');
  const recusa = await srv.inputValue('#cList [data-recusa]');
  expect(recusa).toMatch(/^SYSTEKNA:RECUSA:/);
  expect(await srv.evaluate(() => st.book.at(-1).text)).toBe('Acesso de Maria Silva recusado: Não é cliente');

  await receberCracha(recusa);
  await expect(toast(carteira)).toHaveText('Recusa registrada');
  await expect(carteira.locator('#cList .acesso')).toContainText('Acesso a Taxômetro');
  await expect(carteira.locator('#cList .acesso')).toContainText('Recusado: Não é cliente');

  await conferirNoServico(pedido);
  await expect(srv.locator('#cqH')).toHaveText('Este pedido já foi recusado. A pessoa pode enviar um pedido novo.');
});

test('com o crachá, a pessoa tem acesso ao app pela portaria', async () => {
  await aba(srv, 'vGate');
  await srv.selectOption('#gaApp', 'Câmbio');
  await srv.click('#gaGen');
  await expect(srv.locator('#gaChal')).toBeVisible();
  await carteira.click('#dockShow');
  await carteira.fill('#apT', await srv.inputValue('#gaChalT'));
  await carteira.click('#apGo');
  await carteira.locator('#apC [data-pk]').filter({ hasText: 'Crachá' }).click();
  await carteira.click('#apSign');
  const prova = await carteira.inputValue('#apJ');
  await fecharSheet(carteira);
  expect(payloadDe(prova).iss).toBe(didProf);
  await srv.fill('#gaPT', prova);
  await srv.click('#gaGo');
  await expect(srv.locator('#gaOut')).toContainText('Acesso liberado');
  await expect(srv.locator('#gaOut')).toContainText('Maria S. Consultora pode entrar em Câmbio');
});

test('nenhuma violação de CSP em todo o fluxo acima', () => {
  expect(violacoesCsp).toEqual([]);
});
