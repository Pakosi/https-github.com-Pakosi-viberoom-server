// ==================== PLAYER SPAWN & ROOM BOUNDS ====================
const FLOOR_Y = 0;
const BOUNDS = { minX: -21.2, maxX: 21.2, minZ: -14.0, maxZ: 14.0 };

const INTERACTS = [
  { type: 'whiteboard', x: 12.5,  z: -11.7, r: 4.4, label: 'PRESENTATION WALL ✏️' },
  { type: 'table',      x: 6.5,   z: 5.1,   r: 4.0, label: 'WAR TABLE 🧠', anchorId:'war_table' },
  { type: 'lounge',     x: -11.6, z: 8.2,   r: 4.0, label: 'LOUNGE 🛋️', anchorId:'lounge_zone', offsetX:0.2, offsetZ:2.4 },
  { type: 'arcade',     x: 17.2,  z: 7.9,   r: 3.2, label: 'PLAY SNAKE 🎮', anchorId:'snake_zone', offsetX:0, offsetZ:0.2 },
  { type: 'ttt',        x: 16.3,  z: 1.8,   r: 3.2, label: 'TIC TAC TOE ✖️' },
  { type: 'coffee',     x: -14.0, z: -7.1,  r: 4.2, label: 'BAR / COFFEE ☕', anchorId:'bar', offsetX:1.4, offsetZ:0.2 },
  { type: 'basketball', x: 16.0,  z: 10.6,  r: 3.8, label: 'BASKETBALL 🏀', anchorId:'basketball_zone', offsetX:-2.4, offsetZ:0 },
  { type: 'fifa',       x: 14.6,  z: -3.8,  r: 3.6, label: 'PS5 FIFA ⚽', anchorId:'fifa_zone', offsetX:0, offsetZ:2.8 },
  { type: 'money',      x: -16.0, z: 12.0,  r: 3.0, label: 'SAFE & CASH 💰', anchorId:'money_zone', offsetX:1.1, offsetZ:1.0 },
  { type: 'hostconsole', x: -3.0, z: -10.2, r: 2.6, label: 'HOST CONSOLE 🎛️', anchorId:'host_console' },
  { type: 'mediawall', x: 0.0, z: 12.0, r: 4.2, label: 'MEDIA WALL 📺' },
];

syncInteractAnchors();

// ==================== CHARACTER BUILDER ====================
function texCanvas(w, h, drawFn) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  drawFn(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function charBox(w, h, d, color) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05 })
  );
  m.castShadow = true; return m;
}

