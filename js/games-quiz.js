/* Buggames — Game KUIS & KATA */
'use strict';

function quizShell(el, hudHtml, innerHtml) {
  el.innerHTML = '<div class="panel center-col" style="max-width:520px"><div class="hud" style="width:100%">' + hudHtml + '</div>' + (innerHtml || '') + '</div>';
}
function retry(el, s, id) { return () => { el.innerHTML = ''; BG.games.find(g => g.id === id).start(el, s); }; }

/* ============ 28. COCOKKAN BUG (memory) ============ */
BG.register({
  id: 'memory', name: 'Cocokkan Bug', desc: 'Temukan pasangan bug yang sama!', cat: 'kuis', icon: 'memory', tags: 'memory cocok pasangan kartu',
  start(el, s) {
    const bugIcons = ['🐛','🪲','🐞','🐜','🦗','🕷️'];
    const deck = BG.shuffle(bugIcons.concat(bugIcons)).map(v => ({ v, matched: false }));
    let flipped = [], matched = 0, moves = 0, lock = false;
    el.innerHTML = '<div class="panel center-col" style="max-width:420px"><div class="hud" style="width:100%">' + BG.hudPill('Langkah', 'mem-moves') + BG.hudPill('Ketemu', 'mem-found') + '</div>' +
      '<div class="board" id="mem-board" style="grid-template-columns:repeat(4,76px);grid-auto-rows:76px"></div></div>';
    const boardEl = el.querySelector('#mem-board'), movesEl = el.querySelector('#mem-moves'), foundEl = el.querySelector('#mem-found');
    function render() {
      boardEl.innerHTML = deck.map((card, i) => {
        const open = card.matched || flipped.includes(i);
        return '<button class="cell" data-i="' + i + '" style="font-size:2rem;background:' + (card.matched ? '#166534' : open ? '#fef3c7' : '#3a2054') + '">' + (open ? card.v : '?') + '</button>';
      }).join('');
      movesEl.textContent = moves; foundEl.textContent = matched + '/6';
    }
    boardEl.addEventListener('click', e => {
      const cell = e.target.closest('.cell'); if (!cell || lock) return;
      const i = +cell.dataset.i;
      if (deck[i].matched || flipped.includes(i)) return;
      flipped.push(i); BG.sfx('click'); render();
      if (flipped.length === 2) {
        moves++;
        const [a, b] = flipped;
        if (deck[a].v === deck[b].v) {
          deck[a].matched = true; deck[b].matched = true;
          matched++; BG.sfx('good'); flipped = []; render();
          if (matched === 6) {
            BG.endScreen(el.querySelector('.panel').parentElement, {
              score: Math.max(10, 600 - moves * 15), bestKey: 'memory',
              title: 'Ingatan Tajam!', sub: 'Selesai dalam ' + moves + ' langkah.', scoreLabel: moves + ' langkah',
              onRetry: retry(el, s, 'memory'),
            });
          }
        } else {
          lock = true;
          s.timeout(() => { flipped = []; lock = false; render(); }, 750);
        }
      }
    });
    render();
  }
});

/* ============ 29. SIMON BUG ============ */
BG.register({
  id: 'simon', name: 'Simon Bug', desc: 'Ulangi urutan warna yang dimainkan Buggy!', cat: 'kuis', icon: 'simon', tags: 'simon urut ingat',
  start(el, s) {
    const PADS = [
      { color: '#ff5a5a', freq: 329.6, label: 'Merah' },
      { color: '#ffd23f', freq: 261.6, label: 'Kuning' },
      { color: '#4ecdc4', freq: 392.0, label: 'Biru' },
      { color: '#a3e635', freq: 523.3, label: 'Hijau' },
    ];
    el.innerHTML = '<div class="panel center-col" style="max-width:380px"><div class="hud" style="width:100%">' + BG.hudPill('Level', 'sim-level') + '</div>' +
      '<div id="sim-pads" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%"></div>' +
      '<p id="sim-status" style="text-align:center;font-weight:800;color:#ffd23f;min-height:1.4em">Perhatikan baik-baik...</p></div>';
    const padsEl = el.querySelector('#sim-pads'), levelEl = el.querySelector('#sim-level'), status = el.querySelector('#sim-status');
    let seq = [], playerIdx = 0, level = 0, accepting = false, over = false;

    padsEl.innerHTML = PADS.map((p, i) => '<button class="sim-pad" data-i="' + i + '" style="height:110px;border-radius:18px;border:4px solid #241239;background:' + p.color + ';cursor:pointer;opacity:.55;transition:opacity .15s, transform .1s;font-weight:900;color:#241239">' + p.label + '</button>').join('');
    const padEls = [...padsEl.querySelectorAll('.sim-pad')];

    function flash(i, dur) {
      return new Promise(res => {
        padEls[i].style.opacity = '1'; padEls[i].style.transform = 'scale(1.05)';
        try { BG.sfx('click'); const a = new (window.AudioContext || window.webkitAudioContext)(); const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = PADS[i].freq; g.gain.setValueAtTime(0.001, a.currentTime); g.gain.exponentialRampToValueAtTime(0.2, a.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.35); o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + 0.4); } catch (e) {}
        setTimeout(() => { padEls[i].style.opacity = '.55'; padEls[i].style.transform = 'scale(1)'; res(); }, dur || 340);
      });
    }
    async function playSeq() {
      accepting = false; status.textContent = 'Perhatikan...';
      await new Promise(r => setTimeout(r, 500));
      for (const i of seq) { await flash(i, 380); await new Promise(r => setTimeout(r, 160)); }
      status.textContent = 'Giliranmu!'; accepting = true; playerIdx = 0;
    }
    function nextLevel() {
      level++; levelEl.textContent = level;
      seq.push(BG.rand(0, 3));
      playSeq();
    }
    padsEl.addEventListener('click', async e => {
      const pad = e.target.closest('.sim-pad'); if (!pad || !accepting || over) return;
      const i = +pad.dataset.i;
      flash(i, 200);
      if (i === seq[playerIdx]) {
        playerIdx++;
        if (playerIdx === seq.length) { accepting = false; status.textContent = 'Benar! Lanjut...'; s.timeout(nextLevel, 750); }
      } else {
        over = true; accepting = false; BG.sfx('bad');
        BG.endScreen(el.querySelector('.panel').parentElement, {
          score: (level - 1) * 10, bestKey: 'simon', title: 'Salah Urutan!',
          sub: 'Kamu tahan sampai level ' + level + '.', scoreLabel: 'Level ' + level,
          onRetry: retry(el, s, 'simon'),
        });
      }
    });
    nextLevel();
  }
});

/* ============ 30. REFLEKS BUG ============ */
BG.register({
  id: 'reaction', name: 'Refleks Bug', desc: 'Ketuk secepatnya saat layar hijau!', cat: 'kuis', icon: 'reaction', tags: 'refleks reaksi cepat reaction',
  start(el, s) {
    el.innerHTML = '<div class="panel center-col" style="max-width:440px;text-align:center"><h3>Refleks Bug</h3>' +
      '<button id="rx-pad" style="width:100%;height:230px;border-radius:20px;border:4px solid #241239;background:#b91c1c;cursor:pointer;color:#fff;font-family:inherit;font-size:1.5rem;font-weight:900;letter-spacing:1px">TUNGGU...</button>' +
      '<p id="rx-info" style="color:#d9c9f2;font-size:.9rem">Ketuk saat berubah HIJAU. 3 ronde, ambil rata-rata!</p></div>';
    const pad = el.querySelector('#rx-pad'), info = el.querySelector('#rx-info');
    let state = 'waiting', round = 0, times = [], goAt = 0, timer = null, over = false;

    function arm() {
      state = 'waiting'; pad.style.background = '#b91c1c'; pad.textContent = 'TUNGGU...';
      timer = s.timeout(() => { state = 'go'; goAt = performance.now(); pad.style.background = '#16a34a'; pad.textContent = 'KETUK SEKARANG!'; }, BG.rand(900, 2600));
    }
    pad.addEventListener('click', () => {
      if (over) return;
      if (state === 'waiting') {
        clearTimeout(timer); state = 'idle'; pad.style.background = '#78350f'; pad.textContent = 'KECEPATAN! Ketuk untuk coba lagi'; BG.sfx('bad');
        return;
      }
      if (state === 'go') {
        const ms = Math.round(performance.now() - goAt);
        times.push(ms); round++; BG.sfx('good');
        info.textContent = 'Ronde ' + round + ': ' + ms + ' ms';
        if (round >= 3) {
          over = true;
          const avg = Math.round(times.reduce((a, b) => a + b, 0) / 3);
          pad.style.background = '#241239'; pad.textContent = 'SELESAI!';
          BG.endScreen(el.querySelector('.panel').parentElement, {
            score: avg, bestKey: 'reaction', lowerBetter: true,
            title: avg < 250 ? 'Kilat!' : avg < 400 ? 'Lumayan!' : 'Santai Aja',
            sub: 'Rata-rata refleks kamu ' + avg + ' ms.', scoreLabel: avg + ' ms',
            onRetry: retry(el, s, 'reaction'),
          });
        } else arm();
        return;
      }
      if (state === 'idle') arm();
    });
    arm();
  }
});

