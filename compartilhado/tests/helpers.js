// @ts-check
// Passos comuns dos testes E2E da carteira e do emissor.
const { test, expect } = require('@playwright/test');

const PIN = '135790';
// Frases BIP39 de teste com checksum válido: as identidades ficam iguais a cada execução.
const WORDS = {
  carteira: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  emissor: 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong',
  outroEmissor: 'legal winner thank year wave sausage worth useful legal winner thank yellow',
  servico: 'letter advice cage absurd amount doctor acoustic avoid letter advice cage above',
};

/**
 * Espera a tela do PIN abrir. O título sozinho não basta: o elemento escondido guarda o texto
 * da última vez que a tela apareceu.
 */
async function telaDoPin(page, titulo) {
  await expect(page.locator('#sPin')).toBeVisible();
  await expect(page.locator('#pinTitle')).toHaveText(titulo);
}

/** @param {import('@playwright/test').Page} page */
async function digitarPin(page, pin = PIN) {
  await page.keyboard.type(pin);
}

/**
 * Filas (1.2): os testes não usam o Firestore de verdade. Um Firestore falso em memória responde à API REST
 * (criar, gravar, ler, apagar e consulta por campo), um por arquivo de teste: as páginas do mesmo arquivo
 * conversam entre si e os arquivos não se misturam.
 */
const FS = 'https://firestore.googleapis.com/v1/projects/systekna-identidade/databases/(default)/documents';
const bancos = new Map();
function bancoAtual() {
  let k = 'geral';
  try { k = test.info().file; } catch {}
  if (!bancos.has(k)) bancos.set(k, { docs: new Map(), criados: [] });
  return bancos.get(k);
}
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE', 'access-control-allow-headers': 'content-type', 'content-type': 'application/json' };
async function ligarFilas(page) {
  const banco = bancoAtual();
  const nome = (col, id) => `projects/systekna-identidade/databases/(default)/documents/${col}/${encodeURIComponent(id)}`;
  const responde = (route, status, corpo) => route.fulfill({ status, headers: CORS, body: corpo === undefined ? '' : JSON.stringify(corpo) });
  await page.route(u => u.href.startsWith('https://firestore.googleapis.com/'), async route => {
    const req = route.request(), url = new URL(req.url()), metodo = req.method();
    if (metodo === 'OPTIONS') return responde(route, 204);
    const resto = decodeURIComponent(url.href.slice(FS.length).split('?')[0]);
    const corpo = req.postData() ? JSON.parse(req.postData()) : null;
    if (resto === ':runQuery') {
      const q = corpo.structuredQuery, col = q.from[0].collectionId, f = q.where.fieldFilter;
      const l = [...banco.docs.entries()].filter(([k, d]) => k.startsWith(col + '/') && d.fields[f.field.fieldPath]?.stringValue === f.value.stringValue)
        .map(([k, d]) => ({ document: { name: nome(col, k.slice(col.length + 1)), fields: d.fields } }));
      return responde(route, 200, l.length ? l : [{ readTime: new Date().toISOString() }]);
    }
    const partes = resto.replace(/^\//, '').split('/'), col = partes[0], id = partes.slice(1).join('/') || url.searchParams.get('documentId');
    const chave = `${col}/${id}`;
    if (metodo === 'POST') {
      if (banco.docs.has(chave)) return responde(route, 409, { error: { code: 409, status: 'ALREADY_EXISTS' } });
      banco.docs.set(chave, { fields: corpo.fields });
      banco.criados.push({ col, id, fields: corpo.fields });
      return responde(route, 200, { name: nome(col, id), fields: corpo.fields });
    }
    if (metodo === 'PATCH') { banco.docs.set(chave, { fields: corpo.fields }); return responde(route, 200, { name: nome(col, id), fields: corpo.fields }); }
    if (metodo === 'DELETE') { banco.docs.delete(chave); return responde(route, 200, {}); }
    const d = banco.docs.get(chave);
    return d ? responde(route, 200, { name: nome(col, id), fields: d.fields }) : responde(route, 404, { error: { code: 404, status: 'NOT_FOUND' } });
  });
}
/** Itens que estão agora numa coleção do Firestore falso (ex.: para conferir que nada fica em claro). */
const naFila = col => [...bancoAtual().docs.entries()].filter(([k]) => k.startsWith(col + '/')).map(([k, d]) => ({ id: k.slice(col.length + 1), ...Object.fromEntries(Object.entries(d.fields).map(([c, v]) => [c, v.stringValue ?? +v.integerValue])) }));
/** O último pedido enviado a quem tem esta página (Governança ou serviço), aberto com a chave dela. */
async function ultimoPedidoPara(page) {
  const did = await page.evaluate(() => ses.did);
  const d = bancoAtual().criados.filter(x => x.col === 'fila-solicitacao' && x.fields.para.stringValue === did).at(-1);
  if (!d) throw new Error('Nenhum pedido na fila para ' + did);
  return page.evaluate(env => openMsg(env), d.fields.env.stringValue);
}
/**
 * Carteira ou Serviços: + › Buscar respostas (o mesmo que a busca automática a cada 30 s). Chama a função do
 * menu e espera ela terminar: pelo clique, a busca continuaria depois de a folha fechar.
 */
async function buscarRespostas(page) {
  await page.evaluate(() => buscarAgora());
}

/**
 * Carteira: busca as respostas na fila; se a credencial não veio por ela (token montado no teste), entrega direto
 * à mesma conferência que a fila usa. Devolve a mensagem da carteira ('Credencial guardada' ou o motivo).
 */
async function entregarNaCarteira(page, tok) {
  await buscarRespostas(page);
  const jti = payloadDe(tok.replace(/^SYSTEKNA:[A-Z-]*:/, '')).jti;
  if (jti && await page.evaluate(j => creds().some(c => c.data.jti === j), jti)) return 'Credencial guardada';
  return page.evaluate(async t => { try { return await receberResposta(t, null); } catch (e) { return e.message; } finally { renderCreds(); } }, tok);
}

/** Entra pelo caminho "Recuperar com 12 palavras" e cria o PIN. */
async function preparar(page, arquivo, palavras) {
  await ligarFilas(page);
  await page.goto(arquivo);
  await page.click('#goRecover');
  await page.fill('#recWords', palavras);
  await page.click('#recGo');
  await telaDoPin(page, 'Crie um PIN de 6 dígitos');
  await digitarPin(page);
  await telaDoPin(page, 'Repita o PIN');
  await digitarPin(page);
  await expect(page.locator('#sApp')).toBeVisible();
}

/** Bloqueia pelo botão do topo e desbloqueia com o PIN certo. */
async function bloquearEDesbloquear(page) {
  await page.click('#lockBtn');
  await telaDoPin(page, 'Digite seu PIN');
  await digitarPin(page);
  await expect(page.locator('#sApp')).toBeVisible();
}

const aba = (page, view) => page.click(`.dock [data-v="${view}"]`);
const toast = page => page.locator('#toast span');

async function fecharSheet(page) {
  // Toca no canto de cima, fora da folha, como o usuário faria.
  await page.click('#scrim', { position: { x: 10, y: 10 } });
  await expect(page.locator('#sheet')).not.toHaveClass(/open/);
}

/**
 * Guarda toda violação de CSP que o Chrome registrar no console desta página.
 * Os fluxos completos rodam com isso ligado: a política não pode bloquear nada legítimo.
 */
function vigiarCsp(page, violacoes = []) {
  page.on('console', m => { if (m.type() === 'error' && /Content Security Policy/i.test(m.text())) violacoes.push(m.text()); });
  return violacoes;
}

/** Lê o payload de um JWT sem conferir a assinatura. */
const payloadDe = tok => JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString('utf8'));