function makeCharacter(preset, nameOverride) {
  const g = new THREE.Group();
  const skin = preset.skin || 0xf0c89c;
  const name = nameOverride || preset.name;

  const legL = new THREE.Group(); legL.position.set(-0.2, 0.9, 0);
  const lL = charBox(0.38, 0.85, 0.38, 0x1a2438); lL.position.y = -0.4; legL.add(lL);
  const shoeL = charBox(0.42, 0.18, 0.55, 0xeeeeee); shoeL.position.set(0, -0.9, 0.08); legL.add(shoeL);
  g.add(legL);

  const legR = new THREE.Group(); legR.position.set(0.2, 0.9, 0);
  const lR = charBox(0.38, 0.85, 0.38, 0x1a2438); lR.position.y = -0.4; legR.add(lR);
  const shoeR = charBox(0.42, 0.18, 0.55, 0xeeeeee); shoeR.position.set(0, -0.9, 0.08); legR.add(shoeR);
  g.add(legR);

  let torso;
  if (preset.hoodie === 'barca') {
    const shirtTex = texCanvas(128, 128, (ctx, w, h) => {
      for (let x = 0; x < w; x += 16) {
        ctx.fillStyle = (Math.floor(x/16)%2===0) ? '#a50044' : '#004d98';
        ctx.fillRect(x, 0, 16, h);
      }
    });
    torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5),
      new THREE.MeshStandardMaterial({ map: shirtTex, roughness: 0.7 }));
    torso.castShadow = true; torso.position.y = 1.95; g.add(torso);
  } else {
    torso = charBox(0.9, 1.1, 0.5, new THREE.Color(preset.hoodie).getHex());
    torso.position.y = 1.95; g.add(torso);
    const pocket = charBox(0.5, 0.3, 0.06, new THREE.Color(preset.hoodie).multiplyScalar(0.75).getHex());
    pocket.position.set(0, 1.75, 0.26); g.add(pocket);
  }

  const armColor = preset.hoodie === 'barca' ? 0xa50044 : new THREE.Color(preset.hoodie).getHex();
  const armL = new THREE.Group(); armL.position.set(-0.59, 2.4, 0);
  const aL = charBox(0.28, 1.0, 0.4, armColor); aL.position.y = -0.5; armL.add(aL);
  const handL = charBox(0.28, 0.22, 0.32, skin); handL.position.y = -1.1; armL.add(handL);
  g.add(armL);

  const armR = new THREE.Group(); armR.position.set(0.59, 2.4, 0);
  const aR = charBox(0.28, 1.0, 0.4, armColor); aR.position.y = -0.5; armR.add(aR);
  const handR = charBox(0.28, 0.22, 0.32, skin); handR.position.y = -1.1; armR.add(handR);
  g.add(armR);

  const head = charBox(0.8, 0.8, 0.8, skin);
  head.position.y = 2.9; g.add(head);
  const headY = 2.9;

  if (preset.hair === 'bald') {
    const scalp = charBox(0.82, 0.15, 0.82, 0xf8d8b0); scalp.position.y = headY + 0.32; g.add(scalp);
  } else if (preset.hair === 'fade') {
    const hair = charBox(0.82, 0.2, 0.82, 0x0a0a0a); hair.position.y = headY + 0.25; g.add(hair);
  } else {
    const hair = charBox(0.82, 0.3, 0.82, 0x1a0f05); hair.position.y = headY + 0.4; g.add(hair);
  }

  const eyeL = charBox(0.1, 0.1, 0.05, 0x0a0608); eyeL.position.set(-0.17, headY+0.05, 0.41); g.add(eyeL);
  const eyeR = charBox(0.1, 0.1, 0.05, 0x0a0608); eyeR.position.set(0.17, headY+0.05, 0.41); g.add(eyeR);

  if (preset.bigNose) {
    const nose = charBox(0.22, 0.35, 0.28, skin); nose.position.set(0, headY-0.05, 0.5); g.add(nose);
  } else {
    const nose = charBox(0.12, 0.12, 0.12, skin); nose.position.set(0, headY-0.05, 0.45); g.add(nose);
  }

  const tagC = document.createElement('canvas');
  tagC.width = 256; tagC.height = 72;
  const tctx = tagC.getContext('2d');
  const tagColor = preset.hoodie === 'barca' ? '#e8b96a' : preset.hoodie;
  tctx.fillStyle = 'rgba(10,6,12,0.85)'; tctx.fillRect(0,0,256,72);
  tctx.strokeStyle = tagColor; tctx.lineWidth = 2; tctx.strokeRect(2,2,252,68);
  tctx.fillStyle = tagColor; tctx.font = 'bold 32px Courier New'; tctx.textAlign = 'center';
  tctx.fillText(name, 128, 48);
  const tagTex = new THREE.CanvasTexture(tagC);
  tagTex.colorSpace = THREE.SRGBColorSpace;
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex, depthTest: false }));
  tag.scale.set(1.8, 0.5, 1); tag.position.y = 3.6; g.add(tag);

  g.userData = { head, armL, armR, legL, legR, tag, walk: 0, preset, name };
  return g;
}

// ==================== PLAYER ====================
const player = {
  group: makeCharacter(CHARS[0], 'Pax'),
  vel: new THREE.Vector3(),
  onGround: true,
  name: 'Pax',
  preset: CHARS[0],
  yaw: 0,
  pitch: 0,
  _moving: false,
};
player.group.position.set(0, FLOOR_Y, 12.3);
scene.add(player.group);

// decorative spawn camera angle
camera.position.set(0, 6.2, 18);

const remotes = new Map();

// ==================== WEBSOCKET ====================
let ws = null, myId = null, roomId = 'vibe-room';
let wsConnected = false, reconnectTimer = null;
const roomBadge = document.getElementById('room-badge');
const connBadge = document.getElementById('conn-badge');

function setConn(state) {
  connBadge.classList.remove('live', 'offline');
  if (state === 'online') { connBadge.classList.add('live'); connBadge.textContent = '● ONLINE'; }
  else { connBadge.classList.add('offline'); connBadge.textContent = state === 'connecting' ? '● CONNECTING' : '● DISCONNECTED'; }
}

function connectWS(rid) {
  roomId = (rid||'').trim() || 'vibe-room';
  roomBadge.textContent = 'ROOM: ' + roomId.toUpperCase().slice(0,12);
  setConn('connecting');
  try { ws = new WebSocket(WS_URL); } catch(e) { setConn('offline'); scheduleReconnect(); return; }
  ws.onopen = () => {
    wsConnected = true; setConn('online');
    ws.send(JSON.stringify({ type:'join', room:roomId, name:player.name, preset:player.preset.key }));
  };
  ws.onmessage = (ev) => { try { handleServerMsg(JSON.parse(ev.data)); } catch {} };
  ws.onclose = () => {
    wsConnected = false; setConn('offline');
    for (const [,r] of remotes) scene.remove(r.group);
    remotes.clear();
    scheduleReconnect();
  };
  ws.onerror = () => {};
}
function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => { reconnectTimer = null; if (!wsConnected) connectWS(roomId); }, 2000);
}
function wsSend(obj) { if (wsConnected && ws.readyState === 1) ws.send(JSON.stringify(obj)); }

