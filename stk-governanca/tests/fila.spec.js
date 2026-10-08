// @ts-check
// Fila de pedidos da Governança (1.1.0): o gestor cola um ou vários pedidos (identidade ou serviço), eles entram
// numa fila guardada cifrada e cada um é aprovado ou reprovado. Aguardando · Aprovados · Reprovados.
const { test, expect } = require('@playwright/test');
const { WORDS, vigiarCsp, preparar, aba, toast, fecharSheet, payloadDe, bloquearEDesbloquear } = require('../../compartilhado/tests/helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let gov;
/** Quem pede: outra página assina os pedidos com o próprio DID. */
/** @type {import('@playwright/test').Page} */ let quem;
/** @type {string[]} */ const violacoesCsp = [];

const agora = () => Math.floor(Date.now() / 1000);
async function pedido(wanted, name, extra = {}) {
  const iat = agora();
  return quem.evaluate(async p => embrulhar(await signJWT('pedido+jwt', { ...p, iss: ses.did, sub: ses.did })), {
    aud: 'emissor', name, wanted, note: '', nonce: `fila-${Math.random()}`, iat, exp: iat + 7 * 86_400, ...extra,
  });
}
const cartoes = () => gov.locator('#iFila [data-fila]');
const cartao = texto => cartoes().filter({ hasText: texto });
async function receber(texto) {
  await aba(gov, 'vIssue');
  await gov.fill('#iqT', texto);
  await gov.click('#iqGo');
}

test.beforeAll(async ({ browser }) => {
  [gov, quem] = await Promise.all([1, 2].map(async () => (await browser.newContext()).newPage()));
  for (const p of [gov, quem]) vigiarCsp(p, violacoesCsp);
  await preparar(gov, 'governanca-systekna.html', WORDS.emissor);
  await preparar(quem, 'governanca-systekna.html', WORDS.outroEmissor);
});

test.afterAll(async () => {
  for (const p of [gov, quem]) await p?.context().close();
});

test('vários pedidos colados de uma vez entram na fila como Aguardando', async () => {
  const ana = await pedido('IdentityCredential', 'Ana Souza', { apelido: 'Profissional' });
  const bruno = await pedido('IdentityCredential', 'Bruno Lima');
  const academia = await pedido('ServiceAccreditationCredential', 'Academia Boa Forma');
  await receber(`${ana}\n\n${bruno}\n${academia}`);
  await expect(gov.locator('#iqH')).toHaveText('3 pedidos entraram na fila.');
  await expect(gov.locator('#iqT')).toHaveValue('');
  await expect(cartoes()).toHaveCount(3);
  await expect(cartao('Identidade: Ana Souza (Profissional)').locator('.pill')).toHaveText('Aguardando');
  await expect(cartao('Serviço: Academia Boa Forma')).toHaveCount(1);
  await expect(gov.locator('#iSeg [data-f="aguardando"]')).toHaveText('Aguardando (3)');
  await expect(toast(gov)).toHaveText('3 pedidos na fila');
  expect(await gov.evaluate(() => st.book.at(-1).text)).toBe('Pedido de Serviço recebido: Academia Boa Forma');

  await aba(gov, 'vPanel');
  await expect(gov.locator('#pFilaN')).toHaveText('3 pedidos aguardando');
  await gov.click('#pFila');
  await expect(gov.locator('#vIssue')).toHaveClass(/on/);
});

test('pedido repetido ou inválido não entra, e cada motivo aparece', async () => {
  const ana = await gov.evaluate(() => st.fila[0].tok);
  await receber(`${ana}\nSYSTEKNA:PEDIDO-APROVACAO:eyJxx.eyJyy.zz`);
  await expect(gov.locator('#iqH')).toHaveText('0 pedidos entraram na fila; 2 não entraram.');
  await expect(gov.locator('#iqRes')).toContainText('Este pedido já está na fila.');
  await expect(gov.locator('#iqRes .verdict')).toHaveCount(2);
  await expect(cartoes()).toHaveCount(3);
  // Um pedido só, com erro: o motivo vai direto na dica, como antes.
  const cracha = await pedido('BadgeCredential', 'Carla');
  await receber(cracha);
  await expect(gov.locator('#iqH')).toHaveText('Este é um pedido de crachá. Ele vai para o serviço que dá o acesso, não para a Governança.');
});

test('a fila continua depois de bloquear e desbloquear', async () => {
  await bloquearEDesbloquear(gov);
  await aba(gov, 'vIssue');
  await expect(cartoes()).toHaveCount(3);
});

test('aprovar emite a credencial e o pedido vai para Aprovados', async () => {
  await cartao('Ana Souza').click();
  await expect(gov.locator('#iIdNome')).toHaveText('Ana Souza');
  await expect(gov.locator('#iIdApelido')).toHaveText('Profissional');
  await gov.click('#iGo');
  await expect(gov.locator('#iOk')).toContainText('Identidade aprovada');
  const aprovacao = await gov.inputValue('#iJwt');
  expect(payloadDe(aprovacao).vc.credentialSubject.nome).toBe('Ana Souza');

  await gov.click('#iNew');
  await expect(gov.locator('#iSeg [data-f="aguardando"]')).toHaveText('Aguardando (2)');
  await expect(cartao('Ana Souza')).toHaveCount(0);
  await gov.click('#iSeg [data-f="aprovado"]');
  await expect(gov.locator('#iSeg [data-f="aprovado"]')).toHaveText('Aprovados (1)');
  await expect(cartao('Ana Souza').locator('.pill')).toHaveText('Aprovado');
  // Tocar no aprovado mostra a mesma aprovação, para entregar de novo.
  await cartao('Ana Souza').click();
  await expect(gov.locator('#iJwt')).toHaveValue(aprovacao);
  await gov.click('#iNew');
});

test('reprovar pede o motivo, registra no livro e o pedido vai para Reprovados', async () => {
  await gov.click('#iSeg [data-f="aguardando"]');
  await cartao('Academia Boa Forma').click();
  await expect(gov.locator('#iType')).toHaveValue('ServiceAccreditationCredential');
  await gov.click('#iRec');
  await gov.selectOption('#rcM', 'Serviço não autorizado');
  await gov.click('#rcGo');
  await expect(toast(gov)).toHaveText('Pedido recusado');
  expect(await gov.evaluate(() => st.book.at(-1).text)).toBe('Aprovação de emissão de Academia Boa Forma recusada: Serviço não autorizado');
  await expect(gov.locator('#iFilaV')).toBeVisible();
  await expect(gov.locator('#iSeg [data-f="aguardando"]')).toHaveText('Aguardando (1)');
  await gov.click('#iSeg [data-f="reprovado"]');
  await expect(cartao('Academia Boa Forma')).toContainText('Serviço não autorizado');
  await expect(cartao('Academia Boa Forma').locator('.pill')).toHaveText('Reprovado');
});

test('pedido vencido na fila não pode ser aprovado, só reprovado', async () => {
  await receber(await pedido('IdentityCredential', 'Diego Vencido', { exp: agora() + 3 }));
  await expect(gov.locator('#iqH')).toHaveText('1 pedido entrou na fila.');
  await gov.waitForTimeout(4000);
  await gov.click('#iSeg [data-f="reprovado"]');
  await gov.click('#iSeg [data-f="aguardando"]');
  await expect(cartao('Diego Vencido').locator('.pill')).toHaveText('Vencido');
  await cartao('Diego Vencido').click();
  await expect(gov.locator('#iWho')).toContainText('Pedido vencido');
  await expect(gov.locator('#iGo')).toBeDisabled();
  await expect(gov.locator('#iRec')).toBeVisible();
  await gov.click('#iBack');
});

test('nenhuma violação de CSP', async () => {
  expect(violacoesCsp).toEqual([]);
});
