// ================= APPLY LANGUAGE & UI =================
function updateUI() {
  const t = I18N[state.lang];
  document.getElementById('langToggleBtn').textContent = t.code;
  document.getElementById('logoSubText').textContent = t.sub;
  document.getElementById('startGameBtn').textContent = t.play;
  document.getElementById('openShopBtn').textContent = t.workshop;
  document.getElementById('lobbyHintText').textContent = t.hint;
  document.getElementById('freeGiftLabel').textContent = t.free;

  document.getElementById('lobbyAvatar').textContent = state.avatar;
  document.getElementById('lobbyLevel').textContent = state.level;
  document.getElementById('lobbyNameBtn').textContent = state.name;
  document.getElementById('lobbyCoins').textContent = state.coins;
  const xpNeeded = state.level * 100;
  document.getElementById('lobbyXpFill').style.width = Math.min(100, (state.xp / xpNeeded) * 100) + '%';
  document.getElementById('lobbyXpText').textContent = `${state.xp} / ${xpNeeded} XP`;

  document.getElementById('shopModalTitle').textContent = t.shopTitle;
  document.getElementById('profileModalTitle').textContent = t.profileTitle;
  document.getElementById('nameLabel').textContent = t.nameLabel;
  document.getElementById('avatarLabel').textContent = t.avatarLabel;
  document.getElementById('saveProfileBtn').textContent = t.save;

  document.getElementById('settingsModalTitle').textContent = t.settingsTitle;
  document.getElementById('soundSettingLabel').textContent = t.soundLabel;
  document.getElementById('toggleSoundSettingBtn').textContent = state.sound ? t.soundOn : t.soundOff;
  document.getElementById('langSettingLabel').textContent = t.langLabel;
  document.getElementById('cycleLangSettingBtn').textContent = t.name;
  document.getElementById('fsSettingLabel').textContent = t.fsLabel;
  document.getElementById('fsSettingBtn').textContent = t.fsOpen;

  document.getElementById('hudScoreLabel').textContent = t.score;
  document.getElementById('hudCoinsLabel').textContent = t.coins;
  document.getElementById('lbTitleText').textContent = t.lb;
  document.getElementById('boostBtn').textContent = t.boost;
  document.getElementById('shieldNotice').textContent = t.shieldEnd;
  document.getElementById('goTitle').textContent = t.gameOver;
  document.getElementById('goScoreLabel').textContent = t.yourScore;
  document.getElementById('playAgainBtn').textContent = t.playAgain;
  document.getElementById('goLobbyBtn').textContent = t.toLobby;
  document.getElementById('gameSoundBtn').textContent = state.sound ? '🔊' : '🔇';
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

// ================= LOBBY ILLUSTRATED BACKGROUND & INTERACTIVE WORM =================
const lobbyCanvas = document.getElementById('lobbyCanvas');
const lCtx = lobbyCanvas.getContext('2d');
let lw = 0, lh = 0;

function resizeLobby() {
  lw = lobbyCanvas.width = window.innerWidth;
  lh = lobbyCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeLobby);
resizeLobby();

const lobbyWorm = {
  segments: [],
  segCount: 22,
  segDist: 10,
  angle: 0,
  speed: 1.5,
  targetPoint: null,
  wanderTimer: 0,
  targetAngle: 0,
  isDragging: false
};

function initLobbyWorm() {
  lobbyWorm.segments = [];
  const startX = lw * 0.5;
  const startY = lh * 0.52;
  for (let i = 0; i < lobbyWorm.segCount; i++) {
    lobbyWorm.segments.push({ x: startX - i * lobbyWorm.segDist, y: startY });
  }
}
initLobbyWorm();

lobbyCanvas.addEventListener('pointerdown', (e) => {
  const rect = lobbyCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  let grabbed = false;
  for (let i = 0; i < lobbyWorm.segments.length; i++) {
    const s = lobbyWorm.segments[i];
    if (Math.hypot(mx - s.x, my - s.y) < 34) {
      grabbed = true;
      break;
    }
  }
  if (grabbed) {
    lobbyWorm.isDragging = true;
    lobbyWorm.targetPoint = null;
    playTone(520, 'sine', 0.06, 0.05);
  } else {
    lobbyWorm.targetPoint = { x: mx, y: my };
    playTone(440, 'sine', 0.05, 0.04);
  }
});

window.addEventListener('pointermove', (e) => {
  if (!lobbyWorm.isDragging) return;
  const rect = lobbyCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const head = lobbyWorm.segments[0];
  lobbyWorm.angle = Math.atan2(my - head.y, mx - head.x);
  head.x = mx;
  head.y = my;
  for (let i = 1; i < lobbyWorm.segments.length; i++) {
    const prev = lobbyWorm.segments[i - 1];
    const curr = lobbyWorm.segments[i];
    const a = Math.atan2(prev.y - curr.y, prev.x - curr.x);
    curr.x = prev.x - Math.cos(a) * lobbyWorm.segDist;
    curr.y = prev.y - Math.sin(a) * lobbyWorm.segDist;
  }
});

window.addEventListener('pointerup', () => {
  lobbyWorm.isDragging = false;
});

function drawLobbyBackground() {
  const skyGrad = lCtx.createLinearGradient(0, 0, 0, lh);
  skyGrad.addColorStop(0, '#1e6091');
  skyGrad.addColorStop(0.45, '#34a0a4');
  skyGrad.addColorStop(0.75, '#76c893');
  skyGrad.addColorStop(1, '#52b69a');
  lCtx.fillStyle = skyGrad;
  lCtx.fillRect(0, 0, lw, lh);

  const sunGrad = lCtx.createRadialGradient(lw * 0.5, lh * 0.25, 10, lw * 0.5, lh * 0.25, lw * 0.45);
  sunGrad.addColorStop(0, 'rgba(255, 243, 176, 0.45)');
  sunGrad.addColorStop(1, 'rgba(255, 243, 176, 0)');
  lCtx.fillStyle = sunGrad;
  lCtx.fillRect(0, 0, lw, lh);

  lCtx.fillStyle = '#38a3a5';
  lCtx.beginPath();
  lCtx.moveTo(0, lh * 0.68);
  lCtx.quadraticCurveTo(lw * 0.28, lh * 0.54, lw * 0.6, lh * 0.66);
  lCtx.quadraticCurveTo(lw * 0.85, lh * 0.74, lw, lh * 0.6);
  lCtx.lineTo(lw, lh);
  lCtx.lineTo(0, lh);
  lCtx.closePath();
  lCtx.fill();

  const hillGrad = lCtx.createLinearGradient(0, lh * 0.65, 0, lh);
  hillGrad.addColorStop(0, '#57cc99');
  hillGrad.addColorStop(1, '#22577a');
  lCtx.fillStyle = hillGrad;
  lCtx.beginPath();
  lCtx.moveTo(0, lh * 0.74);
  lCtx.quadraticCurveTo(lw * 0.45, lh * 0.84, lw, lh * 0.7);
  lCtx.lineTo(lw, lh);
  lCtx.lineTo(0, lh);
  lCtx.closePath();
  lCtx.fill();

  lCtx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  lCtx.lineWidth = 3;
  lCtx.beginPath();
  lCtx.ellipse(lw * 0.5, lh * 0.56, lw * 0.32, lh * 0.18, 0, 0, Math.PI * 2);
  lCtx.stroke();
}

function updateAndDrawLobbyWorm() {
  const head = lobbyWorm.segments[0];
  const padX = Math.min(120, lw * 0.15);
  const minY = lh * 0.28;
  const maxY = lh * 0.74;

  if (!lobbyWorm.isDragging) {
    if (lobbyWorm.targetPoint) {
      const dx = lobbyWorm.targetPoint.x - head.x;
      const dy = lobbyWorm.targetPoint.y - head.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 14) {
        lobbyWorm.targetPoint = null;
      } else {
        const desired = Math.atan2(dy, dx);
        let diff = desired - lobbyWorm.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        lobbyWorm.angle += diff * 0.08;
        head.x += Math.cos(lobbyWorm.angle) * 2.6;
        head.y += Math.sin(lobbyWorm.angle) * 2.6;
      }
    } else {
      lobbyWorm.wanderTimer--;
      if (lobbyWorm.wanderTimer <= 0) {
        lobbyWorm.wanderTimer = 90 + Math.random() * 90;
        lobbyWorm.targetAngle = lobbyWorm.angle + (Math.random() - 0.5) * 1.1;
      }
      if (head.x < padX) lobbyWorm.targetAngle = 0;
      if (head.x > lw - padX) lobbyWorm.targetAngle = Math.PI;
      if (head.y < minY) lobbyWorm.targetAngle = Math.PI * 0.5;
      if (head.y > maxY) lobbyWorm.targetAngle = -Math.PI * 0.5;

      let diff = lobbyWorm.targetAngle - lobbyWorm.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      lobbyWorm.angle += diff * 0.035;

      head.x += Math.cos(lobbyWorm.angle) * lobbyWorm.speed;
      head.y += Math.sin(lobbyWorm.angle) * lobbyWorm.speed;
    }

    for (let i = 1; i < lobbyWorm.segments.length; i++) {
      const prev = lobbyWorm.segments[i - 1];
      const curr = lobbyWorm.segments[i];
      const a = Math.atan2(prev.y - curr.y, prev.x - curr.x);
      curr.x = prev.x - Math.cos(a) * lobbyWorm.segDist;
      curr.y = prev.y - Math.sin(a) * lobbyWorm.segDist;
    }
  }

  if (lobbyWorm.targetPoint) {
    lCtx.strokeStyle = 'rgba(255, 243, 176, 0.7)';
    lCtx.lineWidth = 2;
    lCtx.beginPath();
    lCtx.arc(lobbyWorm.targetPoint.x, lobbyWorm.targetPoint.y, 10, 0, Math.PI * 2);
    lCtx.stroke();
  }

  const skin = SKINS.find(s => s.id === state.selectedSkin) || SKINS[0];
  for (let i = lobbyWorm.segments.length - 1; i >= 0; i--) {
    const s = lobbyWorm.segments[i];
    const radius = 17 - (i / lobbyWorm.segments.length) * 6;
    lCtx.fillStyle = skin.colors[i % skin.colors.length];
    lCtx.beginPath();
    lCtx.arc(s.x, s.y, radius, 0, Math.PI * 2);
    lCtx.fill();
    lCtx.strokeStyle = 'rgba(0,0,0,0.18)';
    lCtx.lineWidth = 1.5;
    lCtx.stroke();
  }

  const eyeOffset = 7;
  const eyeAngle1 = lobbyWorm.angle - 0.55;
  const eyeAngle2 = lobbyWorm.angle + 0.55;
  [eyeAngle1, eyeAngle2].forEach(ea => {
    const ex = head.x + Math.cos(ea) * eyeOffset;
    const ey = head.y + Math.sin(ea) * eyeOffset;
    lCtx.fillStyle = '#fff';
    lCtx.beginPath();
    lCtx.arc(ex, ey, 5, 0, Math.PI * 2);
    lCtx.fill();
    lCtx.fillStyle = '#111';
    lCtx.beginPath();
    lCtx.arc(ex + Math.cos(lobbyWorm.angle) * 2, ey + Math.sin(lobbyWorm.angle) * 2, 2.5, 0, Math.PI * 2);
    lCtx.fill();
  });
}

