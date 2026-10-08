// @ts-check
// Relatório de uso no Painel do Serviços (0.24.0): acessos da Portaria por dia, por app, por funcionalidade e os
// motivos de negação, mais a gestão do período (emissões, recusas, revogações). Conferências de antes da 0.24 são
// lidas do texto do livro. O fluxo real da Portaria é conferido em emissao.spec.js.
const { test, expect } = require('@playwright/test');
const { WORDS, vigiarCsp, preparar } = require('../../compartilhado/tests/helpers');

test('o relatório conta os acessos e a gestão do período, inclusive os registros antigos do livro', async ({ page }) => {
  const csp = vigiarCsp(page);
  await preparar(page, 'servicos-systekna.html', WORDS.servico);
  await page.evaluate(async () => {
    st.catalogo.push({ nome: 'Câmbio', funcoes: [], grupos: [] }, { nome: 'Piscina', funcoes: [], grupos: [] });
    const real = Date.now;
    // Há 10 dias: só aparece em 30 dias.
    Date.now = () => real() - 10 * 864e5;
    await ato('verificacao', 'Acesso liberado a Câmbio para Bia', null);
    Date.now = real;
    // Registros antigos (só texto, como antes da 0.24).
    await ato('verificacao', 'Acesso liberado a Câmbio para Ana', null);
    await ato('verificacao', 'Acesso negado a Cotação em Câmbio para Ana', null);
    // Registro novo, estruturado, com o motivo.
    await ato('verificacao', 'Acesso negado a Piscina para Caio', null);
    const e = st.book[st.book.length - 1];
    st.acessos.push({ n: e.n, at: e.at, ok: false, app: 'Piscina', fn: '', motivo: 'Não revogado' });
    await ato('emissao', 'Crachá Câmbio emitido para Ana', null);
    await ato('recusa', 'Acesso de Bia recusado: Outro', null);
    await ato('revogacao', 'Crachá Câmbio nº 1 de Ana revogado: Outro', null);
    await save(); await renderPanel();
  });

  await expect(page.locator('#pBook')).toContainText('Livro íntegro');
  await expect(page.locator('#uLib')).toHaveText('1');
  await expect(page.locator('#uNeg')).toHaveText('2');
  await expect(page.locator('#uBars .d')).toHaveCount(7);
  const hoje = page.locator('#uBars .d').last();
  await expect(hoje).toHaveAttribute('data-l', '1');
  await expect(hoje).toHaveAttribute('data-n', '2');
  await expect(page.locator('#uApps [data-uso="Câmbio"]')).toContainText('1 liberado · 1 negado');
  await expect(page.locator('#uApps [data-uso="Piscina"]')).toContainText('0 liberados · 1 negado');
  await expect(page.locator('#uFns [data-uso="Câmbio › Cotação"]')).toContainText('0 liberados · 1 negado');
  await expect(page.locator('#uMot')).toContainText('Não revogado');
  await expect(page.locator('#uMot')).toContainText('Motivo não registrado (antes da 0.24)');
  await expect(page.locator('#uEmi')).toHaveText('1');
  await expect(page.locator('#uRec')).toHaveText('1');
  await expect(page.locator('#uRev')).toHaveText('1');

  // 30 dias: entra o acesso de 10 dias atrás.
  await page.click('#usoSeg [data-d="30"]');
  await expect(page.locator('#uBars .d')).toHaveCount(30);
  await expect(page.locator('#uLib')).toHaveText('2');

  // Filtro por app: só Piscina.
  await page.selectOption('#usoApp', 'Piscina');
  await expect(page.locator('#uLib')).toHaveText('0');
  await expect(page.locator('#uNeg')).toHaveText('1');
  await expect(page.locator('#uApps .tx')).toHaveCount(1);
  // A gestão vale para o serviço todo, com ou sem filtro.
  await expect(page.locator('#uEmi')).toHaveText('1');
  expect(csp).toEqual([]);
});
