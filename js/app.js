import * as THREE from 'three';
import { WS_URL, CHARS, FLOOR_Y, BOUNDS } from './config.js';

const $ = (id) => document.getElementById(id);
const MOBILE = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900;

const state = {
  ws: null,
  wsConnected: false,
  reconnectTimer: null,
  myId: null,
  roomId: 'vibe-room',
  selectedChar: CHARS[0],
  viewMode: 'third',
  pointerLocked: false,
  micOn: false,
  micStream: null,
  tvStartedByUser: false,
  hostState: {
    vibe: 'chill',
    media: { videoId: '', playing: false, startAt: 0, startedAt: 0 },
  },
  keys: {},
  remotes: new Map(),
  adminMode: false,
  adminObjects: {},
  adminOrder: [],
  adminIndex: 0,
  layoutState: {},
  blockers: [],
  interacts: [],
  moneyRain: [],
  eventPulse: 0,
};

function showFatal(msg) {
  console.error(msg);
  $('error-overlay').style.display = 'block';
  $('error-overlay').innerHTML = '<b>ROOM BUILD ERROR</b>' + String(msg).replace(/</g, '&lt;').replace(/\n/g, '<br>');
  $('loading').style.display = 'none';
  $('start').style.display = 'flex';
}
window.addEventListener('error', (e) => showFatal((e.message || 'Unknown error') + (e.filename ? `\n${e.filename}:${e.lineno}` : '')));
window.addEventListener('unhandledrejection', (e) => showFatal(e.reason || 'Unhandled promise rejection'));

function setLoad(pct, msg) {
  $('load-bar').style.width = pct + '%';
  if (msg) $('load-msg').textContent = msg;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
function anyPanelOpen() { return [...document.querySelectorAll('.panel')].some((p) => p.style.display === 'block'); }
function closeAllPanels() { document.querySelectorAll('.panel').forEach((p) => p.style.display = 'none'); }
function openPanel(id) { closeAllPanels(); $(id).style.display = 'block'; if (document.pointerLockElement) document.exitPointerLock(); }
function isMobile() { return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900; }
function isHostUser() { return !!(player.name && player.name.toLowerCase() === 'pax'); }
function ytIdFrom(input) {
  const s = String(input || '').trim();
  if (!s) return '';
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : '';
}

function canvasTex(w, h, drawFn) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  drawFn(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
function box(w, h, d, color, roughness = 0.55, metalness = 0.15) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  m.castShadow = true; m.receiveShadow = true; return m;
}
function roundedBox(w, h, d, color, roughness = 0.55, metalness = 0.15) {
  const group = new THREE.Group();
  const core = box(Math.max(0.1, w - 0.16), Math.max(0.1, h - 0.16), d, color, roughness, metalness); group.add(core);
  const sideL = box(0.08, h - 0.08, d, color, roughness, metalness); sideL.position.x = -w / 2 + 0.04; group.add(sideL);
  const sideR = box(0.08, h - 0.08, d, color, roughness, metalness); sideR.position.x =  w / 2 - 0.04; group.add(sideR);
  const top = box(w, 0.08, d, color, roughness, metalness); top.position.y = h / 2 - 0.04; group.add(top);
  const bot = box(w, 0.08, d, color, roughness, metalness); bot.position.y = -h / 2 + 0.04; group.add(bot);
  return group;
}
function makeLabelTexture(title, sub, accent = '#e8b96a', bg = '#111') {
  return canvasTex(1024, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, bg); g.addColorStop(1, '#1d1820');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = accent; ctx.lineWidth = 8; ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.fillStyle = accent; ctx.font = 'bold 84px Arial'; ctx.textAlign = 'center';
    ctx.fillText(title, w / 2, h / 2 - 20);
    ctx.font = '36px Arial'; ctx.fillStyle = '#f2e4c8'; ctx.fillText(sub, w / 2, h / 2 + 48);
  });
}
function makeWallTexture() {
  const t = canvasTex(1024, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#6a4129'); g.addColorStop(1, '#472918');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const brickW = 120, brickH = 46;
    for (let row = 0; row < Math.ceil(h / brickH) + 1; row++) {
      const y = row * brickH; const offset = (row % 2) ? brickW / 2 : 0;
      for (let col = -1; col < Math.ceil(w / brickW) + 2; col++) {
        const x = col * brickW + offset;
        ctx.fillStyle = (row + col) % 2 ? '#66402a' : '#7a4b31';
        ctx.fillRect(x + 2, y + 2, brickW - 4, brickH - 4);
      }
    }
  });
  t.repeat.set(4, 1.6);
  return t;
}
function makeMarbleTexture() {
  const t = canvasTex(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 850; i++) {
      const x = Math.random() * w, y = Math.random() * h, len = 14 + Math.random() * 90, a = Math.random() * Math.PI * 2;
      ctx.strokeStyle = Math.random() < 0.55 ? 'rgba(230,230,230,0.08)' : 'rgba(185,155,100,0.07)';
      ctx.lineWidth = 0.8 + Math.random() * 2.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
    }
  });
  t.repeat.set(5, 3);
  return t;
}
function makeCityTexture() {
  return canvasTex(2048, 768, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#060913'); g.addColorStop(0.45, '#0d1732'); g.addColorStop(1, '#1a202a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const bw = 26 + Math.random() * 100, bh = 110 + Math.random() * 380, x = Math.random() * (w - bw), y = h - bh;
      ctx.fillStyle = `rgba(${18 + Math.random() * 24},${22 + Math.random() * 28},${30 + Math.random() * 42},0.98)`;
      ctx.fillRect(x, y, bw, bh);
    }
  });
}
function makeSnakeScreenTexture() {
  return canvasTex(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#040404'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e8b96a'; ctx.font = 'bold 90px Arial'; ctx.textAlign = 'center'; ctx.fillText('SNAKE', w / 2, 150);
    ctx.fillStyle = '#d8c8a8'; ctx.font = '44px Arial'; ctx.fillText('PRESS E TO PLAY', w / 2, 820);
  });
}
function makeFifaTexture() {
  return canvasTex(1024, 576, (ctx, w, h) => {
    ctx.fillStyle = '#1a6b34'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 6; ctx.strokeRect(40, 40, w - 80, h - 80);
    ctx.beginPath(); ctx.moveTo(w / 2, 40); ctx.lineTo(w / 2, h - 40); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 52px Arial'; ctx.fillText('PS5 FIFA', 40, 72);
  });
}
function makeBasketballTexture() {
  return canvasTex(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#18110f'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d2a35a'; ctx.lineWidth = 10; ctx.strokeRect(50, 50, w - 100, h - 100);
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 180, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#f2e4c8'; ctx.font = 'bold 64px Arial'; ctx.textAlign = 'center'; ctx.fillText('PRIVATE COURT', w / 2, 140);
  });
}
function addChat(name, text, color = '#e8b96a') {
  const d = document.createElement('div');
  d.innerHTML = `<span class="name" style="color:${color}">${name}:</span> ${escapeHtml(text)}`;
  $('chat-log').appendChild(d);
  $('chat-log').scrollTop = $('chat-log').scrollHeight;
}

// three core
setLoad(5, 'SETTING UP SCENE...');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0d14);
scene.fog = new THREE.FogExp2(0x0a0d14, MOBILE ? 0.0022 : 0.0035);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 240);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(MOBILE ? Math.min(window.devicePixelRatio || 1, 1.15) : Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = MOBILE ? 1.75 : 1.95;
$('game').appendChild(renderer.domElement);

const roomGroup = new THREE.Group();
scene.add(roomGroup);
const moneyRainGroup = new THREE.Group();
scene.add(moneyRainGroup);

const marbleTex = makeMarbleTexture();
const wallTex = makeWallTexture();
const cityTex = makeCityTexture();
let snakePreviewTex = makeSnakeScreenTexture();
const fifaScreenTex = makeFifaTexture();
const basketFloorTex = makeBasketballTexture();

scene.add(new THREE.AmbientLight(0xffffff, MOBILE ? 0.95 : 0.82));
const hemi = new THREE.HemisphereLight(0xa7b7ff, 0x2b1c18, MOBILE ? 0.95 : 0.8); scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff4d8, MOBILE ? 1.45 : 1.35);
key.position.set(4, 14, 6); key.castShadow = true; key.shadow.mapSize.set(MOBILE ? 1024 : 1536, MOBILE ? 1024 : 1536); scene.add(key);
const purpleFill = new THREE.PointLight(0x5e47ff, MOBILE ? 1.5 : 2.2, 34); purpleFill.position.set(-15, 6, -10); scene.add(purpleFill);
const goldFill = new THREE.PointLight(0xe8b96a, MOBILE ? 1.45 : 2.0, 32); goldFill.position.set(14, 5, -8); scene.add(goldFill);

