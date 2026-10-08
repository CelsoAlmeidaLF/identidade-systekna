// @ts-check
// Serviços Systekna (decisões de 03/10/2026, docs_v2/11): o serviço é credenciado pela Governança, emite
// crachás (CV:KEY) para quem tem a Identidade aprovada e confere o acesso na portaria.
// A carteira ainda não tem a tela de pedir crachá: o pedido é assinado direto na página da carteira.
const { test, expect } = require('@playwright/test');
const { receberPedido, WORDS, vigiarCsp, preparar, aba, toast, fecharSheet, payloadDe } = require('../../compartilhado/tests/helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {import('@playwright/test').Page} */ let gov;
/** @type {import('@playwright/test').Page} */ let srv;
let didCarteira = '';
let didGov = '';
let didSrv = '';
let identidade = '';
/** @type {string[]} */ const violacoesCsp = [];

const agora = () => Math.floor(Date.now() / 1000);
const DIA = 86_400;
const assinar = (page, typ, payload) => page.evaluate(([t, p]) => signJWT(t, p), [typ, payload]);
const embrulhado = (page, tok) => page.evaluate(t => embrulhar(t), tok);
const sem = tok => tok.replace(/^SYSTEKNA:[A-Z-]+:/, '');

function vc(iss, sub, tipo, subject, extra = {}) {
  const iat = agora();
  return {
    iss, sub, iat, nbf: iat, jti: `urn:uuid:${crypto.randomUUID()}`,
    vc: { '@context': ['https://www.w3.org/2018/credentials/v1'], type: ['VerifiableCredential', tipo], issuer: { id: iss, name: 'Teste' }, credentialSubject: { id: sub, ...subject } },
    ...extra,
  };
}

/** Pedido de crachá assinado pela carteira, com a Identidade junto. */
async function pedidoDeCracha(apps, extra = {}) {
  const iat = agora();
  const tok = await assinar(carteira, 'pedido+jwt', {
    iss: didCarteira, sub: didCarteira, aud: didSrv, name: 'Maria Teste', wanted: 'BadgeCredential', apps,
    identidade, note: '', nonce: `cracha-${Math.random()}`, iat, exp: iat + 7 * DIA, ...extra,
  });
  return embrulhado(carteira, tok);
}

async function conferirPedido(tok) {
  await aba(srv, 'vBadge');
  if (await srv.locator('#cOut').isVisible()) await srv.click('#cNew');
  await srv.fill('#cqT', tok);
  await srv.click('#cqGo');
}

/** Emite pelo botão e devolve o primeiro crachá novo. O resultado anterior continua na tela até o novo aparecer. */
async function emitirCrachas() {
  const campo = srv.locator('#cList [data-cracha="0"]');
  const anterior = (await campo.count()) ? await campo.inputValue() : '';
  await srv.click('#cGo');
  await expect(srv.locator('#cOut')).toBeVisible();
  await expect(campo).not.toHaveValue(anterior);
  return campo.inputValue();
}

async function receberNaCarteira(tok) {
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="get"]');
  await carteira.fill('#rcT', tok);
  await carteira.click('#rcGo');
  await expect(toast(carteira)).toHaveText('Credencial guardada');
}

async function gerarDesafio(app) {
  await aba(srv, 'vGate');
  await srv.selectOption('#gaApp', app);
  const anterior = await srv.inputValue('#gaChalT');
  await srv.click('#gaGen');
  await expect(srv.locator('#gaChalT')).not.toHaveValue(anterior);
  return srv.inputValue('#gaChalT');
}

/** A carteira responde ao desafio pela tela, escolhendo o crachá pelo jti. */
async function provaPelaCarteira(desafio, jti) {
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="show"]');
  await carteira.fill('#apT', desafio);
  await carteira.click('#apGo');
  const id = await carteira.evaluate(j => creds().find(c => c.data.jti === j).rec.id, jti);
  await carteira.click(`#apC [data-pk="${id}"]`);
  await carteira.click('#apSign');
  const prova = await carteira.inputValue('#apJ');
  await fecharSheet(carteira);
  return prova;
}

