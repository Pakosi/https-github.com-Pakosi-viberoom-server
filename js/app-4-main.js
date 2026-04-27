// ==================== ARCADE FIGHTER ====================
const arcadeCanvas = document.getElementById('arcade-canvas');
const actx = arcadeCanvas.getContext('2d');
const arcadePanel = document.getElementById('arcade-panel');
const arcadeScoreEl = document.getElementById('arcade-score');
const arcadeMetaEl = arcadePanel.querySelector('.mini-sub');
const arcadeTitleEl = arcadePanel.querySelector('h2');
if (arcadeTitleEl) arcadeTitleEl.textContent = '◆ WOYS FIGHTER ◆';
if (arcadeMetaEl) arcadeMetaEl.textContent = 'A/D move · W jump · S crouch · J light · K heavy · L special · Mobile: left drag + right attack pads';
arcadeCanvas.style.touchAction = 'none';

const fighterGame = {
  running: false,
  raf: 0,
  lastTs: 0,
  round: 1,
  timer: 60,
  state: 'attract', // attract | intro | fight | ko | over
  stateClock: 0,
  winner: null,
  shake: 0,
  particles: [],
  hitStop: 0,
  touch: {
    pointers: new Map(),
    moveId: null,
    moveStartX: 0,
    moveStartY: 0,
    moveX: 0,
    moveY: 0,
    rightPadLight: false,
    rightPadHeavy: false,
    rightPadSpecial: false
  },
  p1: null,
  p2: null,
};

const fighterKeys = {
  p1: { left:false, right:false, up:false, down:false, light:false, heavy:false, special:false },
};

function setArcadeHud(line1, line2) {
  arcadeScoreEl.textContent = line1;
  if (arcadeMetaEl) arcadeMetaEl.textContent = line2;
}

function makeFighter(name, x, dir, palette) {
  return {
    name,
    x,
    y: 0,
    vx: 0,
    vy: 0,
    dir,
    width: 26,
    height: 70,
    color: palette.body,
    accent: palette.accent,
    aura: palette.aura,
    health: 100,
    meter: 0,
    stocks: 0,
    state: 'idle',
    stateClock: 0,
    attackClock: 0,
    hitClock: 0,
    blockClock: 0,
    jumpCount: 0,
    onGround: true,
    combo: 0,
    lastHitAt: 0,
    attack: null,
    hurtFlash: 0,
    aiThink: 0,
    aiJumpBias: Math.random(),
    wins: 0,
  };
}

function resetFighterRound(fullReset=false) {
  fighterGame.p1 = makeFighter('PAX.EXE', 88, 1, { body:'#3a90ff', accent:'#b8dcff', aura:'#7bc7ff' });
  fighterGame.p2 = makeFighter('NOIR-9', 232, -1, { body:'#d94b5f', accent:'#ffd6db', aura:'#ff9aaa' });
  fighterGame.timer = 60;
  fighterGame.state = 'intro';
  fighterGame.stateClock = 1.5;
  fighterGame.winner = null;
  fighterGame.shake = 0;
  fighterGame.hitStop = 0;
  fighterGame.particles = [];
  if (fullReset) {
    fighterGame.round = 1;
    fighterGame.p1.wins = 0;
    fighterGame.p2.wins = 0;
  }
  setArcadeHud(`ROUND ${fighterGame.round} · FIRST TO 2`, 'A/D move · W jump · S crouch · J light · K heavy · L special');
  drawAttractOrGame();
}

function stopArcade() {
  fighterGame.running = false;
  fighterGame.touch.pointers.clear();
  fighterGame.touch.moveId = null;
  fighterKeys.p1.left = fighterKeys.p1.right = fighterKeys.p1.up = fighterKeys.p1.down = false;
  fighterKeys.p1.light = fighterKeys.p1.heavy = fighterKeys.p1.special = false;
  if (fighterGame.raf) cancelAnimationFrame(fighterGame.raf);
  fighterGame.raf = 0;
  drawAttractOrGame();
}

function startArcade() {
  if (arcadeTitleEl) arcadeTitleEl.textContent = '◆ WOYS FIGHTER ◆';
  if (fighterGame.state === 'attract' || !fighterGame.p1 || !fighterGame.p2) {
    resetFighterRound(true);
  }
  fighterGame.running = true;
  fighterGame.lastTs = 0;
  if (!fighterGame.raf) fighterGame.raf = requestAnimationFrame(fighterLoop);
}