function makeCharacter(preset, nameOverride) {
  const g = new THREE.Group();
  const skin = preset.skin || 0xf0c89c;
  const name = nameOverride || preset.name;
  const legL = new THREE.Group(); legL.position.set(-0.2, 0.9, 0); const lL = box(0.38, 0.85, 0.38, 0x1a2438); lL.position.y = -0.4; legL.add(lL); const shoeL = box(0.42, 0.18, 0.55, 0xeeeeee); shoeL.position.set(0, -0.9, 0.08); legL.add(shoeL); g.add(legL);
  const legR = new THREE.Group(); legR.position.set(0.2, 0.9, 0); const lR = box(0.38, 0.85, 0.38, 0x1a2438); lR.position.y = -0.4; legR.add(lR); const shoeR = box(0.42, 0.18, 0.55, 0xeeeeee); shoeR.position.set(0, -0.9, 0.08); legR.add(shoeR); g.add(legR);
  let torso;
  if (preset.hoodie === 'barca') {
    const shirtTex = canvasTex(128, 128, (ctx, w, h) => { for (let x = 0; x < w; x += 16) { ctx.fillStyle = (Math.floor(x / 16) % 2 === 0) ? '#a50044' : '#004d98'; ctx.fillRect(x, 0, 16, h); } });
    torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), new THREE.MeshStandardMaterial({ map: shirtTex, roughness: 0.7 }));
  } else {
    torso = box(0.9, 1.1, 0.5, new THREE.Color(preset.hoodie).getHex());
    const pocket = box(0.5, 0.3, 0.06, new THREE.Color(preset.hoodie).multiplyScalar(0.75).getHex()); pocket.position.set(0, 1.75, 0.26); g.add(pocket);
  }
  torso.position.y = 1.95; g.add(torso);
  const armColor = preset.hoodie === 'barca' ? 0xa50044 : new THREE.Color(preset.hoodie).getHex();
  const armL = new THREE.Group(); armL.position.set(-0.59, 2.4, 0); const aL = box(0.28, 1.0, 0.4, armColor); aL.position.y = -0.5; armL.add(aL); const handL = box(0.28, 0.22, 0.32, skin); handL.position.y = -1.1; armL.add(handL); g.add(armL);
  const armR = new THREE.Group(); armR.position.set(0.59, 2.4, 0); const aR = box(0.28, 1.0, 0.4, armColor); aR.position.y = -0.5; armR.add(aR); const handR = box(0.28, 0.22, 0.32, skin); handR.position.y = -1.1; armR.add(handR); g.add(armR);
  const head = box(0.8, 0.8, 0.8, skin); head.position.y = 2.9; g.add(head);
  if (preset.hair === 'bald') { const scalp = box(0.82, 0.15, 0.82, 0xf8d8b0); scalp.position.y = 3.22; g.add(scalp); }
  else if (preset.hair === 'fade') { const hair = box(0.82, 0.2, 0.82, 0x0a0a0a); hair.position.y = 3.15; g.add(hair); }
  else { const hair = box(0.82, 0.3, 0.82, 0x1a0f05); hair.position.y = 3.3; g.add(hair); }
  const eyeL = box(0.1, 0.1, 0.05, 0x0a0608); eyeL.position.set(-0.17, 2.95, 0.41); g.add(eyeL);
  const eyeR = box(0.1, 0.1, 0.05, 0x0a0608); eyeR.position.set(0.17, 2.95, 0.41); g.add(eyeR);
  const nose = box(preset.bigNose ? 0.22 : 0.12, preset.bigNose ? 0.35 : 0.12, preset.bigNose ? 0.28 : 0.12, skin); nose.position.set(0, 2.85, preset.bigNose ? 0.5 : 0.45); g.add(nose);
  const tagC = document.createElement('canvas'); tagC.width = 256; tagC.height = 72;
  const tctx = tagC.getContext('2d'); tctx.fillStyle = 'rgba(10,6,12,0.85)'; tctx.fillRect(0, 0, 256, 72); tctx.strokeStyle = preset.hoodie === 'barca' ? '#e8b96a' : preset.hoodie; tctx.lineWidth = 2; tctx.strokeRect(2, 2, 252, 68); tctx.fillStyle = preset.hoodie === 'barca' ? '#e8b96a' : preset.hoodie; tctx.font = 'bold 32px Courier New'; tctx.textAlign = 'center'; tctx.fillText(name, 128, 48);
  const tagTex = new THREE.CanvasTexture(tagC); tagTex.colorSpace = THREE.SRGBColorSpace;
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex, depthTest: false })); tag.scale.set(1.8, 0.5, 1); tag.position.y = 3.6; g.add(tag);
  g.userData = { head, armL, armR, legL, legR, tag, walk: 0, preset, name };
  return g;
}

const player = { group: makeCharacter(CHARS[0], 'Pax'), vel: new THREE.Vector3(), onGround: true, name: 'Pax', preset: CHARS[0], yaw: 0, pitch: 0, _moving: false };
player.group.position.set(0, FLOOR_Y, 12.3);
scene.add(player.group);
camera.position.set(0, 6.2, 18);

function registerAdminObject(id, object3d) { state.adminObjects[id] = { object3d }; state.adminOrder.push(id); }
function syncInteractAnchors() {
  for (const it of state.interacts) {
    if (!it.anchorId || !state.adminObjects[it.anchorId]) continue;
    const obj = state.adminObjects[it.anchorId].object3d;
    it.x = obj.position.x + (it.offsetX || 0);
    it.z = obj.position.z + (it.offsetZ || 0);
  }
  for (const b of state.blockers) {
    if (!b.anchorId || !state.adminObjects[b.anchorId]) continue;
    const obj = state.adminObjects[b.anchorId].object3d;
    const cx = obj.position.x + (b.offsetX || 0); const cz = obj.position.z + (b.offsetZ || 0);
    b.minX = cx - b.halfW; b.maxX = cx + b.halfW; b.minZ = cz - b.halfD; b.maxZ = cz + b.halfD;
  }
}
function refreshAdminInfo() {
  $('admin-badge').style.display = isHostUser() ? 'block' : 'none';
  $('admin-panel').style.display = state.adminMode && isHostUser() ? 'block' : 'none';
  if (!isHostUser()) return;
  $('admin-badge').textContent = state.adminMode ? 'ADMIN ON' : 'ADMIN OFF';
  const id = state.adminOrder[state.adminIndex];
  if (!id || !state.adminObjects[id]) return $('admin-info').textContent = 'No movable object selected';
  const o = state.adminObjects[id].object3d.position;
  $('admin-info').textContent = `${id.toUpperCase()}  X:${o.x.toFixed(1)} Z:${o.z.toFixed(1)} Y:${o.y.toFixed(1)}`;
}
function collectLayout() {
  const out = {};
  for (const id of state.adminOrder) {
    const obj = state.adminObjects[id].object3d;
    out[id] = { x: +obj.position.x.toFixed(3), y: +obj.position.y.toFixed(3), z: +obj.position.z.toFixed(3), ry: +obj.rotation.y.toFixed(3) };
  }
  return out;
}
function applyLayout(layout) {
  if (!layout) return;
  for (const id of Object.keys(layout)) {
    if (!state.adminObjects[id]) continue;
    const obj = state.adminObjects[id].object3d;
    const d = layout[id];
    if (typeof d.x === 'number') obj.position.x = d.x;
    if (typeof d.y === 'number') obj.position.y = d.y;
    if (typeof d.z === 'number') obj.position.z = d.z;
    if (typeof d.ry === 'number') obj.rotation.y = d.ry;
  }
  syncInteractAnchors(); refreshAdminInfo();
}