/* ============ 31. LATIH BIDIK ============ */
BG.register({
  id: 'aim', name: 'Latih Bidik', desc: 'Ketuk target yang muncul secepatnya!', cat: 'kuis', icon: 'aim', tags: 'aim bidik target tap',
  start(el, s) {
    const W = 440, H = 360;
    el.innerHTML = '<div class="stage"><div class="hud">' + BG.hudPill('Skor', 'aim-score') + BG.hudPill('Waktu', 'aim-time') + '</div><canvas width="' + W + '" height="' + H + '"></canvas></div>';
    const canvas = el.querySelector('canvas'), ctx = canvas.getContext('2d');
    const scoreEl = el.querySelector('#aim-score'), timeEl = el.querySelector('#aim-time');
    let score = 0, timeLeft = 30, over = false, target = null, gold = false;

    function spawn() { target = { x: BG.rand(34, W - 34), y: BG.rand(34, H - 34), r: 26 }; gold = Math.random() < 0.15; }
    spawn();
    s.interval(() => { if (over) return; timeLeft--; timeEl.textContent = timeLeft + 's'; if (timeLeft <= 0) { over = true; finish(); } }, 1000);
    s.on(canvas, 'pointerdown', e => {
      if (over || !target) return;
      const p = BG.canvasPos(canvas, e);
      if (Math.hypot(p.x - target.x, p.y - target.y) < target.r + 4) { score += gold ? 30 : 10; BG.sfx(gold ? 'coin' : 'pop'); scoreEl.textContent = score; spawn(); } else BG.sfx('click');
    });
    function finish() {
      BG.endScreen(canvas.parentElement, { score, bestKey: 'aim', title: 'Waktu Habis!', sub: 'Bidikan tajam: ' + score + ' poin.', onRetry: retry(el, s, 'aim') });
    }
    s.raf(() => {
      ctx.fillStyle = '#17102a'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,.05)'; for (let x = 0; x < W; x += 22) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      if (target) {
        ctx.fillStyle = gold ? '#ffd23f' : '#ff5a5a'; ctx.strokeStyle = '#241239'; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(target.x, target.y, target.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(target.x, target.y, target.r * 0.62, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = gold ? '#ffd23f' : '#ff5a5a'; ctx.beginPath(); ctx.arc(target.x, target.y, target.r * 0.3, 0, Math.PI * 2); ctx.fill();
      }
    });
    timeEl.textContent = timeLeft + 's';
  }
});

/* ============ 32. MATH SPRINT ============ */
BG.register({
  id: 'mathsprint', name: 'Math Sprint', desc: '60 detik, jawab matematika sebanyak mungkin!', cat: 'kuis', icon: 'math', tags: 'matematika hitung cepat math',
  start(el, s) {
    el.innerHTML = '<div class="panel center-col" style="max-width:440px"><div class="hud" style="width:100%">' + BG.hudPill('Skor', 'ms2-score') + BG.hudPill('Waktu', 'ms2-time') + '</div>' +
      '<div class="big-question" id="ms2-q">?</div><div class="choices" id="ms2-choices"></div></div>';
    const scoreEl = el.querySelector('#ms2-score'), timeEl = el.querySelector('#ms2-time'), qEl = el.querySelector('#ms2-q'), choicesEl = el.querySelector('#ms2-choices');
    let score = 0, timeLeft = 60, over = false, answer = 0;

    function newQuestion() {
      const ops = ['+', '-', '×'];
      const op = BG.pick(ops);
      let a, b;
      if (op === '+') { a = BG.rand(11, 99); b = BG.rand(11, 99); answer = a + b; }
      else if (op === '-') { a = BG.rand(20, 99); b = BG.rand(10, a); answer = a - b; }
      else { a = BG.rand(3, 12); b = BG.rand(3, 12); answer = a * b; }
      qEl.textContent = a + ' ' + op + ' ' + b + ' = ?';
      const opts = new Set([answer]);
      while (opts.size < 4) opts.add(answer + BG.rand(-12, 12) || answer + 7);
      choicesEl.innerHTML = BG.shuffle([...opts]).map(v => '<button class="choice-btn" data-v="' + v + '">' + v + '</button>').join('');
    }
    choicesEl.addEventListener('click', e => {
      const btn = e.target.closest('.choice-btn'); if (!btn || over) return;
      if (+btn.dataset.v === answer) { btn.classList.add('correct'); score += 10; BG.sfx('good'); }
      else { btn.classList.add('wrong'); BG.sfx('bad'); }
      scoreEl.textContent = score;
      s.timeout(newQuestion, 180);
    });
    s.interval(() => {
      if (over) return;
      timeLeft--; timeEl.textContent = timeLeft + 's';
      if (timeLeft <= 0) { over = true; BG.endScreen(el.querySelector('.panel').parentElement, { score, bestKey: 'mathsprint', title: 'Waktu Habis!', sub: 'Kamu jago hitung: ' + score + ' poin.', onRetry: retry(el, s, 'mathsprint') }); }
    }, 1000);
    newQuestion();
  }
});