function syncSnakePreview() {
  if (!snakeWallMesh) return;
  if (snakePreviewTex && snakePreviewTex.dispose) snakePreviewTex.dispose();
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#060606';
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.drawImage(arcadeCanvas, 80, 170, 864, 864);
  ctx.fillStyle = '#e8b96a';
  ctx.font = 'bold 74px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('WOYS FIGHTER', 512, 94);
  ctx.fillStyle = '#d8c8a8';
  ctx.font = '32px Arial';
  const subtitle = fighterGame.running ? 'LIVE CABINET MATCH' : 'PRESS E TO THROW HANDS';
  ctx.fillText(subtitle, 512, 964);
  snakePreviewTex = new THREE.CanvasTexture(c);
  snakePreviewTex.colorSpace = THREE.SRGBColorSpace;
  snakeWallMesh.material.map = snakePreviewTex;
  snakeWallMesh.material.needsUpdate = true;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a,b,t) { return a + (b-a)*t; }
function rand(min,max) { return min + Math.random()*(max-min); }
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function facingTarget(a, b) {
  return (b.x > a.x && a.dir === 1) || (b.x < a.x && a.dir === -1);
}

function fighterBodyRect(f) {
  return { x: f.x - f.width/2, y: 240 - f.height - f.y, w: f.width, h: f.height };
}
function fighterHitRect(f) {
  if (!f.attack) return null;
  const reach = f.attack.reach;
  const width = f.attack.width;
  const y = 240 - f.height - f.y + f.attack.top;
  const h = f.attack.height;
  return {
    x: f.dir === 1 ? f.x + 10 : f.x - 10 - reach,
    y,
    w: width,
    h,
  };
}

function spawnImpact(x, y, color, amount=8) {
  for (let i = 0; i < amount; i++) {
    fighterGame.particles.push({
      x, y,
      vx: rand(-90, 90),
      vy: rand(-120, 30),
      life: rand(0.18, 0.42),
      color,
      size: rand(3, 8),
    });
  }
}

const ATTACKS = {
  jab:     { startup:0.07, active:0.08, recovery:0.12, reach:28, width:28, height:16, top:24, damage:6, push:18, hitStop:0.045, meter:8, crouch:false, name:'JAB' },
  heavy:   { startup:0.14, active:0.12, recovery:0.18, reach:42, width:42, height:22, top:18, damage:12, push:28, hitStop:0.065, meter:12, crouch:false, name:'CRUSH' },
  low:     { startup:0.09, active:0.10, recovery:0.14, reach:26, width:28, height:14, top:50, damage:7, push:14, hitStop:0.04, meter:8, crouch:true, name:'LOW' },
  special: { startup:0.20, active:0.16, recovery:0.22, reach:56, width:56, height:24, top:20, damage:18, push:36, hitStop:0.09, meter:0, spend:40, crouch:false, projectile:false, name:'EX ARC' },
};

function tryAttack(f, kind) {
  if (!f.onGround || f.attack || f.hitClock > 0 || f.state === 'ko') return;
  const def = ATTACKS[kind];
  if (!def) return;
  if (kind === 'special' && f.meter < def.spend) return;
  if (kind === 'special') f.meter -= def.spend;
  f.attack = { ...def, t: 0, connected: false };
  f.state = kind === 'low' ? 'crouchAttack' : 'attack';
  if (kind === 'special') spawnImpact(f.x + f.dir*12, 240 - f.height - f.y + 26, '#ffd35a', 12);
}

function applyHit(attacker, defender) {
  if (!attacker.attack || attacker.attack.connected) return;
  const hit = fighterHitRect(attacker);
  const hurt = fighterBodyRect(defender);
  if (!hit || !rectsOverlap(hit, hurt)) return;

  const isBlocking = defender.onGround && defender.blockClock > 0 && facingTarget(defender, attacker) && ((attacker.attack.crouch && defender.state === 'crouch') || !attacker.attack.crouch);
  attacker.attack.connected = true;

  if (isBlocking) {
    defender.health = clamp(defender.health - attacker.attack.damage * 0.18, 0, 100);
    defender.vx += attacker.dir * attacker.attack.push * 0.3;
    defender.blockClock = 0.1;
    defender.hurtFlash = 0.07;
    fighterGame.hitStop = Math.max(fighterGame.hitStop, attacker.attack.hitStop * 0.45);
    fighterGame.shake = Math.max(fighterGame.shake, 2.5);
    spawnImpact(defender.x + defender.dir*6, hurt.y + 22, '#9ec5ff', 7);
    setArcadeHud(`${attacker.name} PRESSURES · ${defender.name} BLOCKS`, 'Street-fighter energy without the lawsuit.');
    return;
  }

  defender.health = clamp(defender.health - attacker.attack.damage, 0, 100);
  defender.hitClock = 0.16 + attacker.attack.damage * 0.004;
  defender.state = defender.health <= 0 ? 'ko' : 'hit';
  defender.vx = attacker.dir * attacker.attack.push;
  defender.vy = attacker.attack.damage > 10 ? 30 : 12;
  defender.onGround = false;
  defender.hurtFlash = 0.12;
  attacker.meter = clamp(attacker.meter + attacker.attack.meter, 0, 100);
  attacker.combo = (performance.now() - attacker.lastHitAt < 950) ? attacker.combo + 1 : 1;
  attacker.lastHitAt = performance.now();
  fighterGame.hitStop = Math.max(fighterGame.hitStop, attacker.attack.hitStop);
  fighterGame.shake = Math.max(fighterGame.shake, attacker.attack.damage > 10 ? 8 : 5);
  spawnImpact(defender.x + attacker.dir*10, hurt.y + 24, attacker.attack.name === 'EX ARC' ? '#ffd35a' : '#ffffff', attacker.attack.damage > 10 ? 16 : 10);
  setArcadeHud(`${attacker.name} ${attacker.attack.name} · ${Math.max(1, attacker.combo)} HIT`, defender.health <= 0 ? 'ABSOLUTE CINEMA.' : 'This cabinet has no business looking this good.');
}

