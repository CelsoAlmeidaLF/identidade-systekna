// @ts-check
// RN59: credencial, livro e log nunca levam CPF, RG, foto e afins. A trava fica em issue(), no emissor.
// RN58: a credencial de identidade diz só se o KYC foi validado (kycValidado), nunca os dados.
const { test, expect } = require('@playwright/test');
const { WORDS, preparar, aba, toast, fecharSheet, vigiarCsp, payloadDe } = require('./helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {import('@playwright/test').Page} */ let emissor;
/** @type {string[]} */ const violacoesCsp = [];

const CPF_VALIDO = '529.982.247-25';

async function pedir(nome) {
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="ask"]');
  await carteira.fill('#aqN', nome);
  await carteira.click('#aqGo');
  await expect(carteira.locator('#aqOut')).toBeVisible();
  const tok = await carteira.inputValue('#aqJ');
  await fecharSheet(carteira);
  return tok;
}

async function conferirPedido(tok, tipo) {
  await aba(emissor, 'vIssue');
  if (await emissor.locator('#iOut').isVisible()) await emissor.click('#iNew');
  await emissor.fill('#iqT', tok);
  await emissor.click('#iqGo');
  await expect(emissor.locator('#iForm')).toBeVisible();
  if (tipo) await emissor.selectOption('#iType', tipo);
}

/** Emite e devolve o payload. O resultado anterior fica no elemento escondido: espera o novo aparecer antes de ler. */
async function emitir() {
  await emissor.click('#iGo');
  await expect(emissor.locator('#iOut')).toBeVisible();
  await expect(emissor.locator('#iOk')).toContainText('Credencial emitida');
  return payloadDe(await emissor.inputValue('#iJwt'));
}

/** Quantas emissões e atos o emissor tem: uma emissão recusada não pode mexer em nenhum dos dois. */
const contagem = () => emissor.evaluate(() => ({ emitidas: st.issued.length, atos: st.book.length, docs: st.docs.length }));

test.beforeAll(async ({ browser }) => {
  carteira = await (await browser.newContext()).newPage();
  emissor = await (await browser.newContext()).newPage();
  vigiarCsp(carteira, violacoesCsp);
  vigiarCsp(emissor, violacoesCsp);
  await preparar(emissor, 'emissor-systekna.html', WORDS.emissor);
  await preparar(carteira, 'carteira-systekna.html', WORDS.carteira);
});

test.afterAll(async () => {
  await carteira?.context().close();
  await emissor?.context().close();
});

test('cpfOk confere os dígitos verificadores', async () => {
  const r = await emissor.evaluate(c => [cpfOk(c), cpfOk('52998224725'), cpfOk('529.982.247-26'), cpfOk('111.111.111-11'), cpfOk('1234')], CPF_VALIDO);
  expect(r).toEqual([true, true, false, false, false]);
});

test('piiProblem barra campos de dado pessoal pelo nome, palavra por palavra', async () => {
  const r = await emissor.evaluate(() => ['cpf', 'CPF', 'cpfTitular', 'numero_rg', 'nomeDaMae', 'Data de nascimento', 'endereço', 'foto']
    .map(k => !!piiProblem({ [k]: 'x' })));
  expect(r.every(Boolean)).toBe(true);
  // "rg" dentro de outra palavra não é RG.
  const livres = await emissor.evaluate(() => ['organizacao', 'cargo', 'empresa', 'nome', 'grupo', 'documento', 'sha256']
    .map(k => piiProblem({ [k]: 'x' })));
  expect(livres).toEqual([null, null, null, null, null, null, null]);
});

test('piiProblem acha CPF válido no valor, mas não em hash, chave ou número qualquer', async () => {
  const r = await emissor.evaluate(c => ({
    formatado: piiProblem({ campo: `meu CPF é ${c}` }),
    solto: piiProblem({ campo: '52998224725' }),
    noArquivo: piiProblem({ documento: `rg_${c}.pdf` }),
    invalido: piiProblem({ campo: '529.982.247-26' }),
    hash: piiProblem({ sha256: 'ab52998224725cd' + 'f'.repeat(49) }),
    chave: piiProblem({ chaveCifragem: 'z6LS52998224725abc' }),
    telefone: piiProblem({ campo: '(11) 98765-4321' }),
    numero: piiProblem({ tamanho: 52998224725 })
  }), CPF_VALIDO);
  expect(r.formatado).toContain('parece conter um CPF');
  expect(r.solto).toContain('parece conter um CPF');
  expect(r.noArquivo).toContain('parece conter um CPF');
  expect([r.invalido, r.hash, r.chave, r.telefone, r.numero]).toEqual([null, null, null, null, null]);
});

