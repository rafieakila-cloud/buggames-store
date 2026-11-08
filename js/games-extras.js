/* Buggames — Game EKSTRA (bagian 1/3) */
'use strict';

function exRetry(el, s, id) { return () => { el.innerHTML = ''; BG.games.find(g => g.id === id).start(el, s); }; }

/* ============ SOKOBAN ============ */
BG.register({
  id: 'sokoban', name: 'Sokoban', desc: 'Dorong kotak ke target!', cat: 'puzzle', icon: 'box', tags: 'sokoban dorong kotak puzzle',
  start(el, s) {
    const LEVELS = [
      ['########', '#  .   #', '#  $   #', '#  @   #', '########'],
      ['#########', '#       #', '# $ .   #', '# @     #', '#########'],
      ['#########', '# .   . #', '# $   $ #', '#   @   #', '#########'],
    ];
    let level = 0, grid = [], px = 1, py = 1, moves = 0, over = false;
    el.innerHTML = '<div class="panel center-col" style="max-width:380px"><div class="hud" style="width:100%">' + BG.hudPill('Level', 'sk-level') + BG.hudPill('Langkah', 'sk-moves') + '</div>' +
      '<div class="board" id="sk-board" style="grid-template-columns:repeat(9,40px);grid-auto-rows:40px;gap:3px"></div>' +
      '<p style="text-align:center;font-size:.8rem;color:#d9c9f2">Dorong kotak 🟧 ke titik hijau!</p></div>';
    const boardEl = el.querySelector('#sk-board'), levelEl = el.querySelector('#sk-level'), movesEl = el.querySelector('#sk-moves');
    function load(lv) {
      level = lv; moves = 0;
      grid = LEVELS[lv].map(r => r.split(''));
      for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[r].length; c++) if (grid[r][c] === '@') { px = c; py = r; grid[r][c] = ' '; }
      render();
    }
    function render() {
      levelEl.textContent = (level + 1) + '/3'; movesEl.textContent = moves;
      let html = '';
      for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[r].length; c++) {
        const v = grid[r][c];
        let bg = '#1b0f2e', content = '';
        if (v === '#') bg = '#4b5563';
        else if (v === '.') { content = '<div style="width:14px;height:14px;border-radius:50%;background:#4ade80"></div>'; }
        else if (v === '$') { content = '<div style="width:24px;height:24px;background:#fb923c;border:3px solid #241239;border-radius:5px"></div>'; }
        if (c === px && r === py) content = '<div style="font-size:1.3rem">🐛</div>';
        html += '<div class="cell" style="background:' + bg + ';border:none">' + content + '</div>';
      }
      boardEl.innerHTML = html;
    }
    function tryMove(dx, dy) {
      if (over) return;
      const nx = px + dx, ny = py + dy;
      if (grid[ny] && grid[ny][nx] === '#') return;
      const target = grid[ny] && grid[ny][nx];
      if (target === '$') {
        const bx = nx + dx, by = ny + dy;
        if (!grid[by] || grid[by][bx] === '#' || grid[by][bx] === '$') return;
        grid[by][bx] = '$'; grid[ny][nx] = ' ';
      }
      px = nx; py = ny; moves++; BG.sfx('click'); render();
      if (grid.every(row => row.every(cell => cell !== '.'))) {
        /* semua goal tertutup (kotak di atas goal) */
        const goalsLeft = grid.flat().filter(v => v === '.').length;
        if (goalsLeft === 0) {
          if (level + 1 < LEVELS.length) { BG.sfx('win'); load(level + 1); }
          else {
            over = true;
            BG.endScreen(el.querySelector('.panel').parentElement, { score: Math.max(10, 1000 - moves * 10), bestKey: 'sokoban', title: 'Sokoban Legend!', sub: 'Semua level selesai dalam ' + moves + ' langkah!', scoreLabel: 'Selesai!', onRetry: exRetry(el, s, 'sokoban') });
          }
        }
      }
    }
    boardEl.style.gridTemplateColumns = 'repeat(9,40px)';
    s.on(window, 'keydown', e => { const m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }; const d = m[e.key]; if (d) { e.preventDefault(); tryMove(d[0], d[1]); } });
    el.querySelector('.panel').insertAdjacentHTML('beforeend', '<div class="dpad"><span></span><button data-d="up">▲</button><span></span><button data-d="left">◀</button><button data-d="down">▼</button><button data-d="right">▶</button></div>');
    el.querySelectorAll('.dpad button').forEach(b => b.addEventListener('click', () => { const d = b.dataset.d; tryMove(d === 'right' ? 1 : d === 'left' ? -1 : 0, d === 'down' ? 1 : d === 'up' ? -1 : 0); }));
    load(0);
  }
});

