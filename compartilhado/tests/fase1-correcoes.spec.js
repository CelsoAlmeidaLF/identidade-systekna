// @ts-check
// Correções da Fase 1. Cada teste reproduz o problema encontrado e confere o novo comportamento.
// Tokens com conteúdo fora do comum (nbf no futuro, exp no passado, typ errado) são assinados
// direto na página com signJWT, a mesma função que os serviços usam.
const { test, expect } = require('@playwright/test');
const { vigiarCsp, WORDS, telaDoPin, digitarPin, preparar, bloquearEDesbloquear, aba, toast, fecharSheet, payloadDe } = require('./helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {import('@playwright/test').Page} */ let emissor;
/** @type {import('@playwright/test').Page} */ let outroEmissor;
let didCarteira = '';
let didEmissor = '';
let didOutro = '';
/** @type {string[]} */ const violacoesCsp = [];

const guard = page => page.evaluate(async () => (await DB.get('guard')) || { fails: 0, until: 0 });

/** Assina um JWT com a chave do serviço aberto na página. */
const assinar = (page, typ, payload) => page.evaluate(([t, p]) => signJWT(t, p), [typ, payload]);

/** Credencial no formato do emissor, com campos que o teste pode sobrescrever. */
function vcPayload(issuer, sub, extra = {}) {
  const iat = Math.floor(Date.now() / 1000);
  return {
    iss: issuer, sub, iat, nbf: iat, jti: `urn:uuid:${crypto.randomUUID()}`,
    vc: {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential', 'IdentityCredential'],
      issuer: { id: issuer, name: 'Emissor de teste' },
      credentialSubject: { id: sub, nome: 'Maria Teste' },
    },
    ...extra,
  };
}

async function gerarDesafio() {
  await aba(emissor, 'vVerify');
  await emissor.selectOption('#vType', 'any');
  await emissor.click('#vGen');
  await expect(emissor.locator('#vChal')).toBeVisible();
  return payloadDe(await emissor.inputValue('#vChalT')).nonce;
}

/** A carteira assina uma apresentação que embute exatamente o token dado. */
async function apresentacaoCom(tokenEmbutido) {
  const nonce = await gerarDesafio();
  const iat = Math.floor(Date.now() / 1000);
  return assinar(carteira, 'vp+jwt', {
    iss: didCarteira, sub: didCarteira, aud: didEmissor, nonce, iat, exp: iat + 300,
    vp: { '@context': ['https://www.w3.org/2018/credentials/v1'], type: ['VerifiablePresentation'], holder: didCarteira, verifiableCredential: [tokenEmbutido] },
  });
}

async function conferirApresentacao(token) {
  await aba(emissor, 'vVerify');
  await emissor.fill('#vpT', token);
  await emissor.click('#vpGo');
  return emissor.locator('#vpOut');
}

/** Entrega à conferência da carteira (a mesma que a fila usa) e devolve a mensagem dela. */
async function receberNaCarteira(token) {
  const m = await carteira.evaluate(async t => { try { return await receberResposta(t, null); } catch (e) { return e.message; } finally { renderCreds(); } }, token);
  carteira.__msg = m;
  return m;
}

async function ajusteCarteira(chave) {
  await aba(carteira, 'vSet');
  await carteira.click(`#commonSet [data-cs="${chave}"]`);
}

test.beforeAll(async ({ browser }) => {
  [carteira, emissor, outroEmissor] = await Promise.all([1, 2, 3].map(async () => (await browser.newContext()).newPage()));
  for (const p of [carteira, emissor, outroEmissor]) vigiarCsp(p, violacoesCsp);
  await preparar(emissor, 'governanca-systekna.html', WORDS.emissor);
  await preparar(outroEmissor, 'governanca-systekna.html', WORDS.outroEmissor);
  await preparar(carteira, 'carteira-systekna.html', WORDS.carteira);
  didCarteira = await carteira.evaluate(() => ses.did);
  didEmissor = await emissor.evaluate(() => ses.did);
  didOutro = await outroEmissor.evaluate(() => ses.did);
});

test.afterAll(async () => {
  for (const p of [carteira, emissor, outroEmissor]) await p?.context().close();
});

test.describe('1.1 · contador de tentativas do PIN', () => {
  test('a tentativa é gravada antes da conferência terminar: fechar a aba não a devolve', async () => {
    // Deixa a conferência do PIN bem lenta para que a página seja recarregada no meio dela.
    const lock = await carteira.evaluate(() => DB.get('lock'));
    await carteira.click('#lockBtn');
    await telaDoPin(carteira, 'Digite seu PIN');
    await carteira.evaluate(l => DB.set('lock', { ...l, iter: 50_000_000 }), lock);

    await digitarPin(carteira, '246802');
    await expect(carteira.locator('#pinPad .pmsg')).toHaveText('Abrindo…');
    await expect.poll(async () => (await guard(carteira)).fails, { timeout: 5_000 }).toBe(1);
    await carteira.reload();
    await telaDoPin(carteira, 'Digite seu PIN');
    expect((await guard(carteira)).fails).toBe(1);

    // Restaura o registro do PIN e desbloqueia: o PIN certo zera o contador.
    await carteira.evaluate(l => DB.set('lock', l), lock);
    await digitarPin(carteira);
    await expect(carteira.locator('#sApp')).toBeVisible();
    expect((await guard(carteira)).fails).toBe(0);
  });

  test('PIN errado em "Ver as 12 palavras" também conta tentativa', async () => {
    await ajusteCarteira('words');
    await digitarPin(carteira, '246802');
    await expect(carteira.locator('#raPad .pmsg')).toHaveText('PIN incorreto.');
    expect((await guard(carteira)).fails).toBe(1);

    await digitarPin(carteira);
    await expect(carteira.locator('#sheetBody h3')).toHaveText('As 12 palavras');
    expect((await guard(carteira)).fails).toBe(0);
    await fecharSheet(carteira);
  });

  test('PIN atual errado em "Trocar PIN" também conta tentativa', async () => {
    await ajusteCarteira('pin');
    await digitarPin(carteira, '246802');
    await expect(carteira.locator('#cpPad .pmsg')).toHaveText('PIN incorreto.');
    expect((await guard(carteira)).fails).toBe(1);

    await digitarPin(carteira);
    await expect(carteira.locator('#cpT')).toHaveText('Novo PIN');
    expect((await guard(carteira)).fails).toBe(0);
    await fecharSheet(carteira);
  });
});

test('1.2 · emissor recusa credencial cujo nbf ainda não chegou', async () => {
  const amanha = Math.floor(Date.now() / 1000) + 86_400;
  const vc = await assinar(emissor, 'vc+jwt', vcPayload(didEmissor, didCarteira, { nbf: amanha }));
  const out = await conferirApresentacao(await apresentacaoCom(vc));
  await expect(out).toContainText('Apresentação recusada');
  await expect(out.locator('.chk.no').filter({ hasText: 'Só vale a partir de' })).toHaveCount(1);
});

test.describe('1.3 · tipo do token (typ) é exigido', () => {
  test('emissor recusa apresentação que embute um token que não é vc+jwt', async () => {
    const falso = await assinar(emissor, 'pedido+jwt', vcPayload(didEmissor, didCarteira));
    const out = await conferirApresentacao(await apresentacaoCom(falso));
    await expect(out).toContainText('Apresentação recusada');
    await expect(out.locator('.chk.no').filter({ hasText: 'aqui se espera vc+jwt' })).toHaveCount(1);
  });

  test('carteira recusa token com conteúdo de credencial mas typ diferente de vc+jwt', async () => {
    await receberNaCarteira(await assinar(emissor, 'pedido+jwt', vcPayload(didEmissor, didCarteira)));
    expect(carteira.__msg).toBe('Isto não é uma credencial verificável.');
  });
});

test.describe('1.4 · carteira recusa credencial fora da validade', () => {
  test('credencial já expirada', async () => {
    const ontem = Math.floor(Date.now() / 1000) - 86_400;
    await receberNaCarteira(await assinar(emissor, 'vc+jwt', vcPayload(didEmissor, didCarteira, { iat: ontem - 60, nbf: ontem - 60, exp: ontem })));
    expect(carteira.__msg).toContain('Esta credencial venceu em');
  });

  test('credencial que ainda não entrou em vigor', async () => {
    const amanha = Math.floor(Date.now() / 1000) + 86_400;
    await receberNaCarteira(await assinar(emissor, 'vc+jwt', vcPayload(didEmissor, didCarteira, { nbf: amanha })));
    expect(carteira.__msg).toContain('Esta credencial só vale a partir de');
  });
});

test('1.5 · status não verificável é recusado por padrão e aceito só com política explícita', async () => {
  const vc = await assinar(outroEmissor, 'vc+jwt', vcPayload(didOutro, didCarteira));
  // A carteira só aceita aprovação de quem ela pediu (1.2): registra o pedido a esse emissor antes.
  await carteira.evaluate(async d => guardarPerfil(0, { pedido: { at: Date.now(), nome: 'Teste', nonce: null, gov: d } }), didOutro);
  expect(await receberNaCarteira(vc)).toBe('Credencial guardada');

  // O outro emissor entra na lista de confiança.
  await aba(emissor, 'vGov');
  await expect(emissor.locator('#gPolV')).toHaveText('Recusar');
  await emissor.click('#gTrustAdd');
  await emissor.fill('#tn', 'Emissor de teste');
  await emissor.fill('#td', didOutro);
  await emissor.click('#tGo');
  await expect(toast(emissor)).toHaveText('Emissor adicionado');

  let out = await conferirApresentacao(await apresentacaoCom(vc));
  await expect(out).toContainText('Apresentação recusada');
  await expect(out.locator('.chk.no').filter({ hasText: 'o status não pode ser conferido aqui' })).toHaveCount(1);

  await aba(emissor, 'vGov');
  await emissor.click('#gPol');
  await emissor.click('#cfOk');
  await expect(toast(emissor)).toHaveText('Política alterada');
  await expect(emissor.locator('#gPolV')).toHaveText('Aceitar');
  expect(await emissor.evaluate(() => st.book.at(-1).text)).toContain('Política: aceitar');

  out = await conferirApresentacao(await apresentacaoCom(vc));
  await expect(out).toContainText('Apresentação aprovada');
  await expect(out.locator('.chk.na').filter({ hasText: 'o status não pode ser conferido aqui' })).toHaveCount(1);
});

test('1.6 · cartões antigos são apagados ao desbloquear e não voltam pelo backup', async () => {
  const ts = Date.now();
  await carteira.evaluate(t => saveItem({ type: 'cartao', title: 'Cartão antigo', fields: { name: 'Maria', num: '4111111111111111', exp: '12/30', cvv: '123' }, created: t, updated: t }), ts);
  expect(await carteira.evaluate(() => ses.items.filter(i => i.data.type === 'cartao').length)).toBe(1);

  // Backup feito enquanto o cartão ainda existia.
  await ajusteCarteira('export');
  const backup = await carteira.inputValue('#bkT');
  await fecharSheet(carteira);

  await bloquearEDesbloquear(carteira);
  await expect(toast(carteira)).toHaveText('1 cartão antigo removido');
  const restantes = await carteira.evaluate(async () => {
    const recs = (await DB.get('items')) || [];
    const tipos = await Promise.all(recs.map(async r => (await unseal(ses.vaultKey, r, r.id)).type));
    return tipos.filter(t => t === 'cartao').length;
  });
  expect(restantes).toBe(0);

  await ajusteCarteira('import');
  await carteira.fill('#riT', backup);
  await carteira.click('#riGo');
  await expect(toast(carteira)).toContainText('restaurad');
  expect(await carteira.evaluate(() => ses.items.filter(i => i.data.type === 'cartao').length)).toBe(0);
});

test('nenhuma violação de CSP em todo o fluxo acima', () => {
  expect(violacoesCsp).toEqual([]);
});
