function updateWorm(worm, dt, allWorms) {
  if (worm.shieldTime > 0) {
    const prevShield = worm.shieldTime;
    worm.shieldTime = Math.max(0, worm.shieldTime - dt);
    if (worm.isPlayer && prevShield > 0 && worm.shieldTime === 0) {
      const notice = document.getElementById('shieldNotice');
      notice.style.display = 'block';
      setTimeout(() => { notice.style.display = 'none'; }, 1800);
    }
  }

  for (const k in worm.effects) {
    if (worm.effects[k] > 0) worm.effects[k] = Math.max(0, worm.effects[k] - dt);
  }

  if (worm.isPlayer) {
    let diff = pointerAngle - worm.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    worm.angle += diff * 0.14;
  } else {
    worm.aiTimer -= dt;
    if (worm.aiTimer <= 0) {
      worm.aiTimer = 0.6 + Math.random() * 1.2;
      worm.aiTargetAngle = worm.angle + (Math.random() - 0.5) * 1.6;
    }
    // Avoid square arena walls smoothly
    const wallMargin = 320;
    if (worm.x > ARENA_HALF - wallMargin || worm.x < -ARENA_HALF + wallMargin ||
        worm.y > ARENA_HALF - wallMargin || worm.y < -ARENA_HALF + wallMargin) {
      worm.aiTargetAngle = Math.atan2(-worm.y, -worm.x);
    }
    let diff = worm.aiTargetAngle - worm.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    worm.angle += diff * 0.1;
  }

  const wantsBoost = worm.isPlayer ? isBoosting : false;
  const canBoost = wantsBoost && (worm.score > 20 || worm.effects.freeBoost > 0);
  const speed = canBoost ? 350 : 195;

  if (canBoost && worm.effects.freeBoost <= 0) {
    worm.score = Math.max(10, worm.score - dt * 6);
  }

  worm.x += Math.cos(worm.angle) * speed * dt;
  worm.y += Math.sin(worm.angle) * speed * dt;

  // Square Arena Border Check
  const rHead = calcWormRadius(worm.score);
  if (Math.abs(worm.x) >= ARENA_HALF - rHead || Math.abs(worm.y) >= ARENA_HALF - rHead) {
    killWorm(worm, bots, null);
    return;
  }

  const segSpacing = 6.2;
  worm.segments[0].x = worm.x;
  worm.segments[0].y = worm.y;

  const targetLen = calcTargetSegments(worm.score);
  while (worm.segments.length < targetLen) {
    const last = worm.segments[worm.segments.length - 1];
    worm.segments.push({ x: last.x, y: last.y });
  }
  while (worm.segments.length > targetLen && worm.segments.length > 12) {
    worm.segments.pop();
  }

  for (let i = 1; i < worm.segments.length; i++) {
    const prev = worm.segments[i - 1];
    const curr = worm.segments[i];
    const a = Math.atan2(prev.y - curr.y, prev.x - curr.x);
    curr.x = prev.x - Math.cos(a) * segSpacing;
    curr.y = prev.y - Math.sin(a) * segSpacing;
  }

  const eatRadius = rHead + (worm.effects.magnet > 0 ? 115 : 14);

  for (let i = foods.length - 1; i >= 0; i--) {
    const f = foods[i];
    const dist = Math.hypot(worm.x - f.x, worm.y - f.y);
    if (worm.effects.magnet > 0 && dist < 160) {
      f.x += (worm.x - f.x) * 0.14;
      f.y += (worm.y - f.y) * 0.14;
    }
    if (dist < eatRadius) {
      const gained = f.val * (worm.effects.double > 0 ? 2 : 1);
      worm.score += gained;

      if (worm.isPlayer) {
        playTone(520 + f.val * 10, 'sine', 0.05, 0.04);
        floatingTexts.push({
          x: f.x,
          y: f.y - 10,
          text: `+${gained}`,
          alpha: 1.0,
          color: gained >= 20 ? '#ffd166' : '#80ed99'
        });
      }

      const delay = 3 + Math.random() * 2;
      const samePlace = Math.random() < 0.5;
      const nextPos = samePlace
        ? {
            x: Math.max(-ARENA_HALF + 100, Math.min(ARENA_HALF - 100, f.x + (Math.random() - 0.5) * 30)),
            y: Math.max(-ARENA_HALF + 100, Math.min(ARENA_HALF - 100, f.y + (Math.random() - 0.5) * 30))
          }
        : randomPointInSquareArena(160);
      respawnQueue.push({ timer: delay, x: nextPos.x, y: nextPos.y });

      foods.splice(i, 1);
    }
  }

  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    if (Math.hypot(worm.x - p.x, worm.y - p.y) < rHead + p.r) {
      worm.effects[p.type] = 10;
      if (worm.isPlayer) playTone(760, 'triangle', 0.14, 0.08);
      powerups.splice(i, 1);
      spawnPowerup();
    }
  }
}

