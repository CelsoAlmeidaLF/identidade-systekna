// @ts-check
// F1.3 (plan.md): cartão de contato, agenda com selos de grupo e "conferir pessoa".
const { test, expect } = require('@playwright/test');
const { WORDS, preparar, bloquearEDesbloquear, aba, toast, fecharSheet, vigiarCsp, payloadDe } = require('./helpers');

test.describe.configure({ mode: 'serial' });

// Terceira pessoa: frase BIP39 de teste com checksum válido (vetor Trezor).
const PALAVRAS_JOAO = 'letter advice cage absurd amount doctor acoustic avoid letter advice cage above';

/** @type {import('@playwright/test').Page} */ let celso;
/** @type {import('@playwright/test').Page} */ let maria;
/** @type {import('@playwright/test').Page} */ let joao;
/** @type {import('@playwright/test').Page} */ let intruso;
/** @type {string[]} */ const violacoesCsp = [];
let cartaoMaria = '';

async function acao(page, a) {
  await page.click('#dockAdd');
  await page.click(`#sheetBody [data-act="${a}"]`);
}

/** Pedido na carteira → emissão no grupo pelo Celso → credencial guardada na carteira. */
async function entrarNoGrupo(page, nome, grupo) {
  await acao(page, 'ask');
  await page.fill('#aqN', nome);
  await page.selectOption('#aqT', 'MembroDoGrupo');
  await page.click('#aqGo');
  const pedido = await page.inputValue('#aqJ');
  await fecharSheet(page);

  await aba(celso, 'vIssue');
  if (await celso.locator('#iOut').isVisible()) await celso.click('#iNew');
  await celso.fill('#iqT', pedido);
  await celso.click('#iqGo');
  await expect(celso.locator('#iForm')).toBeVisible();
  await celso.selectOption('#iType', 'MembroDoGrupo');
  await celso.selectOption('#iGrp', { label: grupo });
  await celso.click('#iGo');
  await expect(celso.locator('#iOut')).toBeVisible();
  await receber(page, await celso.inputValue('#iJwt'));
}

async function receber(page, tok) {
  await acao(page, 'get');
  await page.fill('#rcT', tok);
  await page.click('#rcGo');
  await expect(toast(page)).toHaveText('Credencial guardada');
}

async function confiarNoCelso(page) {
  await aba(celso, 'vGov');
  await celso.click('#gInv');
  const tok = await celso.inputValue('#gInvT');
  await fecharSheet(celso);
  await acao(page, 'trust');
  await page.fill('#tiT', tok);
  await page.click('#tiGo');
  await page.click('#tiOk');
  await expect(toast(page)).toHaveText('Emissor confiável adicionado');
}

/** Gera o cartão em Contatos, marcando só os grupos pedidos. */
async function gerarCartao(page, apelido, grupos) {
  await aba(page, 'vContacts');
  await page.click('#ctMine');
  await page.fill('#mcN', apelido);
  for (const g of grupos) await page.locator('#mcG [data-mg]', { hasText: g }).first().click();
  await page.click('#mcGo');
  await expect(page.locator('#mcJ')).toBeVisible();
  const tok = await page.inputValue('#mcJ');
  await fecharSheet(page);
  return tok;
}

async function importarCartao(page, tok) {
  await aba(page, 'vContacts');
  await page.click('#ctImport');
  await page.fill('#icT', tok);
  await page.click('#icGo');
}

async function abrirContato(page, nome) {
  await aba(page, 'vContacts');
  await linhaDe(page, nome).click();
  await expect(page.locator('#sheetBody h3')).toHaveText(nome);
}

const linhaDe = (page, nome) => page.locator('#ctPeople [data-ct]').filter({ has: page.locator('b').getByText(nome, { exact: true }) });

