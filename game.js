/* ===========================================
   ASDF 리듬게임 - Game Logic (game.js)
   =========================================== */

'use strict';

// ========================
// 1. CONSTANTS
// ========================

const DIR_SYMBOLS = { left: '←', down: '↓', up: '↑', right: '→' };
const DIR_KEYS = {
  // ASDF keys (main)
  a: 'left',  s: 'down',  d: 'up',  f: 'right',
  A: 'left',  S: 'down',  D: 'up',  F: 'right',
  // Arrow keys (backup)
  ArrowLeft: 'left', ArrowDown: 'down', ArrowUp: 'up', ArrowRight: 'right'
};
const LANE_ORDER = ['left', 'down', 'up', 'right'];
const PERFECT_WINDOW = 70;   // ms
const GOOD_WINDOW    = 150;  // ms
const MISS_WINDOW    = 220;  // ms
const TRAVEL_TIME    = 1800; // ms for note to travel full height

const LANE_L_POS = { left: '0%', down: '25%', up: '50%', right: '75%' };

// ========================
// 1.5 AUDIO MANAGER
// ========================

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.25;
    this.masterGain.connect(this.ctx.destination);
  }

  playHit(type) {
    if (!this.ctx) return;
    // Simple synth blip
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(type === 'perfect' ? 880 : 440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.1);
    
    g.gain.setValueAtTime(0.3, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playMiss() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 0.2);
    
    g.gain.setValueAtTime(0.2, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }
}

const audio = new AudioManager();

// ========================
// 2. NOTE GENERATORS
// ========================

function bpmToMs(bpm, beat) { return (60000 / bpm) * beat; }

function generateSongNotes_easy(bpm) {
  const pattern = [
    [0,'left'],[1,'right'],[2,'up'],[3,'down'],
    [4,'left'],[4.5,'right'],[5,'up'],[6,'down'],[7,'left'],
    [8,'right'],[9,'up'],[9.5,'down'],[10,'left'],[11,'right'],
    [12,'up'],[13,'down'],[14,'left'],[14.5,'up'],[15,'right'],
    [16,'left'],[16.5,'right'],[17,'up'],[18,'down'],[19,'left'],
    [20,'right'],[21,'up'],[22,'left'],[22.5,'down'],[23,'right'],
    [24,'up'],[24.5,'left'],[25,'down'],[26,'right'],[27,'up'],
    [28,'left'],[28.5,'down'],[29,'right'],[30,'up'],[30.5,'left'],[31,'right']
  ];
  return pattern.map(([beat, dir]) => ({ time: bpmToMs(bpm, beat) + 1500, direction: dir }));
}

function generateSongNotes_normal(bpm) {
  const pattern = [
    [0,'left'],[0.5,'right'],[1,'down'],[1.5,'up'],
    [2,'left'],[2.5,'down'],[3,'up'],[3.5,'right'],
    [4,'left'],[4.25,'down'],[4.5,'up'],[4.75,'right'],
    [5,'left'],[5.5,'right'],[6,'down'],[6.5,'up'],
    [7,'right'],[7.5,'left'],[8,'up'],[8.25,'down'],[8.5,'left'],
    [9,'right'],[9.5,'up'],[10,'down'],[10.25,'left'],[10.5,'right'],
    [11,'up'],[11.5,'down'],[12,'left'],[12.25,'right'],[12.5,'up'],
    [13,'down'],[13.5,'left'],[14,'right'],[14.25,'up'],[14.5,'down'],
    [15,'left'],[15.5,'right'],
    [16,'left'],[16.25,'down'],[16.5,'up'],[16.75,'right'],
    [17,'left'],[17.5,'right'],[18,'down'],[18.5,'up'],
    [19,'right'],[19.25,'left'],[19.5,'down'],[19.75,'up'],
    [20,'left'],[20.5,'down'],[21,'up'],[21.5,'right'],
    [22,'left'],[22.25,'down'],[22.5,'up'],[22.75,'right'],
    [23,'left'],[23.5,'right'],[24,'up'],[24.5,'down'],
    [25,'left'],[25.5,'right'],[26,'up'],[26.5,'down'],
    [27,'left'],[27.25,'down'],[27.5,'up'],[27.75,'right'],
    [28,'left'],[28.5,'right'],[29,'down'],[29.5,'up'],
    [30,'left'],[30.5,'down'],[31,'right'],[31.5,'up']
  ];
  return pattern.map(([beat, dir]) => ({ time: bpmToMs(bpm, beat) + 1500, direction: dir }));
}