function updateAttack(f, dt) {
  if (!f.attack) return;
  f.attack.t += dt;
  const total = f.attack.startup + f.attack.active + f.attack.recovery;
  if (f.attack.t >= total) {
    f.attack = null;
    if (f.state !== 'ko' && f.hitClock <= 0) f.state = f.onGround ? 'idle' : 'jump';
  }
}

function attackIsActive(f) {
  if (!f.attack) return false;
  return f.attack.t >= f.attack.startup && f.attack.t < f.attack.startup + f.attack.active;
}

function updatePlayerInput(dt) {
  const f = fighterGame.p1;
  if (!f || f.state === 'ko') return;
  const moveX = (fighterKeys.p1.left ? -1 : 0) + (fighterKeys.p1.right ? 1 : 0) + fighterGame.touch.moveX;
  const downHeld = fighterKeys.p1.down || fighterGame.touch.moveY > 0.35;
  const upHeld = fighterKeys.p1.up || fighterGame.touch.moveY < -0.65;

  if (upHeld && f.onGround) {
    f.vy = 92;
    f.onGround = false;
    f.state = 'jump';
  }
  if (f.onGround && !f.attack && f.hitClock <= 0) {
    f.vx = moveX * (downHeld ? 42 : 78);
    f.state = downHeld ? 'crouch' : (Math.abs(moveX) > 0.05 ? 'walk' : 'idle');
  } else {
    f.vx += moveX * dt * 42;
    f.vx = clamp(f.vx, -86, 86);
  }

  if (fighterKeys.p1.light || fighterGame.touch.rightPadLight) {
    tryAttack(f, downHeld ? 'low' : 'jab');
    fighterKeys.p1.light = false;
    fighterGame.touch.rightPadLight = false;
  }
  if (fighterKeys.p1.heavy || fighterGame.touch.rightPadHeavy) {
    tryAttack(f, 'heavy');
    fighterKeys.p1.heavy = false;
    fighterGame.touch.rightPadHeavy = false;
  }
  if (fighterKeys.p1.special || fighterGame.touch.rightPadSpecial) {
    tryAttack(f, 'special');
    fighterKeys.p1.special = false;
    fighterGame.touch.rightPadSpecial = false;
  }
}

function updateCpu(dt) {
  const f = fighterGame.p2;
  const enemy = fighterGame.p1;
  if (!f || !enemy || f.state === 'ko') return;
  f.aiThink -= dt;
  if (f.aiThink <= 0) {
    f.aiThink = rand(0.08, 0.18);
    const dx = enemy.x - f.x;
    const adx = Math.abs(dx);
    if (f.onGround && adx > 56) {
      f.vx = Math.sign(dx) * 66;
      f.state = 'walk';
    } else if (f.onGround && adx < 24) {
      f.vx = -Math.sign(dx) * 38;
      f.state = 'walk';
    } else {
      f.vx = 0;
      if (adx < 54 && Math.random() < 0.55) tryAttack(f, Math.random() < 0.6 ? 'jab' : 'heavy');
      else if (adx < 78 && f.meter >= 40 && Math.random() < 0.22) tryAttack(f, 'special');
      else if (f.onGround && Math.random() < 0.08 && f.aiJumpBias > 0.3) {
        f.vy = 88; f.onGround = false; f.state = 'jump';
      }
    }
    if (adx < 56 && facingTarget(f, enemy) && Math.random() < 0.28) {
      f.blockClock = rand(0.08, 0.16);
    }
  }
}

function updateFighterPhysics(f, dt) {
  if (!f) return;
  f.stateClock += dt;
  if (f.hitClock > 0) f.hitClock -= dt;
  if (f.blockClock > 0) f.blockClock -= dt;
  if (f.hurtFlash > 0) f.hurtFlash -= dt;
  if (!f.onGround) {
    f.vy -= 240 * dt;
    f.y += f.vy * dt;
    if (f.y <= 0) {
      f.y = 0; f.vy = 0; f.onGround = true;
      if (f.state !== 'ko' && f.hitClock <= 0 && !f.attack) f.state = 'idle';
    }
  }
  f.x += f.vx * dt;
  f.vx *= f.onGround ? 0.84 : 0.985;
  f.x = clamp(f.x, 28, 292);
  updateAttack(f, dt);
}

