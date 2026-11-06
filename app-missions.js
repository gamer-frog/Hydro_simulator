/* Conductor — missions, GitHub bridge and Trello machine state. */

function renderMissions() {
  renderMissionToolbar();
  renderGithubSource();
  renderMissionList();
  renderTrelloBoard();
  renderGithubIssues();
  renderSidebar();
}

function renderMissionToolbar() {
  const missions = scopedMissions();
  const counts = {
    open: missions.filter(isOpen).length,
    working: missions.filter(m => m.status === 'working').length,
    review: missions.filter(m => m.status === 'review').length,
    blocked: missions.filter(m => isOpen(m) && isBlocked(m)).length,
    done: missions.filter(m => m.status === 'done').length
  };
  if ($('#openCount')) $('#openCount').textContent = counts.open;
  if ($('#blockedCount')) $('#blockedCount').textContent = counts.blocked;
  $$('#statusFilters [data-status]').forEach(btn => btn.classList.toggle('active', btn.dataset.status === missionFilter));
  if ($('#projectFilterLabel')) {
    $('#projectFilterLabel').textContent = projectFilter === 'all' ? 'Todos los repos' : projectById(projectFilter).name;
  }
}

function filteredMissions() {
  let items = scopedMissions();
  if (projectFilter !== 'all') items = items.filter(m => m.projectId === projectFilter);
  if (missionFilter === 'open') items = items.filter(isOpen);
  else if (missionFilter === 'blocked') items = items.filter(m => isOpen(m) && isBlocked(m));
  else if (missionFilter === 'done') items = items.filter(m => m.status === 'done' || m.githubState === 'closed');
  else items = items.filter(m => m.status === missionFilter);
  const rank = { working: 0, review: 1, ready: 2, backlog: 3, done: 4 };
  return items.sort((a, b) => {
    const sa = rank[a.status] ?? 3;
    const sb = rank[b.status] ?? 3;
    return sa - sb || (a.startDay || 0) - (b.startDay || 0);
  });
}

function renderMissionList() {
  const el = $('#missionList');
  if (!el) return;
  const items = filteredMissions();
  el.innerHTML = items.length ? items.map(m => missionCardMarkup(m)).join('') : '<div class="empty-state">No hay misiones en este filtro. Probá con otro repo o pedí una nueva.</div>';
}

function missionCardMarkup(m) {
  const p = projectById(m.projectId);
  const agent = agentById(m.assignee);
  const stateInfo = statusData(m.status);
  const pct = m.totalSubtasks ? Math.round((m.subtasks / m.totalSubtasks) * 100) : (m.status === 'done' ? 100 : 0);
  const labels = (m.labels || []).slice(0, 3).map(l => `<span class="label-pill">${esc(l)}</span>`).join('');
  const blocked = isBlocked(m);
  return `<button class="mission-card ${esc(m.status)} ${blocked ? 'blocked' : ''}" data-mission="${esc(m.id)}">
    <span class="mission-card-top">
      <span class="issue-number">#${esc(m.issue || '—')}</span>
      <span class="priority-badge ${String(m.priority || '').toLowerCase()}">${esc(m.priority || 'P2')}</span>
      ${m.type === 'loop' ? `<span class="label-pill">${icon('loop')} loop</span>` : ''}
      ${blocked ? `<span class="blocked-badge" title="Espera ${esc(missionBlockers(m).map(dep => dep.title).join(', '))}">${icon('lock')} ${missionBlockers(m).length} dep</span>` : ''}
      <span class="mission-state ${esc(m.status)}">${esc(stateInfo.es)}</span>
    </span>
    <span class="mission-title">${esc(m.title)}</span>
    <span class="mission-desc">${esc(m.description || '')}</span>
    <span class="mission-meta">
      <span class="mission-project"><i style="background:${esc(p.color)}"></i>${esc(p.name)}</span>
      ${labels}
    </span>
    <span class="mission-bottom">
      <span class="mission-agent">${miniFace(agent)}${esc(agent.name)}</span>
      <span class="mission-progress"><span class="mission-progress-bar"><span style="width:${pct}%"></span></span><small>${m.totalSubtasks ? `${m.subtasks}/${m.totalSubtasks}` : '—'}</small></span>
      <span class="mission-horizon">${esc(HORIZONS[m.horizon] || '')}</span>
    </span>
  </button>`;
}

