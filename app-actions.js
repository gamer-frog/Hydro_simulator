/* Conductor — interactions, connections and boot. */

function renderAll() {
  renderHome();
  renderWorld();
  renderMissions();
  renderAgents();
  renderPlan();
  renderSidebar();
  renderGithubSource();
}

async function loadSnapshot() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2600);
  try {
    const res = await fetch('orchestra/state.json', { cache: 'no-store', signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    state = normalizeState(raw);
    sourceMode = 'repo';
  } catch (err) {
    sourceMode = 'fallback';
  } finally {
    clearTimeout(timeout);
  }
  syncMeta.snapshotAt = Date.now();
  loadConnections();
  if (!connections.githubRepo) connections.githubRepo = state.workspace.repo;
}

async function refreshLiveSources(show = false) {
  if (syncMeta.refreshing) return false;
  syncMeta.refreshing = true;
  if (currentView === 'home') renderOpsHealth();
  try {
    await loadSnapshot();
    renderAll();
    if (navigator.onLine) {
      const stale = timestamp => !timestamp || Date.now() - timestamp > 240000;
      if (stale(syncMeta.githubAt)) await syncGitHub(show);
      if (connections.trelloKey && connections.trelloToken && connections.trelloBoard && stale(syncMeta.trelloAt)) await syncTrello(show);
    }
    if (show) toast('Estado actualizado');
    return true;
  } catch (_) {
    if (show) toast('No se pudo actualizar el estado');
    return false;
  } finally {
    syncMeta.refreshing = false;
    renderSyncStatus();
  }
}

function startAutoRefresh() {
  clearInterval(syncMeta.timer);
  syncMeta.timer = setInterval(() => {
    if (document.visibilityState !== 'visible' || !navigator.onLine) return;
    if (document.querySelector('dialog[open]:not(#detailSheet)')) return;
    if (replay.playing || replay.at < REPLAY_DURATION) return;
    refreshLiveSources(false);
  }, 60000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !navigator.onLine) return;
    if (!syncMeta.snapshotAt || Date.now() - syncMeta.snapshotAt > 60000) refreshLiveSources(false);
  });
}

function openSettings() {
  const form = $('#settingsForm');
  if (!form) return;
  form.githubRepo.value = connections.githubRepo || '';
  form.githubToken.value = connections.githubToken || '';
  form.trelloKey.value = connections.trelloKey || '';
  form.trelloToken.value = connections.trelloToken || '';
  form.trelloBoard.value = connections.trelloBoard || '';
  renderGithubSource();
  renderTrelloStatus();
  const dialog = $('#settingsDialog');
  if (!dialog.open) dialog.showModal();
}

function openRequest(projectId, prefill = {}) {
  const form = $('#requestForm');
  if (!form) return;
  const select = $('#requestProject');
  select.innerHTML = state.projects.map(p => `<option value="${esc(p.id)}">${esc(p.name)} · ${esc(p.repo)}</option>`).join('');
  select.value = projectId || state.projects[0]?.id;
  form.title.value = prefill.title || '';
  form.description.value = prefill.description || '';
  form.priority.value = prefill.priority || 'P1';
  form.horizon.value = prefill.horizon || 'now';
  form.labels.value = prefill.labels || 'mission,agent-ready';
  form.openGithub.checked = true;
  const dialog = $('#requestDialog');
  if (!dialog.open) dialog.showModal();
  setTimeout(() => form.title.focus(), 50);
}

