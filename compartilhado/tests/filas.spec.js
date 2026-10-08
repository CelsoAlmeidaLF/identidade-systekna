// @ts-check
// Filas (1.2.0): o ciclo inteiro sem copiar e colar. Carteira → fila-solicitacao → Governança → fila-emissao →
// Carteira; Serviços → Governança → Serviços; Carteira → Serviços (crachá) → Carteira. O diretório traz a chave de
// cifragem de quem atende; na fila só há texto cifrado.
const { test, expect } = require('@playwright/test');
const { WORDS, vigiarCsp, preparar, aba, toast, fecharSheet, payloadDe, naFila, buscarRespostas } = require('./helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {import('@playwright/test').Page} */ let gov;
/** @type {import('@playwright/test').Page} */ let srv;
/** @type {string[]} */ const violacoesCsp = [];
let govDid = '';

test.beforeAll(async ({ browser }) => {
  [carteira, gov, srv] = await Promise.all([1, 2, 3].map(async () => (await browser.newContext()).newPage()));
  for (const p of [carteira, gov, srv]) vigiarCsp(p, violacoesCsp);
  await preparar(gov, 'governanca-systekna.html', WORDS.emissor);
  await preparar(srv, 'servicos-systekna.html', WORDS.servico);
  await preparar(carteira, 'carteira-systekna.html', WORDS.carteira);
  govDid = await gov.evaluate(() => ses.did);
});

test.afterAll(async () => {
  for (const p of [carteira, gov, srv]) await p?.context().close();
});

async function pedirIdentidade(nome, novo) {
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="ask"]');
  if (novo) await carteira.click('#aqL [data-n="novo"]');
  await carteira.fill('#aqN', nome);
  await expect(carteira.locator('#aqE')).toHaveValue(govDid);
  await carteira.click('#aqGo');
  await expect(toast(carteira)).toHaveText('Pedido enviado à Governança Systekna');
}
/** Nomes que a lista do + › Solicitar aprovação de identidade oferece (só quem pode ser enviado). */
async function listaDoSolicitar() {
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="ask"]');
  const l = await carteira.locator('#aqL [data-n] b').allTextContents();
  await fecharSheet(carteira);
  return l.join(' | ');
}
const pendente = nome => carteira.locator('#cList .idpend').filter({ hasText: nome });
async function abrirNaGov(texto) {
  await aba(gov, 'vIssue');
  if (await gov.locator('#iOut').isVisible()) await gov.click('#iNew');
  await gov.click('#iqGo');
  await gov.click('#iSeg [data-f="aguardando"]');
  await gov.locator('#iFila [data-fila]').filter({ hasText: texto }).click();
  await expect(gov.locator('#iForm')).toBeVisible();
}

test('identidade: a carteira envia pela fila, a Governança aprova e a carteira recebe sozinha', async () => {
  await pedirIdentidade('Maria Fila');
  // Na fila remota: endereçado à Governança e cifrado (o nome não aparece).
  const [d] = naFila('fila-solicitacao');
  expect(d.para).toBe(govDid);
  expect(d.env).toMatch(/^smsg1\./);
  expect(d.env).not.toContain('Maria');
  // Enviada, a identidade sai da lista do Solicitar e aparece em Credenciais como "Aguardando".
  expect(await listaDoSolicitar()).not.toContain('Maria Fila');
  await aba(carteira, 'vCreds');
  await expect(pendente('Maria Fila').locator('.pill')).toHaveText('Aguardando');

  await abrirNaGov('Maria Fila');
  await gov.click('#iGo');
  await expect(gov.locator('#iOk')).toContainText('Enviada pela fila.');
  expect(naFila('fila-solicitacao')).toHaveLength(0);
  expect(naFila('fila-emissao')).toHaveLength(1);

  await buscarRespostas(carteira);
  await expect(toast(carteira)).toHaveText('Chegou 1 resposta');
  expect(naFila('fila-emissao')).toHaveLength(0);
  await aba(carteira, 'vCreds');
  await expect(carteira.locator('#cList .cred').first()).toContainText('Maria Fila');
  // Aprovada: o cartão pontilhado some e ela continua fora da lista do Solicitar.
  await expect(pendente('Maria Fila')).toHaveCount(0);
  expect(await listaDoSolicitar()).not.toContain('Maria Fila');
});

