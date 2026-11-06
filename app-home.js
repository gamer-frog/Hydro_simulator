/* Conductor — home view. */

function renderHome() {
  const now = new Date();
  if ($('#todayLabel')) {
    $('#todayLabel').textContent = new Intl.DateTimeFormat('es', { weekday: 'long', day: '2-digit', month: 'short' }).format(now).replace('.', '').replace(',', ' ·').toUpperCase();
  }
  renderHeroAvatars();
  renderLiveCard();
  renderHomeStats();
  renderNowList();
  renderStudioPreview();
  renderMiniPlan();
  renderMiniLoops();
  renderHomeIssues();
  renderMachinePreview();
  renderOpsHealth();
  renderSidebar();
  updateReplayUI();
}

function renderHeroAvatars() {
  const el = $('#heroAvatars');
  if (!el) return;
  const agents = scopedAgents();
  const faces = agents.slice(0, 4).map(a => miniFace(a)).join('');
  const extra = agents.length > 4 ? `<span class="more-face">+${agents.length - 4}</span>` : '';
  const working = agents.filter(a => a.status !== 'idle').length;
  el.innerHTML = `${faces}${extra}<span class="cluster-label"><strong>${working} en el estudio</strong><span>heartbeat cada 15 min</span></span>`;
}

function renderLiveCard() {
  const events = scopedEventsUpTo();
  const agentIds = new Set(events.map(e => e.agentId));
  const pushes = events.filter(e => e.type === 'push' || e.type === 'commit').length;
  if ($('#liveAgentCount')) $('#liveAgentCount').textContent = agentIds.size || 0;
  if ($('#liveSignalCount')) $('#liveSignalCount').textContent = events.length;
  if ($('#livePushCount')) $('#livePushCount').textContent = pushes;
  if ($('#pulseGraph')) $('#pulseGraph').innerHTML = pulseGraphSVG();
  updateReplayUI();
}