function generateSongNotes_hard(bpm) {
  const dirs = ['left','down','up','right'];
  const beats = [];
  for (let b = 0; b < 32; b += 0.25) {
    if (Math.random() < 0.65) {
      beats.push([b, dirs[Math.floor(Math.random() * 4)]]);
      if (Math.random() < 0.25) {
        const d2 = dirs[Math.floor(Math.random() * 4)];
        if (beats[beats.length - 1][1] !== d2) beats.push([b, d2]);
      }
    }
  }
  const seen = new Set();
  const notes = [];
  for (const [beat, dir] of beats.sort((a, b) => a[0] - b[0])) {
    const key = `${beat}_${dir}`;
    if (!seen.has(key)) {
      seen.add(key);
      notes.push({ time: bpmToMs(bpm, beat) + 1500, direction: dir });
    }
  }
  return notes;
}

// ========================
// 3. DEFAULT SONG DATA
// (defined after functions — no hoisting issue)
// ========================

const DEFAULT_SONGS = [
  {
    id: 'song_001',
    title: '초록빛 비트',
    artist: 'asdf Team',
    bpm: 128,
    difficulty: 'easy',
    stars: 2,
    color: '#32CD32',
    emoji: '🍀',
    notes: generateSongNotes_easy(128)
  },
  {
    id: 'song_002',
    title: '리듬의 숲',
    artist: 'asdf Team',
    bpm: 140,
    difficulty: 'normal',
    stars: 3,
    color: '#9ACD32',
    emoji: '🌿',
    notes: generateSongNotes_normal(140)
  },
  {
    id: 'song_003',
    title: '그린 스톰',
    artist: 'asdf Team',
    bpm: 160,
    difficulty: 'hard',
    stars: 5,
    color: '#008080',
    emoji: '⚡',
    notes: generateSongNotes_hard(160)
  }
];

// ========================
// 4. SONG STORE
// ========================

const SongStore = {
  _key: 'asdf_songs_v1',
  getAll() {
    const saved = JSON.parse(localStorage.getItem(this._key) || '[]');
    return [...DEFAULT_SONGS, ...saved];
  },
  getCustom() {
    return JSON.parse(localStorage.getItem(this._key) || '[]');
  },
  save(song) {
    const songs = this.getCustom();
    const idx = songs.findIndex(s => s.id === song.id);
    if (idx >= 0) songs[idx] = song;
    else songs.push(song);
    localStorage.setItem(this._key, JSON.stringify(songs));
  },
  delete(id) {
    const songs = this.getCustom().filter(s => s.id !== id);
    localStorage.setItem(this._key, JSON.stringify(songs));
  }
};

// ========================
// 5. DOM HELPERS
// (lazy — only used inside DOMContentLoaded)
// ========================

const $ = id => document.getElementById(id);

let screens = null;

function initScreens() {
  screens = {
    menu:   $('screen-menu'),
    select: $('screen-select'),
    game:   $('screen-game'),
    result: $('screen-result'),
    dev:    $('screen-dev')
  };
}

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ========================
// 6. MAIN MENU
// ========================

function initMenu() {
  spawnMenuParticles();
  $('btnPlay').addEventListener('click', () => {
    showScreen('select');
    renderSongList();
  });
  $('btnDev').addEventListener('click', () => {
    showScreen('dev');
    renderDevSavedList();
    renderTimeline();
  });
}

function spawnMenuParticles() {
  const container = $('menuParticles');
  const arrows = ['←','↓','↑','→'];
  const colors = ['#32CD32','#9ACD32','#98FB98','#2E8B57','#008080'];

  for (let i = 0; i < 30; i++) {
    const el = document.createElement('div');
    el.className = 'bg-arrow';
    el.textContent = arrows[Math.floor(Math.random() * 4)];
    el.style.left = Math.random() * 100 + 'vw';
    el.style.color = colors[Math.floor(Math.random() * 5)];
    el.style.fontSize = (16 + Math.random() * 28) + 'px';
    el.style.animationDuration = (4 + Math.random() * 8) + 's';
    el.style.animationDelay = (-Math.random() * 10) + 's';
    container.appendChild(el);
  }
}

// ========================
// 7. SONG SELECT
// ========================

let selectedSong = null;
let selectedDiff = 'easy';

