// @ts-check
// Correções da Fase 1. Cada teste reproduz o problema encontrado e confere o novo comportamento.
// Tokens com conteúdo fora do comum (nbf no futuro, exp no passado, typ errado) são assinados
// direto na página com signJWT, a mesma função que os serviços usam.
const { test, expect } = require('@playwright/test');
const { WORDS, telaDoPin, digitarPin, instituir, bloquearEDesbloquear, aba, toast, fecharSheet, payloadDe } = require('./helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {import('@playwright/test').Page} */ let cartorio;
/** @type {import('@playwright/test').Page} */ let outroCartorio;
let didCarteira = '';
let didCartorio = '';
let didOutro = '';

const guard = page => page.evaluate(async () => (await DB.get('guard')) || { fails: 0, until: 0 });

/** Assina um JWT com a chave do serviço aberto na página. */
const assinar = (page, typ, payload) => page.evaluate(([t, p]) => signJWT(t, p), [typ, payload]);

/** Credencial no formato do cartório, com campos que o teste pode sobrescrever. */
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
  await aba(cartorio, 'vVerify');
  await cartorio.selectOption('#vType', 'any');
  await cartorio.click('#vGen');
  await expect(cartorio.locator('#vChal')).toBeVisible();
  return payloadDe(await cartorio.inputValue('#vChalT')).nonce;
}

/** A carteira assina uma apresentação que embute exatamente o token dado. */
async function apresentacaoCom(tokenEmbutido) {
  const nonce = await gerarDesafio();
  const iat = Math.floor(Date.now() / 1000);
  return assinar(carteira, 'vp+jwt', {
    iss: didCarteira, sub: didCarteira, aud: didCartorio, nonce, iat, exp: iat + 300,
    vp: { '@context': ['https://www.w3.org/2018/credentials/v1'], type: ['VerifiablePresentation'], holder: didCarteira, verifiableCredential: [tokenEmbutido] },
  });
}

async function conferirApresentacao(token) {
  await aba(cartorio, 'vVerify');
  await cartorio.fill('#vpT', token);
  await cartorio.click('#vpGo');
  return cartorio.locator('#vpOut');
}

async function receberNaCarteira(token) {
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="get"]');
  await carteira.fill('#rcT', token);
  await carteira.click('#rcGo');
}

async function ajusteCarteira(chave) {
  await aba(carteira, 'vSet');
  await carteira.click(`#commonSet [data-cs="${chave}"]`);
}

test.beforeAll(async ({ browser }) => {
  [carteira, cartorio, outroCartorio] = await Promise.all([1, 2, 3].map(async () => (await browser.newContext()).newPage()));
  await instituir(cartorio, 'cartorio-systekna.html', WORDS.cartorio);
  await instituir(outroCartorio, 'cartorio-systekna.html', WORDS.outroCartorio);
  await instituir(carteira, 'carteira-systekna.html', WORDS.carteira);
  didCarteira = await carteira.evaluate(() => ses.did);
  didCartorio = await cartorio.evaluate(() => ses.did);
  didOutro = await outroCartorio.evaluate(() => ses.did);
});

