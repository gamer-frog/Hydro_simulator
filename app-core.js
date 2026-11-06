/* Conductor — shared core. This file must load before the view modules. */

const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V21h5v-6h3v6h5V10.5"/>',
  cube: '<path d="m12 3 8.5 4.7v8.6L12 21l-8.5-4.7V7.7L12 3Z"/><path d="m3.5 7.7 8.5 4.8 8.5-4.8M12 12.5V21"/>',
  inbox: '<path d="M4 5h16v14H4z"/><path d="M4 13h4l2 3h4l2-3h4"/>',
  users: '<path d="M16 21v-1.8a4.2 4.2 0 0 0-4.2-4.2H7.2A4.2 4.2 0 0 0 3 19.2V21"/><circle cx="9.5" cy="7.5" r="3.8"/><path d="M16.5 3.7a3.8 3.8 0 0 1 0 7.4M21 21v-1.8a4.2 4.2 0 0 0-3.2-4.1"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01"/>',
  sliders: '<path d="M4 21v-6M4 9V3M12 21v-9M12 6V3M20 21v-3M20 12V3"/><circle cx="4" cy="11" r="2"/><circle cx="12" cy="8" r="2"/><circle cx="20" cy="15" r="2"/>',
  'chevron-right': '<path d="m9 5 7 7-7 7"/>',
  plug: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0V8ZM12 17v4"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  filter: '<path d="M4 5h16M7 12h10M10 19h4"/>',
  github: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.3-.4 6.8-1.6 6.8-7.4A5.8 5.8 0 0 0 19.3 3 5.4 5.4 0 0 0 19.1 0S17.9-.4 15 1.5a13 13 0 0 0-6 0C6.1-.4 4.9 0 4.9 0a5.4 5.4 0 0 0-.2 3A5.8 5.8 0 0 0 3.2 7c0 5.8 3.5 7 6.8 7.4A4.8 4.8 0 0 0 9 18v4"/><path d="M9 19c-3 .9-3-1.5-4.2-2"/>',
  'git-issue': '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  'git-pr': '<circle cx="6" cy="6" r="2.3"/><circle cx="6" cy="18" r="2.3"/><circle cx="18" cy="18" r="2.3"/><path d="M6 8.3v7.4M9 6h5a2 2 0 0 1 2 2v7.4"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  shield: '<path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
  book: '<path d="M4 4.5A3.5 3.5 0 0 1 7.5 1H20v19H7.5A3.5 3.5 0 0 0 4 23V4.5Z"/><path d="M4 17.5A3.5 3.5 0 0 1 7.5 14H20"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.7-4L3 10M3 4v6h6M4 13a8 8 0 0 0 14.7 4L21 14M21 20v-6h-6"/>',
  loop: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  commit: '<circle cx="12" cy="12" r="3"/><path d="M3 12h6M15 12h6"/>',
  comment: '<path d="M21 11.5a8.5 8.5 0 0 1-9 8.5 9 9 0 0 1-3.8-.8L3 21l1.7-4.8A8.5 8.5 0 1 1 21 11.5Z"/>',
  review: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
  run: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  note: '<path d="M5 3h10l4 4v14H5V3Z"/><path d="M15 3v5h5M8 12h7M8 16h5"/>',
  push: '<path d="M12 19V5M6 11l6-6 6 6"/><path d="M5 21h14"/>',
  test: '<path d="M9 3h6M10 3v5l-5.5 9.5A2.3 2.3 0 0 0 6.5 21h11a2.3 2.3 0 0 0 2-3.5L14 8V3"/><path d="M7.5 15h9"/>',
  heartbeat: '<path d="M3 12h4l2-5 3.5 10 2.3-5H21"/>',
  idle: '<path d="M20.5 14.8A8.5 8.5 0 0 1 9.2 3.5 8.5 8.5 0 1 0 20.5 14.8Z"/>',
  plan: '<path d="M4 6h16M4 12h10M4 18h7"/><circle cx="18" cy="18" r="2"/>',
  approve: '<path d="m5 13 4 4L19 6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'arrow-up-right': '<path d="M7 17 17 7M8 7h9v9"/>',
  external: '<path d="M14 3h7v7M10 14 21 3M21 14v7H3V3h7"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  terminal: '<path d="m5 8 4 4-4 4M12 17h7"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1"/>',
  alert: '<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17h.01"/>',
  dot: '<circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>'
};

function icon(name, cls = '') {
  return `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.spark || ICONS.dot}</svg>`;
}
function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
}
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const STATUS = {
  backlog: { label: 'Backlog', es: 'Backlog', order: 0 },
  ready: { label: 'Ready', es: 'Lista', order: 1 },
  working: { label: 'In progress', es: 'En curso', order: 2 },
  review: { label: 'In review', es: 'Review', order: 3 },
  done: { label: 'Done', es: 'Hecha', order: 4 }
};
const HORIZONS = { now: 'Ahora', week: 'Esta semana', month: 'Este mes', done: 'Hecha' };
const TYPE_LABEL = { push: 'push', commit: 'commit', comment: 'comment', review: 'review', run: 'run', loop: 'loop', test: 'test', heartbeat: 'heartbeat', idle: 'idle', plan: 'plan', search: 'search', note: 'note', approve: 'approve' };

