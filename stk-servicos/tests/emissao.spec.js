// @ts-check
// Cenário 2, regras de 08/10/2026: a Governança aprova o SERVIÇO (a organização ou o desenvolvedor), não os apps.
// O serviço cadastra os apps dele e, em cada um, as funcionalidades e os grupos delas. Ao aprovar um acesso, libera
// uma ou mais funcionalidades (o grupo é só atalho); o crachá leva as funcionalidades liberadas, sem grupo nem plano,
// e a portaria confere a funcionalidade pedida no próprio crachá.
const { test, expect } = require('@playwright/test');
const { buscarRespostas, ultimoPedidoPara, entregarNaCarteira, receberPedido, WORDS, vigiarCsp, preparar, aba, toast, fecharSheet, payloadDe, bloquearEDesbloquear } = require('../../compartilhado/tests/helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let srv;
/** @type {import('@playwright/test').Page} */ let gov;
/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {string[]} */ const violacoesCsp = [];
let didSrv = '', didGov = '', didCarteira = '';
const DIA = 86_400;
const agora = () => Math.floor(Date.now() / 1000);
const APP = 'Gestão Financeira';

async function menu(acao) {
  await srv.click('#dockAdd');
  await srv.click(`#sheetBody [data-act="${acao}"]`);
}

async function conferirNaStk(tok) {
  await receberPedido(gov, tok);
  await expect(gov.locator('#iWho')).toContainText('Pedido conferido');
}

async function aprovarNaStk() {
  const anterior = await gov.inputValue('#iJwt');
  await gov.click('#iGo');
  await expect(gov.locator('#iJwt')).not.toHaveValue(anterior);
  await expect(gov.locator('#iOk')).toContainText('Emissão aprovada');
  return gov.inputValue('#iJwt');
}

/** O serviço busca a resposta da Governança na fila. */
async function receber() {
  await buscarRespostas(srv);
  await expect(toast(srv)).toHaveText('Resposta da Governança recebida');
}

/** Cadastra uma funcionalidade e espera o resultado (salvar é assíncrono e limpa o formulário). */
async function funcionalidade(nome, codigo, tipo) {
  const antes = await srv.locator('#fnL .tx').count();
  await srv.fill('#fnN', nome);
  if (codigo) await srv.fill('#fnC', codigo);
  if (tipo) await srv.selectOption('#fnT', tipo);
  await srv.click('#fnAdd');
  await expect(async () => {
    const depois = await srv.locator('#fnL .tx').count();
    const erro = await srv.locator('#fnH.bad').count();
    expect(depois > antes || erro > 0).toBe(true);
  }).toPass();
}

/** Gera um desafio na portaria (app e, se der, a funcionalidade), responde pela carteira e confere. */
async function portaria(fn) {
  await aba(srv, 'vGate');
  await srv.selectOption('#gaApp', APP);
  await srv.selectOption('#gaFn', fn);
  const anterior = await srv.inputValue('#gaChalT');
  await srv.click('#gaGen');
  await expect(srv.locator('#gaChalT')).not.toHaveValue(anterior);
  const desafio = await srv.inputValue('#gaChalT');
  await carteira.click('#dockShow');
  await carteira.fill('#apT', desafio);
  await carteira.click('#apGo');
  await carteira.locator('#apC [data-pk]').filter({ hasText: 'Crachá' }).first().click();
  await carteira.click('#apSign');
  const prova = await carteira.inputValue('#apJ');
  await fecharSheet(carteira);
  await srv.fill('#gaPT', prova);
  await srv.click('#gaGo');
  return { desafio, out: srv.locator('#gaOut') };
}

test.beforeAll(async ({ browser }) => {
  [srv, gov, carteira] = await Promise.all([1, 2, 3].map(async () => (await browser.newContext()).newPage()));
  for (const p of [srv, gov, carteira]) vigiarCsp(p, violacoesCsp);
  await preparar(gov, 'governanca-systekna.html', WORDS.emissor);
  await preparar(srv, 'servicos-systekna.html', WORDS.servico);
  await preparar(carteira, 'carteira-systekna.html', WORDS.carteira);
  [didSrv, didGov, didCarteira] = await Promise.all([srv, gov, carteira].map(p => p.evaluate(() => ses.did)));
});

test.afterAll(async () => {
  for (const p of [srv, gov, carteira]) await p?.context().close();
});

test('rodapé com o + no centro e o menu com as três ações', async () => {
  await expect(srv.locator('.dock > button')).toHaveText(['Painel', 'Crachás', '', 'Portaria', 'Serviço']);
  await srv.click('#dockAdd');
  await expect(srv.locator('#sheetBody [data-act] b')).toHaveText(['Solicitar aprovação de emissão', 'Buscar respostas e pedidos', 'Cartão do serviço']);
  await fecharSheet(srv);
  await expect(srv.locator('#pCred')).toContainText('Governança não escolhida');
});

let pedido1 = '';

test('solicitar: o pedido leva só o serviço, sem apps, e fica aguardando', async () => {
  await menu('ask');
  await expect(srv.locator('#saA')).toHaveCount(0);
  await srv.fill('#saN', 'Systekna Software');
  // A Governança vem do diretório (o próprio serviço não aparece: ele não é Governança).
  await expect(srv.locator(`#saG option[value="${didSrv}"]`)).toHaveCount(0);
  await srv.selectOption('#saG', didGov);
  await srv.click('#saGo');
  await expect(toast(srv)).toHaveText('Pedido enviado à Governança Systekna');
  pedido1 = await ultimoPedidoPara(gov);
  const p = payloadDe(pedido1);
  expect(p.x).toBe(await srv.evaluate(() => ses.xMb));
  expect([p.iss, p.aud, p.name, p.wanted, 'apps' in p]).toEqual([didSrv, didGov, 'Systekna Software', 'ServiceAccreditationCredential', false]);
  await aba(srv, 'vPanel');
  await expect(srv.locator('#pAprov .pend')).toContainText('Aguardando aprovação');
  await expect(srv.locator('#pAprov .pend')).toContainText('Systekna Software');
});

test('a STK aprova o serviço, sem lista de apps', async () => {
  await conferirNaStk(pedido1);
  await expect(gov.locator('#iSrvNome')).toHaveText('Systekna Software');
  await expect(gov.locator('#iSrvApps')).toHaveCount(0);
  await expect(gov.locator('#iGo')).toHaveText('Aprovar emissão');
  const tok = await aprovarNaStk();
  const p = payloadDe(tok);
  expect(p.vc.credentialSubject).toEqual({ id: didSrv, servico: 'Systekna Software' });
  expect(p.exp - p.iat).toBe(365 * DIA);
  await receber();
  await expect(srv.locator('#pAprov .pend')).toHaveCount(0);
  await expect(srv.locator('#pCred')).toContainText('Nenhum app ainda');
});

test('a STK recusa: o motivo fala do serviço, não de apps', async () => {
  await menu('ask');
  await expect(srv.locator('#saOk')).toContainText('O serviço já está aprovado até');
  await srv.click('#saGo');
  await expect(toast(srv)).toHaveText(/^Pedido enviado/);
  await conferirNaStk(await ultimoPedidoPara(gov));
  await expect(gov.locator('#iSrvAtiva')).toContainText('Este serviço já está aprovado até');
  await gov.click('#iRec');
  await gov.selectOption('#rcM', 'Serviço não autorizado');
  await gov.click('#rcGo');
  await expect(toast(gov)).toHaveText('Pedido recusado');
  expect(await gov.evaluate(() => st.book.at(-1).text)).toBe('Aprovação de emissão de Systekna Software recusada: Serviço não autorizado');
  // A recusa volta assinada pela fila: o pedido aparece recusado, com o motivo.
  await buscarRespostas(srv);
  await aba(srv, 'vPanel');
  await expect(srv.locator('#pAprov .pend')).toContainText('Recusado: Serviço não autorizado');
  // Tira o pedido recusado para não poluir o painel.
  await srv.evaluate(async () => { st.pendentes = []; await save(); renderPanel(); });
});

test('o serviço cadastra o app, as funcionalidades e um grupo', async () => {
  await aba(srv, 'vSrv');
  await expect(srv.locator('#sApps')).toContainText('Nenhum app ainda');
  await srv.click('#sAppNovo');
  await srv.fill('#naN', APP);
  await srv.click('#naGo');
  await expect(toast(srv)).toHaveText('App criado');
  await expect(srv.locator('#sheetBody h3')).toHaveText(`App ${APP}`);

  await funcionalidade('Lançar despesas', 'despesas');
  await funcionalidade('Lançar receita', 'receita');
  await funcionalidade('Lançar cartões', '', 'Micro-serviço');
  await funcionalidade('Lançar metas', 'despesas');
  await expect(srv.locator('#fnH')).toHaveText('O código despesas já existe neste app.');
  await srv.fill('#fnC', '');
  await expect(srv.locator('#fnL .tx b')).toHaveText(['Lançar despesas', 'Lançar receita', 'Lançar cartões']);
  // O código sai do nome quando não é informado.
  await expect(srv.locator('#fnL [data-fn="lancar-cartoes"] small')).toContainText('Micro-serviço');

  await srv.fill('#grN', 'Básico');
  await srv.click('#grAdd');
  await expect(srv.locator('#grH')).toHaveText('Marque ao menos uma funcionalidade.');
  await srv.click('#grF [data-fn="despesas"]');
  await srv.click('#grF [data-fn="receita"]');
  await srv.click('#grAdd');
  await expect(toast(srv)).toHaveText('Grupo criado');
  await expect(srv.locator('#grL [data-gr="basico"] small')).toHaveText('Lançar despesas · Lançar receita');
  await fecharSheet(srv);

  await expect(srv.locator('#sApps [data-app] small')).toHaveText('3 funcionalidades · 1 grupo');
  expect(await srv.evaluate(() => st.book.filter(e => e.act === 'catalogo').length)).toBe(5);
  await aba(srv, 'vPanel');
  await expect(srv.locator('#pCred')).toBeEmpty();
  await expect(srv.locator('#pAprov .cred .tipo')).toHaveText([`App: ${APP}`]);
  await expect(srv.locator('#pAprov .cred .main')).toHaveText('3 funcionalidades · 1 grupo');
});

test('o Cartão do serviço, publicado no diretório, leva as funcionalidades, os grupos e a aprovação', async () => {
  await buscarRespostas(srv);
  const [d] = await carteira.evaluate(() => lerDiretorio('servico'));
  expect(d.did).toBe(didSrv);
  const p = payloadDe(d.payload.cartao);
  const aprov = await srv.evaluate(() => st.aprovacoes[0].jwt);
  expect([p.name, p.apps, p.aprovacoes]).toEqual(['Systekna Software', [APP], [aprov]]);
  expect(p.catalogo).toEqual([{
    nome: APP,
    funcoes: [{ id: 'despesas', nome: 'Lançar despesas' }, { id: 'receita', nome: 'Lançar receita' }, { id: 'lancar-cartoes', nome: 'Lançar cartões' }],
    grupos: [{ id: 'basico', nome: 'Básico', funcoes: ['despesas', 'receita'] }],
  }]);
});

let cracha = '';

test('ao aprovar o acesso, o grupo marca as funcionalidades; o crachá leva só as liberadas', async () => {
  // A carteira tem a Identidade aprovada pela STK.
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="ask"]');
  await carteira.fill('#aqN', 'Maria Teste');
  await carteira.selectOption('#aqE', await gov.evaluate(() => ses.did));
  await carteira.click('#aqGo');
  await expect(toast(carteira)).toHaveText(/^Pedido enviado/);
  const pedidoId = await ultimoPedidoPara(gov);
  await conferirNaStk(pedidoId);
  const anterior = await gov.inputValue('#iJwt');
  await gov.click('#iGo');
  await expect(gov.locator('#iJwt')).not.toHaveValue(anterior);
  expect(await entregarNaCarteira(carteira, await gov.inputValue('#iJwt'))).toBe('Credencial guardada');

  // A pessoa escolhe o serviço no diretório e vê as funcionalidades e os grupos.
  await menu('card');
  await expect(toast(srv)).toHaveText('Cartão do serviço publicado no diretório');
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="access"]');
  await carteira.click(`#paS [data-srv="${didSrv}"]`);
  await expect(carteira.locator(`#paApps [data-app="${APP}"]`)).toContainText('Funcionalidades: Lançar despesas, Lançar receita, Lançar cartões');
  await expect(carteira.locator(`#paApps [data-app="${APP}"]`)).toContainText('Grupos: Básico');
  await carteira.click(`#paApps [data-app="${APP}"]`);
  await carteira.click('#paGo');
  await expect(toast(carteira)).toHaveText(/^Pedido enviado a /);
  const pedido = await ultimoPedidoPara(srv);

  await aba(srv, 'vBadge');
  await srv.click('#cqGo');
  await srv.locator(`#cFila [data-ent="${payloadDe(pedido).nonce}"]`).click();
  await expect(srv.locator('#cWho')).toContainText('Pedido conferido');
  const fn = id => srv.locator(`#cApps [data-fn="${id}"]`);
  const grupo = srv.locator('#cApps [data-gr="basico"]');
  // Tudo liberado por padrão; o grupo desmarca e marca as dele.
  await expect(grupo).toHaveAttribute('aria-pressed', 'true');
  await grupo.click();
  await expect(fn('despesas')).toHaveAttribute('aria-pressed', 'false');
  await expect(fn('receita')).toHaveAttribute('aria-pressed', 'false');
  await expect(fn('lancar-cartoes')).toHaveAttribute('aria-pressed', 'true');
  await fn('lancar-cartoes').click();
  await srv.click('#cGo');
  await expect(toast(srv)).toHaveText(`Libere ao menos uma funcionalidade de ${APP}`);
  await grupo.click();
  await expect(fn('despesas')).toHaveAttribute('aria-pressed', 'true');
  await expect(grupo).toHaveAttribute('aria-pressed', 'true');
  await fn('receita').click();
  await expect(grupo).toHaveAttribute('aria-pressed', 'false');
  await fn('receita').click();

  await srv.selectOption('#cDays', '0');
  await srv.click('#cGo');
  await expect(srv.locator('#cOut')).toBeVisible();
  cracha = await srv.inputValue('#cList [data-cracha="0"]');
  const p = payloadDe(cracha);
  expect(p.vc.credentialSubject).toEqual({ id: didCarteira, servico: 'Systekna Software', app: APP, funcionalidades: ['despesas', 'receita'] });
  const aprov = await srv.evaluate(() => ({ jwt: st.aprovacoes[0].jwt, exp: st.aprovacoes[0].exp }));
  expect(p.vc.evidence[0].credenciamento).toBe(aprov.jwt);
  expect(p.exp).toBe(aprov.exp);
  expect(await srv.evaluate(() => st.book.at(-1).text)).toBe(`Crachá ${APP} (Lançar despesas, Lançar receita) emitido para Maria Teste`);

  await buscarRespostas(carteira);
  await expect(toast(carteira)).toHaveText('Chegou 1 resposta');
});