let boardWallMesh = null, snakeWallMesh = null, fifaScreenMesh = null, safeDoor = null, cashStack = null, centerSculpture = null, mediaScreenMesh = null;
let mediaScreenCanvas = null, mediaScreenCtx = null, mediaScreenTex = null;

function buildMediaScreenTexture() {
  mediaScreenCanvas = document.createElement('canvas'); mediaScreenCanvas.width = 1280; mediaScreenCanvas.height = 720;
  mediaScreenCtx = mediaScreenCanvas.getContext('2d'); mediaScreenTex = new THREE.CanvasTexture(mediaScreenCanvas); mediaScreenTex.colorSpace = THREE.SRGBColorSpace; drawMediaScreen();
}
function drawMediaScreen() {
  if (!mediaScreenCtx) return;
  const ctx = mediaScreenCtx, w = mediaScreenCanvas.width, h = mediaScreenCanvas.height;
  const g = ctx.createLinearGradient(0,0,w,h); g.addColorStop(0, '#0b1020'); g.addColorStop(1, '#1f120d'); ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle = '#e8b96a'; ctx.lineWidth = 10; ctx.strokeRect(18,18,w-36,h-36);
  ctx.fillStyle = '#e8b96a'; ctx.font = 'bold 82px Arial'; ctx.textAlign = 'center'; ctx.fillText('MEDIA WALL', w/2, 115);
  if (state.hostState.media.videoId) {
    ctx.fillStyle = '#f2e4c8'; ctx.font = 'bold 46px Arial'; ctx.fillText('LIVE YOUTUBE TV', w/2, 210); ctx.font = '34px Arial'; ctx.fillText(state.hostState.media.videoId, w/2, 280);
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(240, 350, 800, 220);
    ctx.fillStyle = '#d8c8a8'; ctx.font = '32px Arial'; ctx.fillText('PRESS E OR V TO OPEN TV', w/2, 460);
  } else {
    ctx.fillStyle = '#f2e4c8'; ctx.font = 'bold 48px Arial'; ctx.fillText('HOST CONSOLE READY', w/2, 240); ctx.font = '32px Arial'; ctx.fillText('Press E near the TV or V to open', w/2, 320);
  }
  mediaScreenTex.needsUpdate = true;
}

function buildRoom() {
  setLoad(15, 'BUILDING ROOM...');
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(44, 30), new THREE.MeshStandardMaterial({ map: marbleTex, roughness: MOBILE ? 0.24 : 0.16, metalness: MOBILE ? 0.28 : 0.42, color: 0xffffff }));
  floor.rotation.x = -Math.PI/2; floor.receiveShadow = true; roomGroup.add(floor);
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(44, 0.45, 30), new THREE.MeshStandardMaterial({ color: 0x070a10, roughness: 0.92, metalness: 0.04 }));
  ceiling.position.set(0, 10.25, 0); roomGroup.add(ceiling);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, color: 0xe8e0d8, roughness: 0.82, metalness: 0.04 });
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 10, 30), wallMat); leftWall.position.set(-22, 5, 0); roomGroup.add(leftWall);
  const rightWall = leftWall.clone(); rightWall.position.x = 22; roomGroup.add(rightWall);
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(44, 10, 0.45), wallMat); backWall.position.set(0, 5, 15); roomGroup.add(backWall);
  const city = new THREE.Mesh(new THREE.PlaneGeometry(43, 9.1), new THREE.MeshBasicMaterial({ map: cityTex })); city.position.set(0, 5.05, -15.2); roomGroup.add(city);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(43, 9.1), new THREE.MeshPhysicalMaterial({ color: 0x8db7ff, transparent: true, opacity: 0.09, roughness: 0.08, metalness: 0.15, clearcoat: 1, transmission: 0.1 })); glass.position.set(0, 5.05, -15.01); roomGroup.add(glass);
  for (let x = -18; x <= 18; x += 9) { const mullion = box(0.3, 9.1, 0.3, 0x151923, 0.55, 0.4); mullion.position.set(x, 5, -15); roomGroup.add(mullion); }

  const ringGeo = new THREE.TorusGeometry(2.4, 0.22, 24, 96);
  centerSculpture = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({ color: 0xd9ab5d, emissive: 0x4a2400, emissiveIntensity: 0.55, roughness: 0.18, metalness: 0.9 }));
  centerSculpture.position.set(0, 4.2, -1.8); roomGroup.add(centerSculpture);
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 2), new THREE.MeshStandardMaterial({ color: 0xfff0c4, emissive: 0xffc86a, emissiveIntensity: 1.5, roughness: 0.15, metalness: 0.22 })); orb.position.set(0, 4.2, -1.8); roomGroup.add(orb);

  const loungeGroup = new THREE.Group(); loungeGroup.position.set(-11.5, 0, 8.2); roomGroup.add(loungeGroup); registerAdminObject('lounge_zone', loungeGroup);
  loungeGroup.add(roundedBox(8.8, 1.1, 1.8, 0x4a342d, 0.66, 0.08)); loungeGroup.children[0].position.set(0, 0.95, -2.4);
  const couchB = roundedBox(1.8, 1.1, 5.4, 0x4a342d, 0.66, 0.08); couchB.position.set(-3.6, 0.95, 0); loungeGroup.add(couchB);
  const couchC = roundedBox(3.6, 1.1, 1.8, 0x4a342d, 0.66, 0.08); couchC.position.set(0, 0.95, 2.4); loungeGroup.add(couchC);

  const barGroup = new THREE.Group(); barGroup.position.set(-15.3, 0, -7.3); roomGroup.add(barGroup); registerAdminObject('bar', barGroup);
  const barCounter = roundedBox(10.4, 1.15, 2.2, 0x22262d, 0.18, 0.82); barCounter.position.set(0, 0.95, 0); barGroup.add(barCounter);
  const barTop = box(10.8, 0.14, 2.4, 0x7a5d43, 0.16, 0.38); barTop.position.set(0, 1.56, 0); barGroup.add(barTop);

  const warGroup = new THREE.Group(); warGroup.position.set(6.5, 0, 5.1); roomGroup.add(warGroup); registerAdminObject('war_table', warGroup);
  const warBase = roundedBox(8.5, 0.85, 4.5, 0x252a32, 0.16, 0.84); warBase.position.set(0, 1.1, 0); warGroup.add(warBase);
  const tableDisplayTex = makeLabelTexture('WAR TABLE', 'TRACK THE ROOM', '#7adf9a', '#07101a');
  const tableDisplay = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 3.4), new THREE.MeshBasicMaterial({ map: tableDisplayTex })); tableDisplay.rotation.x = -Math.PI/2; tableDisplay.position.set(0, 1.58, 0); warGroup.add(tableDisplay);

  const presentationFrame = box(9.8, 5.6, 0.25, 0x12151b, 0.28, 0.72); presentationFrame.position.set(12.5, 4.2, -13.8); roomGroup.add(presentationFrame);
  boardWallMesh = new THREE.Mesh(new THREE.PlaneGeometry(8.9, 4.8), new THREE.MeshBasicMaterial({ color: 0xffffff })); boardWallMesh.position.set(12.5, 4.2, -13.62); roomGroup.add(boardWallMesh);

  const mediaFrame = new THREE.Mesh(new THREE.BoxGeometry(10.5, 5.8, 0.24), new THREE.MeshStandardMaterial({ color: 0x2b313a, roughness: 0.16, metalness: 0.82 })); mediaFrame.position.set(0, 4.4, 14.6); roomGroup.add(mediaFrame);
  buildMediaScreenTexture();
  mediaScreenMesh = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 5.1), new THREE.MeshBasicMaterial({ map: mediaScreenTex })); mediaScreenMesh.position.set(0, 4.4, 14.46); mediaScreenMesh.rotation.y = Math.PI; roomGroup.add(mediaScreenMesh);

  const fifaGroup = new THREE.Group(); fifaGroup.position.set(14.6, 0, -4.4); roomGroup.add(fifaGroup); registerAdminObject('fifa_zone', fifaGroup);
  const fifaFrame = box(7.6, 4.3, 0.24, 0x2a3039, 0.18, 0.88); fifaFrame.position.set(0, 4.0, 0); fifaGroup.add(fifaFrame);
  fifaScreenMesh = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 3.75), new THREE.MeshBasicMaterial({ map: fifaScreenTex })); fifaScreenMesh.position.set(0, 4.0, 0.21); fifaGroup.add(fifaScreenMesh);

  const snakeGroup = new THREE.Group(); snakeGroup.position.set(17.6, 0, 7.8); roomGroup.add(snakeGroup); registerAdminObject('snake_zone', snakeGroup);
  const snakeFrame = box(4.8, 5.8, 1.6, 0x2a2a2f, 0.28, 0.62); snakeFrame.position.set(0, 3.0, 0); snakeGroup.add(snakeFrame);
  snakeWallMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.5), new THREE.MeshBasicMaterial({ map: snakePreviewTex })); snakeWallMesh.position.set(0, 3.8, 0.81); snakeGroup.add(snakeWallMesh);

  const basketballGroup = new THREE.Group(); basketballGroup.position.set(15.6, 0, 10.4); roomGroup.add(basketballGroup); registerAdminObject('basketball_zone', basketballGroup);
  const courtPatch = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 6.8), new THREE.MeshStandardMaterial({ map: basketFloorTex, roughness: 0.38, metalness: 0.16 })); courtPatch.rotation.x = -Math.PI/2; courtPatch.position.set(0, 0.03, 0); basketballGroup.add(courtPatch);

  const moneyGroup = new THREE.Group(); moneyGroup.position.set(-17.1, 0, 11.4); roomGroup.add(moneyGroup); registerAdminObject('money_zone', moneyGroup);
  const safeBody = roundedBox(2.2, 2.2, 2.1, 0x2a2f36, 0.18, 0.82); safeBody.position.set(0, 1.15, 0); moneyGroup.add(safeBody);
  safeDoor = box(0.18, 1.6, 1.4, 0x353b43, 0.2, 0.88); safeDoor.position.set(1.07, 1.15, 0); moneyGroup.add(safeDoor);
  cashStack = new THREE.Group(); for (let row = 0; row < 3; row++) for (let i = 0; i < 4; i++) { const cash = box(0.9, 0.12, 0.56, 0x62b56b, 0.62, 0.04); cash.position.set(1.4 + i * 0.48, 0.11 + row * 0.13, 1.1 + (i % 2) * 0.1 + row * 0.12); cashStack.add(cash); } moneyGroup.add(cashStack);

  state.blockers.push(
    { anchorId:'bar', halfW:5.2, halfD:1.5, offsetX:0, offsetZ:0 },
    { anchorId:'lounge_zone', halfW:4.6, halfD:3.7, offsetX:0, offsetZ:0 },
    { anchorId:'war_table', halfW:4.4, halfD:2.5, offsetX:0, offsetZ:0 },
    { anchorId:'snake_zone', halfW:2.5, halfD:1.1, offsetX:0, offsetZ:0 },
    { anchorId:'basketball_zone', halfW:1.0, halfD:1.3, offsetX:4.1, offsetZ:0 },
    { anchorId:'money_zone', halfW:1.8, halfD:1.4, offsetX:0.6, offsetZ:0.4 }
  );
  state.interacts.push(
    { type: 'whiteboard', x: 12.5,  z: -11.7, r: 4.4, label: 'PRESENTATION WALL ✏️' },
    { type: 'table',      x: 6.5,   z: 5.1,   r: 4.0, label: 'WAR TABLE 🧠', anchorId:'war_table' },
    { type: 'lounge',     x: -11.6, z: 8.2,   r: 4.0, label: 'LOUNGE 🛋️', anchorId:'lounge_zone', offsetX:0.2, offsetZ:2.4 },
    { type: 'arcade',     x: 17.2,  z: 7.9,   r: 3.2, label: 'PLAY SNAKE 🎮', anchorId:'snake_zone', offsetX:0, offsetZ:0.2 },
    { type: 'ttt',        x: 16.3,  z: 1.8,   r: 3.2, label: 'TIC TAC TOE ✖️' },
    { type: 'coffee',     x: -14.0, z: -7.1,  r: 4.2, label: 'BAR / COFFEE ☕', anchorId:'bar', offsetX:1.4, offsetZ:0.2 },
    { type: 'basketball', x: 16.0,  z: 10.6,  r: 3.8, label: 'BASKETBALL 🏀', anchorId:'basketball_zone', offsetX:-2.4, offsetZ:0 },
    { type: 'fifa',       x: 14.6,  z: -3.8,  r: 3.6, label: 'PS5 FIFA ⚽', anchorId:'fifa_zone', offsetX:0, offsetZ:2.8 },
    { type: 'money',      x: -16.0, z: 12.0,  r: 3.0, label: 'SAFE & CASH 💰', anchorId:'money_zone', offsetX:1.1, offsetZ:1.0 },
    { type: 'mediawall',  x: 0.0,   z: 12.0,  r: 4.2, label: 'MEDIA WALL 📺' },
  );
  syncInteractAnchors();
}