async function conferirAcesso(prova) {
  await aba(srv, 'vGate');
  await srv.fill('#gaPT', prova);
  await srv.click('#gaGo');
  return srv.locator('#gaOut');
}

const ponto = (out, estado, texto) => out.locator(`.chk.${estado}`).filter({ hasText: texto });

test.beforeAll(async ({ browser }) => {
  [carteira, gov, srv] = await Promise.all([1, 2, 3].map(async () => (await browser.newContext()).newPage()));
  for (const p of [carteira, gov, srv]) vigiarCsp(p, violacoesCsp);
  await preparar(gov, 'governanca-systekna.html', WORDS.emissor);
  await preparar(srv, 'servicos-systekna.html', WORDS.servico);
  await preparar(carteira, 'carteira-systekna.html', WORDS.carteira);
  [didCarteira, didGov, didSrv] = await Promise.all([carteira, gov, srv].map(p => p.evaluate(() => ses.did)));

  // A carteira tem a Identidade aprovada pela Governança.
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="ask"]');
  await carteira.fill('#aqN', 'Maria Teste');
  await carteira.click('#aqGo');
  const pedido = await carteira.inputValue('#aqJ');
  await fecharSheet(carteira);
  await receberPedido(gov, pedido);
  await gov.click('#iGo');
  await expect(gov.locator('#iOk')).toContainText('Credencial emitida');
  await receberNaCarteira(await gov.inputValue('#iJwt'));
  identidade = await carteira.evaluate(() => creds()[0].data.jwt);
});

test.afterAll(async () => {
  for (const p of [carteira, gov, srv]) await p?.context().close();
});

test.describe('antes do credenciamento', () => {
  test('o painel avisa que falta a Governança e nada é emitido', async () => {
    await expect(srv.locator('#pCred')).toContainText('Governança não informada');
    await aba(srv, 'vSrv');
    await srv.click('#sCard');
    await expect(toast(srv)).toHaveText('Sem credenciamento válido, o serviço não tem cartão.');
    await srv.click('#sAsk');
    await expect(toast(srv)).toHaveText('Informe e salve o nome e os apps do serviço antes de pedir.');
  });

  test('nome, apps e Governança são configurados; o próprio DID não serve de Governança', async () => {
    await aba(srv, 'vSrv');
    await srv.fill('#sName', 'Academia Boa Forma');
    await srv.fill('#sApps', 'Portaria, Aulas, Portaria');
    await srv.click('#sSave');
    await expect(toast(srv)).toHaveText('Serviço salvo');
    expect(await srv.evaluate(() => [st.name, st.apps])).toEqual(['Academia Boa Forma', ['Portaria', 'Aulas']]);
    await expect(srv.locator('#whoLabel')).toHaveText('Academia Boa Forma');

    await srv.click('#sGov');
    await srv.fill('#gvD', didSrv);
    await srv.click('#gvGo');
    await expect(srv.locator('#gvH')).toHaveText('Este é o DID do próprio serviço.');
    await srv.fill('#gvD', didGov);
    await srv.click('#gvGo');
    await expect(toast(srv)).toHaveText('Governança salva');
    await expect(srv.locator('#sGovN')).toHaveText('Governança Systekna');
  });

  test('pedido de crachá é recusado enquanto não há credenciamento', async () => {
    await conferirPedido(await pedidoDeCracha(['Portaria']));
    await expect(srv.locator('#cqH')).toHaveText('O serviço está sem credenciamento válido da Governança. Sem ele, não emite crachás.');
  });
});

let credenciamento = '';