/* A compact fallback keeps the viewer usable if the JSON snapshot cannot be fetched. */
const FALLBACK = {
  workspace: { name: 'Conductor', repo: 'gamer-frog/PlayGround', replayMinutes: 15, heartbeatMinutes: 15 },
  divisions: [
    { id: 'music', name: 'Música' },
    { id: 'games', name: 'Juegos' },
    { id: 'cannabis-studios', name: 'Estudios Cannabis' },
    { id: 'technology-studios', name: 'Estudios Tecnología' },
    { id: 'marketing-studios', name: 'Estudios Marketing' },
    { id: 'mimic-fanvue', name: 'Mimic PC + Fanvue AI' },
    { id: 'vistta', name: 'VISTTA' },
    { id: 'hydroponics-nft', name: 'Hidroponia NFT' },
    { id: 'agent-orchestration', name: 'Orquestación de agentes' }
  ],
  clients: [
    { id: 'vistta-sweetsoul', divisionId: 'vistta', name: 'SweetSoul', repos: ['VISTTA_SWEETSOUL'] },
    { id: 'vistta-peluqueria-german', divisionId: 'vistta', name: 'Peluquería Germán', repos: [] }
  ],
  projects: [
    { id: 'project-playground', divisionId: 'agent-orchestration', name: 'PlayGround', repo: 'gamer-frog/PlayGround', description: 'Producto principal.', status: 'active', color: '#8faa7d', issuesOpen: 4, progress: 68, room: { x: 1, y: 2, w: 48, h: 42 } },
    { id: 'project-atlas', divisionId: 'agent-orchestration', name: 'Atlas', repo: 'gamer-frog/atlas', description: 'Research e infraestructura.', status: 'active', color: '#c99b7e', issuesOpen: 3, progress: 42, room: { x: 51, y: 15, w: 48, h: 42 } },
    { id: 'project-signal', divisionId: 'agent-orchestration', name: 'Signal', repo: 'gamer-frog/signal', description: 'Observabilidad.', status: 'active', color: '#7d9f9d', issuesOpen: 2, progress: 81, room: { x: 1, y: 45, w: 48, h: 42 } },
    { id: 'project-archive', divisionId: 'agent-orchestration', name: 'Archive', repo: 'gamer-frog/archive', description: 'QA y memoria.', status: 'quiet', color: '#a89bb8', issuesOpen: 1, progress: 94, room: { x: 51, y: 57, w: 48, h: 42 } }
  ],
  missions: [
    { id: 'mission-onboarding', projectId: 'project-playground', title: 'Rediseñar el flujo de onboarding', description: 'Reducir la fricción de entrada.', status: 'working', githubState: 'open', horizon: 'now', priority: 'P1', issue: 42, labels: ['UX', 'P1'], dependsOn: [], startDay: 0, durationDays: 3, assignee: 'luna', type: 'mission', subtasks: 3, totalSubtasks: 5 },
    { id: 'mission-events', projectId: 'project-atlas', title: 'Migrar ingest de eventos a cola', description: 'Cola con reintentos idempotentes.', status: 'ready', githubState: 'open', horizon: 'now', priority: 'P0', issue: 48, labels: ['infra'], dependsOn: [], startDay: 1, durationDays: 4, assignee: 'nova', type: 'mission', subtasks: 1, totalSubtasks: 6 },
    { id: 'mission-sync', projectId: 'project-playground', title: 'Arreglar race condition en sync', description: 'Serializar escrituras.', status: 'working', githubState: 'open', horizon: 'now', priority: 'P0', issue: 51, labels: ['bug'], dependsOn: [], startDay: 0, durationDays: 2, assignee: 'sol', type: 'mission', subtasks: 4, totalSubtasks: 4 },
    { id: 'mission-permissions', projectId: 'project-atlas', title: 'Auditar permisos del bot', description: 'Revisar scopes y tokens.', status: 'review', githubState: 'open', horizon: 'week', priority: 'P1', issue: 59, labels: ['security'], dependsOn: ['mission-sync'], startDay: 2, durationDays: 3, assignee: 'moss', type: 'mission', subtasks: 5, totalSubtasks: 5 },
    { id: 'mission-demo', projectId: 'project-playground', title: 'Preparar demo para inversores', description: 'Un recorrido de tres minutos.', status: 'backlog', githubState: 'open', horizon: 'month', priority: 'P2', issue: 63, labels: ['demo'], dependsOn: ['mission-onboarding', 'mission-events'], startDay: 8, durationDays: 4, assignee: 'luna', type: 'mission', subtasks: 0, totalSubtasks: 5 }
  ],
  agents: [
    { id: 'luna', name: 'Luna', role: 'Planner', projectId: 'project-playground', model: 'Claude Sonnet', status: 'working', heartbeatMinutes: 15, lastAction: 'Cerró el alcance del issue #42', bio: 'Convierte objetivos difusos en misiones verificables.', skills: ['planning', 'issues'], home: { x: 54, y: 57 }, avatar: { bg: '#e5eedb', skin: '#f0c9ae', hair: '#3c302b', shirt: '#7e9c72', accessory: 'bob' } },
    { id: 'nova', name: 'Nova', role: 'Researcher', projectId: 'project-atlas', model: 'GPT-5', status: 'working', heartbeatMinutes: 15, lastAction: 'Comparó dos proveedores de colas', bio: 'Busca señales y trae opciones con evidencia.', skills: ['research', 'docs'], home: { x: 52, y: 54 }, avatar: { bg: '#f4e4d6', skin: '#d9a07f', hair: '#6d3f2a', shirt: '#c98d6c', accessory: 'curls' } },
    { id: 'sol', name: 'Sol', role: 'Builder', projectId: 'project-playground', model: 'Claude Opus', status: 'working', heartbeatMinutes: 15, lastAction: 'Pusheó la rotación de claves', bio: 'Implementa y deja el cambio listo para review.', skills: ['typescript', 'git'], home: { x: 38, y: 50 }, avatar: { bg: '#e6edf3', skin: '#efc7a8', hair: '#25201d', shirt: '#698798', accessory: 'glasses' } },
    { id: 'orbit', name: 'Orbit', role: 'Operator', projectId: 'project-signal', model: 'Gemini Pro', status: 'working', heartbeatMinutes: 15, lastAction: 'Corrió el deploy check', bio: 'Cuida loops, deploys y señales.', skills: ['ops', 'loops'], home: { x: 57, y: 58 }, avatar: { bg: '#e9e6f0', skin: '#c98f6b', hair: '#282233', shirt: '#9285a6', accessory: 'headset' } },
    { id: 'moss', name: 'Moss', role: 'Reviewer', projectId: 'project-atlas', model: 'Claude Sonnet', status: 'reviewing', heartbeatMinutes: 15, lastAction: 'Dejó review en el PR #18', bio: 'Lee el cambio completo y protege la calidad.', skills: ['review', 'security'], home: { x: 41, y: 64 }, avatar: { bg: '#eef0d9', skin: '#b87e5e', hair: '#54422e', shirt: '#9daa65', accessory: 'cap' } },
    { id: 'pip', name: 'Pip', role: 'QA', projectId: 'project-archive', model: 'GPT-5 mini', status: 'idle', heartbeatMinutes: 15, lastAction: 'Verificó cuatro escenarios', bio: 'Reproduce y documenta los casos borde.', skills: ['qa', 'docs'], home: { x: 50, y: 58 }, avatar: { bg: '#f4e4e6', skin: '#e4b18f', hair: '#a35f4d', shirt: '#d49b9a', accessory: 'bun' } }
  ],
  loops: [
    { id: 'loop-triage', projectId: 'project-playground', name: 'Morning triage', description: 'Revisar issues nuevos y bloqueos.', status: 'active', cron: '09:00', cadence: 'Cada día', agentId: 'luna', lastRun: 'Hoy · 09:00', nextRun: 'Mañana · 09:00', lastResult: '2 issues priorizados' },
    { id: 'loop-deploy', projectId: 'project-signal', name: 'Deploy check', description: 'Salud de servicios y colas.', status: 'active', cron: 'cada 6 h', cadence: '09 · 15 · 21', agentId: 'orbit', lastRun: 'Hoy · 09:00', nextRun: 'Hoy · 15:00', lastResult: '3 servicios OK' },
    { id: 'loop-digest', projectId: 'project-signal', name: 'Nightly digest', description: 'Compilar lo hecho y lo que viene.', status: 'active', cron: '23:00', cadence: 'Cada día', agentId: 'nova', lastRun: 'Ayer · 23:00', nextRun: 'Hoy · 23:00', lastResult: 'Digest enviado' }
  ],
  activity: [
    { id: 'a01', agentId: 'sol', projectId: 'project-playground', type: 'push', text: 'push · feat(auth): rota claves por entorno', agoSeconds: 35, spot: { x: 67, y: 56 } },
    { id: 'a02', agentId: 'orbit', projectId: 'project-signal', type: 'run', text: 'deploy check · 3 servicios OK', agoSeconds: 90, spot: { x: 63, y: 62 } },
    { id: 'a03', agentId: 'luna', projectId: 'project-playground', type: 'comment', text: '#42 queda listo para probar', agoSeconds: 135, spot: { x: 43, y: 60 } },
    { id: 'a04', agentId: 'nova', projectId: 'project-atlas', type: 'search', text: 'benchmark · colas de eventos', agoSeconds: 205, spot: { x: 44, y: 54 } },
    { id: 'a05', agentId: 'moss', projectId: 'project-atlas', type: 'review', text: 'review · PR #18 pide naming', agoSeconds: 245, spot: { x: 63, y: 52 } },
    { id: 'a06', agentId: 'pip', projectId: 'project-archive', type: 'idle', text: 'idle · sin misiones reclamadas', agoSeconds: 300, spot: { x: 43, y: 54 } },
    { id: 'a07', agentId: 'orbit', projectId: 'project-signal', type: 'loop', text: 'loop diario · reporte enviado', agoSeconds: 370, spot: { x: 48, y: 65 } },
    { id: 'a08', agentId: 'sol', projectId: 'project-playground', type: 'commit', text: 'commit · fix: serializa writes de sync', agoSeconds: 460, spot: { x: 48, y: 50 } }
  ]
};

