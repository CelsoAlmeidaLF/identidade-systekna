// Monta os HTML de arquivo único a partir de src/.
//   node scripts/build.js          grava carteira-systekna.html e cartorio-systekna.html
//   node scripts/build.js --check  só confere se os HTML publicados estão em dia com src/
//
// Em src/<app>/pagina.html, uma linha `<!-- @inclui caminho -->` é trocada pelo conteúdo do
// arquivo (caminho relativo à página). O núcleo comum fica em src/shared/.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const APPS = ['carteira', 'cartorio'];
const INCLUI = /^[ \t]*<!-- @inclui (\S+) -->\n/gm;

function monta(arquivo, pilha = []) {
  if (pilha.includes(arquivo)) throw new Error(`Inclusão circular: ${[...pilha, arquivo].join(' → ')}`);
  const texto = fs.readFileSync(arquivo, 'utf8');
  return texto.replace(INCLUI, (_, rel) => {
    const alvo = path.resolve(path.dirname(arquivo), rel);
    if (!fs.existsSync(alvo)) throw new Error(`${path.relative(RAIZ, arquivo)}: arquivo incluído não existe: ${rel}`);
    const conteudo = monta(alvo, [...pilha, arquivo]);
    return conteudo.endsWith('\n') ? conteudo : conteudo + '\n';
  });
}

// A CSP da página só libera o script inline cujo hash bate: o hash é calculado aqui, depois da montagem.
function aplicaCsp(html, pagina) {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  if (!html.includes('{{hash-do-script}}')) return html;
  if (scripts.length !== 1) throw new Error(`${pagina}: a CSP espera exatamente 1 script inline, há ${scripts.length}`);
  const hash = 'sha256-' + crypto.createHash('sha256').update(scripts[0], 'utf8').digest('base64');
  return html.replaceAll('{{hash-do-script}}', hash);
}

const conferir = process.argv.includes('--check');
let desatualizados = 0;
for (const app of APPS) {
  const saida = path.join(RAIZ, `${app}-systekna.html`);
  const pagina = path.join(RAIZ, 'src', app, 'pagina.html');
  const html = aplicaCsp(monta(pagina), path.relative(RAIZ, pagina));
  const atual = fs.existsSync(saida) ? fs.readFileSync(saida, 'utf8') : null;
  if (conferir) {
    if (html !== atual) { desatualizados++; console.error(`✗ ${path.basename(saida)} está diferente de src/. Rode: npm run build`); }
    else console.log(`✓ ${path.basename(saida)} em dia com src/`);
  } else if (html !== atual) {
    fs.writeFileSync(saida, html);
    console.log(`✓ ${path.basename(saida)} gerado`);
  } else {
    console.log(`= ${path.basename(saida)} sem mudanças`);
  }
}
process.exit(desatualizados ? 1 : 0);
