/* ═══════════════════════════════════════════════════════════
   HYDROHARVEST — game logic · simulation · economy · UI
   ═══════════════════════════════════════════════════════════ */
'use strict';

/* ───────────────────────── AUDIO ───────────────────────── */
const Sfx = (() => {
  let ctx = null;
  let muted = localStorage.getItem('hydroharvest_muted') === '1';
  function unlock() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }
  function tone(freq, dur, opts) {
    opts = opts || {};
    if (muted) return;
    unlock(); if (!ctx) return;
    const type = opts.type || 'sine', vol = opts.vol || 0.05, delay = opts.delay || 0;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, opts.slide), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  }
  function play(name) {
    switch (name) {
      case 'click': tone(760, 0.05, { type: 'triangle', vol: 0.025 }); break;
      case 'plant': tone(392, 0.1, { vol: 0.05 }); tone(523, 0.12, { delay: 0.07, vol: 0.05 }); break;
      case 'harvest': [523, 659, 784].forEach((f, i) => tone(f, 0.16, { delay: i * 0.08, vol: 0.05 })); break;
      case 'sell': tone(880, 0.08, { type: 'triangle', vol: 0.04 }); tone(1174, 0.14, { delay: 0.07, type: 'triangle', vol: 0.04 }); break;
      case 'buy': tone(330, 0.09, { vol: 0.045 }); tone(440, 0.12, { delay: 0.08, vol: 0.045 }); break;
      case 'place': tone(190, 0.1, { vol: 0.05, slide: 120 }); tone(320, 0.08, { delay: 0.05, vol: 0.04 }); break;
      case 'error': tone(150, 0.16, { type: 'sawtooth', vol: 0.035, slide: 90 }); break;
      case 'day': tone(392, 0.2, { vol: 0.02 }); tone(587, 0.24, { delay: 0.1, vol: 0.018 }); break;
      case 'fanfare': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, { delay: i * 0.1, vol: 0.045 })); break;
      case 'goal': [659, 784, 988, 1318].forEach((f, i) => tone(f, 0.18, { delay: i * 0.07, type: 'triangle', vol: 0.045 })); break;
      default: break;
    }
  }
  function setMuted(v) {
    muted = v;
    localStorage.setItem('hydroharvest_muted', v ? '1' : '0');
    updateMuteButtons();
  }
  return { play, unlock, setMuted, toggle: () => setMuted(!muted), isMuted: () => muted };
})();

/* ───────────────────────── STATE ───────────────────────── */
const $ = id => document.getElementById(id);
const D = {};                 // cached DOM refs
let state = null;
let selectedBedId = null;
let selectedBuildId = 'leafy';
let buildMode = null;
let openModalId = null;
let gameActive = false;
let titleVisible = true;
let gameOverFlag = false;
let elapsed = 0, lastFrame = performance.now();
let worldAccum = 0, uiAccum = 0;
let lastSaveAt = 0;
let clearArmed = false, clearTimer = null;
let lastSell = 0;
const lab = { tab: 'systems', system: 'nft', crop: 'lettuce' };
const advisor = { messages: [], greenhouse: 'tunel', system: 'nft', beds: 4 };
let dashFilter = 'all';
const GOD_CASH = 9999999;

const uid = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v, d) => Number.isFinite(+v) ? +v : d;

/* ───────────────────────── BED HELPERS ───────────────────────── */
function maxWater() { return 40 + (state && state.upgrades.reservoir ? 30 : 0); }
function makeBed(type, cropId, growth, x, z) {
  const crop = cropId ? cropById(cropId) : null;
  return {
    id: uid(), type, x, z, rot: 0,
    cropId: cropId || null, growth: growth || 0, health: 100,
    water: maxWater(),
    ph: 6.1,
    ec: crop ? (crop.ec[0] + crop.ec[1]) / 2 : 1.8,
    plantedDay: crop ? 1 : null,
    taskDone: {},
    warned: {},
  };
}
function bedCost(typeId) {
  if (!state) return BED_TYPES[typeId].cost;
  if (state.godMode) return 0;
  const n = state.beds.filter(b => b.type === typeId).length;
  return Math.round(BED_TYPES[typeId].cost * Math.pow(1.06, n));
}
function updateGodUI() {
  const on = !!(state && state.godMode);
  if (D.godBadge) D.godBadge.classList.toggle('hidden', !on);
  if (D.cashBlock) D.cashBlock.classList.toggle('god', on);
  if (D.menuGod) D.menuGod.textContent = on ? '😇 Desactivar modo Dios' : '😇 Modo Dios';
  if (D.btnBlueprint) D.btnBlueprint.classList.toggle('active', !!(state && state.blueprint));
  if (D.bpLegend) D.bpLegend.classList.toggle('hidden', !(state && state.blueprint));
}
function toggleGodMode(force) {
  if (!state) return;
  const on = typeof force === 'boolean' ? force : !state.godMode;
  if (on === state.godMode) return;
  state.godMode = on;
  if (on) {
    state._cashBeforeGod = state.cash;
    state.cash = GOD_CASH;
    logEvent('system', 'MODO DIOS activado: caja infinita, construcción libre y sin colisiones.');
    toast('😇 <strong>Modo Dios activado</strong>: caja infinita, compras gratis, sin colisiones y sin quiebra.', 'money');
    Sfx.play('fanfare');
  } else {
    state.cash = state._cashBeforeGod == null ? 2500 : state._cashBeforeGod;
    state._cashBeforeGod = null;
    logEvent('system', 'MODO DIOS desactivado: vuelve la economía real.');
    toast('💼 Modo Dios desactivado. Caja restaurada a ' + fmtMoney(state.cash) + '.', 'warn');
    Sfx.play('buy');
  }
  updateGodUI();
  updateHUD(true);
  renderBuildCards();
  refreshWorld();
  saveGame(true);
}
function applyBlueprint(on, silent) {
  if (state) state.blueprint = !!on;
  if (typeof World !== 'undefined' && World.setBlueprint) World.setBlueprint(!!on);
  if (D.btnBlueprint) D.btnBlueprint.classList.toggle('active', !!on);
  if (D.bpLegend) D.bpLegend.classList.toggle('hidden', !on || !!(state && state.godMode));
  if (!silent) {
    toast(on ? '📐 Plano técnico activo: grilla de 1 m, cotas, conteo de plantas y circuito de agua.' : '📐 Plano técnico oculto.', on ? 'money' : 'warn');
    Sfx.play('click');
  }
  if (state) saveGame(true);
}
function greenhouseTemp() {
  if (!state) return 24;
  const w = WEATHERS[state.weather];
  let t = w.temp;
  if (state.upgrades.hvac) t = t + (24 - t) * (0.22 * state.upgrades.hvac);
  if (state.upgrades.shade) t -= Math.max(0, t - 28) * 0.4;
  return Math.round(t);
}
function rangeScore(v, min, max, falloff) {
  if (v >= min && v <= max) return 1;
  const d = v < min ? min - v : v - max;
  return clamp(1 - d / falloff, 0.1, 1);
}
function bedScores(bed, crop) {
  const temp = greenhouseTemp();
  return {
    water: bed.water > 0.5 ? 1 : 0,
    ph: rangeScore(bed.ph, 5.5, 6.5, 1.2),
    ec: rangeScore(bed.ec, crop.ec[0], crop.ec[1], 1.0),
    temp: temp < 17 ? rangeScore(temp, 17, 30, 6) : rangeScore(temp, 17, 30, 7),
    tempNow: temp,
  };
}
function worstCondition(bed, crop) {
  const s = bedScores(bed, crop);
  const entries = [['water', s.water], ['ph', s.ph], ['ec', s.ec], ['temp', s.temp]];
  entries.sort((a, b) => a[1] - b[1]);
  return { key: entries[0][0], score: entries[0][1], scores: s };
}
function stageName(crop, growth) {
  if (growth >= 0.995) return 'Lista para cosechar';
  if (growth < 0.16) return 'Plantín';
  if (growth < 0.5) return crop.beds.includes('bucket') ? 'Vegetativo' : 'En hojas';
  if (growth < 0.85) return crop.beds.includes('bucket') ? 'En floración' : 'Madurando';
  return crop.beds.includes('bucket') ? 'Fructificando' : 'Casi lista';
}
function weekOfBed(bed) {
  if (!bed || !bed.cropId) return 1;
  const crop = cropById(bed.cropId);
  const planted = bed.plantedDay == null ? state.day : bed.plantedDay;
  return clamp(Math.floor((state.day - planted) / 7) + 1, 1, crop.cycleWeeks);
}
function taskKeyString(week, key) { return 'w' + week + ':' + key; }
function currentTasks(bed) {
  if (!bed || !bed.cropId) return [];
  const week = weekOfBed(bed);
  return scheduleTasks(bed.type, bed.cropId, week).map(t => {
    const key = taskKeyString(week, t.key);
    return { ...t, key, week, done: !!bed.taskDone[key] };
  });
}
function autoCompleteTask(bed, name) {
  if (!bed || !bed.cropId) return;
  const week = weekOfBed(bed);
  const exists = scheduleTasks(bed.type, bed.cropId, week).some(t => t.key === name);
  if (exists) bed.taskDone[taskKeyString(week, name)] = true;
}
function completeTask(bed, key) {
  if (!bed || !bed.cropId || bed.taskDone[key]) return;
  bed.taskDone[key] = true;
  state.stats.tasksDone = (state.stats.tasksDone || 0) + 1;
  bed.health = clamp(bed.health + 2, 0, 100);
  bed.growth = Math.min(1, bed.growth + 0.005);
  Sfx.play('click');
  refreshWorld();
  renderBedPanel(true);
  updateHUD();
  checkGoals();
  saveGame(true);
}
function estHarvestKg(bed) {
  const crop = cropById(bed.cropId);
  const plants = BED_TYPES[bed.type].plants;
  return +(plants * crop.yieldKg * (0.45 + 0.55 * bed.health / 100)).toFixed(1);
}

/* ───────────────────────── NEW GAME ───────────────────────── */
function freshState(buildId) {
  const build = BUILDS.find(b => b.id === buildId) || BUILDS[0];
  state = null;
  const s = {
    version: 1, buildId: build.id, buildName: build.name,
    day: 1, dayTime: 0.25, speed: 1,
    cash: build.cash, reputation: 3,
    weather: 'sunny',
    inventory: Object.fromEntries(CROPS.map(c => [c.id, 0])),
    market: Object.fromEntries(CROPS.map(c => [c.id, { price: c.basePrice, prev: c.basePrice }])),
    beds: build.beds.map(b => {
      const bed = makeBed(b.type, b.crop, b.growth, b.x, b.z);
      if (b.crop) bed.plantedDay = 1 - Math.floor(b.growth * cropById(b.crop).growDays);
      return bed;
    }),
    contracts: { offers: [], active: [] },
    upgrades: { led: false, autoDoser: false, hvac: 0, shade: false, rain: false, reservoir: false, marketing: 0 },
    goalsDone: {},
    godMode: false, _cashBeforeGod: null,
    blueprint: true,
    events: [],
    history: { cash: [{ day: 1, value: build.cash }], harvests: [] },
    stats: {
      planted: 0, harvests: 0, revenue: 0, contractsDelivered: 0, kgHarvested: 0, tasksDone: 0,
      startDay: 1,
      bySystem: Object.fromEntries(BED_IDS.map(t => [t, { harvests: 0, kg: 0, revenue: 0, seedCost: 0, upkeep: 0, capex: 0 }])),
    },
  };
  // seed analytics capex + seed cost for the preset farm
  for (const bed of s.beds) {
    const rec = s.stats.bySystem[bed.type];
    if (!rec) continue;
    rec.capex += BED_TYPES[bed.type].cost;
    if (bed.cropId) rec.seedCost += cropById(bed.cropId).seedCost;
  }
  state = s;
  logEvent('system', `Arranca <b>${build.name}</b> con ${fmtMoney(build.cash)} de caja y ${s.beds.length} camas.`);
  offerContract(); offerContract();
  checkGoals();
  return s;
}

function startGame(buildId) {
  freshState(buildId);
  gameOverFlag = false;
  titleVisible = false; gameActive = true;
  hideTitleScreen();
  D.hud.classList.remove('hidden-until-start');
  D.goalsMini.classList.remove('hidden-until-start');
  D.mobileNav.classList.remove('hidden-until-start');
  closeModal(true);
  selectedBedId = null; buildMode = null;
  D.bedPanel.classList.add('hidden');
  D.buildBar.classList.add('hidden');
  World.setGhost(null);
  renderBuildCards();
  refreshWorld();
  World.focusBeds(state.beds);
  applyBlueprint(state.blueprint !== false, true);
  updateGodUI();
  updateHUD(true);
  updateGoalsMini();
  saveGame(true);
  const build = BUILDS.find(b => b.id === buildId);
  toast(`🌱 <strong>${build.name}</strong> — ${build.blurb}`, 'money');
  toast('Tocá una cama para plantar, dosificar o cosechar. La Guía (H) tiene el paso a paso completo.');
  Sfx.play('fanfare');
}
function hideTitleScreen() {
  D.title.classList.add('fade-out');
  setTimeout(() => { if (!titleVisible) D.title.style.display = 'none'; }, 700);
}
function showTitleScreen() {
  titleVisible = true;
  D.title.style.display = '';
  requestAnimationFrame(() => D.title.classList.remove('fade-out'));
  D.hud.classList.add('hidden-until-start');
  D.goalsMini.classList.add('hidden-until-start');
  D.mobileNav.classList.add('hidden-until-start');
  D.title && updateTitleContinue();
}

function continueGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) { toast('No hay ninguna granja guardada.', 'warn'); return; }
  let data;
  try { data = JSON.parse(raw); } catch (e) { toast('La partida guardada está dañada.', 'bad'); return; }
  if (!data || data.version !== 1) { toast('La partida guardada es incompatible.', 'bad'); return; }
  data.inventory = Object.assign(Object.fromEntries(CROPS.map(c => [c.id, 0])), data.inventory || {});
  data.market = data.market || {};
  CROPS.forEach(c => { if (!data.market[c.id]) data.market[c.id] = { price: c.basePrice, prev: c.basePrice }; });
  data.contracts = data.contracts || { offers: [], active: [] };
  data.upgrades = Object.assign({ led: false, autoDoser: false, hvac: 0, shade: false, rain: false, reservoir: false, marketing: 0 }, data.upgrades || {});
  data.goalsDone = data.goalsDone || {};
  data.stats = Object.assign({ planted: 0, harvests: 0, revenue: 0, contractsDelivered: 0, kgHarvested: 0, tasksDone: 0, startDay: 1 }, data.stats || {});
  data.stats.bySystem = data.stats.bySystem || {};
  BED_IDS.forEach(t => { data.stats.bySystem[t] = Object.assign({ harvests: 0, kg: 0, revenue: 0, seedCost: 0, upkeep: 0, capex: 0 }, data.stats.bySystem[t] || {}); });
  data.speed = data.speed || 1;
  data.godMode = !!data.godMode;
  data.blueprint = data.blueprint !== false;
  data.events = Array.isArray(data.events) ? data.events : [];
  data.history = data.history || { cash: [{ day: data.day || 1, value: data.cash || 0 }], harvests: [] };
  if (!Array.isArray(data.history.cash)) data.history.cash = [{ day: data.day || 1, value: data.cash || 0 }];
  if (!Array.isArray(data.history.harvests)) data.history.harvests = [];
  data.beds = (data.beds || []).map(b => Object.assign({ warned: {}, rot: 0, health: 100, taskDone: {} }, b));
  data.beds.forEach(b => {
    if (!b.plantedDay && b.cropId) b.plantedDay = data.day - Math.floor(b.growth * cropById(b.cropId).growDays);
    b.taskDone = b.taskDone || {};
  });
  if (data.godMode) data.cash = GOD_CASH;
  state = data;
  gameOverFlag = false;
  titleVisible = false; gameActive = true;
  hideTitleScreen();
  D.hud.classList.remove('hidden-until-start');
  D.goalsMini.classList.remove('hidden-until-start');
  D.mobileNav.classList.remove('hidden-until-start');
  closeModal(true);
  selectedBedId = null;
  World.setGhost(null);
  D.buildBar.classList.add('hidden');
  D.bedPanel.classList.add('hidden');
  refreshWorld();
  World.focusBeds(state.beds);
  applyBlueprint(state.blueprint !== false, true);
  updateGodUI();
  updateHUD(true);
  updateGoalsMini();
  renderBuildCards();
  toast(`De vuelta — día ${state.day}. ${state.beds.length} camas y ${fmtMoney(state.cash)} en caja.`);
  Sfx.play('buy');
}

function saveGame(silent) {
  if (!state) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    lastSaveAt = Date.now();
    if (!silent) { toast('💾 Granja guardada.', 'money'); Sfx.play('click'); }
    updateTitleContinue();
  } catch (e) {
    if (!silent) toast('No se pudo guardar (¿almacenamiento del navegador lleno?).', 'bad');
  }
}
function deleteSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} updateTitleContinue(); }

