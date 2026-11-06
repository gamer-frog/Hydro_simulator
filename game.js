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
    harvestYield: 0, spent: 0, finished: false,
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
    selectedResource: 3, queries: 0, chat: [], chatSources: [], dupOnly: false
  });

  let game, app;
  try {
    const saved = JSON.parse(localStorage.getItem('verde-app-v2') || 'null');
    game = saved && saved.game && Array.isArray(saved.game.plants) ? saved.game : initialGame();
    app = Object.assign(defaultApp(), saved ? saved.app : {});
    app.budget = Object.assign(initialBudget(), app.budget || {});
    app.userResources = Array.isArray(app.userResources) ? app.userResources : [];
  } catch { game = initialGame(); app = defaultApp(); }

  const persist = () => localStorage.setItem('verde-app-v2', JSON.stringify({ game, app }));

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
        { key: 'seeds', name: 'Semillas', value: seeds, color: '#3f6b4a' },
        { key: 'substrate', name: 'Sustrato', value: substrate, color: '#7f9b5e' },
        { key: 'nutrition', name: 'Nutrición', value: nutrition, color: '#b2bc70' },
        { key: 'energy', name: 'Energía', value: energy, color: '#d0ac65' },
        { key: 'equipment', name: 'Equipos', value: equipment, color: '#8e9d8d' },
        { key: 'water', name: 'Agua e insumos', value: water + misc, color: '#6f9590' },
        { key: 'management', name: 'Gestión', value: management, color: '#b3a58c' },
        { key: 'contingency', name: 'Contingencia', value: contingency, color: '#d8dfd2' }
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

  /* ---------- render: shared ---------- */
  const VIEWS = { panel: 'PANEL', sim: 'SIMULADOR', library: 'BIBLIOTECA', oracle: 'ORÁCULO IA', budget: 'PRESUPUESTO', process: 'PROCESO' };
  function navigate(view, opts = {}) {
    if (!VIEWS[view]) view = 'panel';
    app.view = view;
    $('#resourceDetail').classList.remove('mobile-open');
    $$('.view').forEach(v => v.classList.toggle('active', v.id === `view-${view}`));
    $$('.nav-item,.mobile-nav button').forEach(b => b.classList.toggle('active', b.dataset.nav === view));
    $('#crumbCurrent').textContent = VIEWS[view];
    if (view === 'library') {
      if (!opts.resourceId) app.selectedResource = null;
      renderLibrary(opts.resourceId);
    }
    if (view === 'oracle') { renderChat(); if (opts.question) askOracle(opts.question); else setTimeout(() => $('#chatInput')?.focus(), 250); }
    if (view === 'budget') renderBudget();
    if (view === 'process') renderProcess();
    if (view === 'panel') renderPanel();
    if (view === 'sim') renderSim();
    persist();
    history.replaceState(null, '', `#${view}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function renderNav() {
    $('#navDay').textContent = 'D' + String(game.day).padStart(2, '0');
    const docs = allResources().length;
    $('#navDocs').textContent = docs;
    $('#panelDay').textContent = String(game.day).padStart(2, '0');
    $('#statDocs').textContent = docs;
    $('#statPlants').textContent = activeCount();
    $('#statQueries').textContent = app.queries;
    $('#statBudget').textContent = fmt(budget().total);
    $('#navDocs').textContent = docs;
  }

  /* ---------- render: panel ---------- */
  function renderPanel() {
    renderNav();
    const phase = stageForDay(game.day);
    $('#panelPhase').textContent = phase.pill;
    $('#heroDay').textContent = String(game.day).padStart(2, '0');
    $('#heroPhase').textContent = phase.name;
    $('#heroHealth').textContent = avgHealth() + '%';
    $('#heroHealthBar').style.width = avgHealth() + '%';
    $('#heroDays').textContent = Math.max(0, 75 - game.day);
    $('#heroHarvest').textContent = game.harvested;
    const p = dayPhase(game.day);
    $('#heroInsight').textContent = game.finished
      ? `Temporada completada: ${fmt(game.harvestYield)} g registrados y ${game.harvested} cosechas. Revisá el resultado o iniciá una nueva temporada.`
      : phaseMessage();
    $('#focusStamp').textContent = 'D' + String(game.day).padStart(2, '0');

    $('#miniPlants').innerHTML = game.plants.map(p => {
      const st = statusOf(p);
      const h = 26 + Math.min(25, p.age * .5);
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

    $('#focusList').innerHTML = p.tasks.slice(0, 3).map(t => `<div class="focus-item"><span>◆</span>${esc(t.text)}</div>`).join('');
    if (game.finished) $('#focusList').innerHTML = `<div class="focus-item"><span>◆</span>Cosecha registrada. Compará el costo real con tu presupuesto.</div><div class="focus-item"><span>◆</span>Guardá aprendizajes en la bitácora de la próxima temporada.</div><div class="focus-item"><span>◆</span>Revisá los recursos de secado y curado.</div>`;

    const recent = window.LIBRARY.slice(-3).reverse();
    $('#recentList').innerHTML = recent.map(r => `<div class="recent-item" data-resource="${r.id}"><span class="recent-icon">PDF</span><span class="recent-info"><span class="recent-title">${esc(r.title)}</span><span class="recent-meta">${esc(r.diploma)} · ${r.module}</span></span><span class="recent-tag">${r.pages} pp.</span></div>`).join('');
    $$('#recentList .recent-item').forEach(el => el.addEventListener('click', () => navigate('library', { resourceId: Number(el.dataset.resource) })));

    const dups = window.LIBRARY.filter(r => r.dup);
    const groups = [...new Set(dups.map(r => r.dup))];
    $('#dupCount').textContent = dups.length;
    $('#insightCount').textContent = groups.length;
    const pair = window.LIBRARY.filter(r => r.dup === 'riego').slice(0, 2);
    $('#insightPair').innerHTML = pair.map((r, i) => `<span class="pair-dot"></span><b>${esc(r.title)}</b>${i === 0 ? '<span style="font-size:7px;color:#b0bab0">↔</span>' : ''}`).join('');
  }

  function phaseMessage() {
    const selected = game.plants[game.selected] || game.plants[0];
    if (!selected.alive) return 'Una planta ya cerró su ciclo. El resto sigue avanzando: mantené la rutina y revisá la madurez del resto.';
    if (selected.moisture < 24) return 'El sustrato de la planta seleccionada está seco. Regá con moderación y volvé a observar el drenaje.';
    if (selected.moisture > 82) return 'La maceta todavía está húmeda. Esperá antes de regar: el exceso de agua también estresa.';
    return dayPhase(game.day).focus[0];
  }

  /* ---------- render: sim ---------- */
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
    saveAndRefresh();
    showToast(`Día ${game.day}: ${game.day >= 67 ? 'revisá la madurez de tus plantas.' : 'el cultivo ha crecido.'}`);
  }

  /* ---------- quick simulation ---------- */
  let quickStrategy = 'balanced';

  function runQuickSim() {
    let s = JSON.parse(JSON.stringify(game));
    const strategy = quickStrategy;
    const startDay = s.day;
    let water = s.water, nuts = s.nutrients, energy = s.energy;
    let extra = 0;
    const temp0 = s.temp, hum0 = s.humidity;

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
        const waterAt = strategy === 'intensive' ? 55 : strategy === 'balanced' ? 38 : 24;
        const feedAt = strategy === 'intensive' ? 58 : strategy === 'balanced' ? 38 : 18;
        // La simulación veloz presupone insumos disponibles y los imputa al costo total.
        if (p.moisture < waterAt) { p.moisture = Math.min(88, p.moisture + 40); extra += 150; }
        if (p.nutrition < feedAt) { p.nutrition = Math.min(88, p.nutrition + 42); extra += 850; }
        let stress = 0;
        if (p.moisture < 18 || p.moisture > 93) stress += 7;
        if (p.nutrition < 12) stress += 5;
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

    s.water = water; s.nutrients = nuts; s.energy = energy;
    s.harvested += alive; s.harvestYield += grams;
    s.finished = true;
    const remaining = (75 - startDay + 1) / 75;
    const premium = strategy === 'intensive' ? 0.18 : strategy === 'minimal' ? -0.16 : 0;
    s.spent = game.spent + Math.round(budget().total * remaining * (1 + premium));
    s.temp = Math.max(18, Math.min(31, temp0 + (strategy === 'intensive' ? -1 : 0)));
    s.humidity = Math.max(35, Math.min(78, hum0 - (strategy === 'intensive' ? 4 : 2)));
    s.logs.unshift({ day: 75, text: `<b>Simulación veloz · ${strategy === 'balanced' ? 'equilibrada' : strategy === 'minimal' ? 'mínima' : 'intensiva'}.</b> ${grams} g registrados.`, kind: 'success' });
    if (s.logs.length > 8) s.logs = s.logs.slice(0, 8);
    game = s;

    const c = budget();
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
    $('#quickModal').classList.remove('open');
    $('#resultModal').classList.add('open');
    persist(); renderSim(); renderPanel(); renderNav();
  }

  /* ---------- library ---------- */
  function renderLibrary(resourceId) {
    renderNav();
    const resources = allResources();
    const dups = resources.filter(r => r.dup);
    const groups = new Set(dups.map(r => r.dup));
    $('#libTotal').textContent = resources.length;
    $('#libProcessed').textContent = resources.filter(r => r.state === 'markdown').length;
    $('#libDuplicates').textContent = groups.size;
    $('#libVerified').textContent = resources.length;
    $('#libVerifiedTotal').textContent = resources.length;
    $('#dupBannerText').textContent = `${dups.length} recursos aparecen en más de una diplomatura (${groups.size} grupos). Verde los vincula sin borrar el original: sabés de dónde viene cada versión y dónde está guardada.`;
    $('#dupCount') && ($('#dupCount').textContent = dups.length);

    const diplomaSelect = $('#libDiploma');
    if (diplomaSelect.options.length <= 1) {
      const diplomas = [...new Set(resources.map(r => r.diploma))];
      diplomaSelect.innerHTML = '<option value="all">Todas las diplomaturas</option>' + diplomas.map(d => `<option>${esc(d)}</option>`).join('');
    }

    if (resourceId) app.selectedResource = resourceId;
    const q = norm($('#libSearch')?.value || '');
    const dip = diplomaSelect.value;
    const state = $('#libState').value;
    const list = resources.filter(r => {
      if (dip !== 'all' && r.diploma !== dip) return false;
      if (state !== 'all' && r.state !== state) return false;
      if (app.dupOnly && !r.dup) return false;
      if (!q) return true;
      return norm(`${r.title} ${r.diploma} ${r.module} ${r.tags.join(' ')} ${r.summary}`).includes(q);
    });
    const sortMode = $('#libSort')?.value || 'recent';
    list.sort((a, b) =>
      sortMode === 'diploma' ? (a.diploma.localeCompare(b.diploma) || a.title.localeCompare(b.title)) :
      sortMode === 'title' ? a.title.localeCompare(b.title) :
      sortMode === 'pages' ? b.pages - a.pages :
      b.id - a.id
    );
    $('#libResultCount').textContent = `${list.length} recurso${list.length === 1 ? '' : 's'}`;
    $('#libEmpty').hidden = list.length > 0;
    const current = list.find(r => r.id === app.selectedResource) || list[0] || resources[0];
    if (current) app.selectedResource = current.id;
    $('#libList').innerHTML = list.map(r => {
      const groupSize = r.dup ? resources.filter(x => x.dup === r.dup).length : 0;
      return `<div class="lib-row ${r.id === app.selectedResource ? 'selected' : ''}" data-resource="${r.id}" role="button" tabindex="0" aria-label="${esc(r.title)}">
        <span class="lib-pdf">PDF</span>
        <div class="lib-row-main"><div class="lib-title-line"><span class="lib-title">${esc(r.title)}</span>${r.dup ? `<span class="dup-mini">⧉ ${groupSize}</span>` : ''}</div><div class="lib-meta"><b>${esc(r.diploma)}</b> · ${esc(r.module)}</div><div class="lib-path">${esc(r.path)}</div></div>
        <div class="lib-row-side"><span class="state-badge state-${r.state}">${r.state === 'markdown' ? 'MARKDOWN' : r.state === 'procesado' ? 'PROCESADO' : 'PENDIENTE'}</span><span class="lib-pages">${r.pages} pp.</span></div>
      </div>`;
    }).join('');
    $$('#libList .lib-row').forEach(el => {
      const open = () => {
        app.selectedResource = Number(el.dataset.resource);
        renderLibrary();
        if (window.innerWidth <= 900) $('#resourceDetail').classList.add('mobile-open');
      };
      el.addEventListener('click', open);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
    renderResourceDetail(current, resources);
    if (resourceId) {
      const el = $(`#libList .lib-row[data-resource="${resourceId}"]`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }

  function renderResourceDetail(r, resources) {
    const el = $('#resourceDetail');
    if (!r) { el.innerHTML = ''; return; }
    const group = r.dup ? resources.filter(x => x.dup === r.dup && x.id !== r.id) : [];
    el.innerHTML = `<div class="rd-top"><span class="rd-icon">PDF</span><span class="rd-badge">${esc(r.code)} · ${r.year}</span></div>
      <h2>${esc(r.title)}</h2>
      <div class="rd-origin"><b>${esc(r.diploma)}</b><br>${esc(r.module)} · ${r.pages} páginas</div>
      <p class="rd-summary">${esc(r.summary)}</p>
      <div class="rd-facts"><div class="rd-fact"><span>ESTADO DE PROCESO</span><b>${r.state === 'markdown' ? 'Markdown listo' : r.state === 'procesado' ? 'Procesado' : 'Pendiente'}</b></div><div class="rd-fact"><span>FORMATO</span><b>PDF · ${r.pages} pp.</b></div><div class="rd-fact"><span>DIPLOMATURA</span><b>${esc(r.diploma)}</b></div><div class="rd-fact"><span>ACTUALIZADO</span><b>${esc(r.updated)}</b></div></div>
      <div class="rd-path"><b>UBICACIÓN EN TU BIBLIOTECA</b>${esc(r.path)}</div>
      <div class="rd-tags">${r.tags.map(t => `<span>#${esc(t)}</span>`).join('')}</div>
      ${group.length ? `<div class="rd-dup"><b>⧉ También aparece en ${group.length} ubicación${group.length > 1 ? 'es' : ''}</b><p>${group.map(g => `${esc(g.diploma)} · ${esc(g.path)}`).join('<br>')}</p></div>` : ''}
      <div class="rd-actions"><button class="btn btn-soft" data-open-oracle="${r.id}">Preguntar al oráculo <span>◈</span></button><button class="btn btn-ghost" id="closeRd">Cerrar</button></div>`;
    $('[data-open-oracle]', el)?.addEventListener('click', () => navigate('oracle', { question: `¿Qué dice mi biblioteca sobre ${r.title.toLowerCase()}?` }));
    $('#closeRd', el)?.addEventListener('click', () => el.classList.remove('mobile-open'));
  }

  function bindLibrary() {
    $('#libSearch').addEventListener('input', () => renderLibrary());
    $('#libDiploma').addEventListener('change', () => renderLibrary());
    $('#libState').addEventListener('change', () => renderLibrary());
    $('#libSort').addEventListener('change', () => renderLibrary());
    $('#dupToggle').addEventListener('click', () => {
      app.dupOnly = !app.dupOnly;
      $('#dupToggle').classList.toggle('active', app.dupOnly);
      renderLibrary();
    });
    $('#showDupBtn').addEventListener('click', () => {
      app.dupOnly = true; $('#dupToggle').classList.add('active'); renderLibrary();
    });
    $('#clearFilters').addEventListener('click', () => {
      $('#libSearch').value = ''; $('#libDiploma').value = 'all'; $('#libState').value = 'all';
      app.dupOnly = false; $('#dupToggle').classList.remove('active'); renderLibrary();
    });
    $('#exportIdxBtn').addEventListener('click', () => {
      const data = JSON.stringify({ version: '0.8', exportedAt: new Date().toISOString(), resources: allResources() }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'verde-indice.json'; a.click();
      URL.revokeObjectURL(a.href);
      showToast('Índice exportado con diplomatura, módulo y ubicación.');
    });
    $('#addResourceBtn').addEventListener('click', () => { $('#addForm').reset(); $('#dropTitle').textContent = 'Arrastrá un PDF o hacé clic'; $('#dropSub').textContent = 'Máx. 40 MB · se indexa localmente'; $('#addModal').classList.add('open'); });
    let pickedFile = null;
    $('#fileInput').addEventListener('change', (e) => {
      const f = e.target.files[0]; pickedFile = f || null;
      if (f) { $('#dropTitle').textContent = f.name; $('#dropSub').textContent = `${(f.size / 1024 / 1024).toFixed(1)} MB · listo para indexar`; }
    });
    $('#addForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const diploma = $('#addDiploma').value;
      const module = $('#addModule').value.trim() || 'Módulo sin especificar';
      const path = $('#addPath').value.trim() || `99_Aportes/${diploma.replace(/ /g, '_')}/${pickedFile ? pickedFile.name : 'documento.pdf'}`;
      const fallbackName = path.split('/').pop().replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ');
      const title = pickedFile ? pickedFile.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ') : (fallbackName || module);
      const resource = {
        id: Date.now(), title, diploma, code: diploma === 'Cultivo Interior' ? 'CI' : diploma === 'Agroecología Aplicada' ? 'AA' : diploma === 'Cannabis Medicinal' ? 'CM' : diploma === 'Extracción y Transformados' ? 'ET' : 'GP',
        module, year: 2026, pages: 0, state: 'pendiente', tags: ['aporte propio', 'sin procesar'], path, dup: null,
        updated: 'hoy', summary: 'Recurso aportado por mbole. Pendiente de conversión a Markdown y revisión de contenido.'
      };
      app.userResources.unshift(resource);
      app.selectedResource = resource.id;
      persist(); renderLibrary(); $('#addModal').classList.remove('open');
      showToast('PDF añadido al índice. Queda pendiente de procesar.');
    });
    $('#guideBtn').addEventListener('click', () => $('#guideModal').classList.add('open'));
  }

  /* ---------- oracle ---------- */
  function renderChat() {
    if (!app.chat.length) {
      app.chat.push({ role: 'bot', html: '<p>Hola, mbole. Soy tu oráculo de cultivo. Puedo cruzar tus 6 diplomaturas y responder con fuentes verificables.</p><p>Probá con una pregunta sobre <b>riego</b>, <b>ambiente</b>, <b>cosecha</b>, <b>costos</b> o el <b>marco legal</b> de Argentina.</p>' });
    }
    $('#chatLog').innerHTML = app.chat.map(m => m.role === 'user'
      ? `<div class="msg user"><span class="msg-avatar">MB</span><div class="msg-body"><p>${esc(m.text)}</p></div></div>`
      : `<div class="msg"><span class="msg-avatar">◈</span><div class="msg-body">${m.html}</div></div>`).join('');
    $('#chatLog').scrollTop = $('#chatLog').scrollHeight;
    renderSources();
  }

  function renderSources() {
    const el = $('#sourceList');
    const sources = app.chatSources;
    $('#sourceCount').textContent = sources.length;
    if (!sources.length) {
      el.innerHTML = `<div class="sources-empty"><span>◈</span><p>Hacé una pregunta y acá vas a ver los recursos exactos que la sustentan.</p></div>`;
      return;
    }
    el.innerHTML = sources.map((s, i) => `<div class="source-item" data-resource="${s.id}"><span class="source-score">${98 - i * 7}%</span><div class="source-title">${esc(s.title)}</div><div class="source-meta">${esc(s.diploma)} · ${esc(s.module)}<br>${esc(s.path)}</div></div>`).join('');
    $$('#sourceList .source-item').forEach(item => item.addEventListener('click', () => navigate('library', { resourceId: Number(item.dataset.resource) })));
  }

  function answerFor(text) {
    const q = norm(text);
    let best = null, bestScore = 0;
    window.ORACLE_KB.forEach(entry => {
      let score = 0;
      entry.match.forEach(m => { if (q.includes(norm(m))) score += 3; });
      if (norm(entry.key) && q.includes(norm(entry.key))) score += 2;
      if (score > bestScore) { bestScore = score; best = entry; }
    });
    const resources = allResources();
    if (best) {
      const src = best.sources.map(id => resources.find(r => r.id === id)).filter(Boolean);
      const cites = src.map((r, i) => `<span class="cite">[${i + 1}] ${esc(r.diploma)}</span>`).join('');
      const practical = `<ul><li><b>Qué observar:</b> medí antes de corregir y registrá la fecha del cambio.</li><li><b>Qué evitar:</b> pasar de una corrección a otra sin dar tiempo a la planta.</li><li><b>Próximo paso:</b> contrastá la recomendación con tu registro real y ajustá una sola variable.</li></ul>`;
      const legal = best.key === 'legal' ? '<div class="legal-callout">Información educativa, no asesoramiento legal. Verificá tu inscripción REPROCANN y la normativa vigente en tu jurisdicción.</div>' : '';
      const budgetNote = best.key === 'presupuesto' ? `<div class="legal-callout">Escenario base de la app: 9 plantas en 15 m², $${fmt(budget().total)} de costo total y $${fmt(app.budget.price)}/g de referencia.</div>` : '';
      return { html: `<p><b>${best.title}</b></p><p>${best.answer}</p>${practical}<p>${cites}</p>${legal}${budgetNote}`, sources: src };
    }
    const words = q.split(/\s+/).filter(w => w.length > 3);
    const scored = resources.map(r => {
      const hay = norm(`${r.title} ${r.diploma} ${r.tags.join(' ')} ${r.summary}`);
      return { r, score: words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0) };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
    if (!scored.length) {
      return { html: `<p>No encontré una coincidencia directa en las 24 fuentes indexadas. Probá con un término más concreto —riego, pH, VPD, tricomas, REPROCANN, costo por gramo— o agregá el PDF que falta a la biblioteca.</p><p>Mientras tanto, puedo ayudarte a descomponer la pregunta: <b>¿qué etapa del cultivo</b> querés resolver y <b>qué variable</b> estás observando?</p>`, sources: [] };
    }
    const html = `<p>Encontré material relacionado en tu biblioteca. Todavía no hay una respuesta curada para esta pregunta exacta, pero estas fuentes son el mejor punto de partida:</p><ul>${scored.map(x => `<li><b>${esc(x.r.title)}</b> — ${esc(x.r.summary)}</li>`).join('')}</ul><p>${scored.map((x, i) => `<span class="cite">[${i + 1}] ${esc(x.r.diploma)}</span>`).join('')}</p><div class="legal-callout">Respuesta generada por recuperación local. Contrastá siempre con el documento completo.</div>`;
    return { html, sources: scored.map(x => x.r) };
  }

  function askOracle(text) {
    if (!text || !text.trim()) return;
    app.chat.push({ role: 'user', text: text.trim() });
    app.queries++;
    renderChat();
    $('#statQueries').textContent = app.queries;
    $('#chatInput').value = '';
    const typing = document.createElement('div');
    typing.className = 'msg';
    typing.innerHTML = '<span class="msg-avatar">◈</span><div class="msg-body"><div class="typing"><i></i><i></i><i></i></div></div>';
    $('#chatLog').appendChild(typing);
    $('#chatLog').scrollTop = $('#chatLog').scrollHeight;
    persist();
    setTimeout(() => {
      const ans = answerFor(text);
      app.chat.push({ role: 'bot', html: ans.html });
      app.chatSources = ans.sources;
      renderChat();
      persist();
    }, 620);
  }

  function bindOracle() {
    $('#chatForm').addEventListener('submit', (e) => { e.preventDefault(); askOracle($('#chatInput').value); });
    $$('#chatPrompts button').forEach(b => b.addEventListener('click', () => askOracle(b.textContent)));
    $('#clearChat').addEventListener('click', () => { app.chat = []; app.chatSources = []; renderChat(); persist(); });
    document.addEventListener('click', (e) => {
      const ask = e.target.closest('[data-ask]');
      if (ask) navigate('oracle', { question: ask.dataset.ask });
    });
  }

  /* ---------- budget ---------- */
  function renderBudget() {
    const b = app.budget;
    $('#bPlants').value = b.plants; $('#bYield').value = b.yield; $('#bPrice').value = b.price;
    $('#bKwh').value = b.kwh; $('#bHours').value = b.hours; $('#bDays').value = b.days; $('#bWatts').value = b.watts;
    $('#bPlantsVal').textContent = b.plants;
    $('#bYieldVal').textContent = b.yield;
    $('#bPriceVal').textContent = fmt(b.price);
    const c = costsFor(b);
    $('#bTotal').textContent = fmt(c.total);
    $('#bPerPlant').textContent = '$' + fmt(c.perPlant);
    $('#bPerGram').textContent = '$' + fmt(c.perGram);
    $('#bValue').textContent = '$' + fmt(c.value);
    $('#bMargin').textContent = (c.margin >= 0 ? '+' : '') + Math.round(c.margin) + '%';
    $('#bMargin').style.color = c.margin >= 0 ? '#b7d685' : '#e29b84';
    const max = Math.max(...c.items.map(i => i.value));
    $('#breakdownBars').innerHTML = c.items.map(i => `<div class="bd-row"><span class="bd-name">${i.name}</span><span class="bd-track"><i style="width:${i.value / max * 100}%;background:${i.color}"></i></span><span class="bd-val">$${fmt(i.value)}</span></div>`).join('');
    const s9 = scaleScenario(9), s90 = scaleScenario(90), s900 = scaleScenario(900);
    $('#scale9').textContent = '$' + fmt(s9.cost); $('#scale9g').textContent = '$' + fmt(s9.perGram);
    $('#scale90').textContent = '$' + fmt(s90.cost); $('#scale90g').textContent = '$' + fmt(s90.perGram);
    $('#scale900').textContent = '$' + fmt(s900.cost); $('#scale900g').textContent = '$' + fmt(s900.perGram);
    $('#scaleSave').textContent = '−' + Math.max(0, Math.round((1 - s90.perGram / s9.perGram) * 100)) + '%';
    $('#processTease').textContent = fmt(c.total);
    $('#processCost').textContent = '$' + fmt(processSpent());
    $('#statBudget').textContent = fmt(c.total);
  }

  function bindBudget() {
    const map = [['bPlants', 'plants'], ['bYield', 'yield'], ['bPrice', 'price']];
    map.forEach(([id, key]) => $('#' + id).addEventListener('input', (e) => {
      app.budget[key] = Number(e.target.value);
      if (key === 'plants') $('#bPlantsVal').textContent = e.target.value;
      if (key === 'yield') $('#bYieldVal').textContent = e.target.value;
      if (key === 'price') $('#bPriceVal').textContent = fmt(e.target.value);
      renderBudget(); persist();
    }));
    [['bKwh', 'kwh'], ['bHours', 'hours'], ['bDays', 'days'], ['bWatts', 'watts']].forEach(([id, key]) => $('#' + id).addEventListener('input', (e) => {
      app.budget[key] = Math.max(0, Number(e.target.value) || 0); renderBudget(); persist();
    }));
    $('#budgetReset').addEventListener('click', () => { app.budget = initialBudget(); renderBudget(); persist(); showToast('Supuestos restablecidos.'); });
    $('#saveBudgetBtn').addEventListener('click', () => { persist(); showToast('Presupuesto guardado: $' + fmt(budget().total) + ' ARS.'); });
  }

  /* ---------- process ---------- */
  function processSpent() {
    const total = budget().total;
    let done = 0, totalTasks = 0;
    window.PHASES.forEach(p => p.tasks.forEach(t => { totalTasks++; if (app.tasks[t.id]) done++; }));
    return Math.round(total * (done / Math.max(1, totalTasks)));
  }

  function renderProcess() {
    const phases = window.PHASES;
    let done = 0, all = 0;
    phases.forEach(p => p.tasks.forEach(t => { all++; if (app.tasks[t.id]) done++; }));
    $('#taskProgressLabel').textContent = `${done} / ${all} tareas`;
    $('#taskProgressBar').style.width = `${done / all * 100}%`;
    $('#processCost').textContent = '$' + fmt(processSpent());
    $('#processTease').textContent = fmt(budget().total);
    $('#statBudget') && ($('#statBudget').textContent = fmt(budget().total));

    $('#processTimeline').innerHTML = phases.map(p => {
      const isCurrent = game.day >= p.from && game.day <= p.to;
      const isDone = game.day > p.to || p.tasks.every(t => app.tasks[t.id]);
      return `<div class="phase-block ${isCurrent ? 'current' : ''} ${isDone ? 'done' : ''}">
        <div class="phase-marker"><span>${isDone ? '✓' : p.icon}</span></div>
        <div class="phase-content">
          <div class="phase-head"><div><div class="phase-title"><h3>${p.name}</h3><span>DÍAS ${p.from}–${p.to}</span></div><div class="phase-goal">${esc(p.goal)}</div></div><div class="phase-cost">$${fmt(p.cost)}<small>COSTO ESTIMADO</small></div></div>
          <div class="phase-tasks">${p.tasks.map(t => `<label class="task ${app.tasks[t.id] ? 'done' : ''}" data-task="${t.id}"><input type="checkbox" ${app.tasks[t.id] ? 'checked' : ''}><span class="chk"></span><span>${esc(t.text)}</span></label>`).join('')}</div>
          <div class="phase-focus">${p.focus.map(f => `<span>${esc(f)}</span>`).join('')}</div>
        </div>
      </div>`;
    }).join('');

    $('#legalChecks').innerHTML = window.LEGAL_CHECKS.map(c => `<label class="legal-check-row ${app.legal[c.id] ? 'done' : ''}" data-legal="${c.id}"><input type="checkbox" ${app.legal[c.id] ? 'checked' : ''}><span class="chk"></span><span><b>${esc(c.text)}</b><small>${esc(c.detail)}</small></span></label>`).join('');
    $$('#processTimeline .task').forEach(t => t.addEventListener('click', (e) => {
      e.preventDefault();
      const id = t.dataset.task;
      app.tasks[id] = !app.tasks[id];
      renderProcess(); persist();
    }));
    $$('#legalChecks .legal-check-row').forEach(t => t.addEventListener('click', (e) => {
      e.preventDefault();
      const id = t.dataset.legal;
      app.legal[id] = !app.legal[id];
      renderProcess(); persist();
    }));
  }

  /* ---------- shop / modals / misc ---------- */
  function showToast(text) {
    const t = $('#toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  function bindShop() {
    $('#shopBtn').addEventListener('click', () => $('#shopModal').classList.add('open'));
    $$('.shop-items button').forEach(btn => btn.addEventListener('click', () => {
      const type = btn.dataset.buy, cost = { water: 4000, nutrient: 8000, energy: 6000 }[type];
      if (game.cash < cost) { showToast('No tenés fondos suficientes.'); return; }
      if ((type === 'water' && game.water >= 20) || (type === 'nutrient' && game.nutrients >= 10) || (type === 'energy' && game.energy >= 100)) { showToast('Tu reserva ya está completa.'); return; }
      game.cash -= cost; game.spent += cost;
      if (type === 'water') game.water = Math.min(20, game.water + 5);
      if (type === 'nutrient') game.nutrients = Math.min(10, game.nutrients + 3);
      if (type === 'energy') game.energy = Math.min(100, game.energy + 20);
      saveAndRefresh(); showToast('Suministros añadidos. Gasto registrado en la temporada.');
    }));
  }

  function bindModals() {
    $$('[data-close]').forEach(b => b.addEventListener('click', () => $('#' + b.dataset.close).classList.remove('open')));
    $$('.modal-backdrop').forEach(m => m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('open'); }));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') $$('.modal-backdrop').forEach(m => m.classList.remove('open'));
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); navigate('library'); setTimeout(() => $('#libSearch').focus(), 100); }
      if (e.code === 'Space' && !e.target.closest('button,input,select,textarea') && app.view === 'sim') { e.preventDefault(); advance(); }
    });
    $('#quickSimBtn').addEventListener('click', () => {
      if (game.finished) { showToast('La temporada terminó. Reiniciá para correr otra simulación.'); return; }
      quickStrategy = 'balanced'; $$('#strategyList button').forEach(b => b.classList.toggle('active', b.dataset.strategy === 'balanced')); $('#quickModal').classList.add('open');
    });
    $('#resetSimBtn').addEventListener('click', () => {
      if (confirm('¿Reiniciar la temporada? Se borrará el progreso del cultivo, no la biblioteca ni el presupuesto.')) {
        game = initialGame(); saveAndRefresh(); navigate('sim'); showToast('Nueva temporada iniciada.');
      }
    });
    $$('#strategyList button').forEach(b => b.addEventListener('click', () => {
      quickStrategy = b.dataset.strategy;
      $$('#strategyList button').forEach(x => x.classList.toggle('active', x === b));
    }));
    $('#runQuickBtn').addEventListener('click', runQuickSim);
    $('#restartFromResult').addEventListener('click', () => {
      game = initialGame(); game.cash = 48000;
      $('#resultModal').classList.remove('open'); saveAndRefresh(); navigate('sim'); showToast('Nueva temporada iniciada.');
    });
    let sound = false;
    $('#soundBtn').addEventListener('click', (e) => {
      sound = !sound;
      e.currentTarget.textContent = sound ? '♪' : '◖';
      e.currentTarget.setAttribute('aria-label', sound ? 'Desactivar sonido' : 'Activar sonido');
      showToast(sound ? 'Sonido ambiental activado.' : 'Sonido desactivado.');
    });
  }

  function bindNav() {
    document.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-nav]');
      if (nav) { e.preventDefault(); navigate(nav.dataset.nav); }
      const plant = e.target.closest('[data-plant]');
      if (plant && app.view === 'sim') { game.selected = Number(plant.dataset.plant); renderSim(); persist(); }
    });
    $$('#view-sim .action-card').forEach(b => b.addEventListener('click', () => action(b.dataset.action)));
    $('#advanceBtn').addEventListener('click', advance);
    $('#advanceBtn2').addEventListener('click', advance);
  }

  function init() {
    bindNav(); bindModals(); bindLibrary(); bindOracle(); bindBudget(); bindShop();
    $('#price') && ($('#bPriceVal').textContent = fmt(app.budget.price));
    const hash = location.hash.replace('#', '');
    const start = VIEWS[hash] ? hash : (app.view || 'panel');
    renderPanel(); renderSim(); renderBudget(); renderProcess(); renderLibFilters();
    navigate(start);
    if (game.finished) setTimeout(() => showToast('Temporada completada. Revisá el resumen o iniciá una nueva.'), 700);
  }

  function renderLibFilters() {
    if (app.dupOnly) $('#dupToggle').classList.add('active');
    const diplomaSelect = $('#libDiploma');
    const diplomas = [...new Set(allResources().map(r => r.diploma))];
    diplomaSelect.innerHTML = '<option value="all">Todas las diplomaturas</option>' + diplomas.map(d => `<option>${esc(d)}</option>`).join('');
  }

  init();
})();