/* ------------------------------------------------------------------ */
/* GitHub                                                              */
/* ------------------------------------------------------------------ */
function renderGithubSource() {
  const repo = connections.githubRepo || state.workspace.repo;
  const banner = $('#githubBanner');
  if (banner) {
    const strong = banner.querySelector('strong');
    const small = banner.querySelector('small');
    if (strong) strong.textContent = `github.com/${repo}`;
    if (small) small.textContent = github.live ? `Issues en vivo · ${github.issues.length} cargados · cambios solo desde GitHub` : 'Modo demo · conectá GitHub para leer issues reales. La app no edita estados.';
    const button = $('#syncGithubInline');
    if (button) button.textContent = github.live ? 'Actualizar' : 'Sincronizar';
  }
  const tag = $('#githubSourceTag');
  if (tag) tag.innerHTML = `<span class="status-dot" style="background:${github.live ? '#7ca575' : '#c5ae85'}"></span> ${github.live ? `GitHub · ${github.repo} · live` : 'snapshot del repo · demo'}`;
  const status = $('#githubStatus');
  if (status) {
    status.textContent = github.live ? 'live' : 'demo';
    status.className = `connection-status ${github.live ? '' : 'muted'}`;
  }
  const link = $('#repoLink');
  if (link) link.href = `https://github.com/${repo}`;
  $$('.repo-link-dynamic').forEach(a => { a.href = `https://github.com/${repo}`; });
}

function githubItems(limit = 8) {
  if (github.live) {
    const visibleIds = scopedProjectIds();
    const items = github.issues.filter(i => !i.pull_request).map(issue => {
      const labels = (issue.labels || []).map(l => typeof l === 'string' ? l : l.name).filter(Boolean);
      const projectId = projectFromLabels(labels);
      return {
        number: issue.number,
        title: issue.title,
        state: issue.state,
        labels,
        updated: issue.updated_at,
        url: issue.html_url,
        repo: github.repo,
        live: true,
        projectId
      };
    });
    return items.filter(item => issueMatchesScope(item, visibleIds)).slice(0, limit);
  }
  return scopedMissions().filter(m => isOpen(m) || m.horizon === 'done').slice(0, limit).map(m => ({
    number: m.issue,
    title: m.title,
    state: m.githubState || (m.status === 'done' ? 'closed' : 'open'),
    labels: m.labels || [],
    updated: null,
    url: `https://github.com/${connections.githubRepo || state.workspace.repo}/issues`,
    repo: projectById(m.projectId).repo,
    live: false,
    projectId: m.projectId
  }));
}

function projectFromLabels(labels = []) {
  const names = labels.map(l => String(typeof l === 'string' ? l : l.name || '').trim().toLowerCase()).filter(Boolean);
  const found = state.projects.find(project => names.some(name => name === `project:${project.id}` || name === project.name.toLowerCase()));
  return found?.id || null;
}

function issueMatchesScope(item, visibleIds = scopedProjectIds()) {
  if (scopeFilter.kind === 'all') return true;
  if (item.projectId) return visibleIds.has(item.projectId);
  const labels = (item.labels || []).map(label => String(label).trim().toLowerCase());
  if (scopeFilter.kind === 'repo') {
    const selectedRepo = String(scopeFilter.id).trim().toLowerCase();
    const clientIds = state.clients.filter(client => (client.repos || []).some(repo => repoMatches(repo, scopeFilter.id))).map(client => client.id);
    return repoMatches(item.repo, scopeFilter.id)
      || labels.some(label => label === `repo:${selectedRepo}` || label === `project:${selectedRepo}` || clientIds.some(id => label === `client:${id}`));
  }
  if (scopeFilter.kind === 'client') {
    const client = state.clients.find(value => value.id === scopeFilter.id);
    return labels.includes(`client:${scopeFilter.id}`) || Boolean(client && labels.includes(client.name.toLowerCase()));
  }
  if (scopeFilter.kind === 'division') {
    const division = state.divisions.find(value => value.id === scopeFilter.id);
    return labels.includes(`division:${scopeFilter.id}`) || Boolean(division && labels.includes(division.name.toLowerCase()));
  }
  return false;
}

