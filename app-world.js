/* Conductor — isometric studio + replay. */

function renderWorld() {
  const stage = $('#worldStage');
  if (!stage) return;
  const projects = scopedProjects();
  if (activeRoom !== 'all' && !projects.some(project => project.id === activeRoom)) activeRoom = 'all';
  const filters = $('#roomFilters');
  if (filters) {
    filters.innerHTML = `<button class="room-chip ${activeRoom === 'all' ? 'active' : ''}" data-room-filter="all">Todos</button>` +
      projects.map(p => `<button class="room-chip ${activeRoom === p.id ? 'active' : ''}" data-room-filter="${esc(p.id)}">${esc(p.name)}</button>`).join('');
  }
  stage.innerHTML = projects.map((p, i) => worldRoomMarkup(p, i)).join('');
  renderWorldSignals();
  renderRoomList();
  renderWorldMachine();
  updateReplayUI();
  syncWorldLive();
}

function roomSpots(projectId, at = replay.at) {
  const agents = state.agents.filter(a => a.projectId === projectId);
  const placed = [];
  const spots = new Map();
  const offsets = [[7, -7], [-7, -7], [7, 7], [-7, 7], [0, -13], [0, 13], [14, 0], [-14, 0]];
  agents.forEach(agent => {
    const event = currentEventFor(agent.id, at);
    const base = event?.spot || agent.home || { x: 50, y: 55 };
    let spot = { ...base };
    let tries = 0;
    while (tries < offsets.length && placed.some(p => Math.abs(p.x - spot.x) < 14 && Math.abs(p.y - spot.y) < 13)) {
      spot = { x: base.x + offsets[tries][0], y: base.y + offsets[tries][1] };
      tries++;
    }
    spot.x = clamp(spot.x, 20, 80);
    spot.y = clamp(spot.y, 30, 72);
    placed.push(spot);
    spots.set(agent.id, spot);
  });
  return spots;
}

function worldRoomMarkup(project, index) {
  const r = project.room || { x: 1, y: 2, w: 48, h: 42 };
  const agents = state.agents.filter(a => a.projectId === project.id);
  const spots = roomSpots(project.id);
  const deco = [
    { desks: [{ x: 29, y: 49 }, { x: 67, y: 53 }], plant: { x: 14, y: 51 }, lamp: { x: 50, y: 43 } },
    { desks: [{ x: 35, y: 51 }, { x: 69, y: 47 }], plant: { x: 18, y: 55 }, lamp: { x: 54, y: 44 } },
    { desks: [{ x: 31, y: 52 }, { x: 64, y: 49 }], plant: { x: 16, y: 48 }, lamp: { x: 48, y: 44 } },
    { desks: [{ x: 36, y: 50 }, { x: 68, y: 54 }], plant: { x: 14, y: 54 }, lamp: { x: 53, y: 44 } }
  ][index % 4];
  const desks = deco.desks.map(d => `<span class="desk" style="left:${d.x}%;top:${d.y}%"></span>`).join('');
  const agentsMarkup = agents.map(agent => {
    const event = currentEventFor(agent.id);
    const spot = spots.get(agent.id) || agent.home || { x: 50, y: 55 };
    return `<button class="world-agent" data-world-agent="${esc(agent.id)}" data-agent="${esc(agent.id)}" style="left:${spot.x}%;top:${spot.y}%;" aria-label="${esc(agent.name)} · ${esc(agent.role)}">
      ${agentFace(agent)}
      <span class="agent-tag">${esc(agent.name)}</span>
      <span class="agent-bubble"></span>
    </button>`;
  }).join('');
  return `<div class="room ${activeRoom !== 'all' && activeRoom !== project.id ? 'filtered' : ''}" data-room-id="${esc(project.id)}" style="left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%">
    <div class="room-wall back-left"></div>
    <div class="room-wall back-right"></div>
    <div class="room-floor"></div>
    ${desks}
    <span class="plant" style="left:${deco.plant.x}%;top:${deco.plant.y}%"></span>
    <span class="room-lamp" style="left:${deco.lamp.x}%;top:${deco.lamp.y}%"></span>
    <div class="room-label"><span class="room-dot" style="background:${esc(project.color)}"></span><strong>${esc(project.name)}</strong>${project.repo.split('/')[1] && project.repo.split('/')[1] !== project.name ? `<small>${esc(project.repo.split('/')[1])}</small>` : ''}</div>
    <div class="room-activity" data-room-activity="${esc(project.id)}">${agents.length} agentes · ${project.issuesOpen || 0} issues</div>
    ${agentsMarkup}
  </div>`;
}

