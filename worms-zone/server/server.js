const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const ARENA_HALF = 4500;
const TICK_RATE = 30; // 30 FPS server simulation
const FOOD_COUNT = 650;

const FRUITS = [
  { emoji: '🍒', val: 2, r: 9 },
  { emoji: '🍓', val: 5, r: 10 },
  { emoji: '🥕', val: 8, r: 11 },
  { emoji: '🍎', val: 9, r: 11 },
  { emoji: '🍌', val: 13, r: 12 },
  { emoji: '🍊', val: 14, r: 12 },
  { emoji: '🌽', val: 18, r: 13 },
  { emoji: '🥑', val: 24, r: 13 },
  { emoji: '🍍', val: 29, r: 14 },
  { emoji: '🍉', val: 30, r: 15 }
];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

// Static file server so friends can open the game directly from the same URL
const httpServer = http.createServer((req, res) => {
  const cleanUrl = (req.url || '/').split('?')[0];
  let filePath = path.join(__dirname, '..', 'client', cleanUrl === '/' ? 'index.html' : cleanUrl);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(__dirname, '..', 'client', 'index.html');
  }

  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

const wss = new WebSocketServer({ server: httpServer });

const players = new Map();
let foods = [];
let nextFoodId = 1;
let nextPlayerId = 1;

function randomArenaPos(margin = 200) {
  const limit = ARENA_HALF - margin;
  return {
    x: (Math.random() * 2 - 1) * limit,
    y: (Math.random() * 2 - 1) * limit
  };
}

function createFood(x, y) {
  const pos = (x !== undefined && y !== undefined) ? { x, y } : randomArenaPos(160);
  const spec = FRUITS[Math.floor(Math.random() * FRUITS.length)];
  return {
    id: nextFoodId++,
    x: pos.x,
    y: pos.y,
    emoji: spec.emoji,
    val: spec.val,
    r: spec.r
  };
}

function initFoods() {
  foods = [];
  for (let i = 0; i < FOOD_COUNT; i++) {
    foods.push(createFood());
  }
}

function calcRadius(score) {
  return Math.min(34, 13 + Math.pow(Math.max(10, score), 0.34) * 0.85);
}

function calcSegmentsCount(score) {
  return Math.min(320, Math.floor(18 + Math.pow(Math.max(10, score), 0.56) * 1.45));
}

function createPlayer(id, name, colors) {
  const spawn = randomArenaPos(500);
  const segments = [];
  for (let i = 0; i < 18; i++) {
    segments.push({ x: spawn.x - i * 6, y: spawn.y });
  }
  return {
    id,
    name: (name || 'Player').slice(0, 16),
    colors: Array.isArray(colors) && colors.length >= 2 ? colors : ['#ffffff', '#38bdf8'],
    x: spawn.x,
    y: spawn.y,
    angle: Math.random() * Math.PI * 2,
    targetAngle: 0,
    boosting: false,
    score: 10,
    kills: 0,
    shield: 4.0,
    segments,
    alive: true
  };
}

wss.on('connection', (ws) => {
  const id = nextPlayerId++;
  let player = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === 'join') {
      player = createPlayer(id, msg.name, msg.colors);
      player.targetAngle = player.angle;
      players.set(id, player);
      ws.send(JSON.stringify({
        type: 'joined',
        id,
        arenaHalf: ARENA_HALF
      }));
    } else if (msg.type === 'input' && player && player.alive) {
      if (typeof msg.angle === 'number' && Number.isFinite(msg.angle)) {
        player.targetAngle = msg.angle;
      }
      player.boosting = Boolean(msg.boosting);
    } else if (msg.type === 'respawn' && player) {
      const fresh = createPlayer(id, msg.name || player.name, msg.colors || player.colors);
      fresh.targetAngle = fresh.angle;
      players.set(id, fresh);
      player = fresh;
    }
  });

  ws.on('close', () => {
    players.delete(id);
  });
});

function killPlayer(victim, killer) {
  if (!victim || !victim.alive) return;
  victim.alive = false;

  // Drop fruits along victim's body
  for (let i = 0; i < victim.segments.length; i += 2) {
    const seg = victim.segments[i];
    if (foods.length < 1200) {
      foods.push({
        id: nextFoodId++,
        x: seg.x + (Math.random() - 0.5) * 18,
        y: seg.y + (Math.random() - 0.5) * 18,
        emoji: '🍉',
        val: 15,
        r: 14
      });
    }
  }

  if (killer && killer.id !== victim.id && killer.alive) {
    killer.kills += 1;
    if (killer.ws && killer.ws.readyState === 1) {
      killer.ws.send(JSON.stringify({ type: 'kill_credit', victimName: victim.name }));
    }
  }
}

// Attach ws reference on join
wss.on('connection', (ws) => {
  const origEmit = ws.emit.bind(ws);
  ws.emit = (event, ...args) => {
    if (event === 'message') {
      try {
        const parsed = JSON.parse(args[0].toString());
        if (parsed.type === 'join') {
          setTimeout(() => {
            const p = players.get(parsed._internalId);
          }, 0);
        }
      } catch {}
    }
    return origEmit(event, ...args);
  };
});

// Clean socket map
const socketsById = new Map();
wss.off('connection', () => {});

