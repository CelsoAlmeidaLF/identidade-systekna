// @ts-check
// DP-09 (03/10/2026): troca da chave da Governança. A chave antiga assina o aviso, a nova assina o aceite,
// o livro continua íntegro com as duas chaves, credenciais antigas continuam sendo desta Governança e quem
// confiava no DID antigo passa a confiar no novo ao importar o aviso.
const { test, expect } = require('@playwright/test');
const { PIN, WORDS, vigiarCsp, preparar, aba, toast, fecharSheet, telaDoPin, digitarPin, payloadDe } = require('./helpers');

test.describe.configure({ mode: 'serial' });

const PIN_NOVO = '246813';

/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {import('@playwright/test').Page} */ let gov;
/** Outra Governança, que confia na primeira. */
/** @type {import('@playwright/test').Page} */ let outra;
let didAntigo = '';
let didNovo = '';
let aviso = '';
/** @type {string[]} */ const violacoesCsp = [];

async function pedirIdentidade() {
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="ask"]');
  await carteira.fill('#aqN', 'Maria Teste');
  await carteira.click('#aqGo');
  await expect(carteira.locator('#aqOut')).toBeVisible();
  const tok = await carteira.inputValue('#aqJ');
  await fecharSheet(carteira);
  return tok;
}

async function emitirIdentidade() {
  await aba(gov, 'vIssue');
  if (await gov.locator('#iOut').isVisible()) await gov.click('#iNew');
  await gov.fill('#iqT', await pedirIdentidade());
  await gov.click('#iqGo');
  const anterior = await gov.inputValue('#iJwt');
  await gov.click('#iGo');
  await expect(gov.locator('#iJwt')).not.toHaveValue(anterior);
  return gov.inputValue('#iJwt');
}

async function guardarNaCarteira(tok) {
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="get"]');
  await carteira.fill('#rcT', tok);
  await carteira.click('#rcGo');
  await expect(toast(carteira)).toHaveText('Credencial guardada');
}

/** Desafio da Governança respondido pela carteira com a credencial escolhida (pelo jti). */
async function apresentar(jti) {
  await aba(gov, 'vVerify');
  await gov.selectOption('#vType', 'IdentityCredential');
  await gov.click('#vGen');
  const desafio = await gov.inputValue('#vChalT');
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="show"]');
  await carteira.fill('#apT', desafio);
  await carteira.click('#apGo');
  const id = await carteira.evaluate(j => creds().find(c => c.data.jti === j).rec.id, jti);
  await carteira.click(`#apC [data-pk="${id}"]`);
  await carteira.click('#apSign');
  const prova = await carteira.inputValue('#apJ');
  await fecharSheet(carteira);
  await gov.fill('#vpT', prova);
  await gov.click('#vpGo');
  return gov.locator('#vpOut');
}

async function importarAviso(texto) {
  await aba(outra, 'vGov');
  await outra.click('#gTrustRot');
  await outra.fill('#irT', texto);
  await outra.click('#irGo');
}

test.beforeAll(async ({ browser }) => {
  [carteira, gov, outra] = await Promise.all([1, 2, 3].map(async () => (await browser.newContext()).newPage()));
  for (const p of [carteira, gov, outra]) vigiarCsp(p, violacoesCsp);
  await preparar(gov, 'governanca-systekna.html', WORDS.emissor);
  await preparar(outra, 'governanca-systekna.html', WORDS.outroEmissor);
  await preparar(carteira, 'carteira-systekna.html', WORDS.carteira);
  didAntigo = await gov.evaluate(() => ses.did);

  // A outra Governança confia nesta.
  await aba(outra, 'vGov');
  await outra.click('#gTrustAdd');
  await outra.fill('#tn', 'Governança Systekna');
  await outra.fill('#td', didAntigo);
  await outra.click('#tGo');
  await expect(toast(outra)).toHaveText('Emissor adicionado');
});

test.afterAll(async () => {
  for (const p of [carteira, gov, outra]) await p?.context().close();
});

let jtiAntigo = '';

test('antes da troca: a carteira recebe uma Identidade assinada pela chave antiga', async () => {
  const tok = await emitirIdentidade();
  expect(payloadDe(tok).iss).toBe(didAntigo);
  jtiAntigo = payloadDe(tok).jti;
  await guardarNaCarteira(tok);
  await expect(gov.locator('#gRotAv')).toBeHidden();
});

test('a troca pede o PIN, 12 palavras novas conferidas e um PIN novo', async () => {
  await aba(gov, 'vGov');
  await gov.click('#gRot');
  await gov.click('#cfOk');
  await digitarPin(gov);
  await expect(gov.locator('#rtWords li')).toHaveCount(12);
  await expect(gov.locator('#rtWords')).toHaveClass(/veil/);

  const { words, check } = await gov.evaluate(() => ({ words: rot.words, check: rot.check }));
  for (const p of check) await gov.fill(`#rtConf .f[data-p="${p}"] input`, 'zzz');
  await gov.click('#rtGo');
  await expect(gov.locator('#rtH')).toHaveText('Alguma palavra não confere. Confira a anotação.');
  for (const p of check) await gov.fill(`#rtConf .f[data-p="${p}"] input`, words[p - 1]);
  await gov.click('#rtGo');

  await expect(gov.locator('#rtT')).toHaveText('PIN da chave nova');
  await digitarPin(gov, '123456');
  await expect(gov.locator('#rtPad .pmsg')).toHaveText('Evite números repetidos e sequências. Escolha outro PIN.');
  await expect(gov.locator('#rtPad')).not.toHaveClass(/busy/);
  await digitarPin(gov, PIN_NOVO);
  await expect(gov.locator('#rtT')).toHaveText('Repita o PIN');
  await expect(gov.locator('#rtPad')).not.toHaveClass(/busy/);
  await digitarPin(gov, PIN_NOVO);
  await expect(toast(gov)).toHaveText('Chave trocada. Copie o aviso para quem confia na Governança');

  didNovo = await gov.evaluate(() => ses.did);
  expect(didNovo).not.toBe(didAntigo);
  await expect(gov.locator('#gDid')).toHaveText(didNovo);
  await expect(gov.locator('#gRotAv')).toBeVisible();
  expect(await gov.evaluate(() => st.keys.map(k => k.did))).toEqual([didAntigo, didNovo]);
  expect(await gov.evaluate(() => st.book.slice(-2).map(e => e.act))).toEqual(['rotacao', 'rotacao']);
});

