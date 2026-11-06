/* Conductor — short, mid and long horizon plan. */

function renderPlan() {
  const missions = scopedMissions();
  const now = missions.filter(m => m.horizon === 'now' && isOpen(m)).length;
  const week = missions.filter(m => m.horizon === 'week' && isOpen(m)).length;
  const month = missions.filter(m => m.horizon === 'month' && isOpen(m)).length;
  const summary = $('#planSummary');
  if (summary) {
    summary.innerHTML = `
      <article class="plan-summary-card"><span>Ahora</span><strong>${String(now).padStart(2, '0')}</strong><small>misiones en foco</small></article>
      <article class="plan-summary-card"><span>Esta semana</span><strong>${String(week).padStart(2, '0')}</strong><small>próximos entregables</small></article>
      <article class="plan-summary-card"><span>Este mes</span><strong>${String(month).padStart(2, '0')}</strong><small>apuestas de largo plazo</small></article>`;
  }
  const chip = $('#weekChip');
  if (chip) {
    const start = dateFromOffset(0), end = dateFromOffset(6);
    const fmt = d => `${d.getDate()} ${new Intl.DateTimeFormat('es', { month: 'short' }).format(d).replace('.', '').toUpperCase()}`;
    chip.textContent = `${fmt(start)} — ${fmt(end)}`;
  }
  renderGantt();
  renderAfterList();
  renderMonthTrack();
  renderLoopGrid();
  renderSidebar();
}

function renderGantt() {
  const el = $('#gantt');
  if (!el) return;
  const days = Array.from({ length: 7 }, (_, i) => dateFromOffset(i));
  const head = `<div class="gantt-head"><span>MISIÓN</span>${days.map((d, i) => `<span class="${i === 0 ? 'today' : ''}">${new Intl.DateTimeFormat('es', { weekday: 'short' }).format(d).replace('.', '').toUpperCase()} ${String(d.getDate()).padStart(2, '0')}</span>`).join('')}</div>`;
  const missions = scopedMissions()
    .filter(m => isOpen(m) && (m.startDay || 0) < 7)
    .sort((a, b) => (a.startDay || 0) - (b.startDay || 0));
  const rows = missions.map(m => {
    const p = projectById(m.projectId);
    const start = clamp(m.startDay || 0, 0, 6);
    const duration = clamp(m.durationDays || 1, 1, 7 - start);
    const type = m.type === 'loop' ? 'loop' : m.status;
    const blocked = isBlocked(m);
    const label = m.type === 'loop' ? '↻ loop' : blocked ? `${statusData(m.status).es} · bloq.` : statusData(m.status).es;
    return `<div class="gantt-row">
      <div class="gantt-label"><i style="background:${esc(p.color)}"></i><span title="${esc(m.title)}">${esc(m.title)}</span></div>
      <div class="gantt-track"><div class="gantt-bar ${esc(type)} ${blocked ? 'is-blocked' : ''}" style="grid-column:${start + 1} / span ${duration}" title="${esc(m.title)} · ${esc(label)}">${esc(label)}</div></div>
    </div>`;
  }).join('');
  el.innerHTML = `<div class="gantt-inner">${head}${rows || '<div class="empty-state">No hay trabajo agendado para los próximos días.</div>'}</div>`;
}

function renderAfterList() {
  const el = $('#afterList');
  if (!el) return;
  const items = scopedMissions()
    .filter(m => m.horizon === 'week' && isOpen(m))
    .sort((a, b) => (a.startDay || 0) - (b.startDay || 0));
  el.innerHTML = items.length ? items.map(m => {
    const p = projectById(m.projectId);
    const a = agentById(m.assignee);
    return `<button class="after-row" data-mission="${esc(m.id)}">
      <span class="after-date">${esc(dateOffsetLabel(m.startDay || 0))}</span>
      <span class="after-dot" style="border-color:${esc(p.color)}"></span>
      <span class="after-copy"><strong>${esc(m.title)}</strong><small>${esc(p.name)} · ${esc(HORIZONS[m.horizon])}</small></span>
      <span class="after-avatar">${avatarSVG(a)}</span>
    </button>`;
  }).join('') : '<div class="empty-state">Nada agendado para la próxima semana.</div>';
}

function renderMonthTrack() {
  const el = $('#monthTrack');
  if (!el) return;
  const items = scopedMissions()
    .filter(m => m.horizon === 'month' && isOpen(m))
    .sort((a, b) => (a.startDay || 0) - (b.startDay || 0));
  el.innerHTML = items.length ? items.map(m => {
    const p = projectById(m.projectId);
    const date = dateFromOffset(m.startDay || 0);
    const pct = clamp(Number(projectById(m.projectId).progress) || 20, 14, 92);
    return `<button class="month-row" data-mission="${esc(m.id)}">
      <span class="month-week">S${isoWeek(date)}</span>
      <span class="month-bar"><span style="width:${pct}%;background:${esc(p.color)}"></span></span>
      <span class="month-copy" title="${esc(m.title)}">${esc(m.title)}</span>
    </button>`;
  }).join('') : '<div class="empty-state">No hay apuestas de largo plazo.</div>';
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

function renderLoopGrid() {
  const el = $('#loopGrid');
  if (!el) return;
  const loops = scopedLoops();
  el.innerHTML = loops.length ? loops.map(loop => {
    const agent = agentById(loop.agentId);
    const p = projectById(loop.projectId);
    return `<article class="loop-card">
      <span class="loop-icon">${icon(loop.status === 'active' ? 'loop' : 'pause')}</span>
      <span class="loop-copy">
        <span style="display:flex;align-items:center;gap:5px;"><strong>${esc(loop.name)}</strong><span class="loop-status ${loop.status === 'paused' ? 'paused' : ''}">${esc(loop.status === 'active' ? 'activo' : 'pausado')}</span></span>
        <p>${esc(loop.description || '')}</p>
        <span class="loop-meta">${miniFace(agent)} ${esc(agent.name)} · ${esc(loop.cadence || loop.cron)} · ${esc(loop.nextRun || '')}</span>
        <span class="loop-meta" style="color:#96a69a">Último: ${esc(loop.lastResult || loop.lastRun || '—')}</span>
      </span>
    </article>`;
  }).join('') : '<div class="empty-state">No hay loops configurados.</div>';
}

function openPlanning() {
  navigate('missions');
  const section = $('#planningSection');
  if (!section) return;
  section.open = true;
  requestAnimationFrame(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}
