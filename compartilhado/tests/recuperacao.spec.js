// @ts-check
// Recuperação pelo código (STK1-…) ou pelas 12 palavras, e o PDF com o QR code, o código e as palavras.
// O QR é conferido lendo de volta com um leitor independente (jsQR), tanto o da página quanto o desenhado no PDF.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const jsQR = require('jsqr');
const { WORDS, PIN, preparar, aba, toast, telaDoPin, digitarPin } = require('./helpers');

const APPS = [
  { arquivo: 'carteira-systekna.html', palavras: WORDS.carteira, ajustes: 'vSet', nome: 'Carteira' },
  { arquivo: 'governanca-systekna.html', palavras: WORDS.emissor, ajustes: 'vGov', nome: 'Governança' },
  { arquivo: 'servicos-systekna.html', palavras: WORDS.servico, ajustes: 'vSrv', nome: 'Serviços' },
];

/** Lê a matriz de módulos (true = escuro) com o jsQR, desenhando com margem de 4 módulos. */
function lerQr(matriz) {
  const n = matriz.length, esc = 6, lado = (n + 8) * esc;
  const px = new Uint8ClampedArray(lado * lado * 4).fill(255);
  matriz.forEach((linha, y) => linha.forEach((on, x) => {
    if (!on) return;
    for (let dy = 0; dy < esc; dy++) for (let dx = 0; dx < esc; dx++) {
      const i = (((y + 4) * esc + dy) * lado + (x + 4) * esc + dx) * 4;
      px[i] = px[i + 1] = px[i + 2] = 0;
    }
  }));
  const r = jsQR(px, lado, lado);
  return r && r.data;
}

/** Remonta a matriz do QR a partir dos retângulos do PDF ("x y w h re f"). */
function qrDoPdf(texto) {
  const q = [...texto.matchAll(/^([\d.]+) ([\d.]+) ([\d.]+) [\d.]+ re f$/gm)].map(m => [+m[1], +m[2], +m[3]]);
  const mod = q[0][2], x0 = Math.min(...q.map(r => r[0])), yMax = Math.max(...q.map(r => r[1]));
  const cel = q.map(([x, y]) => [Math.round((x - x0) / mod), Math.round((yMax - y) / mod)]);
  const n = Math.max(...cel.map(c => Math.max(c[0], c[1]))) + 1;
  const m = [...Array(n)].map(() => new Array(n).fill(false));
  cel.forEach(([x, y]) => { m[y][x] = true; });
  return m;
}

test.describe('código e QR (núcleo)', () => {
  test.beforeEach(async ({ page }) => { await page.goto('carteira-systekna.html'); });

  test('código ↔ entropia nos dois idiomas, com o idioma guardado no código', async ({ page }) => {
    const r = await page.evaluate(async () => {
      const out = [];
      for (const lang of ['pt', 'en']) for (let k = 0; k < 20; k++) {
        const ent = rnd(16), code = await entropyToCode(ent, lang), volta = await codeToEntropy(code);
        out.push({ code, ok: hex(volta.ent) === hex(ent) && volta.lang === lang });
      }
      return out;
    });
    for (const { code, ok } of r) {
      expect(code).toMatch(/^STK1(-[2-9A-HJ-NP-Z]{4}){8}$/);
      expect(ok, code).toBe(true);
    }
  });

  test('o código aceita minúsculas, espaços e sem o STK1; recusa erro de digitação', async ({ page }) => {
    const r = await page.evaluate(async () => {
      const ent = rnd(16), code = await entropyToCode(ent, 'pt'), corpo = code.slice(5).replaceAll('-', '');
      const erro = async t => { try { await codeToEntropy(t); return 'aceitou'; } catch (e) { return e.code; } };
      const troca = corpo[7] === 'A' ? 'B' : 'A';
      return {
        min: hex((await codeToEntropy(code.toLowerCase().replaceAll('-', ' '))).ent) === hex(ent),
        sem: hex((await codeToEntropy(corpo)).ent) === hex(ent),
        ehCodigo: [isRecCode(code), isRecCode(corpo), isRecCode('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about')],
        digitacao: await erro('STK1' + corpo.slice(0, 7) + troca + corpo.slice(8)),
        curto: await erro(code.slice(0, -1)),
        letra: await erro('STK1' + corpo.slice(0, 31) + 'O'),
      };
    });
    expect(r.min).toBe(true);
    expect(r.sem).toBe(true);
    expect(r.ehCodigo).toEqual([true, true, false]);
    expect(r.digitacao).toBe('codeSum');
    expect(r.curto).toBe('codeLen');
    expect(r.letra).toBe('codeChar');
  });

  test('o QR code é lido de volta por um leitor independente (versões 1 a 9)', async ({ page }) => {
    const textos = ['STK1-ABCD-EFGH-JKLM-NPQR-STUV-WXYZ-2345-6789', 'a', 'Systekna · Governança', 'x'.repeat(60), 'y'.repeat(110), 'z'.repeat(150)];
    for (const t of textos) {
      const m = await page.evaluate(t => qrMatrix(t), t);
      expect(lerQr(m), `tamanho ${t.length}`).toBe(t);
    }
  });
});