function handleServerMsg(msg) {
  switch(msg.type) {
    case 'welcome':
      myId = msg.id;
      for (const p of msg.players) addRemote(p.id, p.name, p.preset, p.pos);
      wsSend({ type:'layout_load', room: roomId });
      wsSend({ type:'state_get' });
      break;
    case 'peer-join':
      addRemote(msg.id, msg.name, msg.preset, null);
      addChat('System', '*' + msg.name + ' entered the room*', '#7adf9a');
      break;
    case 'peer-leave': {
      const r = remotes.get(msg.id);
      if (r) { scene.remove(r.group); remotes.delete(msg.id); }
      addChat('System', '*' + (msg.name||'Someone') + ' left*', '#e88080');
      break;
    }
    case 'pos': {
      const r = remotes.get(msg.id);
      if (!r) return;
      r.targetPos.set(msg.data.x, msg.data.y, msg.data.z);
      r.targetRy = msg.data.ry;
      r.lastMoving = msg.data.m;
      break;
    }
    case 'chat':
      if (msg.data && typeof msg.data.text === 'string' && msg.data.text.startsWith(HOST_PREFIX)) {
        try { applyHostEvent(JSON.parse(msg.data.text.slice(HOST_PREFIX.length))); } catch {}
      } else {
        addChat(msg.data.name||'friend', msg.data.text, '#e8b96a');
      }
      break;
    case 'draw': applyRemoteDraw(msg.data); break;
    case 'clear': paintBoardLocal(); break;
    case 'layout_load':
      applyLayout(msg.data || msg.layout || msg.objects);
      break;
    case 'room_state':
      applyRoomState(msg.data || {});
      break;
    case 'host_event':
      applyHostEvent(msg.data || {}, false);
      break;
  }
}

function addRemote(id, name, presetKey, pos) {
  if (remotes.has(id)) return;
  const preset = CHARS.find(c => c.key === presetKey) || CHARS[5];
  const g = makeCharacter(preset, name);
  if (pos) g.position.set(pos.x, pos.y, pos.z); else g.position.set(0, FLOOR_Y, 12.3);
  scene.add(g);
  remotes.set(id, { group: g, name, preset, targetPos: g.position.clone(), targetRy: 0, lastMoving: false });
}

let lastPosT = 0;
function maybeBroadcastPos(t) {
  if (!wsConnected) return;
  if (t - lastPosT < 0.05) return;
  lastPosT = t;
  wsSend({ type:'pos', data: {
    x: +player.group.position.x.toFixed(3),
    y: +player.group.position.y.toFixed(3),
    z: +player.group.position.z.toFixed(3),
    ry: +player.group.rotation.y.toFixed(3),
    m: player._moving,
  }});
}

// ==================== MIC ====================
let micStream = null, micOn = false;
async function toggleMic() {
  if (micOn) {
    if (micStream) micStream.getTracks().forEach(t => t.stop());
    micStream = null; micOn = false;
    document.getElementById('mic-badge').classList.remove('live');
    document.getElementById('mic-badge').textContent = '🎤 MIC OFF';
  } else {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation:true, noiseSuppression:true } });
      micOn = true;
      document.getElementById('mic-badge').classList.add('live');
      document.getElementById('mic-badge').textContent = '🎤 LIVE';
    } catch { alert('Mic permission denied.'); }
  }
}

// ==================== INPUT ====================
const keys = {};
let pointerLocked = false;
let viewMode = 'third';

document.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'Escape') closeAllPanels();
  if (anyPanelOpen()) return;
  if (e.key.toLowerCase() === 't') { e.preventDefault(); openPanel('chat-panel'); setTimeout(()=>document.getElementById('chat-input').focus(),50); }
  if (e.key.toLowerCase() === 'e') { e.preventDefault(); tryInteract(); }
  if (e.key.toLowerCase() === 'm') { e.preventDefault(); toggleMic(); }
  if (e.key === ' ' && e.target.tagName !== 'INPUT') {
    e.preventDefault();
    if (player.onGround) { player.vel.y = 7; player.onGround = false; }
  }
  if (e.key.toLowerCase() === 'v') toggleView();
});
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

function toggleView() {
  viewMode = viewMode === 'first' ? 'third' : 'first';
  document.getElementById('view-badge').textContent = (viewMode === 'first' ? '1ST' : '3RD') + ' · TAP';
  player.group.visible = viewMode === 'third';
}

