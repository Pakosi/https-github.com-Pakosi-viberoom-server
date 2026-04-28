
// ==================== WS ====================
const WS_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'ws://localhost:3000'
  : 'wss://viberoom-server-production.up.railway.app';

// ==================== LOADING UI ====================
const loadBar = document.getElementById('load-bar');
const loadMsg = document.getElementById('load-msg');
const errorOverlay = document.getElementById('error-overlay');
function showFatal(msg) {
  console.error(msg);
  errorOverlay.style.display = 'block';
  errorOverlay.innerHTML = '<b>ROOM BUILD ERROR</b>' + String(msg).replace(/</g, '&lt;').replace(/\n/g, '<br>');
  document.getElementById('loading').style.display = 'none';
  document.getElementById('start').style.display = 'flex';
}
window.addEventListener('error', (e) => showFatal((e.message || 'Unknown error') + (e.filename ? '\n' + e.filename + ':' + e.lineno : '')));
window.addEventListener('unhandledrejection', (e) => showFatal(e.reason || 'Unhandled promise rejection'));

function setLoad(pct, msg) {
  loadBar.style.width = pct + '%';
  if (msg) loadMsg.textContent = msg;
}
setLoad(5, 'SETTING UP SCENE...');

// ==================== CHARACTERS ====================
const CHARS = [
  { key: 'pax',    name: 'Pax',    hoodie: '#e8b96a', hair: 'fade',  skin: 0xf0c89c },
  { key: 'shahed', name: 'Shahed', hoodie: '#4d90c8', hair: 'normal', skin: 0xe8b888, bigNose: true },
  { key: 'arsham', name: 'Arsham', hoodie: 'barca',   hair: 'normal', skin: 0xe8b888 },
  { key: 'amir',   name: 'Amir',   hoodie: '#111111', hair: 'fade',   skin: 0xd8a078 },
  { key: 'arash',  name: 'Arash',  hoodie: '#c85a4a', hair: 'bald',   skin: 0xe8b888 },
  { key: 'custom', name: 'Custom', hoodie: '#a878c8', hair: 'normal', skin: 0xf0c89c },
];
let selectedChar = CHARS[0];

const grid = document.getElementById('char-grid');
CHARS.forEach((c, i) => {
  const d = document.createElement('div');
  d.className = 'char-card' + (i === 0 ? ' sel' : '');
  d.innerHTML = `<div class="cname">${c.name}</div>`;
  d.onclick = () => {
    document.querySelectorAll('.char-card').forEach(x => x.classList.remove('sel'));
    d.classList.add('sel');
    selectedChar = c;
    if (c.key !== 'custom') document.getElementById('name-input').value = c.name;
  };
  grid.appendChild(d);
});