function resolveSpacing() {
  const a = fighterGame.p1, b = fighterGame.p2;
  if (!a || !b) return;
  const min = 34;
  const dx = b.x - a.x;
  const adx = Math.abs(dx);
  if (adx < min) {
    const push = (min - adx) * 0.5;
    const dir = dx >= 0 ? 1 : -1;
    a.x -= push * dir;
    b.x += push * dir;
    a.x = clamp(a.x, 24, 296);
    b.x = clamp(b.x, 24, 296);
  }
  a.dir = b.x >= a.x ? 1 : -1;
  b.dir = a.x >= b.x ? 1 : -1;
}

function updateParticles(dt) {
  for (let i = fighterGame.particles.length - 1; i >= 0; i--) {
    const p = fighterGame.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 180 * dt;
    if (p.life <= 0) fighterGame.particles.splice(i, 1);
  }
}

function updateFighterGame(dt) {
  if (fighterGame.hitStop > 0) {
    fighterGame.hitStop -= dt;
    updateParticles(dt * 0.4);
    return;
  }

  if (fighterGame.state === 'intro') {
    fighterGame.stateClock -= dt;
    if (fighterGame.stateClock <= 0) {
      fighterGame.state = 'fight';
      fighterGame.stateClock = 0;
      setArcadeHud(`ROUND ${fighterGame.round} · FIGHT`, 'Somebody is about to get embarrassed on a luxury cabinet.');
    }
  } else if (fighterGame.state === 'fight') {
    fighterGame.timer -= dt;
    updatePlayerInput(dt);
    updateCpu(dt);
    updateFighterPhysics(fighterGame.p1, dt);
    updateFighterPhysics(fighterGame.p2, dt);
    resolveSpacing();
    if (attackIsActive(fighterGame.p1)) applyHit(fighterGame.p1, fighterGame.p2);
    if (attackIsActive(fighterGame.p2)) applyHit(fighterGame.p2, fighterGame.p1);

    if (fighterGame.p1.health <= 0 || fighterGame.p2.health <= 0 || fighterGame.timer <= 0) {
      fighterGame.state = 'ko';
      fighterGame.stateClock = 1.5;
      fighterGame.winner = fighterGame.p1.health === fighterGame.p2.health ? null : (fighterGame.p1.health > fighterGame.p2.health ? fighterGame.p1 : fighterGame.p2);
      if (fighterGame.winner) fighterGame.winner.wins += 1;
      setArcadeHud(fighterGame.winner ? `${fighterGame.winner.name} WINS THE ROUND` : 'DRAW GAME', fighterGame.winner ? 'Nasty work.' : 'Mutual destruction. Very mature.');
    }
  } else if (fighterGame.state === 'ko') {
    fighterGame.stateClock -= dt;
    if (fighterGame.stateClock <= 0) {
      const p1Wins = fighterGame.p1.wins;
      const p2Wins = fighterGame.p2.wins;
      if (p1Wins >= 2 || p2Wins >= 2) {
        fighterGame.state = 'over';
        fighterGame.stateClock = 2.4;
        const champ = p1Wins > p2Wins ? fighterGame.p1 : fighterGame.p2;
        setArcadeHud(`${champ.name} TAKES THE SET`, 'Tap the screen to run it back.');
      } else {
        fighterGame.round += 1;
        const p1Total = fighterGame.p1.wins;
        const p2Total = fighterGame.p2.wins;
        resetFighterRound(false);
        fighterGame.p1.wins = p1Total;
        fighterGame.p2.wins = p2Total;
      }
    }
  } else if (fighterGame.state === 'over') {
    fighterGame.stateClock -= dt;
  }

  updateParticles(dt);
  fighterGame.shake = Math.max(0, fighterGame.shake - dt * 18);
}

function drawHealthBar(x, y, w, label, fighter, right=false) {
  actx.save();
  actx.fillStyle = 'rgba(0,0,0,0.45)';
  actx.fillRect(x, y, w, 12);
  actx.strokeStyle = '#d2a35a';
  actx.strokeRect(x, y, w, 12);
  const fill = w * clamp(fighter.health / 100, 0, 1);
  actx.fillStyle = fighter.health > 35 ? fighter.accent : '#ff8a8a';
  if (right) actx.fillRect(x + (w - fill), y, fill, 12); else actx.fillRect(x, y, fill, 12);
  actx.fillStyle = '#f2e4c8';
  actx.font = 'bold 10px Courier New';
  actx.fillText(label, x, y - 4);
  actx.fillStyle = 'rgba(0,0,0,0.45)';
  actx.fillRect(x, y + 18, w, 6);
  actx.fillStyle = '#ffd35a';
  const meterFill = w * clamp(fighter.meter / 100, 0, 1);
  if (right) actx.fillRect(x + (w - meterFill), y + 18, meterFill, 6); else actx.fillRect(x, y + 18, meterFill, 6);
  actx.restore();
}

