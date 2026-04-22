// ==================== SNAKE ====================
const arcadeCanvas=document.getElementById('arcade-canvas'), actx=arcadeCanvas.getContext('2d');
let snake=[{x:8,y:8},{x:7,y:8},{x:6,y:8}],snakeDir={x:1,y:0},snakeFood={x:12,y:8},snakeScore=0,snakeLoop=null;
function syncSnakePreview() {
  if (!snakeWallMesh) return;
  if (snakePreviewTex && snakePreviewTex.dispose) snakePreviewTex.dispose();
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const ctx = c.getContext('2d');
  ctx.fillStyle='#000'; ctx.fillRect(0,0,1024,1024);
  ctx.drawImage(arcadeCanvas, 112, 200, 800, 800);
  ctx.fillStyle = '#e8b96a';
  ctx.font = 'bold 80px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('SNAKE', 512, 120);
  ctx.fillStyle = '#d8c8a8';
  ctx.font = '36px Arial';
  ctx.fillText('LIVE ARCADE', 512, 930);
  snakePreviewTex = new THREE.CanvasTexture(c);
  snakePreviewTex.colorSpace = THREE.SRGBColorSpace;
  snakeWallMesh.material.map = snakePreviewTex;
  snakeWallMesh.material.needsUpdate = true;
}
function startArcade() {
  clearInterval(snakeLoop);
  snake=[{x:8,y:8},{x:7,y:8},{x:6,y:8}]; snakeDir={x:1,y:0}; snakeFood={x:12,y:8}; snakeScore=0;
  document.getElementById('arcade-score').textContent='SCORE: 0';
  snakeLoop=setInterval(tickSnake,140); drawSnake();
refreshAdminInfo();
syncInteractAnchors();
}
function tickSnake() {
  if(document.getElementById('arcade-panel').style.display!=='block'){clearInterval(snakeLoop);return;}
  const head={x:snake[0].x+snakeDir.x,y:snake[0].y+snakeDir.y};
  if(head.x<0||head.x>=16||head.y<0||head.y>=16||snake.some(s=>s.x===head.x&&s.y===head.y)){
    clearInterval(snakeLoop);
    actx.fillStyle='#000';actx.fillRect(0,0,320,320);
    actx.fillStyle='#e8b96a';actx.font='bold 32px Courier New';actx.textAlign='center';
    actx.fillText('GAME OVER',160,140);actx.font='18px Courier New';
    actx.fillText('Score: '+snakeScore,160,180);actx.fillText('Tap to restart',160,220);
    arcadeCanvas.onclick=startArcade;
    syncSnakePreview();
    return;
  }
  snake.unshift(head);
  if(head.x===snakeFood.x&&head.y===snakeFood.y){snakeScore++;document.getElementById('arcade-score').textContent='SCORE: '+snakeScore;snakeFood={x:Math.floor(Math.random()*16),y:Math.floor(Math.random()*16)};}
  else snake.pop();
  drawSnake();
refreshAdminInfo();
syncInteractAnchors();
}
function drawSnake(){
  if (!snake || !snakeFood) return;
  actx.fillStyle='#000';actx.fillRect(0,0,320,320);
  actx.fillStyle='#e8b96a';actx.fillRect(snakeFood.x*20,snakeFood.y*20,18,18);
  for(let i=0;i<snake.length;i++){actx.fillStyle=i===0?'#7adf9a':'#3a8a5a';actx.fillRect(snake[i].x*20,snake[i].y*20,18,18);}
  syncSnakePreview();
}
document.addEventListener('keydown',e=>{
  if(document.getElementById('arcade-panel').style.display!=='block')return;
  if(e.key==='ArrowUp'&&snakeDir.y!==1)snakeDir={x:0,y:-1};
  else if(e.key==='ArrowDown'&&snakeDir.y!==-1)snakeDir={x:0,y:1};
  else if(e.key==='ArrowLeft'&&snakeDir.x!==1)snakeDir={x:-1,y:0};
  else if(e.key==='ArrowRight'&&snakeDir.x!==-1)snakeDir={x:1,y:0};
});
arcadeCanvas.addEventListener('touchstart',e=>{
  if(!snake)return;
  const r=arcadeCanvas.getBoundingClientRect(),t=e.touches[0];
  const tx=(t.clientX-r.left)/r.width*16,ty=(t.clientY-r.top)/r.height*16;
  const dx=tx-snake[0].x,dy=ty-snake[0].y;
  if(Math.abs(dx)>Math.abs(dy)){if(dx>0&&snakeDir.x!==-1)snakeDir={x:1,y:0};else if(dx<0&&snakeDir.x!==1)snakeDir={x:-1,y:0};}
  else{if(dy>0&&snakeDir.y!==-1)snakeDir={x:0,y:1};else if(dy<0&&snakeDir.y!==1)snakeDir={x:0,y:-1};}
  e.preventDefault();
},{passive:false});
drawSnake();
refreshAdminInfo();
syncInteractAnchors();

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

  const rid = document.getElementById('room-input').value.trim() || 'vibe-room';
  document.getElementById('start').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  document.getElementById('top-right').style.display = 'flex';
  document.getElementById('crosshair').style.display = 'block';
  if (!isMobile()) renderer.domElement.requestPointerLock();
  connectWS(rid);
  refreshAdminInfo();
  document.getElementById('host-badge').style.display = isHostUser() ? 'block' : 'none';
};

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
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  updatePlayer(dt, t);
  updateRemotes(dt);
  updateRoomFx(t, dt);
  updateCamera();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

setInterval(() => { if (wsConnected) wsSend({type:'ping'}); }, 25000);
