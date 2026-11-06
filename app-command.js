/* Conductor — command palette (⌘K / Ctrl K). */

const paletteState = { items: [], index: 0 };
const PALETTE_GROUPS = { Navegar: 0, Acciones: 1, Repos: 2, Agentes: 3, Misiones: 4 };

function paletteNormalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function paletteScore(haystack, needle) {
  if (!needle) return 1;
  const text = paletteNormalize(haystack);
  const query = paletteNormalize(needle);
  const direct = text.indexOf(query);
  if (direct === 0) return 120;
  if (direct > 0) return 80 - Math.min(30, direct);
  let pos = 0;
  for (const char of query) {
    pos = text.indexOf(char, pos);
    if (pos === -1) return -1;
    pos += 1;
  }
  return 24;
}

function paletteItems() {
  const items = [];
  let order = 0;
  const add = (group, title, hint, iconName, search, run) => items.push({ group, title, hint, icon: iconName, search, run, order: order++ });

  add('Navegar', 'Hoy', 'Vista general del estudio', 'home', 'hoy home inicio dashboard', () => navigate('home'));
  add('Navegar', 'El estudio', 'Oficina isométrica y replay', 'cube', 'estudio world oficina agentes replay', () => navigate('world'));
  add('Navegar', 'Misiones', 'Issues, estados y bloqueos', 'inbox', 'misiones missions issues github', () => navigate('missions'));
  add('Navegar', 'Agentes', 'Agent Agency y protocolo', 'users', 'agentes agents equipo agency', () => navigate('agents'));
  add('Navegar', 'Horizontes y loops', 'Planificación dentro de Misiones', 'calendar', 'plan horizonte gantt roadmap loops', () => openPlanning());

  add('Acciones', 'Pedir una misión', 'Publica un issue en GitHub', 'plus', 'pedir crear mision issue request', () => openRequest());
  add('Acciones', 'Sincronizar GitHub', 'Trae issues y pulls en vivo', 'refresh', 'sync sincronizar github actualizar issues', () => syncGitHub(true));
  add('Acciones', 'Abrir conexiones', 'GitHub, Trello y credenciales', 'sliders', 'conexiones settings trello github token', () => openSettings());
  add('Acciones', 'Reproducir los últimos 15 minutos', 'Inicia el replay', 'play', 'replay reproducir 15 minutos timeline', () => { setReplay(0); navigate('world'); togglePlayback(); });
  add('Acciones', 'Volver al presente', 'Detiene el replay', 'clock', 'presente ahora live reset', () => { setReplay(REPLAY_DURATION); toast('Volvimos al presente'); });
  add('Acciones', 'Leer el protocolo', 'Cómo se unen los agentes', 'book', 'protocolo onboarding agente register claim', () => openProtocol());
  add('Acciones', 'Copiar link de esta vista', 'Deep link al estado actual', 'link', 'copiar link url deep link compartir', () => copyCurrentLink());

  scopedProjects().forEach(project => {
    add('Repos', project.name, `${project.repo} · ${project.issuesOpen || 0} issues`, 'cube', `repo ${project.name} ${project.repo} ${project.description || ''}`, () => navigate('world', { detail: { kind: 'project', id: project.id } }));
  });

  scopedAgents().forEach(agent => {
    const project = projectById(agent.projectId);
    add('Agentes', agent.name, `${agent.role} · ${project.name}`, 'users', `agente ${agent.name} ${agent.role} ${agent.model || ''} ${(agent.skills || []).join(' ')}`, () => openAgent(agent.id));
  });

  scopedMissions().forEach(mission => {
    const status = statusData(mission.status).es;
    const blocked = isBlocked(mission) ? ' · bloqueada' : '';
    add('Misiones', mission.title, `#${mission.issue || '—'} · ${status}${blocked}`, 'inbox', `mision ${mission.title} ${mission.description || ''} #${mission.issue || ''} ${(mission.labels || []).join(' ')} ${status}`, () => openMission(mission.id));
  });

  return items;
}

