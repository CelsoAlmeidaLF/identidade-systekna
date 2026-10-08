// @ts-check
// Exportar o livro (0.25.0), na Governança e no Serviços: PDF de várias páginas com a conferência de integridade, ou
// Excel (.xlsx) com as planilhas Livro e Resumo, por período. O .xlsx é conferido por um leitor de ZIP independente
// (zipfile do Python) e cada XML pelo DOMParser do navegador.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { WORDS, preparar, aba, digitarPin, toast, fecharSheet } = require('./helpers');

const APPS = [
  { arquivo: 'governanca-systekna.html', palavras: WORDS.emissor, ajustes: 'vGov', nome: 'Governança' },
  { arquivo: 'servicos-systekna.html', palavras: WORDS.servico, ajustes: 'vSrv', nome: 'Serviços' },
];

/** Lê as entradas de um ZIP sem compressão (cabeçalhos locais). */
function unzip(buf) {
  const out = {};
  for (let p = 0; buf.readUInt32LE(p) === 0x04034b50;) {
    const n = buf.readUInt32LE(p + 18), ln = buf.readUInt16LE(p + 26), ex = buf.readUInt16LE(p + 28);
    out[buf.subarray(p + 30, p + 30 + ln).toString()] = buf.subarray(p + 30 + ln + ex, p + 30 + ln + ex + n).toString('utf8');
    p += 30 + ln + ex + n;
  }
  return out;
}

/** Abre Ajustes › Exportar livro, confirma o PIN, escolhe formato e período e baixa. */
async function exportar(page, app, { formato = 'pdf', periodo = 'tudo' } = {}) {
  await aba(page, app.ajustes);
  await page.click('[data-cs="livro"]');
  await digitarPin(page);
  await expect(page.locator('#exGo')).toBeVisible();
  await page.click(`#exF [data-f="${formato}"]`);
  await page.selectOption('#exP', periodo);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#exGo')]);
  return { nome: dl.suggestedFilename(), caminho: /** @type {string} */ (await dl.path()) };
}

for (const app of APPS) {
  test(`${app.nome}: exporta o livro em PDF e em Excel, por período, com a conferência de integridade`, async ({ page }) => {
    await preparar(page, app.arquivo, app.palavras);
    const total = await page.evaluate(async () => {
      const real = Date.now;
      Date.now = () => real() - 40 * 864e5;
      await ato('nome', 'Ato antigo de teste', null);
      Date.now = real;
      for (let i = 0; i < 140; i++) await ato('verificacao', `Acesso liberado a App ${i} para Pessoa — teste ${i}`, null);
      await save();
      return st.book.length;
    });

    // PDF, todo o livro: várias páginas, capa com a integridade e todos os atos.
    const pdf = await exportar(page, app);
    expect(pdf.nome).toMatch(/^livro-.+-\d{4}-\d{2}-\d{2}\.pdf$/);
    await expect(toast(page)).toHaveText(`Livro exportado: ${total} atos`);
    const txt = fs.readFileSync(pdf.caminho).toString('latin1');
    const paginas = +(/** @type {RegExpMatchArray} */ (txt.match(/\/Count (\d+)/)))[1];
    expect(paginas).toBeGreaterThanOrEqual(3);
    expect(txt).toContain(`página 1 de ${paginas}`);
    expect(txt).toContain(`página ${paginas} de ${paginas}`);
    expect(txt).toContain(`Livro íntegro: os ${total} atos conferem do primeiro ao último.`);
    expect(txt).toContain(`Atos exportados: ${total} de ${total}`);
    expect(txt).toContain('Ato antigo de teste');
    // O travessão vira hífen (Latin-1) e o texto longo quebra em 46 caracteres, continuando alinhado na coluna Texto.
    expect(txt).toContain('Acesso liberado a App 139 para Pessoa - teste) Tj');
    expect(txt).toContain(`(${' '.repeat(54)}139) Tj`);

    // Excel, últimos 30 dias: o ato de 40 dias atrás fica de fora.
    const xl = await exportar(page, app, { formato: 'xlsx', periodo: 'd30' });
    expect(xl.nome).toMatch(/\.xlsx$/);
    expect(execFileSync('python3', ['-I', '-c', 'import zipfile,sys;print(zipfile.ZipFile(sys.argv[1]).testzip())', xl.caminho]).toString().trim()).toBe('None');
    const z = unzip(fs.readFileSync(xl.caminho));
    expect(Object.keys(z).sort()).toEqual(['[Content_Types].xml', '_rels/.rels', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml']);
    const malformados = await page.evaluate(xmls => Object.entries(xmls).filter(([, x]) => new DOMParser().parseFromString(x, 'application/xml').querySelector('parsererror')).map(([k]) => k), z);
    expect(malformados).toEqual([]);
    const folha = z['xl/worksheets/sheet1.xml'];
    expect(folha.match(/<row /g)?.length).toBe(total - 1 + 1); // cabeçalho + atos do período
    expect(folha).not.toContain('Ato antigo de teste');
    expect(folha).toContain('Acesso liberado a App 139 para Pessoa — teste 139'); // no Excel o texto vai inteiro (UTF-8)
    expect(z['xl/worksheets/sheet2.xml']).toContain(`Livro íntegro: os ${total} atos conferem do primeiro ao último.`);

    // Intervalo sem datas é recusado.
    await aba(page, app.ajustes);
    await page.click('[data-cs="livro"]');
    await digitarPin(page);
    await page.selectOption('#exP', 'int');
    await page.click('#exGo');
    await expect(page.locator('#exH')).toHaveText('Escolha as duas datas.');
    await fecharSheet(page);

    // Livro adulterado: o PDF diz onde a corrente se rompe.
    await page.evaluate(() => { st.book[2].text = 'alterado'; });
    const ruim = fs.readFileSync((await exportar(page, app)).caminho).toString('latin1');
    expect(ruim).toContain('Livro NÃO CONFERE: a corrente se rompe no ato nº 3.');
  });
}

test('a Carteira não tem livro para exportar', async ({ page }) => {
  await preparar(page, 'carteira-systekna.html', WORDS.carteira);
  await aba(page, 'vSet');
  await expect(page.locator('[data-cs="pdf"]')).toBeVisible();
  await expect(page.locator('[data-cs="livro"]')).toHaveCount(0);
});