function checkWormCollisions() {
  const all = [player, ...bots].filter(Boolean);
  for (let i = 0; i < all.length; i++) {
    const w1 = all[i];
    if (!w1 || w1.shieldTime > 0) continue;
    const r1 = calcWormRadius(w1.score) * 0.78;

    for (let j = 0; j < all.length; j++) {
      if (i === j) continue;
      const w2 = all[j];
      if (!w2) continue;
      const r2 = calcWormRadius(w2.score) * 0.78;

      for (let s = 2; s < w2.segments.length; s++) {
        const seg = w2.segments[s];
        if (Math.hypot(w1.x - seg.x, w1.y - seg.y) < r1 + r2) {
          killWorm(w1, bots, w2);
          if (w1.isPlayer) return;
          break;
        }
      }
    }
  }
}

function drawWorm(worm) {
  const r = calcWormRadius(worm.score);
  const len = worm.segments.length;

  if (worm.shieldTime > 0) {
    const blink = worm.shieldTime < 1.5 && Math.floor(worm.shieldTime * 10) % 2 === 0;
    gCtx.strokeStyle = blink ? '#facc15' : 'rgba(76, 201, 240, 0.75)';
    gCtx.lineWidth = 4;
    gCtx.beginPath();
    gCtx.arc(worm.x, worm.y, r + 10, 0, Math.PI * 2);
    gCtx.stroke();
  }

  for (let i = len - 1; i >= 0; i--) {
    const seg = worm.segments[i];
    const segR = r * (1 - (i / len) * 0.32);
    gCtx.fillStyle = worm.colors[i % worm.colors.length];
    gCtx.beginPath();
    gCtx.arc(seg.x, seg.y, segR, 0, Math.PI * 2);
    gCtx.fill();
  }

  const eyeDist = r * 0.45;
  [-0.55, 0.55].forEach(offset => {
    const ex = worm.x + Math.cos(worm.angle + offset) * eyeDist;
    const ey = worm.y + Math.sin(worm.angle + offset) * eyeDist;
    gCtx.fillStyle = '#fff';
    gCtx.beginPath();
    gCtx.arc(ex, ey, r * 0.3, 0, Math.PI * 2);
    gCtx.fill();
    gCtx.fillStyle = '#111';
    gCtx.beginPath();
    gCtx.arc(ex + Math.cos(worm.angle) * (r * 0.12), ey + Math.sin(worm.angle) * (r * 0.12), r * 0.15, 0, Math.PI * 2);
    gCtx.fill();
  });

  gCtx.fillStyle = '#fff';
  gCtx.font = 'bold 13px Segoe UI';
  gCtx.textAlign = 'center';
  gCtx.fillText(worm.name, worm.x, worm.y - r - 10);
}

function drawMinimap() {
  const size = 112;
  const pad = 16;
  const x0 = pad;
  const y0 = gameCanvas.height - pad - size;
  const cx = x0 + size / 2;
  const cy = y0 + size / 2;

  gCtx.save();
  gCtx.fillStyle = 'rgba(10, 20, 35, 0.74)';
  gCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  gCtx.lineWidth = 2;
  gCtx.beginPath();
  gCtx.roundRect(x0, y0, size, size, 10);
  gCtx.fill();
  gCtx.stroke();

  const scale = (size / 2 - 6) / ARENA_HALF;
  bots.forEach(b => {
    gCtx.fillStyle = '#ff6b6b';
    gCtx.beginPath();
    gCtx.arc(cx + b.x * scale, cy + b.y * scale, 2.3, 0, Math.PI * 2);
    gCtx.fill();
  });

  if (player) {
    gCtx.fillStyle = '#80ed99';
    gCtx.beginPath();
    gCtx.arc(cx + player.x * scale, cy + player.y * scale, 4, 0, Math.PI * 2);
    gCtx.fill();
  }
  gCtx.restore();
}

