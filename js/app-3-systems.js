// ==================== PLAYER SPAWN & ROOM BOUNDS ====================
const FLOOR_Y = 0;
const BOUNDS = { minX: -42.2, maxX: 42.2, minZ: -28.6, maxZ: 28.6 };
const LOFT_Y = 7.2;
const LOFT_ZONE = { minX: 17.8, maxX: 41.4, minZ: -24.0, maxZ: 17.2 };
const STAIR_MID_Y = LOFT_Y * 0.5;
const STAIR_LOWER_ZONE = { minX: 34.8, maxX: 41.3, minZ: 9.4, maxZ: 20.2 };
const STAIR_MID_LANDING_ZONE = { minX: 34.8, maxX: 41.3, minZ: 6.2, maxZ: 9.8 };
const STAIR_UPPER_ZONE = { minX: 25.7, maxX: 37.8, minZ: 4.9, maxZ: 11.2 };
const STAIR_TOP_LANDING_ZONE = { minX: 23.4, maxX: 27.8, minZ: 4.9, maxZ: 11.2 };
const LOFT_SNAP_TOLERANCE = 1.4;
const STAIR_MID_SNAP_TOLERANCE = 1.0;

const INTERACTS = [
  { type: 'whiteboard', x: 12.5,  z: -11.7, r: 4.4, label: 'PRESENTATION WALL ✏️' },
  { type: 'table',      x: 6.5,   z: 5.1,   r: 4.0, label: 'WAR TABLE 🧠', anchorId:'war_table' },
  { type: 'lounge',     x: -11.6, z: 8.2,   r: 4.0, label: 'LOUNGE 🛋️', anchorId:'lounge_zone', offsetX:0.2, offsetZ:2.4 },
  { type: 'arcade',     x: 17.2,  z: 7.9,   r: 3.2, label: 'VIBE FIGHTER 🥊', anchorId:'snake_zone', offsetX:0, offsetZ:0.2 },
  { type: 'ttt',        x: 16.3,  z: 1.8,   r: 3.2, label: 'TIC TAC TOE ✖️' },
  { type: 'coffee',     x: -14.0, z: -7.1,  r: 4.2, label: 'BAR / COFFEE ☕', anchorId:'bar', offsetX:1.4, offsetZ:0.2 },
  { type: 'basketball', x: 16.0,  z: 10.6,  r: 3.8, label: 'BASKETBALL 🏀', anchorId:'basketball_zone', offsetX:-2.4, offsetZ:0 },
  { type: 'fifa',       x: 14.6,  z: -3.8,  r: 3.6, label: 'PS5 FIFA ⚽', anchorId:'fifa_zone', offsetX:0, offsetZ:2.8 },
  { type: 'money',      x: -16.0, z: 12.0,  r: 3.0, label: 'SAFE & CASH 💰', anchorId:'money_zone', offsetX:1.1, offsetZ:1.0 },
  { type: 'blackjack',  x: -6.8,  z: -14.2, r: 4.4, label: 'BLACKJACK TABLE ♠', anchorId:'blackjack_table', offsetX:0, offsetZ:3.2 },
  { type: 'hostconsole', x: -3.0, z: -10.2, r: 2.6, label: 'HOST CONSOLE 🎛️', anchorId:'host_console' },
  { type: 'mediawall', x: 0.0, z: 25.5, r: 6.0, label: 'MEDIA WALL 📺' },
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
function charCyl(rt, rb, h, color, segments = 10) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(rt, rb, h, segments),
    new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.04 })
  );
  m.castShadow = true;
  return m;
}
function charSphere(r, color, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 12, 8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.66, metalness: 0.03 })
  );
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  return m;
}