// ==================== THREE CORE ====================
const MOBILE = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900;
const deviceInfo = {
  mobile: MOBILE,
  dpr: window.devicePixelRatio || 1,
  width: window.innerWidth,
  height: window.innerHeight,
  cores: navigator.hardwareConcurrency || 4
};
const QUALITY_ORDER = ['low', 'balanced', 'high', 'ultra'];
const QUALITY_PRESETS = {
  low:      { label:'LOW',      mobileDpr:1.0,  desktopDpr:1.0,  shadow:0,    shadowMap:512,  fog:1.16, exposure:0.94, light:0.78, spotShadows:false, spotBudget:0, pointScale:0.55 },
  balanced: { label:'BALANCED', mobileDpr:1.1,  desktopDpr:1.3,  shadow:MOBILE ? 0 : 0.65, shadowMap:768,  fog:1.04, exposure:1.0,  light:0.92, spotShadows:false, spotBudget:MOBILE ? 2 : 3, pointScale:0.72 },
  high:     { label:'HIGH',     mobileDpr:1.25, desktopDpr:1.65, shadow:MOBILE ? 0 : 0.9, shadowMap:1024, fog:0.94, exposure:1.05, light:1.02, spotShadows:!MOBILE, spotBudget:MOBILE ? 4 : 6, pointScale:0.9 },
  ultra:    { label:'ULTRA',    mobileDpr:1.5,  desktopDpr:2.0,  shadow:MOBILE ? 0 : 1.0, shadowMap:1536, fog:0.86, exposure:1.1,  light:1.1,  spotShadows:!MOBILE, spotBudget:MOBILE ? 5 : 9, pointScale:1.0 }
};
function detectGraphicsQuality() {
  const saved = localStorage.getItem('viberoom.graphics');
  if (QUALITY_PRESETS[saved]) return saved;
  const pixels = deviceInfo.width * deviceInfo.height * deviceInfo.dpr * deviceInfo.dpr;
  if (deviceInfo.mobile) return 'balanced';
  if (deviceInfo.cores >= 8 && deviceInfo.dpr <= 2 && pixels <= 9000000) return 'ultra';
  if (deviceInfo.cores >= 4 && pixels <= 7000000) return 'high';
  return 'balanced';
}
let graphicsQuality = detectGraphicsQuality();
let graphicsAutoFallbacks = 0;
let currentBaseFog = MOBILE ? 0.0022 : 0.0035;
const qualitySpotlights = [];
const HQ = graphicsQuality === 'high' || graphicsQuality === 'ultra';
function getQualityPreset() {
  return QUALITY_PRESETS[graphicsQuality] || QUALITY_PRESETS.balanced;
}
function getQualityDpr() {
  const q = getQualityPreset();
  const cap = deviceInfo.mobile ? q.mobileDpr : q.desktopDpr;
  return Math.max(0.75, Math.min(deviceInfo.dpr, cap));
}
function getQualityExposure(base) {
  return base * getQualityPreset().exposure;
}
function getQualityFog(base) {
  return base * getQualityPreset().fog;
}
function showPerformanceToast(text='Performance optimized') {
  const el = document.getElementById('perf-toast');
  if (!el) return;
  el.textContent = text;
  el.style.display = 'block';
  clearTimeout(showPerformanceToast._timer);
  showPerformanceToast._timer = setTimeout(() => { el.style.display = 'none'; }, 2600);
}
function syncGraphicsSelect() {
  const sel = document.getElementById('graphics-select');
  if (sel && sel.value !== graphicsQuality) sel.value = graphicsQuality;
}
function applyGraphicsQuality(save=true, notify=false) {
  const q = getQualityPreset();
  renderer.setPixelRatio(getQualityDpr());
  renderer.shadowMap.enabled = q.shadow > 0;
  renderer.shadowMap.type = q.shadowMap >= 1024 ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
  renderer.toneMappingExposure = getQualityExposure(MOBILE ? 1.75 : 1.95);
  scene.fog.density = getQualityFog(currentBaseFog);

  if (typeof key !== 'undefined') {
    key.intensity = (MOBILE ? 1.45 : 1.35) * q.light;
    key.castShadow = q.shadow > 0;
    key.shadow.mapSize.set(q.shadowMap, q.shadowMap);
  }
  if (typeof purpleFill !== 'undefined') purpleFill.intensity = (MOBILE ? 1.5 : 2.2) * q.light * q.pointScale;
  if (typeof goldFill !== 'undefined') goldFill.intensity = (MOBILE ? 1.45 : 2.0) * q.light * q.pointScale;
  if (typeof frontFill !== 'undefined') frontFill.intensity = (MOBILE ? 0.8 : 1.0) * q.light * q.pointScale;
  if (typeof warmFloorFill !== 'undefined') warmFloorFill.intensity = (MOBILE ? 0.9 : 1.2) * q.light * q.pointScale;
  for (let i = 0; i < qualitySpotlights.length; i++) {
    const s = qualitySpotlights[i];
    const enabled = i < q.spotBudget;
    s.visible = enabled;
    s.castShadow = enabled && q.spotShadows;
    s.intensity = enabled ? (s.userData.baseIntensity || s.intensity) * q.light : 0;
    s.shadow.mapSize.set(Math.min(q.shadowMap, 1024), Math.min(q.shadowMap, 1024));
  }
  if (save) localStorage.setItem('viberoom.graphics', graphicsQuality);
  syncGraphicsSelect();
  if (notify) showPerformanceToast(`Graphics: ${q.label}`);
}
function setGraphicsQuality(next, opts={}) {
  if (!QUALITY_PRESETS[next] || next === graphicsQuality) return;
  graphicsQuality = next;
  applyGraphicsQuality(opts.save !== false, !!opts.notify);
}
function lowerGraphicsQualityAuto() {
  const idx = QUALITY_ORDER.indexOf(graphicsQuality);
  if (idx <= 0) return false;
  graphicsAutoFallbacks += 1;
  setGraphicsQuality(QUALITY_ORDER[idx - 1], { save:false });
  showPerformanceToast('Performance optimized');
  return true;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0d14);