test.describe('credenciamento', () => {
  test('o pedido vai endereçado à Governança, com nome e apps', async () => {
    await aba(srv, 'vSrv');
    await srv.click('#sAsk');
    const pedido = await srv.inputValue('#saJ');
    expect(pedido).toMatch(/^SYSTEKNA:PEDIDO-CREDENCIAMENTO:ey/);
    const p = payloadDe(pedido);
    expect([p.iss, p.aud, p.name, p.apps]).toEqual([didSrv, didGov, 'Academia Boa Forma', ['Portaria', 'Aulas']]);
    await fecharSheet(srv);

    await receberPedido(gov, pedido);
    await expect(gov.locator('#iType')).toHaveValue('ServiceAccreditationCredential');
    const anterior = await gov.inputValue('#iJwt');
    await gov.click('#iGo');
    await expect(gov.locator('#iJwt')).not.toHaveValue(anterior);
    credenciamento = await gov.inputValue('#iJwt');
    expect(credenciamento).toMatch(/^SYSTEKNA:CREDENCIAMENTO:/);
  });

  test('credenciamento de quem não é a Governança ou para outro serviço é recusado', async () => {
    const receber = async tok => {
      await aba(srv, 'vSrv');
      await srv.click('#sRecv');
      await srv.fill('#srT', tok);
      await srv.click('#srGo');
      return srv.locator('#srH');
    };
    const falso = await assinar(carteira, 'vc+jwt', vc(didCarteira, didSrv, 'ServiceAccreditationCredential', { servico: 'X', apps: ['Portaria'] }));
    await expect(await receber(falso)).toHaveText('Este credenciamento não foi assinado pela Governança deste serviço.');
    await fecharSheet(srv);
    const deOutro = await assinar(gov, 'vc+jwt', vc(didGov, didCarteira, 'ServiceAccreditationCredential', { servico: 'X', apps: ['Portaria'] }));
    await expect(await receber(deOutro)).toHaveText('Este credenciamento é de outro serviço.');
    await fecharSheet(srv);
    await expect(await receber(identidade)).toHaveText('Isto não é um credenciamento.');
    await fecharSheet(srv);

    await receber(credenciamento);
    await expect(toast(srv)).toHaveText('Credenciamento guardado');
    await aba(srv, 'vPanel');
    await expect(srv.locator('#pCred')).toContainText('Credenciado pela Governança Systekna');
    await expect(srv.locator('#pCred')).toContainText('Portaria, Aulas');
    await expect(srv.locator('#sP')).toHaveText('2');
  });

  test('o Cartão do serviço leva nome, apps e o credenciamento', async () => {
    await aba(srv, 'vSrv');
    await srv.click('#sCard');
    const cartao = await srv.inputValue('#scJ');
    await fecharSheet(srv);
    expect(cartao).toMatch(/^SYSTEKNA:CARTAO-SERVICO:ey/);
    const p = payloadDe(cartao);
    expect([p.iss, p.name, p.apps, p.credenciamento]).toEqual([didSrv, 'Academia Boa Forma', ['Portaria', 'Aulas'], sem(credenciamento)]);
    expect(p.exp).toBe(payloadDe(credenciamento).exp);
    expect(await carteira.evaluate(async t => (await verifyJWT(t, 'cartao+jwt')).ok, cartao)).toBe(true);
  });
});

let jtiPortaria = '';