/* ------------------------------------------------------------------ */
/* Data + utilities                                                    */
/* ------------------------------------------------------------------ */
let state = JSON.parse(JSON.stringify(FALLBACK));
let sourceMode = 'fallback';
let github = { live: false, repo: 'gamer-frog/PlayGround', issues: [], updatedAt: null, error: null };
let trello = { live: false, lists: [], cards: [], actions: [], updatedAt: null, error: null };
let connections = {};
let localRequests = [];
let currentView = 'home';
let activeRoom = 'all';
let missionFilter = 'open';
let projectFilter = 'all';
let scopeFilter = { kind: 'all', id: 'all' };

const REPLAY_DURATION = 900;
const replay = { at: REPLAY_DURATION, playing: false, speed: 1, timer: null, base: Date.now() };
const syncMeta = { snapshotAt: null, githubAt: null, trelloAt: null, refreshing: false, timer: null };
let activeDetail = null;
let appliedHash = '';

function normalizeState(raw) {
  const data = raw && typeof raw === 'object' ? raw : {};
  if (!Array.isArray(data.projects) || !Array.isArray(data.missions) || !Array.isArray(data.agents)) throw new Error('Snapshot inválido');
  data.workspace = data.workspace || FALLBACK.workspace;
  data.divisions = Array.isArray(data.divisions) ? data.divisions : FALLBACK.divisions;
  data.clients = Array.isArray(data.clients) ? data.clients : FALLBACK.clients;
  data.projects.forEach(p => {
    p.room = p.room || { x: 1, y: 2, w: 48, h: 42 };
    p.color = p.color || '#8faa7d';
    p.repo = p.repo || data.workspace.repo || FALLBACK.workspace.repo;
    p.name = p.name || p.id;
  });
  data.agents.forEach(a => {
    a.projectId = a.projectId || data.projects[0]?.id;
    a.avatar = a.avatar || FALLBACK.agents.find(x => x.id === a.id)?.avatar || FALLBACK.agents[0].avatar;
    a.home = a.home || { x: 50, y: 55 };
    a.skills = Array.isArray(a.skills) ? a.skills : [];
    a.status = a.status || (a.lastHeartbeat ? 'working' : 'idle');
  });
  data.missions.forEach(m => {
    m.projectId = m.projectId || data.projects[0]?.id;
    m.dependsOn = Array.isArray(m.dependsOn) ? m.dependsOn.filter(dep => typeof dep === 'string') : [];
  });
  data.activity = (Array.isArray(data.activity) ? data.activity : []).filter(e => e && e.agentId).map(e => ({ ...e, agoSeconds: clamp(Number(e.agoSeconds) || 0, 0, REPLAY_DURATION) }));
  data.loops = Array.isArray(data.loops) ? data.loops : [];
  return data;
}