test.afterAll(async () => {
  for (const p of [carteira, cartorio, outroCartorio]) await p?.context().close();
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

    // Restaura o cofre e desbloqueia: o PIN certo zera o contador.
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

test('1.2 · cartório recusa credencial cujo nbf ainda não chegou', async () => {
  const amanha = Math.floor(Date.now() / 1000) + 86_400;
  const vc = await assinar(cartorio, 'vc+jwt', vcPayload(didCartorio, didCarteira, { nbf: amanha }));
  const out = await conferirApresentacao(await apresentacaoCom(vc));
  await expect(out).toContainText('Apresentação recusada');
  await expect(out.locator('.chk.no').filter({ hasText: 'Só vale a partir de' })).toHaveCount(1);
});

test.describe('1.3 · tipo do token (typ) é exigido', () => {
  test('cartório recusa apresentação que embute um token que não é vc+jwt', async () => {
    const falso = await assinar(cartorio, 'pedido+jwt', vcPayload(didCartorio, didCarteira));
    const out = await conferirApresentacao(await apresentacaoCom(falso));
    await expect(out).toContainText('Apresentação recusada');
    await expect(out.locator('.chk.no').filter({ hasText: 'aqui se espera vc+jwt' })).toHaveCount(1);
  });

  test('carteira recusa token com conteúdo de credencial mas typ diferente de vc+jwt', async () => {
    await receberNaCarteira(await assinar(cartorio, 'pedido+jwt', vcPayload(didCartorio, didCarteira)));
    await expect(carteira.locator('#rcH')).toHaveText('Isto não é uma credencial verificável.');
    await fecharSheet(carteira);
  });
});

test.describe('1.4 · carteira recusa credencial fora da validade', () => {
  test('credencial já expirada', async () => {
    const ontem = Math.floor(Date.now() / 1000) - 86_400;
    await receberNaCarteira(await assinar(cartorio, 'vc+jwt', vcPayload(didCartorio, didCarteira, { iat: ontem - 60, nbf: ontem - 60, exp: ontem })));
    await expect(carteira.locator('#rcH')).toContainText('Esta credencial expirou em');
    await fecharSheet(carteira);
  });

  test('credencial que ainda não entrou em vigor', async () => {
    const amanha = Math.floor(Date.now() / 1000) + 86_400;
    await receberNaCarteira(await assinar(cartorio, 'vc+jwt', vcPayload(didCartorio, didCarteira, { nbf: amanha })));
    await expect(carteira.locator('#rcH')).toContainText('Esta credencial só vale a partir de');
    await fecharSheet(carteira);
  });
});

test('1.5 · status não verificável é recusado por padrão e aceito só com política explícita', async () => {
  const vc = await assinar(outroCartorio, 'vc+jwt', vcPayload(didOutro, didCarteira));
  await receberNaCarteira(vc);
  await expect(toast(carteira)).toHaveText('Credencial guardada');

  // O outro cartório entra na lista de confiança.
  await aba(cartorio, 'vGov');
  await expect(cartorio.locator('#gPolV')).toHaveText('Recusar');
  await cartorio.click('#gTrustAdd');
  await cartorio.fill('#tn', 'Cartório de teste');
  await cartorio.fill('#td', didOutro);
  await cartorio.click('#tGo');
  await expect(toast(cartorio)).toHaveText('Emissor adicionado');

  let out = await conferirApresentacao(await apresentacaoCom(vc));
  await expect(out).toContainText('Apresentação recusada');
  await expect(out.locator('.chk.no').filter({ hasText: 'o status não pode ser conferido aqui' })).toHaveCount(1);

  await aba(cartorio, 'vGov');
  await cartorio.click('#gPol');
  await cartorio.click('#cfOk');
  await expect(toast(cartorio)).toHaveText('Política alterada');
  await expect(cartorio.locator('#gPolV')).toHaveText('Aceitar');
  expect(await cartorio.evaluate(() => st.book.at(-1).text)).toContain('Política: aceitar');

  out = await conferirApresentacao(await apresentacaoCom(vc));
  await expect(out).toContainText('Apresentação aprovada');
  await expect(out.locator('.chk.na').filter({ hasText: 'o status não pode ser conferido aqui' })).toHaveCount(1);
});

test('1.6 · cartões antigos saem do cofre ao desbloquear e não voltam pelo backup', async () => {
  const ts = Date.now();
  await carteira.evaluate(t => saveItem({ type: 'cartao', title: 'Cartão antigo', fields: { name: 'Maria', num: '4111111111111111', exp: '12/30', cvv: '123' }, created: t, updated: t }), ts);
  expect(await carteira.evaluate(() => ses.items.filter(i => i.data.type === 'cartao').length)).toBe(1);

  // Backup feito enquanto o cartão ainda existia.
  await ajusteCarteira('export');
  const backup = await carteira.inputValue('#bkT');
  await fecharSheet(carteira);

  await bloquearEDesbloquear(carteira);
  await expect(toast(carteira)).toHaveText('1 cartão removido do cofre');
  const restantes = await carteira.evaluate(async () => {
    const recs = (await DB.get('items')) || [];
    const tipos = await Promise.all(recs.map(async r => (await unseal(ses.vaultKey, r, r.id)).type));
    return tipos.filter(t => t === 'cartao').length;
  });
  expect(restantes).toBe(0);

  await ajusteCarteira('import');
  await carteira.fill('#riT', backup);
  await carteira.click('#riGo');
  await expect(toast(carteira)).toContainText('restaurado');
  expect(await carteira.evaluate(() => ses.items.filter(i => i.data.type === 'cartao').length)).toBe(0);
});
