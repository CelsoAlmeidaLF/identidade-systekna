// @ts-check
// Passos comuns dos testes E2E da carteira e do emissor.
const { expect } = require('@playwright/test');

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

/** Entra pelo caminho "Recuperar com 12 palavras" e cria o PIN. */
async function preparar(page, arquivo, palavras) {
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
 * Governança (1.1): cola o pedido em Fila › Receber pedidos e, se ele entrou na fila, abre o cartão dele.
 * Se o pedido foi recusado na conferência, o motivo fica em #iqH e nada é aberto.
 */
async function receberPedido(page, tok) {
  await aba(page, 'vIssue');
  if (await page.locator('#iOut').isVisible()) await page.click('#iNew');
  if (await page.locator('#iForm').isVisible()) await page.click('#iBack');
  await page.fill('#iqT', tok);
  await page.click('#iqGo');
  const h = page.locator('#iqH');
  await expect(h).not.toHaveText('');
  if ((await h.getAttribute('class') || '').includes('bad')) return false;
  await page.locator('#iFila [data-fila]').first().click();
  await expect(page.locator('#iForm')).toBeVisible();
  return true;
}
module.exports = { receberPedido, PIN, WORDS, telaDoPin, digitarPin, preparar, bloquearEDesbloquear, aba, toast, fecharSheet, payloadDe, vigiarCsp };
