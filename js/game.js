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
    warned: {},
  };
}
function bedCost(typeId) {
  if (!state) return BED_TYPES[typeId].cost;
  const n = state.beds.filter(b => b.type === typeId).length;
  return Math.round(BED_TYPES[typeId].cost * Math.pow(1.06, n));
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
  if (growth >= 0.995) return 'Ready to harvest';
  if (growth < 0.16) return 'Seedling';
  if (growth < 0.5) return crop.beds.includes('bucket') ? 'Vegetative' : 'Leafing out';
  if (growth < 0.85) return crop.beds.includes('bucket') ? 'Flowering' : 'Maturing';
  return crop.beds.includes('bucket') ? 'Fruiting' : 'Nearly ready';
}
function estHarvestKg(bed) {
  const crop = cropById(bed.cropId);
  const plants = BED_TYPES[bed.type].plants;
  return +(plants * crop.yieldKg * (0.45 + 0.55 * bed.health / 100)).toFixed(1);
}
function isNight() { return !!state && (state.dayTime < 0.25 || state.dayTime > 0.79); }

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
    beds: build.beds.map(b => makeBed(b.type, b.crop, b.growth, b.x, b.z)),
    contracts: { offers: [], active: [] },
    upgrades: { led: false, autoDoser: false, hvac: 0, shade: false, rain: false, reservoir: false, marketing: 0 },
    goalsDone: {},
    stats: { planted: 0, harvests: 0, revenue: 0, contractsDelivered: 0, kgHarvested: 0 },
  };
  state = s;
  offerContract(); offerContract();
  return s;
}

function startGame(buildId) {
  freshState(buildId);
  gameOverFlag = false;
  titleVisible = false; gameActive = true;
  hideTitleScreen();
  D.hud.classList.remove('hidden-until-start');
  D.goalsMini.classList.remove('hidden-until-start');
  closeModal(true);
  selectedBedId = null; buildMode = null;
  D.bedPanel.classList.add('hidden');
  D.buildBar.classList.add('hidden');
  World.setGhost(null);
  renderBuildCards();
  refreshWorld();
  updateHUD(true);
  updateGoalsMini();
  saveGame(true);
  const build = BUILDS.find(b => b.id === buildId);
  toast(`🌱 <strong>${build.name}</strong> — ${build.blurb}`, 'money');
  toast('Select a bed to plant, dose or harvest. The Handbook (H) has the full walkthrough.');
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
  D.title && updateTitleContinue();
}

function continueGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) { toast('No saved farm found.', 'warn'); return; }
  let data;
  try { data = JSON.parse(raw); } catch (e) { toast('The save file is corrupted.', 'bad'); return; }
  if (!data || data.version !== 1) { toast('Incompatible save file.', 'bad'); return; }
  data.inventory = Object.assign(Object.fromEntries(CROPS.map(c => [c.id, 0])), data.inventory || {});
  data.market = data.market || {};
  CROPS.forEach(c => { if (!data.market[c.id]) data.market[c.id] = { price: c.basePrice, prev: c.basePrice }; });
  data.contracts = data.contracts || { offers: [], active: [] };
  data.upgrades = Object.assign({ led: false, autoDoser: false, hvac: 0, shade: false, rain: false, reservoir: false, marketing: 0 }, data.upgrades || {});
  data.goalsDone = data.goalsDone || {};
  data.stats = Object.assign({ planted: 0, harvests: 0, revenue: 0, contractsDelivered: 0, kgHarvested: 0 }, data.stats || {});
  data.speed = data.speed || 1;
  data.beds = (data.beds || []).map(b => Object.assign({ warned: {}, rot: 0, health: 100 }, b));
  state = data;
  gameOverFlag = false;
  titleVisible = false; gameActive = true;
  hideTitleScreen();
  D.hud.classList.remove('hidden-until-start');
  D.goalsMini.classList.remove('hidden-until-start');
  closeModal(true);
  selectedBedId = null;
  World.setGhost(null);
  D.buildBar.classList.add('hidden');
  D.bedPanel.classList.add('hidden');
  refreshWorld();
  updateHUD(true);
  updateGoalsMini();
  renderBuildCards();
  toast(`Welcome back — Day ${state.day}. ${state.beds.length} beds and ${fmtMoney(state.cash)} in the bank.`);
  Sfx.play('buy');
}