function loadConnections() {
  let local = {};
  try { local = JSON.parse(localStorage.getItem('conductor.connections') || '{}'); } catch (_) {}
  connections = {
    githubRepo: local.githubRepo || state.workspace?.repo || 'gamer-frog/PlayGround',
    githubToken: local.githubToken || '',
    trelloKey: local.trelloKey || '',
    trelloToken: local.trelloToken || '',
    trelloBoard: local.trelloBoard || ''
  };
  try { localRequests = JSON.parse(localStorage.getItem('conductor.requests') || '[]'); } catch (_) { localRequests = []; }
}

function saveConnections() {
  try { localStorage.setItem('conductor.connections', JSON.stringify(connections)); } catch (_) {}
}
function saveRequests() {
  try { localStorage.setItem('conductor.requests', JSON.stringify(localRequests.slice(0, 20))); } catch (_) {}
}

const projectById = id => state.projects.find(p => p.id === id) || { id: '', name: 'Sin repo', repo: '', color: '#aab5a9' };
const agentById = id => state.agents.find(a => a.id === id) || state.agents[0] || FALLBACK.agents[0];

function normalizedRepo(value) {
  return String(value || '').trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').replace(/\/$/, '').toLowerCase();
}
function repoMatches(left, right) {
  const a = normalizedRepo(left), b = normalizedRepo(right);
  return Boolean(a && b && a === b);
}
function normalizeScope(kind, id) {
  if (kind === 'all' || !id) return { kind: 'all', id: 'all' };
  const exists = kind === 'division' ? state.divisions.some(item => item.id === id)
    : kind === 'client' ? state.clients.some(item => item.id === id)
      : kind === 'project' ? state.projects.some(item => item.id === id)
        : kind === 'repo' ? state.projects.some(item => repoMatches(item.repo, id)) : false;
  return exists ? { kind, id } : { kind: 'all', id: 'all' };
}
function scopedProjectIds() {
  const { kind, id } = scopeFilter || { kind: 'all', id: 'all' };
  if (!id || kind === 'all') return new Set(state.projects.map(project => project.id));
  if (kind === 'project') return new Set(state.projects.some(project => project.id === id) ? [id] : []);
  if (kind === 'repo') return new Set(state.projects.filter(project => repoMatches(project.repo, id)).map(project => project.id));
  if (kind === 'client') return new Set(state.projects.filter(project => project.clientId === id).map(project => project.id));
  if (kind === 'division') {
    const clientIds = new Set(state.clients.filter(client => client.divisionId === id).map(client => client.id));
    return new Set(state.projects.filter(project => project.divisionId === id || clientIds.has(project.clientId)).map(project => project.id));
  }
  return new Set();
}
function scopedProjects() { const ids = scopedProjectIds(); return state.projects.filter(project => ids.has(project.id)); }
function scopedMissions() { const ids = scopedProjectIds(); return state.missions.filter(mission => ids.has(mission.projectId)); }
function scopedAgents() { const ids = scopedProjectIds(); return state.agents.filter(agent => ids.has(agent.projectId)); }
function scopedActivity() { const ids = scopedProjectIds(); return state.activity.filter(event => ids.has(event.projectId)); }
function scopedLoops() { const ids = scopedProjectIds(); return state.loops.filter(loop => ids.has(loop.projectId)); }
function scopedEventsUpTo(at = replay.at) {
  const ids = scopedProjectIds();
  return eventsUpTo(at).filter(event => ids.has(event.projectId));
}
function scopeLabel() {
  if (scopeFilter.kind === 'all') return '00 Brain';
  if (scopeFilter.kind === 'division') return state.divisions.find(item => item.id === scopeFilter.id)?.name || 'División';
  if (scopeFilter.kind === 'client') return state.clients.find(item => item.id === scopeFilter.id)?.name || 'Cliente';
  const project = state.projects.find(item => item.id === scopeFilter.id);
  if (project) return project.name;
  return scopeFilter.kind === 'repo' ? String(scopeFilter.id) : 'Proyecto';
}
function selectScope(kind = 'all', id = 'all') {
  scopeFilter = { kind, id };
  projectFilter = 'all';
  renderAll();
  const crumb = $('#breadcrumb');
  if (crumb) crumb.textContent = `${scopeLabel()} · ${VIEW_TITLES[currentView] || 'Vista'}`;
}