function makeCharacter(preset, nameOverride) {
  const g = new THREE.Group();
  const skin = preset.skin || 0xf0c89c;
  const name = nameOverride || preset.name;
  const hoodieColor = preset.hoodie === 'barca' ? 0xa50044 : new THREE.Color(preset.hoodie).getHex();

  const legL = new THREE.Group(); legL.position.set(-0.2, 0.9, 0);
  const lL = charCyl(0.17, 0.2, 0.9, 0x1a2438, 8); lL.position.y = -0.42; legL.add(lL);
  const shoeL = charBox(0.42, 0.18, 0.62, 0xeeeeee); shoeL.position.set(0, -0.9, 0.12); legL.add(shoeL);
  const soleL = charBox(0.44, 0.05, 0.64, 0x101010); soleL.position.set(0, -1.01, 0.12); legL.add(soleL);
  g.add(legL);

  const legR = new THREE.Group(); legR.position.set(0.2, 0.9, 0);
  const lR = charCyl(0.17, 0.2, 0.9, 0x1a2438, 8); lR.position.y = -0.42; legR.add(lR);
  const shoeR = charBox(0.42, 0.18, 0.62, 0xeeeeee); shoeR.position.set(0, -0.9, 0.12); legR.add(shoeR);
  const soleR = charBox(0.44, 0.05, 0.64, 0x101010); soleR.position.set(0, -1.01, 0.12); legR.add(soleR);
  g.add(legR);

  let torso;
  if (preset.hoodie === 'barca') {
    const shirtTex = texCanvas(128, 128, (ctx, w, h) => {
      for (let x = 0; x < w; x += 16) {
        ctx.fillStyle = (Math.floor(x/16)%2===0) ? '#a50044' : '#004d98';
        ctx.fillRect(x, 0, 16, h);
      }
    });
    torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 1.12, 8),
      new THREE.MeshStandardMaterial({ map: shirtTex, roughness: 0.7 }));
    torso.castShadow = true; torso.position.y = 1.95; g.add(torso);
  } else {
    torso = charCyl(0.42, 0.52, 1.12, hoodieColor, 8);
    torso.position.y = 1.95; g.add(torso);
  }
  const collar = charCyl(0.28, 0.34, 0.16, hoodieColor, 10);
  collar.position.y = 2.54;
  g.add(collar);
  const pocket = charBox(0.5, 0.22, 0.05, new THREE.Color(hoodieColor).multiplyScalar(0.68).getHex());
  pocket.position.set(0, 1.73, 0.43); g.add(pocket);
  const zipper = charBox(0.035, 0.78, 0.035, 0xe8d8a8);
  zipper.position.set(0, 1.98, 0.46); g.add(zipper);
  const drawL = charCyl(0.018, 0.018, 0.42, 0xf1e0bc, 6);
  drawL.position.set(-0.12, 2.28, 0.46); drawL.rotation.z = 0.08; g.add(drawL);
  const drawR = charCyl(0.018, 0.018, 0.42, 0xf1e0bc, 6);
  drawR.position.set(0.12, 2.28, 0.46); drawR.rotation.z = -0.08; g.add(drawR);

  const armL = new THREE.Group(); armL.position.set(-0.59, 2.4, 0);
  const aL = charCyl(0.15, 0.13, 0.98, hoodieColor, 8); aL.position.y = -0.5; aL.rotation.z = -0.08; armL.add(aL);
  const cuffL = charCyl(0.16, 0.16, 0.13, new THREE.Color(hoodieColor).multiplyScalar(0.58).getHex(), 8); cuffL.position.y = -1.0; armL.add(cuffL);
  const handL = charSphere(0.16, skin, 0.9, 0.75, 1.0); handL.position.y = -1.13; armL.add(handL);
  g.add(armL);

  const armR = new THREE.Group(); armR.position.set(0.59, 2.4, 0);
  const aR = charCyl(0.15, 0.13, 0.98, hoodieColor, 8); aR.position.y = -0.5; aR.rotation.z = 0.08; armR.add(aR);
  const cuffR = charCyl(0.16, 0.16, 0.13, new THREE.Color(hoodieColor).multiplyScalar(0.58).getHex(), 8); cuffR.position.y = -1.0; armR.add(cuffR);
  const handR = charSphere(0.16, skin, 0.9, 0.75, 1.0); handR.position.y = -1.13; armR.add(handR);
  g.add(armR);

  const head = charSphere(0.43, skin, 0.88, 1.05, 0.92);
  head.position.y = 2.9; g.add(head);
  const headY = 2.9;

  if (preset.hair === 'bald') {
    const scalp = charSphere(0.38, 0xf8d8b0, 0.9, 0.28, 0.9); scalp.position.y = headY + 0.32; g.add(scalp);
  } else if (preset.hair === 'fade') {
    const hair = charSphere(0.42, 0x0a0a0a, 0.92, 0.32, 0.92); hair.position.y = headY + 0.28; g.add(hair);
  } else {
    const hair = charSphere(0.43, 0x1a0f05, 0.96, 0.42, 0.94); hair.position.y = headY + 0.38; g.add(hair);
    const bang = charBox(0.34, 0.12, 0.12, 0x1a0f05); bang.position.set(-0.04, headY + 0.23, 0.34); bang.rotation.z = -0.22; g.add(bang);
  }

  const eyeL = charSphere(0.045, 0x0a0608, 1.0, 0.7, 0.32); eyeL.position.set(-0.16, headY+0.06, 0.39); g.add(eyeL);
  const eyeR = charSphere(0.045, 0x0a0608, 1.0, 0.7, 0.32); eyeR.position.set(0.16, headY+0.06, 0.39); g.add(eyeR);
  const browL = charBox(0.16, 0.035, 0.025, 0x18100a); browL.position.set(-0.16, headY+0.18, 0.39); browL.rotation.z = -0.12; g.add(browL);
  const browR = charBox(0.16, 0.035, 0.025, 0x18100a); browR.position.set(0.16, headY+0.18, 0.39); browR.rotation.z = 0.12; g.add(browR);

  if (preset.bigNose) {
    const nose = charCyl(0.08, 0.12, 0.26, skin, 8); nose.rotation.x = Math.PI / 2; nose.position.set(0, headY-0.04, 0.47); g.add(nose);
  } else {
    const nose = charSphere(0.085, skin, 0.72, 0.86, 1.0); nose.position.set(0, headY-0.05, 0.43); g.add(nose);
  }
  const smile = charBox(0.22, 0.025, 0.025, 0x6b2d22);
  smile.position.set(0, headY - 0.22, 0.39);
  g.add(smile);

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
    case 'blackjack_state':
      applyBlackjackState(msg.data || {});
      break;
    case 'blackjack_error':
      showBlackjackNotice(msg.error || 'Blackjack action rejected.');
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

// ==================== BLACKJACK / SAFE ====================
let blackjackState = null;
let seatedBlackjackSeat = null;

function chipFmt(v) {
  return String(Math.floor(Number(v) || 0));
}

function blackjackSecondsLeft() {
  if (!blackjackState || !blackjackState.phaseEndsAt) return 0;
  return Math.max(0, Math.ceil((blackjackState.phaseEndsAt - Date.now()) / 1000));
}

function blackjackPhaseLabel(me) {
  const phase = blackjackState ? blackjackState.phase : '';
  if (phase === 'player_turn' && me && blackjackState.turnSeat === me.seat) return 'YOUR TURN';
  if (phase === 'player_turn') return 'PLAYER TURN';
  if (phase === 'dealer_turn') return 'DEALER';
  return String(phase || '—').toUpperCase();
}

function cardLabel(card) {
  if (!card) return '';
  if (card.hidden) return '◆';
  const suits = { S:'♠', H:'♥', D:'♦', C:'♣' };
  return `${card.rank}${suits[card.suit] || card.suit || ''}`;
}

function cardIsRed(card) {
  return card && (card.suit === 'H' || card.suit === 'D');
}

function makeCardHtml(card) {
  const cls = card && card.hidden ? ' hidden' : (cardIsRed(card) ? ' red' : '');
  return `<span class="bj-card${cls}">${cardLabel(card)}</span>`;
}

function myBlackjackPlayer() {
  return blackjackState && blackjackState.players ? blackjackState.players[myId] : null;
}

function showBlackjackNotice(text) {
  const bjMsg = document.getElementById('bj-message');
  const safeMsg = document.getElementById('safe-status');
  if (bjMsg) bjMsg.textContent = text;
  if (safeMsg) safeMsg.textContent = text;
}

function blackjackSeatWorld(seat) {
  const anchor = BLACKJACK_SEAT_ANCHORS[seat];
  if (!anchor || !blackjackGroup) return null;
  return blackjackGroup.localToWorld(new THREE.Vector3(anchor.x, FLOOR_Y, anchor.z + 0.68));
}

function blackjackSeatYaw(seat) {
  const pos = blackjackSeatWorld(seat);
  if (!pos || !blackjackGroup) return player.yaw;
  const center = blackjackGroup.localToWorld(new THREE.Vector3(0, FLOOR_Y, 0.1));
  return Math.atan2(center.x - pos.x, center.z - pos.z) - Math.PI;
}

