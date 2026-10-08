// @ts-check
// Serviços Systekna: as conferências de segurança do serviço, sobre as telas da 1.2 (filas, Serviço › Apps).
// O caminho feliz está em emissao.spec.js; aqui ficam as recusas: aprovação de emissão falsa ou de outro serviço,
// pedido de crachá sem Identidade válida ou repetido, e a portaria negando crachá de outro app, de outro emissor
// ou revogado. Os pedidos com defeito são assinados direto na página da carteira e postos na fila do serviço.
const { test, expect } = require('@playwright/test');
const { ultimoPedidoPara, entregarNaCarteira, receberPedido, buscarRespostas, WORDS, vigiarCsp, preparar, aba, toast, fecharSheet, payloadDe } = require('../../compartilhado/tests/helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {import('@playwright/test').Page} */ let gov;
/** @type {import('@playwright/test').Page} */ let srv;
let didCarteira = '';
let didGov = '';
let didSrv = '';
let xSrv = '';
let identidade = '';
/** @type {string[]} */ const violacoesCsp = [];

const agora = () => Math.floor(Date.now() / 1000);
const DIA = 86_400;
const assinar = (page, typ, payload) => page.evaluate(([t, p]) => signJWT(t, p), [typ, payload]);

function vc(iss, sub, tipo, subject, extra = {}) {
  const iat = agora();
  return {
    iss, sub, iat, nbf: iat, jti: `urn:uuid:${crypto.randomUUID()}`,
    vc: { '@context': ['https://www.w3.org/2018/credentials/v1'], type: ['VerifiableCredential', tipo], issuer: { id: iss, name: 'Teste' }, credentialSubject: { id: sub, ...subject } },
    ...extra,
  };
}

/**
 * Pedido de crachá assinado pela carteira, com a Identidade e a chave de cifragem, como a tela faria. A carteira
 * também guarda o pedido (aguardando): ela só aceita crachá de serviço a quem pediu acesso.
 */
async function pedidoDeCracha(apps, extra = {}) {
  const iat = agora();
  const p = {
    iss: didCarteira, sub: didCarteira, aud: didSrv, name: 'Maria Teste', wanted: 'BadgeCredential', apps,
    identidade, note: '', x: await carteira.evaluate(() => ses.xMb), nonce: `cracha-${Math.random()}`, iat, exp: iat + 7 * DIA, ...extra,
  };
  await carteira.evaluate(x => saveItem({ type: 'acesso', nonce: x.nonce, servico: 'Academia Boa Forma', srvDid: x.aud, apps: x.apps, did: x.sub, perfil: 'Identidade', status: 'aguardando', at: Date.now() }), p);
  return assinar(carteira, 'pedido+jwt', p);
}

/**
 * Põe o pedido na fila do serviço, busca e abre o pedido na aba Crachás. O que a busca ou a conferência recusar
 * fica em #cqH; o pedido aceito abre o cartão de análise (#cForm).
 */
async function conferirPedido(tok) {
  await carteira.evaluate(([t, para]) => enviarSolicitacao(para, t, b64u.enc(rnd(16))), [tok, { did: didSrv, x: xSrv }]);
  await aba(srv, 'vBadge');
  if (await srv.locator('#cOut').isVisible()) await srv.click('#cNew');
  if (await srv.locator('#cForm').isVisible()) await srv.click('#cBack');
  await srv.evaluate(() => sincronizarSrv(true));
  const item = srv.locator(`#cFila [data-ent="${payloadDe(tok).nonce}"]`);
  if (await item.count()) await item.click();
}

/** Emite pelo botão e devolve o primeiro crachá novo. */
async function emitirCrachas() {
  await srv.click('#cGo');
  await expect(srv.locator('#cOut')).toBeVisible();
  return srv.inputValue('#cList [data-cracha="0"]');
}

/** O serviço confere a aprovação de emissão como se ela tivesse chegado pela fila. Devolve o erro, ou null. */
const aceitar = tok => srv.evaluate(t => aceitarAprovacao(t).then(() => null, e => e.message), tok);

async function gerarDesafio(app) {
  await aba(srv, 'vGate');
  await srv.selectOption('#gaApp', app);
  await srv.selectOption('#gaFn', '');
  const anterior = await srv.inputValue('#gaChalT');
  await srv.click('#gaGen');
  await expect(srv.locator('#gaChalT')).not.toHaveValue(anterior);
  return srv.inputValue('#gaChalT');
}

/** A carteira responde ao desafio pela tela, escolhendo o crachá pelo jti. */
async function provaPelaCarteira(desafio, jti) {
  await carteira.click('#dockShow');
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
  xSrv = await srv.evaluate(() => ses.xMb);

  // A carteira tem a Identidade aprovada pela Governança.
  await carteira.click('#dockAdd');
  await carteira.click('#sheetBody [data-act="ask"]');
  await carteira.fill('#aqN', 'Maria Teste');
  await carteira.selectOption('#aqE', didGov);
  await carteira.click('#aqGo');
  await expect(toast(carteira)).toHaveText(/^Pedido enviado/);
  await receberPedido(gov, await ultimoPedidoPara(gov));
  await gov.click('#iGo');
  await expect(gov.locator('#iOk')).toContainText('Identidade aprovada');
  expect(await entregarNaCarteira(carteira, await gov.inputValue('#iJwt'))).toBe('Credencial guardada');
  identidade = await carteira.evaluate(() => creds()[0].data.jwt);
});