renderer.domElement.addEventListener('click', () => {
  if (anyPanelOpen()) return;
  if (!isMobile() && !pointerLocked) renderer.domElement.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === renderer.domElement;
});
document.addEventListener('mousemove', e => {
  if (!pointerLocked) return;
  player.yaw -= e.movementX * 0.0025;
  player.pitch -= e.movementY * 0.0025;
  player.pitch = Math.max(-Math.PI/2+0.1, Math.min(Math.PI/2-0.1, player.pitch));
});

function isMobile() { return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900; }

// Joystick
const joy = document.getElementById('joystick');
const knob = document.getElementById('joy-knob');
let joyActive = false, joyStart = {x:0,y:0}, joyDelta = {x:0,y:0};
joy.addEventListener('touchstart', e => {
  e.preventDefault(); joyActive = true;
  const r = joy.getBoundingClientRect();
  joyStart = { x: r.left+r.width/2, y: r.top+r.height/2 };
}, { passive:false });
joy.addEventListener('touchmove', e => {
  e.preventDefault(); if (!joyActive) return;
  const t = e.touches[0];
  let dx = t.clientX - joyStart.x, dy = t.clientY - joyStart.y;
  const mag = Math.hypot(dx,dy), max = 48;
  if (mag > max) { dx=dx/mag*max; dy=dy/mag*max; }
  joyDelta = { x:dx/max, y:dy/max };
  knob.style.left = (40+dx)+'px'; knob.style.top = (40+dy)+'px';
}, { passive:false });
joy.addEventListener('touchend', () => {
  joyActive = false; joyDelta = {x:0,y:0};
  knob.style.left = '40px'; knob.style.top = '40px';
});

let touchCam = null;
renderer.domElement.addEventListener('touchstart', e => {
  if (anyPanelOpen()) return;
  for (const t of e.changedTouches) {
    if (t.clientX > window.innerWidth*0.4) { touchCam = {id:t.identifier,x:t.clientX,y:t.clientY}; break; }
  }
}, { passive:true });
renderer.domElement.addEventListener('touchmove', e => {
  if (!touchCam) return;
  for (const t of e.changedTouches) {
    if (t.identifier === touchCam.id) {
      player.yaw -= (t.clientX-touchCam.x)*0.006;
      player.pitch -= (t.clientY-touchCam.y)*0.006;
      player.pitch = Math.max(-Math.PI/2+0.1, Math.min(Math.PI/2-0.1, player.pitch));
      touchCam.x = t.clientX; touchCam.y = t.clientY;
    }
  }
}, { passive:true });
renderer.domElement.addEventListener('touchend', e => {
  for (const t of e.changedTouches) if (touchCam && t.identifier===touchCam.id) touchCam=null;
});