for (const app of APPS) {
  test.describe(app.nome, () => {
    test('PDF dos Ajustes: QR, código e as 12 palavras; o código recupera a mesma conta', async ({ page, browser }) => {
      await preparar(page, app.arquivo, app.palavras);
      const did = await page.evaluate(() => ses.did);
      await aba(page, app.ajustes);
      await page.click('[data-cs="pdf"]');
      await digitarPin(page);
      await expect(page.locator('#pdfGo')).toBeVisible();
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#pdfGo')]);
      expect(dl.suggestedFilename()).toMatch(/^recuperacao-.+-\d{4}-\d{2}-\d{2}\.pdf$/);
      await expect(toast(page)).toHaveText('PDF de recuperação salvo');

      const pdf = fs.readFileSync(/** @type {string} */ (await dl.path())).toString('latin1');
      expect(pdf.startsWith('%PDF-1.4')).toBe(true);
      expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
      const codigo = /** @type {RegExpMatchArray} */ (pdf.match(/\((STK1(?:-[2-9A-HJ-NP-Z]{4}){8})\)/))[1];
      app.palavras.split(' ').forEach((w, i) => expect(pdf).toContain(`${String(i + 1).padStart(2, ' ')}. ${w})`));
      expect(pdf).toContain(`(${did})`);
      expect(pdf).toContain(`(Recuperação · ${app.nome})`.replace(/[^\x00-\xff]/g, ''));
      expect(lerQr(qrDoPdf(pdf))).toBe(codigo);

      // Outro aparelho: recupera só com o código.
      const outro = await browser.newPage();
      await outro.goto(app.arquivo);
      await outro.click('#goRecover');
      await outro.fill('#recWords', codigo.toLowerCase());
      await expect(outro.locator('#recHint')).toHaveText('Código de recuperação');
      await outro.click('#recGo');
      await telaDoPin(outro, 'Crie um PIN de 6 dígitos');
      await digitarPin(outro, PIN);
      await telaDoPin(outro, 'Repita o PIN');
      await digitarPin(outro, PIN);
      await expect(outro.locator('#sApp')).toBeVisible();
      expect(await outro.evaluate(() => ses.did)).toBe(did);
      expect(await outro.evaluate(async () => (await entropyToWords(ses.ent, ses.lang)).join(' '))).toBe(app.palavras);
      await outro.close();
    });
  });
}

test('na criação, o PDF sai com as palavras da tela e o DID que a conta vai ter', async ({ page }) => {
  await page.goto('servicos-systekna.html');
  await page.click('#goCreate');
  const palavras = await page.locator('#wordGrid li').allTextContents();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#wordsPdf')]);
  const pdf = fs.readFileSync(/** @type {string} */ (await dl.path())).toString('latin1');
  palavras.forEach((w, i) => expect(pdf).toContain(`${String(i + 1).padStart(2, ' ')}. ${w})`));
  const did = /** @type {RegExpMatchArray} */ (pdf.match(/\((did:key:z\w+)\)/))[1];

  await page.click('#wordsDone');
  for (const f of await page.locator('#confirmFields .f').all()) {
    const n = +(/** @type {string} */ (await f.getAttribute('data-p')));
    await f.locator('input').fill(palavras[n - 1]);
  }
  await page.click('#confirmGo');
  await telaDoPin(page, 'Crie um PIN de 6 dígitos');
  await digitarPin(page);
  await telaDoPin(page, 'Repita o PIN');
  await digitarPin(page);
  await expect(page.locator('#sApp')).toBeVisible();
  expect(await page.evaluate(() => ses.did)).toBe(did);
});

test('código errado na tela de recuperação mostra o motivo', async ({ page }) => {
  await page.goto('governanca-systekna.html');
  await page.click('#goRecover');
  await expect(page.locator('#recScan')).toBeHidden(); // este Chrome não lê QR (sem BarcodeDetector)
  await page.fill('#recWords', 'STK1-ABCD-EFGH-JKLM-NPQR-STUV-WXYZ-2345-6789');
  await page.click('#recGo');
  await expect(page.locator('#recHint')).toHaveText('O código não confere. Confira letra por letra.');
  await page.fill('#recWords', 'STK1-ABCD-EFGH');
  await page.click('#recGo');
  await expect(page.locator('#recHint')).toHaveText('O código tem 32 letras e números depois de STK1. Você digitou 8.');
});

test('com leitor de QR no navegador, o botão Ler QR code lê e recupera', async ({ page }) => {
  // Simula o Chrome do Android: câmera e BarcodeDetector que "vê" o código.
  const codigo = await (async () => {
    await page.goto('carteira-systekna.html');
    return page.evaluate(async () => entropyToCode(new Uint8Array(16), 'en'));
  })();
  await page.addInitScript(c => {
    // @ts-ignore
    window.BarcodeDetector = class { async detect() { return [{ rawValue: c }]; } };
    // @ts-ignore
    navigator.mediaDevices.getUserMedia = async () => new MediaStream();
  }, codigo);
  await page.goto('carteira-systekna.html');
  await page.click('#goRecover');
  await page.click('#recScan');
  await telaDoPin(page, 'Crie um PIN de 6 dígitos');
  await expect(page.locator('#recWords')).toHaveValue(codigo);
  await digitarPin(page);
  await telaDoPin(page, 'Repita o PIN');
  await digitarPin(page);
  await expect(page.locator('#sApp')).toBeVisible();
  expect(await page.evaluate(() => ses.did)).toBe('did:key:z6MkuKwMejuU5tavPVP5ZVWg9W1z28SY62DNXp3aBzyMsLXr');
});
