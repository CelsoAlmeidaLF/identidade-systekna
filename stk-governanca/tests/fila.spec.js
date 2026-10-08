// @ts-check
// Fila de pedidos da Governança (1.1.0) alimentada pela fila-solicitacao (1.2.0): os pedidos chegam cifrados para
// a Governança, entram na fila (Aguardando · Aprovados · Reprovados) e a resposta volta pela fila-emissao,
// cifrada para quem pediu.
const { test, expect } = require('@playwright/test');
const { WORDS, vigiarCsp, preparar, aba, toast, payloadDe, bloquearEDesbloquear, naFila } = require('../../compartilhado/tests/helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let gov;
/** Quem pede: outra página assina os pedidos com o próprio DID e recebe as respostas. */
/** @type {import('@playwright/test').Page} */ let quem;
/** @type {string[]} */ const violacoesCsp = [];
let govDid = '';

const agora = () => Math.floor(Date.now() / 1000);
async function pedido(wanted, name, extra = {}) {
  const iat = agora();
  return quem.evaluate(async p => signJWT('pedido+jwt', { ...p, iss: ses.did, sub: ses.did, x: ses.xMb }), {
    aud: govDid, name, wanted, note: '', nonce: `fila-${Math.random().toString(36).slice(2)}-0000000000`, iat, exp: iat + 7 * 86_400, ...extra,
  });
}
/** Envia pela fila, como a carteira: a chave de cifragem da Governança vem do diretório. */
const enviar = tok => quem.evaluate(async ([t, g]) => {
  const d = (await lerDiretorio('governanca')).find(x => x.did === g);
  await enviarSolicitacao(d, t, decodeJWT(t).payload.nonce);
}, [tok, govDid]);
const resposta = tok => quem.evaluate(n => buscarEmissao(n), payloadDe(tok).nonce);
const cartoes = () => gov.locator('#iFila [data-fila]');
const cartao = texto => cartoes().filter({ hasText: texto });
async function buscar() {
  await aba(gov, 'vIssue');
  await gov.click('#iqGo');
}
let ana = '', academia = '';

test.beforeAll(async ({ browser }) => {
  [gov, quem] = await Promise.all([1, 2].map(async () => (await browser.newContext()).newPage()));
  for (const p of [gov, quem]) vigiarCsp(p, violacoesCsp);
  await preparar(gov, 'governanca-systekna.html', WORDS.emissor);
  await preparar(quem, 'governanca-systekna.html', WORDS.outroEmissor);
  govDid = await gov.evaluate(() => ses.did);
});

test.afterAll(async () => {
  for (const p of [gov, quem]) await p?.context().close();
});

test('a Governança se publica no diretório, assinada, com a chave de cifragem', async () => {
  const l = await quem.evaluate(() => lerDiretorio('governanca'));
  const g = l.find(x => x.did === govDid);
  expect(g.name).toBe('Governança Systekna');
  expect(g.x).toBe(await gov.evaluate(() => ses.xMb));
});

test('pedidos enviados pela fila entram como Aguardando; na fila remota só há texto cifrado', async () => {
  ana = await pedido('IdentityCredential', 'Ana Souza', { apelido: 'Profissional' });
  const bruno = await pedido('IdentityCredential', 'Bruno Lima');
  academia = await pedido('ServiceAccreditationCredential', 'Academia Boa Forma');
  for (const t of [ana, bruno, academia]) await enviar(t);
  const remotos = naFila('fila-solicitacao');
  expect(remotos).toHaveLength(3);
  for (const d of remotos) {
    expect(d.para).toBe(govDid);
    expect(d.env).toMatch(/^smsg1\./);
    expect(d.env).not.toContain('Ana');
  }
  await buscar();
  await expect(gov.locator('#iqH')).toHaveText('3 pedidos novos na fila.');
  expect(naFila('fila-solicitacao')).toHaveLength(0);
  await expect(cartoes()).toHaveCount(3);
  await expect(cartao('Identidade: Ana Souza (Profissional)').locator('.pill')).toHaveText('Aguardando');
  await expect(cartao('Serviço: Academia Boa Forma')).toHaveCount(1);
  await expect(gov.locator('#iSeg [data-f="aguardando"]')).toHaveText('Aguardando (3)');
  expect(await gov.evaluate(() => st.book.at(-1).text)).toBe('Pedido de Serviço recebido: Academia Boa Forma');

  await aba(gov, 'vPanel');
  await expect(gov.locator('#pFilaN')).toHaveText('3 pedidos aguardando');
  await gov.click('#pFila');
  await expect(gov.locator('#vIssue')).toHaveClass(/on/);
});

test('pedido repetido, de crachá ou sem a chave de resposta não entra; cada motivo aparece', async () => {
  await enviar(ana);
  await enviar(await pedido('BadgeCredential', 'Carla'));
  const semChave = await quem.evaluate(async g => { const iat = Math.floor(Date.now() / 1000); return signJWT('pedido+jwt', { iss: ses.did, sub: ses.did, aud: g, name: 'Davi', wanted: 'IdentityCredential', nonce: 'semchave-000000000000', iat, exp: iat + 600 }); }, govDid);
  await enviar(semChave);
  await buscar();
  await expect(gov.locator('#iqH')).toHaveText('3 pedidos recusados na conferência.');
  await expect(gov.locator('#iqRes')).toContainText('Este pedido já está na fila.');
  await expect(gov.locator('#iqRes')).toContainText('Este é um pedido de crachá.');
  await expect(gov.locator('#iqRes')).toContainText('não traz a chave de cifragem');
  await expect(cartoes()).toHaveCount(3);
  expect(naFila('fila-solicitacao')).toHaveLength(0);
});

test('a fila continua depois de bloquear e desbloquear', async () => {
  await bloquearEDesbloquear(gov);
  await aba(gov, 'vIssue');
  await expect(cartoes()).toHaveCount(3);
});

test('aprovar emite a credencial, envia cifrada pela fila-emissao e o pedido vai para Aprovados', async () => {
  await cartao('Ana Souza').click();
  await expect(gov.locator('#iIdNome')).toHaveText('Ana Souza');
  await expect(gov.locator('#iIdApelido')).toHaveText('Profissional');
  await gov.click('#iGo');
  await expect(gov.locator('#iOk')).toContainText('Identidade aprovada');
  await expect(gov.locator('#iOk')).toContainText('Enviada pela fila.');
  const aprovacao = await gov.inputValue('#iJwt');
  expect(payloadDe(aprovacao).vc.credentialSubject.nome).toBe('Ana Souza');
  const env = naFila('fila-emissao').find(d => d.id === payloadDe(ana).nonce);
  expect(env.env).toMatch(/^smsg1\./);
  expect(await resposta(ana)).toEqual([aprovacao]);

  await gov.click('#iNew');
  await expect(gov.locator('#iSeg [data-f="aguardando"]')).toHaveText('Aguardando (2)');
  await gov.click('#iSeg [data-f="aprovado"]');
  await expect(cartao('Ana Souza').locator('.pill')).toHaveText('Aprovado');
  // Tocar no aprovado: Reenviar; a aprovação já está na fila, esperando quem pediu buscar.
  await cartao('Ana Souza').click();
  await gov.click('#iCopy');
  await expect(toast(gov)).toHaveText('A aprovação já está na fila, esperando a carteira buscar.');
  await gov.click('#iNew');
});

test('reprovar pede o motivo, registra no livro e a recusa assinada volta pela fila', async () => {
  await gov.click('#iSeg [data-f="aguardando"]');
  await cartao('Academia Boa Forma').click();
  await expect(gov.locator('#iType')).toHaveValue('ServiceAccreditationCredential');
  await gov.click('#iRec');
  await gov.selectOption('#rcM', 'Serviço não autorizado');
  await gov.click('#rcGo');
  await expect(toast(gov)).toHaveText('Pedido recusado');
  expect(await gov.evaluate(() => st.book.at(-1).text)).toBe('Aprovação de emissão de Academia Boa Forma recusada: Serviço não autorizado');
  await expect(gov.locator('#iSeg [data-f="aguardando"]')).toHaveText('Aguardando (1)');
  const [rec] = await resposta(academia);
  expect(rec.split('.').length).toBe(3);
  const p = payloadDe(rec);
  expect(p).toMatchObject({ iss: govDid, motivo: 'Serviço não autorizado', nonce: payloadDe(academia).nonce });
  await gov.click('#iSeg [data-f="reprovado"]');
  await expect(cartao('Academia Boa Forma')).toContainText('Serviço não autorizado');
});

test('pedido vencido na fila não pode ser aprovado, só reprovado', async () => {
  await enviar(await pedido('IdentityCredential', 'Diego Vencido', { exp: agora() + 3 }));
  await buscar();
  await expect(gov.locator('#iqH')).toHaveText('1 pedido novo na fila.');
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