document.getElementById('btn-jump').addEventListener('touchstart', e => {
  e.preventDefault();
  if (player.onGround && !anyPanelOpen()) { player.vel.y = 7; player.onGround = false; }
}, { passive:false });
document.getElementById('btn-e').addEventListener('touchstart', e => { e.preventDefault(); if (!anyPanelOpen()) tryInteract(); }, { passive:false });
document.getElementById('btn-t').addEventListener('touchstart', e => { e.preventDefault(); openPanel('chat-panel'); setTimeout(()=>document.getElementById('chat-input').focus(),50); }, { passive:false });
document.getElementById('btn-view').addEventListener('touchstart', e => { e.preventDefault(); toggleView(); }, { passive:false });
document.getElementById('btn-mic').addEventListener('touchstart', e => { e.preventDefault(); toggleMic(); }, { passive:false });
document.getElementById('view-badge').addEventListener('click', toggleView);
document.getElementById('mic-badge').addEventListener('click', toggleMic);
document.getElementById('admin-badge').addEventListener('click', () => {
  if ((player.name || '').toLowerCase() !== 'pax') return;
  setAdminMode(!adminMode);
});document.getElementById('host-badge').addEventListener('click', () => {
  if (!isHostUser()) return;
  const p = document.getElementById('host-panel');
  p.style.display = p.style.display === 'block' ? 'none' : 'block';
});
document.getElementById('host-close').addEventListener('click', () => {
  document.getElementById('host-panel').style.display = 'none';
});
document.querySelectorAll('#host-panel [data-vibe]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!isHostUser()) return;
    const mode = btn.dataset.vibe;
    applyRoomState({ vibe: mode });
    sendRoomStatePatch({ vibe: mode, media: hostState.media });
    document.getElementById('host-info').textContent = 'Vibe set to ' + String(mode).toUpperCase();
  });
});
document.getElementById('host-load-media').addEventListener('click', () => {
  if (!isHostUser()) return;
  const raw = document.getElementById('host-media-url').value.trim();
  const videoId = ytIdFrom(raw);
  if (!videoId) {
    document.getElementById('host-info').textContent = 'Invalid YouTube URL or video ID.';
    return;
  }
  const media = { videoId, playing:true, startAt:0, startedAt: Date.now() };
  hostState.media = media;
  startTVPlayback(true);
  sendRoomStatePatch({ vibe: hostState.vibe, media });
  document.getElementById('host-info').textContent = 'Wall TV synced.';
  drawMediaScreen();
});
document.getElementById('host-stop-media').addEventListener('click', () => {
  if (!isHostUser()) return;
  const media = { videoId:'', playing:false, startAt:0, startedAt:0 };
  applyRoomState({ media });
  sendRoomStatePatch({ vibe: hostState.vibe, media });
});
document.getElementById('host-money-rain').addEventListener('click', () => {
  if (!isHostUser()) return;
  const evt = { kind:'money' };
  applyHostEvent(evt, true);
  broadcastHostEvent(evt);
});
document.getElementById('host-pulse').addEventListener('click', () => {
  if (!isHostUser()) return;
  const evt = { kind:'pulse' };
  applyHostEvent(evt, true);
  broadcastHostEvent(evt);
});
document.querySelectorAll('#host-panel [data-vibe]').forEach(btn => btn.addEventListener('click', () => {
  if (!isHostUser()) return;
  const evt = { kind:'vibe', mode: btn.dataset.vibe };
  applyHostEvent(evt, true);
  broadcastHostEvent(evt);
  document.getElementById('host-info').textContent = 'Vibe set to ' + btn.dataset.vibe.toUpperCase();
}));
document.getElementById('host-money-rain').addEventListener('click', () => {
  if (!isHostUser()) return;
  const evt = { kind:'money' };
  applyHostEvent(evt, true);
  broadcastHostEvent(evt);
});
document.getElementById('host-pulse').addEventListener('click', () => {
  if (!isHostUser()) return;
  const evt = { kind:'pulse' };
  applyHostEvent(evt, true);
  broadcastHostEvent(evt);
});
document.getElementById('admin-prev').addEventListener('click', () => selectAdmin(-1));
document.getElementById('admin-next').addEventListener('click', () => selectAdmin(1));
document.getElementById('admin-left').addEventListener('click', () => nudgeAdmin(-0.4,0,0,0));
document.getElementById('admin-right').addEventListener('click', () => nudgeAdmin(0.4,0,0,0));
document.getElementById('admin-up').addEventListener('click', () => nudgeAdmin(0,-0.4,0,0));
document.getElementById('admin-down').addEventListener('click', () => nudgeAdmin(0,0.4,0,0));
document.getElementById('admin-rotl').addEventListener('click', () => nudgeAdmin(0,0,0,-0.12));
document.getElementById('admin-rotr').addEventListener('click', () => nudgeAdmin(0,0,0,0.12));
document.getElementById('admin-raise').addEventListener('click', () => nudgeAdmin(0,0,0.15,0));
document.getElementById('admin-lower').addEventListener('click', () => nudgeAdmin(0,0,-0.15,0));
document.getElementById('admin-save').addEventListener('click', saveLayout);
document.getElementById('admin-exit').addEventListener('click', () => setAdminMode(false));

// ==================== PANELS ====================
function anyPanelOpen() { return [...document.querySelectorAll('.panel')].some(p => p.style.display === 'block'); }
function closeAllPanels() { document.querySelectorAll('.panel').forEach(p => p.style.display = 'none'); }
function openPanel(id) {
  closeAllPanels();
  document.getElementById(id).style.display = 'block';
  if (document.pointerLockElement) document.exitPointerLock();
}
document.querySelectorAll('.panel .close').forEach(b => b.onclick = closeAllPanels);

// ==================== INTERACTIONS ====================
function nearest() {
  const p = player.group.position;
  let best = null, bd = Infinity;
  for (const i of INTERACTS) {
    const d = Math.hypot(p.x - i.x, p.z - i.z);
    if (d < i.r && d < bd) { best = i; bd = d; }
  }
  return best;
}