const realWss = new WebSocketServer({ noServer: true });
httpServer.on('upgrade', (req, socket, head) => {
  realWss.handleUpgrade(req, socket, head, (ws) => {
    const id = nextPlayerId++;
    socketsById.set(id, ws);
    let player = null;

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.type === 'join') {
        player = createPlayer(id, msg.name, msg.colors);
        player.targetAngle = player.angle;
        players.set(id, player);
        ws.send(JSON.stringify({
          type: 'joined',
          id,
          arenaHalf: ARENA_HALF
        }));
      } else if (msg.type === 'input' && player && player.alive) {
        if (typeof msg.angle === 'number' && Number.isFinite(msg.angle)) {
          player.targetAngle = msg.angle;
        }
        player.boosting = Boolean(msg.boosting);
      } else if (msg.type === 'respawn' && player) {
        const fresh = createPlayer(id, msg.name || player.name, msg.colors || player.colors);
        fresh.targetAngle = fresh.angle;
        players.set(id, fresh);
        player = fresh;
      }
    });

    ws.on('close', () => {
      socketsById.delete(id);
      players.delete(id);
    });
  });
});

// Close the earlier placeholder wss so only realWss handles upgrades
wss.close();

function stepSimulation(dt) {
  const activePlayers = Array.from(players.values()).filter((p) => p.alive);

  for (const p of activePlayers) {
    if (p.shield > 0) {
      p.shield = Math.max(0, p.shield - dt);
    }

    let diff = p.targetAngle - p.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    p.angle += diff * Math.min(1, dt * 8.5);

    const canBoost = p.boosting && p.score > 15;
    const speed = canBoost ? 340 : 195;
    if (canBoost) {
      p.score = Math.max(10, p.score - dt * 5);
    }

    p.x += Math.cos(p.angle) * speed * dt;
    p.y += Math.sin(p.angle) * speed * dt;

    const r = calcRadius(p.score);
    if (Math.abs(p.x) >= ARENA_HALF - r || Math.abs(p.y) >= ARENA_HALF - r) {
      const ws = socketsById.get(p.id);
      killPlayer(p, null);
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'died', score: Math.floor(p.score), kills: p.kills }));
      }
      continue;
    }

    const spacing = 6.2;
    p.segments[0] = { x: p.x, y: p.y };
    const targetSegs = calcSegmentsCount(p.score);
    while (p.segments.length < targetSegs) {
      const last = p.segments[p.segments.length - 1];
      p.segments.push({ x: last.x, y: last.y });
    }
    while (p.segments.length > targetSegs && p.segments.length > 12) {
      p.segments.pop();
    }

    for (let i = 1; i < p.segments.length; i++) {
      const prev = p.segments[i - 1];
      const curr = p.segments[i];
      const a = Math.atan2(prev.y - curr.y, prev.x - curr.x);
      curr.x = prev.x - Math.cos(a) * spacing;
      curr.y = prev.y - Math.sin(a) * spacing;
    }

    // Eat fruits
    const eatR = r + 14;
    for (let i = foods.length - 1; i >= 0; i--) {
      const f = foods[i];
      const dx = p.x - f.x;
      const dy = p.y - f.y;
      if (dx * dx + dy * dy < eatR * eatR) {
        p.score += f.val;
        foods.splice(i, 1);
        foods.push(createFood());
      }
    }
  }

  // Player-to-player collision check
  const stillAlive = Array.from(players.values()).filter((p) => p.alive);
  for (const p1 of stillAlive) {
    if (!p1.alive || p1.shield > 0) continue;
    const r1 = calcRadius(p1.score) * 0.78;

    for (const p2 of stillAlive) {
      if (p1.id === p2.id || !p2.alive) continue;
      const r2 = calcRadius(p2.score) * 0.78;

      for (let s = 2; s < p2.segments.length; s++) {
        const seg = p2.segments[s];
        const dx = p1.x - seg.x;
        const dy = p1.y - seg.y;
        if (dx * dx + dy * dy < (r1 + r2) * (r1 + r2)) {
          const ws1 = socketsById.get(p1.id);
          killPlayer(p1, p2);
          const ws2 = socketsById.get(p2.id);
          if (ws2 && ws2.readyState === 1) {
            ws2.send(JSON.stringify({ type: 'kill_credit', victimName: p1.name }));
          }
          if (ws1 && ws1.readyState === 1) {
            ws1.send(JSON.stringify({ type: 'died', score: Math.floor(p1.score), kills: p1.kills }));
          }
          break;
        }
      }
      if (!p1.alive) break;
    }
  }
}

function broadcastState() {
  const snapshotPlayers = Array.from(players.values())
    .filter((p) => p.alive)
    .map((p) => ({
      id: p.id,
      name: p.name,
      colors: p.colors,
      x: Math.round(p.x),
      y: Math.round(p.y),
      angle: Number(p.angle.toFixed(3)),
      score: Math.floor(p.score),
      shield: Number(p.shield.toFixed(1)),
      segments: p.segments.map((s) => ({ x: Math.round(s.x), y: Math.round(s.y) }))
    }));

  const payload = JSON.stringify({
    type: 'state',
    players: snapshotPlayers,
    foods: foods.map((f) => ({
      id: f.id,
      x: Math.round(f.x),
      y: Math.round(f.y),
      emoji: f.emoji,
      val: f.val,
      r: f.r
    }))
  });

  for (const ws of socketsById.values()) {
    if (ws.readyState === 1) {
      ws.send(payload);
    }
  }
}

initFoods();

let lastTime = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  stepSimulation(dt);
  broadcastState();
}, 1000 / TICK_RATE);

httpServer.listen(PORT, () => {
  console.log(`Worms Zone server running on http://localhost:${PORT}`);
});