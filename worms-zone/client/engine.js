// ================= MAIN GAME ENGINE =================
const gameCanvas = document.getElementById('gameCanvas');
const gCtx = gameCanvas.getContext('2d');

// Larger Square Arena Half-Size (9000 x 9000 total)
const ARENA_HALF = 4500;

// 25 Varieties of Fruits & Vegetables (2 to 30 points)
const FRUITS = [
  { emoji: '🍒', val: 2, r: 9 },
  { emoji: '🫐', val: 3, r: 9 },
  { emoji: '🍇', val: 4, r: 10 },
  { emoji: '🫒', val: 4, r: 9 },
  { emoji: '🍓', val: 5, r: 10 },
  { emoji: '🫛', val: 6, r: 10 },
  { emoji: '🌶️', val: 7, r: 10 },
  { emoji: '🥕', val: 8, r: 11 },
  { emoji: '🍎', val: 9, r: 11 },
  { emoji: '🍏', val: 10, r: 11 },
  { emoji: '🍐', val: 11, r: 11 },
  { emoji: '🍑', val: 12, r: 12 },
  { emoji: '🍌', val: 13, r: 12 },
  { emoji: '🍊', val: 14, r: 12 },
  { emoji: '🍋', val: 15, r: 12 },
  { emoji: '🍅', val: 16, r: 12 },
  { emoji: '🥒', val: 17, r: 12 },
  { emoji: '🌽', val: 18, r: 13 },
  { emoji: '🍆', val: 20, r: 13 },
  { emoji: '🥦', val: 22, r: 13 },
  { emoji: '🥑', val: 24, r: 13 },
  { emoji: '🥭', val: 25, r: 14 },
  { emoji: '🥝', val: 26, r: 13 },
  { emoji: '🥥', val: 28, r: 14 },
  { emoji: '🍍', val: 29, r: 14 },
  { emoji: '🍉', val: 30, r: 15 }
];

// Pre-render Static Illustrated Arena Tile (Option B)
const arenaTile = document.createElement('canvas');
arenaTile.width = 512;
arenaTile.height = 512;
const tCtx = arenaTile.getContext('2d');
(function buildStaticArenaTile() {
  tCtx.fillStyle = '#14362b';
  tCtx.fillRect(0, 0, 512, 512);

  const shapes = [
    { x: 90, y: 110, r: 75, c: '#194335' },
    { x: 360, y: 140, r: 95, c: '#112e24' },
    { x: 220, y: 340, r: 110, c: '#194335' },
    { x: 430, y: 420, r: 65, c: '#1c4a3b' },
    { x: 70, y: 430, r: 55, c: '#112e24' }
  ];
  shapes.forEach(s => {
    tCtx.fillStyle = s.c;
    tCtx.beginPath();
    tCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    tCtx.fill();
  });

  tCtx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  tCtx.lineWidth = 2;
  tCtx.strokeRect(1, 1, 510, 510);
  tCtx.beginPath();
  tCtx.moveTo(256, 0);
  tCtx.lineTo(256, 512);
  tCtx.moveTo(0, 256);
  tCtx.lineTo(512, 256);
  tCtx.stroke();

  const pebbles = [
    [40, 50], [180, 70], [310, 45], [470, 90],
    [130, 210], [290, 230], [440, 270],
    [60, 320], [210, 460], [350, 380], [480, 480]
  ];
  tCtx.fillStyle = 'rgba(118, 200, 147, 0.12)';
  pebbles.forEach(([px, py]) => {
    tCtx.beginPath();
    tCtx.ellipse(px, py, 6, 3, 0.4, 0, Math.PI * 2);
    tCtx.fill();
  });
})();

let arenaPattern = null;

let player = null;
let bots = [];
let foods = [];
let respawnQueue = [];
let floatingTexts = [];
let powerups = [];
let isBoosting = false;
let pointerAngle = 0;
let gameAnimId = null;
let lastFrameTime = 0;
let currentZoom = 1.24;

function randomPointInSquareArena(margin = 160) {
  const limit = ARENA_HALF - margin;
  return {
    x: (Math.random() * 2 - 1) * limit,
    y: (Math.random() * 2 - 1) * limit
  };
}