function tryInteract() {
  const i = nearest();
  if (!i) return;
  if (i.type === 'whiteboard') openPanel('whiteboard');
  else if (i.type === 'arcade') { openPanel('arcade-panel'); startArcade(); }
  else if (i.type === 'ttt') { openPanel('ttt-panel'); resetTTT(); }
  else if (i.type === 'coffee') addChat('System', '*' + player.name + ' orders an overpriced coffee ☕*', '#e8b96a');
  else if (i.type === 'lounge') addChat('System', '*' + player.name + ' sinks into the couch 🛋️*', '#8ac8e8');
  else if (i.type === 'table') { document.getElementById('war-count').textContent = String(remotes.size + 1); openPanel('war-panel'); }
  else if (i.type === 'basketball') openPanel('basketball-panel');
  else if (i.type === 'fifa') openPanel('fifa-panel');
  else if (i.type === 'money') addChat('System', '*' + player.name + ' admires the cash pile like a true menace 💰*', '#7adf9a');
  else if (i.type === 'mediawall') { if (hostState.media.videoId) startTVPlayback(true); else addChat('System', '*TV is idle*', '#e8b96a'); }
  else if (i.type === 'hostconsole') {
    if (isHostUser()) {
      const p = document.getElementById('host-panel');
      p.style.display = p.style.display === 'block' ? 'none' : 'block';
      if (document.pointerLockElement) document.exitPointerLock();
    } else {
      addChat('System', '*Only Pax can use the host console*', '#e88080');
    }
  }
}

// ==================== MOVEMENT ====================
const G = -20;
const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), rgt = new THREE.Vector3();

function collideRectCircle(x, z, rect, r) {
  const cx = Math.max(rect.minX, Math.min(x, rect.maxX));
  const cz = Math.max(rect.minZ, Math.min(z, rect.maxZ));
  const dx = x - cx, dz = z - cz;
  return dx*dx + dz*dz < r*r;
}
function canStand(x, z) {
  if (x < BOUNDS.minX + PLAYER_RADIUS || x > BOUNDS.maxX - PLAYER_RADIUS || z < BOUNDS.minZ + PLAYER_RADIUS || z > BOUNDS.maxZ - PLAYER_RADIUS) return false;
  for (const b of BLOCKERS) if (collideRectCircle(x, z, b, PLAYER_RADIUS)) return false;
  return true;
}