/* ============ 33. KUIS BUG & UMUM ============ */
BG.register({
  id: 'trivia', name: 'Kuis Buggy', desc: '10 pertanyaan seru seputar bug & dunia!', cat: 'kuis', icon: 'trivia', tags: 'kuis trivia pertanyaan umum',
  start(el, s) {
    const ALL = [
      ['Hewan apa simbol ilmu pengetahuan yang punya cangkang?', ['Kumbang', 'Kura-kura', 'Keong', 'Kepiting'], 1],
      ['Berapa kaki laba-laba?', ['6', '10', '8', '12'], 2],
      ['Serangga yang menghasilkan madu adalah...', ['Semut', 'Lebah', 'Tawon tanah', 'Belalang'], 1],
      ['Bug dalam pemrograman artinya...', ['Fitur baru', 'Kesalahan/cacat', 'Virus komputer', 'Nama bahasa'], 1],
      ['Ibukota Indonesia adalah...', ['Surabaya', 'Bandung', 'Jakarta', 'Medan'], 2],
      ['Gunung tertinggi di Indonesia?', ['Semeru', 'Rinjani', 'Kerinci', 'Puncak Jaya'], 3],
      ['Hewan darat tercepat?', ['Singa', 'Macan tutul', 'Cheetah', 'Kuda'], 2],
      ['Planet terdekat dari matahari?', ['Venus', 'Merkurius', 'Mars', 'Jupiter'], 1],
      ['Siapa penemu lampu pijar?', ['Nikola Tesla', 'Thomas Edison', 'Alexander Bell', 'Isaac Newton'], 1],
      ['Warna daun karena zat...', ['Karoten', 'Melanin', 'Klorofil', 'Hemoglobin'], 2],
      ['Berapa jumlah provinsi di Indonesia (2024)?', ['34', '37', '38', '33'], 2],
      ['Alat musik dari bambu Sunda?', ['Angklung', 'Gamelan', 'Kolintang', 'Sasando'], 0],
      ['Siapa presiden pertama RI?', ['Soeharto', 'Soekarno', 'Habibie', 'Gus Dur'], 1],
      ['Bahasa pemrograman untuk web interaktif?', ['Python', 'JavaScript', 'C++', 'Rust'], 1],
      ['Hewan terbesar di dunia?', ['Gajah Afrika', 'Hiu paus', 'Paus biru', 'Jerapah'], 2],
      ['Berapa derajat titik didih air?', ['90', '100', '110', '80'], 1],
      ['Lagu kebangsaan Indonesia?', ['Garuda Pancasila', 'Halo-Halo Bandung', 'Indonesia Raya', 'Maju Tak Gentar'], 2],
      ['Museum Louvre ada di kota...', ['London', 'Roma', 'Madrid', 'Paris'], 3],
      ['Serangga terbesar di dunia?', ['Kumbang badak', 'Capung raksasa', 'Kecoa Madagaskar', 'Tonggeret'], 0],
      ['Lapisan ozon melindungi dari...', ['Hujan asam', 'Sinar UV', 'Angin kencang', 'Suhu dingin'], 1],
      ['Siapa pelukis Mona Lisa?', ['Vincent van Gogh', 'Pablo Picasso', 'Leonardo da Vinci', 'Rembrandt'], 2],
      ['Timer 24 jam sehari penuh disebut...', ['Seminggu', 'Siklus harian/ritme sirkadian', 'Musim', 'Era'], 1],
      ['Internet pertama kali dikembangkan oleh...', ['ARPANET', 'CERN', 'NASA', 'DARPA'], 0],
      ['Piala Dunia sepak bola digelar tiap...', ['2 tahun', '3 tahun', '4 tahun', '5 tahun'], 2],
      ['Kutu buku artinya orang yang...', ['Sering sakit', 'Rajin baca', 'Suka serangga', 'Kolektor buku'], 1],
    ];
    const questions = BG.shuffle(ALL).slice(0, 10);
    let idx = 0, score = 0, over = false;
    el.innerHTML = '<div class="panel center-col" style="max-width:480px"><div class="hud" style="width:100%">' + BG.hudPill('Skor', 'tr-score') + '<div class="hud-pill">Soal <b id="tr-num">1</b>/10</div></div>' +
      '<div class="big-question" id="tr-q" style="font-size:1.15rem;min-height:3.2em"></div><div class="choices" id="tr-choices"></div></div>';
    const scoreEl = el.querySelector('#tr-score'), numEl = el.querySelector('#tr-num'), qEl = el.querySelector('#tr-q'), choicesEl = el.querySelector('#tr-choices');

    function render() {
      const [q, opts, correct] = questions[idx];
      numEl.textContent = idx + 1; qEl.textContent = q;
      choicesEl.innerHTML = opts.map((o, i) => '<button class="choice-btn" data-i="' + i + '">' + o + '</button>').join('');
    }
    choicesEl.addEventListener('click', e => {
      const btn = e.target.closest('.choice-btn'); if (!btn || over) return;
      const correct = questions[idx][2];
      const chosen = +btn.dataset.i;
      [...choicesEl.children].forEach(c => { if (+c.dataset.i === correct) c.classList.add('correct'); });
      if (chosen === correct) { score += 10; BG.sfx('good'); } else { btn.classList.add('wrong'); BG.sfx('bad'); }
      scoreEl.textContent = score; over = true;
      s.timeout(() => {
        over = false; idx++;
        if (idx >= questions.length) {
          BG.endScreen(el.querySelector('.panel').parentElement, { score, bestKey: 'trivia', title: 'Selesai!', sub: 'Benar ' + score / 10 + ' dari 10 soal.', onRetry: retry(el, s, 'trivia') });
        } else render();
      }, 700);
    });
    render();
  }
});

/* ============ 34. TEBAK KATA (hangman) ============ */
BG.register({
  id: 'hangman', name: 'Tebak Kata', desc: 'Tebak kata Indonesia sebelum Buggy tergantung!', cat: 'kuis', icon: 'hangman', tags: 'hangman tebak kata huruf',
  start(el, s) {
    const WORDS = ['PROGRAM', 'KOMPUTER', 'SERANGGA', 'PIXEL', 'GIGABYTE', 'ALGORITMA', 'KEYBOARD', 'MONITOR', 'INTERNET', 'DATABASE', 'KUCING', 'PISANG GORENG'.replace(' ', ''), 'GUNUNG API'.replace(' ', ''), 'LAUT BIRU'.replace(' ', '')];
    const word = BG.pick(WORDS).toUpperCase().replace(/[^A-Z]/g, '');
    let revealed = new Set(), wrong = 0, over = false;
    const MAX_WRONG = 6;
    el.innerHTML = '<div class="panel center-col" style="max-width:440px"><div class="hud" style="width:100%">' + BG.hudPill('Salah', 'hg-wrong') + '</div>' +
      '<svg viewBox="0 0 120 110" id="hg-art" style="width:150px"></svg>' +
      '<div id="hg-word" style="font-size:1.6rem;letter-spacing:.3em;font-weight:900;text-align:center;color:#ffd23f"></div>' +
      '<div id="hg-kb" style="display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:8px"></div></div>';
    const wrongEl = el.querySelector('#hg-wrong'), art = el.querySelector('#hg-art'), wordEl = el.querySelector('#hg-word'), kbEl = el.querySelector('#hg-kb');
    const STAGES = [
      '<path d="M10 100h100" stroke="#fff" stroke-width="4"/><path d="M30 100V10h45l-8 10 8 10H30" stroke="#fff" stroke-width="4" fill="none"/>',
      '<circle cx="67" cy="42" r="9" stroke="#ffd23f" stroke-width="4" fill="none"/>',
      '<path d="M67 51v22" stroke="#ffd23f" stroke-width="4"/>',
      '<path d="M67 56l-14 12M67 56l14 12" stroke="#ffd23f" stroke-width="4"/>',
      '<path d="M67 73l-12 20M67 73l12 20" stroke="#ffd23f" stroke-width="4"/>',
      '<path d="M63 38l-4 4M71 38l4 4" stroke="#ffd23f" stroke-width="3"/><circle cx="63" cy="34" r="1.4" fill="#ffd23f"/><circle cx="71" cy="34" r="1.4" fill="#ffd23f"/>',
      '<path d="M60 48q7 5 14 0" stroke="#ffd23f" stroke-width="3" fill="none"/>',
    ];
    function render() {
      wrongEl.textContent = wrong + '/' + MAX_WRONG;
      art.innerHTML = STAGES.slice(0, wrong + 1).join('');
      wordEl.textContent = word.split('').map(ch => revealed.has(ch) ? ch : '_').join(' ');
      kbEl.innerHTML = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(ch => {
        const used = revealed.has(ch) || tried.has(ch);
        return '<button class="choice-btn" data-k="' + ch + '" ' + (used ? 'disabled style="opacity:.35"' : 'style="padding:8px 0;min-width:34px;font-size:.85rem"') + '>' + ch + '</button>';
      }).join('');
    }
    const tried = new Set();
    kbEl.addEventListener('click', e => {
      const btn = e.target.closest('[data-k]'); if (!btn || tried.has(btn.dataset.k) || over) return;
      const ch = btn.dataset.k; tried.add(ch);
      if (word.includes(ch)) { revealed.add(ch); BG.sfx('good'); } else { wrong++; BG.sfx('bad'); }
      render();
      if (word.split('').every(c => revealed.has(c))) { over = true; win(true); }
      else if (wrong >= MAX_WRONG) { over = true; win(false); }
    });
    function win(won) {
      BG.endScreen(el.querySelector('.panel').parentElement, {
        score: won ? (MAX_WRONG - wrong + 1) * 100 : 0, bestKey: 'hangman', win: won,
        title: won ? 'Selamat!' : 'Tergantung!', sub: won ? 'Kata "' + word + '" berhasil ditebak.' : 'Katanya: ' + word,
        scoreLabel: won ? 'Benar' : 'Gagal',
        onRetry: retry(el, s, 'hangman'),
      });
    }
    render();
  }
});

