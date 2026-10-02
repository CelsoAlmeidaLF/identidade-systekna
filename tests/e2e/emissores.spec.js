// @ts-check
// Opção C: vários emissores no mesmo aparelho (raiz e serviço), cada um com banco, PIN e chave próprios.
// A troca bloqueia o emissor atual e recarrega a página no outro.
const { test, expect } = require('@playwright/test');
const { WORDS, preparar, aba, toast, fecharSheet, telaDoPin, digitarPin, payloadDe, vigiarCsp } = require('./helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let page;
let didRaiz = '';
let didServico = '';
/** @type {string[]} */ const violacoesCsp = [];

const did = () => page.evaluate(() => ses.did);

/** Na tela de boas-vindas de um emissor novo: recupera com as palavras e cria o PIN. */
async function recuperarAqui(palavras) {
  await expect(page.locator('#sWelcome')).toBeVisible();
  await page.click('#goRecover');
  await page.fill('#recWords', palavras);
  await page.click('#recGo');
  await telaDoPin(page, 'Crie um PIN de 6 dígitos');
  await digitarPin(page);
  await telaDoPin(page, 'Repita o PIN');
  await digitarPin(page);
  await expect(page.locator('#sApp')).toBeVisible();
}

/** Troca pela Governança e digita o PIN do outro emissor. */
async function abrirEmissor(nome) {
  await aba(page, 'vGov');
  const linha = page.locator('#gSlots .tx', { hasText: nome });
  await Promise.all([page.waitForEvent('load'), (async () => { await linha.locator('[data-open]').click(); await page.click('#cfOk'); })()]);
  await telaDoPin(page, 'Digite seu PIN');
  await expect(page.locator('#slotBar')).toContainText(nome);
  await digitarPin(page);
  await expect(page.locator('#sApp')).toBeVisible();
}

async function adicionarEmissor(nome, derivado) {
  await aba(page, 'vGov');
  await page.click('#gSlots [data-add]');
  await page.fill('#slN', nome);
  if (derivado) await page.click('#slK [data-k="derived"]');
  await Promise.all([page.waitForEvent('load'), page.click('#slGo')]);
}

test.beforeAll(async ({ browser }) => {
  page = await (await browser.newContext()).newPage();
  vigiarCsp(page, violacoesCsp);
  await preparar(page, 'emissor-systekna.html', WORDS.emissor);
  didRaiz = await did();
});

test.afterAll(async () => { await page?.context().close(); });

test('01 · o emissor original é a raiz e aparece sozinho na lista', async () => {
  await expect(page.locator('#whoLabel')).toHaveText('Emissor de Credenciais Systekna · Raiz');
  await aba(page, 'vGov');
  await expect(page.locator('#gSlots .tx:not([data-add])')).toHaveCount(1);
  await expect(page.locator('#gSlots')).toContainText('Aberto agora');
});

test('02 · adicionar emissor de serviço com 12 palavras próprias abre um emissor separado', async () => {
  await adicionarEmissor('Systekna Serviços', false);
  await expect(page.locator('#slotBarW')).toContainText('Emissor: Systekna Serviços');
  await recuperarAqui(WORDS.outroEmissor);
  didServico = await did();
  expect(didServico).not.toBe(didRaiz);
  await expect(page.locator('#whoLabel')).toHaveText('Systekna Serviços · Raiz');
  await aba(page, 'vGov');
  await expect(page.locator('#gName')).toHaveValue('Systekna Serviços');
  await expect(page.locator('#gSlots .tx:not([data-add])')).toHaveCount(2);
});

test('03 · credenciamento guiado no mesmo aparelho: o serviço pede, a raiz emite, o serviço importa', async () => {
  await aba(page, 'vGov');
  await page.click('#gCred [data-cr="ask"]');
  await page.fill('#caO', 'Portal Systekna');
  await page.click('#caGo');
  const pedido = await page.inputValue('#caJ');
  await fecharSheet(page);

  await abrirEmissor('Emissor de Credenciais Systekna');
  expect(await did()).toBe(didRaiz);
  await aba(page, 'vIssue');
  await page.fill('#iqT', pedido);
  await page.click('#iqGo');
  await expect(page.locator('#iType')).toHaveValue('AccreditationCredential');
  await page.locator('#iClaims [data-cv]').nth(1).fill('Portal Systekna');
  await page.click('#iGo');
  await expect(page.locator('#iOut')).toBeVisible();
  const credenciamento = await page.inputValue('#iJwt');
  expect(payloadDe(credenciamento).sub).toBe(didServico);

  await abrirEmissor('Systekna Serviços');
  expect(await did()).toBe(didServico);
  await aba(page, 'vGov');
  await page.click('#gTrustAdd');
  await page.fill('#tn', 'Systekna');
  await page.fill('#td', didRaiz);
  await page.click('#tGo');
  await page.click('#gCred [data-cr="imp"]');
  await page.fill('#ciT', credenciamento);
  await page.click('#ciGo');
  await expect(toast(page)).toHaveText('Credenciamento importado');
  await expect(page.locator('#whoLabel')).toHaveText('Systekna Serviços · Serviço');
  await aba(page, 'vIssue');
  await expect(page.locator('#iType option')).toHaveText(['Crachá']);
});

test('04 · emissor derivado das palavras da raiz tem DID próprio e avisa que é só demonstração', async () => {
  await adicionarEmissor('Demo Derivado', true);
  await expect(page.locator('#slotBarW')).toContainText('derivado · demonstração');
  await expect(page.locator('#slotBarW')).toContainText('Só para demonstração: quem tiver essas palavras abre os dois emissores.');
  await recuperarAqui(WORDS.emissor);
  const derivado = await did();
  expect(derivado).not.toBe(didRaiz);
  expect(derivado).not.toBe(didServico);
  // O mesmo caminho dá o mesmo DID depois de bloquear e abrir de novo.
  await page.click('#lockBtn');
  await telaDoPin(page, 'Digite seu PIN');
  await digitarPin(page);
  await expect(page.locator('#sApp')).toBeVisible();
  expect(await did()).toBe(derivado);
});

test('05 · a tela do PIN mostra o emissor e deixa trocar; um emissor de serviço pode ser removido', async () => {
  await page.click('#lockBtn');
  await telaDoPin(page, 'Digite seu PIN');
  await expect(page.locator('#slotBar')).toContainText('Emissor: Demo Derivado');
  await page.click('#slotBar [data-slotpick]');
  await Promise.all([page.waitForEvent('load'), page.click('#sheetBody [data-to="0"]')]);
  await telaDoPin(page, 'Digite seu PIN');
  await expect(page.locator('#slotBar')).toContainText('Emissor de Credenciais Systekna');
  await digitarPin(page);
  await expect(page.locator('#sApp')).toBeVisible();
  expect(await did()).toBe(didRaiz);

  await aba(page, 'vGov');
  await expect(page.locator('#gSlots .tx', { hasText: 'Emissor de Credenciais Systekna' }).locator('[data-del]')).toHaveCount(0);
  await page.locator('#gSlots .tx', { hasText: 'Demo Derivado' }).locator('[data-del]').click();
  await page.click('#cfOk');
  await expect(toast(page)).toHaveText('Emissor removido deste aparelho');
  await expect(page.locator('#gSlots')).not.toContainText('Demo Derivado');
  await expect(page.locator('#gSlots .tx:not([data-add])')).toHaveCount(2);
});

test('06 · nenhum fluxo esbarrou na CSP', async () => {
  expect(violacoesCsp).toEqual([]);
});