let inGame = false;
function lobbyLoop() {
  if (!inGame) {
    drawLobbyBackground();
    updateAndDrawLobbyWorm();
  }
  requestAnimationFrame(lobbyLoop);
}
requestAnimationFrame(lobbyLoop);

// ================= MODALS LOGIC =================
function openModal(id) {
  playTone(500, 'sine', 0.06, 0.05);
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  playTone(360, 'sine', 0.05, 0.05);
  document.getElementById(id).classList.remove('open');
}
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close));
});

function renderShop() {
  const t = I18N[state.lang];
  const grid = document.getElementById('skinsGrid');
  grid.innerHTML = '';
  SKINS.forEach(skin => {
    const owned = state.ownedSkins.includes(skin.id);
    const selected = state.selectedSkin === skin.id;
    const div = document.createElement('div');
    div.className = 'skin-item' + (selected ? ' selected' : '');
    div.innerHTML = `
      <div class="skin-preview-dots">
        <span class="skin-dot" style="background:${skin.colors[0]}"></span>
        <span class="skin-dot" style="background:${skin.colors[1]}"></span>
        <span class="skin-dot" style="background:${skin.colors[2]}"></span>
      </div>
      <div class="skin-name">${skin.name[state.lang]}</div>
      <button class="skin-action-btn ${owned ? '' : 'buy'}">
        ${selected ? t.selected : (owned ? t.select : skin.price + ' 🪙')}
      </button>
    `;
    div.addEventListener('click', () => {
      if (owned) {
        state.selectedSkin = skin.id;
        playTone(600, 'sine', 0.08, 0.06);
      } else if (state.coins >= skin.price) {
        state.coins -= skin.price;
        state.ownedSkins.push(skin.id);
        state.selectedSkin = skin.id;
        playTone(750, 'triangle', 0.14, 0.08);
      } else {
        playTone(200, 'sawtooth', 0.12, 0.06);
      }
      saveState();
      updateUI();
      renderShop();
    });
    grid.appendChild(div);
  });
}

