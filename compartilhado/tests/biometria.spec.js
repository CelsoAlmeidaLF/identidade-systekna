// @ts-check
// Desbloqueio por biometria (passkey com PRF). O sensor do aparelho é simulado pelo autenticador
// virtual do Chrome (CDP), que reconhece ou recusa a "digital" conforme o teste pede.
const { test, expect } = require('@playwright/test');
const { WORDS, preparar, telaDoPin, digitarPin, aba, toast, vigiarCsp } = require('./helpers');

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
    await preparar(page, 'carteira-systekna.html', WORDS.carteira);
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
    await page.fill('#recWords', WORDS.outroEmissor);
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
  await preparar(page, 'carteira-systekna.html', WORDS.carteira);
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
  await preparar(page, 'carteira-systekna.html', WORDS.carteira);
  await abrirAjusteBio(page);
  await expect(page.locator('#sheetBody h3')).toHaveText('Ativar biometria');
  await digitarPin(page);
  await expect(toast(page)).toHaveText('Este aparelho não oferece biometria com chave de cifragem. Continue usando o PIN.');
  expect(await bioLock(page)).toBeUndefined();
  await page.context().close();
});

test('emissor também desbloqueia com biometria', async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await sensor(page);
  await preparar(page, 'governanca-systekna.html', WORDS.emissor);
  await ativarBio(page);
  await bloquear(page);
  await page.click('#bioBtn');
  await expect(page.locator('#sApp')).toBeVisible();
  await expect(page.locator('#pBook')).toContainText('Livro íntegro');
  await page.context().close();
});

const lockPin = page => page.evaluate(() => DB.get('lock'));

async function ativarSoBio(page) {
  await page.click('#commonSet [data-cs="bioOnly"]');
  await expect(page.locator('#sheetBody h3')).toHaveText('Usar só biometria');
  await page.click('#cfOk');
  await expect(toast(page)).toHaveText('PIN apagado. Só a biometria abre os dados');
}