/* ============ 35. HURUF HILANG ============ */
BG.register({
  id: 'missletter', name: 'Huruf Hilang', desc: 'Isi huruf yang hilang dari kata!', cat: 'kuis', icon: 'missletter', tags: 'huruf hilang lengkapi ejaan',
  start(el, s) {
    const WORDS = [
      ['SEKOLAH', 2], ['KOMPUTER', 2], ['SERANGGA', 3], ['PISANG', 2], ['GUNUNG', 1],
      ['BURUNG', 2], ['LAUTAN', 3], ['HUJAN', 1], ['KAMBING', 3], ['SEPEDA', 3],
    ];
    let idx = 0, score = 0, over = false;
    const questions = BG.shuffle(WORDS).slice(0, 8);
    el.innerHTML = '<div class="panel center-col" style="max-width:440px"><div class="hud" style="width:100%">' + BG.hudPill('Skor', 'ml-score') + '<div class="hud-pill">Soal <b id="ml-num">1</b>/8</div></div>' +
      '<div class="big-question" id="ml-word" style="letter-spacing:.35em;font-size:2rem"></div><div class="choices" id="ml-choices"></div></div>';
    const scoreEl = el.querySelector('#ml-score'), numEl = el.querySelector('#ml-num'), wordEl = el.querySelector('#ml-word'), choicesEl = el.querySelector('#ml-choices');

    function render() {
      const [word, missIdx] = questions[idx];
      numEl.textContent = idx + 1;
      wordEl.textContent = word.split('').map((ch, i) => i === missIdx ? '_' : ch).join(' ');
      const correct = word[missIdx];
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const opts = new Set([correct]);
      while (opts.size < 4) opts.add(alphabet[BG.rand(0, 25)]);
      choicesEl.innerHTML = BG.shuffle([...opts]).map(ch => '<button class="choice-btn" data-k="' + ch + '" style="font-size:1.4rem">' + ch + '</button>').join('');
    }
    choicesEl.addEventListener('click', e => {
      const btn = e.target.closest('.choice-btn'); if (!btn || over) return;
      const correct = questions[idx][0][questions[idx][1]];
      if (btn.dataset.k === correct) { btn.classList.add('correct'); score += 10; BG.sfx('good'); } else { btn.classList.add('wrong'); BG.sfx('bad'); }
      scoreEl.textContent = score; over = true;
      s.timeout(() => {
        over = false; idx++;
        if (idx >= questions.length) BG.endScreen(el.querySelector('.panel').parentElement, { score, bestKey: 'missletter', title: 'Selesai!', sub: 'Skor kamu ' + score + ' dari 80.', onRetry: retry(el, s, 'missletter') });
        else render();
      }, 650);
    });
    render();
  }
});

/* ============ 36. SUSUN KATA (anagram) ============ */
BG.register({
  id: 'anagram', name: 'Susun Kata', desc: 'Susun huruf acak jadi kata yang benar!', cat: 'kuis', icon: 'anagram', tags: 'anagram susun kata acak',
  start(el, s) {
    const WORDS = ['KUCING', 'PISANG', 'HUJAN', 'BURUNG', 'LAUTAN', 'GUNUNG', 'SEPATU', 'KOMPOR', 'MEJA', 'SEPEDA'].map(w => w.toUpperCase());
    let idx = 0, score = 0, over = false, word = '', built = '', rounds = 8;
    const list = BG.shuffle(WORDS).slice(0, rounds);
    el.innerHTML = '<div class="panel center-col" style="max-width:440px"><div class="hud" style="width:100%">' + BG.hudPill('Skor', 'an-score') + '<div class="hud-pill">Soal <b id="an-num">1</b>/' + rounds + '</div></div>' +
      '<div id="an-built" style="font-size:1.7rem;letter-spacing:.3em;min-height:1.5em;font-weight:900;color:#ffd23f;text-align:center"></div>' +
      '<div id="an-tiles" style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:8px 0"></div>' +
      '<div style="display:flex;gap:8px"><button class="btn btn-ghost" id="an-clear" style="padding:10px 16px">Hapus</button><button class="btn btn-lime" id="an-ok" style="padding:10px 20px">Jawab</button></div></div>';
    const scoreEl = el.querySelector('#an-score'), numEl = el.querySelector('#an-num'), builtEl = el.querySelector('#an-built'), tilesEl = el.querySelector('#an-tiles');

    function render() {
      numEl.textContent = idx + 1; builtEl.textContent = built.padEnd(word.length, '_').split('').join(' ');
      const letters = BG.shuffle(word.split(''));
      tilesEl.innerHTML = letters.map((ch, i) => '<button class="cell tile-num" data-ch="' + ch + '" data-i="' + i + '" style="width:46px;height:46px;font-size:1.3rem">' + ch + '</button>').join('');
    }
    function useLetter(btn) {
      if (built.length >= word.length) return;
      built += btn.dataset.ch; btn.disabled = true; btn.style.opacity = '.25'; BG.sfx('click');
      builtEl.textContent = built.padEnd(word.length, '_').split('').join(' ');
    }
    tilesEl.addEventListener('click', e => { const btn = e.target.closest('[data-ch]'); if (btn && !btn.disabled) useLetter(btn); });
    el.querySelector('#an-clear').addEventListener('click', () => { built = ''; render(); });
    el.querySelector('#an-ok').addEventListener('click', () => {
      if (over) return;
      const ok = built === word;
      if (ok) { score += 10; BG.sfx('good'); } else BG.sfx('bad');
      scoreEl.textContent = score; over = true;
      s.timeout(() => { over = false; idx++; if (idx >= list.length) BG.endScreen(el.querySelector('.panel').parentElement, { score, bestKey: 'anagram', title: 'Selesai!', sub: 'Skor kamu ' + score + ' dari ' + rounds * 10 + '.', onRetry: retry(el, s, 'anagram') }); else { word = list[idx]; built = ''; render(); } }, 450);
    });
    word = list[0]; render();
  }
});

/* ============ 37. UJI KETIK ============ */
BG.register({
  id: 'typing', name: 'Uji Ketik', desc: 'Seberapa cepat kamu mengetik? 45 detik!', cat: 'kuis', icon: 'keyboard', tags: 'typing ketik wpm keyboard',
  start(el, s) {
    const SAMPLE = 'Buggy si bug suka sekali makan daun segar di pagi hari sambil bernyanyi riang bersama teman teman di taman bunga yang indah dan penuh warna warni yang ceria';
    let timeLeft = 45, started = false, over = false;
    el.innerHTML = '<div class="panel center-col" style="max-width:520px"><div class="hud" style="width:100%">' + BG.hudPill('Waktu', 'ty-time') + BG.hudPill('WPM', 'ty-wpm') + '</div>' +
      '<p id="ty-text" style="background:#17102a;border:3px solid var(--ink);border-radius:12px;padding:12px;line-height:1.7;font-size:.95rem;color:#ffe98a">' + SAMPLE + '</p>' +
      '<textarea id="ty-input" rows="3" placeholder="Ketik di sini..." style="width:100%;background:#fff8ec;border:3px solid var(--ink);border-radius:12px;padding:10px;font-family:inherit;font-size:1rem;resize:none"></textarea></div>';
    const timeEl = el.querySelector('#ty-time'), wpmEl = el.querySelector('#ty-wpm'), input = el.querySelector('#ty-input');
    s.interval(() => {
      if (!started || over) return;
      timeLeft--; timeEl.textContent = timeLeft + 's';
      const words = input.value.trim().split(/\s+/).filter(Boolean).length;
      wpmEl.textContent = Math.round(words / ((45 - timeLeft) / 60 || 1));
      if (timeLeft <= 0) {
        over = true; input.disabled = true;
        const words = input.value.trim().split(/\s+/).filter(Boolean).length;
        const wpm = Math.round(words / 0.75);
        BG.endScreen(el.querySelector('.panel').parentElement, { score: wpm, bestKey: 'typing', title: 'Waktu Habis!', sub: 'Kecepatan: ' + wpm + ' kata per menit.', scoreLabel: wpm + ' WPM', onRetry: retry(el, s, 'typing') });
      }
    }, 1000);
    input.addEventListener('input', () => { started = true; });
    timeEl.textContent = timeLeft + 's';
  }
});

/* ============ 38. TEBAK ANGKA ============ */
BG.register({
  id: 'numberguess', name: 'Tebak Angka', desc: 'Aku mikir angka 1-100. 7 kesempatan!', cat: 'kuis', icon: 'hash', tags: 'tebak angka guess',
  start(el, s) {
    const target = BG.rand(1, 100);
    let attempts = 0, over = false;
    const MAX = 7;
    el.innerHTML = '<div class="panel center-col" style="max-width:380px;text-align:center"><h3>Tebak Angkaku!</h3>' +
      '<p style="color:#d9c9f2">Angka 1 sampai 100. Sisa kesempatan: <b id="ng-left" style="color:#ffd23f">7</b></p>' +
      '<input id="ng-input" type="number" min="1" max="100" placeholder="??" style="width:130px;text-align:center;font-size:2rem;font-weight:900;padding:10px;border-radius:14px;border:3px solid var(--ink);background:#fff8ec" />' +
      '<button class="btn btn-lime" id="ng-go">Tebak!</button>' +
      '<p id="ng-hint" style="min-height:1.5em;font-weight:800;color:#4ecdc4"></p></div>';
    const input = el.querySelector('#ng-input'), hint = el.querySelector('#ng-hint'), leftEl = el.querySelector('#ng-left');
    function guess() {
      if (over) return;
      const v = parseInt(input.value, 10);
      if (isNaN(v) || v < 1 || v > 100) { hint.textContent = 'Masukkan 1-100!'; return; }
      attempts++; leftEl.textContent = Math.max(0, MAX - attempts);
      if (v === target) {
        over = true; BG.sfx('win');
        BG.endScreen(el.querySelector('.panel').parentElement, { score: attempts, bestKey: 'numberguess', lowerBetter: true, title: 'Ketahuan!', sub: 'Angkanya memang ' + target + '.', scoreLabel: attempts + ' tebakan', onRetry: retry(el, s, 'numberguess') });
      } else if (attempts >= MAX) {
        over = true; BG.sfx('lose');
        BG.endScreen(el.querySelector('.panel').parentElement, { score: attempts, bestKey: 'numberguess', lowerBetter: true, win: false, title: 'Kesempatan Habis!', sub: 'Angkanya ' + target + '.', scoreLabel: 'Gagal', onRetry: retry(el, s, 'numberguess') });
      } else {
        hint.textContent = v < target ? '📈 Lebih besar!' : '📉 Lebih kecil!';
        BG.sfx('click'); input.value = ''; input.focus();
      }
    }
    el.querySelector('#ng-go').addEventListener('click', guess);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') guess(); });
  }
});