function issueRowMarkup(item, compact = false) {
  const labels = (item.labels || []).slice(0, compact ? 1 : 3).map(l => `<span class="label-pill">${esc(l)}</span>`).join('');
  return `<a class="issue-row" href="${esc(item.url)}" target="_blank" rel="noreferrer">
    <span class="issue-icon">${icon(item.state === 'closed' ? 'check-circle' : 'git-issue')}</span>
    <span class="issue-copy">
      <span class="issue-title">${esc(item.title)}</span>
      <span class="issue-meta"><span class="${item.state === 'closed' ? 'closed' : 'open'}">${item.state === 'closed' ? 'closed' : 'open'}</span><span class="dot"></span><span>#${esc(item.number || '—')}</span><span class="dot"></span><span>${esc(item.repo || connections.githubRepo)}</span>${labels}</span>
    </span>
    <span class="issue-time">${item.updated ? esc(relativeDate(item.updated)) : ''}</span>
  </a>`;
}

function renderGithubIssues() {
  const el = $('#githubIssues');
  if (!el) return;
  const items = githubItems(8);
  el.innerHTML = items.length ? items.map(i => issueRowMarkup(i)).join('') : '<div class="empty-state">No se pudieron cargar issues. Revisá la conexión.</div>';
  renderGithubSource();
}

async function syncGitHub(show = true) {
  const repo = (connections.githubRepo || state.workspace.repo || '').replace(/^https?:\/\/github.com\//, '').replace(/\/$/, '');
  if (!repo.includes('/')) {
    if (show) toast('El repo debe tener formato owner/repo.');
    return false;
  }
  const cacheKey = `conductor.github.${repo}`;
  if (!show) {
    try {
      const cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
      if (cached && Date.now() - cached.time < 120000) {
        github = { ...cached.data, live: true };
        syncMeta.githubAt = cached.data.updatedAt || cached.time;
        renderGithubSource();
        if (currentView === 'home') renderHomeIssues();
        if (currentView === 'missions') { renderMissionList(); renderGithubIssues(); }
        if (typeof renderSyncStatus === 'function') renderSyncStatus();
        return true;
      }
    } catch (_) {}
  }
  const headers = { Accept: 'application/vnd.github+json' };
  if (connections.githubToken) headers.Authorization = `Bearer ${connections.githubToken}`;
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues?state=all&per_page=30&sort=updated`, { headers });
    if (!res.ok) throw new Error(res.status === 404 ? 'Repo no encontrado' : res.status === 403 ? 'Límite de GitHub alcanzado' : `GitHub respondió ${res.status}`);
    const issues = await res.json();
    if (!Array.isArray(issues)) throw new Error('Respuesta inválida');
    const data = { repo, issues, updatedAt: Date.now(), error: null };
    github = { ...data, live: true };
    syncMeta.githubAt = data.updatedAt;
    try { sessionStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), data })); } catch (_) {}
    renderGithubSource();
    if (currentView === 'home') renderHomeIssues();
    if (currentView === 'missions') { renderMissionList(); renderGithubIssues(); }
    if (typeof renderSyncStatus === 'function') renderSyncStatus(); else renderSidebar();
    if (show) toast(`GitHub sincronizado · ${issues.filter(i => !i.pull_request).length} issues`);
    return true;
  } catch (err) {
    github.live = false;
    github.error = err.message;
    renderGithubSource();
    if (typeof renderSyncStatus === 'function') renderSyncStatus();
    if (show) toast(`GitHub: ${err.message}. Sigo con el snapshot del repo.`);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Trello machine state                                                */
/* ------------------------------------------------------------------ */
function trelloCardProjectId(card) {
  const labels = (card.labels || []).map(label => String(label.name || '').trim().toLowerCase()).filter(Boolean);
  const matches = state.projects.filter(project => labels.some(label =>
    label === `project:${project.id}` || label === project.id.toLowerCase() ||
    label === `repo:${project.repo}` || label === project.repo.toLowerCase() ||
    label === project.name.toLowerCase()
  ));
  return matches.length === 1 ? matches[0].id : null;
}

function boardColumns() {
  if (trello.live && trello.lists.length) {
    const visibleIds = scopedProjectIds();
    return trello.lists.map(list => ({
      key: list.id,
      name: list.name,
      short: list.name.length > 12 ? list.name.slice(0, 11) + '…' : list.name,
      cards: trello.cards.filter(card => card.idList === list.id && visibleIds.has(trelloCardProjectId(card))).slice(0, 8).map(card => {
        const labelNames = (card.labels || []).map(l => l.name).filter(Boolean);
        const projectId = trelloCardProjectId(card);
        const agent = state.agents.find(a => a.projectId === projectId && `${card.name} ${card.desc || ''} ${labelNames.join(' ')}`.toLowerCase().includes(a.name.toLowerCase()));
        return {
          id: card.id,
          name: card.name,
          agent: agent?.id,
          projectId,
          color: card.labels?.[0]?.color || projectById(projectId).color,
          labels: labelNames,
          url: card.shortUrl || `https://trello.com/c/${card.id}`,
          live: true
        };
      })
    }));
  }
  const visibleIds = scopedProjectIds();
  const order = ['backlog', 'ready', 'working', 'review', 'done'];
  return order.map(key => {
    const missions = state.missions.filter(m => visibleIds.has(m.projectId) && m.status === key);
    return {
      key,
      name: STATUS[key].es,
      short: STATUS[key].es,
      cards: missions.slice(0, 8).map(m => ({
        id: m.id,
        name: m.title,
        agent: m.assignee,
        color: projectById(m.projectId).color,
        labels: m.labels || [],
        missionId: m.id,
        live: false
      }))
    };
  });
}