function renderSongList() {
  const list = $('songList');
  const allSongs = SongStore.getAll();
  list.innerHTML = '';

  allSongs.forEach(song => {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.style.setProperty('--col', song.color || '#32CD32');
    if (selectedSong && selectedSong.id === song.id) card.classList.add('selected');

    const stars = '★'.repeat(song.stars || 1) + '☆'.repeat(5 - (song.stars || 1));
    const diffClass = song.difficulty || 'normal';
    const diffLabel = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD' }[diffClass] || 'NORMAL';

    card.innerHTML = `
      <div class="card-art" style="background:linear-gradient(135deg,${song.color || '#2E8B57'},#008080)">
        ${song.emoji || '🎵'}
      </div>
      <div class="card-title">${escHtml(song.title)}</div>
      <div class="card-artist">${escHtml(song.artist || '')}</div>
      <div class="card-diff">
        <span class="star">${stars}</span>
        <span class="diff-label ${diffClass}">${diffLabel}</span>
      </div>
    `;
    card.addEventListener('click', () => selectSong(song));
    list.appendChild(card);
  });
}

function selectSong(song) {
  selectedSong = song;
  renderSongList();

  $('previewArt').textContent = song.emoji || '🎵';
  $('previewArt').style.background = `linear-gradient(135deg,${song.color || '#2E8B57'},#008080)`;
  $('previewTitle').textContent = song.title;
  $('previewArtist').textContent = song.artist || '';
  $('previewBpm').textContent = `BPM ${song.bpm}`;
  $('previewStars').textContent = '★'.repeat(song.stars || 1) + '☆'.repeat(5 - (song.stars || 1));
  $('btnStartGame').disabled = false;
}

function initSongSelect() {
  $('btnBackFromSelect').addEventListener('click', () => showScreen('menu'));

  // Build side-by-side layout: [list | preview]
  const selectScreen = screens.select;
  const preview = selectScreen.querySelector('.song-preview');
  const wrap    = selectScreen.querySelector('.song-list-wrap');

  const main = document.createElement('div');
  main.className = 'select-row';
  // CSS handles the flex directions
  selectScreen.appendChild(main);
  main.appendChild(wrap);
  main.appendChild(preview);
  preview.style.display = 'flex';

  // Difficulty tabs
  document.querySelectorAll('.diff-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.diff-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedDiff = tab.dataset.diff;
      renderSongList();
    });
  });

  $('btnStartGame').addEventListener('click', () => {
    if (selectedSong) {
      audio.init(); // Initialize on click
      startGame(selectedSong);
    }
  });
}

// ========================
// 8. GAME ENGINE
// ========================

let gameState = null;
let gameRAF   = null;

function startGame(song) {
  if (gameRAF) cancelAnimationFrame(gameRAF);

  gameState = {
    song,
    // Sort notes by time ascending, assign index + tracking flags
    notes: [...song.notes]
      .sort((a, b) => a.time - b.time)
      .map((n, i) => ({ ...n, id: i, hit: false, missed: false, el: null })),
    startTime:    null,
    elapsed:      0,
    score:        0,
    combo:        0,
    maxCombo:     0,
    perfect:      0,
    good:         0,
    miss:         0,
    total:        song.notes.length,
    spawnIdx:     0,   // next note to check for spawning
    paused:       false,
    pauseStart:   null,
    totalPaused:  0,
    finished:     false
  };

  $('gameSongName').textContent = song.title;
  $('gameDiffBadge').textContent = ({ easy:'EASY', normal:'NORMAL', hard:'HARD' }[song.difficulty] || 'NORMAL');
  updateHUD();
  clearLanes();

  showScreen('game');
  $('pauseOverlay').classList.add('hidden');

  showCountdown(3, () => {
    gameState.startTime = performance.now();
    gameRAF = requestAnimationFrame(gameLoop);
  });
}

function showCountdown(n, cb) {
  const overlay = document.createElement('div');
  overlay.className = 'countdown-overlay';
  document.body.appendChild(overlay);

  let count = n;
  function tick() {
    overlay.innerHTML = `<div class="countdown-num">${count}</div>`;
    count--;
    if (count > 0) {
      setTimeout(tick, 1000);
    } else {
      overlay.innerHTML = `<div class="countdown-num" style="font-size:70px">GO!</div>`;
      setTimeout(() => { overlay.remove(); cb(); }, 800);
    }
  }
  tick();
}

function clearLanes() {
  document.querySelectorAll('.note-arrow').forEach(e => e.remove());
}