function snapToBlackjackSeat(seat) {
  const pos = blackjackSeatWorld(seat);
  if (!pos) return;
  player.group.position.set(pos.x, groundAt(pos.x, pos.z, player.group.position.y), pos.z);
  player.vel.set(0, 0, 0);
  player.onGround = true;
  player.yaw = blackjackSeatYaw(seat);
  player.group.rotation.y = player.yaw + Math.PI;
}

function updateBlackjackSeatVisuals() {
  if (!blackjackState || !blackjackSeatMarkers) return;
  for (let i = 0; i < blackjackSeatMarkers.length; i++) {
    const marker = blackjackSeatMarkers[i];
    const occupant = blackjackState.seats && blackjackState.seats[i];
    if (!marker || !marker.material) continue;
    const p = occupant && blackjackState.players ? blackjackState.players[occupant] : null;
    const resultColor = p && (p.result === 'YOU WIN' || p.result === 'BLACKJACK') ? 0x7adf9a : (p && (p.result === 'LOSE' || p.result === 'BUST') ? 0xff7f7f : 0xe8b96a);
    marker.material.color.setHex(blackjackState.turnSeat === i ? 0x7adf9a : (p && p.result ? resultColor : (occupant === myId ? 0xe8b96a : (occupant ? 0xd05d5d : 0xe8b96a))));
    marker.material.opacity = blackjackState.turnSeat === i ? 1 : (occupant ? 0.9 : 0.62);
  }
}

function makeBjCardTexture(label, red=false, hidden=false) {
  return canvasTex(256, 360, (ctx, w, h) => {
    if (hidden) {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#123f31');
      g.addColorStop(1, '#06120d');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#e8b96a';
      ctx.lineWidth = 12;
      ctx.strokeRect(16, 16, w - 32, h - 32);
      ctx.strokeStyle = 'rgba(232,185,106,0.36)';
      ctx.lineWidth = 4;
      for (let i = 0; i < 6; i++) ctx.strokeRect(38 + i * 8, 48 + i * 8, w - 76 - i * 16, h - 96 - i * 16);
      ctx.fillStyle = '#e8b96a';
      ctx.font = 'bold 72px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('WOYS', w / 2, h / 2 + 20);
      return;
    }
    const paper = ctx.createLinearGradient(0, 0, w, h);
    paper.addColorStop(0, '#fffaf0');
    paper.addColorStop(1, '#eadcc3');
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c8aa67';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = red ? '#b3262f' : '#12100c';
    ctx.font = 'bold 62px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText(label, 24, 70);
    ctx.font = 'bold 88px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(label.replace(/[A-Z0-9]+/, ''), w / 2, h / 2 + 46);
    ctx.font = 'bold 40px Courier New';
    ctx.textAlign = 'right';
    ctx.fillText(label, w - 24, h - 34);
  });
}

function addBjCard(card, x, z, rot=0, scale=1) {
  if (!blackjackCardGroup) return;
  const hidden = !!(card && card.hidden);
  const tex = makeBjCardTexture(cardLabel(card), cardIsRed(card), hidden);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58 * scale, 0.82 * scale),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = rot;
  mesh.position.set(x, 1.165, z);
  blackjackCardGroup.add(mesh);
}

function makeBjBadgeTexture(title, sub='', color='#e8b96a', bg='rgba(12,8,5,0.92)') {
  return canvasTex(512, 192, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = color;
    ctx.font = 'bold 52px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(title, w / 2, 78);
    if (sub) {
      ctx.fillStyle = '#f4dfad';
      ctx.font = 'bold 26px Courier New';
      ctx.fillText(sub, w / 2, 128);
    }
  });
}

function addBjTableBadge(title, sub, x, z, color='#e8b96a', width=1.55, height=0.58) {
  if (!blackjackStatusGroup) return;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: makeBjBadgeTexture(title, sub, color), transparent: true, side: THREE.DoubleSide })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 1.19, z);
  blackjackStatusGroup.add(mesh);
}

function clearGroupChildren(group) {
  if (!group) return;
  while (group.children.length) {
    const child = group.children.pop();
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (child.material.map) child.material.map.dispose();
      child.material.dispose();
    }
  }
}

function renderBlackjackTable3D() {
  clearGroupChildren(blackjackCardGroup);
  clearGroupChildren(blackjackChipGroup);
  clearGroupChildren(blackjackStatusGroup);
  if (!blackjackState || !blackjackGroup) return;
  const me = myBlackjackPlayer();
  const tablePhase = blackjackPhaseLabel(me);
  const phaseColor = tablePhase === 'YOUR TURN' ? '#7adf9a' : (blackjackState.phase === 'results' ? '#f2d27a' : '#e8b96a');
  addBjTableBadge(tablePhase, blackjackState.message || '', 0, 0.78, phaseColor, 2.35, 0.5);
  const dealerHand = blackjackState.dealer && blackjackState.dealer.hand ? blackjackState.dealer.hand : [];
  const dealerStart = -((dealerHand.length - 1) * 0.34);
  dealerHand.forEach((card, i) => addBjCard(card, dealerStart + i * 0.68, -0.96 + i * 0.02, -0.08 + i * 0.035, 1.06));
  const dealer = blackjackState.dealer || {};
  if (dealerHand.length) {
    const showFull = blackjackState.phase === 'dealer_turn' || blackjackState.phase === 'results';
    addBjTableBadge('DEALER', showFull ? `VALUE ${dealer.totalLabel || dealer.total || ''}` : `SHOWING ${dealer.totalLabel || dealer.total || ''}`, 0, -1.82, '#e8b96a', 2.0, 0.52);
  } else {
    addBjTableBadge('DEALER', 'WAITING', 0, -1.82, '#967848', 1.65, 0.48);
  }
  for (let seat = 0; seat < (blackjackState.seats || []).length; seat++) {
    const id = blackjackState.seats[seat];
    const p = id && blackjackState.players ? blackjackState.players[id] : null;
    const anchor = BLACKJACK_SEAT_ANCHORS[seat];
    const turn = blackjackState.turnSeat === seat && blackjackState.phase === 'player_turn';
    if (!p) {
      addBjTableBadge(`SEAT ${seat + 1}`, 'EMPTY', anchor.x * 0.82, anchor.z - 0.72, '#8b7347', 1.1, 0.38);
      continue;
    }
    const hand = p.hand || [];
    const cardStartX = anchor.x * 0.68 - ((hand.length - 1) * 0.29);
    const z = anchor.z - 1.22;
    hand.forEach((card, i) => addBjCard(card, cardStartX + i * 0.58, z + i * 0.035, anchor.ry * 0.38 + (i - hand.length / 2) * 0.045, 0.94));
    const statusColor = p.result === 'YOU WIN' || p.result === 'BLACKJACK' ? '#7adf9a' : (p.result === 'LOSE' || p.result === 'BUST' ? '#ff7f7f' : (p.result === 'PUSH' ? '#f2d27a' : (turn ? '#7adf9a' : '#e8b96a')));
    const statusTitle = p.result || (turn ? 'TURN' : (p.bet ? `BET ${p.bet}` : 'SEATED'));
    const statusSub = hand.length ? `VALUE ${p.totalLabel || p.total || ''}` : p.name;
    addBjTableBadge(statusTitle, statusSub, anchor.x * 0.82, anchor.z - 0.55, statusColor, 1.42, 0.5);
    if (p.bet > 0 && blackjackChipGroup) {
      const chipTotal = Math.min(12, Math.max(1, Math.ceil(p.bet / 50)));
      const cols = Math.min(4, chipTotal);
      for (let j = 0; j < chipTotal; j++) {
        const col = j % cols;
        const layer = Math.floor(j / cols);
        const chip = cyl(0.145, 0.145, 0.05, j % 3 === 0 ? 0xb3262f : (j % 3 === 1 ? 0xf4f0e6 : 0x20242c), 18, 0.28, 0.2);
        chip.position.set(anchor.x * 0.82 + (col - (cols - 1) / 2) * 0.22, 1.165 + layer * 0.052, anchor.z - 1.82);
        blackjackChipGroup.add(chip);
      }
      addBjTableBadge(String(p.bet), 'CHIPS', anchor.x * 0.82, anchor.z - 2.18, '#f4dfad', 0.75, 0.28);
    }
  }
}