test('portaria: a funcionalidade liberada passa; a que não está no crachá é negada', async () => {
  const lib = await portaria('receita');
  expect(payloadDe(lib.desafio)).toMatchObject({ app: APP, funcao: 'receita', purpose: `Lançar receita em ${APP}` });
  await expect(lib.out).toContainText('Acesso liberado');
  await expect(lib.out).toContainText(`Maria Teste pode usar Lançar receita em ${APP}`);
  await expect(lib.out.locator('.chk.ok').filter({ hasText: 'Funcionalidade liberada' })).toContainText('O crachá libera Lançar receita.');
  await expect(lib.out.locator('.chk.ok').filter({ hasText: 'Aprovação de emissão vigente' })).toContainText('A Governança aprovou o serviço');

  const neg = await portaria('lancar-cartoes');
  await expect(neg.out).toContainText('Acesso negado');
  await expect(neg.out.locator('.chk.no')).toHaveCount(1);
  await expect(neg.out.locator('.chk.no')).toContainText('O crachá não libera Lançar cartões.');

  // Só a entrada no app, sem funcionalidade: não há o ponto de funcionalidade.
  const entrada = await portaria('');
  await expect(entrada.out).toContainText(`Maria Teste pode entrar em ${APP}`);
  await expect(entrada.out.locator('.chk').filter({ hasText: 'Funcionalidade liberada' })).toHaveCount(0);
});