/* ============ 40. CARI YANG BEDA ============ */
BG.register({
  id: 'oddoneout', name: 'Cari yang Beda', desc: 'Satu bug beda sendiri. Mana dia?', cat: 'kuis', icon: 'oddoneout', tags: 'beda odd one out cari',
  start(el, s) {
    let round = 0, lives = 3, score = 0, over = false;
    const TOTAL = 12;
    el.innerHTML = '<div class="panel center-col" style="max-width:420px"><div class="hud" style="width:100%">' + BG.hudPill('Skor', 'oo-score') + BG.hudPill('Nyawa', 'oo-lives') + '<div class="hud-pill">Ronde <b id="oo-round">1</b>/' + TOTAL + '</div></div>' +
      '<div class="board" id="oo-board" style="grid-template-columns:repeat(4,74px);grid-auto-rows:74px"></div></div>';
    const boardEl = el.querySelector('#oo-board'), scoreEl = el.querySelector('#oo-score'), livesEl = el.querySelector('#oo-lives'), roundEl = el.querySelector('#oo-round');
    const COLORS = [['#b9f542', '#8fd41e'], ['#ff6b9d', '#e14b7d'], ['#4ecdc4', '#2bb3a9'], ['#ffd23f', '#d9a91e']];
    function bugSVG(color, size) {
      return '<svg viewBox="0 0 40 40" width="' + (size || 44) + '"><ellipse cx="20" cy="22" rx="13" ry="11" fill="' + color + '" stroke="#241239" stroke-width="2.5"/><circle cx="15" cy="18" r="2" fill="#241239"/><circle cx="25" cy="18" r="2" fill="#241239"/><path d="M20 11V5M14 13l-4-4M26 13l4-4" stroke="#241239" stroke-width="2.2" stroke-linecap="round"/></svg>';
    }
    function render() {
      round++; roundEl.textContent = round;
      const [base, diff] = BG.pick(COLORS);
      const oddCount = Math.min(16, 9 + Math.floor(round / 2));
      const oddIdx = BG.rand(0, oddCount - 1);
      let html = '';
      for (let i = 0; i < oddCount; i++) html += '<button class="cell" data-odd="' + (i === oddIdx ? 1 : 0) + '" style="background:#241239;padding:2px">' + bugSVG(i === oddIdx ? diff : base, 52) + '</button>';
      boardEl.innerHTML = html;
      boardEl.style.gridTemplateColumns = 'repeat(' + (oddCount > 12 ? 5 : 4) + ',72px)';
    }
    boardEl.addEventListener('click', e => {
      const cell = e.target.closest('.cell'); if (!cell || over) return;
      if (cell.dataset.odd === '1') { score += 10; scoreEl.textContent = score; BG.sfx('coin'); }
      else { lives--; livesEl.textContent = lives; BG.sfx('bad'); }
      if (lives <= 0 || round >= TOTAL) return finish();
      render();
    });
    function finish() {
      over = true;
      BG.endScreen(el.querySelector('.panel').parentElement, { score, bestKey: 'oddoneout', title: lives <= 0 ? 'Nyawa Habis!' : 'Selesai!', sub: 'Kamu menemukan ' + score / 10 + ' bug berbeda.', onRetry: retry(el, s, 'oddoneout') });
    }
    livesEl.textContent = lives; render();
  }
});

/* ============ 41. ANGKA TERBESAR (compare) ============ */
BG.register({
  id: 'compare', name: 'Angka Terbesar', desc: 'Ketuk angka yang PALING BESAR!', cat: 'kuis', icon: 'compare', tags: 'angka besar kecil bandingkan',
  start(el, s) {
    let score = 0, lives = 3, timeLeft = 30, over = false;
    el.innerHTML = '<div class="panel center-col" style="max-width:420px;text-align:center"><div class="hud" style="width:100%">' + BG.hudPill('Skor', 'cmp-score') + BG.hudPill('Nyawa', 'cmp-lives') + BG.hudPill('Waktu', 'cmp-time') + '</div>' +
      '<div style="display:flex;gap:14px;justify-content:center;margin:10px 0"><button class="choice-btn cmp-btn" style="font-size:2rem;min-width:110px;padding:26px 10px"></button><button class="choice-btn cmp-btn" style="font-size:2rem;min-width:110px;padding:26px 10px"></button></div></div>';
    const scoreEl = el.querySelector('#cmp-score'), livesEl = el.querySelector('#cmp-lives'), timeEl = el.querySelector('#cmp-time');
    const btns = [...el.querySelectorAll('.cmp-btn')];
    let a = 0, b = 0;
    function newRound() {
      a = BG.rand(10, 999); b = BG.rand(10, 999);
      if (a === b) b += 10;
      btns[0].textContent = a; btns[1].textContent = b;
    }
    btns.forEach((btn, i) => btn.addEventListener('click', () => {
      if (over) return;
      const mine = i === 0 ? a : b, other = i === 0 ? b : a;
      if (mine > other) { score += 10; BG.sfx('good'); } else { lives--; livesEl.textContent = lives; BG.sfx('bad'); if (lives <= 0) return finish(); }
      scoreEl.textContent = score; newRound();
    }));
    s.interval(() => { if (over) return; timeLeft--; timeEl.textContent = timeLeft + 's'; if (timeLeft <= 0) finish(); }, 1000);
    function finish() { if (over) return; over = true; BG.endScreen(el.querySelector('.panel').parentElement, { score, bestKey: 'compare', title: lives <= 0 ? 'Nyawa Habis!' : 'Waktu Habis!', sub: 'Skor kamu ' + score + '.', onRetry: retry(el, s, 'compare') }); }
    livesEl.textContent = lives; timeEl.textContent = timeLeft + 's'; newRound();
  }
});

/* ============ 42. WARNA vs KATA (stroop) ============ */
BG.register({
  id: 'stroop', name: 'Warna vs Kata', desc: 'Sebut WARNA TULISANNYA, bukan katanya!', cat: 'kuis', icon: 'stroop', tags: 'stroop warna kata otak',
  start(el, s) {
    const COLORS = [
      { name: 'MERAH', hex: '#ff5a5a' }, { name: 'BIRU', hex: '#4e9fff' },
      { name: 'HIJAU', hex: '#3ddc84' }, { name: 'KUNING', hex: '#ffd23f' },
    ];
    let score = 0, timeLeft = 30, over = false, correctName = '';
    el.innerHTML = '<div class="panel center-col" style="max-width:440px;text-align:center"><div class="hud" style="width:100%">' + BG.hudPill('Skor', 'str-score') + BG.hudPill('Waktu', 'str-time') + '</div>' +
      '<p style="color:#d9c9f2;font-size:.85rem">Tulisan di bawah ini warna apa?</p>' +
      '<div class="big-question" id="str-word" style="font-size:2.6rem;text-shadow:2px 2px 0 #241239"></div>' +
      '<div class="choices" id="str-choices"></div></div>';
    const scoreEl = el.querySelector('#str-score'), timeEl = el.querySelector('#str-time'), wordEl = el.querySelector('#str-word'), choicesEl = el.querySelector('#str-choices');

    function newRound() {
      const word = BG.pick(COLORS), ink = BG.pick(COLORS);
      correctName = ink.name;
      wordEl.textContent = word.name; wordEl.style.color = ink.hex;
      choicesEl.innerHTML = BG.shuffle(COLORS).map(c => '<button class="choice-btn" data-n="' + c.name + '">' + c.name + '</button>').join('');
    }
    choicesEl.addEventListener('click', e => {
      const btn = e.target.closest('.choice-btn'); if (!btn || over) return;
      if (btn.dataset.n === correctName) { score += 10; BG.sfx('good'); btn.classList.add('correct'); } else { BG.sfx('bad'); btn.classList.add('wrong'); }
      scoreEl.textContent = score;
      s.timeout(newRound, 200);
    });
    s.interval(() => { if (over) return; timeLeft--; timeEl.textContent = timeLeft + 's'; if (timeLeft <= 0) { over = true; BG.endScreen(el.querySelector('.panel').parentElement, { score, bestKey: 'stroop', title: 'Waktu Habis!', sub: 'Skor kamu ' + score + '.', onRetry: retry(el, s, 'stroop') }); } }, 1000);
    timeEl.textContent = timeLeft + 's'; newRound();
  }
});