test.describe('só biometria', () => {
  /** @type {import('@playwright/test').Page} */ let page;
  /** @type {string[]} */ const violacoes = [];

  test.beforeAll(async ({ browser }) => {
    page = await (await browser.newContext()).newPage();
    vigiarCsp(page, violacoes);
    await sensor(page);
    await preparar(page, 'carteira-systekna.html', WORDS.carteira);
  });
  test.afterAll(async () => { await page?.context().close(); });

  test('a opção só aparece com a biometria ativada', async () => {
    await aba(page, 'vSet');
    await expect(page.locator('#commonSet [data-cs="bioOnly"]')).toBeHidden();
    await ativarBio(page);
    await expect(page.locator('#commonSet [data-cs="bioOnly"]')).toBeVisible();
    await expect(page.locator('#csBioOnly')).toHaveText('Desativado');
  });

  test('ativar confere a biometria e apaga o PIN do aparelho', async () => {
    await ativarSoBio(page);
    expect(await lockPin(page)).toBeUndefined();
    expect(await bioLock(page)).toBeDefined();
    await expect(page.locator('#csBioOnly')).toHaveText('Ativado');
    await expect(page.locator('#commonSet [data-cs="pin"]')).toBeHidden();
    await expect(page.locator('#csWordsHow')).toHaveText('Pede a biometria');
  });

  test('tela de bloqueio sem teclado: dígitos são ignorados e a biometria abre', async () => {
    await page.click('#lockBtn');
    await telaDoPin(page, 'Use a biometria');
    await expect(page.locator('#pinPad .keys')).toBeHidden();
    await expect(page.locator('#pinLink')).toHaveText('Recuperar com as 12 palavras');
    await digitarPin(page);
    await expect(page.locator('#pinPad .dots i.on')).toHaveCount(0);
    expect((await guard(page)).fails).toBe(0);
    await page.click('#bioBtn');
    await expect(page.locator('#sApp')).toBeVisible();
  });

  test('recarregar a página volta para a tela da biometria', async () => {
    await page.reload();
    await telaDoPin(page, 'Use a biometria');
    await page.click('#bioBtn');
    await expect(page.locator('#sApp')).toBeVisible();
  });

  test('ver as 12 palavras pede a biometria no lugar do PIN', async () => {
    await aba(page, 'vSet');
    await page.click('#commonSet [data-cs="words"]');
    await expect(page.locator('#swGrid li')).toHaveCount(12);
    await expect(page.locator('#swGrid li').first()).toHaveText('abandon');
    await page.click('#swClose');
  });

  test('não deixa desativar a biometria enquanto ela é a única entrada', async () => {
    await page.click('#commonSet [data-cs="bio"]');
    await expect(toast(page)).toHaveText('Sem PIN, a biometria é a única entrada. Desligue antes "Usar só biometria".');
    expect(await bioLock(page)).toBeDefined();
  });

  test('desligar pede a biometria e cria um PIN novo', async () => {
    await page.click('#commonSet [data-cs="bioOnly"]');
    await expect(page.locator('#sheetBody h3')).toHaveText('Novo PIN');
    await digitarPin(page, '246813');
    await expect(page.locator('#cpT')).toHaveText('Repita o novo PIN');
    await digitarPin(page, '246813');
    await expect(toast(page)).toHaveText('PIN criado');
    await expect(page.locator('#csBioOnly')).toHaveText('Desativado');
    await expect(page.locator('#commonSet [data-cs="pin"]')).toBeVisible();
    await page.click('#lockBtn');
    await telaDoPin(page, 'Digite seu PIN');
    await expect(page.locator('#bioBtn')).toHaveClass(/ghost/);
    await digitarPin(page, '246813');
    await expect(page.locator('#sApp')).toBeVisible();
  });

  test('recuperar pelas 12 palavras no modo só biometria cria um PIN de novo', async () => {
    await aba(page, 'vSet');
    await ativarSoBio(page);
    await page.click('#lockBtn');
    await telaDoPin(page, 'Use a biometria');
    await page.click('#pinLink');
    await page.fill('#recWords', WORDS.carteira);
    await page.click('#recGo');
    await telaDoPin(page, 'Crie um PIN de 6 dígitos');
    await expect(page.locator('#pinPad .keys')).toBeVisible();
    await expect(page.locator('#bioBtn')).toBeHidden();
    await digitarPin(page);
    await telaDoPin(page, 'Repita o PIN');
    await digitarPin(page);
    await expect(page.locator('#sApp')).toBeVisible();
    expect(await lockPin(page)).toBeDefined();
  });

  test('nenhuma violação de CSP', () => {
    expect(violacoes).toEqual([]);
  });
});

test('só biometria: biometria recusada ao ativar mantém o PIN', async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  const dedo = await sensor(page);
  await preparar(page, 'carteira-systekna.html', WORDS.carteira);
  await ativarBio(page);
  await dedo.reconhece(false);
  await page.click('#commonSet [data-cs="bioOnly"]');
  await page.click('#cfOk');
  await expect(toast(page)).toHaveText('Biometria cancelada. O PIN continua ativo.');
  expect(await lockPin(page)).toBeDefined();
  await page.context().close();
});

test('só biometria: recusa na tela de bloqueio não oferece o PIN', async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  const dedo = await sensor(page);
  await preparar(page, 'governanca-systekna.html', WORDS.emissor);
  await ativarBio(page);
  await ativarSoBio(page);
  await page.click('#lockBtn');
  await telaDoPin(page, 'Use a biometria');
  await dedo.reconhece(false);
  await page.click('#bioBtn');
  await expect(page.locator('#pinPad .pmsg')).toHaveText('Biometria cancelada ou não reconhecida. Tente de novo.');
  await expect(page.locator('#sPin')).toBeVisible();
  await page.context().close();
});
