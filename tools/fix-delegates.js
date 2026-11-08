const fs = require('fs');
let t = fs.readFileSync('js/app.js', 'utf8');
t = t.replace("const b = e.target.closest('[data-cancel]'); if (b) { sfx('click'); cancelDownload(b.dataset.cancel); }", "const b = e.target.closest('[data-game]'); if (b) { sfx('pop'); goToGame(b.dataset.game); }");
t = t.replace("const b = e.target.closest('[data-play]'); if (b) { sfx('pop'); openGame(b.dataset.play); }", "const b = e.target.closest('[data-game]'); if (b) { sfx('pop'); goToGame(b.dataset.game); }");
fs.writeFileSync('js/app.js', t);
console.log('cancel removed:', !t.includes('data-cancel'));
console.log('play removed:', !t.includes('data-play'));