scene.fog = new THREE.FogExp2(0x0a0d14, getQualityFog(currentBaseFog));

const camera = new THREE.PerspectiveCamera(72, window.innerWidth/window.innerHeight, 0.1, 240);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(getQualityDpr());
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = getQualityPreset().shadow > 0;
renderer.shadowMap.type = getQualityPreset().shadowMap >= 1024 ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = getQualityExposure(MOBILE ? 1.75 : 1.95);
document.getElementById('game').appendChild(renderer.domElement);

// ==================== HELPERS ====================
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
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness, metalness })
  );
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function roundedBox(w, h, d, color, roughness = 0.55, metalness = 0.15) {
  const group = new THREE.Group();
  const core = box(Math.max(0.1, w-0.16), Math.max(0.1, h-0.16), d, color, roughness, metalness);
  group.add(core);
  const sideL = box(0.08, h-0.08, d, color, roughness, metalness); sideL.position.x = -w/2 + 0.04; group.add(sideL);
  const sideR = box(0.08, h-0.08, d, color, roughness, metalness); sideR.position.x =  w/2 - 0.04; group.add(sideR);
  const top = box(w, 0.08, d, color, roughness, metalness); top.position.y = h/2 - 0.04; group.add(top);
  const bot = box(w, 0.08, d, color, roughness, metalness); bot.position.y = -h/2 + 0.04; group.add(bot);
  group.traverse(o => { o.castShadow = true; o.receiveShadow = true; });
  return group;
}
function cyl(rt, rb, h, color, segments = 12, roughness = 0.55, metalness = 0.15) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(rt, rb, h, segments),
    new THREE.MeshStandardMaterial({ color, roughness, metalness })
  );
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function makeRugTexture(accent='#e8b96a', base='#151016') {
  return canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (let i = 0; i < 26; i++) ctx.fillRect(0, i * 20, w, 2);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 14;
    ctx.strokeRect(28, 28, w - 56, h - 56);
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 38 + i * 24, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}
function makeWoodTexture(base='#5f432c', grain='#c89b4a') {
  return canvasTex(512, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, base);
    g.addColorStop(1, '#241711');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 80; i++) {
      ctx.strokeStyle = i % 3 ? 'rgba(255,220,150,0.08)' : 'rgba(0,0,0,0.16)';
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      const y = Math.random() * h;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.25, y + Math.random() * 28 - 14, w * 0.75, y + Math.random() * 28 - 14, w, y + Math.random() * 18 - 9);
      ctx.stroke();
    }
    ctx.strokeStyle = grain;
    ctx.globalAlpha = 0.18;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.globalAlpha = 1;
  });
}
function makeLuxurySofa(width, depth, color=0x4a342d, accent=0xe8b96a) {
  const g = new THREE.Group();
  const cushion = roundedBox(width, 0.42, depth, color, 0.62, 0.08);
  cushion.position.y = 0.72;
  g.add(cushion);
  const back = roundedBox(width, 1.15, 0.42, color, 0.68, 0.08);
  back.position.set(0, 1.15, -depth / 2 + 0.12);
  back.rotation.x = -0.08;
  g.add(back);
  const armL = roundedBox(0.52, 0.9, depth, color, 0.64, 0.1);
  armL.position.set(-width / 2 + 0.18, 0.98, 0);
  g.add(armL);
  const armR = armL.clone();
  armR.position.x = width / 2 - 0.18;
  g.add(armR);
  const seats = Math.max(2, Math.round(width / 2.1));
  for (let i = 1; i < seats; i++) {
    const seam = box(0.035, 0.05, depth * 0.78, 0x17100c, 0.7, 0.02);
    seam.position.set(-width / 2 + (width / seats) * i, 0.96, 0.1);
    g.add(seam);
  }
  for (const x of [-width / 2 + 0.7, width / 2 - 0.7]) {
    for (const z of [-depth / 2 + 0.45, depth / 2 - 0.45]) {
      const leg = cyl(0.07, 0.08, 0.45, 0x11151b, 8, 0.38, 0.55);
      leg.position.set(x, 0.22, z);
      g.add(leg);
    }
  }
  const trim = box(width * 0.92, 0.04, 0.08, accent, 0.18, 0.75);
  trim.position.set(0, 1.02, depth / 2 - 0.08);
  g.add(trim);
  return g;
}
function makeDesignerTable(w, d, color=0x2a2d33, topColor=0x7a5d43) {
  const g = new THREE.Group();
  const top = roundedBox(w, 0.26, d, topColor, 0.2, 0.42);
  top.position.y = 0.72;
  g.add(top);
  const under = roundedBox(w * 0.82, 0.18, d * 0.72, color, 0.28, 0.72);
  under.position.y = 0.52;
  g.add(under);
  for (const x of [-w * 0.36, w * 0.36]) {
    for (const z of [-d * 0.3, d * 0.3]) {
      const leg = cyl(0.07, 0.1, 0.52, 0x11161d, 8, 0.36, 0.68);
      leg.position.set(x, 0.26, z);
      g.add(leg);
    }
  }
  return g;
}
function makeBarStool(color=0x22262d, accent=0xe8b96a) {
  const g = new THREE.Group();
  const seat = cyl(0.42, 0.36, 0.16, color, 14, 0.38, 0.48);
  seat.position.y = 0.9;
  g.add(seat);
  const stem = cyl(0.06, 0.09, 0.82, 0x141820, 10, 0.32, 0.74);
  stem.position.y = 0.46;
  g.add(stem);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.31, 0.025, 8, 24),
    new THREE.MeshStandardMaterial({ color: accent, roughness: 0.22, metalness: 0.72 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.48;
  ring.castShadow = true;
  g.add(ring);
  const base = cyl(0.32, 0.42, 0.08, 0x10141a, 14, 0.42, 0.64);
  base.position.y = 0.04;
  g.add(base);
  return g;
}
function makeLabelTexture(title, sub, accent='#e8b96a', bg='#111') {
  return canvasTex(1024, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, bg);
    g.addColorStop(1, '#1d1820');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = `rgba(255,255,255,${i%2?0.02:0.01})`;
      ctx.fillRect(i*w/12, 0, 6, h);
    }
    ctx.strokeStyle = accent;
    ctx.lineWidth = 8;
    ctx.strokeRect(20,20,w-40,h-40);
    ctx.fillStyle = accent;
    ctx.font = 'bold 84px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, w/2, h/2 - 20);
    ctx.font = '36px Arial';
    ctx.fillStyle = '#f2e4c8';
    ctx.fillText(sub, w/2, h/2 + 48);
  });
}
function makeCityTexture() {
  return canvasTex(2048, 768, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#060913');
    g.addColorStop(0.45, '#0d1732');
    g.addColorStop(1, '#1a202a');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);

    for (let i = 0; i < 70; i++) {
      const bw = 26 + Math.random() * 100;
      const bh = 110 + Math.random() * 380;
      const x = Math.random() * (w - bw);
      const y = h - bh;
      ctx.fillStyle = `rgba(${18+Math.random()*24},${22+Math.random()*28},${30+Math.random()*42},0.98)`;
      ctx.fillRect(x, y, bw, bh);

      const cols = Math.max(2, Math.floor(bw / 11));
      const rows = Math.max(5, Math.floor(bh / 12));
      for (let cx = 0; cx < cols; cx++) {
        for (let ry = 0; ry < rows; ry++) {
          if (Math.random() < 0.34) {
            ctx.fillStyle = Math.random() < 0.78 ? 'rgba(255,225,170,0.95)' : 'rgba(126,182,255,0.95)';
            ctx.fillRect(x + 4 + cx * (bw - 8) / cols, y + 4 + ry * (bh - 8) / rows, 3, 4);
          }
        }
      }
    }

    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = Math.random()<0.75 ? 'rgba(255,200,120,0.18)' : 'rgba(100,160,255,0.14)';
      ctx.fillRect(Math.random()*w, h*0.74 + Math.random()*h*0.22, 1.4, 1.4);
    }

    for (let i = 0; i < 38; i++) {
      const x = Math.random()*w;
      const y = h*0.2 + Math.random()*h*0.45;
      const r = 40 + Math.random()*80;
      const rg = ctx.createRadialGradient(x,y,0,x,y,r);
      rg.addColorStop(0,'rgba(255,225,170,0.06)');
      rg.addColorStop(1,'rgba(255,225,170,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(x-r, y-r, r*2, r*2);
    }
  });
}
function makeMarbleTexture(base='#0b0d12', veinA='rgba(230,230,230,0.08)', veinB='rgba(185,155,100,0.07)', grid='rgba(255,255,255,0.05)') {
  const t = canvasTex(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0,0,w,h);
    for (let i = 0; i < 850; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      const len = 14 + Math.random() * 90;
      const a = Math.random() * Math.PI * 2;
      ctx.strokeStyle = Math.random() < 0.55 ? veinA : veinB;
      ctx.lineWidth = 0.8 + Math.random() * 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a)*len, y + Math.sin(a)*len);
      ctx.stroke();
    }
    ctx.strokeStyle = grid;
    for (let i = 1; i < 8; i++) {
      ctx.beginPath(); ctx.moveTo(i*w/8, 0); ctx.lineTo(i*w/8, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i*h/8); ctx.lineTo(w, i*h/8); ctx.stroke();
    }
  });
  t.repeat.set(5, 3);
  return t;
}
const WALL_STYLES = {
  brick_chill:  { baseA:'#6a4129', baseB:'#472918', mortar:'#26170f', brickA:[106,65,41], brickB:[80,47,29], line:'rgba(232,185,106,0.08)' },
  concrete_war: { baseA:'#3a4046', baseB:'#252a30', mortar:'#1a1f24', brickA:[68,76,84],  brickB:[52,58,66], line:'rgba(120,255,160,0.06)' },
  brick_after:  { baseA:'#5b2f3a', baseB:'#361722', mortar:'#1f0d14', brickA:[96,50,64],  brickB:[70,30,44], line:'rgba(255,160,255,0.06)' },
  panel_game:   { baseA:'#1d2f44', baseB:'#111c2f', mortar:'#0a121d', brickA:[36,62,92],  brickB:[24,42,66], line:'rgba(70,162,255,0.10)' }
};