function filteredPaletteItems(query) {
  const queryText = String(query || '').trim();
  return paletteItems()
    .map(item => ({ ...item, score: paletteScore(`${item.title} ${item.hint} ${item.search}`, queryText) }))
    .filter(item => item.score >= 0)
    .sort((a, b) => b.score - a.score || (PALETTE_GROUPS[a.group] ?? 9) - (PALETTE_GROUPS[b.group] ?? 9) || a.order - b.order)
    .slice(0, 14);
}

function renderPalette(query = '') {
  const results = $('#paletteResults');
  if (!results) return;
  paletteState.items = filteredPaletteItems(query);
  paletteState.index = clamp(paletteState.index, 0, Math.max(0, paletteState.items.length - 1));
  if (!paletteState.items.length) {
    results.innerHTML = `<div class="palette-empty">${icon('search')}<strong>Sin resultados</strong><span>Probá con una misión, un agente o un comando.</span></div>`;
    return;
  }
  let lastGroup = '';
  results.innerHTML = paletteState.items.map((item, index) => {
    const heading = item.group !== lastGroup ? `<div class="palette-section-title">${esc(item.group)}</div>` : '';
    lastGroup = item.group;
    return `${heading}<button class="palette-item ${index === paletteState.index ? 'selected' : ''}" data-palette-index="${index}">
      <span class="palette-icon">${icon(item.icon)}</span>
      <span class="palette-copy"><strong>${esc(item.title)}</strong><small>${esc(item.hint)}</small></span>
      <span class="palette-enter">${index === paletteState.index ? '↵' : ''}</span>
    </button>`;
  }).join('');
  const selected = results.querySelector('.palette-item.selected');
  if (selected) selected.scrollIntoView({ block: 'nearest' });
}

function openPalette() {
  const dialog = $('#commandPalette');
  if (!dialog) return;
  const input = $('#paletteInput');
  if (input) input.value = '';
  paletteState.index = 0;
  renderPalette('');
  if (!dialog.open) dialog.showModal();
  setTimeout(() => input?.focus(), 30);
}

function closePalette() {
  const dialog = $('#commandPalette');
  if (dialog?.open) dialog.close();
}

function runPaletteIndex(index) {
  const item = paletteState.items[index];
  if (!item) return;
  closePalette();
  item.run();
}

function movePalette(delta) {
  if (!paletteState.items.length) return;
  paletteState.index = (paletteState.index + delta + paletteState.items.length) % paletteState.items.length;
  renderPalette($('#paletteInput')?.value || '');
}

function copyCurrentLink() {
  const url = location.href;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(() => toast('Link copiado al portapapeles'), () => toast('No se pudo copiar el link'));
  } else {
    toast('El link de esta vista está en la barra de direcciones');
  }
}

function bindPalette() {
  $('#commandButton')?.addEventListener('click', openPalette);
  $('#paletteClose')?.addEventListener('click', closePalette);
  $('#paletteInput')?.addEventListener('input', event => {
    paletteState.index = 0;
    renderPalette(event.target.value);
  });
  $('#paletteInput')?.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); movePalette(1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); movePalette(-1); }
    else if (event.key === 'Enter') { event.preventDefault(); runPaletteIndex(paletteState.index); }
    else if (event.key === 'Escape') { event.preventDefault(); closePalette(); }
  });
  $('#paletteResults')?.addEventListener('click', event => {
    const item = event.target.closest('[data-palette-index]');
    if (item) runPaletteIndex(Number(item.dataset.paletteIndex));
  });
  $('#commandPalette')?.addEventListener('click', event => {
    if (event.target === event.currentTarget) closePalette();
  });
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      const dialog = $('#commandPalette');
      if (dialog?.open) closePalette(); else openPalette();
    }
  });
}
