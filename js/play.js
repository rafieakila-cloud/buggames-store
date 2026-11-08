/* BUGGAMES — app launcher: halaman per game + install asli (multi-PWA) */
'use strict';

window.BG = (function () {
  /* registry & helpers minimal (game-games membutuhkan) */
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
      destroy() { cleanups.forEach(fn => { try { fn(); } catch (e) {} }); }
    };
  }
  const LS_KEY = 'buggames.v1';
  let store; try { store = JSON.parse(localStorage.getItem(LS_KEY)) || { best: {}, sound: true }; } catch (e) { store = { best: {}, sound: true }; }
  store.best = store.best || {};
  if (store.sound === undefined) store.sound = true;
  const saveLS = () => localStorage.setItem(LS_KEY, JSON.stringify(store));
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

  let actx = null;
  function audio() { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; }
  function tone(freq, dur, type, when, vol) {
    try { const a = audio(), o = a.createOscillator(), g = a.createGain(); o.type = type || 'square'; o.frequency.value = freq; const t = a.currentTime + (when || 0); g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.12)); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + (dur || 0.12) + 0.02); } catch (e) {}
  }
  function sfx(kind) {
    if (!store.sound) return;
    switch (kind) {
      case 'click': tone(750, .06, 'square', 0, .07); break;
      case 'good': tone(660, .1, 'sine'); break;
      case 'bad': tone(160, .2, 'sawtooth'); break;
      case 'pop': tone(520, .05, 'triangle'); break;
      case 'coin': tone(1200, .06, 'square', 0, .09); tone(1500, .1, 'square', .06, .09); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, .16, 'square', i * .13, .11)); break;
      case 'lose': [392, 330, 262].forEach((f, i) => tone(f, .2, 'sawtooth', i * .16, .1)); break;
      case 'shoot': tone(900, .07, 'square', 0, .09); break;
      case 'hit': tone(220, .08, 'triangle'); break;
    }
  }
  function toggleSound() { store.sound = !store.sound; saveLS(); return store.sound; }

  function endScreen(container, opts) {
    const o = opts || {};
    const res = setBest(o.bestKey, o.score || 0, !!o.lowerBetter);
    const bestLabel = o.lowerBetter ? 'Terbaik: ' + res.best + ' (paling sedikit)' : 'Terbaik: ' + res.best;
    const html = '<div class="end-overlay"><div class="end-card">' +
      '<div style="width:80px;margin:0 auto 6px;font-size:3.2rem">' + (o.win === false ? '🐞' : '🏆') + '</div>' +
      '<h3>' + esc(o.title || (o.win === false ? 'Coba Lagi!' : 'Mantap!')) + '</h3>' +
      (o.sub ? '<p>' + esc(o.sub) + '</p>' : '') +
      '<div class="end-score">' + esc(o.scoreLabel !== undefined ? o.scoreLabel : (o.score || 0)) + '</div>' +
      '<div class="end-best' + (res.record ? ' record' : '') + '">' + (res.record ? 'REKOR BARU!' : esc(bestLabel)) + '</div>' +
      '<div class="end-btns"><button class="btn btn-lime end-retry">Main Lagi</button><button class="btn btn-ghost end-store">Toko</button></div>' +
    '</div></div>';
    container.insertAdjacentHTML('beforeend', html);
    const overlay = container.lastElementChild;
    overlay.querySelector('.end-retry').addEventListener('click', () => { sfx('click'); if (o.onRetry) o.onRetry(); });
    overlay.querySelector('.end-store').addEventListener('click', () => { sfx('click'); window.location.href = './index.html'; });
  }

  /* ===== metadata game (deterministik) ===== */
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const AGE_MAP = { bomwaktu: '7+', kastilbetahan: '7+', matadorbug: '7+', ketapel: '7+' };
  function meta(id, cat) {
    const h = hash(id);
    return { size: cat === '3d' ? 85 + (h % 170) : 8 + (h % 52), stars: (42 + (h % 9)) / 10, downloads: 850 + (h % 2400000), age: AGE_MAP[id] || 'SU' };
  }
  function fmtDownloads(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + ' Jt' : n >= 1e3 ? Math.round(n / 1e3) + ' Rb' : String(n); }
  function catLabel(c) { return ({ '3d': 'Game 3D', arcade: 'Arcade', puzzle: 'Puzzle & Logika', kuis: 'Kuis & Kata' })[c] || c; }

  return {
    games, register, rand, pick, shuffle, esc, el, icon, canvasPos, newSession, hudPill, endScreen, sfx, toggleSound, getBest, setBest, meta, fmtDownloads, catLabel,
  };
})();

