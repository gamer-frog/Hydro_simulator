(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const fmt = (n) => Math.round(n).toLocaleString('es-AR');
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const STAGES = [
    { name: 'Plántula', from: 1, pill: 'PLÁNTULA' },
    { name: 'Crecimiento', from: 12, pill: 'CRECIMIENTO' },
    { name: 'Prefloración', from: 27, pill: 'PREFLORACIÓN' },
    { name: 'Floración', from: 37, pill: 'FLORACIÓN' },
    { name: 'Maduración', from: 57, pill: 'MADURACIÓN' },
    { name: 'Cosecha', from: 67, pill: 'COSECHA' }
  ];

  const initialGame = () => ({
    day: 1, selected: 0, water: 15, nutrients: 7, energy: 88, cash: 48000,
    temp: 24, humidity: 58, light: 18, vented: false, harvested: 0,
    harvestYield: 0, spent: 0, finished: false, archived: false,
    plants: Array.from({ length: 9 }, (_, i) => ({
      id: i + 1, age: 1 + (i % 3), health: 88 + (i % 4) * 3,
      moisture: 46 + (i * 11) % 31, nutrition: 48 + (i * 7) % 28,
      alive: true, checked: false
    })),
    logs: [{ day: 1, text: '<b>Temporada iniciada.</b> Nueve autos en su primer día.', kind: 'success' }]
  });

  const initialBudget = () => ({ plants: 9, yield: 55, price: 4500, kwh: 95, hours: 18, days: 75, watts: 240 });
  const defaultApp = () => ({
    view: 'panel', budget: initialBudget(), tasks: {}, legal: {}, userResources: [],
    selectedResource: null, queries: 0, chat: [], chatSources: [], dupOnly: false,
    journalWeek: null, journalTasks: {}, selectedStrain: null, grows: []
  });

  let game, app;
  try {
    const saved = JSON.parse(localStorage.getItem('verde-app-v2') || 'null');
    game = saved && saved.game && Array.isArray(saved.game.plants) ? saved.game : initialGame();
    app = Object.assign(defaultApp(), saved ? saved.app : {});
    app.budget = Object.assign(initialBudget(), app.budget || {});
    app.userResources = Array.isArray(app.userResources) ? app.userResources : [];
    app.journalTasks = app.journalTasks || {};
    app.grows = Array.isArray(app.grows) ? app.grows : [];
  } catch { game = initialGame(); app = defaultApp(); }

  const persist = () => {
    try { localStorage.setItem('verde-app-v2', JSON.stringify({ game, app })); } catch {}
  };

  /* ---------- derived data ---------- */
  const allResources = () => [...app.userResources, ...window.LIBRARY];
  const plantStage = (p) => [...STAGES].reverse().find(s => p.age >= s.from) || STAGES[0];
  const dayPhase = (d) => window.PHASES.find(p => d >= p.from && d <= p.to) || window.PHASES[window.PHASES.length - 1];
  const statusOf = (p) => !p.alive ? 'dead' : (p.health < 55 || p.moisture < 20 || p.moisture > 87 || p.nutrition < 16 ? 'attention' : '');
  const healthyCount = () => game.plants.filter(p => p.alive && p.health >= 50).length;
  const activeCount = () => game.plants.filter(p => p.alive).length;
  const readyPlants = () => game.plants.filter(p => p.alive && p.age >= 67);
  const avgHealth = () => {
    const alive = game.plants.filter(p => p.alive);
    return alive.length ? Math.round(alive.reduce((n, p) => n + p.health, 0) / alive.length) : 0;
  };
  const stageForDay = (d) => [...STAGES].reverse().find(s => d >= s.from) || STAGES[0];
  const nextStage = (d) => STAGES.find(s => s.from > d);

  function costsFor(b) {
    const energy = (b.watts / 1000) * b.hours * b.days * b.kwh;
    const seeds = b.plants * 8000;
    const substrate = b.plants * 7500;
    const nutrition = b.plants * 6000;
    const water = 1200 + b.plants * 140;
    const equipment = 120000 * Math.pow(b.plants / 9, 0.55);
    const misc = 22000 * Math.pow(b.plants / 9, 0.4);
    const management = b.plants * 2500;
    const subtotal = seeds + substrate + nutrition + energy + water + equipment + misc + management;
    const contingency = subtotal * 0.04;
    const total = subtotal + contingency;
    const grams = b.plants * b.yield;
    const value = grams * b.price;
    return {
      items: [
        { key: 'seeds', name: 'Semillas', value: seeds, color: '#d8f26b' },
        { key: 'substrate', name: 'Sustrato', value: substrate, color: '#9cc24f' },
        { key: 'nutrition', name: 'Nutrición', value: nutrition, color: '#6f9b57' },
        { key: 'energy', name: 'Energía', value: energy, color: '#e8b56a' },
        { key: 'equipment', name: 'Equipos', value: equipment, color: '#8b947d' },
        { key: 'water', name: 'Agua e insumos', value: water + misc, color: '#7fb7c9' },
        { key: 'management', name: 'Gestión', value: management, color: '#b9a6e6' },
        { key: 'contingency', name: 'Contingencia', value: contingency, color: '#46503b' }
      ],
      total, grams, value, energy, perPlant: total / b.plants,
      perGram: total / grams, margin: ((value - total) / total) * 100
    };
  }
  const budget = () => costsFor(app.budget);

  function scaleScenario(n) {
    const b = Object.assign({}, app.budget, { plants: n, watts: Math.max(120, app.budget.watts * n / 9) });
    const c = costsFor(b);
    return { cost: c.total, perGram: c.perGram, grams: c.grams };
  }

  const view = (name) => getComputedStyle($('#view-' + name)).display !== 'none';

  /* ---------- navigation ---------- */
  const VIEWS = { panel: 'INICIO', strains: 'CEPAS', journal: 'DIARIO', sim: 'SIMULADOR', library: 'BIBLIOTECA', oracle: 'ORÁCULO IA', budget: 'COSTOS', process: 'PROCESO' };
  function navigate(target, opts = {}) {
    if (!VIEWS[target]) target = 'panel';
    app.view = target;
    $('#resourceDetail').classList.remove('mobile-open');
    document.body.classList.remove('detail-open');
    $('#moreSheet').classList.remove('open');
    $$('.view').forEach(v => v.classList.toggle('active', v.id === `view-${target}`));
    $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.nav === target));
    $$('.mobile-nav button[data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === target));
    $('#crumbCurrent').textContent = VIEWS[target];
    if (opts.journalWeek) app.journalWeek = opts.journalWeek;
    if (target === 'library') {
      if (!opts.resourceId) app.selectedResource = null;
      renderLibrary(opts.resourceId);
    }
    if (target === 'oracle') { renderChat(); if (opts.question) askOracle(opts.question); else setTimeout(() => $('#chatInput')?.focus(), 250); }
    if (target === 'budget') renderBudget();
    if (target === 'process') renderProcess();
    if (target === 'panel') renderPanel();
    if (target === 'sim') renderSim();
    if (target === 'strains') renderStrains();
    if (target === 'journal') renderJournal();
    persist();
    history.replaceState(null, '', `#${target}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function renderNav() {
    const docs = allResources().length;
    $('#navDay').textContent = 'D' + String(game.day).padStart(2, '0');
    $('#navWeek').textContent = 'S' + currentWeek();
    $('#navDocs').textContent = docs;
    $('#statDocs').textContent = docs;
    $('#statPlants').textContent = activeCount();
    $('#statQueries').textContent = app.queries;
    $('#statBudget').textContent = fmt(budget().total);
    $('#statPerGram').textContent = '$' + fmt(budget().perGram) + ' / g';
  }

  /* ---------- dashboard ---------- */
  function renderPanel() {
    renderNav();
    const phase = stageForDay(game.day);
    const pct = Math.min(1, game.day / 75);
    const circ = 2 * Math.PI * 19;
    $('#panelPhase').textContent = phase.pill;
    $('#heroDay').textContent = String(game.day).padStart(2, '0');
    $('#heroCtaDay').textContent = String(game.day).padStart(2, '0');
    $('#heroPhase').textContent = phase.name;
    $('#heroHealth').textContent = avgHealth() + '%';
    $('#heroDays').textContent = Math.max(0, 75 - game.day);
    $('#heroHarvest').textContent = game.harvested;
    $('#heroRing').style.strokeDasharray = circ;
    $('#heroRing').style.strokeDashoffset = circ * (1 - pct);
    $('#heroProgress').style.width = (pct * 100) + '%';
    const nxt = nextStage(game.day);
    $('#panelMilestone').textContent = nxt ? `Próximo: día ${nxt.from} · ${nxt.name}` : 'Cierre de temporada';
    const p = dayPhase(game.day);
    $('#heroInsight').textContent = game.finished
      ? `Temporada completada: ${fmt(game.harvestYield)} g registrados y ${game.harvested} cosechas. Revisá el resultado o iniciá una nueva temporada.`
      : phaseMessage();

    $('#miniPlants').innerHTML = game.plants.map(p => {
      const st = statusOf(p);
      const h = 20 + Math.min(26, p.age * .42);
      return `<div class="mini-pot ${st}" title="Planta ${p.id}"><span class="mini-plant" style="--h:${h}px"></span></div>`;
    }).join('');

    const milestones = [
      { name: 'Plántula', from: 1 }, { name: 'Crecimiento', from: 12 }, { name: 'Floración', from: 27 },
      { name: 'Maduración', from: 57 }, { name: 'Cosecha', from: 67 }
    ];
    let current = 0;
    milestones.forEach((m, i) => { if (game.day >= m.from) current = i; });
    $('#seasonTrack').innerHTML = milestones.map((m, i) => {
      const next = milestones[i + 1];
      const cls = game.day >= (next ? next.from : 76) ? 'done' : i === current ? 'current' : '';
      return `<div class="season-node ${cls}"><span class="season-dot"></span><span class="sn-name">${m.name}</span><span class="sn-days">DÍA ${m.from}</span></div>`;
    }).join('');

    $('#focusList').innerHTML = (game.finished
      ? ['Cosecha registrada. Compará el costo real con tu presupuesto.', 'Guardá aprendizajes en la bitácora de la próxima temporada.', 'Revisá los recursos de secado y curado.']
      : p.tasks.slice(0, 3).map(t => t.text)
    ).map(t => `<div class="focus-item"><span>◆</span>${esc(t)}</div>`).join('');

    $('#recentList').innerHTML = allResources().slice(-3).reverse().map(r => `<div class="recent-item" data-resource="${r.id}"><span class="recent-icon">PDF</span><span class="recent-info"><span class="recent-title">${esc(r.title)}</span><span class="recent-meta">${esc(r.diploma)} · ${r.module}</span></span><span class="recent-tag">${r.pages} pp.</span></div>`).join('');
    $$('#recentList .recent-item').forEach(el => el.addEventListener('click', () => navigate('library', { resourceId: Number(el.dataset.resource) })));

    const dups = window.LIBRARY.filter(r => r.dup);
    const groups = [...new Set(dups.map(r => r.dup))];
    $('#dupCount').textContent = dups.length;
    $('#insightCount').textContent = groups.length;
    const pair = window.LIBRARY.filter(r => r.dup === 'riego').slice(0, 2);
    $('#insightPair').innerHTML = pair.map((r, i) => `<span class="pair-dot"></span><b>${esc(r.title)}</b>${i === 0 ? '<span style="font-size:7px;color:#5d6752">↔</span>' : ''}`).join('');

    // strain rail
    const picks = [window.STRAINS[0], window.STRAINS[3], window.STRAINS[7], window.STRAINS[10]];
    $('#strainRail').innerHTML = picks.map(strainCardHTML).join('');
    bindStrainCards('#strainRail');

    // dashboard week chips
    $('#dashWeeks').innerHTML = journalWeeks().map(w => {
      const st = w.n < currentWeek() ? 'done' : w.n === currentWeek() ? 'current' : '';
      return `<button class="week-chip ${st}" data-journal-week="${w.n}"><b>S${w.n}</b><span>${esc(w.title)}</span></button>`;
    }).join('');
    $$('#dashWeeks [data-journal-week]').forEach(el => el.addEventListener('click', () => navigate('journal', { journalWeek: Number(el.dataset.journalWeek) })));
  }

  function phaseMessage() {
    const selected = game.plants[game.selected] || game.plants[0];
    if (!selected.alive) return 'Una planta ya cerró su ciclo. El resto sigue avanzando: mantené la rutina y revisá la madurez del resto.';
    if (selected.moisture < 24) return 'El sustrato de la planta seleccionada está seco. Regá con moderación y volvé a observar el drenaje.';
    if (selected.moisture > 82) return 'La maceta todavía está húmeda. Esperá antes de regar: el exceso de agua también estresa.';
    return dayPhase(game.day).focus[0];
  }

  /* ---------- simulator ---------- */
  function renderSim() {
    renderNav();
    const selected = game.plants[game.selected] || game.plants[0];
    $('#dayNumber').textContent = String(game.day).padStart(2, '0');
    $('#dateLabel').textContent = `${game.day < 15 ? '21 MAR' : game.day < 46 ? '15 ABR' : '20 MAY'} · 08:00`;
    $('#weekLabel').textContent = String(Math.ceil(game.day / 7)).padStart(2, '0');
    $('#harvestLabel').textContent = game.harvested;
    $('#spentLabel').textContent = '$' + fmt(game.spent);
    const next = nextStage(game.day);
    $('#milestoneLabel').textContent = next ? `Día ${next.from} · ${next.name}` : 'Cosecha y cierre';
    $('#phasePill').textContent = selected.alive ? plantStage(selected).pill : 'CICLO CERRADO';
    $('#tempValue').textContent = game.temp;
    $('#humidityValue').textContent = game.humidity;
    $('#lightValue').textContent = game.light;
    const svp = 0.6108 * Math.exp(17.27 * game.temp / (game.temp + 237.3));
    const vpd = svp * (1 - game.humidity / 100);
    $('#vpdValue').textContent = vpd.toFixed(2);
    const vpdState = vpd > 1.8 || vpd < 0.6 ? ['OBSERVAR', 'warn'] : ['ÓPTIMO', 'good'];
    $('#vpdState').textContent = vpdState[0];
    $('#vpdState').className = `reading-state ${vpdState[1]}`;
    $('#waterValue').innerHTML = `${game.water} <small>/ 20 L</small>`;
    $('#nutrientValue').innerHTML = `${game.nutrients} <small>/ 10</small>`;
    $('#energyValue').innerHTML = `${game.energy} <small>/ 100</small>`;
    $('#waterMeter').style.width = `${game.water / 20 * 100}%`;
    $('#nutrientMeter').style.width = `${game.nutrients / 10 * 100}%`;
    $('#energyMeter').style.width = `${game.energy}%`;
    $('#readyCount').textContent = readyPlants().length;
    $('#selectedLabel').textContent = `Planta ${String(game.selected + 1).padStart(2, '0')}`;
    $('#goalProgress').style.width = `${Math.max(0, healthyCount() / 9 * 100)}%`;
    $('#goalLabel').textContent = `${healthyCount()} de 9 plantas activas`;
    $('#spentFoot').innerHTML = `$${fmt(game.spent)} <small>ARS</small>`;
    $('#cashValue').textContent = '$' + fmt(game.cash);

    const tempState = game.temp > 29 || game.temp < 19 ? ['ALERTA', 'bad'] : game.temp > 27 || game.temp < 21 ? ['OBSERVAR', 'warn'] : ['ÓPTIMA', 'good'];
    const humState = game.humidity > 72 || game.humidity < 35 ? ['OBSERVAR', 'warn'] : ['ÓPTIMA', 'good'];
    $('#tempState').textContent = tempState[0];
    $('#tempState').className = `reading-state ${tempState[1]}`;
    $('#humidityState').textContent = humState[0];
    $('#humidityState').className = `reading-state ${humState[1]}`;
    $('#sceneStatus').textContent = tempState[1] === 'bad' || humState[1] === 'warn' ? 'REVISAR CONDICIONES' : 'CONDICIONES ESTABLES';
    $('#climateNote').textContent = game.temp > 27 ? 'La temperatura subió. Ventilá para refrescar el ambiente.' : game.humidity > 72 ? 'Humedad elevada. Una buena ventilación ayuda.' : 'Ambiente estable. Mantené una rutina constante.';

    $('#plantGrid').innerHTML = game.plants.map((p, i) => {
      const status = statusOf(p);
      const grow = Math.min(75, 18 + p.age * .74);
      return `<button class="plant-slot ${status} ${p.age >= 37 ? 'bloom' : ''} ${i === game.selected ? 'selected' : ''}" data-plant="${i}" aria-label="Planta ${i + 1}, ${p.alive ? plantStage(p).name : 'cosechada'}"><span class="plant-id">${String(i + 1).padStart(2, '0')}</span><span class="plant-condition"></span>${p.alive ? `<span class="plant" style="--grow:${grow}"><i class="plant-stem"></i><i class="leaf l1"></i><i class="leaf l2"></i><i class="leaf l3"></i><i class="leaf l4"></i><i class="leaf l5"></i></span>` : '<span class="plant" style="--grow:10"><i class="plant-stem"></i></span>'}<span class="pot"></span></button>`;
    }).join('');
    $$('#plantGrid .plant-slot').forEach(el => el.addEventListener('click', () => { game.selected = Number(el.dataset.plant); renderSim(); persist(); }));

    if (!selected.alive) {
      $('#plantDetail').innerHTML = `<span class="detail-title">Planta ${String(game.selected + 1).padStart(2, '0')}<small>Ciclo completado</small></span><span class="detail-note">Buen trabajo: ya está en tu registro de cosecha.</span>`;
    } else {
      $('#plantDetail').innerHTML = `<span class="detail-title">Planta ${String(game.selected + 1).padStart(2, '0')}<small>${plantStage(selected).name} · Día ${selected.age}</small></span><span class="detail-stat">VITALIDAD <b>${selected.health}%</b><i class="detail-bar"><i style="width:${selected.health}%"></i></i></span><span class="detail-stat">HUMEDAD <b>${selected.moisture}%</b><i class="detail-bar"><i style="width:${selected.moisture}%"></i></i></span><span class="detail-note">${selected.checked ? 'Revisión al día ✓' : statusOf(selected) ? 'Necesita atención' : 'Todo en orden'}</span>`;
    }

    $$('.action-card').forEach(btn => {
      const action = btn.dataset.action;
      btn.disabled =
        (action === 'water' && (!selected.alive || game.water < 1 || selected.moisture > 82)) ||
        (action === 'feed' && (!selected.alive || game.nutrients < 1 || selected.nutrition > 88)) ||
        (action === 'vent' && (game.energy < 1 || game.vented)) ||
        (action === 'harvest' && (!selected.alive || selected.age < 67));
    });

    $('#logCount').textContent = String(game.logs.length).padStart(2, '0');
    $('#logList').innerHTML = game.logs.slice(0, 4).map(x => `<div class="log-item"><span class="log-mark ${x.kind}"></span><span class="log-time">D${String(x.day).padStart(2, '0')}</span><span class="log-text">${x.text}</span></div>`).join('');
    $('#tipText').textContent = !selected.alive ? 'Elegí una planta activa para continuar con los cuidados.'
      : selected.moisture < 30 ? 'El sustrato está seco. Una pequeña cantidad de agua puede ayudar.'
      : selected.moisture > 78 ? 'El sustrato sigue húmedo; esperá antes de volver a regar.'
      : selected.age >= 67 ? 'Esta planta alcanzó la madurez. Podés cosecharla.'
      : 'Revisá el sustrato antes de regar. Un exceso de agua también estresa.';
  }

  function saveAndRefresh() { persist(); renderSim(); renderPanel(); }

  function action(type) {
    const p = game.plants[game.selected];
    if (!p) return;
    if (type === 'water') {
      if (!p.alive || p.moisture > 82 || game.water < 1) return;
      p.moisture = Math.min(92, p.moisture + 45); game.water--; p.checked = true; game.spent += 150;
      log(`<b>Riego aplicado.</b> Planta ${p.id} · sustrato al ${p.moisture}%.`);
      showToast(`Planta ${p.id}: riego aplicado.`);
    }
    if (type === 'feed') {
      if (!p.alive || p.nutrition > 88 || game.nutrients < 1) return;
      p.nutrition = Math.min(100, p.nutrition + 42); game.nutrients--; p.checked = true; game.spent += 900;
      log(`<b>Nutrición equilibrada.</b> Planta ${p.id} recibió una dosis.`);
      showToast(`Planta ${p.id}: aporte aplicado.`);
    }
    if (type === 'inspect') {
      if (!p.alive) return;
      p.checked = true;
      const msg = p.moisture < 30 ? 'Sustrato seco' : p.moisture > 78 ? 'Humedad alta' : p.health < 60 ? 'Vitalidad baja' : 'Sin señales de estrés';
      log(`<b>Inspección · Planta ${p.id}.</b> ${msg}.`);
      showToast(`Planta ${p.id}: ${msg.toLowerCase()}.`);
    }
    if (type === 'vent') {
      if (game.energy < 1 || game.vented) return;
      game.energy--; game.temp = Math.max(19, game.temp - 3); game.humidity = Math.max(40, game.humidity - 8); game.vented = true; game.spent += 90;
      log('<b>Ventilación activada.</b> El ambiente se renovó.');
      showToast('Ambiente renovado.');
    }
    if (type === 'harvest') {
      if (!p.alive || p.age < 67) return;
      const grams = Math.round(10 + p.health * .55 + Math.min(8, (p.age - 67) * .4));
      p.alive = false; game.harvested++; game.harvestYield += grams; game.spent += 1200;
      const quality = p.health > 75 ? 'calidad excelente' : p.health > 50 ? 'calidad equilibrada' : 'calidad modesta';
      log(`<b>Planta ${p.id} cosechada.</b> ${grams} g · ${quality}.`, 'success');
      showToast(`¡${grams} g cosechados! ${quality}.`);
    }
    saveAndRefresh();
  }

  function log(text, kind = '') {
    game.logs.unshift({ day: game.day, text, kind });
    game.logs = game.logs.slice(0, 8);
  }

  function advance() {
    if (game.finished) { showToast('La temporada terminó. Podés reiniciar desde el resumen.'); return; }
    if (game.day >= 75) { game.finished = true; showToast('Día 75: temporada cerrada. Revisá tu cosecha.'); saveAndRefresh(); return; }
    game.day++; game.vented = false;
    game.temp = Math.max(18, Math.min(31, game.temp + (Math.random() < .32 ? (Math.random() < .5 ? -1 : 1) : 0)));
    game.humidity = Math.max(35, Math.min(78, game.humidity + (Math.random() < .5 ? -3 : 3)));
    game.energy = Math.max(0, game.energy - 2);
    game.spent += 4200 + Math.round(Math.random() * 600);
    game.plants.forEach(p => {
      if (!p.alive) return;
      p.age++; p.moisture = Math.max(0, p.moisture - 10 - Math.floor(Math.random() * 5)); p.nutrition = Math.max(0, p.nutrition - 2);
      let stress = 0;
      if (p.moisture < 18 || p.moisture > 93) stress += 7;
      if (p.nutrition < 12) stress += 5;
      if (game.temp > 29 || game.temp < 19) stress += 4;
      p.health = Math.max(0, Math.min(100, p.health + (stress ? -stress : 1)));
      p.checked = false;
      if (p.health <= 0) { p.alive = false; log(`<b>Planta ${p.id} completó su ciclo.</b> El estrés fue demasiado alto.`, 'warning'); }
    });
    if (game.day % 7 === 0) log(`<b>Semana ${Math.ceil(game.day / 7)}.</b> ${healthyCount()} plantas siguen saludables.`, healthyCount() >= 7 ? 'success' : 'warning');
    if (game.day === 27) log('<b>Prefloración:</b> ajustá nutrición y humedad para el estiramiento.', 'success');
    if (game.day === 67) log('<b>Ventana de cosecha abierta.</b> Revisá tricomas antes de cortar.', 'success');
    if (game.day >= 75) { game.finished = true; log(`<b>Temporada cerrada.</b> ${game.harvested} cosechas y ${fmt(game.harvestYield)} g registrados.`, 'success'); }
    if (game.finished) archiveSeason();
    saveAndRefresh();
    showToast(`Día ${game.day}: ${game.day >= 67 ? 'revisá la madurez de tus plantas.' : 'el cultivo ha crecido.'}`);
  }

  /* ---------- quick sim ---------- */
  let quickStrategy = 'balanced';

  function runQuickSim() {
    if (game.finished) { showToast('La temporada ya está cerrada. Iniciá una nueva para simular.'); return; }
    let s = JSON.parse(JSON.stringify(game));
    const strategy = quickStrategy;
    const startDay = s.day;
    let energy = s.energy;
    let extra = 0;

    while (s.day < 75) {
      s.day++;
      s.temp = Math.max(18, Math.min(31, s.temp + (Math.random() < .38 ? (Math.random() < .5 ? -1 : 1) : 0)));
      s.humidity = Math.max(35, Math.min(78, s.humidity + (Math.random() < .5 ? -3 : 3)));
      energy = Math.max(0, energy - 2);
      extra += strategy === 'intensive' ? 1600 : strategy === 'balanced' ? 650 : 250;
      s.plants.forEach(p => {
        if (!p.alive) return;
        p.age++;
        p.moisture = Math.max(0, p.moisture - 10 - Math.random() * 6);
        p.nutrition = Math.max(0, p.nutrition - 2.2);
        const waterAt = strategy === 'intensive' ? 48 : strategy === 'balanced' ? 32 : 20;
        const feedAt = strategy === 'intensive' ? 48 : strategy === 'balanced' ? 30 : 14;
        if (p.moisture < waterAt) { p.moisture = Math.min(88, p.moisture + 40); extra += 150; }
        if (p.nutrition < feedAt) { p.nutrition = Math.min(88, p.nutrition + 42); extra += 850; }
        let stress = 0;
        if (p.moisture < 16 || p.moisture > 93) stress += 6;
        if (p.nutrition < 10) stress += 4;
        if (s.temp > 29 || s.temp < 19) stress += 4;
        if (strategy === 'minimal') stress += 1;
        p.health = Math.max(0, Math.min(100, p.health + (stress ? -stress : 1)));
        if (p.health <= 0) p.alive = false;
      });
      if (energy < 10) energy = 80;
      if ((s.temp > 27 || s.humidity > 69) && strategy !== 'minimal' && energy > 0 && Math.random() < .55) {
        s.temp -= 2; s.humidity -= 5; energy--; extra += 120;
      }
    }

    let grams = 0, alive = 0;
    s.plants.forEach(p => {
      if (!p.alive) return;
      alive++;
      const q = Math.max(.4, Math.min(1.1, p.health / 88));
      grams += Math.round(55 * q * (1 + Math.min(.06, (p.age - 67) * .002)));
    });

    s.energy = energy;
    s.harvested += alive; s.harvestYield += grams;
    s.finished = true;
    const remaining = (75 - startDay + 1) / 75;
    const premium = strategy === 'intensive' ? 0.18 : strategy === 'minimal' ? -0.16 : 0;
    s.spent = game.spent + Math.round(budget().total * remaining * (1 + premium));
    s.logs.unshift({ day: 75, text: `<b>Simulación veloz · ${strategy === 'balanced' ? 'equilibrada' : strategy === 'minimal' ? 'mínima' : 'intensiva'}.</b> ${grams} g registrados.`, kind: 'success' });
    if (s.logs.length > 8) s.logs = s.logs.slice(0, 8);
    game = s;

    const yieldG = game.harvestYield;
    const perGram = game.spent / Math.max(1, yieldG);
    $('#resultTitle').textContent = strategy === 'balanced' ? 'Una temporada equilibrada.' : strategy === 'minimal' ? 'Ahorraste, pero se notó.' : 'Control máximo, costo máximo.';
    $('#resultYield').textContent = fmt(grams) + ' g';
    $('#resultCost').textContent = '$' + fmt(game.spent);
    $('#resultPerGram').textContent = '$' + fmt(perGram);
    $('#resultHealthy').textContent = healthyCount() + ' / 9';
    $('#resultCopy').textContent = `Recorriste ${75 - startDay + 1} días en un instante. La simulación aplicó una rutina ${strategy === 'balanced' ? 'constante y reactiva' : strategy === 'minimal' ? 'de bajo insumo' : 'intensiva'} y resolvió los eventos del ciclo.`;
    const lessons = [];
    if (strategy === 'balanced') lessons.push('La rutina constante superó a las correcciones tardías: regar por necesidad evitó picos de estrés.');
    if (strategy === 'minimal') lessons.push('Ahorrar insumos redujo el costo operativo, pero el estrés hídrico y nutricional recortó el rendimiento.');
    if (strategy === 'intensive') lessons.push('Intervenir de más agregó costo y no garantizó mejor calidad: el rendimiento tiene un techo biológico.');
    lessons.push(healthyCount() >= 7 ? `Mantuviste ${healthyCount()} plantas saludables: cumpliste el objetivo de temporada.` : `Solo ${healthyCount()} plantas cerraron saludables. La próxima temporada, priorizá las alertas de humedad.`);
    lessons.push(`Costo por gramo simulado: $${fmt(perGram)} frente a un precio de referencia de $${fmt(app.budget.price)}/g.`);
    if (yieldG > 0) lessons.push(`Valor de referencia de la cosecha: $${fmt(yieldG * app.budget.price)}. En autocultivo no equivale a una autorización de venta.`);
    $('#resultLessons').innerHTML = lessons.map(x => `<div>${x}</div>`).join('');
    archiveSeason();
    $('#quickModal').classList.remove('open');
    $('#resultModal').classList.add('open');
    persist(); renderSim(); renderPanel(); renderNav();
  }
  /* ---------- toast ---------- */
  let toastTimer;
  function showToast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------- strain explorer ---------- */
  function difficultyClass(level) {
    return level === 'Fácil' ? 'easy' : level === 'Alta' ? 'hard' : 'mid';
  }

  function difficultyDots(level) {
    const n = level === 'Fácil' ? 1 : level === 'Alta' ? 3 : 2;
    return `<span class="difficulty-dots ${difficultyClass(level)}">${[1, 2, 3].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
  }

  function strainCardHTML(st) {
    return `<article class="strain-card" data-strain="${st.id}" tabindex="0" role="button" aria-label="Ver ficha de ${esc(st.name)}">
      <div class="strain-card-media">
        <img src="${st.image}" alt="${esc(st.name)}" loading="lazy" />
        <div class="strain-card-badges"><span class="strain-badge thc">${st.thc}% THC</span><span class="strain-badge">${esc(st.difficulty)}</span></div>
        <div class="strain-card-name"><b>${esc(st.name)}</b><small>${esc(st.type)} · ${st.flower} días</small></div>
      </div>
      <div class="strain-card-body">
        <div class="strain-effects">${st.effects.slice(0, 3).map(e => `<span>${esc(e)}</span>`).join('')}</div>
        <div class="strain-card-foot"><span>${st.yield} g/m² · ${esc(st.height.split('–')[0])}+</span>${difficultyDots(st.difficulty)}</div>
      </div>
    </article>`;
  }

  function bindStrainCards(scope = document) {
    $$('[data-strain]', typeof scope === 'string' ? $(scope) : scope).forEach(el => {
      if (el.dataset.bound) return;
      el.dataset.bound = '1';
      const open = () => openStrainSheet(el.dataset.strain);
      el.addEventListener('click', open);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
  }

  function filterStrains() {
    const q = norm($('#strainSearch')?.value || '');
    const diff = $('#strainDifficulty')?.value || 'all';
    const effect = $('#strainEffect')?.value || 'all';
    const sort = $('#strainSort')?.value || 'thc';
    let list = window.STRAINS.filter(st => {
      const hay = norm([st.name, st.summary, st.flavor, st.tags.join(' '), st.effects.join(' '), st.terpenes.map(t => t.n).join(' ')].join(' '));
      return (!q || hay.includes(q)) && (diff === 'all' || st.difficulty === diff) && (effect === 'all' || st.effects.includes(effect));
    });
    if (sort === 'thc') list.sort((a, b) => b.thc - a.thc);
    if (sort === 'fast') list.sort((a, b) => a.flower - b.flower);
    if (sort === 'yield') list.sort((a, b) => b.yield - a.yield);
    if (sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    $('#strainCount').textContent = `${list.length} ${list.length === 1 ? 'cepa' : 'cepas'}`;
    $('#strainGrid').innerHTML = list.map(strainCardHTML).join('') || `<div class="lib-empty" style="grid-column:1/-1"><b>Sin cepas para ese filtro.</b><p>Probá con otro efecto, dificultad o término de búsqueda.</p></div>`;
    bindStrainCards('#strainGrid');
  }

  function renderStrains() {
    renderNav();
    const st = window.STRAINS[0];
    $('#strainFeatured').innerHTML = `<img src="${st.image}" alt="${esc(st.name)}" />
      <div class="strain-featured-copy">
        <div class="strain-featured-tags"><span>DESTACADA</span><span class="ghost">${esc(st.type)}</span><span class="ghost">${esc(st.difficulty)}</span></div>
        <h2>${esc(st.name.replace(' Auto', ''))} <em>Auto.</em></h2>
        <p>${esc(st.summary)}</p>
        <div class="strain-featured-stats">
          <span><b>${st.thc}%</b>THC</span><span><b>${st.cbd}%</b>CBD</span><span><b>${st.flower}</b>días de floración</span><span><b>${st.yield} g</b>por planta</span>
        </div>
        <div class="strain-featured-actions"><button class="btn btn-lime" data-strain-open="${st.id}">Ver ficha completa</button><button class="btn btn-glass" data-ask="¿Qué cuidados necesita una autofloreciente ${esc(st.name)}?">Preguntar al oráculo <span>◈</span></button></div>
      </div>`;

    const effects = [...new Set(window.STRAINS.flatMap(x => x.effects))].sort((a, b) => a.localeCompare(b, 'es'));
    const sel = $('#strainEffect');
    if (sel && sel.options.length <= 1) sel.innerHTML = '<option value="all">Todo efecto</option>' + effects.map(e => `<option>${esc(e)}</option>`).join('');
    filterStrains();

    const featuredBtn = $('#strainFeatured [data-strain-open]');
    if (featuredBtn) featuredBtn.addEventListener('click', () => openStrainSheet(featuredBtn.dataset.strainOpen));
  }

  function bindStrains() {
    ['strainSearch', 'strainDifficulty', 'strainEffect', 'strainSort'].forEach(id => {
      const el = $('#' + id);
      if (!el) return;
      el.addEventListener(id === 'strainSearch' ? 'input' : 'change', filterStrains);
    });
  }

  function openStrainSheet(id) {
    const st = window.STRAINS.find(x => x.id === id);
    if (!st) return;
    app.selectedStrain = id;
    $('#strainSheet').innerHTML = `
      <div class="strain-sheet-hero"><img src="${st.image}" alt="${esc(st.name)}" /><button class="strain-sheet-close" data-close-sheet aria-label="Cerrar">×</button>
        <div class="strain-sheet-title"><div><h2>${esc(st.name)}</h2><small>${esc(st.type)} · ${esc(st.lineage)}</small></div><div class="strain-sheet-thc"><b>${st.thc}%</b><span>THC · ${st.cbd}% CBD</span></div></div>
      </div>
      <div class="strain-sheet-body">
        <div>
          <p>${esc(st.summary)}</p>
          <h4>Perfil de cultivo</h4>
          <div class="strain-metrics">
            <div class="strain-metric"><span>DIFICULTAD</span><b>${esc(st.difficulty)}</b></div>
            <div class="strain-metric"><span>FLORACIÓN</span><b>${st.flower} días</b></div>
            <div class="strain-metric"><span>RENDIMIENTO</span><b>${st.yield} g/planta</b></div>
            <div class="strain-metric"><span>ALTURA</span><b>${esc(st.height)}</b></div>
          </div>
          <h4>Terpenos dominantes</h4>
          <div class="terpene-list">${st.terpenes.map(t => `<div class="terpene-row"><span>${esc(t.n)}</span><i><b style="width:${Math.min(100, t.v * 2)}%"></b></i><em>${t.v}%</em></div>`).join('')}</div>
          <h4>Efectos</h4>
          <div class="strain-sheet-effects">${st.effects.map(e => `<span>${esc(e)}</span>`).join('')}</div>
        </div>
        <div class="strain-sheet-side">
          <div class="side-block"><b>Aroma y sabor</b><p>${esc(st.flavor)}</p></div>
          <div class="side-block"><b>Nota de cultivo</b><p>${esc(st.growNote)}</p></div>
          <div class="side-block"><b>Etiquetas</b><p>${st.tags.map(esc).join(' · ')}</p></div>
          <div class="strain-sheet-actions"><button class="btn btn-lime" data-ask="¿Qué cuidados necesita una autofloreciente ${esc(st.name)}?">Consultar al oráculo <span>◈</span></button><button class="btn btn-ghost" data-close-sheet>Cerrar</button></div>
          <p style="font-size:7.5px;line-height:1.55;color:#6d7561;margin:10px 0 0">Ficha educativa de referencia. Los valores reales dependen de la genética del banco, el ambiente y el manejo.</p>
        </div>
      </div>`;
    $('#strainModal').classList.add('open');
    $$('#strainSheet [data-close-sheet]').forEach(b => b.addEventListener('click', () => $('#strainModal').classList.remove('open')));
    $$('#strainSheet [data-ask]').forEach(b => b.addEventListener('click', () => {
      $('#strainModal').classList.remove('open');
      navigate('oracle', { question: b.dataset.ask });
    }));
  }

  /* ---------- journal ---------- */
  function journalWeeks() {
    const titles = ['La siembra', 'Raíces', 'Estructura', 'Ritmo', 'Estiramiento', 'Floración temprana', 'Engorde', 'Densidad', 'Maduración', 'El corte', 'Curado'];
    const notes = [
      'Nueve semillas, un sustrato y una regla simple: observar antes de intervenir. La primera semana define el ritmo de toda la temporada.',
      'Las raíces exploran el volumen de la maceta. Menos agua y más paciencia: el exceso es el error más común en esta etapa.',
      'La estructura se abre. Empezaron los riegos por peso y conviene registrar cuánto tarda el sustrato en secarse.',
      'La rutina se estabiliza. Ajustá nutrición a media dosis y revisá que la luz llegue pareja a toda la canopia.',
      'El estiramiento puede duplicar la altura. Momento de tutorar, separar ramas y revisar la distancia a la luminaria.',
      'Las flores aparecen. Bajá la humedad, mantené el aire en movimiento y evitá mojar los cogollos al regar.',
      'Engorde visible. La demanda de agua sube y la nutrición pasa a P y K. La constancia vale más que las dosis grandes.',
      'Cogollos densos: la semana de mayor riesgo de botritis. Ventilá, revisá el interior de las flores y no improvises riegos.',
      'Los tricomas empiezan a cambiar. Reducí riego y nutrición, prepará el espacio de secado y definí el punto de corte.',
      'Cosecha por planta, rotulá cada lote y manicurá con calma. El secado lento protege el aroma y la uniformidad.',
      'Curado en frascos con aireación diaria. Cerrá la temporada con pesos reales, costo por gramo y aprendizajes.'
    ];
    const taskSets = [
      ['Registrar genética y fecha de siembra', 'Hidratar sustrato y verificar drenaje', 'Medir temperatura y humedad', 'Ajustar luz a 18/6'],
      ['Regar por peso de maceta', 'Revisar humedad en los bordes', 'Observar apertura de hojas', 'Ventilar sin corriente directa'],
      ['Iniciar nutrición vegetativa suave', 'Revisar envés y trampas', 'Registrar altura de cada planta', 'Ajustar distancia de luz'],
      ['Riego según demanda', 'Completar dosis de crecimiento', 'Aplicar LST suave si hace falta', 'Limpiar el espacio de cultivo'],
      ['Tutorar ramas laterales', 'Bajar humedad hacia 60%', 'Revisar soportes y altura', 'Registrar el estiramiento'],
      ['Cambiar a fórmula de floración', 'Defoliar solo lo necesario', 'Revisar botritis de forma temprana', 'Ajustar VPD al nuevo ciclo'],
      ['Subir P y K de forma gradual', 'Controlar humedad bajo 60%', 'Revisar densidad de cogollos', 'Registrar consumo de agua'],
      ['Ventilar el interior de la canopia', 'Inspeccionar moho y botritis', 'Evitar mojar las flores', 'Revisar filtración de aire'],
      ['Observar tricomas con lupa', 'Reducir riego y nutrición', 'Preparar espacio de secado', 'Rotular frascos y lotes'],
      ['Cortar y manicurar por planta', 'Pesar en fresco y registrar', 'Secar a 18–20 °C y 55–60% HR', 'Limpiar y guardar equipos'],
      ['Airear frascos a diario', 'Medir humedad del frasco', 'Registrar peso seco final', 'Calcular costo por gramo']
    ];
    return Array.from({ length: 11 }, (_, i) => {
      const n = i + 1;
      const from = i * 7 + 1;
      const to = Math.min(75, n * 7);
      const mid = Math.round((from + to) / 2);
      const phase = window.PHASES.find(p => mid >= p.from && mid <= p.to) || window.PHASES[window.PHASES.length - 1];
      const temp = +(23.4 + Math.sin(n / 1.8) * 1.8 - (n > 5 ? .6 : 0)).toFixed(1);
      const hum = Math.round(64 - n * 2 + (n % 3));
      return { n, from, to, title: titles[i], note: notes[i], phase, temp, hum, tasks: taskSets[i] };
    });
  }

  function currentWeek() { return Math.min(11, Math.max(1, Math.ceil(game.day / 7))); }

  function archiveSeason() {
    if (game.archived || (!game.finished && game.harvested === 0)) return;
    const harvest = game.harvestYield || 0;
    app.grows.unshift({
      id: Date.now(),
      label: `Temporada ${app.grows.length + 1} · ${game.harvested || 0} cosechas`,
      day: game.day,
      yield: harvest,
      harvested: game.harvested || 0,
      cost: game.spent,
      perGram: game.spent / Math.max(1, harvest),
      healthy: healthyCount()
    });
    app.grows = app.grows.slice(0, 12);
    game.archived = true;
    persist();
  }

  function renderSeasonHistory() {
    const grows = app.grows || [];
    $('#seasonCount').textContent = grows.length;
    $('#seasonHistoryList').innerHTML = grows.length
      ? grows.slice(0, 4).map(g => `<div class="season-history-row"><div><b>${esc(g.label)}</b><small>Día ${g.day} · ${g.healthy}/9 sanas</small></div><span>${fmt(g.yield)} g<i>$${fmt(g.perGram)}/g</i></span></div>`).join('')
      : '<p class="season-history-empty">Cerrá una temporada para conservar su rendimiento, costo y aprendizaje. El archivo guarda hasta 12 cultivos.</p>';
  }

  function envSeries(week) {
    const seed = week * 17;
    const tempBase = 23.2 + Math.sin(week / 1.7) * 1.9 - (week > 5 ? .7 : 0);
    const humBase = 64 - week * 1.9 + (week > 8 ? 1.2 : 0);
    return Array.from({ length: 7 }, (_, i) => {
      const wave = Math.sin((seed + i * 3.1)) * 0.9;
      const temp = +(tempBase + wave + (i % 2 ? .4 : -.2)).toFixed(1);
      const hum = Math.round(humBase - wave * 1.2 + (i % 3 ? 1 : -1));
      const svp = 0.6108 * Math.exp(17.27 * temp / (temp + 237.3));
      return { d: i + 1, temp, hum, vpd: +(svp * (1 - hum / 100)).toFixed(2) };
    });
  }

  function envChartSVG(week) {
    const data = envSeries(week);
    const W = 620, H = 170, x0 = 30, x1 = 602, y0 = 12, y1 = 138;
    const x = i => x0 + (x1 - x0) * i / 6;
    const yT = v => y1 - (v - 16) / 16 * (y1 - y0);
    const yH = v => y1 - (v - 28) / 52 * (y1 - y0);
    const yV = v => y1 - (Math.max(.3, Math.min(2.2, v)) - .3) / 1.9 * (y1 - y0);
    const line = (key, fn) => data.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${fn(p[key]).toFixed(1)}`).join(' ');
    const grid = [0, 1, 2, 3, 4].map(i => {
      const yy = y0 + (y1 - y0) * i / 4;
      const val = (16 + (4 - i) * 4);
      return `<line x1="${x0}" y1="${yy}" x2="${x1}" y2="${yy}"/><text class="chart-axis" x="${x0 - 6}" y="${yy + 2.5}" text-anchor="end">${val}°</text>`;
    }).join('');
    const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => `<text class="chart-axis" x="${x(i)}" y="${H - 5}" text-anchor="middle">${d}</text>`).join('');
    const dots = data.map((p, i) => `<circle class="chart-dot" cx="${x(i)}" cy="${yT(p.temp)}" r="2.4" fill="#e8b56a"/>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Temperatura, humedad y VPD de la semana ${week}">
      <defs><linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8b56a" stop-opacity=".26"/><stop offset="1" stop-color="#e8b56a" stop-opacity="0"/></linearGradient></defs>
      <g class="chart-grid">${grid}</g>
      <path class="chart-area-temp" d="${line('temp', yT)} L${x(6)},${y1} L${x0},${y1} Z"/>
      <path class="chart-line temp" d="${line('temp', yT)}"/>
      <path class="chart-line hum" d="${line('hum', yH)}"/>
      <path class="chart-line vpd" d="${line('vpd', yV)}"/>
      ${dots}${labels}
    </svg>`;
  }

  function renderJournal() {
    renderNav();
    const week = app.journalWeek || currentWeek();
    app.journalWeek = week;
    const w = journalWeeks()[week - 1];
    const data = envSeries(week);
    $('#journalHeroTitle').textContent = `Semana ${w.n} · ${w.phase.name}`;
    $('#journalHeroCopy').textContent = w.note;
    $('#journalHeroDay').textContent = `Día ${w.from}–${w.to}`;
    $('#journalHeroTemp').textContent = `${w.temp} °C`;
    $('#journalHeroHum').textContent = `${w.hum}%`;
    $('#journalHeroWeek').textContent = `S${w.n}`;
    $('#journalTimeline').innerHTML = journalWeeks().map(x => {
      const cls = x.n === week ? 'active' : x.n < currentWeek() ? 'done' : '';
      return `<button class="week-tab ${cls}" data-week="${x.n}" role="tab" aria-selected="${x.n === week}"><b>SEMANA ${String(x.n).padStart(2, '0')}</b><span>${esc(x.title)}</span></button>`;
    }).join('');
    $$('#journalTimeline [data-week]').forEach(el => el.addEventListener('click', () => { app.journalWeek = Number(el.dataset.week); renderJournal(); persist(); }));

    $('#weekKicker').textContent = `SEMANA ${String(w.n).padStart(2, '0')} · DÍAS ${w.from}–${w.to}`;
    $('#weekTitle').textContent = w.title;
    $('#weekPhase').textContent = w.phase.name.toUpperCase();
    $('#weekNote').textContent = w.note;
    $('#envChart').innerHTML = envChartSVG(week);
    const avg = (key) => (data.reduce((n, p) => n + p[key], 0) / data.length);
    $('#envReadings').innerHTML = `
      <div class="env-reading"><span>TEMPERATURA MEDIA</span><b>${avg('temp').toFixed(1)}<small>°C</small></b></div>
      <div class="env-reading"><span>HUMEDAD MEDIA</span><b>${Math.round(avg('hum'))}<small>%</small></b></div>
      <div class="env-reading"><span>VPD MEDIO</span><b>${avg('vpd').toFixed(2)}<small>kPa</small></b></div>`;

    const events = [
      `<b>Semana ${w.n}:</b> ${w.phase.goal.toLowerCase()}.`,
      `<b>Prioridad:</b> ${w.phase.focus[0]}`,
      w.n === currentWeek() ? `<b>En curso:</b> día ${game.day} de 75 · ${healthyCount()} plantas saludables.` : `<b>Registro:</b> semana ${w.n < currentWeek() ? 'completada' : 'planificada'}.`
    ];
    if (w.n === 8) events.push('<b>Alerta:</b> máxima densidad de cogollos. Revisá botritis en el interior de las flores.');
    if (w.n === 10) events.push('<b>Ventana de corte:</b> revisá tricomas antes de decidir.');
    $('#weekEvents').innerHTML = events.map((e, i) => `<div class="week-event ${i === 3 ? 'warn' : ''}"><span>◆</span><span>${e}</span></div>`).join('');

    const projected = app.budget.plants * app.budget.yield;
    const actual = game.harvestYield;
    const gramsLabel = game.harvested ? actual : projected;
    const costPerGram = game.harvested ? game.spent / Math.max(1, actual) : budget().perGram;
    $('#harvestCard').innerHTML = `
      <span class="section-kicker">${game.harvested ? 'COSECHA REGISTRADA' : 'PROYECCIÓN DE COSECHA'}</span>
      <h3>${game.harvested ? 'Lo que salió del cultivo' : 'Lo que puede rendir'}</h3>
      <div class="harvest-big">${fmt(gramsLabel)}<small>g</small></div>
      <p class="harvest-sub">${game.harvested ? `${game.harvested} de 9 plantas cosechadas` : `${app.budget.plants} plantas × ${app.budget.yield} g estimados`}</p>
      <div class="harvest-rows">
        <div class="harvest-row"><span>Plantas activas</span><b>${activeCount()} / 9</b></div>
        <div class="harvest-row"><span>Costo acumulado</span><b>$${fmt(game.spent)}</b></div>
        <div class="harvest-row"><span>Costo por gramo</span><b>$${fmt(costPerGram)}</b></div>
        <div class="harvest-row"><span>Valor de referencia</span><b>$${fmt(gramsLabel * app.budget.price)}</b></div>
      </div>`;

    const done = w.tasks.filter((_, i) => app.journalTasks[`${w.n}-${i}`]).length;
    $('#weekTaskCount').textContent = `${done}/${w.tasks.length}`;
    $('#weekTasks').innerHTML = w.tasks.map((t, i) => {
      const isDone = !!app.journalTasks[`${w.n}-${i}`];
      return `<div class="week-task ${isDone ? 'done' : ''}" data-jtask="${w.n}-${i}" role="checkbox" aria-checked="${isDone}" tabindex="0"><span class="chk"></span><span>${esc(t)}</span><span class="task-day">D${w.from + ((i * 2) % 7)}</span></div>`;
    }).join('');
    $$('#weekTasks [data-jtask]').forEach(el => {
      const toggle = () => {
        const key = el.dataset.jtask;
        app.journalTasks[key] = !app.journalTasks[key];
        persist(); renderJournal();
      };
      el.addEventListener('click', toggle);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });

    $('#photoStrip').innerHTML = `<span class="section-kicker">REGISTRO VISUAL</span><div class="photo-grid"><img src="assets/greenhouse.jpg" alt="Vista del invernadero" loading="lazy" /><img src="assets/bud-macro.jpg" alt="Detalle de cogollo" loading="lazy" /><img src="assets/leaf-texture.jpg" alt="Textura de hojas" loading="lazy" /></div>`;
    renderSeasonHistory();
  }

  function exportJournal() {
    const weeks = journalWeeks();
    let text = '# Verde — Diario de cultivo\n\n';
    text += `Temporada 2026 · 9 autoflorecientes · 15 m² · día ${game.day} de 75\n\n`;
    weeks.forEach(w => {
      const done = w.tasks.filter((_, i) => app.journalTasks[`${w.n}-${i}`]).length;
      text += `## Semana ${w.n} · ${w.title} (días ${w.from}–${w.to})\n`;
      text += `${w.note}\n\n`;
      text += `Ambiente: ${w.temp} °C · ${w.hum}% HR\n`;
      text += `Tareas: ${done}/${w.tasks.length}\n`;
      w.tasks.forEach((t, i) => { text += `- [${app.journalTasks[`${w.n}-${i}`] ? 'x' : ' '}] ${t}\n`; });
      text += '\n';
    });
    text += `## Resultado\n- Plantas activas: ${activeCount()}/9\n- Cosechas: ${game.harvested}\n- Peso registrado: ${fmt(game.harvestYield)} g\n- Gasto acumulado: $${fmt(game.spent)}\n`;
    downloadText('verde-diario.md', text);
    showToast('Diario exportado en Markdown.');
  }

  /* ---------- library ---------- */
  let libFiltersReady = false;

  function libStateLabel(state) {
    return state === 'markdown' ? 'MARKDOWN' : state === 'procesado' ? 'PROCESADO' : 'PENDIENTE';
  }

  function renderLibrary(resourceId) {
    renderNav();
    const q = norm($('#libSearch')?.value || '');
    const diploma = $('#libDiploma')?.value || 'all';
    const state = $('#libState')?.value || 'all';
    const sort = $('#libSort')?.value || 'recent';
    if (!libFiltersReady) {
      const diplomas = [...new Set([...window.DIPLOMAS.map(d => d.name), ...app.userResources.map(r => r.diploma)])];
      $('#libDiploma').innerHTML = '<option value="all">Todas las diplomaturas</option>' + diplomas.map(d => `<option>${esc(d)}</option>`).join('');
      libFiltersReady = true;
    }
    let list = allResources().filter(r => {
      const hay = norm([r.title, r.summary, r.diploma, r.module, r.path, (r.tags || []).join(' ')].join(' '));
      return (!q || hay.includes(q)) && (diploma === 'all' || r.diploma === diploma) && (state === 'all' || r.state === state) && (!app.dupOnly || r.dup);
    });
    if (sort === 'recent') list.sort((a, b) => b.id - a.id);
    if (sort === 'diploma') list.sort((a, b) => a.diploma.localeCompare(b.diploma, 'es') || a.title.localeCompare(b.title, 'es'));
    if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title, 'es'));
    if (sort === 'pages') list.sort((a, b) => b.pages - a.pages);

    const all = allResources();
    const dupGroups = new Set(all.filter(r => r.dup).map(r => r.dup));
    const markdown = all.filter(r => r.state === 'markdown').length;
    $('#libTotal').textContent = all.length;
    $('#libProcessed').textContent = markdown;
    $('#libDuplicates').textContent = dupGroups.size;
    $('#libVerified').textContent = all.length;
    $('#libVerifiedTotal').textContent = all.length;
    $('#libResultCount').textContent = `${list.length} ${list.length === 1 ? 'recurso' : 'recursos'}`;
    $('#libEmpty').hidden = list.length > 0;
    $('#dupToggle').classList.toggle('active', app.dupOnly);
    $('#dupBannerText').textContent = `${all.filter(r => r.dup).length} recursos aparecen en más de una diplomatura. Verde los vincula sin borrar el original: sabés de dónde viene cada versión y dónde está guardada.`;

    $('#libList').innerHTML = list.map(r => `<div class="lib-row ${app.selectedResource === r.id ? 'selected' : ''}" data-resource="${r.id}" tabindex="0" role="button">
      <span class="lib-pdf">PDF</span>
      <div class="lib-row-main">
        <div class="lib-title-line"><span class="lib-title">${esc(r.title)}</span>${r.dup ? '<span class="dup-mini">DUPLICADO</span>' : ''}</div>
        <div class="lib-meta"><b>${esc(r.diploma)}</b> · ${esc(r.module)} · ${r.year}</div>
        <div class="lib-path">${esc(r.path)}</div>
      </div>
      <div class="lib-row-side"><span class="state-badge state-${r.state}">${libStateLabel(r.state)}</span><span class="lib-pages">${r.pages} pp.</span></div>
    </div>`).join('');
    $$('#libList .lib-row').forEach(el => {
      const open = () => {
        app.selectedResource = Number(el.dataset.resource);
        $$('#libList .lib-row').forEach(x => x.classList.toggle('selected', x === el));
        renderResourceDetail();
        if (window.innerWidth <= 960) {
          $('#resourceDetail').classList.add('mobile-open');
          document.body.classList.add('detail-open');
        }
        persist();
      };
      el.addEventListener('click', open);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });

    if (resourceId) app.selectedResource = Number(resourceId);
    if (app.selectedResource && !all.some(r => r.id === app.selectedResource)) app.selectedResource = null;
    if (!app.selectedResource && list.length && window.innerWidth > 960) app.selectedResource = list[0].id;
    renderResourceDetail();
  }

  function renderResourceDetail() {
    const r = allResources().find(x => x.id === app.selectedResource);
    const box = $('#resourceDetail');
    if (!r) {
      box.innerHTML = `<div class="rd-empty"><span>▦</span><b>Elegí un recurso</b><p>Seleccioná un PDF del índice para ver su origen, ruta y metadatos.</p></div>`;
      return;
    }
    const dups = r.dup ? allResources().filter(x => x.dup === r.dup && x.id !== r.id) : [];
    box.innerHTML = `
      <div class="rd-top"><span class="rd-icon">PDF</span><span class="rd-badge">${libStateLabel(r.state)}</span></div>
      <h2>${esc(r.title)}</h2>
      <div class="rd-origin"><b>${esc(r.diploma)}</b><br>${esc(r.module)} · ${r.year}</div>
      <p class="rd-summary">${esc(r.summary)}</p>
      <div class="rd-facts">
        <div class="rd-fact"><span>ID</span><b>#${String(r.id).padStart(3, '0')}</b></div>
        <div class="rd-fact"><span>PÁGINAS</span><b>${r.pages}</b></div>
        <div class="rd-fact"><span>ACTUALIZADO</span><b>${esc(r.updated)}</b></div>
        <div class="rd-fact"><span>CÓDIGO</span><b>${esc(r.code || '—')}</b></div>
      </div>
      <div class="rd-path"><b>UBICACIÓN FÍSICA</b>${esc(r.path)}</div>
      <div class="rd-tags">${(r.tags || []).map(t => `<span>${esc(t)}</span>`).join('')}</div>
      ${dups.length ? `<div class="rd-dup"><b>También aparece en ${dups.length} ubicación${dups.length > 1 ? 'es' : ''}</b><p>${dups.map(d => `${esc(d.diploma)} · ${esc(d.path)}`).join('<br>')}</p></div>` : ''}
      <button class="rd-close" id="closeResourceDetail" aria-label="Cerrar detalle">×</button>
      <div class="rd-actions">
        <button class="btn btn-lime" data-ask="¿Qué dice ${esc(r.title)}?">Preguntar <span>◈</span></button>
        <button class="btn btn-ghost" id="copyPathBtn">Copiar ruta</button>
      </div>
      <p style="font-size:7px;line-height:1.6;color:#6d7561;margin:11px 0 0">Origen verificado. El recurso original no se borra ni se sobrescribe al vincular duplicados.</p>`;
    box.querySelector('[data-ask]')?.addEventListener('click', (e) => navigate('oracle', { question: e.currentTarget.dataset.ask }));
    box.querySelector('#copyPathBtn')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(r.path).then(() => showToast('Ruta copiada.')).catch(() => showToast('No se pudo copiar la ruta.'));
    });
    box.querySelector('#closeResourceDetail')?.addEventListener('click', () => {
      box.classList.remove('mobile-open');
      document.body.classList.remove('detail-open');
    });
  }

  function bindLibrary() {
    ['libSearch', 'libDiploma', 'libState', 'libSort'].forEach(id => {
      const el = $('#' + id);
      if (!el) return;
      el.addEventListener(id === 'libSearch' ? 'input' : 'change', () => { app.selectedResource = null; renderLibrary(); persist(); });
    });
    $('#dupToggle')?.addEventListener('click', () => { app.dupOnly = !app.dupOnly; renderLibrary(); persist(); });
    $('#showDupBtn')?.addEventListener('click', () => { app.dupOnly = true; renderLibrary(); persist(); $('#libList').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    $('#clearFilters')?.addEventListener('click', () => {
      if ($('#libSearch')) $('#libSearch').value = '';
      if ($('#libDiploma')) $('#libDiploma').value = 'all';
      if ($('#libState')) $('#libState').value = 'all';
      app.dupOnly = false; app.selectedResource = null; renderLibrary(); persist();
    });
    $('#exportIdxBtn')?.addEventListener('click', () => {
      const rows = allResources().map(r => `- [${r.state}] ${r.title} — ${r.diploma} · ${r.module} · ${r.pages} pp.\n  ${r.path}`).join('\n');
      downloadText('verde-indice-biblioteca.md', `# Verde — Índice de biblioteca\n\n${allResources().length} recursos · 6 diplomaturas\n\n${rows}\n`);
      showToast('Índice exportado en Markdown.');
    });
    $('#addResourceBtn')?.addEventListener('click', () => $('#addModal').classList.add('open'));
    $('#fileInput')?.addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      if (f) { $('#dropTitle').textContent = f.name; $('#dropSub').textContent = `${(f.size / 1024 / 1024).toFixed(1)} MB · listo para indexar`; }
    });
    $('#addForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const file = $('#fileInput')?.files?.[0];
      const diploma = $('#addDiploma')?.value || 'Cultivo Interior';
      const module = $('#addModule')?.value.trim() || 'Módulo sin especificar';
      const rawPath = $('#addPath')?.value.trim() || `99_Aportes/${file?.name || 'nuevo_recurso.pdf'}`;
      const title = (file?.name || 'Recurso sin título').replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ');
      const cleanTitle = norm(title);
      const existing = allResources().find(r => {
        const other = norm(r.title);
        return other === cleanTitle || (cleanTitle.length > 4 && other.includes(cleanTitle)) || (other.length > 4 && cleanTitle.includes(other));
      });
      const resource = {
        id: Math.max(...allResources().map(r => r.id), 0) + 1,
        title: title.charAt(0).toUpperCase() + title.slice(1),
        diploma, code: 'AP', module, year: 2026, pages: 1, state: 'pendiente',
        tags: ['aporte', diploma.toLowerCase()], path: rawPath,
        dup: existing ? (existing.dup || 'manual') : null, updated: '6 nov 2026',
        summary: 'Recurso aportado por el usuario. Pendiente de procesamiento a Markdown para búsqueda semántica.'
      };
      app.userResources.push(resource);
      app.selectedResource = resource.id;
      persist();
      $('#addModal').classList.remove('open');
      $('#addForm').reset();
      $('#dropTitle').textContent = 'Arrastrá un PDF o hacé clic';
      $('#dropSub').textContent = 'Máx. 40 MB · se indexa localmente';
      libFiltersReady = false;
      renderLibrary();
      showToast(existing ? 'Aportado y vinculado a un duplicado existente.' : 'Recurso añadido al índice.');
    });
  }

  /* ---------- oracle ---------- */
  let oraclePending = false;

  function oracleWelcome() {
    return 'Hola. Soy el <b>Oráculo Verde</b>: busco en tus diplomaturas y te devuelvo la respuesta con la fuente exacta. Podés preguntarme por riego, nutrición, ambiente, cosecha, costos o marco legal.';
  }

  function renderChat() {
    if (!app.chat.length) app.chat.push({ role: 'assistant', html: oracleWelcome() });
    const log = $('#chatLog');
    log.innerHTML = app.chat.map(m => `<div class="msg ${m.role === 'user' ? 'user' : 'assistant'}"><span class="msg-avatar">${m.role === 'user' ? 'MB' : '◈'}</span><div class="msg-body">${m.html}</div></div>`).join('');
    if (oraclePending) log.innerHTML += `<div class="msg assistant"><span class="msg-avatar">◈</span><div class="msg-body"><span class="typing"><i></i><i></i><i></i></span></div></div>`;
    log.scrollTop = log.scrollHeight;
    renderSources();
  }

  function renderSources() {
    const list = app.chatSources || [];
    $('#sourceCount').textContent = list.length ? `${list.length} fuentes` : '0';
    if (!list.length) {
      $('#sourceList').innerHTML = `<div class="sources-empty"><span>◈</span><p>Hacé una pregunta y acá vas a ver los recursos exactos que la sustentan.</p></div>`;
      return;
    }
    $('#sourceList').innerHTML = list.map(s => {
      const r = allResources().find(x => x.id === s.id);
      if (!r) return '';
      return `<div class="source-item" data-resource="${r.id}"><div class="source-title">${esc(r.title)}<span class="source-score">${s.score}</span></div><div class="source-meta">${esc(r.diploma)}<br>${esc(r.module)} · ${esc(r.path)}</div></div>`;
    }).join('');
    $$('#sourceList .source-item').forEach(el => el.addEventListener('click', () => navigate('library', { resourceId: Number(el.dataset.resource) })));
  }

  function scoreKnowledge(question) {
    const q = norm(question);
    let best = null, bestScore = 0;
    window.ORACLE_KB.forEach(entry => {
      let score = 0;
      entry.match.forEach(m => {
        const key = norm(m);
        if (q.includes(key)) score += key.length + 2;
      });
      entry.tags.forEach(t => { if (q.includes(norm(t))) score += 3; });
      if (score > bestScore) { bestScore = score; best = entry; }
    });
    return { entry: best, score: bestScore };
  }

  function libraryFallback(question) {
    const q = norm(question);
    return allResources()
      .map(r => {
        const hay = norm([r.title, r.summary, (r.tags || []).join(' '), r.diploma, r.module].join(' '));
        let score = 1;
        q.split(/\s+/).filter(w => w.length > 4).forEach(w => { if (hay.includes(w)) score += 2; });
        return { id: r.id, score, title: r.title };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }

  function askOracle(question) {
    const q = String(question || '').trim();
    if (!q) return;
    app.chat.push({ role: 'user', html: esc(q) });
    if (app.chat.length > 24) app.chat = app.chat.slice(-24);
    app.queries++;
    oraclePending = true;
    renderChat();
    persist();
    const input = $('#chatInput');
    if (input) input.value = '';
    setTimeout(() => {
      const { entry } = scoreKnowledge(q);
      let html, sources;
      if (entry) {
        const cited = entry.sources.map(id => {
          const r = allResources().find(x => x.id === id);
          return r ? `<span class="cite">${esc(r.diploma)} · ${String(r.id).padStart(3, '0')}</span>` : '';
        }).join(' ');
        html = `<p>${entry.answer}</p><p>${cited}</p>`;
        sources = entry.sources.map((id, i) => ({ id, score: 92 - i * 7 })).filter(s => allResources().some(r => r.id === s.id));
        if (norm(q).includes('legal')) html += '<div class="legal-callout">Información educativa. Verificá tu inscripción REPROCANN y la normativa provincial vigente antes de tomar decisiones.</div>';
      } else {
        const found = libraryFallback(q);
        if (found.length && found[0].score > 1) {
          html = `<p>No tengo una respuesta específica para esa formulación, pero encontré material relacionado en tu biblioteca. Los recursos más cercanos son <b>${found.slice(0, 3).map(f => esc(f.title)).join('</b>, <b>')}</b>. Probá preguntar por <b>riego, nutrición, ambiente, cosecha, costos o marco legal</b> para obtener una respuesta con fragmento.</p>`;
          sources = found.filter(f => f.score > 1);
        } else {
          html = '<p>No encontré coincidencias suficientes en la biblioteca indexada. Probá con una pregunta más concreta: <b>riego y pH</b>, <b>VPD en floración</b>, <b>secado y curado</b>, <b>costo por gramo</b> o <b>marco legal</b>.</p>';
          sources = allResources().slice(0, 3).map((r, i) => ({ id: r.id, score: 60 - i * 6 }));
        }
      }
      app.chat.push({ role: 'assistant', html });
      app.chatSources = sources;
      oraclePending = false;
      renderChat();
      persist();
    }, 420);
  }

  function bindOracle() {
    $('#chatForm')?.addEventListener('submit', (e) => { e.preventDefault(); askOracle($('#chatInput')?.value); });
    $$('#chatPrompts button').forEach(b => b.addEventListener('click', () => askOracle(b.textContent)));
    $('#clearChat')?.addEventListener('click', () => {
      app.chat = [{ role: 'assistant', html: oracleWelcome() }];
      app.chatSources = [];
      persist(); renderChat();
      showToast('Consulta reiniciada.');
    });
  }

  /* ---------- budget ---------- */
  function renderBudget() {
    renderNav();
    const b = app.budget;
    const c = budget();
    const setRange = (id, val) => { const el = $('#' + id); if (el) el.value = val; };
    setRange('bPlants', b.plants); setRange('bYield', b.yield); setRange('bPrice', b.price);
    const num = (id, val) => { const el = $('#' + id); if (el) el.value = val; };
    num('bKwh', b.kwh); num('bHours', b.hours); num('bDays', b.days); num('bWatts', b.watts);
    $('#bPlantsVal').textContent = b.plants;
    $('#bYieldVal').textContent = b.yield;
    $('#bPriceVal').textContent = fmt(b.price);
    renderBudgetResults();
  }

  function renderBudgetResults() {
    const b = app.budget, c = budget();
    $('#bTotal').textContent = fmt(c.total);
    $('#bPerPlant').textContent = '$' + fmt(c.perPlant);
    $('#bPerGram').textContent = '$' + fmt(c.perGram);
    $('#bValue').textContent = '$' + fmt(c.value);
    $('#bMargin').textContent = `${c.margin >= 0 ? '+' : ''}${Math.round(c.margin)}%`;
    $('#breakdownBars').innerHTML = c.items.map(item => {
      const pct = item.value / c.total * 100;
      return `<div class="bd-row"><span class="bd-name">${item.name}</span><span class="bd-track"><i style="width:${pct.toFixed(1)}%;background:${item.color}"></i></span><span class="bd-val">$${fmt(item.value)}</span></div>`;
    }).join('');
    const s9 = scaleScenario(9), s90 = scaleScenario(90), s900 = scaleScenario(900);
    $('#scale9').textContent = '$' + fmt(s9.cost);
    $('#scale9g').textContent = '$' + fmt(s9.perGram);
    $('#scale90').textContent = '$' + fmt(s90.cost);
    $('#scale90g').textContent = '$' + fmt(s90.perGram);
    $('#scale900').textContent = '$' + fmt(s900.cost);
    $('#scale900g').textContent = '$' + fmt(s900.perGram);
    $('#scaleSave').textContent = `−${Math.max(0, Math.round((1 - s900.perGram / Math.max(1, s9.perGram)) * 100))}%`;
    $('#processTease').textContent = fmt(c.total);
    $('#statBudget').textContent = fmt(c.total);
    $('#statPerGram').textContent = '$' + fmt(c.perGram) + ' / g';
    persist();
  }

  function bindBudget() {
    const ranges = [['bPlants', 'plants'], ['bYield', 'yield'], ['bPrice', 'price']];
    ranges.forEach(([id, key]) => {
      $('#' + id)?.addEventListener('input', (e) => {
        app.budget[key] = Number(e.target.value);
        if (key === 'plants') $('#bPlantsVal').textContent = app.budget.plants;
        if (key === 'yield') $('#bYieldVal').textContent = app.budget.yield;
        if (key === 'price') $('#bPriceVal').textContent = fmt(app.budget.price);
        renderBudgetResults();
      });
    });
    [['bKwh', 'kwh'], ['bHours', 'hours'], ['bDays', 'days'], ['bWatts', 'watts']].forEach(([id, key]) => {
      $('#' + id)?.addEventListener('input', (e) => {
        app.budget[key] = Math.max(0, Number(e.target.value) || 0);
        renderBudgetResults();
      });
    });
    $('#budgetReset')?.addEventListener('click', () => { app.budget = initialBudget(); renderBudget(); showToast('Escenario restablecido.'); });
    $('#saveBudgetBtn')?.addEventListener('click', () => {
      persist();
      showToast(`Escenario guardado · $${fmt(budget().total)} · $${fmt(budget().perGram)}/g.`);
    });
  }

  /* ---------- process ---------- */
  function renderProcess() {
    renderNav();
    const day = game.day;
    let totalTasks = 0, doneTasks = 0;
    $('#processTimeline').innerHTML = window.PHASES.map(phase => {
      const active = day >= phase.from && day <= phase.to;
      const done = day > phase.to;
      const phaseDone = phase.tasks.filter(t => app.tasks[t.id]).length;
      totalTasks += phase.tasks.length;
      doneTasks += phaseDone;
      return `<div class="phase-block ${active ? 'current' : done ? 'done' : ''}">
        <div class="phase-marker"><span>${done ? '✓' : phase.icon}</span></div>
        <div class="phase-content">
          <div class="phase-head"><div><div class="phase-title"><h3>${esc(phase.name)}</h3><span>DÍA ${phase.from}–${phase.to}</span></div><div class="phase-goal">${esc(phase.goal)} · ${phaseDone}/${phase.tasks.length} tareas</div></div><div class="phase-cost">$${fmt(phase.cost)}<small>COSTO ESTIMADO</small></div></div>
          <div class="phase-tasks">${phase.tasks.map(t => `<div class="task ${app.tasks[t.id] ? 'done' : ''}" data-task="${t.id}" role="checkbox" aria-checked="${!!app.tasks[t.id]}" tabindex="0"><span class="chk"></span><span>${esc(t.text)}</span></div>`).join('')}</div>
          <div class="phase-focus">${phase.focus.map(f => `<span>${esc(f)}</span>`).join('')}</div>
        </div>
      </div>`;
    }).join('');
    $('#taskProgressLabel').textContent = `${doneTasks} / ${totalTasks} tareas`;
    $('#taskProgressBar').style.width = `${totalTasks ? doneTasks / totalTasks * 100 : 0}%`;
    const c = budget();
    $('#processCost').textContent = '$' + fmt(c.total);
    $('#processTease').textContent = fmt(c.total);
    $('#legalChecks').innerHTML = window.LEGAL_CHECKS.map(l => `<div class="legal-check-row ${app.legal[l.id] ? 'done' : ''}" data-legal="${l.id}" role="checkbox" aria-checked="${!!app.legal[l.id]}" tabindex="0"><span class="chk"></span><div><b>${esc(l.text)}</b><small>${esc(l.detail)}</small></div></div>`).join('');

    $$('#processTimeline [data-task]').forEach(el => {
      const toggle = () => { app.tasks[el.dataset.task] = !app.tasks[el.dataset.task]; persist(); renderProcess(); };
      el.addEventListener('click', toggle);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });
    $$('#legalChecks [data-legal]').forEach(el => {
      const toggle = () => { app.legal[el.dataset.legal] = !app.legal[el.dataset.legal]; persist(); renderProcess(); };
      el.addEventListener('click', toggle);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });
  }

  /* ---------- modals / shop / global bindings ---------- */
  function closeModal(id) { $('#' + id)?.classList.remove('open'); }

  function bindGlobal() {
    $$('[data-nav]').forEach(el => {
      if (el.dataset.navBound) return;
      el.dataset.navBound = '1';
      el.addEventListener('click', (e) => { e.preventDefault(); navigate(el.dataset.nav); });
    });
    $$('[data-ask]').forEach(el => {
      if (el.dataset.askBound) return;
      el.dataset.askBound = '1';
      el.addEventListener('click', (e) => { e.preventDefault(); navigate('oracle', { question: el.dataset.ask }); });
    });
    $$('[data-close]').forEach(el => {
      if (el.dataset.closeBound) return;
      el.dataset.closeBound = '1';
      el.addEventListener('click', () => closeModal(el.dataset.close));
    });
    $$('.modal-backdrop').forEach(bd => {
      bd.addEventListener('click', (e) => { if (e.target === bd) bd.classList.remove('open'); });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        $$('.modal-backdrop.open').forEach(b => b.classList.remove('open'));
        $('#moreSheet')?.classList.remove('open');
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        navigate('strains');
        setTimeout(() => $('#strainSearch')?.focus(), 120);
      }
    });

    $('#advanceBtn')?.addEventListener('click', advance);
    $('#advanceBtn2')?.addEventListener('click', advance);
    $('#quickSimBtn')?.addEventListener('click', () => $('#quickModal').classList.add('open'));
    $('#resetSimBtn')?.addEventListener('click', () => {
      if (!window.confirm('¿Reiniciar la temporada desde el día 1?')) return;
      archiveSeason();
      game = initialGame(); persist(); renderPanel(); renderSim(); renderJournal(); showToast('Temporada reiniciada.');
    });
    $('#restartFromResult')?.addEventListener('click', () => {
      archiveSeason();
      game = initialGame(); persist();
      closeModal('resultModal');
      navigate('panel');
      showToast('Nueva temporada iniciada.');
    });
    $$('.action-card').forEach(btn => {
      if (btn.dataset.actionBound) return;
      btn.dataset.actionBound = '1';
      btn.addEventListener('click', () => action(btn.dataset.action));
    });
    $$('#strategyList [data-strategy]').forEach(btn => {
      btn.addEventListener('click', () => {
        quickStrategy = btn.dataset.strategy;
        $$('#strategyList [data-strategy]').forEach(x => x.classList.toggle('active', x === btn));
      });
    });
    $('#runQuickBtn')?.addEventListener('click', runQuickSim);
    $('#shopBtn')?.addEventListener('click', () => $('#shopModal').classList.add('open'));
    $$('#shopModal [data-buy]').forEach(btn => {
      btn.addEventListener('click', () => {
        const map = { water: [4000, () => { game.water = Math.min(20, game.water + 5); }], nutrient: [8000, () => { game.nutrients = Math.min(10, game.nutrients + 3); }], energy: [6000, () => { game.energy = Math.min(100, game.energy + 20); }] };
        const entry = map[btn.dataset.buy];
        if (!entry) return;
        if (game.cash < entry[0]) { showToast('Fondo insuficiente para esa compra.'); return; }
        game.cash -= entry[0]; game.spent += entry[0]; entry[1]();
        saveAndRefresh(); persist();
        showToast('Recursos repuestos.');
      });
    });
    $('#guideBtn')?.addEventListener('click', () => $('#guideModal').classList.add('open'));
    $('#soundBtn')?.addEventListener('click', () => {
      const on = $('#soundBtn').textContent === '◖';
      $('#soundBtn').textContent = on ? '◗' : '◖';
      $('#soundBtn').setAttribute('aria-label', on ? 'Desactivar sonido' : 'Activar sonido');
      showToast(on ? 'Sonido ambiente activado (demo).' : 'Sonido ambiente desactivado.');
    });
    $('#moreBtn')?.addEventListener('click', () => $('#moreSheet').classList.add('open'));
    $('#closeMore')?.addEventListener('click', () => $('#moreSheet').classList.remove('open'));
    $('#exportJournalBtn')?.addEventListener('click', exportJournal);
    $('#askStrainBtn')?.addEventListener('click', () => navigate('oracle', { question: '¿Qué autofloreciente conviene para empezar y qué cuidados necesita?' }));
  }

  /* ---------- init ---------- */
  function init() {
    if (game.finished) archiveSeason();
    bindGlobal();
    bindStrains();
    bindLibrary();
    bindOracle();
    bindBudget();
    const initialView = (location.hash || '').replace('#', '');
    const target = VIEWS[initialView] ? initialView : 'panel';
    renderNav();
    renderPanel();
    renderStrains();
    renderJournal();
    renderSim();
    renderLibrary();
    renderChat();
    renderBudget();
    renderProcess();
    navigate(target);
  }

  init();
})();
