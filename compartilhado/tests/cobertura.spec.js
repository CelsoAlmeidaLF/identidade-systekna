// @ts-check
// Cobertura do que já existia sem teste automatizado (critérios CA-P01 a CA-P12 de docs_v2/06)
// e das correções de 03/10/2026: pedido endereçado a um emissor e backup do emissor com livro conferido.
// Tokens fora do comum (vencidos, perto do vencimento) são assinados na página com signJWT.
const { test, expect } = require('@playwright/test');
const { receberPedido, WORDS, vigiarCsp, telaDoPin, digitarPin, preparar, aba, toast, fecharSheet, payloadDe } = require('./helpers');

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */ let carteira;
/** @type {import('@playwright/test').Page} */ let emissor;
/** @type {import('@playwright/test').Page} */ let outroEmissor;
/** Emissor com as mesmas 12 palavras da carteira: mesma identidade, outro serviço. */
/** @type {import('@playwright/test').Page} */ let emissorMesmaId;
/** Carteira criada pela tela, usada depois para o apagamento no 10º erro. */
/** @type {import('@playwright/test').Page} */ let nova;
let didCarteira = '';
let didEmissor = '';
let didOutro = '';
/** @type {string[]} */ const violacoesCsp = [];

const WEAK = 'Evite números repetidos e sequências. Escolha outro PIN.';
const agora = () => Math.floor(Date.now() / 1000);
const DIA = 86_400;

const assinar = (page, typ, payload) => page.evaluate(([t, p]) => signJWT(t, p), [typ, payload]);

function vcPayload(issuer, sub, extra = {}) {
  const iat = agora();
  return {
    iss: issuer, sub, iat, nbf: iat, jti: `urn:uuid:${crypto.randomUUID()}`,
    vc: {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential', 'IdentityCredential'],
      issuer: { id: issuer, name: 'Emissor de teste' },
      credentialSubject: { id: sub, nome: 'Maria Teste' },
    },
    ...extra,
  };
}

/** Abre um item dos ajustes comuns (na carteira, aba Ajustes; no emissor, aba Governança). */
async function ajuste(page, chave) {
  await aba(page, page === carteira || page === nova ? 'vSet' : 'vGov');
  await page.click(`#commonSet [data-cs="${chave}"]`);
}

async function copiarBackup(page) {
  await ajuste(page, 'export');
  const txt = await page.inputValue('#bkT');
  await fecharSheet(page);
  return txt;
}

async function restaurar(page, backup) {
  await ajuste(page, 'import');
  await page.fill('#riT', backup);
  await page.click('#riGo');
}

async function acaoCarteira(acao) {
  await carteira.click('#dockAdd');
  await carteira.click(`#sheetBody [data-act="${acao}"]`);
}

async function receberNaCarteira(token) {
  await acaoCarteira('get');
  await carteira.fill('#rcT', token);
  await carteira.click('#rcGo');
}

/** Pede pela tela da carteira; devolve o pedido assinado. */
async function pedirPelaTela(didDoEmissor = '') {
  await acaoCarteira('ask');
  await carteira.fill('#aqN', 'Maria Teste');
  if (didDoEmissor) await carteira.fill('#aqE', didDoEmissor);
  await carteira.click('#aqGo');
  await expect(carteira.locator('#aqOut')).toBeVisible();
  const pedido = await carteira.inputValue('#aqJ');
  await fecharSheet(carteira);
  return pedido;
}

async function conferirPedido(page, pedido) {
  await receberPedido(page, pedido);
}

async function gerarDesafio() {
  await aba(emissor, 'vVerify');
  await emissor.selectOption('#vType', 'any');
  await emissor.click('#vGen');
  await expect(emissor.locator('#vChal')).toBeVisible();
  return payloadDe(await emissor.inputValue('#vChalT')).nonce;
}

/** A carteira assina uma apresentação que embute o token dado, respondendo ao nonce dado. */
async function apresentacaoCom(tokenEmbutido, nonce) {
  const iat = agora();
  return assinar(carteira, 'vp+jwt', {
    iss: didCarteira, sub: didCarteira, aud: didEmissor, nonce, iat, exp: iat + 300,
    vp: { '@context': ['https://www.w3.org/2018/credentials/v1'], type: ['VerifiablePresentation'], holder: didCarteira, verifiableCredential: [tokenEmbutido] },
  });
}