function drawFighter(f) {
  const groundY = 240;
  const baseX = f.x;
  const baseY = groundY - f.y;
  const bodyW = f.width;
  const bodyH = f.height;
  const bob = f.state === 'walk' ? Math.sin(performance.now() * 0.02 + baseX * 0.2) * 1.5 : 0;
  const hurt = f.hurtFlash > 0;

  actx.save();
  if (hurt) {
    actx.shadowBlur = 18;
    actx.shadowColor = '#ffffff';
  }
  actx.translate(baseX, baseY + bob);
  actx.scale(f.dir, 1);

  // shadow
  actx.restore();
  actx.save();
  actx.fillStyle = 'rgba(0,0,0,0.28)';
  actx.beginPath();
  actx.ellipse(baseX, 246, 22, 6, 0, 0, Math.PI * 2);
  actx.fill();
  actx.restore();

  actx.save();
  actx.translate(baseX, baseY + bob);
  actx.scale(f.dir, 1);
  actx.fillStyle = f.color;
  actx.fillRect(-bodyW/2, -bodyH, bodyW, bodyH - 16);
  actx.fillStyle = '#f2d2ba';
  actx.fillRect(-10, -bodyH - 16, 20, 20);
  actx.fillStyle = f.accent;
  actx.fillRect(-bodyW/2, -bodyH + 8, bodyW, 8);
  actx.fillStyle = '#10131a';
  actx.fillRect(-5, -bodyH - 10, 3, 3);
  actx.fillRect(2, -bodyH - 10, 3, 3);

  const armSwing = f.attack ? 16 : (f.state === 'walk' ? Math.sin(performance.now()*0.018 + baseX*0.3) * 6 : 0);
  const frontArmY = -bodyH + 18;
  const rearArmY = -bodyH + 22;
  actx.fillStyle = f.color;
  actx.fillRect(8, frontArmY, f.attack ? 18 : 10, 8);
  actx.fillRect(-18, rearArmY, 10, 8);
  actx.fillStyle = '#f2d2ba';
  actx.fillRect(18, frontArmY, 8 + Math.max(0, armSwing), 8);
  actx.fillRect(-26, rearArmY, 8, 8);

  actx.fillStyle = '#1b1d26';
  actx.fillRect(-10, -16, 8, 16);
  actx.fillRect(2, -16, 8, 16);
  actx.restore();

  const hit = fighterHitRect(f);
  if (hit && attackIsActive(f)) {
    actx.save();
    actx.fillStyle = f.attack.name === 'EX ARC' ? 'rgba(255,211,90,0.35)' : 'rgba(255,255,255,0.22)';
    actx.fillRect(hit.x, hit.y, hit.w, hit.h);
    actx.restore();
  }
}

function drawMobilePads() {
  if (!(window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900)) return;
  actx.save();
  actx.globalAlpha = 0.8;
  actx.strokeStyle = '#e8b96a';
  actx.lineWidth = 2;
  actx.strokeRect(10, 252, 92, 58);
  actx.strokeRect(214, 248, 30, 24);
  actx.strokeRect(248, 248, 30, 24);
  actx.strokeRect(282, 248, 28, 24);
  actx.fillStyle = '#f2e4c8';
  actx.font = 'bold 10px Courier New';
  actx.fillText('MOVE', 38, 322);
  actx.fillText('J', 225, 264);
  actx.fillText('K', 259, 264);
  actx.fillText('L', 291, 264);
  actx.restore();
}