const missionById = id => state.missions.find(m => m.id === id);
const isOpen = m => m.status !== 'done' && m.githubState !== 'closed';
const isMissionComplete = m => Boolean(m && (m.status === 'done' || m.githubState === 'closed'));
const missionDependencies = m => (m?.dependsOn || []).map(missionById).filter(Boolean);
const missionBlockers = m => missionDependencies(m).filter(dep => !isMissionComplete(dep));
const isBlocked = m => Boolean(m) && !isMissionComplete(m) && missionBlockers(m).length > 0;
const statusData = key => STATUS[key] || STATUS.backlog;
const typeIcon = type => type === 'commit' ? 'commit' : type === 'approve' ? 'approve' : type === 'heartbeat' ? 'heartbeat' : type === 'idle' ? 'idle' : type === 'plan' ? 'plan' : type === 'push' ? 'push' : type === 'comment' ? 'comment' : type === 'review' ? 'review' : type === 'run' ? 'run' : type === 'loop' ? 'loop' : type === 'test' ? 'test' : type === 'search' ? 'search' : type === 'note' ? 'note' : 'dot';

function avatarSVG(agent) {
  const a = agent?.avatar || FALLBACK.agents[0].avatar;
  const bg = a.bg || '#e5eedb', skin = a.skin || '#efc7a8', hair = a.hair || '#3c302b', shirt = a.shirt || '#7e9c72', acc = a.accessory || 'bob';
  let hairShape = '';
  if (acc === 'bob') hairShape = `<path d="M17.5 31C16.2 19 21 11 31.5 11 42 11 47.8 18 46.5 31 44.5 22 40.5 18.5 32 19.2 23.5 18.5 19.5 23 17.5 31Z" fill="${hair}"/><path d="M17.2 26c.3 6 .6 9 2.5 12l2-3.8c-1.3-3-1.6-5.7-1.2-9.1Z" fill="${hair}"/>`;
  else if (acc === 'curls') hairShape = `<g fill="${hair}"><circle cx="22" cy="20" r="5.5"/><circle cx="29" cy="15.5" r="5.5"/><circle cx="37" cy="16.5" r="5.5"/><circle cx="44" cy="22" r="4.5"/><circle cx="20.5" cy="28" r="3.4"/><circle cx="45" cy="29" r="3"/></g>`;
  else if (acc === 'bun') hairShape = `<path d="M18 30c-1-10 4.5-17 14-17s15 7 14 17c-2-7-6-11-14-10.5C24 19 20 23 18 30Z" fill="${hair}"/><circle cx="32" cy="10.5" r="5" fill="${hair}"/>`;
  else if (acc === 'cap') hairShape = `<path d="M18.5 26c.8-9 6-14 14-14s13 5 13.5 14Z" fill="${hair}"/><path d="M17 26h16c4 0 7 1.5 8 4-6 1-11-1-15-1-4 0-7 1-9-1.2Z" fill="${shirt}" opacity=".92"/>`;
  else if (acc === 'headset') hairShape = `<path d="M18 30c-.5-10 5-17 14-17s15 7 14 17c-2-8-6-11.5-14-11C24.5 18.5 20 22 18 30Z" fill="${hair}"/>`;
  else hairShape = `<path d="M18.5 28c0-8 5-15 13.5-15s14 6.5 14 15c-3-5-7-7-14-7s-10.5 2-13.5 7Z" fill="${hair}"/>`;
  let extra = '';
  if (acc === 'glasses') extra += `<g fill="none" stroke="#37433c" stroke-width="1.25"><rect x="22.8" y="27" width="6.2" height="4.8" rx="2"/><rect x="34.5" y="27" width="6.2" height="4.8" rx="2"/><path d="M29 29.2h5.5M20.7 28.5l2-1M40.7 28.5l-2-1"/></g>`;
  if (acc === 'headset') extra += `<g fill="none" stroke="#37443d" stroke-width="1.5"><path d="M19 28v-2a13 13 0 0 1 26 0v2"/><rect x="17" y="26.5" width="3.7" height="7.5" rx="1.8" fill="#37443d"/><rect x="43.3" y="26.5" width="3.7" height="7.5" rx="1.8" fill="#37443d"/><path d="M45 34c0 4-3.5 5.5-8 5.5" stroke-width="1.2"/><circle cx="36" cy="39.5" r="1.5" fill="#37443d" stroke="none"/></g>`;
  if (acc === 'cap') extra += `<path d="M20 26.3h24" stroke="#fff" stroke-width=".8" opacity=".35"/>`;
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="64" height="64" fill="${bg}"/>
    <circle cx="32" cy="49" r="21" fill="#fff" opacity=".16"/>
    <path d="M13 64c0-11.5 7.6-17.5 19-17.5S51 52.5 51 64Z" fill="${shirt}"/>
    <path d="M27.3 44h9.4v7.5c0 2.4-9.4 2.4-9.4 0Z" fill="${skin}"/>
    <circle cx="18.4" cy="30.5" r="3.2" fill="${skin}"/><circle cx="45.6" cy="30.5" r="3.2" fill="${skin}"/>
    <circle cx="32" cy="29.5" r="14" fill="${skin}"/>
    ${hairShape}
    <g fill="#2f3731"><circle cx="27.2" cy="29.7" r="1.15"/><circle cx="36.8" cy="29.7" r="1.15"/></g>
    <path d="M29.2 35.1c1.7 1.4 3.9 1.4 5.6 0" fill="none" stroke="#a76c5d" stroke-width="1.15" stroke-linecap="round"/>
    <g fill="#d48874" opacity=".3"><circle cx="23.7" cy="34.4" r="2.2"/><circle cx="40.3" cy="34.4" r="2.2"/></g>
    <path d="M25 51h14" stroke="#fff" stroke-width=".7" opacity=".16"/>
    ${extra}
  </svg>`;
}
function miniFace(agent, extra = '') {
  return `<span class="mini-agent-face ${extra}">${avatarSVG(agent)}</span>`;
}
function agentFace(agent) {
  return `<span class="agent-face">${avatarSVG(agent)}</span>`;
}

function relativeAgo(seconds) {
  const s = Math.max(0, Math.round(seconds));
  if (s < 50) return 'ahora';
  if (s < 90) return '1m';
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${Math.round(s / 3600)}h`;
}
function shortDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short' }).format(new Date(iso)).replace('.', '').toUpperCase();
}
function relativeDate(iso) {
  if (!iso) return 'sin fecha';
  return relativeAgo((Date.now() - new Date(iso).getTime()) / 1000);
}
function clockLabel(date = new Date()) {
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}
function dateFromOffset(offset) {
  const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + offset); return d;
}
function dateOffsetLabel(offset) {
  if (offset <= 0) return 'HOY';
  if (offset === 1) return 'MAÑANA';
  if (offset < 7) return new Intl.DateTimeFormat('es', { weekday: 'short' }).format(dateFromOffset(offset)).replace('.', '').toUpperCase();
  return `${dateFromOffset(offset).getDate()} ${new Intl.DateTimeFormat('es', { month: 'short' }).format(dateFromOffset(offset)).replace('.', '').toUpperCase()}`;
}
function currentEventFor(agentId, at = replay.at) {
  let latest = null;
  for (const e of state.activity) {
    const eventAt = REPLAY_DURATION - e.agoSeconds;
    if (e.agentId === agentId && eventAt <= at && (!latest || eventAt > (REPLAY_DURATION - latest.agoSeconds))) latest = e;
  }
  return latest;
}
function eventsUpTo(at = replay.at) {
  return state.activity
    .filter(e => REPLAY_DURATION - e.agoSeconds <= at)
    .sort((a, b) => a.agoSeconds - b.agoSeconds);
}
function eventAgeAt(event, at = replay.at) {
  if (!event) return null;
  return Math.max(0, at - (REPLAY_DURATION - event.agoSeconds));
}
function latestEventForAgent(agentId, at = replay.at) {
  let latest = null;
  for (const event of eventsUpTo(at)) {
    if (event.agentId === agentId) latest = event;
  }
  return latest;
}
function replayMoment(at = replay.at) {
  return new Date(replay.base - ((REPLAY_DURATION - at) * 1000));
}
function replayLabel(at = replay.at) {
  const seconds = REPLAY_DURATION - at;
  if (seconds < 15) return 'ahora';
  if (seconds < 60) return `hace ${Math.round(seconds)}s`;
  return `hace ${Math.ceil(seconds / 60)}m`;
}