test.describe('crachás', () => {
  test('o pedido é conferido com a Identidade e já marca os apps pedidos', async () => {
    await conferirPedido(await pedidoDeCracha(['Portaria', 'Piscina']));
    await expect(srv.locator('#cWho')).toContainText('Maria Teste tem a Identidade aprovada pela Governança Systekna');
    await expect(srv.locator('#cWho')).toContainText('Fora do credenciamento: Piscina.');
    await expect(srv.locator('#cApps [data-app="Portaria"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(srv.locator('#cApps [data-app="Aulas"]')).toHaveAttribute('aria-pressed', 'false');
  });

  test('emite um crachá por app, com a validade escolhida e o credenciamento junto', async () => {
    await srv.selectOption('#cDays', '30');
    const tok = await emitirCrachas();
    await expect(srv.locator('#cOk')).toContainText('Crachá emitido');
    expect(tok).toMatch(/^SYSTEKNA:CRACHA:ey/);
    const p = payloadDe(tok);
    expect(p.iss).toBe(didSrv);
    expect(p.sub).toBe(didCarteira);
    expect(p.vc.type).toEqual(['VerifiableCredential', 'BadgeCredential']);
    expect(p.vc.credentialSubject).toEqual({ id: didCarteira, servico: 'Academia Boa Forma', app: 'Portaria' });
    expect(p.exp - p.iat).toBe(30 * DIA);
    expect(p.vc.evidence[0].credenciamento).toBe(sem(credenciamento));
    jtiPortaria = p.jti;
    await receberNaCarteira(tok);
  });

  test('"sem validade" fica limitado ao fim do credenciamento', async () => {
    await conferirPedido(await pedidoDeCracha(['Aulas']));
    await srv.selectOption('#cDays', '0');
    expect(payloadDe(await emitirCrachas()).exp).toBe(payloadDe(credenciamento).exp);
  });

  test('pedido sem Identidade, com Identidade de outra pessoa ou fora da Governança é recusado', async () => {
    await conferirPedido(await pedidoDeCracha(['Portaria'], { identidade: undefined }));
    await expect(srv.locator('#cqH')).toHaveText('O pedido não traz a Identidade aprovada pela Governança.');

    const deOutra = await assinar(gov, 'vc+jwt', vc(didGov, didSrv, 'IdentityCredential', { nome: 'Outra Pessoa' }));
    await conferirPedido(await pedidoDeCracha(['Portaria'], { identidade: deOutra }));
    await expect(srv.locator('#cqH')).toHaveText('A Identidade é de outra pessoa.');

    const foraDaGov = await assinar(srv, 'vc+jwt', vc(didSrv, didCarteira, 'IdentityCredential', { nome: 'Maria Teste' }));
    await conferirPedido(await pedidoDeCracha(['Portaria'], { identidade: foraDaGov }));
    await expect(srv.locator('#cqH')).toHaveText('A Identidade não foi aprovada pela Governança deste serviço.');

    const vencida = await assinar(gov, 'vc+jwt', vc(didGov, didCarteira, 'IdentityCredential', { nome: 'Maria Teste' }, { iat: agora() - 3 * DIA, nbf: agora() - 3 * DIA, exp: agora() - DIA }));
    await conferirPedido(await pedidoDeCracha(['Portaria'], { identidade: vencida }));
    await expect(srv.locator('#cqH')).toContainText('A Identidade venceu em');
  });

  test('pedido já atendido, de outro tipo ou para outro serviço é recusado', async () => {
    const pedido = await pedidoDeCracha(['Portaria']);
    await conferirPedido(pedido);
    await emitirCrachas();
    await conferirPedido(pedido);
    await expect(srv.locator('#cqH')).toHaveText('Este pedido já foi atendido. Peça um novo à pessoa.');

    await conferirPedido(await pedidoDeCracha(['Portaria'], { wanted: 'IdentityCredential' }));
    await expect(srv.locator('#cqH')).toHaveText('Este pedido não é de crachá. A Identidade é aprovada pela Governança.');

    await conferirPedido(await pedidoDeCracha(['Portaria'], { aud: didGov }));
    await expect(srv.locator('#cqH')).toHaveText('Este pedido foi feito para outro serviço.');
  });

  test('um crachá ativo por pessoa e app: o novo revoga o anterior', async () => {
    const portaria = await srv.evaluate(() => st.issued.filter(i => i.claims.app === 'Portaria').map(i => ({ jti: i.jti, revoked: i.revoked, reason: i.reason || '' })));
    expect(portaria.filter(i => !i.revoked)).toHaveLength(1);
    expect(portaria.find(i => i.jti === jtiPortaria)?.reason).toBe('Substituído por novo crachá');
  });

  test('a Governança não atende pedido de crachá', async () => {
    await receberPedido(gov, await pedidoDeCracha(['Portaria'], { aud: 'emissor' }));
    await expect(gov.locator('#iqH')).toHaveText('Este é um pedido de crachá. Ele vai para o serviço que dá o acesso, não para a Governança.');
  });
});

test.describe('portaria', () => {
  let jtiAtivo = '';

  test('crachá válido do app certo: acesso liberado', async () => {
    // O crachá ativo de Portaria é o último emitido; a carteira o recebe.
    await conferirPedido(await pedidoDeCracha(['Portaria']));
    const tok = await emitirCrachas();
    jtiAtivo = payloadDe(tok).jti;
    await receberNaCarteira(tok);

    const desafio = await gerarDesafio('Portaria');
    expect(desafio).toMatch(/^SYSTEKNA:DESAFIO:/);
    expect(payloadDe(desafio).app).toBe('Portaria');
    const prova = await provaPelaCarteira(desafio, jtiAtivo);
    expect(prova).toMatch(/^SYSTEKNA:PROVA:/);
    const out = await conferirAcesso(prova);
    await expect(out).toContainText('Acesso liberado');
    await expect(out).toContainText('Maria Teste pode entrar em Portaria');
    await expect(out.locator('.chk.no')).toHaveCount(0);

    // A mesma prova de novo: o desafio já foi usado.
    const outra = await conferirAcesso(prova);
    await expect(outra).toContainText('Acesso negado');
    await expect(ponto(outra, 'no', 'Desafio desta portaria')).toHaveCount(1);
  });

  test('crachá de outro app é negado', async () => {
    const out = await conferirAcesso(await provaPelaCarteira(await gerarDesafio('Aulas'), jtiAtivo));
    await expect(out).toContainText('Acesso negado');
    await expect(ponto(out, 'no', 'App certo')).toHaveCount(1);
  });

  test('crachá de outro emissor é negado', async () => {
    const falso = await assinar(gov, 'vc+jwt', vc(didGov, didCarteira, 'BadgeCredential', { servico: 'Academia Boa Forma', app: 'Portaria' }));
    const nonce = payloadDe(await gerarDesafio('Portaria')).nonce;
    const iat = agora();
    const prova = await assinar(carteira, 'vp+jwt', {
      iss: didCarteira, sub: didCarteira, aud: didSrv, nonce, iat, exp: iat + 300,
      vp: { '@context': ['https://www.w3.org/2018/credentials/v1'], type: ['VerifiablePresentation'], holder: didCarteira, verifiableCredential: [falso] },
    });
    const out = await conferirAcesso(prova);
    await expect(out).toContainText('Acesso negado');
    await expect(ponto(out, 'no', 'Emitido por este serviço')).toHaveCount(1);
  });

  test('crachá revogado é negado', async () => {
    await aba(srv, 'vSrv');
    const n = await srv.evaluate(j => st.issued.find(i => i.jti === j).n, jtiAtivo);
    await srv.click(`#sIssued [data-iss="${n}"]`);
    await srv.click('#rvGo');
    await srv.click('#cfOk');
    await expect(toast(srv)).toHaveText('Credencial revogada');

    const out = await conferirAcesso(await provaPelaCarteira(await gerarDesafio('Portaria'), jtiAtivo));
    await expect(out).toContainText('Acesso negado');
    await expect(ponto(out, 'no', 'Não revogado')).toHaveCount(1);
    expect(await srv.evaluate(() => st.book.at(-1).text)).toContain('Acesso negado a Portaria');
  });
});

test('a troca de chave da Governança é importada e as Identidades antigas continuam valendo', async () => {
  const aviso = await gov.evaluate(async palavras => {
    const novo = await deriveIdentity(await wordsToSeed(palavras.split(' ')));
    const aceite = b64u.enc(await S.sign({ name: 'Ed25519' }, novo.edPriv, te.encode(`${ses.did}>${novo.did}`)));
    return embrulhar(await signJWT('rotacao+jwt', { iss: ses.did, novo: novo.did, name: st.name, aceite, iat: now() }));
  }, WORDS.outroEmissor);
  const importar = async () => {
    await aba(srv, 'vSrv');
    await srv.click('#sGovRot');
    await srv.fill('#irT', aviso);
    await srv.click('#irGo');
  };
  await importar();
  await expect(toast(srv)).toHaveText('Troca de chave importada');
  expect(await srv.evaluate(() => st.gov.dids.length)).toBe(2);
  await importar();
  await expect(srv.locator('#irH')).toHaveText('Esta troca já foi importada.');
  await fecharSheet(srv);

  // A Identidade assinada pela chave antiga continua aceita.
  await conferirPedido(await pedidoDeCracha(['Aulas']));
  await expect(srv.locator('#cWho')).toContainText('Pedido conferido');
});

test('nenhuma violação de CSP em todo o fluxo acima', () => {
  expect(violacoesCsp).toEqual([]);
});