/* ───────────────────────── EVENTOS / HISTORIAL ───────────────────────── */
function clockText() {
  if (!state) return '--:--';
  const mins = (WORKDAY_START * 60 + state.dayTime * WORKDAY_HOURS * 60) % (24 * 60);
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(Math.floor(mins % 60)).padStart(2, '0')}`;
}
function logEvent(category, text, amount) {
  if (!state) return;
  if (!Array.isArray(state.events)) state.events = [];
  state.events.unshift({
    id: 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    day: state.day, time: clockText(), category,
    text, amount: Number.isFinite(amount) ? amount : null,
  });
  if (state.events.length > 260) state.events.length = 260;
}
function snapshotCash() {
  if (!state) return;
  if (!state.history) state.history = { cash: [], harvests: [] };
  const arr = state.history.cash;
  const last = arr[arr.length - 1];
  const val = Math.round(state.cash);
  if (!last || last.day !== state.day) arr.push({ day: state.day, value: val });
  else last.value = val;
  if (arr.length > 180) arr.shift();
}
function addHarvestHistory(kg, cropId) {
  if (!state) return;
  if (!state.history) state.history = { cash: [], harvests: [] };
  state.history.harvests.push({ day: state.day, kg: +kg.toFixed(2), cropId });
  if (state.history.harvests.length > 240) state.history.harvests.shift();
}

/* ───────────────────────── SIMULATION ───────────────────────── */
function simulate(dt) {
  if (!state || !state.speed) return;
  const scaled = dt * state.speed;
  state.dayTime += scaled / DAY_LENGTH;
  if (state.dayTime >= 1) {
    state.dayTime -= 1;
    advanceDay();
    if (!state) return;
  }
  const frac = scaled / DAY_LENGTH;
  for (const bed of state.beds) simulateBed(bed, frac);
  if (Date.now() - lastSaveAt > 20000) saveGame(true);
}

function simulateBed(bed, frac) {
  if (!bed.cropId) return;
  const crop = cropById(bed.cropId);
  const sys = BED_TYPES[bed.type].spec;
  const plants = BED_TYPES[bed.type].plants;
  const auto = state.upgrades.autoDoser && bed.type !== 'kratky';

  if (auto) {
    bed.water = maxWater();
    bed.ph += (6.0 - bed.ph) * Math.min(1, frac * 14);
    const mid = (crop.ec[0] + crop.ec[1]) / 2;
    bed.ec += (mid - bed.ec) * Math.min(1, frac * 14);
  } else if (bed.water > 0.05) {
    bed.water = Math.max(0, bed.water - frac * plants * 0.95 * sys.water * (state.upgrades.reservoir ? 0.72 : 1));
    bed.ec = Math.max(0.2, bed.ec - frac * 0.24);
    bed.ph = Math.min(8.2, bed.ph + frac * 0.10);
  }

  const scores = bedScores(bed, crop);
  const condMin = bed.water <= 0.05 ? 0 : Math.min(scores.ph, scores.ec, scores.temp);
  const ledBonus = state.upgrades.led ? 1.3 : 1;
  bed.growth = Math.min(1, bed.growth + (frac / crop.growDays) * condMin * sys.growth * ledBonus);

  const stress = 1 - Math.min(scores.ph, scores.ec, scores.temp);
  const waterStress = bed.water <= 0.05 ? 1 : 0;
  const worst = Math.max(stress, waterStress);
  const healthDelta = worst > 0.3 ? -8 * frac : 4 * frac;
  bed.health = clamp(bed.health + healthDelta, 0, 100);

  if (bed.health <= 0) {
    toast(`💀 Se te murió el cultivo de ${crop.name} en ${BED_TYPES[bed.type].name}. Revisá agua, pH y EC la próxima.`, 'bad');
    logEvent('crop', `Se murió el cultivo de ${crop.name} en ${BED_TYPES[bed.type].name}.`);
    bed.cropId = null; bed.growth = 0; bed.health = 100;
    if (selectedBedId === bed.id) renderBedPanel(true);
  }
}

function advanceDay() {
  state.day++;
  const prevWeather = state.weather;
  state.weather = rollWeather();
  updateMarket();
  chargeUpkeep();
  if (!state) return;
  expireContracts();
  if (state.contracts.offers.length < 3 && Math.random() < 0.8) offerContract();
  checkGoals();
  snapshotCash();
  if (state.cash < 0 && !state.godMode) toast(`⚠️ Estás ${fmtMoney(-state.cash)} en rojo. Vendé producción o recortá costos.`, 'bad');
  const w = WEATHERS[state.weather];
  logEvent('weather', `Día ${state.day}: ${w.label} · ${greenhouseTemp()} °C en invernadero · caja ${state.godMode ? '∞' : fmtMoney(state.cash)}.`);
  if (prevWeather !== state.weather) logEvent('weather', `Cambio de clima: ${WEATHERS[prevWeather].label} → ${w.label}.`);
  if (state.day % 7 === 0) {
    const week = Math.floor((state.day - 1) / 7) + 1;
    logEvent('system', `Cierre de semana ${week}: ${state.beds.length} camas, ${state.beds.filter(b => b.cropId).length} en producción, caja ${state.godMode ? '∞' : fmtMoney(state.cash)}.`);
  }
  if (state.weather === 'heatwave') toast(`🥵 ¡Ola de calor! Invernadero a ${greenhouseTemp()}°C — ${state.upgrades.hvac ? 'el HVAC está peleando.' : 'los cultivos sufren estrés térmico. Considerá HVAC o media sombra.'}`, 'warn');
  else if (state.weather === 'storm') toast('⛈️ Tormenta afuera. El colector de lluvia está trabajando a pleno.', 'warn');
  else if (state.weather === 'rain') toast('🌧️ Día de lluvia: agua gratis y raíces contentas.');
  Sfx.play('day');
  updateHUD(true);
  if (openModalId === 'modal-market') renderMarket();
  if (openModalId === 'modal-contracts') renderContracts();
  if (openModalId === 'modal-dashboard') renderDashboard();
  saveGame(true);
  if (state.cash < -750 && !state.godMode) triggerGameOver();
}

function rollWeather() {
  const total = WEATHER_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total;
  for (const [key, weight] of WEATHER_WEIGHTS) { r -= weight; if (r <= 0) return key; }
  return 'sunny';
}
function updateMarket() {
  let spike = null;
  for (const crop of CROPS) {
    const m = state.market[crop.id];
    m.prev = m.price;
    const drift = (crop.basePrice - m.price) * 0.28 + (Math.random() - 0.5) * crop.basePrice * 0.24;
    m.price = clamp(m.price + drift, crop.basePrice * 0.55, crop.basePrice * 1.65);
    if (Math.random() < 0.045) {
      m.price = clamp(m.price * 1.35, crop.basePrice * 0.55, crop.basePrice * 1.95);
      spike = crop;
    }
  }
  if (spike) toast(`📈 ¡Pico de demanda! ${spike.name} está caro hoy.`);
}
function chargeUpkeep() {
  if (state.godMode) return;
  const beds = state.beds.length;
  const energy = state.beds.reduce((sum, b) => sum + BED_TYPES[b.type].spec.energy, 0);
  const autoBeds = state.beds.filter(b => b.type !== 'kratky').length;
  const cost = Math.max(1, Math.round(2 + energy + state.upgrades.hvac * 3 + (state.upgrades.led ? 6 : 0) + (state.upgrades.autoDoser ? autoBeds * 1.2 : 0) + (state.upgrades.rain ? 0.5 : 1.5)));
  changeCash(-cost);
  if (beds) {
    state.beds.forEach(b => {
      const rec = state.stats.bySystem[b.type];
      if (rec) rec.upkeep += cost / beds;
    });
  }
  const low = state.beds.filter(b => b.cropId && b.water < 8);
  if (low.length) toast(`💧 ${low.length} cama${low.length > 1 ? 's' : ''} con poca solución nutritiva.`, 'warn');
}

/* ───────────────────────── ECONOMY ───────────────────────── */
function changeCash(amount) {
  state.cash += amount;
  updateHUD();
  flashCash(amount >= 0 ? 1 : -1);
}
function flashCash(dir) {
  if (!D.cashBlock) return;
  D.cashBlock.classList.remove('flash-up', 'flash-down');
  void D.cashBlock.offsetWidth;
  D.cashBlock.classList.add(dir > 0 ? 'flash-up' : 'flash-down');
  clearTimeout(flashCash._t);
  flashCash._t = setTimeout(() => D.cashBlock.classList.remove('flash-up', 'flash-down'), 500);
}
function sellCrop(cropId, kg) {
  const stock = state.inventory[cropId] || 0;
  kg = Math.min(kg, stock);
  if (kg < 0.01) return;
  const crop = cropById(cropId);
  const price = sellPrice(cropId, state);
  const revenue = kg * price;
  state.inventory[cropId] = +(stock - kg).toFixed(2);
  state.cash += revenue;
  state.stats.revenue += revenue;
  toast(`💵 Vendiste ${fmtNum(kg)} kg de ${crop.name} por <strong>${fmtMoney(revenue)}</strong> a ${fmtMoney(price)}/kg.`, 'money');
  logEvent('money', `Venta de ${fmtNum(kg)} kg de ${crop.name} a ${fmtMoney(price)}/kg.`, revenue);
  snapshotCash();
  updateHUD();
  flashCash(1);
  Sfx.play('sell');
  checkGoals();
  saveGame(true);
}
function sellAll() {
  let total = 0, kg = 0;
  for (const crop of CROPS) {
    const stock = state.inventory[crop.id] || 0;
    if (stock < 0.01) continue;
    const price = sellPrice(crop.id, state);
    total += stock * price; kg += stock;
    state.inventory[crop.id] = 0;
  }
  if (kg < 0.01) { toast('Todavía no hay nada en el depósito para vender.', 'warn'); Sfx.play('error'); return; }
  state.cash += total;
  state.stats.revenue += total;
  toast(`💵 Vendiste ${fmtNum(kg)} kg de producción por <strong>${fmtMoney(total)}</strong>.`, 'money');
  logEvent('money', `Venta total de ${fmtNum(kg)} kg de producción.`, total);
  snapshotCash();
  updateHUD(); flashCash(1); Sfx.play('sell');
  checkGoals(); saveGame(true);
}

/* ───────────────────────── CONTRACTS ───────────────────────── */
function offerContract() {
  const crop = CROPS[Math.floor(Math.random() * CROPS.length)];
  const qty = Math.max(1, Math.round((1.5 + Math.random() * 6) * (crop.yieldKg / 1.4) * 2) / 2);
  const repFactor = 0.85 + state.reputation * 0.06;
  const reward = Math.round(qty * crop.basePrice * (1.3 + Math.random() * 0.25) * repFactor);
  state.contracts.offers.push({
    id: 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    cropId: crop.id, qty, reward,
    deadline: state.day + 3 + Math.floor(Math.random() * 3),
    expires: state.day + 2,
  });
}
function acceptOffer(id) {
  const idx = state.contracts.offers.findIndex(o => o.id === id);
  if (idx < 0) return;
  const offer = state.contracts.offers.splice(idx, 1)[0];
  state.contracts.active.push(offer);
  toast(`📋 Pedido aceptado: ${offer.qty} kg de ${cropById(offer.cropId).name} para el día ${offer.deadline}.`, 'money');
  logEvent('money', `Pedido aceptado: ${offer.qty} kg de ${cropById(offer.cropId).name} para el día ${offer.deadline}.`);
  Sfx.play('click');
  renderContracts(); updateHUD(); saveGame(true);
}
function declineOffer(id) {
  state.contracts.offers = state.contracts.offers.filter(o => o.id !== id);
  Sfx.play('click'); renderContracts(); updateHUD(); saveGame(true);
}
function deliverContract(id) {
  const c = state.contracts.active.find(o => o.id === id);
  if (!c) return;
  const crop = cropById(c.cropId);
  if ((state.inventory[c.cropId] || 0) < c.qty - 0.001) {
    toast(`No alcanza ${crop.name}: tenés ${fmtNum(state.inventory[c.cropId] || 0)} de ${c.qty} kg.`, 'warn');
    Sfx.play('error'); return;
  }
  state.inventory[c.cropId] = +(state.inventory[c.cropId] - c.qty).toFixed(2);
  state.cash += c.reward;
  state.stats.revenue += c.reward;
  state.stats.contractsDelivered++;
  state.reputation = clamp(state.reputation + 0.18 + (state.upgrades.marketing || 0) * 0.02, 1, 5);
  state.contracts.active = state.contracts.active.filter(o => o.id !== id);
  toast(`🤝 Entregaste ${c.qty} kg de ${crop.name} — <strong>${fmtMoney(c.reward)}</strong> y reputación.`, 'money');
  logEvent('money', `Pedido entregado: ${c.qty} kg de ${crop.name}.`, c.reward);
  snapshotCash();
  Sfx.play('fanfare'); updateHUD(); flashCash(1);
  checkGoals(); renderContracts(); saveGame(true);
}
function expireContracts() {
  const failed = state.contracts.active.filter(c => state.day > c.deadline);
  if (failed.length) {
    for (const c of failed) {
      state.reputation = clamp(state.reputation - 0.3, 1, 5);
      toast(`❌ Pedido vencido: ${c.qty} kg de ${cropById(c.cropId).name}. Te bajó la reputación.`, 'bad');
      logEvent('money', `Pedido vencido: ${c.qty} kg de ${cropById(c.cropId).name}. Reputación −0,3.`);
    }
    state.contracts.active = state.contracts.active.filter(c => state.day <= c.deadline);
  }
  state.contracts.offers = state.contracts.offers.filter(o => state.day <= o.expires);
}

/* ───────────────────────── UPGRADES ───────────────────────── */
function upgradeLevel(id) {
  const u = UPGRADES.find(x => x.id === id);
  if (u.maxLevel === 1) return state.upgrades[id] ? 1 : 0;
  return state.upgrades[id] || 0;
}
function upgradeCost(id) {
  const u = UPGRADES.find(x => x.id === id);
  const lvl = upgradeLevel(id);
  return lvl >= u.maxLevel ? null : u.costs[lvl];
}
function buyUpgrade(id) {
  const u = UPGRADES.find(x => x.id === id);
  const cost = upgradeCost(id);
  if (cost == null) return;
  if (state.cash < cost) { toast('No te alcanza la plata para esa mejora.', 'bad'); Sfx.play('error'); return; }
  state.cash -= cost;
  if (u.maxLevel === 1) state.upgrades[id] = true;
  else state.upgrades[id] = (state.upgrades[id] || 0) + 1;
  if (id === 'reservoir') state.beds.forEach(b => { b.water = Math.min(maxWater(), b.water + 30); });
  toast(`⚙️ Instalaste <strong>${u.name}</strong> por ${fmtMoney(cost)}.`, 'money');
  logEvent('system', `Mejora instalada: ${u.name}.`, -cost);
  Sfx.play('buy'); updateHUD(); flashCash(-1);
  renderUpgrades(); refreshWorld(); checkGoals(); saveGame(true);
}

/* ───────────────────────── GOALS ───────────────────────── */
function checkGoals() {
  if (!state) return;
  for (const g of GOALS) {
    if (state.goalsDone[g.id]) continue;
    let done = false;
    try { done = g.check(state); } catch (e) { done = false; }
    if (done) {
      state.goalsDone[g.id] = true;
      state.cash += g.reward;
      toast(`🎯 Objetivo cumplido: <strong>${g.name}</strong> — recompensa ${fmtMoney(g.reward)}.`, 'money');
      Sfx.play('goal');
      flashCash(1);
    }
  }
  updateHUD();
  updateGoalsMini();
  if (openModalId === 'modal-goals') renderGoals();
}
function updateGoalsMini() {
  if (!state) return;
  const next = GOALS.find(g => !state.goalsDone[g.id]);
  D.goalsMiniText.innerHTML = next
    ? `<strong>${next.name}</strong> — ${next.desc} <span style="color:var(--accent)">(${fmtMoney(next.reward)})</span>`
    : '🏆 Completaste todos los hitos. Sos un verdadero Barón Hidropónico.';
}

/* ───────────────────────── BUILD MODE ───────────────────────── */
function snap(v) { return Math.round(v * 2) / 2; }
function bedHalf(type) {
  const sz = (BED_TYPES[type] && BED_TYPES[type].size) || { w: 2.4, d: 1.3 };
  return { w: sz.w / 2, d: sz.d / 2 };
}
function placementValid(type, x, z) {
  if (state && state.godMode) return true;
  const h = bedHalf(type);
  if (x - h.w < -11.7 || x + h.w > 11.7) return false;
  if (z - h.d < -5.2 || z + h.d > 5.2) return false;
  for (const b of state.beds) {
    const bh = bedHalf(b.type);
    if (Math.abs(x - b.x) < h.w + bh.w + 0.22 && Math.abs(z - b.z) < h.d + bh.d + 0.22) return false;
  }
  return true;
}
function openBuildMenu() {
  if (!state) return;
  closeModal();
  D.buildBar.classList.remove('hidden');
  D.bedPanel.classList.add('hidden');
  renderBuildCards();
  Sfx.play('click');
}
function closeBuildMode() {
  buildMode = null;
  World.setGhost(null);
  D.buildBar.classList.add('hidden');
  renderBuildCards();
  if (selectedBedId) renderBedPanel(true);
}
function chooseBuildType(typeId) {
  if (!state) return;
  const cost = bedCost(typeId);
  if (!state.godMode && state.cash < cost) {
    toast(`Necesitás ${fmtMoney(cost)} para comprar ${BED_TYPES[typeId].name}. Vendé algo de producción primero.`, 'bad');
    Sfx.play('error'); return;
  }
  buildMode = typeId;
  World.setGhost(typeId);
  renderBuildCards();
  Sfx.play('click');
}
function placeBed(x, z) {
  if (!state || !buildMode) return;
  const type = buildMode;
  const cost = bedCost(type);
  if (!state.godMode && state.cash < cost) {
    toast('No te queda caja para otra cama.', 'bad');
    Sfx.play('error'); closeBuildMode(); return;
  }
  if (!placementValid(type, x, z)) {
    toast('Ese lugar está ocupado. Elegí un espacio libre dentro del invernadero.', 'warn');
    Sfx.play('error'); return;
  }
  state.cash -= cost;
  const bed = makeBed(type, null, 0, x, z);
  state.beds.push(bed);
  toast(`🛠️ Construiste <strong>${BED_TYPES[type].name}</strong> por ${fmtMoney(cost)}.`, 'money');
  logEvent('system', `Construcción de ${BED_TYPES[type].name} en (${fmtNum(x)}, ${fmtNum(z)}).`, -cost);
  Sfx.play('place'); flashCash(-1);
  refreshWorld(); renderBuildCards(); updateHUD(); checkGoals(); saveGame(true);
  if (!state.godMode && state.cash < bedCost(type)) {
    toast('No queda caja para otra cama: se cerró el modo construcción.', 'warn');
    closeBuildMode();
  }
}
function onGhostMove(x, z) {
  if (!state || !buildMode) return;
  const sx = snap(x), sz = snap(z);
  World.moveGhost(sx, sz, placementValid(buildMode, sx, sz));
}

/* ───────────────────────── SELL / PLANT / HARVEST ───────────────────────── */
function plantCrop(bedId, cropId) {
  const bed = state.beds.find(b => b.id === bedId);
  const crop = cropById(cropId);
  if (!bed || !crop) return;
  if (!BED_TYPES[bed.type].crops.includes(cropId)) return;
  if (!state.godMode && state.cash < crop.seedCost) { toast(`Necesitás ${fmtMoney(crop.seedCost)} para semillas de ${crop.name}.`, 'bad'); Sfx.play('error'); return; }
  if (!state.godMode) state.cash -= crop.seedCost;
  bed.cropId = cropId;
  bed.growth = 0.02;
  bed.health = 100;
  bed.ph = 6.1;
  bed.ec = (crop.ec[0] + crop.ec[1]) / 2;
  bed.plantedDay = state.day;
  bed.taskDone = {};
  state.stats.planted++;
  const rec = state.stats.bySystem[bed.type];
  if (rec) rec.seedCost += crop.seedCost;
  toast(`🌱 Plantaste ${crop.name}. Ciclo de ${crop.cycleWeeks} semanas: mirá las tareas semanales de la cama.`, 'money');
  logEvent('crop', `Siembra de ${crop.name} en ${BED_TYPES[bed.type].name} · cosecha estimada día ${state.day + Math.ceil(crop.growDays / BED_TYPES[bed.type].spec.growth)}.`, -crop.seedCost);
  Sfx.play('plant'); flashCash(-1);
  refreshWorld(); updateHUD(); checkGoals(); renderBedPanel(true); saveGame(true);
}
function harvestBed(bedId) {
  const bed = state.beds.find(b => b.id === bedId);
  if (!bed || !bed.cropId || bed.growth < 0.995) return;
  const crop = cropById(bed.cropId);
  const kg = estHarvestKg(bed);
  state.inventory[crop.id] = +((state.inventory[crop.id] || 0) + kg).toFixed(2);
  state.stats.harvests++;
  state.stats.kgHarvested = +(state.stats.kgHarvested + kg).toFixed(2);
  const rec = state.stats.bySystem[bed.type];
  if (rec) { rec.harvests++; rec.kg = +(rec.kg + kg).toFixed(2); rec.revenue += kg * sellPrice(crop.id, state); }
  toast(`🧺 Cosechaste <strong>${fmtNum(kg)} kg de ${crop.name}</strong>. Ventala en el Mercado.`, 'money');
  logEvent('crop', `Cosecha de ${fmtNum(kg)} kg de ${crop.name} en ${BED_TYPES[bed.type].name}.`);
  addHarvestHistory(kg, crop.id);
  Sfx.play('harvest');
  popupAtBed(bed, `+${fmtNum(kg)} kg ${crop.icon}`, 'good');
  bed.cropId = null; bed.growth = 0; bed.health = 100; bed.plantedDay = null; bed.taskDone = {};
  refreshWorld(); updateHUD(); checkGoals(); renderBedPanel(true); saveGame(true);
}
function clearBed(bedId) {
  const bed = state.beds.find(b => b.id === bedId);
  if (!bed || !bed.cropId) return;
  const crop = cropById(bed.cropId);
  toast(`Sacaste ${crop.name} de la cama.`, 'warn');
  bed.cropId = null; bed.growth = 0; bed.health = 100; bed.plantedDay = null; bed.taskDone = {};
  Sfx.play('error');
  refreshWorld(); renderBedPanel(true); saveGame(true);
}
function doseBed(bedId, kind) {
  const bed = state.beds.find(b => b.id === bedId);
  if (!bed || !bed.cropId) return;
  if (state.upgrades.autoDoser && bed.type !== 'kratky') { toast('El Auto-Dosificador ya se encarga.', 'warn'); return; }
  let cost = 0;
  if (kind === 'water') { cost = state.upgrades.rain ? 1 : 3; if (bed.water >= maxWater()) { toast('El tanque ya está lleno.', 'warn'); return; } bed.water = maxWater(); }
  if (kind === 'ec') { cost = 2; bed.ec = Math.min(3.6, bed.ec + 0.4); }
  if (kind === 'phdown') { cost = 1; bed.ph = Math.max(4.5, bed.ph - 0.4); }
  if (kind === 'phup') { cost = 1; bed.ph = Math.min(8, bed.ph + 0.4); }
  if (!state.godMode && state.cash < cost) { toast('No te alcanza la plata para dosificar.', 'bad'); Sfx.play('error'); return; }
  if (!state.godMode) state.cash -= cost;
  if (kind === 'water') autoCompleteTask(bed, 'topup');
  if (kind === 'ec' || kind === 'phdown' || kind === 'phup') autoCompleteTask(bed, 'test');
  Sfx.play('click'); flashCash(-1);
  updateHUD(); renderBedPanel(true); saveGame(true);
}

/* ───────────────────────── UI HELPERS ───────────────────────── */
function toast(html, kind) {
  if (!D.toasts) return;
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || '');
  el.innerHTML = html;
  D.toasts.appendChild(el);
  while (D.toasts.children.length > 4) D.toasts.removeChild(D.toasts.firstChild);
  setTimeout(() => {
    el.style.transition = 'opacity .4s, transform .4s';
    el.style.opacity = '0'; el.style.transform = 'translateY(-8px)';
    setTimeout(() => el.remove(), 420);
  }, 4600);
}
function popupAtBed(bed, text, cls) {
  const p = World.screenPos(bed.x, 2.7, bed.z);
  const el = document.createElement('div');
  el.className = 'floater ' + (cls || '');
  el.textContent = text;
  el.style.left = (p.x - 30) + 'px';
  el.style.top = p.y + 'px';
  D.popups.appendChild(el);
  setTimeout(() => el.remove(), 1700);
}
function updateMuteButtons() {
  if (D.btnMute) D.btnMute.textContent = Sfx.isMuted() ? '🔇' : '🔊';
  if (D.menuMute) D.menuMute.innerHTML = (Sfx.isMuted() ? '🔇' : '🔊') + ' Toggle Sound';
}
function updateHUD(force) {
  if (!state) return;
  D.cashLabel.textContent = state.godMode ? '∞' : fmtMoney(state.cash);
  D.cashBlock.classList.toggle('negative', !state.godMode && state.cash < 0);
  D.cashBlock.classList.toggle('god', !!state.godMode);
  D.cashBlock.classList.toggle('pulse', false);
  const f = Math.round(clamp(state.reputation, 1, 5));
  D.repLabel.textContent = '★'.repeat(f) + '☆'.repeat(5 - f);
  D.networthLabel.textContent = state.godMode ? '∞' : fmtMoney(netWorth(state));
  const w = WEATHERS[state.weather] || WEATHERS.sunny;
  D.weatherIcon.textContent = w.icon;
  const week = Math.floor((state.day - 1) / 7) + 1;
  const dayOfWeek = ((state.day - 1) % 7) + 1;
  D.dayLabel.textContent = `W${week} · D${dayOfWeek}`;
  const workMins = (WORKDAY_START * 60 + state.dayTime * WORKDAY_HOURS * 60) % (24 * 60);
  const hours = Math.floor(workMins / 60);
  const mins = Math.floor(workMins % 60);
  D.clockLabel.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} · ${w.label} ${greenhouseTemp()}°C`;
  D.dayPill.title = `Semana ${week}, día ${dayOfWeek} · Exterior ${w.temp} °C · Invernadero ${greenhouseTemp()} °C`;
  if (D.btnMobileSpeed) {
    const icons = { 0: '⏸', 1: '▶', 2: '▶▶', 3: '▶▶▶' };
    D.btnMobileSpeed.textContent = icons[state.speed] || '▶';
    D.btnMobileSpeed.title = state.speed === 0 ? 'Pausado — tocá para seguir' : `Velocidad ${state.speed}× — tocá para cambiar`;
  }
  D.btnPause.classList.toggle('active', state.speed === 0);
  D.btnS1.classList.toggle('active', state.speed === 1);
  D.btnS2.classList.toggle('active', state.speed === 2);
  D.btnS3.classList.toggle('active', state.speed === 3);
  D.btnBuild.classList.toggle('accent', !!buildMode);
  const offerCount = state.contracts.offers.length;
  D.contractsBadge.textContent = offerCount;
  D.contractsBadge.classList.toggle('hidden', offerCount === 0);
  if (openModalId === 'modal-market') renderMarket();
}
function updateTitleContinue() {
  if (!D.btnContinue) return;
  const has = !!localStorage.getItem(SAVE_KEY);
  D.btnContinue.classList.toggle('hidden', !has);
}