try { buildRoom(); } catch (err) { showFatal(err && err.stack ? err.stack : err); }

function setConn(stateName) {
  $('conn-badge').classList.remove('live', 'offline');
  if (stateName === 'online') { $('conn-badge').classList.add('live'); $('conn-badge').textContent = '● ONLINE'; }
  else { $('conn-badge').classList.add('offline'); $('conn-badge').textContent = stateName === 'connecting' ? '● CONNECTING' : '● DISCONNECTED'; }
}
function wsSend(obj) { if (state.wsConnected && state.ws?.readyState === 1) state.ws.send(JSON.stringify(obj)); }
function scheduleReconnect() {
  if (state.reconnectTimer) return;
  state.reconnectTimer = setTimeout(() => { state.reconnectTimer = null; if (!state.wsConnected) connectWS(state.roomId); }, 2000);
}
function addRemote(id, name, presetKey, pos) {
  if (state.remotes.has(id)) return;
  const preset = CHARS.find((c) => c.key === presetKey) || CHARS[5];
  const g = makeCharacter(preset, name);
  if (pos) g.position.set(pos.x, pos.y, pos.z); else g.position.set(0, FLOOR_Y, 12.3);
  scene.add(g);
  state.remotes.set(id, { group: g, name, preset, targetPos: g.position.clone(), targetRy: 0, lastMoving: false });
}
function handleServerMsg(msg) {
  switch (msg.type) {
    case 'welcome':
      state.myId = msg.id; for (const p of msg.players) addRemote(p.id, p.name, p.preset, p.pos);
      wsSend({ type: 'layout_load', room: state.roomId }); wsSend({ type: 'state_get' });
      break;
    case 'peer-join': addRemote(msg.id, msg.name, msg.preset, null); addChat('System', `*${msg.name} entered the room*`, '#7adf9a'); break;
    case 'peer-leave': { const r = state.remotes.get(msg.id); if (r) { scene.remove(r.group); state.remotes.delete(msg.id); } addChat('System', `*${msg.name || 'Someone'} left*`, '#e88080'); break; }
    case 'pos': { const r = state.remotes.get(msg.id); if (!r) return; r.targetPos.set(msg.data.x, msg.data.y, msg.data.z); r.targetRy = msg.data.ry; r.lastMoving = msg.data.m; break; }
    case 'chat': addChat(msg.data.name || 'friend', msg.data.text, '#e8b96a'); break;
    case 'draw': applyRemoteDraw(msg.data); break;
    case 'clear': paintBoardLocal(); break;
    case 'layout_load': applyLayout(msg.data || msg.layout || msg.objects); break;
    case 'room_state': applyRoomState(msg.data || {}); break;
    case 'host_event': if (msg.data?.kind === 'pulse') state.eventPulse = 1; if (msg.data?.kind === 'money') spawnMoneyBurst(); break;
  }
}
function connectWS(rid) {
  state.roomId = (rid || '').trim() || 'vibe-room';
  $('room-badge').textContent = 'ROOM: ' + state.roomId.toUpperCase().slice(0, 12);
  setConn('connecting');
  try { state.ws = new WebSocket(WS_URL); } catch { setConn('offline'); scheduleReconnect(); return; }
  state.ws.onopen = () => { state.wsConnected = true; setConn('online'); wsSend({ type: 'join', room: state.roomId, name: player.name, preset: player.preset.key }); };
  state.ws.onmessage = (ev) => { try { handleServerMsg(JSON.parse(ev.data)); } catch {} };
  state.ws.onclose = () => { state.wsConnected = false; setConn('offline'); for (const [, r] of state.remotes) scene.remove(r.group); state.remotes.clear(); scheduleReconnect(); };
}