function syncWorldLive() {
  const stage = $('#worldStage');
  if (!stage) return;
  const events = scopedEventsUpTo();
  const latestByProject = new Map();
  events.forEach(e => {
    const eventAt = REPLAY_DURATION - e.agoSeconds;
    const prev = latestByProject.get(e.projectId);
    if (!prev || eventAt > (REPLAY_DURATION - prev.agoSeconds)) latestByProject.set(e.projectId, e);
  });
  const spotMap = new Map();
  state.projects.forEach(p => roomSpots(p.id).forEach((spot, id) => spotMap.set(id, spot)));

  $$('.world-agent', stage).forEach(token => {
    const id = token.dataset.worldAgent;
    const agent = agentById(id);
    const event = currentEventFor(id);
    const spot = spotMap.get(id) || agent.home || { x: 50, y: 55 };
    token.style.left = `${spot.x}%`;
    token.style.top = `${spot.y}%`;
    const lead = event && latestByProject.get(agent.projectId)?.id === event.id;
    token.classList.toggle('lead', Boolean(lead));
    const mode = event?.type === 'idle' || agent.status === 'idle' ? 'idle' : agent.status === 'reviewing' ? 'reviewing' : 'working';
    token.classList.remove('working', 'reviewing', 'idle');
    token.classList.add(mode);
    const hasAgentAbove = state.agents
      .filter(a => a.projectId === agent.projectId && a.id !== agent.id)
      .map(a => spotMap.get(a.id))
      .filter(Boolean)
      .some(other => other.y < spot.y - 4 && Math.abs(other.x - spot.x) < 26);
    token.classList.toggle('bubble-below', spot.y > 48 && hasAgentAbove);
    token.dataset.eventId = event?.id || '';
    token.setAttribute('aria-label', `${agent.name} · ${event ? event.text : 'esperando heartbeat'}`);
    const bubble = $('.agent-bubble', token);
    if (bubble && event) {
      const signature = `${event.id}`;
      if (bubble.dataset.signature !== signature) {
        bubble.dataset.signature = signature;
        bubble.innerHTML = `<span class="bubble-kind">${esc(TYPE_LABEL[event.type] || event.type)}</span><span class="bubble-text">${esc(event.text)}</span>`;
      }
    } else if (bubble) {
      bubble.innerHTML = '';
      bubble.dataset.signature = '';
    }
    token.title = `${agent.name} · ${agent.role}\n${event ? event.text : 'Esperando el próximo heartbeat'}`;
  });

  state.projects.forEach(p => {
    const label = $(`[data-room-activity="${p.id}"]`);
    if (!label) return;
    const agents = state.agents.filter(a => a.projectId === p.id);
    const lead = latestByProject.get(p.id);
    const active = agents.filter(a => currentEventFor(a.id)).length;
    label.textContent = lead ? `${active} activos · ${TYPE_LABEL[lead.type] || lead.type} ${relativeAgo(eventAgeAt(lead))}` : `${agents.length} agentes · ${p.issuesOpen || 0} issues`;
  });
  renderWorldSignals();
}

function renderWorldSignals() {
  const el = $('#worldSignals');
  if (!el) return;
  const events = scopedEventsUpTo().sort((a, b) => a.agoSeconds - b.agoSeconds).slice(0, 5);
  if (!events.length) {
    el.innerHTML = `<div class="empty-state">Sin señales en este instante.</div>`;
    return;
  }
  el.innerHTML = events.map(e => {
    const agent = agentById(e.agentId);
    const p = projectById(e.projectId);
    const secondsAgo = eventAgeAt(e);
    return `<div class="signal-row">
      ${miniFace(agent)}
      <div class="signal-copy"><strong>${esc(agent.name)} <span class="signal-type">${esc(TYPE_LABEL[e.type] || e.type)}</span></strong><p>${esc(e.text)}</p><small>${esc(p.name)} · ${esc(relativeAgo(secondsAgo))}</small></div>
    </div>`;
  }).join('');
}

function renderRoomList() {
  const el = $('#roomList');
  if (!el) return;
  el.innerHTML = scopedProjects().map(p => {
    const agents = state.agents.filter(a => a.projectId === p.id);
    const active = agents.filter(a => a.status !== 'idle').length;
    return `<button class="room-list-row" data-room-jump="${esc(p.id)}">
      <span class="room-swatch" style="background:${esc(p.color)}"></span>
      <span class="room-list-copy"><strong>${esc(p.name)}</strong><small>${esc(p.repo)}</small></span>
      <span class="room-list-state">${active} activos</span>
    </button>`;
  }).join('');
}

function renderWorldMachine() {
  const el = $('#worldMachine');
  if (!el) return;
  const columns = boardColumns().filter(c => ['working', 'review', 'done'].includes(c.key));
  el.innerHTML = columns.map(col => `
    <div class="machine-col">
      <div class="machine-col-title">${esc(col.short)}<span>${col.cards.length}</span></div>
      ${col.cards.slice(0, 1).map(card => {
        const agent = card.agent ? agentById(card.agent) : null;
        return `<div class="machine-card">
          <strong>${esc(card.name)}</strong>
          <div class="machine-card-foot">${agent ? miniFace(agent) : '<span class="mini-agent-face" style="background:#dbe3d6"></span>'}<span class="machine-label" style="background:${card.color || '#b7c8ad'}"></span></div>
        </div>`;
      }).join('') || '<div class="board-empty">—</div>'}
    </div>`).join('');
}

function jumpToRoom(projectId) {
  navigate('world', { detail: projectId ? { kind: 'project', id: projectId } : null });
}
