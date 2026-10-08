// @ts-check
// Identidades (desenho aprovado em 03/10/2026): pelo menu + › Solicitar aprovação de identidade, a pessoa escolhe
// uma identidade ou cria uma nova com nome e perfil (Identidade, Profissional ou Personalizada com nome do perfil).
// Pode haver várias, inclusive do mesmo perfil, todas derivadas da semente das 12 palavras, cada uma com DID próprio.
const { test, expect } = require('@playwright/test');
const { WORDS, vigiarCsp, preparar, aba, toast, fecharSheet, payloadDe, bloquearEDesbloquear } = require('../../compartilhado/tests/helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {import('@playwright/test').Page} */ let gov;
/** @type {string[]} */ const violacoesCsp = [];
const DID_ZERO = 'did:key:z6MkuKwMejuU5tavPVP5ZVWg9W1z28SY62DNXp3aBzyMsLXr';
const DIA = 86_400;

async function abrirSolicitar() {
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="ask"]');
  await expect(carteira.locator('#aqL')).toBeVisible();
}

/** Solicita pela tela. n: número da identidade, ou 'novo'. Devolve o pedido assinado. */
async function solicitar(n, { nome, perfil, rotulo } = {}) {
  await abrirSolicitar();
  await carteira.click(`#aqL [data-n="${n}"]`);
  if (nome !== undefined) await carteira.fill('#aqN', nome);
  if (perfil) await carteira.selectOption('#aqP', perfil);
  if (rotulo !== undefined) await carteira.fill('#aqR', rotulo);
  await carteira.click('#aqGo');
  await expect(carteira.locator('#aqOut')).toBeVisible();
  const tok = await carteira.inputValue('#aqJ');
  await fecharSheet(carteira);
  return tok;
}

const identidades = () => carteira.evaluate(() => identidades().map(x => ({ n: x.n, nome: x.nome, perfil: x.perfil, rotulo: x.rotulo, did: x.id.did })));

test.beforeAll(async ({ browser }) => {
  [carteira, gov] = await Promise.all([1, 2].map(async () => (await browser.newContext()).newPage()));
  for (const p of [carteira, gov]) vigiarCsp(p, violacoesCsp);
  await preparar(gov, 'governanca-systekna.html', WORDS.emissor);
  await preparar(carteira, 'carteira-systekna.html', WORDS.carteira);
});

test.afterAll(async () => {
  for (const p of [carteira, gov]) await p?.context().close();
});

test('o menu + tem as três ações, e a aba Identidade não gerencia identidades', async () => {
  await carteira.click('#dockAdd');
  await expect(carteira.locator('#sheetBody [data-act] b')).toHaveText(['Solicitar aprovação de identidade', 'Receber aprovação de identidade', 'Apresentar credencial']);
  await fecharSheet(carteira);
  await aba(carteira, 'vId');
  await expect(carteira.locator('#idList')).toHaveCount(0);
  await expect(carteira.locator('#vId h2')).toHaveText('Identidade');
});

test('o rodapé tem 5 botões, com o + no centro e Apresentar', async () => {
  const botoes = carteira.locator('.dock > button');
  await expect(botoes).toHaveCount(5);
  await expect(botoes.nth(2)).toHaveId('dockAdd');
  await expect(botoes).toHaveText(['Credenciais', 'Identidade', '', 'Apresentar', 'Ajustes']);
  // O + fica no centro da barra.
  const [barra, mais] = await Promise.all([carteira.locator('.dock').boundingBox(), carteira.locator('#dockAdd').boundingBox()]);
  expect(Math.abs((mais.x + mais.width / 2) - (barra.x + barra.width / 2))).toBeLessThan(2);
  await carteira.click('#dockShow');
  await expect(carteira.locator('#sheetBody h3')).toHaveText('Apresentar credencial');
  await expect(carteira.locator('#apT')).toBeVisible();
  await fecharSheet(carteira);
});