function createFruitItem(x, y) {
  const fIdx = Math.floor(Math.pow(Math.random(), 1.25) * FRUITS.length);
  const spec = FRUITS[Math.min(FRUITS.length - 1, fIdx)];
  return {
    x,
    y,
    emoji: spec.emoji,
    val: spec.val,
    r: spec.r
  };
}

function populateDenseFruits() {
  foods = [];
  respawnQueue = [];
  // 20% fewer fruits compared to previous density, while keeping nice clusters
  const clusterCount = 420;
  for (let c = 0; c < clusterCount; c++) {
    const center = randomPointInSquareArena(160);
    const itemsInCluster = 2 + Math.floor(Math.random() * 4);
    for (let k = 0; k < itemsInCluster; k++) {
      const ox = center.x + (Math.random() - 0.5) * 44;
      const oy = center.y + (Math.random() - 0.5) * 44;
      if (Math.abs(ox) < ARENA_HALF - 80 && Math.abs(oy) < ARENA_HALF - 80) {
        foods.push(createFruitItem(ox, oy));
      }
    }
  }
}

function calcTargetSegments(score) {
  return Math.min(340, Math.floor(18 + Math.pow(score, 0.56) * 1.45));
}
function calcWormRadius(score) {
  return Math.min(34, 13 + Math.pow(score, 0.34) * 0.85);
}

function createWorm(x, y, name, skinColors, isPlayer = false) {
  const segs = [];
  const startLen = 18;
  for (let i = 0; i < startLen; i++) {
    segs.push({ x: x - i * 6, y });
  }
  return {
    x,
    y,
    angle: Math.random() * Math.PI * 2,
    score: 10,
    name,
    colors: skinColors,
    segments: segs,
    isPlayer,
    shieldTime: isPlayer ? 5.0 : 2.0,
    aiTimer: 0,
    aiTargetAngle: Math.random() * Math.PI * 2,
    effects: { magnet: 0, double: 0, zoom: 0, freeBoost: 0 }
  };
}

function spawnBot() {
  const pos = randomPointInSquareArena(300);
  const botNames = ['Արամ', 'Անի', 'Դավիթ', 'Max', 'Nika', 'Leo', 'Տիգրան', 'Alex', 'Մհեր', 'Kira'];
  const skin = SKINS[Math.floor(Math.random() * SKINS.length)];
  const bot = createWorm(pos.x, pos.y, botNames[Math.floor(Math.random() * botNames.length)], skin.colors, false);
  bot.score = 10 + Math.floor(Math.random() * 180);
  const targetSegs = calcTargetSegments(bot.score);
  while (bot.segments.length < targetSegs) {
    const last = bot.segments[bot.segments.length - 1];
    bot.segments.push({ x: last.x, y: last.y });
  }
  return bot;
}

function spawnPowerup() {
  const types = [
    { type: 'magnet', icon: '🧲', color: '#ef4444' },
    { type: 'double', icon: '⭐', color: '#facc15' },
    { type: 'zoom', icon: '🔭', color: '#38bdf8' },
    { type: 'freeBoost', icon: '⚡', color: '#a855f7' }
  ];
  const pick = types[Math.floor(Math.random() * types.length)];
  const pos = randomPointInSquareArena(220);
  powerups.push({ x: pos.x, y: pos.y, ...pick, r: 18 });
}

function showKillToast() {
  const container = document.getElementById('killToastContainer');
  const toast = document.createElement('div');
  toast.className = 'kill-toast';
  toast.textContent = I18N[state.lang].wormDefeated;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2250);
}