/* ===== halaman game ===== */
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(location.search);
  const gameId = params.get('game') || 'f13d';
  const g = BG.games.find(x => x.id === gameId) || BG.games[0];
  if (!g) return;

  const m = BG.meta(g.id, g.cat);
  document.title = g.name + ' — BUGGAMES';
  document.getElementById('appIcon').src = './icons/apps/' + g.id + '-192.png';
  document.getElementById('appName').textContent = g.name;
  document.getElementById('appDev').innerHTML = 'Bawapi Dev <span class="ps-verified">&#10003;</span>';
  document.getElementById('appMeta').textContent = '\u2605 ' + m.stars.toFixed(1) + '  •  ' + BG.fmtDownloads(m.downloads) + ' unduhan  •  ' + m.age;
  document.getElementById('appSize').textContent = m.size + ' MB';
  document.getElementById('appDesc').textContent = g.desc || 'Buggy menantang kamu!';
  document.getElementById('bestPill').textContent = 'Terbaik: ' + (BG.getBest(g.id) !== undefined ? BG.getBest(g.id) : '-');

  /* ----- pasang game ----- */
  const container = document.getElementById('gameContainer');
  const session = BG.newSession();
  try { g.start(container, session); } catch (e) { container.innerHTML = '<p style="color:#fff;padding:20px">Gagal memuat game: ' + BG.esc(e && e.message) + '</p>'; }

  /* ----- tombol install ----- */
  const btn = document.getElementById('installBtn');
  const status = document.getElementById('installStatus');
  const soundBtn = document.getElementById('soundBtn');
  const soundIcon = on => '<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M4 9v6h4l6 5V4L8 9H4z" fill="' + (on ? '#ffd23f' : '#8a76ad') + '" stroke="#241239" stroke-width="1.8" stroke-linejoin="round"/><path d="M18 9a4 4 0 0 1 0 6M21 6a8 8 0 0 1 0 12" stroke="' + (on ? '#ffd23f' : '#8a76ad') + '" stroke-width="2" stroke-linecap="round"/></svg>';
  const paintSound = () => { soundBtn.innerHTML = soundIcon(true); };
  soundBtn.addEventListener('click', () => { BG.toggleSound(); paintSound(); BG.sfx('click'); });
  paintSound();

  let deferred = null;
  const installedKey = 'buggames.installed-apps';
  function getInstalled() { try { return JSON.parse(localStorage.getItem(installedKey)) || []; } catch (e) { return []; } }
  function markInstalled(id) { const arr = getInstalled(); if (!arr.includes(id)) { arr.push(id); localStorage.setItem(installedKey, JSON.stringify(arr)); } }
  const isInstalled = () => getInstalled().includes(g.id) || window.matchMedia('(display-mode: standalone)').matches;

  function refreshInstallUI() {
    if (isInstalled()) {
      btn.textContent = 'TERPASANG ✓';
      btn.className = 'ps-install-btn ps-install-full installed';
      btn.disabled = false;
      status.textContent = 'Aplikasi sudah terpasang di HP kamu!';
    } else {
      btn.textContent = 'INSTALL — ' + m.size + ' MB';
      btn.className = 'ps-install-btn ps-install-full';
      btn.disabled = false;
      status.textContent = '';
    }
  }
  refreshInstallUI();

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferred = e;
    status.innerHTML = 'Ketuk <b>INSTALL</b> untuk memasang <b>' + esc(g.name) + '</b> sebagai aplikasi di HP kamu!';
  });
  window.addEventListener('appinstalled', () => {
    markInstalled(g.id);
    deferred = null;
    refreshInstallUI();
    status.textContent = g.name + ' berhasil dipasang! Cari di layar utama HP kamu 🎉';
    BG.sfx('win');
  });

  btn.addEventListener('click', async () => {
    if (isInstalled()) {
      /* sudah terpasang: langsung main ulang */
      container.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (deferred) {
      try {
        deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice && choice.outcome === 'accepted') {
          markInstalled(g.id);
          refreshInstallUI();
          status.textContent = g.name + ' berhasil dipasang! Cari ikon di layar utama HP kamu 🎉';
          BG.sfx('win');
        } else {
          status.textContent = 'Instalasi dibatalkan. Kamu bisa klik INSTALL lagi kapan pun.';
        }
      } catch (e) {
        status.textContent = 'Maaf, browser menolak prompt install. Coba menu Chrome ⋮ → "Install app".';
      }
      deferred = null;
    } else {
      /* browser tidak menyediakan prompt (mis. sudah ter-install / tidak eligible) */
      status.innerHTML = 'Kalau tombol install tidak merespons, buka menu Chrome <b>⋮ → Install app</b>, atau gunakan <b>Add to Home Screen</b>.';
    }
  });
});
