// @ts-check
// Cenário 3 (aprovado em 03/10/2026): a pessoa solicita acesso a um app aprovado; o Serviço aprova (emite o crachá
// CV:KEY) ou recusa (recusa assinada para o cliente). O crachá tem cartão próprio na carteira e dá acesso pela portaria.
const { test, expect } = require('@playwright/test');
const { buscarRespostas, ultimoPedidoPara, entregarNaCarteira, receberPedido, WORDS, vigiarCsp, preparar, aba, toast, fecharSheet, payloadDe } = require('../../compartilhado/tests/helpers');

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
  await receberPedido(gov, pedido);
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
  await carteira.selectOption('#aqE', await gov.evaluate(() => ses.did));
  await carteira.click('#aqGo');
  await expect(toast(carteira)).toHaveText(/^Pedido enviado/);
  const tok = await ultimoPedidoPara(gov);
  return tok;
}

async function receberIdentidade(tok) {
  expect(await entregarNaCarteira(carteira, tok)).toBe('Credencial guardada');
}

/** Escolhe o serviço no diretório, os apps e a identidade, envia pela fila e devolve o pedido (aberto pelo serviço). */
async function pedirAcesso(apps, identidade) {
  await menuCarteira('access');
  await carteira.click(`#paS [data-srv="${didSrv}"]`);
  await expect(carteira.locator('#paApps')).toBeVisible();
  for (const a of apps) await carteira.click(`#paApps [data-app="${a}"]`);
  if (identidade !== undefined) await carteira.selectOption('#paI', String(identidade));
  await carteira.click('#paGo');
  await expect(toast(carteira)).toHaveText(/^Pedido enviado a /);
  return ultimoPedidoPara(srv);
}

/** Serviços › Crachás: busca os pedidos e abre o deste token (se já saiu da entrada, põe de novo na fila). */
async function conferirNoServico(tok) {
  await aba(srv, 'vBadge');
  if (await srv.locator('#cOut').isVisible()) await srv.click('#cNew');
  if (await srv.locator('#cForm').isVisible()) await srv.click('#cBack');
  const nonce = payloadDe(tok).nonce;
  const naEntrada = () => srv.evaluate(n => (st.entrada || []).some(x => x.nonce === n), nonce);
  await srv.click('#cqGo');
  if (!await naEntrada()) {
    await srv.evaluate(async t => enviarSolicitacao({ did: ses.did, x: ses.xMb }, t, b64u.enc(rnd(16))), tok);
    await srv.click('#cqGo');
  }
  if (await naEntrada()) await srv.locator(`#cFila [data-ent="${nonce}"]`).click();
}

/** A carteira busca as respostas na fila. */
async function receberCracha() {
  await buscarRespostas(carteira);
}

/** Lê um cartão (publicado no diretório pelo serviço) na carteira e devolve a mensagem da tela. */
async function lerCartaoPublicado(page, cartaoTok) {
  await srv.evaluate(t => publicarDiretorio('servico', nomeServico(), { cartao: t }), cartaoTok);
  await page.click('#dockAdd');
  await page.click('#sheetBody [data-act="access"]');
  await page.click(`#paS [data-srv="${didSrv}"]`);
  await expect(page.locator('#paH')).not.toHaveText('');
  const h = await page.locator('#paH').textContent();
  await fecharSheet(page);
  await srv.evaluate(() => publicarSrv(true));
  return h;
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

  // Serviço aprovado pela STK, com os apps Câmbio e Taxômetro cadastrados por ele.
  await srv.click('#dockAdd');
  await srv.click('#sheetBody [data-act="ask"]');
  await srv.fill('#saN', 'Meus Serviços Financeiros');
  await srv.selectOption('#saG', didGov);
  await srv.click('#saGo');
  await expect(toast(srv)).toHaveText(/^Pedido enviado/);
  await aprovarNaStk(await ultimoPedidoPara(gov));
  await buscarRespostas(srv);
  await expect(toast(srv)).toHaveText('Resposta da Governança recebida');
  for (const a of ['Câmbio', 'Taxômetro']) {
    await aba(srv, 'vSrv');
    await srv.click('#sAppNovo');
    await srv.fill('#naN', a);
    await srv.click('#naGo');
    await expect(srv.locator('#sheetBody h3')).toHaveText(`App ${a}`);
    await fecharSheet(srv);
  }
  // O cartão vai para o diretório na próxima busca.
  await buscarRespostas(srv);
  cartao = (await carteira.evaluate(() => lerDiretorio('servico')))[0].payload.cartao;
});