function openProtocol() {
  openSheet(`
    <div style="padding:8px 0 2px;"><div class="eyebrow">PROTOCOLO ESTÁNDAR</div><h2 style="font-size:26px;letter-spacing:-1.2px;margin-top:6px;line-height:1.1;">Un agente nuevo,<br />sin colisiones<span style="color:#84a179">.</span></h2></div>
    <div class="sheet-section"><p class="agent-sheet-bio">El repo es el backend. La coordinación se publica como eventos Git. La app es un visor: no reclama, no edita issues y no ejecuta agentes.</p></div>
    <div class="sheet-section">
      <div class="sheet-section-title">Paso a paso</div>
      <div class="steps" style="grid-template-columns:1fr;gap:0;">
        <div class="step-card"><span class="step-number">01</span><div class="step-copy"><strong>Identidad única</strong><p>Elegí un id estable como <code>agent-luna</code>. Nombre, rol y repo viven en <code>orchestra/seed.json</code>.</p></div></div>
        <div class="step-card"><span class="step-number">02</span><div class="step-copy"><strong>Registro versionado</strong><p><code>python3 orchestra/coord.py register agent-luna --name Luna --role builder</code></p></div></div>
        <div class="step-card"><span class="step-number">03</span><div class="step-copy"><strong>Sincronización previa</strong><p>Pull de la rama compartida, <code>python3 orchestra/coord.py rebuild</code> y lectura de <code>state.json</code>. Sin sync no hay reclamo.</p></div></div>
        <div class="step-card"><span class="step-number">04</span><div class="step-copy"><strong>Heartbeat cada 15 min</strong><p>El cron publica <code>heartbeat</code>, lee issues y elige trabajo. El latido demuestra actividad; no reserva nada.</p></div></div>
        <div class="step-card"><span class="step-number">05</span><div class="step-copy"><strong>Reclamo con evidencia</strong><p><code>coord.py claim agent-luna mission-onboarding</code>, commit y push. Verificá que la rama compartida refleje <code>claimed</code> antes de empezar.</p></div></div>
        <div class="step-card"><span class="step-number">06</span><div class="step-copy"><strong>Branch, entrega y liberación</strong><p>Trabajá en tu branch. Al terminar, pusheá el resultado y liberá el <code>claimId</code> exacto. Un conflicto detiene a todos.</p></div></div>
      </div>
    </div>
    <div class="sheet-section"><div class="sheet-section-title">Regla de oro</div><p class="mission-detail-copy">Dos reclamos simultáneos se muestran como <strong>conflict</strong>; nadie gana por timestamp. Los agentes se detienen, acuerdan y liberan. El heartbeat no es prueba de vida ni caduca reclamos.</p></div>
    <div class="sheet-actions"><a class="primary-button" href="ORCHESTRATION.md" target="_blank" rel="noreferrer">${icon('book')} Leer protocolo completo</a><a class="ghost-button" href="orchestra/AGENT_ONBOARDING.md" target="_blank" rel="noreferrer">Onboarding ${icon('arrow-up-right')}</a></div>`);
}

function submitRequest(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const title = String(data.get('title') || '').trim();
  if (!title) return;
  const project = projectById(String(data.get('project')));
  const repo = project.repo || connections.githubRepo;
  const description = String(data.get('description') || '').trim();
  const priority = String(data.get('priority') || 'P1');
  const horizon = String(data.get('horizon') || 'now');
  const labels = String(data.get('labels') || 'mission').split(',').map(s => s.trim()).filter(Boolean);
  const body = [
    `## Objetivo`,
    description || title,
    ``,
    `## Contexto`,
    `- Repo: \`${repo}\``,
    `- Proyecto: **${project.name}**`,
    `- Horizonte: **${HORIZONS[horizon] || horizon}**`,
    `- Prioridad: **${priority}**`,
    `- Pedido por: Alex desde Conductor`,
    ``,
    `## Protocolo`,
    `Un agente debe registrarse, sincronizar, reclamar esta misión con un evento \`claim\` pusheado y liberar el \`claimId\` al terminar. Si hay conflicto, detenerse y coordinar.`,
    ``,
    `<!-- conductor:request -->`
  ].join('\n');
  const issueUrl = `https://github.com/${repo}/issues/new?${new URLSearchParams({ title, body, labels: labels.join(',') }).toString()}`;
  localRequests.unshift({ title, repo, priority, horizon, createdAt: new Date().toISOString() });
  saveRequests();

  const shouldOpen = data.get('openGithub') === 'on';
  if (shouldOpen && !connections.githubToken) window.open(issueUrl, '_blank', 'noopener');
  const dialog = $('#requestDialog');
  if (shouldOpen && connections.githubToken) {
    fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${connections.githubToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, labels })
    }).then(res => {
      if (!res.ok) throw new Error(`GitHub ${res.status}`);
      return res.json();
    }).then(issue => {
      toast(`Issue #${issue.number} creado en ${repo}`);
      syncGitHub(false);
    }).catch(err => toast(`No se pudo crear el issue (${err.message}). El pedido quedó guardado localmente.`));
  } else {
    toast(shouldOpen ? 'Pedido listo. Abrí GitHub para publicarlo.' : 'Pedido guardado localmente. Se publica desde GitHub.');
  }
  dialog.close();
  form.reset();
}