function applyBlackjackState(data) {
  blackjackState = data;
  const me = myBlackjackPlayer();
  seatedBlackjackSeat = me && me.seat !== null && me.seat !== undefined ? me.seat : null;
  if (seatedBlackjackSeat !== null) snapToBlackjackSeat(seatedBlackjackSeat);
  updateBlackjackSeatVisuals();
  renderBlackjackTable3D();
  renderBlackjackPanel();
  renderSafePanel();
}

function renderSafePanel() {
  const me = myBlackjackPlayer();
  const bank = document.getElementById('safe-bank');
  const wallet = document.getElementById('safe-wallet');
  if (bank) bank.textContent = me ? chipFmt(me.bank) : '—';
  if (wallet) wallet.textContent = me ? chipFmt(me.wallet) : '—';
}

function renderBlackjackPanel() {
  const el = document.getElementById('blackjack-panel');
  if (!blackjackState || !el) return;
  const me = myBlackjackPlayer();
  const isTurn = me && me.seat !== null && blackjackState.turnSeat === me.seat && blackjackState.phase === 'player_turn';
  const phaseLabel = blackjackPhaseLabel(me);
  document.getElementById('bj-phase').textContent = `PHASE: ${phaseLabel}`;
  document.getElementById('bj-wallet').textContent = `WALLET: ${me ? chipFmt(me.wallet) : '—'}`;
  document.getElementById('bj-bet').textContent = `BET: ${me ? chipFmt(me.bet) : '—'}`;
  document.getElementById('bj-timer').textContent = blackjackSecondsLeft() ? `TIMER: ${blackjackSecondsLeft()}S` : 'TIMER: —';
  const msg = document.getElementById('bj-message');
  msg.textContent = isTurn ? 'YOUR TURN: Hit, Stand, or Double if available.' : (blackjackState.message || '');
  msg.className = 'bj-status' + (isTurn ? ' your-turn' : (blackjackState.phase === 'results' ? ' results' : ''));
  const seatsEl = document.getElementById('bj-seats');
  seatsEl.innerHTML = '';
  for (let i = 0; i < (blackjackState.seats || []).length; i++) {
    const id = blackjackState.seats[i];
    const p = id && blackjackState.players ? blackjackState.players[id] : null;
    const b = document.createElement('button');
    const turn = blackjackState.turnSeat === i && blackjackState.phase === 'player_turn';
    b.textContent = p ? `SEAT ${i + 1}: ${p.name}${turn ? ' · TURN' : ''}${p.bet ? ' · BET ' + p.bet : ''}` : `SIT SEAT ${i + 1}`;
    b.disabled = (!!id && id !== myId) || (blackjackState.phase !== 'betting' && (!p || p.id !== myId));
    b.className = (id === myId ? 'mine' : (id ? 'occupied' : '')) + (turn ? ' active' : '');
    b.onclick = () => wsSend({ type:'blackjack_sit', seat:i });
    seatsEl.appendChild(b);
  }
  const dealer = blackjackState.dealer || { hand: [] };
  document.getElementById('bj-dealer').innerHTML = (dealer.hand || []).map(makeCardHtml).join('') + (dealer.total ? `<span class="mini-sub">VALUE ${dealer.totalLabel || dealer.total}</span>` : '');
  document.getElementById('bj-hand').innerHTML = me && me.hand && me.hand.length
    ? me.hand.map(makeCardHtml).join('') + `<span class="mini-sub">VALUE ${me.totalLabel || me.total || 0} · BET ${me.bet || 0}${me.result ? ' · ' + me.result : ''}</span>`
    : '<span class="mini-sub">Sit and bet to receive cards.</span>';
  document.getElementById('bj-hit').disabled = !isTurn;
  document.getElementById('bj-stand').disabled = !isTurn;
  document.getElementById('bj-double').disabled = !isTurn || !me || (me.hand || []).length !== 2 || me.wallet < me.bet;
  document.getElementById('bj-leave').disabled = !me || me.seat === null || (blackjackState.phase !== 'betting' && me.bet > 0);
  document.querySelectorAll('[data-bj-bet]').forEach(btn => {
    const amount = Number(btn.dataset.bjBet);
    btn.disabled = !me || me.seat === null || blackjackState.phase !== 'betting' || me.wallet < amount || amount <= 0;
  });
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
  if (e.target.tagName === 'INPUT') return;
  if (anyPanelOpen()) return;
  if (e.key.toLowerCase() === 't') { e.preventDefault(); openPanel('chat-panel'); setTimeout(()=>document.getElementById('chat-input').focus(),50); }
  if (e.key.toLowerCase() === 'e') { e.preventDefault(); tryInteract(); }
  if (e.key.toLowerCase() === 'm') { e.preventDefault(); toggleMic(); }
  if (e.key === ' ' && e.target.tagName !== 'INPUT') {
    e.preventDefault();
    if (seatedBlackjackSeat === null && player.onGround) { player.vel.y = 7; player.onGround = false; }
  }
  if (e.key.toLowerCase() === 'c') toggleView();
  if (e.key.toLowerCase() === 'v') joinTVAudioAnywhere();
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
  if (seatedBlackjackSeat === null && player.onGround && !anyPanelOpen()) { player.vel.y = 7; player.onGround = false; }
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
    openYouTubeSearch(raw);
    return;
  }
  setSharedMediaState(makeMediaState(videoId, true, 0));
  startTVPlayback(true);
  document.getElementById('host-info').textContent = 'Wall TV synced.';
  drawMediaScreen();
});
function openYouTubeSearch(raw) {
  const q = String(raw || '').trim();
  if (!q) {
    document.getElementById('host-info').textContent = 'Paste a YouTube URL/video ID or type a search.';
    return;
  }
  window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, '_blank', 'noopener,noreferrer');
  document.getElementById('host-info').textContent = 'Search opened. Paste a result URL or video ID here, then LOAD + PLAY.';
}
document.getElementById('host-search-youtube').addEventListener('click', () => {
  if (!isHostUser()) return;
  openYouTubeSearch(document.getElementById('host-media-url').value);
});
document.getElementById('host-play-media').addEventListener('click', () => {
  if (!isHostUser() || !hostState.media.videoId) return;
  setSharedMediaState(makeMediaState(hostState.media.videoId, true, mediaNow()));
  document.getElementById('host-info').textContent = 'Wall TV playing.';
});
document.getElementById('host-pause-media').addEventListener('click', () => {
  if (!isHostUser() || !hostState.media.videoId) return;
  setSharedMediaState(makeMediaState(hostState.media.videoId, false, mediaNow()));
  document.getElementById('host-info').textContent = 'Wall TV paused.';
});
document.getElementById('host-seek-media').addEventListener('click', () => {
  if (!isHostUser() || !hostState.media.videoId) return;
  const seconds = Math.max(0, +(document.getElementById('host-media-seek').value || 0));
  setSharedMediaState(makeMediaState(hostState.media.videoId, hostState.media.playing, seconds));
  document.getElementById('host-info').textContent = 'Wall TV seek synced.';
});
document.getElementById('host-stop-media').addEventListener('click', () => {
  if (!isHostUser()) return;
  setSharedMediaState(makeMediaState('', false, 0));
});
document.getElementById('tv-audio-join').addEventListener('click', joinTVAudioAnywhere);
document.getElementById('btn-music').addEventListener('touchstart', e => {
  e.preventDefault();
  joinTVAudioAnywhere();
}, { passive:false });
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
function closeAllPanels() { document.querySelectorAll('.panel').forEach(p => p.style.display = 'none'); soccerGame.running = false; if (typeof stopArcade === 'function') stopArcade(); }
function openPanel(id) {
  closeAllPanels();
  document.getElementById(id).style.display = 'block';
  if (id === 'fifa-panel') soccerGame.running = true;
  if (id === 'arcade-panel' && typeof startArcade === 'function') startArcade();
  if (document.pointerLockElement) document.exitPointerLock();
}
document.querySelectorAll('.panel .close').forEach(b => b.onclick = closeAllPanels);
document.querySelectorAll('[data-safe-withdraw]').forEach(b => {
  b.addEventListener('click', () => wsSend({ type:'safe_withdraw', amount:Number(b.dataset.safeWithdraw) }));
});
document.querySelectorAll('[data-safe-deposit]').forEach(b => {
  b.addEventListener('click', () => wsSend({ type:'safe_deposit', amount:Number(b.dataset.safeDeposit) }));
});
document.querySelectorAll('[data-bj-bet]').forEach(b => {
  b.addEventListener('click', () => wsSend({ type:'blackjack_bet', amount:Number(b.dataset.bjBet) }));
});
document.getElementById('bj-hit').addEventListener('click', () => wsSend({ type:'blackjack_hit' }));
document.getElementById('bj-stand').addEventListener('click', () => wsSend({ type:'blackjack_stand' }));
document.getElementById('bj-double').addEventListener('click', () => wsSend({ type:'blackjack_double' }));
document.getElementById('bj-leave').addEventListener('click', () => wsSend({ type:'blackjack_leave' }));

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
  else if (i.type === 'arcade') { openPanel('arcade-panel'); }
  else if (i.type === 'ttt') { openPanel('ttt-panel'); resetTTT(); }
  else if (i.type === 'coffee') addChat('System', '*' + player.name + ' orders an overpriced coffee ☕*', '#e8b96a');
  else if (i.type === 'lounge') addChat('System', '*' + player.name + ' sinks into the couch 🛋️*', '#8ac8e8');
  else if (i.type === 'table') { document.getElementById('war-count').textContent = String(remotes.size + 1); openPanel('war-panel'); }
  else if (i.type === 'basketball') openPanel('basketball-panel');
  else if (i.type === 'fifa') { openPanel('fifa-panel'); startSoccerGame(); }
  else if (i.type === 'money') { wsSend({ type:'blackjack_get' }); openPanel('safe-panel'); }
  else if (i.type === 'blackjack') { wsSend({ type:'blackjack_get' }); openPanel('blackjack-panel'); }
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