function saveGame(silent) {
  if (!state) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    lastSaveAt = Date.now();
    if (!silent) { toast('💾 Farm saved.', 'money'); Sfx.play('click'); }
    updateTitleContinue();
  } catch (e) {
    if (!silent) toast('Could not save (browser storage full?).', 'bad');
  }
}
function deleteSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} updateTitleContinue(); }

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
  const plants = BED_TYPES[bed.type].plants;
  const auto = state.upgrades.autoDoser;

  if (auto) {
    bed.water = maxWater();
    bed.ph += (6.0 - bed.ph) * Math.min(1, frac * 14);
    const mid = (crop.ec[0] + crop.ec[1]) / 2;
    bed.ec += (mid - bed.ec) * Math.min(1, frac * 14);
  } else if (bed.water > 0.05) {
    bed.water = Math.max(0, bed.water - frac * plants * 0.95 * (state.upgrades.reservoir ? 0.72 : 1));
    bed.ec = Math.max(0.2, bed.ec - frac * 0.24);
    bed.ph = Math.min(8.2, bed.ph + frac * 0.10);
  }

  const scores = bedScores(bed, crop);
  const condMin = bed.water <= 0.05 ? 0 : Math.min(scores.ph, scores.ec, scores.temp);
  const ledBonus = state.upgrades.led ? 1.3 : 1;
  bed.growth = Math.min(1, bed.growth + (frac / crop.growDays) * condMin * ledBonus);

  const stress = 1 - Math.min(scores.ph, scores.ec, scores.temp);
  const waterStress = bed.water <= 0.05 ? 1 : 0;
  const worst = Math.max(stress, waterStress);
  const healthDelta = worst > 0.3 ? -8 * frac : 4 * frac;
  bed.health = clamp(bed.health + healthDelta, 0, 100);

  if (bed.health <= 0) {
    toast(`💀 Your ${crop.name} crop in the ${BED_TYPES[bed.type].name.toLowerCase()} died. Check water, pH and EC next time!`, 'bad');
    bed.cropId = null; bed.growth = 0; bed.health = 100;
    if (selectedBedId === bed.id) renderBedPanel(true);
  }
}

