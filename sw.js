// Service worker da Carteira e do Cartório: permite instalar e abrir os apps sem internet.
// Páginas e arquivos do site: rede primeiro, para que cada publicação chegue logo; sem rede,
// usa a última cópia guardada. Fontes externas: cache primeiro.
const VERSAO = 'systekna-v1';
const ESSENCIAIS = [
  './',
  'index.html',
  'carteira-systekna.html',
  'cartorio-systekna.html',
  'carteira.webmanifest',
  'cartorio.webmanifest',
  'icons/carteira-192.png',
  'icons/carteira-512.png',
  'icons/cartorio-192.png',
  'icons/cartorio-512.png',
];
const FONTES = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

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
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const salvo = await cache.match(req, { ignoreSearch: true });
    if (salvo) return salvo;
    throw err;
  }
}

async function cachePrimeiro(req) {
  const cache = await caches.open(VERSAO);
  const salvo = await cache.match(req);
  if (salvo) return salvo;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith(new URL('./', self.location).pathname)) e.respondWith(redePrimeiro(req));
  } else if (FONTES.includes(url.origin)) {
    e.respondWith(cachePrimeiro(req));
  }
});
