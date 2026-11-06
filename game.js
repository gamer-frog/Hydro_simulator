(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const fmt = (n) => Math.round(n).toLocaleString('es-AR');
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  /* ---------- parser real PDF → Markdown (pdf.js, local) ---------- */
  if (window.pdfjsLib) {
    try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; } catch {}
  }
  let pdfDbPromise;
  function openPdfStore() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB no disponible'));
    if (!pdfDbPromise) pdfDbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('verde-pdf-store-v1', 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('pdfs')) request.result.createObjectStore('pdfs');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('No se pudo abrir el almacenamiento local'));
    });
    return pdfDbPromise;
  }
  async function storePdfBlob(id, blob) {
    const db = await openPdfStore();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pdfs', 'readwrite');
      tx.objectStore('pdfs').put(blob, String(id));
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error('No se pudo guardar el PDF'));
      tx.onabort = () => reject(tx.error || new Error('No se pudo guardar el PDF'));
    });
  }
  async function readPdfBlob(id) {
    const db = await openPdfStore();
    return new Promise((resolve, reject) => {
      const request = db.transaction('pdfs', 'readonly').objectStore('pdfs').get(String(id));
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('No se pudo leer el PDF'));
    });
  }

  async function pdfToMarkdown(file, title, onProgress) {
    if (!window.pdfjsLib || !file) return { md: '', pages: 0, chars: 0, headings: [], topics: [], failed: true, reason: 'pdf.js no cargado', meta: {} };
    try {
      const buf = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
      const totalPages = pdf.numPages;
      const pages = Math.min(totalPages, 30);
      const out = [`# ${title}`, '', `> Convertido desde PDF: ${file.name} · ${totalPages} páginas (${pages} procesadas) · sin subir a terceros.`, ''];
      const headings = [];
      let chars = 0;
      for (let p = 1; p <= pages; p++) {
        if (onProgress) onProgress(p, pages);
        const page = await pdf.getPage(p);
        const tc = await page.getTextContent();
        let txt = '';
        tc.items.forEach((it, i) => {
          const s = String(it.str || '');
          if (!s) return;
          txt += s;
          if (it.hasEOL) txt += '\n';
          else if (it.transform && tc.items[i + 1]?.transform && Math.abs(tc.items[i + 1].transform[5] - it.transform[5]) > 3) txt += '\n';
          else txt += ' ';
        });
        const clean = txt.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();
        chars += clean.length;
        if (!clean) continue;
        out.push(`## Página ${p}`);
        const lines = clean.split('\n').map(x => x.trim()).filter(Boolean);
        for (const line of lines) {
          if (line.length <= 70 && (line === line.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(line) || /^M[óo]dulo/.test(line) || /^Cap[íi]tulo/.test(line))) {
            if (headings.length < 20) headings.push(line.slice(0, 80));
            out.push(`\n### ${line}\n`);
          } else if (line.length > 1) {
            out.push(line);
          }
        }
        out.push('');
      }
      const md = out.join('\n').slice(0, 60000);
      const topics = [...new Set((md.toLowerCase().match(/medicin|cbd|thc|riego|ph|ec|vpd|luz|led|plaga|cosec|secad|curad|reprocann|autocultivo|terpen|npk|suelo|compost/g) || []).map(w => w.replace('cosec', 'cosecha').replace('secad', 'secado').replace('curad', 'curado')))].slice(0, 8);
      const yearMatch = md.match(/(19|20)\d{2}/);
      const meta = { pages: totalPages, processed: pages, chars, headings, topics, year: yearMatch ? Number(yearMatch[0]) : null, lang: 'es-AR' };
      if (chars < 80) return { md: '', pages: 0, chars, headings, topics: [], failed: true, reason: 'sin texto extraíble (escaneado?): probar OCR', meta };
      return { md, pages: totalPages, chars, headings, topics, failed: false, meta };
    } catch (e) {
      return { md: '', pages: 0, chars: 0, headings: [], topics: [], failed: true, reason: String(e && e.message || e).slice(0, 120), meta: {} };
    }
  }

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

  const initialBudget = () => ({ plants: 9, yield: 55, price: 4500, kwh: 95, hours: 18, days: 75, watts: 240, mode: 'indoor' });
  const BUDGET_PRODUCTS = {
    indoor: [
      { id: 'led', name: 'LED 240W quantum 3000K', price: 285000, img: 'assets/grow-room.jpg', q: 'led 240w quantum 3000k cultivo indoor' },
      { id: 'tent', name: 'Carpa 120×120×200 indoor', price: 165000, img: 'assets/grow-room.jpg', q: 'carpa indoor 120x120x200 cultivo' },
      { id: 'extractor', name: 'Extractor 4" + filtro carbón', price: 89000, img: 'assets/greenhouse.jpg', q: 'extractor 4 pulgadas filtro carbon cultivo' },
      { id: 'substrate', name: 'Sustrato 20L (9 macetas)', price: 54000, img: 'assets/leaf-texture.jpg', q: 'sustrato 20 litros cultivo indoor' },
      { id: 'nutrients', name: 'Nutrientes NPK + CaMg', price: 42000, img: 'assets/leaf-texture.jpg', q: 'nutrientes npk cultivo indoor pack' },
      { id: 'seeds', name: 'Semillas auto x9', price: 22000, img: 'assets/hero-bud.jpg', q: 'semillas autoflorecientes x9' },
      { id: 'timer', name: 'Timer + temporizadores', price: 12000, img: 'assets/grow-room.jpg', q: 'timer mecanico riego cultivo indoor' },
      { id: 'ph', name: 'Medidores pH/EC', price: 18000, img: 'assets/bud-macro.jpg', q: 'medidor ph ec cultivo' }
    ],
    outdoor: [
      { id: 'pots', name: 'Macetas 20L x9 + tierra', price: 48000, img: 'assets/greenhouse.jpg', q: 'maceta 20 litros cultivo exterior' },
      { id: 'substrate', name: 'Sustrato exterior 40L', price: 38000, img: 'assets/leaf-texture.jpg', q: 'sustrato exterior 40 litros' },
      { id: 'nutrients', name: 'Nutrientes orgánicos', price: 32000, img: 'assets/leaf-texture.jpg', q: 'nutrientes organicos cultivo exterior' },
      { id: 'seeds', name: 'Semillas auto x9', price: 22000, img: 'assets/hero-bud.jpg', q: 'semillas autoflorecientes x9' },
      { id: 'pest', name: 'Control biológico (trampas+aceite)', price: 15000, img: 'assets/bud-macro.jpg', q: 'control biologico plagas cultivo' },
      { id: 'shade', name: 'Media sombra / tutorado', price: 19000, img: 'assets/greenhouse.jpg', q: 'media sombra tutorado cultivo exterior' },
      { id: 'ph', name: 'Medidores pH/EC', price: 18000, img: 'assets/bud-macro.jpg', q: 'medidor ph ec cultivo' },
      { id: 'water', name: 'Regadera + medidor humedad', price: 11000, img: 'assets/leaf-texture.jpg', q: 'medidor humedad sustrato' }
    ]
  };
  const defaultApp = () => ({
    view: 'panel', budget: initialBudget(), tasks: {}, legal: {}, userResources: [],
    selectedResource: null, queries: 0, chat: [], chatSources: [], dupOnly: false,
    journalWeek: null, journalTasks: {}, selectedStrain: null, grows: [],
    libMode: 'digest', batch: null, roadmapStream: 'all', roadmapPending: false, roadmapHorizon: 'all', roadmapQuery: '',
    sideCollapsed: false, sim: null, simSeries: { growth: true, health: true, moisture: true, nutrition: true, yield: true },
    annotations: {}, readingPaths: []
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
    app.annotations = app.annotations || {};
    app.readingPaths = Array.isArray(app.readingPaths) ? app.readingPaths : [];
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

  /* ---------- biblioteca derivada ---------- */
  // 100 = markdown listo · 62 = texto procesado sin estructura final · 0 = pendiente
  const resourceProgress = (r) => r.state === 'markdown' ? 100 : r.state === 'procesado' ? 62 : 0;
  const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 42);
  const mdPath = (r) => `md/${String(r.code || 'AP').toLowerCase()}/${slug(r.module || 'modulo')}/${String(r.id).padStart(3, '0')}_${slug(r.title)}.md`;
  const mdHash = (r) => {
    let h = 0;
    for (const ch of String(r.path)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h.toString(16).padStart(8, '0').toUpperCase();
  };
  const courseOf = (r) => window.DIPLOMAS.find(d => d.code === r.code) || { name: r.diploma, code: r.code || 'AP', color: '#6d8a5a' };
  const resourcesOf = (code) => allResources().filter(r => r.code === code || r.diploma === (window.DIPLOMAS.find(d => d.code === code) || {}).name);
  function courseStats(code) {
    const d = window.DIPLOMAS.find(x => x.code === code) || { code, name: code };
    const list = resourcesOf(code);
    const pages = list.reduce((n, r) => n + (r.pages || 0), 0);
    const md = list.filter(r => r.state === 'markdown').length;
    const loadedPages = list.reduce((n, r) => n + (r.pages || 0) * resourceProgress(r) / 100, 0);
    const pct = pages ? Math.round(loadedPages / pages * 100) : 0;
    return { ...d, list, pages, md, pct, modules: [...new Set(list.map(r => r.module))].length };
  }
  function extrasStats(code) {
    const x = window.LIBRARY_EXTRAS[code] || {};
    const cats = [
      { id: 'md', label: 'Markdown', loaded: x.md || 0, total: x.mdTotal || 0 },
      { id: 'fichas', label: 'Fichas', loaded: x.fichas || 0, total: x.fichasTotal || 0 },
      { id: 'audio', label: 'Audio', loaded: x.audio || 0, total: x.audioTotal || 0 },
      { id: 'papers', label: 'Papers', loaded: x.papers || 0, total: x.papersTotal || 0 }
    ];
    const loaded = cats.reduce((n, c) => n + c.loaded, 0);
    const total = cats.reduce((n, c) => n + c.total, 0);
    return { cats, loaded, total, pct: total ? Math.round(loaded / total * 100) : 0 };
  }
  const libraryPct = () => {
    const all = allResources();
    const pages = all.reduce((n, r) => n + (r.pages || 1), 0);
    const loaded = all.reduce((n, r) => n + (r.pages || 1) * resourceProgress(r) / 100, 0);
    return pages ? Math.round(loaded / pages * 100) : 0;
  };
  const tagIndex = () => {
    const map = new Map();
    allResources().forEach(r => (r.tags || []).forEach(t => {
      const key = norm(t);
      if (!map.has(key)) map.set(key, { tag: t, ids: new Set(), courses: new Set() });
      map.get(key).ids.add(r.id);
      map.get(key).courses.add(r.code);
    }));
    return [...map.values()].sort((a, b) => b.ids.size - a.ids.size || a.tag.localeCompare(b.tag, 'es'));
  };

  function costsFor(b) {
    const outdoor = b.mode === 'outdoor';
    const energy = outdoor ? 0 : (b.watts / 1000) * b.hours * b.days * b.kwh;
    const seeds = b.plants * 8000;
    const substrate = b.plants * (outdoor ? 5500 : 7500);
    const nutrition = b.plants * (outdoor ? 4200 : 6000);
    const water = 1200 + b.plants * 140;
    const equipment = (outdoor ? 38000 : 120000) * Math.pow(b.plants / 9, 0.55);
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
  const VIEWS = { panel: 'INICIO', strains: 'CEPAS', journal: 'DIARIO', sim: 'SIMULADOR', library: 'BIBLIOTECA', oracle: 'ORÁCULO IA', budget: 'COSTOS', process: 'PROCESO', roadmap: 'ROADMAP' };
  function navigate(target, opts = {}) {
    if (target === 'journal') { target = 'panel'; showToast('Diario fuera de la app de estudio (ver Roadmap).'); }
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
      if (opts.libMode) app.libMode = opts.libMode;
      if (opts.resourceId) app.libMode = 'files';
      renderLibrary(opts.resourceId);
    }
    if (target === 'oracle') { renderChat(); if (opts.question) askOracle(opts.question); else setTimeout(() => $('#chatInput')?.focus(), 250); }
    if (target === 'budget') renderBudget();
    if (target === 'process') renderProcess();
    if (target === 'panel') renderPanel();
    if (target === 'sim') renderSim();
    if (target === 'strains') { renderStrains(); if (opts.strainId) setTimeout(() => openStrainSheet(String(opts.strainId)), 90); }
    if (target === 'journal') renderJournal();
    if (target === 'roadmap') renderRoadmap();
    persist();
    history.replaceState(null, '', `#${target}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function renderNav() {
    const docs = allResources().length;
    if ($('#navDay')) $('#navDay').textContent = 'D' + String(game.day).padStart(2, '0');
    if ($('#navWeek')) $('#navWeek').textContent = 'S' + currentWeek();
    if ($('#navDocs')) $('#navDocs').textContent = docs;
    if ($('#statDocs')) $('#statDocs').textContent = docs;
    if ($('#statPlants')) $('#statPlants').textContent = activeCount();
    if ($('#statQueries')) $('#statQueries').textContent = app.queries;
    if ($('#statBudget')) $('#statBudget').textContent = fmt(budget().total);
    if ($('#statPerGram')) $('#statPerGram').textContent = '$' + fmt(budget().perGram) + ' / g';
    const rp = roadmapProgress();
    if ($('#navRoad')) $('#navRoad').textContent = rp.pct + '%';
  }

  /* ---------- inicio · índice de la aplicación ---------- */
  function renderPanel() {
    renderNav();
    const phase = dayPhase(game.day);
    const stage = stageForDay(game.day);
    const pct = Math.min(100, Math.round(game.day / 75 * 100));
    const dayLabel = String(game.day).padStart(2, '0');

    $('#idxSimDay').textContent = dayLabel;
    $('#idxNorthPct').textContent = pct + '%';
    $('#idxNorthBar').style.width = pct + '%';
    $('#idxSimProgress').style.width = pct + '%';
    $('#idxNorthLabel').textContent = game.finished ? `Batch cerrado · ${game.harvested} cosechas` : `Día ${game.day} de 75 · ${phase.name.toLowerCase()}`;
    $('#idxPlayhead').style.left = pct + '%';
    $('#idxBatchDay').textContent = dayLabel;
    $('#idxBatchPhase').textContent = phase.name;
    $('#idxPhasePill').textContent = stage.pill;
    $('#idxHarvest').textContent = game.harvested;
    $('#idxHealth').textContent = avgHealth() + '%';
    $('#idxHealthTag').textContent = avgHealth() >= 80 ? 'ESTABLE' : avgHealth() >= 55 ? 'OBSERVAR' : 'ALERTA';
    $('#idxHealthTag').classList.toggle('warn', avgHealth() < 80);
    $('#idxBatchState').textContent = game.finished ? 'BATCH CERRADO' : game.day > 1 ? 'BATCH EN CURSO' : 'LISTO PARA CORRER';
    const nxt = nextStage(game.day);
    $('#idxMilestone').textContent = nxt ? `Día ${nxt.from} · ${nxt.name}` : 'Cierre de temporada';

    const bounds = [1, 12, 27, 37, 57, 67, 76];
    $$('#idxTimelapse .idx-tl-seg').forEach((el, i) => {
      el.classList.toggle('done', game.day >= bounds[i + 1]);
      el.classList.toggle('current', game.day >= bounds[i] && game.day < bounds[i + 1]);
    });

    $('#idxMiniPlants').innerHTML = game.plants.map(p => {
      const st = statusOf(p);
      return `<span class="idx-pot ${st}" title="Planta ${p.id}"><i style="--h:${20 + Math.min(26, p.age * .42)}px"></i></span>`;
    }).join('');

    const idxEvents = [
      { day: 1, kind: 'start', title: 'Siembra', note: '9 autos' },
      { day: 12, kind: 'phase', title: 'Crecimiento', note: 'Raíces listas' },
      { day: 27, kind: 'phase', title: 'Prefloración', note: 'Cambio de fórmula' },
      { day: 37, kind: 'phase', title: 'Floración', note: 'Cogollos' },
      { day: 57, kind: 'phase', title: 'Maduración', note: 'Tricomas' },
      { day: 67, kind: 'phase', title: 'Corte', note: 'Ventana' }
    ];
    $('#idxBatchEvents').innerHTML = idxEvents.slice(0, 4).map(e => `
      <div class="idx-event-row ${game.day >= e.day ? 'passed' : ''} ${game.day >= e.day && game.day < e.day + 12 ? 'current' : ''}">
        <span class="ie-day">D${String(e.day).padStart(2, '0')}</span>
        <b>${e.title}</b>
        <small>${e.note}</small>
      </div>`).join('');

    // biblioteca: nombres de cursos + % cargado + extras
    const courses = window.DIPLOMAS.map(d => courseStats(d.code));
    const totalMd = allResources().filter(r => r.state === 'markdown').length;
    $('#idxLibMd').textContent = totalMd + ' MD';
    const libPct = libraryPct();
    $('#idxLibPct').textContent = libPct + '%';
    $('#idxLibBar').style.width = libPct + '%';
    $('#idxCourseList').innerHTML = courses.map(c => `
      <button class="idx-course-row" data-idx-course="${c.code}">
        <span class="idx-course-dot" style="background:${c.color}"></span>
        <span class="idx-course-copy"><b>${esc(c.name)}</b><small>${c.list.length} PDFs · ${c.pages} pp · ${c.md} MD</small></span>
        <span class="idx-course-bar"><i style="width:${c.pct}%"></i></span>
        <span class="idx-course-pct">${c.pct}%</span>
      </button>`).join('');

    const extras = ['Markdown', 'Fichas', 'Audio', 'Papers'].map((label, idx) => {
      const key = ['md', 'fichas', 'audio', 'papers'][idx];
      let loaded = 0, total = 0;
      window.DIPLOMAS.forEach(d => {
        const x = window.LIBRARY_EXTRAS[d.code] || {};
        loaded += x[key] || 0; total += x[key + 'Total'] || 0;
      });
      return { label, loaded, total, pct: total ? Math.round(loaded / total * 100) : 0 };
    });
    extras.unshift({ label: 'PDFs', loaded: allResources().length, total: allResources().length, pct: 100 });
    $('#idxExtras').innerHTML = extras.map(x => `
      <div class="idx-extra ${x.pct >= 80 ? 'good' : x.pct >= 40 ? 'mid' : 'low'}">
        <span>${x.label}</span><b>${x.pct}%</b><i><i style="width:${x.pct}%"></i></i><small>${x.loaded}/${x.total}</small>
      </div>`).join('');
    $$('#idxCourseList [data-idx-course]').forEach(el => el.addEventListener('click', () => {
      app.libMode = 'files';
      libFiltersReady = false;
      navigate('library');
      setTimeout(() => {
        const sel = $('#libDiploma');
        const code = el.dataset.idxCourse;
        const name = (window.DIPLOMAS.find(d => d.code === code) || {}).name;
        if (sel && name) { sel.value = name; app.selectedResource = null; renderLibrary(); persist(); }
      }, 60);
    }));

    // cepas
    $('#idxStrainPicks').innerHTML = [window.STRAINS[0], window.STRAINS[3], window.STRAINS[7], window.STRAINS[10]]
      .map(s => `<button data-idx-strain="${s.id}">${esc(s.name.replace(' Auto', ''))}<small>${s.thc}%</small></button>`).join('');
    $$('#idxStrainPicks [data-idx-strain]').forEach(el => el.addEventListener('click', () => navigate('strains', { strainId: el.dataset.idxStrain })));

    // diario
    $('#idxWeekPill').textContent = 'S' + currentWeek();
    $('#idxJournalWeeks').innerHTML = journalWeeks().map(w => {
      const cls = w.n < currentWeek() ? 'done' : w.n === currentWeek() ? 'current' : '';
      return `<button class="idx-week ${cls}" data-idx-week="${w.n}" title="Semana ${w.n} · ${esc(w.title)}"><span>${w.n}</span></button>`;
    }).join('');
    $$('#idxJournalWeeks [data-idx-week]').forEach(el => el.addEventListener('click', () => navigate('journal', { journalWeek: Number(el.dataset.idxWeek) })));

    // oráculo / costos / proceso
    $('#idxOracleQueries').textContent = app.queries;
    $('#idxCostGram').textContent = '$' + fmt(budget().perGram);
    $('#idxCostTotal').textContent = '$' + fmt(budget().total);
    const allTasks = window.PHASES.reduce((n, p) => n + p.tasks.length, 0);
    const doneTasks = window.PHASES.reduce((n, p) => n + p.tasks.filter(t => app.tasks[t.id]).length, 0);
    $('#idxProcessPill').textContent = `${doneTasks}/${allTasks}`;
    $('#idxProcessBar').style.width = (allTasks ? doneTasks / allTasks * 100 : 0) + '%';

    // roadmap
    const rp = roadmapProgress();
    const road = window.ROADMAP;
    $('#idxRoadmapDone').textContent = `${rp.done}/${rp.total}`;
    $('#idxRoadPct').textContent = rp.pct + '%';
    if (road && $('#idxRoadMeta')) {
      $('#idxRoadMeta').textContent = `${road.streams.length} FRENTES · ${rp.total} HITOS · ${road.reverseEngineering?.length || 0} APPS`;
    }
    const nextItem = rp.items.find(i => i.status === 'now') || rp.items.find(i => i.status === 'next');
    $('#idxRoadNext').textContent = nextItem ? nextItem.t : 'Roadmap completo';
    if ($('#roadmapProgressBar')) {
      $('#roadmapProgressBar').style.width = rp.pct + '%';
      $('#roadmapProgressLabel').textContent = `${rp.done} de ${rp.total} hitos alcanzados`;
      $('#roadmapProgressPct').textContent = rp.pct + '%';
    }

    // insights + recién digerido
    const bridges = window.WISDOM_BRIDGES.slice(0, 3);
    $('#idxInsights').innerHTML = bridges.map(b => `
      <button class="idx-insight-row" data-idx-tag="${b.tag}">
        <span class="idx-insight-tag">${esc(b.label)}</span>
        <span>${b.courses.map(c => `<i style="background:${(window.DIPLOMAS.find(d => d.code === c) || {}).color || '#5f7a4b'}"></i>`).join('')}</span>
        <b>${b.courses.length} cursos</b>
      </button>`).join('') + `<button class="idx-insight-more" data-nav="library">Ver todos los vínculos <span>→</span></button>`;
    $$('#idxInsights [data-idx-tag]').forEach(el => el.addEventListener('click', () => {
      app.libMode = 'files';
      navigate('library');
      setTimeout(() => {
        if ($('#libSearch')) $('#libSearch').value = el.dataset.idxTag;
        renderLibrary(); persist();
      }, 60);
    }));

    const recent = allResources().slice(-4).reverse();
    $('#idxRecentCount').textContent = recent.length;
    $('#idxRecent').innerHTML = recent.map(r => `
      <button class="idx-recent-row" data-idx-resource="${r.id}">
        <span class="idx-recent-icon">PDF</span>
        <span><b>${esc(r.title)}</b><small>${esc(r.diploma)} · ${esc(r.module)}</small></span>
        <em class="state-${r.state}">${libStateLabel(r.state)}</em>
      </button>`).join('');
    $$('#idxRecent [data-idx-resource]').forEach(el => el.addEventListener('click', () => navigate('library', { resourceId: Number(el.dataset.idxResource) })));

    const shortcuts = [
      ['sim', 'Simulador batch', 'S'], ['library', 'Biblioteca', 'B'], ['strains', 'Cepas', 'C'],
      ['oracle', 'Oráculo', 'O'], ['journal', 'Diario', 'D'], ['budget', 'Costos', '$'],
      ['process', 'Proceso', 'P'], ['roadmap', 'Roadmap', 'R']
    ];
    $('#idxShortcuts').innerHTML = shortcuts.map(([view, label, key]) =>
      `<button data-nav="${view}"><span>${label}</span><em>⌘${key}</em></button>`).join('');
    $$('#idxShortcuts [data-nav]').forEach(el => el.addEventListener('click', () => navigate(el.dataset.nav)));
  }

  function roadmapItems() {
    return (window.ROADMAP?.streams || []).flatMap(stream => stream.items.map(item => ({ ...item, stream })));
  }
  function roadmapProgress() {
    const items = roadmapItems();
    const done = items.filter(i => i.status === 'done').length;
    return { items, done, total: items.length, pct: items.length ? Math.round(done / items.length * 100) : 0 };
  }

  function phaseMessage() {
    const selected = game.plants[game.selected] || game.plants[0];
    if (!selected.alive) return 'Una planta ya cerró su ciclo. El resto sigue avanzando: mantené la rutina y revisá la madurez del resto.';
    if (selected.moisture < 24) return 'El sustrato de la planta seleccionada está seco. Regá con moderación y volvé a observar el drenaje.';
    if (selected.moisture > 82) return 'La maceta todavía está húmeda. Esperá antes de regar: el exceso de agua también estresa.';
    return dayPhase(game.day).focus[0];
  }

  /* ---------- simulador · benchmark batch ---------- */
  const BATCH_STRATEGIES = [
    { id: 'balanced', label: 'Equilibrada', ico: '◎', tone: 'lime', desc: 'Riego y nutrición por necesidad. Ventila cuando el ambiente lo pide.', waterAt: 32, feedAt: 30, premium: 0, stable: .9, stress: 0, stressEvery: 0, quality: 1, vent: true, harvestDay: 71 },
    { id: 'rapid', label: 'Rápida', ico: '⚡', tone: 'blue', desc: 'Ciclo corto y correcciones tempranas. Menos margen para recuperar errores.', waterAt: 40, feedAt: 38, premium: .08, stable: 1, stress: 0, stressEvery: 0, quality: .93, vent: true, harvestDay: 67 },
    { id: 'organic', label: 'Orgánica', ico: '❧', tone: 'green', desc: 'Insumos suaves y ambiente estable. Prioriza salud y calidad sobre velocidad.', waterAt: 28, feedAt: 24, premium: .02, stable: 1.2, stress: 0, stressEvery: 0, quality: 1.02, vent: true, harvestDay: 73 },
    { id: 'minimal', label: 'Mínima', ico: '−', tone: 'stone', desc: 'Bajo insumo. Ahorra costo operativo y asume más estrés biológico.', waterAt: 20, feedAt: 14, premium: -.16, stable: 1.7, stress: 1, stressEvery: 3, quality: .82, vent: false, harvestDay: 75 },
    { id: 'lowcost', label: 'Low-cost', ico: '$', tone: 'teal', desc: 'Optimiza cada peso. Riega y alimenta al límite bajo, con tolerancia al estrés.', waterAt: 22, feedAt: 16, premium: -.12, stable: 1.5, stress: 1, stressEvery: 2, quality: .88, vent: false, harvestDay: 75 },
    { id: 'intensive', label: 'Intensiva', ico: '＋', tone: 'amber', desc: 'Correcciones frecuentes. Busca el techo biológico pagando más costo.', waterAt: 48, feedAt: 48, premium: .18, stable: .6, stress: 0, stressEvery: 0, quality: 1.05, vent: true, harvestDay: 69 }
  ];

  function seededRandom(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function simulateBatch(strategy, seed = 7) {
    const cfg = BATCH_STRATEGIES.find(s => s.id === strategy) || BATCH_STRATEGIES[0];
    const plants = Array.from({ length: 9 }, (_, i) => ({
      id: i + 1, age: 1 + (i % 3), health: 88 + (i % 4) * 3,
      moisture: 46 + (i * 11) % 31, nutrition: 48 + (i * 7) % 28, alive: true
    }));

    // El clima se genera una sola vez por semilla: las seis estrategias enfrentan
    // exactamente el mismo escenario y solo cambian sus decisiones de manejo.
    const weather = [];
    const weatherRand = seededRandom(seed * 977 + 17);
    for (let d = 1; d <= 75; d++) {
      const temp = Math.max(21, Math.min(28, 24 + Math.sin(d / 8.5) * 2.2 + (weatherRand() - .5) * 1.4));
      const humidity = Math.max(45, Math.min(70, 58 + Math.sin(d / 6.5 + 1.2) * 5.5 + (weatherRand() - .5) * 3));
      weather.push({ temp, humidity });
    }
    const dropRand = seededRandom(seed * 613 + 29);
    const drops = plants.map(() => Array.from({ length: 76 }, () => 10 + dropRand() * 6));

    let temp = 24, humidity = 58, spent = 0, water = 15, nutrients = 7, energy = 88;
    let stressDays = 0, vpdAlerts = 0, harvests = 0, yieldG = 0;
    const events = [
      { day: 1, kind: 'start', title: 'Siembra · 9 autos', note: 'Sustrato hidratado, luz 18/6 y sensores en cero.' }
    ];

    for (let day = 1; day <= 75; day++) {
      temp = weather[day - 1].temp;
      humidity = weather[day - 1].humidity;
      energy = Math.max(0, energy - 2);
      spent += 4500 + (cfg.premium > 0 ? 1600 : cfg.premium < 0 ? -250 : 650);
      const svp = 0.6108 * Math.exp(17.27 * temp / (temp + 237.3));
      const vpd = svp * (1 - humidity / 100);
      if (vpd > 1.8 || vpd < 0.6) vpdAlerts++;

      plants.forEach((p, i) => {
        if (!p.alive) return;
        p.age++;
        p.moisture = Math.max(0, p.moisture - drops[i][day]);
        p.nutrition = Math.max(0, p.nutrition - 2.2);
        if (p.moisture < cfg.waterAt) { p.moisture = Math.min(88, p.moisture + 40); spent += 150; water = Math.max(0, water - 1); }
        if (p.nutrition < cfg.feedAt) { p.nutrition = Math.min(88, p.nutrition + 42); spent += 850; nutrients = Math.max(0, nutrients - 1); }
        let stress = 0;
        if (p.moisture < 16 || p.moisture > 93) stress += 6;
        if (p.nutrition < 10) stress += 4;
        if (temp > 29 || temp < 19) stress += 4;
        if (cfg.stress && cfg.stressEvery && day % cfg.stressEvery === 0) stress += cfg.stress;
        p.health = Math.max(0, Math.min(100, p.health + (stress ? -stress : 1)));
        if (p.health <= 0) p.alive = false;
      });

      if (energy < 10) energy = 80;
      if (cfg.vent && (temp > 27 || humidity > 69) && energy > 0) {
        temp -= 2; humidity -= 5; energy--; spent += 120;
      }
      if (day % 7 === 0) {
        const healthy = plants.filter(p => p.alive && p.health >= 50).length;
        if (healthy < 7) stressDays++;
      }

      if (day === 12) events.push({ day, kind: 'phase', title: 'Crecimiento', note: 'Raíces establecidas. Primer riego medido por peso de maceta.' });
      if (day === 18) events.push({ day, kind: 'event', title: 'Primer LST', note: 'Apertura suave de la canopia; se registra la respuesta a 48 h.' });
      if (day === 27) events.push({ day, kind: 'phase', title: 'Prefloración', note: 'La fórmula cambia a floración y la humedad baja hacia 58%.' });
      if (day === 34 && vpdAlerts > 3) events.push({ day, kind: 'alert', title: 'VPD fuera de rango', note: 'Tres lecturas seguidas por encima de 1,8 kPa. Se intensifica la ventilación.' });
      if (day === 37) events.push({ day, kind: 'phase', title: 'Floración', note: 'Cogollos visibles. Se prioriza estabilidad y prevención de botritis.' });
      if (day === 44 && cfg.id === 'intensive') events.push({ day, kind: 'event', title: 'Defoliación selectiva', note: 'Solo hojas que bloquean luz. La estrategia intensiva paga más insumos.' });
      if (day === 52) events.push({ day, kind: 'event', title: 'Pico de demanda', note: 'Consumo de agua máximo del batch. La reserva se repone a tiempo.' });
      if (day === 57) events.push({ day, kind: 'phase', title: 'Maduración', note: 'Tricomas lechosos. Se reduce riego y nutrición.' });
      if (day === 63) events.push({ day, kind: 'alert', title: 'Riesgo de botritis', note: 'Humedad alta en el interior de cogollos: sube la ventilación.' });
      if (day === 67) events.push({ day, kind: 'phase', title: 'Ventana de corte', note: 'Empieza la ventana de cosecha. Se revisa tricoma por planta.' });
    }

    const harvestDay = cfg.harvestDay || 75;
    plants.forEach(p => {
      if (!p.alive) return;
      harvests++;
      const q = Math.max(.4, Math.min(1.1, p.health / 88));
      yieldG += Math.round(55 * q * cfg.quality * (1 + Math.min(.06, (p.age - 67) * .002)));
    });
    // La cosecha se registra en el día de corte; el costo acumulado ya incluye el ciclo completo.
    events.push({ day: harvestDay, kind: 'harvest', title: `Cosecha · ${yieldG} g`, note: `${harvests} plantas cerraron el batch y se registró el peso por lote.` });
    events.push({ day: 75, kind: 'end', title: 'Cierre del batch', note: 'Se calcula costo por gramo, se archiva la corrida y se guardan aprendizajes.' });
    events.sort((a, b) => a.day - b.day);

    const alive = plants.filter(p => p.alive);
    const healthy = alive.filter(p => p.health >= 50).length;
    const avgH = alive.length ? Math.round(alive.reduce((n, p) => n + p.health, 0) / alive.length) : 0;
    const perGram = yieldG ? spent / yieldG : spent;
    const yieldScore = Math.min(100, Math.round(yieldG / (9 * 55) * 100));
    const costScore = Math.max(0, Math.min(100, Math.round((1800 - perGram) / 14)));
    const healthScore = Math.round(healthy / 9 * 100);
    const stablePenalty = Math.max(0, cfg.stable - .6) * 12;
    const stability = Math.max(0, Math.min(100, Math.round(100 - Math.min(50, vpdAlerts * 1.4) - stressDays / 75 * 60 - stablePenalty)));
    const score = Math.max(0, Math.min(100, Math.round(yieldScore * .35 + costScore * .25 + healthScore * .25 + stability * .15)));
    return {
      id: cfg.id, label: cfg.label, ico: cfg.ico, tone: cfg.tone, desc: cfg.desc,
      yield: yieldG, spent, perGram, healthy, harvests, alive: alive.length,
      avgHealth: avgH, score, yieldScore, costScore, healthScore, stability,
      stressDays, vpdAlerts, events, harvestDay,
      days: 75
    };
  }

  let batchCache = null;
  function currentBatch() {
    if (app.batch && Array.isArray(app.batch.runs)) return app.batch;
    if (!batchCache) {
      batchCache = { seed: 7, runs: BATCH_STRATEGIES.map(s => simulateBatch(s.id, 7)), sample: true };
    }
    return batchCache;
  }

  function renderBatch() {
    const batch = currentBatch();
    const runs = batch.runs;
    const best = [...runs].sort((a, b) => b.score - a.score)[0];
    $('#batchGrid').innerHTML = runs.map((r, i) => {
      const rank = [...runs].sort((a, b) => b.score - a.score).findIndex(x => x.id === r.id) + 1;
      return `<article class="batch-run ${r.id === best.id ? 'best' : ''}" style="--tone:${r.tone}">
        <div class="br-top">
          <span class="br-rank">#${rank}</span>
          <span class="br-label"><i>${r.ico}</i><b>${esc(r.label)}</b></span>
          <span class="br-score">${r.score}<small>SCORE</small></span>
        </div>
        <div class="br-bars">
          <div><span>Rendimiento</span><i><i style="width:${r.yieldScore}%"></i></i><b>${fmt(r.yield)} g</b></div>
          <div><span>Costo / g</span><i><i style="width:${r.costScore}%"></i></i><b>$${fmt(r.perGram)}</b></div>
          <div><span>Salud</span><i><i style="width:${r.healthScore}%"></i></i><b>${r.healthy}/9</b></div>
          <div><span>Estabilidad</span><i><i style="width:${r.stability}%"></i></i><b>${r.stability}%</b></div>
        </div>
        <div class="br-stats"><span><b>$${fmt(r.spent)}</b> costo</span><span><b>${r.harvests}</b> cosechas</span><span><b>${r.stressDays}</b> sem. estrés</span></div>
        <p class="br-desc">${esc(r.desc)}</p>
        <button class="br-use" data-use-strategy="${r.id}">Probar esta estrategia <span>→</span></button>
      </article>`;
    }).join('');

    const phases = [
      { name: 'Plántula', from: 1, to: 11 }, { name: 'Crecimiento', from: 12, to: 26 },
      { name: 'Prefloración', from: 27, to: 36 }, { name: 'Floración', from: 37, to: 56 },
      { name: 'Maduración', from: 57, to: 66 }, { name: 'Curado', from: 67, to: 75 }
    ];
    $('#timelapseTrack').innerHTML = `
      <div class="tl-phases">${phases.map(p => `<div class="tl-phase" style="--w:${(p.to - p.from + 1) / 75 * 100}%"><span>${p.name}</span><small>D${p.from}</small><i></i></div>`).join('')}</div>
      <div class="tl-markers">${best.events.map(e => `<button class="tl-marker ${e.kind}" style="left:${(e.day - 1) / 74 * 100}%" data-tl-event="${e.day}" title="Día ${e.day} · ${esc(e.title)}"><i></i><span>D${e.day}</span></button>`).join('')}</div>
      <div class="tl-playhead" id="tlPlayhead"></div>`;
    $('#timelapseEvents').innerHTML = best.events.map(e => `
      <button class="tl-event ${e.kind}" data-tl-event="${e.day}">
        <span class="tl-event-day">D${String(e.day).padStart(2, '0')}</span>
        <span class="tl-event-copy"><b>${esc(e.title)}</b><small>${esc(e.note)}</small></span>
      </button>`).join('');
    $$('[data-tl-event]').forEach(el => el.addEventListener('click', () => {
      const ev = best.events.find(e => String(e.day) === el.dataset.tlEvent);
      if (ev) showToast(`D${ev.day} · ${ev.title}: ${ev.note}`);
    }));
    $$('#batchGrid [data-use-strategy]').forEach(el => el.addEventListener('click', () => {
      quickStrategy = el.dataset.useStrategy;
      $$('#strategyList [data-strategy]').forEach(b => b.classList.toggle('active', b.dataset.strategy === quickStrategy));
      $('#quickModal')?.classList.add('open');
      showToast(`Estrategia ${BATCH_STRATEGIES.find(s => s.id === quickStrategy).label} cargada. Corré los 75 días para aplicarla.`);
    }));
    updateTimelapseProgress();
  }

  function updateTimelapseProgress() {
    const pct = Math.max(0, Math.min(100, (game.day - 1) / 74 * 100));
    const ph = $('#tlPlayhead');
    if (ph) ph.style.left = pct + '%';
    if ($('#timelapseTrack')) $('#timelapseTrack').style.setProperty('--day', pct + '%');
  }

  function runBatchBenchmark() {
    const seed = Math.floor(Math.random() * 90000) + 1000;
    app.batch = { seed, runs: BATCH_STRATEGIES.map(s => simulateBatch(s.id, seed)), sample: false, at: Date.now() };
    batchCache = app.batch;
    persist();
    renderBatch();
    const best = [...app.batch.runs].sort((a, b) => b.score - a.score)[0];
    showToast(`Benchmark listo: ${best.label} gana con ${best.score} pts · ${fmt(best.yield)} g · $${fmt(best.perGram)}/g.`);
  }

  function batchReplayMarkdown() {
    const batch = currentBatch();
    const runs = [...batch.runs].sort((a, b) => b.score - a.score);
    const best = runs[0];
    let txt = `# Verde — Replay de batch\n\n`;
    txt += `- Corrida: ${batch.sample ? 'demo del sistema' : 'personalizada'}\n- Semilla: ${batch.seed}\n- Fecha de exportación: ${new Date().toISOString().slice(0, 10)}\n`;
    txt += `- Duración: 75 días · 9 plantas · 15 m²\n- Score: rendimiento 35% · costo/g 25% · salud 25% · estabilidad 15%\n\n`;
    txt += `## Ranking de estrategias\n\n| # | Estrategia | Score | Rendimiento | Costo/g | Salud | Estabilidad |\n|---|---|---:|---:|---:|---:|---:|\n`;
    runs.forEach((r, i) => {
      txt += `| ${i + 1} | ${r.label} | ${r.score} | ${fmt(r.yield)} g | $${fmt(r.perGram)} | ${r.healthy}/9 | ${r.stability}% |\n`;
    });
    txt += `\n## Eventos de la mejor corrida · ${best.label}\n\n`;
    best.events.forEach(e => { txt += `- **D${e.day} · ${e.title}** — ${e.note}\n`; });
    txt += `\n## Supuestos\n\n- Riego y nutrición simulados por umbrales de la estrategia.\n- Costos operativos acumulados durante 75 días.\n- Resultado determinista para la semilla ${batch.seed}; no es una predicción agronómica.\n`;
    return txt;
  }

  function exportBatchReplay() {
    downloadText(`verde-batch-${currentBatch().seed}.md`, batchReplayMarkdown());
    showToast('Replay del batch exportado en Markdown.');
  }

  function exportBatchJson() {
    const batch = currentBatch();
    const payload = {
      app: 'Verde', kind: 'batch-replay', version: 'v2.7',
      exportedAt: new Date().toISOString(), seed: batch.seed, sample: !!batch.sample,
      assumptions: { plants: 9, areaM2: 15, days: 75, score: { yield: .35, costPerGram: .25, health: .25, stability: .15 } },
      runs: batch.runs
    };
    downloadText(`verde-batch-${batch.seed}.json`, JSON.stringify(payload, null, 2));
    showToast('Replay del batch exportado en JSON.');
  }

  function exportWisdomIndex() {
    const courses = window.DIPLOMAS.map(d => ({ ...d, ...courseStats(d.code), extras: extrasStats(d.code) }));
    let txt = `# Verde — Índice de sabiduría\n\n`;
    txt += `${allResources().length} PDFs · ${courses.length} cursos · ${libraryPct()}% de páginas digeridas\n\n`;
    txt += `> Curso → módulo → recurso. Cada entrada conserva ruta original, Markdown, hash y estado de digestión.\n\n`;
    courses.forEach(c => {
      txt += `## ${c.name} · ${c.pct}% digerido\n\n`;
      txt += `- ${c.list.length} PDFs · ${c.pages} páginas · ${c.md} en Markdown · extras ${c.extras.loaded}/${c.extras.total} (${c.extras.pct}%)\n\n`;
      const modules = [...new Set(c.list.map(r => r.module))];
      modules.forEach(m => {
        const rs = c.list.filter(r => r.module === m);
        const pages = rs.reduce((n, r) => n + (r.pages || 0), 0);
        const loaded = rs.reduce((n, r) => n + (r.pages || 0) * resourceProgress(r) / 100, 0);
        txt += `### ${m} · ${pages ? Math.round(loaded / pages * 100) : 0}%\n\n`;
        rs.forEach(r => {
          txt += `- [${libStateLabel(r.state)}] **${r.title}** — ${r.pages} pp · ${r.year}\n`;
          txt += `  - Markdown: \`${mdPath(r)}\`\n  - Hash: \`${mdHash(r)}\` · origen: \`${r.path}\`\n`;
          txt += `  - Etiquetas: ${(r.tags || []).join(', ') || 'sin etiquetas'}\n`;
        });
        txt += '\n';
      });
    });
    txt += `## Vínculos que generan insights\n\n`;
    (window.WISDOM_BRIDGES || []).forEach(b => { txt += `- **${b.tag}** — ${b.note}\n`; });
    downloadText('verde-indice-sabiduria.md', txt);
    showToast('Índice de sabiduría exportado en Markdown.');
  }

  let timelapseTimer = null;
  function toggleTimelapse() {
    const btn = $('#timelapseBtn');
    if (timelapseTimer) {
      clearInterval(timelapseTimer); timelapseTimer = null;
      if (btn) { btn.classList.remove('playing'); btn.innerHTML = '<span class="tl-ico">▶</span> Timelapse'; }
      showToast('Timelapse pausado.');
      return;
    }
    if (game.finished || game.day >= 75) { showToast('El batch ya está cerrado. Reiniciá la temporada para verlo de nuevo.'); return; }
    if (btn) { btn.classList.add('playing'); btn.innerHTML = '<span class="tl-ico">❚❚</span> Pausar'; }
    showToast('Timelapse en marcha · 75 días en ~8 s.');
    timelapseTimer = setInterval(() => {
      if (game.finished || game.day >= 75) {
        clearInterval(timelapseTimer); timelapseTimer = null;
        if (btn) { btn.classList.remove('playing'); btn.innerHTML = '<span class="tl-ico">▶</span> Timelapse'; }
        showToast('Batch completo. Revisá el resultado y compará estrategias.');
        return;
      }
      advance(true);
      renderBatch();
    }, 105);
  }

  /* ---------- simulador · elegir cepa + configurar + SIMULAR ---------- */
  const SIM_GRADES = [
    { id: 'horrible', label: 'Horrible', min: 0, color: '#e08a72', hint: 'Pérdidas o costo impagable' },
    { id: 'regular', label: 'Regular', min: 35, color: '#e8b56a', hint: 'Se salva, mucho estrés' },
    { id: 'buena', label: 'Buena', min: 55, color: '#a9c98c', hint: 'Ciclo sólido y repetible' },
    { id: 'muybuena', label: 'Muy buena', min: 72, color: '#8fce59', hint: 'Rendimiento + salud' },
    { id: 'excelente', label: 'Excelente', min: 86, color: '#d8f26b', hint: 'Techo del batch' }
  ];
  const gradeFor = (score) => [...SIM_GRADES].reverse().find(g => score >= g.min) || SIM_GRADES[0];
  let simStrategyId = 'balanced';
  let simResult = null;
  let simScenarios = [];
  const SIM_SCENARIO_LABELS = ['Resultado alto', 'Alto-medio', 'Central', 'Bajo-medio', 'Resultado bajo'];

  const simConfigFromUI = () => ({
    strainId: $('#simStrain')?.value || window.STRAINS[0]?.id,
    plants: Math.max(1, Math.min(9, Number($('#simPlants')?.value || 9))),
    days: Math.max(55, Math.min(90, Number($('#simDays')?.value || 75))),
    light: Math.max(12, Math.min(24, Number($('#simLight')?.value || 18))),
    temp: Math.max(18, Math.min(32, Number($('#simTemp')?.value || 24))),
    strategy: simStrategyId
  });

  function renderSimConfig() {
    const sel = $('#simStrain');
    if (!sel) return;
    const ordered = [...window.STRAINS].sort((a, b) => {
      const ca = CAT_ORDER[strainCategory(a)], cb = CAT_ORDER[strainCategory(b)];
      return ca - cb || a.name.localeCompare(b.name, 'es');
    });
    const current = app.sim?.strainId || sel.value || ordered[0].id;
    sel.innerHTML = ordered.map(st => `<option value="${st.id}">${esc(st.name)} · ${esc(CAT_LABEL[strainCategory(st)])} · ${st.flower}d · ${st.yield}g/planta</option>`).join('');
    sel.value = current;
    const st = window.STRAINS.find(x => x.id === sel.value) || ordered[0];
    const meta = $('#simStrainMeta');
    if (meta && st) meta.textContent = `${CAT_LABEL[strainCategory(st)]} · ${st.flower} días de floración · ${st.yield} g/planta · ${st.thc}% THC · fuente: ${st.source || 'StrainAPI V1'}`;

    const row = $('#simStrategyRow');
    if (row) {
      row.innerHTML = BATCH_STRATEGIES.map(s => `
        <button class="sim-strategy ${s.id === simStrategyId ? 'active' : ''}" type="button" data-strategy="${s.id}" role="radio" aria-checked="${s.id === simStrategyId}">
          <i>${s.ico}</i><b>${esc(s.label)}</b><small>${esc(s.desc)}</small>
        </button>`).join('');
      $$('#simStrategyRow [data-strategy]').forEach(b => b.addEventListener('click', () => {
        simStrategyId = b.dataset.strategy;
        renderSimConfig();
      }));
    }
    const grades = $('#simGrades');
    if (grades && !grades.dataset.bound) {
      grades.dataset.bound = '1';
      grades.innerHTML = SIM_GRADES.map(g => `<span class="sim-grade" style="--gc:${g.color}"><b>${esc(g.label)}</b><small>${g.min}+ pts</small></span>`).join('') + `<span class="sim-grades-note">Elegís <b>cepa + estrategia + ambiente</b>. El motor simula <b>todos los días</b> y calcula rendimiento.</span>`;
    }
    if (simResult) renderSimResult(simResult);
  }

  function simulateFull(cfg, seedOffset = 0) {
    const st = window.STRAINS.find(x => x.id === cfg.strainId) || window.STRAINS[0];
    const strat = BATCH_STRATEGIES.find(s => s.id === cfg.strategy) || BATCH_STRATEGIES[0];
    const days = cfg.days;
    const baseYieldPerPlant = st.yield || 85;
    const cycleFactor = Math.max(.7, Math.min(1.15, cfg.days / (st.flower + 5)));
    const lightFactor = Math.max(.78, Math.min(1.12, cfg.light / 18));
    const tempPenalty = Math.max(0, Math.abs(cfg.temp - 24) - 2) * 1.1;
    const rand = seededRandom((cfg.strainId.charCodeAt(0) || 7) * 131 + days * 17 + cfg.plants * 911 + (cfg.strategy === 'balanced' ? 7 : cfg.strategy.length * 31) + seedOffset);
    const growth = [], healthS = [], moistureS = [], nutritionS = [], yieldS = [];
    let health = 92, moisture = 58, nutrition = 55, stressDays = 0;
    for (let d = 1; d <= days; d++) {
      const phaseT = d / days;
      const logistic = 100 / (1 + Math.exp(-(d - days * 0.52) / (days * 0.16)));
      growth.push(Math.round(Math.min(100, Math.max(4, logistic + (rand() - .5) * 3))));
      moisture = Math.max(18, Math.min(88, moisture - 11 + rand() * 5 + (strat.waterAt > 30 ? 4 : 0)));
      if (moisture < strat.waterAt) moisture = Math.min(88, moisture + 34);
      nutrition = Math.max(15, Math.min(90, nutrition - 2.1 + rand() * 2 + (strat.feedAt > 30 ? 3 : 0)));
      if (nutrition < strat.feedAt) nutrition = Math.min(90, nutrition + 30);
      let stress = 0;
      if (moisture < 22 || moisture > 84) stress += 5;
      if (nutrition < 18) stress += 4;
      if (tempPenalty > 2) stress += Math.min(4, tempPenalty / 2);
      // Variación sintética entre corridas para enseñar sensibilidad; no es una tasa empírica.
      if (rand() < 0.08) stress += 3 + rand() * 5;
      if (strat.stress && d % (strat.stressEvery || 3) === 0) stress += strat.stress;
      health = Math.max(15, Math.min(99, health + (stress ? -stress : 0.55)));
      if (stress) stressDays++;
      if (d % 7 === 0 && health < 55) stressDays++;
      healthS.push(Math.round(health));
      moistureS.push(Math.round(moisture));
      nutritionS.push(Math.round(nutrition));
      const frac = Math.max(0, Math.min(1, (d - 1) / Math.max(1, days - 1)));
      yieldS.push(Math.round(baseYieldPerPlant * cfg.plants * cycleFactor * lightFactor * (health / 92) * Math.pow(frac, 1.6)));
    }
    const yieldG = yieldS[yieldS.length - 1] || 0;
    const potential = Math.round(baseYieldPerPlant * cfg.plants * cycleFactor * lightFactor);
    const yieldScore = potential ? Math.min(100, Math.round(yieldG / potential * 100)) : 0;
    const avgHealth = Math.round(healthS.reduce((a, b) => a + b, 0) / healthS.length);
    const healthScore = Math.max(0, Math.min(100, Math.round(avgHealth)));
    const stability = Math.max(0, Math.min(100, 100 - stressDays * 2.2 - tempPenalty * 3));
    const spentDaily = 4500 * (cfg.light / 18) + (strat.premium > 0 ? 1600 : strat.premium < 0 ? -250 : 650);
    const spent = Math.round(spentDaily * days + cfg.plants * 1200);
    const perGram = yieldG ? Math.round(spent / yieldG) : spent;
    const costScore = Math.max(0, Math.min(100, Math.round((2200 - perGram) / 16)));
    const score = Math.max(0, Math.min(100, Math.round(yieldScore * .4 + costScore * .2 + healthScore * .25 + stability * .15)));
    const grade = gradeFor(score);
    const activities = [
      { day: 1, phase: 'Siembra', title: 'Germinación y siembra', detail: `Hidratar sustrato, ${cfg.light} h luz, ${cfg.temp} °C media.`, done: true },
      { day: 3, phase: 'Plántula', title: 'Primer riego medido', detail: 'Riego por peso de maceta; evitar encharcar.', done: strat.waterAt >= 24 },
      { day: 12, phase: 'Crecimiento', title: 'Raíces y estructura', detail: 'Media dosis NPK; revisar distancia y PPFD.', done: true },
      { day: 18, phase: 'Crecimiento', title: 'Primer LST', detail: 'Apertura suave de canopia; registrar respuesta a 48 h.', done: strat.id !== 'minimal' },
      { day: 27, phase: 'Prefloración', title: 'Cambio a fórmula floración', detail: 'Bajar humedad hacia 58%; ajustar P/K.', done: true },
      { day: 37, phase: 'Floración', title: 'Floración y ventilación', detail: 'Rutina de ventilación y prevención de botritis.', done: !!strat.vent },
      { day: 44, phase: 'Floración', title: 'Defoliación selectiva', detail: 'Solo hojas que bloquean luz.', done: strat.id === 'intensive' },
      { day: 52, phase: 'Floración', title: 'Pico de demanda hídrica', detail: 'Consumo máximo; reponer reserva a tiempo.', done: strat.waterAt >= 22 },
      { day: 57, phase: 'Maduración', title: 'Tricomas y reducción', detail: 'Bajar riego y nutrición; preparar secado.', done: true },
      { day: 63, phase: 'Maduración', title: 'Control de botritis', detail: 'Revisar cogollos internos; subir ventilación.', done: !!strat.vent },
      { day: Math.min(days, Math.round(days * 0.9)), phase: 'Cosecha', title: `Corte · ${fmt(yieldG)} g`, detail: `${cfg.plants} plantas · ${fmt(perGram)} $/g · ${grade.label} (${score} pts).`, done: true },
      { day: days, phase: 'Curado', title: 'Secado y curado', detail: 'Secado lento 7–10 días; curado con aireación diaria.', done: true }
    ].filter(a => a.day <= days).sort((a, b) => a.day - b.day);
    const yieldPct = yieldS.map(v => potential ? Math.round(v / potential * 100) : 0);
    return { cfg, strain: st, strategy: strat, days, growth, health: healthS, moisture: moistureS, nutrition: nutritionS, yield: yieldS, yieldPct, yieldG, potential, spent, perGram, score, grade, activities, stressDays, stability };
  }

  const SIM_SERIES = [
    { id: 'growth', label: 'Crecimiento', color: '#d8f26b', shape: 'circle', unit: '%' },
    { id: 'health', label: 'Salud', color: '#7fe0b2', shape: 'square', unit: '%' },
    { id: 'moisture', label: 'Humedad sustrato', color: '#8fb8d8', shape: 'triangle', unit: '%' },
    { id: 'nutrition', label: 'Nutrición', color: '#e8b56a', shape: 'diamond', unit: '%' },
    { id: 'yieldPct', label: 'Rendimiento % potencial', color: '#e58ac0', shape: 'cross', unit: '%' }
  ];

  function linePoints(values, w, h, padL, padB, yMax) {
    const n = values.length;
    if (!n) return '';
    return values.map((v, i) => {
      const x = padL + (w - padL - 10) * (i / Math.max(1, n - 1));
      const y = h - padB - (h - padB - 14) * (v / yMax);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  function markerSVG(shape, x, y, color) {
    const s = 4;
    if (shape === 'circle') return `<circle cx="${x}" cy="${y}" r="${s}" fill="${color}" stroke="#0a0c07" stroke-width="1.2"/>`;
    if (shape === 'triangle') return `<path d="M ${x} ${y - s} L ${x + s} ${y + s} L ${x - s} ${y + s} Z" fill="${color}" stroke="#0a0c07" stroke-width="1.2"/>`;
    if (shape === 'square') return `<rect x="${x - s}" y="${y - s}" width="${s * 2}" height="${s * 2}" fill="${color}" stroke="#0a0c07" stroke-width="1.2"/>`;
    if (shape === 'diamond') return `<path d="M ${x} ${y - s} L ${x + s} ${y} L ${x} ${y + s} L ${x - s} ${y} Z" fill="${color}" stroke="#0a0c07" stroke-width="1.2"/>`;
    return `<g stroke="${color}" stroke-width="2.4"><line x1="${x - s}" y1="${y - s}" x2="${x + s}" y2="${y + s}"/><line x1="${x + s}" y1="${y - s}" x2="${x - s}" y2="${y + s}"/></g>`;
  }

  function renderSimResult(result) {
    simResult = result;
    const box = $('#simResults');
    if (!box) return;
    box.hidden = false;
    const { cfg, strain, strategy, grade, score, yieldG, perGram, spent, stressDays, activities, days } = result;
    $('#simResultTitle').textContent = `${strain.name} · ${strategy.label} · ${grade.label}`;
    $('#simChartTitle').textContent = `Rendimiento del batch · ${strain.name}`;
    $('#simChartCaption').textContent = `Días desde el inicio (0–${days}) · ${cfg.plants} plantas · ${cfg.light} h luz/${cfg.temp} °C`;
    $('#simResultStats').innerHTML = `
      <span class="sim-stat grade" style="--gc:${grade.color}"><b>${grade.label}</b><small>${score} / 100 pts</small></span>
      <span class="sim-stat"><b>${fmt(yieldG)} g</b><small>rendimiento</small></span>
      <span class="sim-stat"><b>$${fmt(perGram)}</b><small>por gramo</small></span>
      <span class="sim-stat"><b>$${fmt(spent)}</b><small>costo total</small></span>
      <span class="sim-stat"><b>${stressDays}</b><small>días de estrés</small></span>`;

    const compare = $('#simScenarioCompare');
    if (compare && simScenarios.length) {
      compare.innerHTML = `
        <div class="sim-scenarios-head"><div><span class="section-kicker">CINCO CORRIDAS · MISMA CONFIGURACIÓN</span><h3>Compará resultados posibles</h3></div><p>Variaciones diarias sintéticas del modelo, ordenadas por puntaje. Son estimaciones ilustrativas, no predicciones, probabilidades ni intervalos de confianza.</p></div>
        <div class="sim-scenario-grid" role="group" aria-label="Elegir escenario estimado">
          ${simScenarios.map((scenario, i) => `
            <button type="button" class="sim-scenario-card ${scenario === result ? 'active' : ''}" data-scenario="${i}" aria-pressed="${scenario === result}">
              <span class="sim-scenario-rank">${esc(scenario.label)}</span>
              <b>${fmt(scenario.yieldG)} <small>g</small></b>
              <span class="sim-scenario-meta">${esc(scenario.grade.label)} · ${scenario.score} pts</span>
              <span class="sim-scenario-meta">$${fmt(scenario.perGram)}/g · ${scenario.stressDays} días estrés</span>
            </button>`).join('')}
        </div>`;
      $$('#simScenarioCompare [data-scenario]').forEach(button => button.addEventListener('click', () => {
        const selected = simScenarios[Number(button.dataset.scenario)];
        if (selected) renderSimResult(selected);
      }));
    }

    const list = $('#simSeriesList');
    if (list) {
      list.innerHTML = SIM_SERIES.map(s => `
        <label class="sim-series-row" style="--sc:${s.color}">
          <input type="checkbox" data-series="${s.id}" ${app.simSeries[s.id] ? 'checked' : ''} />
          <span class="sim-series-swatch" aria-hidden="true">${s.shape === 'circle' ? '●' : s.shape === 'triangle' ? '▲' : s.shape === 'square' ? '■' : s.shape === 'diamond' ? '◆' : '✚'}</span>
          <span><b>${esc(s.label)}</b><small>${s.id === 'yieldPct' ? `${fmt(yieldG)} g final · ${result.yieldPct[result.yieldPct.length - 1] || 0}%` : '0–100%'}</small></span>
        </label>`).join('');
      $$('#simSeriesList [data-series]').forEach(cb => cb.addEventListener('change', () => {
        app.simSeries[cb.dataset.series] = cb.checked;
        persist();
        renderSimChart(result);
      }));
    }
    renderSimChart(result);

    const proc = $('#simProcess');
    if (proc) {
      proc.innerHTML = activities.map(a => `
        <li class="sim-step ${a.done ? 'done' : 'skipped'}">
          <span class="sim-step-day">D${String(a.day).padStart(2, '0')}</span>
          <span class="sim-step-phase">${esc(a.phase)}</span>
          <div class="sim-step-copy"><b>${esc(a.title)}</b><small>${esc(a.detail)}</small></div>
          <span class="sim-step-state">${a.done ? '✓ prevista' : '— omitida'}</span>
        </li>`).join('');
    }
  }

  function renderSimChart(result) {
    const wrap = $('#simChartWrap');
    if (!wrap || !result) return;
    const vis = SIM_SERIES.filter(s => app.simSeries[s.id]);
    const w = 760, h = 380, padL = 44, padB = 34;
    const yMax = 100;
    const xTicks = [0, .25, .5, .75, 1].map(f => Math.round(result.days * f));
    const yTicks = [0, .25, .5, .75, 1].map(f => Math.round(yMax * f));
    const grid = yTicks.map(v => {
      const y = h - padB - (h - padB - 14) * (v / yMax);
      return `<line x1="${padL}" y1="${y}" x2="${w - 10}" y2="${y}" stroke="rgba(235,241,214,.08)"/><text x="${padL - 8}" y="${y + 4}" text-anchor="end" fill="#7c866d" font-size="10">${v}</text>`;
    }).join('');
    const xt = xTicks.map(d => {
      const x = padL + (w - padL - 10) * (d / result.days);
      return `<line x1="${x}" y1="12" x2="${x}" y2="${h - padB}" stroke="rgba(235,241,214,.06)"/><text x="${x}" y="${h - 12}" text-anchor="middle" fill="#7c866d" font-size="10">${d}</text>`;
    }).join('');
    const lines = vis.map(s => {
      const values = result[s.id] || [];
      const pts = linePoints(values, w, h, padL, padB, yMax);
      const sampleIdx = values.map((_, i) => i).filter(i => i % Math.ceil(values.length / 12) === 0);
      const markers = sampleIdx.map(i => {
        const x = padL + (w - padL - 10) * (i / Math.max(1, values.length - 1));
        const y = h - padB - (h - padB - 14) * (values[i] / yMax);
        return markerSVG(s.shape, x, y, s.color);
      }).join('');
      return `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>${markers}`;
    }).join('');
    const legend = vis.map(s => `
      <div class="sim-legend-row" style="--sc:${s.color}">
        <span class="sim-legend-mark" aria-hidden="true">${s.shape === 'circle' ? '●' : s.shape === 'triangle' ? '▲' : s.shape === 'square' ? '■' : s.shape === 'diamond' ? '◆' : '✚'}</span>
        <span>${esc(s.label)}</span>
      </div>`).join('') || '<p class="sim-chart-empty">Sin series visibles. Activá al menos una serie a la izquierda.</p>';
    wrap.innerHTML = `
      <div class="sim-chart-flex">
        <svg class="sim-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Timechart del batch">
          ${grid}${xt}${lines}
          <line x1="${padL}" y1="${h - padB}" x2="${w - 10}" y2="${h - padB}" stroke="rgba(235,241,214,.25)"/>
          <line x1="${padL}" y1="12" x2="${padL}" y2="${h - padB}" stroke="rgba(235,241,214,.25)"/>
          <text x="${(w + padL) / 2}" y="${h - 1}" text-anchor="middle" fill="#8b947e" font-size="11">Días desde el inicio</text>
          <text x="12" y="${h / 2}" text-anchor="middle" fill="#8b947e" font-size="11" transform="rotate(-90 12 ${h / 2})">% (0–100)</text>
        </svg>
        <div class="sim-chart-legend">${legend}</div>
      </div>`;
  }

  function runFullSimulation() {
    const cfg = simConfigFromUI();
    app.sim = cfg;
    persist();
    const seedOffsets = [11, 29, 47, 73, 101];
    simScenarios = seedOffsets.map(offset => simulateFull(cfg, offset))
      .sort((a, b) => b.score - a.score || b.yieldG - a.yieldG)
      .map((scenario, i) => ({ ...scenario, label: SIM_SCENARIO_LABELS[i] }));
    renderSimResult(simScenarios[2]);
    showToast(`Simulación lista: 5 escenarios estimados para ${simScenarios[2].strain.name} · ${simScenarios[2].strategy.label}.`);
    const box = $('#simResults');
    if (box) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      : 'Revisá el sustrato antes de regar. Para una corrida completa usá SIMULAR arriba.';
    renderSimConfig();
    renderBatch();
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

  function advance(silent = false) {
    if (game.finished) { if (!silent) showToast('La temporada terminó. Podés reiniciar desde el resumen.'); return; }
    if (game.day >= 75) { game.finished = true; if (!silent) showToast('Día 75: temporada cerrada. Revisá tu cosecha.'); saveAndRefresh(); return; }
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
    if (!silent) showToast(`Día ${game.day}: ${game.day >= 67 ? 'revisá la madurez de tus plantas.' : 'el cultivo ha crecido.'}`);
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
    const cat = strainCategory(st);
    return `<article class="strain-card cat-${cat}" data-strain="${st.id}" tabindex="0" role="button" aria-label="Ver ficha de ${esc(st.name)}">
      <div class="strain-card-media">
        <img src="${st.image}" alt="${esc(st.name)}" loading="lazy" />
        <div class="strain-card-badges"><span class="strain-badge thc">${st.thc}% THC</span><span class="strain-badge cat">${esc(CAT_LABEL[cat])}</span></div>
        <div class="strain-card-name"><b>${esc(st.name)}</b><small>${esc(st.type)} · ${st.flower} días</small></div>
      </div>
      <div class="strain-card-body">
        <div class="strain-effects">${st.effects.slice(0, 2).map(e => `<span>${esc(e)}</span>`).join('')}</div>
        <div class="strain-source-tag" title="${esc(st.source || '')}"><span>Fonte</span>${esc((st.source || 'StrainAPI V1').split('·')[0].trim())}</div>
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

  const CAT_ORDER = { sativa: 0, indica: 1, cbd: 2, hibrida: 3 };
  const CAT_LABEL = { sativa: 'Sativa', indica: 'Indica', cbd: 'CBD', hibrida: 'Híbrida' };
  const strainCategory = (st) => st.category || (st.cbd >= 1.0 ? 'cbd' : 'hibrida');

  const STRAIN_SOURCES = [
    { name: 'StrainAPI V1', key: 'Sin API key · solo lectura', url: 'https://www.strainapi.com/docs/', endpoints: 'GET /wp-json/strainapi/v1/strains · /strains/{slug} · /search?q=', fields: 'genetics, breeder, type, thc {min,max}, cbd, terpenes, flowering, effects, flavor/aroma', note: '495 cepas publicadas; paginado hasta 100; CORS público. No inventa datos faltantes (null/[]).' },
    { name: 'TheCannabisInformer API beta', key: 'Sin API key · solo lectura', url: 'https://thecannabisinformer.com/api/', endpoints: 'GET /api/v1/strains.json · /strains/{slug}.json · /catalogs.json', fields: 'type, parentage, effects/aromas reportados, chemistry por muestra, flowering/full-cycle, sources', note: '50 perfiles curados con revisión de dataset. Conservar enlaces y calificaciones; atribuir y enlazar a la guía.' },
    { name: 'Strainpedia API', key: 'Paga · x-api-key ($50/mes)', url: 'https://www.strainpedia.com/api/', endpoints: 'Demo sin key: /wp-json/strainpedia/v1/demo/{slug} · Completo: /strains, /search, /strain/{slug}, /compare', fields: 'type, genetics, thc_range/cbd_range, terpenes, effects, flavors, flowering, difficulty, yield', note: 'Verde usa solo la demo pública (5 cepas) sin guardar keys. Completo exige atribución visible y prohíbe re-exportar la base.' },
    { name: 'Otreeba (referencia, no integrada)', key: 'Requiere API key', url: 'https://publicapis.io/otreeba-api', endpoints: 'Catálogo de semilleras/cepas/marcas', fields: 'semilla, breeder, producto, retailer, estudios', note: 'Registrada para evaluación futura; no se usa por defecto ni se guarda ninguna key.' }
  ];

  let strainCatFilter = 'all';

  function renderStrainSources() {
    const el = $('#strainSources');
    if (!el) return;
    el.innerHTML = `
      <div class="strain-sources-head">
        <div>
          <span class="section-kicker">FUENTES DE DATOS · ANOTADAS</span>
          <h3>De dónde sale la data <em>del catálogo.</em></h3>
          <p>Cada ficha muestra su fuente en la tarjeta y en el detalle. Sin keys guardadas: se documenta qué endpoint se usaría y qué exige cada servicio.</p>
        </div>
        <span class="strain-sources-note">Verde no guarda API keys. StrainAPI e Informer son gratuitas sin key; Strainpedia es paga y solo se usa su demo pública.</span>
      </div>
      <div class="strain-sources-grid">
        ${STRAIN_SOURCES.map(s => `
          <article class="strain-source-card">
            <div class="strain-source-top"><b>${esc(s.name)}</b><span>${esc(s.key)}</span></div>
            <p>${esc(s.note)}</p>
            <code>${esc(s.endpoints)}</code>
            <small>${esc(s.fields)}</small>
            <a href="${s.url}" target="_blank" rel="noopener">Docs oficiales ↗</a>
          </article>`).join('')}
      </div>`;
  }

  function renderStrainCatTabs() {
    const tabs = $('#strainCatTabs');
    if (!tabs) return;
    const counts = {};
    window.STRAINS.forEach(st => { counts[strainCategory(st)] = (counts[strainCategory(st)] || 0) + 1; });
    const cats = ['all', 'sativa', 'indica', 'cbd', 'hibrida'];
    tabs.innerHTML = cats.map(c => {
      const label = c === 'all' ? 'Todas' : CAT_LABEL[c];
      const n = c === 'all' ? window.STRAINS.length : (counts[c] || 0);
      return `<button class="strain-cat-tab ${strainCatFilter === c ? 'active' : ''}" data-cat="${c}" type="button"><b>${label}</b><small>${n}</small></button>`;
    }).join('');
    $$('#strainCatTabs [data-cat]').forEach(b => b.addEventListener('click', () => {
      strainCatFilter = b.dataset.cat;
      const sel = $('#strainCategory');
      if (sel) sel.value = strainCatFilter;
      filterStrains();
    }));
  }

  function filterStrains() {
    const q = norm($('#strainSearch')?.value || '');
    const catSel = $('#strainCategory');
    if (catSel && norm(catSel.value) !== norm(strainCatFilter)) strainCatFilter = catSel.value || 'all';
    const diff = $('#strainDifficulty')?.value || 'all';
    const effect = $('#strainEffect')?.value || 'all';
    const sort = $('#strainSort')?.value || 'cat';
    let list = window.STRAINS.filter(st => {
      const hay = norm([st.name, st.summary, st.flavor, st.tags.join(' '), st.effects.join(' '), st.terpenes.map(t => t.n).join(' '), strainCategory(st), st.source || ''].join(' '));
      return (!q || hay.includes(q)) && (strainCatFilter === 'all' || strainCategory(st) === strainCatFilter) && (diff === 'all' || st.difficulty === diff) && (effect === 'all' || st.effects.includes(effect));
    });
    list.sort((a, b) => {
      const ca = CAT_ORDER[strainCategory(a)], cb = CAT_ORDER[strainCategory(b)];
      if (sort === 'cat') return ca - cb || b.thc - a.thc || a.name.localeCompare(b.name, 'es');
      if (sort === 'thc') return b.thc - a.thc;
      if (sort === 'fast') return a.flower - b.flower;
      if (sort === 'yield') return b.yield - a.yield;
      return a.name.localeCompare(b.name, 'es');
    });
    $('#strainCount').textContent = `${list.length} ${list.length === 1 ? 'cepa' : 'cepas'} · ordenadas por Sativa · Indica · CBD`;
    $('#strainGrid').innerHTML = list.map(strainCardHTML).join('') || `<div class="lib-empty" style="grid-column:1/-1"><b>Sin cepas para ese filtro.</b><p>Probá con otra categoría, efecto o término de búsqueda.</p></div>`;
    bindStrainCards('#strainGrid');
    renderStrainCatTabs();
  }

  function renderStrains() {
    renderNav();
    const st = window.STRAINS[0];
    const cat = strainCategory(st);
    $('#strainFeatured').innerHTML = `<img src="${st.image}" alt="${esc(st.name)}" />
      <div class="strain-featured-copy">
        <div class="strain-featured-tags"><span>DESTACADA</span><span class="ghost">${esc(CAT_LABEL[cat])}</span><span class="ghost">${esc(st.difficulty)}</span></div>
        <h2>${esc(st.name.replace(' Auto', ''))} <em>Auto.</em></h2>
        <p>${esc(st.summary)}</p>
        <div class="strain-featured-stats">
          <span><b>${st.thc}%</b>THC</span><span><b>${st.cbd}%</b>CBD</span><span><b>${st.flower}</b>días de floración</span><span><b>${st.yield} g</b>por planta</span>
        </div>
        <p class="strain-featured-source"><span>FUENTE</span>${esc(st.source || 'StrainAPI V1')}</p>
        <div class="strain-featured-actions"><button class="btn btn-lime" data-strain-open="${st.id}">Ver ficha completa</button><button class="btn btn-glass" data-ask="¿Qué cuidados necesita una autofloreciente ${esc(st.name)}?">Preguntar al oráculo <span>◈</span></button></div>
      </div>`;

    const effects = [...new Set(window.STRAINS.flatMap(x => x.effects))].sort((a, b) => a.localeCompare(b, 'es'));
    const sel = $('#strainEffect');
    if (sel && sel.options.length <= 1) sel.innerHTML = '<option value="all">Todo efecto</option>' + effects.map(e => `<option>${esc(e)}</option>`).join('');
    filterStrains();
    renderStrainSources();

    const featuredBtn = $('#strainFeatured [data-strain-open]');
    if (featuredBtn) featuredBtn.addEventListener('click', () => openStrainSheet(featuredBtn.dataset.strainOpen));
  }

  function bindStrains() {
    ['strainSearch', 'strainDifficulty', 'strainEffect', 'strainSort', 'strainCategory'].forEach(id => {
      const el = $('#' + id);
      if (!el) return;
      el.addEventListener(id === 'strainSearch' ? 'input' : 'change', () => {
        if (id === 'strainCategory') strainCatFilter = el.value || 'all';
        filterStrains();
      });
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

  /* ---------- biblioteca · vista digerida ---------- */
  function renderLibraryDigest() {
    const courses = window.DIPLOMAS.map(d => ({ ...d, ...courseStats(d.code), extras: extrasStats(d.code) }));
    const totalPct = libraryPct();
    $('#libProcessedPct').textContent = 'MD · ' + totalPct + '%';
    const mdCount0 = allResources().filter(r => r.state === 'markdown').length;
    const metaCount0 = allResources().filter(r => r.module && r.year && (r.tags || []).length).length;
    $('#digestQuickStats').innerHTML = `
      <span><b>${allResources().length}</b> PDFs</span>
      <span><b>${window.DIPLOMAS.length}</b> cursos</span>
      <span><b>${mdCount0}</b> MD listos</span>
      <span><b>${allResources().length - mdCount0}</b> pendientes</span>
      <span><b>${metaCount0}/${allResources().length}</b> metadata</span>
      <span><b>${window.WISDOM_BRIDGES.length}</b> vínculos</span>`;

    $('#libPipeline').innerHTML = `
      <div class="pipeline-head"><span class="section-kicker">PIPELINE DOCUMENTAL</span><b>${totalPct}% <small>digerido</small></b></div>
      ${window.LIBRARY_PIPELINE.map(st => `
        <div class="pipeline-row">
          <span class="pr-name">${esc(st.name)}<small>${esc(st.note)}</small></span>
          <i class="pr-bar"><i style="width:${st.pct}%"></i></i>
          <b>${st.pct}%</b>
        </div>`).join('')}`;

    $('#libCourseGrid').innerHTML = courses.map(c => `
      <article class="lib-course-card" style="--cc:${c.color}">
        <div class="lcc-top">
          <span class="lcc-code">${esc(c.code)}</span>
          <span class="lcc-state">${c.pct >= 60 ? 'DIGERIDO' : c.pct >= 30 ? 'EN PROCESO' : 'PENDIENTE'}</span>
        </div>
        <h3>${esc(c.name)}</h3>
        <p class="lcc-meta">${c.list.length} PDFs · ${c.modules} módulos · ${c.pages} pp · ${c.md} MD</p>
        <div class="lcc-progress"><i style="width:${c.pct}%"></i></div>
        <div class="lcc-progress-label"><span>${c.pct}% de páginas digeridas</span><b>${c.md}/${c.list.length} MD</b></div>
        <div class="lcc-extras">
          ${c.extras.cats.map(x => `<span class="${x.loaded >= x.total ? 'full' : x.loaded ? 'part' : ''}" title="${x.label}: ${x.loaded}/${x.total}"><i>${x.label}</i><b>${x.total ? Math.round(x.loaded / x.total * 100) : 0}%</b></span>`).join('')}
        </div>
        <div class="lcc-foot"><span>Extras ${c.extras.loaded}/${c.extras.total} · ${c.extras.pct}%</span><button data-course="${c.code}">Abrir PDFs <span>→</span></button></div>
      </article>`).join('');

    // índice de sabiduría: curso → módulo → recurso
    let entries = 0;
    $('#wisdomIndex').innerHTML = courses.map(c => {
      const modules = [];
      c.list.forEach(r => {
        let m = modules.find(x => x.name === r.module);
        if (!m) { m = { name: r.module, list: [] }; modules.push(m); }
        m.list.push(r);
      });
      const moduleHTML = modules.map(m => {
        const pct = m.list.length ? Math.round(m.list.reduce((n, r) => n + resourceProgress(r), 0) / m.list.length) : 0;
        const rows = m.list.slice().sort((a, b) => a.id - b.id).map(r => {
          entries++;
          return `<button class="wisdom-entry" data-resource="${r.id}" title="${esc(r.title)} · ${esc(mdPath(r))}">
            <span class="we-dot state-${r.state}"></span>
            <span class="we-copy"><b>${esc(r.title)}</b><small>#${String(r.id).padStart(3, '0')} · ${r.year} · ${r.pages} pp · ${libStateLabel(r.state)} · ${mdPath(r)}</small></span>
            <span class="we-pct ${r.state}">${resourceProgress(r)}%</span>
          </button>`;
        }).join('');
        return `<div class="wisdom-module">
          <div class="wm-head"><span>${esc(m.name)}</span><em>${m.list.length} ${m.list.length === 1 ? 'recurso' : 'recursos'} · ${pct}%</em></div>
          ${rows}
        </div>`;
      }).join('');
      return `<section class="wisdom-course" style="--cc:${c.color}">
        <header class="wc-head">
          <span class="wc-code">${esc(c.code)}</span>
          <div><h3>${esc(c.name)}</h3><small>${c.list.length} PDFs · ${c.modules} módulos · ${c.pages} páginas</small></div>
          <b>${c.pct}%</b>
        </header>
        <div class="wc-bar"><i style="width:${c.pct}%"></i></div>
        ${moduleHTML}
      </section>`;
    }).join('');
    $('#wisdomCount').textContent = `${entries} entradas`;
    $('#wisdomPct').textContent = totalPct + '%';

    const tags = tagIndex();
    const topTags = tags.slice(0, 12);
    $('#wisdomTagCount').textContent = tags.length;
    $('#wisdomLinks').innerHTML = topTags.map(t => {
      const courseNames = [...t.courses].map(code => (window.DIPLOMAS.find(d => d.code === code) || {}).name).filter(Boolean);
      return `<button class="wisdom-tag" data-tag="${esc(t.tag)}">
        <span>${esc(t.tag)}<small>${courseNames.length ? esc(courseNames.join(' · ')) : 'Aporte propio'}</small></span>
        <b>${t.ids.size}</b>
      </button>`;
    }).join('');

    $('#wisdomInsights').innerHTML = window.WISDOM_BRIDGES.map(b => {
      const names = b.courses.map(code => (window.DIPLOMAS.find(d => d.code === code) || {}).name).filter(Boolean);
      return `<button class="wisdom-insight" data-tag="${esc(b.tag)}">
        <div class="wi-top"><span>${esc(b.label)}</span><em>${b.courses.length} cursos</em></div>
        <p>${esc(b.note)}</p>
        <div class="wi-courses">${b.courses.map(code => `<i style="--cc:${(window.DIPLOMAS.find(d => d.code === code) || {}).color || '#6d8a5a'}">${esc(code)}</i>`).join('')}<span>${esc(names.join(' · '))}</span></div>
      </button>`;
    }).join('');

    const mdCount = allResources().filter(r => r.state === 'markdown').length;
    const metaCount = allResources().filter(r => r.module && r.year && (r.tags || []).length).length;
    const sample = allResources().find(r => r.state === 'markdown') || allResources()[0];
    $('#wisdomMeta').innerHTML = `
      <div class="wm-stat"><span>Markdown ordenado</span><b>${mdCount}/${allResources().length}</b></div>
      <div class="wm-stat"><span>Metadata completa</span><b>${metaCount}/${allResources().length}</b></div>
      <div class="wm-stat"><span>Hashes de origen</span><b>${allResources().length}/${allResources().length}</b></div>
      <div class="wm-stat"><span>Idioma detectado</span><b>es-AR</b></div>
      <div class="wm-meta-code"><span>EJEMPLO DE RUTA</span><code>${esc(mdPath(sample))}</code><small>hash ${mdHash(sample)} · ${sample.pages} pp · ${esc(sample.code)}</small></div>
      <div class="wm-note"><span>ⓘ</span>El PDF original nunca se mueve ni se sobrescribe. Markdown y metadata son una capa derivada y reversible.</div>`;

    const emergent = $('#emergentGuide');
    if (emergent) {
      const mdNow = allResources().filter(r => r.state === 'markdown');
      const pending = allResources().filter(r => r.state !== 'markdown');
      const multi = tagIndex().filter(t => t.courses.size > 1).slice(0, 6);
      const courses = window.DIPLOMAS.map(d => ({ ...d, ...courseStats(d.code) }));
      const gaps = courses.map(c => ({ ...c, gap: c.list.length - c.md })).filter(c => c.list.length);
      emergent.innerHTML = `
        <div class="emergent-head">
          <span class="section-kicker">GUÍA · DATOS QUE EMERGEN DE LOS MARKDOWN</span>
          <h3>Lo que ya se puede <em>estudiar</em> sin volver a la ingesta.</h3>
        </div>
        <div class="emergent-grid">
          <section class="emergent-card">
            <span class="emergent-kicker">EMERGENCIA 01</span>
            <b>${mdNow.length} Markdown listos para estudiar</b>
            <p>Todo lo que sigue sale de texto ordenado con metadata, no de los PDFs crudos. Si un dato no está en un Markdown, no se inventa.</p>
            <div class="emergent-list">${mdNow.slice(0, 5).map(r => `<button data-emergent="${r.id}">${esc(r.title)} <small>${esc(r.diploma)} · ${r.pages} pp</small></button>`).join('') || '<small>Sin Markdown aún.</small>'}</div>
          </section>
          <section class="emergent-card">
            <span class="emergent-kicker">EMERGENCIA 02</span>
            <b>Conceptos que cruzan cursos</b>
            <p>Tags que aparecen en más de una diplomatura: ahí hay comparaciones y contradicciones útiles.</p>
            <div class="emergent-list">${multi.map(t => `<button data-tag="${esc(t.tag)}">#${esc(t.tag)} <small>${t.courses.size} cursos · ${t.ids.size} PDFs</small></button>`).join('') || '<small>Sin cruces aún.</small>'}</div>
          </section>
          <section class="emergent-card">
            <span class="emergent-kicker">EMERGENCIA 03</span>
            <b>Huecos de digestión</b>
            <p>Cursos con menos Markdown: pedir ingesta ahí antes que buscar insights que no existen.</p>
            <div class="emergent-list">${gaps.slice().sort((a, b) => b.gap - a.gap).slice(0, 5).map(c => `<button data-course="${c.code}">${esc(c.name)} <small>${c.md}/${c.list.length} MD · ${c.pct}%</small></button>`).join('')}</div>
          </section>
        </div>
        <p class="emergent-foot">Pendientes de ingesta: <b>${pending.length}</b> PDFs. ${pending.length ? `Próximo: ${esc(pending[0].title)}. ` : ''}La ingesta se hace en <b>Archivos PDF</b>; aquí solo se estudia lo digerido.</p>`;
      $$('#emergentGuide [data-emergent]').forEach(el => el.addEventListener('click', () => openLibraryResource(Number(el.dataset.emergent))));
      $$('#emergentGuide [data-tag]').forEach(el => el.addEventListener('click', () => searchLibraryTag(el.dataset.tag)));
      $$('#emergentGuide [data-course]').forEach(el => el.addEventListener('click', () => openCourseFiles(el.dataset.course)));
    }

    const pathsEl = $('#readingPaths');
    if (pathsEl) {
      const paths = app.readingPaths || [];
      pathsEl.innerHTML = paths.length ? `<span class="section-kicker">RUTAS DE LECTURA GUARDADAS</span>` + paths.map(p => `<div class="reading-path-row"><b>${esc(p.tag)}</b><small>${p.ids.length} recursos · ${esc(p.at)}</small><button data-path="${p.id}">Exportar <span>↓</span></button></div>`).join('') : '';
      $$('#readingPaths [data-path]').forEach(b => b.addEventListener('click', () => {
        const path = (app.readingPaths || []).find(x => String(x.id) === b.dataset.path);
        if (path) exportReadingPath(path);
      }));
    }
    $('#buildPathBtn')?.addEventListener('click', () => {
      const button = $('#buildPathBtn');
      let form = $('#readingPathForm');
      if (form) {
        form.remove();
        button?.setAttribute('aria-expanded', 'false');
        return;
      }
      form = document.createElement('form');
      form.id = 'readingPathForm';
      form.className = 'reading-path-form';
      form.innerHTML = '<label for="readingPathTag">Tema o etiqueta</label><div><input id="readingPathTag" name="tag" type="text" maxlength="40" placeholder="Ej. riego, cosecha, legal" required><button class="btn btn-lime" type="submit">Crear ruta</button><button class="text-link" type="button" data-cancel-path>Cancelar</button></div><small>Reúne hasta 8 recursos con esa etiqueta exacta.</small>';
      button?.insertAdjacentElement('afterend', form);
      button?.setAttribute('aria-expanded', 'true');
      form.querySelector('input')?.focus();
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const tag = String(new FormData(form).get('tag') || '').trim();
        const path = buildReadingPath(tag);
        if (path) { showToast(`Ruta creada: ${path.ids.length} recursos.`); renderLibraryDigest(); }
        else showToast('No hay recursos con ese tag. Revisá la etiqueta en el índice.');
      });
      form.querySelector('[data-cancel-path]')?.addEventListener('click', () => {
        form.remove();
        button?.setAttribute('aria-expanded', 'false');
        button?.focus();
      });
    });

    $$('#libCourseGrid [data-course]').forEach(el => el.addEventListener('click', () => openCourseFiles(el.dataset.course)));
    $$('#wisdomIndex [data-resource]').forEach(el => el.addEventListener('click', () => openLibraryResource(Number(el.dataset.resource))));
    $$('#wisdomLinks [data-tag], #wisdomInsights [data-tag]').forEach(el => el.addEventListener('click', () => searchLibraryTag(el.dataset.tag)));
  }

  function openAnnotate(id) {
    const r = allResources().find(x => x.id === id);
    if (!r) return;
    const list = app.annotations[id] || [];
    const box = $('#annotateList');
    if (box) box.innerHTML = list.length ? list.map((n, i) => `<div class="annotate-item"><span>${esc(n.text)}</span><small>${n.at}</small><button data-del="${i}" aria-label="Borrar">×</button></div>`).join('') : '<p class="annotate-empty">Sin anotaciones todavía.</p>';
    $('#annotateModal')?.classList.add('open');
    $$('#annotateList [data-del]').forEach(b => b.addEventListener('click', () => {
      app.annotations[id].splice(Number(b.dataset.del), 1);
      persist(); openAnnotate(id);
    }));
    const form = $('#annotateForm');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const txt = $('#annotateText')?.value.trim();
        if (!txt) return;
        if (!app.annotations[id]) app.annotations[id] = [];
        app.annotations[id].unshift({ text: txt, at: new Date().toLocaleString('es-AR') });
        persist();
        if ($('#annotateText')) $('#annotateText').value = '';
        openAnnotate(id);
        showToast('Anotación guardada.');
      };
    }
  }

  function readingPathTitle(ids) {
    return ids.map(id => (allResources().find(r => r.id === id) || {}).title || id).join(' → ');
  }

  function buildReadingPath(tag) {
    const tagNorm = norm(tag);
    const ids = allResources().filter(r => (r.tags || []).map(norm).includes(tagNorm)).map(r => r.id).slice(0, 8);
    if (!ids.length) return null;
    const path = { id: Date.now(), tag, ids, at: new Date().toLocaleString('es-AR') };
    app.readingPaths.unshift(path);
    app.readingPaths = app.readingPaths.slice(0, 12);
    persist();
    return path;
  }

  function exportReadingPath(path) {
    const txt = `# Ruta de lectura · ${path.tag}\n\nGenerada: ${path.at}\n\n${path.ids.map((id, i) => {
      const r = allResources().find(x => x.id === id);
      return `${i + 1}. **${r?.title || id}** — ${r?.diploma || ''} · ${r?.module || ''} · ${r?.pages || 0} pp\n   ${r?.summary || ''}\n   Markdown: ${r ? mdPath(r) : ''}`;
    }).join('\n')}\n`;
    downloadText(`ruta-${path.tag}.md`, txt);
    showToast('Ruta exportada en Markdown.');
  }

  function openCourseFiles(code) {
    const name = (window.DIPLOMAS.find(d => d.code === code) || {}).name;
    app.libMode = 'files';
    app.selectedResource = null;
    navigate('library');
    setTimeout(() => {
      if ($('#libDiploma') && name) $('#libDiploma').value = name;
      renderLibrary(); persist();
    }, 40);
  }

  function openLibraryResource(id) {
    app.libMode = 'files';
    app.selectedResource = id;
    navigate('library', { resourceId: id });
  }

  function searchLibraryTag(tag) {
    app.libMode = 'files';
    app.selectedResource = null;
    navigate('library');
    setTimeout(() => {
      if ($('#libSearch')) $('#libSearch').value = tag;
      if ($('#libDiploma')) $('#libDiploma').value = 'all';
      renderLibrary(); persist();
    }, 40);
  }

  function setLibMode(mode) {
    app.libMode = mode === 'files' ? 'files' : 'digest';
    $('#libDigest').hidden = app.libMode !== 'digest';
    $('#libFiles').hidden = app.libMode !== 'files';
    $$('.lib-mode').forEach(b => b.classList.toggle('active', b.dataset.libmode === app.libMode));
    persist();
  }

  function renderLibrary(resourceId) {
    renderNav();
    renderLibraryDigest();
    setLibMode(app.libMode || 'digest');
    if (!libFiltersReady) {
      const diplomas = [...new Set([...window.DIPLOMAS.map(d => d.name), ...app.userResources.map(r => r.diploma)])];
      $('#libDiploma').innerHTML = '<option value="all">Todas las diplomaturas</option>' + diplomas.map(d => `<option>${esc(d)}</option>`).join('');
      libFiltersReady = true;
    }
    // Deep links open the resource even if the last-used filters hid it.
    if (resourceId) {
      if ($('#libSearch')) $('#libSearch').value = '';
      if ($('#libDiploma')) $('#libDiploma').value = 'all';
      if ($('#libState')) $('#libState').value = 'all';
      app.dupOnly = false;
    }
    const q = norm($('#libSearch')?.value || '');
    const diploma = $('#libDiploma')?.value || 'all';
    const state = $('#libState')?.value || 'all';
    const sort = $('#libSort')?.value || 'recent';
    const semantic = (qtext) => {
      const words = norm(qtext).split(/[^a-z0-9]+/).filter(w => w.length > 3);
      return (r) => {
        if (!words.length) return 0;
        const hay = norm([r.title, r.summary, r.diploma, r.module, r.path, (r.tags || []).join(' '), r.mdText || ''].join(' '));
        let s = 0;
        words.forEach(w => { if (hay.includes(w)) s += 2; if (norm(r.title).includes(w)) s += 3; if ((r.tags || []).map(norm).includes(w)) s += 2; });
        return s;
      };
    };
    const scorer = semantic(q);
    let list = allResources().filter(r => {
      const hay = norm([r.title, r.summary, r.diploma, r.module, r.path, (r.tags || []).join(' '), r.mdText || ''].join(' '));
      const textOk = !q || hay.includes(q) || scorer(r) > 2;
      return textOk && (diploma === 'all' || r.diploma === diploma) && (state === 'all' || r.state === state) && (!app.dupOnly || r.dup);
    });
    if (q && list.length) list.sort((a, b) => scorer(b) - scorer(a));
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

    const grouped = [];
    list.forEach(r => {
      const key = `${r.diploma}`;
      let g = grouped.find(x => x.key === key);
      if (!g) { g = { key, diploma: r.diploma, list: [] }; grouped.push(g); }
      g.list.push(r);
    });
    grouped.sort((a, b) => a.diploma.localeCompare(b.diploma, 'es'));
    $('#libList').innerHTML = grouped.map(g => `
      <div class="lib-group-head"><span>${esc(g.diploma)}</span><small>${g.list.length} PDFs · carpeta ${esc((g.list[0].path || '').split('/')[0])}/ · ${[...new Set(g.list.map(x => x.module))].length} módulos</small></div>
      ${g.list.map(r => {
        const c = (window.DIPLOMAS.find(d => d.code === r.code) || {});
        const color = c.color || '#5f7a4b';
        const folder = (r.path || '').split('/').slice(0, 2).join('/');
        return `<div class="lib-row lib-row-cover ${app.selectedResource === r.id ? 'selected' : ''}" data-resource="${r.id}" tabindex="0" role="button">
          <span class="lib-cover" style="--cc:${color};--cc2:${color}33" aria-hidden="true">
            <i>PDF</i><b>${esc((r.title || 'PDF').slice(0, 18))}</b><small>${esc(r.code || '')} · ${r.pages} pp</small><em>${r.state === 'markdown' ? 'MD ✓' : r.state === 'procesado' ? '…°' : '—'}</em>
          </span>
          <div class="lib-row-main">
            <div class="lib-title-line"><span class="lib-title">${esc(r.title)}</span>${r.dup ? '<span class="dup-mini">DUPLICADO</span>' : ''}</div>
            <div class="lib-meta"><b>${esc(r.diploma)}</b> · ${esc(r.module)} · ${r.year} · ${r.pages} pp</div>
            <div class="lib-path"><span>Carpeta</span>${esc(folder)}<i>·</i><span>Markdown</span>${esc(mdPath(r))}</div>
            <div class="lib-tags">${(r.tags || []).slice(0, 4).map(t => `<span>#${esc(t)}</span>`).join('')}</div>
          </div>
          <div class="lib-row-side"><span class="state-badge state-${r.state}">${libStateLabel(r.state)}</span><span class="lib-pages">${resourceProgress(r)}%</span></div>
        </div>`;
      }).join('')}
    `).join('');
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
    // Keep the detail panel in sync with the active filter: if the selected
    // resource is filtered out, clear it so the first visible result opens.
    if (app.selectedResource && !list.some(r => r.id === app.selectedResource)) app.selectedResource = null;
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
        <div class="rd-fact"><span>DIGERIDO</span><b>${resourceProgress(r)}%</b></div>
        <div class="rd-fact"><span>IDIOMA</span><b>es-AR</b></div>
        <div class="rd-fact"><span>AÑO</span><b>${r.year}</b></div>
        <div class="rd-fact"><span>HASH</span><b>${mdHash(r)}</b></div>
        <div class="rd-fact"><span>CÓDIGO</span><b>${esc(r.code || '—')}</b></div>
        <div class="rd-fact"><span>ESTADO</span><b>${libStateLabel(r.state)}</b></div>
      </div>
      <div class="rd-path"><b>REFERENCIA · PDF ORIGINAL</b>${esc(r.path)}</div>
      <div class="rd-path rd-md"><b>MARKDOWN DERIVADO · ${resourceProgress(r)}%</b>${esc(mdPath(r))}</div>
      <div class="rd-meta-strip">
        <span>CURSO <b>${esc(r.diploma)}</b></span>
        <span>MÓDULO <b>${esc(r.module)}</b></span>
        <span>TAGS <b>${(r.tags || []).length}</b></span>
        <span>LINKS <b>${r.dup ? 'DUPLICADO' : '—'}</b></span>
      </div>
      <div class="rd-tags">${(r.tags || []).map(t => `<span>${esc(t)}</span>`).join('')}</div>
      ${dups.length ? `<details class="rd-dup"><summary>Comparar registros vinculados · ${dups.length}</summary><p>Vínculo de catálogo; no implica que los archivos tengan contenido idéntico. Contrastá curso, módulo y texto disponible.</p><div class="rd-compare"><article><b>${esc(r.title)}</b><small>${esc(r.diploma)} · ${esc(r.module)} · ${r.pages} pp</small><code>${esc(r.path)}</code><p>${esc((r.mdText || r.summary || 'Sin texto extraído').slice(0, 420))}</p></article>${dups.map(d => `<article><b>${esc(d.title)}</b><small>${esc(d.diploma)} · ${esc(d.module)} · ${d.pages} pp</small><code>${esc(d.path)}</code><p>${esc((d.mdText || d.summary || 'Sin texto extraído').slice(0, 420))}</p></article>`).join('')}</div></details>` : ''}
      <button class="rd-close" id="closeResourceDetail" aria-label="Cerrar detalle">×</button>
      <div class="rd-actions">
        <button class="btn btn-lime" data-ask="¿Qué dice ${esc(r.title)}?">Preguntar <span>◈</span></button>
        <button class="btn btn-ghost" id="dlPdfBtn">Bajar PDF <span>↓</span></button>
        <button class="btn btn-ghost" id="dlMdBtn">Bajar Markdown <span>↓</span></button>
        <button class="btn btn-ghost" id="annotateBtn">Anotar <span>✎</span></button>
        <button class="btn btn-ghost" id="copyPathBtn">Copiar ruta</button>
      </div>
      <p style="font-size:7px;line-height:1.6;color:#6d7561;margin:11px 0 0">Origen verificado. El recurso original no se borra ni se sobrescribe al vincular duplicados.</p>`;
    box.querySelector('[data-ask]')?.addEventListener('click', (e) => navigate('oracle', { question: e.currentTarget.dataset.ask }));
    box.querySelector('#annotateBtn')?.addEventListener('click', () => openAnnotate(r.id));
    box.querySelector('#dlMdBtn')?.addEventListener('click', () => {
      const md = r.mdText || `# ${r.title}\n\n> ${r.summary}\n\n- Curso: ${r.diploma}\n- Módulo: ${r.module}\n- Ruta PDF: ${r.path}\n- Hash: ${mdHash(r)}\n`;
      downloadText(mdPath(r).split('/').pop(), md);
      showToast('Markdown descargado.');
    });
    box.querySelector('#dlPdfBtn')?.addEventListener('click', async () => {
      try {
        let blob = r.pdfData ? await (await fetch(`data:application/pdf;base64,${r.pdfData}`)).blob() : null;
        if (!blob && r.pdfStored) blob = await readPdfBlob(r.id);
        if (!blob) {
          showToast('Este recurso no tiene un PDF descargable guardado en este navegador.');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (r.path || `${slug(r.title)}.pdf`).split('/').pop();
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast('PDF descargado.');
      } catch { showToast('No se pudo recuperar el PDF guardado en este navegador.'); }
    });
    box.querySelector('#copyPathBtn')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(r.path).then(() => showToast('Ruta copiada.')).catch(() => showToast('No se pudo copiar la ruta.'));
    });
    box.querySelector('#closeResourceDetail')?.addEventListener('click', () => {
      box.classList.remove('mobile-open');
      document.body.classList.remove('detail-open');
    });
  }

  function bindLibrary() {
    $$('.lib-mode').forEach(btn => btn.addEventListener('click', () => {
      setLibMode(btn.dataset.libmode);
      if (app.libMode === 'files' && !$('#libFiles').hidden) renderLibrary();
    }));
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
      if (f) {
        $('#dropTitle').textContent = f.name;
        $('#dropSub').textContent = f.size > 40 * 1024 * 1024
          ? 'Supera el límite de 40 MB'
          : `${(f.size / 1024 / 1024).toFixed(1)} MB · listo para indexar`;
      }
    });
    $('#addForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = $('#fileInput')?.files?.[0];
      const status = $('#parseStatus');
      if (!file) {
        if (status) status.textContent = 'Elegí un archivo PDF antes de continuar.';
        return;
      }
      if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) {
        if (status) status.textContent = 'El archivo no parece ser un PDF. Elegí un archivo .pdf válido.';
        return;
      }
      if (file.size > 40 * 1024 * 1024) {
        if (status) status.textContent = 'El PDF supera el límite de 40 MB. Reducí su tamaño e intentá de nuevo.';
        return;
      }
      const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
      if (new TextDecoder().decode(header) !== '%PDF-') {
        if (status) status.textContent = 'No se reconoce la firma PDF del archivo. Revisá que no esté dañado.';
        return;
      }
      const diploma = $('#addDiploma')?.value || 'Cultivo Interior';
      const module = $('#addModule')?.value.trim() || 'Módulo sin especificar';
      const rawPath = $('#addPath')?.value.trim() || `99_Aportes/${file.name}`;
      const title = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ');
      const cleanTitle = norm(title);
      const existing = allResources().find(r => {
        const other = norm(r.title);
        return other === cleanTitle || (cleanTitle.length > 4 && other.includes(cleanTitle)) || (other.length > 4 && cleanTitle.includes(other));
      });
      if (status) status.textContent = 'Convirtiendo con pdf.js…';
      let parsed = { md: '', pages: 1, chars: 0, headings: [], topics: [], failed: true, reason: 'sin texto extraíble', meta: {} };
      parsed = await pdfToMarkdown(file, title.charAt(0).toUpperCase() + title.slice(1), (p, tot) => { if (status) status.textContent = `Convirtiendo con pdf.js… página ${p}/${tot}`; });
      const ok = file && !parsed.failed;
      const meta = parsed.meta || {};
      const resource = {
        id: Math.max(...allResources().map(r => r.id), 0) + 1,
        title: title.charAt(0).toUpperCase() + title.slice(1),
        diploma, code: 'AP', module, year: meta.year || 2026,
        pages: ok ? parsed.pages : 1,
        state: ok ? 'markdown' : 'pendiente',
        tags: ['aporte', diploma.toLowerCase(), ...(parsed.topics || []), ...(parsed.headings || []).slice(0, 3).map(h => norm(h).slice(0, 20))],
        path: rawPath,
        dup: existing ? (existing.dup || 'manual') : null, updated: '6 nov 2026',
        summary: ok ? (parsed.md.replace(/^#.*$/m, '').trim().slice(0, 220) || 'Markdown generado desde el PDF.') : 'PDF agregado sin archivo legible o sin texto extraíble. Pendiente de procesamiento.',
        mdText: ok ? parsed.md.slice(0, 20000) : '',
        mdChars: parsed.chars || 0
      };
      let originalStored = false;
      try {
        await storePdfBlob(resource.id, file);
        resource.pdfStored = true;
        originalStored = true;
      } catch {}
      app.userResources.push(resource);
      app.selectedResource = resource.id;
      persist();
      $('#addModal').classList.remove('open');
      $('#addForm').reset();
      if (status) status.textContent = 'Listo: se extrae texto página por página y se crea el Markdown con metadata y hash.';
      $('#dropTitle').textContent = 'Arrastrá un PDF o hacé clic';
      $('#dropSub').textContent = 'Máx. 40 MB · se procesa localmente, sin subir a terceros';
      libFiltersReady = false;
      renderLibrary();
      showToast(ok
        ? `Convertido: ${parsed.pages} páginas · ${fmt(parsed.chars)} caracteres → Markdown${originalStored ? ' · PDF guardado localmente' : ' · PDF original no pudo guardarse'}.`
        : `Agregado pendiente (${parsed.reason || 'sin texto extraíble'})${originalStored ? ' · PDF guardado localmente' : ''}.`);
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
        const frag = (entry.sources || []).map(id => {
          const r = allResources().find(x => x.id === id);
          if (!r) return '';
          const excerpt = String(r.summary || '').slice(0, 220);
          return `<blockquote class="oracle-fragment"><span>${esc(r.diploma)} · ${esc(r.module)} · ${r.pages} pp · hash ${mdHash(r)}</span><q>${esc(excerpt)}…</q><small>${esc(mdPath(r))} · ${esc(r.path)}</small></blockquote>`;
        }).join('');
        const compare = (entry.sources || []).length > 1 ? `<div class="oracle-compare"><span>De dónde trae la info</span><p><b>Acuerdos:</b> ${esc(entry.tags?.join(' · ') || 'ver fuentes')}.</p><p><b>Límites:</b> contrastá con la ficha del banco y la normativa vigente; si algo no está en el Markdown, no se afirma.</p></div>` : '';
        html = `<p>${entry.answer}</p>${frag}${compare}<p>${cited}</p>`;
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
  function renderMarketList() {
    const mode = app.budget.mode || 'indoor';
    const list = BUDGET_PRODUCTS[mode] || [];
    if (!app.budget.prices) app.budget.prices = {};
    const el = $('#marketList');
    if (!el) return;
    el.innerHTML = list.map(p => {
      const price = app.budget.prices[`${mode}:${p.id}`] ?? p.price;
      const url = `https://www.mercadolibre.com.ar/${encodeURIComponent(p.q)}`;
      return `<div class="market-row">
        <img src="${p.img}" alt="${esc(p.name)}" loading="lazy" />
        <div class="market-copy"><b>${esc(p.name)}</b>
          <a href="${url}" target="_blank" rel="noopener">Corroborar en Mercado Libre ↗</a>
          <small>${esc(p.q)}</small>
        </div>
        <label class="market-price"><span>ARS</span><input type="number" min="0" step="500" value="${price}" data-market="${mode}:${p.id}" aria-label="Precio de ${esc(p.name)}" /></label>
      </div>`;
    }).join('');
    const total = list.reduce((n, p) => n + (app.budget.prices[`${mode}:${p.id}`] ?? p.price), 0);
    const mt = $('#marketTotal');
    if (mt) mt.textContent = '$' + fmt(total);
    $$('#marketList [data-market]').forEach(inp => inp.addEventListener('input', () => {
      app.budget.prices[inp.dataset.market] = Math.max(0, Number(inp.value) || 0);
      const t = list.reduce((n, p) => n + (app.budget.prices[`${mode}:${p.id}`] ?? p.price), 0);
      if ($('#marketTotal')) $('#marketTotal').textContent = '$' + fmt(t);
      persist();
    }));
  }

  function renderBudget() {
    renderNav();
    const b = app.budget;
    const c = budget();
    $$('.budget-mode').forEach(el => el.classList.toggle('active', (el.dataset.mode || 'indoor') === (b.mode || 'indoor')));
    const tag = $('#bModeTag');
    if (tag) tag.textContent = b.mode === 'outdoor' ? 'AUTO · OUTDOOR' : 'AUTO · INDOOR';
    renderMarketList();
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
    $$('.budget-mode').forEach(el => el.addEventListener('click', () => {
      app.budget.mode = el.dataset.mode === 'outdoor' ? 'outdoor' : 'indoor';
      renderBudget(); persist();
      showToast(app.budget.mode === 'outdoor' ? 'Presupuesto outdoor: sin energía LED, equipos mínimos.' : 'Presupuesto indoor: con LED y carpa.');
    }));
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

  /* ---------- roadmap vivo ---------- */
  const ROAD_STATUS = {
    done: { label: 'EN LA APP', cls: 'done' },
    now: { label: 'EN CONSTRUCCIÓN', cls: 'now' },
    next: { label: 'PRÓXIMO', cls: 'next' },
    later: { label: 'VISIÓN', cls: 'later' }
  };
  const ROAD_HORIZONS = { h0: 'Ahora', h1: 'Próximo', h2: 'Después', h3: 'Visión' };

  function renderRoadmap() {
    renderNav();
    const R = window.ROADMAP;
    if (!R) return;
    const rp = roadmapProgress();
    $('#roadmapVersion').textContent = R.version;
    $('#roadmapNorth').textContent = R.northStar;
    $('#roadmapStatement').textContent = R.statement;
    $('#roadmapProgressBar').style.width = rp.pct + '%';
    $('#roadmapProgressLabel').textContent = `${rp.done} de ${rp.total} hitos alcanzados`;
    $('#roadmapProgressPct').textContent = rp.pct + '%';

    $('#roadmapMetrics').innerHTML = R.metrics.map(m => {
      const value = m.dynamic === 'roadmap' ? `${rp.done}/${rp.total}` : m.value;
      const pct = m.dynamic === 'roadmap' ? rp.pct : m.pct;
      return `<div class="roadmap-metric">
        <span>${esc(m.label)}</span>
        <b>${esc(value)}</b>
        <i><i style="width:${pct}%"></i></i>
        <small>meta · ${esc(m.target)}</small>
      </div>`;
    }).join('');

    const itemsByHorizon = h => rp.items.filter(i => i.horizon === h);
    $('#roadmapHorizons').innerHTML = R.horizons.map((h, idx) => {
      const items = itemsByHorizon(h.id);
      const done = items.filter(i => i.status === 'done').length;
      const pct = items.length ? Math.round(done / items.length * 100) : 0;
      return `<button class="roadmap-horizon ${app.roadmapHorizon === h.id ? 'active' : ''}" data-road-horizon="${h.id}">
        <span class="rh-index">0${idx + 1}</span>
        <span class="rh-copy"><b>${esc(h.label)}</b><small>${esc(h.window)} · ${done}/${items.length} hitos</small><em>${esc(h.note)}</em></span>
        <span class="rh-pct">${pct}%</span>
        <i class="rh-bar"><i style="width:${pct}%"></i></i>
      </button>`;
    }).join('');

    if (R.reverseEngineering) {
      $('#roadmapReverseGrid').innerHTML = R.reverseEngineering.map(app => `
        <article class="rr-card">
          <div class="rr-card-top">
            <span class="rr-avatar">${esc(app.name.split(' ').map(w => w[0]).join('').slice(0, 2))}</span>
            <div class="rr-id"><b>${esc(app.name)}</b><small>${esc(app.category)} · ${esc(app.region)}</small></div>
            <span class="rr-model">${esc(app.model)}</span>
          </div>
          <div class="rr-block"><span>QUÉ TOMAR</span><ul>${app.borrow.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
          <div class="rr-avoid"><span>QUÉ NO COPIAR</span><p>${esc(app.avoid)}</p></div>
          <div class="rr-opps"><span>OPORTUNIDAD LIBRE</span><div>${app.opportunities.map(x => `<i>${esc(x)}</i>`).join('')}</div></div>
          <p class="rr-signal">${esc(app.signal)}</p>
        </article>`).join('');
      const rev = $('#roadmapReverseCount'); if (rev) rev.textContent = `${R.reverseEngineering.length} apps`;
    }
    if (R.gaps) {
      $('#roadmapGaps').innerHTML = R.gaps.map(g => `
        <article class="rr-gap">
          <div class="rr-gap-top"><b>${esc(g.area)}</b><span>${esc(ROAD_HORIZONS[g.horizon] || g.horizon)}</span></div>
          <div class="rr-gap-row"><span>HOY</span><p>${esc(g.today)}</p></div>
          <div class="rr-gap-row"><span>FALTA</span><p>${esc(g.missing)}</p></div>
          <div class="rr-gap-row bet"><span>APUESTA</span><p>${esc(g.bet)}</p></div>
        </article>`).join('');
      const gap = $('#roadmapGapCount'); if (gap) gap.textContent = `${R.gaps.length} brechas`;
    }
    if (R.opportunityRadar) {
      const streamById = Object.fromEntries(R.streams.map(s => [s.id, s]));
      $('#roadmapRadar').innerHTML = R.opportunityRadar.map(o => {
        const st = streamById[o.stream] || { title: o.stream, icon: '◇' };
        return `<article class="radar-card impact-${norm(o.impact)}">
          <div class="radar-top"><span class="radar-impact">${esc(o.impact)}</span><span class="radar-effort">${esc(o.effort)}</span><span class="radar-horizon">${esc(ROAD_HORIZONS[o.horizon] || o.horizon)}</span></div>
          <b>${esc(o.title)}</b>
          <p>${esc(o.why)}</p>
          <div class="radar-foot"><span>${st.icon} ${esc(st.title)}</span><small>${esc(o.signal)}</small></div>
        </article>`;
      }).join('');
      const radar = $('#roadmapRadarCount'); if (radar) radar.textContent = `${R.opportunityRadar.length} apuestas`;
      const radar2 = $('#roadmapRadarCount2'); if (radar2) radar2.textContent = String(R.opportunityRadar.length);
    }

    $('#roadmapFilters').innerHTML = `<button class="road-filter ${app.roadmapStream === 'all' ? 'active' : ''}" data-road-stream="all">Todos</button>` +
      R.streams.map(s => {
        const done = s.items.filter(i => i.status === 'done').length;
        return `<button class="road-filter ${app.roadmapStream === s.id ? 'active' : ''}" data-road-stream="${s.id}"><span>${s.icon}</span>${esc(s.title)}<em>${done}/${s.items.length}</em></button>`;
      }).join('');

    const searchEl = $('#roadmapSearch');
    if (searchEl && searchEl.value !== (app.roadmapQuery || '') && document.activeElement !== searchEl) {
      searchEl.value = app.roadmapQuery || '';
    }
    const query = norm(searchEl?.value || app.roadmapQuery || '');
    const matches = (hay) => query.length <= 2
      ? hay.split(/[^a-z0-9]+/).includes(query)
      : hay.includes(query);
    const visible = R.streams
      .filter(s => app.roadmapStream === 'all' || s.id === app.roadmapStream)
      .map(s => {
        let items = s.items;
        if (app.roadmapHorizon !== 'all') items = items.filter(i => i.horizon === app.roadmapHorizon);
        if (app.roadmapPending) items = items.filter(i => i.status !== 'done');
        if (query) items = items.filter(i => matches(norm(`${s.title} ${s.purpose} ${i.t} ${i.note} ${i.metric}`)));
        const done = s.items.filter(i => i.status === 'done').length;
        const pct = s.items.length ? Math.round(done / s.items.length * 100) : 0;
        return { s, items, done, pct };
      })
      .filter(x => x.items.length || !query);

    $('#roadmapStreams').innerHTML = visible.length ? visible.map(({ s, items, done, pct }) => `
      <section class="road-stream" style="--tone:${s.accent}">
        <header class="road-stream-head">
          <span class="rs-icon">${s.icon}</span>
          <div class="rs-copy"><h3>${esc(s.title)}</h3><p>${esc(s.purpose)}</p></div>
          <div class="rs-progress"><b>${pct}%</b><small>${done}/${s.items.length}</small><i><i style="width:${pct}%"></i></i></div>
        </header>
        <div class="road-items">
          ${items.map(item => {
            const st = ROAD_STATUS[item.status] || ROAD_STATUS.later;
            return `<article class="road-item ${st.cls}">
              <div class="ri-status"><i></i>${st.label}</div>
              <div class="ri-copy"><b>${esc(item.t)}</b><p>${esc(item.note)}</p></div>
              <div class="ri-meta">
                <span class="ri-horizon">${esc(ROAD_HORIZONS[item.horizon] || item.horizon)}</span>
                <span class="ri-effort">${esc(item.effort)}</span>
                <span class="ri-metric">${esc(item.metric)}</span>
              </div>
            </article>`;
          }).join('')}
        </div>
      </section>`).join('') : `<div class="road-empty road-empty-wide"><b>Sin hitos para “${esc(query)}”.</b><span>Probá con “riego”, “offline”, “sensores”, “IA” o limpiá la búsqueda.</span></div>`;

    const hitCount = visible.reduce((n, x) => n + x.items.length, 0);
    const hits = $('#roadmapHits');
    if (hits) {
      const filtered = query || app.roadmapPending || app.roadmapHorizon !== 'all' || app.roadmapStream !== 'all';
      hits.textContent = filtered
        ? `${hitCount} de ${rp.total} hitos${query ? ` para “${query}”` : ''}`
        : `${rp.total} hitos · ${R.streams.length} frentes · ${R.reverseEngineering?.length || 0} apps analizadas`;
    }

    $('#roadmapPrinciples').innerHTML = R.principles.map((p, i) => `<div><span>0${i + 1}</span><p>${esc(p)}</p></div>`).join('');
    $('#roadmapNonGoals').innerHTML = R.nonGoals.map(p => `<div><span>×</span><p>${esc(p)}</p></div>`).join('');
    $('#roadmapRisks').innerHTML = R.risks.map(r => `<div class="road-risk"><div><b>${esc(r.title)}</b><em class="risk-${norm(r.level)}">${esc(r.level)}</em></div><p>${esc(r.note)}</p></div>`).join('');
    const nowItems = R.streams.flatMap(s => s.items.filter(i => i.status === 'now').map(i => ({ ...i, stream: s })));
    $('#roadmapNext').innerHTML = nowItems.slice(0, 4).map(i => `<div class="road-next-row"><span>${i.stream.icon}</span><div><b>${esc(i.t)}</b><small>${esc(i.stream.title)} · ${esc(i.metric)}</small></div></div>`).join('');

    $$('#roadmapFilters [data-road-stream]').forEach(el => el.addEventListener('click', () => { app.roadmapStream = el.dataset.roadStream; renderRoadmap(); persist(); }));
    $$('#roadmapHorizons [data-road-horizon]').forEach(el => el.addEventListener('click', () => {
      app.roadmapHorizon = app.roadmapHorizon === el.dataset.roadHorizon ? 'all' : el.dataset.roadHorizon;
      renderRoadmap(); persist();
    }));
  }

  function bindRoadmap() {
    $('#roadmapPendingToggle')?.addEventListener('click', () => {
      app.roadmapPending = !app.roadmapPending;
      $('#roadmapPendingToggle').classList.toggle('active', app.roadmapPending);
      renderRoadmap(); persist();
    });
    $('#roadmapSearch')?.addEventListener('input', (e) => {
      app.roadmapQuery = e.target.value;
      renderRoadmap(); persist();
    });
    $('#exportRoadmapBtn')?.addEventListener('click', () => {
      const R = window.ROADMAP;
      const rp = roadmapProgress();
      let txt = `# Verde — Roadmap vivo\n\n${R.version}\n\n${rp.done} de ${rp.total} hitos completados (${rp.pct}%)\n\n## North star\n${R.northStar}\n\n${R.statement}\n\n`;
      txt += `## Métricas\n` + R.metrics.map(m => {
        const value = m.dynamic === 'roadmap' ? `${rp.done}/${rp.total}` : m.value;
        return `- ${m.label}: ${value} → ${m.target}`;
      }).join('\n') + '\n\n';
      txt += `## Ingeniería inversa · ${R.reverseEngineering.length} apps\n\n`;
      R.reverseEngineering.forEach(a => {
        txt += `### ${a.name} — ${a.category} (${a.region})\nModelo: ${a.model}\n\n`;
        txt += `Tomar:\n` + a.borrow.map(x => `- ${x}`).join('\n') + '\n\n';
        txt += `No copiar: ${a.avoid}\n\n`;
        txt += `Oportunidad:\n` + a.opportunities.map(x => `- ${x}`).join('\n') + `\n\nSeñal: ${a.signal}\n\n`;
      });
      txt += `## Radar de oportunidades\n\n`;
      R.opportunityRadar.forEach(o => { txt += `- **${o.title}** — ${o.impact} impacto · esfuerzo ${o.effort} · ${ROAD_HORIZONS[o.horizon]}\n  ${o.why}\n`; });
      txt += `\n## Matriz de brechas\n\n`;
      R.gaps.forEach(g => { txt += `- **${g.area}** (${ROAD_HORIZONS[g.horizon]})\n  Hoy: ${g.today}\n  Falta: ${g.missing}\n  Apuesta: ${g.bet}\n`; });
      txt += `\n## Backlog por frente\n\n`;
      R.streams.forEach(s => {
        const done = s.items.filter(i => i.status === 'done').length;
        txt += `### ${s.title} (${done}/${s.items.length})\n${s.purpose}\n\n`;
        s.items.forEach(i => {
          txt += `- [${i.status === 'done' ? 'x' : ' '}] ${i.t} — ${ROAD_HORIZONS[i.horizon]} · esfuerzo ${i.effort} · ${i.metric}\n  ${i.note}\n`;
        });
        txt += '\n';
      });
      txt += `## No objetivos\n` + R.nonGoals.map(x => `- ${x}`).join('\n') + '\n\n## Riesgos\n' + R.risks.map(r => `- ${r.title} (${r.level}): ${r.note}`).join('\n') + '\n\n## Principios\n' + R.principles.map(x => `- ${x}`).join('\n') + '\n';
      downloadText('verde-roadmap.md', txt);
      showToast('Roadmap completo exportado en Markdown.');
    });
  }

  /* ---------- modals / shop / global bindings ---------- */
  function closeModal(id) { $('#' + id)?.classList.remove('open'); }

  /* ---------- búsqueda global (⌘K) ---------- */
  const COMMAND_TYPE = { view: 'SECTOR', course: 'CURSO', strain: 'CEPA', pdf: 'PDF', roadmap: 'ROADMAP', tag: 'TAG' };
  const COMMAND_PRIORITY = { view: 0, course: 1, strain: 2, pdf: 3, roadmap: 4, tag: 5 };
  let commandVisible = [];
  let commandIndex = 0;

  function commandEntries() {
    const out = [];
    Object.entries(VIEWS).forEach(([id, label]) => out.push({
      type: 'view', label, meta: 'Sector de la app · abrir vista', keywords: 'ir navegar ' + id,
      action: () => navigate(id)
    }));
    window.DIPLOMAS.forEach(d => {
      const stats = courseStats(d.code);
      out.push({
        type: 'course', label: d.name, keywords: `${d.code} ${d.name}`,
        meta: `${stats.list.length} PDFs · ${stats.pages} pp · ${stats.pct}% digerido`,
        action: () => openCourseFiles(d.code)
      });
    });
    window.STRAINS.forEach(st => out.push({
      type: 'strain', label: st.name, keywords: [st.breeder, st.tags, st.effects, st.flavor, st.lineage].flat().join(' '),
      meta: `Cepa · THC ${st.thc}% · dificultad ${st.difficulty}`,
      action: () => { navigate('strains'); setTimeout(() => openStrainSheet(st.id), 100); }
    }));
    allResources().forEach(r => out.push({
      type: 'pdf', label: r.title, keywords: [r.diploma, r.module, r.path, r.tags, r.summary].flat().join(' '),
      meta: `${r.diploma} · ${r.module} · ${r.pages} pp`,
      action: () => openLibraryResource(r.id)
    }));
    window.ROADMAP.streams.forEach(stream => stream.items.forEach(item => out.push({
      type: 'roadmap', label: item.t, keywords: `${stream.title} ${item.note} ${item.metric}`,
      meta: `${stream.title} · ${ROAD_HORIZONS[item.horizon] || item.horizon} · ${item.status}`,
      action: () => {
        app.roadmapStream = stream.id; app.roadmapHorizon = item.horizon; app.roadmapPending = false; app.roadmapQuery = '';
        navigate('roadmap');
        showToast(`Roadmap · ${stream.title}: ${item.t}`);
      }
    })));
    tagIndex().slice(0, 36).forEach(t => out.push({
      type: 'tag', label: '#' + t.tag, keywords: t.tag,
      meta: `Etiqueta · ${t.ids.size} PDFs · ${t.courses.size} cursos`,
      action: () => searchLibraryTag(t.tag)
    }));
    return out;
  }

  function commandScore(entry, q) {
    if (!q) return 0;
    const label = norm(entry.label);
    const meta = norm(entry.meta || '');
    const hay = norm(`${entry.label} ${entry.meta || ''} ${entry.keywords || ''}`);
    const words = q.split(/\s+/).filter(Boolean);
    if (!words.every(w => hay.includes(w))) return -1;
    let score = COMMAND_PRIORITY[entry.type] === 0 ? 4 : 0;
    if (label === q) score += 100;
    else if (label.startsWith(q)) score += 55;
    else if (label.includes(q)) score += 28;
    words.forEach(w => { if (label.includes(w)) score += 9; if (meta.includes(w)) score += 4; });
    return score;
  }

  function renderCommandResults() {
    const q = norm($('#commandInput')?.value.trim() || '');
    const scored = commandEntries()
      .map((e, i) => ({ ...e, i, score: commandScore(e, q) }))
      .filter(e => e.score >= 0)
      .sort((a, b) => b.score - a.score || COMMAND_PRIORITY[a.type] - COMMAND_PRIORITY[b.type] || a.i - b.i);
    const total = scored.length;
    commandVisible = scored.slice(0, 24);
    commandIndex = 0;
    const box = $('#commandResults');
    if (!box) return;
    box.innerHTML = commandVisible.length ? commandVisible.map((e, i) => `
      <button class="cmd-row ${i === 0 ? 'active' : ''}" data-cmd-index="${i}" role="option" aria-selected="${i === 0}">
        <span class="cmd-type cmd-type-${e.type}">${COMMAND_TYPE[e.type]}</span>
        <span class="cmd-copy"><b>${esc(e.label)}</b><small>${esc(e.meta || '')}</small></span>
        <span class="cmd-go" aria-hidden="true">↵</span>
      </button>`).join('') : `<div class="cmd-empty"><b>Sin resultados</b><span>Probá con “riego”, “floración”, “Gelato”, “roadmap” o “biblioteca”.</span></div>`;
    const count = $('#commandCount');
    if (count) count.textContent = total ? `${total} resultado${total === 1 ? '' : 's'}` : '';
  }

  function commandSetActive(index) {
    if (!commandVisible.length) return;
    commandIndex = Math.max(0, Math.min(commandVisible.length - 1, index));
    $$('#commandResults .cmd-row').forEach((row, i) => {
      const active = i === commandIndex;
      row.classList.toggle('active', active);
      row.setAttribute('aria-selected', String(active));
      if (active) row.scrollIntoView({ block: 'nearest' });
    });
  }

  function commandRun(index) {
    const entry = commandVisible[index];
    if (!entry) return;
    closeCommandPalette();
    entry.action();
  }

  function openCommandPalette() {
    const modal = $('#commandModal');
    if (!modal) return;
    modal.classList.add('open');
    const input = $('#commandInput');
    if (input) { input.value = ''; setTimeout(() => input.focus(), 60); }
    renderCommandResults();
  }

  function closeCommandPalette() {
    $('#commandModal')?.classList.remove('open');
    const input = $('#commandInput');
    if (input) input.value = '';
  }

  function bindGlobal() {
    $$('[data-nav]').forEach(el => {
      if (el.dataset.navBound) return;
      el.dataset.navBound = '1';
      el.addEventListener('click', (e) => { e.preventDefault(); navigate(el.dataset.nav, { libMode: el.dataset.libmode }); });
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
    $('#globalSearchBtn')?.addEventListener('click', openCommandPalette);
    $('#commandInput')?.addEventListener('input', renderCommandResults);
    $('#commandInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); commandSetActive(commandIndex + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); commandSetActive(commandIndex - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); commandRun(commandIndex); }
      else if (e.key === 'Escape') { e.preventDefault(); closeCommandPalette(); }
    });
    $('#commandResults')?.addEventListener('click', (e) => {
      const row = e.target.closest('[data-cmd-index]');
      if (row) commandRun(Number(row.dataset.cmdIndex));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        $$('.modal-backdrop.open').forEach(b => b.classList.remove('open'));
        $('#moreSheet')?.classList.remove('open');
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if ($('#commandModal')?.classList.contains('open')) closeCommandPalette();
        else openCommandPalette();
      }
    });

    $('#sideCollapse')?.addEventListener('click', () => {
      app.sideCollapsed = !app.sideCollapsed;
      document.body.classList.toggle('side-collapsed', app.sideCollapsed);
      const btn = $('#sideCollapse');
      if (btn) { btn.setAttribute('aria-expanded', String(!app.sideCollapsed)); btn.textContent = app.sideCollapsed ? '⟩' : '⟨'; }
      persist();
    });
    $('#simulateBtn')?.addEventListener('click', runFullSimulation);
    $('#simGoBtn')?.addEventListener('click', () => {
      $('#simConfig')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      $('#simStrain')?.focus();
    });
    $('#simStrain')?.addEventListener('change', () => { renderSimConfig(); });
    ['simPlants', 'simDays', 'simLight', 'simTemp'].forEach(id => {
      $('#' + id)?.addEventListener('change', () => { app.sim = simConfigFromUI(); persist(); });
    });
    $('#quickSimBtn')?.addEventListener('click', () => $('#quickModal').classList.add('open'));
    $('#batchRunBtn')?.addEventListener('click', runBatchBenchmark);
    $('#timelapseBtn')?.addEventListener('click', toggleTimelapse);
    $('#batchExportBtn')?.addEventListener('click', exportBatchReplay);
    $('#batchExportJsonBtn')?.addEventListener('click', exportBatchJson);
    $('#exportWisdomBtn')?.addEventListener('click', exportWisdomIndex);
    $('#idxRunBatch')?.addEventListener('click', () => { runBatchBenchmark(); navigate('sim'); });
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
    if (app.sideCollapsed) {
      document.body.classList.add('side-collapsed');
      const btn = $('#sideCollapse');
      if (btn) { btn.setAttribute('aria-expanded', 'false'); btn.textContent = '⟩'; }
    }
    if (app.sim) {
      if (app.sim.strategy) simStrategyId = app.sim.strategy;
    }
    bindGlobal();
    bindStrains();
    bindLibrary();
    bindOracle();
    bindBudget();
    bindRoadmap();
    $('#roadmapPendingToggle')?.classList.toggle('active', !!app.roadmapPending);
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
    renderRoadmap();
    navigate(target);
  }

  init();
})();