function advanceDay() {
  state.day++;
  state.weather = rollWeather();
  updateMarket();
  chargeUpkeep();
  if (!state) return;
  expireContracts();
  if (state.contracts.offers.length < 3 && Math.random() < 0.8) offerContract();
  checkGoals();
  if (state.cash < 0) toast(`⚠️ You're ${fmtMoney(-state.cash)} in the red. Sell produce or cut costs!`, 'bad');
  const w = WEATHERS[state.weather];
  if (state.weather === 'heatwave') toast(`🥵 Heatwave! Greenhouse at ${greenhouseTemp()}°C — ${state.upgrades.hvac ? 'HVAC is fighting it.' : 'crops are heat-stressed. Consider HVAC or shade cloth.'}`, 'warn');
  else if (state.weather === 'storm') toast('⛈️ Storm outside. Rainwater collector is working overtime.', 'warn');
  else if (state.weather === 'rain') toast('🌧️ Rainy day — free water and happy roots.');
  Sfx.play('day');
  updateHUD(true);
  if (openModalId === 'modal-market') renderMarket();
  if (openModalId === 'modal-contracts') renderContracts();
  saveGame(true);
  if (state.cash < -750) triggerGameOver();
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
  if (spike) toast(`📈 Demand spike! ${spike.name} is trading high today.`);
}
function chargeUpkeep() {
  const beds = state.beds.length;
  const cost = Math.round(5 + beds * 1.5 + state.upgrades.hvac * 3 + (state.upgrades.led ? 6 : 0) + (state.upgrades.autoDoser ? beds * 1.2 : 0) + (state.upgrades.rain ? 0.5 : 2));
  changeCash(-cost);
  const low = state.beds.filter(b => b.cropId && b.water < 8);
  if (low.length) toast(`💧 ${low.length} bed${low.length > 1 ? 's are' : ' is'} running low on nutrient solution.`, 'warn');
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
  toast(`💵 Sold ${kg.toFixed(1)} kg ${crop.name} for <strong>${fmtMoney(revenue)}</strong> at ${fmtMoney(price)}/kg.`, 'money');
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
  if (kg < 0.01) { toast('Nothing in the warehouse to sell yet.', 'warn'); Sfx.play('error'); return; }
  state.cash += total;
  state.stats.revenue += total;
  toast(`💵 Sold ${kg.toFixed(1)} kg of produce for <strong>${fmtMoney(total)}</strong>.`, 'money');
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
  toast(`📋 Contract accepted: ${offer.qty} kg ${cropById(offer.cropId).name} by Day ${offer.deadline}.`, 'money');
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
    toast(`Not enough ${crop.name} — you have ${(state.inventory[c.cropId] || 0).toFixed(1)} of ${c.qty} kg.`, 'warn');
    Sfx.play('error'); return;
  }
  state.inventory[c.cropId] = +(state.inventory[c.cropId] - c.qty).toFixed(2);
  state.cash += c.reward;
  state.stats.revenue += c.reward;
  state.stats.contractsDelivered++;
  state.reputation = clamp(state.reputation + 0.18 + (state.upgrades.marketing || 0) * 0.02, 1, 5);
  state.contracts.active = state.contracts.active.filter(o => o.id !== id);
  toast(`🤝 Delivered ${c.qty} kg ${crop.name} — <strong>${fmtMoney(c.reward)}</strong> and reputation earned!`, 'money');
  Sfx.play('fanfare'); updateHUD(); flashCash(1);
  checkGoals(); renderContracts(); saveGame(true);
}
function expireContracts() {
  const failed = state.contracts.active.filter(c => state.day > c.deadline);
  if (failed.length) {
    for (const c of failed) {
      state.reputation = clamp(state.reputation - 0.3, 1, 5);
      toast(`❌ Contract expired: ${c.qty} kg ${cropById(c.cropId).name}. Reputation took a hit.`, 'bad');
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
  if (state.cash < cost) { toast('Not enough cash for that upgrade.', 'bad'); Sfx.play('error'); return; }
  state.cash -= cost;
  if (u.maxLevel === 1) state.upgrades[id] = true;
  else state.upgrades[id] = (state.upgrades[id] || 0) + 1;
  if (id === 'reservoir') state.beds.forEach(b => { b.water = Math.min(maxWater(), b.water + 30); });
  toast(`⚙️ Installed <strong>${u.name}</strong> for ${fmtMoney(cost)}.`, 'money');
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
      toast(`🎯 Goal complete: <strong>${g.name}</strong> — reward ${fmtMoney(g.reward)}!`, 'money');
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
    ? `<strong>${next.name}</strong> — ${next.desc} <span style="color:var(--accent)">(+$${next.reward})</span>`
    : '🏆 All milestones complete. You are a true Hydro Baron.';
}

/* ───────────────────────── BUILD MODE ───────────────────────── */
function snap(v) { return Math.round(v * 2) / 2; }
function placementValid(type, x, z) {
  const hw = type === 'tower' ? 0.68 : 1.3;
  const hd = type === 'tower' ? 0.68 : 0.75;
  if (x - hw < -11.6 || x + hw > 11.6) return false;
  if (z - hd < -5.15 || z + hd > 5.15) return false;
  for (const b of state.beds) {
    const bw = b.type === 'tower' ? 0.68 : 1.3;
    const bd = b.type === 'tower' ? 0.68 : 0.75;
    if (Math.abs(x - b.x) < hw + bw + 0.28 && Math.abs(z - b.z) < hd + bd + 0.28) return false;
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
  if (state.cash < cost) {
    toast(`Need ${fmtMoney(cost)} for a ${BED_TYPES[typeId].name}. Sell some produce first!`, 'bad');
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
  if (state.cash < cost) {
    toast('Not enough cash for that bed anymore.', 'bad');
    Sfx.play('error'); closeBuildMode(); return;
  }
  if (!placementValid(type, x, z)) {
    toast('That spot is blocked. Pick a free tile inside the greenhouse.', 'warn');
    Sfx.play('error'); return;
  }
  state.cash -= cost;
  const bed = makeBed(type, null, 0, x, z);
  state.beds.push(bed);
  toast(`🛠️ Built a <strong>${BED_TYPES[type].name}</strong> for ${fmtMoney(cost)}.`, 'money');
  Sfx.play('place'); flashCash(-1);
  refreshWorld(); renderBuildCards(); updateHUD(); checkGoals(); saveGame(true);
  if (state.cash < bedCost(type)) {
    toast('Out of cash for another bed — build mode closed.', 'warn');
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
  if (state.cash < crop.seedCost) { toast(`Need ${fmtMoney(crop.seedCost)} for ${crop.name} seeds.`, 'bad'); Sfx.play('error'); return; }
  state.cash -= crop.seedCost;
  bed.cropId = cropId;
  bed.growth = 0.02;
  bed.health = 100;
  bed.ph = 6.1;
  bed.ec = (crop.ec[0] + crop.ec[1]) / 2;
  state.stats.planted++;
  toast(`🌱 Planted ${crop.name}. ~${crop.growDays.toFixed(1)} days to harvest.`, 'money');
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
  toast(`🧺 Harvested <strong>${kg} kg ${crop.name}</strong>. Sell it in the Market.`, 'money');
  Sfx.play('harvest');
  popupAtBed(bed, `+${kg} kg ${crop.icon}`, 'good');
  bed.cropId = null; bed.growth = 0; bed.health = 100;
  refreshWorld(); updateHUD(); checkGoals(); renderBedPanel(true); saveGame(true);
}
function clearBed(bedId) {
  const bed = state.beds.find(b => b.id === bedId);
  if (!bed || !bed.cropId) return;
  const crop = cropById(bed.cropId);
  toast(`Removed ${crop.name} from the bed.`, 'warn');
  bed.cropId = null; bed.growth = 0; bed.health = 100;
  Sfx.play('error');
  refreshWorld(); renderBedPanel(true); saveGame(true);
}
function doseBed(bedId, kind) {
  const bed = state.beds.find(b => b.id === bedId);
  if (!bed || !bed.cropId) return;
  if (state.upgrades.autoDoser) { toast('Auto-Doser handles that automatically.', 'warn'); return; }
  let cost = 0;
  if (kind === 'water') { cost = state.upgrades.rain ? 1 : 3; if (bed.water >= maxWater()) { toast('The reservoir is already full.', 'warn'); return; } bed.water = maxWater(); }
  if (kind === 'ec') { cost = 2; bed.ec = Math.min(3.6, bed.ec + 0.4); }
  if (kind === 'phdown') { cost = 1; bed.ph = Math.max(4.5, bed.ph - 0.4); }
  if (kind === 'phup') { cost = 1; bed.ph = Math.min(8, bed.ph + 0.4); }
  if (state.cash < cost) { toast('Not enough cash for dosing.', 'bad'); Sfx.play('error'); return; }
  state.cash -= cost;
  Sfx.play('click'); flashCash(-1);
  updateHUD(); renderBedPanel(); saveGame(true);
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
  D.cashLabel.textContent = fmtMoney(state.cash);
  D.cashBlock.classList.toggle('negative', state.cash < 0);
  D.cashBlock.classList.toggle('pulse', false);
  const f = Math.round(clamp(state.reputation, 1, 5));
  D.repLabel.textContent = '★'.repeat(f) + '☆'.repeat(5 - f);
  D.networthLabel.textContent = fmtMoney(netWorth(state));
  const w = WEATHERS[state.weather] || WEATHERS.sunny;
  D.weatherIcon.textContent = w.icon;
  D.dayLabel.textContent = 'Day ' + state.day;
  const hours = Math.floor(state.dayTime * 24);
  const mins = Math.floor(((state.dayTime * 24) % 1) * 60);
  D.clockLabel.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} · ${w.label} ${greenhouseTemp()}°C`;
  D.dayPill.title = `Outside ${w.temp}°C · Greenhouse ${greenhouseTemp()}°C`;
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
  D.btnStart.textContent = `🌱 Start ${build.name}`;
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
  if (D.btnClear) { D.btnClear.textContent = '🗑️ Clear'; D.btnClear.classList.remove('danger'); }
}
function statusClass(bed, crop) {
  if (!crop) return '';
  const s = bedScores(bed, crop);
  const bad = bed.water <= 0.5 || bed.health < 35;
  const warn = bed.water < 10 || bed.health < 70 || s.ph < 0.55 || s.ec < 0.55 || s.temp < 0.55;
  return bad ? 'bad' : warn ? 'warn' : '';
}
function renderBedPanel(force) {
  if (!selectedBedId) { D.bedPanel.classList.add('hidden'); return; }
  const bed = state ? state.beds.find(b => b.id === selectedBedId) : null;
  if (!bed) { selectedBedId = null; D.bedPanel.classList.add('hidden'); World.setSelected(null); return; }
  D.bedPanel.classList.remove('hidden');
  const bt = BED_TYPES[bed.type];
  D.bedTitle.textContent = bt.name;

  if (!bed.cropId) {
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
          <span class="s-meta"><strong>${c.name}</strong><small>${c.growDays.toFixed(1)} days · ${(bt.plants * c.yieldKg).toFixed(1)} kg/bed · $${sellPrice(c.id, state).toFixed(2)}/kg</small></span>
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
  const dayIn = Math.min(Math.ceil(crop.growDays), Math.floor(bed.growth * crop.growDays) + 1);
  D.cropStage.textContent = `${stageName(crop, bed.growth)} · Day ${dayIn} of ~${Math.ceil(crop.growDays)} · ${fmtMoney(sellPrice(crop.id, state))}/kg`;
  D.healthLabel.textContent = Math.round(bed.health);
  D.healthLabel.style.color = bed.health >= 70 ? '#b9ffdc' : bed.health >= 35 ? 'var(--amber)' : 'var(--red)';
  D.growthPct.textContent = Math.floor(bed.growth * 100) + '%';
  D.growthFill.style.width = (bed.growth * 100) + '%';
  const mw = maxWater();
  D.waterLabel.textContent = `${Math.round(bed.water)} / ${mw} L`;
  D.waterFill.style.width = (bed.water / mw * 100) + '%';
  D.waterFill.style.background = bed.water < 10 ? 'linear-gradient(90deg,#8a2f28,#ff6b5e)' : '';
  D.phLabel.textContent = bed.ph.toFixed(1);
  D.phPin.style.left = clamp((bed.ph - 4.5) / 3.5 * 100, 2, 98) + '%';
  D.ecLabel.textContent = bed.ec.toFixed(2);
  D.ecPin.style.left = clamp(bed.ec / 4 * 100, 2, 98) + '%';

  const worst = worstCondition(bed, crop);
  const hint = conditionHint(bed, crop, worst);
  D.conditionHint.textContent = hint.text;
  D.conditionHint.className = 'condition-hint ' + hint.cls;
  D.bedStatusDot.className = 'status-dot ' + statusClass(bed, crop);

  const ready = bed.growth >= 0.995;
  D.btnHarvest.disabled = !ready;
  D.btnHarvest.textContent = ready ? `🧺 Harvest ${estHarvestKg(bed)} kg` : `Growing… ${Math.floor(bed.growth * 100)}%`;

  const auto = state.upgrades.autoDoser;
  D.doseWater.disabled = auto || bed.water >= mw - 0.5 || state.cash < (state.upgrades.rain ? 1 : 3);
  D.doseEc.disabled = auto || state.cash < 2;
  D.dosePhdown.disabled = auto || state.cash < 1;
  D.dosePhup.disabled = auto || state.cash < 1;
  if (auto) D.conditionHint.textContent += ' · Auto-Doser active.';
}
function conditionHint(bed, crop, worst) {
  const t = greenhouseTemp();
  const s = worst.scores;
  if (bed.water <= 0.5) return { text: 'Reservoir empty — roots are drying out! Refill immediately.', cls: 'bad' };
  if (bed.health < 35) return { text: 'Crop health critical. Fix pH / EC / temperature now or lose the harvest.', cls: 'bad' };
  if (s.ph < 0.6) return { text: `pH ${bed.ph.toFixed(1)} is off — target 5.5–6.5. Use pH${bed.ph > 6.5 ? '−' : '+'} dosing.`, cls: 'warn' };
  if (s.ec < 0.6) return { text: `EC ${bed.ec.toFixed(2)} is outside ${crop.ec[0]}–${crop.ec[1]} mS/cm. Add or dilute nutrients.`, cls: 'warn' };
  if (s.temp < 0.6) return { text: `Greenhouse is ${t}°C — ${t > 29 ? 'heat stress!' : 'too cold for vigorous growth.'} ${state.upgrades.hvac ? 'HVAC is helping.' : 'Consider HVAC or shade cloth.'}`, cls: 'warn' };
  if (bed.water < 10) return { text: 'Nutrient solution running low — top up soon.', cls: 'warn' };
  if (bed.ph > 6.5) return { text: 'Slightly alkaline. A small pH− dose keeps nutrient uptake optimal.', cls: 'warn' };
  if (bed.ph < 5.5) return { text: 'Slightly acidic. A small pH+ dose will bring it back in range.', cls: 'warn' };
  return { text: 'Conditions are dialled in. Plants are thriving.', cls: '' };
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
      <div class="m-name"><strong>${c.name}</strong><small>ideal EC ${c.ec[0]}–${c.ec[1]}</small></div>
      <div class="m-price">${fmtMoney(price)}/kg ${arrow}</div>
      <div class="m-stock">${stock.toFixed(1)} kg</div>
      <button class="mini-btn" data-sell="1" data-crop="${c.id}" ${stock < 0.05 ? 'disabled' : ''}>1 kg</button>
      <button class="mini-btn all" data-sell="all" data-crop="${c.id}" ${stock < 0.05 ? 'disabled' : ''}>All</button>
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
        <small>Premium order · accept within ${days} day${days > 1 ? 's' : ''} · deliver by Day ${o.deadline}</small>
      </div>
      <div class="c-reward"><strong>${fmtMoney(o.reward)}</strong><small>+0.18★</small></div>
      <button class="mini-btn all" data-accept="${o.id}">Accept</button>
      <button class="mini-btn" data-decline="${o.id}">✕</button>
    </div>`;
  }).join('') : `<div class="contract-empty">No offers right now — new buyers visit most mornings.</div>`;

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
        <small>In warehouse: ${stock.toFixed(1)} kg · <span class="c-deadline ${days <= 1 ? 'urgent' : ''}">${days <= 0 ? 'DUE TODAY' : days + ' day' + (days > 1 ? 's' : '') + ' left'}</span></small>
      </div>
      <div class="c-reward"><strong>${fmtMoney(c.reward)}</strong><small>premium order</small></div>
      <button class="mini-btn ${enough ? 'all' : ''}" data-deliver="${c.id}" ${enough ? '' : 'disabled'}>${enough ? 'Deliver' : 'Need stock'}</button>
    </div>`;
  }).join('') : `<div class="contract-empty">No active orders. Accept one above to lock in premium prices.</div>`;
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
        <span class="u-cost">${maxed ? 'MAXED' : fmtMoney(cost)}</span>
        ${maxed ? '' : `<button class="mini-btn all" data-upgrade="${u.id}" ${state.cash < cost ? 'disabled' : ''}>${lvl ? 'Upgrade' : 'Buy'}</button>`}
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
      <div class="goal-reward">${done ? 'done' : fmtMoney(g.reward)}</div>
    </div>`;
  }).join('');
}
function renderBuildCards() {
  const types = ['nft', 'bucket', 'tower'];
  D.buildCards.innerHTML = types.map((id, i) => {
    const bt = BED_TYPES[id];
    const cost = bedCost(id);
    const afford = state && state.cash >= cost;
    return `<button class="build-card ${afford ? '' : 'insufficient'} ${buildMode === id ? 'selected' : ''}" data-build-type="${id}">
      <span class="b-icon">${bt.icon}</span>
      <strong>${bt.name}</strong>
      <small>${bt.plants} plants · ${bt.desc.split('. ')[0]}.</small>
      <span class="b-cost">${fmtMoney(cost)} <span style="opacity:.5;font-weight:500">[${i + 1}]</span></span>
    </button>`;
  }).join('');
}

