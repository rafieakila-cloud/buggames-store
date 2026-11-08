/* Buggames — Game EKSTRA (bagian 3/4) */
'use strict';

function exRetry(el, s, id) { return () => { el.innerHTML = ''; BG.games.find(g => g.id === id).start(el, s); }; }


/* ============ KELERENG TEMBAK (pachinko) ============ */
BG.register({
  id: 'kelereng', name: 'Kelereng Tembak', desc: 'Jatuhkan kelereng ke wadah skor!', cat: 'arcade', icon: 'marble', tags: 'kelereng pachinko tembak',
  start(el, s) {
    const W = 400, H = 380;
    el.innerHTML = '<div class="stage"><div class="hud">' + BG.hudPill('Skor', 'kl-score') + BG.hudPill('Sisa', 'kl-left') + '</div><canvas width="' + W + '" height="' + H + '"></canvas>' +
      '<p style="text-align:center;font-size:.78rem;color:#b8a6d9">Ketuk untuk menjatuhkan kelereng!</p></div>';
    const canvas = el.querySelector('canvas'), ctx = canvas.getContext('2d');
    const scoreEl = el.querySelector('#kl-score'), leftEl = el.querySelector('#kl-left');
    let score = 0, marbles = 8, current = null, over = false;
    const pegs = [];
    for (let r = 0; r < 5; r++) {
      const count = 4 + (r % 2);
      for (let i = 0; i < count; i++) pegs.push({ x: W / 2 + (i - (count - 1) / 2) * 52 + (r % 2 ? 26 : 0), y: 60 + r * 52 });
    }
    const buckets = [5, 10, 20, 50, 20, 10, 5];
    s.on(canvas, 'pointerdown', e => {
      if (over || current) return;
      const p = BG.canvasPos(canvas, e);
      current = { x: Math.max(30, Math.min(W - 30, p.x)), y: 14, vy: 1.2, vx: 0 };
      BG.sfx('click');
    });
    s.raf(() => {
      if (over) return;
      if (current) {
        current.vy += 0.12; current.y += current.vy;
        for (const peg of pegs) {
          const d = Math.hypot(current.x - peg.x, current.y - peg.y);
          if (d < 10 && current.y < peg.y + 8) {
            current.vx += (current.x - peg.x) * 0.09;
            current.vy = Math.abs(current.vy) * 0.55;
            current.y = peg.y + 10;
            BG.sfx('hit');
          }
        }
        current.x += current.vx; current.vx *= 0.985;
        if (current.x < 12) { current.x = 12; current.vx *= -0.6; }
        if (current.x > W - 12) { current.x = W - 12; current.vx *= -0.6; }
        if (current.y > H - 46) {
          const idx = Math.min(buckets.length - 1, Math.max(0, Math.floor(current.x / (W / buckets.length))));
          score += buckets[idx]; scoreEl.textContent = score; marbles--; leftEl.textContent = marbles;
          BG.sfx(buckets[idx] >= 20 ? 'coin' : 'pop');
          current = null;
          if (marbles <= 0) {
            over = true;
            BG.endScreen(canvas.parentElement, { score, bestKey: 'kelereng', title: 'Selesai!', sub: 'Kelereng jatuh semua! Skor: ' + score, scoreLabel: score, onRetry: exRetry(el, s, 'kelereng') });
          }
        }
      }
      /* render */
      ctx.fillStyle = '#1e1b4b'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#c4b5fd';
      pegs.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#241239'; ctx.lineWidth = 2; ctx.stroke(); });
      /* wadah skor */
      buckets.forEach((v, i) => {
        const bw = W / buckets.length;
        ctx.fillStyle = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#facc15', '#f97316', '#ef4444'][i];
        ctx.fillRect(i * bw, H - 44, bw - 2, 44);
        ctx.fillStyle = '#111'; ctx.font = '800 13px Trebuchet MS'; ctx.textAlign = 'center'; ctx.fillText(v, i * bw + bw / 2, H - 18);
      });
      if (current) { ctx.fillStyle = '#818cf8'; ctx.strokeStyle = '#241239'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(current.x, current.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    });
    leftEl.textContent = marbles;
  }
});

/* ============ ANGKA ROMAWI ============ */
BG.register({
  id: 'angkaromawi', name: 'Angka Romawi', desc: 'Siapa jago angka romawi?', cat: 'kuis', icon: 'roman', tags: 'romawi roman numeral angka',
  start(el, s) {
    const QS = [[1,'I'],[4,'IV'],[5,'V'],[9,'IX'],[10,'X'],[19,'XIX'],[24,'XXIV'],[29,'XXIX'],[40,'XL'],[45,'XLV'],[49,'XLIX'],[50,'L'],[58,'LVIII'],[66,'LXVI'],[74,'LXXIV'],[88,'LXXXVIII'],[90,'XC'],[99,'XCIX']];
    const questions = BG.shuffle(QS).slice(0, 8);
    let idx = 0, score = 0, over = false;
    el.innerHTML = '<div class="panel center-col" style="max-width:400px;text-align:center"><div class="hud" style="width:100%">' + BG.hudPill('Skor', 'rm-score') + '<div class="hud-pill">Soal <b id="rm-num">1</b>/8</div></div>' +
      '<div class="big-question" id="rm-q" style="font-family:Georgia;font-size:3.4rem;letter-spacing:.2em"></div>' +
      '<div class="choices" id="rm-choices"></div></div>';
    const scoreEl = el.querySelector('#rm-score'), numEl = el.querySelector('#rm-num'), qEl = el.querySelector('#rm-q'), choicesEl = el.querySelector('#rm-choices');
    function render() {
      const [v, sym] = questions[idx];
      numEl.textContent = idx + 1; qEl.textContent = sym;
      const opts = new Set([v]);
      while (opts.size < 4) opts.add(Math.max(1, v + BG.rand(-25, 25)));
      choicesEl.innerHTML = BG.shuffle([...opts]).map(n => '<button class="choice-btn" data-v="' + n + '" style="font-size:1.3rem">' + n + '</button>').join('');
    }
    choicesEl.addEventListener('click', e => {
      const btn = e.target.closest('.choice-btn'); if (!btn || over) return;
      if (+btn.dataset.v === questions[idx][0]) { score += 10; BG.sfx('good'); btn.classList.add('correct'); } else { BG.sfx('bad'); btn.classList.add('wrong'); }
      scoreEl.textContent = score; over = true;
      s.timeout(() => { over = false; idx++; if (idx >= questions.length) BG.endScreen(el.querySelector('.panel').parentElement, { score, bestKey: 'angkaromawi', title: 'Caesar!', sub: 'Angka romawi menaklukkan kamu? ' + score + ' poin.', onRetry: exRetry(el, s, 'angkaromawi') }); else render(); }, 650);
    });
    render();
  }
});

/* ============ SAMBER PETIR ============ */
BG.register({
  id: 'samberpetir', name: 'Samber Petir', desc: 'Sambar petir secepat kilat!', cat: 'arcade', icon: 'bolt', tags: 'petir lightning sambar',
  start(el, s) {
    const W = 420, H = 340;
    el.innerHTML = '<div class="stage"><div class="hud">' + BG.hudPill('Skor', 'sp-score') + BG.hudPill('Waktu', 'sp-time') + '</div><canvas width="' + W + '" height="' + H + '" style="cursor:crosshair"></canvas></div>';
    const canvas = el.querySelector('canvas'), ctx = canvas.getContext('2d');
    const scoreEl = el.querySelector('#sp-score'), timeEl = el.querySelector('#sp-time');
    let score = 0, timeLeft = 20, over = false, bolt = null, frame = 0;

    s.interval(() => { if (over) return; timeLeft--; timeEl.textContent = timeLeft + 's'; if (timeLeft <= 0) { over = true; BG.endScreen(canvas.parentElement, { score, bestKey: 'samberpetir', title: 'Badai Berakhir!', sub: 'Petir yang disambar: ' + score / 10, onRetry: exRetry(el, s, 'samberpetir') }); } }, 1000);
    s.interval(() => { if (!over) bolt = { x: BG.rand(40, W - 40), y: BG.rand(60, H - 70), t: Date.now(), life: Math.max(420, 950 - frame * 2.2) }; }, 620);

    s.on(canvas, 'pointerdown', e => {
      if (over || !bolt) return;
      const p = BG.canvasPos(canvas, e);
      if (Math.hypot(p.x - bolt.x, p.y - bolt.y) < 44) { score += 10; BG.sfx('coin'); bolt = null; scoreEl.textContent = score; }
    });
    s.raf(() => {
      frame++;
      ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc((i * 173 + 40) % W, (i * 91 + 20) % (H - 60), 1.3, 0, Math.PI * 2); ctx.fill(); }
      /* awan gelap */
      ctx.fillStyle = '#1e293b';
      [[70, 26, 40], [210, 18, 52], [340, 30, 44]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });
      if (bolt) {
        const age = Date.now() - bolt.t;
        const alpha = Math.max(0, 1 - age / bolt.life);
        if (age > bolt.life) bolt = null;
        else {
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = '#fde047'; ctx.lineWidth = 6; ctx.shadowColor = '#fde047'; ctx.shadowBlur = 22;
          ctx.beginPath(); ctx.moveTo(bolt.x + 12, 36); ctx.lineTo(bolt.x - 8, H * 0.42); ctx.lineTo(bolt.x + 6, H * 0.42); ctx.lineTo(bolt.x - 12, H * 0.72); ctx.stroke();
          ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        }
      }
    });
    timeEl.textContent = timeLeft + 's';
  }
});