function applyRoomState(data) {
  if (!data || typeof data !== 'object') return;
  if (data.vibe) state.hostState.vibe = data.vibe;
  if (data.media) state.hostState.media = { videoId: data.media.videoId || '', playing: !!data.media.playing, startAt: +data.media.startAt || 0, startedAt: +data.media.startedAt || 0 };
  if (!state.hostState.media.videoId) { $('tv-overlay').style.display = 'none'; $('tv-iframe').src = ''; $('tv-audio-join').style.display = 'none'; state.tvStartedByUser = false; }
  drawMediaScreen();
}
function startTVPlayback(withAudio = true) {
  if (!state.hostState.media.videoId) return;
  const elapsed = state.hostState.media.playing ? Math.max(0, Math.floor((Date.now() - state.hostState.media.startedAt) / 1000) + Math.floor(state.hostState.media.startAt || 0)) : Math.floor(state.hostState.media.startAt || 0);
  $('tv-iframe').src = `https://www.youtube.com/embed/${state.hostState.media.videoId}?autoplay=1&playsinline=1&controls=1&rel=0&modestbranding=1&start=${elapsed}&mute=${withAudio ? 0 : 1}`;
  state.tvStartedByUser = withAudio;
  $('tv-audio-join').style.display = withAudio ? 'none' : 'block';
}
function joinTVAudioAnywhere() {
  if (!state.hostState.media.videoId) return addChat('System', '*No TV audio to join right now*', '#e8b96a');
  startTVPlayback(true);
}
function spawnMoneyBurst() {
  for (let i = 0; i < 48; i++) {
    const bill = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.32), new THREE.MeshBasicMaterial({ color: 0x7fdc8c, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }));
    bill.position.set((Math.random() - 0.5) * 14, 8 + Math.random() * 5, -1 + (Math.random() - 0.5) * 10);
    bill.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI); moneyRainGroup.add(bill);
    state.moneyRain.push({ mesh: bill, x: bill.position.x, y: bill.position.y, z: bill.position.z, vy: -2.4 - Math.random() * 2.6, vx: (Math.random() - 0.5) * 0.8, vz: (Math.random() - 0.5) * 0.5, rx: (Math.random() - 0.5) * 4, ry: (Math.random() - 0.5) * 4, rz: (Math.random() - 0.5) * 4, life: 2.8 + Math.random() * 1.8 });
  }
}

function nearest() {
  const p = player.group.position; let best = null, bd = Infinity;
  for (const i of state.interacts) { const d = Math.hypot(p.x - i.x, p.z - i.z); if (d < i.r && d < bd) { best = i; bd = d; } }
  return best;
}
function tryInteract() {
  const i = nearest(); if (!i) return;
  if (i.type === 'whiteboard') openPanel('whiteboard');
  else if (i.type === 'arcade') { openPanel('arcade-panel'); startArcade(); }
  else if (i.type === 'ttt') { openPanel('ttt-panel'); resetTTT(); }
  else if (i.type === 'coffee') addChat('System', `*${player.name} orders an overpriced coffee ☕*`, '#e8b96a');
  else if (i.type === 'lounge') addChat('System', `*${player.name} sinks into the couch 🛋️*`, '#8ac8e8');
  else if (i.type === 'table') { $('war-count').textContent = String(state.remotes.size + 1); openPanel('war-panel'); }
  else if (i.type === 'basketball') openPanel('basketball-panel');
  else if (i.type === 'fifa') openPanel('fifa-panel');
  else if (i.type === 'money') addChat('System', `*${player.name} admires the cash pile 💰*`, '#7adf9a');
  else if (i.type === 'mediawall') { if (state.hostState.media.videoId) startTVPlayback(true); else addChat('System', '*TV is idle*', '#e8b96a'); }
}

function collideRectCircle(x, z, rect, r) { const cx = Math.max(rect.minX, Math.min(x, rect.maxX)); const cz = Math.max(rect.minZ, Math.min(z, rect.maxZ)); const dx = x - cx, dz = z - cz; return dx * dx + dz * dz < r * r; }
function canStand(x, z) {
  const PLAYER_RADIUS = 0.42;
  if (x < BOUNDS.minX + PLAYER_RADIUS || x > BOUNDS.maxX - PLAYER_RADIUS || z < BOUNDS.minZ + PLAYER_RADIUS || z > BOUNDS.maxZ - PLAYER_RADIUS) return false;
  for (const b of state.blockers) if (collideRectCircle(x, z, b, PLAYER_RADIUS)) return false;
  return true;
}

const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), rgt = new THREE.Vector3();
let lastPosT = 0;
function maybeBroadcastPos(t) {
  if (!state.wsConnected || t - lastPosT < 0.05) return;
  lastPosT = t; wsSend({ type:'pos', data: { x:+player.group.position.x.toFixed(3), y:+player.group.position.y.toFixed(3), z:+player.group.position.z.toFixed(3), ry:+player.group.rotation.y.toFixed(3), m:player._moving } });
}
function updatePlayer(dt, t) {
  if (anyPanelOpen() || state.adminMode) { player._moving = false; return; }
  const sp = state.keys.shift ? 9 : 5.4;
  fwd.set(Math.sin(player.yaw), 0, Math.cos(player.yaw)); rgt.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  let mx = 0, mz = 0;
  if (state.keys.w || state.keys.arrowup) { mx -= fwd.x; mz -= fwd.z; }
  if (state.keys.s || state.keys.arrowdown) { mx += fwd.x; mz += fwd.z; }
  if (state.keys.a || state.keys.arrowleft) { mx -= rgt.x; mz -= rgt.z; }
  if (state.keys.d || state.keys.arrowright) { mx += rgt.x; mz += rgt.z; }
  if (joyDelta.x !== 0 || joyDelta.y !== 0) { mx += -fwd.x * -joyDelta.y + rgt.x * joyDelta.x; mz += -fwd.z * -joyDelta.y + rgt.z * joyDelta.x; }
  const mag = Math.hypot(mx, mz); if (mag > 0) { mx = mx / mag * sp; mz = mz / mag * sp; }
  player.vel.y += -20 * dt;
  const ny = Math.max(FLOOR_Y, player.group.position.y + player.vel.y * dt);
  const tryX = player.group.position.x + mx * dt; if (canStand(tryX, player.group.position.z)) player.group.position.x = tryX;
  const tryZ = player.group.position.z + mz * dt; if (canStand(player.group.position.x, tryZ)) player.group.position.z = tryZ;
  if (ny <= FLOOR_Y) { player.vel.y = 0; player.onGround = true; }
  player.group.position.y = ny; player.group.rotation.y = player.yaw + Math.PI;
  player._moving = mag > 0.1;
  const u = player.group.userData;
  if (player._moving) { u.walk += dt * (state.keys.shift ? 14 : 10); const p = Math.sin(u.walk); u.legL.rotation.x = p * 0.7; u.legR.rotation.x = -p * 0.7; u.armL.rotation.x = -p * 0.5; u.armR.rotation.x = p * 0.5; }
  else { u.legL.rotation.x *= 0.85; u.legR.rotation.x *= 0.85; u.armL.rotation.x *= 0.85; u.armR.rotation.x *= 0.85; }
  const n = nearest(); if (n) { $('prompt').textContent = '▸ E: ' + n.label; $('prompt').style.display = 'block'; } else $('prompt').style.display = 'none';
  maybeBroadcastPos(t);
}
function updateRemotes(dt) {
  for (const r of state.remotes.values()) {
    const lerp = Math.min(1, dt * 12); r.group.position.lerp(r.targetPos, lerp);
    let dy = r.targetRy - r.group.rotation.y; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; r.group.rotation.y += dy * lerp;
    const u = r.group.userData;
    if (r.lastMoving) { u.walk += dt * 10; const p = Math.sin(u.walk); u.legL.rotation.x = p * 0.7; u.legR.rotation.x = -p * 0.7; u.armL.rotation.x = -p * 0.5; u.armR.rotation.x = p * 0.5; }
    else { u.legL.rotation.x *= 0.85; u.legR.rotation.x *= 0.85; u.armL.rotation.x *= 0.85; u.armR.rotation.x *= 0.85; }
  }
}
function updateCamera() {
  const head = player.group.position.clone(); head.y += 2.9;
  if (state.viewMode === 'first') {
    camera.position.copy(head); camera.position.x += Math.sin(player.yaw) * 0.1; camera.position.z += Math.cos(player.yaw) * 0.1;
    camera.lookAt(head.x - Math.sin(player.yaw) * Math.cos(player.pitch), head.y + Math.sin(player.pitch), head.z - Math.cos(player.yaw) * Math.cos(player.pitch));
  } else {
    const dist = 5.8; const tx = head.x + Math.sin(player.yaw) * dist * Math.cos(player.pitch), ty = head.y - Math.sin(player.pitch) * dist + 1.6, tz = head.z + Math.cos(player.yaw) * dist * Math.cos(player.pitch);
    camera.position.lerp(new THREE.Vector3(tx, ty, tz), 0.18); camera.lookAt(head);
  }
}
function updateRoomFx(t, dt) {
  if (centerSculpture) { centerSculpture.rotation.y += dt * (0.8 + state.eventPulse * 2.2); centerSculpture.rotation.x = Math.sin(t * 0.8) * 0.15; centerSculpture.scale.setScalar(1 + state.eventPulse * 0.45); }
  if (cashStack) cashStack.position.y = Math.sin(t * 1.6) * 0.05;
  if (safeDoor) { const target = Math.sin(t * 0.9) * 0.5 + 0.6; safeDoor.rotation.y += (-target - safeDoor.rotation.y) * 0.02; }
  state.eventPulse = Math.max(0, state.eventPulse - dt * 0.9);
  for (let i = state.moneyRain.length - 1; i >= 0; i--) {
    const p = state.moneyRain[i]; p.life -= dt; p.y += p.vy * dt; p.x += p.vx * dt; p.z += p.vz * dt; p.mesh.position.set(p.x, p.y, p.z);
    p.mesh.rotation.x += p.rx * dt; p.mesh.rotation.y += p.ry * dt; p.mesh.rotation.z += p.rz * dt; p.mesh.material.opacity = Math.max(0, Math.min(0.95, p.life / 1.6));
    if (p.y < -0.5 || p.life <= 0) { moneyRainGroup.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); state.moneyRain.splice(i, 1); }
  }
}

