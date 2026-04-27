// ==================== ROOM ====================
setLoad(15, 'BUILDING ROOM...');

const roomGroup = new THREE.Group();
scene.add(roomGroup);
let boardWallMesh = null;
let snakeWallMesh = null;
let fifaScreenMesh = null;
let safeDoor = null;
let cashStack = null;
let centerSculpture = null;
let tableTopDisplay = null;
let tableInteractAnchor = new THREE.Vector3(0,0,0);


const HOST_PREFIX = '__HOST__';
const hostState = {
  vibe: 'chill',
  media: { videoId: '', playing: false, startAt: 0, startedAt: 0, updatedAt: 0 },
  event: null
};
let hostConsoleGroup = null;
let activeVibe = 'chill';
let eventPulse = 0;
let moneyRain = [];
const moneyRainGroup = new THREE.Group();
scene.add(moneyRainGroup);

let mediaScreenMesh = null;
let mediaScreenCanvas = null;
let mediaScreenCtx = null;
let mediaScreenTex = null;
let tvCreated = false;
let tvStartedByUser = false;
let wallMaterials = [];
let floorMaterials = [];
let mediaFrameMaterials = [];
let vibeStripMaterials = [];
let vibeGlowMaterials = [];
let tvOverlay = null;
let tvIframe = null;
let tvAudioJoin = null;
let mediaControls = null;
let mediaVolumeEl = null;
let mediaMuteBtn = null;
let mediaVolumeToggle = null;
let tvIframeVideoId = '';
let tvLastRect = '';
let tvLocalBase = 0;
let tvLocalBaseAt = 0;
let tvLastDriftCheck = 0;
let tvStartedAtWall = 0;
let floorMat = null;
let mediaFrameMat = null;

const MEDIA_VOLUME_KEY = 'viberoom.mediaVolume';
const MEDIA_MUTED_KEY = 'viberoom.mediaMuted';
let mediaVolume = Math.max(0, Math.min(100, +(localStorage.getItem(MEDIA_VOLUME_KEY) || 70)));
let mediaMuted = localStorage.getItem(MEDIA_MUTED_KEY) === '1';


