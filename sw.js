// Service worker da Carteira e do Emissor: permite instalar e abrir os apps sem internet.
// Páginas e arquivos do site: rede primeiro, para que cada publicação chegue logo; sem rede,
// usa a última cópia guardada. Nada é buscado fora do site.
// O nome do cache acompanha a versão do package.json (o build atualiza esta linha):
// cada versão publicada troca o cache e apaga o anterior.
const VERSAO = 'systekna-0.12.1';
const ESSENCIAIS = [
  './',
  'index.html',
  'carteira-systekna.html',
  'emissor-systekna.html',
  'cartorio-systekna.html', // endereço antigo, redireciona para o emissor
  'carteira.webmanifest',
  'emissor.webmanifest',
  'icons/carteira-192.png',
  'icons/carteira-512.png',
  'icons/emissor-192.png',
  'icons/emissor-512.png',
  'fonts/open-sans-latin.woff2',
  'fonts/open-sans-latin-ext.woff2',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ESSENCIAIS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(nomes.filter(n => n !== VERSAO).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

async function redePrimeiro(req) {
  const cache = await caches.open(VERSAO);
  try {
    // no-cache: sempre pergunta ao servidor (ETag). Sem isso, o cache HTTP do Pages (10 min)
    // devolvia a versão anterior mesmo com a nova já publicada.
    const res = await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const salvo = await cache.match(req, { ignoreSearch: true });
    if (salvo) return salvo;
    throw err;
  }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin && url.pathname.startsWith(new URL('./', self.location).pathname)) {
    e.respondWith(redePrimeiro(req));
  }
});