/* ============ MASTERMIND ============ */
BG.register({
  id: 'mastermind', name: 'Mastermind', desc: 'Tebak kode 4 warna!', cat: 'puzzle', icon: 'code', tags: 'mastermind kode warna',
  start(el, s) {
    const COLORS = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a78bfa'];
    const code = Array.from({ length: 4 }, () => BG.rand(0, 5));
    let guesses = [], current = [], over = false; const MAX = 8;
    el.innerHTML = '<div class="panel center-col" style="max-width:420px"><h3>Pecahkan Kode 4 Warna!</h3>' +
      '<div id="mm-rows" style="display:flex;flex-direction:column;gap:6px"></div>' +
      '<div id="mm-cur" style="display:flex;gap:8px;margin:6px 0;padding:8px;background:#241239;border-radius:12px"></div>' +
      '<div id="mm-colors" style="display:flex;gap:8px"></div>' +
      '<button class="btn btn-lime" id="mm-check" style="padding:8px 26px">CEK</button></div>';
    const rowsEl = el.querySelector('#mm-rows'), curEl = el.querySelector('#mm-cur'), colorsEl = el.querySelector('#mm-colors');
    colorsEl.innerHTML = COLORS.map((c, i) => '<button class="cell" data-c="' + i + '" style="width:42px;height:42px;background:' + c + ';border-radius:50%"></button>').join('');
    function render() {
      rowsEl.innerHTML = guesses.map(g =>
        '<div style="display:flex;gap:8px;align-items:center">' +
        g.pick.map(p => '<div style="width:34px;height:34px;border-radius:50%;background:' + COLORS[p] + ';border:2px solid #241239"></div>').join('') +
        '<div style="display:flex;gap:3px;margin-left:8px;flex-wrap:wrap;width:60px">' + g.fb.map(f => '<div style="width:12px;height:12px;border-radius:50%;background:' + (f === 2 ? '#111' : f === 1 ? '#f8fafc' : '#4b5563') + '"></div>').join('') + '</div></div>'
      ).join('');
      curEl.innerHTML = current.concat(Array(4 - current.length).fill(-1)).map(c => '<div style="width:38px;height:38px;border-radius:50%;background:' + (c >= 0 ? COLORS[c] : '#3a2054') + ';border:3px solid #241239"></div>').join('');
    }
    colorsEl.addEventListener('click', e => { const btn = e.target.closest('[data-c]'); if (!btn || current.length >= 4 || over) return; current.push(+btn.dataset.c); BG.sfx('click'); render(); });
    el.querySelector('#mm-check').addEventListener('click', () => {
      if (current.length < 4 || over) { BG.sfx('bad'); return; }
      /* feedback */
      const fb = Array(4).fill(0); const codeLeft = code.slice(), pickLeft = current.slice();
      for (let i = 0; i < 4; i++) if (pickLeft[i] === codeLeft[i]) { fb[i] = 2; codeLeft[i] = -1; pickLeft[i] = -1; }
      for (let i = 0; i < 4; i++) { if (pickLeft[i] < 0) continue; const j = codeLeft.indexOf(pickLeft[i]); if (j >= 0) { fb[i] = 1; codeLeft[j] = -1; } }
      guesses.push({ pick: current.slice(), fb });
      current = [];
      const wins = fb.every(f => f === 2);
      render();
      if (wins) {
        over = true; BG.sfx('win');
        BG.endScreen(el.querySelector('.panel').parentElement, { score: (MAX - guesses.length + 1) * 100, bestKey: 'mastermind', title: 'Jenius!', sub: 'Kode pecah dalam ' + guesses.length + ' tebakan!', scoreLabel: guesses.length + ' tebakan', onRetry: exRetry(el, s, 'mastermind') });
      } else if (guesses.length >= MAX) {
        over = true; BG.sfx('lose');
        BG.endScreen(el.querySelector('.panel').parentElement, { score: 0, bestKey: 'mastermind', win: false, title: 'Kode Aman!', sub: 'Kode-nya: ' + code.map(c => '●').join(''), scoreLabel: 'Gagal', onRetry: exRetry(el, s, 'mastermind') });
      } else BG.sfx('pop');
    });
    render();
  }
});