/* ------------------------------------------------------------------ */
/* Navigation, deep links, sheets and replay                           */
/* ------------------------------------------------------------------ */
const ROUTE_VIEWS = ['home', 'world', 'missions', 'agents', 'plan'];
const DETAIL_VIEWS = { mission: 'missions', agent: 'agents', project: 'world' };
const VIEW_TITLES = { home: '00 Brain', world: 'El estudio', missions: 'Misiones', agents: 'Agentes', plan: 'Plan' };

function routeHash(view, kind, id) {
  const base = `#/${ROUTE_VIEWS.includes(view) ? view : 'home'}`;
  if (!kind || !id) return base;
  return `${base}/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`;
}
function parseRoute(hash = '') {
  const clean = String(hash || '').replace(/^#\/?/, '').trim();
  if (!clean) return { view: 'home', detail: null };
  const parts = clean.split('/').filter(Boolean).map(part => {
    try { return decodeURIComponent(part); } catch (_) { return part; }
  });
  const hasView = ROUTE_VIEWS.includes(parts[0]);
  const view = hasView ? parts[0] : 'home';
  const rest = hasView ? parts.slice(1) : parts;
  const kind = rest[0];
  const id = rest[1];
  if (DETAIL_VIEWS[kind] && id) {
    return { view: hasView ? view : DETAIL_VIEWS[kind], detail: { kind, id } };
  }
  return { view, detail: null };
}
function setRouteHash(view, kind, id, options = {}) {
  const hash = routeHash(view, kind, id);
  appliedHash = hash;
  if (location.hash === hash) return;
  if (options.replace) history.replaceState(null, '', hash);
  else location.hash = hash;
}
function applyRouteFromHash(force = false) {
  const hash = location.hash;
  if (!force && hash === appliedHash) return;
  appliedHash = hash;
  const route = parseRoute(hash);
  navigate(route.view, { updateHash: false, detail: route.detail });
}
function markDetail(kind, id, options = {}) {
  activeDetail = { kind, id };
  if (options.updateHash !== false) setRouteHash(currentView, kind, id);
}
function navigate(view, options = {}) {
  if (!view) return;
  const changed = currentView !== view;
  currentView = view;
  if (options.updateHash !== false) setRouteHash(view, options.detail?.kind, options.detail?.id);
  if (view === 'world') activeRoom = options.detail?.kind === 'project' ? options.detail.id : 'all';
  $$('.view').forEach(panel => panel.classList.toggle('active', panel.dataset.panel === view));
  $$('.side-nav [data-view], .bottom-nav [data-view]').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  const crumb = $('#breadcrumb'); if (crumb) crumb.textContent = VIEW_TITLES[view] || 'Hoy';
  if (view === 'world') { renderWorld(); syncWorldLive(); }
  if (view === 'missions') renderMissions();
  if (view === 'agents') renderAgents();
  if (view === 'plan') renderPlan();
  if (view === 'home') { renderHome(); updateHomeReplay(); }
  if (options.detail?.kind === 'mission' && typeof openMission === 'function') openMission(options.detail.id, { updateHash: false });
  else if (options.detail?.kind === 'agent' && typeof openAgent === 'function') openAgent(options.detail.id, { updateHash: false });
  else if (options.detail?.kind === 'project') activeDetail = null;
  else if (activeDetail) { activeDetail = null; closeSheet({ updateHash: false }); }
  if (changed) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openSheet(html) {
  const sheet = $('#detailSheet');
  $('#sheetContent').innerHTML = html;
  if (!sheet.open) sheet.showModal();
  sheet.scrollTop = 0;
  $('#sheetContent').scrollTop = 0;
}
function closeSheet(options = {}) {
  if (activeDetail && options.updateHash !== false) setRouteHash(currentView, null, null, { replace: true });
  activeDetail = null;
  const sheet = $('#detailSheet');
  if (sheet?.open) sheet.close();
}
let toastTimer = null;
function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3400);
}