// whiteboard
const wbCanvas = document.createElement('canvas'); wbCanvas.width = 1280; wbCanvas.height = 640; const wbCtx = wbCanvas.getContext('2d');
function paintBoard() {
  wbCtx.fillStyle = '#1a1814'; wbCtx.fillRect(0, 0, 1280, 640); wbCtx.fillStyle = '#e8b96a'; wbCtx.font = 'bold 48px Courier New'; wbCtx.fillText('→ Ship fast', 140, 300); wbCtx.fillText('→ Compound returns', 140, 380); wbCtx.fillText('→ Trust the process', 140, 460); wbCtx.fillStyle = '#7adf9a'; wbCtx.font = 'bold italic 54px Impact'; wbCtx.fillText('TO THE MOON 🚀', 820, 560);
}
paintBoard(); const wbTex = new THREE.CanvasTexture(wbCanvas); wbTex.colorSpace = THREE.SRGBColorSpace; if (boardWallMesh) { boardWallMesh.material.map = wbTex; boardWallMesh.material.needsUpdate = true; }
const board = $('board-canvas'); const bctx = board.getContext('2d'); bctx.drawImage(wbCanvas, 0, 0, board.width, board.height);
function paintBoardLocal() { paintBoard(); bctx.drawImage(wbCanvas, 0, 0, board.width, board.height); wbTex.needsUpdate = true; }
let drawing = false, penSize = 4, penColor = '#e8b96a', lastX = 0, lastY = 0;
$('pen-color').oninput = (e) => { penColor = e.target.value; };
document.querySelectorAll('#whiteboard [data-size]').forEach((b) => b.onclick = () => { penSize = +b.dataset.size; });
$('eraser').onclick = () => { penColor = '#1a1814'; penSize = 26; };
$('clear-board').onclick = () => { paintBoardLocal(); wsSend({ type:'clear' }); };
function bpos(e) { const r = board.getBoundingClientRect(), ev = e.touches ? e.touches[0] : e; return { x:(ev.clientX - r.left) * (board.width / r.width), y:(ev.clientY - r.top) * (board.height / r.height) }; }
function bstart(e) { e.preventDefault(); drawing = true; const p = bpos(e); lastX = p.x; lastY = p.y; }
function syncWB() { wbCtx.drawImage(board, 0, 0, wbCanvas.width, wbCanvas.height); wbTex.needsUpdate = true; }
function bmove(e) { if (!drawing) return; e.preventDefault(); const p = bpos(e); bctx.strokeStyle = penColor; bctx.lineWidth = penSize; bctx.lineCap = 'round'; bctx.lineJoin = 'round'; bctx.beginPath(); bctx.moveTo(lastX, lastY); bctx.lineTo(p.x, p.y); bctx.stroke(); wsSend({ type:'draw', data:{ x1:lastX / board.width, y1:lastY / board.height, x2:p.x / board.width, y2:p.y / board.height, c:penColor, s:penSize } }); lastX = p.x; lastY = p.y; syncWB(); }
function bend() { drawing = false; }
function applyRemoteDraw(data) { bctx.strokeStyle = data.c; bctx.lineWidth = data.s; bctx.lineCap = 'round'; bctx.lineJoin = 'round'; bctx.beginPath(); bctx.moveTo(data.x1 * board.width, data.y1 * board.height); bctx.lineTo(data.x2 * board.width, data.y2 * board.height); bctx.stroke(); syncWB(); }
board.addEventListener('mousedown', bstart); board.addEventListener('mousemove', bmove); board.addEventListener('mouseup', bend); board.addEventListener('mouseleave', bend); board.addEventListener('touchstart', bstart, { passive:false }); board.addEventListener('touchmove', bmove, { passive:false }); board.addEventListener('touchend', bend);

// snake
const arcadeCanvas = $('arcade-canvas'), actx = arcadeCanvas.getContext('2d');
let snake = [{x:8,y:8},{x:7,y:8},{x:6,y:8}], snakeDir = {x:1,y:0}, snakeFood = {x:12,y:8}, snakeScore = 0, snakeLoop = null;
function syncSnakePreview() {
  if (!snakeWallMesh) return;
  if (snakePreviewTex?.dispose) snakePreviewTex.dispose();
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024; const ctx = c.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1024, 1024); ctx.drawImage(arcadeCanvas, 112, 200, 800, 800); ctx.fillStyle = '#e8b96a'; ctx.font = 'bold 80px Arial'; ctx.textAlign = 'center'; ctx.fillText('SNAKE', 512, 120); ctx.fillStyle = '#d8c8a8'; ctx.font = '36px Arial'; ctx.fillText('LIVE ARCADE', 512, 930);
  snakePreviewTex = new THREE.CanvasTexture(c); snakePreviewTex.colorSpace = THREE.SRGBColorSpace; snakeWallMesh.material.map = snakePreviewTex; snakeWallMesh.material.needsUpdate = true;
}
function drawSnake() { actx.fillStyle = '#000'; actx.fillRect(0,0,320,320); actx.fillStyle = '#e8b96a'; actx.fillRect(snakeFood.x * 20, snakeFood.y * 20, 18, 18); for (let i = 0; i < snake.length; i++) { actx.fillStyle = i === 0 ? '#7adf9a' : '#3a8a5a'; actx.fillRect(snake[i].x * 20, snake[i].y * 20, 18, 18); } syncSnakePreview(); }
function startArcade() { clearInterval(snakeLoop); snake = [{x:8,y:8},{x:7,y:8},{x:6,y:8}]; snakeDir = {x:1,y:0}; snakeFood = {x:12,y:8}; snakeScore = 0; $('arcade-score').textContent = 'SCORE: 0'; snakeLoop = setInterval(tickSnake, 140); drawSnake(); }
function tickSnake() {
  if ($('arcade-panel').style.display !== 'block') { clearInterval(snakeLoop); return; }
  const head = { x: snake[0].x + snakeDir.x, y: snake[0].y + snakeDir.y };
  if (head.x < 0 || head.x >= 16 || head.y < 0 || head.y >= 16 || snake.some((s) => s.x === head.x && s.y === head.y)) { clearInterval(snakeLoop); actx.fillStyle = '#000'; actx.fillRect(0,0,320,320); actx.fillStyle = '#e8b96a'; actx.font = 'bold 32px Courier New'; actx.textAlign = 'center'; actx.fillText('GAME OVER',160,140); actx.font = '18px Courier New'; actx.fillText('Score: ' + snakeScore, 160, 180); syncSnakePreview(); return; }
  snake.unshift(head);
  if (head.x === snakeFood.x && head.y === snakeFood.y) { snakeScore++; $('arcade-score').textContent = 'SCORE: ' + snakeScore; snakeFood = { x:Math.floor(Math.random() * 16), y:Math.floor(Math.random() * 16) }; }
  else snake.pop();
  drawSnake();
}
document.addEventListener('keydown', (e) => { if ($('arcade-panel').style.display !== 'block') return; if (e.key === 'ArrowUp' && snakeDir.y !== 1) snakeDir = {x:0,y:-1}; else if (e.key === 'ArrowDown' && snakeDir.y !== -1) snakeDir = {x:0,y:1}; else if (e.key === 'ArrowLeft' && snakeDir.x !== 1) snakeDir = {x:-1,y:0}; else if (e.key === 'ArrowRight' && snakeDir.x !== -1) snakeDir = {x:1,y:0}; });
drawSnake();

