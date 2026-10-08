// @ts-check
// Governança Systekna (decisões de 03/10/2026, docs_v2/11): credenciamento de serviços, uma Identidade e um
// credenciamento ativos por DID, e o envelope SYSTEKNA:<TIPO>:<JWT> em todo pacote copiado.
// O app Serviços ainda não existe: o pedido de credenciamento é assinado direto na página de um serviço simulado.
const { test, expect } = require('@playwright/test');
const { ultimoPedidoPara, entregarNaCarteira, receberPedido, WORDS, vigiarCsp, preparar, aba, toast, fecharSheet, payloadDe } = require('../../compartilhado/tests/helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {import('@playwright/test').Page} */ let gov;
/** Identidade de um serviço (usa a mesma página do app para assinar). */
/** @type {import('@playwright/test').Page} */ let servico;
let didServico = '';
let didGov = '';
/** @type {string[]} */ const violacoesCsp = [];

const agora = () => Math.floor(Date.now() / 1000);
const assinar = (page, typ, payload) => page.evaluate(([t, p]) => signJWT(t, p), [typ, payload]);

async function pedidoDeCredenciamento(apps, extra = {}) {
  const iat = agora();
  return assinar(servico, 'pedido+jwt', {
    iss: didServico, sub: didServico, aud: 'emissor', name: 'Academia Boa Forma', wanted: 'ServiceAccreditationCredential',
    apps, note: '', x: await servico.evaluate(() => ses.xMb), nonce: `credenciamento-${Math.random()}`, iat, exp: iat + 7 * 86_400, ...extra,
  });
}

async function pedirIdentidade(nome = 'Maria Teste') {
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="ask"]');
  await carteira.fill('#aqN', nome);
  await carteira.selectOption('#aqE', await gov.evaluate(() => ses.did));
  await carteira.click('#aqGo');
  await expect(toast(carteira)).toHaveText(/^Pedido enviado/);
  const tok = await ultimoPedidoPara(gov);
  return tok;
}

async function conferirPedido(tok) {
  await receberPedido(gov, tok);
}

/** Emite e devolve o pacote novo. O resultado anterior fica no elemento escondido: espera o valor mudar. */
async function emitir() {
  const anterior = await gov.inputValue('#iJwt');
  await gov.click('#iGo');
  await expect(gov.locator('#iOut')).toBeVisible();
  await expect(gov.locator('#iJwt')).not.toHaveValue(anterior);
  return gov.inputValue('#iJwt');
}

const registro = () => gov.evaluate(() => st.issued.map(i => ({ n: i.n, type: i.type, sub: i.sub, revoked: i.revoked, reason: i.reason || '' })));

test.beforeAll(async ({ browser }) => {
  [carteira, gov, servico] = await Promise.all([1, 2, 3].map(async () => (await browser.newContext()).newPage()));
  for (const p of [carteira, gov, servico]) vigiarCsp(p, violacoesCsp);
  await preparar(gov, 'governanca-systekna.html', WORDS.emissor);
  await preparar(servico, 'governanca-systekna.html', WORDS.outroEmissor);
  await preparar(carteira, 'carteira-systekna.html', WORDS.carteira);
  didServico = await servico.evaluate(() => ses.did);
  didGov = await gov.evaluate(() => ses.did);
});

test.afterAll(async () => {
  for (const p of [carteira, gov, servico]) await p?.context().close();
});

test.describe('envelope SYSTEKNA:<TIPO>:<JWT>', () => {
  test('pedido, aprovação, desafio e prova saem com o envelope do tipo certo', async () => {
    const pedido = await pedirIdentidade();
    // Pela fila vai o JWT puro, cifrado; o envelope SYSTEKNA:<TIPO>: ficou para o que ainda se copia (desafio e prova).
    expect(pedido).toMatch(/^ey/);
    await conferirPedido(pedido);
    await expect(gov.locator('#iWho')).toContainText('Pedido conferido');
    const aprovacao = await emitir();
    expect(aprovacao).toMatch(/^SYSTEKNA:APROVACAO:ey/);

    expect(await entregarNaCarteira(carteira, aprovacao)).toBe('Credencial guardada');
    // A carteira guarda o JWT sem o envelope: é ele que vai dentro da prova.
    expect(await carteira.evaluate(() => creds()[0].data.jwt)).toMatch(/^ey/);

    await aba(gov, 'vVerify');
    await gov.selectOption('#vType', 'IdentityCredential');
    await gov.click('#vGen');
    const desafio = await gov.inputValue('#vChalT');
    expect(desafio).toMatch(/^SYSTEKNA:DESAFIO:ey/);

    await carteira.click('#dockAdd');
    await carteira.click('#sheetBody [data-act="show"]');
    await carteira.fill('#apT', desafio);
    await carteira.click('#apGo');
    await carteira.click('#apSign');
    const prova = await carteira.inputValue('#apJ');
    expect(prova).toMatch(/^SYSTEKNA:PROVA:ey/);
    await fecharSheet(carteira);

    await gov.fill('#vpT', prova);
    await gov.click('#vpGo');
    await expect(gov.locator('#vpOut')).toContainText('Apresentação aprovada');
  });

  test('envelope com tipo trocado é recusado; JWT sem envelope ainda é aceito', async () => {
    const pedido = await pedirIdentidade();
    const jwt = pedido.replace(/^SYSTEKNA:[A-Z-]+:/, '');
    // O envelope é conferido por quem lê o pacote (hoje, o desafio e a prova copiados).
    expect(await gov.evaluate(t => verifyJWT(t).then(() => 'ok', e => e.message), `SYSTEKNA:DESAFIO:${jwt}`))
      .toBe('O pacote diz DESAFIO, mas o conteúdo é PEDIDO-APROVACAO. Ele foi alterado.');

    await conferirPedido(jwt);
    await expect(gov.locator('#iWho')).toContainText('Pedido conferido');
  });
});