function drawAttractOrGame() {
  actx.clearRect(0, 0, arcadeCanvas.width, arcadeCanvas.height);
  const t = performance.now() * 0.001;
  const shakeX = fighterGame.running ? rand(-fighterGame.shake, fighterGame.shake) : 0;
  const shakeY = fighterGame.running ? rand(-fighterGame.shake*0.3, fighterGame.shake*0.3) : 0;
  actx.save();
  actx.translate(shakeX, shakeY);

  const bg = actx.createLinearGradient(0, 0, 0, 320);
  bg.addColorStop(0, '#140b17');
  bg.addColorStop(0.55, '#22132b');
  bg.addColorStop(1, '#08060d');
  actx.fillStyle = bg;
  actx.fillRect(0, 0, 320, 320);

  for (let i = 0; i < 9; i++) {
    actx.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
    actx.fillRect(i * 36, 0, 36, 320);
  }
  actx.fillStyle = 'rgba(255,200,120,0.08)';
  actx.fillRect(0, 204, 320, 4);
  actx.fillStyle = '#0d0d12';
  actx.fillRect(0, 248, 320, 72);
  actx.fillStyle = 'rgba(255,255,255,0.07)';
  for (let i = 0; i < 12; i++) actx.fillRect(i*28, 251 + (i%2), 18, 1);

  if (!fighterGame.running && fighterGame.state === 'attract') {
    actx.fillStyle = '#e8b96a';
    actx.font = 'bold 30px Arial';
    actx.textAlign = 'center';
    actx.fillText('WOYS FIGHTER', 160, 54);
    actx.fillStyle = '#f2e4c8';
    actx.font = 'bold 13px Courier New';
    actx.fillText('PRESTIGE ARCADE VIOLENCE', 160, 76);
    drawAttractFighter(92, 228, '#3a90ff', '#b8dcff', Math.sin(t*2)*2.5, 1);
    drawAttractFighter(228, 228, '#d94b5f', '#ffd6db', Math.sin(t*2+1.8)*2.5, -1);
    actx.fillStyle = 'rgba(255,211,90,0.95)';
    actx.font = 'bold 15px Courier New';
    actx.fillText('PRESS E TO THROW HANDS', 160, 292);
  } else {
    drawHealthBar(18, 14, 112, fighterGame.p1.name, fighterGame.p1, false);
    drawHealthBar(190, 14, 112, fighterGame.p2.name, fighterGame.p2, true);
    actx.fillStyle = '#ffd35a';
    actx.font = 'bold 18px Courier New';
    actx.textAlign = 'center';
    actx.fillText(String(Math.max(0, Math.ceil(fighterGame.timer))).padStart(2, '0'), 160, 28);
    drawFighter(fighterGame.p1);
    drawFighter(fighterGame.p2);
    for (const p of fighterGame.particles) {
      actx.globalAlpha = clamp(p.life / 0.42, 0, 1);
      actx.fillStyle = p.color;
      actx.fillRect(p.x, p.y, p.size, p.size);
    }
    actx.globalAlpha = 1;
    if (fighterGame.state === 'intro') {
      banner('ROUND ' + fighterGame.round);
    } else if (fighterGame.state === 'ko') {
      banner('K.O.');
    } else if (fighterGame.state === 'over') {
      banner(fighterGame.winner ? fighterGame.winner.name + ' WINS' : 'DRAW');
      actx.fillStyle = '#f2e4c8';
      actx.font = 'bold 12px Courier New';
      actx.fillText('TAP CANVAS TO RUN IT BACK', 160, 194);
    }
    drawMobilePads();
  }

  actx.restore();
  syncSnakePreview();
}

function drawAttractFighter(x, y, body, accent, bob, dir) {
  actx.save();
  actx.translate(x, y + bob);
  actx.scale(dir, 1);
  actx.fillStyle = 'rgba(0,0,0,0.25)';
  actx.beginPath(); actx.ellipse(0, 18, 20, 6, 0, 0, Math.PI*2); actx.fill();
  actx.fillStyle = body;
  actx.fillRect(-14, -56, 28, 40);
  actx.fillStyle = '#f2d2ba';
  actx.fillRect(-10, -72, 20, 18);
  actx.fillStyle = accent;
  actx.fillRect(-14, -50, 28, 7);
  actx.fillStyle = '#1b1d26';
  actx.fillRect(-9, -16, 8, 18);
  actx.fillRect(1, -16, 8, 18);
  actx.restore();
}

function banner(text) {
  actx.save();
  actx.fillStyle = 'rgba(0,0,0,0.48)';
  actx.fillRect(56, 104, 208, 52);
  actx.strokeStyle = '#e8b96a';
  actx.strokeRect(56, 104, 208, 52);
  actx.fillStyle = '#ffd35a';
  actx.font = 'bold 26px Courier New';
  actx.textAlign = 'center';
  actx.fillText(text, 160, 138);
  actx.restore();
}

function fighterLoop(ts) {
  if (!fighterGame.running) {
    fighterGame.raf = 0;
    drawAttractOrGame();
    return;
  }
  const dt = Math.min(0.033, fighterGame.lastTs ? (ts - fighterGame.lastTs) / 1000 : 0.016);
  fighterGame.lastTs = ts;
  if (arcadePanel.style.display === 'block') updateFighterGame(dt);
  drawAttractOrGame();
  fighterGame.raf = requestAnimationFrame(fighterLoop);
}

function mapPointer(e) {
  const r = arcadeCanvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (arcadeCanvas.width / r.width),
    y: (e.clientY - r.top) * (arcadeCanvas.height / r.height)
  };
}