function inWalkZone(x, z, zone) {
  return x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ;
}

function groundAt(x, z, currentY = FLOOR_Y) {
  if (inWalkZone(x, z, STAIR_LOWER_ZONE)) {
    return FLOOR_Y + ((STAIR_LOWER_ZONE.maxZ - z) / (STAIR_LOWER_ZONE.maxZ - STAIR_LOWER_ZONE.minZ)) * STAIR_MID_Y;
  }
  if (inWalkZone(x, z, STAIR_MID_LANDING_ZONE) && currentY >= STAIR_MID_Y - STAIR_MID_SNAP_TOLERANCE) {
    return STAIR_MID_Y;
  }
  if (inWalkZone(x, z, STAIR_UPPER_ZONE) && currentY >= STAIR_MID_Y - STAIR_MID_SNAP_TOLERANCE) {
    return STAIR_MID_Y + ((STAIR_UPPER_ZONE.maxX - x) / (STAIR_UPPER_ZONE.maxX - STAIR_UPPER_ZONE.minX)) * STAIR_MID_Y;
  }
  if (inWalkZone(x, z, STAIR_TOP_LANDING_ZONE) && currentY >= LOFT_Y - LOFT_SNAP_TOLERANCE) {
    return LOFT_Y;
  }
  if (inWalkZone(x, z, LOFT_ZONE) && currentY >= LOFT_Y - LOFT_SNAP_TOLERANCE) {
    return LOFT_Y;
  }
  return FLOOR_Y;
}