function renderTrelloBoard() {
  const board = $('#trelloBoard');
  if (board) {
    const columns = boardColumns();
    board.innerHTML = columns.map(col => {
      const cards = col.cards.length ? col.cards.map(card => {
        const inner = `<strong>${esc(card.name)}</strong><div class="board-card-foot">${card.agent ? miniFace(agentById(card.agent)) : '<span class="mini-agent-face" style="background:#dbe3d6"></span>'}<span class="label-pill">${esc(card.labels[0] || STATUS[col.key]?.label || 'card')}</span></div>`;
        return card.live
          ? `<a class="board-card" href="${esc(card.url)}" target="_blank" rel="noreferrer">${inner}</a>`
          : `<button class="board-card" data-mission="${esc(card.missionId)}">${inner}</button>`;
      }).join('') : '<div class="board-empty">Sin cartas</div>';
      return `<div class="board-column"><div class="board-column-head">${esc(col.short)}<span>${col.cards.length}</span></div>${cards}</div>`;
    }).join('');
  }
  const source = trello.live ? 'live' : 'demo';
  if ($('#trelloSource')) $('#trelloSource').textContent = source;
  if ($('#worldTrelloSource')) $('#worldTrelloSource').textContent = source;
  if ($('#openTrelloButton')) $('#openTrelloButton').innerHTML = trello.live ? 'Abrir tablero <span>↗</span>' : 'Conectar <span>↗</span>';
  renderTrelloActions();
  renderTrelloStatus();
}
function renderTrelloActions() {
  const el = $('#trelloActions');
  if (!el) return;
  let actions;
  if (trello.live && trello.actions.length) {
    actions = trello.actions.slice(0, 6).map(a => ({
      agent: state.agents.find(x => (a.member || '').toLowerCase().includes(x.name.toLowerCase())),
      member: a.member || 'Trello',
      text: a.text,
      date: a.date,
      type: a.type
    }));
  } else {
    actions = state.activity.slice().sort((a, b) => a.agoSeconds - b.agoSeconds).slice(0, 5).map(e => ({
      agent: agentById(e.agentId),
      member: agentById(e.agentId).name,
      text: e.text,
      date: null,
      ago: e.agoSeconds,
      type: e.type
    }));
  }
  el.innerHTML = actions.length ? actions.map(a => `<div class="trello-action">
    ${a.agent ? miniFace(a.agent) : `<span class="mini-agent-face" style="background:#e3e8df">${icon('users')}</span>`}
    <span><strong>${esc(a.member)}</strong> ${esc(a.text)}</span>
    <time>${a.date ? esc(relativeDate(a.date)) : esc(relativeAgo(a.ago))}</time>
  </div>`).join('') : '<div class="board-empty">Sin actividad reciente.</div>';
}
function renderTrelloStatus() {
  const status = $('#trelloStatus');
  if (!status) return;
  status.textContent = trello.live ? 'live' : 'demo';
  status.className = `connection-status ${trello.live ? '' : 'muted'}`;
}