/* ───────────────────────── MODALS ───────────────────────── */
function openModal(id) {
  if (gameOverFlag && id !== 'modal-gameover') return;
  if (!state) return;
  if (openModalId) document.getElementById(openModalId).classList.add('hidden');
  openModalId = id;
  const el = document.getElementById(id);
  el.classList.remove('hidden');
  if (id === 'modal-market') renderMarket();
  if (id === 'modal-contracts') renderContracts();
  if (id === 'modal-upgrades') renderUpgrades();
  if (id === 'modal-goals') renderGoals();
  if (id === 'modal-menu') updateMuteButtons();
  Sfx.play('click');
}
function closeModal(silent) {
  if (!openModalId) return;
  if (openModalId === 'modal-gameover') return;
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
    <div><strong>${state.day}</strong><small>DAYS</small></div>
    <div><strong>${fmtMoney(state.stats.revenue)}</strong><small>REVENUE</small></div>
    <div><strong>${state.stats.harvests}</strong><small>HARVESTS</small></div>
    <div><strong>${state.stats.contractsDelivered}</strong><small>ORDERS</small></div>`;
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
  World.setBedVisuals(state.beds);
  const ledOn = !!state.upgrades.led && isNight();
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
  D.btnGoals.addEventListener('click', () => openModal('modal-goals'));
  D.btnHelp.addEventListener('click', () => openModal('modal-help'));
  D.btnMenu.addEventListener('click', () => openModal('modal-menu'));
  D.btnMute.addEventListener('click', () => { Sfx.unlock(); Sfx.toggle(); });
  D.goalsMini.addEventListener('click', () => openModal('modal-goals'));
  D.bedClose.addEventListener('click', () => selectBed(null));

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
      D.btnClear.textContent = '⚠ Click again to remove';
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
  $('menu-save').addEventListener('click', () => { saveGame(false); });
  $('menu-help').addEventListener('click', () => openModal('modal-help'));
  $('menu-mute').addEventListener('click', () => { Sfx.unlock(); Sfx.toggle(); });
  $('menu-restart').addEventListener('click', () => {
    if (confirm('Restart this run? All progress will be lost.')) {
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
    if (['1', '2', '3'].includes(k)) {
      if (!D.buildBar.classList.contains('hidden')) chooseBuildType(['nft', 'bucket', 'tower'][+k - 1]);
      else setSpeed(+k);
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
    'contracts-badge', 'btn-upgrades', 'btn-goals', 'btn-mute', 'btn-help', 'btn-menu', 'bed-panel', 'bed-title', 'bed-status-dot', 'bed-close',
    'seed-section', 'seed-options', 'grow-section', 'crop-icon', 'crop-name', 'crop-stage', 'health-label', 'growth-pct', 'growth-fill',
    'water-label', 'water-fill', 'ph-label', 'ph-ideal', 'ph-pin', 'ec-label', 'ec-ideal', 'ec-pin', 'condition-hint', 'dose-water', 'dose-ec',
    'dose-phdown', 'dose-phup', 'btn-harvest', 'btn-clear', 'build-bar', 'build-cards', 'goals-mini', 'goals-mini-text', 'toasts', 'popups',
    'modal-market', 'market-rows', 'market-inventory-value', 'market-sell-all', 'modal-contracts', 'contract-offers', 'contract-active',
    'modal-upgrades', 'upgrade-grid', 'modal-goals', 'goals-list', 'modal-help', 'modal-menu', 'menu-resume', 'menu-save', 'menu-help',
    'modal-mute', 'menu-mute', 'menu-restart', 'modal-gameover', 'gameover-stats', 'gameover-restart'];
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

  let time = 0.3;
  if (state) time = state.dayTime;
  else time = (0.26 + elapsed * 0.004) % 1;
  const ledOn = !!(state && state.upgrades.led && isNight());
  World.update(dt, elapsed, time, state ? state.weather : 'sunny', ledOn);

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