async function conferirApresentacao(token) {
  await aba(emissor, 'vVerify');
  await emissor.fill('#vpT', token);
  await emissor.click('#vpGo');
  return emissor.locator('#vpOut');
}

const ponto = (out, estado, texto) => out.locator(`.chk.${estado}`).filter({ hasText: texto });

test.beforeAll(async ({ browser }) => {
  [carteira, emissor, outroEmissor, emissorMesmaId, nova] = await Promise.all([1, 2, 3, 4, 5].map(async () => (await browser.newContext()).newPage()));
  for (const p of [carteira, emissor, outroEmissor, emissorMesmaId, nova]) vigiarCsp(p, violacoesCsp);
  await preparar(emissor, 'governanca-systekna.html', WORDS.emissor);
  await preparar(outroEmissor, 'governanca-systekna.html', WORDS.outroEmissor);
  await preparar(emissorMesmaId, 'governanca-systekna.html', WORDS.carteira);
  await preparar(carteira, 'carteira-systekna.html', WORDS.carteira);
  didCarteira = await carteira.evaluate(() => ses.did);
  didEmissor = await emissor.evaluate(() => ses.did);
  didOutro = await outroEmissor.evaluate(() => ses.did);
});

test.afterAll(async () => {
  for (const p of [carteira, emissor, outroEmissor, emissorMesmaId, nova]) await p?.context().close();
});

test('P10 · criar pela tela: palavras veladas, confirmação recusa palavra errada e PIN fraco é recusado', async () => {
  await nova.goto('carteira-systekna.html');
  await nova.click('#goCreate');
  await expect(nova.locator('#wordGrid')).toHaveClass(/veil/);
  await nova.click('#toggleVeil');
  await expect(nova.locator('#wordGrid')).not.toHaveClass(/veil/);
  const palavras = await nova.evaluate(() => draft.words);
  expect(palavras).toHaveLength(12);

  await nova.click('#wordsDone');
  const posicoes = await nova.evaluate(() => draft.check);
  for (const p of posicoes) await nova.fill(`#confirmFields .f[data-p="${p}"] input`, 'zzz');
  await nova.click('#confirmGo');
  await expect(nova.locator('#confirmHint')).toHaveText('Alguma palavra não confere. Volte e confira a anotação.');
  await expect(nova.locator('#sConfirm')).toBeVisible();

  for (const p of posicoes) await nova.fill(`#confirmFields .f[data-p="${p}"] input`, palavras[p - 1].toUpperCase());
  await nova.click('#confirmGo');
  await telaDoPin(nova, 'Crie um PIN de 6 dígitos');
  for (const fraco of ['123456', '111111']) {
    await digitarPin(nova, fraco);
    await expect(nova.locator('#pinPad .pmsg')).toHaveText(WEAK);
    await expect(nova.locator('#pinPad')).not.toHaveClass(/busy/);
    await expect(nova.locator('#pinTitle')).toHaveText('Crie um PIN de 6 dígitos');
  }
  await digitarPin(nova);
  await telaDoPin(nova, 'Repita o PIN');
  await digitarPin(nova);
  await expect(nova.locator('#sApp')).toBeVisible();
  await expect(toast(nova)).toHaveText('Carteira criada');
});

test('P01 · PIN fraco é recusado na troca de PIN', async () => {
  await ajuste(carteira, 'pin');
  await digitarPin(carteira);
  await expect(carteira.locator('#cpT')).toHaveText('Novo PIN');
  for (const fraco of ['121212', '123123', '987654', '789012', '000000']) {
    await digitarPin(carteira, fraco);
    await expect(carteira.locator('#cpPad .pmsg')).toHaveText(WEAK);
    await expect(carteira.locator('#cpPad')).not.toHaveClass(/busy/);
    await expect(carteira.locator('#cpT')).toHaveText('Novo PIN');
  }
  await fecharSheet(carteira);
});