document.getElementById('openShopBtn').addEventListener('click', () => {
  renderShop();
  openModal('shopModal');
});

function openProfile() {
  document.getElementById('playerNameInput').value = state.name;
  const picker = document.getElementById('avatarPicker');
  picker.innerHTML = '';
  AVATARS.forEach(av => {
    const el = document.createElement('div');
    el.className = 'avatar-choice' + (state.avatar === av ? ' active' : '');
    el.textContent = av;
    el.addEventListener('click', () => {
      state.avatar = av;
      openProfile();
    });
    picker.appendChild(el);
  });
  openModal('profileModal');
}
document.getElementById('openProfileBtn').addEventListener('click', openProfile);
document.getElementById('lobbyNameBtn').addEventListener('click', openProfile);
document.getElementById('saveProfileBtn').addEventListener('click', () => {
  const val = document.getElementById('playerNameInput').value.trim();
  if (val) state.name = val;
  saveState();
  updateUI();
  closeModal('profileModal');
});

document.getElementById('openSettingsBtn').addEventListener('click', () => openModal('settingsModal'));
document.getElementById('langToggleBtn').addEventListener('click', () => {
  const idx = (LANGS.indexOf(state.lang) + 1) % LANGS.length;
  state.lang = LANGS[idx];
  saveState();
  updateUI();
});
document.getElementById('cycleLangSettingBtn').addEventListener('click', () => {
  const idx = (LANGS.indexOf(state.lang) + 1) % LANGS.length;
  state.lang = LANGS[idx];
  saveState();
  updateUI();
});
document.getElementById('toggleSoundSettingBtn').addEventListener('click', () => {
  state.sound = !state.sound;
  saveState();
  updateUI();
});
document.getElementById('fullscreenLobbyBtn').addEventListener('click', toggleFullscreen);
document.getElementById('fsSettingBtn').addEventListener('click', toggleFullscreen);

