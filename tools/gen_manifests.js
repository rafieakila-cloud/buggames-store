const fs = require('fs');
const games = JSON.parse(fs.readFileSync('tools/catalog.json', 'utf8'));
fs.mkdirSync('manifests', { recursive: true });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
for (const g of games) {
  const m = {
    name: g.name + ' — BUGGAMES',
    short_name: g.name.length > 12 ? g.name.slice(0, 11) + '…' : g.name,
    description: (g.desc || 'Game seru offline BUGGAMES!') + ' Mainkan offline, gratis.',
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
console.log('manifests:', fs.readdirSync('manifests').length);