test('identidade reprovada: a recusa assinada volta pela fila e a carteira mostra o motivo', async () => {
  await pedirIdentidade('Joana Recusada', true);
  await abrirNaGov('Joana Recusada');
  await gov.click('#iRec');
  await gov.selectOption('#rcM', 'Dados não conferem');
  await gov.click('#rcGo');
  await expect(toast(gov)).toHaveText('Pedido recusado');
  await buscarRespostas(carteira);
  await expect(toast(carteira)).toHaveText('Chegou 1 resposta');
  await aba(carteira, 'vCreds');
  await expect(pendente('Joana Recusada').locator('.pill')).toHaveText('Reprovada: Dados não conferem');
  // Reprovada já foi validada: não volta para a lista do Solicitar. Dispensar só tira o aviso.
  expect(await listaDoSolicitar()).not.toContain('Joana Recusada');
  await pendente('Joana Recusada').locator('[data-idcancel]').click();
  await expect(toast(carteira)).toHaveText('Aviso dispensado');
  await expect(pendente('Joana Recusada')).toHaveCount(0);
  expect(await listaDoSolicitar()).not.toContain('Joana Recusada');
});

test('cancelar um pedido aguardando tira o pedido da fila da Governança', async () => {
  await pedirIdentidade('Paulo Cancela', true);
  expect(naFila('fila-solicitacao')).toHaveLength(1);
  await aba(carteira, 'vCreds');
  await pendente('Paulo Cancela').locator('[data-idcancel]').click();
  await carteira.click('#cfOk');
  await expect(toast(carteira)).toHaveText('Pedido cancelado');
  expect(naFila('fila-solicitacao')).toHaveLength(0);
  await expect(pendente('Paulo Cancela')).toHaveCount(0);
  expect(await listaDoSolicitar()).toContain('Paulo Cancela');
});

test('pedido sem resposta depois de 7 dias (ou de antes da 1.2, sem número) vence e volta para a lista', async () => {
  const n = await carteira.evaluate(async () => {
    const x = identidades().find(i => i.nome === 'Paulo Cancela');
    await guardarPerfil(x.n, { pedido: { at: Date.now() - 8 * 86400 * 1000, nome: x.nome, nonce: 'antigo-0000000000000', gov: 'did:key:z6Mkx' } });
    renderCreds();
    return x.n;
  });
  await expect(carteira.locator(`#cList [data-idpend="${n}"] .pill`)).toHaveText('Pedido vencido: peça de novo');
  expect(await listaDoSolicitar()).toContain('Paulo Cancela');
  await carteira.evaluate(async n => { await guardarPerfil(n, { pedido: { at: Date.now(), nome: 'Paulo Cancela' } }); renderCreds(); }, n);
  await expect(carteira.locator(`#cList [data-idpend="${n}"] .pill`)).toHaveText('Pedido vencido: peça de novo');
  await carteira.evaluate(async n => { await guardarPerfil(n, { pedido: null }); renderCreds(); }, n);
});

test('Governança desativada (troca de chave ou apagar tudo) sai da lista; a mais recente vem primeiro', async ({ browser }) => {
  const velha = await (await browser.newContext()).newPage();
  vigiarCsp(velha, violacoesCsp);
  await preparar(velha, 'governanca-systekna.html', WORDS.outroEmissor);
  const didVelha = await velha.evaluate(() => ses.did);
  let l = await carteira.evaluate(() => lerDiretorio('governanca'));
  expect(l.map(g => g.did)).toEqual([didVelha, govDid]);
  await velha.evaluate(() => desativarDiretorio('governanca', st.name));
  l = await carteira.evaluate(() => lerDiretorio('governanca'));
  expect(l.map(g => g.did)).toEqual([govDid]);
  await velha.context().close();
});