function gameLoop(timestamp) {
  if (!gameState || gameState.finished) return;
  if (gameState.paused) { gameRAF = requestAnimationFrame(gameLoop); return; }

  // Compute elapsed (excluding paused time)
  if (!gameState.startTime) gameState.startTime = timestamp;
  gameState.elapsed = timestamp - gameState.startTime - gameState.totalPaused;

  const elapsed   = gameState.elapsed;
  const notes     = gameState.notes;
  const laneArea  = $('laneArea');
  const laneAreaH = laneArea.offsetHeight;
  const HIT_Y     = 80; // px from bottom of laneArea to hit-zone center

  // ---- Spawn notes that should be visible ----
  while (
    gameState.spawnIdx < notes.length &&
    notes[gameState.spawnIdx].time - elapsed <= TRAVEL_TIME + 100
  ) {
    const note = notes[gameState.spawnIdx];
    if (!note.el && !note.hit && !note.missed) spawnNoteEl(note, laneArea);
    gameState.spawnIdx++;
  }

  // ---- Move notes + auto-miss ----
  const hitZoneY = laneAreaH - HIT_Y; // px from top where hit zone sits

  for (const note of notes) {
    if (note.hit || note.missed) continue;
    if (!note.el) continue;

    const timeUntil = note.time - elapsed;
    // progress 1→0 as note approaches hit zone
    const progress = timeUntil / TRAVEL_TIME;
    // yPos: 0 = top of lane,  hitZoneY = at hit zone
    const yPos = hitZoneY * (1 - progress);
    note.el.style.top = Math.round(yPos) + 'px';

    // Auto-miss
    if (timeUntil < -(MISS_WINDOW + 60)) {
      missNote(note);
    }
  }

  // ---- Progress bar ----
  const lastTime = notes.length > 0 ? notes[notes.length - 1].time : 1;
  const prog = Math.min(100, (elapsed / (lastTime + 1000)) * 100);
  $('progressBar').style.width = prog + '%';

  // ---- End condition ----
  if (elapsed > lastTime + 2500) {
    const allDone = notes.every(n => n.hit || n.missed);
    if (allDone) { endGame(); return; }
  }

  gameRAF = requestAnimationFrame(gameLoop);
}

function spawnNoteEl(note, laneArea) {
  const laneIdx = LANE_ORDER.indexOf(note.direction);
  if (laneIdx < 0) return;

  const lane = laneArea.querySelectorAll('.lane')[laneIdx];
  if (!lane) return;

  const el = document.createElement('div');
  el.className = `note-arrow dir-${note.direction}`;
  el.textContent = DIR_SYMBOLS[note.direction];
  el.style.top = '-64px';

  lane.appendChild(el);
  note.el = el;
}

function missNote(note) {
  note.missed = true;
  if (note.el) {
    note.el.remove(); // Instant remove
    note.el = null;
  }
  audio.playMiss();
  gameState.combo = 0;
  gameState.miss++;
  updateHUD();
  showJudgment('MISS', 'miss');
}

function hitNote(note, quality) {
  note.hit = true;
  if (note.el) {
    note.el.remove(); // Instant remove
    note.el = null;
  }
  audio.playHit(quality);

  // Hit-zone flash
  const hitMap = {
    left:  $('hitLeft'),
    down:  $('hitDown'),
    up:    $('hitUp'),
    right: $('hitRight')
  };
  const hitEl = hitMap[note.direction];
  if (hitEl) {
    hitEl.classList.add('hit-anim');
    setTimeout(() => hitEl.classList.remove('hit-anim'), 200);
  }

  if (quality === 'perfect') {
    gameState.score   += 1000 + gameState.combo * 5;
    gameState.perfect++;
    showJudgment('PERFECT!', 'perfect');
  } else {
    gameState.score += 500 + gameState.combo * 2;
    gameState.good++;
    showJudgment('GOOD', 'good');
  }

  gameState.combo++;
  if (gameState.combo > gameState.maxCombo) gameState.maxCombo = gameState.combo;
  if (gameState.combo >= 5) showComboFly(gameState.combo);
  updateHUD();
}

function updateHUD() {
  $('scoreDisplay').textContent = gameState.score.toLocaleString();
  $('comboDisplay').textContent = gameState.combo;
  const hit = gameState.perfect * 100 + gameState.good * 50;
  const max = gameState.total * 100;
  const acc = max > 0 ? (hit / max * 100).toFixed(1) : '100.0';
  $('accDisplay').textContent = acc + '%';
}

let judgmentTimeout = null;
function showJudgment(text, cls) {
  const el = $('judgmentDisplay');
  el.className = 'judgment-display';
  void el.offsetWidth; // force reflow to restart animation
  el.textContent = text;
  el.classList.add('show', cls);
  if (judgmentTimeout) clearTimeout(judgmentTimeout);
  judgmentTimeout = setTimeout(() => { el.className = 'judgment-display'; }, 650);
}

let comboTimeout = null;
function showComboFly(count) {
  const el = $('comboDisplayFly');
  el.className = 'combo-display';
  void el.offsetWidth;
  el.textContent = `${count} COMBO`;
  el.classList.add('show');
  if (comboTimeout) clearTimeout(comboTimeout);
  comboTimeout = setTimeout(() => { el.className = 'combo-display'; }, 450);
}