test('P02 · espera a partir do 5º erro e apagamento no 10º', async () => {
  await nova.click('#lockBtn');
  await telaDoPin(nova, 'Digite seu PIN');

  // 4 erros já contados: o 5º impõe 30 s de espera e avisa quantos erros faltam.
  await nova.evaluate(() => DB.set('guard', { fails: 4, until: 0 }));
  await digitarPin(nova, '246802');
  await expect(nova.locator('#pinPad .pmsg')).toHaveText('PIN incorreto. Espere 30 s. Mais 5 erros apagam tudo.');
  await expect(nova.locator('#pinPad')).not.toHaveClass(/busy/);
  await digitarPin(nova, '246802');
  await expect(nova.locator('#pinPad .pmsg')).toContainText('Aguarde');
  await expect(nova.locator('#pinPad')).not.toHaveClass(/busy/);

  // 9 erros já contados: o 10º apaga tudo e volta às boas-vindas.
  await nova.evaluate(() => DB.set('guard', { fails: 9, until: 0 }));
  await digitarPin(nova, '246802');
  await expect(nova.locator('#sWelcome')).toBeVisible();
  await expect(toast(nova)).toHaveText('Dados apagados após 10 tentativas erradas');
  expect(await nova.evaluate(async () => [await DB.get('meta'), await DB.get('lock'), await DB.get('items')])).toEqual([undefined, undefined, undefined]);
});

test('P03 · backup é recusado em outra identidade e no outro app', async () => {
  const backup = await copiarBackup(carteira);

  await restaurar(outroEmissor, backup);
  await expect(outroEmissor.locator('#riH')).toHaveText('Este backup pertence a outra identidade ou foi alterado.');
  await fecharSheet(outroEmissor);

  // Mesmas 12 palavras em outro app: com a separação de domínio, já é outra identidade.
  await restaurar(emissorMesmaId, backup);
  await expect(emissorMesmaId.locator('#riH')).toHaveText('Este backup pertence a outra identidade ou foi alterado.');
  await fecharSheet(emissorMesmaId);
});

test('P04 · restaurar o emissor substitui o estado; backup sem livro ou com livro adulterado é recusado', async () => {
  const atos = await emissor.evaluate(() => st.book.length);
  const backup = await copiarBackup(emissor);

  await aba(emissor, 'vGov');
  await emissor.fill('#gName', 'Emissor renomeado');
  await emissor.click('#gNameS');
  await expect(toast(emissor)).toHaveText('Nome salvo');
  expect(await emissor.evaluate(() => st.book.length)).toBe(atos + 1);

  await restaurar(emissor, backup);
  await expect(toast(emissor)).toHaveText(`Governança restaurada com ${atos} atos`);
  expect(await emissor.evaluate(() => [st.book.length, st.name])).toEqual([atos, 'Governança Systekna']);
  await aba(emissor, 'vPanel');
  await expect(emissor.locator('#pBook')).toContainText('Livro íntegro');

  const montar = data => emissor.evaluate(async d => {
    const b = await seal(ses.vaultKey, { v: 1, app: APP.db, did: ses.did, at: Date.now(), data: d }, 'backup');
    return ['scb1', b.iv, b.ct].join('.');
  }, data);

  await restaurar(emissor, await montar({ name: 'Sem livro', issued: [] }));
  await expect(toast(emissor)).toHaveText('Backup sem livro de registros');

  // Livro com o texto de um ato trocado: o backup inteiro é recusado e nada muda aqui.
  const adulterado = await emissor.evaluate(() => {
    const d = JSON.parse(JSON.stringify(st));
    d.book[0].text = 'Ato reescrito';
    d.name = 'Emissor adulterado';
    return d;
  });
  await restaurar(emissor, await montar(adulterado));
  await expect(toast(emissor)).toHaveText('Backup recusado: o livro se rompe no ato nº 1. Nada foi alterado.');
  expect(await emissor.evaluate(() => [st.book.length, st.name])).toEqual([atos, 'Governança Systekna']);
});