/* ============ POTONG KAYU ============ */
BG.register({
  id: 'potongkayu', name: 'Potong Kayu', desc: 'Potong kayu tepat di garis hijau!', cat: 'arcade', icon: 'saw', tags: 'potong kayu sawmill',
  start(el, s) {
    const W = 440, H = 340;
    el.innerHTML = '<div class="stage"><div class="hud">' + BG.hudPill('Skor', 'pt-score') + BG.hudPill('Waktu', 'pt-time') + '</div><canvas width="' + W + '" height="' + H + '"></canvas>' +
      '<p id="pt-msg" style="text-align:center;font-weight:800;color:#ffd23f">Ketuk saat gergaji di zona hijau!</p></div>';
    const canvas = el.querySelector('canvas'), ctx = canvas.getContext('2d');
    const scoreEl = el.querySelector('#pt-score'), timeEl = el.querySelector('#pt-time'), msgEl = el.querySelector('#pt-msg');
    let score = 0, timeLeft = 30, over = false, sawX = 0, sawDir = 1, speed = 3.4, zone = { x: 0, w: 60 }, plankCount = 0, combo = 0;

    function newZone() { const w = Math.max(34, 60 - combo * 2); zone = { x: BG.rand(30, W - 30 - w), w }; }
    newZone();
    s.interval(() => { if (over) return; timeLeft--; timeEl.textContent = timeLeft + 's'; if (timeLeft <= 0) { over = true; BG.endScreen(canvas.parentElement, { score, bestKey: 'potongkayu', title: 'Jam Istirahat!', sub: 'Kayu dipotong: skor ' + score + '.', onRetry: exRetry(el, s, 'potongkayu') }); } }, 1000);

    canvas.addEventListener('pointerdown', () => {
      if (over) return;
      const inZone = sawX > zone.x && sawX < zone.x + zone.w;
      if (inZone) { combo++; score += 10 + combo * 2; plankCount++; BG.sfx('coin'); msgEl.textContent = 'TEPAT! +' + (10 + combo * 2); newZone(); speed = Math.min(6.5, speed + 0.22); }
      else { combo = 0; BG.sfx('bad'); msgEl.textContent = 'Meleset! Combo hilang...'; }
      scoreEl.textContent = score;
    });
    s.raf(() => {
      if (over) return;
      sawX += sawDir * speed; if (sawX > W - 20 || sawX < 20) sawDir *= -1;
      /* gambar latar hutan */
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#166534'); g.addColorStop(1, '#052e16');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#14532d';
      for (let i = 0; i < 6; i++) { const tx = (i * 173 + 30) % W; ctx.beginPath(); ctx.moveTo(tx, H); ctx.lineTo(tx + 24, H * 0.4); ctx.lineTo(tx - 24, H * 0.4); ctx.closePath(); ctx.fill(); }
      /* batang kayu */
      ctx.fillStyle = '#78350f'; ctx.strokeStyle = '#241239'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(0, H * 0.52, W, 64, 30); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.ellipse(30, H * 0.52 + 32, 16, 30, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      /* zona hijau */
      ctx.fillStyle = 'rgba(74,222,128,.4)'; ctx.fillRect(zone.x, H * 0.52, zone.w, 64);
      ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.strokeRect(zone.x, H * 0.52, zone.w, 64); ctx.setLineDash([]);
      /* gergaji (garis kuning) */
      ctx.strokeStyle = '#fde047'; ctx.lineWidth = 5; ctx.shadowColor = '#fde047'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(sawX, H * 0.52 - 22); ctx.lineTo(sawX, H * 0.52 + 86); ctx.stroke(); ctx.shadowBlur = 0;
      /* mata gergaji */
      ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.arc(sawX, H * 0.52 - 26, 10, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#241239'; ctx.stroke();
      timeEl.textContent = timeLeft + 's';
    });
    timeEl.textContent = timeLeft + 's';
  }
});

/* ============ LEMPAR PISAU ============ */
BG.register({
  id: 'lemparpisau', name: 'Lempar Pisau', desc: 'Lempar pisau ke balok berputar!', cat: 'arcade', icon: 'knife2', tags: 'lempar pisau knife spin',
  start(el, s) {
    const W = 380, H = 400, cx = W / 2, cy = 150;
    el.innerHTML = '<div class="stage"><div class="hud">' + BG.hudPill('Skor', 'lp-score') + BG.hudPill('Pisau', 'lp-left') + '</div><canvas width="' + W + '" height="' + H + '"></canvas>' +
      '<p style="text-align:center;font-size:.8rem;color:#b8a6d9">Ketuk untuk melempar! Jangan menabrak pisau lain!</p></div>';
    const canvas = el.querySelector('canvas'), ctx = canvas.getContext('2d');
    const scoreEl = el.querySelector('#lp-score'), leftEl = el.querySelector('#lp-left');
    let angle = 0, dir = 1, speed = 0.028, knives = [], score = 0, knivesLeft = 12, over = false, level = 1;

    canvas.addEventListener('pointerdown', () => {
      if (over) return;
      /* cek tabrakan dengan pisau yang sudah menempel */
      for (const k of knives) {
        if (Math.abs(k.angle - (angle % (Math.PI * 2))) < 0.32 || Math.abs(k.angle - (angle % (Math.PI * 2)) + Math.PI * 2) < 0.32) {
          over = true; BG.sfx('bad');
          BG.endScreen(canvas.parentElement, { score, bestKey: 'lemparpisau', win: false, title: 'TABRAKAN!', sub: 'Pisau mengenai pisau lain!', scoreLabel: score + ' pisau', onRetry: exRetry(el, s, 'lemparpisau') });
          return;
        }
      }
      knives.push({ angle: angle % (Math.PI * 2) });
      score++; scoreEl.textContent = score; knivesLeft--; leftEl.textContent = knivesLeft;
      BG.sfx('pop');
      if (knivesLeft <= 0) {
        over = true;
        BG.endScreen(canvas.parentElement, { score: score * 50, bestKey: 'lemparpisau', title: 'Sempurna!', sub: 'Semua ' + score + ' pisau tertancap rapi!', scoreLabel: score + '/12', onRetry: exRetry(el, s, 'lemparpisau') });
      }
    });
    s.raf(() => {
      if (over) return;
      angle += dir * speed;
      const rot = angle;
      ctx.fillStyle = '#17102a'; ctx.fillRect(0, 0, W, H);
      /* balok kayu */
      ctx.fillStyle = '#78350f'; ctx.strokeStyle = '#241239'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(cx, cy, 62, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.arc(cx, cy, 42, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      /* pisau yang tertancap */
      knives.forEach(k => {
        const a = rot + k.angle;
        const kx = cx + Math.cos(a) * 78, ky = cy + Math.sin(a) * 78;
        drawKnife(ctx, kx, ky, a);
      });
      /* pisau berikutnya di tangan */
      drawKnife(ctx, cx, H - 34, Math.PI / 2);
      ctx.fillStyle = '#ffd23f'; ctx.font = '800 13px Trebuchet MS'; ctx.textAlign = 'center';
      ctx.fillText('Ketuk layar!', cx, H - 6);
    });
    function drawKnife(ctx, x, y, angle) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle + Math.PI / 2);
      ctx.fillStyle = '#e5e7eb'; ctx.strokeStyle = '#241239'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(2, -34); ctx.lineTo(-2, -34); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#78350f'; ctx.fillRect(-5, 0, 10, 14); ctx.strokeRect(-5, 0, 10, 14);
      ctx.restore();
    }
    leftEl.textContent = knivesLeft; scoreEl.textContent = 0;
  }
});
