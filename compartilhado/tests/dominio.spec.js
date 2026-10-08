// @ts-check
// Separação de domínio: as mesmas 12 palavras geram uma identidade diferente em cada app.
// A Carteira mantém os rótulos originais (o DID das pessoas não muda). Governança e Serviços criados antes
// da separação continuam abrindo com o DID antigo e mostram um aviso.
const { test, expect } = require('@playwright/test');
const { PIN, WORDS, vigiarCsp, preparar, aba, telaDoPin, digitarPin } = require('./helpers');

test.describe.configure({ mode: 'serial' });

const DID_CARTEIRA = 'did:key:z6MkuKwMejuU5tavPVP5ZVWg9W1z28SY62DNXp3aBzyMsLXr';
/** @type {string[]} */ const violacoesCsp = [];

test('as mesmas 12 palavras geram um DID e uma chave de cifragem diferentes em cada app', async ({ browser }) => {
  const ids = [];
  for (const [arquivo, dominio] of [['carteira-systekna.html', ''], ['governanca-systekna.html', 'governanca'], ['servicos-systekna.html', 'servicos']]) {
    const page = await (await browser.newContext()).newPage();
    vigiarCsp(page, violacoesCsp);
    await preparar(page, arquivo, WORDS.carteira);
    const r = await page.evaluate(async () => ({ did: ses.did, x: ses.xMb, meta: await DB.get('meta') }));
    expect(r.meta.dom).toBe(dominio);
    expect(r.meta.did).toBe(r.did);
    ids.push(r);
    await page.context().close();
  }
  expect(ids[0].did).toBe(DID_CARTEIRA);
  expect(new Set(ids.map(i => i.did)).size).toBe(3);
  expect(new Set(ids.map(i => i.x)).size).toBe(3);
  for (const i of ids) expect(i.did).toMatch(/^did:key:z6Mk/);
});

test.describe('Governança criada antes da separação', () => {
  /** @type {import('@playwright/test').Page} */ let gov;
  let didAntigo = '';

  test.beforeAll(async ({ browser }) => {
    gov = await (await browser.newContext()).newPage();
    vigiarCsp(gov, violacoesCsp);
    await preparar(gov, 'governanca-systekna.html', WORDS.emissor);
    // Reproduz o aparelho de antes: identidade com os rótulos originais e meta sem domínio.
    didAntigo = await gov.evaluate(async palavras => {
      const antiga = await deriveIdentity(await wordsToSeed(palavras.split(' ')), '');
      ses = { ...antiga, ent: ses.ent, lang: 'en', dom: '' };
      st = { name: 'Governança antiga', issued: [], trust: [], book: [], challenges: [], seq: 0, verifs: 0 };
      await ato('abertura', 'Livro aberto e emissor criado', antiga.did);
      await save();
      await DB.set('meta', { did: antiga.did, lang: 'en', created: Date.now() });
      return antiga.did;
    }, WORDS.emissor);
  });

  test.afterAll(async () => { await gov?.context().close(); });

  test('continua abrindo com o DID e os dados de antes, e avisa', async () => {
    await gov.click('#lockBtn');
    await telaDoPin(gov, 'Digite seu PIN');
    await digitarPin(gov);
    await expect(gov.locator('#sApp')).toBeVisible();
    expect(await gov.evaluate(() => [ses.did, st.name])).toEqual([didAntigo, 'Governança antiga']);
    await expect(gov.locator('#pBook')).toContainText('Livro íntegro');
    await aba(gov, 'vGov');
    await expect(gov.locator('#gLeg')).toBeVisible();
    await expect(gov.locator('#gLeg')).toContainText('Trocar a chave');
  });

  test('recuperar com as mesmas 12 palavras no mesmo aparelho mantém o DID antigo', async () => {
    await gov.click('#lockBtn');
    await telaDoPin(gov, 'Digite seu PIN');
    await gov.click('#pinLink');
    await gov.fill('#recWords', WORDS.emissor);
    await gov.click('#recGo');
    await telaDoPin(gov, 'Crie um PIN de 6 dígitos');
    await digitarPin(gov, PIN);
    await telaDoPin(gov, 'Repita o PIN');
    await digitarPin(gov, PIN);
    await expect(gov.locator('#sApp')).toBeVisible();
    expect(await gov.evaluate(() => [ses.did, st.name])).toEqual([didAntigo, 'Governança antiga']);
  });

  test('uma Governança nova, com as mesmas palavras, já nasce com o DID próprio', async ({ browser }) => {
    const nova = await (await browser.newContext()).newPage();
    vigiarCsp(nova, violacoesCsp);
    await preparar(nova, 'governanca-systekna.html', WORDS.emissor);
    expect(await nova.evaluate(() => ses.did)).not.toBe(didAntigo);
    await aba(nova, 'vGov');
    await expect(nova.locator('#gLeg')).toBeHidden();
    await nova.context().close();
  });
});

test('Serviços novo não mostra o aviso de derivação antiga', async ({ browser }) => {
  const srv = await (await browser.newContext()).newPage();
  vigiarCsp(srv, violacoesCsp);
  await preparar(srv, 'servicos-systekna.html', WORDS.servico);
  await aba(srv, 'vSrv');
  await expect(srv.locator('#sLeg')).toBeHidden();
  await srv.context().close();
});

test('nenhuma violação de CSP em todo o fluxo acima', () => {
  expect(violacoesCsp).toEqual([]);
});
