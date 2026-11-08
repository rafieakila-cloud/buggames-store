/* BUGGAMES STORE - toko game: unduh, terpasang, main langsung */
'use strict';

window.BG = (function () {
  const LS_KEY = 'buggames.v1';
  const STORE_KEY = 'buggames.store.v1';

  function loadJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; } }
  const storeData = loadJSON(STORE_KEY, { owned: [], history: [] });
  storeData.history = storeData.history || [];
  let deferredPrompt = null;
  const store = loadJSON(LS_KEY, { best: {}, sound: true });
  store.best = store.best || {};
  if (store.sound === undefined) store.sound = true;
  function saveLS() { localStorage.setItem(LS_KEY, JSON.stringify(store)); }
  function saveStore() { localStorage.setItem(STORE_KEY, JSON.stringify(storeData)); }
  function owns(id) { return storeData.owned.includes(id); }
  const activeDownloads = new Map();
  function activeDownloadFor(id) { return activeDownloads.get(id) || null; }
  function anyActiveDownloads() { return activeDownloads.size > 0; }
  function markOwned(id) {
    if (!owns(id)) storeData.owned.push(id);
    saveStore();
  }
  function pushHistory(g, size) {
    storeData.history.unshift({ id: g.id, name: g.name, size, time: Date.now() });
    if (storeData.history.length > 40) storeData.history.length = 40;
    saveStore();
  }

  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const AGE_MAP = { bomwaktu: '7+', kastilbetahan: '7+', matadorbug: '7+', ketapel: '7+' };
  function meta(id, cat) {
    const h = hash(id);
    const size = cat === '3d' ? 85 + (h % 170) : 8 + (h % 52);
    const stars = (42 + (h % 9)) / 10;
    const downloads = 850 + (h % 2400000);
    return { size, stars, downloads, age: AGE_MAP[id] || 'SU' };
  }
  function fmtDownloads(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + ' Jt' : n >= 1e3 ? Math.round(n / 1e3) + ' Rb' : String(n); }

  let actx = null;
  function audio() { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; }
  function tone(freq, dur, type, when, vol) {
    try {
      const a = audio(), o = a.createOscillator(), g = a.createGain();
      o.type = type || 'square'; o.frequency.value = freq;
      const t = a.currentTime + (when || 0);
      g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.12));
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + (dur || 0.12) + 0.02);
    } catch (e) {}
  }
  function sfx(kind) {
    if (!store.sound) return;
    switch (kind) {
      case 'click': tone(750, .06, 'square', 0, .07); break;
      case 'good': tone(660, .1, 'sine', 0, .14); tone(990, .14, 'sine', .09, .14); break;
      case 'bad': tone(150, .22, 'sawtooth', 0, .12); break;
      case 'pop': tone(520, .05, 'triangle', 0, .16); tone(880, .06, 'triangle', .04, .12); break;
      case 'coin': tone(1250, .07, 'square', 0, .1); tone(1560, .12, 'square', .06, .1); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, .16, 'square', i * .13, .11)); break;
      case 'lose': [392, 330, 262].forEach((f, i) => tone(f, .2, 'sawtooth', i * .16, .1)); break;
      case 'shoot': tone(900, .07, 'square', 0, .09); break;
      case 'hit': tone(220, .08, 'triangle', 0, .14); break;
      case 'download': tone(523, .09, 'sine', 0, .13); tone(659, .09, 'sine', .1, .13); tone(784, .1, 'sine', .2, .13); tone(1047, .22, 'sine', .32, .13); break;
    }
  }
  function toggleSound() { store.sound = !store.sound; saveLS(); return store.sound; }
  const soundOn = () => !!store.sound;

  const games = [];
  function register(g) { games.push(g); }

  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const el = html => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
  function icon(name, cls) { const s = (window.BG_ICONS && window.BG_ICONS[name]) || window.BG_ICONS.bug; return s.replace('<svg', '<svg class="' + (cls || '') + '"'); }
  const canvasPos = (canvas, e) => {
    const r = canvas.getBoundingClientRect();
    const cx = (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX), cy = (e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY);
    return { x: (cx - r.left) * canvas.width / r.width, y: (cy - r.top) * canvas.height / r.height };
  };
  function newSession() {
    const cleanups = [];
    return {
      add(fn) { cleanups.push(fn); },
      interval(fn, ms) { const id = setInterval(fn, ms); cleanups.push(() => clearInterval(id)); return id; },
      timeout(fn, ms) { const id = setTimeout(fn, ms); cleanups.push(() => clearTimeout(id)); return id; },
      raf(loop) { let id, dead = false; const step = t => { if (dead) return; loop(t); id = requestAnimationFrame(step); }; id = requestAnimationFrame(step); cleanups.push(() => { dead = true; cancelAnimationFrame(id); }); },
      on(target, ev, fn, opts) { target.addEventListener(ev, fn, opts); cleanups.push(() => target.removeEventListener(ev, fn, opts)); },
      destroy() { cleanups.forEach(fn => { try { fn(); } catch (e) {} }); cleanups.length = 0; }
    };
  }
  const getBest = id => store.best[id];
  function setBest(id, score, lowerBetter) {
    const prev = store.best[id];
    let record = false;
    if (prev === undefined || (lowerBetter ? score < prev : score > prev)) record = true;
    if (record) store.best[id] = score;
    saveLS();
    return { best: store.best[id], record };
  }
  function hudPill(label, valueId) { return '<div class="hud-pill">' + esc(label) + ' <b id="' + valueId + '">0</b></div>'; }
  function endScreen(container, opts) {
    const o = opts || {};
    const res = setBest(o.bestKey, o.score || 0, !!o.lowerBetter);
    const bestLabel = o.lowerBetter ? 'Terbaik: ' + res.best + ' (paling sedikit)' : 'Terbaik: ' + res.best;
    const overlay = el(
      '<div class="end-overlay"><div class="end-card">' +
        (o.win === false ? icon('bug') : icon('trophy')) +
        '<h3>' + esc(o.title || (o.win === false ? 'Coba Lagi!' : 'Mantap!')) + '</h3>' +
        (o.sub ? '<p>' + esc(o.sub) + '</p>' : '') +
        '<div class="end-score">' + esc(o.scoreLabel !== undefined ? o.scoreLabel : (o.score || 0)) + '</div>' +
        '<div class="end-best' + (res.record ? ' record' : '') + '">' + (res.record ? 'REKOR BARU!' : esc(bestLabel)) + '</div>' +
        '<div class="end-btns"><button class="btn btn-lime end-retry">Main Lagi</button><button class="btn btn-ghost end-menu">Menu</button></div>' +
      '</div></div>'
    );
    overlay.querySelector('.end-retry').addEventListener('click', () => { sfx('click'); if (o.onRetry) o.onRetry(); });
    overlay.querySelector('.end-menu').addEventListener('click', () => { sfx('click'); closeGame(); });
    container.appendChild(overlay);
    sfx(o.win === false ? 'lose' : 'win');
    return res;
  }

  const CATS = [
    { id: 'all', name: 'Semua' }, { id: '3d', name: '3D' }, { id: 'arcade', name: 'Arcade' },
    { id: 'puzzle', name: 'Puzzle' }, { id: 'kuis', name: 'Kuis' },
  ];
  let currentCat = 'all', currentQuery = '';
  let currentSession = null, currentGameId = null;
  const gameById = id => games.find(g => g.id === id);
  const metaOf = g => meta(g.id, g.cat);
  const coverOf = g => './icons/covers/' + g.id + '.png';

  function catLabel(c) { return ({ '3d': 'Game 3D', arcade: 'Arcade', puzzle: 'Puzzle & Logika', kuis: 'Kuis & Kata' })[c] || c; }

  function cardHTML(g, opts) {
    const o = opts || {};
    const m = metaOf(g);
    const owned = owns(g.id);
    return '<button class="store-card" data-id="' + g.id + '" aria-label="Detail ' + esc(g.name) + '">' +
      '<div class="store-cover"><img src="' + coverOf(g) + '" alt="' + esc(g.name) + '" loading="lazy" onerror="this.onerror=null;this.src=\'./icons/covers/snake.png\'">' +
        (owned ? '<span class="owned-badge">TERPASANG</span>' : '') +
        (o.ad ? '<span class="ad-badge">IKLAN</span>' : '') +
      '</div>' +
      '<div class="store-body"><b>' + esc(g.name) + '</b><small>' + esc(catLabel(g.cat)) + ' - Bawapi</small>' +
        '<div class="store-meta"><span class="stars">\u2605 ' + m.stars.toFixed(1) + '</span><span>' + m.size + ' MB</span><span class="age-tag">' + m.age + '</span></div>' +
      '</div>' +
    '</button>';
  }

  function renderGrid(elId, list, opts) {
    const grid = document.getElementById(elId);
    grid.innerHTML = list.map(g => cardHTML(g, opts)).join('');
    const empty = document.getElementById(elId + 'Empty');
    if (empty) empty.classList.toggle('hidden', list.length !== 0);
  }

  function filteredGames() {
    const q = currentQuery.trim().toLowerCase();
    return games.filter(g => (currentCat === 'all' || g.cat === currentCat) && (!q || (g.name + ' ' + (g.desc || '') + ' ' + (g.tags || '')).toLowerCase().includes(q)));
  }

  function go(tab) {
    document.querySelectorAll('.ps-bottomnav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.id === 'tab-' + tab));
    closeDetail();
    window.scrollTo(0, 0);
    if (tab === 'downloads') renderDownloads();
    sfx('click');
  }
  function openDetail(id) {
    const g = gameById(id); if (!g) return;
    const m = metaOf(g);
    const best = getBest(id);
    document.getElementById('detailModal').dataset.id = id;
    document.getElementById('detailCover').src = coverOf(g);
    try {
      document.getElementById('detailShot1').src = coverOf(g);
      const others = ['f13d', 'heli3d', 'sub3d', 'alien3d', 'jetpack3d', 'ski3d', 'sumo3d', 'bowling3d', 'labyrinth3d'].filter(x => x !== g.id);
      document.getElementById('detailShot2').src = './icons/covers/' + pick(others) + '.png';
    } catch (e) {}
    document.getElementById('detailName').textContent = g.name;
    document.getElementById('detailDesc').textContent = g.desc || 'Buggy menantang kamu!';
    document.getElementById('detailRating').textContent = '\u2605 ' + m.stars.toFixed(1);
    document.getElementById('detailSize').textContent = m.size + ' MB';
    document.getElementById('detailAge').textContent = m.age;
    document.getElementById('detailDownloads').textContent = fmtDownloads(m.downloads) + ' unduhan';
    document.getElementById('detailBest').textContent = best !== undefined ? 'Skor terbaikmu: ' + best : 'Belum pernah dimainkan';
    updateDetailButton(g);
    document.getElementById('detailModal').classList.remove('hidden');
    sfx('click');
  }
  function closeDetail() { document.getElementById('detailModal').classList.add('hidden'); }
  function updateDetailButton(g) {
    const btn = document.getElementById('detailBtn');
    const prog = document.getElementById('dlProgress');
    const dl = activeDownloadFor(g.id);
    btn.classList.remove('hidden');
    prog.classList.add('hidden');
    if (owns(g.id)) { btn.innerHTML = 'MAIN!'; btn.className = 'btn btn-lime btn-block'; btn.disabled = false; return; }
    if (dl) { btn.innerHTML = 'MENGUNDUH... ' + Math.floor(dl.pct) + '%'; btn.className = 'btn btn-ghost btn-block'; btn.disabled = true; return; }
    btn.disabled = false;
    btn.innerHTML = 'UNDUH - ' + metaOf(g).size + ' MB';
    btn.className = 'btn btn-lime btn-block';
  }
  function cancelDownload(id) { const dl = activeDownloads.get(id); if (dl) dl.cancelled = true; }
  function startDownload(g) {
    if (activeDownloads.has(g.id) || owns(g.id)) return;
    const m = metaOf(g);
    const dl = { id: g.id, name: g.name, size: m.size, pct: 0, phase: 'Menghubungkan server...', startedAt: Date.now(), speed: 0, cancelled: false };
    activeDownloads.set(g.id, dl);
    sfx('download');
    showToast('Mengunduh ' + g.name + '...', 'down');
    updateDetailButton(g);
    renderDownloads();
    updateDlBadge();
    let last = performance.now();
    function tick() {
      if (dl.cancelled) {
        activeDownloads.delete(g.id);
        updateDetailButton(g);
        renderDownloads();
        updateDlBadge();
        showToast('Unduhan ' + g.name + ' dibatalkan', 'close');
        return;
      }
      const now = performance.now();
      const dt = Math.min(0.25, (now - last) / 1000); last = now;
      const elapsed = (Date.now() - dl.startedAt) / 1000;
      if (dl.pct < 6) {
        dl.phase = 'Menghubungkan server...';
        dl.pct = Math.min(6, elapsed * 12 + Math.random() * 1.4);
        dl.speed = 0;
      } else if (dl.pct < 88) {
        dl.phase = 'Mengunduh data game...';
        /* rata-rata selesai ~5 detik, tapi dengan akselerasi/deselerasi acak */
        const baseRate = 100 / (5.2 + Math.sin(elapsed * 1.5) * 1.2 + Math.sin(elapsed * 4.7) * 0.5);
        const jitter = 0.72 + Math.random() * 0.95;
        dl.speed = Math.max(4, (baseRate * jitter * dl.size) / 100);
        dl.pct = Math.min(88, dl.pct + baseRate * jitter * dt);
      } else if (dl.pct < 96) {
        dl.phase = 'Memverifikasi file...';
        dl.pct = Math.min(96, dl.pct + dt * 8);
        dl.speed = 0;
      } else {
        dl.phase = 'Memasang ke perangkat...';
        dl.pct = Math.min(100, dl.pct + dt * 10);
        dl.speed = 0;
      }
      renderDownloads();
      updateDetailButton(g);
      if (dl.pct >= 100) {
        activeDownloads.delete(g.id);
        markOwned(g.id);
        pushHistory(g, dl.size);
        const isFirstInstall = storeData.owned.length === 1;
        sfx('win');
        showToast(g.name + ' terpasang! Membuka game...', 'ok');
        updateDetailButton(g);
        renderAll();
        updateDlBadge();
        /* jadi aplikasi: kalau ini instalasi pertama & prompt tersedia, tawarkan install otomatis */
        if (isFirstInstall && deferredPrompt) {
          const dp = deferredPrompt; deferredPrompt = null;
          setTimeout(() => { try { dp.prompt(); } catch (e) {} }, 950);
        }
        /* langsung buka game, tanpa tombol main */
        setTimeout(() => openGame(g.id), 850);
        return;
      }
      setTimeout(tick, 90);
    }
    tick();
  }
  let toastTimer = null;
  function showToast(msg, kind) {
    const toast = document.getElementById('toast');
    const text = document.getElementById('toastText');
    if (!toast || !text) return;
    toast.querySelector('.toast-icon').textContent = kind === 'ok' ? '\u2713' : kind === 'down' ? '\u2913' : '\u2715';
    text.textContent = msg;
    toast.classList.remove('hidden', 'show');
    void toast.offsetWidth;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3600);
  }
  function renderDownloads() {
    const activeEl = document.getElementById('activeDownloads');
    if (!activeEl) return;
    const actives = Array.from(activeDownloads.values());
    document.getElementById('activeEmpty').classList.toggle('hidden', actives.length !== 0);
    activeEl.innerHTML = actives.map(dl => {
      const done = (dl.size * dl.pct / 100).toFixed(0);
      return '<div class="dl-item">' +
        '<img class="dl-thumb" src="./icons/covers/' + dl.id + '.png" alt="" onerror="this.onerror=null;this.src=\'./icons/covers/snake.png\'">' +
        '<div class="dl-info">' +
          '<div class="dl-name">' + esc(dl.name) + '</div>' +
          '<div class="dl-phase">' + esc(dl.phase) + '</div>' +
          '<div class="dl-bar"><i style="width:' + dl.pct.toFixed(1) + '%"></i></div>' +
          '<div class="dl-sub"><span>' + dl.pct.toFixed(0) + '% - ' + done + ' / ' + dl.size + ' MB</span><span>' + (dl.speed ? dl.speed.toFixed(1) + ' MB/s' : '&nbsp;') + '</span></div>' +
        '</div>' +
        '<button class="dl-cancel" data-cancel="' + dl.id + '" aria-label="Batalkan unduhan">\u2715</button>' +
      '</div>';
    }).join('');
    const hist = storeData.history;
    document.getElementById('historyEmpty').classList.toggle('hidden', hist.length !== 0);
    document.getElementById('downloadHistory').innerHTML = hist.map(h => {
      const date = new Date(h.time).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      return '<div class="dl-item dl-done">' +
        '<img class="dl-thumb" src="./icons/covers/' + h.id + '.png" alt="" onerror="this.onerror=null;this.src=\'./icons/covers/snake.png\'">' +
        '<div class="dl-info">' +
          '<div class="dl-name">' + esc(h.name) + '</div>' +
          '<div class="dl-phase">Selesai diunduh - ' + h.size + ' MB</div>' +
          '<div class="dl-sub"><span>' + esc(date) + '</span></div>' +
        '</div>' +
        '<button class="dl-play" data-play="' + h.id + '">MAIN</button>' +
      '</div>';
    }).join('');
  }
  function updateDlBadge() {
    const b = document.getElementById('dlBadge');
    if (!b) return;
    const n = activeDownloads.size;
    b.textContent = n;
    b.classList.toggle('hidden', n === 0);
  }
  function openGame(id) {
    const g = gameById(id); if (!g) return;
    closeDetail();
    currentGameId = id;
    currentSession = newSession();
    document.getElementById('gameTitle').textContent = g.name + ' - ' + catLabel(g.cat);
    const b = getBest(id);
    document.getElementById('gameBest').textContent = 'Terbaik: ' + (b === undefined ? '-' : b);
    const container = document.getElementById('gameContainer');
    container.innerHTML = '';
    document.getElementById('gameView').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    try { g.start(container, currentSession); }
    catch (err) {
      console.error(err);
      container.innerHTML = '<div class="panel"><h3>Waduh, error!</h3><p>Game gagal dimuat. Coba tutup dan buka lagi.</p></div>';
    }
    if (history.pushState) history.pushState({ game: id }, '', '#' + id);
  }
  function closeGame() {
    if (currentSession) { currentSession.destroy(); currentSession = null; }
    currentGameId = null;
    document.getElementById('gameContainer').innerHTML = '';
    document.getElementById('gameView').classList.add('hidden');
    document.body.style.overflow = '';
    renderAll();
  }
  function renderAll() {
    renderGrid('gridAll', filteredGames(), {});
    renderGrid('grid3d', games.filter(g => g.cat === '3d'), {});
    renderGrid('gridLibrary', games.filter(g => owns(g.id)), {});
    document.getElementById('libraryCount').textContent = storeData.owned.length;
    const countEl = document.getElementById('allCount');
    if (countEl) countEl.textContent = games.length;
    const miniEl = document.getElementById('miniInstalled');
    if (miniEl) miniEl.textContent = storeData.owned.length;
    renderDownloads();
    updateDlBadge();
  }

  function init() {
    document.getElementById('mascotHome').innerHTML = window.BG_MASCOT;

    document.querySelectorAll('.rail button').forEach(b => b.addEventListener('click', () => go(b.dataset.tab)));
    document.querySelectorAll('[data-go]').forEach(elm => elm.addEventListener('click', () => go(elm.dataset.go)));

    document.getElementById('catChips').innerHTML = CATS.map(c =>
      '<button class="chip' + (c.id === 'all' ? ' active' : '') + '" data-cat="' + c.id + '">' + esc(c.name) + '</button>'
    ).join('');
    document.getElementById('catChips').addEventListener('click', e => {
      const btn = e.target.closest('.chip'); if (!btn) return;
      currentCat = btn.dataset.cat; sfx('click');
      document.querySelectorAll('#catChips .chip').forEach(x => x.classList.toggle('active', x === btn));
      renderAll();
    });
    document.getElementById('searchInput').addEventListener('input', e => { currentQuery = e.target.value; renderAll(); });

    ['gridAll', 'grid3d', 'gridLibrary', 'topGamesRow', 'row3d'].forEach(id => {
      const grid = document.getElementById(id);
      if (grid) grid.addEventListener('click', e => { const card = e.target.closest('.store-card'); if (card) openDetail(card.dataset.id); });
    });

    const byDownloads = games.slice().sort((a, b) => metaOf(b).downloads - metaOf(a).downloads);
    renderGrid('topGamesRow', byDownloads.slice(0, 6), { ad: true });
    renderGrid('row3d', games.filter(g => g.cat === '3d').sort((a, b) => metaOf(b).downloads - metaOf(a).downloads).slice(0, 8), {});

    document.getElementById('detailClose').addEventListener('click', () => { sfx('click'); closeDetail(); });
    document.getElementById('detailModal').addEventListener('click', e => { if (e.target.id === 'detailModal') closeDetail(); });
    document.getElementById('detailBtn').addEventListener('click', () => {
      const id = document.getElementById('detailModal').dataset.id;
      const g = id && gameById(id);
      if (!g) return;
      if (owns(id)) { sfx('pop'); openGame(id); }
      else startDownload(g);
    });
    document.getElementById('heroBtn').addEventListener('click', () => openDetail('f13d'));
    const seeAll = document.getElementById('seeAllLink');
    if (seeAll) seeAll.addEventListener('click', () => go('games'));
    document.getElementById('backBtn').addEventListener('click', () => { sfx('click'); closeGame(); if (location.hash) history.pushState({}, '', location.pathname); });
    window.addEventListener('popstate', () => { if (currentGameId) closeGame(); });

    /* delegasi tombol unduhan (batal / main) */
    const activeEl = document.getElementById('activeDownloads');
    if (activeEl) activeEl.addEventListener('click', e => { const b = e.target.closest('[data-cancel]'); if (b) { sfx('click'); cancelDownload(b.dataset.cancel); } });
    const histEl = document.getElementById('downloadHistory');
    if (histEl) histEl.addEventListener('click', e => { const b = e.target.closest('[data-play]'); if (b) { sfx('pop'); openGame(b.dataset.play); } });

    const soundBtn = document.getElementById('soundBtn');
    const soundIcon = on => on
      ? '<svg viewBox="0 0 24 24" fill="none"><path d="M4 9v6h4l6 5V4L8 9H4z" fill="#ffd23f" stroke="#241239" stroke-width="1.8" stroke-linejoin="round"/><path d="M18 9a4 4 0 0 1 0 6M21 6a8 8 0 0 1 0 12" stroke="#ffd23f" stroke-width="2" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none"><path d="M4 9v6h4l6 5V4L8 9H4z" fill="#8a76ad" stroke="#241239" stroke-width="1.8" stroke-linejoin="round"/><path d="M18 9l5 6M23 9l-5 6" stroke="#ff6b9d" stroke-width="2" stroke-linecap="round"/></svg>';
    const paintSound = () => { soundBtn.innerHTML = soundIcon(soundOn()); };
    soundBtn.addEventListener('click', () => { toggleSound(); paintSound(); sfx('click'); });
    paintSound();

    const installBtn = document.getElementById('installBtn');
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; installBtn.classList.remove('hidden'); });
    installBtn.addEventListener('click', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); const choice = await deferredPrompt.userChoice; deferredPrompt = null; installBtn.classList.add('hidden'); });
    window.addEventListener('appinstalled', () => installBtn.classList.add('hidden'));

    if (location.hash.length > 1) { const g = gameById(location.hash.slice(1)); if (g) openDetail(g.id); }

    renderAll();
  }

  return { games, register, icon, el, esc, shuffle, rand, pick, sfx, getBest, setBest, endScreen, hudPill, canvasPos, newSession, go, openDetail, closeGame, init };
})();

window.addEventListener('DOMContentLoaded', BG.init);