test.afterAll(async () => {
  for (const p of [carteira, gov, srv]) await p?.context().close();
});

test('o menu + da carteira tem as quatro ações (sem colar nada)', async () => {
  await carteira.click('#dockAdd');
  await expect(carteira.locator('#sheetBody [data-act] b')).toHaveText([
    'Solicitar aprovação de identidade', 'Solicitar acesso a um app', 'Buscar respostas', 'Apresentar credencial',
  ]);
  await fecharSheet(carteira);
});

test('a carteira lê o Cartão do serviço no diretório e mostra só as identidades aprovadas', async () => {
  await menuCarteira('access');
  await expect(carteira.locator('#paS [data-srv]')).toHaveText(/Meus Serviços Financeiros/);
  await carteira.click(`#paS [data-srv="${didSrv}"]`);
  await expect(carteira.locator('#paStep')).toContainText('Meus Serviços Financeiros');
  await expect(carteira.locator('#paApps [data-app]')).toHaveText(['Câmbio', 'Taxômetro']);
  await expect(carteira.locator('#paI option')).toHaveText(['Maria Silva · Identidade', 'Maria S. Consultora · Profissional']);
  await fecharSheet(carteira);
});

test('cartão alterado ou com apps de outra Governança é recusado; sem identidade aprovada também', async ({ browser }) => {
  const ler = lerCartaoPublicado;
  const [h, , sig] = cartao.split('.');
  const alterado = `${h}.${Buffer.from(JSON.stringify({ ...payloadDe(cartao), apps: ['Tudo'] })).toString('base64url')}.${sig}`;
  expect(await ler(carteira, alterado)).toBe('A assinatura do cartão não confere: ele foi alterado.');

  // Cartão com uma aprovação que não veio da Governança da identidade (assinada pelo próprio serviço).
  const falso = await srv.evaluate(async () => {
    const iat = now();
    const aprov = await signJWT('vc+jwt', { iss: ses.did, sub: ses.did, iat, nbf: iat, jti: 'urn:uuid:' + crypto.randomUUID(), vc: { '@context': VC_CONTEXT, type: ['VerifiableCredential', 'ServiceAccreditationCredential'], issuer: { id: ses.did, name: 'Falsa' }, credentialSubject: { id: ses.did, servico: 'X', apps: ['Câmbio'] } } });
    return signJWT('cartao+jwt', { iss: ses.did, name: 'X', apps: ['Câmbio'], aprovacoes: [aprov], iat });
  });
  expect(await ler(carteira, falso)).toBe('Este serviço não foi aprovado pela mesma Governança da sua identidade.');

  const nova = await (await browser.newContext()).newPage();
  vigiarCsp(nova, violacoesCsp);
  await preparar(nova, 'carteira-systekna.html', WORDS.outroEmissor);
  expect(await ler(nova, cartao)).toBe('Você ainda não tem identidade aprovada. Use + › Solicitar aprovação de identidade.');
  await nova.context().close();
});

let pedidoCambio = '';

test('o pedido sai assinado pela identidade escolhida, com a aprovação dela, e fica aguardando', async () => {
  pedidoCambio = await pedirAcesso(['Câmbio'], 1);
  const p = payloadDe(pedidoCambio);
  expect(p.x).toBe(await carteira.evaluate(d => idDoDid(d).id.xMb, didProf));
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
  await expect(srv.locator('#cOk')).toContainText('Enviados pela fila');
  expect(payloadDe(cracha).sub).toBe(didProf);
});

test('a carteira recebe o crachá e mostra o cartão próprio com a cv:key', async () => {
  await receberCracha();
  await expect(toast(carteira)).toHaveText('Chegou 1 resposta');
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
  await expect(srv.locator('#cOk')).toContainText('A recusa foi enviada pela fila');
  expect(await srv.evaluate(() => st.book.at(-1).text)).toBe('Acesso de Maria Silva recusado: Não é cliente');

  await receberCracha();
  await expect(toast(carteira)).toHaveText('Chegou 1 resposta');
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
