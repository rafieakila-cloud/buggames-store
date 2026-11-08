const fs = require('fs');
const catalog = JSON.parse(fs.readFileSync('tools/catalog.json', 'utf8'));
const covers = catalog.map(g => "  './icons/covers/" + g.id + ".png',").join('\n');
const appIcons = catalog.map(g => "  './icons/apps/" + g.id + "-192.png', './icons/apps/" + g.id + "-512.png',").join('\n');
const manifests = catalog.map(g => "  './manifests/" + g.id + ".webmanifest',").join('\n');
const sw = `const C = 'buggames-store-v17';
const ASSETS = [
  './', './index.html', './play.html',
  './css/style.css?v=17', './css/playstore.css?v=17', './css/play.css?v=17',
  './js/app.js?v=17', './js/play.js?v=17', './js/icons.js?v=17', './js/engine3d.js?v=17',
  './js/games-action.js?v=17', './js/games-board.js?v=17', './js/games-quiz.js?v=17',
  './js/games-extras.js?v=17', './js/games-extras-b.js?v=17', './js/games-extras-c.js?v=17',
  './js/games-extras-d.js?v=17', './js/games-extras-e.js?v=17', './js/games-3d.js?v=17', './js/games-3d-extra.js?v=17', './js/games-3d-extra-b.js?v=17',
  './manifest.webmanifest',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png', './icons/qr-install.png', './icons/qr-store.png',
${covers}
${appIcons}
${manifests}
];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(new Request(e.request, { cache: 'no-store' })).then(res => {
      if (res && res.ok) { const clone = res.clone(); caches.open(C).then(c => c.put(e.request, clone)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./play.html')))
  );
});
`;
fs.writeFileSync('sw.js', sw);
console.log('sw.js written with', catalog.length, 'covers +', catalog.length, 'app icons (x2) +', catalog.length, 'manifests');