test.beforeAll(async ({ browser }) => {
  [celso, maria, joao, intruso] = await Promise.all([1, 2, 3, 4].map(async () => (await browser.newContext()).newPage()));
  [celso, maria, joao, intruso].forEach(p => vigiarCsp(p, violacoesCsp));
  await preparar(celso, 'emissor-systekna.html', WORDS.emissor);
  await preparar(maria, 'carteira-systekna.html', WORDS.carteira);
  await preparar(joao, 'carteira-systekna.html', PALAVRAS_JOAO);
  await preparar(intruso, 'carteira-systekna.html', WORDS.outroEmissor);
  await aba(celso, 'vGov');
  await celso.fill('#gName', 'Emissor do Celso');
  await celso.click('#gNameS');
  for (const g of ['Família', 'Amigos']) {
    await celso.click('#gGrpAdd');
    await celso.fill('#ng', g);
    await celso.click('#ngGo');
    await expect(toast(celso)).toHaveText('Grupo criado');
  }
  await entrarNoGrupo(maria, 'Maria Teste', 'Família (6 meses)');
  await entrarNoGrupo(maria, 'Maria Teste', 'Amigos (6 meses)');
  await confiarNoCelso(joao);
});

test.afterAll(async () => {
  for (const p of [celso, maria, joao, intruso]) await p?.context().close();
});

test('o cartão leva só os grupos que o dono escolheu', async () => {
  cartaoMaria = await gerarCartao(maria, 'Mari', ['Família']);
  const p = payloadDe(cartaoMaria);
  expect(p).toMatchObject({ iss: await maria.evaluate(() => ses.did), apelido: 'Mari', x: await maria.evaluate(() => ses.xMb) });
  expect(p.creds).toHaveLength(1);
  expect(payloadDe(p.creds[0]).vc.credentialSubject.grupo).toBe('Família');
  expect(p.exp - p.iat).toBe(30 * 86400);
});

test('importado, o contato aparece com o selo do grupo escolhido e sem o outro', async () => {
  await importarCartao(joao, cartaoMaria);
  await expect(joao.locator('#icStep')).toContainText('Família · Emissor do Celso');
  await expect(joao.locator('#icStep')).not.toContainText('Amigos');
  await joao.fill('#icN', 'Maria');
  await joao.click('#icOk');
  await expect(toast(joao)).toHaveText('Contato salvo');
  await expect(linhaDe(joao, 'Maria')).toContainText('Família · Emissor do Celso');
});

test('cartão com assinatura alterada é recusado', async () => {
  const [h, p, s] = cartaoMaria.split('.');
  const outro = Buffer.from(JSON.stringify({ ...payloadDe(cartaoMaria), apelido: 'Banco' })).toString('base64url');
  await importarCartao(joao, [h, outro, s].join('.'));
  await expect(joao.locator('#icH')).toHaveText('A assinatura do cartão não confere: ele foi alterado ou não é de quem diz.');
  await fecharSheet(joao);
});

test('cartão que anexa a credencial de outra pessoa não ganha o selo', async () => {
  // O intruso assina um cartão com o próprio DID e anexa a credencial de grupo da Maria.
  const credMaria = payloadDe(cartaoMaria).creds[0];
  const falso = await intruso.evaluate(async c => {
    const iat = now();
    return signJWT('contato+jwt', { iss: ses.did, sub: ses.did, apelido: 'Maria (número novo)', x: ses.xMb, creds: [c], iat, exp: iat + 600 });
  }, credMaria);
  await importarCartao(joao, falso);
  await expect(joao.locator('#icStep')).toContainText('1 credencial anexada foi descartada');
  await joao.click('#icOk');
  await expect(linhaDe(joao, 'Maria (número novo)')).toContainText('Sem selo de grupo');
});

test('filtro por grupo mostra só quem tem o selo', async () => {
  await aba(joao, 'vContacts');
  await joao.locator('#ctChips [data-cf]', { hasText: 'Família · Emissor do Celso' }).click();
  await expect(joao.locator('#ctPeople [data-ct]')).toHaveCount(1);
  await expect(linhaDe(joao, 'Maria')).toBeVisible();
  await joao.locator('#ctChips [data-cf="all"]').click();
  await expect(joao.locator('#ctPeople [data-ct]')).toHaveCount(2);
});