function startGame() {
  inGame = true;
  document.getElementById('lobbyScreen').style.display = 'none';
  document.getElementById('gameOverScreen').style.display = 'none';
  document.getElementById('gameContainer').style.display = 'block';
  document.getElementById('killToastContainer').innerHTML = '';

  gameCanvas.width = window.innerWidth;
  gameCanvas.height = window.innerHeight;
  arenaPattern = gCtx.createPattern(arenaTile, 'repeat');

  const skin = SKINS.find(s => s.id === state.selectedSkin) || SKINS[0];
  player = createWorm(0, 0, state.name, skin.colors, true);
  pointerAngle = player.angle;
  isBoosting = false;
  currentZoom = 1.24;

  populateDenseFruits();
  floatingTexts = [];
  powerups = [];
  for (let i = 0; i < 22; i++) spawnPowerup();

  bots = [];
  for (let i = 0; i < 28; i++) bots.push(spawnBot());

  document.getElementById('gameCoinsVal').textContent = state.coins;
  document.getElementById('shieldNotice').style.display = 'none';

  startBgMusic();

  lastFrameTime = performance.now();
  if (gameAnimId) cancelAnimationFrame(gameAnimId);
  gameAnimId = requestAnimationFrame(gameLoop);
}

function exitToLobby() {
  inGame = false;
  stopBgMusic();
  if (gameAnimId) cancelAnimationFrame(gameAnimId);
  document.getElementById('gameContainer').style.display = 'none';
  document.getElementById('gameOverScreen').style.display = 'none';
  document.getElementById('lobbyScreen').style.display = 'block';
  updateUI();
}

// Input Handlers for Game
let isPointerSteering = false;

function updatePointerAngle(e) {
  if (!inGame || !player) return;
  const rect = gameCanvas.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  pointerAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
}
gameCanvas.addEventListener('pointermove', (e) => {
  if (!inGame || !player) return;
  const cx = gameCanvas.width / 2;
  const cy = gameCanvas.height / 2;
  pointerAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
});
gameCanvas.addEventListener('pointerdown', (e) => {
  if (!inGame || !player) return;
  const cx = gameCanvas.width / 2;
  const cy = gameCanvas.height / 2;
  pointerAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
});

const boostBtn = document.getElementById('boostBtn');
boostBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); isBoosting = true; });
boostBtn.addEventListener('pointerup', (e) => { e.stopPropagation(); isBoosting = false; });
boostBtn.addEventListener('pointerleave', () => { isBoosting = false; });
window.addEventListener('keydown', (e) => { if (e.code === 'Space') isBoosting = true; });
window.addEventListener('keyup', (e) => { if (e.code === 'Space') isBoosting = false; });

document.getElementById('startGameBtn').addEventListener('click', startGame);
document.getElementById('playAgainBtn').addEventListener('click', startGame);
document.getElementById('exitToLobbyBtn').addEventListener('click', exitToLobby);
document.getElementById('goLobbyBtn').addEventListener('click', exitToLobby);
document.getElementById('gameFsBtn').addEventListener('click', toggleFullscreen);
document.getElementById('gameSoundBtn').addEventListener('click', () => {
  state.sound = !state.sound;
  saveState();
  updateUI();
});

function killWorm(worm, allWorms, killer = null) {
  for (let i = 0; i < worm.segments.length; i += 2) {
    const s = worm.segments[i];
    const drop = createFruitItem(s.x + (Math.random() - 0.5) * 16, s.y + (Math.random() - 0.5) * 16);
    drop.val = 15;
    drop.emoji = '🍉';
    drop.r = 14;
    foods.push(drop);
  }

  if (killer && killer.isPlayer && !worm.isPlayer) {
    playTone(680, 'triangle', 0.18, 0.09);
    showKillToast();
  }

  if (worm.isPlayer) {
    playTone(150, 'sawtooth', 0.35, 0.12);
    inGame = false;
    stopBgMusic();
    const earnedCoins = Math.max(5, Math.floor(player.score / 25));
    const earnedXp = Math.max(10, Math.floor(player.score / 15));
    state.coins += earnedCoins;
    state.xp += earnedXp;
    if (player.score > state.bestScore) state.bestScore = Math.floor(player.score);

    while (state.xp >= state.level * 100) {
      state.xp -= state.level * 100;
      state.level++;
    }
    saveState();
    updateUI();

    document.getElementById('finalScore').textContent = Math.floor(player.score);
    document.getElementById('goRewardText').textContent = `+${earnedCoins} 🪙  |  +${earnedXp} XP`;
    document.getElementById('gameOverScreen').style.display = 'flex';
  } else {
    const idx = allWorms.indexOf(worm);
    if (idx !== -1) {
      allWorms.splice(idx, 1);
      allWorms.push(spawnBot());
    }
  }
}