// @ts-check
// F1.2 (plan.md): emissores confiáveis na carteira, credenciais agrupadas por emissor e grupo,
// "emissor desconhecido", "vencida" e renovação da credencial de grupo.
const { test, expect } = require('@playwright/test');
const { WORDS, preparar, bloquearEDesbloquear, aba, toast, fecharSheet, vigiarCsp, payloadDe } = require('./helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {import('@playwright/test').Page} */ let celso;
/** @type {import('@playwright/test').Page} */ let amigo;
/** @type {string[]} */ const violacoesCsp = [];
let didCarteira = '';
let xCarteira = '';

async function acao(acao) {
  await carteira.click('#dockAdd');
  await carteira.click(`#sheetBody [data-act="${acao}"]`);
}

async function pedir(nome) {
  await acao('ask');
  await carteira.fill('#aqN', nome);
  await carteira.selectOption('#aqT', 'MembroDoGrupo');
  await carteira.click('#aqGo');
  await expect(carteira.locator('#aqOut')).toBeVisible();
  const tok = await carteira.inputValue('#aqJ');
  await fecharSheet(carteira);
  return tok;
}

async function prepararEmissor(page, nome, grupo) {
  await aba(page, 'vGov');
  await page.fill('#gName', nome);
  await page.click('#gNameS');
  await page.click('#gGrpAdd');
  await page.fill('#ng', grupo);
  await page.click('#ngGo');
  await expect(toast(page)).toHaveText('Grupo criado');
}

async function emitirNoGrupo(page, tok, grupo) {
  await aba(page, 'vIssue');
  if (await page.locator('#iOut').isVisible()) await page.click('#iNew');
  await page.fill('#iqT', tok);
  await page.click('#iqGo');
  await expect(page.locator('#iForm')).toBeVisible();
  await page.selectOption('#iType', 'MembroDoGrupo');
  await page.selectOption('#iGrp', { label: grupo });
  await page.click('#iGo');
  await expect(page.locator('#iOut')).toBeVisible();
  await expect(page.locator('#iOk')).toContainText('Credencial emitida');
  return page.inputValue('#iJwt');
}

/** Emite pelo núcleo do emissor uma credencial de grupo com validade em segundos (para testar vencimento). */
const emitirCurta = (page, segundos) => page.evaluate(([sub, x, s]) =>
  issue(sub, 'MembroDoGrupo', { grupo: 'Família', nome: 'Maria Teste', chaveCifragem: x }, s / 86400, 'Maria Teste'),
  [didCarteira, xCarteira, segundos]);

async function receber(tok) {
  await acao('get');
  await carteira.fill('#rcT', tok);
  await carteira.click('#rcGo');
  await expect(toast(carteira)).toHaveText('Credencial guardada');
}

async function convite(page) {
  await aba(page, 'vGov');
  await page.click('#gInv');
  const tok = await page.inputValue('#gInvT');
  await fecharSheet(page);
  return tok;
}

async function confiar(tok) {
  await acao('trust');
  await carteira.fill('#tiT', tok);
  await carteira.click('#tiGo');
  await carteira.click('#tiOk');
}

const secao = page => carteira.locator(`#cList .csec[data-issuer="${page}"]`);
const didDe = page => page.evaluate(() => ses.did);

test.beforeAll(async ({ browser }) => {
  [carteira, celso, amigo] = await Promise.all([1, 2, 3].map(async () => (await browser.newContext()).newPage()));
  [carteira, celso, amigo].forEach(p => vigiarCsp(p, violacoesCsp));
  await preparar(celso, 'emissor-systekna.html', WORDS.emissor);
  await preparar(amigo, 'emissor-systekna.html', WORDS.outroEmissor);
  await preparar(carteira, 'carteira-systekna.html', WORDS.carteira);
  didCarteira = await didDe(carteira);
  xCarteira = await carteira.evaluate(() => ses.xMb);
  await prepararEmissor(celso, 'Emissor do Celso', 'Família');
  await prepararEmissor(amigo, 'Emissor do Amigo', 'Futebol');
});

test.afterAll(async () => {
  for (const p of [carteira, celso, amigo]) await p?.context().close();
});

test('credencial de emissor não aceito aparece como "emissor desconhecido"', async () => {
  await receber(await emitirNoGrupo(celso, await pedir('Maria Teste'), 'Família (6 meses)'));
  const s = secao(await didDe(celso));
  await expect(s.locator('.sec-h')).toContainText('Emissor do Celso');
  await expect(s.locator('.sec-h')).toContainText('Emissor desconhecido');
  await expect(s.locator('.cred .main')).toHaveText('Família');
});

test('importar o convite tira a marca e lista o emissor em Contatos', async () => {
  await confiar(await convite(celso));
  await expect(toast(carteira)).toHaveText('Emissor confiável adicionado');
  await aba(carteira, 'vCreds');
  await expect(secao(await didDe(celso)).locator('.sec-h')).not.toContainText('Emissor desconhecido');
  await aba(carteira, 'vContacts');
  await expect(carteira.locator('#ctIss')).toContainText('Emissor do Celso');
});

test('credenciais de dois emissores ficam cada uma no emissor e no grupo certos', async () => {
  await receber(await emitirNoGrupo(amigo, await pedir('Maria Teste'), 'Futebol (6 meses)'));
  await aba(carteira, 'vCreds');
  const sc = secao(await didDe(celso)), sa = secao(await didDe(amigo));
  await expect(sc.locator('.cred .main')).toHaveText(['Família']);
  await expect(sa.locator('.cred .main')).toHaveText(['Futebol']);
  await expect(sa.locator('.sec-h')).toContainText('Emissor do Amigo');
  await expect(sa.locator('.sec-h')).toContainText('Emissor desconhecido');
  // Os confiáveis vêm primeiro.
  await expect(carteira.locator('#cList .csec').first()).toHaveAttribute('data-issuer', await didDe(celso));
});

test('confiar no emissor A não faz confiar nos emissores em que A confia', async () => {
  await aba(celso, 'vGov');
  await celso.click('#gTrustAdd');
  await celso.fill('#tn', 'Emissor do Amigo');
  await celso.fill('#td', await didDe(amigo));
  await celso.click('#tGo');
  await expect(toast(celso)).toHaveText('Emissor adicionado');
  await aba(carteira, 'vContacts');
  await aba(carteira, 'vCreds');
  await expect(secao(await didDe(amigo)).locator('.sec-h')).toContainText('Emissor desconhecido');
});

test('convite alterado ou vencido é recusado', async () => {
  const credencial = await emitirNoGrupo(amigo, await pedir('Maria Teste'), 'Futebol (6 meses)');
  const tok = await convite(amigo);
  const [h, p, s] = tok.split('.');
  const outro = Buffer.from(JSON.stringify({ ...payloadDe(tok), name: 'Emissor falso' })).toString('base64url');
  await acao('trust');
  await carteira.fill('#tiT', [h, outro, s].join('.'));
  await carteira.click('#tiGo');
  await expect(carteira.locator('#tiH')).toHaveText('A assinatura do convite não confere: ele foi alterado ou não é deste emissor.');

  const vencido = await amigo.evaluate(() => { const iat = now() - 40 * 86400; return signJWT('emissor+jwt', { iss: ses.did, name: st.name, iat, exp: iat + 30 * 86400 }); });
  await carteira.fill('#tiT', vencido);
  await carteira.click('#tiGo');
  await expect(carteira.locator('#tiH')).toHaveText('Este convite venceu. Peça um novo ao emissor.');

  await carteira.fill('#tiT', credencial);
  await carteira.click('#tiGo');
  await expect(carteira.locator('#tiH')).toHaveText('Isto não é um convite de emissor. No emissor, ele fica em Governança.');
  await fecharSheet(carteira);
});

test('credencial vencida aparece como "vencida" e não serve para apresentar', async () => {
  await receber(await emitirCurta(celso, 4));
  await expect(async () => {
    await aba(carteira, 'vContacts');
    await aba(carteira, 'vCreds');
    await expect(carteira.locator('#cList .cred.dim .pill')).toHaveText('Vencida', { timeout: 500 });
  }).toPass({ timeout: 15_000 });
});

test('perto do vencimento, a carteira avisa e pede renovação com o grupo já preenchido', async () => {
  await receber(await emitirCurta(celso, 5 * 86400));
  await aba(carteira, 'vCreds');
  const card = carteira.locator('#cList .cred', { hasText: 'Vence em 5 dias' });
  await expect(card).toHaveCount(1);
  await card.click();
  await carteira.click('#scR');
  await expect(carteira.locator('#aqN')).toHaveValue('Maria Teste');
  await expect(carteira.locator('#aqT')).toHaveValue('MembroDoGrupo');
  await carteira.click('#aqGo');
  const tok = await carteira.inputValue('#aqJ');
  expect(payloadDe(tok)).toMatchObject({ wanted: 'MembroDoGrupo', grupo: 'Família', x: xCarteira });
  await fecharSheet(carteira);

  // No emissor, o pedido de renovação já chega com o tipo e o grupo escolhidos: é só emitir.
  await aba(celso, 'vIssue');
  if (await celso.locator('#iOut').isVisible()) await celso.click('#iNew');
  await celso.fill('#iqT', tok);
  await celso.click('#iqGo');
  await expect(celso.locator('#iForm')).toBeVisible();
  await expect(celso.locator('#iType')).toHaveValue('MembroDoGrupo');
  await expect(celso.locator('#iGrp option:checked')).toHaveText('Família (6 meses)');
  await celso.click('#iGo');
  await expect(celso.locator('#iOut')).toBeVisible();
  await receber(await celso.inputValue('#iJwt'));
});

test('emissores confiáveis ficam cifrados no cofre e sobrevivem a bloquear e desbloquear', async () => {
  const guardado = await carteira.evaluate(async () => JSON.stringify(await DB.get('items')));
  expect(guardado).not.toContain('Emissor do Celso');
  await bloquearEDesbloquear(carteira);
  await aba(carteira, 'vContacts');
  await expect(carteira.locator('#ctIss')).toContainText('Emissor do Celso');
});

test('deixar de confiar devolve a marca de "emissor desconhecido"', async () => {
  await aba(carteira, 'vContacts');
  await carteira.click('#ctIss [data-untrust]');
  await carteira.click('#cfOk');
  await expect(toast(carteira)).toHaveText('Emissor removido');
  await expect(carteira.locator('#ctIss')).toContainText('Nenhum emissor ainda');
  await aba(carteira, 'vCreds');
  await expect(secao(await didDe(celso)).locator('.sec-h')).toContainText('Emissor desconhecido');
});

test('nenhuma violação de CSP', () => {
  expect(violacoesCsp).toEqual([]);
});