function submitSettings(event) {
  event.preventDefault();
  const form = event.currentTarget;
  connections = {
    githubRepo: form.githubRepo.value.trim().replace(/^https?:\/\/github.com\//, '').replace(/\/$/, ''),
    githubToken: form.githubToken.value.trim(),
    trelloKey: form.trelloKey.value.trim(),
    trelloToken: form.trelloToken.value.trim(),
    trelloBoard: form.trelloBoard.value.trim()
  };
  saveConnections();
  $('#settingsDialog').close();
  renderGithubSource();
  renderSidebar();
  syncGitHub(true);
  if (connections.trelloKey && connections.trelloToken && connections.trelloBoard) syncTrello(true);
  else {
    trello = { ...trello, live: false };
    renderTrelloBoard();
    renderMachinePreview();
    renderWorldMachine();
  }
}

function clearConnections() {
  try { localStorage.removeItem('conductor.connections'); } catch (_) {}
  connections = { githubRepo: state.workspace.repo || 'gamer-frog/PlayGround', githubToken: '', trelloKey: '', trelloToken: '', trelloBoard: '' };
  github = { live: false, repo: connections.githubRepo, issues: [], updatedAt: null, error: null };
  trello = { live: false, lists: [], cards: [], actions: [], updatedAt: null, error: null };
  syncMeta.githubAt = null;
  syncMeta.trelloAt = null;
  const form = $('#settingsForm');
  if (form) {
    form.githubRepo.value = connections.githubRepo;
    form.githubToken.value = '';
    form.trelloKey.value = '';
    form.trelloToken.value = '';
    form.trelloBoard.value = '';
  }
  renderAll();
  toast('Conexiones limpiadas. Volvimos al snapshot del repo.');
}

function openTrelloBoardOrSettings() {
  if (trello.live) {
    navigate('missions');
    setTimeout(() => $('.board-block')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 260);
  } else openSettings();
}

function bindEvents() {
  bindPalette();
  window.addEventListener('hashchange', () => applyRouteFromHash());

  document.addEventListener('click', event => {
    const scope = event.target.closest('[data-scope-kind]');
    if (scope) {
      event.preventDefault();
      selectScope(scope.dataset.scopeKind, scope.dataset.scopeId);
      return;
    }

    const copyLink = event.target.closest('[data-copy-link]');
    if (copyLink) { event.preventDefault(); copyCurrentLink(); return; }

    const viewButton = event.target.closest('[data-view]');
    if (viewButton) { event.preventDefault(); navigate(viewButton.dataset.view); return; }

    const go = event.target.closest('[data-go]');
    if (go) { event.preventDefault(); navigate(go.dataset.go); return; }

    const mission = event.target.closest('[data-mission]');
    if (mission) { event.preventDefault(); openMission(mission.dataset.mission); return; }

    const agent = event.target.closest('[data-agent]');
    if (agent) { event.preventDefault(); openAgent(agent.dataset.agent); return; }

    const room = event.target.closest('[data-room-jump]');
    if (room) { event.preventDefault(); jumpToRoom(room.dataset.roomJump); return; }

    const roomFilter = event.target.closest('[data-room-filter]');
    if (roomFilter) {
      activeRoom = roomFilter.dataset.roomFilter;
      if (activeRoom === 'all') setRouteHash('world', null, null);
      else setRouteHash('world', 'project', activeRoom);
      $$('.room-chip').forEach(chip => chip.classList.toggle('active', chip.dataset.roomFilter === activeRoom));
      $$('.room').forEach(roomEl => roomEl.classList.toggle('filtered', activeRoom !== 'all' && roomEl.dataset.roomId !== activeRoom));
      return;
    }

    const status = event.target.closest('[data-status]');
    if (status) {
      missionFilter = status.dataset.status;
      renderMissions();
      return;
    }

    const projectLink = event.target.closest('[data-project-link]');
    if (projectLink) {
      projectFilter = projectLink.dataset.projectLink;
      missionFilter = 'open';
      navigate('missions');
      return;
    }

    const filterProject = event.target.closest('[data-filter-project]');
    if (filterProject) {
      projectFilter = filterProject.dataset.filterProject;
      closeSheet();
      if (currentView !== 'missions') navigate('missions'); else renderMissions();
      return;
    }

    const prefillMission = event.target.closest('[data-prefill-mission]');
    if (prefillMission) {
      const m = missionById(prefillMission.dataset.prefillMission);
      closeSheet();
      openRequest(m?.projectId, { title: m ? `Seguimiento · ${m.title}` : '', description: m ? `Continuación de #${m.issue}. ` : '', priority: m?.priority || 'P1', horizon: m?.horizon === 'done' ? 'now' : m?.horizon });
      return;
    }
    const prefillAgent = event.target.closest('[data-prefill-agent]');
    if (prefillAgent) {
      const a = agentById(prefillAgent.dataset.prefillAgent);
      closeSheet();
      openRequest(a.projectId, { title: `Misión para ${a.name}`, description: `Contexto para ${a.name} (${a.role}): `, horizon: 'now' });
      return;
    }
  });

  $('#homePlay')?.addEventListener('click', togglePlayback);
  $('#worldPlay')?.addEventListener('click', togglePlayback);
  $('#homeReplay')?.addEventListener('input', e => setReplay(e.target.value));
  $('#worldReplay')?.addEventListener('input', e => setReplay(e.target.value));
  $('#replayReset')?.addEventListener('click', () => { setReplay(REPLAY_DURATION); toast('Volvimos al presente · último heartbeat hace 2m'); });
  $('#worldSpeed')?.addEventListener('click', () => {
    const speeds = [1, 2, 4];
    replay.speed = speeds[(speeds.indexOf(replay.speed) + 1) % speeds.length];
    $('#worldSpeed').textContent = `${replay.speed}×`;
    toast(`Velocidad del replay: ${replay.speed}×`);
  });

  $('#settingsButton')?.addEventListener('click', openSettings);
  $('#settingsMini')?.addEventListener('click', openSettings);
  $('#sidebarConnection')?.addEventListener('click', openSettings);
  $('#worldSettings')?.addEventListener('click', openSettings);
  $('#livePill')?.addEventListener('click', () => navigate('world'));
  $('#syncGithubButton')?.addEventListener('click', () => syncGitHub(true));
  $('#syncGithubInline')?.addEventListener('click', () => syncGitHub(true));
  $('#opsRefresh')?.addEventListener('click', () => refreshLiveSources(true));
  $('#openTrelloButton')?.addEventListener('click', openTrelloBoardOrSettings);
  $('#worldTrelloButton')?.addEventListener('click', openTrelloBoardOrSettings);
  $('#requestMissionButton')?.addEventListener('click', () => openRequest(state.projects[0]?.id));
  $('#homeRequestButton')?.addEventListener('click', () => openRequest(state.projects[0]?.id));
  $('#projectFilterButton')?.addEventListener('click', openProjectFilter);
  $('#registerAgentButton')?.addEventListener('click', openProtocol);
  $('#readProtocolButton')?.addEventListener('click', openProtocol);

  $('#closeSheet')?.addEventListener('click', closeSheet);
  $('#detailSheet')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeSheet(); });
  $('#closeRequest')?.addEventListener('click', () => $('#requestDialog').close());
  $('#cancelRequest')?.addEventListener('click', () => $('#requestDialog').close());
  $('#requestDialog')?.addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
  $('#requestForm')?.addEventListener('submit', submitRequest);
  $('#closeSettings')?.addEventListener('click', () => $('#settingsDialog').close());
  $('#settingsDialog')?.addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
  $('#settingsForm')?.addEventListener('submit', submitSettings);
  $('#clearConnections')?.addEventListener('click', clearConnections);

  document.addEventListener('keydown', e => {
    if (e.key === ' ' && (e.target === document.body || e.target.closest('.world-card'))) {
      if (currentView === 'world') { e.preventDefault(); togglePlayback(); }
    }
  });
}

async function boot() {
  hydrateIcons();
  bindEvents();
  loadConnections();
  renderAll();
  await loadSnapshot();
  renderAll();
  updateReplayUI();
  if (!location.hash) {
    appliedHash = routeHash('home');
    history.replaceState(null, '', appliedHash);
  }
  applyRouteFromHash(true);
  startAutoRefresh();
  if (navigator.onLine) {
    setTimeout(() => syncGitHub(false), 300);
    if (connections.trelloKey && connections.trelloToken && connections.trelloBoard) setTimeout(() => syncTrello(false), 500);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