test('conferir pessoa: aprovado para o dono do DID e a mesma resposta não vale duas vezes', async () => {
  await abrirContato(joao, 'Maria');
  await joao.click('#scK');
  const desafio = await joao.inputValue('#kpJ');

  await acao(maria, 'answer');
  await maria.fill('#raT', desafio);
  await maria.click('#raGo');
  await maria.click('#raSign');
  const resposta = await maria.inputValue('#raJ');
  await fecharSheet(maria);

  await joao.fill('#kpR', resposta);
  await joao.click('#kpGo');
  await expect(joao.locator('#kpOut')).toContainText('É mesmo Maria');
  await joao.click('#kpGo');
  await expect(joao.locator('#kpOut')).toContainText('Esta resposta já foi usada');
  await fecharSheet(joao);
});

test('conferir pessoa: recusado para qualquer outro DID', async () => {
  await abrirContato(joao, 'Maria');
  await joao.click('#scK');
  const desafio = await joao.inputValue('#kpJ');

  // Pela tela, o intruso nem consegue responder: o desafio é para o DID da Maria.
  await acao(intruso, 'answer');
  await intruso.fill('#raT', desafio);
  await intruso.click('#raGo');
  await expect(intruso.locator('#raH')).toHaveText('Este desafio foi feito para outra pessoa.');
  await fecharSheet(intruso);

  // Montando a resposta à mão, a carteira do João recusa.
  const forjada = await intruso.evaluate(async ([d, aud]) => {
    const iat = now();
    return signJWT('resposta+jwt', { iss: ses.did, aud, desafio: d, iat, exp: iat + 300 });
  }, [desafio, await joao.evaluate(() => ses.did)]);
  await joao.fill('#kpR', forjada);
  await joao.click('#kpGo');
  await expect(joao.locator('#kpOut')).toContainText('Não confere');
  await expect(joao.locator('#kpOut')).toContainText('A resposta foi assinada por outro DID');
  await fecharSheet(joao);
});

test('escrever mensagem a partir do contato já preenche a chave de cifragem', async () => {
  await abrirContato(joao, 'Maria');
  await joao.click('#scM');
  await expect(joao.locator('#vId')).toBeVisible();
  await expect(joao.locator('#mTo')).toHaveValue(await maria.evaluate(() => ses.xMb));
});

test('agenda fica cifrada no cofre e sobrevive a bloquear e desbloquear', async () => {
  const guardado = await joao.evaluate(async () => JSON.stringify(await DB.get('items')));
  expect(guardado).not.toContain('Maria');
  await bloquearEDesbloquear(joao);
  await aba(joao, 'vContacts');
  await expect(linhaDe(joao, 'Maria')).toContainText('Família · Emissor do Celso');
});

test('credencial vencida perde o selo na agenda', async () => {
  // Credencial de grupo com 4 segundos de validade, num cartão novo da Maria.
  const didMaria = await maria.evaluate(() => ses.did), xMaria = await maria.evaluate(() => ses.xMb);
  const curta = await celso.evaluate(([sub, x]) => issue(sub, 'MembroDoGrupo', { grupo: 'Família', nome: 'Maria Teste', chaveCifragem: x }, 4 / 86400, 'Maria Teste'), [didMaria, xMaria]);
  const cartao = await maria.evaluate(async c => {
    const iat = now();
    return signJWT('contato+jwt', { iss: ses.did, sub: ses.did, apelido: 'Mari', x: ses.xMb, creds: [c], iat, exp: iat + 600 });
  }, curta);
  await importarCartao(joao, cartao);
  await joao.click('#icOk');
  await expect(toast(joao)).toHaveText('Contato atualizado');
  await expect(async () => {
    await aba(joao, 'vCreds');
    await aba(joao, 'vContacts');
    await expect(linhaDe(joao, 'Maria').first()).toContainText('Sem selo de grupo', { timeout: 500 });
  }).toPass({ timeout: 15_000 });
  await abrirContato(joao, 'Maria');
  await expect(joao.locator('#scG')).toContainText('Vencida');
});

test('nenhuma violação de CSP', () => {
  expect(violacoesCsp).toEqual([]);
});