/* ───────────────────────── HUD / TITLE WIRING ───────────────────────── */
function renderTitleBuilds() {
  D.titleBuilds.innerHTML = BUILDS.map(b => `
    <button class="title-build" data-build="${b.id}">
      <span class="tb-icon">${b.icon}</span>
      <span class="tb-name">${b.name}</span>
      <span class="tb-tag">${b.tag}</span>
      <span class="tb-blurb">${b.blurb}</span>
      <span class="tb-meta"><span>💰 <b>${fmtMoney(b.cash)}</b> · ${b.highlight}</span><span class="tb-diff">${b.difficulty}</span></span>
    </button>`).join('');
  selectTitleBuild(selectedBuildId);
}
function selectTitleBuild(id) {
  selectedBuildId = id;
  const build = BUILDS.find(b => b.id === id) || BUILDS[0];
  D.titleBuilds.querySelectorAll('.title-build').forEach(el => el.classList.toggle('selected', el.dataset.build === id));
  D.btnStart.disabled = false;
  D.btnStart.textContent = `🌱 Empezar ${build.name}`;
}

/* ───────────────────────── PANEL ───────────────────────── */
function selectBed(bedId) {
  selectedBedId = bedId || null;
  World.setSelected(selectedBedId);
  if (!selectedBedId) { D.bedPanel.classList.add('hidden'); return; }
  D.bedPanel.classList.remove('hidden');
  D.buildBar.classList.add('hidden');
  buildMode = null; World.setGhost(null);
  resetClearButton();
  renderBedPanel(true);
  Sfx.play('click');
}
function resetClearButton() {
  clearArmed = false;
  clearTimeout(clearTimer);
  if (D.btnClear) { D.btnClear.textContent = '🗑️ Limpiar'; D.btnClear.classList.remove('danger'); }
}
function statusClass(bed, crop) {
  if (!crop) return '';
  const s = bedScores(bed, crop);
  const bad = bed.water <= 0.5 || bed.health < 35;
  const warn = bed.water < 10 || bed.health < 70 || s.ph < 0.55 || s.ec < 0.55 || s.temp < 0.55;
  return bad ? 'bad' : warn ? 'warn' : '';
}
function renderTasks(bed) {
  if (!bed.cropId) { D.tasksBlock.classList.add('hidden'); return; }
  D.tasksBlock.classList.remove('hidden');
  const crop = cropById(bed.cropId);
  const week = weekOfBed(bed);
  D.taskWeek.textContent = `SEMANA ${week} / ${crop.cycleWeeks}`;
  const tasks = currentTasks(bed);
  let autoChanged = false;
  if (state.upgrades.autoDoser && bed.type !== 'kratky') {
    for (const t of tasks) {
      if (t.auto && !t.done) { bed.taskDone[t.key] = true; t.done = true; autoChanged = true; }
    }
  }
  const sig = bed.id + '|' + week + '|' + tasks.map(t => t.done ? 1 : 0).join('') + '|' + (state.upgrades.autoDoser ? 1 : 0);
  if (renderTasks._sig !== sig) {
    renderTasks._sig = sig;
    D.taskList.innerHTML = tasks.map(t => `<button class="task-item ${t.done ? 'done' : ''}" data-task="${t.key}">
      <span class="tick">${t.done ? '✓' : ''}</span><span>${t.label}</span>
      ${t.auto && state.upgrades.autoDoser && bed.type !== 'kratky' ? '<span class="auto-tag">AUTO</span>' : ''}
    </button>`).join('');
  }
  if (autoChanged) saveGame(true);
}

function renderBedPanel(force) {
  if (!selectedBedId) { D.bedPanel.classList.add('hidden'); return; }
  const bed = state ? state.beds.find(b => b.id === selectedBedId) : null;
  if (!bed) { selectedBedId = null; D.bedPanel.classList.add('hidden'); World.setSelected(null); return; }
  D.bedPanel.classList.remove('hidden');
  const bt = BED_TYPES[bed.type];
  D.bedTitle.textContent = bt.name;
  const sp = bt.spec;
  const lay = bt.layout;
  D.bedSpecs.innerHTML = `<b>${bed.type.toUpperCase()}</b> · ${lay.units} ${lay.unit.toUpperCase()}S × ${lay.perUnit} = ${lay.total} PLANTAS · ${sp.footprint.toUpperCase()} · ${sp.energy === 0 ? 'PASIVO / SIN ENERGÍA' : fmtPrice(sp.energy) + '/DÍA'} · ${sp.difficulty}`;

  if (!bed.cropId) {
    D.tasksBlock.classList.add('hidden');
    D.seedSection.classList.remove('hidden');
    D.growSection.classList.add('hidden');
    D.bedStatusDot.className = 'status-dot';
    if (force || renderBedPanel._key !== bed.id + ':empty') {
      renderBedPanel._key = bed.id + ':empty';
      D.seedOptions.innerHTML = bt.crops.map(id => {
        const c = cropById(id);
        const afford = state.cash >= c.seedCost;
        return `<button class="seed-card" data-seed="${id}" ${afford ? '' : 'disabled'}>
          <span class="s-icon">${c.icon}</span>
          <span class="s-meta"><strong>${c.name}</strong><small>${c.cycleWeeks} sem de ciclo · ${fmtNum(bt.plants * c.yieldKg)} kg/cama · ${fmtPrice(sellPrice(c.id, state))}/kg</small></span>
          <span class="s-cost">$${c.seedCost}</span>
        </button>`;
      }).join('');
    }
    return;
  }

  const crop = cropById(bed.cropId);
  const key = bed.id + ':' + bed.cropId;
  if (force || renderBedPanel._key !== key) {
    renderBedPanel._key = key;
    D.seedSection.classList.add('hidden');
    D.growSection.classList.remove('hidden');
    D.phIdeal.style.left = ((5.5 - 4.5) / 3.5 * 100) + '%';
    D.phIdeal.style.width = ((6.5 - 5.5) / 3.5 * 100) + '%';
    D.ecIdeal.style.left = (crop.ec[0] / 4 * 100) + '%';
    D.ecIdeal.style.width = ((crop.ec[1] - crop.ec[0]) / 4 * 100) + '%';
  }
  D.seedSection.classList.add('hidden');
  D.growSection.classList.remove('hidden');

  D.cropIcon.textContent = crop.icon;
  D.cropName.textContent = crop.name;
  D.cropStage.textContent = `${stageName(crop, bed.growth)} · Sem ${weekOfBed(bed)}/${crop.cycleWeeks} · ${fmtPrice(sellPrice(crop.id, state))}/kg`;
  D.healthLabel.textContent = Math.round(bed.health);
  D.healthLabel.style.color = bed.health >= 70 ? '#b9ffdc' : bed.health >= 35 ? 'var(--amber)' : 'var(--red)';
  D.growthPct.textContent = Math.floor(bed.growth * 100) + '%';
  D.growthFill.style.width = (bed.growth * 100) + '%';
  renderCycleTimeline(bed, crop);
  const mw = maxWater();
  D.waterLabel.textContent = `${Math.round(bed.water)} / ${mw} L`;
  D.waterFill.style.width = (bed.water / mw * 100) + '%';
  D.waterFill.style.background = bed.water < 10 ? 'linear-gradient(90deg,#8a2f28,#ff6b5e)' : '';
  D.phLabel.textContent = fmtNum(bed.ph);
  D.phPin.style.left = clamp((bed.ph - 4.5) / 3.5 * 100, 2, 98) + '%';
  D.ecLabel.textContent = fmtNum(bed.ec, 2);
  D.ecPin.style.left = clamp(bed.ec / 4 * 100, 2, 98) + '%';

  const worst = worstCondition(bed, crop);
  const hint = conditionHint(bed, crop, worst);
  D.conditionHint.textContent = hint.text;
  D.conditionHint.className = 'condition-hint ' + hint.cls;
  D.bedStatusDot.className = 'status-dot ' + statusClass(bed, crop);

  const ready = bed.growth >= 0.995;
  D.btnHarvest.disabled = !ready;
  D.btnHarvest.textContent = ready ? `🧺 Cosechar ${fmtNum(estHarvestKg(bed))} kg` : `Creciendo… ${Math.floor(bed.growth * 100)}%`;

  const auto = state.upgrades.autoDoser && bed.type !== 'kratky';
  D.doseWater.disabled = auto || bed.water >= mw - 0.5 || state.cash < (state.upgrades.rain ? 1 : 3);
  D.doseEc.disabled = auto || state.cash < 2;
  D.dosePhdown.disabled = auto || state.cash < 1;
  D.dosePhup.disabled = auto || state.cash < 1;
  if (auto) D.conditionHint.textContent += ' · Auto-Dosificador activo.';
  renderTasks(bed);
}
function renderCycleTimeline(bed, crop) {
  if (!D.cycleTrack || !D.cycleLabels) return;
  const bt = BED_TYPES[bed.type];
  const week = weekOfBed(bed);
  const total = crop.cycleWeeks;
  const ready = bed.growth >= 0.995;
  const speed = bt.spec.growth || 1;
  const daysLeft = ready ? 0 : Math.max(1, Math.ceil((1 - bed.growth) * crop.growDays / speed));
  const etaDay = state.day + daysLeft;
  D.harvestEta.textContent = ready ? 'LISTA PARA COSECHAR' : `EN ${daysLeft} D · DÍA ${etaDay}`;
  D.harvestEta.title = ready ? 'Cosechá ahora desde el panel' : `Estimado según crecimiento y salud actual. Aproximadamente día ${etaDay} del juego.`;
  const segs = [];
  const labels = [];
  for (let w = 1; w <= total; w++) {
    const isLast = w === total;
    const cls = ['cycle-seg'];
    if (w < week) cls.push('done');
    if (w === week) cls.push('current');
    if (isLast) cls.push('harvest');
    segs.push(`<span class="${cls.join(' ')}" title="Semana ${w} de ${total}${isLast ? ' · cosecha' : ''}"></span>`);
    labels.push(`<span class="${w === week ? 'now' : isLast ? 'end' : ''}">${isLast ? 'COSECHA' : 'S' + w}</span>`);
  }
  D.cycleTrack.innerHTML = segs.join('');
  D.cycleLabels.innerHTML = labels.join('');
}