test('o livro continua íntegro, conferido com a chave de cada época', async () => {
  await aba(gov, 'vPanel');
  await expect(gov.locator('#pBook')).toContainText('Livro íntegro');
  // Um ato da época antiga assinado com a chave nova quebraria a corrente.
  expect(await gov.evaluate(async () => {
    const b = JSON.parse(JSON.stringify(st.book));
    b[0].sig = st.book.at(-1).sig;
    return (await checkBook(b)).ok;
  })).toBe(false);
});

test('bloqueada, a Governança abre com o PIN novo e a identidade nova', async () => {
  await gov.click('#lockBtn');
  await telaDoPin(gov, 'Digite seu PIN');
  await digitarPin(gov, PIN);
  await expect(gov.locator('#pinPad .pmsg')).toHaveText('PIN incorreto.');
  await expect(gov.locator('#pinPad')).not.toHaveClass(/busy/);
  await digitarPin(gov, PIN_NOVO);
  await expect(gov.locator('#sApp')).toBeVisible();
  expect(await gov.evaluate(() => ses.did)).toBe(didNovo);
  expect(await gov.evaluate(() => st.issued.length)).toBeGreaterThan(0);
});

test('a credencial da chave antiga continua sendo desta Governança', async () => {
  const out = await apresentar(jtiAntigo);
  await expect(out).toContainText('Apresentação aprovada');
  await expect(out.locator('.chk.ok').filter({ hasText: 'Emissor confiável' })).toHaveCount(1);
  await expect(out.locator('.chk.ok').filter({ hasText: 'Não revogada' })).toHaveCount(1);
});

test('emissões novas saem assinadas pela chave nova', async () => {
  const tok = await emitirIdentidade();
  expect(payloadDe(tok).iss).toBe(didNovo);
  expect(payloadDe(tok).vc.issuer.id).toBe(didNovo);
});

test.describe('aviso de troca', () => {
  test('é assinado pela chave antiga e aceito pela nova', async () => {
    aviso = await gov.evaluate(() => embrulhar(st.rotations.at(-1)));
    expect(aviso).toMatch(/^SYSTEKNA:ROTACAO:ey/);
    const p = payloadDe(aviso);
    expect([p.iss, p.novo]).toEqual([didAntigo, didNovo]);
  });

  test('quem confiava no DID antigo importa o aviso e passa a confiar no novo', async () => {
    await importarAviso(aviso);
    await expect(toast(outra)).toHaveText('Troca de chave importada');
    expect(await outra.evaluate(() => st.trust.map(t => t.did))).toEqual([didNovo]);
    expect(await outra.evaluate(() => st.book.at(-1).text)).toContain('trocou de chave');

    await importarAviso(aviso);
    await expect(outra.locator('#irH')).toHaveText('Esta troca já foi importada.');
    await fecharSheet(outra);
  });

  test('aviso sem o aceite da chave nova, alterado ou de emissor não confiável é recusado', async () => {
    // Assinado pela chave antiga de alguém, mas sem a assinatura da chave nova.
    const semAceite = await outra.evaluate(async novo => embrulhar(await signJWT('rotacao+jwt', { iss: ses.did, novo, aceite: 'AAAA', iat: now() })), didNovo);
    await importarAviso(semAceite);
    await expect(outra.locator('#irH')).toHaveText('A chave nova não assinou o aceite: o aviso não vale.');
    await fecharSheet(outra);

    // O conteúdo trocado depois de assinado: a chave nova passa a ser outra.
    const [prefixo, h, , sig] = aviso.match(/^(SYSTEKNA:ROTACAO:)([^.]+)\.([^.]+)\.(.+)$/).slice(1);
    const corpo = { ...payloadDe(aviso), novo: await outra.evaluate(() => ses.did) };
    const alterado = `${prefixo}${h}.${Buffer.from(JSON.stringify(corpo)).toString('base64url')}.${sig}`;
    await importarAviso(alterado);
    await expect(outra.locator('#irH')).toHaveText('A assinatura da chave antiga não confere: o aviso foi alterado.');
    await fecharSheet(outra);

    // Sem confiar na Governança, o aviso não muda nada.
    await aba(outra, 'vGov');
    await outra.click('#gTrust [data-untrust="0"]');
    await outra.click('#cfOk');
    await expect(toast(outra)).toHaveText('Emissor removido');
    await importarAviso(aviso);
    await expect(outra.locator('#irH')).toHaveText('O emissor da chave antiga não está na sua lista de confiança.');
    await fecharSheet(outra);
    expect(await outra.evaluate(() => st.trust.length)).toBe(0);
  });
});

test('nenhuma violação de CSP em todo o fluxo acima', () => {
  expect(violacoesCsp).toEqual([]);
});