function updatePlayer(dt, t) {
  if (seatedBlackjackSeat !== null) {
    snapToBlackjackSeat(seatedBlackjackSeat);
    player._moving = false;
    const n = nearest();
    const prompt = document.getElementById('prompt');
    if (n && n.type === 'blackjack') { prompt.textContent = '▸ E: BLACKJACK TABLE'; prompt.style.display = 'block'; }
    else { prompt.style.display = 'none'; }
    maybeBroadcastPos(t);
    return;
  }
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

  const groundY = groundAt(player.group.position.x, player.group.position.z, player.group.position.y);
  if (ny <= groundY) {
    ny = groundY;
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
  if (seatedBlackjackSeat !== null && blackjackGroup) {
    const seatPos = player.group.position.clone();
    const tableCenter = blackjackGroup.localToWorld(new THREE.Vector3(0, 1.16, 0.25));
    const away = seatPos.clone().sub(tableCenter).setY(0).normalize();
    const side = new THREE.Vector3(-away.z, 0, away.x);
    const camTarget = seatPos.clone().add(away.multiplyScalar(1.25)).add(side.multiplyScalar(0.25));
    camTarget.y += 4.9;
    camera.position.lerp(camTarget, 0.16);
    camera.lookAt(tableCenter.x, tableCenter.y + 0.2, tableCenter.z);
    return;
  }
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
const fifaCanvas = document.getElementById('fifa-canvas');
const fifaCtx = fifaCanvas.getContext('2d');
const fifaScoreEl = document.getElementById('fifa-score');
const fifaClockEl = document.getElementById('fifa-clock');
const fifaFeverEl = document.getElementById('fifa-fever');
const fifaCommentaryEl = document.getElementById('fifa-commentary');
const fifaSubEl = document.getElementById('fifa-sub');

const soccerGame = {
  running: false,
  raf: 0,
  lastTs: 0,
  matchSeconds: 90,
  timeLeft: 90,
  state: 'idle',
  shootHeld: false,
  shootCharge: 0,
  player: null,
  cpu: null,
  ball: null,
  fever: 0,
  feverReady: false,
  kickoffTimer: 0,
  touch: { active:false, x:0, y:0 },
  commentary: 'Kickoff at the luxury nonsense dome.',
  score: { home:0, away:0 },
  particles: []
};

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function dist(ax, ay, bx, by) { return Math.hypot(ax-bx, ay-by); }
function normalize(dx, dy) {
  const m = Math.hypot(dx, dy) || 1;
  return { x: dx / m, y: dy / m, m };
}
function updateFifaHud() {
  fifaScoreEl.textContent = `PAX FC ${soccerGame.score.home} - ${soccerGame.score.away} CPU UNITED`;
  const secs = Math.max(0, soccerGame.timeLeft);
  const whole = Math.floor(secs);
  const m = String(Math.floor(whole / 60)).padStart(2, '0');
  const s = String(whole % 60).padStart(2, '0');
  fifaClockEl.textContent = `${m}:${s}`;
  fifaFeverEl.textContent = soccerGame.feverReady ? 'FEVER READY: YES' : `FEVER: ${Math.floor(soccerGame.fever)}%`;
  fifaCommentaryEl.textContent = soccerGame.commentary;
}
function resetBall(direction = 1) {
  soccerGame.player.x = 160; soccerGame.player.y = 200; soccerGame.player.vx = 0; soccerGame.player.vy = 0;
  soccerGame.cpu.x = 560; soccerGame.cpu.y = 200; soccerGame.cpu.vx = 0; soccerGame.cpu.vy = 0;
  soccerGame.ball.x = 360; soccerGame.ball.y = 200;
  soccerGame.ball.vx = 4 * direction; soccerGame.ball.vy = (Math.random() - 0.5) * 2;
  soccerGame.ball.owner = null;
  soccerGame.kickoffTimer = 1.2;
}
function resetSoccerMatch() {
  soccerGame.timeLeft = soccerGame.matchSeconds;
  soccerGame.state = 'playing';
  soccerGame.fever = 0;
  soccerGame.feverReady = false;
  soccerGame.shootCharge = 0;
  soccerGame.score.home = 0;
  soccerGame.score.away = 0;
  soccerGame.commentary = 'Kickoff at the luxury nonsense dome.';
  soccerGame.player = { x:160, y:200, vx:0, vy:0, r:18, speed:170, color:'#57a8ff', aura:'#9fd4ff', name:'Pax FC' };
  soccerGame.cpu = { x:560, y:200, vx:0, vy:0, r:18, speed:158, color:'#ff6b5f', aura:'#ffc2b8', name:'CPU United', mood:0 };
  soccerGame.ball = { x:360, y:200, vx:0, vy:0, r:10, color:'#f6f1d6', trail:[] };
  soccerGame.particles = [];
  resetBall(Math.random() < 0.5 ? -1 : 1);
  updateFifaHud();
  renderSoccer();
}
function startSoccerGame() {
  if (!soccerGame.player) resetSoccerMatch();
  soccerGame.running = true;
  soccerGame.lastTs = 0;
  fifaSubEl.textContent = 'WASD / arrows move · hold SPACE to charge shot · SHIFT sprint · click SUPER SHOT when close';
  if (!soccerGame.raf) soccerGame.raf = requestAnimationFrame(soccerLoop);
}
function stopSoccerGame() {
  soccerGame.running = false;
  if (soccerGame.raf) cancelAnimationFrame(soccerGame.raf);
  soccerGame.raf = 0;
}
function addSoccerParticles(x, y, color, power=1) {
  for (let i = 0; i < 8 + power * 4; i++) {
    soccerGame.particles.push({
      x, y,
      vx: (Math.random()-0.5) * (50 + power * 40),
      vy: (Math.random()-0.5) * (50 + power * 40),
      life: 0.3 + Math.random() * 0.35,
      color
    });
  }
}
function kickBall(kicker, targetX, targetY, boost = 1) {
  const dx = targetX - soccerGame.ball.x;
  const dy = targetY - soccerGame.ball.y;
  const n = normalize(dx, dy);
  const power = 290 + soccerGame.shootCharge * 260 + boost * 80 + (soccerGame.feverReady ? 180 : 0);
  soccerGame.ball.vx = n.x * power;
  soccerGame.ball.vy = n.y * power;
  soccerGame.ball.x += n.x * 12;
  soccerGame.ball.y += n.y * 12;
  soccerGame.ball.owner = null;
  soccerGame.commentary = soccerGame.feverReady ? 'ABSURD ROCKET SHOT. Somebody call insurance.' : `${kicker.name} unleashes a hit.`;
  addSoccerParticles(soccerGame.ball.x, soccerGame.ball.y, soccerGame.feverReady ? '#ffd35a' : '#ffffff', soccerGame.feverReady ? 3 : 1);
  soccerGame.fever = soccerGame.feverReady ? 0 : clamp(soccerGame.fever + 14, 0, 100);
  soccerGame.feverReady = false;
  soccerGame.shootCharge = 0;
  updateFifaHud();
}
function maybePlayerKick(forceSuper = false) {
  const d = dist(soccerGame.player.x, soccerGame.player.y, soccerGame.ball.x, soccerGame.ball.y);
  if (d > soccerGame.player.r + soccerGame.ball.r + 8) return;
  const tx = 720;
  const ty = 200 + (keys['arrowup'] || keys['w'] ? -40 : 0) + (keys['arrowdown'] || keys['s'] ? 40 : 0);
  kickBall(soccerGame.player, tx, ty, forceSuper ? 2.2 : 1);
}
function cpuKick() {
  const targetY = 200 + (Math.random() - 0.5) * 120;
  kickBall(soccerGame.cpu, 0, targetY, 0.85 + Math.random() * 0.5);
}
function updateSoccerInput(dt) {
  if (document.getElementById('fifa-panel').style.display !== 'block') return;
  let mx = 0, my = 0;
  if (keys['a'] || keys['arrowleft']) mx -= 1;
  if (keys['d'] || keys['arrowright']) mx += 1;
  if (keys['w'] || keys['arrowup']) my -= 1;
  if (keys['s'] || keys['arrowdown']) my += 1;
  if (soccerGame.touch.active) {
    const dx = soccerGame.touch.x - soccerGame.player.x;
    const dy = soccerGame.touch.y - soccerGame.player.y;
    const n = normalize(dx, dy);
    if (Math.hypot(dx, dy) > 10) { mx += n.x; my += n.y; }
  }
  const n = normalize(mx, my);
  const sprint = keys['shift'];
  soccerGame.player.vx = n.x * soccerGame.player.speed * (sprint ? 1.5 : 1);
  soccerGame.player.vy = n.y * soccerGame.player.speed * (sprint ? 1.5 : 1);
  soccerGame.player.x = clamp(soccerGame.player.x + soccerGame.player.vx * dt, 24, 696);
  soccerGame.player.y = clamp(soccerGame.player.y + soccerGame.player.vy * dt, 24, 376);

  const chargeHeld = !!(keys[' '] || soccerGame.shootHeld);
  if (chargeHeld) soccerGame.shootCharge = clamp(soccerGame.shootCharge + dt * 1.1, 0, 1);
  if (!chargeHeld && soccerGame.shootCharge > 0.04) maybePlayerKick(false);
}
function updateCpu(dt) {
  const cpu = soccerGame.cpu;
  const ball = soccerGame.ball;
  const defendBias = soccerGame.score.away > soccerGame.score.home ? 0.78 : 1;
  const targetX = ball.x > 390 ? ball.x : 455;
  const targetY = clamp(ball.y + Math.sin(performance.now() * 0.002 + cpu.mood) * 18, 40, 360);
  const n = normalize(targetX - cpu.x, targetY - cpu.y);
  cpu.x = clamp(cpu.x + n.x * cpu.speed * defendBias * dt, 24, 696);
  cpu.y = clamp(cpu.y + n.y * cpu.speed * defendBias * dt, 24, 376);
  if (dist(cpu.x, cpu.y, ball.x, ball.y) < cpu.r + ball.r + 7) {
    cpuKick();
    cpu.mood += 0.65;
  }
}
function updateBall(dt) {
  const b = soccerGame.ball;
  if (soccerGame.kickoffTimer > 0) soccerGame.kickoffTimer -= dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.vx *= Math.pow(0.992, dt * 60);
  b.vy *= Math.pow(0.992, dt * 60);

  const goalTop = 140, goalBot = 260;
  if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy) * 0.92; }
  if (b.y > 400 - b.r) { b.y = 400 - b.r; b.vy = -Math.abs(b.vy) * 0.92; }
  const inGoalLane = b.y > goalTop && b.y < goalBot;
  if (!inGoalLane) {
    if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.92; }
    if (b.x > 720 - b.r) { b.x = 720 - b.r; b.vx = -Math.abs(b.vx) * 0.92; }
  }

  if (b.x < -20 && inGoalLane) {
    soccerGame.score.away++;
    soccerGame.commentary = 'CPU United scores. Disgraceful scenes.';
    soccerGame.fever = clamp(soccerGame.fever + 25, 0, 100);
    soccerGame.feverReady = soccerGame.fever >= 100;
    resetBall(1);
    updateFifaHud();
  }
  if (b.x > 740 && inGoalLane) {
    soccerGame.score.home++;
    soccerGame.commentary = 'PAX FC SCORES. The room loses its mind.';
    soccerGame.fever = clamp(soccerGame.fever + 34, 0, 100);
    soccerGame.feverReady = soccerGame.fever >= 100;
    resetBall(-1);
    updateFifaHud();
  }

  const collide = (p, isPlayer) => {
    const d = dist(p.x, p.y, b.x, b.y);
    const minD = p.r + b.r;
    if (d < minD) {
      const n = normalize(b.x - p.x, b.y - p.y);
      const overlap = minD - d;
      b.x += n.x * overlap;
      b.y += n.y * overlap;
      const touchBoost = isPlayer ? 36 : 28;
      b.vx += n.x * touchBoost + p.vx * 0.22;
      b.vy += n.y * touchBoost + p.vy * 0.22;
      if (isPlayer) {
        soccerGame.fever = clamp(soccerGame.fever + dt * 30 + 0.2, 0, 100);
        soccerGame.feverReady = soccerGame.fever >= 100;
      }
    }
  };
  collide(soccerGame.player, true);
  collide(soccerGame.cpu, false);

  if (Math.abs(b.vx) + Math.abs(b.vy) < 16 && soccerGame.kickoffTimer <= 0) {
    const n = normalize((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 70);
    b.vx += n.x * 24;
    b.vy += n.y * 24;
  }
}
function updateParticles(dt) {
  for (let i = soccerGame.particles.length - 1; i >= 0; i--) {
    const p = soccerGame.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
    if (p.life <= 0) soccerGame.particles.splice(i, 1);
  }
}
function renderSoccer() {
  const ctx = fifaCtx;
  const { player, cpu, ball } = soccerGame;
  ctx.clearRect(0, 0, 720, 400);

  const g = ctx.createLinearGradient(0, 0, 0, 400);
  g.addColorStop(0, '#1a7a35');
  g.addColorStop(1, '#0d4a20');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 720, 400);

  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(i * 72, 0, 72, 400);
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, 684, 364);
  ctx.beginPath(); ctx.moveTo(360, 18); ctx.lineTo(360, 382); ctx.stroke();
  ctx.beginPath(); ctx.arc(360, 200, 55, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeRect(18, 120, 80, 160);
  ctx.strokeRect(622, 120, 80, 160);
  ctx.strokeRect(0, 145, 18, 110);
  ctx.strokeRect(702, 145, 18, 110);

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(0, 145, 18, 110);
  ctx.fillRect(702, 145, 18, 110);

  const drawPlayer = (p, boost) => {
    ctx.beginPath();
    ctx.fillStyle = boost ? p.aura : p.color;
    ctx.arc(p.x, p.y, p.r + (boost ? 4 : 0), 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = p.color;
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  drawPlayer(player, soccerGame.feverReady);
  drawPlayer(cpu, false);

  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.rotate(performance.now() * 0.006 + ball.x * 0.01);
  ctx.fillStyle = ball.color;
  ctx.beginPath(); ctx.arc(0, 0, ball.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke();
  ctx.restore();

  for (const p of soccerGame.particles) {
    ctx.globalAlpha = Math.max(0, p.life / 0.65);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 4, 4);
  }
  ctx.globalAlpha = 1;

  const meterW = 180;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(16, 12, meterW, 14);
  ctx.fillStyle = soccerGame.feverReady ? '#ffd35a' : '#7adf9a';
  ctx.fillRect(16, 12, meterW * (soccerGame.feverReady ? 1 : soccerGame.fever / 100), 14);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.strokeRect(16, 12, meterW, 14);

  ctx.fillStyle = '#f5e7c6';
  ctx.font = 'bold 13px Courier New';
  ctx.fillText(`SHOT ${Math.round(soccerGame.shootCharge * 100)}%`, 16, 44);

  if (soccerGame.state !== 'playing') {
    ctx.fillStyle = 'rgba(0,0,0,0.48)';
    ctx.fillRect(120, 120, 480, 140);
    ctx.strokeStyle = '#e8b96a';
    ctx.strokeRect(120, 120, 480, 140);
    ctx.fillStyle = '#f8e8b0';
    ctx.font = 'bold 34px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(soccerGame.state === 'sudden' ? 'SUDDEN DEATH' : 'MATCH OVER', 360, 175);
    ctx.font = '18px Courier New';
    ctx.fillText(soccerGame.commentary, 360, 210);
    ctx.fillText('Press NEW MATCH and do something ridiculous again.', 360, 238);
    ctx.textAlign = 'left';
  }
}
function soccerLoop(ts) {
  if (!soccerGame.running) { soccerGame.raf = 0; return; }
  const dt = Math.min(0.033, soccerGame.lastTs ? (ts - soccerGame.lastTs) / 1000 : 0.016);
  soccerGame.lastTs = ts;
  if (document.getElementById('fifa-panel').style.display === 'block') {
    if (soccerGame.state === 'playing' || soccerGame.state === 'sudden') {
      soccerGame.timeLeft -= soccerGame.state === 'playing' ? dt : 0;
      if (soccerGame.timeLeft <= 0 && soccerGame.state === 'playing') {
        if (soccerGame.score.home === soccerGame.score.away) {
          soccerGame.state = 'sudden';
          soccerGame.timeLeft = 0;
          soccerGame.commentary = 'Tied after 90. Next goal wins. This got stupid in the best way.';
        } else {
          soccerGame.state = 'ended';
          soccerGame.commentary = soccerGame.score.home > soccerGame.score.away ? 'PAX FC wins. Cinema.' : 'CPU United steals it. Appalling.';
        }
        updateFifaHud();
      }
      updateSoccerInput(dt);
      updateCpu(dt);
      updateBall(dt);
      updateParticles(dt);
      if (soccerGame.state === 'sudden' && soccerGame.score.home !== soccerGame.score.away) {
        soccerGame.state = 'ended';
        soccerGame.commentary = soccerGame.score.home > soccerGame.score.away ? 'GOLDEN GOAL. Room erupts.' : 'Golden goal conceded. Grim.';
        updateFifaHud();
      }
      updateFifaHud();
    }
    renderSoccer();
  }
  soccerGame.raf = requestAnimationFrame(soccerLoop);
}

document.getElementById('fifa-shoot').onclick = () => {
  soccerGame.shootCharge = Math.max(soccerGame.shootCharge, 0.85);
  maybePlayerKick(true);
};
document.getElementById('fifa-reset').onclick = () => {
  resetSoccerMatch();
  startSoccerGame();
};
fifaCanvas.addEventListener('pointerdown', (e) => {
  const r = fifaCanvas.getBoundingClientRect();
  soccerGame.touch.active = true;
  soccerGame.touch.x = (e.clientX - r.left) * (fifaCanvas.width / r.width);
  soccerGame.touch.y = (e.clientY - r.top) * (fifaCanvas.height / r.height);
});
fifaCanvas.addEventListener('pointermove', (e) => {
  if (!soccerGame.touch.active) return;
  const r = fifaCanvas.getBoundingClientRect();
  soccerGame.touch.x = (e.clientX - r.left) * (fifaCanvas.width / r.width);
  soccerGame.touch.y = (e.clientY - r.top) * (fifaCanvas.height / r.height);
});
window.addEventListener('pointerup', () => { soccerGame.touch.active = false; });
resetSoccerMatch();

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
