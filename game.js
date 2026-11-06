(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const mini = document.getElementById('minimap');
  const mctx = mini.getContext('2d');
  const TILE = 32, WORLD = 64;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const seed = (x, y) => { let n = Math.sin(x * 127.1 + y * 311.7 + 7.3) * 43758.5453; return n - Math.floor(n); };
  const saved = (() => { try { return JSON.parse(localStorage.getItem('niebla-save') || '{}'); } catch { return {}; } })();
  const player = { x: saved.x || 24.5, y: saved.y || 27, dir: 'down', hp: 100, maxHp: 100, mana: 60, maxMana: 60,
    xp: saved.xp || 0, level: saved.level || 1, gold: saved.gold ?? 125, potions: saved.potions || 3, kills: saved.kills || 0, moving: false, swing: 0 };
  let keys = new Set(), last = performance.now(), attackWait = 0, spellWait = 0, toastWait = 0, camera = {x: player.x, y: player.y};
  let enemies = [];
  const npc = { x: 23.8, y: 24.2 };
  const obstacle = (x, y) => {
    if (x < 1 || y < 1 || x > WORLD - 2 || y > WORLD - 2) return true;
    if ((x > 14 && x < 20 && y > 16 && y < 21) || (x > 27 && x < 31 && y > 20 && y < 23)) return true;
    if (Math.hypot(x - npc.x, y - npc.y) < .48) return true;
    for (let ty = Math.floor(y) - 1; ty <= Math.floor(y) + 1; ty++) for (let tx = Math.floor(x) - 1; tx <= Math.floor(x) + 1; tx++) {
      if (treeAt(tx, ty) && Math.hypot(x - tx - .5, y - ty - .4) < .42) return true;
    }
    return false;
  };
  function treeAt(x, y) { return x > 3 && y > 3 && x < WORLD - 3 && y < WORLD - 3 && seed(x, y) > .84 && !(x > 18 && x < 34 && y > 17 && y < 36); }
  function spawnSlimes() {
    for (let i=0;i<13;i++) { let x, y, tries=0; do { x=29+seed(i*13+1, 4)*20; y=24+seed(i*6+5, 9)*19; tries++; } while ((obstacle(x,y) || Math.hypot(x-player.x,y-player.y)<5) && tries<12); enemies.push({x,y,hp:3,maxHp:3,alive:true,phase:seed(i,15)*6,hit:0,attack:0,roam:seed(i,31)*Math.PI*2,id:i}); }
  }
  spawnSlimes();
  function save() { localStorage.setItem('niebla-save', JSON.stringify({x:player.x,y:player.y,xp:player.xp,level:player.level,gold:player.gold,potions:player.potions,kills:player.kills})); }
  function setToast(text) { const el=document.getElementById('toast'); el.textContent=text; el.classList.add('show'); toastWait=2.1; }
  function addChat(html) { const log=document.getElementById('chatLog'), row=document.createElement('p'); row.innerHTML=`<time>14:32</time>${html}`; log.appendChild(row); log.scrollTop=log.scrollHeight; }
  function resized() { const rect=canvas.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,2); canvas.width=Math.round(rect.width*dpr); canvas.height=Math.round(rect.height*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); draw(); }
  new ResizeObserver(resized).observe(canvas);
  function screenSize(){return {w:canvas.clientWidth,h:canvas.clientHeight};}
  function worldToScreen(x,y){const {w,h}=screenSize(); return {x:w/2+(x-camera.x)*TILE,y:h/2+(y-camera.y)*TILE};}
  function tileColor(x,y){
    const n=seed(x,y); let c=n>.82?'#58724d':n>.53?'#4e6948':n>.16?'#536f4c':'#5b754e';
    if (x>15&&x<31&&y>20&&y<32){c=n>.52?'#667d50':'#61784c';}
    // winding packed-earth trail
    const roadX=24+Math.sin(y*.22)*2.1; if(Math.abs(x-roadX)<1.2 && y>8&&y<56)c=n>.6?'#9b875d':'#927e55';
    const roadY=27+Math.sin(x*.17)*1.3; if(Math.abs(y-roadY)<1.05&&x>10&&x<38)c=n>.5?'#9a865b':'#8c7951';
    // little pond at the eastern edge
    const d=Math.hypot((x-49)*.84,(y-33)*1.15); if(d<5.4&&d>4.4)c='#756d4d'; if(d<4.4)c=n>.45?'#477682':'#4c7e88';
    return c;
  }
  function drawTile(x,y){const p=worldToScreen(x,y), n=seed(x,y); ctx.fillStyle=tileColor(x,y);ctx.fillRect(p.x,p.y,TILE+1,TILE+1);
    if (p.x < -TILE || p.y < -TILE || p.x>screenSize().w || p.y>screenSize().h) return;
    if(Math.abs(p.x-(screenSize().w/2+(24.5-camera.x)*TILE))<500 && n>.4){ctx.fillStyle=n>.8?'#84905c':'#778758';ctx.fillRect(p.x+6+n*13,p.y+6+seed(x+7,y)*17,2,2);}
    if(n>.94 && !treeAt(x,y)){ctx.fillStyle='#ddca87';ctx.fillRect(p.x+9,p.y+13,3,3);ctx.fillStyle='#e3dfb2';ctx.fillRect(p.x+10,p.y+12,2,2);}
  }
  function drawTree(x,y){const p=worldToScreen(x+.5,y+.5),n=seed(x,y);ctx.fillStyle='#283c2b';ctx.fillRect(p.x-3,p.y+3,7,18);ctx.fillStyle='#355137';ctx.beginPath();ctx.ellipse(p.x,p.y-2,15,14,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=n>.9?'#60774a':'#496743';ctx.beginPath();ctx.ellipse(p.x-3,p.y-5,10,9,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#718153';ctx.fillRect(p.x-5,p.y-11,4,3);ctx.fillStyle='#263a2b';ctx.fillRect(p.x+5,p.y-2,4,3);}
  function drawHouse(x,y,w,h,roof){const p=worldToScreen(x,y);ctx.fillStyle='#283329';ctx.fillRect(p.x+2,p.y+h-2,w*TILE,h?4:4);ctx.fillStyle='#b8a47a';ctx.fillRect(p.x+4,p.y+9,w*TILE-8,(h-1)*TILE);ctx.fillStyle='#756349';ctx.fillRect(p.x+4,p.y+9,w*TILE-8,4);ctx.fillStyle=roof;ctx.beginPath();ctx.moveTo(p.x,p.y+13);ctx.lineTo(p.x+w*TILE/2,p.y-14);ctx.lineTo(p.x+w*TILE,p.y+13);ctx.closePath();ctx.fill();ctx.fillStyle='#94764f';ctx.fillRect(p.x+w*TILE/2-7,p.y+h*TILE-17,14,24);ctx.fillStyle='#e2c482';ctx.fillRect(p.x+13,p.y+21,9,9);ctx.fillRect(p.x+w*TILE-22,p.y+21,9,9);}
  function drawCharacter(x,y,kind,dir,frame,hpRatio){const p=worldToScreen(x,y), bob=frame?Math.sin(frame*11)*1.5:0;ctx.save();ctx.translate(p.x,p.y+bob);
    ctx.fillStyle='#1f2c20a8';ctx.beginPath();ctx.ellipse(0,7,10,4,0,0,Math.PI*2);ctx.fill();
    if(kind==='player'){
      ctx.fillStyle='#554334';ctx.fillRect(-6,-8,12,14);ctx.fillStyle='#7d4938';ctx.fillRect(-7,-8,14,9);ctx.fillStyle='#dbc298';ctx.fillRect(-5,-19,10,11);ctx.fillStyle='#40352f';ctx.fillRect(-6,-21,12,5);ctx.fillRect(-9,-17,5,4);ctx.fillRect(4,-17,5,4);ctx.fillStyle='#5e99a7';ctx.fillRect(-3,-15,2,2);ctx.fillStyle='#644d3c';ctx.fillRect(-7,4,5,5);ctx.fillRect(2,4,5,5);
      if(player.swing>0){ctx.strokeStyle='#e7d99e';ctx.lineWidth=2;ctx.beginPath();let a=player.swing>0.15?-.7:.5;ctx.arc(4,-6,20,a,a+1.5);ctx.stroke();}
      if(dir==='left') {ctx.fillStyle='#66513c';ctx.fillRect(-11,-11,5,13);} if(dir==='right'){ctx.fillStyle='#66513c';ctx.fillRect(6,-11,5,13);}
    } else if(kind==='guard'){
      ctx.fillStyle='#526e4e';ctx.fillRect(-7,-10,14,16);ctx.fillStyle='#d5bc8e';ctx.fillRect(-5,-20,10,11);ctx.fillStyle='#8c7050';ctx.fillRect(-7,-21,14,5);ctx.fillStyle='#bca36d';ctx.fillRect(-8,-9,16,3);ctx.fillStyle='#ddd0ac';ctx.fillRect(-3,-15,2,2);ctx.fillRect(2,-15,2,2);ctx.fillStyle='#806440';ctx.fillRect(-6,5,5,5);ctx.fillRect(2,5,5,5);ctx.fillStyle='#a5a17e';ctx.fillRect(8,-16,2,23);ctx.fillRect(6,-17,6,3);
    } else {
      const squish=Math.sin(frame*5+1)*2;ctx.fillStyle='#293c37';ctx.beginPath();ctx.ellipse(0,-5,11,8-squish*.3,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#78b798';ctx.beginPath();ctx.ellipse(-2,-7,9,7-squish*.3,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#c2dfb6';ctx.fillRect(-5,-10,2,3);ctx.fillRect(1,-10,2,3);ctx.fillStyle='#354735';ctx.fillRect(-4,-9,1,1);ctx.fillRect(2,-9,1,1);if(hpRatio<1){ctx.fillStyle='#263126';ctx.fillRect(-10,-19,20,3);ctx.fillStyle='#bc6351';ctx.fillRect(-10,-19,20*hpRatio,3);}
    }
    ctx.restore();
    if(kind==='guard'){ctx.fillStyle='#f0e2b9';ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillText('Guardia Elian',p.x,p.y-29);}
    if(kind==='player'){ctx.fillStyle='#f1ebcf';ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillText('Lunara',p.x,p.y-27);}
  }
  function draw(){if(!ctx)return;const {w,h}=screenSize();if(!w||!h)return;
    ctx.clearRect(0,0,w,h);camera.x+=(player.x-camera.x)*.13;camera.y+=(player.y-camera.y)*.13;
    const left=Math.floor(camera.x-w/TILE/2)-1, right=Math.ceil(camera.x+w/TILE/2)+1, top=Math.floor(camera.y-h/TILE/2)-1,bottom=Math.ceil(camera.y+h/TILE/2)+1;
    for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)drawTile(x,y);
    // riverside reeds and borders
    for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){if(treeAt(x,y))drawTree(x,y); if(seed(x+44,y+2)>.98&&x>34&&x<40){const p=worldToScreen(x,y);ctx.fillStyle='#968853';ctx.fillRect(p.x+14,p.y+8,2,13);ctx.fillStyle='#c1a961';ctx.fillRect(p.x+10,p.y+8,8,2);}}
    drawHouse(15,16,5,4,'#755842');drawHouse(28,20,3,3,'#696148');
    // fence around farm garden
    for(let i=0;i<6;i++){let p=worldToScreen(19+i,24);ctx.fillStyle='#765d3c';ctx.fillRect(p.x,p.y,3,18);ctx.fillRect(p.x+12,p.y,3,18);ctx.fillRect(p.x-1,p.y+4,15,3);}
    const actors=[...enemies.filter(e=>e.alive).map(e=>({y:e.y,fn:()=>drawCharacter(e.x,e.y,'slime','',e.phase,e.hp/e.maxHp)})),{y:npc.y,fn:()=>drawCharacter(npc.x,npc.y,'guard','down',0,1)},{y:player.y,fn:()=>drawCharacter(player.x,player.y,'player',player.dir,player.moving?performance.now()/1000:0,1)}].sort((a,b)=>a.y-b.y);actors.forEach(a=>a.fn());
    drawMinimap();
  }
  function drawMinimap(){mctx.fillStyle='#526e4c';mctx.fillRect(0,0,112,84);const sx=112/WORLD,sy=84/WORLD;for(let y=0;y<WORLD;y++)for(let x=0;x<WORLD;x++){let c=tileColor(x,y);if(c.includes('rgb'))continue;mctx.fillStyle=c;mctx.fillRect(x*sx,y*sy,Math.ceil(sx),Math.ceil(sy));if(treeAt(x,y)){mctx.fillStyle='#263c2d';mctx.fillRect(x*sx,y*sy,2,2);}}for(const e of enemies)if(e.alive){mctx.fillStyle='#d58c62';mctx.fillRect(e.x*sx-1,e.y*sy-1,2,2);}mctx.fillStyle='#d5bd79';mctx.fillRect(player.x*sx-2,player.y*sy-2,4,4);}
  function interact(){if(Math.hypot(player.x-npc.x,player.y-npc.y)<3.1){if(player.kills>=5){showModal('✦','ENCARGO COMPLETADO','Guardia Elian', '¡Buen trabajo, Lunara! Los caminos vuelven a ser seguros. Tomá esta recompensa, te la ganaste.', '<div class="modal-stat-list"><span>Experiencia</span><b>+80 XP</b><span>Oro</span><b>+40</b></div>', 'COBRAR RECOMPENSA',()=>{player.kills=0;player.xp+=80;player.gold+=40;levelCheck();updateUI();save();closeModal();addChat('<b class="chat-npc">Guardia Elian:</b> ¡Arandor te debe una!');});}else showModal('⚑','UN ENCARGO DE VILLA','Guardia Elian','Los limos aparecieron con la niebla. Limpiá el camino al este del molino; con cinco menos, el pueblo podrá dormir tranquilo.','<div class="modal-stat-list"><span>Objetivo</span><b>Derrotar 5 limos</b><span>Recompensa</span><b>80 XP · 40 oro</b></div>','¡A ELLO!',()=>{closeModal();setToast('Encargo rastreado · Los limos están al este');});}
    else setToast('Acercate a Guardia Elian para hablar');}
  function showModal(icon,title,eyebrow,body,extra,action,onAction){const back=document.getElementById('modalBackdrop');document.getElementById('modalIcon').textContent=icon;document.getElementById('modalTitle').textContent=title;document.getElementById('modalEyebrow').textContent=eyebrow;document.getElementById('modalBody').textContent=body;document.getElementById('modalExtra').innerHTML=extra;const btn=document.getElementById('modalAction');btn.textContent=action;btn.onclick=onAction;back.hidden=false;}
  function closeModal(){document.getElementById('modalBackdrop').hidden=true;}
  function attack(spell=false){if(spell){if(spellWait>0)return;if(player.mana<18){setToast('No tenés maná suficiente');return;}player.mana-=18;spellWait=1.1;}else{if(attackWait>0)return;attackWait=.48;player.swing=.32;}
    const range=spell?4.7:1.55;let target=null,dist=Infinity;for(const e of enemies){if(!e.alive)continue;const d=Math.hypot(e.x-player.x,e.y-player.y);if(d<range&&d<dist){dist=d;target=e;}}
    if(target){target.hp-=spell?2:1;target.hit=.2;if(target.hp<=0){target.alive=false;player.kills++;player.xp+=25;player.gold+=3;levelCheck();addChat(`<b class="chat-world">Mundo:</b> Derrotaste a un limo. <span style="color:#c7ae70">+25 XP</span>`);setToast('Limo derrotado · +25 XP');}else setToast(spell?'¡Pulso arcano!':'¡Impacto!');}
    else if(!spell)setToast('No hay enemigos al alcance'); updateUI();save();
  }
  function levelCheck(){while(player.xp>=player.level*100){player.xp-=player.level*100;player.level++;player.maxHp+=12;player.maxMana+=8;player.hp=player.maxHp;player.mana=player.maxMana;setToast(`¡Subiste al nivel ${player.level}!`);addChat(`<b class="chat-world">Mundo:</b> Lunara alcanzó el nivel ${player.level}.`);}}
  function usePotion(){if(player.potions<1){setToast('No te quedan pociones');return;}if(player.hp>=player.maxHp){setToast('Ya tenés la vida completa');return;}player.potions--;player.hp=Math.min(player.maxHp,player.hp+45);setToast('Poción usada · +45 vida');updateUI();save();}
  function updateUI(){const hp=Math.max(0,player.hp);document.getElementById('healthFill').style.width=(hp/player.maxHp*100)+'%';document.getElementById('manaFill').style.width=(player.mana/player.maxMana*100)+'%';document.getElementById('healthText').innerHTML=`${Math.round(hp)} <i>/ ${player.maxHp}</i>`;document.getElementById('manaText').innerHTML=`${Math.round(player.mana)} <i>/ ${player.maxMana}</i>`;document.getElementById('goldText').textContent=player.gold;document.getElementById('potionCount').textContent=player.potions;document.getElementById('xpText').textContent=`${player.xp} / ${player.level*100}`;document.getElementById('xpFill').style.width=(player.xp/(player.level*100)*100)+'%';document.getElementById('levelText').textContent='NIVEL '+player.level;document.getElementById('sideLevel').textContent=player.level;document.getElementById('questProgress').textContent=`${Math.min(player.kills,5)} / 5`;document.getElementById('questCheck').textContent=player.kills>=5?'✓':'○';document.getElementById('inventoryCount').textContent=4+player.potions;document.getElementById('coords').textContent=`X: ${Math.floor(player.x)} · Y: ${Math.floor(player.y)}`;}
  function step(now){const dt=Math.min(.05,(now-last)/1000);last=now;attackWait=Math.max(0,attackWait-dt);spellWait=Math.max(0,spellWait-dt);player.swing=Math.max(0,player.swing-dt);toastWait-=dt;if(toastWait<=0)document.getElementById('toast').classList.remove('show');
    let dx=0,dy=0;if(keys.has('ArrowUp')||keys.has('w'))dy--;if(keys.has('ArrowDown')||keys.has('s'))dy++;if(keys.has('ArrowLeft')||keys.has('a'))dx--;if(keys.has('ArrowRight')||keys.has('d'))dx++;const mag=Math.hypot(dx,dy);player.moving=mag>0;if(mag){dx/=mag;dy/=mag;player.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');let speed=3.1*dt;if(!obstacle(player.x+dx*speed,player.y))player.x+=dx*speed;if(!obstacle(player.x,player.y+dy*speed))player.y+=dy*speed;player.x=clamp(player.x,1,WORLD-2);player.y=clamp(player.y,1,WORLD-2);}
    for(const e of enemies){if(!e.alive)continue;e.phase+=dt*2.7;e.hit=Math.max(0,e.hit-dt);e.attack=Math.max(0,e.attack-dt);const d=Math.hypot(player.x-e.x,player.y-e.y);if(d<6){if(d>1.05){const vx=(player.x-e.x)/(d||1),vy=(player.y-e.y)/(d||1),s=dt*.63;if(!obstacle(e.x+vx*s,e.y))e.x+=vx*s;if(!obstacle(e.x,e.y+vy*s))e.y+=vy*s;}else if(e.attack<=0){e.attack=1.7;player.hp=Math.max(0,player.hp-5);updateUI();setToast('Un limo te golpeó · −5 vida');if(player.hp<=0){player.hp=player.maxHp;player.x=24.5;player.y=27;player.gold=Math.max(0,player.gold-10);setToast('Te desmayaste y volviste a la villa · −10 oro');save();}}}else if(Math.random()<dt*.12){let nx=e.x+Math.cos(e.roam)*dt*.3,ny=e.y+Math.sin(e.roam)*dt*.3;if(!obstacle(nx,ny)){e.x=nx;e.y=ny;}e.roam+=(Math.random()-.5)*dt;}}
    if(Math.floor(now/1500)!==Math.floor((now-dt*1000)/1500)){if(player.hp<player.maxHp)player.hp=Math.min(player.maxHp,player.hp+1);if(player.mana<player.maxMana)player.mana=Math.min(player.maxMana,player.mana+1);updateUI();}
    document.getElementById('coords').textContent=`X: ${Math.floor(player.x)} · Y: ${Math.floor(player.y)}`;draw();requestAnimationFrame(step);
  }
  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(k===' '){attack();return;}if(k==='e'){interact();return;}if(k==='1')attack();if(k==='2')usePotion();if(k==='3')attack(true);keys.add(k);});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
  document.querySelectorAll('[data-move]').forEach(btn=>{const dir=btn.dataset.move, map={up:'arrowup',down:'arrowdown',left:'arrowleft',right:'arrowright'};btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);keys.add(map[dir]);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(ev,()=>keys.delete(map[dir]));});
  document.getElementById('touchAttack').addEventListener('pointerdown',e=>{e.preventDefault();attack();});
  document.querySelectorAll('.slot').forEach((el,i)=>el.addEventListener('click',()=>{document.querySelectorAll('.slot').forEach(s=>s.classList.remove('active'));el.classList.add('active');if(i===0)attack();if(i===1)usePotion();if(i===2)attack(true);}));
  document.getElementById('inventoryButton').onclick=()=>showModal('▤','MOCHILA DE VIAJE','PERTENENCIAS DE LUNARA',`Llevás ${player.potions} pociones de vida y un viejo mapa de Arandor. Tus hallazgos más valiosos todavía están por llegar.`,`<div class="modal-stat-list"><span>🧪 Pociones de vida</span><b>${player.potions}</b><span>🗺 Mapa antiguo</span><b>1</b></div>`,'CERRAR',closeModal);
  document.getElementById('characterButton').onclick=()=>showModal('✥','ATRIBUTOS','LUNARA · MAGA',`Una viajera de las tierras australes, guiada por antiguas leyendas y una magia que recién comienza a despertar.`,`<div class="modal-stat-list"><span>Fuerza</span><b>8</b><span>Agilidad</span><b>12</b><span>Inteligencia</span><b>${14+player.level-1}</b><span>Constitución</span><b>10</b></div>`,'CERRAR',closeModal);
  document.getElementById('questHint').onclick=()=>{const living=enemies.filter(e=>e.alive);if(living.length){const nearest=living.reduce((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)<Math.hypot(b.x-player.x,b.y-player.y)?a:b);setToast(`Limos al este · ${Math.round(Math.hypot(nearest.x-player.x,nearest.y-player.y))} m`);}else setToast('El prado está en calma.');};
  document.getElementById('helpButton').onclick=()=>showModal('⌘','CÓMO JUGAR','GUÍA DEL VIAJERO','Explorá los prados, ayudá a la guardia y ganá experiencia en combate. Los limos aparecen al este de la villa.','<div class="modal-stat-list"><span>Movimiento</span><b>WASD / flechas</b><span>Ataque</span><b>Espacio · tecla 1</b><span>Pulso arcano</span><b>Tecla 3</b><span>Poción</span><b>Tecla 2</b><span>Hablar</span><b>Acercate y tocá E</b></div>','¡ENTENDIDO!',closeModal);
  document.getElementById('modalClose').onclick=closeModal;document.getElementById('modalBackdrop').addEventListener('click',e=>{if(e.target.id==='modalBackdrop')closeModal();});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  document.getElementById('chatForm').addEventListener('submit',e=>{e.preventDefault();const input=document.getElementById('chatInput'),text=input.value.trim();if(!text)return;addChat(`<b class="chat-world">Lunara:</b> ${text.replace(/[<>]/g,'')}`);input.value='';});document.getElementById('clearChat').onclick=()=>{const l=document.getElementById('chatLog');l.innerHTML='<p><time>14:32</time><span class="system-msg">La crónica comienza...</span></p>';};
  document.getElementById('soundToggle').onclick=e=>{const b=e.currentTarget;b.classList.toggle('muted');b.innerHTML=b.classList.contains('muted')?'♫ <span>SILENCIO</span>':'♫ <span>SONIDO</span>';setToast(b.classList.contains('muted')?'Sonido desactivado':'Sonido activado');};
  updateUI();requestAnimationFrame(step);
})();