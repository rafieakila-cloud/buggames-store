const fs = require('fs');
const games = JSON.parse(fs.readFileSync('tools/catalog.json', 'utf8'));
fs.mkdirSync('manifests', { recursive: true });
function shorten(name, max) {
  if (name.length <= max) return name;
  const words = name.split(/\s+/);
  let out = '';
  for (const w of words) {
    if ((out + ' ' + w).trim().length <= max) out = (out + ' ' + w).trim();
    else break;
  }
  if (out.length === 0) out = name.slice(0, max);
  return out;
}
for (const g of games) {
  const m = {
    name: g.name,
    short_name: shorten(g.name, 12),
    description: (g.desc || 'Game seru BUGGAMES!') + ' Gratis, offline, tanpa iklan.',
    id: './play.html?game=' + g.id,
    start_url: './play.html?game=' + g.id,
    scope: './',
    display: 'standalone',
    orientation: 'any',
    lang: 'id',
    categories: ['games', 'entertainment'],
    theme_color: '#241239',
    background_color: '#17102a',
    icons: [
      { src: './icons/apps/' + g.id + '-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: './icons/apps/' + g.id + '-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: './icons/apps/' + g.id + '-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
  fs.writeFileSync('manifests/' + g.id + '.webmanifest', JSON.stringify(m, null, 2));
}
console.log('manifests regenerated:', fs.readdirSync('manifests').length);