/* ============ 43. HITUNG BUG ============ */
BG.register({
  id: 'countbugs', name: 'Hitung Bug', desc: 'Bug-nya ngumpet sebentar, hitung cepat!', cat: 'kuis', icon: 'countbugs', tags: 'hitung count bug lihat',
  start(el, s) {
    const W = 420, H = 300;
    let score = 0, round = 0; const TOTAL = 8;
    el.innerHTML = '<div class="stage"><div class="hud">' + BG.hudPill('Skor', 'cb-score') + '<div class="hud-pill">Ronde <b id="cb-round">1</b>/' + TOTAL + '</div></div>' +
      '<canvas width="' + W + '" height="' + H + '"></canvas>' +
      '<div id="cb-choices" class="choices" style="margin-top:10px;grid-template-columns:repeat(4,1fr)"></div></div>';
    const canvas = el.querySelector('canvas'), ctx = canvas.getContext('2d');
    const scoreEl = el.querySelector('#cb-score'), roundEl = el.querySelector('#cb-round'), choicesEl = el.querySelector('#cb-choices');
    let bugs = [], answer = 0, phase = 'show', over = false;

    function newRound() {
      round++; roundEl.textContent = round;
      answer = BG.rand(3, 12);
      bugs = Array.from({ length: answer }, () => ({ x: BG.rand(24, W - 24), y: BG.rand(24, H - 24) }));
      phase = 'show';
      s.timeout(() => { phase = 'ask'; draw(); showChoices(); }, 1400);
      draw();
    }
    function draw() {
      ctx.fillStyle = '#14532d'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      for (let i = 0; i < 20; i++) { ctx.beginPath(); ctx.arc((i * 97) % W, (i * 57) % H, 3, 0, Math.PI * 2); ctx.fill(); }
      if (phase === 'show') bugs.forEach(b => drawMiniBug(ctx, b.x, b.y, 12, '#b9f542'));
      else { ctx.fillStyle = '#fff'; ctx.font = '900 26px Trebuchet MS'; ctx.textAlign = 'center'; ctx.fillText('Berapa bug tadi?', W / 2, H / 2); }
    }
    function showChoices() {
      const opts = new Set([answer]);
      while (opts.size < 4) opts.add(answer + BG.rand(-3, 3) > 0 ? answer + BG.rand(-3, 3) : answer + 4);
      choicesEl.innerHTML = BG.shuffle([...opts]).map(v => '<button class="choice-btn" data-v="' + v + '" style="font-size:1.3rem">' + v + '</button>').join('');
    }
    choicesEl.addEventListener('click', e => {
      const btn = e.target.closest('.choice-btn'); if (!btn || over || phase !== 'ask') return;
      phase = 'reveal';
      if (+btn.dataset.v === answer) { score += 10; BG.sfx('good'); btn.classList.add('correct'); } else { BG.sfx('bad'); btn.classList.add('wrong'); }
      scoreEl.textContent = score;
      s.timeout(() => { if (round >= TOTAL) { over = true; BG.endScreen(canvas.parentElement, { score, bestKey: 'countbugs', title: 'Selesai!', sub: 'Kamu menjawab ' + score / 10 + ' dari ' + TOTAL + ' dengan benar.', onRetry: retry(el, s, 'countbugs') }); } else newRound(); }, 700);
    });
    newRound();
  }
});

/* ============ 44. BATU GUNTING KERTAS ============ */
BG.register({
  id: 'rps', name: 'Batu Gunting Kertas', desc: '5 ronde melawan Buggy. Mana yang menang?', cat: 'kuis', icon: 'rps', tags: 'batu gunting kertas suit',
  start(el, s) {
    const MOVES = [
      { id: 'batu', label: '🪨 Batu' }, { id: 'gunting', label: '✂️ Gunting' }, { id: 'kertas', label: '📄 Kertas' },
    ];
    const BEATS = { batu: 'gunting', gunting: 'kertas', kertas: 'batu' };
    let round = 0, wins = 0;
    el.innerHTML = '<div class="panel center-col" style="max-width:420px;text-align:center"><div class="hud" style="width:100%">' + BG.hudPill('Menang', 'rps-wins') + '<div class="hud-pill">Ronde <b id="rps-round">1</b>/5</div></div>' +
      '<div style="font-size:4rem;margin:6px" id="rps-face">🐛</div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">' + MOVES.map(m => '<button class="btn btn-ghost rps-btn" data-m="' + m.id + '" style="font-size:1rem">' + m.label + '</button>').join('') + '</div>' +
      '<p id="rps-msg" style="min-height:1.4em;font-weight:800;color:#ffd23f">Buggy menunggu tantanganmu...</p></div>';
    const winsEl = el.querySelector('#rps-wins'), roundEl = el.querySelector('#rps-round'), msg = el.querySelector('#rps-msg'), face = el.querySelector('#rps-face');
    const EMOJI = { batu: '🪨', gunting: '✂️', kertas: '📄' };
    el.querySelectorAll('.rps-btn').forEach(btn => btn.addEventListener('click', () => {
      round++; roundEl.textContent = Math.min(round + 1, 5);
      const mine = btn.dataset.m, theirs = BG.pick(MOVES).id;
      face.textContent = EMOJI[theirs];
      if (mine === theirs) { msg.textContent = 'Seri!'; BG.sfx('click'); }
      else if (BEATS[mine] === theirs) { wins++; winsEl.textContent = wins; msg.textContent = 'Kamu menang ronde ini!'; BG.sfx('good'); }
      else { msg.textContent = 'Buggy menang ronde ini!'; BG.sfx('bad'); }
      if (round >= 5) {
        el.querySelectorAll('.rps-btn').forEach(b => b.disabled = true);
        BG.endScreen(el.querySelector('.panel').parentElement, { score: wins * 20, bestKey: 'rps', win: wins >= 3, title: wins >= 3 ? 'Menang!' : 'Kalah!', sub: 'Kamu menang ' + wins + ' dari 5 ronde.', scoreLabel: wins + '/5', onRetry: retry(el, s, 'rps') });
      }
    }));
  }
});