function syncPlayButtons() {
  $$('#homePlay, #worldPlay').forEach(btn => {
    btn.classList.toggle('playing', replay.playing);
    btn.innerHTML = icon(replay.playing ? 'pause' : 'play');
    btn.setAttribute('aria-label', replay.playing ? 'Pausar replay' : 'Reproducir los últimos 15 minutos');
  });
}
function updateReplayUI() {
  const value = Math.round(replay.at);
  const fill = `${(value / REPLAY_DURATION) * 100}%`;
  ['#homeReplay', '#worldReplay'].forEach(sel => {
    const input = $(sel);
    if (input) {
      if (document.activeElement !== input) input.value = value;
      input.style.setProperty('--fill', fill);
    }
  });
  $$('.replay-track, .world-track').forEach(track => track.style.setProperty('--fill', fill));
  const label = replayLabel();
  if ($('#homeReplayLabel')) $('#homeReplayLabel').textContent = label;
  if ($('#worldReplayLabel')) $('#worldReplayLabel').textContent = label;
  if ($('#worldClock')) $('#worldClock').textContent = replay.at >= REPLAY_DURATION ? 'AHORA' : clockLabel(replayMoment());
  if ($('#liveTimestamp')) {
    const start = new Date(replay.base - REPLAY_DURATION * 1000);
    const end = replayMoment();
    $('#liveTimestamp').textContent = `${clockLabel(start)} — ${clockLabel(end)}`;
  }
  syncPlayButtons();
}
function setReplay(value, options = {}) {
  replay.at = clamp(Number(value) || 0, 0, REPLAY_DURATION);
  updateReplayUI();
  if (typeof syncWorldLive === 'function') syncWorldLive();
  if (typeof updateHomeReplay === 'function') updateHomeReplay();
  if (options.stop !== false && replay.playing) stopPlayback();
}
function stopPlayback() {
  replay.playing = false;
  clearInterval(replay.timer);
  replay.timer = null;
  syncPlayButtons();
}
function togglePlayback() {
  if (replay.playing) return stopPlayback();
  if (replay.at >= REPLAY_DURATION) replay.at = 0;
  replay.playing = true;
  syncPlayButtons();
  updateReplayUI();
  clearInterval(replay.timer);
  replay.timer = setInterval(() => {
    replay.at = Math.min(REPLAY_DURATION, replay.at + (9 * replay.speed));
    if (replay.at >= REPLAY_DURATION) {
      stopPlayback();
      setReplay(REPLAY_DURATION, { stop: false });
      return;
    }
    setReplay(replay.at, { stop: false });
  }, 200);
}