test('relatório de uso: as três conferências da portaria entram com app, funcionalidade e motivo', async () => {
  await aba(srv, 'vPanel');
  await expect(srv.locator('#uLib')).toHaveText('2');
  await expect(srv.locator('#uNeg')).toHaveText('1');
  await expect(srv.locator(`#uApps [data-uso="${APP}"]`)).toContainText('2 liberados · 1 negado');
  await expect(srv.locator(`#uFns [data-uso="${APP} › Lançar receita"]`)).toContainText('1 liberado · 0 negados');
  await expect(srv.locator(`#uFns [data-uso="${APP} › Lançar cartões"]`)).toContainText('0 liberados · 1 negado');
  await expect(srv.locator('#uMot')).toContainText('Funcionalidade liberada');
  const emitidos = await srv.evaluate(() => st.book.filter(e => e.act === 'emissao').length);
  await expect(srv.locator('#uEmi')).toHaveText(String(emitidos));
  expect(await srv.evaluate(() => st.acessos.map(a => [a.ok, a.app, a.fn, a.motivo]))).toEqual([
    [true, APP, 'Lançar receita', ''], [false, APP, 'Lançar cartões', 'Funcionalidade liberada'], [true, APP, '', ''],
  ]);
});

test('um serviço da 0.21 (apps aprovados pela Governança) vira um catálogo, sem perder nada', async () => {
  await srv.evaluate(async () => {
    st.apps = ['Portaria']; st.aprovacoes[0].apps = ['Portaria', 'Piscina']; delete st.catalogo;
    st.pendentes = [{ nonce: 'x', at: Date.now(), apps: ['Sauna'] }];
    await save();
  });
  await bloquearEDesbloquear(srv);
  expect(await srv.evaluate(() => [st.catalogo, 'apps' in st, st.pendentes[0].apps, credOk()])).toEqual([
    [{ nome: 'Portaria', funcoes: [], grupos: [] }, { nome: 'Piscina', funcoes: [], grupos: [] }], false, undefined, true,
  ]);
});

test('nenhuma violação de CSP em todo o fluxo acima', () => {
  expect(violacoesCsp).toEqual([]);
  expect(agora()).toBeGreaterThan(0);
});