test.afterAll(async () => {
  for (const p of [carteira, gov, srv]) await p?.context().close();
});

test.describe('antes da aprovação de emissão', () => {
  test('o painel avisa que falta a Governança e não há Cartão do serviço', async () => {
    await expect(srv.locator('#pCred')).toContainText('Governança não escolhida');
    await srv.click('#dockAdd');
    await srv.click('#sheetBody [data-act="card"]');
    await expect(toast(srv)).toHaveText('Sem aprovação de emissão válida, o serviço não tem cartão.');
    await fecharSheet(srv).catch(() => {});
  });

  test('o próprio DID não aparece como Governança; o pedido vai à Governança escolhida', async () => {
    await srv.click('#dockAdd');
    await srv.click('#sheetBody [data-act="ask"]');
    await srv.fill('#saN', 'Academia Boa Forma');
    await expect(srv.locator(`#saG option[value="${didGov}"]`)).toHaveCount(1);
    await expect(srv.locator(`#saG option[value="${didSrv}"]`)).toHaveCount(0);
    await srv.selectOption('#saG', didGov);
    await srv.click('#saGo');
    await expect(toast(srv)).toHaveText('Pedido enviado à Governança Systekna');
    await expect(srv.locator('#whoLabel')).toHaveText('Academia Boa Forma');
  });

  test('pedido de crachá é recusado enquanto não há aprovação de emissão', async () => {
    await conferirPedido(await pedidoDeCracha(['Portaria']));
    await expect(srv.locator('#cqH')).toHaveText('O serviço está sem aprovação de emissão válida da Governança. Sem ela, não emite crachás.');
    await expect(srv.locator('#cForm')).toBeHidden();
  });
});

let aprovacao = '';