function conditionHint(bed, crop, worst) {
  const t = greenhouseTemp();
  const s = worst.scores;
  if (bed.water <= 0.5) return { text: 'Tanque vacío: ¡las raíces se están secando! Rellená ya.', cls: 'bad' };
  if (bed.health < 35) return { text: 'Salud del cultivo crítica. Corregí pH / EC / temperatura o perdés la cosecha.', cls: 'bad' };
  if (s.ph < 0.6) return { text: `El pH ${fmtNum(bed.ph)} está fuera de rango: apuntá a 5,5–6,5. Usá pH${bed.ph > 6.5 ? '−' : '+'}.`, cls: 'warn' };
  if (s.ec < 0.6) return { text: `La EC ${fmtNum(bed.ec, 2)} está fuera de ${crop.ec[0]}–${crop.ec[1]} mS/cm. Agregá o diluí nutrientes.`, cls: 'warn' };
  if (s.temp < 0.6) return { text: `El invernadero está a ${t}°C: ${t > 29 ? '¡estrés por calor!' : 'muy frío para crecer fuerte.'} ${state.upgrades.hvac ? 'El HVAC está ayudando.' : 'Considerá HVAC o media sombra.'}`, cls: 'warn' };
  if (bed.water < 10) return { text: 'Queda poca solución nutritiva: rellená pronto.', cls: 'warn' };
  if (bed.ph > 6.5) return { text: 'Un poco alcalino. Una dosis chica de pH− mantiene la absorción óptima.', cls: 'warn' };
  if (bed.ph < 5.5) return { text: 'Un poco ácido. Una dosis chica de pH+ lo devuelve al rango.', cls: 'warn' };
  return { text: 'Condiciones perfectas. Las plantas están explotando.', cls: '' };
}

/* ───────────────────────── MODAL RENDERERS ───────────────────────── */
function renderMarket() {
  D.marketRows.innerHTML = CROPS.map(c => {
    const m = state.market[c.id];
    const stock = state.inventory[c.id] || 0;
    const price = sellPrice(c.id, state);
    const diff = m.price - m.prev;
    const arrow = diff > 0.005 ? '<span class="up">▲</span>' : diff < -0.005 ? '<span class="down">▼</span>' : '<span class="flat">◆</span>';
    return `<div class="market-row">
      <div class="m-icon">${c.icon}</div>
      <div class="m-name"><strong>${c.name}</strong><small>EC ideal ${c.ec[0]}–${c.ec[1]}</small></div>
      <div class="m-price">${fmtMoney(price)}/kg ${arrow}</div>
      <div class="m-stock">${fmtNum(stock)} kg</div>
      <button class="mini-btn" data-sell="1" data-crop="${c.id}" ${stock < 0.05 ? 'disabled' : ''}>1 kg</button>
      <button class="mini-btn all" data-sell="all" data-crop="${c.id}" ${stock < 0.05 ? 'disabled' : ''}>Todo</button>
    </div>`;
  }).join('');
  D.marketInventoryValue.textContent = fmtMoney(inventoryValue(state));
}
function renderContracts() {
  const offers = state.contracts.offers;
  D.contractOffers.innerHTML = offers.length ? offers.map(o => {
    const crop = cropById(o.cropId);
    const days = Math.max(1, o.expires - state.day);
    return `<div class="contract-card">
      <div class="c-icon">${crop.icon}</div>
      <div class="c-body">
        <strong>${o.qty} kg ${crop.name}</strong>
        <small>Pedido premium · aceptá en ${days} día${days > 1 ? 's' : ''} · entregá antes del día ${o.deadline}</small>
      </div>
      <div class="c-reward"><strong>${fmtMoney(o.reward)}</strong><small>+0,18★</small></div>
      <button class="mini-btn all" data-accept="${o.id}">Aceptar</button>
      <button class="mini-btn" data-decline="${o.id}">✕</button>
    </div>`;
  }).join('') : `<div class="contract-empty">No hay ofertas ahora: los compradores aparecen casi todas las mañanas.</div>`;

  const active = state.contracts.active;
  D.contractActive.innerHTML = active.length ? active.map(c => {
    const crop = cropById(c.cropId);
    const stock = state.inventory[c.cropId] || 0;
    const days = c.deadline - state.day;
    const enough = stock >= c.qty - 0.001;
    return `<div class="contract-card">
      <div class="c-icon">${crop.icon}</div>
      <div class="c-body">
        <strong>${c.qty} kg ${crop.name}</strong>
        <small>En depósito: ${fmtNum(stock)} kg · <span class="c-deadline ${days <= 1 ? 'urgent' : ''}">${days <= 0 ? 'VENCE HOY' : days + ' día' + (days > 1 ? 's' : '') + ' restante' + (days > 1 ? 's' : '')}</span></small>
      </div>
      <div class="c-reward"><strong>${fmtMoney(c.reward)}</strong><small>pedido premium</small></div>
      <button class="mini-btn ${enough ? 'all' : ''}" data-deliver="${c.id}" ${enough ? '' : 'disabled'}>${enough ? 'Entregar' : 'Falta stock'}</button>
    </div>`;
  }).join('') : `<div class="contract-empty">No tenés pedidos activos. Aceptá uno arriba para asegurar precios premium.</div>`;
}
function renderUpgrades() {
  D.upgradeGrid.innerHTML = UPGRADES.map(u => {
    const lvl = upgradeLevel(u.id);
    const cost = upgradeCost(u.id);
    const maxed = cost == null;
    const pips = Array.from({ length: u.maxLevel }, (_, i) => `<span class="pip ${i < lvl ? 'on' : ''}"></span>`).join('');
    return `<div class="upgrade-card ${maxed ? 'maxed' : ''}">
      <div class="u-head"><span class="u-icon">${u.icon}</span><strong>${u.name}</strong></div>
      <div class="pips">${pips}</div>
      <p>${u.desc}</p>
      <div class="u-foot">
        <span class="u-cost">${maxed ? 'AL MÁXIMO' : fmtMoney(cost)}</span>
        ${maxed ? '' : `<button class="mini-btn all" data-upgrade="${u.id}" ${state.cash < cost ? 'disabled' : ''}>${lvl ? 'Mejorar' : 'Comprar'}</button>`}
      </div>
    </div>`;
  }).join('');
}
function renderGoals() {
  D.goalsList.innerHTML = GOALS.map(g => {
    const done = !!state.goalsDone[g.id];
    return `<div class="goal-item ${done ? 'done' : ''}">
      <div class="goal-check">${done ? '✓' : ''}</div>
      <div class="goal-body"><strong>${g.name}</strong><small>${g.desc}</small></div>
      <div class="goal-reward">${done ? 'listo' : fmtMoney(g.reward)}</div>
    </div>`;
  }).join('');
}
function renderBuildCards() {
  if (!D.buildCards) return;
  D.buildCards.innerHTML = BED_IDS.map((id, i) => {
    const bt = BED_TYPES[id];
    const cost = bedCost(id);
    const afford = state && state.cash >= cost;
    const sp = bt.spec;
    return `<button class="build-card ${afford ? '' : 'insufficient'} ${buildMode === id ? 'selected' : ''}" data-build-type="${id}">
      <span class="b-icon">${bt.icon}</span>
      <strong>${bt.name}</strong>
      <small>${bt.plants} sitios · ${sp.energy === 0 ? 'sin energía' : fmtPrice(sp.energy) + '/día'} · ${sp.difficulty}</small>
      <span class="b-cost">${fmtMoney(cost)} <span style="opacity:.5;font-weight:500">[${i + 1}]</span></span>
    </button>`;
  }).join('');
}


/* ───────────────────────── SYSTEMS LAB ───────────────────────── */
function potentialFor(typeId, cropId) {
  const bt = BED_TYPES[typeId], c = cropById(cropId);
  const cyclesYr = 52 / c.cycleWeeks;
  const kgYr = bt.plants * c.yieldKg * cyclesYr * bt.spec.growth;
  const revYr = kgYr * c.basePrice;
  const costs = {
    seeds: c.seedCost * cyclesYr,
    energy: bt.spec.energy * 365,
    water: bt.water.consumptionLDay * WATER_COST_L * 365,
    nutrients: 3.4 * 52,
    labor: bt.spec.laborHrsWeek * LABOR_RATE * 0.5 * 52,
  };
  const costYr = Object.values(costs).reduce((sum, amount) => sum + amount, 0);
  const netYr = revYr - costYr;
  const netDay = netYr / 365;
  const capex = bt.cost;
  const area = bt.size ? bt.size.w * bt.size.d : 3;
  return {
    bt, c, cyclesYr, kgYr, revYr, costs, costYr, netYr, netDay, capex,
    payback: netDay > 0 ? capex / netDay : null,
    perM2Wk: (netYr / 52) / area,
  };
}
function bestCropFor(typeId) {
  let best = null;
  for (const cid of BED_TYPES[typeId].crops) {
    const p = potentialFor(typeId, cid);
    if (!best || p.netDay > best.p.netDay) best = { cid, p };
  }
  return best;
}
function bestSystemId() {
  let best = null;
  for (const id of BED_IDS) {
    const b = bestCropFor(id);
    if (!best || b.p.netDay > best.p.netDay) best = { id, p: b.p };
  }
  return best.id;
}
function setLabTab(tab) {
  lab.tab = tab;
  if (!D.labTabs) return;
  D.labTabs.querySelectorAll('[data-labtab]').forEach(el => el.classList.toggle('active', el.dataset.labtab === tab));
  const panes = { systems: D.labSystems, cycles: D.labCycles, profit: D.labProfit, timeline: D.labTimeline, greenhouses: D.labGreenhouses };
  Object.entries(panes).forEach(([key, el]) => { if (el) el.classList.toggle('hidden', key !== tab); });
  if (tab !== 'systems' && typeof World !== 'undefined') World.unmountPreview();
  renderLab();
}
function openLab(tab, systemId, cropId) {
  if (!state) return;
  lab.tab = tab || lab.tab || 'systems';
  if (systemId && BED_TYPES[systemId]) lab.system = systemId;
  if (cropId && BED_TYPES[lab.system].crops.includes(cropId)) lab.crop = cropId;
  if (!BED_TYPES[lab.system].crops.includes(lab.crop)) lab.crop = BED_TYPES[lab.system].crops[0];
  openModal('modal-systems');
  setLabTab(lab.tab);
}
function renderLab() {
  if (!state) return;
  if (lab.tab === 'systems' && D.labSystems) renderLabSystems();
  if (lab.tab === 'cycles' && D.labCycles) renderLabCycles();
  if (lab.tab === 'profit' && D.labProfit) renderLabProfit();
  if (lab.tab === 'timeline' && D.labTimeline) renderLabTimeline();
  if (lab.tab === 'greenhouses' && D.labGreenhouses) renderLabGreenhouses();
}
function renderLabSystems() {
  const sys = lab.system;
  const best = bestSystemId();
  const cards = BED_IDS.map(id => {
    const bt = BED_TYPES[id];
    const owned = state.beds.filter(b => b.type === id).length;
    return `<button class="system-card ${id === sys ? 'selected' : ''}" data-sys="${id}">
      <div class="sc-top"><span class="sc-icon">${bt.icon}</span><strong>${bt.name}</strong></div>
      <small>${bt.layout.total} plantas · ${bt.spec.difficulty}${owned ? ' · ' + owned + ' en uso' : ''}</small>
      <span class="sc-cost">${fmtMoney(bt.cost)}</span>
      ${id === best ? '<span class="lab-best">MEJOR MARGEN</span>' : ''}
    </button>`;
  }).join('');
  const bt = BED_TYPES[sys], sp = bt.spec, lay = bt.layout;
  const bc = bestCropFor(sys);
  const variants = sp.variants.map(v => `<span>${v}</span>`).join('');
  const tasks = bt.tasks.map(t => `<li>${t.label}${t.auto ? ' <em class="auto-tag">AUTO</em>' : ''}</li>`).join('');
  const bomTotal = bt.materials.reduce((sum, m) => sum + m.qty * m.unitCost, 0);
  const bomRows = bt.materials.map(m => `<tr>
      <td>${m.name}</td><td>${m.qty} ${m.unit}</td><td>${fmtPrice(m.unitCost)}</td><td>${fmtMoney(m.qty * m.unitCost)}</td>
    </tr>`).join('');
  const stages = bt.water.stages.map((st, i) => {
    const isReturn = i === bt.water.stages.length - 1 || /retorno|vuelta|drenaje|reposición/i.test(st.label);
    return `<div class="wc-stage ${isReturn ? 'return' : ''}"><b>${i + 1}. ${st.label}</b><small>${st.detail}</small></div>`;
  }).join('');
  const eq = lay.units > 1
    ? `<span>${lay.units} ${lay.unit}s</span><span>×</span><span>${lay.perUnit} sitios</span><span>=</span><span class="eq-total">${lay.total} plantas</span>`
    : `<span>1 ${lay.unit}</span><span>·</span><span>${lay.perUnit} sitios</span><span>=</span><span class="eq-total">${lay.total} plantas</span>`;

  if (typeof World !== 'undefined') World.unmountPreview();
  D.labSystems.innerHTML = `
    <div class="system-grid">${cards}</div>
    <div class="sys-detail">
      <div class="sys-detail-head">
        <div><small class="panel-kicker">FICHA TÉCNICA + VISTA 3D</small><h3>${bt.icon} ${bt.name}</h3></div>
        <div class="lab-best">${fmtMoney(bt.cost)} DE INVERSIÓN</div>
      </div>
      <p>${sp.principle}</p>
      <div class="lab-detail-grid">
        <div>
          <div class="lab-preview" id="lab-preview"></div>
          <div class="sys-spec">
            <div><small>PLANTAS</small><b>${lay.total}</b></div>
            <div><small>SUPERFICIE</small><b>${sp.areaM2.toFixed(1).replace('.', ',')} m²</b></div>
            <div><small>MEDIDAS</small><b>${sp.footprint} m</b></div>
            <div><small>ENERGÍA / DÍA</small><b>${sp.energy === 0 ? 'PASIVA' : fmtPrice(sp.energy)}</b></div>
            <div><small>VELOCIDAD</small><b>${Math.round(sp.growth * 100)}%</b></div>
            <div><small>AGUA / DÍA</small><b>${bt.water.consumptionLDay} L</b></div>
            <div><small>DIFICULTAD</small><b>${sp.difficulty}</b></div>
            <div><small>MANO DE OBRA</small><b>${fmtNum(sp.laborHrsWeek)} h/sem</b></div>
          </div>
          <div class="layout-box">
            <div class="lb-title">GEOMETRÍA DEL MÓDULO</div>
            <div class="layout-equation">${eq}</div>
            <div class="layout-note"><b>${lay.distribution}</b> · separación ${lay.spacingCm} cm · ${lay.tubeLength} · ${lay.rows}.<br>${lay.note}</div>
          </div>
          <div class="lab-section-title">Circuito de agua · ida y vuelta</div>
          <div class="water-circuit">${stages}</div>
          <div class="water-meta">
            <span>Tanque <b>${bt.water.tankL} L</b></span>
            <span>Bomba <b>${bt.water.pump}</b></span>
            <span>Ciclo <b>${bt.water.cycle}</b></span>
            <span>Retorno <b>${bt.water.return}</b></span>
            <span>Consumo <b>${bt.water.consumptionLDay} L/día</b></span>
          </div>
        </div>
        <div>
          <div class="lab-section-title" style="margin-top:0">Lista de materiales</div>
          <div class="lab-scroll"><table class="bom-table">
            <thead><tr><th>Material</th><th>Cant.</th><th>Unitario</th><th>Total</th></tr></thead>
            <tbody>${bomRows}</tbody>
          </table></div>
          <div class="bom-total"><span>Inversión del módulo</span><b>${fmtMoney(bomTotal)}</b></div>
          <div class="lab-section-title">Estrategia</div>
          <p style="font-size:.68rem;line-height:1.5;color:#cfe9db"><b>Ideal para:</b> ${sp.best}.<br><b>Variantes:</b> ${variants}</p>
          <div class="lab-section-title">Cultivos compatibles</div>
          <div class="variant-chips">${bt.crops.map(cid => { const c = cropById(cid); return `<span>${c.icon} ${c.name} · ${c.cycleWeeks} sem</span>`; }).join('')}</div>
          <div class="lab-section-title">Mejor combinación teórica</div>
          <div class="layout-box" style="margin-top:0">
            <div class="layout-equation"><span class="eq-total">${bc.p.c.icon} ${bc.p.c.name}</span></div>
            <div class="layout-note">${fmtMoney(bc.p.netDay)}/día por módulo · ${bc.p.payback ? Math.round(bc.p.payback) + ' días de repago' : 'sin repago'} · ${fmtPrice(bc.p.perM2Wk)}/m²/sem.</div>
          </div>
          <div class="lab-section-title">Rutina semanal</div>
          <ul class="cycle-tasks">${tasks}</ul>
        </div>
      </div>
    </div>
    <p class="lab-note"><b>Cómo leer esta ficha:</b> la vista 3D muestra la geometría real del módulo; arrastrá para rotarlo. La lista de materiales suma la inversión de una unidad. El circuito explica por dónde entra el agua, cómo se distribuye y cómo vuelve al tanque. La pestaña <b>Rentabilidad</b> compara margen, repago y $/m²/semana.</p>`;
  if (typeof World !== 'undefined') World.mountPreview('lab-preview', sys);
}

function ganttHTML(beds, startDay, endDay, opts) {
  opts = opts || {};
  const span = Math.max(1, endDay - startDay + 1);
  const rows = beds.map(bed => {
    const bt = BED_TYPES[bed.type];
    const crop = bed.cropId ? cropById(bed.cropId) : null;
    const label = `${bt.icon} ${crop ? crop.name : 'Libre'}<small>${bt.name} · ${bt.layout.total} plantas</small>`;
    if (!crop) {
      return `<div class="gantt-row"><div class="gantt-label">${label}</div><div class="gantt-track"><div class="gantt-bar empty" style="left:0;width:100%">libre para plantar</div></div></div>`;
    }
    const start = bed.plantedDay || state.day;
    const hDay = start + Math.ceil(crop.growDays / (bt.spec.growth || 1));
    const left = clamp((start - startDay) / span * 100, 0, 100);
    const width = clamp((hDay - start) / span * 100, 2, 100 - left);
    const cls = bed.health < 35 ? 'bad' : bed.health < 65 ? 'warn' : '';
    const labelEnd = bed.growth >= 0.995 ? 'lista' : `día ${hDay}`;
    return `<div class="gantt-row"><div class="gantt-label">${label}</div><div class="gantt-track">
      <div class="gantt-bar ${cls}" style="left:${left}%;width:${width}%" title="${crop.name}: siembra día ${start} · cosecha estimada día ${hDay}">${labelEnd}</div>
      <div class="gantt-now" style="left:${clamp((state.day - startDay) / span * 100, 0, 100)}%"></div>
    </div></div>`;
  }).join('');
  const marks = [0, Math.round(span / 3), Math.round(span * 2 / 3), span - 1].map(i => `<span>D${startDay + i}</span>`).join('');
  return `<div class="gantt"><div class="gantt-axis"><span>UNIDAD / CULTIVO</span><div class="ga-track">${marks}</div></div>${rows}</div>`;
}

