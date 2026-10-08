// @ts-check
// Governança Systekna (decisões de 03/10/2026, docs_v2/11): credenciamento de serviços, uma Identidade e um
// credenciamento ativos por DID, e o envelope SYSTEKNA:<TIPO>:<JWT> em todo pacote copiado.
// O app Serviços ainda não existe: o pedido de credenciamento é assinado direto na página de um serviço simulado.
const { test, expect } = require('@playwright/test');
const { receberPedido, WORDS, vigiarCsp, preparar, aba, toast, fecharSheet, payloadDe } = require('../../compartilhado/tests/helpers');

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
    apps, note: '', nonce: `credenciamento-${Math.random()}`, iat, exp: iat + 7 * 86_400, ...extra,
  });
}

async function pedirIdentidade(nome = 'Maria Teste') {
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="ask"]');
  await carteira.fill('#aqN', nome);
  await carteira.click('#aqGo');
  await expect(carteira.locator('#aqOut')).toBeVisible();
  const tok = await carteira.inputValue('#aqJ');
  await fecharSheet(carteira);
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
    expect(pedido).toMatch(/^SYSTEKNA:PEDIDO-APROVACAO:ey/);
    await conferirPedido(pedido);
    await expect(gov.locator('#iWho')).toContainText('Pedido conferido');
    const aprovacao = await emitir();
    expect(aprovacao).toMatch(/^SYSTEKNA:APROVACAO:ey/);

    await carteira.click('#dockAdd');
    await carteira.click('#sheetBody [data-act="get"]');
    await carteira.fill('#rcT', aprovacao);
    await carteira.click('#rcGo');
    await expect(toast(carteira)).toHaveText('Credencial guardada');
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
    await conferirPedido(`SYSTEKNA:DESAFIO:${jwt}`);
    await expect(gov.locator('#iqH')).toHaveText('O pacote diz DESAFIO, mas o conteúdo é PEDIDO-APROVACAO. Ele foi alterado.');
    await expect(gov.locator('#iForm')).toBeHidden();

    await conferirPedido(jwt);
    await expect(gov.locator('#iWho')).toContainText('Pedido conferido');
  });
});

test('uma Identidade ativa por DID: a nova revoga a anterior, com ato no livro', async () => {
  const antes = (await registro()).filter(i => i.type === 'IdentityCredential' && !i.revoked);
  expect(antes).toHaveLength(1);

  await conferirPedido(await pedirIdentidade('Maria Teste Silva'));
  await emitir();
  const ativas = (await registro()).filter(i => i.type === 'IdentityCredential' && !i.revoked);
  expect(ativas).toHaveLength(1);
  expect(ativas[0].n).not.toBe(antes[0].n);
  expect((await registro()).find(i => i.n === antes[0].n)?.reason).toBe('Substituída por nova Identidade');
  expect(await gov.evaluate(() => st.book.at(-1).text)).toContain('Substituída por nova Identidade');
});

test.describe('credenciamento de serviços', () => {
  test('o pedido do serviço já chega como Credenciamento, com o nome e os apps', async () => {
    await conferirPedido(await pedidoDeCredenciamento(['Portaria', 'Aulas']));
    await expect(gov.locator('#iWho')).toContainText('Pedido conferido');
    await expect(gov.locator('#iType')).toHaveValue('ServiceAccreditationCredential');
    await expect(gov.locator('#iClaims [data-ck]')).toHaveCount(2);
    await expect(gov.locator('#iClaims [data-cv]').nth(0)).toHaveValue('Academia Boa Forma');
    await expect(gov.locator('#iClaims [data-cv]').nth(1)).toHaveValue('Portaria, Aulas');

    const tok = await emitir();
    expect(tok).toMatch(/^SYSTEKNA:CREDENCIAMENTO:ey/);
    const p = payloadDe(tok);
    expect(p.sub).toBe(didServico);
    expect(p.iss).toBe(didGov);
    expect(p.vc.type).toEqual(['VerifiableCredential', 'ServiceAccreditationCredential']);
    expect(p.vc.credentialSubject).toEqual({ id: didServico, servico: 'Academia Boa Forma', apps: ['Portaria', 'Aulas'] });
  });

  test('apps repetidos ou com espaços são limpos; sem app nenhum é recusado', async () => {
    await conferirPedido(await pedidoDeCredenciamento([]));
    await gov.locator('#iClaims [data-cv]').nth(1).fill(' Portaria ,, Portaria, Loja ');
    const p = payloadDe(await emitir());
    expect(p.vc.credentialSubject.apps).toEqual(['Portaria', 'Loja']);

    const antes = (await registro()).length;
    await conferirPedido(await pedidoDeCredenciamento([]));
    await gov.locator('#iClaims [data-cv]').nth(1).fill(' , ');
    await gov.click('#iGo');
    await expect(toast(gov)).toHaveText('Informe ao menos um app que o serviço vai proteger.');
    expect((await registro()).length).toBe(antes);
  });

  test('um credenciamento ativo por serviço: o novo revoga o anterior', async () => {
    const ativos = (await registro()).filter(i => i.type === 'ServiceAccreditationCredential' && i.sub === didServico && !i.revoked);
    expect(ativos).toHaveLength(1);
    const revogados = (await registro()).filter(i => i.type === 'ServiceAccreditationCredential' && i.revoked);
    expect(revogados.every(i => i.reason === 'Substituído por novo credenciamento')).toBe(true);
    expect(revogados.length).toBeGreaterThanOrEqual(1);
  });

  test('o credenciamento leva só serviço e apps', async () => {
    const antes = (await registro()).length;
    await conferirPedido(await pedidoDeCredenciamento(['Portaria']));
    await gov.click('#iAdd');
    await gov.locator('#iClaims [data-ck]').nth(2).fill('papel');
    await gov.locator('#iClaims [data-cv]').nth(2).fill('admin');
    await gov.click('#iGo');
    await expect(toast(gov)).toHaveText('O credenciamento leva só servico e apps. Tire o campo “papel”.');
    expect((await registro()).length).toBe(antes);
  });

  test('a Governança não credencia a si mesma', async () => {
    const iat = agora();
    const proprio = await assinar(gov, 'pedido+jwt', {
      iss: didGov, sub: didGov, aud: 'emissor', name: 'Governança', wanted: 'ServiceAccreditationCredential',
      apps: ['Painel'], note: '', nonce: 'proprio', iat, exp: iat + 3600,
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