test('P05 · mensagem cifrada: abre para a própria chave e falha adulterada ou para outra chave', async () => {
  const cifrar = async (chave, texto) => {
    await aba(carteira, 'vId');
    await carteira.locator('#mSeg button').nth(0).click();
    if (chave) await carteira.fill('#mTo', chave); else await carteira.click('#mMe');
    await carteira.fill('#mText', texto);
    const anterior = await carteira.inputValue('#mSealed');
    await carteira.click('#mSeal');
    await expect(carteira.locator('#mSealOut')).toBeVisible();
    await expect(carteira.locator('#mSealed')).not.toHaveValue(anterior);
    await expect(carteira.locator('#mText')).toHaveValue(''); // o texto original sai da caixa ao cifrar
    return carteira.inputValue('#mSealed');
  };
  const abrir = async pacote => {
    await carteira.locator('#mSeg button').nth(1).click();
    await carteira.fill('#mIn', pacote);
    await carteira.click('#mOpen');
    return carteira.locator('#mOpenOut');
  };

  const minha = await cifrar('', 'senha do wi-fi');
  expect(minha).toMatch(/^smsg1\./);
  await expect(await abrir(minha)).toContainText('senha do wi-fi');

  const adulterada = minha.slice(0, -2) + (minha.endsWith('AA') ? 'BB' : 'AA');
  await expect(await abrir(adulterada)).toContainText('Esta mensagem não foi cifrada para a sua chave, ou foi alterada.');

  const chaveDoEmissor = await emissor.evaluate(() => ses.xMb);
  const paraOutro = await cifrar(chaveDoEmissor, 'só para o emissor');
  await expect(await abrir(paraOutro)).toContainText('Não foi possível decifrar');
  expect(await emissor.evaluate(t => openMsg(t), paraOutro)).toBe('só para o emissor');
});

test('P06 · bloqueio automático depois do tempo sem uso', async () => {
  await carteira.evaluate(() => { lastAct = Date.now() - 31 * 60_000; });
  await telaDoPin(carteira, 'Digite seu PIN');
  await expect(carteira.locator('#pinPad .pmsg')).toHaveText('Bloqueado por inatividade.');
  expect(await carteira.evaluate(() => ses)).toBeNull();
  await digitarPin(carteira);
  await expect(carteira.locator('#sApp')).toBeVisible();
});

test('P07 · emissor confiável: adicionar faz passar e remover faz falhar', async () => {
  const vc = await assinar(outroEmissor, 'vc+jwt', vcPayload(didOutro, didCarteira));
  // Com a política "aceitar", só o ponto "Emissor confiável" decide.
  await aba(emissor, 'vGov');
  await emissor.click('#gPol');
  await emissor.click('#cfOk');
  await expect(emissor.locator('#gPolV')).toHaveText('Aceitar');

  let out = await conferirApresentacao(await apresentacaoCom(vc, await gerarDesafio()));
  await expect(ponto(out, 'no', 'Emissor confiável')).toHaveCount(1);

  await aba(emissor, 'vGov');
  await emissor.click('#gTrustAdd');
  await emissor.fill('#tn', 'Outro emissor');
  await emissor.fill('#td', didOutro);
  await emissor.click('#tGo');
  await expect(toast(emissor)).toHaveText('Emissor adicionado');
  out = await conferirApresentacao(await apresentacaoCom(vc, await gerarDesafio()));
  await expect(ponto(out, 'ok', 'Emissor confiável')).toHaveCount(1);
  await expect(out).toContainText('Apresentação aprovada');

  await aba(emissor, 'vGov');
  await emissor.click('#gTrust [data-untrust="0"]');
  await emissor.click('#cfOk');
  await expect(toast(emissor)).toHaveText('Emissor removido');
  out = await conferirApresentacao(await apresentacaoCom(vc, await gerarDesafio()));
  await expect(ponto(out, 'no', 'Emissor confiável')).toHaveCount(1);

  // Volta a política ao padrão para os testes seguintes.
  await aba(emissor, 'vGov');
  await emissor.click('#gPol');
  await expect(emissor.locator('#gPolV')).toHaveText('Recusar');
});

test('P08 · pedido vencido é recusado pelo emissor', async () => {
  const antes = agora() - 8 * DIA;
  const pedido = await assinar(carteira, 'pedido+jwt', {
    iss: didCarteira, sub: didCarteira, aud: 'emissor', name: 'Maria Teste', wanted: 'IdentityCredential',
    note: '', nonce: 'pedido-vencido', iat: antes, exp: antes + 7 * DIA,
  });
  await conferirPedido(emissor, pedido);
  await expect(emissor.locator('#iqH')).toHaveText('Este pedido expirou. Peça um novo ao titular.');
  await expect(emissor.locator('#iForm')).toBeHidden();
});