function renderLabTimeline() {
  const sys = lab.system;
  const bt = BED_TYPES[sys];
  if (!bt.crops.includes(lab.crop)) lab.crop = bt.crops[0];
  const crop = cropById(lab.crop);
  const sysChips = BED_IDS.map(id => `<button class="cycle-chip ${id === sys ? 'active' : ''}" data-sys="${id}">${BED_TYPES[id].icon} ${BED_TYPES[id].name}</button>`).join('');
  const cropChips = bt.crops.map(id => { const c = cropById(id); return `<button class="cycle-chip ${id === crop.id ? 'active' : ''}" data-crop="${id}">${c.icon} ${c.name}</button>`; }).join('');
  const N = crop.cycleWeeks;
  const pts = [];
  for (let w = 0; w <= N; w++) {
    const pct = w === 0 ? 0 : Math.min(100, Math.round((w / N) * 100));
    pts.push([40 + (w / N) * 520, 130 - (pct / 100) * 100]);
  }
  const poly = pts.map(p => p.join(',')).join(' ');
  const area = `40,130 ${poly} 560,130`;
  const grid = [0, 25, 50, 75, 100].map(v => {
    const y = 130 - (v / 100) * 100;
    return `<line x1="40" y1="${y}" x2="560" y2="${y}" stroke="rgba(255,255,255,.08)" stroke-width="1"/><text x="30" y="${y + 3}" fill="#8fb8a4" font-size="8" text-anchor="end">${v}%</text>`;
  }).join('');
  const weeks = Array.from({ length: N + 1 }, (_, w) => {
    const x = 40 + (w / N) * 520;
    return `<line x1="${x}" y1="30" x2="${x}" y2="130" stroke="rgba(56,214,224,.15)" stroke-width="1"/><text x="${x}" y="145" fill="#8fb8a4" font-size="8" text-anchor="middle">${w === 0 ? 'SIEMBRA' : w === N ? 'COSECHA' : 'S' + w}</text>`;
  }).join('');
  const activeBeds = state.beds.filter(b => b.type === sys && b.cropId === crop.id);
  const marker = activeBeds.length ? (() => {
    const b = activeBeds[0];
    const x = 40 + clamp(b.growth, 0, 1) * 520;
    return `<line x1="${x}" y1="30" x2="${x}" y2="130" stroke="#ffc44d" stroke-width="2"/><circle cx="${x}" cy="${130 - clamp(b.growth,0,1)*100}" r="4" fill="#ffc44d"/>`;
  })() : '';
  const harvestKg = fmtNum(bt.layout.total * crop.yieldKg * bt.spec.growth);
  const start = Math.max(1, state.day - 2);
  const harvestDays = state.beds.filter(b => b.cropId).map(b => (b.plantedDay || state.day) + Math.ceil(cropById(b.cropId).growDays / (BED_TYPES[b.type].spec.growth || 1)));
  const end = Math.max(state.day + 18, ...harvestDays, state.day + 7);
  D.labTimeline.innerHTML = `
    <div class="cycle-controls">${sysChips}</div>
    <div class="cycle-controls">${cropChips}</div>
    <div class="sys-spec">
      <div><small>CICLO</small><b>${crop.cycleWeeks} semanas</b></div>
      <div><small>DÍAS</small><b>${crop.growDays} días</b></div>
      <div><small>COSECHA / MÓDULO</small><b>${harvestKg} kg</b></div>
      <div><small>INGRESO BRUTO</small><b>${fmtMoney(harvestKg * crop.basePrice)}</b></div>
    </div>
    <div class="lab-section-title">Curva de crecimiento y etapas</div>
    <div class="dash-panel" style="padding:8px"><svg viewBox="0 0 600 160" style="width:100%;height:auto;display:block" role="img" aria-label="Curva de crecimiento de ${crop.name}">
      ${grid}${weeks}
      <polygon points="${area}" fill="rgba(62,224,138,.12)"/>
      <polyline points="${poly}" fill="none" stroke="#3ee08a" stroke-width="3" stroke-linejoin="round"/>
      <text x="40" y="20" fill="#3ee08a" font-size="9" font-weight="700">CRECIMIENTO ACUMULADO · ${crop.name.toUpperCase()}</text>
      ${marker}
    </svg></div>
    <div class="lab-section-title">Cronograma de todas las camas · próximos 20 días</div>
    <div class="gantt-wrap">${ganttHTML(state.beds, start, end)}</div>
    <p class="lab-note"><b>Cómo leer el cronograma:</b> cada barra va desde la siembra hasta la cosecha estimada según el sistema y la salud actual. La línea blanca marca el día de hoy; la línea ámbar de la curva muestra el avance de la primera cama de esta combinación. Una barra roja o ámbar indica salud baja: la cosecha puede atrasarse. Las camas libres se pueden plantar ya.</p>`;
}
function renderLabGreenhouses() {
  const cards = GREENHOUSES.map(gh => {
    const plan = ghPlanSVG(gh);
    return `<div class="gh-card">
      <div class="gh-head"><strong>${gh.icon} ${gh.name}</strong><span class="gh-level">${gh.level}</span></div>
      <div class="gh-plan">${plan}</div>
      <div class="gh-specs">
        <span>Superficie <b>${gh.areaM2} m²</b></span>
        <span>Capacidad <b>${gh.capacityBeds} módulos</b></span>
        <span>Estructura <b>${gh.structure}</b></span>
        <span>Cubierta <b>${gh.cover}</b></span>
        <span>Ventilación <b>${gh.ventilation}</b></span>
        <span>Clima <b>${gh.climate}</b></span>
        <span>Tanque <b>${gh.waterTankL} L</b></span>
        <span>Potencia <b>${gh.powerKW} kW</b></span>
      </div>
      <p class="gh-note"><b>Ideal para:</b> ${gh.bestFor}. ${gh.notes}</p>
      <div class="gh-foot"><span class="gh-cost">${fmtMoney(gh.cost)}</span><button class="mini-btn all gh-quote" data-quote="${gh.id}">Presupuestar →</button></div>
    </div>`;
  }).join('');
  D.labGreenhouses.innerHTML = `
    <p class="lab-note" style="margin-top:0;border-top:0;padding-top:0">Seis formas de montar el mismo negocio. El plano muestra medidas reales; la capacidad es una referencia para módulos de 2–4 m². Elegí uno y el <b>Asesor IA</b> arma el presupuesto completo con sistema, camas, costos fijos y repago.</p>
    <div class="gh-grid">${cards}</div>
    <p class="lab-note"><b>Cómo elegir:</b> el túnel y la capilla minimizan inversión y son ideales para hoja verde; el multitúnel y la nave permiten volumen y contratos; el container maximiza plantas por m² pero castiga el costo eléctrico; el módulo plug & play sirve para validar un cliente antes de escalar. Compará siempre <b>inversión por m²</b>, <b>costo semanal</b> y <b>repago</b>, no solo el precio de la estructura.</p>`;
}
function ghPlanSVG(gh) {
  const W = 260, H = 112, pad = 24;
  const { w, d } = gh.dims;
  const scale = Math.min((W - pad * 2) / w, (H - pad * 2) / d);
  const rw = w * scale, rh = d * scale;
  const x = (W - rw) / 2, y = (H - rh) / 2 + 3;
  const lines = [];
  for (let i = 1; i < w; i++) {
    const lx = x + i * scale;
    lines.push(`<line x1="${lx}" y1="${y}" x2="${lx}" y2="${y + rh}" stroke="rgba(56,214,224,.14)" stroke-width="1"/>`);
  }
  for (let j = 1; j < d; j++) {
    const ly = y + j * scale;
    lines.push(`<line x1="${x}" y1="${ly}" x2="${x + rw}" y2="${ly}" stroke="rgba(56,214,224,.14)" stroke-width="1"/>`);
  }
  const beds = [];
  const rows = Math.max(1, Math.min(5, Math.round(d / 2)));
  for (let r = 0; r < rows; r++) {
    const by = y + rh * (r + 0.18) / rows;
    const bh = Math.max(3, rh / rows * 0.34);
    beds.push(`<rect x="${x + rw * 0.12}" y="${by}" width="${rw * 0.76}" height="${bh}" rx="1.5" fill="rgba(62,224,138,.22)" stroke="rgba(62,224,138,.5)" stroke-width=".7"/>`);
  }
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Plano de ${gh.name}, ${w} por ${d} metros">
    <rect x="${x}" y="${y}" width="${rw}" height="${rh}" fill="rgba(56,214,224,.04)" stroke="#38d6e0" stroke-width="1.4"/>
    ${lines}${beds.join('')}
    <line x1="${x}" y1="${y - 9}" x2="${x + rw}" y2="${y - 9}" stroke="#8fb8a4" stroke-width=".8"/>
    <text x="${x + rw / 2}" y="${y - 13}" fill="#b9d8c8" font-size="8" text-anchor="middle">${String(w).replace('.', ',')} m</text>
    <line x1="${x - 9}" y1="${y}" x2="${x - 9}" y2="${y + rh}" stroke="#8fb8a4" stroke-width=".8"/>
    <text x="${x - 12}" y="${y + rh / 2}" fill="#b9d8c8" font-size="8" text-anchor="middle" transform="rotate(-90 ${x - 12} ${y + rh / 2})">${String(d).replace('.', ',')} m</text>
    <text x="${W - 8}" y="${H - 5}" fill="#38d6e0" font-size="7.5" text-anchor="end">${gh.areaM2} m² · ${gh.capacityBeds} módulos</text>
  </svg>`;
}

function renderLabCycles() {
  const sys = lab.system;
  const bt = BED_TYPES[sys];
  if (!bt.crops.includes(lab.crop)) lab.crop = bt.crops[0];
  const crop = cropById(lab.crop);
  const sysChips = BED_IDS.map(id => `<button class="cycle-chip ${id === sys ? 'active' : ''}" data-sys="${id}">${BED_TYPES[id].icon} ${BED_TYPES[id].name}</button>`).join('');
  const cropChips = bt.crops.map(id => {
    const c = cropById(id);
    return `<button class="cycle-chip ${id === crop.id ? 'active' : ''}" data-crop="${id}">${c.icon} ${c.name}</button>`;
  }).join('');

  const rows = [];
  for (let week = 1; week <= crop.cycleWeeks; week++) {
    const base = bt.tasks.map(t => t.label);
    const extra = cropWeeklyTask(crop.id, week, crop.cycleWeeks);
    if (extra) base.push(extra);
    const pct = Math.round((week / crop.cycleWeeks) * 100);
    let stage = 'Plantín / establecimiento';
    if (week >= crop.cycleWeeks) stage = 'Cosecha y reinicio';
    else if (pct >= 65) stage = crop.beds.includes('bucket') ? 'Floración / fructificación' : 'Maduración';
    else if (pct >= 30) stage = crop.beds.includes('bucket') ? 'Vegetativo / floración' : 'En hojas';
    const target = `pH 5,5–6,5 · EC ${crop.ec[0]}–${crop.ec[1]} mS/cm · ~${pct}% de crecimiento`;
    const sub = week === 1 ? 'siembra' : week === crop.cycleWeeks ? 'semana de cosecha' : 'día ' + ((week - 1) * 7 + 1) + '–' + (week * 7);
    rows.push(`<tr>
      <td class="wk">SEMANA ${week}<small>${sub}</small></td>
      <td>${stage}</td>
      <td><ul class="cycle-tasks">${base.map(t => `<li>${t}</li>`).join('')}</ul></td>
      <td>${target}</td>
    </tr>`);
  }
  const harvestKg = fmtNum(BED_TYPES[sys].plants * crop.yieldKg * bt.spec.growth);
  const rev = harvestKg * crop.basePrice;
  D.labCycles.innerHTML = `
    <div class="cycle-controls">${sysChips}</div>
    <div class="cycle-controls">${cropChips}</div>
    <div class="sys-spec">
      <div><small>DURACIÓN</small><b>${crop.cycleWeeks} semanas</b></div>
      <div><small>COSECHA / CAMA</small><b>${harvestKg} kg</b></div>
      <div><small>SEMILLAS</small><b>${fmtMoney(crop.seedCost)}</b></div>
      <div><small>BRUTO / CAMA</small><b>${fmtMoney(rev)}</b></div>
    </div>
    <div class="lab-scroll"><table class="week-table">
      <thead><tr><th>Semana</th><th>Etapa</th><th>Mantenimiento y actividades</th><th>Objetivos</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table></div>
    <p class="lab-note"><b>Cómo leer el ciclo:</b> cada semana se repiten los chequeos del sistema más una tarea específica del cultivo (raleo, poda, tutorado, sanitizado). Completalas desde el panel de la cama: cada tarea da +salud y un pequeño empujón de crecimiento. La semana 1 es siembra; la última termina en cosecha y reinicio del sistema. <b>${bt.name}</b> hace ${bt.tasks.length} chequeos por semana y ${bt.spec.energy === 0 ? 'no usa electricidad' : `consume ${fmtPrice(bt.spec.energy)}/día de energía`}.</p>`;
}
function renderLabProfit() {
  const start = state.stats.startDay || 1;
  const days = Math.max(1, state.day - start + 1);
  const actualRows = BED_IDS.map(id => {
    const bt = BED_TYPES[id];
    const rec = (state.stats.bySystem && state.stats.bySystem[id]) || { harvests: 0, kg: 0, revenue: 0, seedCost: 0, upkeep: 0, capex: 0 };
    const beds = state.beds.filter(b => b.type === id).length;
    const costs = rec.seedCost + rec.upkeep + rec.capex;
    const net = rec.revenue - costs;
    const roi = rec.capex > 0 ? (net / rec.capex) * 100 : 0;
    const perDay = net / days;
    const cls = net >= 0 ? 'profit-positive' : 'profit-negative';
    return `<tr>
      <td>${bt.icon} <b>${bt.name}</b><br><small style="color:var(--text-dim)">${beds} cama${beds === 1 ? '' : 's'}</small></td>
      <td>${rec.harvests} / ${fmtNum(rec.kg)} kg</td>
      <td>${fmtMoney(rec.revenue)}</td>
      <td>${fmtMoney(costs)}</td>
      <td class="${cls}">${fmtMoney(net)}</td>
      <td class="${cls}">${roi.toFixed(0)}%</td>
      <td class="${cls}">${fmtMoney(perDay)}</td>
    </tr>`;
  }).join('');

  const ranked = BED_IDS.map(id => {
    const b = bestCropFor(id);
    return { id, ...b };
  }).sort((a, b) => b.p.netDay - a.p.netDay);
  const topId = ranked[0].id;
  const costLabels = { seeds: 'Semillas', energy: 'Energía', water: 'Agua', nutrients: 'Nutrientes', labor: 'Mano de obra' };
  const potRows = ranked.map(({ id, p }) => {
    const bt = BED_TYPES[id];
    const costDetails = Object.entries(p.costs).map(([key, amount]) => `<div><span>${costLabels[key]}</span><b>${fmtMoney(amount)}</b></div>`).join('');
    return `<tr>
      <td>${bt.icon} <b>${bt.name}</b>${id === topId ? ' <span class="lab-best">MEJOR</span>' : ''}<br><small style="color:var(--text-dim)">${bt.spec.footprint} · ${bt.plants} sitios</small></td>
      <td>${p.c.icon} ${p.c.name}<br><small style="color:var(--text-dim)">${p.c.cycleWeeks} sem de ciclo</small></td>
      <td>${p.kgYr.toFixed(0)} kg</td>
      <td>${fmtMoney(p.revYr)}</td>
      <td>${fmtMoney(p.costYr)}<details class="profit-breakdown"><summary>Ver desglose</summary><div class="profit-breakdown-list">${costDetails}</div></details></td>
      <td class="profit-positive">${fmtMoney(p.netYr)}</td>
      <td>${p.payback ? Math.round(p.payback) + ' días' : '—'}</td>
      <td class="profit-positive">${fmtPrice(p.perM2Wk)}</td>
    </tr>`;
  }).join('');
  const topP = ranked[0].p;
  D.labProfit.innerHTML = `
    <div class="lab-note" style="margin-top:0;border-top:0;padding-top:0"><b>Sistema más rentable ahora:</b> ${topP.bt.icon} <b>${topP.bt.name}</b> con ${topP.c.icon} ${topP.c.name} — unos <b>${fmtMoney(topP.netDay)}/día por cama</b>, ${topP.payback ? Math.round(topP.payback) + ' días de repago' : 'sin repago'}, ${fmtPrice(topP.perM2Wk)}/m²/semana.</div>
    <div class="lab-section-title">Tu granja — rendimiento real</div>
    <div class="lab-scroll"><table class="lab-table">
      <thead><tr><th>Sistema</th><th>Cosechas</th><th>Facturado</th><th>Costos totales</th><th>Neto</th><th>ROI</th><th>$/día</th></tr></thead>
      <tbody>${actualRows}</tbody>
    </table></div>
    <p class="lab-note">Los reales incluyen la inversión en camas, las semillas y la parte diaria de mantenimiento. Los sistemas sin camas muestran cero: construí uno para empezar a medir. El neto es facturación menos todos los costos, así que una cama nueva arranca en negativo hasta que se repaga.</p>
    <div class="lab-section-title">Potencial teórico — una cama, mejor cultivo</div>
    <div class="lab-scroll"><table class="lab-table">
      <thead><tr><th>Sistema</th><th>Mejor cultivo</th><th>Kg/año</th><th>Facturado/año</th><th>Operación/año</th><th>Neto/año</th><th>Repago</th><th>$/m²/sem</th></tr></thead>
      <tbody>${potRows}</tbody>
    </table></div>
    <p class="lab-note"><b>Supuestos:</b> ocupación total, pH/EC/agua ideales, precios base actuales y 52 semanas de operación. Abrí <b>Ver desglose</b> en la columna Operación/año para comparar semillas, electricidad, agua, nutrientes y mano de obra estimada al 50% de la tarifa de referencia. No incluye estructura del invernadero, empaque, logística, impuestos ni pérdidas; el repago usa solo el costo de la cama. Por eso es una comparación orientativa, no una proyección financiera.</p>`;
}

/* ───────────────────────── PANEL TEMPORAL ───────────────────────── */
function compactMoney(n) {
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (a >= 1000000) return sign + '$' + (a / 1000000).toFixed(1).replace('.', ',') + 'M';
  if (a >= 1000) return sign + '$' + (a / 1000).toFixed(a >= 10000 ? 0 : 1).replace('.', ',') + 'k';
  return fmtMoney(n);
}
function dashKpi(label, value, cls) {
  return `<div class="dash-kpi"><small>${label}</small><strong class="${cls || ''}">${value}</strong></div>`;
}
function nextHarvestInfo() {
  return state.beds.filter(b => b.cropId).map(b => {
    const crop = cropById(b.cropId);
    const speed = BED_TYPES[b.type].spec.growth || 1;
    const days = b.growth >= 0.995 ? 0 : Math.max(1, Math.ceil((1 - b.growth) * crop.growDays / speed));
    return { bed: b, crop, days, eta: state.day + days, ready: b.growth >= 0.995 };
  }).sort((a, b) => a.days - b.days);
}
function renderDashboard() {
  if (!state || !D.dashKpis) return;
  const active = state.beds.filter(b => b.cropId);
  const next = nextHarvestInfo()[0];
  const week = Math.floor((state.day - 1) / 7) + 1;
  D.dashKpis.innerHTML = [
    dashKpi('CAJA', state.godMode ? '∞' : fmtMoney(state.cash), state.godMode ? 'cyan' : state.cash < 0 ? 'neg' : 'pos'),
    dashKpi('PATRIMONIO', state.godMode ? '∞' : fmtMoney(netWorth(state))),
    dashKpi('FACTURADO', fmtMoney(state.stats.revenue), 'pos'),
    dashKpi('COSECHADO', (state.stats.kgHarvested || 0).toFixed(1).replace('.', ',') + ' kg', 'cyan'),
    dashKpi('CAMAS ACTIVAS', `${active.length} / ${state.beds.length}`),
    dashKpi('PRÓXIMA COSECHA', next ? (next.ready ? 'LISTA' : 'D' + next.days) : '—', next && next.ready ? 'pos' : 'cyan'),
  ].join('');
  D.dashKpis.title = `Semana ${week} · día ${state.day}`;
  D.dashCash.innerHTML = cashChartSVG();
  D.dashHarvest.innerHTML = harvestChartSVG();
  D.dashCash.classList.toggle('empty', !D.dashCash.querySelector('svg'));
  D.dashHarvest.classList.toggle('empty', !D.dashHarvest.querySelector('svg'));
  const start = Math.max(1, state.day - 7);
  const harvestDays = state.beds.filter(b => b.cropId).map(b => (b.plantedDay || state.day) + Math.ceil(cropById(b.cropId).growDays / (BED_TYPES[b.type].spec.growth || 1)));
  const end = Math.max(state.day + 21, ...harvestDays);
  D.dashGantt.innerHTML = ganttHTML(state.beds, start, end);
  renderDashEvents();
}
function renderDashEvents() {
  if (!D.dashEvents) return;
  D.dashFilters.querySelectorAll('[data-filter]').forEach(el => el.classList.toggle('active', el.dataset.filter === dashFilter));
  const icons = { crop: '🌱', money: '💵', system: '🛠️', weather: '🌤️' };
  const list = (state.events || []).filter(ev => dashFilter === 'all' || ev.category === dashFilter).slice(0, 90);
  D.dashEvents.innerHTML = list.length ? list.map(ev => {
    const amt = ev.amount == null ? '' : `<span class="ev-amount ${ev.amount >= 0 ? 'pos' : 'neg'}">${fmtMoney(ev.amount, true)}</span>`;
    return `<div class="event-item"><span class="ev-day">D${ev.day} ${ev.time}</span><span class="ev-icon">${icons[ev.category] || '•'}</span><span class="ev-text">${ev.text}</span>${amt}</div>`;
  }).join('') : '<div class="chart-empty">Todavía no hay eventos de esta categoría.<br>Avanzá los días y la granja va a escribir su propio registro.</div>';
}
function cashChartSVG() {
  const raw = (state.history && Array.isArray(state.history.cash) ? state.history.cash : []).slice(-42);
  if (!raw.length) {
    return '<div class="chart-empty">La línea de caja aparece cuando arranca la partida.</div>';
  }
  const arr = raw.length === 1 ? [raw[0], { day: raw[0].day, value: raw[0].value }] : raw;
  const W = 600, H = 168, padL = 56, padR = 14, padT = 16, padB = 24;
  const vals = arr.map(p => p.value);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (max - min < 1) { max += 60; min -= 60; }
  const span = max - min;
  const px = i => padL + (i / (arr.length - 1)) * (W - padL - padR);
  const py = v => padT + (1 - (v - min) / span) * (H - padT - padB);
  const pts = arr.map((p, i) => `${px(i).toFixed(1)},${py(p.value).toFixed(1)}`).join(' ');
  const area = `${px(0).toFixed(1)},${H - padB} ${pts} ${px(arr.length - 1).toFixed(1)},${H - padB}`;
  const grid = [0, .5, 1].map(t => {
    const v = min + span * t, yy = py(v);
    return `<line x1="${padL}" y1="${yy.toFixed(1)}" x2="${W - padR}" y2="${yy.toFixed(1)}" stroke="rgba(255,255,255,.09)"/><text x="${padL - 7}" y="${(yy + 3.5).toFixed(1)}" fill="#9fc7b2" font-size="11" text-anchor="end">${fmtMoney(Math.round(v))}</text>`;
  }).join('');
  const zero = min < 0 && max > 0 ? `<line x1="${padL}" y1="${py(0).toFixed(1)}" x2="${W - padR}" y2="${py(0).toFixed(1)}" stroke="rgba(255,107,94,.55)" stroke-dasharray="4 4"/>` : '';
  const last = arr[arr.length - 1], first = arr[0];
  const lastColor = last.value >= 0 ? '#3ee08a' : '#ff6b5e';
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución de la caja">
    <defs><linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3ee08a" stop-opacity=".3"/><stop offset="1" stop-color="#3ee08a" stop-opacity="0"/></linearGradient></defs>
    ${grid}${zero}
    <polygon points="${area}" fill="url(#cashGrad)"/>
    <polyline points="${pts}" fill="none" stroke="#3ee08a" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${px(arr.length - 1).toFixed(1)}" cy="${py(last.value).toFixed(1)}" r="4" fill="${lastColor}" stroke="#04140c" stroke-width="1.5"/>
    <text x="${px(arr.length - 1).toFixed(1)}" y="${(py(last.value) - 10).toFixed(1)}" fill="${lastColor}" font-size="11" font-weight="700" text-anchor="end">${compactMoney(last.value)}</text>
    <text x="${padL}" y="${H - 7}" fill="#9fc7b2" font-size="10">D${first.day}${first.day === last.day ? ' · inicio' : ''}</text>
    ${first.day === last.day ? '' : `<text x="${W - padR}" y="${H - 7}" fill="#9fc7b2" font-size="10" text-anchor="end">D${last.day}</text>`}
  </svg>`;
}
function harvestChartSVG() {
  const hs = state.history && Array.isArray(state.history.harvests) ? state.history.harvests : [];
  if (!hs.length) {
    return '<div class="chart-empty">Todavía no cosechaste nada.<br>Las barras aparecen cuando entra la primera producción.</div>';
  }
  const end = state.day, start = Math.max(1, end - 13);
  const days = [];
  for (let d = start; d <= end; d++) days.push(d);
  const sum = d => hs.filter(h => h.day === d).reduce((acc, h) => acc + h.kg, 0);
  const max = Math.max(1, ...days.map(sum));
  const W = 600, H = 168, padL = 30, padR = 10, padT = 14, padB = 22;
  const bw = (W - padL - padR) / days.length;
  const bars = days.map((d, i) => {
    const v = sum(d);
    if (!v) return '';
    const h = Math.max(2, v / max * (H - padT - padB));
    const x = padL + i * bw + bw * 0.18, y = H - padB - h;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="url(#harvGrad)"><title>Día ${d}: ${fmtNum(v)} kg</title></rect>`;
  }).join('');
  const labels = days.map((d, i) => (i === 0 || i === days.length - 1 || d % 5 === 0) ? `<text x="${(padL + i * bw + bw / 2).toFixed(1)}" y="${H - 7}" fill="#9fc7b2" font-size="9.5" text-anchor="middle">D${d}</text>` : '').join('');
  const total = hs.filter(h => h.day >= start).reduce((acc, h) => acc + h.kg, 0);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Kilos cosechados por día">
    <defs><linearGradient id="harvGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3ee08a"/><stop offset="1" stop-color="#1b6f45"/></linearGradient></defs>
    <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="rgba(255,255,255,.14)"/>
    <line x1="${padL}" y1="${padT}" x2="${W - padR}" y2="${padT}" stroke="rgba(255,255,255,.06)" stroke-dasharray="3 4"/>
    <text x="${padL}" y="${padT - 4}" fill="#9fc7b2" font-size="10">máx ${fmtNum(max)} kg/día</text>
    ${bars}${labels}
    <text x="${W - padR}" y="${padT - 4}" fill="#3ee08a" font-size="10" text-anchor="end">${fmtNum(total)} kg en ${days.length} días</text>
  </svg>`;
}

/* ───────────────────────── ASESOR IA (MOTOR LOCAL) ───────────────────────── */
function stripAccents(str) {
  return String(str).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function advisorFixedDay() {
  if (!state) return 0;
  const energy = state.beds.reduce((sum, b) => sum + BED_TYPES[b.type].spec.energy, 0);
  const autoBeds = state.beds.filter(b => b.type !== 'kratky').length;
  return Math.max(1, Math.round(2 + energy + state.upgrades.hvac * 3 + (state.upgrades.led ? 6 : 0) + (state.upgrades.autoDoser ? autoBeds * 1.2 : 0) + (state.upgrades.rain ? 0.5 : 1.5)));
}
function advisorWaterDay() {
  return state.beds.reduce((sum, b) => sum + BED_TYPES[b.type].water.consumptionLDay * (b.cropId ? 1 : 0.35), 0);
}
function advisorIntro() {
  const best = bestSystemId();
  const bp = bestCropFor(best).p;
  const next = nextHarvestInfo()[0];
  const active = state.beds.filter(b => b.cropId).length;
  return `Hola. Soy tu <b>Asesor IA</b> local. Leo tu partida y te ayudo a decidir con números, no con intuición.\n\n` +
    `Tenés <b>${active} cama${active === 1 ? '' : 's'} en producción</b>, caja ${state.godMode ? '<b>infinita</b>' : '<b>' + fmtMoney(state.cash) + '</b>'} y un costo fijo de <b>${fmtMoney(advisorFixedDay())}/día</b>.\n\n` +
    `Mi recomendación de mayor margen teórico es <b>${BED_TYPES[best].icon} ${BED_TYPES[best].name}</b> con <b>${bp.c.icon} ${bp.c.name}</b>: ${fmtMoney(bp.netDay)}/día por módulo y repago en ${bp.payback ? Math.round(bp.payback) + ' días' : '—'}.` +
    (next ? `\n\nLa próxima cosecha es de <b>${next.crop.name}</b> en ${next.ready ? 'esta misma jornada' : next.days + ' día' + (next.days === 1 ? '' : 's')} (día ${next.eta}).` : '') +
    `\n\nPreguntame por sistemas, agua, plata, cosechas o clientes. También podés armar un presupuesto en el panel de la derecha.`;
}
function fillAdvisorControls() {
  if (!D.advGreenhouse || !D.advSystem) return;
  if (!D.advGreenhouse.options.length) {
    D.advGreenhouse.innerHTML = GREENHOUSES.map(g => `<option value="${g.id}">${g.icon} ${g.name} · ${g.areaM2} m²</option>`).join('');
  }
  if (!D.advSystem.options.length) {
    D.advSystem.innerHTML = BED_IDS.map(id => `<option value="${id}">${BED_TYPES[id].icon} ${BED_TYPES[id].name} · ${BED_TYPES[id].layout.total} plantas</option>`).join('');
  }
  D.advGreenhouse.value = advisor.greenhouse;
  D.advSystem.value = advisor.system;
  if (String(D.advBeds.value) !== String(advisor.beds)) D.advBeds.value = advisor.beds;
}
function calcBudget() {
  if (!state || !D.advGreenhouse) return null;
  const gh = GREENHOUSES.find(g => g.id === D.advGreenhouse.value) || GREENHOUSES[0];
  const sys = D.advSystem.value;
  const bt = BED_TYPES[sys] || BED_TYPES.nft;
  if (D.advBeds.value === '') return advisor.lastBudget;
  let beds = Math.round(Number(D.advBeds.value) || 1);
  beds = clamp(beds, 1, 200);
  advisor.greenhouse = gh.id; advisor.system = bt.id; advisor.beds = beds;

  const bomTotal = bt.materials.reduce((sum, m) => sum + m.qty * m.unitCost, 0);
  const moduleCost = bomTotal;
  const modulesCost = moduleCost * beds;
  const best = bestCropFor(bt.id);
  const crop = best.p.c;
  const price = sellPrice(crop.id, state);

  const energyWk = beds * bt.spec.energy * 7;
  const waterWk = beds * bt.water.consumptionLDay * 7 * WATER_COST_L;
  const nutrientWk = beds * 3.4;
  const laborWk = beds * bt.spec.laborHrsWeek * LABOR_RATE * 0.5;
  const fixedWk = 10 + gh.powerKW * 3.5;
  const weeklyCost = energyWk + waterWk + nutrientWk + laborWk + fixedWk;
  const weeklyRevenue = beds * bt.layout.total * crop.yieldKg * (7 / crop.growDays) * bt.spec.growth * price * 0.9;
  const netWk = weeklyRevenue - weeklyCost;
  const install = Math.round(modulesCost * 0.08);
  const working = Math.round(weeklyCost * 4);
  const total = gh.cost + modulesCost + install + working;
  const payback = netWk > 0 ? total / netWk : null;
  const usedArea = beds * bt.size.w * bt.size.d;
  const occupancy = usedArea / gh.areaM2;
  const cash = state.godMode ? Infinity : state.cash;
  const affordable = Math.max(0, Math.floor((cash - gh.cost - working) / (moduleCost * 1.08)));
  const budget = {
    gh, bt, beds, crop, price, moduleCost, modulesCost, install, working, total,
    energyWk, waterWk, nutrientWk, laborWk, fixedWk, weeklyCost, weeklyRevenue, netWk,
    payback, perM2Wk: netWk / gh.areaM2, occupancy, usedArea, affordable, cash,
  };
  advisor.lastBudget = budget;

  const netColor = netWk >= 0 ? 'var(--accent)' : 'var(--red)';
  const warnCap = beds > gh.capacityBeds;
  D.advisorBudgetResult.innerHTML = `<div class="budget-result">
    <div class="budget-line"><span>Invernadero ${gh.icon} ${gh.name}</span><b>${fmtMoney(gh.cost)}</b></div>
    <div class="budget-line"><span>${beds} módulo${beds === 1 ? '' : 's'} × ${fmtMoney(moduleCost)}</span><b>${fmtMoney(modulesCost)}</b></div>
    <div class="budget-line"><span>Instalación (8%) + capital 4 sem.</span><b>${fmtMoney(install + working)}</b></div>
    <div class="budget-line total"><span>Inversión total</span><b>${fmtMoney(total)}</b></div>
    <div class="budget-line"><span>Ingreso bruto / semana</span><b>${fmtMoney(weeklyRevenue)}</b></div>
    <div class="budget-line"><span>Costos / semana</span><b>${fmtMoney(weeklyCost)}</b></div>
    <div class="budget-line"><span>Neto / semana</span><b style="color:${netColor}">${fmtMoney(netWk)}</b></div>
    <div class="budget-line"><span>Repago de la inversión</span><b>${payback ? Math.round(payback) + ' semanas' : 'sin repago'}</b></div>
    <div class="budget-line"><span>Retorno por m² / semana</span><b style="color:${netWk >= 0 ? 'var(--cyan)' : 'var(--red)'}">${fmtPrice(netWk / gh.areaM2)}</b></div>
    <div class="budget-line"><span>Ocupación estimada</span><b style="color:${occupancy > 0.95 ? 'var(--amber)' : 'var(--text)'}">${Math.round(occupancy * 100)}% (${usedArea.toFixed(0)} de ${gh.areaM2} m²)</b></div>
    <div class="budget-callout">${budgetVerdict(budget)}</div>
  </div>`;
  D.advBeds.value = beds;
  return budget;
}
function budgetVerdict(b) {
  if (b.occupancy > 0.95) {
    return `⚠️ <b>No entra:</b> ${b.beds} módulos de ${b.bt.name} ocupan ${b.usedArea.toFixed(0)} m² y el ${b.gh.name} tiene ${b.gh.areaM2} m². Bajá los módulos a ${Math.max(1, Math.floor(b.gh.areaM2 / (b.bt.size.w * b.bt.size.d)))} o pasá a un invernadero más grande.`;
  }
  if (b.netWk <= 0) {
    return `🔴 <b>Ajustado:</b> con este tamaño los costos se comen el ingreso. Probá más módulos, un cultivo de mayor precio o un sistema con menos mano de obra. El repago no aparece con este neto.`;
  }
  if (b.cash !== Infinity && b.total > b.cash) {
    const deficit = b.total - b.cash;
    return `🟡 <b>Falta caja:</b> te faltan ${fmtMoney(deficit)} para la inversión + capital de trabajo. Con tu caja actual entran <b>${b.affordable} módulo${b.affordable === 1 ? '' : 's'}</b> de ${b.bt.name} en este invernadero. Podés vender inventario, entregar pedidos o arrancar más chico.`;
  }
  if (b.payback && b.payback <= 26) {
    return `✅ <b>Viable:</b> repago en ${Math.round(b.payback)} semanas (${fmtNum(b.payback / 4.33)} meses) y ${fmtPrice(b.perM2Wk)}/m²/semana. Es un plan defendible para presentar a un socio o cliente.`;
  }
  return `🟢 <b>Escalable:</b> el plan cierra y deja ${fmtMoney(b.netWk)}/semana, pero el repago tarda ${Math.round(b.payback)} semanas. Conviene validar precios y clientes antes de comprometer toda la inversión.`;
}
function advisorKPIs() {
  if (!D.advisorKpis) return;
  const water = advisorWaterDay();
  const fixed = advisorFixedDay();
  const next = nextHarvestInfo()[0];
  D.advisorKpis.innerHTML = [
    dashKpi('CAJA', state.godMode ? '∞' : fmtMoney(state.cash), state.godMode ? 'cyan' : state.cash < 0 ? 'neg' : 'pos'),
    dashKpi('COSTO FIJO', fmtMoney(fixed) + ' / día'),
    dashKpi('AGUA', water.toFixed(1).replace('.', ',') + ' L / día', 'cyan'),
    dashKpi('PRÓXIMA COSECHA', next ? (next.ready ? 'LISTA AHORA' : 'D' + next.days) : '—', next && next.ready ? 'pos' : ''),
  ].join('');
}
function renderAdvisorLog(scrollToEnd) {
  if (!D.advisorLog) return;
  D.advisorLog.innerHTML = advisor.messages.map(m => `<div class="adv-msg ${m.role}">${m.html}</div>`).join('');
  if (scrollToEnd) D.advisorLog.scrollTop = D.advisorLog.scrollHeight;
}
function renderAdvisor() {
  if (!state || !D.advisorLog) return;
  fillAdvisorControls();
  advisorKPIs();
  renderAdvisorLog();
  calcBudget();
}
function initAdvisor() {
  fillAdvisorControls();
  if (!advisor.messages.length) advisor.messages.push({ role: 'ai', html: advisorIntro() });
  renderAdvisor();
  renderAdvisorLog(advisor.messages.length > 1);
}
function askAdvisor(question) {
  if (!state) return;
  const q = String(question || '').trim();
  if (!q) return;
  advisor.messages.push({ role: 'user', html: escapeHtml(q) });
  advisor.messages.push({ role: 'ai', html: advisorAnswer(q) });
  if (advisor.messages.length > 40) advisor.messages.splice(0, advisor.messages.length - 40);
  renderAdvisorLog(true);
  Sfx.play('click');
}
function advisorAnswer(question) {
  const q = stripAccents(question);
  const active = state.beds.filter(b => b.cropId);
  const ready = active.filter(b => b.growth >= 0.995);
  const dry = active.filter(b => b.water < 10);
  const sick = active.filter(b => b.health < 60);
  const info = nextHarvestInfo();
  const next = info[0];
  const week = Math.floor((state.day - 1) / 7) + 1;
  const ranked = BED_IDS.map(id => ({ id, ...bestCropFor(id) })).sort((a, b) => b.p.netDay - a.p.netDay);

  if (/sistema|conviene|mejor|construir|invertir|comparar|recomend/.test(q)) {
    const top = ranked.slice(0, 3).map((r, i) =>
      `${i + 1}. <b>${BED_TYPES[r.id].icon} ${BED_TYPES[r.id].name}</b> con ${r.p.c.icon} ${r.p.c.name}: ${fmtMoney(r.p.netDay)}/día por módulo · ${r.p.payback ? Math.round(r.p.payback) + ' días de repago' : 'sin repago'} · ${fmtPrice(r.p.perM2Wk)}/m²/sem.`
    ).join('\n');
    const owned = new Set(state.beds.map(b => b.type));
    const missing = BED_IDS.filter(id => !owned.has(id));
    return `Mi ranking por margen teórico (una unidad, sin contar mano de obra completa):\n${top}\n\n` +
      `Hoy tenés ${owned.size} sistema${owned.size === 1 ? '' : 's'} distinto${owned.size === 1 ? '' : 's'}. ` +
      (missing.length ? `Te falta probar <b>${missing.map(id => BED_TYPES[id].name).join(', ')}</b>. ` : 'Ya cubriste los seis sistemas: ahora conviene profundizar el que mejor margen real te dé.\n') +
      `\nPara arrancar con poca plata: <b>Kratky</b> (sin bomba) o <b>NFT</b>. Para facturar más por m²: <b>torre aeropónica</b>, pero exige luz, presión y rutina. Para frutos: <b>bateas holandesas</b>.\n\n` +
      `Regla de negocio: no elijas solo por el teórico. Mirá tu caja, tu tiempo semanal y si tenés comprador para ese cultivo.`;
  }

  if (/semana|tarea|hacer|rutina|prioridad|revisar|mantenimiento/.test(q)) {
    const actions = [];
    if (ready.length) actions.push(`🧺 <b>Cosechá ya</b> ${ready.length} cama${ready.length === 1 ? '' : 's'} (${ready.map(b => cropById(b.cropId).name).slice(0, 4).join(', ')}).`);
    if (dry.length) actions.push(`💧 <b>Reponé solución</b> en ${dry.length} cama${dry.length === 1 ? '' : 's'} con menos de 10 L.`);
    if (sick.length) actions.push(`🩺 <b>Revisá pH/EC</b> en ${sick.length} cama${sick.length === 1 ? '' : 's'} con salud bajo 60%.`);
    const pending = active.reduce((sum, b) => sum + BED_TYPES[b.type].tasks.filter(t => !b.taskDone || !b.taskDone[weekOfBed(b)] || !b.taskDone[weekOfBed(b)][t.key]).length, 0);
    if (pending) actions.push(`✅ Quedan <b>${pending} tareas semanales</b> sin tildar. Priorizá medir pH/EC y revisar raíces.`);
    const due = state.contracts.active.filter(c => c.deadline - state.day <= 3);
    if (due.length) actions.push(`📋 <b>${due.length} pedido${due.length === 1 ? '' : 's'}</b> vence${due.length === 1 ? '' : 'n'} en 3 días o menos. Asegurá los kilos antes de otra siembra.`);
    if (!actions.length) actions.push('Todo bajo control: no hay cosechas listas, ni camas secas, ni pedidos por vencer. Aprovechá para plantar una cama libre o revisar precios.');
    return `Plan para la <b>semana ${week}</b> (día ${state.day}):\n\n${actions.map(a => '• ' + a).join('\n')}\n\n` +
      `Después de cada ronda, mirá el <b>Panel temporal</b>: el Gantt te muestra qué cama entra en cosecha y el registro de eventos te dice qué pasó.`;
  }

  if (/agua|circuito|tanque|bomba|riego|hidraul|litro|consumo/.test(q)) {
    const water = advisorWaterDay();
    const bySystem = BED_IDS.map(id => {
      const beds = state.beds.filter(b => b.type === id);
      const liters = beds.reduce((sum, b) => sum + BED_TYPES[id].water.consumptionLDay * (b.cropId ? 1 : 0.35), 0);
      return { id, beds: beds.length, liters };
    }).filter(x => x.beds).sort((a, b) => b.liters - a.liters);
    const lines = bySystem.map(x => `• ${BED_TYPES[x.id].icon} <b>${BED_TYPES[x.id].name}</b>: ${x.beds} módulo${x.beds === 1 ? '' : 's'}, ${x.liters.toFixed(1).replace('.', ',')} L/día. Ciclo: ${BED_TYPES[x.id].water.cycle}. Retorno: ${BED_TYPES[x.id].water.return}.`).join('\n');
    return `Consumo estimado: <b>${water.toFixed(1).replace('.', ',')} L/día</b> (${fmtNum(water * 7, 0)} L/semana). Costo de agua de red: ${fmtPrice(water * WATER_COST_L)}/día.\n\n` +
      (lines || 'Todavía no tenés camas construidas.') +
      `\n\n<b>Cómo leer el circuito:</b> el agua entra por la <b>ida</b> (tanque → bomba → filtro → colector → módulos) y vuelve por <b>gravedad o drenaje</b> al tanque. En el plano 3D, la línea celeste es la ida y la ámbar es la vuelta.\n\n` +
      `Si el consumo te preocupa: el <b>colector de lluvia</b> baja el costo de reposición 70%, el <b>tanque más grande</b> da margen y un sistema <b>Kratky</b> no usa bomba. Revisá que ningún retorno quede tapado: un desborde silencioso te vacía el tanque y mata raíces.`;
  }

  if (/cosecha|cosechar|cuando|lista|eta|falt|crecimiento/.test(q)) {
    if (!info.length) return `No tenés cultivos en producción. Plantá una cama y en 2 a 6 semanas (según el cultivo) tenés la primera cosecha. Para arrancar rápido: lechuga o espinaca en NFT/DWC (2 semanas), albahaca en 3, frutilla en torre en 6.`;
    const lines = info.slice(0, 5).map((x, i) =>
      `${i + 1}. ${x.crop.icon} <b>${x.crop.name}</b> en ${BED_TYPES[x.bed.type].name}: ${x.ready ? '<b>LISTA PARA COSECHAR</b>' : `${x.days} día${x.days === 1 ? '' : 's'} (día ${x.eta})`} · ${Math.floor(x.bed.growth * 100)}% · salud ${Math.round(x.bed.health)}%.`
    ).join('\n');
    const kg = ready.reduce((sum, b) => sum + estHarvestKg(b), 0);
    return `Próximas cosechas:\n${lines}\n\n` +
      (ready.length ? `Ahora mismo podés juntar <b>${fmtNum(kg)} kg</b> de ${ready.length} cama${ready.length === 1 ? '' : 's'}. Cosechá, vendé en el Mercado y compará el precio antes de aceptar un pedido.` : `Todavía no hay nada listo. La ETA se recalcula con el crecimiento y la salud: si una cama se estresa, la fecha se corre.`) +
      `\n\nTip: escaloná siembras cada 3–7 días. Así no te entra toda la producción junta ni se te vacía la caja entre ciclos.`;
  }

  if (/cliente|mercado|vender|precio|pedido|contrato|reputacion|marketing|venta/.test(q)) {
    const marketing = upgradeLevel('marketing');
    const inventory = CROPS.filter(c => (state.inventory[c.id] || 0) > 0).map(c => `${c.icon} ${c.name}: ${fmtNum(state.inventory[c.id] || 0)} kg a ${fmtMoney(sellPrice(c.id, state))}/kg`).join(' · ');
    return `Tu reputación es <b>${fmtNum(state.reputation)}★</b> y el marketing está en nivel <b>${marketing}</b>. ` +
      `Cada nivel de marketing suma +8/15/25% a todos los precios; la reputación arriba de 3★ agrega hasta +5%.\n\n` +
      (inventory ? `<b>Inventario para vender:</b> ${inventory}. Vendé antes de que el mercado baje.\n\n` : '') +
      `Para conseguir más clientes:\n• Aceptá pedidos chicos y entregalos a tiempo: suben reputación y desbloquean ofertas mejores.\n• Mantené producción escalonada para no fallar entregas.\n• Invertí en <b>Marketing</b> cuando tengas excedente: es el aumento de precio más parejo.\n• Compará pedido vs. mercado: un pedido premium a 10 días puede pagar menos que vender hoy si el precio está alto.\n\n` +
      `Con ${state.contracts.offers.length} oferta${state.contracts.offers.length === 1 ? '' : 's'} disponible${state.contracts.offers.length === 1 ? '' : 's'}, revisá la pestaña <b>Pedidos</b> antes de sembrar.`;
  }

  if (/plata|caja|dinero|costo|gasto|ganancia|rentab|margen|repago|presupuesto|inversion|financ|quiebra/.test(q)) {
    const fixed = advisorFixedDay();
    const runway = state.cash > 0 ? Math.floor(state.cash / fixed) : 0;
    const top = ranked[0];
    const b = advisor.lastBudget;
    return `Foto financiera del día ${state.day}:\n` +
      `• Caja: <b>${state.godMode ? '∞ (modo Dios)' : fmtMoney(state.cash)}</b> · patrimonio ${state.godMode ? '∞' : fmtMoney(netWorth(state))}.\n` +
      `• Costo fijo actual: <b>${fmtMoney(fixed)}/día</b> (${fmtMoney(fixed * 7)}/semana). ${state.godMode ? 'Modo Dios activo: no se cobra.' : `Aguantás ${runway} días sin vender nada.`}\n` +
      `• Facturado acumulado: ${fmtMoney(state.stats.revenue)} · ${state.stats.harvests} cosecha${state.stats.harvests === 1 ? '' : 's'}.\n` +
      `• Mejor módulo teórico: ${BED_TYPES[top.id].icon} ${BED_TYPES[top.id].name} + ${top.p.c.icon} ${top.p.c.name} = ${fmtMoney(top.p.netDay)}/día.\n\n` +
      (b ? `Tu último presupuesto: <b>${b.beds} módulos de ${b.bt.name} en ${b.gh.name}</b>. Inversión ${fmtMoney(b.total)}, neto ${fmtMoney(b.netWk)}/semana, repago ${b.payback ? Math.round(b.payback) + ' semanas' : 'sin repago'}. ${budgetVerdict(b)}\n\n` : '') +
      `Regla dura: si el neto semanal no cubre al menos 4 semanas de costos fijos, el plan no tiene colchón. El repago tiene que entrar dentro de la vida útil del equipo.`;
  }

  const summary = ranked.slice(0, 2).map(r => `${BED_TYPES[r.id].icon} ${BED_TYPES[r.id].name}`).join(' y ');
  return `Puedo ayudarte con cinco temas concretos:\n• <b>Sistemas</b>: cuál conviene, inversión, plantas y repago.\n• <b>Semana</b>: qué cosechar, reponer o revisar primero.\n• <b>Agua</b>: consumo, tanque, bomba y circuito de ida/vuelta.\n• <b>Cosecha</b>: ETA, kilos y precio de venta.\n• <b>Clientes y plata</b>: pedidos, reputación, marketing y presupuesto.\n\nAhora mismo tus mejores apuestas teóricas son ${summary}. Tenés ${active.length} cama${active.length === 1 ? '' : 's'} en producción y ${state.contracts.offers.length} pedido${state.contracts.offers.length === 1 ? '' : 's'} para evaluar.\n\nProbá una de las preguntas rápidas o contame qué querés montar.`;
}
function explainBudget() {
  const b = advisor.lastBudget || calcBudget();
  if (!b) return;
  advisor.messages.push({ role: 'user', html: 'Explicá este presupuesto con supuestos y riesgos.' });
  advisor.messages.push({ role: 'ai', html:
    `<b>Presupuesto: ${b.beds} × ${b.bt.icon} ${b.bt.name} en ${b.gh.icon} ${b.gh.name}</b>\n\n` +
    `<b>Inversión ${fmtMoney(b.total)}</b> = estructura ${fmtMoney(b.gh.cost)} + módulos ${fmtMoney(b.modulesCost)} + instalación ${fmtMoney(b.install)} + capital de trabajo ${fmtMoney(b.working)} (4 semanas de costos).\n\n` +
    `<b>Operación semanal:</b> energía ${fmtMoney(b.energyWk)} · agua ${fmtMoney(b.waterWk)} · nutrientes ${fmtMoney(b.nutrientWk)} · mano de obra ${fmtMoney(b.laborWk)} · fijos del invernadero ${fmtMoney(b.fixedWk)} = <b>${fmtMoney(b.weeklyCost)}</b>.\n\n` +
    `<b>Ingreso:</b> ${b.beds} módulos × ${b.bt.layout.total} plantas × ${b.crop.name} a ${fmtMoney(b.price)}/kg, con 90% de venta efectiva y crecimiento ${Math.round(b.bt.spec.growth * 100)}%. Bruto <b>${fmtMoney(b.weeklyRevenue)}</b>/semana, neto <b>${fmtMoney(b.netWk)}</b>.\n\n` +
    `<b>Supuestos:</b> ocupación completa, precio actual de mercado, cosecha continua en régimen, mano de obra familiar a media tarifa (${fmtMoney(LABOR_RATE * 0.5)}/h) y 10% de merma. No incluye impuestos, fletes ni financiación.\n\n` +
    `<b>Riesgos:</b> un ciclo fallido por pH/EC o corte de energía te quita semanas de ingreso; el precio puede caer; la mano de obra real suele ser mayor al arranque. Por eso el capital de trabajo de 4 semanas no es opcional.\n\n` +
    `${budgetVerdict(b)}`
  });
  if (advisor.messages.length > 40) advisor.messages.splice(0, advisor.messages.length - 40);
  renderAdvisorLog(true);
  Sfx.play('click');
}

/* ───────────────────────── MODALS ───────────────────────── */
function openModal(id) {
  if (gameOverFlag && id !== 'modal-gameover') return;
  if (!state) return;
  if (openModalId) {
    if (openModalId === 'modal-systems' && typeof World !== 'undefined') World.unmountPreview();
    document.getElementById(openModalId).classList.add('hidden');
  }
  openModalId = id;
  const el = document.getElementById(id);
  el.classList.remove('hidden');
  if (id === 'modal-market') renderMarket();
  if (id === 'modal-contracts') renderContracts();
  if (id === 'modal-upgrades') renderUpgrades();
  if (id === 'modal-goals') renderGoals();
  if (id === 'modal-systems') renderLab();
  if (id === 'modal-dashboard') { dashFilter = 'all'; renderDashboard(); }
  if (id === 'modal-advisor') initAdvisor();
  if (id === 'modal-menu') updateMuteButtons();
  Sfx.play('click');
}
function closeModal(silent) {
  if (!openModalId) return;
  if (openModalId === 'modal-gameover') return;
  if (openModalId === 'modal-systems' && typeof World !== 'undefined') World.unmountPreview();
  document.getElementById(openModalId).classList.add('hidden');
  openModalId = null;
  if (!silent) Sfx.play('click');
}

function triggerGameOver() {
  if (gameOverFlag) return;
  gameOverFlag = true;
  gameActive = false;
  deleteSave();
  D.gameoverStats.innerHTML = `
    <div><strong>${state.day}</strong><small>DÍAS</small></div>
    <div><strong>${fmtMoney(state.stats.revenue)}</strong><small>FACTURADO</small></div>
    <div><strong>${state.stats.harvests}</strong><small>COSECHAS</small></div>
    <div><strong>${state.stats.contractsDelivered}</strong><small>PEDIDOS</small></div>`;
  if (openModalId) document.getElementById(openModalId).classList.add('hidden');
  openModalId = 'modal-gameover';
  D.gameover.classList.remove('hidden');
  Sfx.play('error');
}

/* ───────────────────────── WORLD GLUE ───────────────────────── */
function demoBeds() {
  const demo = [
    { type: 'nft', crop: 'lettuce', growth: 0.85, x: -5.2, z: -2.4 },
    { type: 'bucket', crop: 'tomato', growth: 0.82, x: -1.4, z: -2.4 },
    { type: 'tower', crop: 'strawberry', growth: 0.8, x: 2.4, z: -2.4 },
    { type: 'nft', crop: 'basil', growth: 0.78, x: 6.2, z: -2.4 },
    { type: 'bucket', crop: 'pepper', growth: 0.66, x: -5.2, z: 1.3 },
    { type: 'nft', crop: 'spinach', growth: 0.6, x: -1.4, z: 1.3 },
    { type: 'tower', crop: 'strawberry', growth: 0.55, x: 2.4, z: 1.3 },
    { type: 'nft', crop: 'lettuce', growth: 0.5, x: 6.2, z: 1.3 },
  ];
  return demo.map((b, i) => ({
    id: 'demo' + i, type: b.type, x: b.x, z: b.z, rot: 0,
    cropId: b.crop, growth: b.growth, health: 96,
    water: 34, ph: 6.0, ec: (cropById(b.crop).ec[0] + cropById(b.crop).ec[1]) / 2,
  }));
}
function refreshWorld() {
  if (!state) return;
  World.setBedVisuals(state.beds, state.day);
  const ledOn = !!state.upgrades.led;
  for (const bed of state.beds) World.updateBedStatus(bed, ledOn);
  World.setSelected(selectedBedId);
}

/* ───────────────────────── INPUT ───────────────────────── */
function bindUI() {
  $('btn-start-build').addEventListener('click', () => { if (!state || titleVisible) startGame(selectedBuildId); });
  $('btn-continue').addEventListener('click', continueGame);
  D.titleBuilds.addEventListener('click', e => { const el = e.target.closest('[data-build]'); if (el) selectTitleBuild(el.dataset.build); });

  D.btnPause.addEventListener('click', () => setSpeed(0));
  D.btnS1.addEventListener('click', () => setSpeed(1));
  D.btnS2.addEventListener('click', () => setSpeed(2));
  D.btnS3.addEventListener('click', () => setSpeed(3));
  D.btnBuild.addEventListener('click', () => {
    if (D.buildBar.classList.contains('hidden')) openBuildMenu(); else closeBuildMode();
  });
  D.btnMarket.addEventListener('click', () => openModal('modal-market'));
  D.btnContracts.addEventListener('click', () => openModal('modal-contracts'));
  D.btnUpgrades.addEventListener('click', () => openModal('modal-upgrades'));
  D.btnSystems.addEventListener('click', () => openLab('systems'));
  if (D.btnDashboard) D.btnDashboard.addEventListener('click', () => openModal('modal-dashboard'));
  if (D.btnAdvisor) D.btnAdvisor.addEventListener('click', () => openModal('modal-advisor'));
  if (D.btnBlueprint) D.btnBlueprint.addEventListener('click', () => applyBlueprint(!(state && state.blueprint)));
  if (D.camLeft) D.camLeft.addEventListener('click', () => World.rotateCamera(-0.36));
  if (D.camRight) D.camRight.addEventListener('click', () => World.rotateCamera(0.36));
  if (D.camIn) D.camIn.addEventListener('click', () => World.zoomCamera(0.86));
  if (D.camOut) D.camOut.addEventListener('click', () => World.zoomCamera(1.16));
  D.btnGoals.addEventListener('click', () => openModal('modal-goals'));
  D.btnHelp.addEventListener('click', () => openModal('modal-help'));
  D.btnMenu.addEventListener('click', () => openModal('modal-menu'));
  D.btnMute.addEventListener('click', () => { Sfx.unlock(); Sfx.toggle(); });
  D.goalsMini.addEventListener('click', () => openModal('modal-goals'));
  D.bedClose.addEventListener('click', () => selectBed(null));
  if (D.taskCalendar) D.taskCalendar.addEventListener('click', () => {
    if (!selectedBedId) return;
    const bed = state.beds.find(b => b.id === selectedBedId);
    if (bed) openLab('cycles', bed.type, bed.cropId);
  });
  if (D.taskList) D.taskList.addEventListener('click', e => {
    const btn = e.target.closest('[data-task]');
    if (!btn || !selectedBedId) return;
    const bed = state.beds.find(b => b.id === selectedBedId);
    if (bed) completeTask(bed, btn.dataset.task);
  });
  if (D.mobileSpeed) D.mobileSpeed.addEventListener('click', () => {
    if (!state) return;
    setSpeed(state.speed === 0 ? 1 : state.speed >= 3 ? 0 : state.speed + 1);
  });
  if (D.mobileNav) D.mobileNav.addEventListener('click', e => {
    const btn = e.target.closest('[data-mobile]');
    if (!btn || !state) return;
    const action = btn.dataset.mobile;
    if (action === 'build') {
      if (openModalId) closeModal(true);
      if (D.buildBar.classList.contains('hidden')) openBuildMenu(); else closeBuildMode();
    }
    if (action === 'market') openModal('modal-market');
    if (action === 'contracts') openModal('modal-contracts');
    if (action === 'systems') openModal('modal-systems');
    if (action === 'dashboard') openModal('modal-dashboard');
    if (action === 'advisor') openModal('modal-advisor');
    if (action === 'goals') openModal('modal-goals');
  });
  if (D.labTabs) D.labTabs.addEventListener('click', e => {
    const btn = e.target.closest('[data-labtab]');
    if (btn) setLabTab(btn.dataset.labtab);
  });
  if (D.labSystems) D.labSystems.addEventListener('click', e => {
    const card = e.target.closest('[data-sys]');
    if (!card) return;
    lab.system = card.dataset.sys;
    if (!BED_TYPES[lab.system].crops.includes(lab.crop)) lab.crop = BED_TYPES[lab.system].crops[0];
    renderLab();
    Sfx.play('click');
  });
  if (D.labCycles) D.labCycles.addEventListener('click', e => {
    const sysBtn = e.target.closest('[data-sys]');
    const cropBtn = e.target.closest('[data-crop]');
    if (sysBtn) {
      lab.system = sysBtn.dataset.sys;
      if (!BED_TYPES[lab.system].crops.includes(lab.crop)) lab.crop = BED_TYPES[lab.system].crops[0];
      renderLab();
    }
    if (cropBtn) { lab.crop = cropBtn.dataset.crop; renderLab(); }
    if (sysBtn || cropBtn) Sfx.play('click');
  });
  if (D.labTimeline) D.labTimeline.addEventListener('click', e => {
    const sysBtn = e.target.closest('[data-sys]');
    const cropBtn = e.target.closest('[data-crop]');
    if (sysBtn) {
      lab.system = sysBtn.dataset.sys;
      if (!BED_TYPES[lab.system].crops.includes(lab.crop)) lab.crop = BED_TYPES[lab.system].crops[0];
      renderLab();
    }
    if (cropBtn) { lab.crop = cropBtn.dataset.crop; renderLab(); }
    if (sysBtn || cropBtn) Sfx.play('click');
  });
  if (D.labGreenhouses) D.labGreenhouses.addEventListener('click', e => {
    const quote = e.target.closest('[data-quote]');
    if (!quote) return;
    advisor.greenhouse = quote.dataset.quote;
    openModal('modal-advisor');
    Sfx.play('click');
  });

  /* ── dashboard / advisor ── */
  if (D.dashFilters) D.dashFilters.addEventListener('click', e => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    dashFilter = btn.dataset.filter;
    renderDashEvents();
    Sfx.play('click');
  });
  if (D.dashAdvisor) D.dashAdvisor.addEventListener('click', () => openModal('modal-advisor'));
  if (D.advisorForm) D.advisorForm.addEventListener('submit', e => {
    e.preventDefault();
    askAdvisor(D.advisorInput.value);
    D.advisorInput.value = '';
  });
  if (D.advisorChips) D.advisorChips.addEventListener('click', e => {
    const chip = e.target.closest('[data-q]');
    if (chip) askAdvisor(chip.dataset.q);
  });
  [D.advGreenhouse, D.advSystem, D.advBeds].forEach(el => {
    if (!el) return;
    el.addEventListener('change', () => calcBudget());
    if (el.tagName === 'INPUT') el.addEventListener('input', () => calcBudget());
  });
  if (D.advExplain) D.advExplain.addEventListener('click', explainBudget);

  document.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', () => closeModal()));
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) closeModal(); }));

  D.seedOptions.addEventListener('click', e => {
    const btn = e.target.closest('[data-seed]');
    if (btn && selectedBedId) plantCrop(selectedBedId, btn.dataset.seed);
  });
  D.btnHarvest.addEventListener('click', () => { if (selectedBedId) harvestBed(selectedBedId); });
  D.btnClear.addEventListener('click', () => {
    if (!selectedBedId) return;
    if (!clearArmed) {
      clearArmed = true;
      D.btnClear.textContent = '⚠ Tocá otra vez para sacar';
      D.btnClear.classList.add('danger');
      clearTimeout(clearTimer);
      clearTimer = setTimeout(resetClearButton, 2600);
      return;
    }
    clearBed(selectedBedId);
    resetClearButton();
  });
  D.doseWater.addEventListener('click', () => doseBed(selectedBedId, 'water'));
  D.doseEc.addEventListener('click', () => doseBed(selectedBedId, 'ec'));
  D.dosePhdown.addEventListener('click', () => doseBed(selectedBedId, 'phdown'));
  D.dosePhup.addEventListener('click', () => doseBed(selectedBedId, 'phup'));

  D.buildCards.addEventListener('click', e => {
    const card = e.target.closest('[data-build-type]');
    if (card) chooseBuildType(card.dataset.buildType);
  });
  $('build-cancel').addEventListener('click', closeBuildMode);
  $('build-cancel').addEventListener('pointerdown', e => e.stopPropagation());

  D.marketRows.addEventListener('click', e => {
    const btn = e.target.closest('button[data-crop]');
    if (!btn) return;
    const crop = btn.dataset.crop;
    if (btn.dataset.sell === 'all') sellCrop(crop, state.inventory[crop] || 0);
    else sellCrop(crop, 1);
    renderMarket();
  });
  D.marketSellAll.addEventListener('click', () => { sellAll(); renderMarket(); });
  $('market-to-contracts').addEventListener('click', () => openModal('modal-contracts'));
  D.contractOffers.addEventListener('click', e => {
    const a = e.target.closest('[data-accept]'); const d = e.target.closest('[data-decline]');
    if (a) acceptOffer(a.dataset.accept);
    if (d) declineOffer(d.dataset.decline);
  });
  D.contractActive.addEventListener('click', e => {
    const d = e.target.closest('[data-deliver]');
    if (d) deliverContract(d.dataset.deliver);
  });
  D.upgradeGrid.addEventListener('click', e => {
    const b = e.target.closest('[data-upgrade]');
    if (b) buyUpgrade(b.dataset.upgrade);
  });
  $('menu-resume').addEventListener('click', () => closeModal());
  $('menu-dashboard').addEventListener('click', () => openModal('modal-dashboard'));
  $('menu-advisor').addEventListener('click', () => openModal('modal-advisor'));
  $('menu-blueprint').addEventListener('click', () => { closeModal(true); applyBlueprint(!(state && state.blueprint)); });
  $('menu-god').addEventListener('click', () => { closeModal(true); toggleGodMode(); });
  $('menu-save').addEventListener('click', () => { saveGame(false); });
  $('menu-help').addEventListener('click', () => openModal('modal-help'));
  $('menu-upgrades').addEventListener('click', () => openModal('modal-upgrades'));
  $('menu-mute').addEventListener('click', () => { Sfx.unlock(); Sfx.toggle(); });
  $('menu-restart').addEventListener('click', () => {
    if (confirm('¿Reiniciar esta partida? Se pierde todo el progreso.')) {
      const id = state.buildId;
      deleteSave();
      closeModal(true);
      startGame(id);
    }
  });
  $('gameover-restart').addEventListener('click', () => {
    D.gameover.classList.add('hidden');
    openModalId = null;
    gameOverFlag = false;
    deleteSave();
    state = null;
    showTitleScreen();
    World.setBedVisuals(demoBeds());
    World.setSelected(null);
  });

  document.addEventListener('keydown', e => {
    Sfx.unlock();
    const k = e.key.toLowerCase();
    if (k === 'escape') {
      if (openModalId && openModalId !== 'modal-gameover') { closeModal(); return; }
      if (!titleVisible && !D.buildBar.classList.contains('hidden')) { closeBuildMode(); return; }
      if (selectedBedId) { selectBed(null); return; }
      return;
    }
    if (titleVisible) {
      if (k === 'enter' && !D.btnStart.disabled) startGame(selectedBuildId);
      return;
    }
    if (openModalId) return;
    if (k === ' ') { e.preventDefault(); setSpeed(state.speed === 0 ? 1 : 0); return; }
    if (k === 'b') { D.buildBar.classList.contains('hidden') ? openBuildMenu() : closeBuildMode(); return; }
    if (k === 'm') { openModal('modal-market'); return; }
    if (k === 'c') { openModal('modal-contracts'); return; }
    if (k === 'u') { openModal('modal-upgrades'); return; }
    if (k === 'g') { openModal('modal-goals'); return; }
    if (k === 'h') { openModal('modal-help'); return; }
    if (k === 'y') { openLab('systems'); return; }
    if (k === 'p') { openModal('modal-dashboard'); return; }
    if (k === 'a') { openModal('modal-advisor'); return; }
    if (k === 't') { applyBlueprint(!(state && state.blueprint)); return; }
    if (k === 'q') { World.rotateCamera(-0.36); return; }
    if (k === 'e') { World.rotateCamera(0.36); return; }
    if (['1', '2', '3', '4', '5', '6'].includes(k)) {
      if (!D.buildBar.classList.contains('hidden')) chooseBuildType(BED_IDS[+k - 1]);
      else if (+k <= 3) setSpeed(+k);
    }
  });

  window.addEventListener('resize', () => {});
  const sceneCanvas = $('scene');
  sceneCanvas.addEventListener('pointerdown', () => Sfx.unlock(), { once: true });
}
function setSpeed(sp) {
  if (!state) return;
  state.speed = sp;
  updateHUD();
  Sfx.play('click');
  saveGame(true);
}