function endGame() {
  gameState.finished = true;
  if (gameRAF) { cancelAnimationFrame(gameRAF); gameRAF = null; }
  clearLanes();

  const { score, maxCombo, perfect, good, miss, total } = gameState;
  const hit = perfect * 100 + good * 50;
  const acc = total > 0 ? (hit / (total * 100) * 100) : 100;

  let rank = 'D';
  if      (acc >= 98) rank = 'S';
  else if (acc >= 93) rank = 'A';
  else if (acc >= 85) rank = 'B';
  else if (acc >= 70) rank = 'C';

  $('resultRank').textContent  = rank;
  $('resultSong').textContent  = gameState.song.title;
  $('rScore').textContent      = score.toLocaleString();
  $('rMaxCombo').textContent   = maxCombo;
  $('rAcc').textContent        = acc.toFixed(1) + '%';
  $('rPerfect').textContent    = perfect;
  $('rGood').textContent       = good;
  $('rMiss').textContent       = miss;

  setTimeout(() => showScreen('result'), 700);
}

// ========================
// 9. INPUT HANDLING
// ========================

function initInput() {
  document.addEventListener('keydown', e => {
    const dir = DIR_KEYS[e.key];
    if (!dir) return;
    e.preventDefault();

    if (screens.game.classList.contains('active') && gameState && !gameState.paused && !gameState.finished) {
      processInput(dir);
      setHitZonePressed(dir, true);
    }
  });

  document.addEventListener('keyup', e => {
    const dir = DIR_KEYS[e.key];
    if (dir) setHitZonePressed(dir, false);
  });

  // Touch controls on hit zones
  const hitMap = { left: $('hitLeft'), down: $('hitDown'), up: $('hitUp'), right: $('hitRight') };
  LANE_ORDER.forEach(dir => {
    const hz = hitMap[dir];
    if (!hz) return;
    hz.addEventListener('touchstart', ev => {
      ev.preventDefault();
      if (gameState && !gameState.paused && !gameState.finished) {
        processInput(dir);
        setHitZonePressed(dir, true);
      }
    }, { passive: false });
    hz.addEventListener('touchend', () => setHitZonePressed(dir, false));
  });
}

function setHitZonePressed(dir, pressed) {
  const el = { left: $('hitLeft'), down: $('hitDown'), up: $('hitUp'), right: $('hitRight') }[dir];
  if (!el) return;
  el.classList.toggle('pressed', pressed);
}

function processInput(dir) {
  if (!gameState) return;
  const elapsed = gameState.elapsed;

  // Move catcher
  const catcher = $('gameCatcher');
  if (catcher) {
    catcher.style.left = LANE_L_POS[dir];
  }

  let best      = null;
  let bestDelta = Infinity;

  for (const note of gameState.notes) {
    if (note.hit || note.missed) continue;
    if (note.direction !== dir) continue;
    const delta = Math.abs(note.time - elapsed);
    if (delta < MISS_WINDOW && delta < bestDelta) {
      bestDelta = delta;
      best = note;
    }
  }

  if (best) {
    const delta = Math.abs(best.time - elapsed);
    if (delta <= PERFECT_WINDOW)       hitNote(best, 'perfect');
    else if (delta <= GOOD_WINDOW)     hitNote(best, 'good');
    else                               hitNote(best, 'good'); // late-good
  }
}

// ========================
// 10. PAUSE / RESUME / QUIT
// ========================

function initGameControls() {
  $('btnPause').addEventListener('click', pauseGame);
  $('btnResume').addEventListener('click', resumeGame);

  $('btnRestartFromPause').addEventListener('click', () => {
    $('pauseOverlay').classList.add('hidden');
    if (selectedSong) startGame(selectedSong);
  });

  $('btnQuitGame').addEventListener('click', () => {
    if (gameState) gameState.finished = true;
    if (gameRAF) { cancelAnimationFrame(gameRAF); gameRAF = null; }
    clearLanes();
    $('pauseOverlay').classList.add('hidden');
    showScreen('select');
    renderSongList();
  });

  $('btnRetry').addEventListener('click', () => {
    if (selectedSong) startGame(selectedSong);
  });

  $('btnBackToSelect').addEventListener('click', () => {
    showScreen('select');
    renderSongList();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && screens.game.classList.contains('active')) {
      if (gameState && !gameState.finished) {
        gameState.paused ? resumeGame() : pauseGame();
      }
    }
  });
}