/* ============ 47. BUG CLICKER (idle) ============ */
BG.register({
  id: 'clicker', name: 'Bug Clicker', desc: 'Ketuk bug-nya, kumpulkan sebanyak-banyaknya!', cat: 'kuis', icon: 'clicker', tags: 'clicker idle tap kumpul',
  start(el, s) {
    let bugs = 0, perTap = 1, autoRate = 0, totalEarned = 0;
    const autoCost = () => Math.floor(25 * Math.pow(1.6, autoCount));
    const tapCost = () => Math.floor(50 * Math.pow(1.7, tapCount));
    let autoCount = 0, tapCount = 0;
    el.innerHTML = '<div class="panel center-col" style="max-width:420px;text-align:center">' +
      '<div style="font-size:.85rem;color:#b8a6d9;letter-spacing:2px">BUG TERKUMPUL</div>' +
      '<div id="ck-count" style="font-size:3rem;font-weight:900;color:#ffd23f;text-shadow:3px 3px 0 #241239">0</div>' +
      '<div id="ck-rate" style="font-size:.8rem;color:#4ecdc4;font-weight:700">+1 per ketukan</div>' +
      '<button id="ck-bug" style="background:none;border:none;cursor:pointer;width:150px;height:150px;transition:transform .08s" aria-label="Ketuk bug"></button>' +
      '<div style="display:flex;flex-direction:column;gap:8px;width:100%">' +
        '<button class="btn btn-teal btn-block" id="ck-auto" style="font-size:.8rem"></button>' +
        '<button class="btn btn-pink btn-block" id="ck-tap" style="font-size:.8rem"></button>' +
      '</div></div>';
    const countEl = el.querySelector('#ck-count'), rateEl = el.querySelector('#ck-rate'), bugBtn = el.querySelector('#ck-bug'), autoBtn = el.querySelector('#ck-auto'), tapBtn = el.querySelector('#ck-tap');
    bugBtn.innerHTML = window.BG_MASCOT;
    bugBtn.addEventListener('pointerdown', () => {
      bugs += perTap; totalEarned += perTap;
      bugBtn.style.transform = 'scale(.88)'; setTimeout(() => bugBtn.style.transform = 'scale(1)', 80);
      BG.sfx('pop'); render();
    });
    autoBtn.addEventListener('click', () => { if (bugs >= autoCost()) { bugs -= autoCost(); autoCount++; autoRate += 1; BG.sfx('coin'); render(); } else BG.sfx('bad'); });
    tapBtn.addEventListener('click', () => { if (bugs >= tapCost()) { bugs -= tapCost(); tapCount++; perTap += 1; BG.sfx('coin'); render(); } else BG.sfx('bad'); });
    s.interval(() => { if (autoRate > 0) { bugs += autoRate; totalEarned += autoRate; render(); } }, 1000);
    function render() {
      countEl.textContent = Math.floor(bugs);
      rateEl.textContent = '+' + perTap + ' per ketukan • +' + autoRate + '/detik';
      autoBtn.textContent = 'Auto Kutu (+1/detik) — ' + autoCost() + ' bug';
      tapBtn.textContent = 'Kekuatan Ketuk (+1) — ' + tapCost() + ' bug';
    }
    render();
  }
});

/* ============ 48. CARI BUG (hidden) ============ */
BG.register({
  id: 'bughunt', name: 'Cari Bug!', desc: 'Seekor bug sembunyi di antara bunga. Temukan!', cat: 'kuis', icon: 'bughunt', tags: 'cari bug hidden seek find',
  start(el, s) {
    let round = 0, score = 0; const TOTAL = 8;
    el.innerHTML = '<div class="panel center-col" style="max-width:440px"><div class="hud" style="width:100%">' + BG.hudPill('Skor', 'bh-score') + '<div class="hud-pill">Ronde <b id="bh-round">1</b>/' + TOTAL + '</div></div>' +
      '<p style="text-align:center;color:#d9c9f2;font-size:.85rem">Ketuk bunga satu per satu sampai ketemu bugnya!</p>' +
      '<div class="board" id="bh-board" style="grid-template-columns:repeat(5,64px);grid-auto-rows:64px"></div></div>';
    const boardEl = el.querySelector('#bh-board'), scoreEl = el.querySelector('#bh-score'), roundEl = el.querySelector('#bh-round');
    let bugIdx = 0, over = false;
    function flowerSVG(open, isBug) {
      if (open && isBug) return '<svg viewBox="0 0 48 48" width="52"><ellipse cx="24" cy="26" rx="12" ry="10" fill="#b9f542" stroke="#241239" stroke-width="2.5"/><circle cx="20" cy="23" r="1.8" fill="#241239"/><circle cx="28" cy="23" r="1.8" fill="#241239"/><path d="M24 16v-5M19 18l-4-4M29 18l4-4" stroke="#241239" stroke-width="2" stroke-linecap="round"/></svg>';
      if (open) return '<svg viewBox="0 0 48 48" width="52"><circle cx="24" cy="24" r="9" fill="#ffd23f" stroke="#241239" stroke-width="2.5"/><g fill="#ff6b9d" stroke="#241239" stroke-width="2"><circle cx="24" cy="8" r="6"/><circle cx="24" cy="40" r="6"/><circle cx="8" cy="24" r="6"/><circle cx="40" cy="24" r="6"/><circle cx="13" cy="13" r="6"/><circle cx="35" cy="13" r="6"/><circle cx="13" cy="35" r="6"/><circle cx="35" cy="35" r="6"/></g></svg>';
      return '<svg viewBox="0 0 48 48" width="52"><path d="M24 44V24" stroke="#166534" stroke-width="4"/><circle cx="24" cy="14" r="11" fill="#f472b6" stroke="#241239" stroke-width="2.5"/><circle cx="24" cy="14" r="4" fill="#ffd23f" stroke="#241239" stroke-width="2"/></svg>';
    }
    const opened = new Set();
    function render() {
      roundEl.textContent = round + 1;
      boardEl.innerHTML = Array.from({ length: 15 }, (_, i) => {
        const isOpen = opened.has(i);
        return '<button class="cell" data-i="' + i + '" style="background:#14532d;border-color:#166534">' + flowerSVG(isOpen, i === bugIdx) + '</button>';
      }).join('');
    }
    boardEl.addEventListener('click', e => {
      const cell = e.target.closest('.cell'); if (!cell || over) return;
      const i = +cell.dataset.i;
      if (opened.has(i)) return;
      opened.add(i);
      if (i === bugIdx) {
        score += 10; scoreEl.textContent = score; BG.sfx('coin');
        s.timeout(() => {
          if (round + 1 >= TOTAL) { over = true; BG.endScreen(el.querySelector('.panel').parentElement, { score, bestKey: 'bughunt', title: 'Master Pelacak!', sub: 'Semua bug ketemu: ' + score + ' poin.', onRetry: retry(el, s, 'bughunt') }); }
          else { round++; bugIdx = BG.rand(0, 14); opened.clear(); render(); }
        }, 550);
      } else BG.sfx('click');
      render();
    });
    bugIdx = BG.rand(0, 14); render();
  }
});

/* ============ 49. TAP WARNA ============ */
BG.register({
  id: 'colortap', name: 'Tap Warna!', desc: 'Ketuk tombol sesuai WARNA yang disebut!', cat: 'kuis', icon: 'colortap', tags: 'warna tap color cepat',
  start(el, s) {
    const COLORS = [
      { name: 'MERAH', hex: '#ff5a5a' }, { name: 'BIRU', hex: '#4e9fff' }, { name: 'HIJAU', hex: '#3ddc84' },
      { name: 'KUNING', hex: '#ffd23f' }, { name: 'UNGU', hex: '#a78bfa' }, { name: 'ORANYE', hex: '#fb923c' },
    ];
    let score = 0, timeLeft = 30, over = false, target = null;
    el.innerHTML = '<div class="panel center-col" style="max-width:420px;text-align:center"><div class="hud" style="width:100%">' + BG.hudPill('Skor', 'ct-score') + BG.hudPill('Waktu', 'ct-time') + '</div>' +
      '<p style="color:#d9c9f2;font-size:.85rem">Ketuk tombol warna:</p>' +
      '<div class="big-question" id="ct-target" style="font-size:2rem"></div>' +
      '<div id="ct-pads" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:100%"></div></div>';
    const scoreEl = el.querySelector('#ct-score'), timeEl = el.querySelector('#ct-time'), targetEl = el.querySelector('#ct-target'), padsEl = el.querySelector('#ct-pads');
    function newRound() {
      target = BG.pick(COLORS);
      targetEl.textContent = target.name; targetEl.style.color = target.hex;
    }
    padsEl.innerHTML = COLORS.map(c => '<button class="ct-pad" data-n="' + c.name + '" style="height:70px;border-radius:14px;border:3px solid var(--ink);background:' + c.hex + ';cursor:pointer"></button>').join('');
    padsEl.addEventListener('pointerdown', e => {
      const pad = e.target.closest('.ct-pad'); if (!pad || over) return;
      if (pad.dataset.n === target.name) { score += 10; BG.sfx('good'); } else { BG.sfx('bad'); }
      scoreEl.textContent = score; newRound();
    });
    s.interval(() => { if (over) return; timeLeft--; timeEl.textContent = timeLeft + 's'; if (timeLeft <= 0) { over = true; BG.endScreen(el.querySelector('.panel').parentElement, { score, bestKey: 'colortap', title: 'Waktu Habis!', sub: 'Skor kamu ' + score + '.', onRetry: retry(el, s, 'colortap') }); } }, 1000);
    timeEl.textContent = timeLeft + 's'; newRound();
  }
});