/* ───────────────────────── BOOT / LOOP ───────────────────────── */
function cacheDom() {
  const ids = ['scene', 'hud', 'title', 'title-builds', 'btn-start-build', 'btn-continue', 'day-pill', 'weather-icon', 'day-label', 'clock-label',
    'btn-pause', 'btn-s1', 'btn-s2', 'btn-s3', 'cash-block', 'cash-label', 'rep-label', 'networth-label', 'btn-build', 'btn-market', 'btn-contracts',
    'contracts-badge', 'btn-upgrades', 'btn-systems', 'btn-goals', 'btn-mute', 'btn-help', 'btn-menu', 'btn-mobile-speed', 'mobile-nav',
    'bed-panel', 'bed-title', 'bed-specs', 'bed-status-dot', 'bed-close', 'tasks-block', 'task-week', 'task-list', 'task-calendar',
    'seed-section', 'seed-options', 'grow-section', 'crop-icon', 'crop-name', 'crop-stage', 'health-label', 'growth-pct', 'growth-fill',
    'water-label', 'water-fill', 'ph-label', 'ph-ideal', 'ph-pin', 'ec-label', 'ec-ideal', 'ec-pin', 'condition-hint', 'dose-water', 'dose-ec',
    'dose-phdown', 'dose-phup', 'btn-harvest', 'btn-clear', 'build-bar', 'build-cards', 'goals-mini', 'goals-mini-text', 'toasts', 'popups',
    'modal-market', 'market-rows', 'market-inventory-value', 'market-sell-all', 'modal-contracts', 'contract-offers', 'contract-active',
    'modal-upgrades', 'upgrade-grid', 'modal-systems', 'lab-tabs', 'lab-systems', 'lab-cycles', 'lab-profit',
    'modal-goals', 'goals-list', 'modal-help', 'modal-menu', 'menu-resume', 'menu-save', 'menu-help', 'menu-upgrades',
    'modal-mute', 'menu-mute', 'menu-restart', 'modal-gameover', 'gameover-stats', 'gameover-restart',
    'btn-dashboard', 'btn-advisor', 'btn-blueprint', 'god-badge', 'bp-legend',
    'cam-left', 'cam-right', 'cam-in', 'cam-out', 'harvest-eta', 'cycle-track', 'cycle-labels',
    'lab-timeline', 'lab-greenhouses',
    'modal-dashboard', 'dash-kpis', 'dash-cash', 'dash-harvest', 'dash-gantt', 'dash-filters', 'dash-events', 'dash-advisor',
    'modal-advisor', 'advisor-kpis', 'advisor-log', 'advisor-chips', 'advisor-form', 'advisor-input',
    'adv-greenhouse', 'adv-system', 'adv-beds', 'advisor-budget-result', 'adv-explain',
    'menu-dashboard', 'menu-advisor', 'menu-blueprint', 'menu-god'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) D[id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = el; });
  D.title = $('title-screen');
  D.titleBuilds = $('title-builds');
  D.btnStart = $('btn-start-build');
  D.btnContinue = $('btn-continue');
  D.title = $('title-screen');
  D.gameover = $('modal-gameover');
}
function boot() {
  cacheDom();
  if (D.bpLegend) D.bpLegend.classList.add('hidden');
  World.init($('scene'), {
    onSelect: id => { if (!titleVisible) selectBed(id); },
    onPlace: (x, z) => { if (gameActive) placeBed(snap(x), snap(z)); },
    onCancelBuild: () => { if (buildMode) closeBuildMode(); },
    onGhostMove,
  });
  renderTitleBuilds();
  updateTitleContinue();
  updateMuteButtons();
  bindUI();
  World.setBedVisuals(demoBeds());
  requestAnimationFrame(loop);
}

function loop(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.1);
  lastFrame = now;
  elapsed += dt;

  if (state && gameActive && !openModalId && !gameOverFlag && state.speed) simulate(dt);

  const ledOn = !!(state && state.upgrades.led);
  World.update(dt, elapsed, 0.5, state ? state.weather : 'sunny', ledOn);

  if (state) {
    worldAccum += dt;
    if (worldAccum > 0.35) { worldAccum = 0; refreshWorld(); }
    uiAccum += dt;
    if (uiAccum > 0.25) {
      uiAccum = 0;
      updateHUD();
      if (selectedBedId && D.bedPanel && !D.bedPanel.classList.contains('hidden')) renderBedPanel();
    }
  }
  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