test('aprovação de emissão: o serviço escolhe a Governança no diretório e recebe a aprovação pela fila', async () => {
  await srv.click('#dockAdd');
  await srv.click('#sheetBody [data-act="ask"]');
  await expect(srv.locator('#saG')).toHaveValue(govDid);
  await srv.fill('#saN', 'Academia Fila');
  await srv.click('#saGo');
  await expect(toast(srv)).toHaveText('Pedido enviado à Governança Systekna');
  await abrirNaGov('Serviço: Academia Fila');
  await gov.click('#iGo');
  await expect(gov.locator('#iOk')).toContainText('Emissão aprovada');
  await buscarRespostas(srv);
  await expect(toast(srv)).toHaveText('Resposta da Governança recebida');
  expect(await srv.evaluate(() => st.aprovacoes.length)).toBe(1);
});

test('o serviço cria um app e o cartão vai para o diretório', async () => {
  await aba(srv, 'vSrv');
  await srv.click('#sAppNovo');
  await srv.fill('#naN', 'Musculação');
  await srv.click('#naGo');
  await expect(toast(srv)).toHaveText('App criado');
  await fecharSheet(srv);
  await buscarRespostas(srv);
  const l = await carteira.evaluate(() => lerDiretorio('servico'));
  expect(l.map(x => x.name)).toEqual(['Academia Fila']);
  expect(payloadDe(l[0].payload.cartao).apps).toEqual(['Musculação']);
});

test('crachá: a carteira escolhe o serviço, pede pela fila, o serviço aprova e o crachá chega', async () => {
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="access"]');
  await carteira.click('#paS [data-srv]');
  await expect(carteira.locator('#paStep')).toContainText('Serviço aprovado pela Governança da sua identidade.');
  await carteira.click('#paApps [data-app="Musculação"]');
  await carteira.click('#paGo');
  await expect(toast(carteira)).toHaveText('Pedido enviado a Academia Fila');
  await expect(carteira.locator('#cList .acesso')).toContainText('Aguardando');

  await aba(srv, 'vBadge');
  await srv.click('#cqGo');
  // A busca automática (a cada 30 s) pode ter pego o pedido antes do clique: confere a lista, não o aviso.
  await expect(srv.locator('#cFila [data-ent]')).toHaveCount(1);
  await srv.click('#cFila [data-ent]');
  await expect(srv.locator('#cNome')).toHaveText('Maria Fila');
  await srv.click('#cGo');
  await expect(srv.locator('#cOk')).toContainText('Enviados pela fila');
  await expect(srv.locator('#cFila')).toHaveCount(1);

  await buscarRespostas(carteira);
  await expect(toast(carteira)).toHaveText('Chegou 1 resposta');
  await expect(carteira.locator('#cList .cracha')).toContainText('CRACHÁ: APP Musculação');
  await expect(carteira.locator('#cList .acesso')).toHaveCount(0);
});

test('crachá recusado: a recusa volta pela fila e a carteira mostra o motivo', async () => {
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="access"]');
  await carteira.click('#paS [data-srv]');
  await carteira.click('#paApps [data-app="Musculação"]');
  await carteira.click('#paGo');
  await expect(toast(carteira)).toHaveText('Pedido enviado a Academia Fila');
  await aba(srv, 'vBadge');
  if (await srv.locator('#cOut').isVisible()) await srv.click('#cNew');
  await srv.click('#cqGo');
  await srv.click('#cFila [data-ent]');
  await srv.click('#cRec');
  await srv.selectOption('#rxM', 'Não é cliente');
  await srv.click('#rxGo');
  await expect(srv.locator('#cOk')).toContainText('A recusa foi enviada pela fila');
  await buscarRespostas(carteira);
  await expect(carteira.locator('#cList .acesso')).toContainText('Recusado: Não é cliente');
});

test('nada fica para trás nas filas e nenhuma violação de CSP', async () => {
  expect(naFila('fila-solicitacao')).toEqual([]);
  expect(naFila('fila-emissao')).toEqual([]);
  expect(violacoesCsp).toEqual([]);
});
