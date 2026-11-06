/* Conductor — agent agency library. */

function renderAgents() {
  const agents = scopedAgents();
  const faces = $('#agencyFaces');
  if (faces) faces.innerHTML = agents.slice(0, 5).map(a => miniFace(a)).join('') + (agents.length > 5 ? `<span class="mini-agent-face more-face" style="display:grid;place-items:center;background:#25402e;color:#dcead2;font:500 8px var(--mono)">+${agents.length - 5}</span>` : '');
  if ($('#agentTotal')) $('#agentTotal').textContent = agents.length;
  const grid = $('#agentGrid');
  if (grid) {
    grid.innerHTML = agents.map(agent => {
      const p = projectById(agent.projectId);
      const latest = latestEventForAgent(agent.id);
      return `<button class="agent-card" data-agent="${esc(agent.id)}">
        <span class="agent-card-top">
          <span class="agent-portrait">${avatarSVG(agent)}</span>
          <span class="agent-status"><span class="state-dot ${esc(agent.status)}"></span>${esc(agent.status === 'working' ? 'working' : agent.status === 'reviewing' ? 'review' : 'idle')}</span>
        </span>
        <h3>${esc(agent.name)}</h3>
        <div class="agent-role">${esc(agent.role)}</div>
        <div class="agent-repo"><i style="background:${esc(p.color)}"></i>${esc(p.name)}</div>
        <div class="agent-last">${esc(latest?.text || agent.lastAction || 'Esperando el próximo heartbeat.')}</div>
        <div class="agent-hb"><span></span> ${latest ? `señal ${esc(relativeAgo(eventAgeAt(latest)))}` : 'sin señal reciente'} · ${esc(agent.model || 'modelo')}</div>
      </button>`;
    }).join('');
  }
  const steps = $('#agentSteps');
  if (steps) {
    const data = [
      ['Elegí una identidad estable', 'Usá un id único y descriptivo, por ejemplo <code>agent-luna</code>. No reutilices ids entre agentes.'],
      ['Registralo en el repo', 'Declaralo en <code>orchestra/seed.json</code> o publicá un evento <code>register</code>. El nombre y el rol quedan versionados.'],
      ['Sincronizá antes de actuar', 'Hacé pull de la rama de coordinación y reconstruí <code>state.json</code>. Nunca reclames desde una copia vieja.'],
      ['Latí cada 15 minutos', 'Tu cron corre <code>heartbeat</code>, lee issues y decide si hay trabajo. El heartbeat no reserva misiones.'],
      ['Reclamá con evidencia', 'Publicá el evento <code>claim</code> y pushealo antes de empezar. Si hay conflicto, pará y coordiná.'],
      ['Trabajá aislado y liberá', 'Usá una branch propia. Al terminar, pusheá el resultado y liberá el <code>claimId</code> exacto.']
    ];
    steps.innerHTML = data.map(([title, body], i) => `<div class="step-card"><span class="step-number">${String(i + 1).padStart(2, '0')}</span><div class="step-copy"><strong>${title}</strong><p>${body}</p></div></div>`).join('');
  }
  if ($('#agentTotal')) $('#agentTotal').textContent = agents.length;
  renderSidebar();
}

function openAgent(id, options = {}) {
  const agent = agentById(id);
  const p = projectById(agent.projectId);
  const events = state.activity.filter(e => e.agentId === agent.id).sort((a, b) => a.agoSeconds - b.agoSeconds).slice(0, 5);
  const latest = events[0];
  markDetail('agent', agent.id, options);
  openSheet(`
    <div class="sheet-hero">
      <span class="agent-portrait">${avatarSVG(agent)}</span>
      <div>
        <div class="eyebrow">AGENT AGENCY · ${esc(p.name)}</div>
        <h2>${esc(agent.name)}</h2>
        <p>${esc(agent.role)} · ${esc(agent.model || 'modelo no declarado')}</p>
      </div>
    </div>
    <div class="sheet-section">
      <p class="agent-sheet-bio">${esc(agent.bio || 'Agente del estudio.')}</p>
      <div class="detail-pills" style="margin-top:10px;">${(agent.skills || []).map(s => `<span class="detail-pill">${esc(s)}</span>`).join('')}</div>
    </div>
    <div class="sheet-section">
      <div class="detail-kv">
        <div><span>Estado</span><strong style="display:flex;align-items:center;gap:5px;"><span class="state-dot ${esc(agent.status)}"></span>${esc(agent.status)}</strong></div>
        <div><span>Heartbeat</span><strong>cada ${esc(agent.heartbeatMinutes || 15)} min</strong></div>
        <div><span>Repo</span><strong>${esc(p.name)}</strong></div>
        <div><span>Última señal</span><strong>${latest ? esc(relativeAgo(eventAgeAt(latest))) : 'sin señal'}</strong></div>
      </div>
    </div>
    ${events.length ? `<div class="sheet-section"><div class="sheet-section-title">Lo último que hizo</div>${events.map(e => `<div class="activity-mini-row"><span class="activity-icon">${icon(typeIcon(e.type))}</span><div><p>${esc(e.text)}</p><small>${esc(TYPE_LABEL[e.type] || e.type)} · ${esc(relativeAgo(eventAgeAt(e)))}</small></div></div>`).join('')}</div>` : ''}
    <div class="sheet-section">
      <div class="sheet-section-title">Protocolo</div>
      <p class="mission-detail-copy">Se registra, late cada 15 minutos y reclama una misión con un evento pusheado. Si dos agentes reclaman la misma misión, el sistema la marca como conflicto y ninguno avanza hasta acordar.</p>
      <div class="detail-pills" style="margin-top:9px;"><span class="detail-pill">register</span><span class="detail-pill">heartbeat</span><span class="detail-pill">claim</span><span class="detail-pill">release</span></div>
    </div>
    <div class="sheet-actions">
      <button class="primary-button" data-prefill-agent="${esc(agent.id)}">${icon('plus')} Pedir una misión</button>
      <button class="ghost-button" data-copy-link>${icon('link')} Copiar link</button>
      <a class="ghost-button" href="ORCHESTRATION.md" target="_blank" rel="noreferrer">Ver protocolo ${icon('arrow-up-right')}</a>
    </div>`);
}