test.describe('aprovação de emissão', () => {
  test('a Governança aprova e a aprovação chega pela fila', async () => {
    await receberPedido(gov, await ultimoPedidoPara(gov));
    await expect(gov.locator('#iGo')).toHaveText('Aprovar emissão');
    await gov.click('#iGo');
    await expect(gov.locator('#iOk')).toContainText('Emissão aprovada');
    aprovacao = await gov.inputValue('#iJwt');
    await buscarRespostas(srv);
    await expect(toast(srv)).toHaveText('Resposta da Governança recebida');
    expect(await srv.evaluate(() => st.aprovacoes.length)).toBe(1);
  });

  test('aprovação de quem não é a Governança, de outro serviço ou repetida é recusada', async () => {
    const antes = await srv.evaluate(() => st.aprovacoes.length);
    const falsa = await assinar(carteira, 'vc+jwt', vc(didCarteira, didSrv, 'ServiceAccreditationCredential', { servico: 'X' }));
    expect(await aceitar(falsa)).toBe('Esta aprovação não foi assinada pela Governança deste serviço.');
    const deOutro = await assinar(gov, 'vc+jwt', vc(didGov, didCarteira, 'ServiceAccreditationCredential', { servico: 'X' }));
    expect(await aceitar(deOutro)).toBe('Esta aprovação é de outro serviço.');
    expect(await aceitar(identidade)).toBe('Isto não é uma aprovação de emissão.');
    const vencida = await assinar(gov, 'vc+jwt', vc(didGov, didSrv, 'ServiceAccreditationCredential', { servico: 'X' }, { iat: agora() - 3 * DIA, nbf: agora() - 3 * DIA, exp: agora() - DIA }));
    expect(await aceitar(vencida)).toMatch(/^Esta aprovação venceu em /);
    expect(await aceitar(aprovacao.replace(/^SYSTEKNA:[A-Z-]+:/, ''))).toBe('Esta aprovação já está guardada.');
    expect(await srv.evaluate(() => st.aprovacoes.length)).toBe(antes);
  });

  test('o serviço cadastra os apps Portaria e Aulas', async () => {
    for (const nome of ['Portaria', 'Aulas']) {
      await aba(srv, 'vSrv');
      await srv.click('#sAppNovo');
      await srv.fill('#naN', nome);
      await srv.click('#naGo');
      await expect(toast(srv)).toHaveText('App criado');
      await fecharSheet(srv);
    }
    expect(await srv.evaluate(() => appNomes())).toEqual(['Portaria', 'Aulas']);
  });
});

let jtiPortaria = '';

