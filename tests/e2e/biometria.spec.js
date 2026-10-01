// @ts-check
// Desbloqueio por biometria (passkey com PRF). O sensor do aparelho é simulado pelo autenticador
// virtual do Chrome (CDP), que reconhece ou recusa a "digital" conforme o teste pede.
const { test, expect } = require('@playwright/test');
const { WORDS, instituir, telaDoPin, digitarPin, aba, toast, vigiarCsp } = require('./helpers');

test.describe.configure({ mode: 'serial' });

/** Liga um sensor biométrico simulado na página. */
async function sensor(page, { prf = true } = {}) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, hasPrf: prf, automaticPresenceSimulation: true },
  });
  return {
    reconhece: ok => cdp.send('WebAuthn.setUserVerified', { authenticatorId, isUserVerified: ok }),
    credenciais: async () => (await cdp.send('WebAuthn.getCredentials', { authenticatorId })).credentials,
  };
}

const bioLock = page => page.evaluate(() => DB.get('bioLock'));
const guard = page => page.evaluate(async () => (await DB.get('guard')) || { fails: 0 });

async function abrirAjusteBio(page) {
  await aba(page, page.url().includes('carteira') ? 'vSet' : 'vGov');
  await page.click('#commonSet [data-cs="bio"]');
}

async function ativarBio(page) {
  await abrirAjusteBio(page);
  await expect(page.locator('#sheetBody h3')).toHaveText('Ativar biometria');
  await digitarPin(page);
  await expect(toast(page)).toHaveText('Biometria ativada');
}

async function bloquear(page) {
  await page.click('#lockBtn');
  await telaDoPin(page, 'Digite seu PIN');
}

test.describe('carteira', () => {
  /** @type {import('@playwright/test').Page} */ let page;
  /** @type {Awaited<ReturnType<typeof sensor>>} */ let dedo;
  /** @type {string[]} */ const violacoes = [];

  test.beforeAll(async ({ browser }) => {
    page = await (await browser.newContext()).newPage();
    vigiarCsp(page, violacoes);
    dedo = await sensor(page);
    await instituir(page, 'carteira-systekna.html', WORDS.carteira);
  });
  test.afterAll(async () => { await page?.context().close(); });

  test('ajuste aparece desativado e a tela de PIN não oferece biometria', async () => {
    await aba(page, 'vSet');
    await expect(page.locator('#commonSet [data-cs="bio"]')).toBeVisible();
    await expect(page.locator('#csBio')).toHaveText('Desativado');
    await bloquear(page);
    await expect(page.locator('#bioBtn')).toBeHidden();
    await digitarPin(page);
    await expect(page.locator('#sApp')).toBeVisible();
  });

  test('ativar pede o PIN e cria a passkey com PRF', async () => {
    await ativarBio(page);
    await expect(page.locator('#csBio')).toHaveText('Ativado');
    expect(await dedo.credenciais()).toHaveLength(1);
    const L = await bioLock(page);
    expect(L).toMatchObject({ v: 1 });
    expect(Object.keys(L).sort()).toEqual(['cred', 'ct', 'iv', 'salt', 'v']);
  });

  test('desbloqueia só com a biometria, sem digitar o PIN', async () => {
    const didAntes = await page.evaluate(() => ses.did);
    await bloquear(page);
    await expect(page.locator('#bioBtn')).toBeVisible();
    await page.click('#bioBtn');
    await expect(page.locator('#sApp')).toBeVisible();
    expect(await page.evaluate(() => ses.did)).toBe(didAntes);
  });

  test('o PIN continua funcionando com a biometria ativada', async () => {
    await bloquear(page);
    await digitarPin(page);
    await expect(page.locator('#sApp')).toBeVisible();
  });

  test('o registro guardado não abre sem o segredo do autenticador', async () => {
    // Tenta abrir a camada da biometria com um segredo qualquer, como faria um código malicioso na página.
    const abriu = await page.evaluate(async () => {
      const L = await DB.get('bioLock');
      try { await unseal(await bioKey(rnd(32), b64u.dec(L.salt)), L, 'bio', true); return true; } catch { return false; }
    });
    expect(abriu).toBe(false);
  });

  test('desativar apaga o registro e some da tela de PIN', async () => {
    await abrirAjusteBio(page);
    await page.click('#cfOk');
    await expect(toast(page)).toHaveText('Biometria desativada');
    await expect(page.locator('#csBio')).toHaveText('Desativado');
    expect(await bioLock(page)).toBeUndefined();
    await bloquear(page);
    await expect(page.locator('#bioBtn')).toBeHidden();
    await digitarPin(page);
    await expect(page.locator('#sApp')).toBeVisible();
  });

  test('recuperar outra identidade apaga a biometria da anterior', async () => {
    await ativarBio(page);
    await bloquear(page);
    await page.click('#pinLink');
    await page.fill('#recWords', WORDS.outroCartorio);
    await page.click('#recGo');
    await page.click('#cfOk');
    await telaDoPin(page, 'Crie um PIN de 6 dígitos');
    expect(await bioLock(page)).toBeUndefined();
  });

  test('nenhuma violação de CSP', () => {
    expect(violacoes).toEqual([]);
  });
});

test('biometria não reconhecida mantém bloqueado e não gasta tentativa de PIN', async ({ browser }) => {
  // Contexto próprio: o sensor virtual do Chrome com PRF trava depois de uma recusa (mesmo numa
  // chamada WebAuthn pura, sem código da página). Num aparelho real a pessoa tenta de novo.
  const page = await (await browser.newContext()).newPage();
  const dedo = await sensor(page);
  await instituir(page, 'carteira-systekna.html', WORDS.carteira);
  await ativarBio(page);
  await bloquear(page);
  await dedo.reconhece(false);
  await page.click('#bioBtn');
  await expect(page.locator('#pinPad .pmsg')).toHaveText('Biometria cancelada ou não reconhecida. Tente de novo ou use o PIN.');
  await expect(page.locator('#sPin')).toBeVisible();
  expect((await guard(page)).fails).toBe(0);
  await digitarPin(page);
  await expect(page.locator('#sApp')).toBeVisible();
  await page.context().close();
});

test('aparelho sem PRF: não ativa e explica por quê', async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await sensor(page, { prf: false });
  await instituir(page, 'carteira-systekna.html', WORDS.carteira);
  await abrirAjusteBio(page);
  await expect(page.locator('#sheetBody h3')).toHaveText('Ativar biometria');
  await digitarPin(page);
  await expect(toast(page)).toHaveText('Este aparelho não oferece biometria com chave de cifragem. Continue usando o PIN.');
  expect(await bioLock(page)).toBeUndefined();
  await page.context().close();
});

test('cartório também desbloqueia com biometria', async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await sensor(page);
  await instituir(page, 'cartorio-systekna.html', WORDS.cartorio);
  await ativarBio(page);
  await bloquear(page);
  await page.click('#bioBtn');
  await expect(page.locator('#sApp')).toBeVisible();
  await expect(page.locator('#pBook')).toContainText('Livro íntegro');
  await page.context().close();
});
