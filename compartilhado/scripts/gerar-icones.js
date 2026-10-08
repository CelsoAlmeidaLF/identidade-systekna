// Gera os ícones PNG dos apps (PWA) a partir de SVG, usando o Chrome do sistema.
// Uso: node compartilhado/scripts/gerar-icones.js [app ...]   (sem argumento, gera todos)
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Mesmos traços dos ícones das páginas (24×24, traço branco).
const GLIFOS = {
  carteira: '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  servicos: '<path d="M12 3l2.4 1.8 3-.2.9 2.9 2.4 1.8-1 2.8 1 2.8-2.4 1.8-.9 2.9-3-.2L12 21l-2.4-1.8-3 .2-.9-2.9-2.4-1.8 1-2.8-1-2.8 2.4-1.8.9-2.9 3 .2z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  emissor: '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="M9 12l2 2 4-4"/>',
};
// Gradiente "gloss" do design Aero; o emissor usa um tom mais escuro para diferenciar na tela inicial.
const CORES = {
  carteira: ['#7CCBF8', '#3BA0EA', '#1A7AD4', '#2B8DE2'],
  emissor: ['#5E9FE0', '#1F6FC0', '#0E4F96', '#1A62AE'],
  // Verde: a cor do crachá.
  servicos: ['#7EDCA0', '#34A863', '#1E8048', '#2A9457'],
};

function svg(app, { arredondado, escala }) {
  const [c0, c1, c2, c3] = CORES[app];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${c0}"/><stop offset=".48" stop-color="${c1}"/>
    <stop offset=".52" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/>
  </linearGradient></defs>
  <rect width="512" height="512" rx="${arredondado ? 112 : 0}" fill="url(#g)"/>
  <g transform="translate(256 256) scale(${escala}) translate(-12 -12)" fill="none" stroke="#fff"
     stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${GLIFOS[app]}</g>
</svg>`;
}

// "any": cantos arredondados e símbolo grande. "maskable" e Apple: fundo inteiro e símbolo
// dentro da zona segura, porque o sistema recorta o formato.
const SAIDAS = [
  { sufixo: '192', tam: 192, arredondado: true, escala: 12 },
  { sufixo: '512', tam: 512, arredondado: true, escala: 12 },
  { sufixo: 'maskable-512', tam: 512, arredondado: false, escala: 9.5 },
  { sufixo: 'apple-180', tam: 180, arredondado: false, escala: 11 },
];

(async () => {
  const dir = path.join(__dirname, '..', '..', 'icons');
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage();
  const pedidos = process.argv.slice(2);
  for (const app of pedidos.length ? pedidos : Object.keys(GLIFOS)) {
    fs.writeFileSync(path.join(dir, `${app}.svg`), svg(app, { arredondado: true, escala: 12 }));
    for (const s of SAIDAS) {
      await page.setViewportSize({ width: s.tam, height: s.tam });
      await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${s.tam}px;height:${s.tam}px}</style>${svg(app, s)}`);
      await page.screenshot({ path: path.join(dir, `${app}-${s.sufixo}.png`), omitBackground: true });
    }
  }
  await browser.close();
  console.log('Ícones gerados em', dir);
})();