function pulseGraphSVG() {
  const bins = Array(15).fill(0);
  scopedActivity().forEach(e => {
    const idx = clamp(Math.floor((REPLAY_DURATION - e.agoSeconds) / 60), 0, 14);
    bins[idx] += 1;
  });
  const max = Math.max(2, ...bins);
  const width = 300, height = 78, base = 66, step = 20;
  const points = bins.map((count, i) => {
    const x = 6 + i * step;
    const y = base - (count / max) * 43;
    return [x, y, count];
  });
  let line = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1], cur = points[i];
    const mid = (prev[0] + cur[0]) / 2;
    line += ` C ${mid},${prev[1]} ${mid},${cur[1]} ${cur[0]},${cur[1]}`;
  }
  const area = `${line} L${points[points.length - 1][0]},${height} L${points[0][0]},${height} Z`;
  const dots = points.filter(p => p[2] > 0).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.15" fill="#d4e9bf" opacity=".7"/>`).join('');
  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Densidad de actividad en los últimos 15 minutos">
    <defs>
      <linearGradient id="pulseArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#b9dba0" stop-opacity=".28"/>
        <stop offset="1" stop-color="#b9dba0" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <line x1="4" y1="${base}" x2="${width - 4}" y2="${base}" stroke="rgba(214,235,201,.14)" stroke-width=".7"/>
    <path d="${area}" fill="url(#pulseArea)"/>
    <path d="${line}" fill="none" stroke="#c8e3b1" stroke-width="1.35" stroke-linejoin="round" opacity=".92" vector-effect="non-scaling-stroke"/>
    ${dots}
    <line x1="${width - 8}" y1="20" x2="${width - 8}" y2="${base + 3}" stroke="rgba(218,238,204,.26)" stroke-width=".7" stroke-dasharray="2 3"/>
    <circle cx="${width - 8}" cy="${points[14][1]}" r="1.8" fill="#e4f2d7"/>
  </svg>`;
}

function renderHomeStats() {
  const missions = scopedMissions();
  const projects = scopedProjects();
  const agents = scopedAgents();
  const loops = scopedLoops();
  const open = missions.filter(isOpen).length;
  const working = missions.filter(m => m.status === 'working').length;
  const activeLoops = loops.filter(l => l.status === 'active');
  const el = $('#homeStats');
  if (!el) return;
  el.innerHTML = `
    <article class="stat-card"><div class="stat-top"><span>Issues</span><span class="stat-icon sage">${icon('git-issue')}</span></div><strong>${String(open).padStart(2, '0')}<small>issues</small></strong><div class="stat-foot">en ${projects.length} repos</div></article>
    <article class="stat-card"><div class="stat-top"><span>En curso</span><span class="stat-icon peach">${icon('run')}</span></div><strong>${String(working).padStart(2, '0')}<small>misiones</small></strong><div class="stat-foot">${agents.filter(a => a.status !== 'idle').length} agentes despiertos</div></article>
    <article class="stat-card"><div class="stat-top"><span>Loops hoy</span><span class="stat-icon blue">${icon('loop')}</span></div><strong>${String(activeLoops.length).padStart(2, '0')}<small>activos</small></strong><div class="stat-foot">siguiente · ${activeLoops[0]?.nextRun || '—'}</div></article>`;
}

function renderNowList() {
  const el = $('#nowList');
  if (!el) return;
  const events = scopedEventsUpTo().sort((a, b) => a.agoSeconds - b.agoSeconds).slice(0, 4);
  if (!events.length) {
    el.innerHTML = `<div class="now-empty">Todavía no hay señales en este punto del replay.</div>`;
    return;
  }
  el.innerHTML = events.map(e => {
    const agent = agentById(e.agentId);
    const p = projectById(e.projectId);
    const secondsAgo = eventAgeAt(e);
    return `<button class="now-row" data-agent="${esc(agent.id)}">
      ${miniFace(agent)}
      <span class="now-copy"><span class="now-name"><strong>${esc(agent.name)}</strong><span class="state-dot ${esc(agent.status)}"></span><span class="repo-mini">${esc(p.name)}</span></span><span class="now-action">${esc(e.text)}</span></span>
      <span class="now-time">${esc(relativeAgo(secondsAgo))}</span>
    </button>`;
  }).join('');
}

function renderStudioPreview() {
  const el = $('#studioPreview');
  if (!el) return;
  const rooms = scopedProjects().map(p => {
    const agents = state.agents.filter(a => a.projectId === p.id);
    const faces = agents.slice(0, 3).map(a => miniFace(a)).join('');
    const lead = currentEventFor(agents[0]?.id);
    return `<button class="mini-room" data-room-jump="${esc(p.id)}">
      <span class="mini-room-avatars">${faces || `<span class="mini-agent-face" style="background:${p.color}"></span>`}</span>
      <span class="mini-room-copy"><strong>${esc(p.name)}</strong><small>${lead ? esc(lead.text.split('·')[0].trim()) : p.issuesOpen + ' issues'}</small></span>
    </button>`;
  }).join('');
  el.innerHTML = `<div class="mini-room-grid">${rooms}</div>`;
}

function renderMiniPlan() {
  const el = $('#miniPlan');
  if (!el) return;
  const items = scopedMissions()
    .filter(m => m.horizon !== 'done' && isOpen(m))
    .sort((a, b) => (a.startDay || 0) - (b.startDay || 0))
    .slice(0, 4);
  el.innerHTML = items.length ? items.map(m => {
    const p = projectById(m.projectId);
    const a = agentById(m.assignee);
    return `<button class="mini-plan-row ${isBlocked(m) ? 'blocked' : ''}" data-mission="${esc(m.id)}">
      <span class="plan-date">${esc(dateOffsetLabel(m.startDay || 0))}</span>
      <span class="plan-dot" style="background:${esc(p.color)}"></span>
      <span class="plan-copy"><strong>${esc(m.title)}</strong><small>${esc(p.name)} · ${esc(HORIZONS[m.horizon] || '')}${isBlocked(m) ? ' · bloqueada' : ''}</small></span>
      ${miniFace(a)}
    </button>`;
  }).join('') : '<div class="empty-state">No hay misiones próximas.</div>';
}

function renderMiniLoops() {
  const el = $('#miniLoops');
  if (!el) return;
  el.innerHTML = scopedLoops().slice(0, 3).map(l => {
    const a = agentById(l.agentId);
    return `<div class="mini-loop">
      <span class="loop-icon">${icon(l.status === 'active' ? 'loop' : 'pause')}</span>
      <span class="loop-copy"><strong>${esc(l.name)}</strong><small>${esc(a.name)} · ${esc(l.nextRun || l.cron)}</small></span>
      <span class="loop-time">${esc(l.cron)}</span>
    </div>`;
  }).join('');
}

function renderHomeIssues() {
  const el = $('#homeIssues');
  if (!el) return;
  const items = githubItems(4);
  el.innerHTML = items.length ? items.map(item => issueRowMarkup(item, true)).join('') : '<div class="empty-state">No hay issues para mostrar.</div>';
  const tag = $('#githubSourceTag');
  if (tag) tag.innerHTML = `<span class="status-dot" style="background:${github.live ? '#7ca575' : '#c5ae85'}"></span> ${github.live ? `GitHub · ${github.repo}` : 'snapshot del repo · demo'}`;
}

function renderMachinePreview() {
  const el = $('#machinePreview');
  if (!el) return;
  const columns = boardColumns().slice(1, 5);
  el.innerHTML = columns.map(col => `
    <div class="machine-col">
      <div class="machine-col-title">${esc(col.short)}<span>${col.cards.length}</span></div>
      ${col.cards.slice(0, 2).map(card => {
        const agent = card.agent ? agentById(card.agent) : null;
        return `<div class="machine-card" title="${esc(card.name)}">
          <strong>${esc(card.name)}</strong>
          <div class="machine-card-foot">${agent ? miniFace(agent) : `<span class="mini-agent-face" style="background:#dbe3d6"></span>`}<span class="machine-label" style="background:${card.color || '#b7c8ad'}"></span></div>
        </div>`;
      }).join('') || '<div class="board-empty">—</div>'}
    </div>`).join('');
}

function agentFreshness(agent) {
  const latest = latestEventForAgent(agent.id, REPLAY_DURATION);
  const heartbeatSeconds = Number(agent.heartbeatMinutes) || state.workspace?.heartbeatMinutes || 15;
  const threshold = heartbeatSeconds * 60 * 2;
  let seconds = latest ? eventAgeAt(latest, REPLAY_DURATION) : null;
  if (seconds == null && agent.lastHeartbeat) seconds = (Date.now() - new Date(agent.lastHeartbeat).getTime()) / 1000;
  const status = seconds == null ? 'stale' : seconds <= threshold ? 'fresh' : 'stale';
  return { latest, seconds, status, threshold, label: seconds == null ? 'sin señal' : relativeAgo(seconds) };
}

function renderOpsAttention(freshness) {
  const el = $('#opsAttention');
  if (!el) return;
  const items = [];
  const missions = scopedMissions();
  const warnings = Array.isArray(state.protocol?.warnings) ? state.protocol.warnings : [];
  warnings.forEach(warning => items.push({ kind: 'warning', title: 'Protocolo · workspace', detail: warning, rank: 0 }));
  missions.filter(m => m.claimStatus === 'conflict').forEach(mission => {
    items.push({ kind: 'conflict', title: 'Claim en conflicto', detail: mission.title, missionId: mission.id, rank: 1 });
  });
  freshness.filter(item => item.status === 'stale' && item.agent.status !== 'idle').forEach(item => {
    items.push({ kind: 'stale', title: 'Heartbeat vencido', detail: `${item.agent.name} · ${item.label}`, agentId: item.agent.id, rank: 2 });
  });
  missions.filter(mission => isOpen(mission) && isBlocked(mission)).forEach(mission => {
    const blockers = missionBlockers(mission).map(dependency => dependency.title).join(', ');
    items.push({ kind: 'blocked', title: 'En espera', detail: `${mission.title} · ${blockers}`, missionId: mission.id, rank: 3 });
  });
  items.sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title));
  const count = $('#opsAttentionCount');
  if (count) count.textContent = items.length;
  if (!items.length) {
    el.innerHTML = '<div class="attention-clear"><span aria-hidden="true">✓</span> Sin alertas operativas por ahora.</div>';
    return;
  }
  const visible = items.slice(0, 5);
  el.innerHTML = visible.map(item => {
    const attrs = item.missionId ? `data-mission="${esc(item.missionId)}"` : item.agentId ? `data-agent="${esc(item.agentId)}"` : '';
    const tag = attrs ? 'button' : 'div';
    const type = attrs ? 'type="button"' : '';
    return `<${tag} class="attention-item ${esc(item.kind)}" ${type} ${attrs}>
      <span class="attention-mark" aria-hidden="true"></span>
      <span class="attention-copy"><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></span>
      ${attrs ? '<span class="attention-arrow" aria-hidden="true">→</span>' : ''}
    </${tag}>`;
  }).join('') + (items.length > visible.length ? `<div class="attention-more">y ${items.length - visible.length} más</div>` : '');
}

function renderOpsHealth() {
  const el = $('#opsGrid');
  if (!el) return;
  const agentsInScope = scopedAgents();
  const missionsInScope = scopedMissions();
  const freshness = agentsInScope.map(agent => ({ agent, ...agentFreshness(agent) }));
  const freshCount = freshness.filter(item => item.status === 'fresh').length;
  const warnings = Array.isArray(state.protocol?.warnings) ? state.protocol.warnings : [];
  const conflicts = missionsInScope.filter(m => m.claimStatus === 'conflict').length;
  const claimed = missionsInScope.filter(m => m.claimStatus === 'claimed').length;
  const sourceLabel = sourceMode === 'repo' ? 'state.json' : 'fallback local';
  const coordinationState = warnings.length || conflicts ? 'warn' : 'ok';
  const coordinationLabel = warnings.length ? `${warnings.length} warnings` : conflicts ? `${conflicts} conflictos` : 'sin conflictos';
  const githubState = github.live ? 'ok' : 'muted';
  const githubLabel = github.live ? `live · ${lastSyncLabel(syncMeta.githubAt)}` : 'demo · snapshot local';
  el.innerHTML = `
    <article class="ops-card ${sourceMode === 'repo' ? 'ok' : 'muted'}">
      <span class="ops-card-top">Fuente <span class="ops-signal"></span></span>
      <strong>${esc(sourceLabel)}</strong>
      <small>último fetch ${esc(lastSyncLabel(syncMeta.snapshotAt))}</small>
    </article>
    <article class="ops-card ${freshness.length ? (freshCount === freshness.length ? 'ok' : 'warn') : 'muted'}">
      <span class="ops-card-top">Heartbeat · ${esc(scopeLabel())} <span class="ops-signal"></span></span>
      <strong>${freshCount}/${freshness.length}</strong>
      <small>${freshness.length ? `frescos · umbral ${Math.round((freshness[0]?.threshold || 1800) / 60)}m` : 'sin agentes asignados'}</small>
    </article>
    <article class="ops-card ${coordinationState}">
      <span class="ops-card-top">Claims · ${esc(scopeLabel())} <span class="ops-signal"></span></span>
      <strong>${claimed} <small>claims</small></strong>
      <small>${esc(coordinationLabel)}</small>
    </article>
    <article class="ops-card ${githubState}">
      <span class="ops-card-top">GitHub <span class="ops-signal"></span></span>
      <strong>${github.live ? 'live' : 'demo'}</strong>
      <small>${esc(githubLabel)}</small>
    </article>`;
  const agents = $('#opsAgents');
  if (agents) {
    agents.innerHTML = freshness.map(item => `
      <button class="ops-agent ${item.status}" data-agent="${esc(item.agent.id)}" title="${esc(item.agent.name)} · ${esc(item.label)}">
        <span class="state-dot ${esc(item.agent.status)}"></span>
        <span>${esc(item.agent.name)}</span>
        <small>${esc(item.label)}</small>
      </button>`).join('');
  }
  renderOpsAttention(freshness);
  const auto = $('#opsAutoLabel');
  if (auto) auto.textContent = syncMeta.refreshing ? 'actualizando…' : `auto · ${lastSyncLabel(syncMeta.snapshotAt)}`;
}

function renderSyncStatus() {
  if (currentView === 'home') renderOpsHealth();
  renderSidebar();
}

function updateHomeReplay() {
  const events = scopedEventsUpTo();
  const agentIds = new Set(events.map(e => e.agentId));
  if ($('#liveAgentCount')) $('#liveAgentCount').textContent = agentIds.size;
  if ($('#liveSignalCount')) $('#liveSignalCount').textContent = events.length;
  if ($('#livePushCount')) $('#livePushCount').textContent = events.filter(e => e.type === 'push' || e.type === 'commit').length;
  if (currentView === 'home') renderNowList();
}