function updatePlayer(dt, t) {
  if (anyPanelOpen() || adminMode) { player._moving = false; return; }
  const sp = keys['shift'] ? 9 : 5.4;
  fwd.set(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  rgt.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  let mx = 0, mz = 0;
  if (keys['w']||keys['arrowup'])    { mx -= fwd.x; mz -= fwd.z; }
  if (keys['s']||keys['arrowdown'])  { mx += fwd.x; mz += fwd.z; }
  if (keys['a']||keys['arrowleft'])  { mx -= rgt.x; mz -= rgt.z; }
  if (keys['d']||keys['arrowright']) { mx += rgt.x; mz += rgt.z; }
  if (joyDelta.x !== 0 || joyDelta.y !== 0) {
    mx += -fwd.x * -joyDelta.y + rgt.x * joyDelta.x;
    mz += -fwd.z * -joyDelta.y + rgt.z * joyDelta.x;
  }
  const mag = Math.hypot(mx, mz);
  if (mag > 0) { mx = mx/mag*sp; mz = mz/mag*sp; }

  player.vel.y += G * dt;
  let ny = player.group.position.y + player.vel.y * dt;

  const tryX = player.group.position.x + mx*dt;
  if (canStand(tryX, player.group.position.z)) player.group.position.x = tryX;
  const tryZ = player.group.position.z + mz*dt;
  if (canStand(player.group.position.x, tryZ)) player.group.position.z = tryZ;

  if (ny <= FLOOR_Y) {
    ny = FLOOR_Y;
    player.vel.y = 0;
    player.onGround = true;
  }
  player.group.position.y = ny;

  player.group.rotation.y = player.yaw + Math.PI;

  player._moving = mag > 0.1;
  const u = player.group.userData;
  if (player._moving) {
    u.walk += dt * (keys['shift'] ? 14 : 10);
    const p = Math.sin(u.walk);
    u.legL.rotation.x = p*0.7; u.legR.rotation.x = -p*0.7;
    u.armL.rotation.x = -p*0.5; u.armR.rotation.x = p*0.5;
  } else {
    u.legL.rotation.x *= 0.85; u.legR.rotation.x *= 0.85;
    u.armL.rotation.x *= 0.85; u.armR.rotation.x *= 0.85;
  }

  const n = nearest();
  const prompt = document.getElementById('prompt');
  if (n) { prompt.textContent = '▸ E: ' + n.label; prompt.style.display = 'block'; }
  else { prompt.style.display = 'none'; }

  maybeBroadcastPos(t);
}

function updateCamera() {
  const head = player.group.position.clone();
  head.y += 2.9;
  if (viewMode === 'first') {
    camera.position.copy(head);
    camera.position.x += Math.sin(player.yaw)*0.1;
    camera.position.z += Math.cos(player.yaw)*0.1;
    camera.lookAt(
      head.x - Math.sin(player.yaw)*Math.cos(player.pitch),
      head.y + Math.sin(player.pitch),
      head.z - Math.cos(player.yaw)*Math.cos(player.pitch)
    );
  } else {
    const dist = 5.8;
    const tx = head.x + Math.sin(player.yaw)*dist*Math.cos(player.pitch);
    const ty = head.y - Math.sin(player.pitch)*dist + 1.6;
    const tz = head.z + Math.cos(player.yaw)*dist*Math.cos(player.pitch);
    camera.position.lerp(new THREE.Vector3(tx, ty, tz), 0.18);
    camera.lookAt(head);
  }
}

// ==================== WHITEBOARD ====================
const wbCanvas = document.createElement('canvas');
wbCanvas.width = 1280; wbCanvas.height = 640;
const wbCtx = wbCanvas.getContext('2d');
function paintBoard() {
  wbCtx.fillStyle = '#1a1814'; wbCtx.fillRect(0,0,1280,640);
  wbCtx.save();
  wbCtx.translate(640,110); wbCtx.rotate(-0.015);
  wbCtx.fillStyle = '#c89b4a';
  wbCtx.font = 'bold italic 72px Impact'; wbCtx.textAlign = 'center';
  wbCtx.fillText('MAKE MONEY · STAY HUMBLE', 0, 0);
  wbCtx.restore();
  wbCtx.fillStyle = '#e8b96a'; wbCtx.font = 'bold 48px Courier New'; wbCtx.textAlign = 'left';
  wbCtx.fillText('→ Ship fast', 140, 300);
  wbCtx.fillText('→ Compound returns', 140, 380);
  wbCtx.fillText('→ Trust the process', 140, 460);
  wbCtx.fillStyle = '#7adf9a'; wbCtx.font = 'bold italic 54px Impact';
  wbCtx.fillText('TO THE MOON 🚀', 820, 560);
}
paintBoard();
const wbTex = new THREE.CanvasTexture(wbCanvas);
wbTex.minFilter = THREE.LinearFilter;
wbTex.colorSpace = THREE.SRGBColorSpace;
if (boardWallMesh) boardWallMesh.material.map = wbTex, boardWallMesh.material.needsUpdate = true;

const board = document.getElementById('board-canvas');
const bctx = board.getContext('2d');
function paintBoardLocal() {
  paintBoard();
  bctx.drawImage(wbCanvas,0,0,board.width,board.height);
  wbTex.needsUpdate = true;
}
bctx.drawImage(wbCanvas,0,0,board.width,board.height);

let drawing=false, penSize=4, penColor='#e8b96a', lastX=0, lastY=0;
document.getElementById('pen-color').oninput = e => { penColor=e.target.value; };
document.querySelectorAll('#whiteboard [data-size]').forEach(b => b.onclick = () => { penSize=+b.dataset.size; });
document.getElementById('eraser').onclick = () => { penColor='#1a1814'; penSize=26; };
document.getElementById('clear-board').onclick = () => { paintBoardLocal(); wsSend({type:'clear'}); };

function bpos(e) {
  const r=board.getBoundingClientRect(), ev=e.touches?e.touches[0]:e;
  return { x:(ev.clientX-r.left)*(board.width/r.width), y:(ev.clientY-r.top)*(board.height/r.height) };
}
function bstart(e) { e.preventDefault(); drawing=true; const p=bpos(e); lastX=p.x; lastY=p.y; }
function bmove(e) {
  if (!drawing) return; e.preventDefault();
  const p=bpos(e);
  bctx.strokeStyle=penColor; bctx.lineWidth=penSize; bctx.lineCap='round'; bctx.lineJoin='round';
  bctx.beginPath(); bctx.moveTo(lastX,lastY); bctx.lineTo(p.x,p.y); bctx.stroke();
  wsSend({type:'draw', data:{x1:lastX/board.width,y1:lastY/board.height,x2:p.x/board.width,y2:p.y/board.height,c:penColor,s:penSize}});
  lastX=p.x; lastY=p.y; syncWB();
}
function bend() { drawing=false; }
board.addEventListener('mousedown',bstart); board.addEventListener('mousemove',bmove);
board.addEventListener('mouseup',bend); board.addEventListener('mouseleave',bend);
board.addEventListener('touchstart',bstart,{passive:false}); board.addEventListener('touchmove',bmove,{passive:false});
board.addEventListener('touchend',bend);
function applyRemoteDraw(data) {
  bctx.strokeStyle=data.c; bctx.lineWidth=data.s; bctx.lineCap='round'; bctx.lineJoin='round';
  bctx.beginPath(); bctx.moveTo(data.x1*board.width,data.y1*board.height); bctx.lineTo(data.x2*board.width,data.y2*board.height); bctx.stroke(); syncWB();
}
function syncWB() { wbCtx.drawImage(board,0,0,wbCanvas.width,wbCanvas.height); wbTex.needsUpdate=true; }

// ==================== CHAT ====================
const chatLog = document.getElementById('chat-log');
const chatInput = document.getElementById('chat-input');
function addChat(name, text, color) {
  const d = document.createElement('div');
  d.innerHTML = `<span class="name" style="color:${color||'#e8b96a'}">${name}:</span> ${escapeHtml(text)}`;
  chatLog.appendChild(d); chatLog.scrollTop = chatLog.scrollHeight;
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
addChat('System','Welcome to the Vibe Room. Share the room code.','#e8b96a');
addChat('System','Tap 🎤 to enable voice chat.','#e8b96a');
chatInput.addEventListener('keydown', e => {
  if (e.key==='Enter' && chatInput.value.trim()) {
    const text=chatInput.value;
    addChat(player.name, text, '#7adf9a');
    wsSend({type:'chat', data:{name:player.name, text}});
    chatInput.value='';
  }
  if (e.key==='Escape') closeAllPanels();
});

// ==================== TIC TAC TOE ====================
const tttDiv=document.getElementById('ttt'), tttStatus=document.getElementById('ttt-status');
let tttBoard, tttTurn, tttOver;
function resetTTT() {
  tttBoard=Array(9).fill(''); tttTurn='X'; tttOver=false;
  tttStatus.textContent='YOUR TURN (X)'; tttDiv.innerHTML='';
  for (let i=0;i<9;i++) { const c=document.createElement('div'); c.className='cell'; c.onclick=()=>tttMove(i); tttDiv.appendChild(c); }
}
function tttMove(i) {
  if (tttOver||tttBoard[i]||tttTurn!=='X') return;
  tttBoard[i]='X'; tttDiv.children[i].textContent='X';
  if (checkTTT('X')) { tttStatus.textContent='🎉 YOU WIN!'; tttOver=true; return; }
  if (tttBoard.every(v=>v)) { tttStatus.textContent='DRAW'; tttOver=true; return; }
  tttTurn='O'; tttStatus.textContent='CPU THINKING...'; setTimeout(cpuMove,500);
}
function cpuMove() {
  if (tttOver) return;
  const wins=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const tryWin=p=>{for(const[a,b,c]of wins){if(tttBoard[a]===p&&tttBoard[b]===p&&!tttBoard[c])return c;if(tttBoard[a]===p&&tttBoard[c]===p&&!tttBoard[b])return b;if(tttBoard[b]===p&&tttBoard[c]===p&&!tttBoard[a])return a;}return -1;};
  let m=tryWin('O'); if(m<0)m=tryWin('X'); if(m<0&&!tttBoard[4])m=4;
  if(m<0){const corners=[0,2,6,8].filter(i=>!tttBoard[i]);if(corners.length)m=corners[Math.floor(Math.random()*corners.length)];}
  if(m<0){const free=tttBoard.map((v,i)=>v?-1:i).filter(i=>i>=0);m=free[Math.floor(Math.random()*free.length)];}
  if(m<0)return;
  tttBoard[m]='O'; tttDiv.children[m].textContent='O'; tttDiv.children[m].style.color='#4d90c8';
  if(checkTTT('O')){tttStatus.textContent='CPU WINS 😤';tttOver=true;return;}
  if(tttBoard.every(v=>v)){tttStatus.textContent='DRAW';tttOver=true;return;}
  tttTurn='X'; tttStatus.textContent='YOUR TURN (X)';
}
function checkTTT(p){const w=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];return w.some(([a,b,c])=>tttBoard[a]===p&&tttBoard[b]===p&&tttBoard[c]===p);}
document.getElementById('ttt-reset').onclick=resetTTT;

// ==================== FIFA PANEL ====================
let fifaHome = 0, fifaAway = 0;
function updateFifaScore() {
  document.getElementById('fifa-score').textContent = `HOME ${fifaHome} - ${fifaAway} AWAY`;
  if (fifaScreenTex && fifaScreenTex.dispose) fifaScreenTex.dispose();
}
document.getElementById('fifa-shoot').onclick = () => {
  if (Math.random() < 0.55) fifaHome++; else fifaAway++;
  updateFifaScore();
};
document.getElementById('fifa-reset').onclick = () => {
  fifaHome = 0; fifaAway = 0; updateFifaScore();
};

// ==================== BASKETBALL PANEL ====================
let ballMade = 0, ballTaken = 0;
function updateBallScore() {
  document.getElementById('ball-score').textContent = `MADE: ${ballMade} / ${ballTaken}`;
}
document.getElementById('ball-shoot').onclick = () => {
  ballTaken++;
  if (Math.random() < 0.6) ballMade++;
  updateBallScore();
};
document.getElementById('ball-reset').onclick = () => {
  ballMade = 0; ballTaken = 0; updateBallScore();
};