function makeWallTexture(styleOrBaseA='brick_chill', baseB, mortar) {
  const picked = WALL_STYLES[styleOrBaseA];
  const finalBaseA = picked ? picked.baseA : (styleOrBaseA || '#6a4129');
  const finalBaseB = picked ? picked.baseB : (baseB || '#472918');
  const finalMortar = picked ? picked.mortar : (mortar || '#26170f');
  const finalBrickA = picked ? picked.brickA : [96, 58, 34];
  const finalBrickB = picked ? picked.brickB : [86, 52, 31];
  const accentLine = picked ? picked.line : 'rgba(232,185,106,0.08)';

  const t = canvasTex(1024, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0, finalBaseA);
    g.addColorStop(1, finalBaseB);
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);

    const brickW = 120, brickH = 46;
    for (let row = 0; row < Math.ceil(h/brickH)+1; row++) {
      const y = row * brickH;
      const offset = (row % 2) ? brickW / 2 : 0;
      for (let col = -1; col < Math.ceil(w/brickW)+2; col++) {
        const x = col * brickW + offset;
        const tint = ((row + col) % 2 === 0) ? 10 : -6;
        const brickBase = ((row + col) % 2 === 0) ? finalBrickA : finalBrickB;
        const rr = Math.max(0, Math.min(255, brickBase[0] + tint));
        const gg = Math.max(0, Math.min(255, brickBase[1] + Math.floor(tint / 2)));
        const bb = Math.max(0, Math.min(255, brickBase[2] + Math.floor(tint / 3)));
        ctx.fillStyle = `rgb(${rr}, ${gg}, ${bb})`;
        ctx.fillRect(x+2, y+2, brickW-4, brickH-4);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(x+8, y+7, brickW-26, 5);
      }
    }

    ctx.strokeStyle = finalMortar;
    ctx.lineWidth = 4;
    for (let row = 0; row < Math.ceil(h/brickH)+1; row++) {
      const y = row * brickH;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      const offset = (row % 2) ? brickW / 2 : 0;
      for (let col = -1; col < Math.ceil(w/brickW)+2; col++) {
        const x = col * brickW + offset;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + brickH); ctx.stroke();
      }
    }

    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.02 + Math.random()*0.03})`;
      ctx.fillRect(Math.random()*w, Math.random()*h, 2, 2);
    }

    ctx.fillStyle = accentLine;
    ctx.fillRect(0, h-16, w, 10);
  });
  t.repeat.set(4, 1.6);
  return t;
}
function makeSnakeScreenTexture() {
  return canvasTex(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#040404'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = '#e8b96a'; ctx.font = 'bold 90px Arial'; ctx.textAlign = 'center';
    ctx.fillText('SNAKE', w/2, 150);
    ctx.fillStyle = '#7adf9a';
    ctx.fillRect(420, 500, 80, 80);
    ctx.fillRect(500, 500, 80, 80);
    ctx.fillRect(580, 500, 80, 80);
    ctx.fillStyle = '#e8b96a';
    ctx.fillRect(740, 360, 70, 70);
    ctx.fillStyle = '#d8c8a8'; ctx.font = '44px Arial';
    ctx.fillText('PRESS E TO PLAY', w/2, 820);
  });
}
function makeFifaTexture() {
  return canvasTex(1024, 576, (ctx, w, h) => {
    ctx.fillStyle = '#1a6b34'; ctx.fillRect(0,0,w,h);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
      ctx.fillRect(i*w/8, 0, w/8, h);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 6;
    ctx.strokeRect(40, 40, w-80, h-80);
    ctx.beginPath(); ctx.moveTo(w/2, 40); ctx.lineTo(w/2, h-40); ctx.stroke();
    ctx.beginPath(); ctx.arc(w/2, h/2, 70, 0, Math.PI*2); ctx.stroke();
    ctx.strokeRect(40, h/2-120, 150, 240);
    ctx.strokeRect(w-190, h/2-120, 150, 240);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 52px Arial';
    ctx.fillText('PS5 FIFA', 40, 72);
  });
}
function makeBasketballTexture() {
  return canvasTex(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#18110f'; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = '#d2a35a'; ctx.lineWidth = 10;
    ctx.strokeRect(50,50,w-100,h-100);
    ctx.beginPath(); ctx.arc(w/2, h/2, 180, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(w/2, h*0.8, 110, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#f2e4c8'; ctx.font = 'bold 64px Arial'; ctx.textAlign = 'center';
    ctx.fillText('PRIVATE COURT', w/2, 140);
  });
}
function makeBottleLabel(c1, c2) {
  return canvasTex(64, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0,0,w,h);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
  });
}
function addSpot(x,y,z,color,intensity=1,distance=22,angle=Math.PI/5,targetY=0) {
  const s = new THREE.SpotLight(color, intensity, distance, angle, 0.35, 1.2);
  s.position.set(x,y,z);
  s.castShadow = true;
  s.shadow.mapSize.set(1024,1024);
  s.target.position.set(x, targetY, z);
  s.userData.baseIntensity = intensity;
  qualitySpotlights.push(s);
  scene.add(s);
  scene.add(s.target);
  applyGraphicsQuality(false);
  return s;
}

// ==================== MATERIALS / TEXTURES ====================
let marbleTex = makeMarbleTexture();
let wallTex = makeWallTexture();
const cityTex = makeCityTexture();
const fifaScreenTex = makeFifaTexture();
const basketFloorTex = makeBasketballTexture();
let snakePreviewTex = makeSnakeScreenTexture();

// ==================== LIGHTING ====================
scene.add(new THREE.AmbientLight(0xffffff, MOBILE ? 0.82 : 0.68));

const hemi = new THREE.HemisphereLight(0xa7b7ff, 0x2b1c18, MOBILE ? 0.86 : 0.68);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xfff4d8, MOBILE ? 1.45 : 1.35);
key.position.set(4, 14, 6);
key.castShadow = true;
key.shadow.mapSize.set(MOBILE ? 1024 : 1536, MOBILE ? 1024 : 1536);
key.shadow.camera.left = -26; key.shadow.camera.right = 26;
key.shadow.camera.top = 22; key.shadow.camera.bottom = -22;
key.shadow.camera.near = 0.5; key.shadow.camera.far = 60;
key.shadow.bias = -0.0006;
scene.add(key);

const purpleFill = new THREE.PointLight(0x5e47ff, MOBILE ? 1.5 : 2.2, 34);
purpleFill.position.set(-15, 6, -10);
scene.add(purpleFill);

const goldFill = new THREE.PointLight(0xe8b96a, MOBILE ? 1.45 : 2.0, 32);
goldFill.position.set(14, 5, -8);
scene.add(goldFill);

const frontFill = new THREE.PointLight(0x9ec5ff, MOBILE ? 0.8 : 1.0, 24);
frontFill.position.set(0, 4.5, -10);
scene.add(frontFill);

const warmFloorFill = new THREE.PointLight(0xffd79a, MOBILE ? 0.9 : 1.2, 22);
warmFloorFill.position.set(-8, 2.2, 4);
scene.add(warmFloorFill);

applyGraphicsQuality(false);