/* ============ 50. KLIK TERCEPAT (CPS) ============ */
BG.register({
  id: 'cps', name: 'Klik Tercepat!', desc: 'Klik sebanyak-banyaknya dalam 5 detik!', cat: 'kuis', icon: 'mouse', tags: 'cps klik cepat click',
  start(el, s) {
    let clicks = 0, timeLeft = 5, running = false, over = false, timer = null;
    el.innerHTML = '<div class="panel center-col" style="max-width:380px;text-align:center"><div style="font-size:.85rem;letter-spacing:2px;color:#b8a6d9">KLIK SECEPATNYA!</div>' +
      '<button id="cps-btn" style="width:170px;height:170px;border-radius:50%;border:5px solid var(--ink);background:radial-gradient(circle at 40% 35%,#ff8fb3,#ff6b9d);cursor:pointer;font-family:inherit;font-weight:900;font-size:1.2rem;color:var(--ink);box-shadow:var(--hard-shadow)">KLIK!</button>' +
      '<div id="cps-count" style="font-size:2.4rem;font-weight:900;color:#ffd23f">0</div>' +
      '<div id="cps-time" style="color:#4ecdc4;font-weight:800">5.0 detik — ketukan pertama mulai!</div></div>';
    const btn = el.querySelector('#cps-btn'), countEl = el.querySelector('#cps-count'), timeEl = el.querySelector('#cps-time');
    btn.addEventListener('pointerdown', () => {
      if (over) return;
      if (!running) {
        running = true;
        const startedAt = Date.now();
        timer = s.interval(() => {
          const remain = Math.max(0, 5 - (Date.now() - startedAt) / 1000);
          timeEl.textContent = remain.toFixed(1) + ' detik';
          if (remain <= 0) {
            over = true; clearInterval(timer);
            const cps = (clicks / 5).toFixed(1);
            BG.endScreen(el.querySelector('.panel').parentElement, { score: clicks, bestKey: 'cps', title: 'Selesai!', sub: 'Kecepatan kamu ' + cps + ' klik per detik!', scoreLabel: clicks + ' klik', onRetry: retry(el, s, 'cps') });
          }
        }, 100);
      }
      clicks++; countEl.textContent = clicks; BG.sfx('click');
    });
  }
});

/* ============ 51. DERET ANGKA ============ */
BG.register({
  id: 'numseries', name: 'Deret Angka', desc: 'Angka berikutnya... berapa?', cat: 'kuis', icon: 'series', tags: 'deret angka pola bilangan',
  start(el, s) {
    let round = 0, score = 0; const TOTAL = 8;
    el.innerHTML = '<div class="panel center-col" style="max-width:440px"><div class="hud" style="width:100%">' + BG.hudPill('Skor', 'ns-score') + '<div class="hud-pill">Soal <b id="ns-round">1</b>/' + TOTAL + '</div></div>' +
      '<div class="big-question" id="ns-q" style="letter-spacing:.1em"></div><div class="choices" id="ns-choices"></div></div>';
    const scoreEl = el.querySelector('#ns-score'), roundEl = el.querySelector('#ns-round'), qEl = el.querySelector('#ns-q'), choicesEl = el.querySelector('#ns-choices');

    function makeSeries() {
      const type = BG.pick(['add', 'mul', 'square', 'alt']);
      if (type === 'add') { const start = BG.rand(1, 20), d = BG.rand(2, 9); return { seq: [start, start+d, start+2*d, start+3*d], next: start+4*d }; }
      if (type === 'mul') { const start = BG.rand(2, 5), m = BG.pick([2, 3]); return { seq: [start, start*m, start*m*m, start*m*m*m], next: start*m*m*m*m }; }
      if (type === 'square') { const k = BG.rand(2, 6); return { seq: [k*k, (k+1)*(k+1), (k+2)*(k+2)], next: (k+3)*(k+3) }; }
      const a = BG.rand(1, 9), d = BG.rand(2, 6);
      return { seq: [a, a + d, a, a + 2*d], next: a + 3*d };
    }
    let current = null, over = false;
    function newRound() {
      round++; roundEl.textContent = round; current = makeSeries();
      qEl.textContent = current.seq.join(',  ') + ',  ?';
      const opts = new Set([current.next]);
      while (opts.size < 4) opts.add(current.next + BG.rand(-8, 12) + (Math.random() < .3 ? 5 : 0));
      choicesEl.innerHTML = BG.shuffle([...opts]).map(v => '<button class="choice-btn" data-v="' + v + '" style="font-size:1.3rem">' + v + '</button>').join('');
    }
    choicesEl.addEventListener('click', e => {
      const btn = e.target.closest('.choice-btn'); if (!btn || over || !current) return;
      const correct = +btn.dataset.v === current.next;
      if (correct) { score += 10; BG.sfx('good'); btn.classList.add('correct'); } else { BG.sfx('bad'); btn.classList.add('wrong'); }
      scoreEl.textContent = score; over = true;
      s.timeout(() => {
        over = false;
        if (round >= TOTAL) BG.endScreen(el.querySelector('.panel').parentElement, { score, bestKey: 'numseries', title: 'Selesai!', sub: 'Kamu menebak ' + score / 10 + ' dari ' + TOTAL + ' dengan benar.', onRetry: retry(el, s, 'numseries') });
        else newRound();
      }, 600);
    });
    newRound();
  }
});

/* ============ 52. KEHIDUPAN BUG (Game of Life) ============ */
BG.register({
  id: 'gameoflife', name: 'Kehidupan Bug', desc: 'Simulasi koloni bug: lahir, hidup, punah!', cat: 'puzzle', icon: 'life', tags: 'game of life simulasi cellular',
  start(el, s) {
    const COLS = 40, ROWS = 26, CELL = 12;
    el.innerHTML = '<div class="panel center-col" style="max-width:520px"><div class="hud" style="width:100%">' + BG.hudPill('Generasi', 'gol-gen') + BG.hudPill('Populasi', 'gol-pop') + '</div>' +
      '<canvas id="gol-canvas" width="' + COLS * CELL + '" height="' + ROWS * CELL + '" style="border:3px solid var(--ink);border-radius:12px;max-width:100%;touch-action:none;cursor:crosshair"></canvas>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">' +
        '<button class="btn btn-lime" id="gol-play">Jalan ▶</button>' +
        '<button class="btn btn-teal" id="gol-step">Langkah 1</button>' +
        '<button class="btn btn-ghost" id="gol-rand">Acak</button>' +
        '<button class="btn btn-ghost" id="gol-clear">Bersihkan</button>' +
      '</div>' +
      '<p style="font-size:.8rem;color:#b8a6d9;text-align:center">Ketuk sel untuk hidup/mati. Aturan Conway: 3 tetangga = lahir, 2-3 = bertahan.</p></div>';
    const canvas = el.querySelector('#gol-canvas'), ctx = canvas.getContext('2d');
    const genEl = el.querySelector('#gol-gen'), popEl = el.querySelector('#gol-pop'), playBtn = el.querySelector('#gol-play');
    let grid = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    let running = false, gen = 0, lastStep = 0;

    function randomize() { grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => Math.random() < 0.24)); gen = 0; }
    function step() {
      const next = grid.map(row => row.slice());
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        let n = 0;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const rr = (r + dr + ROWS) % ROWS, cc = (c + dc + COLS) % COLS;
          if (grid[rr][cc]) n++;
        }
        next[r][c] = n === 3 || (grid[r][c] && n === 2);
      }
      grid = next; gen++;
    }
    function render() {
      ctx.fillStyle = '#0d1a0d'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      let pop = 0;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c]) {
        pop++; ctx.fillStyle = (r + c) % 3 === 0 ? '#a3e635' : '#65a30d';
        ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
      }
      genEl.textContent = gen; popEl.textContent = pop;
    }
    playBtn.addEventListener('click', () => { running = !running; playBtn.textContent = running ? 'Jeda ⏸' : 'Jalan ▶'; BG.sfx('click'); });
    el.querySelector('#gol-step').addEventListener('click', () => { step(); render(); BG.sfx('click'); });
    el.querySelector('#gol-rand').addEventListener('click', () => { randomize(); render(); BG.sfx('pop'); });
    el.querySelector('#gol-clear').addEventListener('click', () => { grid = grid.map(r => r.map(() => false)); gen = 0; render(); BG.sfx('click'); });
    s.on(canvas, 'pointerdown', e => {
      const r = canvas.getBoundingClientRect();
      const c = Math.floor((e.clientX - r.left) * COLS / r.width), rr = Math.floor((e.clientY - r.top) * ROWS / r.height);
      if (rr >= 0 && rr < ROWS && c >= 0 && c < COLS) { grid[rr][c] = !grid[rr][c]; render(); BG.sfx('click'); }
    });
    s.raf(t => { if (running && t - lastStep > 140) { step(); render(); lastStep = t; } });
    randomize(); render();
  }
});
