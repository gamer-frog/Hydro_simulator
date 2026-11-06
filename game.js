(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const frame = document.getElementById('gameFrame');
  const $ = id => document.getElementById(id);
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const MAP_URL = 'assets/ao/';
  const ACTORS = [
    { id: 'player', name: 'Viajero del Sur', team: 'sacred', className: 'warrior', body: 1, head: 1, x: 43, y: 46 },
    { id: 'sacredMage', name: 'Luna de Plata', team: 'sacred', className: 'mage', body: 2, head: 2, x: 43, y: 43 },
    { id: 'sacredCleric', name: 'Iria del Alba', team: 'sacred', className: 'cleric', body: 3, head: 3, x: 43, y: 49 },
    { id: 'sacredPaladin', name: 'Darian Luzfirme', team: 'sacred', className: 'paladin', body: 1, head: 4, x: 46, y: 46 },
    { id: 'chaoticWarrior', name: 'Krag Martillo', team: 'chaotic', className: 'warrior', body: 1, head: 1, x: 57, y: 46 },
    { id: 'chaoticMage', name: 'Neris Umbría', team: 'chaotic', className: 'mage', body: 2, head: 2, x: 57, y: 43 },
    { id: 'chaoticCleric', name: 'Vela Ceniza', team: 'chaotic', className: 'cleric', body: 3, head: 3, x: 57, y: 49 },
    { id: 'chaoticPaladin', name: 'Soren Quebrantahuesos', team: 'chaotic', className: 'paladin', body: 1, head: 4, x: 54, y: 46 }
  ];
  const HEADINGS = { N: 1, E: 2, S: 3, W: 4 };
  const DELTAS = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
  const PLAYER_DIRECTIONS = {
    arrowup: [0, -1], w: [0, -1],
    arrowright: [1, 0], d: [1, 0],
    arrowdown: [0, 1], s: [0, 1],
    arrowleft: [-1, 0], a: [-1, 0]
  };
  const names = Object.fromEntries(ACTORS.map(actor => [actor.id, actor.name]));
  // Prototype-only tuning placeholders; these are not official AO/AO Libre/Imperium values.
  const CLASS_PROFILES = {
    warrior: { label: 'GUERRERO', body: 1, head: 1, hp: 130, mana: 0, skills: [] },
    mage: { label: 'MAGO', body: 2, head: 2, hp: 100, mana: 150, skills: [
      { name: 'Inmo', icon: '❄', type: 'immobilize', cost: 24, duration: 1.15, range: 6, color: '#62d8ff' },
      { name: 'Remo', icon: '✧', type: 'remove', cost: 18, color: '#b895ff' },
      { name: 'Ráfaga ígnea', icon: '✹', type: 'damage', cost: 30, damage: [28, 38], range: 7, color: '#ff8559' }
    ] },
    cleric: { label: 'CLÉRIGO', body: 3, head: 3, hp: 115, mana: 120, skills: [
      { name: 'Remo', icon: '✧', type: 'remove', cost: 16, color: '#b895ff' },
      { name: 'Sanar aliado', icon: '✚', type: 'healAlly', cost: 22, heal: 34, color: '#8ee2a3' },
      { name: 'Curación', icon: '✚', type: 'healAlly', cost: 34, heal: 52, color: '#8ee2a3' }
    ] },
    paladin: { label: 'PALADÍN', body: 1, head: 4, hp: 125, mana: 90, skills: [
      { name: 'Inmo', icon: '❄', type: 'immobilize', cost: 22, duration: 1.1, range: 4, color: '#62d8ff' },
      { name: 'Golpe sagrado', icon: '⚔', type: 'damage', cost: 18, damage: [24, 34], range: 1, color: '#ffd36e' },
      { name: 'Remo', icon: '✧', type: 'remove', cost: 16, color: '#b895ff' }
    ] },
  };
  const STEP_DURATION = .115;
  const NPC_AIM_DURATION = .58;
  // Consumable values are prototype tuning placeholders, not published AO/Imperium data.
  const POTION_EFFECTS = { health: 45, mana: 35 };
  const potionInventory = { health: 3, mana: 3 };
  const images = new Map();
  let mapData, grhs, characters;
  let W = 800, H = 480, dpr = 1, tilePx = 32;
  let elapsed = 0, remaining = 180, gameOver = false, paused = false;
  const teamScores = { sacred: 0, chaotic: 0 };
  const TEAM_LABELS = { sacred: 'LEGIÓN SAGRADA', chaotic: 'LEGIÓN CAÓTICA' };
  const TEAM_COLORS = { sacred: '#69a9ff', chaotic: '#ff776d' };
  let selected = 'chaoticWarrior', selectedSkill = null, kills = 0, currentClass = 'warrior';
  let placingNpc = false, placementTile = null, pointerCanvas = null;
  const floatingTexts = [], spellEffects = [];
  let audioOn = true, audioReady = false, audioCtx;
  const keys = new Set();
  let joystickKey = null;
  const fighters = ACTORS.map((actor, index) => {
    const className = actor.className || 'warrior', profile = CLASS_PROFILES[className];
    return {
      ...actor, className, homeX: actor.x, homeY: actor.y,
      hp: profile.hp, maxHp: profile.hp, mana: profile.mana, maxMana: profile.mana,
      alive: true, kills: 0,
      heading: index === 1 ? 'W' : 'S', step: null, stepTime: 0, aiTimer: rand(.2, 1),
      attackCd: rand(.2, .8), flash: 0, respawn: 0, bodyFrameTime: Math.random() * 2, aim: null,
      immobilized: 0, retreatTimer: 0, retreatTargetId: null,
      skillCooldowns: Array(profile.skills.length).fill(0)
    };
  });
  const player = fighters[0];
  const byId = Object.fromEntries(fighters.map(actor => [actor.id, actor]));
  let lastToast = 0;

  function loadImage(id) {
    return new Promise(resolve => {
      const image = new Image();
      image.onload = () => {
        // AO's legacy indexed-color sheets use palette entry 0 (pure black) as transparency.
        // PNG palette exports lost that color key, so restore alpha before drawing them.
        const normalized = document.createElement('canvas');
        normalized.width = image.naturalWidth; normalized.height = image.naturalHeight;
        const sheet = normalized.getContext('2d', { willReadFrequently: true });
        sheet.drawImage(image, 0, 0);
        const pixels = sheet.getImageData(0, 0, normalized.width, normalized.height);
        for (let i = 0; i < pixels.data.length; i += 4) {
          if (pixels.data[i] === 0 && pixels.data[i + 1] === 0 && pixels.data[i + 2] === 0) pixels.data[i + 3] = 0;
        }
        sheet.putImageData(pixels, 0, 0);
        resolve([id, normalized]);
      };
      image.onerror = () => {
        console.warn(`No se pudo cargar assets/ao/graphics/${id}.png; se dibujará el mapa sin esa lámina.`);
        resolve([id, null]);
      };
      image.src = `${MAP_URL}graphics/${id}.png`;
    });
  }
  async function loadAssets() {
    try {
      [mapData, grhs, characters] = await Promise.all(['map.json', 'grhs.json', 'characters.json'].map(name => fetch(MAP_URL + name).then(response => {
        if (!response.ok) throw new Error(`Could not load ${name}: ${response.status}`);
        return response.json();
      })));
      const ids = [...new Set(Object.values(grhs).flatMap(def => def.image ? [def.image] : []))];
      const loaded = await Promise.all(ids.map(loadImage));
      for (const [id, image] of loaded) if (image) images.set(id, image);
      const missing = ids.length - images.size;
      if (missing) toast(`${missing} láminas de mapa no cargaron; el resto del mundo sigue disponible.`);
      const positions = [[43, 46], [44, 43], [43, 49], [46, 46], [57, 46], [56, 43], [57, 49], [54, 46]];
      fighters.forEach((actor, i) => { [actor.x, actor.y] = findOpen(positions[i][0], positions[i][1]); actor.homeX = actor.x; actor.homeY = actor.y; });
      refreshHud();
    } catch (error) {
      console.error(error);
      toast('No se pudieron cargar los datos del mundo. Revisá que el sitio esté servido por HTTP.');
    }
  }
  function resize() {
    const rect = frame.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    W = rect.width; H = rect.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tilePx = clamp(Math.min(W / 25, H / 16), 24, 40);
  }
  new ResizeObserver(resize).observe(frame);
  window.addEventListener('resize', resize);
  resize();

  function toast(message) {
    const el = $('toast'); el.textContent = message; el.classList.add('show');
    clearTimeout(lastToast); lastToast = setTimeout(() => el.classList.remove('show'), 1800);
  }
  function tone(freq = 220, duration = .08) {
    if (!audioOn || !audioReady) return;
    try {
      audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.frequency.value = freq; gain.gain.setValueAtTime(.035, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + duration);
      osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + duration);
    } catch (_) { /* Audio is optional. */ }
  }
  function findOpen(x, y) {
    if (!mapData) return [x, y];
    for (let radius = 0; radius < 10; radius++) {
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
        const tx = x + dx, ty = y + dy;
        if (isOpen(tx, ty) && !fighters.some(f => f.x === tx && f.y === ty)) return [tx, ty];
      }
    }
    return [x, y];
  }
  function isOpen(x, y) { return Boolean(mapData && x >= 0 && y >= 0 && x < mapData.width && y < mapData.height && !mapData.tiles[y][x].b); }
  function pos(actor) { return actor.step ? actor.step.from : [actor.x, actor.y]; }
  function actorTile(actor) { return actor.step ? actor.step.to : [actor.x, actor.y]; }
  function distance(a, b) { const [ax, ay] = actorTile(a), [bx, by] = actorTile(b); return Math.abs(ax - bx) + Math.abs(ay - by); }
  function occupied(x, y, except) { return fighters.some(actor => actor !== except && actor.alive && actorTile(actor)[0] === x && actorTile(actor)[1] === y); }
  function placementBlocked(x, y, except) {
    return fighters.some(actor => {
      if (actor === except || !actor.alive) return false;
      if (actor.step) return actor.step.from[0] === x && actor.step.from[1] === y || actor.step.to[0] === x && actor.step.to[1] === y;
      return actor.x === x && actor.y === y;
    });
  }
  function canPlaceNpcAt(x, y, actor = byId[$('npcPicker').value]) {
    return Boolean(actor && actor !== player && actor.alive && !actor.step && isOpen(x, y) && !placementBlocked(x, y, actor));
  }
  function startStep(actor, dx, dy) {
    if (!actor.alive || actor.immobilized > 0 || actor.step || (!dx && !dy)) return false;
    if (dx && dy) { if (Math.abs(dx) >= Math.abs(dy)) dy = 0; else dx = 0; }
    dx = Math.sign(dx); dy = Math.sign(dy);
    const [x, y] = actorTile(actor), nx = x + dx, ny = y + dy;
    if (!isOpen(nx, ny) || occupied(nx, ny, actor)) return false;
    actor.heading = dx < 0 ? 'W' : dx > 0 ? 'E' : dy < 0 ? 'N' : 'S';
    actor.step = { from: [x, y], to: [nx, ny] }; actor.stepTime = 0;
    return true;
  }
  function position(actor) {
    if (!actor.step) return [actor.x, actor.y];
    const t = clamp(actor.stepTime / STEP_DURATION, 0, 1), [x0, y0] = actor.step.from, [x1, y1] = actor.step.to;
    return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
  }
  function isAlly(a, b) { return Boolean(a && b && a.team === b.team); }
  function isEnemy(a, b) { return Boolean(a && b && a.team !== b.team); }
  function nearestEnemy(actor) {
    return fighters.filter(other => isEnemy(actor, other) && other.alive)
      .sort((a, b) => distance(actor, a) - distance(actor, b))[0] || null;
  }
  function nearestAllyNeedingHelp(actor, needsRemo = false) {
    return fighters.filter(other => isAlly(actor, other) && other.alive && other !== actor &&
      (needsRemo ? other.immobilized > 0 : other.hp < other.maxHp * .72))
      .sort((a, b) => distance(actor, a) - distance(actor, b))[0] || null;
  }
  function nextPathStep(actor, target) {
    const [sx, sy] = actorTile(actor), [tx, ty] = actorTile(target);
    const queue = [[sx, sy]], first = new Map([[`${sx},${sy}`, null]]);
    const directions = [[0, -1, 'N'], [1, 0, 'E'], [0, 1, 'S'], [-1, 0, 'W']];
    while (queue.length) {
      const [x, y] = queue.shift();
      if (Math.abs(x - tx) + Math.abs(y - ty) <= 1) {
        const key = `${x},${y}`, parent = first.get(key);
        if (!parent) return null;
        let step = key;
        while (first.get(step) !== `${sx},${sy}`) step = first.get(step);
        const [nx, ny] = step.split(',').map(Number);
        return [nx - sx, ny - sy];
      }
      for (const [dx, dy] of directions) {
        const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
        if (first.has(key) || !isOpen(nx, ny) || occupied(nx, ny, actor)) continue;
        first.set(key, `${x},${y}`); queue.push([nx, ny]);
      }
    }
    return null;
  }
  function retreatStep(actor, target) {
    const [x, y] = actorTile(actor), [tx, ty] = actorTile(target);
    const options = [[0, -1], [1, 0], [0, 1], [-1, 0]]
      .filter(([dx, dy]) => isOpen(x + dx, y + dy) && !occupied(x + dx, y + dy, actor))
      .map(([dx, dy]) => ({ dx, dy, distance: Math.abs(x + dx - tx) + Math.abs(y + dy - ty) }));
    const safest = Math.max(0, ...options.map(option => option.distance));
    const choices = options.filter(option => option.distance === safest);
    if (!choices.length || safest <= Math.abs(x - tx) + Math.abs(y - ty)) return null;
    const heading = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }[actor.heading];
    choices.sort((a, b) => Number(b.dx === -heading[0] && b.dy === -heading[1]) - Number(a.dx === -heading[0] && a.dy === -heading[1]));
    return [choices[0].dx, choices[0].dy];
  }
  function attack(actor = player, targetOverride = null) {
    if (gameOver || paused || !actor.alive || actor.attackCd > 0) return false;
    const target = targetOverride || byId[selected];
    if (!target || !target.alive || target === actor) { toast('Elegí un combatiente primero.'); return false; }
    const d = distance(actor, target);
    if (d > 1) { toast('Acercate al objetivo para atacar.'); return false; }
    actor.heading = actorTile(target)[0] < actorTile(actor)[0] ? 'W' : actorTile(target)[0] > actorTile(actor)[0] ? 'E' : actorTile(target)[1] < actorTile(actor)[1] ? 'N' : 'S';
    actor.attackCd = actor === player ? .62 : rand(.7, 1.05);
    actor.flash = .1;
    const damage = Math.ceil(rand(11, 18)); target.hp = Math.max(0, target.hp - damage); target.flash = .22;
    addFloatingText(target, `-${damage}`, 'damage');
    tone(155 + Math.random() * 50, .07);
    if (target.hp <= 0) kill(target, actor);
    refreshHud(); return true;
  }
  function addFloatingText(actor, text, kind) {
    const [x, y] = position(actor);
    floatingTexts.push({ x, y, text, kind, age: 0 });
  }
  function addFloatingTextAt(x, y, text, kind) {
    floatingTexts.push({ x, y, text, kind, age: 0 });
  }
  function beginNpcAim(actor, target, skill = null) {
    const [x, y] = actorTile(target), [fromX, fromY] = position(actor);
    actor.heading = x < actorTile(actor)[0] ? 'W' : x > actorTile(actor)[0] ? 'E' : y < actorTile(actor)[1] ? 'N' : 'S';
    const errorAngle = rand(0, Math.PI * 2), errorRadius = rand(0, skill ? .56 : .44);
    const duration = skill ? rand(.7, 1.05) : NPC_AIM_DURATION;
    actor.aim = {
      targetId: target.id, x, y, fromX, fromY,
      errorX: Math.cos(errorAngle) * errorRadius, errorY: Math.sin(errorAngle) * errorRadius,
      elapsed: 0, duration, remaining: duration,
      phase: rand(0, Math.PI * 2), cursorX: fromX, cursorY: fromY, skill
    };
    actor.attackCd = skill ? rand(1.2, 1.7) : rand(.85, 1.15);
  }
  function resolveNpcAim(actor) {
    const aim = actor.aim;
    actor.aim = null;
    if (!aim) return;
    const target = byId[aim.targetId];
    if (!actor.alive || !target?.alive) return;
    const [x, y] = position(target);
    if (Math.hypot(x - aim.cursorX, y - aim.cursorY) > .42) {
      addFloatingTextAt(aim.cursorX, aim.cursorY, x !== aim.x || y !== aim.y ? 'ESQUIVADO' : 'FALLÓ', 'miss');
      return;
    }
    actor.flash = .1;
    const skill = aim.skill;
    if (skill?.type === 'immobilize') {
      target.immobilized = skill.duration;
      addFloatingText(target, 'INMOVILIZADO', 'miss');
      spellEffects.push({ x: actor.x, y: actor.y, tx: x, ty: y, age: 0, duration: .42, kind: actor.className });
    } else {
      const damage = skill ? Math.ceil(rand(skill.damage[0], skill.damage[1])) : Math.ceil(rand(11, 18));
      target.hp = Math.max(0, target.hp - damage); target.flash = .22;
      addFloatingText(target, `-${damage}`, 'damage');
      spellEffects.push({ x: actor.x, y: actor.y, tx: x, ty: y, age: 0, duration: .42, kind: actor.className });
      if (target.hp <= 0) kill(target, actor);
    }
    tone(skill ? 470 : 155 + Math.random() * 50, .07);
    refreshHud();
  }
  function updateNpcAims(dt) {
    for (const actor of fighters.slice(1)) {
      const aim = actor.aim;
      if (!aim) continue;
      aim.elapsed += dt;
      aim.remaining = Math.max(0, aim.duration - aim.elapsed);
      const progress = clamp(aim.elapsed / aim.duration, 0, 1);
      const eased = progress * progress * (3 - 2 * progress);
      const endX = aim.x + aim.errorX, endY = aim.y + aim.errorY;
      const dx = endX - aim.fromX, dy = endY - aim.fromY, length = Math.hypot(dx, dy) || 1;
      const wobble = Math.sin(aim.elapsed * 13 + aim.phase) * Math.min(.2, length * .035) * Math.sin(Math.PI * progress);
      aim.cursorX = aim.fromX + dx * eased - dy / length * wobble;
      aim.cursorY = aim.fromY + dy * eased + dx / length * wobble;
      if (aim.remaining <= 0) resolveNpcAim(actor);
    }
  }
  function isSelfTarget(skill) { return skill?.type === 'heal' || skill?.type === 'remove'; }
  function selectSkill(index) {
    if (gameOver || paused || !player.alive) return;
    const skill = CLASS_PROFILES[currentClass].skills[index];
    if (!skill) return;
    selectedSkill = selectedSkill === index ? null : index;
    refreshSkillSelection();
  }
  function refreshSkillSelection() {
    document.querySelectorAll('.spell-slot').forEach((button, slot) => {
      button.classList.toggle('active-spell', slot === selectedSkill);
      button.setAttribute('aria-pressed', String(slot === selectedSkill));
    });
    const skill = selectedSkill === null ? null : CLASS_PROFILES[currentClass].skills[selectedSkill];
    const hint = skill ? (isSelfTarget(skill) ? 'hacé clic en tu personaje' : 'hacé clic en un rival') : 'Elegí un hechizo y hacé clic en un rival';
    $('spellHint').textContent = skill ? `${skill.name} listo · ${hint}` : hint;
    document.body.classList.toggle('aiming-spell', Boolean(skill));
  }
  function castSkill(index, targetOverride = null) {
    if (gameOver || paused || !player.alive) return;
    const skill = CLASS_PROFILES[currentClass].skills[index], target = targetOverride || byId[selected];
    const selfTarget = isSelfTarget(skill);
    if (!skill || !target || !target.alive || (selfTarget ? target !== player : target === player)) {
      toast(selfTarget ? 'Hacé clic en tu personaje.' : 'Elegí un rival como objetivo.'); return;
    }
    if (player.skillCooldowns[index] > 0) { toast('Esa habilidad todavía se está recuperando.'); return; }
    if (player.mana < skill.cost) { toast('No tenés maná suficiente.'); return; }
    if ((skill.type === 'damage' || skill.type === 'immobilize') && distance(player, target) > skill.range) { toast(`Acercate; alcance máximo: ${skill.range} casilleros.`); return; }
    if (skill.type === 'heal' && player.hp >= player.maxHp) { toast('Ya tenés toda la vida.'); return; }
    if (skill.type === 'remove' && player.immobilized <= 0) { toast('No estás inmovilizado.'); return; }
    player.mana -= skill.cost;
    player.skillCooldowns[index] = selfTarget ? 5 : 2.8 + index * .7;
    const [px, py] = position(player), [tx, ty] = position(target);
    if (skill.type === 'heal') {
      const restored = Math.min(skill.heal, player.maxHp - player.hp);
      player.hp += restored; player.flash = .2; addFloatingText(player, `+${restored}`, 'heal');
      spellEffects.push({ x: px, y: py, tx: px, ty: py, age: 0, duration: .65, kind: 'heal' });
      toast(`${skill.name}: recuperaste ${restored} de vida.`); tone(520, .15);
    } else if (skill.type === 'remove') {
      player.immobilized = 0;
      addFloatingText(player, 'LIBRE', 'heal');
      toast('Remo: ya podés volver a moverte.'); tone(520, .15);
    } else if (skill.type === 'immobilize') {
      target.immobilized = skill.duration; target.aim = null;
      addFloatingText(target, 'INMOVILIZADO', 'miss');
      spellEffects.push({ x: px, y: py, tx, ty, age: 0, duration: .42, kind: 'mage' });
      toast(`${skill.name}: ${target.name} queda inmovilizado.`); tone(620, .13);
    } else {
      const damage = Math.ceil(rand(skill.damage[0], skill.damage[1]));
      target.hp = Math.max(0, target.hp - damage); target.flash = .28;
      addFloatingText(target, `-${damage}`, 'damage');
      spellEffects.push({ x: px, y: py, tx, ty, age: 0, duration: .42, kind: currentClass });
      toast(`${skill.name} · ${damage} de daño a ${target.name}.`); tone(currentClass === 'mage' ? 620 : 340, .13);
      if (target.hp <= 0) kill(target, player);
    }
    selectedSkill = null; refreshSkillSelection();
    refreshHud();
  }
  function usePotion(type) {
    if (gameOver || paused || !player.alive) return;
    const count = potionInventory[type], resource = type === 'health' ? 'hp' : 'mana';
    const max = type === 'health' ? player.maxHp : player.maxMana;
    if (count <= 0) { toast(`No te quedan pociones ${type === 'health' ? 'rojas' : 'azules'}.`); return; }
    if (player[resource] >= max) { toast(`Ya tenés ${type === 'health' ? 'toda la vida' : 'todo el maná'}.`); return; }
    const restored = Math.min(POTION_EFFECTS[type], max - player[resource]);
    player[resource] += restored; potionInventory[type]--;
    addFloatingText(player, `+${restored}`, type === 'health' ? 'heal' : 'mana');
    player.flash = .18; tone(type === 'health' ? 510 : 390, .12);
    toast(`Poción ${type === 'health' ? 'roja' : 'azul'}: recuperaste ${restored} ${type === 'health' ? 'de vida' : 'de maná'}.`);
    refreshHud();
  }
  function applyClass(className) {
    currentClass = className in CLASS_PROFILES ? className : 'warrior';
    const profile = CLASS_PROFILES[currentClass];
    player.body = profile.body; player.head = profile.head; player.className = currentClass;
    player.maxHp = profile.hp; player.hp = profile.hp;
    player.maxMana = profile.mana; player.mana = profile.mana;
    player.skillCooldowns = Array(profile.skills.length).fill(0); selectedSkill = null;
    $('heroClass').textContent = profile.label;
    $('playerClassLabel').textContent = profile.label;
    renderSkills(); refreshSkillSelection(); refreshHud();
    toast(`Clase ${profile.label.toLowerCase()} seleccionada.`);
  }
  function renderSkills() {
    const slots = $('spellSlots');
    const skills = CLASS_PROFILES[currentClass].skills;
    slots.replaceChildren(...skills.map((skill, index) => {
      const button = document.createElement('button');
      button.className = 'spell-slot'; button.type = 'button'; button.dataset.skill = index;
      button.setAttribute('aria-pressed', 'false'); button.setAttribute('aria-label', `${index + 1}: ${skill.name}`);
      button.innerHTML = `<kbd>${index + 1}</kbd><b class="spell-icon"></b><span class="spell-name"></span><small class="spell-cost"></small>`;
      button.querySelector('.spell-icon').textContent = skill.icon;
      button.querySelector('.spell-name').textContent = skill.name;
      button.querySelector('.spell-cost').textContent = `${skill.cost} maná`;
      button.title = `${skill.name} · ${skill.cost} maná · ${skill.range ? `Alcance ${skill.range}` : 'acción propia'}`;
      button.addEventListener('click', () => selectSkill(index));
      return button;
    }));
  }
  function kill(victim, attacker) {
    victim.alive = false; victim.respawn = 2.4; victim.step = null; victim.aim = null;
    for (const actor of fighters) if (actor.aim?.targetId === victim.id) actor.aim = null;
    attacker.kills++;
    if (attacker === player) kills++;
    const feed = $('killFeed'), line = document.createElement('div'); line.className = 'feed-line';
    line.innerHTML = `<span class="feed-gold">✦</span> <b>${attacker === player ? 'Vos' : names[attacker.id]}</b><span> derrotó a </span><b>${victim === player ? 'vos' : names[victim.id]}</b>`;
    feed.prepend(line); while (feed.children.length > 3) feed.lastElementChild.remove();
    const log = $('battleLog'), entry = document.createElement('div'); entry.className = 'log-entry';
    entry.innerHTML = `<span class="log-time">${String(Math.floor(elapsed)).padStart(2, '0')}s</span> ${attacker === player ? '<b>Derrotaste</b>' : `<b>${names[attacker.id]}</b> derrotó a`} ${victim === player ? 'tu personaje' : names[victim.id]}.`;
    const empty = log.querySelector('.empty-log'); if (empty) empty.remove(); log.prepend(entry); while (log.children.length > 5) log.lastElementChild.remove();
    toast(victim === player ? 'Has caído. Regresarás al campo en un instante.' : attacker === player ? `Derrotaste a ${names[victim.id]}.` : `${names[victim.id]} cayó en combate.`);
    tone(victim === player ? 110 : 380, .17);
    if (kills >= 5) endMatch(true);
    refreshHud();
  }
  function respawn(actor) {
    const [x, y] = findOpen(actor.homeX, actor.homeY);
    Object.assign(actor, { x, y, hp: actor.maxHp, mana: actor.maxMana, alive: true, step: null, stepTime: 0, respawn: 0, flash: .6, attackCd: .7, aim: null, immobilized: 0, retreatTimer: 0, retreatTargetId: null, skillCooldowns: Array(CLASS_PROFILES[actor.className].skills.length).fill(0) });
  }
  function selectTarget(actor) {
    if (!actor || actor === player || !actor.alive) return;
    selected = actor.id; refreshHud();
  }
  function toggleScoreboard(force) {
    const panel = $('sidePanel'), button = $('scoreboardToggle');
    const open = typeof force === 'boolean' ? force : panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !open);
    $('arenaLayout').classList.toggle('scoreboard-open', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', `${open ? 'Ocultar' : 'Mostrar'} combatientes`);
  }
  function handleCanvasTarget(target) {
    if (!target) return;
    if (selectedSkill === null) {
      selectTarget(target);
      return;
    }
    const skill = CLASS_PROFILES[currentClass].skills[selectedSkill];
    if (isSelfTarget(skill)) {
      if (target === player) castSkill(selectedSkill, player);
      else toast(`${skill.name} se usa sobre tu personaje; hacé clic en vos.`);
      return;
    }
    if (target === player) { toast('Elegí un rival como objetivo.'); return; }
    selected = target.id;
    castSkill(selectedSkill, target);
  }
  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * W / rect.width, y: (event.clientY - rect.top) * H / rect.height };
  }
  function setPlacementMode(enabled) {
    placingNpc = Boolean(enabled);
    placementTile = null;
    $('npcPlaceToggle').setAttribute('aria-pressed', String(placingNpc));
    $('npcPlaceToggle').classList.toggle('active', placingNpc);
    $('npcPicker').classList.toggle('hidden', !placingNpc);
    canvas.classList.toggle('placing-npc', placingNpc);
    if (placingNpc) toast(`Ubicación activa · elegí una casilla libre para ${byId[$('npcPicker').value].name}.`);
  }
  function updatePointer(event) {
    pointerCanvas = canvasPoint(event);
    if (placingNpc) {
      const [cx, cy] = position(player);
      const x = Math.round((pointerCanvas.x - W / 2) / tilePx + cx);
      const y = Math.round((pointerCanvas.y - H / 2) / tilePx + cy);
      placementTile = { x, y, valid: canPlaceNpcAt(x, y) };
    }
  }
  function placeNpc() {
    const actor = byId[$('npcPicker').value];
    if (!placementTile || !canPlaceNpcAt(placementTile.x, placementTile.y, actor)) {
      toast('Casilla ocupada, bloqueada o NPC en movimiento. Elegí otra.');
      return;
    }
    const { x, y } = placementTile;
    Object.assign(actor, { x, y, homeX: x, homeY: y, step: null, stepTime: 0, aim: null, immobilized: 0 });
    selected = actor.id;
    setPlacementMode(false);
    refreshHud();
    toast(`${actor.name} ubicado en ${x + 1}, ${y + 1}.`);
  }
  function clearJoystick() {
    if (joystickKey) keys.delete(joystickKey);
    joystickKey = null;
    const knob = $('joyKnob');
    if (knob) knob.style.transform = '';
  }
  function updateJoystick(event) {
    const joy = $('joystick'), knob = $('joyKnob');
    if (!joy || !knob) return;
    const rect = joy.getBoundingClientRect(), dx = event.clientX - (rect.left + rect.width / 2), dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy), radius = rect.width * .32, scale = length > radius ? radius / length : 1;
    knob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
    if (joystickKey) keys.delete(joystickKey);
    joystickKey = length < 12 ? null : Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'arrowleft' : 'arrowright') : (dy < 0 ? 'arrowup' : 'arrowdown');
    if (joystickKey) keys.add(joystickKey);
  }
  function updatePlayer() {
    if (player.step) return;
    // Use only the most recently pressed direction: holding two keys never creates a diagonal.
    const key = [...keys].reverse().find(pressed => PLAYER_DIRECTIONS[pressed]);
    if (key) startStep(player, ...PLAYER_DIRECTIONS[key]);
  }
  function updateBots(dt) {
    for (const actor of fighters.slice(1)) {
      if (!actor.alive || actor.step) continue;
      actor.aiTimer -= dt;
      const profile = CLASS_PROFILES[actor.className];
      const removeIndex = profile.skills.findIndex((skill, i) => skill.type === 'remove' && actor.mana >= skill.cost && actor.skillCooldowns[i] <= 0);
      if (actor.immobilized > 0 && removeIndex >= 0) {
        const skill = profile.skills[removeIndex];
        actor.mana -= skill.cost; actor.skillCooldowns[removeIndex] = 5; actor.immobilized = 0;
        addFloatingText(actor, 'REMO', 'heal'); actor.flash = .2; tone(520, .15);
        continue;
      }
      if (actor.aim) continue;
      const heal = profile.skills.find((skill, i) => skill.type === 'heal' && actor.hp < actor.maxHp * .58 && actor.mana >= skill.cost && actor.skillCooldowns[i] <= 0);
      if (heal && actor.attackCd <= 0) {
        const index = profile.skills.indexOf(heal), restored = Math.min(heal.heal, actor.maxHp - actor.hp);
        actor.mana -= heal.cost; actor.hp += restored; actor.skillCooldowns[index] = 6;
        addFloatingText(actor, `+${restored}`, 'heal'); actor.flash = .2; actor.attackCd = rand(1.5, 2.2);
        continue;
      }
      const target = nearestEnemy(actor);
      if (!target) continue;
      const d = distance(actor, target);
      const ranged = profile.skills.map((skill, index) => ({ skill, index }))
        .filter(({ skill, index }) => (skill.type === 'damage' || skill.type === 'immobilize') && skill.range > 1 && d <= skill.range && actor.mana >= skill.cost && actor.skillCooldowns[index] <= 0);
      if (ranged.length && actor.attackCd <= 0 && Math.random() < .58) {
        const { skill, index } = ranged[Math.floor(Math.random() * ranged.length)];
        actor.mana -= skill.cost; actor.skillCooldowns[index] = rand(4, 7);
        beginNpcAim(actor, target, skill); continue;
      }
      const prefersDistance = actor.className === 'mage' || actor.className === 'ranger';
      const shouldRetreat = (prefersDistance && d <= 1) || (actor.hp <= actor.maxHp * .32 && d <= 2);
      if (shouldRetreat && actor.retreatTimer <= 0) {
        const step = retreatStep(actor, target);
        if (step) {
          startStep(actor, step[0], step[1]);
          actor.retreatTimer = .55; actor.retreatTargetId = target.id;
          actor.aiTimer = rand(.14, .24);
          continue;
        }
      }
      if (d <= 1) {
        if (actor.attackCd <= 0) beginNpcAim(actor, target);
      } else if (actor.aiTimer <= 0) {
        let step = nextPathStep(actor, target);
        if (step && Math.random() < .16) {
          const sideways = [[step[1], -step[0]], [-step[1], step[0]]].sort(() => Math.random() - .5);
          const detour = sideways.find(([dx, dy]) => isOpen(actor.x + dx, actor.y + dy) && !occupied(actor.x + dx, actor.y + dy, actor));
          if (detour) step = detour;
        }
        if (step) startStep(actor, step[0], step[1]);
        actor.aiTimer = rand(.16, .34);
      }
    }
  }
  function update(dt) {
    if (!mapData || gameOver || paused) return;
    elapsed += dt; remaining = Math.max(0, remaining - dt);
    for (const actor of fighters) {
      if (actor.attackCd > 0) actor.attackCd -= dt;
      if (actor.retreatTimer > 0) {
        actor.retreatTimer = Math.max(0, actor.retreatTimer - dt);
        if (actor.retreatTimer === 0) actor.retreatTargetId = null;
      }
      if (actor.flash > 0) actor.flash -= dt;
      actor.skillCooldowns = actor.skillCooldowns.map(value => Math.max(0, value - dt));
      actor.immobilized = Math.max(0, actor.immobilized - dt);
      if (actor.step) {
        actor.stepTime += dt;
        if (actor.stepTime >= STEP_DURATION) { [actor.x, actor.y] = actor.step.to; actor.step = null; actor.stepTime = 0; }
      }
      if (!actor.alive) { actor.respawn -= dt; if (actor.respawn <= 0) respawn(actor); }
    }
    for (const text of floatingTexts) text.age += dt;
    for (const effect of spellEffects) effect.age += dt;
    while (floatingTexts.length && floatingTexts[0].age > 1.05) floatingTexts.shift();
    while (spellEffects.length && spellEffects[0].age > spellEffects[0].duration) spellEffects.shift();
    updatePlayer(); updateNpcAims(dt); updateBots(dt);
    if (remaining <= 0) endMatch(false);
    refreshHud();
  }

  function resolveGrh(id, now, animate = true) {
    let def = grhs[String(id)];
    if (!def) return null;
    if (def.frames) {
      const index = animate ? Math.floor(now / Math.max(1, def.speed)) % def.frames.length : 0;
      def = grhs[String(def.frames[index])];
    }
    if (!def || !def.image) return null;
    return { image: images.get(def.image), def };
  }
  function screenTile(x, y, cameraX, cameraY) {
    return [W / 2 + (x - cameraX) * tilePx - tilePx / 2, H / 2 + (y - cameraY) * tilePx - tilePx / 2];
  }
  function drawGrh(id, x, y, now, animate = true) {
    const frameData = resolveGrh(id, now, animate);
    if (!frameData || !frameData.image) return;
    const { image, def } = frameData, width = def.w * tilePx / 32, height = def.h * tilePx / 32;
    ctx.drawImage(image, def.x, def.y, def.w, def.h, x + (tilePx - width) / 2, y + tilePx - height, width, height);
  }
  function visibleRange(cameraX, cameraY) {
    return {
      minX: Math.max(0, Math.floor(cameraX - W / tilePx / 2) - 2),
      maxX: Math.min(mapData.width - 1, Math.ceil(cameraX + W / tilePx / 2) + 2),
      minY: Math.max(0, Math.floor(cameraY - H / tilePx / 2) - 3),
      maxY: Math.min(mapData.height - 1, Math.ceil(cameraY + H / tilePx / 2) + 2)
    };
  }
  function drawGround(range, now, cameraX, cameraY) {
    for (let y = range.minY; y <= range.maxY; y++) for (let x = range.minX; x <= range.maxX; x++) {
      const [sx, sy] = screenTile(x, y, cameraX, cameraY), layers = mapData.tiles[y][x].g;
      if (layers[0]) drawGrh(layers[0], sx, sy, now);
      if (layers[1]) drawGrh(layers[1], sx, sy, now);
    }
  }
  function drawCharacter(actor, now, cameraX, cameraY) {
    if (!actor.alive) return;
    const [x, y] = position(actor), [sx, sy] = screenTile(x, y, cameraX, cameraY);
    const body = characters.bodies[String(actor.body)], head = characters.heads[String(actor.head)];
    if (!body || !head) return;
    const facing = HEADINGS[actor.heading], bodyId = body[`Walk${facing}`], headId = head[`Head${facing}`];
    if (actor === byId[selected]) {
      ctx.fillStyle = 'rgba(230,194,115,.20)'; ctx.beginPath(); ctx.ellipse(sx + tilePx / 2, sy + tilePx * .88, tilePx * .34, tilePx * .12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(245,211,137,.72)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(sx + tilePx / 2, sy + tilePx * .88, tilePx * .36, tilePx * .13, 0, 0, Math.PI * 2); ctx.stroke();
    }
    drawGrh(bodyId, sx, sy, now, true);
    drawGrh(headId, sx + (body.HeadOffsetX || 0) * tilePx / 32, sy + (body.HeadOffsetY || 0) * tilePx / 32, now, false);
    const labelY = sy + tilePx + 12, label = actor === player ? 'Viajero del Sur' : actor.name;
    ctx.save(); ctx.textAlign = 'center'; ctx.font = `600 ${Math.max(8, tilePx * .25)}px DM Sans, sans-serif`;
    ctx.fillStyle = actor === player ? '#f5dc9d' : '#f1ead3'; ctx.shadowColor = '#10130e'; ctx.shadowBlur = 4;
    ctx.fillText(label, sx + tilePx / 2, labelY, tilePx * 2.8);
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(13,16,12,.82)'; ctx.fillRect(sx + tilePx * .14, labelY + 3, tilePx * .72, 3);
    ctx.fillStyle = actor.hp > 35 ? '#8bb46c' : '#c96152'; ctx.fillRect(sx + tilePx * .14, labelY + 3, tilePx * .72 * actor.hp / actor.maxHp, 3);
    if (actor.flash > 0) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,235,180,${actor.flash * 1.5})`; ctx.fillRect(sx, sy - tilePx, tilePx, tilePx * 2); }
    ctx.restore();
  }
  function drawWorldLayer(range, now, cameraX, cameraY) {
    const actorsAt = new Map();
    for (const actor of fighters) if (actor.alive) {
      const [x, y] = position(actor), key = `${Math.floor(y)},${Math.floor(x)}`;
      if (!actorsAt.has(key)) actorsAt.set(key, []); actorsAt.get(key).push(actor);
    }
    for (let y = range.minY; y <= range.maxY; y++) for (let x = range.minX; x <= range.maxX; x++) {
      const [sx, sy] = screenTile(x, y, cameraX, cameraY), layers = mapData.tiles[y][x].g;
      if (layers[2]) drawGrh(layers[2], sx, sy, now);
      for (const actor of actorsAt.get(`${y},${x}`) || []) drawCharacter(actor, now, cameraX, cameraY);
    }
    for (let y = range.minY; y <= range.maxY; y++) for (let x = range.minX; x <= range.maxX; x++) {
      const id = mapData.tiles[y][x].g[3];
      if (id) { const [sx, sy] = screenTile(x, y, cameraX, cameraY); drawGrh(id, sx, sy, now); }
    }
  }
  function drawCombatEffects(cameraX, cameraY, now) {
    const aimColors = ['#ff685b', '#64d8d0', '#e8b75f'];
    for (const [index, actor] of fighters.slice(1).entries()) {
      const aim = actor.aim;
      if (!aim) continue;
      const [fromX, fromY] = screenTile(aim.fromX, aim.fromY, cameraX, cameraY);
      const [sx, sy] = screenTile(aim.cursorX, aim.cursorY, cameraX, cameraY);
      const x = sx + tilePx / 2, y = sy + tilePx / 2;
      const color = aimColors[index % aimColors.length];
      const pulse = .5 + Math.sin(now / 90 + aim.phase) * .16;
      ctx.save(); ctx.globalAlpha = .72 + pulse * .28;
      ctx.strokeStyle = color; ctx.fillStyle = color;
      ctx.lineWidth = Math.max(2, tilePx * .055); ctx.shadowColor = color; ctx.shadowBlur = tilePx * .3;
      ctx.beginPath(); ctx.moveTo(fromX + tilePx / 2, fromY + tilePx / 2); ctx.lineTo(x, y); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, tilePx * (.27 + pulse * .035), 0, Math.PI * 2); ctx.stroke();
      const arm = tilePx * .42, gap = tilePx * .17;
      ctx.beginPath();
      ctx.moveTo(x - arm, y); ctx.lineTo(x - gap, y); ctx.moveTo(x + gap, y); ctx.lineTo(x + arm, y);
      ctx.moveTo(x, y - arm); ctx.lineTo(x, y - gap); ctx.moveTo(x, y + gap); ctx.lineTo(x, y + arm); ctx.stroke();
      ctx.shadowBlur = 4; ctx.textAlign = 'center'; ctx.font = `700 ${Math.max(9, tilePx * .27)}px DM Sans, sans-serif`;
      ctx.fillStyle = '#fff0d4'; ctx.fillText(`${actor.name.split(' ')[0]} · ${aim.skill ? 'APUNTANDO HECHIZO' : 'APUNTANDO'}`, x, sy - 4);
      ctx.restore();
    }
    if (placingNpc && placementTile) {
      const [sx, sy] = screenTile(placementTile.x, placementTile.y, cameraX, cameraY);
      ctx.save(); ctx.fillStyle = placementTile.valid ? 'rgba(144,205,111,.22)' : 'rgba(220,91,76,.22)';
      ctx.strokeStyle = placementTile.valid ? '#a9df83' : '#f08070'; ctx.lineWidth = 2;
      ctx.fillRect(sx + 2, sy + 2, tilePx - 4, tilePx - 4); ctx.strokeRect(sx + 2, sy + 2, tilePx - 4, tilePx - 4);
      ctx.restore();
    } else if (pointerCanvas && !paused && !gameOver) {
      const hovered = actorAtPointer(pointerCanvas.x, pointerCanvas.y);
      if (hovered && hovered !== player) {
        const [sx, sy] = screenTile(...position(hovered), cameraX, cameraY);
        ctx.save(); ctx.strokeStyle = selectedSkill === null ? 'rgba(235,211,153,.75)' : 'rgba(255,230,167,.95)';
        ctx.lineWidth = Math.max(1.5, tilePx * .055); ctx.setLineDash([tilePx * .12, tilePx * .1]);
        ctx.beginPath(); ctx.ellipse(sx + tilePx / 2, sy + tilePx * .88, tilePx * .43, tilePx * .17, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
    for (const effect of spellEffects) {
      const progress = effect.age / effect.duration;
      const [x0, y0] = screenTile(effect.x, effect.y, cameraX, cameraY);
      const [x1, y1] = screenTile(effect.tx, effect.ty, cameraX, cameraY);
      const x = x0 + tilePx / 2 + (x1 - x0) * progress;
      const y = y0 + tilePx / 2 + (y1 - y0) * progress;
      ctx.save(); ctx.globalAlpha = 1 - progress;
      ctx.fillStyle = effect.kind === 'heal' ? '#9ee68b' : effect.kind === 'mage' ? '#ff9a54' : effect.kind === 'ranger' ? '#c9e177' : '#f4df9b';
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = tilePx * .55;
      ctx.beginPath(); ctx.arc(x, y, tilePx * (.1 + progress * .23), 0, Math.PI * 2); ctx.fill();
      if (effect.kind !== 'heal') {
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = Math.max(2, tilePx * .06);
        ctx.beginPath(); ctx.moveTo(x0 + tilePx / 2, y0 + tilePx / 2); ctx.lineTo(x, y); ctx.stroke();
      }
      ctx.restore();
    }
    for (const item of floatingTexts) {
      const [sx, sy] = screenTile(item.x, item.y, cameraX, cameraY), progress = item.age / 1.05;
      ctx.save(); ctx.globalAlpha = Math.min(1, (1 - progress) * 2.5);
      ctx.textAlign = 'center'; ctx.font = `800 ${Math.max(14, tilePx * .48)}px DM Sans, sans-serif`;
      ctx.fillStyle = item.kind === 'heal' ? '#9fe58e' : item.kind === 'miss' ? '#ffd27a' : '#ff8274'; ctx.shadowColor = '#11150f'; ctx.shadowBlur = 5;
      ctx.fillText(item.text, sx + tilePx / 2, sy - tilePx * .18 - progress * tilePx * .8);
      ctx.restore();
    }
  }
  function drawUserCursor() {
    if (!pointerCanvas || placingNpc) return;
    const { x, y } = pointerCanvas;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = '#080b07'; ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.moveTo(1, 1); ctx.lineTo(1, 19); ctx.lineTo(6, 14); ctx.lineTo(10, 23);
    ctx.lineTo(14, 21); ctx.lineTo(10, 12); ctx.lineTo(18, 12); ctx.closePath();
    ctx.fillStyle = '#fff3cf'; ctx.fill();
    ctx.strokeStyle = '#171a13'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = '#d5ae66'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (!mapData) {
      ctx.fillStyle = '#182116'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#e5d5a5'; ctx.textAlign = 'center';
      ctx.font = '14px DM Sans'; ctx.fillText('Cargando el mundo de Argentum Online…', W / 2, H / 2); return;
    }
    const [cx, cy] = position(player), now = performance.now();
    const range = visibleRange(cx, cy);
    ctx.imageSmoothingEnabled = false;
    drawGround(range, now, cx, cy); drawWorldLayer(range, now, cx, cy); drawCombatEffects(cx, cy, now); drawUserCursor();
  }
  function refreshHud() {
    if (!player) return;
    $('healthBar').style.width = `${player.hp / player.maxHp * 100}%`;
    $('healthValue').textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
    $('manaBar').style.width = `${player.maxMana ? player.mana / player.maxMana * 100 : 0}%`;
    $('manaValue').textContent = player.maxMana ? `${Math.floor(player.mana)} / ${player.maxMana}` : '—';
    $('healthPotionCount').textContent = potionInventory.health;
    $('manaPotionCount').textContent = potionInventory.mana;
    $('healthPotion').disabled = !player.alive || potionInventory.health <= 0 || player.hp >= player.maxHp;
    $('manaPotion').disabled = !player.alive || potionInventory.mana <= 0 || player.mana >= player.maxMana;
    document.querySelectorAll('.spell-slot').forEach((button, index) => {
      const skill = CLASS_PROFILES[currentClass].skills[index], cooldown = player.skillCooldowns[index];
      button.disabled = !player.alive;
      button.classList.toggle('unavailable', player.mana < skill.cost);
      button.classList.toggle('cooling', cooldown > 0);
      button.querySelector('.spell-cost').textContent = cooldown > 0 ? `${cooldown.toFixed(1)}s` : `${skill.cost} maná`;
    });
    $('playerKills').innerHTML = `${kills} <i>/ 5</i>`; $('rosterPlayerKills').textContent = kills;
    $('score-luna').textContent = byId.luna.kills; $('score-bruno').textContent = byId.bruno.kills; $('score-mateo').textContent = byId.mateo.kills;
    $('progressText').textContent = `${kills} / 5`; $('progressBar').style.width = `${Math.min(100, kills / 5 * 100)}%`;
    $('timer').textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(Math.floor(remaining % 60)).padStart(2, '0')}`;
    const target = byId[selected]; $('targetName').textContent = target?.alive ? target.name : 'Sin objetivo';
    $('targetStatus').textContent = target?.alive ? `${Math.round(target.hp)}% · ${distance(player, target) <= 1 ? 'AL ALCANCE' : 'FUERA DE ALCANCE'}` : 'Seleccioná un combatiente';
    $('attackBtn').disabled = !target?.alive || distance(player, target) > 1 || player.attackCd > 0;
    for (const actor of fighters) {
      const row = document.querySelector(`[data-fighter="${actor.id}"]`);
      if (row) { row.classList.toggle('fighter-dead', !actor.alive); row.classList.toggle('fighter-leading', actor === player && kills >= 3); row.classList.toggle('targeted', actor.id === selected); }
    }
  }
  function endMatch(won) {
    if (gameOver) return; gameOver = true;
    $('resultPanel').classList.remove('hidden'); $('resultTitle').textContent = won ? 'VICTORIA' : 'FIN DE LA RONDA';
    $('resultTitle').style.color = won ? '#e2c47e' : '#c6c7b9';
    $('resultSub').textContent = won ? 'La arena reconoce tu victoria.' : 'La arena volverá a abrir sus puertas.';
  }
  function resetGame() {
    for (const actor of fighters) Object.assign(actor, { x: actor.homeX, y: actor.homeY, hp: actor === player ? player.maxHp : actor.maxHp, mana: actor === player ? player.maxMana : actor.maxMana, alive: true, kills: 0, step: null, stepTime: 0, respawn: 0, flash: 0, attackCd: rand(.2, .8), aiTimer: rand(.2, 1), aim: null, immobilized: 0, retreatTimer: 0, retreatTargetId: null, skillCooldowns: Array(CLASS_PROFILES[actor.className].skills.length).fill(0) });
    potionInventory.health = 3; potionInventory.mana = 3;
    floatingTexts.length = 0; spellEffects.length = 0;
    selected = 'luna'; selectedSkill = null; kills = 0; remaining = 180; elapsed = 0; gameOver = false; paused = false; keys.clear();
    refreshSkillSelection();
    $('resultPanel').classList.add('hidden'); $('battleLog').innerHTML = '<div class="empty-log">Las hazañas de la arena aparecerán aquí.</div>';
    $('killFeed').innerHTML = '<div class="feed-line"><span class="feed-gold">✦</span> <b>La arena te espera</b><span>—</span> buena suerte, viajero.</div>';
    refreshHud(); toast('Nueva ronda · elegí un objetivo y luchá.');
  }
  function togglePause() { paused = !paused; toast(paused ? 'Partida pausada' : 'Partida reanudada'); }
  function actorAtPointer(x, y) {
    const [cx, cy] = position(player), range = visibleRange(cx, cy); let best = null, bestScore = Infinity;
    for (const actor of fighters) {
      if (!actor.alive) continue;
      const [ax, ay] = position(actor), [sx, sy] = screenTile(ax, ay, cx, cy);
      if (x >= sx - 5 && x <= sx + tilePx + 5 && y >= sy - tilePx * 1.2 && y <= sy + tilePx) {
        const score = Math.hypot(x - (sx + tilePx / 2), y - (sy + tilePx / 2)); if (score < bestScore) { best = actor; bestScore = score; }
      }
    }
    return best;
  }
  window.addEventListener('pointerdown', () => { audioReady = true; }, { once: true });
  window.addEventListener('keydown', event => {
    audioReady = true; const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
    if (key === 'escape') {
      if (placingNpc) setPlacementMode(false);
      else if (!$('helpModal').classList.contains('hidden')) $('helpModal').classList.add('hidden');
      else if (!$('sidePanel').classList.contains('hidden')) toggleScoreboard(false);
      else togglePause();
      return;
    }
    if (key === 'enter' || key === 'f') { event.preventDefault(); attack(); return; }
    const skillIndex = Number(key) - 1;
    if (Number.isInteger(skillIndex) && skillIndex >= 0 && skillIndex < CLASS_PROFILES[currentClass].skills.length) { selectSkill(skillIndex); return; }
    if (key === 'q') { usePotion('health'); return; }
    if (key === 'e') { usePotion('mana'); return; }
    if (key === 'tab') { event.preventDefault(); const next = fighters.filter(f => f !== player && f.alive); if (next.length) selectTarget(next[(next.findIndex(f => f.id === selected) + 1) % next.length]); return; }
    keys.add(key);
  });
  window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => { keys.clear(); clearJoystick(); });
  canvas.addEventListener('pointermove', updatePointer);
  canvas.addEventListener('pointerleave', () => { pointerCanvas = null; placementTile = null; });
  canvas.addEventListener('pointerdown', event => {
    pointerCanvas = canvasPoint(event);
    if (placingNpc) { updatePointer(event); placeNpc(); return; }
    const target = actorAtPointer(pointerCanvas.x, pointerCanvas.y);
    if (target) handleCanvasTarget(target);
  });
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  $('npcPlaceToggle').addEventListener('click', () => {
    if (gameOver || paused) { toast('Reanudá o reiniciá la partida para ubicar NPCs.'); return; }
    setPlacementMode(!placingNpc);
  });
  $('npcPicker').addEventListener('change', () => {
    if (pointerCanvas) {
      const [cx, cy] = position(player);
      const x = Math.round((pointerCanvas.x - W / 2) / tilePx + cx);
      const y = Math.round((pointerCanvas.y - H / 2) / tilePx + cy);
      placementTile = { x, y, valid: canPlaceNpcAt(x, y) };
    }
  });
  $('attackBtn').addEventListener('click', () => attack());
  $('healthPotion').addEventListener('click', () => usePotion('health'));
  $('manaPotion').addEventListener('click', () => usePotion('mana'));
  $('classSelect').addEventListener('change', event => applyClass(event.target.value));
  document.querySelectorAll('.spell-slot').forEach(button => button.addEventListener('click', () => selectSkill(Number(button.dataset.skill))));
  $('scoreboardToggle').addEventListener('click', () => toggleScoreboard());
  document.querySelectorAll('.roster-row[data-fighter]').forEach(row => {
    if (row.dataset.fighter !== 'player') row.addEventListener('click', () => selectTarget(byId[row.dataset.fighter]));
  });
  const joystick = $('joystick');
  if (joystick) {
    joystick.addEventListener('pointerdown', event => { event.preventDefault(); joystick.setPointerCapture(event.pointerId); updateJoystick(event); });
    joystick.addEventListener('pointermove', event => { if (joystick.hasPointerCapture(event.pointerId)) updateJoystick(event); });
    joystick.addEventListener('pointerup', clearJoystick);
    joystick.addEventListener('pointercancel', clearJoystick);
    joystick.addEventListener('lostpointercapture', clearJoystick);
  }
  $('restartBtn').addEventListener('click', resetGame); $('playAgain').addEventListener('click', resetGame);
  $('soundToggle').addEventListener('click', () => { audioOn = !audioOn; $('soundLabel').textContent = `SONIDO ${audioOn ? 'ON' : 'OFF'}`; $('soundIcon').textContent = audioOn ? '♫' : '♪'; });
  $('helpBtn').addEventListener('click', () => $('helpModal').classList.remove('hidden'));
  $('closeHelp').addEventListener('click', () => $('helpModal').classList.add('hidden'));
  $('helpModal').addEventListener('click', event => { if (event.target === $('helpModal')) $('helpModal').classList.add('hidden'); });
  $('menuBtn').addEventListener('click', togglePause);
  let previous = performance.now();
  function loop(now) { const dt = Math.min(.05, (now - previous) / 1000); previous = now; update(dt); draw(); requestAnimationFrame(loop); }
  renderSkills(); refreshHud(); loadAssets(); requestAnimationFrame(loop);
})();