async function syncTrello(show = true) {
  const { trelloKey: key, trelloToken: token, trelloBoard: board } = connections;
  if (!key || !token || !board) {
    trello = { ...trello, live: false };
    renderTrelloBoard();
    if (show) toast('Completá key, token y board ID para conectar Trello.');
    return false;
  }
  const base = `https://api.trello.com/1/boards/${encodeURIComponent(board)}`;
  const auth = `key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`;
  try {
    const [listsRes, actionsRes] = await Promise.all([
      fetch(`${base}/lists?cards=open&card_fields=name,desc,idList,dateLastActivity,labels,shortUrl&${auth}`),
      fetch(`${base}/actions?filter=commentCard,updateCard,createCard&limit=20&fields=type,date,data&memberCreator=true&memberCreator_fields=fullName,username,initials&${auth}`)
    ]);
    if (!listsRes.ok) throw new Error(listsRes.status === 401 ? 'credenciales inválidas' : `Trello respondió ${listsRes.status}`);
    const lists = await listsRes.json();
    if (!Array.isArray(lists)) throw new Error('Respuesta de tablero inválida');
    const actionsRaw = actionsRes.ok ? await actionsRes.json() : [];
    const cards = lists.flatMap(l => (l.cards || []).map(c => ({ ...c, idList: l.id })));
    const actions = (Array.isArray(actionsRaw) ? actionsRaw : []).map(action => {
      let text = '';
      if (action.type === 'commentCard') text = action.data?.text || 'Dejó un comentario';
      else if (action.type === 'updateCard' && action.data?.listAfter) text = `Movió “${action.data.card?.name || 'una carta'}” a ${action.data.listAfter.name}`;
      else if (action.type === 'createCard') text = `Creó “${action.data?.card?.name || 'una carta'}”`;
      return {
        id: action.id,
        type: action.type,
        member: action.memberCreator?.fullName || action.memberCreator?.username || 'Trello',
        text,
        date: action.date
      };
    }).filter(a => a.text);
    trello = { live: true, lists, cards, actions, updatedAt: Date.now(), error: null };
    syncMeta.trelloAt = trello.updatedAt;
    renderTrelloBoard();
    renderWorldMachine();
    renderMachinePreview();
    if (typeof renderSyncStatus === 'function') renderSyncStatus(); else renderSidebar();
    if (show) toast(`Trello conectado · ${cards.length} cartas en ${lists.length} listas`);
    return true;
  } catch (err) {
    trello.live = false;
    trello.error = err.message;
    renderTrelloBoard();
    if (typeof renderSyncStatus === 'function') renderSyncStatus();
    if (show) toast(`Trello: ${err.message}. El tablero sigue en modo demo.`);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Detail sheets                                                       */
/* ------------------------------------------------------------------ */
function openMission(id, options = {}) {
  const m = missionById(id);
  if (!m) return;
  const p = projectById(m.projectId);
  const agent = agentById(m.assignee);
  const order = ['backlog', 'ready', 'working', 'review', 'done'];
  const currentIndex = STATUS[m.status]?.order ?? 0;
  const pct = m.totalSubtasks ? Math.round((m.subtasks / m.totalSubtasks) * 100) : (m.status === 'done' ? 100 : 0);
  const recent = scopedActivity().filter(e => e.agentId === m.assignee).sort((a, b) => a.agoSeconds - b.agoSeconds).slice(0, 3);
  const dependencies = missionDependencies(m);
  const blockers = missionBlockers(m);
  const blocked = isBlocked(m);
  const issueUrl = `https://github.com/${p.repo}/issues/${m.issue || ''}`;
  markDetail('mission', m.id, options);
  openSheet(`
    <div class="sheet-hero" style="align-items:flex-start;">
      <span class="agent-portrait">${avatarSVG(agent)}</span>
      <div style="min-width:0;padding-right:34px;">
        <div class="eyebrow">ISSUE #${esc(m.issue || '—')} · ${esc(p.name)}</div>
        <h2 class="mission-sheet-title" style="margin-top:7px;">${esc(m.title)}</h2>
        <span class="mission-state-big" style="color:${m.status === 'review' ? '#a98455' : m.status === 'done' ? '#95a096' : '#729170'}">${esc(statusData(m.status).es)} ${m.type === 'loop' ? '· loop' : ''} ${blocked ? '· bloqueada' : ''}</span>
      </div>
    </div>
    <div class="sheet-section">
      <div class="sheet-section-title">Contexto</div>
      <p class="mission-detail-copy">${esc(m.description || 'Sin descripción.')}</p>
      <div class="detail-pills" style="margin-top:9px;">${(m.labels || []).map(l => `<span class="detail-pill">${esc(l)}</span>`).join('')}<span class="detail-pill">${esc(m.priority || 'P2')}</span><span class="detail-pill">${esc(HORIZONS[m.horizon] || '')}</span></div>
    </div>
    <div class="sheet-section">
      <div class="sheet-section-title">Máquina de estados</div>
      <div class="machine-states">${order.map((key, i) => `<div class="machine-step ${i < currentIndex ? 'done' : i === currentIndex ? 'current' : ''}"><span class="step-dot">${i < currentIndex ? icon('check') : ''}</span>${esc(STATUS[key].es)}${i === currentIndex ? '<span style="margin-left:auto;font:400 7px var(--mono);color:#93a294">ahora</span>' : ''}</div>`).join('')}</div>
      <div class="mission-progress" style="margin-top:11px;"><span class="mission-progress-bar"><span style="width:${pct}%"></span></span><small>${m.totalSubtasks ? `${m.subtasks}/${m.totalSubtasks} subtareas` : 'Sin subtareas'}</small></div>
    </div>
    <div class="sheet-section">
      <div class="sheet-section-title">Dependencias</div>
      ${dependencies.length ? `<div class="dependency-list">${dependencies.map(dep => {
        const complete = isMissionComplete(dep);
        return `<button class="dependency-row ${complete ? 'done' : 'pending'}" data-mission="${esc(dep.id)}">
          <span class="dependency-icon">${icon(complete ? 'check' : 'lock')}</span>
          <span class="dependency-copy"><strong>${esc(dep.title)}</strong><small>#${esc(dep.issue || '—')} · ${esc(statusData(dep.status).es)}</small></span>
          <span class="dependency-state">${complete ? 'lista' : 'pendiente'}</span>
        </button>`;
      }).join('')}</div>
      <p class="mission-detail-copy dependency-note ${blocked ? 'warn' : 'ok'}">${blocked
        ? `Bloqueada por ${blockers.length} ${blockers.length === 1 ? 'misión' : 'misiones'}. El protocolo rechaza cualquier claim hasta que estén completas.`
        : 'Todas las dependencias están completas. La misión se puede reclamar.'}</p>`
      : `<p class="mission-detail-copy dependency-note ok">${icon('check')} Sin dependencias. Cualquier agente puede reclamarla en el próximo heartbeat.</p>`}
    </div>
    <div class="sheet-section">
      <div class="sheet-section-title">Agente asignado</div>
      <div class="detail-kv"><div><span>Agente</span><strong>${esc(agent.name)} · ${esc(agent.role)}</strong></div><div><span>Heartbeat</span><strong>cada ${esc(agent.heartbeatMinutes || 15)} min</strong></div></div>
    </div>
    ${recent.length ? `<div class="sheet-section"><div class="sheet-section-title">Últimas señales de ${esc(agent.name)}</div>${recent.map(e => `<div class="activity-mini-row"><span class="activity-icon">${icon(typeIcon(e.type))}</span><div><p>${esc(e.text)}</p><small>${esc(relativeAgo(eventAgeAt(e)))} · ${esc(p.name)}</small></div></div>`).join('')}</div>` : ''}
    <div class="sheet-section"><div class="sheet-section-title">Solo lectura</div><p class="mission-detail-copy">Los cambios de estado se hacen en GitHub o mediante el protocolo de agentes. Este visor no modifica issues.</p></div>
    <div class="sheet-actions">
      <a class="primary-button" href="${esc(issueUrl)}" target="_blank" rel="noreferrer">${icon('github')} Abrir issue</a>
      <button class="ghost-button" data-copy-link>${icon('link')} Copiar link</button>
      <button class="ghost-button" data-prefill-mission="${esc(m.id)}">Pedir algo similar</button>
    </div>`);
}

function openProjectFilter() {
  const counts = {};
  state.missions.forEach(m => { if (isOpen(m)) counts[m.projectId] = (counts[m.projectId] || 0) + 1; });
  openSheet(`
    <div style="padding:8px 0 2px;"><div class="eyebrow">FILTRAR</div><h2 style="font-size:24px;letter-spacing:-1px;margin-top:6px;">Elegí un repo<span style="color:#84a179">.</span></h2></div>
    <div class="sheet-section">
      <button class="agent-select" data-filter-project="all" style="width:100%;margin-bottom:6px;"><span class="room-swatch" style="background:#aebba9"></span><span>Todos los repos</span><small>${state.missions.filter(isOpen).length} issues</small></button>
      <div class="agent-select-list">${state.projects.map(p => `<button class="agent-select" data-filter-project="${esc(p.id)}"><span class="room-swatch" style="background:${esc(p.color)}"></span><span>${esc(p.name)}</span><small>${counts[p.id] || 0} abiertas</small></button>`).join('')}</div>
    </div>`);
}