function ytIdFrom(input) {
  const s = String(input || '').trim();
  if (!s) return '';
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : '';
}
function buildMediaScreenTexture() {
  mediaScreenCanvas = document.createElement('canvas');
  mediaScreenCanvas.width = 1280;
  mediaScreenCanvas.height = 720;
  mediaScreenCtx = mediaScreenCanvas.getContext('2d');
  mediaScreenTex = new THREE.CanvasTexture(mediaScreenCanvas);
  mediaScreenTex.colorSpace = THREE.SRGBColorSpace;
  drawMediaScreen();
}
function drawMediaScreen() {
  if (!mediaScreenCtx) return;
  const ctx = mediaScreenCtx, w = mediaScreenCanvas.width, h = mediaScreenCanvas.height;
  const g = ctx.createLinearGradient(0,0,w,h);
  g.addColorStop(0, '#0b1020');
  g.addColorStop(1, '#1f120d');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,w,h);
  ctx.strokeStyle = '#e8b96a';
  ctx.lineWidth = 10;
  ctx.strokeRect(18,18,w-36,h-36);
  ctx.fillStyle = '#e8b96a';
  ctx.font = 'bold 82px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('MEDIA WALL', w/2, 115);

  if (hostState.media.videoId) {
    ctx.fillStyle = '#f2e4c8';
    ctx.font = 'bold 46px Arial';
    ctx.fillText('LIVE YOUTUBE TV', w/2, 210);
    ctx.font = '34px Arial';
    ctx.fillText(hostState.media.videoId, w/2, 280);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(240, 350, 800, 220);
    ctx.fillStyle = '#d8c8a8';
    ctx.font = '32px Arial';
    ctx.fillText(tvStartedByUser ? 'TV IS LIVE IN ROOM' : 'PRESS E OR TAP AUDIO BUTTON', w/2, 460);
    ctx.fillText('WALK AROUND WHILE IT PLAYS', w/2, 515);
  } else {
    ctx.fillStyle = '#f2e4c8';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('HOST CONSOLE READY', w/2, 240);
    ctx.font = '32px Arial';
    ctx.fillText('Load a YouTube link to turn this wall into the room TV.', w/2, 320);
  }
  if (mediaScreenTex) mediaScreenTex.needsUpdate = true;
}
function ensureTVDom() {
  if (tvCreated) return;
  tvOverlay = document.getElementById('tv-overlay');
  tvIframe = document.getElementById('tv-iframe');
  tvAudioJoin = document.getElementById('tv-audio-join');
  mediaControls = document.getElementById('media-controls');
  mediaVolumeEl = document.getElementById('media-volume');
  mediaMuteBtn = document.getElementById('media-mute');
  mediaVolumeToggle = document.getElementById('media-volume-toggle');
  if (!tvOverlay || !tvIframe || !tvAudioJoin || !mediaControls || !mediaVolumeEl || !mediaMuteBtn || !mediaVolumeToggle) return;
  mediaVolumeEl.value = String(mediaVolume);
  mediaVolumeToggle.addEventListener('click', () => {
    mediaControls.classList.toggle('open');
  });
  mediaVolumeEl.addEventListener('input', () => {
    mediaVolume = Math.max(0, Math.min(100, +mediaVolumeEl.value || 0));
    mediaMuted = mediaVolume <= 0 ? true : false;
    localStorage.setItem(MEDIA_VOLUME_KEY, String(mediaVolume));
    localStorage.setItem(MEDIA_MUTED_KEY, mediaMuted ? '1' : '0');
    applyLocalMediaVolume();
  });
  mediaMuteBtn.addEventListener('click', () => {
    mediaMuted = !mediaMuted;
    localStorage.setItem(MEDIA_MUTED_KEY, mediaMuted ? '1' : '0');
    applyLocalMediaVolume();
  });
  tvCreated = true;
  applyLocalMediaVolume();
}
function mediaNow(media=hostState.media, now=Date.now()) {
  if (!media || !media.videoId) return 0;
  const base = +media.startAt || 0;
  return media.playing ? Math.max(0, base + (now - (+media.startedAt || now)) / 1000) : Math.max(0, base);
}
function normalizeMedia(data) {
  return {
    videoId: data && data.videoId ? String(data.videoId) : '',
    playing: !!(data && data.playing),
    startAt: Math.max(0, +(data && data.startAt) || 0),
    startedAt: +(data && data.startedAt) || 0,
    updatedAt: +(data && data.updatedAt) || Date.now()
  };
}
function makeMediaState(videoId, playing, startAt=0) {
  const now = Date.now();
  return {
    videoId: videoId || '',
    playing: !!playing && !!videoId,
    startAt: Math.max(0, +startAt || 0),
    startedAt: playing && videoId ? now : 0,
    updatedAt: now
  };
}
function ytCommand(func, args=[]) {
  if (!tvIframe || !tvIframe.contentWindow || !tvIframe.src) return;
  tvIframe.contentWindow.postMessage(JSON.stringify({ event:'command', func, args }), '*');
}
function setTVLocalClock(seconds) {
  tvLocalBase = Math.max(0, +seconds || 0);
  tvLocalBaseAt = Date.now();
}
function getTVLocalTime() {
  return hostState.media.playing ? tvLocalBase + (Date.now() - tvLocalBaseAt) / 1000 : tvLocalBase;
}
function applyLocalMediaVolume() {
  ensureTVDom();
  if (!tvCreated) return;
  mediaMuted = mediaMuted || mediaVolume <= 0;
  mediaMuteBtn.textContent = mediaMuted ? 'UNMUTE' : 'MUTE';
  mediaVolumeToggle.textContent = mediaMuted ? 'MUTED' : `VOL ${mediaVolume}`;
  if (mediaMuted) ytCommand('mute');
  else ytCommand('unMute');
  ytCommand('setVolume', [mediaMuted ? 0 : mediaVolume]);
}
function queueLocalMediaVolume() {
  applyLocalMediaVolume();
  setTimeout(applyLocalMediaVolume, 400);
  setTimeout(applyLocalMediaVolume, 1200);
}
function buildYouTubeSrc(videoId, start, withAudio) {
  const muteFlag = (withAudio && !mediaMuted && mediaVolume > 0) ? 0 : 1;
  const origin = encodeURIComponent(location.origin || 'null');
  const autoplay = hostState.media.playing ? 1 : 0;
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${origin}&autoplay=${autoplay}&playsinline=1&controls=0&rel=0&modestbranding=1&start=${Math.floor(start)}&mute=${muteFlag}`;
}
function placeTVOverlay() {
  if (!tvCreated || !mediaScreenMesh || !hostState.media.videoId) return;

  const camPos = camera.getWorldPosition(new THREE.Vector3());
  const screenPos = mediaScreenMesh.getWorldPosition(new THREE.Vector3());

  const toCam = camPos.clone().sub(screenPos).normalize();
  const screenNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(mediaScreenMesh.getWorldQuaternion(new THREE.Quaternion()));
  const facing = screenNormal.dot(toCam);
  if (facing < 0.22) { tvOverlay.style.display = 'none'; return; }

  const corners = [
    new THREE.Vector3(-4.8,  2.55, 0),
    new THREE.Vector3( 4.8,  2.55, 0),
    new THREE.Vector3(-4.8, -2.55, 0),
    new THREE.Vector3( 4.8, -2.55, 0)
  ];

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let visible = true;

  for (const c of corners) {
    const wp = mediaScreenMesh.localToWorld(c.clone());
    wp.project(camera);
    if (wp.z <= -1 || wp.z >= 1) visible = false;
    const sx = (wp.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-wp.y * 0.5 + 0.5) * window.innerHeight;
    minX = Math.min(minX, sx); maxX = Math.max(maxX, sx);
    minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
  }

  if (!visible || !isFinite(minX) || !isFinite(minY)) {
    tvOverlay.style.display = 'none';
    return;
  }

  const width = Math.max(120, maxX - minX - 4);
  const height = Math.max(68, maxY - minY - 4);
  if (width > window.innerWidth * 1.25 || height > window.innerHeight * 1.25) {
    tvOverlay.style.display = 'none';
    return;
  }

  const rect = `${Math.round(minX + 2)},${Math.round(minY + 2)},${Math.round(width)},${Math.round(height)}`;
  if (rect !== tvLastRect) {
    tvOverlay.style.left = (minX + 2) + 'px';
    tvOverlay.style.top = (minY + 2) + 'px';
    tvOverlay.style.width = width + 'px';
    tvOverlay.style.height = height + 'px';
    tvLastRect = rect;
  }
  tvOverlay.style.display = 'block';
}
function syncTVPlayback() {
  ensureTVDom();
  if (!tvCreated) return;
  if (!hostState.media.videoId) {
    tvOverlay.style.display = 'none';
    tvIframe.src = '';
    tvIframeVideoId = '';
    tvAudioJoin.style.display = 'none';
    mediaControls.style.display = 'none';
    tvStartedByUser = false;
    tvLastRect = '';
    drawMediaScreen();
    return;
  }
  tvAudioJoin.style.display = tvStartedByUser ? 'none' : 'block';
  mediaControls.style.display = 'flex';
  placeTVOverlay();
  applyLocalMediaVolume();
  drawMediaScreen();
}

function joinTVAudioAnywhere() {
  if (!hostState.media.videoId) {
    addChat('System', '*No TV audio to join right now*', '#e8b96a');
    return;
  }
  if (mediaVolume <= 0) mediaVolume = 70;
  mediaMuted = false;
  localStorage.setItem(MEDIA_VOLUME_KEY, String(mediaVolume));
  localStorage.setItem(MEDIA_MUTED_KEY, '0');
  if (mediaVolumeEl) mediaVolumeEl.value = String(mediaVolume);
  startTVPlayback(true);
}

function startTVPlayback(withAudio=true) {
  ensureTVDom();
  if (!tvCreated || !hostState.media.videoId) return;
  const elapsed = mediaNow();
  const changedVideo = tvIframeVideoId !== hostState.media.videoId;
  if (changedVideo || !tvIframe.src) {
    tvIframe.src = buildYouTubeSrc(hostState.media.videoId, elapsed, withAudio);
    tvIframeVideoId = hostState.media.videoId;
    tvStartedAtWall = Date.now();
    tvIframe.onload = queueLocalMediaVolume;
    setTimeout(() => {
      syncTVToRoom(true);
      queueLocalMediaVolume();
    }, 900);
  } else {
    syncTVToRoom(true);
  }
  tvStartedByUser = tvStartedByUser || withAudio;
  syncTVPlayback();
}
function syncTVToRoom(force=false) {
  if (!tvCreated || !hostState.media.videoId || !tvIframe.src) return;
  const target = mediaNow();
  const local = getTVLocalTime();
  const drift = Math.abs(target - local);
  if (force || drift > (hostState.media.playing ? 2.25 : 0.75)) {
    ytCommand('seekTo', [target, true]);
    setTVLocalClock(target);
  }
  if (hostState.media.playing) {
    ytCommand('playVideo');
    if (tvLocalBaseAt === 0) setTVLocalClock(target);
  } else {
    ytCommand('pauseVideo');
    setTVLocalClock(target);
  }
  queueLocalMediaVolume();
}
function maintainMediaSync(t) {
  if (!tvCreated || !hostState.media.videoId || !tvIframe.src) return;
  if (t - tvLastDriftCheck < 5) return;
  tvLastDriftCheck = t;
  if (Date.now() - tvStartedAtWall < 1800) return;
  syncTVToRoom(false);
}
function setSharedMediaState(media) {
  applyRoomState({ media });
  sendRoomStatePatch({ vibe: hostState.vibe, media: hostState.media });
}

function broadcastHostEvent(evt) {
  if (!wsConnected) return;
  wsSend({ type:'host_event', data: evt });
}
function sendRoomStatePatch(patch) {
  if (!wsConnected) return;
  wsSend({ type:'room_state', data: patch });
}
function isHostUser() {
  return !!(player && player.name && player.name.toLowerCase() === 'pax');
}
function applyVibe(mode) {
  activeVibe = mode;
  const vibes = {
    chill: {
      wallStyle:'brick_chill', wallColor:0xeaf4ff, floorBase:'#eef6ff', veinA:'rgba(80,150,220,0.10)', veinB:'rgba(255,255,255,0.18)', grid:'rgba(80,120,180,0.07)', gloss:'rgba(255,255,255,0.04)',
      bg:0x0b1522, fog:MOBILE ? 0.0020 : 0.0031, expo:MOBILE ? 1.86 : 2.05, keyColor:0xeaf6ff, purple:0x76bfff, gold:0xcfe8ff, stripA:0xbfe8ff, stripB:0x7bbcff, sculptureEmissive:0x16446a, mediaFrameColor:0x26384a, floorTint:0xf4fbff
    },
    war: {
      wallStyle:'concrete_war', wallColor:0xd9dde2, floorBase:'#1a1d21', veinA:'rgba(240,240,240,0.05)', veinB:'rgba(120,255,160,0.06)', grid:'rgba(255,255,255,0.025)', gloss:'rgba(255,255,255,0.012)',
      bg:0x0b1117, fog:MOBILE ? 0.0028 : 0.0041, expo:MOBILE ? 1.64 : 1.82, keyColor:0xe7f4d6, purple:0x2cb35f, gold:0xa9ff87, stripA:0xb7ff80, stripB:0x4cff9d, sculptureEmissive:0x123d12, mediaFrameColor:0x2b3a31, floorTint:0xe7f0ea
    },
    after: {
      wallStyle:'brick_after', wallColor:0xf3e0ff, floorBase:'#16081e', veinA:'rgba(255,150,255,0.12)', veinB:'rgba(100,190,255,0.12)', grid:'rgba(255,255,255,0.025)', gloss:'rgba(255,80,220,0.035)',
      bg:0x180910, fog:MOBILE ? 0.0017 : 0.0028, expo:MOBILE ? 1.92 : 2.14, keyColor:0xffe9da, purple:0xb84cff, gold:0xff7b5d, stripA:0xff4fd8, stripB:0x7f5cff, sculptureEmissive:0x5a1430, mediaFrameColor:0x3a2330, floorTint:0xfff2f8
    },
    game: {
      wallStyle:'panel_game', wallColor:0xe8f0ff, floorBase:'#0a1018', veinA:'rgba(120,220,255,0.10)', veinB:'rgba(255,220,80,0.10)', grid:'rgba(255,255,255,0.03)', gloss:'rgba(255,255,255,0.018)',
      bg:0x0b1118, fog:MOBILE ? 0.0019 : 0.0030, expo:MOBILE ? 1.88 : 2.1, keyColor:0xf8f2df, purple:0x2f78ff, gold:0xffcc42, stripA:0xffcf56, stripB:0x46a2ff, sculptureEmissive:0x4d2b00, mediaFrameColor:0x203247, floorTint:0xf7fbff
    },
    luxe: {
      wallStyle:'brick_chill', wallColor:0xf4e5c0, floorBase:'#030405', veinA:'rgba(255,255,255,0.08)', veinB:'rgba(232,185,106,0.18)', grid:'rgba(232,185,106,0.06)', gloss:'rgba(232,185,106,0.035)',
      bg:0x07080b, fog:MOBILE ? 0.0018 : 0.0028, expo:MOBILE ? 1.78 : 2.0, keyColor:0xfff1c8, purple:0x5541c9, gold:0xffc96b, stripA:0xffd27a, stripB:0xffffff, sculptureEmissive:0x6a3b00, mediaFrameColor:0x17130c, floorTint:0xfff5dc
    },
    clean: {
      wallStyle:'panel_game', wallColor:0xffffff, floorBase:'#f7f8fb', veinA:'rgba(130,150,170,0.08)', veinB:'rgba(255,255,255,0.28)', grid:'rgba(120,140,160,0.08)', gloss:'rgba(255,255,255,0.04)',
      bg:0xdce8f3, fog:MOBILE ? 0.0012 : 0.0019, expo:MOBILE ? 2.02 : 2.22, keyColor:0xffffff, purple:0xa8d8ff, gold:0xf1dca8, stripA:0xe8f4ff, stripB:0xb7d7ff, sculptureEmissive:0x6b7d8f, mediaFrameColor:0xe9edf2, floorTint:0xffffff
    },
    dark: {
      wallStyle:'brick_after', wallColor:0x3b1418, floorBase:'#040303', veinA:'rgba(255,40,60,0.11)', veinB:'rgba(80,0,0,0.18)', grid:'rgba(255,255,255,0.012)', gloss:'rgba(255,0,40,0.025)',
      bg:0x050304, fog:MOBILE ? 0.0027 : 0.0040, expo:MOBILE ? 1.52 : 1.72, keyColor:0xffd1c8, purple:0x9a111e, gold:0xff384d, stripA:0xff263d, stripB:0x5c0009, sculptureEmissive:0x5f0008, mediaFrameColor:0x1b080b, floorTint:0xffecec
    }
  };
  const vibe = vibes[mode] || vibes.chill;

  currentBaseFog = vibe.fog;
  scene.background.setHex(vibe.bg);
  scene.fog.density = getQualityFog(vibe.fog);
  renderer.toneMappingExposure = getQualityExposure(vibe.expo);
  key.color.setHex(vibe.keyColor);
  purpleFill.color.setHex(vibe.purple);
  goldFill.color.setHex(vibe.gold);

  wallTex = makeWallTexture(vibe.wallStyle);
  for (const m of wallMaterials) {
    m.map = wallTex;
    m.color.setHex(vibe.wallColor);
    m.needsUpdate = true;
  }

  marbleTex = makeMarbleTexture(vibe.floorBase, vibe.veinA, vibe.veinB, vibe.grid, vibe.gloss);
  for (const m of floorMaterials) {
    m.map = marbleTex;
    m.color.setHex(vibe.floorTint);
    m.needsUpdate = true;
  }

  for (const m of mediaFrameMaterials) {
    m.color.setHex(vibe.mediaFrameColor);
    m.needsUpdate = true;
  }

  for (let i = 0; i < vibeStripMaterials.length; i++) {
    vibeStripMaterials[i].color.setHex(i % 2 === 0 ? vibe.stripA : vibe.stripB);
  }
  for (const m of vibeGlowMaterials) {
    if (m.color) m.color.setHex(vibe.stripB);
  }
  if (centerSculpture && centerSculpture.material) {
    centerSculpture.material.emissive.setHex(vibe.sculptureEmissive);
  }
  applyGraphicsQuality(false);
}
function applyHostEvent(evt, local=false) {
  if (!evt || !evt.kind) return;
  if (evt.kind === 'pulse') {
    eventPulse = 1.0;
    if (local) document.getElementById('host-info').textContent = 'Center pulse triggered.';
  } else if (evt.kind === 'money') {
    spawnMoneyBurst();
    if (local) document.getElementById('host-info').textContent = 'Money rain triggered.';
  }
}
function applyRoomState(data) {
  if (!data || typeof data !== 'object') return;
  if (data.vibe) {
    hostState.vibe = data.vibe;
    applyVibe(data.vibe);
  }
  if (data.media) {
    const prevVideoId = hostState.media.videoId;
    hostState.media = normalizeMedia(data.media);
    if (!hostState.media.videoId) {
      if (tvCreated) {
        tvIframe.src = '';
        tvIframeVideoId = '';
        tvOverlay.style.display = 'none';
        tvAudioJoin.style.display = 'none';
        mediaControls.style.display = 'none';
      }
      tvStartedByUser = false;
      tvLocalBase = 0;
      tvLocalBaseAt = 0;
    } else {
      if (prevVideoId !== hostState.media.videoId) tvStartedByUser = false;
      startTVPlayback(false);
      syncTVToRoom(true);
    }
    document.getElementById('host-info').textContent = hostState.media.videoId ? 'Wall TV synced.' : 'Wall TV stopped.';
    drawMediaScreen();
  }
}
function spawnMoneyBurst() {
  for (let i = 0; i < 48; i++) {
    const bill = new THREE.Mesh(
      new THREE.PlaneGeometry(0.65, 0.32),
      new THREE.MeshBasicMaterial({ color: 0x7fdc8c, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
    );
    bill.position.set((Math.random()-0.5)*14, 8 + Math.random()*5, -1 + (Math.random()-0.5)*10);
    bill.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
    moneyRainGroup.add(bill);
    moneyRain.push({
      mesh: bill,
      x: bill.position.x,
      y: bill.position.y,
      z: bill.position.z,
      vy: -2.4 - Math.random()*2.6,
      vx: (Math.random()-0.5)*0.8,
      vz: (Math.random()-0.5)*0.5,
      rx: (Math.random()-0.5)*4,
      ry: (Math.random()-0.5)*4,
      rz: (Math.random()-0.5)*4,
      life: 2.8 + Math.random()*1.8
    });
  }
}

const adminObjects = {};
const adminOrder = [];
let adminMode = false;
let adminIndex = 0;
const layoutState = {};

function registerAdminObject(id, object3d, opts = {}) {
  adminObjects[id] = { object3d, interactType: opts.interactType || null };
  adminOrder.push(id);
}
function refreshAdminInfo() {
  const badge = document.getElementById('admin-badge');
  const info = document.getElementById('admin-info');
  const panel = document.getElementById('admin-panel');
  const isAdmin = player && player.name && player.name.toLowerCase() === 'pax';
  badge.style.display = isAdmin ? 'block' : 'none';
  panel.style.display = adminMode && isAdmin ? 'block' : 'none';
  if (!isAdmin) return;
  badge.textContent = adminMode ? 'ADMIN ON' : 'ADMIN OFF';
  const id = adminOrder[adminIndex];
  if (!id || !adminObjects[id]) {
    info.textContent = 'No movable object selected';
    return;
  }
  const o = adminObjects[id].object3d.position;
  info.textContent = `${id.toUpperCase()}  X:${o.x.toFixed(1)} Z:${o.z.toFixed(1)} Y:${o.y.toFixed(1)}`;
}
function setAdminMode(v) {
  adminMode = !!v;
  refreshAdminInfo();
}
function selectAdmin(step) {
  if (!adminOrder.length) return;
  adminIndex = (adminIndex + step + adminOrder.length) % adminOrder.length;
  refreshAdminInfo();
}
function nudgeAdmin(dx=0,dz=0,dy=0,dry=0) {
  const id = adminOrder[adminIndex];
  if (!id || !adminObjects[id]) return;
  const obj = adminObjects[id].object3d;
  obj.position.x += dx;
  obj.position.z += dz;
  obj.position.y = Math.max(0, obj.position.y + dy);
  obj.rotation.y += dry;
  syncInteractAnchors();
  refreshAdminInfo();
}
function collectLayout() {
  const out = {};
  for (const id of adminOrder) {
    const obj = adminObjects[id].object3d;
    out[id] = {
      x:+obj.position.x.toFixed(3),
      y:+obj.position.y.toFixed(3),
      z:+obj.position.z.toFixed(3),
      ry:+obj.rotation.y.toFixed(3)
    };
  }
  return out;
}
function applyLayout(layout) {
  if (!layout) return;
  for (const id of Object.keys(layout)) {
    if (!adminObjects[id]) continue;
    const obj = adminObjects[id].object3d;
    const d = layout[id];
    if (typeof d.x === 'number') obj.position.x = d.x;
    if (typeof d.y === 'number') obj.position.y = d.y;
    if (typeof d.z === 'number') obj.position.z = d.z;
    if (typeof d.ry === 'number') obj.rotation.y = d.ry;
  }
  syncInteractAnchors();
  refreshAdminInfo();
}
function saveLayout() {
  const layout = collectLayout();
  wsSend({ type:'layout_save', room: roomId, data: layout });
  addChat('System', '*Layout saved*', '#7adf9a');
}
function syncInteractAnchors() {
  for (const it of INTERACTS) {
    if (!it.anchorId || !adminObjects[it.anchorId]) continue;
    const obj = adminObjects[it.anchorId].object3d;
    it.x = obj.position.x + (it.offsetX || 0);
    it.z = obj.position.z + (it.offsetZ || 0);
  }
  for (const b of BLOCKERS) {
    if (!b.anchorId || !adminObjects[b.anchorId]) continue;
    const obj = adminObjects[b.anchorId].object3d;
    const cx = obj.position.x + (b.offsetX || 0);
    const cz = obj.position.z + (b.offsetZ || 0);
    b.minX = cx - b.halfW;
    b.maxX = cx + b.halfW;
    b.minZ = cz - b.halfD;
    b.maxZ = cz + b.halfD;
  }
}

function buildCustomRoom() {
  floorMat = new THREE.MeshStandardMaterial({
      map: marbleTex,
      roughness: MOBILE ? 0.24 : 0.16,
      metalness: MOBILE ? 0.28 : 0.42,
      color: 0xffffff
    });
  floorMaterials.push(floorMat);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 30),
    floorMat
  );
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  roomGroup.add(floor);

  const entryGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 4.5),
    new THREE.MeshBasicMaterial({ color: 0x173044, transparent: true, opacity: 0.18 })
  );
  entryGlow.rotation.x = -Math.PI/2;
  entryGlow.position.set(0, 0.03, 12.5);
  roomGroup.add(entryGlow);

  const underGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 26),
    new THREE.MeshBasicMaterial({ color: 0x0b1224, transparent: true, opacity: 0.22 })
  );
  underGlow.rotation.x = -Math.PI/2;
  underGlow.position.y = 0.02;
  roomGroup.add(underGlow);

  const loungeRug = new THREE.Mesh(
    new THREE.PlaneGeometry(11.5, 7.5),
    new THREE.MeshBasicMaterial({ map: makeRugTexture('#e8b96a', '#171116'), transparent: true, opacity: 0.72 })
  );
  loungeRug.rotation.x = -Math.PI/2;
  loungeRug.position.set(-11.3, 0.035, 8.1);
  roomGroup.add(loungeRug);

  const commandRug = new THREE.Mesh(
    new THREE.PlaneGeometry(10.6, 6.2),
    new THREE.MeshBasicMaterial({ map: makeRugTexture('#7adf9a', '#08120f'), transparent: true, opacity: 0.56 })
  );
  commandRug.rotation.x = -Math.PI/2;
  commandRug.position.set(6.4, 0.036, 5.0);
  roomGroup.add(commandRug);

  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(44, 0.45, 30),
    new THREE.MeshStandardMaterial({ color: 0x070a10, roughness: 0.92, metalness: 0.04 })
  );
  ceiling.position.set(0, 10.25, 0);
  ceiling.receiveShadow = true;
  roomGroup.add(ceiling);

  const leftWallMat = new THREE.MeshStandardMaterial({ map: wallTex, color: 0xe8e0d8, roughness: 0.82, metalness: 0.04 });
  wallMaterials.push(leftWallMat);
  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 10, 30),
    leftWallMat
  );
  leftWall.position.set(-22, 5, 0);
  roomGroup.add(leftWall);

  const rightWall = leftWall.clone();
  rightWall.position.x = 22;
  roomGroup.add(rightWall);

  const backWallMat = new THREE.MeshStandardMaterial({ map: wallTex, color: 0xf2ebe0, roughness: 0.82, metalness: 0.04 });
  wallMaterials.push(backWallMat);
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(44, 10, 0.45),
    backWallMat
  );
  backWall.position.set(0, 5, 15);
  roomGroup.add(backWall);

  for (const z of [-14.72, 14.72]) {
    const baseboard = box(43.2, 0.18, 0.12, 0xd3a24f, 0.28, 0.7);
    baseboard.position.set(0, 0.64, z);
    roomGroup.add(baseboard);
  }
  for (const x of [-21.72, 21.72]) {
    const baseboard = box(0.12, 0.18, 29.2, 0xd3a24f, 0.28, 0.7);
    baseboard.position.set(x, 0.64, 0);
    roomGroup.add(baseboard);
  }
  for (let x = -16; x <= 16; x += 8) {
    const panel = roundedBox(5.2, 3.2, 0.12, 0x202834, 0.58, 0.16);
    panel.position.set(x, 4.2, 14.68);
    roomGroup.add(panel);
    const inset = box(4.45, 0.05, 0.14, 0xe8b96a, 0.2, 0.72);
    inset.position.set(x, 5.72, 14.58);
    roomGroup.add(inset);
  }
  for (let z = -9; z <= 9; z += 6) {
    const leftPanel = roundedBox(0.12, 3.0, 4.0, 0x1b2230, 0.62, 0.12);
    leftPanel.position.set(-21.68, 4.0, z);
    roomGroup.add(leftPanel);
    const rightPanel = leftPanel.clone();
    rightPanel.position.x = 21.68;
    roomGroup.add(rightPanel);
  }

  // front skyline window wall
  const windowFrameTop = box(44, 0.45, 0.45, 0x12161f, 0.7, 0.2);
  windowFrameTop.position.set(0, 9.8, -15);
  roomGroup.add(windowFrameTop);
  const windowFrameBot = box(44, 0.55, 0.45, 0x12161f, 0.7, 0.2);
  windowFrameBot.position.set(0, 0.27, -15);
  roomGroup.add(windowFrameBot);
  for (let x = -18; x <= 18; x += 9) {
    const mullion = box(0.3, 9.1, 0.3, 0x151923, 0.55, 0.4);
    mullion.position.set(x, 5, -15);
    roomGroup.add(mullion);
  }

  const city = new THREE.Mesh(
    new THREE.PlaneGeometry(43, 9.1),
    new THREE.MeshBasicMaterial({ map: cityTex })
  );
  city.position.set(0, 5.05, -15.2);
  roomGroup.add(city);

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(43, 9.1),
    new THREE.MeshPhysicalMaterial({
      color: 0x8db7ff, transparent: true, opacity: 0.09, roughness: 0.08, metalness: 0.15,
      clearcoat: 1, transmission: 0.1
    })
  );
  glass.position.set(0, 5.05, -15.01);
  roomGroup.add(glass);

  // ceiling strips
  for (let i = -16; i <= 16; i += 8) {
    const strip = box(5.5, 0.08, 0.2, 0xe8b96a, 0.1, 0.5);
    strip.position.set(i, 10.02, -4);
    vibeStripMaterials.push(strip.material);
    roomGroup.add(strip);
    const strip2 = box(5.5, 0.08, 0.2, 0x6a78ff, 0.1, 0.5);
    strip2.position.set(i, 10.02, 6);
    vibeStripMaterials.push(strip2.material);
    roomGroup.add(strip2);
  }

  // center sculpture
  const ringGeo = new THREE.TorusGeometry(2.4, 0.22, 24, 96);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xd9ab5d, emissive: 0x4a2400, emissiveIntensity: 0.55, roughness: 0.18, metalness: 0.9 });
  centerSculpture = new THREE.Mesh(ringGeo, ringMat);
  centerSculpture.position.set(0, 4.2, -1.8);
  centerSculpture.castShadow = true;
  roomGroup.add(centerSculpture);

  const orb = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.05, 2),
    new THREE.MeshStandardMaterial({ color: 0xfff0c4, emissive: 0xffc86a, emissiveIntensity: 1.5, roughness: 0.15, metalness: 0.22 })
  );
  orb.position.set(0, 4.2, -1.8);
  orb.castShadow = true;
  roomGroup.add(orb);

  const sculptureBase = roundedBox(3.6, 0.6, 3.6, 0x101316, 0.45, 0.55);
  sculptureBase.position.set(0, 0.3, -1.8);
  roomGroup.add(sculptureBase);

  // lounge pit
  const loungeGroup = new THREE.Group();
  loungeGroup.position.set(-11.5, 0, 8.2);
  roomGroup.add(loungeGroup);
  registerAdminObject('lounge_zone', loungeGroup, { interactType:'lounge' });

  const couchColor = 0x4a342d;
  const couchA = makeLuxurySofa(8.8, 1.9, couchColor);
  couchA.position.set(0, 0.05, -2.4);
  loungeGroup.add(couchA);
  const couchB = makeLuxurySofa(5.4, 1.9, couchColor);
  couchB.rotation.y = -Math.PI / 2;
  couchB.position.set(-3.6, 0.05, 0);
  loungeGroup.add(couchB);
  const couchC = makeLuxurySofa(3.6, 1.8, couchColor);
  couchC.rotation.y = Math.PI;
  couchC.position.set(0, 0.05, 2.4);
  loungeGroup.add(couchC);

  const table = makeDesignerTable(3.5, 1.9, 0x2a2d33, 0x7a5d43);
  table.position.set(-0.1, 0.02, 0);
  loungeGroup.add(table);
  const planter = cyl(0.42, 0.34, 0.55, 0x242a30, 12, 0.5, 0.34);
  planter.position.set(3.8, 0.28, 1.7);
  loungeGroup.add(planter);
  for (let i = 0; i < 5; i++) {
    const leaf = cyl(0.0, 0.13, 0.72, 0x2f8f5a, 7, 0.72, 0.04);
    leaf.position.set(3.8 + (i - 2) * 0.12, 0.86, 1.7 + Math.sin(i) * 0.12);
    leaf.rotation.z = (i - 2) * 0.22;
    loungeGroup.add(leaf);
  }

  // bar zone
  const barGroup = new THREE.Group();
  barGroup.position.set(-15.3, 0, -7.3);
  roomGroup.add(barGroup);
  registerAdminObject('bar', barGroup, { interactType:'coffee' });

  const barCounter = roundedBox(10.4, 1.15, 2.2, 0x22262d, 0.18, 0.82);
  barCounter.position.set(0, 0.95, 0);
  barGroup.add(barCounter);
  for (let z = -0.82; z <= 0.82; z += 0.41) {
    const rib = box(10.15, 0.04, 0.035, 0xe8b96a, 0.18, 0.72);
    rib.position.set(0, 1.28, z);
    barGroup.add(rib);
  }

  const barTop = box(10.8, 0.14, 2.4, 0x7a5d43, 0.16, 0.38);
  barTop.material.map = makeWoodTexture('#6b4b31', '#e8b96a');
  barTop.material.needsUpdate = true;
  barTop.position.set(0, 1.56, 0);
  barGroup.add(barTop);
  const footRail = cyl(0.04, 0.04, 10.2, 0xd3a24f, 10, 0.24, 0.78);
  footRail.rotation.z = Math.PI / 2;
  footRail.position.set(0, 0.58, 1.25);
  barGroup.add(footRail);

  const shelfWall = box(0.42, 6.5, 10.4, 0x171d26, 0.7, 0.12);
  shelfWall.position.set(-5.95, 3.25, 0);
  barGroup.add(shelfWall);

  for (let y = 1.7; y <= 5.2; y += 1.2) {
    const shelf = box(0.35, 0.08, 9.5, 0x6d553d, 0.2, 0.55);
    shelf.position.set(-5.55, y, 0);
    barGroup.add(shelf);
    const shelfGlow = box(0.04, 0.04, 8.8, 0xe8b96a, 0.08, 0.7);
    shelfGlow.position.set(-5.32, y + 0.12, 0);
    vibeGlowMaterials.push(shelfGlow.material);
    barGroup.add(shelfGlow);
  }

  const bottleColors = [
    ['#cf9f51', '#5f2d00'], ['#7adf9a', '#174a24'], ['#8fc2ff', '#1c3456'],
    ['#f57a7a', '#5b1a1a'], ['#ffffff', '#6b6b6b']
  ];
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 15; i++) {
      const pair = bottleColors[(row+i) % bottleColors.length];
      const bottleTex = makeBottleLabel(pair[0], pair[1]);
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 0.5, 10),
        new THREE.MeshStandardMaterial({ map: bottleTex, emissive: new THREE.Color(pair[0]).multiplyScalar(0.28), roughness: 0.18, metalness: 0.14 })
      );
      bottle.position.set(-5.15, 1.95 + row*1.2, -4.5 + i*0.62);
      bottle.rotation.z = (Math.random()-0.5) * 0.12;
      bottle.castShadow = true;
      barGroup.add(bottle);
    }
  }

  // war table
  const warGroup = new THREE.Group();
  warGroup.position.set(6.5, 0, 5.1);
  roomGroup.add(warGroup);
  registerAdminObject('war_table', warGroup, { interactType:'table' });

  const warBase = roundedBox(8.5, 0.85, 4.5, 0x252a32, 0.16, 0.84);
  warBase.position.set(0, 1.1, 0);
  warGroup.add(warBase);
  const warTopLip = roundedBox(8.9, 0.18, 4.9, 0x111820, 0.22, 0.86);
  warTopLip.position.set(0, 1.62, 0);
  warGroup.add(warTopLip);
  for (const x of [-3.7, 3.7]) {
    for (const z of [-1.75, 1.75]) {
      const leg = cyl(0.12, 0.18, 1.0, 0x10161d, 10, 0.32, 0.78);
      leg.position.set(x, 0.5, z);
      warGroup.add(leg);
    }
  }

  const tableDisplayTex = makeLabelTexture('WAR TABLE', 'TRACK THE ROOM', '#7adf9a', '#07101a');
  const dispMat = new THREE.MeshBasicMaterial({ map: tableDisplayTex });
  tableTopDisplay = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 3.4), dispMat);
  tableTopDisplay.rotation.x = -Math.PI/2;
  tableTopDisplay.position.set(0, 1.73, 0);
  warGroup.add(tableTopDisplay);
  for (let i = 0; i < 5; i++) {
    const puck = cyl(0.12, 0.12, 0.05, i % 2 ? 0x7adf9a : 0xe8b96a, 10, 0.24, 0.45);
    puck.position.set(-2.4 + i * 1.2, 1.78, Math.sin(i) * 1.0);
    warGroup.add(puck);
  }

  tableInteractAnchor.set(6.5, 0, 5.1);

  // whiteboard presentation wall
  const presentationFrame = box(9.8, 5.6, 0.25, 0x12151b, 0.28, 0.72);
  presentationFrame.position.set(12.5, 4.2, -13.8);
  roomGroup.add(presentationFrame);
  const presentationLip = roundedBox(10.35, 6.05, 0.16, 0x2a3039, 0.28, 0.78);
  presentationLip.position.set(12.5, 4.2, -13.92);
  roomGroup.add(presentationLip);
  boardWallMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(8.9, 4.8),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  boardWallMesh.position.set(12.5, 4.2, -13.62);
  roomGroup.add(boardWallMesh);

  const boardGlow = box(9.4, 0.05, 0.28, 0xe8b96a, 0.05, 0.8);
  vibeGlowMaterials.push(boardGlow.material);
  boardGlow.position.set(12.5, 1.32, -13.55);
  roomGroup.add(boardGlow);

  // media wall
  mediaFrameMat = new THREE.MeshStandardMaterial({ color: 0x2b313a, roughness: 0.16, metalness: 0.82 });
  const mediaFrame = new THREE.Mesh(new THREE.BoxGeometry(10.5, 5.8, 0.24), mediaFrameMat);
  mediaFrame.castShadow = true; mediaFrame.receiveShadow = true;
  mediaFrame.position.set(0.0, 4.4, 14.6);
  roomGroup.add(mediaFrame);
  const mediaHalo = roundedBox(11.25, 6.45, 0.18, 0x111820, 0.22, 0.78);
  mediaHalo.position.set(0.0, 4.4, 14.72);
  roomGroup.add(mediaHalo);
  for (const x of [-5.85, 5.85]) {
    const speaker = roundedBox(0.42, 4.8, 0.3, 0x111318, 0.44, 0.55);
    speaker.position.set(x, 4.35, 14.42);
    roomGroup.add(speaker);
    for (let y = 2.6; y <= 5.8; y += 1.1) {
      const cone = cyl(0.14, 0.18, 0.05, 0x050608, 12, 0.54, 0.22);
      cone.rotation.x = Math.PI / 2;
      cone.position.set(x, y, 14.24);
      roomGroup.add(cone);
    }
  }

  buildMediaScreenTexture();
  mediaScreenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(9.6, 5.1),
    new THREE.MeshBasicMaterial({ map: mediaScreenTex })
  );
  mediaScreenMesh.position.set(0.0, 4.4, 14.46);
  mediaScreenMesh.rotation.y = Math.PI;
  roomGroup.add(mediaScreenMesh);

  const hostConsole = new THREE.Group();
  hostConsole.position.set(-3.0, 0, -10.2);
  roomGroup.add(hostConsole);
  hostConsoleGroup = hostConsole;
  const consolePedestal = roundedBox(2.2, 1.15, 1.4, 0x2b313a, 0.2, 0.78);
  consolePedestal.position.set(0, 0.7, 0);
  hostConsole.add(consolePedestal);
  const consoleWing = roundedBox(3.0, 0.32, 1.2, 0x151b24, 0.24, 0.7);
  consoleWing.position.set(0, 1.25, 0.02);
  hostConsole.add(consoleWing);
  const consoleScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 1.0),
    new THREE.MeshBasicMaterial({ map: makeLabelTexture('HOST', 'ROOM CONTROL', '#e8b96a', '#08111b') })
  );
  consoleScreen.position.set(0, 1.85, 0.72);
  hostConsole.add(consoleScreen);
  registerAdminObject('host_console', hostConsole);

  // gaming zone
  const fifaGroup = new THREE.Group();
  fifaGroup.position.set(14.6, 0, -4.4);
  roomGroup.add(fifaGroup);
  registerAdminObject('fifa_zone', fifaGroup, { interactType:'fifa' });

  const fifaFrame = box(7.6, 4.3, 0.24, 0x2a3039, 0.18, 0.88);
  fifaFrame.position.set(0, 4.0, 0);
  fifaGroup.add(fifaFrame);
  const fifaStand = roundedBox(6.2, 0.32, 1.1, 0x151b24, 0.28, 0.72);
  fifaStand.position.set(0, 1.12, 0.18);
  fifaGroup.add(fifaStand);
  for (const x of [-3.9, 3.9]) {
    const sideLight = box(0.08, 4.4, 0.12, 0x6d78ff, 0.08, 0.78);
    sideLight.position.set(x, 4.0, 0.22);
    vibeGlowMaterials.push(sideLight.material);
    fifaGroup.add(sideLight);
  }
  fifaScreenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(6.8, 3.75),
    new THREE.MeshBasicMaterial({ map: fifaScreenTex })
  );
  fifaScreenMesh.position.set(0, 4.0, 0.21);
  fifaGroup.add(fifaScreenMesh);

  const consoleBench = makeDesignerTable(4.5, 1.4, 0x1f242c, 0x2f3540);
  consoleBench.position.set(0, 0.42, 0.2);
  fifaGroup.add(consoleBench);

  const ps5 = box(0.4, 1.2, 0.25, 0xf0f0f0, 0.18, 0.1);
  ps5.position.set(-0.8, 1.1, 0.25);
  fifaGroup.add(ps5);
  const controllerA = box(0.55, 0.18, 0.35, 0xffffff, 0.35, 0.12);
  controllerA.position.set(0.2, 0.82, 0.3);
  fifaGroup.add(controllerA);
  const controllerB = box(0.55, 0.18, 0.35, 0x1a1a1a, 0.35, 0.12);
  controllerB.position.set(0.9, 0.82, 0.3);
  fifaGroup.add(controllerB);

  // snake arcade wall
  const snakeGroup = new THREE.Group();
  snakeGroup.position.set(17.6, 0, 7.8);
  roomGroup.add(snakeGroup);
  registerAdminObject('snake_zone', snakeGroup, { interactType:'arcade' });

  const snakeFrame = roundedBox(4.8, 5.8, 1.6, 0x2a2a2f, 0.28, 0.62);
  snakeFrame.position.set(0, 3.0, 0);
  snakeGroup.add(snakeFrame);
  const snakeSideL = box(0.18, 5.7, 1.85, 0x17191f, 0.36, 0.62);
  snakeSideL.position.set(-2.52, 3.0, 0);
  snakeGroup.add(snakeSideL);
  const snakeSideR = snakeSideL.clone();
  snakeSideR.position.x = 2.52;
  snakeGroup.add(snakeSideR);
  const controlDeck = roundedBox(4.2, 0.36, 1.25, 0x111318, 0.3, 0.68);
  controlDeck.position.set(0, 1.62, 0.9);
  controlDeck.rotation.x = -0.18;
  snakeGroup.add(controlDeck);
  const joystick = cyl(0.06, 0.08, 0.42, 0xe8b96a, 10, 0.24, 0.72);
  joystick.position.set(-1.1, 1.93, 1.22);
  joystick.rotation.x = -0.18;
  snakeGroup.add(joystick);
  for (let i = 0; i < 3; i++) {
    const btn = cyl(0.12, 0.12, 0.06, i === 0 ? 0xff6a5c : (i === 1 ? 0x7adf9a : 0x6d78ff), 12, 0.3, 0.35);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(0.55 + i * 0.42, 1.86, 1.3);
    snakeGroup.add(btn);
  }

  snakeWallMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.5, 3.5),
    new THREE.MeshBasicMaterial({ map: snakePreviewTex })
  );
  snakeWallMesh.position.set(0, 3.8, 0.81);
  snakeGroup.add(snakeWallMesh);

  const marquee = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 0.8),
    new THREE.MeshBasicMaterial({ map: makeLabelTexture('SNAKE', 'ARCADE', '#e8b96a', '#050505') })
  );
  marquee.position.set(0, 5.7, 0.81);
  snakeGroup.add(marquee);

  // basketball zone
  const basketballGroup = new THREE.Group();
  basketballGroup.position.set(15.6, 0, 10.4);
  roomGroup.add(basketballGroup);
  registerAdminObject('basketball_zone', basketballGroup, { interactType:'basketball' });

  const courtPatch = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 6.8),
    new THREE.MeshStandardMaterial({ map: basketFloorTex, roughness: 0.38, metalness: 0.16 })
  );
  courtPatch.rotation.x = -Math.PI/2;
  courtPatch.position.set(0, 0.03, 0);
  basketballGroup.add(courtPatch);

  const hoopPole = box(0.25, 5.5, 0.25, 0x32363d, 0.35, 0.7);
  hoopPole.position.set(4.1, 2.75, 0);
  basketballGroup.add(hoopPole);

  const hoopBoard = box(1.9, 1.2, 0.12, 0xf2f2f2, 0.22, 0.05);
  hoopBoard.position.set(3.35, 5.6, 0);
  basketballGroup.add(hoopBoard);
  const hoopTarget = box(0.75, 0.42, 0.04, 0xff6a2f, 0.28, 0.18);
  hoopTarget.position.set(3.27, 5.55, 0);
  basketballGroup.add(hoopTarget);

  const hoopRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.05, 12, 40),
    new THREE.MeshStandardMaterial({ color: 0xff6a2f, roughness: 0.32, metalness: 0.4 })
  );
  hoopRing.rotation.y = Math.PI/2;
  hoopRing.position.set(2.58, 5.15, 0);
  hoopRing.castShadow = true;
  basketballGroup.add(hoopRing);

  const hoopSign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 0.8),
    new THREE.MeshBasicMaterial({ map: makeLabelTexture('COURT', '1V1 ENERGY', '#ff8b55', '#130909') })
  );
  hoopSign.position.set(0.2, 2.5, 3.1);
  basketballGroup.add(hoopSign);

  // safe + cash corner
  const moneyGroup = new THREE.Group();
  moneyGroup.position.set(-17.1, 0, 11.4);
  roomGroup.add(moneyGroup);
  registerAdminObject('money_zone', moneyGroup, { interactType:'money' });

  const safeBody = roundedBox(2.2, 2.2, 2.1, 0x2a2f36, 0.18, 0.82);
  safeBody.position.set(0, 1.15, 0);
  moneyGroup.add(safeBody);
  const safeTrim = roundedBox(2.42, 2.42, 0.16, 0xd2b16a, 0.22, 0.82);
  safeTrim.position.set(1.0, 1.15, 0);
  moneyGroup.add(safeTrim);

  safeDoor = box(0.18, 1.6, 1.4, 0x353b43, 0.2, 0.88);
  safeDoor.position.set(1.07, 1.15, 0);
  moneyGroup.add(safeDoor);

  const wheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.23, 0.03, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0xd2b16a, roughness: 0.25, metalness: 0.85 })
  );
  wheel.rotation.y = Math.PI/2;
  wheel.position.set(1.18, 1.15, 0);
  moneyGroup.add(wheel);

  cashStack = new THREE.Group();
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 4; i++) {
      const cash = box(0.9, 0.12, 0.56, 0x62b56b, 0.62, 0.04);
      cash.position.set(1.4 + i*0.48, 0.11 + row*0.13, 1.1 + (i%2)*0.1 + row*0.12);
      cashStack.add(cash);
    }
  }
  moneyGroup.add(cashStack);

  const moneySign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.5, 0.7),
    new THREE.MeshBasicMaterial({ map: makeLabelTexture('CASH', 'LOCKED UP', '#7adf9a', '#081209') })
  );
  moneySign.position.set(3.5, 2.4, 2.4);
  moneyGroup.add(moneySign);

  // decorative pillars and trims
  for (const x of [-8, 0, 8]) {
    const trim = box(0.18, 10, 0.18, 0xd3a24f, 0.22, 0.82);
    trim.position.set(x, 5, -14.9);
    roomGroup.add(trim);
  }

  // seating near gaming
  const gameSofa = makeLuxurySofa(4.4, 1.55, 0x1d2027, 0x6d78ff);
  gameSofa.position.set(12.6, 0.05, -0.8);
  gameSofa.rotation.y = 0.12;
  roomGroup.add(gameSofa);

  // door wall fix
  const accentDoorWall = box(4.5, 6.8, 0.2, 0x1e1712, 0.92, 0.05);
  accentDoorWall.position.set(-19.5, 3.4, 14.73);
  roomGroup.add(accentDoorWall);
  const fakeDoor = box(1.4, 3.2, 0.12, 0x3a2b1d, 0.84, 0.08);
  fakeDoor.position.set(-19.6, 1.8, 14.84);
  roomGroup.add(fakeDoor);
  const doorHandle = cyl(0.06, 0.06, 0.12, 0xd3a24f, 10, 0.25, 0.8);
  doorHandle.rotation.x = Math.PI / 2;
  doorHandle.position.set(-19.05, 1.82, 14.72);
  roomGroup.add(doorHandle);

  // stools
  for (let i = 0; i < 4; i++) {
    const stool = makeBarStool(0x1f1f23, 0xe8b96a);
    stool.position.set(-13.3 + i*1.55, 0, -5.2);
    roomGroup.add(stool);
  }

  // visible interact landmarks
  const boardTitle = new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 0.6),
    new THREE.MeshBasicMaterial({ map: makeLabelTexture('PRESENTATION', 'LIVE BOARD', '#e8b96a', '#161006') })
  );
  boardTitle.position.set(12.5, 7.0, -13.6);
  roomGroup.add(boardTitle);

  const warTitle = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 0.6),
    new THREE.MeshBasicMaterial({ map: makeLabelTexture('WAR TABLE', 'INTERACT', '#7adf9a', '#08120f') })
  );
  warTitle.position.set(6.5, 2.65, 7.2);
  roomGroup.add(warTitle);

  // zone spotlights
  addSpot(12.5, 9.5, -13.2, 0xe8b96a, 1.7, 26, Math.PI/6, 3.6);
  addSpot(14.6, 9.0, -4.4, 0x6d78ff, 1.8, 22, Math.PI/6, 3.2);
  addSpot(17.6, 8.8, 7.8, 0xe8b96a, 1.3, 18, Math.PI/6, 3.0);
  addSpot(15.6, 8.8, 10.6, 0xff8b55, 1.25, 18, Math.PI/6, 2.8);
  addSpot(-15.6, 8.8, -7.3, 0xe8b96a, 1.6, 20, Math.PI/6, 2.1);
  addSpot(-16.7, 7.8, 11.9, 0x7adf9a, 1.2, 14, Math.PI/6, 1.6);

  // blockers
  BLOCKERS.push(
    { anchorId:'bar', halfW:5.2, halfD:1.5, offsetX:0, offsetZ:0 },
    { anchorId:'lounge_zone', halfW:4.6, halfD:3.7, offsetX:0, offsetZ:0 },
    { anchorId:'war_table', halfW:4.4, halfD:2.5, offsetX:0, offsetZ:0 },
    { anchorId:'snake_zone', halfW:2.5, halfD:1.1, offsetX:0, offsetZ:0 },
    { anchorId:'basketball_zone', halfW:1.0, halfD:1.3, offsetX:4.1, offsetZ:0 },
    { anchorId:'money_zone', halfW:1.8, halfD:1.4, offsetX:0.6, offsetZ:0.4 }
  );
}

const BLOCKERS = [];
const PLAYER_RADIUS = 0.42;

try {
  buildCustomRoom();
  
const moneyBillPool = [];
function ensureMoneyPool() {
  if (moneyBillPool.length) return;
  for (let i = 0; i < 32; i++) {
    const bill = box(0.55, 0.03, 0.3, 0x62b56b, 0.55, 0.04);
    bill.visible = false;
    roomGroup.add(bill);
    moneyBillPool.push(bill);
  }
}
ensureMoneyPool();

  roomGroup.traverse((obj) => {
    if (!obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];

    mats.forEach((m) => {
      if (!m) return;

      if (m.color && !m.map && m.type !== 'MeshBasicMaterial') {
        const darks = ['111111', '11161d', '0f1115', '101216', '171d26', '12151b', '1f242c', '252a32'];
        if (darks.includes(m.color.getHexString())) {
          m.color.setHex(0x3b4452);
        }
      }

      if ('roughness' in m) {
        m.roughness = Math.min(m.roughness, 0.58);
      }

      if ('metalness' in m) {
        m.metalness = Math.max(m.metalness || 0, 0.18);
      }

      if ('envMapIntensity' in m) {
        m.envMapIntensity = HQ ? 1.2 : 0.8;
      }

      if ('emissive' in m && m.emissive && !m.map) {
        m.emissive.setHex(0x111111);
        m.emissiveIntensity = 0.18;
      }
    });
  });
  applyGraphicsQuality(false);
} catch (err) {
  showFatal(err && err.stack ? err.stack : err);
}