arcadeCanvas.addEventListener('pointerdown', (e) => {
  const pt = mapPointer(e);
  if (fighterGame.state === 'over') {
    resetFighterRound(true);
    startArcade();
    e.preventDefault();
    return;
  }
  if (pt.x < 120) {
    fighterGame.touch.moveId = e.pointerId;
    fighterGame.touch.moveStartX = pt.x;
    fighterGame.touch.moveStartY = pt.y;
  } else if (pt.x < 246) {
    fighterGame.touch.rightPadLight = true;
  } else if (pt.x < 280) {
    fighterGame.touch.rightPadHeavy = true;
  } else {
    fighterGame.touch.rightPadSpecial = true;
  }
  arcadeCanvas.setPointerCapture?.(e.pointerId);
  e.preventDefault();
}, { passive:false });

arcadeCanvas.addEventListener('pointermove', (e) => {
  if (fighterGame.touch.moveId !== e.pointerId) return;
  const pt = mapPointer(e);
  const dx = pt.x - fighterGame.touch.moveStartX;
  const dy = pt.y - fighterGame.touch.moveStartY;
  const maxR = 34;
  const mag = Math.hypot(dx, dy);
  fighterGame.touch.moveX = clamp(dx / maxR, -1, 1);
  fighterGame.touch.moveY = clamp(dy / maxR, -1, 1);
  if (mag > maxR) {
    fighterGame.touch.moveX = (dx / mag);
    fighterGame.touch.moveY = (dy / mag);
  }
  e.preventDefault();
}, { passive:false });

function releaseArcadePointer(e) {
  if (fighterGame.touch.moveId === e.pointerId) {
    fighterGame.touch.moveId = null;
    fighterGame.touch.moveX = 0;
    fighterGame.touch.moveY = 0;
  }
}
arcadeCanvas.addEventListener('pointerup', releaseArcadePointer);
arcadeCanvas.addEventListener('pointercancel', releaseArcadePointer);

function onArcadeKeyDown(e) {
  if (arcadePanel.style.display !== 'block') return;
  const k = e.key.toLowerCase();
  if (k === 'a' || k === 'arrowleft') fighterKeys.p1.left = true;
  if (k === 'd' || k === 'arrowright') fighterKeys.p1.right = true;
  if (k === 'w' || k === 'arrowup') fighterKeys.p1.up = true;
  if (k === 's' || k === 'arrowdown') fighterKeys.p1.down = true;
  if (k === 'j') fighterKeys.p1.light = true;
  if (k === 'k') fighterKeys.p1.heavy = true;
  if (k === 'l') fighterKeys.p1.special = true;
}
function onArcadeKeyUp(e) {
  const k = e.key.toLowerCase();
  if (k === 'a' || k === 'arrowleft') fighterKeys.p1.left = false;
  if (k === 'd' || k === 'arrowright') fighterKeys.p1.right = false;
  if (k === 'w' || k === 'arrowup') fighterKeys.p1.up = false;
  if (k === 's' || k === 'arrowdown') fighterKeys.p1.down = false;
}
document.addEventListener('keydown', onArcadeKeyDown);
document.addEventListener('keyup', onArcadeKeyUp);

fighterGame.state = 'attract';
setArcadeHud('WOYS FIGHTER · IDLE', 'Press E at the cabinet to launch the most illegal-looking premium mini fighter in the room.');
drawAttractOrGame();

// ==================== FINISH LOADING → SHOW START ====================
function finishLoading() {
  setLoad(100, 'READY');
  setTimeout(() => {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('start').style.display = 'flex';
  }, 500);
}
setLoad(95, 'FINALIZING...');
setTimeout(() => {
  try { finishLoading(); } catch (err) { showFatal(err && err.stack ? err.stack : err); }
}, 120);

// ==================== BEGIN ====================
document.getElementById('begin').onclick = () => {
  const v = document.getElementById('name-input').value.trim();
  player.name = (v || selectedChar.name).slice(0,14);
  player.preset = selectedChar;
  const pos = player.group.position.clone();
  scene.remove(player.group);
  player.group = makeCharacter(selectedChar, player.name);
  player.group.position.copy(pos);
  scene.add(player.group);

  const rid = document.getElementById('room-input').value.trim() || 'woys-room';
  document.getElementById('start').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  document.getElementById('top-right').style.display = 'flex';
  document.getElementById('crosshair').style.display = 'block';
  if (!isMobile()) renderer.domElement.requestPointerLock();
  connectWS(rid);
  refreshAdminInfo();
  document.getElementById('host-badge').style.display = isHostUser() ? 'block' : 'none';
  graphicsPerf.monitoring = false;
  setTimeout(() => { graphicsPerf.monitoring = true; }, 3000);
};

const graphicsSelect = document.getElementById('graphics-select');
if (graphicsSelect) {
  syncGraphicsSelect();
  graphicsSelect.onchange = () => {
    graphicsAutoFallbacks = 0;
    setGraphicsQuality(graphicsSelect.value, { save:true, notify:true });
  };
}