function sidebarProjectMarkup(project, counts) {
  const active = scopeFilter.kind === 'project' && scopeFilter.id === project.id;
  return `<button class="sidebar-project ${active ? 'active' : ''}" data-scope-kind="project" data-scope-id="${esc(project.id)}" aria-current="${active ? 'page' : 'false'}"><i style="background:${esc(project.color || '#aab5a9')}"></i><span>${esc(project.name)}</span><small>${counts[project.id] || 0}</small></button>`;
}
function renderSidebar() {
  const counts = {};
  state.missions.forEach(m => { if (isOpen(m)) counts[m.projectId] = (counts[m.projectId] || 0) + 1; });
  const projectNav = $('#projectNav');
  if (projectNav) {
    const brainActive = scopeFilter.kind === 'all';
    const brain = `<button class="sidebar-scope ${brainActive ? 'active' : ''}" data-scope-kind="all" data-scope-id="all" aria-current="${brainActive ? 'page' : 'false'}"><span class="scope-glyph">✳</span><span><strong>00 Brain</strong><small>Centro de mando</small></span></button>`;
    const divisions = state.divisions.map(division => ({
      ...division,
      clients: state.clients.filter(client => client.divisionId === division.id),
      projects: state.projects.filter(project => project.divisionId === division.id && !project.clientId)
    }));
    const unassigned = state.projects.filter(project => !state.divisions.some(division => division.id === project.divisionId));
    const divisionMarkup = divisions.map(division => {
      const divisionActive = scopeFilter.kind === 'division' && scopeFilter.id === division.id;
      const clientMarkup = division.clients.map(client => {
        const clientProjects = state.projects.filter(project => project.clientId === client.id);
        const clientActive = scopeFilter.kind === 'client' && scopeFilter.id === client.id;
        const repoNames = [...new Set([...(client.repos || []), ...clientProjects.map(project => project.name)])];
        const repos = repoNames.length ? repoNames.map(repo => {
          const repoActive = scopeFilter.kind === 'repo' && scopeFilter.id === repo;
          return `<button class="client-repo ${repoActive ? 'active' : ''}" data-scope-kind="repo" data-scope-id="${esc(repo)}" aria-current="${repoActive ? 'page' : 'false'}">${esc(repo)}</button>`;
        }).join('') : '<span class="client-repo muted">Sin repo</span>';
        return `<div class="sidebar-client"><button class="client-name ${clientActive ? 'active' : ''}" data-scope-kind="client" data-scope-id="${esc(client.id)}" aria-current="${clientActive ? 'page' : 'false'}">${esc(client.name)}</button>${repos}${clientProjects.map(project => sidebarProjectMarkup(project, counts)).join('')}</div>`;
      }).join('');
      const projectMarkup = division.projects.map(project => sidebarProjectMarkup(project, counts)).join('');
      return `<section class="division-group"><button class="division-title ${divisionActive ? 'active' : ''}" data-scope-kind="division" data-scope-id="${esc(division.id)}" aria-current="${divisionActive ? 'page' : 'false'}">${esc(division.name)}</button>${clientMarkup}${projectMarkup || (!clientMarkup ? '<div class="division-empty">Sin repositorios</div>' : '')}</section>`;
    }).join('');
    const unassignedMarkup = unassigned.length ? `<section class="division-group"><div class="division-title">Sin asignar</div>${unassigned.map(project => sidebarProjectMarkup(project, counts)).join('')}</section>` : '';
    projectNav.innerHTML = `${brain}${divisionMarkup}${unassignedMarkup}`;
  }
  const openCount = scopedMissions().filter(isOpen).length;
  if ($('#navMissionCount')) $('#navMissionCount').textContent = openCount;
  if ($('#navAgentCount')) $('#navAgentCount').textContent = scopedAgents().length;
  if ($('#sidebarConnectionTitle')) $('#sidebarConnectionTitle').textContent = github.live ? 'GitHub sincronizado' : 'GitHub conectado';
  if ($('#sidebarConnectionText')) $('#sidebarConnectionText').textContent = conexionSummary();
}
function lastSyncLabel(timestamp) {
  if (!timestamp) return 'sin sync';
  return `hace ${relativeAgo((Date.now() - timestamp) / 1000)}`;
}
function conexionSummary() {
  const trelloReady = Boolean(connections.trelloKey && connections.trelloToken && connections.trelloBoard);
  if (github.live && trello.live) return `GitHub + Trello · ${lastSyncLabel(syncMeta.githubAt)}`;
  if (github.live) return `GitHub en vivo · ${lastSyncLabel(syncMeta.githubAt)}`;
  if (trelloReady) return 'Trello listo para sincronizar';
  return `Trello en demo · snapshot ${lastSyncLabel(syncMeta.snapshotAt)}`;
}