function pauseGame() {
  if (!gameState || gameState.paused) return;
  gameState.paused    = true;
  gameState.pauseStart = performance.now();
  $('pauseOverlay').classList.remove('hidden');
}

function resumeGame() {
  if (!gameState || !gameState.paused) return;
  gameState.totalPaused += performance.now() - gameState.pauseStart;
  gameState.paused       = false;
  $('pauseOverlay').classList.add('hidden');
}

// ========================
// 11. DEVELOPER MODE
// ========================

let devNotes      = [];
let devSelectedDir = 'left';

function initDev() {
  $('btnBackFromDev').addEventListener('click', () => showScreen('menu'));

  // Arrow selector buttons
  document.querySelectorAll('.arrow-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.arrow-btn').forEach(b => {
        b.style.borderColor = '';
        b.style.boxShadow   = '';
      });
      btn.style.borderColor = 'var(--g1)';
      btn.style.boxShadow   = '0 0 16px #32CD3288';
      devSelectedDir = btn.dataset.dir;
    });
  });

  $('btnAddNote').addEventListener('click', () => {
    const beat = parseFloat($('devBeat').value);
    if (isNaN(beat) || beat < 0) return;
    devNotes.push({ beat, direction: devSelectedDir });
    devNotes.sort((a, b) => a.beat - b.beat);
    renderTimeline();
    // auto-increment beat
    $('devBeat').value = (beat + 0.5).toFixed(2);
  });

  $('btnClearNotes').addEventListener('click', () => {
    if (confirm('모든 노트를 삭제하시겠습니까?')) {
      devNotes = [];
      renderTimeline();
    }
  });

  $('btnImportNotes').addEventListener('click', () => {
    const raw = prompt('노트 JSON 배열을 붙여넣으세요:\n예: [{"beat":0,"direction":"left"}, ...]');
    if (!raw) return;
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        devNotes = [...devNotes, ...arr];
        devNotes.sort((a, b) => a.beat - b.beat);
        renderTimeline();
        alert(`${arr.length}개 노트를 불러왔습니다.`);
      }
    } catch (e) { alert('JSON 파싱 오류: ' + e.message); }
  });

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
  });

  $('btnGenerateJson').addEventListener('click', generateJson);
  $('btnSaveSong').addEventListener('click', saveSongFromDev);
  $('btnExportJson').addEventListener('click', exportJson);
  $('btnLoadJson').addEventListener('click', () => $('fileInput').click());
  $('fileInput').addEventListener('change', loadJsonFile);

  renderDevSavedList();
}

function renderTimeline() {
  const tl = $('devTimeline');
  tl.innerHTML = '';

  if (devNotes.length === 0) {
    tl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-dim)">노트가 없습니다. 위에서 추가하세요.</div>';
    return;
  }

  devNotes.forEach((n, i) => {
    const row = document.createElement('div');
    row.className = 'tl-row';
    const dotHtml = LANE_ORDER.map(d =>
      `<span class="tl-lane">${d === n.direction
        ? `<span class="dot dir-${d}">${DIR_SYMBOLS[d]}</span>`
        : ''}</span>`
    ).join('');
    row.innerHTML = `
      ${dotHtml}
      <span class="tl-beat">${n.beat.toFixed(2)}</span>
      <span class="tl-del"><button class="tl-del-btn" data-idx="${i}">✕</button></span>
    `;
    tl.appendChild(row);
  });

  tl.querySelectorAll('.tl-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      devNotes.splice(parseInt(btn.dataset.idx), 1);
      renderTimeline();
    });
  });
}

function applyPreset(preset) {
  const dirs = ['left','down','up','right'];
  const startBeat = devNotes.length > 0
    ? Math.ceil(devNotes[devNotes.length - 1].beat) + 1
    : 0;
  const newNotes = [];

  if (preset === 'basic4') {
    [0,1,2,3].forEach(i => newNotes.push({ beat: startBeat + i, direction: dirs[i] }));
  } else if (preset === 'alternating') {
    for (let i = 0; i < 8; i++)
      newNotes.push({ beat: startBeat + i * 0.5, direction: i % 2 === 0 ? 'left' : 'right' });
  } else if (preset === 'allDown') {
    for (let i = 0; i < 8; i++)
      newNotes.push({ beat: startBeat + i * 0.5, direction: dirs[i % 4] });
  } else if (preset === 'scale') {
    dirs.forEach((d, i) => newNotes.push({ beat: startBeat + i * 0.5, direction: d }));
    [...dirs].reverse().forEach((d, i) => newNotes.push({ beat: startBeat + (4 + i) * 0.5, direction: d }));
  } else if (preset === 'random4') {
    for (let i = 0; i < 8; i++)
      newNotes.push({ beat: startBeat + i * 0.5, direction: dirs[Math.floor(Math.random() * 4)] });
  }

  devNotes = [...devNotes, ...newNotes];
  devNotes.sort((a, b) => a.beat - b.beat);
  renderTimeline();
}