test('uma Identidade ativa por DID: a nova revoga a anterior, com ato no livro', async () => {
  const antes = (await registro()).filter(i => i.type === 'IdentityCredential' && !i.revoked);
  expect(antes).toHaveLength(1);

  // A carteira não oferece pedir de novo uma identidade aprovada (1.2.1): o pedido de renovação é assinado direto
  // pela mesma identidade, como uma carteira antiga faria. A regra testada é da Governança.
  const renovacao = await carteira.evaluate(async g => {
    const iat = now();
    return signJWT('pedido+jwt', { iss: ses.did, sub: ses.did, aud: g, name: 'Maria Teste Silva', wanted: 'IdentityCredential', x: ses.xMb, nonce: b64u.enc(rnd(16)), iat, exp: iat + 600 });
  }, didGov);
  await conferirPedido(renovacao);
  await emitir();
  const ativas = (await registro()).filter(i => i.type === 'IdentityCredential' && !i.revoked);
  expect(ativas).toHaveLength(1);
  expect(ativas[0].n).not.toBe(antes[0].n);
  expect((await registro()).find(i => i.n === antes[0].n)?.reason).toBe('Substituída por nova Identidade');
  expect(await gov.evaluate(() => st.book.at(-1).text)).toContain('Substituída por nova Identidade');
});

test.describe('aprovação de emissão de serviços (0.22: só o serviço, sem apps)', () => {
  test('o pedido do serviço chega como Aprovação de emissão, com o nome e sem apps', async () => {
    await conferirPedido(await pedidoDeCredenciamento(['Portaria', 'Aulas']));
    await expect(gov.locator('#iWho')).toContainText('Pedido conferido');
    await expect(gov.locator('#iType')).toHaveValue('ServiceAccreditationCredential');
    await expect(gov.locator('#iSrvNome')).toHaveText('Academia Boa Forma');
    await expect(gov.locator('#iClaims')).toBeHidden();
    await expect(gov.locator('#iGo')).toHaveText('Aprovar emissão');

    const tok = await emitir();
    expect(tok).toMatch(/^SYSTEKNA:CREDENCIAMENTO:ey/);
    const p = payloadDe(tok);
    expect([p.sub, p.iss]).toEqual([didServico, didGov]);
    expect(p.vc.type).toEqual(['VerifiableCredential', 'ServiceAccreditationCredential']);
    // Os apps do pedido não entram: são do serviço.
    expect(p.vc.credentialSubject).toEqual({ id: didServico, servico: 'Academia Boa Forma' });
  });

  test('aprovar de novo renova: o serviço passa a ter mais de uma aprovação ativa', async () => {
    await conferirPedido(await pedidoDeCredenciamento([]));
    await expect(gov.locator('#iSrvAtiva')).toContainText('Este serviço já está aprovado');
    await emitir();
    const ativos = (await registro()).filter(i => i.type === 'ServiceAccreditationCredential' && i.sub === didServico && !i.revoked);
    expect(ativos).toHaveLength(2);
  });

  test('a aprovação de emissão leva só o serviço', async () => {
    const antes = (await registro()).length;
    const erro = await gov.evaluate(d => issue(d, 'ServiceAccreditationCredential', { servico: 'X', papel: 'admin' }, 365, 'X', `n-${Math.random()}`).then(() => null, e => e.message), didServico);
    expect(erro).toBe('O credenciamento leva só servico. Tire o campo “papel”.');
    expect((await registro()).length).toBe(antes);
  });

  test('a Governança não credencia a si mesma', async () => {
    const iat = agora();
    const proprio = await assinar(gov, 'pedido+jwt', {
      iss: didGov, sub: didGov, aud: 'emissor', name: 'Governança', wanted: 'ServiceAccreditationCredential',
      note: '', x: await gov.evaluate(() => ses.xMb), nonce: 'proprio-000000000000', iat, exp: iat + 3600,
    });
    await conferirPedido(proprio);
    await gov.click('#iGo');
    await expect(toast(gov)).toHaveText('A Governança não credencia a si mesma.');
  });

  test('a carteira só pede aprovação de identidade', async () => {
    await carteira.click('#dockAdd');
    await carteira.click('#sheetBody [data-act="ask"]');
    await expect(carteira.locator('#aqT')).toHaveCount(0);
    await expect(carteira.locator('#aqP option')).toHaveText(['Identidade', 'Profissional', 'Personalizada']);
    await fecharSheet(carteira);
  });
});

test('nenhuma violação de CSP em todo o fluxo acima', () => {
  expect(violacoesCsp).toEqual([]);
});