test('P09 · desafio vencido é recusado pela carteira e pelo emissor', async () => {
  const antes = agora() - 3600;
  const desafio = await assinar(emissor, 'desafio+jwt', { iss: didEmissor, name: 'Emissor', nonce: 'velho', purpose: 'Teste', accept: 'any', iat: antes, exp: antes + 600 });
  await acaoCarteira('show');
  await carteira.fill('#apT', desafio);
  await carteira.click('#apGo');
  await expect(carteira.locator('#apH')).toHaveText('Este desafio expirou. Peça um novo.');
  await fecharSheet(carteira);

  // O emissor guarda o desafio vencido; uma apresentação recente para ele é recusada no prazo.
  await emissor.evaluate(t => { st.challenges.push({ nonce: 'velho', type: 'any', purpose: 'Teste', iat: t, exp: t + 600, used: false }); }, antes);
  const vc = await assinar(emissor, 'vc+jwt', vcPayload(didEmissor, didCarteira));
  const out = await conferirApresentacao(await apresentacaoCom(vc, 'velho'));
  await expect(out).toContainText('Apresentação recusada');
  await expect(ponto(out, 'no', 'O desafio expirou.')).toHaveCount(1);
});

test('P11 · a mesma credencial não entra duas vezes', async () => {
  await conferirPedido(emissor, await pedirPelaTela());
  await expect(emissor.locator('#iWho')).toContainText('Pedido conferido');
  await emissor.click('#iGo');
  await expect(emissor.locator('#iOk')).toContainText('Credencial emitida');
  const credencial = await emissor.inputValue('#iJwt');

  await receberNaCarteira(credencial);
  await expect(toast(carteira)).toHaveText('Credencial guardada');
  await receberNaCarteira(credencial);
  await expect(carteira.locator('#rcH')).toHaveText('Esta credencial já está na carteira.');
  await fecharSheet(carteira);
});

test('P12 · credencial perto do vencimento aparece como "Vence em N dias"', async () => {
  const iat = agora() - 360 * DIA;
  await receberNaCarteira(await assinar(emissor, 'vc+jwt', vcPayload(didEmissor, didCarteira, { iat, nbf: iat, exp: agora() + 5 * DIA })));
  await expect(toast(carteira)).toHaveText('Credencial guardada');
  await expect(carteira.locator('#cList')).toContainText('Vence em 5 dias');
});

test.describe('pedido endereçado a um emissor', () => {
  test('a carteira recusa um DID de emissor inválido', async () => {
    await acaoCarteira('ask');
    await carteira.fill('#aqN', 'Maria Teste');
    await carteira.fill('#aqE', 'did:web:exemplo.com');
    await carteira.click('#aqGo');
    await expect(carteira.locator('#aqEH')).toContainText('não usa did:key');
    await expect(carteira.locator('#aqOut')).toBeHidden();
    await fecharSheet(carteira);
  });

  test('só o emissor do DID informado atende o pedido', async () => {
    const pedido = await pedirPelaTela(didEmissor);
    expect(payloadDe(pedido).aud).toBe(didEmissor);

    await conferirPedido(outroEmissor, pedido);
    await expect(outroEmissor.locator('#iqH')).toHaveText('Este pedido foi feito para outro emissor. Peça ao titular um pedido para este emissor.');
    await expect(outroEmissor.locator('#iForm')).toBeHidden();

    await conferirPedido(emissor, pedido);
    await expect(emissor.locator('#iWho')).toContainText('Pedido conferido');
  });

  test('pedido sem DID continua valendo para qualquer emissor', async () => {
    const pedido = await pedirPelaTela();
    expect(payloadDe(pedido).aud).toBe('emissor');
    await conferirPedido(outroEmissor, pedido);
    await expect(outroEmissor.locator('#iWho')).toContainText('Pedido conferido');
  });
});

test('nenhuma violação de CSP em todo o fluxo acima', () => {
  expect(violacoesCsp).toEqual([]);
});
