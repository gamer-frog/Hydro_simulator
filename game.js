(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const frame = document.getElementById('gameFrame');
  const spells = [...document.querySelectorAll('.spell-slot')];
  const $ = id => document.getElementById(id);
  const rand = (a,b) => a + Math.random() * (b-a);
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  // AO uses a square tile map and four cardinal headings. Keep actors on tile centers.
  const GRID_COLS = 24, GRID_ROWS = 16;
  const TILE_X = 1 / GRID_COLS, TILE_Y = 1 / GRID_ROWS;
  const names = {player:'Viajero del Sur',luna:'Luna de Plata',bruno:'Bruno Fierro',mateo:'Mateo del Monte'};
  const colors = {player:'#d2b776',luna:'#aea0dc',bruno:'#a9bf78',mateo:'#c79669'};
  const tileX = x => clamp(Math.round(x * GRID_COLS - .5), 2, GRID_COLS - 3);
  const tileY = y => clamp(Math.round(y * GRID_ROWS - .5), 2, GRID_ROWS - 3);
  const centerX = col => (col + .5) * TILE_X;
  const centerY = row => (row + .5) * TILE_Y;
  const fighters = [
    makeFighter('player',.49,.62), makeFighter('luna',.31,.39),
    makeFighter('bruno',.69,.40), makeFighter('mateo',.72,.69)
  ];
  function makeFighter(id,x,y){x=centerX(tileX(x));y=centerY(tileY(y));return {id,x,y,hp:100,maxHp:100,mana:100,kills:0,alive:true,respawn:0,attackCd:rand(.2,1.3),slow:0,block:false,dir:1,heading:'S',walk:0,flash:0,aiTimer:0,stepCd:0,tx:x,ty:y,cast:0,castType:'',lastAttacker:null};}
  const spellsData = [
    {name:'Corte de hierro',cost:0,cd:0.72,damage:20,range:1.5,color:'#efd28c'},
    {name:'Velo de escarcha',cost:24,cd:4.7,damage:17,range:7,color:'#9bd8ed'},
    {name:'Carga',cost:19,cd:5.7,damage:23,range:6,color:'#e6be75'},
    {name:'Tormenta del sur',cost:48,cd:13,damage:34,range:7,color:'#eacb72'}
  ];
  let W=800,H=480,dpr=1,last=0,elapsed=0,remaining=180,gameOver=false,paused=false;
  let cooldowns=[0,0,0,0], potionCount=2, potionCd=0, invuln=0, blockHeld=false, selectedSpell=null;
  const keys=new Set(), joystick={active:false,id:null,x:0,y:0,dx:0,dy:0};
  const decor=[]; let soundOn=true,audioCtx=null,audioReady=false,lastToast=0;
  const arenaBounds={left:.095,right:.905,top:.12,bottom:.90};
  for(let i=0;i<62;i++){decor.push({x:rand(.045,.955),y:rand(.06,.96),kind:Math.random()<.58?'tree':'bush',s:rand(.65,1.35),seed:Math.random()});}
  for(let i=0;i<34;i++){decor.push({x:rand(.17,.83),y:rand(.16,.88),kind:'grass',s:rand(.45,1.25),seed:Math.random()});}
  const clampActor=(v,min,max)=>clamp(v,min,max);
  function resize(){const r=frame.getBoundingClientRect();if(!r.width||!r.height)return;W=r.width;H=r.height;dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
  new ResizeObserver(resize).observe(frame); window.addEventListener('resize',resize); resize();
  function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(lastToast);lastToast=setTimeout(()=>el.classList.remove('show'),1900);}
  function playTone(freq=240,duration=.08,type='sine'){if(!soundOn||!audioReady)return;try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.035,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);}catch(_){}}
  function nearestTarget(actor,range=1){let best=null,bestD=Infinity;for(const f of fighters){if(f===actor||!f.alive)continue;const d=dist(actor,f);if(d<bestD&&d<=range){best=f;bestD=d;}}return best;}
  // Tile distance follows the four-way map geometry rather than screen pixels.
  function dist(a,b){return Math.max(Math.abs(tileX(a.x)-tileX(b.x)),Math.abs(tileY(a.y)-tileY(b.y)));}
  function tryStep(actor,dx,dy){
    if(!actor.alive||actor.stepCd>0||(!dx&&!dy))return false;
    if(dx&&dy){if(Math.abs(dx)>=Math.abs(dy))dy=0;else dx=0;}
    dx=Math.sign(dx);dy=Math.sign(dy);
    const col=tileX(actor.x)+dx,row=tileY(actor.y)+dy;
    if(col<2||col>GRID_COLS-3||row<2||row>GRID_ROWS-3)return false;
    if(fighters.some(other=>other!==actor&&other.alive&&tileX(other.x)===col&&tileY(other.y)===row))return false;
    actor.x=centerX(col);actor.y=centerY(row);actor.heading=dx<0?'W':dx>0?'E':dy<0?'N':'S';actor.dir=dx<0?-1:dx>0?1:actor.dir;
    actor.walk+=1;actor.stepCd=actor.slow>0?.25:(actor.stepInterval||.17);return true;
  }
  function logEvent(text){const log=$('battleLog');const empty=log.querySelector('.empty-log');if(empty)empty.remove();const node=document.createElement('div');node.className='log-entry';const t=String(Math.floor(elapsed)).padStart(2,'0');node.innerHTML=`<span class="log-time">${t}s</span>${text}`;log.prepend(node);while(log.children.length>5)log.lastElementChild.remove();}
  function feed(killer,victim){const feed=$('killFeed'),node=document.createElement('div');node.className='feed-line';node.innerHTML=`<span class="feed-gold">✦</span> <b>${killer.id==='player'?'Vos':names[killer.id]}</b><span> derrotó a </span><b>${victim.id==='player'?'vos':names[victim.id]}</b>`;feed.prepend(node);while(feed.children.length>3)feed.lastElementChild.remove();}
  function kill(victim,attacker){if(!victim.alive)return;victim.hp=0;victim.alive=false;victim.respawn=3.0;victim.block=false;if(attacker){attacker.kills++;feed(attacker,victim);const playerKill=attacker.id==='player';const victimPlayer=victim.id==='player';logEvent(playerKill?`<b>Conseguiste una baja</b> contra ${names[victim.id]}.`:victimPlayer?`<b>${names[attacker.id]}</b> te derrotó.`:`${names[attacker.id]} derrotó a ${names[victim.id]}.`);if(playerKill){playTone(480,.18,'triangle');toast('¡Baja conseguida!');}else playTone(150,.12,'sawtooth');}
    if(victim.id==='player'){invuln=0;toast('Caíste en combate. Volvés en un instante…');}
    refreshHud();if(attacker&&attacker.kills>=5)endMatch(attacker.id==='player');}
  function respawn(f){f.alive=true;f.hp=100;f.mana=74;f.slow=0;f.flash=.8;f.block=false;if(f.id==='player'){f.x=centerX(tileX(.49));f.y=centerY(tileY(.62));invuln=1.7;}else{f.x=centerX(Math.round(rand(5,18)));f.y=centerY(Math.round(rand(4,11)));}f.tx=f.x;f.ty=f.y;f.stepCd=.4;}
  function dealDamage(target,amount,attacker,kind){if(!target.alive)return;let dmg=amount;if(target.block)dmg*=.42;if(target.id==='player'&&invuln>0)dmg=0;target.hp=Math.max(0,target.hp-dmg);target.flash=.19;target.lastAttacker=attacker.id;target.cast=.33;target.castType=kind||'hit';if(target.hp<=0)kill(target,attacker);playTone(kind==='frost'?530:kind==='ult'?320:185,.07,'triangle');refreshHud();}
  function castSpell(index,actor=fighters[0],target=null){if(gameOver||paused||!actor.alive)return false;if(index<0||index>3)return false;const data=spellsData[index];if(actor.id==='player'&&cooldowns[index]>0){toast('Esa habilidad todavía está recargando');return false;}if(actor.mana<data.cost){if(actor.id==='player')toast('No tenés suficiente maná');return false;}if(!target)target=nearestTarget(actor,data.range);if(!target||!target.alive||target===actor||dist(actor,target)>data.range){if(actor.id==='player')toast('Ese rival está fuera de alcance');return false;}actor.mana-=data.cost;if(actor.id==='player')cooldowns[index]=data.cd;
    if(index===0){dealDamage(target,data.damage,actor,'slash');target.slow=Math.max(target.slow,.12);actor.cast=.2;actor.castType='slash';}
    if(index===1){dealDamage(target,data.damage,actor,'frost');target.slow=1.45;actor.cast=.45;actor.castType='frost';}
    if(index===2){const dx=tileX(target.x)-tileX(actor.x),dy=tileY(target.y)-tileY(actor.y);const sx=Math.abs(dx)>=Math.abs(dy)?Math.sign(dx):0,sy=sx?0:Math.sign(dy);tryStep(actor,sx,sy);dealDamage(target,data.damage,actor,'charge');actor.cast=.42;actor.castType='charge';}
    if(index===3){const victims=fighters.filter(f=>f!==actor&&f.alive&&f!==target&&dist(target,f)<=1);for(const f of victims)dealDamage(f,data.damage,actor,'ult');dealDamage(target,data.damage,actor,'ult');actor.cast=.6;actor.castType='ult';}
    if(actor.id==='player')playTone([300,650,400,220][index],.16,index===1?'sine':'triangle');refreshHud();return true;}
  function basicAttack(actor=fighters[0],target=null){if(!actor.alive||gameOver||paused)return false;if(actor.attackCd>0){if(actor.id==='player')toast('Esperá para volver a atacar');return false;}target=target||nearestTarget(actor,1);if(target&&target.alive&&target!==actor&&dist(actor,target)<=1){dealDamage(target,9,actor,'hit');actor.attackCd=.55;actor.heading=target.x<actor.x?'W':target.x>actor.x?'E':target.y<actor.y?'N':'S';actor.dir=target.x>=actor.x?1:-1;actor.cast=.17;actor.castType='slash';return true;}if(actor.id==='player')toast(actor.attackCd>0?'Esperá para volver a atacar':'Acercate a un rival');return false;}
  function usePotion(){const p=fighters[0];if(potionCd>0)return;if(potionCount<=0){toast('No te quedan pociones');return;}if(p.hp>=100&&p.mana>=100){toast('Ya estás en plena forma');return;}potionCount--;potionCd=1.2;p.hp=Math.min(100,p.hp+42);p.mana=Math.min(100,p.mana+36);playTone(620,.2,'sine');toast('Poción utilizada · +vida y maná');refreshHud();}
  function movePlayer(){
    const p=fighters[0];
    const x=clamp((keys.has('arrowright')?1:0)-(keys.has('arrowleft')?1:0)+joystick.dx,-1,1);
    const y=clamp((keys.has('arrowdown')?1:0)-(keys.has('arrowup')?1:0)+joystick.dy,-1,1);
    const magnitude=Math.hypot(x,y);
    p.stepInterval=.17/clamp(magnitude,.48,1);
    if(magnitude>.22)tryStep(p,x,y);
    p.block=blockHeld;
  }
  function stepToward(actor,target){
    const dx=tileX(target.x)-tileX(actor.x),dy=tileY(target.y)-tileY(actor.y);
    if(!dx&&!dy)return false;
    const first=Math.abs(dx)>=Math.abs(dy)?[Math.sign(dx),0]:[0,Math.sign(dy)];
    const second=first[0]?[0,Math.sign(dy)]:[Math.sign(dx),0];
    return tryStep(actor,...first)||tryStep(actor,...second);
  }
  let isTouch=false;
  function updateBots(dt){for(let i=1;i<fighters.length;i++){const f=fighters[i];if(!f.alive)continue;f.aiTimer-=dt;const target=nearestTarget(f,9);
      if(target){const d=dist(f,target);if(d>1)stepToward(f,target);else if(f.attackCd<=0){if(Math.random()<.28&&f.mana>24)castSpell(Math.random()<.7?1:0,f,target);else{basicAttack(f,target);f.attackCd=.7;}}
        if(f.aiTimer<=0){if(f.mana>47&&Math.random()<.08)castSpell(3,f,target);else if(f.mana>24&&Math.random()<.22)castSpell(1,f,target);else if(Math.random()<.19)castSpell(2,f,target);else if(d<=2)castSpell(0,f,target);f.aiTimer=rand(.55,1.35);}
      }else if(f.aiTimer<=0){f.tx=centerX(Math.round(rand(4,19)));f.ty=centerY(Math.round(rand(3,12)));f.aiTimer=rand(1.3,3);}
      if(!target&&dist(f,{x:f.tx,y:f.ty})>1)stepToward(f,{x:f.tx,y:f.ty});
    }}
  function update(dt){if(gameOver||paused)return;elapsed+=dt;remaining=Math.max(0,remaining-dt);const player=fighters[0];for(const f of fighters){f.stepCd=Math.max(0,f.stepCd-dt);if(f.attackCd>0)f.attackCd-=dt;if(f.slow>0)f.slow-=dt;if(f.flash>0)f.flash-=dt;if(f.cast>0)f.cast-=dt;if(!f.alive){f.respawn-=dt;if(f.respawn<=0)respawn(f);}else{f.mana=Math.min(100,f.mana+dt*2.7);}}movePlayer();updateBots(dt);
    cooldowns=cooldowns.map(v=>Math.max(0,v-dt));potionCd=Math.max(0,potionCd-dt);if(remaining===0)endMatch([...fighters].sort((a,b)=>b.kills-a.kills)[0]?.id==='player');refreshHud();}

  function draw(){ctx.clearRect(0,0,W,H);drawGround();drawDecor();drawRuneCircle();drawFighters();drawEffects();}
  function drawGround(){
    const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#506542');g.addColorStop(.47,'#3a4b33');g.addColorStop(1,'#293b2a');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    // subtle hand-painted pixel tiles
    const step=Math.max(21,Math.round(W/42));for(let y=0;y<H;y+=step){for(let x=0;x<W;x+=step){const n=((Math.floor(x/step)*17+Math.floor(y/step)*31)%13);ctx.fillStyle=n<3?'rgba(181,170,113,.055)':n<6?'rgba(13,25,15,.07)':'rgba(172,187,115,.025)';ctx.fillRect(x+1,y+1,step-2,step-2);if(n===0){ctx.fillStyle='rgba(195,183,120,.16)';ctx.fillRect(x+step*.28,y+step*.55,2,2);}}}
    // dark leafy edges and worn arena path
    ctx.fillStyle='rgba(19,31,20,.25)';ctx.beginPath();ctx.ellipse(W*.5,H*.52,W*.39,H*.43,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(199,180,123,.19)';ctx.lineWidth=1;ctx.setLineDash([3,5]);ctx.beginPath();ctx.ellipse(W*.5,H*.52,W*.385,H*.405,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    // scattered stones and grass flecks
    for(let i=0;i<36;i++){const x=((i*173+43)%997)/997*W,y=((i*257+19)%991)/991*H;ctx.fillStyle=i%2?'rgba(182,170,130,.26)':'rgba(15,26,17,.32)';ctx.fillRect(x,y,3+(i%3),2);}
    // old flagstones in center
    for(let row=0;row<4;row++)for(let col=0;col<5;col++){const x=W*(.39+col*.045)+(row%2)*5,y=H*(.44+row*.05);ctx.fillStyle='rgba(193,177,128,.08)';ctx.fillRect(x,y,W*.04,H*.043);ctx.strokeStyle='rgba(218,199,147,.07)';ctx.strokeRect(x,y,W*.04,H*.043);}
  }
  function drawTree(x,y,s,seed){const size=Math.min(W,H)*.06*s;ctx.save();ctx.translate(x,y);ctx.fillStyle='rgba(11,17,11,.34)';ctx.beginPath();ctx.ellipse(2,size*.55,size*.8,size*.24,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#594c35';ctx.fillRect(-size*.11,-size*.16,size*.22,size*.64);ctx.fillStyle='#293c2b';ctx.beginPath();ctx.moveTo(-size*.72,-size*.05);ctx.lineTo(0,-size*1.72);ctx.lineTo(size*.72,-size*.05);ctx.closePath();ctx.fill();ctx.fillStyle=seed>.5?'#40583a':'#496140';ctx.beginPath();ctx.moveTo(-size*.6,-size*.36);ctx.lineTo(0,-size*1.43);ctx.lineTo(size*.62,-size*.36);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(162,167,105,.18)';ctx.beginPath();ctx.moveTo(-size*.18,-size*1.22);ctx.lineTo(0,-size*1.58);ctx.lineTo(size*.2,-size*1.19);ctx.closePath();ctx.fill();ctx.restore();}
  function drawDecor(){const things=[...decor].sort((a,b)=>a.y-b.y);for(const d of things){const x=d.x*W,y=d.y*H;if(d.kind==='tree'){if((x>W*.08&&x<W*.92)&&(y>H*.11&&y<H*.9))continue;drawTree(x,y,d.s,d.seed);}else if(d.kind==='bush'){ctx.fillStyle='rgba(18,30,18,.28)';ctx.beginPath();ctx.ellipse(x,y+3,Math.min(W,H)*.035*d.s,Math.min(W,H)*.012*d.s,0,0,7);ctx.fill();ctx.fillStyle=d.seed>.5?'#30452d':'#3e522f';ctx.beginPath();ctx.arc(x,y,Math.min(W,H)*.019*d.s,0,Math.PI*2);ctx.fill();ctx.fillStyle='#637348';ctx.fillRect(x-2,y-2,3,2);}else{ctx.strokeStyle='rgba(147,159,99,.48)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-3*d.s,y-7*d.s);ctx.moveTo(x,y);ctx.lineTo(x+2*d.s,y-6*d.s);ctx.stroke();}}}
  function drawRuneCircle(){const x=W*.5,y=H*.53,rx=W*.125,ry=H*.15;ctx.save();ctx.strokeStyle='rgba(205,179,112,.16)';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(x,y,rx*.83,ry*.83,0,0,Math.PI*2);ctx.stroke();for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.fillStyle='rgba(212,186,120,.31)';ctx.save();ctx.translate(x+Math.cos(a)*rx,y+Math.sin(a)*ry);ctx.rotate(a);ctx.fillRect(-2,-2,4,4);ctx.restore();}ctx.restore();}
  function drawFighters(){const ordered=[...fighters].sort((a,b)=>a.y-b.y);for(const f of ordered)if(f.alive)drawFighter(f);}
  function drawFighter(f){const x=f.x*W,y=f.y*H,scale=Math.max(.7,Math.min(1.13,Math.min(W,H)/470)),c=colors[f.id],bob=Math.sin(f.walk)*1.5*scale;ctx.save();ctx.translate(x,y+bob);if(f.block)ctx.globalAlpha=.78;
    // shadow
    ctx.fillStyle='rgba(8,12,8,.47)';ctx.beginPath();ctx.ellipse(0,5*scale,13*scale,5*scale,0,0,Math.PI*2);ctx.fill();
    // target ring
    if(f.id==='player'||(nearestTarget(fighters[0],.18)===f)){ctx.strokeStyle=f.id==='player'?'rgba(223,192,117,.7)':'rgba(224,103,79,.62)';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,4*scale,15*scale,6*scale,0,0,Math.PI*2);ctx.stroke();}
    const dir=f.dir||1;ctx.scale(dir,1);
    // cloak, boots, tunic in low-res fantasy sprite style
    ctx.fillStyle=f.id==='player'?'#6c4931':f.id==='luna'?'#51436b':f.id==='bruno'?'#46583b':'#62482f';ctx.fillRect(-8*scale,-17*scale,16*scale,16*scale);ctx.fillStyle=f.id==='player'?'#9b7540':f.id==='luna'?'#9383b1':f.id==='bruno'?'#89935d':'#a4784f';ctx.fillRect(-6*scale,-17*scale,12*scale,11*scale);ctx.fillStyle='#d3c597';ctx.fillRect(-2*scale,-16*scale,4*scale,8*scale);ctx.fillStyle='#28251d';ctx.fillRect(-7*scale,-3*scale,5*scale,5*scale);ctx.fillRect(2*scale,-3*scale,5*scale,5*scale);
    // head and helm/hair
    ctx.fillStyle=f.id==='luna'?'#d6b3a0':'#cfa77e';ctx.fillRect(-5*scale,-25*scale,10*scale,9*scale);ctx.fillStyle=f.id==='player'?'#b8a468':f.id==='luna'?'#dbd6e7':f.id==='bruno'?'#8f774b':'#b0a78b';ctx.fillRect(-7*scale,-27*scale,14*scale,5*scale);ctx.fillRect(-5*scale,-30*scale,10*scale,4*scale);ctx.fillStyle='#30271f';ctx.fillRect(2*scale,-22*scale,2*scale,2*scale);
    // weapon / spell staff
    ctx.strokeStyle=f.id==='luna'?'#b3a0dd':'#bcb18e';ctx.lineWidth=2*scale;ctx.beginPath();ctx.moveTo(8*scale,-14*scale);ctx.lineTo(13*scale,-3*scale);ctx.stroke();ctx.fillStyle=c;ctx.fillRect(11*scale,-17*scale,4*scale,4*scale);
    if(f.block){ctx.strokeStyle='rgba(147,196,219,.75)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-13*scale,18*scale,-1.7,1.7);ctx.stroke();}
    // health bar
    ctx.scale(dir,1);ctx.fillStyle='rgba(12,16,12,.8)';ctx.fillRect(-14*scale,-39*scale,28*scale,5*scale);ctx.fillStyle=f.id==='player'?'#ba664c':'#9e6953';ctx.fillRect(-13*scale,-38*scale,26*scale*(f.hp/f.maxHp),3*scale);ctx.font=`${Math.round(8*scale)}px DM Sans`;ctx.textAlign='center';ctx.fillStyle=f.id==='player'?'#f4dda1':'#e0dfd0';ctx.fillText(f.id==='player'?'VOS':names[f.id].split(' ')[0],0,-43*scale);
    if(f.flash>0){ctx.globalCompositeOperation='screen';ctx.fillStyle=`rgba(255,235,180,${f.flash*1.8})`;ctx.fillRect(-9*scale,-29*scale,18*scale,32*scale);}
    ctx.restore();}
  function drawEffects(){for(const f of fighters){if(f.cast>0&&f.alive){const x=f.x*W,y=f.y*H,r=(1-f.cast/.6)*Math.min(W,H)*.16+9;ctx.save();ctx.globalAlpha=Math.min(.8,f.cast*2);ctx.strokeStyle=f.castType==='frost'?'#9bd8ed':f.castType==='ult'?'#e7c977':f.castType==='charge'?'#d8bd76':'#e7d29c';ctx.lineWidth=f.castType==='ult'?3:2;ctx.beginPath();ctx.arc(x,y-12,r,0,Math.PI*2);ctx.stroke();if(f.castType==='ult'){ctx.beginPath();ctx.arc(x,y-12,r*.65,0,Math.PI*2);ctx.stroke();}ctx.restore();}if(f.id==='player'&&invuln>0&&f.alive){ctx.strokeStyle='rgba(154,200,211,.5)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(f.x*W,f.y*H-13,22,0,Math.PI*2);ctx.stroke();}}}
  function refreshHud(){const p=fighters[0];$('healthBar').style.width=`${p.hp}%`;$('manaBar').style.width=`${p.mana}%`;$('playerKills').innerHTML=`${p.kills} <i>/ 5</i>`;$('rosterPlayerKills').textContent=p.kills;$('score-luna').textContent=fighters[1].kills;$('score-bruno').textContent=fighters[2].kills;$('score-mateo').textContent=fighters[3].kills;$('progressText').textContent=`${p.kills} / 5`;$('progressBar').style.width=`${Math.min(100,p.kills/5*100)}%`;$('timer').textContent=`${Math.floor(remaining/60).toString().padStart(2,'0')}:${Math.floor(remaining%60).toString().padStart(2,'0')}`;$('potionCount').textContent=potionCount;spells.forEach((s,i)=>{s.classList.toggle('cooling',cooldowns[i]>.01);s.classList.toggle('selected-spell',selectedSpell===i);s.dataset.cooldown=Math.ceil(cooldowns[i]);});for(const f of fighters){const row=document.querySelector(`[data-fighter="${f.id}"]`);if(row){row.classList.toggle('fighter-dead',!f.alive);row.classList.toggle('fighter-leading',f.kills>=3);}}}
  function endMatch(won){if(gameOver)return;gameOver=true;$('resultPanel').classList.remove('hidden');$('resultTitle').textContent=won?'VICTORIA':'FIN DE LA RONDA';$('resultTitle').style.color=won?'#e2c47e':'#c6c7b9';$('resultSub').textContent=won?'El Robledal recuerda tu nombre.':'La arena volverá a abrir sus puertas.';logEvent(won?'<b>Victoria.</b> El Robledal recuerda tu nombre.':'<b>La ronda terminó.</b>');playTone(won?660:160,.36,'triangle');}
  function resetGame(){for(let i=0;i<fighters.length;i++){const f=fighters[i],spots=[[.49,.62],[.31,.39],[.69,.4],[.72,.69]][i],x=centerX(tileX(spots[0])),y=centerY(tileY(spots[1]));Object.assign(f,{x,y,tx:x,ty:y,hp:100,mana:100,kills:0,alive:true,respawn:0,slow:0,block:false,flash:0,cast:0,stepCd:0,stepInterval:.17,attackCd:rand(.2,.8),aiTimer:rand(.2,1.3)});}cooldowns=[0,0,0,0];selectedSpell=null;keys.clear();blockHeld=false;setBlock(false);potionCount=2;potionCd=0;remaining=180;elapsed=0;gameOver=false;paused=false;invuln=0;$('resultPanel').classList.add('hidden');$('battleLog').innerHTML='<div class="empty-log">Las hazañas de la arena aparecerán aquí.</div>';$('killFeed').innerHTML='<div class="feed-line"><span class="feed-gold">✦</span> <b>La arena te espera</b><span>—</span> buena suerte, viajero.</div>';refreshHud();toast('Nueva partida · ¡que comience el combate!');}
  function setBlock(on){blockHeld=on;fighters[0].block=on;}
  function handleSpell(i){if(i<0||i>=spellsData.length)return;if(selectedSpell===i){selectedSpell=null;toast('Habilidad cancelada');}else{selectedSpell=i;toast(`${spellsData[i].name} seleccionada · hacé click en un rival`);}refreshHud();}
  window.addEventListener('pointerdown',()=>{audioReady=true;},{capture:true,once:true});
  window.addEventListener('keydown',e=>{audioReady=true;const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();if(key==='escape'){if(!$('helpModal').classList.contains('hidden'))$('helpModal').classList.add('hidden');else if(selectedSpell!==null){selectedSpell=null;refreshHud();toast('Habilidad cancelada');}else{paused=!paused;toast(paused?'Partida pausada':'Partida reanudada');}return;}if(keys.has(key))return;keys.add(key);if(key==='q')handleSpell(0);if(key==='w'&&!e.repeat)handleSpell(1);if(key==='e')handleSpell(2);if(key==='r')handleSpell(3);if(key==='1')usePotion();if(key===' ')setBlock(true);});
  window.addEventListener('keyup',e=>{const key=e.key.toLowerCase();keys.delete(key);if(key===' ')setBlock(false);});window.addEventListener('blur',()=>{keys.clear();setBlock(false);});
  canvas.addEventListener('pointerdown',e=>{const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;let target=null,best=Infinity;for(const f of fighters){if(f.id==='player'||!f.alive)continue;const d=Math.hypot(x-f.x*W,y-f.y*H);if(d<best){best=d;target=f;}}const hitRadius=Math.max(19,Math.min(34,Math.min(W,H)*.055));if(target&&best<=hitRadius){if(selectedSpell!==null){if(castSpell(selectedSpell,fighters[0],target)){selectedSpell=null;refreshHud();}}else basicAttack(fighters[0],target);}else if(selectedSpell!==null)toast('Hacé click sobre un rival');else toast('Hacé click sobre un rival para atacar');});
  canvas.addEventListener('contextmenu',e=>{e.preventDefault();if(selectedSpell!==null){selectedSpell=null;refreshHud();toast('Habilidad cancelada');}});
  for(const s of spells)s.addEventListener('pointerdown',e=>{e.preventDefault();handleSpell(Number(s.dataset.spell));});
  $('potionBtn').addEventListener('click',usePotion);$('blockBtn').addEventListener('pointerdown',()=>setBlock(true));$('blockBtn').addEventListener('pointerup',()=>setBlock(false));$('blockBtn').addEventListener('pointerleave',()=>setBlock(false));$('restartBtn').addEventListener('click',resetGame);$('playAgain').addEventListener('click',resetGame);
  $('soundToggle').addEventListener('click',()=>{soundOn=!soundOn;$('soundLabel').textContent=`SONIDO ${soundOn?'ON':'OFF'}`;$('soundIcon').textContent=soundOn?'♫':'♪';toast(soundOn?'Sonido activado':'Sonido desactivado');});
  $('helpBtn').addEventListener('click',()=>$('helpModal').classList.remove('hidden'));$('closeHelp').addEventListener('click',()=>$('helpModal').classList.add('hidden'));$('helpModal').addEventListener('click',e=>{if(e.target===$('helpModal'))$('helpModal').classList.add('hidden');});$('menuBtn').addEventListener('click',()=>{paused=!paused;toast(paused?'Partida pausada · tocá ☰ para volver':'Partida reanudada');});
  const joy=$('joystick'),knob=$('joyKnob');function joyMove(e){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=32,l=Math.hypot(dx,dy),k=Math.min(max,l),a=Math.atan2(dy,dx);joystick.dx=Math.cos(a)*k/max;joystick.dy=Math.sin(a)*k/max;knob.style.transform=`translate(${Math.cos(a)*k}px,${Math.sin(a)*k}px)`;}
  joy.addEventListener('pointerdown',e=>{e.preventDefault();isTouch=true;joystick.active=true;joystick.id=e.pointerId;joy.setPointerCapture(e.pointerId);joyMove(e);});joy.addEventListener('pointermove',e=>{if(joystick.active&&e.pointerId===joystick.id)joyMove(e);});const joyEnd=e=>{if(e.pointerId!==joystick.id)return;joystick.active=false;joystick.dx=joystick.dy=0;knob.style.transform='translate(0,0)';};joy.addEventListener('pointerup',joyEnd);joy.addEventListener('pointercancel',joyEnd);
  let previous=performance.now();function loop(now){const dt=Math.min(.05,(now-previous)/1000);previous=now;update(dt);draw();requestAnimationFrame(loop);}refreshHud();requestAnimationFrame(loop);
})();