// ttt + side panels
let tttBoard, tttTurn, tttOver;
function checkTTT(p){const w=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];return w.some(([a,b,c])=>tttBoard[a]===p&&tttBoard[b]===p&&tttBoard[c]===p);}
function cpuMove(){ if(tttOver) return; const wins=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]; const tryWin=(p)=>{for(const[a,b,c]of wins){if(tttBoard[a]===p&&tttBoard[b]===p&&!tttBoard[c])return c;if(tttBoard[a]===p&&tttBoard[c]===p&&!tttBoard[b])return b;if(tttBoard[b]===p&&tttBoard[c]===p&&!tttBoard[a])return a;}return -1;}; let m=tryWin('O'); if(m<0)m=tryWin('X'); if(m<0&&!tttBoard[4])m=4; if(m<0){const corners=[0,2,6,8].filter(i=>!tttBoard[i]);if(corners.length)m=corners[Math.floor(Math.random()*corners.length)];} if(m<0){const free=tttBoard.map((v,i)=>v?-1:i).filter(i=>i>=0);m=free[Math.floor(Math.random()*free.length)];} if(m<0)return; tttBoard[m]='O'; $('ttt').children[m].textContent='O'; $('ttt').children[m].style.color='#4d90c8'; if(checkTTT('O')){$('ttt-status').textContent='CPU WINS 😤';tttOver=true;return;} if(tttBoard.every(v=>v)){$('ttt-status').textContent='DRAW';tttOver=true;return;} tttTurn='X'; $('ttt-status').textContent='YOUR TURN (X)'; }
function tttMove(i){ if(tttOver||tttBoard[i]||tttTurn!=='X') return; tttBoard[i]='X'; $('ttt').children[i].textContent='X'; if(checkTTT('X')){ $('ttt-status').textContent='🎉 YOU WIN!'; tttOver=true; return; } if(tttBoard.every(v=>v)){ $('ttt-status').textContent='DRAW'; tttOver=true; return; } tttTurn='O'; $('ttt-status').textContent='CPU THINKING...'; setTimeout(cpuMove,500); }
function resetTTT(){ tttBoard=Array(9).fill(''); tttTurn='X'; tttOver=false; $('ttt-status').textContent='YOUR TURN (X)'; $('ttt').innerHTML=''; for(let i=0;i<9;i++){ const c=document.createElement('div'); c.className='cell'; c.onclick=()=>tttMove(i); $('ttt').appendChild(c); } }
$('ttt-reset').onclick = resetTTT;
let fifaHome=0, fifaAway=0; function updateFifaScore(){ $('fifa-score').textContent = `HOME ${fifaHome} - ${fifaAway} AWAY`; } $('fifa-shoot').onclick = () => { if (Math.random() < 0.55) fifaHome++; else fifaAway++; updateFifaScore(); }; $('fifa-reset').onclick = () => { fifaHome = 0; fifaAway = 0; updateFifaScore(); };
let ballMade=0, ballTaken=0; function updateBallScore(){ $('ball-score').textContent = `MADE: ${ballMade} / ${ballTaken}`; } $('ball-shoot').onclick = () => { ballTaken++; if (Math.random() < 0.6) ballMade++; updateBallScore(); }; $('ball-reset').onclick = () => { ballMade = 0; ballTaken = 0; updateBallScore(); };

// mic
async function toggleMic() {
  if (state.micOn) {
    if (state.micStream) state.micStream.getTracks().forEach((t) => t.stop());
    state.micStream = null; state.micOn = false; $('mic-badge').classList.remove('live'); $('mic-badge').textContent = '🎤 MIC OFF';
  } else {
    try { state.micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation:true, noiseSuppression:true } }); state.micOn = true; $('mic-badge').classList.add('live'); $('mic-badge').textContent = '🎤 LIVE'; }
    catch { alert('Mic permission denied.'); }
  }
}
function toggleView() { state.viewMode = state.viewMode === 'first' ? 'third' : 'first'; $('view-badge').textContent = (state.viewMode === 'first' ? '1ST' : '3RD') + ' · TAP'; player.group.visible = state.viewMode === 'third'; }

// start UI
CHARS.forEach((c, i) => {
  const d = document.createElement('div'); d.className = 'char-card' + (i === 0 ? ' sel' : ''); d.innerHTML = `<div class="cname">${c.name}</div>`;
  d.onclick = () => { document.querySelectorAll('.char-card').forEach((x) => x.classList.remove('sel')); d.classList.add('sel'); state.selectedChar = c; if (c.key !== 'custom') $('name-input').value = c.name; };
  $('char-grid').appendChild(d);
});
addChat('System', 'Welcome to the Vibe Room. Share the room code.', '#e8b96a'); addChat('System', 'Tap 🎤 to enable voice chat.', '#e8b96a');