document.getElementById('openRecordsBtn').addEventListener('click', () => {
  const t = I18N[state.lang];
  document.getElementById('infoModalTitle').textContent = t.recordsTitle;
  document.getElementById('infoModalBody').innerHTML = `
    <div style="font-size:42px;">🏆</div>
    <div style="font-size:18px;font-weight:800;">${t.bestScore}: <span style="color:#ffd166;">${state.bestScore}</span></div>
    <div style="font-size:15px;color:#cbd5e1;">Level ${state.level} (${state.name})</div>
  `;
  openModal('infoModal');
});

document.querySelectorAll('.promo-card').forEach(card => {
  card.addEventListener('click', () => {
    const t = I18N[state.lang];
    document.getElementById('infoModalTitle').textContent = t.promoTitle;
    document.getElementById('infoModalBody').innerHTML = `
      <div style="font-size:48px;">🎁</div>
      <p style="font-size:15px;">${state.dailyClaimed ? t.claimed : t.claimBonus}</p>
      <button class="play-main-btn ui-btn" id="claimPromoBtn" style="font-size:18px;padding:10px;" ${state.dailyClaimed ? 'disabled' : ''}>
        ${state.dailyClaimed ? '✓' : t.claimBonus}
      </button>
    `;
    openModal('infoModal');
    const claimBtn = document.getElementById('claimPromoBtn');
    if (claimBtn && !state.dailyClaimed) {
      claimBtn.addEventListener('click', () => {
        state.coins += 100;
        state.dailyClaimed = true;
        playTone(780, 'triangle', 0.15, 0.08);
        saveState();
        updateUI();
        closeModal('infoModal');
      });
    }
  });
});

document.getElementById('addFreeCoinsBtn').addEventListener('click', () => {
  state.coins += 50;
  playTone(680, 'sine', 0.1, 0.07);
  saveState();
  updateUI();
});