test.describe('crachás', () => {
  test('o pedido é conferido com a Identidade e já marca os apps pedidos', async () => {
    await conferirPedido(await pedidoDeCracha(['Portaria', 'Piscina']));
    await expect(srv.locator('#cWho')).toContainText('Maria Teste tem a Identidade aprovada pela Governança Systekna');
    await expect(srv.locator('#cWho')).toContainText('O serviço não tem: Piscina.');
    await expect(srv.locator('#cApps [data-app="Portaria"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(srv.locator('#cApps [data-app="Aulas"]')).toHaveAttribute('aria-pressed', 'false');
  });

  test('emite o crachá com a validade escolhida e a aprovação de emissão junto', async () => {
    await srv.selectOption('#cDays', '30');
    const tok = await emitirCrachas();
    await expect(srv.locator('#cOk')).toContainText('Crachá emitido');
    const p = payloadDe(tok);
    expect([p.iss, p.sub]).toEqual([didSrv, didCarteira]);
    expect(p.vc.type).toEqual(['VerifiableCredential', 'BadgeCredential']);
    // App sem funcionalidades: o crachá dá só a entrada no app.
    expect(p.vc.credentialSubject).toEqual({ id: didCarteira, servico: 'Academia Boa Forma', app: 'Portaria' });
    expect(p.exp - p.iat).toBe(30 * DIA);
    expect(p.vc.evidence[0].credenciamento).toBe(await srv.evaluate(() => st.aprovacoes[0].jwt));
    jtiPortaria = p.jti;
    expect(await entregarNaCarteira(carteira, tok)).toBe('Credencial guardada');
  });

  test('"sem validade" fica limitado ao fim da aprovação de emissão', async () => {
    await conferirPedido(await pedidoDeCracha(['Aulas']));
    await srv.selectOption('#cDays', '0');
    expect(payloadDe(await emitirCrachas()).exp).toBe(await srv.evaluate(() => st.aprovacoes[0].exp));
  });

  test('pedido sem Identidade, com Identidade de outra pessoa, fora da Governança ou vencida é recusado', async () => {
    const recusa = async (extra, msg) => {
      await conferirPedido(await pedidoDeCracha(['Portaria'], extra));
      await expect(srv.locator('#cqH')).toHaveText(msg);
      await expect(srv.locator('#cForm')).toBeHidden();
    };
    await recusa({ identidade: undefined }, 'O pedido não traz a Identidade aprovada pela Governança.');
    const deOutra = await assinar(gov, 'vc+jwt', vc(didGov, didSrv, 'IdentityCredential', { nome: 'Outra Pessoa' }));
    await recusa({ identidade: deOutra }, 'A Identidade é de outra pessoa.');
    const foraDaGov = await assinar(srv, 'vc+jwt', vc(didSrv, didCarteira, 'IdentityCredential', { nome: 'Maria Teste' }));
    await recusa({ identidade: foraDaGov }, 'A Identidade não foi aprovada pela Governança deste serviço.');
    const vencida = await assinar(gov, 'vc+jwt', vc(didGov, didCarteira, 'IdentityCredential', { nome: 'Maria Teste' }, { iat: agora() - 3 * DIA, nbf: agora() - 3 * DIA, exp: agora() - DIA }));
    await recusa({ identidade: vencida }, /^A Identidade venceu em .*A pessoa precisa renovar na Governança\.$/);
  });

  test('pedido já atendido, vencido, de outro tipo ou para outro serviço é recusado', async () => {
    const pedido = await pedidoDeCracha(['Portaria']);
    await conferirPedido(pedido);
    await emitirCrachas();
    await conferirPedido(pedido);
    await expect(srv.locator('#cqH')).toContainText('Este pedido já foi atendido. Peça um novo à pessoa.');

    await conferirPedido(await pedidoDeCracha(['Portaria'], { wanted: 'IdentityCredential' }));
    await expect(srv.locator('#cqH')).toContainText('Este pedido não é de crachá.');

    await conferirPedido(await pedidoDeCracha(['Portaria'], { aud: didGov }));
    await expect(srv.locator('#cqH')).toHaveText('Este pedido foi feito para outro serviço.');

    await conferirPedido(await pedidoDeCracha(['Portaria'], { iat: agora() - 8 * DIA, exp: agora() - DIA }));
    await expect(srv.locator('#cqH')).toHaveText('Este pedido expirou. Peça um novo à pessoa.');
  });

  test('um crachá ativo por pessoa e app: o novo revoga o anterior', async () => {
    const portaria = await srv.evaluate(() => st.issued.filter(i => i.claims.app === 'Portaria').map(i => ({ jti: i.jti, revoked: i.revoked, reason: i.reason || '' })));
    expect(portaria.filter(i => !i.revoked)).toHaveLength(1);
    expect(portaria.find(i => i.jti === jtiPortaria)?.reason).toBe('Substituído por novo crachá');
  });

  test('a Governança não atende pedido de crachá', async () => {
    const pedido = await pedidoDeCracha(['Portaria'], { aud: didGov });
    await gov.evaluate(async t => { await enviarSolicitacao({ did: ses.did, x: ses.xMb }, t, b64u.enc(rnd(16))); await sincronizarGov(true); }, pedido);
    await expect(gov.locator('#iqRes')).toContainText('Este é um pedido de crachá. Ele vai para o serviço que dá o acesso, não para a Governança.');
  });
});

test.describe('portaria', () => {
  let jtiAtivo = '';

  test('crachá válido do app certo: acesso liberado; a mesma prova de novo é negada', async () => {
    await conferirPedido(await pedidoDeCracha(['Portaria']));
    const tok = await emitirCrachas();
    jtiAtivo = payloadDe(tok).jti;
    expect(await entregarNaCarteira(carteira, tok)).toBe('Credencial guardada');

    const desafio = await gerarDesafio('Portaria');
    expect(desafio).toMatch(/^SYSTEKNA:DESAFIO:/);
    expect(payloadDe(desafio).app).toBe('Portaria');
    const prova = await provaPelaCarteira(desafio, jtiAtivo);
    expect(prova).toMatch(/^SYSTEKNA:PROVA:/);
    const out = await conferirAcesso(prova);
    await expect(out).toContainText('Acesso liberado');
    await expect(out).toContainText('Maria Teste pode entrar em Portaria');
    await expect(out.locator('.chk.no')).toHaveCount(0);

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

// O botão Serviço › Governança › "Importar troca de chave" ficou sem ação desde a 0.22.0 (o handler saiu na
// reescrita do app). Este teste volta a valer quando o botão for religado.
test.fixme('a troca de chave da Governança é importada e as Identidades antigas continuam valendo', async () => {
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