// events
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
document.querySelectorAll('.panel .close').forEach((b) => b.onclick = closeAllPanels);
$('chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter' && $('chat-input').value.trim()) { const text = $('chat-input').value; addChat(player.name, text, '#7adf9a'); wsSend({ type:'chat', data:{ name:player.name, text } }); $('chat-input').value = ''; } if (e.key === 'Escape') closeAllPanels(); });
renderer.domElement.addEventListener('click', () => { if (anyPanelOpen()) return; if (!isMobile() && !state.pointerLocked) renderer.domElement.requestPointerLock(); });
document.addEventListener('pointerlockchange', () => { state.pointerLocked = document.pointerLockElement === renderer.domElement; });
document.addEventListener('mousemove', (e) => { if (!state.pointerLocked) return; player.yaw -= e.movementX * 0.0025; player.pitch -= e.movementY * 0.0025; player.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, player.pitch)); });
document.addEventListener('keydown', (e) => {
  state.keys[e.key.toLowerCase()] = true;
  if (e.key === 'Escape') closeAllPanels();
  if (anyPanelOpen()) return;
  if (e.key.toLowerCase() === 't') { e.preventDefault(); openPanel('chat-panel'); setTimeout(() => $('chat-input').focus(), 50); }
  if (e.key.toLowerCase() === 'e') { e.preventDefault(); tryInteract(); }
  if (e.key.toLowerCase() === 'm') { e.preventDefault(); toggleMic(); }
  if (e.key === ' ' && e.target.tagName !== 'INPUT') { e.preventDefault(); if (player.onGround) { player.vel.y = 7; player.onGround = false; } }
  if (e.key.toLowerCase() === 'v') { e.preventDefault(); joinTVAudioAnywhere(); }
  if (e.key.toLowerCase() === 'c') toggleView();
});
document.addEventListener('keyup', (e) => { state.keys[e.key.toLowerCase()] = false; });
$('view-badge').addEventListener('click', toggleView); $('mic-badge').addEventListener('click', toggleMic); $('tv-audio-join').addEventListener('click', joinTVAudioAnywhere);
$('admin-badge').addEventListener('click', () => { if (!isHostUser()) return; state.adminMode = !state.adminMode; refreshAdminInfo(); });
$('admin-prev').addEventListener('click', () => { state.adminIndex = (state.adminIndex - 1 + state.adminOrder.length) % state.adminOrder.length; refreshAdminInfo(); });
$('admin-next').addEventListener('click', () => { state.adminIndex = (state.adminIndex + 1) % state.adminOrder.length; refreshAdminInfo(); });
function nudgeAdmin(dx=0,dz=0,dy=0,dry=0){ const id=state.adminOrder[state.adminIndex]; if(!id||!state.adminObjects[id]) return; const obj=state.adminObjects[id].object3d; obj.position.x += dx; obj.position.z += dz; obj.position.y = Math.max(0, obj.position.y + dy); obj.rotation.y += dry; syncInteractAnchors(); refreshAdminInfo(); }
$('admin-left').onclick = () => nudgeAdmin(-0.4,0,0,0); $('admin-right').onclick = () => nudgeAdmin(0.4,0,0,0); $('admin-up').onclick = () => nudgeAdmin(0,-0.4,0,0); $('admin-down').onclick = () => nudgeAdmin(0,0.4,0,0); $('admin-rotl').onclick = () => nudgeAdmin(0,0,0,-0.12); $('admin-rotr').onclick = () => nudgeAdmin(0,0,0,0.12); $('admin-raise').onclick = () => nudgeAdmin(0,0,0.15,0); $('admin-lower').onclick = () => nudgeAdmin(0,0,-0.15,0); $('admin-exit').onclick = () => { state.adminMode = false; refreshAdminInfo(); }; $('admin-save').onclick = () => { const layout = collectLayout(); wsSend({ type:'layout_save', room:state.roomId, data:layout }); addChat('System', '*Layout saved*', '#7adf9a'); };

document.querySelectorAll('#host-panel [data-vibe]').forEach((btn) => btn.addEventListener('click', () => {
  if (!isHostUser()) return;
  const mode = btn.dataset.vibe; state.hostState.vibe = mode; drawMediaScreen(); wsSend({ type:'room_state', data:{ vibe:mode, media:state.hostState.media } }); $('host-info').textContent = 'Vibe set to ' + mode.toUpperCase();
}));
$('host-load-media').addEventListener('click', () => { if (!isHostUser()) return; const videoId = ytIdFrom($('host-media-url').value.trim()); if (!videoId) return $('host-info').textContent = 'Invalid YouTube URL or video ID.'; state.hostState.media = { videoId, playing:true, startAt:0, startedAt:Date.now() }; startTVPlayback(true); wsSend({ type:'room_state', data:{ vibe:state.hostState.vibe, media:state.hostState.media } }); $('host-info').textContent = 'Wall TV synced.'; drawMediaScreen(); });
$('host-stop-media').addEventListener('click', () => { if (!isHostUser()) return; state.hostState.media = { videoId:'', playing:false, startAt:0, startedAt:0 }; $('tv-overlay').style.display = 'none'; $('tv-iframe').src = ''; wsSend({ type:'room_state', data:{ vibe:state.hostState.vibe, media:state.hostState.media } }); drawMediaScreen(); });
$('host-money-rain').addEventListener('click', () => { if (!isHostUser()) return; spawnMoneyBurst(); wsSend({ type:'host_event', data:{ kind:'money' } }); });
$('host-pulse').addEventListener('click', () => { if (!isHostUser()) return; state.eventPulse = 1; wsSend({ type:'host_event', data:{ kind:'pulse' } }); });
$('host-badge').addEventListener('click', () => { if (!isHostUser()) return; $('host-panel').style.display = $('host-panel').style.display === 'block' ? 'none' : 'block'; });
$('host-close').addEventListener('click', () => { $('host-panel').style.display = 'none'; });

let joyActive = false, joyStart = { x:0, y:0 }, joyDelta = { x:0, y:0 }, touchCam = null;
$('joystick').addEventListener('touchstart', (e) => { e.preventDefault(); joyActive = true; const r = $('joystick').getBoundingClientRect(); joyStart = { x:r.left+r.width/2, y:r.top+r.height/2 }; }, { passive:false });
$('joystick').addEventListener('touchmove', (e) => { e.preventDefault(); if (!joyActive) return; const t = e.touches[0]; let dx = t.clientX - joyStart.x, dy = t.clientY - joyStart.y; const mag = Math.hypot(dx, dy), max = 48; if (mag > max) { dx = dx / mag * max; dy = dy / mag * max; } joyDelta = { x:dx / max, y:dy / max }; $('joy-knob').style.left = (40 + dx) + 'px'; $('joy-knob').style.top = (40 + dy) + 'px'; }, { passive:false });
$('joystick').addEventListener('touchend', () => { joyActive = false; joyDelta = { x:0, y:0 }; $('joy-knob').style.left = '40px'; $('joy-knob').style.top = '40px'; });
renderer.domElement.addEventListener('touchstart', (e) => { if (anyPanelOpen()) return; for (const t of e.changedTouches) { if (t.clientX > window.innerWidth * 0.4) { touchCam = { id:t.identifier, x:t.clientX, y:t.clientY }; break; } } }, { passive:true });
renderer.domElement.addEventListener('touchmove', (e) => { if (!touchCam) return; for (const t of e.changedTouches) { if (t.identifier === touchCam.id) { player.yaw -= (t.clientX - touchCam.x) * 0.006; player.pitch -= (t.clientY - touchCam.y) * 0.006; player.pitch = Math.max(-Math.PI/2+0.1, Math.min(Math.PI/2-0.1, player.pitch)); touchCam.x = t.clientX; touchCam.y = t.clientY; } } }, { passive:true });
renderer.domElement.addEventListener('touchend', (e) => { for (const t of e.changedTouches) if (touchCam && t.identifier === touchCam.id) touchCam = null; });
$('btn-jump').addEventListener('touchstart', (e) => { e.preventDefault(); if (player.onGround && !anyPanelOpen()) { player.vel.y = 7; player.onGround = false; } }, { passive:false });
$('btn-e').addEventListener('touchstart', (e) => { e.preventDefault(); if (!anyPanelOpen()) tryInteract(); }, { passive:false });
$('btn-t').addEventListener('touchstart', (e) => { e.preventDefault(); openPanel('chat-panel'); setTimeout(() => $('chat-input').focus(), 50); }, { passive:false });
$('btn-view').addEventListener('touchstart', (e) => { e.preventDefault(); toggleView(); }, { passive:false });
$('btn-mic').addEventListener('touchstart', (e) => { e.preventDefault(); toggleMic(); }, { passive:false });
$('btn-music').addEventListener('touchstart', (e) => { e.preventDefault(); joinTVAudioAnywhere(); }, { passive:false });

$('begin').onclick = () => {
  const v = $('name-input').value.trim(); player.name = (v || state.selectedChar.name).slice(0, 14); player.preset = state.selectedChar;
  const pos = player.group.position.clone(); scene.remove(player.group); player.group = makeCharacter(state.selectedChar, player.name); player.group.position.copy(pos); scene.add(player.group);
  $('start').style.display = 'none'; $('hud').style.display = 'block'; $('top-right').style.display = 'flex'; $('crosshair').style.display = 'block'; if (!isMobile()) renderer.domElement.requestPointerLock(); connectWS($('room-input').value.trim() || 'vibe-room'); refreshAdminInfo(); $('host-badge').style.display = isHostUser() ? 'block' : 'none';
};

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05); const t = clock.elapsedTime;
  updatePlayer(dt, t); updateRemotes(dt); updateRoomFx(t, dt); updateCamera(); renderer.render(scene, camera);
}

setLoad(100, 'READY');
setTimeout(() => { $('loading').style.display = 'none'; $('start').style.display = 'flex'; }, 350);
setInterval(() => { if (state.wsConnected) wsSend({ type:'ping' }); }, 25000);
resetTTT(); updateFifaScore(); updateBallScore(); animate();