function devBeatToMs(beat) {
  const bpm = parseFloat($('devBpm').value) || 120;
  return bpmToMs(bpm, beat) + 1500;
}

function buildDevSong() {
  const bpm = parseFloat($('devBpm').value) || 120;
  return {
    id:         'custom_' + Date.now(),
    title:      $('devTitle').value      || '무제',
    artist:     $('devArtist').value     || '알 수 없음',
    bpm,
    difficulty: $('devDifficulty').value || 'normal',
    stars:      parseInt($('devStars').value) || 3,
    color:      $('devColor').value      || '#32CD32',
    emoji:      '🎵',
    notes:      devNotes.map(n => ({
      time:      devBeatToMs(n.beat),
      direction: n.direction
    }))
  };
}

function generateJson() {
  const song = buildDevSong();
  $('devJsonOutput').value = JSON.stringify(song, null, 2);
}

function saveSongFromDev() {
  if (devNotes.length === 0) { alert('노트를 먼저 추가하세요!'); return; }
  const title = $('devTitle').value;
  if (!title) { alert('노래 제목을 입력하세요!'); return; }

  const song = buildDevSong();
  SongStore.save(song);
  renderDevSavedList();
  alert(`✅ "${song.title}" 노래가 저장되었습니다!\n노래 선택 화면에서 플레이할 수 있습니다.`);
}

function exportJson() {
  const song = buildDevSong();
  const blob = new Blob([JSON.stringify(song, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${(song.title || 'song').replace(/[^\w가-힣]/g,'_')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function loadJsonFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const song = JSON.parse(ev.target.result);
      $('devTitle').value      = song.title      || '';
      $('devArtist').value     = song.artist     || '';
      $('devBpm').value        = song.bpm        || 120;
      $('devDifficulty').value = song.difficulty || 'normal';
      $('devStars').value      = song.stars      || 3;
      $('devColor').value      = song.color      || '#32CD32';

      if (Array.isArray(song.notes)) {
        const bpm = song.bpm || 120;
        devNotes = song.notes.map(n => ({
          beat:      +((n.time - 1500) / (60000 / bpm)).toFixed(4),
          direction: n.direction
        })).sort((a, b) => a.beat - b.beat);
        renderTimeline();
      }
      alert('✅ JSON 파일을 불러왔습니다!');
    } catch (err) { alert('파일 읽기 오류: ' + err.message); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function renderDevSavedList() {
  const container = $('devSavedList');
  const songs     = SongStore.getCustom();

  if (songs.length === 0) {
    container.innerHTML = '<div style="color:var(--text-dim);font-size:13px;padding:10px">저장된 커스텀 노래가 없습니다.</div>';
    return;
  }

  container.innerHTML = '';
  songs.forEach(song => {
    const row = document.createElement('div');
    row.className = 'saved-song-row';
    row.innerHTML = `
      <span class="saved-song-name">${escHtml(song.title)}</span>
      <span class="saved-song-meta">
        ${escHtml(song.artist || '')} · BPM ${song.bpm} · ${song.notes?.length || 0}개 노트
      </span>
      <div class="saved-song-btns">
        <button class="dev-btn accent" data-load="${song.id}">✏ 편집</button>
        <button class="dev-btn danger"  data-del="${song.id}">🗑 삭제</button>
      </div>
    `;
    container.appendChild(row);
  });

  container.querySelectorAll('[data-load]').forEach(btn => {
    btn.addEventListener('click', () => loadSongIntoEditor(btn.dataset.load));
  });
  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('이 노래를 삭제하시겠습니까?')) {
        SongStore.delete(btn.dataset.del);
        renderDevSavedList();
      }
    });
  });
}

function loadSongIntoEditor(id) {
  const song = SongStore.getCustom().find(s => s.id === id);
  if (!song) return;

  $('devTitle').value      = song.title      || '';
  $('devArtist').value     = song.artist     || '';
  $('devBpm').value        = song.bpm        || 120;
  $('devDifficulty').value = song.difficulty || 'normal';
  $('devStars').value      = song.stars      || 3;
  $('devColor').value      = song.color      || '#32CD32';

  if (Array.isArray(song.notes)) {
    const bpm = song.bpm || 120;
    devNotes = song.notes.map(n => ({
      beat:      +((n.time - 1500) / (60000 / bpm)).toFixed(4),
      direction: n.direction
    })).sort((a, b) => a.beat - b.beat);
    renderTimeline();
  }
  screens.dev.scrollTop = 0;
  alert(`✏ "${song.title}" 편집 모드로 불러왔습니다!`);
}