test('a identidade nº 0 é a de sempre e já aparece para solicitar', async () => {
  await abrirSolicitar();
  await expect(carteira.locator('#aqL [data-n="0"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(carteira.locator('#aqL [data-n="0"]')).toContainText('Identidade');
  await expect(carteira.locator('#aqRF')).toBeHidden();
  await fecharSheet(carteira);

  const p = payloadDe(await solicitar(0, { nome: 'Maria Silva' }));
  expect([p.iss, p.name, p.perfil, p.apelido]).toEqual([DID_ZERO, 'Maria Silva', 'identidade', 'Identidade']);
});

test('várias identidades, inclusive do mesmo perfil, cada uma com DID próprio derivado da semente', async () => {
  const prof1 = payloadDe(await solicitar('novo', { nome: 'Maria Silva', perfil: 'profissional' }));
  const prof2 = payloadDe(await solicitar('novo', { nome: 'Maria S. Consultora', perfil: 'profissional' }));
  const clube = payloadDe(await solicitar('novo', { nome: 'Maria', perfil: 'personalizada', rotulo: 'Clube' }));
  expect([prof1.perfil, prof2.perfil, clube.perfil, clube.perfilNome, clube.apelido]).toEqual(['profissional', 'profissional', 'personalizada', 'Clube', 'Personalizada: Clube']);

  const ids = await identidades();
  expect(ids.map(x => [x.n, x.nome, x.perfil, x.rotulo])).toEqual([
    [0, 'Maria Silva', 'identidade', ''],
    [1, 'Maria Silva', 'profissional', ''],
    [2, 'Maria S. Consultora', 'profissional', ''],
    [3, 'Maria', 'personalizada', 'Clube'],
  ]);
  expect(new Set(ids.map(x => x.did)).size).toBe(4);
  expect([prof1.iss, prof2.iss, clube.iss]).toEqual([ids[1].did, ids[2].did, ids[3].did]);
  // Determinístico: o número da identidade e as 12 palavras recriam o mesmo DID.
  const recalc = await carteira.evaluate(async w => (await deriveIdentity(await wordsToSeed(w.split(' ')), 'perfil/3')).did, WORDS.carteira);
  expect(recalc).toBe(ids[3].did);
});

test('Personalizada exige o nome do perfil, que pode ser editado', async () => {
  await abrirSolicitar();
  await carteira.click('#aqL [data-n="novo"]');
  await carteira.fill('#aqN', 'Maria');
  await carteira.selectOption('#aqP', 'personalizada');
  await expect(carteira.locator('#aqRF')).toBeVisible();
  await carteira.click('#aqGo');
  await expect(carteira.locator('#aqOut')).toBeHidden();
  await fecharSheet(carteira);
  expect((await identidades()).length).toBe(4);

  const p = payloadDe(await solicitar(3, { rotulo: 'Associação' }));
  expect(p.apelido).toBe('Personalizada: Associação');
  expect((await identidades())[3].rotulo).toBe('Associação');
});

test('a STK vê nome e perfil, aprova, e a carteira guarda na identidade certa', async () => {
  const pedido = await solicitar(2, {});
  await aba(gov, 'vIssue');
  await gov.fill('#iqT', pedido);
  await gov.click('#iqGo');
  await expect(gov.locator('#iIdNome')).toHaveText('Maria S. Consultora');
  await expect(gov.locator('#iIdApelido')).toHaveText('Profissional');
  await gov.click('#iGo');
  await expect(gov.locator('#iOk')).toContainText('Identidade aprovada');
  const aprovacao = await gov.inputValue('#iJwt');
  const p = payloadDe(aprovacao);
  expect(p.vc.credentialSubject).toEqual({ id: p.sub, nome: 'Maria S. Consultora' });
  expect(p.exp - p.iat).toBe(365 * DIA);

  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="get"]');
  await expect(carteira.locator('#sheetBody h3')).toHaveText('Receber aprovação de identidade');
  await carteira.fill('#rcT', aprovacao);
  await carteira.click('#rcGo');
  await expect(toast(carteira)).toHaveText('Credencial guardada');
  // Cartão: perfil, nome, emissora + validade.
  const card = carteira.locator('#cList .cred').filter({ hasText: 'Maria S. Consultora' });
  await expect(card.locator('.r1 .tipo')).toHaveText('Profissional');
  await expect(card.locator('.main')).toHaveText('Maria S. Consultora');
  await expect(card.locator('.r3 .emissor')).toHaveText('Governança Systekna');
  await expect(card.locator('.r3 .pill')).toContainText('Até ');
  // DID no cartão, com o botão de copiar (que não abre a credencial).
  await expect(card.locator('.did .mono')).toHaveText(await carteira.evaluate(d => shortDid(d), p.sub));
  await expect(card.locator('.did .mono')).toHaveAttribute('title', p.sub);
  await card.locator('.did .cp').click();
  await expect(toast(carteira)).toHaveText('DID copiado');
  await expect(carteira.locator('#sheet')).not.toHaveClass(/open/);
  // Uma cor por perfil.
  await expect(card).toHaveClass(/p-profissional/);
  const cores = await carteira.evaluate(() => ['identidade', 'profissional', 'personalizada'].map(p => {
    const el = document.createElement('div'); el.className = `cred p-${p}`; document.body.appendChild(el);
    const bg = getComputedStyle(el).backgroundImage; el.remove(); return bg;
  }));
  expect(new Set(cores).size).toBe(3);

  await abrirSolicitar();
  await expect(carteira.locator('#aqL [data-n="2"]')).toContainText('aprovada');
  await expect(carteira.locator('#aqL [data-n="1"]')).toContainText('aguardando');
  await fecharSheet(carteira);
});

test('as identidades continuam depois de bloquear e voltam pelo backup', async ({ browser }) => {
  await bloquearEDesbloquear(carteira);
  const antes = await identidades();
  expect(antes).toHaveLength(4);

  await aba(carteira, 'vSet');
  await carteira.click('#commonSet [data-cs="export"]');
  const backup = await carteira.inputValue('#bkT');
  await fecharSheet(carteira);
  const outro = await (await browser.newContext()).newPage();
  vigiarCsp(outro, violacoesCsp);
  await preparar(outro, 'carteira-systekna.html', WORDS.carteira);
  await aba(outro, 'vSet');
  await outro.click('#commonSet [data-cs="import"]');
  await outro.fill('#riT', backup);
  await outro.click('#riGo');
  await expect(toast(outro)).toContainText('restaurad');
  expect(await outro.evaluate(() => identidades().map(x => [x.n, x.perfil, x.id.did]))).toEqual(antes.map(x => [x.n, x.perfil, x.did]));
  await outro.context().close();
});

test('identidades criadas na 0.17.0 viram nome + perfil, com o mesmo DID', async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  vigiarCsp(page, violacoesCsp);
  await preparar(page, 'carteira-systekna.html', WORDS.carteira);
  await page.evaluate(async () => {
    const t = Date.now();
    await saveItem({ type: 'perfil', n: 1, apelido: 'Profissional', pedido: { at: t, nome: 'Ana' }, created: t, updated: t });
    await saveItem({ type: 'perfil', n: 2, apelido: 'Associação', pedido: null, created: t, updated: t });
  });
  await bloquearEDesbloquear(page);
  const ids = await page.evaluate(() => identidades().map(x => [x.n, x.nome, x.perfil, x.rotulo]));
  expect(ids).toEqual([[0, '', 'identidade', ''], [1, 'Ana', 'profissional', ''], [2, '', 'personalizada', 'Associação']]);
  await page.context().close();
});

test('nenhuma violação de CSP em todo o fluxo acima', () => {
  expect(violacoesCsp).toEqual([]);
});