function gameLoop(now) {
  if (!inGame || !player) return;
  const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  for (let i = respawnQueue.length - 1; i >= 0; i--) {
    respawnQueue[i].timer -= dt;
    if (respawnQueue[i].timer <= 0) {
      foods.push(createFruitItem(respawnQueue[i].x, respawnQueue[i].y));
      respawnQueue.splice(i, 1);
    }
  }

  updateWorm(player, dt, bots);
  if (!inGame) return;
  bots.forEach(b => updateWorm(b, dt, bots));
  checkWormCollisions();
  if (!inGame) return;

  // Closer default camera + smooth interpolation for Telescope (🔭) powerup
  const baseZoom = Math.max(0.72, 1.24 - Math.pow(player.score, 0.34) * 0.014);
  const targetZoom = player.effects.zoom > 0 ? baseZoom * 0.72 : baseZoom;
  currentZoom += (targetZoom - currentZoom) * Math.min(1, dt * 2.4);

  gCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
  gCtx.save();
  gCtx.translate(gameCanvas.width / 2, gameCanvas.height / 2);
  gCtx.scale(currentZoom, currentZoom);
  gCtx.translate(-player.x, -player.y);

  // Outside void background
  gCtx.fillStyle = '#091510';
  gCtx.fillRect(player.x - 3200, player.y - 3200, 6400, 6400);

  // Square Illustrated Arena Floor
  gCtx.fillStyle = arenaPattern || '#14362b';
  gCtx.fillRect(-ARENA_HALF, -ARENA_HALF, ARENA_HALF * 2, ARENA_HALF * 2);

  // Glowing Square Arena Boundary
  gCtx.strokeStyle = '#ef4444';
  gCtx.lineWidth = 16;
  gCtx.strokeRect(-ARENA_HALF, -ARENA_HALF, ARENA_HALF * 2, ARENA_HALF * 2);

  // Viewport Culling Bounds
  const viewW = (gameCanvas.width / currentZoom) * 0.65;
  const viewH = (gameCanvas.height / currentZoom) * 0.65;

  // Draw Fruits & Vegetables
  gCtx.textAlign = 'center';
  gCtx.textBaseline = 'middle';
  for (let i = 0; i < foods.length; i++) {
    const f = foods[i];
    if (Math.abs(f.x - player.x) > viewW || Math.abs(f.y - player.y) > viewH) continue;
    gCtx.font = `${f.r * 2.1}px Segoe UI Emoji, Apple Color Emoji, sans-serif`;
    gCtx.fillText(f.emoji, f.x, f.y);
  }

  // Draw Powerups
  powerups.forEach(p => {
    if (Math.abs(p.x - player.x) > viewW || Math.abs(p.y - player.y) > viewH) return;
    gCtx.fillStyle = p.color;
    gCtx.beginPath();
    gCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    gCtx.fill();
    gCtx.strokeStyle = '#fff';
    gCtx.lineWidth = 2.5;
    gCtx.stroke();
    gCtx.font = '18px sans-serif';
    gCtx.fillText(p.icon, p.x, p.y);
  });

  // Draw Bots & Player
  bots.forEach(drawWorm);
  drawWorm(player);

  // Draw Floating Score Numbers
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y -= 38 * dt;
    ft.alpha -= 1.25 * dt;
    if (ft.alpha <= 0) {
      floatingTexts.splice(i, 1);
      continue;
    }
    gCtx.save();
    gCtx.globalAlpha = ft.alpha;
    gCtx.font = '900 17px Segoe UI';
    gCtx.fillStyle = ft.color;
    gCtx.strokeStyle = '#000';
    gCtx.lineWidth = 3;
    gCtx.strokeText(ft.text, ft.x, ft.y);
    gCtx.fillText(ft.text, ft.x, ft.y);
    gCtx.restore();
  }

  gCtx.restore();

  // Square Minimap & HUD
  drawMinimap();
  document.getElementById('scoreVal').textContent = Math.floor(player.score);

  const effDiv = document.getElementById('activeEffects');
  effDiv.innerHTML = '';
  const effIcons = { magnet: '🧲', double: '⭐ 2x', zoom: '🔭', freeBoost: '⚡' };
  for (const k in player.effects) {
    if (player.effects[k] > 0) {
      const b = document.createElement('div');
      b.className = 'effect-badge';
      b.textContent = `${effIcons[k]} ${player.effects[k].toFixed(1)}s`;
      effDiv.appendChild(b);
    }
  }

  const all = [player, ...bots].sort((a, b) => b.score - a.score).slice(0, 5);
  const lbDiv = document.getElementById('leaderboardList');
  lbDiv.innerHTML = all.map((w, idx) => `
    <div class="lb-row ${w.isPlayer ? 'me' : ''}">
      <span>${idx + 1}. ${w.name}</span>
      <span>${Math.floor(w.score)}</span>
    </div>
  `).join('');

  gameAnimId = requestAnimationFrame(gameLoop);
}

// Init
updateUI();