// ========================
// 12. FROST CANVAS
// ========================

const FROST_PARTICLES = [];

function initFrostCanvas() {
  const canvas = $('frostCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Spawn frost / ice crystal particles
  const COUNT = 60;
  const COLORS = [
    'rgba(152,251,152,OPA)', // pale green
    'rgba(50,205,50,OPA)',   // lime
    'rgba(0,128,128,OPA)',   // teal
    'rgba(154,205,50,OPA)',  // yellow-green
    'rgba(255,255,255,OPA)', // white sparkle
  ];

  for (let i = 0; i < COUNT; i++) {
    FROST_PARTICLES.push(makeFrostParticle(canvas));
  }

  function makeFrostParticle(canvas, fromTop = false) {
    const colorTpl = COLORS[Math.floor(Math.random() * COLORS.length)];
    const opa      = (0.05 + Math.random() * 0.25).toFixed(2);
    const color    = colorTpl.replace('OPA', opa);
    return {
      x:      Math.random() * canvas.width,
      y:      fromTop ? -20 : Math.random() * canvas.height,
      r:      1 + Math.random() * 3.5,         // radius
      vx:     (Math.random() - 0.5) * 0.4,
      vy:     0.2 + Math.random() * 0.6,
      color,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.02 + Math.random() * 0.04,
      type:   Math.random() < 0.4 ? 'crystal' : 'dot',
      angle:  Math.random() * Math.PI * 2,
      spin:   (Math.random() - 0.5) * 0.02,
    };
  }

  function drawCrystal(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 1;
    const arms = 6;
    for (let a = 0; a < arms; a++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const len = p.r * 4;
      ctx.lineTo(len, 0);
      // small side branches
      ctx.moveTo(len * 0.5, 0);
      ctx.lineTo(len * 0.5 + p.r, -p.r);
      ctx.moveTo(len * 0.5, 0);
      ctx.lineTo(len * 0.5 + p.r,  p.r);
      ctx.stroke();
      ctx.rotate(Math.PI * 2 / arms);
    }
    ctx.restore();
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of FROST_PARTICLES) {
      p.x     += p.vx;
      p.y     += p.vy;
      p.angle += p.spin;
      p.twinkle += p.twinkleSpeed;

      // Twinkle opacity pulse
      const pulse = 0.7 + 0.3 * Math.sin(p.twinkle);
      ctx.globalAlpha = pulse;

      if (p.type === 'crystal') {
        drawCrystal(ctx, p);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      // Reset if off screen
      if (p.y > canvas.height + 30 || p.x < -30 || p.x > canvas.width + 30) {
        Object.assign(p, makeFrostParticle(canvas, true));
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
    }

    requestAnimationFrame(tick);
  }
  tick();
}

// ========================
// 13. DRAG / SCROLL PREVENTION
// ========================

function initDragPrevention() {
  // Prevent default touchmove (scrolling/dragging) on game elements
  // Only allow scroll in dev screen and song list
  document.addEventListener('touchmove', e => {
    const target = e.target;
    // Allow scrolling in permitted containers
    if (
      target.closest('#screen-dev') ||
      target.closest('.song-list-wrap') ||
      target.closest('.dev-timeline')
    ) return;
    e.preventDefault();
  }, { passive: false });

  // Prevent context menu on long press
  document.addEventListener('contextmenu', e => e.preventDefault());

  // Prevent drag start on images / elements
  document.addEventListener('dragstart', e => e.preventDefault());
}

// ========================
// 14. PORTRAIT DETECTION
// ========================

function initPortraitDetection() {
  const overlay = $('rotateOverlay');
  if (!overlay) return;

  function check() {
    // Only show on actual mobile devices
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ||
                     (window.innerWidth <= 900 && 'ontouchstart' in window);
    if (isMobile && window.innerHeight > window.innerWidth) {
      overlay.style.display = 'flex';
    } else {
      overlay.style.display = 'none';
    }
  }

  check();
  window.addEventListener('resize',      check);
  window.addEventListener('orientationchange', () => setTimeout(check, 300));
}

// ========================
// 15. BOOT
// ========================

document.addEventListener('DOMContentLoaded', () => {
  initScreens();
  initMenu();
  initSongSelect();
  initGameControls();
  initInput();
  initDev();
  initFrostCanvas();
  initDragPrevention();
  initPortraitDetection();
  showScreen('menu');
});