/**
 * Governança: garante que o pedido está na fila de quem atende (se ainda não está, põe, cifrado para a própria
 * Governança, como a carteira faria), busca os pedidos e abre o cartão dele.
 * Se o pedido foi recusado na conferência, o motivo fica em #iqH e nada é aberto (devolve false).
 */
async function receberPedido(page, tok) {
  await aba(page, 'vIssue');
  if (await page.locator('#iOut').isVisible()) await page.click('#iNew');
  if (await page.locator('#iForm').isVisible()) await page.click('#iBack');
  const nonce = payloadDe(tok.replace(/^SYSTEKNA:[A-Z-]*:/, '')).nonce;
  const naLista = () => page.evaluate(n => !!(st.fila || []).find(f => f.nonce === n && f.status === 'aguardando'), nonce);
  await page.evaluate(() => sincronizarGov(true));
  if (!nonce || !await naLista()) {
    await page.evaluate(async t => { try { await enviarSolicitacao({ did: ses.did, x: ses.xMb }, t, b64u.enc(rnd(16))); } catch {} }, tok);
    await page.evaluate(() => sincronizarGov(true));
  }
  if (!nonce || !await naLista()) return false;
  await page.click('#iSeg [data-f="aguardando"]');
  await page.locator(`#iFila [data-fila="${nonce}"]`).click();
  await expect(page.locator('#iForm')).toBeVisible();
  return true;
}
module.exports = { entregarNaCarteira, receberPedido, ligarFilas, naFila, ultimoPedidoPara, buscarRespostas, PIN, WORDS, telaDoPin, digitarPin, preparar, bloquearEDesbloquear, aba, toast, fecharSheet, payloadDe, vigiarCsp };