// ==================== REMOTES ====================
function updateRemotes(dt) {
  for (const r of remotes.values()) {
    if (!r.targetPos) continue;
    const lerp = Math.min(1, dt*12);
    r.group.position.lerp(r.targetPos, lerp);
    let dy = r.targetRy - r.group.rotation.y;
    while (dy > Math.PI) dy -= Math.PI*2;
    while (dy < -Math.PI) dy += Math.PI*2;
    r.group.rotation.y += dy * lerp;
    const u = r.group.userData;
    if (r.lastMoving) {
      u.walk += dt*10;
      const p = Math.sin(u.walk);
      u.legL.rotation.x=p*0.7; u.legR.rotation.x=-p*0.7;
      u.armL.rotation.x=-p*0.5; u.armR.rotation.x=p*0.5;
    } else {
      u.legL.rotation.x*=0.85; u.legR.rotation.x*=0.85;
      u.armL.rotation.x*=0.85; u.armR.rotation.x*=0.85;
    }
  }
}

// ==================== ANIMATIONS ====================
let safeOpen = 0;
function updateRoomFx(t, dt) {
  if (centerSculpture) {
    const pulseScale = 1 + eventPulse * 0.45;
    centerSculpture.rotation.y += dt * (0.8 + eventPulse * 2.2);
    centerSculpture.rotation.x = Math.sin(t * 0.8) * 0.15;
    centerSculpture.scale.setScalar(pulseScale);
    if (centerSculpture.material && centerSculpture.material.emissiveIntensity !== undefined) {
      centerSculpture.material.emissiveIntensity = 0.55 + eventPulse * 1.9;
    }
  }
  if (cashStack) cashStack.position.y = Math.sin(t * 1.6) * 0.05;
  if (safeDoor) {
    const target = Math.sin(t * 0.9) * 0.5 + 0.6;
    safeOpen += (target - safeOpen) * 0.02;
    safeDoor.position.z = 11.4 + Math.sin(safeOpen) * 0.8;
    safeDoor.position.x = -16.03 + (1 - Math.cos(safeOpen)) * 0.2;
    safeDoor.rotation.y = -safeOpen;
  }
  eventPulse = Math.max(0, eventPulse - dt * 0.9);

  for (let i = moneyRain.length - 1; i >= 0; i--) {
    const p = moneyRain[i];
    p.life -= dt;
    p.y += p.vy * dt;
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    p.mesh.position.set(p.x, p.y, p.z);
    p.mesh.rotation.x += p.rx * dt;
    p.mesh.rotation.y += p.ry * dt;
    p.mesh.rotation.z += p.rz * dt;
    p.mesh.material.opacity = Math.max(0, Math.min(0.95, p.life / 1.6));
    if (p.y < -0.5 || p.life <= 0) {
      moneyRainGroup.remove(p.mesh);
      if (p.mesh.geometry) p.mesh.geometry.dispose();
      if (p.mesh.material) p.mesh.material.dispose();
      moneyRain.splice(i, 1);
    }
  }

  placeTVOverlay();
}

// ==================== LOOP ====================
const graphicsPerf = {
  monitoring: false,
  sampleTime: 0,
  frames: 0,
  lowFor: 0,
  cooldown: 0
};
function sampleGraphicsPerformance(dt) {
  if (!graphicsPerf.monitoring) return;
  graphicsPerf.sampleTime += dt;
  graphicsPerf.frames += 1;
  graphicsPerf.cooldown = Math.max(0, graphicsPerf.cooldown - dt);
  if (graphicsPerf.sampleTime < 1.5) return;

  const fps = graphicsPerf.frames / graphicsPerf.sampleTime;
  const limit = MOBILE ? 24 : 30;
  graphicsPerf.lowFor = fps < limit ? graphicsPerf.lowFor + graphicsPerf.sampleTime : 0;
  graphicsPerf.sampleTime = 0;
  graphicsPerf.frames = 0;

  if (graphicsPerf.lowFor >= 5 && graphicsPerf.cooldown <= 0) {
    if (lowerGraphicsQualityAuto()) {
      graphicsPerf.cooldown = 12;
      graphicsPerf.lowFor = 0;
    }
  }
}
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  updatePlayer(dt, t);
  updateRemotes(dt);
  updateRoomFx(t, dt);
  updateCamera();
  renderer.render(scene, camera);
  sampleGraphicsPerformance(dt);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  deviceInfo.width = window.innerWidth;
  deviceInfo.height = window.innerHeight;
  deviceInfo.dpr = window.devicePixelRatio || 1;
  renderer.setSize(window.innerWidth, window.innerHeight);
  applyGraphicsQuality(false);
  drawAttractOrGame();
});

setInterval(() => { if (wsConnected) wsSend({type:'ping'}); }, 25000);