test('a credencial de identidade traz nome e kycValidado, sem o campo documento', async () => {
  await conferirPedido(await pedir('Maria Teste'), 'IdentityCredential');
  const chaves = emissor.locator('#iClaims [data-ck]');
  await expect(chaves).toHaveCount(2);
  await expect(chaves.nth(0)).toHaveValue('nome');
  await expect(chaves.nth(1)).toHaveValue('kycValidado');
  await expect(emissor.locator('#iClaims [data-cv]').nth(1)).toHaveValue('false');
});

test('kycValidado sai como booleano, vira false se for removido e recusa outro valor', async () => {
  // Padrão: false.
  expect((await emitir()).vc.credentialSubject.kycValidado).toBe(false);

  // Marcado como conferido.
  await conferirPedido(await pedir('Maria Teste'), 'IdentityCredential');
  await emissor.locator('#iClaims [data-cv]').nth(1).fill('true');
  expect((await emitir()).vc.credentialSubject.kycValidado).toBe(true);

  // Campo removido: a credencial sai com false, nunca sem a informação.
  await conferirPedido(await pedir('Maria Teste'), 'IdentityCredential');
  await emissor.locator('#iClaims [data-rm]').nth(1).click();
  expect((await emitir()).vc.credentialSubject.kycValidado).toBe(false);

  // Valor que não é sim ou não.
  const antes = await contagem();
  await conferirPedido(await pedir('Maria Teste'), 'IdentityCredential');
  await emissor.locator('#iClaims [data-cv]').nth(1).fill('talvez');
  await emissor.click('#iGo');
  await expect(toast(emissor)).toHaveText('O campo “kycValidado” só aceita true ou false.');
  expect(await contagem()).toEqual(antes);
});

test('emissão com campo cpf é recusada e nada vai para o livro', async () => {
  const antes = await contagem();
  await conferirPedido(await pedir('Maria Teste'), 'CustomCredential');
  await emissor.fill('#iClaims [data-ck]', 'cpf');
  await emissor.fill('#iClaims [data-cv]', CPF_VALIDO);
  await emissor.click('#iGo');
  await expect(toast(emissor)).toHaveText('O campo “cpf” é dado pessoal e não entra em credencial.');
  await expect(emissor.locator('#iOut')).toBeHidden();
  await expect(emissor.locator('#iForm')).toBeVisible();
  expect(await contagem()).toEqual(antes);
});

test('CPF escondido no valor de um campo comum também é recusado', async () => {
  const antes = await contagem();
  await emissor.fill('#iClaims [data-ck]', 'observacao');
  await emissor.fill('#iClaims [data-cv]', `titular ${CPF_VALIDO}`);
  await emissor.click('#iGo');
  await expect(toast(emissor)).toHaveText('O campo “observacao” parece conter um CPF, que não entra em credencial.');
  expect(await contagem()).toEqual(antes);

  // Corrigido o campo, a mesma tela emite normalmente.
  await emissor.fill('#iClaims [data-cv]', 'cliente desde 2024');
  await emissor.click('#iGo');
  await expect(emissor.locator('#iOk')).toContainText('Credencial emitida');
  expect((await contagem()).emitidas).toBe(antes.emitidas + 1);
});

test('nome do titular com CPF no pedido é recusado', async () => {
  const antes = await contagem();
  await conferirPedido(await pedir(`Maria ${CPF_VALIDO}`), 'CustomCredential');
  await emissor.fill('#iClaims [data-cv]', 'x');
  await emissor.click('#iGo');
  await expect(toast(emissor)).toHaveText('O campo “titular” parece conter um CPF, que não entra em credencial.');
  expect(await contagem()).toEqual(antes);
});

test('registro de documento com CPF no nome do arquivo é recusado', async () => {
  const antes = await contagem();
  await aba(emissor, 'vDocs');
  await emissor.setInputFiles('#dFile', { name: `rg ${CPF_VALIDO}.txt`, mimeType: 'text/plain', buffer: Buffer.from('teste\n') });
  await expect(emissor.locator('#dInfo')).toContainText('SHA-256');
  await emissor.fill('#dName', 'Maria Teste');
  await emissor.click('#dGo');
  await expect(emissor.locator('#dH')).toHaveText('O campo “documento” parece conter um CPF, que não entra em credencial.');
  await expect(emissor.locator('#dOut')).toBeHidden();
  expect(await contagem()).toEqual(antes);

  // Arquivo com nome comum registra normalmente.
  await emissor.setInputFiles('#dFile', { name: 'contrato.txt', mimeType: 'text/plain', buffer: Buffer.from('teste\n') });
  await expect(emissor.locator('#dInfo')).toContainText('contrato.txt');
  await emissor.click('#dGo');
  await expect(emissor.locator('#dOk')).toContainText('Registro nº 1');
});

test('nenhuma violação de CSP', () => {
  expect(violacoesCsp).toEqual([]);
});
