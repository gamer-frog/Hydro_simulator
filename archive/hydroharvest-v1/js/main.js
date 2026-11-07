// ══════════ HIDROPLAN · simulador de invernadero NFT ══════════
// Presupuesto por módulos, lista de materiales, producción, economía y comparación de sistemas.
import * as THREE from 'three';
import {
  buildWorld, createModuleModel, makeFootprintHighlight,
  TILE, COLS, ROWS, moduleCenter, worldToTile,
} from './world.js';
import {
  CROPS, MODULES, defaultParams, moduleMaterialCost, consolidatedBOM, projectSummary,
} from './data.js';
import { fmtMoney, fmtNum, fmtQty, clamp, escapeHtml } from './format.js';
import {
  newScenario, cloneScenario, summaryFor, scenarioCounts,
  moduleIncrement, expansionFor,
} from './systems.js';
import {
  SHEET_TITLES, buildSheetHTML, moduleSheetHTML, materialsSheetHTML,
  productionSheetHTML, systemsSheetHTML, economySheetHTML, menuSheetHTML,
} from './sheets.js';
import { sfx, unlockAudio } from './audio.js';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'hidroplan.nft.v1';
const VIEW_H = 24;
const MIN_ZOOM = 0.32, MAX_ZOOM = 2.7;
const YAW = Math.PI / 4, PITCH = 0.72, CAM_DIST = 60;
const camOffset = new THREE.Vector3(
  Math.sin(YAW) * Math.cos(PITCH), Math.sin(PITCH), Math.cos(YAW) * Math.cos(PITCH),
).multiplyScalar(CAM_DIST);

/* ══════════ ESTADO ══════════ */
let project = { activeId: null, scenarios: [], nextModuleId: 1 };
let modules = [];                 // módulos del sistema abierto (runtime + rec)
let scene, camera, renderer, world, clock;
let screen = 'title';
let activeSheet = null;
let selectedId = null;
let placing = null;
let camTarget = new THREE.Vector3(0, 0, 0);
let camZoom = 0.52;
let scaleUnits = 1;
let expandType = 'nft12';
let deleteArmed = null;
let deleteScenarioArmed = null;
let resetArmed = false;
let newArmed = false;
let titleModels = [];
let hintReservoirShown = false;
const titleCleanup = [];

const currentScenario = () =>
  project.scenarios.find((s) => s.id === project.activeId) || project.scenarios[0];
const currentRecords = () => modules.map((m) => m.rec);
const currentSummary = () => projectSummary(currentScenario().params, currentRecords());

/* ══════════ ESCENA ══════════ */
const selHighlight = makeFootprintHighlight(0xfbbf24);
selHighlight.visible = false;
const ghostMat = new THREE.MeshBasicMaterial({
  color: 0x4ade80, transparent: true, opacity: 0.44, depthWrite: false,
});
const ghostHighlight = makeFootprintHighlight(0x4ade80);
ghostHighlight.visible = false;
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.02);
const tempVec = new THREE.Vector3();

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.domElement.id = 'game-canvas';
  document.body.prepend(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 220);
  scene.add(selHighlight, ghostHighlight);

  world = buildWorld(scene);
  world.updateDaylight(0.56);
  setViewport();
  camTarget.set(0, 0, 1);
  camZoom = titleZoom();
  updateCamera();

  clock = new THREE.Clock();
  bindUI();
  bindTouch();
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => setTimeout(onResize, 250));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'playing') saveProject(false);
  });

  updateContinueButton();
  buildTitleShowcase();

  const query = new URLSearchParams(window.location.search);
  if (query.get('autostart') === '1') startNewProject(true);
  else renderTitle();

  animate();
}

function setViewport() {
  const aspect = window.innerWidth / window.innerHeight;
  const top = VIEW_H / 2, bottom = -VIEW_H / 2;
  camera.left = -(VIEW_H * aspect) / 2;
  camera.right = (VIEW_H * aspect) / 2;
  camera.top = top; camera.bottom = bottom;
  camera.updateProjectionMatrix();
}

function titleZoom() {
  return window.innerWidth < window.innerHeight ? 0.54 : 0.84;
}
function gameZoom() {
  return window.innerWidth < window.innerHeight ? 0.52 : 0.84;
}

function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  setViewport();
  if (screen === 'title') camZoom = titleZoom();
  updateCamera();
}

function updateCamera() {
  camTarget.x = clamp(camTarget.x, -16, 16);
  camTarget.z = clamp(camTarget.z, -12, 12);
  camera.position.copy(camTarget).add(camOffset);
  camera.lookAt(camTarget);
  camera.zoom = camZoom;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}
function panBy(dx, dy) {
  const wpp = (VIEW_H / camZoom) / window.innerHeight;
  const right = tempVec.setFromMatrixColumn(camera.matrixWorld, 0).clone();
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const groundUp = new THREE.Vector3(up.x, 0, up.z);
  if (groundUp.lengthSq() < 0.001) groundUp.set(0, 0, -1);
  groundUp.normalize();
  camTarget.addScaledVector(right, -dx * wpp);
  camTarget.addScaledVector(groundUp, dy * wpp);
  updateCamera();
}
function zoomBy(factor) {
  camZoom = clamp(camZoom * factor, MIN_ZOOM, MAX_ZOOM);
  updateCamera();
}

/* ══════════ TOASTS ══════════ */
function toast(msg, type = 'info') {
  const box = $('toasts');
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'info' ? '' : ' ' + type);
  el.innerHTML = msg;
  box.appendChild(el);
  while (box.children.length > 3) box.removeChild(box.firstChild);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(-8px)';
    setTimeout(() => el.remove(), 320);
  }, 3600);
}

/* ══════════ GUARDADO ══════════ */
function normalizeModuleData(rec, params) {
  const def = MODULES[rec.type];
  if (!def) return {};
  if (def.kind !== 'nft') return { ...(rec.data || {}) };
  const crop = CROPS[rec.data?.crop] ? rec.data.crop : (params.defaultCrop || 'lettuce');
  const plants = clamp(
    Math.round(Number(rec.data?.plants) || def.plants),
    def.plantMin || 1, def.plantMax || def.plants,
  );
  return { crop, plants };
}

function normalizeScenario(s) {
  const base = defaultParams();
  const source = s.params || {};
  const params = { ...base, ...source };
  params.crops = {};
  for (const id of Object.keys(base.crops)) {
    params.crops[id] = { ...base.crops[id], ...(source.crops?.[id] || {}) };
  }
  const mods = (Array.isArray(s.modules) ? s.modules : [])
    .filter((rec) => rec && MODULES[rec.type])
    .map((rec) => ({
      id: Number(rec.id) || 0,
      type: rec.type,
      col: clamp(Number(rec.col) || 0, 0, COLS - 1),
      row: clamp(Number(rec.row) || 0, 0, ROWS - 1),
      rot: Number(rec.rot) ? 1 : 0,
      data: normalizeModuleData(rec, params),
    }));
  return {
    id: s.id || 's' + Math.random().toString(36).slice(2, 9),
    name: String(s.name || 'Sistema').slice(0, 40),
    params,
    modules: mods,
  };
}

function serializeProject() {
  return JSON.stringify({
    version: 1,
    activeId: project.activeId,
    nextModuleId: project.nextModuleId,
    scenarios: project.scenarios.map((s) => ({
      id: s.id, name: s.name, params: s.params, modules: s.modules,
    })),
  });
}

function saveProject(show = false) {
  try {
    localStorage.setItem(SAVE_KEY, serializeProject());
    updateContinueButton();
    if (show) {
      toast('💾 Proyecto guardado');
      sfx.cash();
    }
  } catch (e) {
    if (show) toast('No se pudo guardar en este navegador', 'bad');
  }
}

function loadProject() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!Array.isArray(data.scenarios) || !data.scenarios.length) return false;
    project = {
      activeId: data.activeId || data.scenarios[0].id,
      scenarios: data.scenarios.map(normalizeScenario),
      nextModuleId: Number(data.nextModuleId) || 1,
    };
    let maxId = 0;
    for (const s of project.scenarios) for (const rec of s.modules) maxId = Math.max(maxId, rec.id);
    project.nextModuleId = Math.max(project.nextModuleId, maxId + 1);
    if (!project.scenarios.some((s) => s.id === project.activeId)) {
      project.activeId = project.scenarios[0].id;
    }
    loadScenarioRuntime(currentScenario());
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

function updateContinueButton() {
  const button = $('btn-continue');
  if (button) button.classList.toggle('hidden', !localStorage.getItem(SAVE_KEY));
}

/* ══════════ SISTEMAS ══════════ */
function clearRuntimeModules() {
  for (const m of modules) {
    scene.remove(m.group);
    disposeGroup(m.group);
  }
  modules = [];
  selectedId = null;
  selHighlight.visible = false;
}

function loadScenarioRuntime(scenario) {
  clearRuntimeModules();
  if (!scenario) return;
  for (const rec of scenario.modules) placeRuntime(rec);
  camTarget.set(0, 0, 0);
  camZoom = gameZoom();
  updateCamera();
  updateHUD();
}

function switchScenario(id) {
  if (!id || id === project.activeId) return;
  if (placing) exitPlacing();
  const target = project.scenarios.find((s) => s.id === id);
  if (!target) return;
  project.activeId = target.id;
  scaleUnits = 1;
  closeSheet();
  loadScenarioRuntime(target);
  saveProject(false);
  toast(`🧪 Sistema abierto: <b>${escapeHtml(target.name)}</b>`);
}

function addScenario() {
  const n = project.scenarios.length + 1;
  const scenario = newScenario(`Sistema ${n}`);
  project.scenarios.push(scenario);
  project.activeId = scenario.id;
  scaleUnits = 1;
  closeSheet();
  loadScenarioRuntime(scenario);
  saveProject(false);
  openSheet('build');
  toast('🧪 Sistema vacío creado. Elegí un módulo para empezar.');
}

function duplicateScenario(id) {
  const source = project.scenarios.find((s) => s.id === id) || currentScenario();
  if (!source) return;
  const copy = cloneScenario(source, `${source.name} (copia)`);
  project.scenarios.push(copy);
  project.activeId = copy.id;
  scaleUnits = 1;
  closeSheet();
  loadScenarioRuntime(copy);
  saveProject(false);
  openSheet('systems');
  toast('🧪 Sistema duplicado. Ahora podés modificarlo sin tocar el original.');
}

function deleteScenario(id) {
  if (project.scenarios.length <= 1) {
    toast('Necesitás al menos un sistema', 'warn');
    return;
  }
  const index = project.scenarios.findIndex((s) => s.id === id);
  if (index < 0) return;
  const wasActive = project.activeId === id;
  project.scenarios.splice(index, 1);
  if (wasActive) {
    project.activeId = project.scenarios[Math.max(0, index - 1)].id;
    loadScenarioRuntime(currentScenario());
  }
  deleteScenarioArmed = null;
  saveProject(false);
  renderSheet();
  toast('🗑 Sistema eliminado');
}

/* ══════════ MÓDULOS ══════════ */
function footprint(type, rot) {
  const def = MODULES[type];
  return rot % 2 === 0 ? { w: def.w, h: def.h } : { w: def.h, h: def.w };
}

function areaFree(col, row, w, h, ignoreId = null) {
  if (col < 0 || row < 0 || col + w > COLS || row + h > ROWS) return false;
  for (const m of modules) {
    if (m.rec.id === ignoreId) continue;
    const f = m.fp;
    if (col < m.rec.col + f.w && col + w > m.rec.col
      && row < m.rec.row + f.h && row + h > m.rec.row) return false;
  }
  return true;
}

function applyPlants(m) {
  const def = MODULES[m.rec.type];
  if (!def || def.kind !== 'nft' || !m.setPlants) return;
  const data = m.rec.data;
  const crop = CROPS[data.crop] || CROPS.lettuce;
  m.setPlants(crop, data.plants || def.plants);
}

function placeRuntime(rec) {
  const built = createModuleModel(rec.type);
  if (!built) return null;
  const def = MODULES[rec.type];
  const fp = footprint(rec.type, rec.rot);
  const center = moduleCenter(rec.col, rec.row, fp.w, fp.h);
  const group = built.group;
  group.position.set(center.x, 0, center.z);
  group.rotation.y = rec.rot * Math.PI / 2;
  group.traverse((o) => { o.userData.moduleId = rec.id; });
  scene.add(group);
  const m = { rec, fp, group, setPlants: built.setPlants };
  modules.push(m);
  if (def.kind === 'nft') {
    rec.data = normalizeModuleData(rec, currentScenario().params);
    applyPlants(m);
  }
  return m;
}

function disposeGroup(group) {
  group.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const mat of mats) {
      if (!mat) continue;
      mat.map?.dispose?.();
      mat.dispose();
    }
  });
}

function removeModule(id) {
  const m = modules.find((x) => x.rec.id === id);
  if (!m) return;
  const scenario = currentScenario();
  scenario.modules = scenario.modules.filter((r) => r.id !== id);
  scene.remove(m.group);
  disposeGroup(m.group);
  modules = modules.filter((x) => x.rec.id !== id);
  if (selectedId === id) {
    selectedId = null;
    selHighlight.visible = false;
  }
  deleteArmed = null;
  closeSheet();
  saveProject(false);
  updateHUD();
  sfx.cash();
  toast(`🗑 ${MODULES[m.rec.type].name} eliminado del sistema`);
}

function rotateSelected() {
  const m = modules.find((x) => x.rec.id === selectedId);
  if (!m) return;
  const def = MODULES[m.rec.type];
  if (def.w === def.h) return;
  const newRot = m.rec.rot ? 0 : 1;
  const fp = footprint(m.rec.type, newRot);
  if (!areaFree(m.rec.col, m.rec.row, fp.w, fp.h, m.rec.id)) {
    toast('No hay espacio para rotar: mové otros módulos primero', 'bad');
    sfx.error();
    return;
  }
  m.rec.rot = newRot;
  m.fp = fp;
  const center = moduleCenter(m.rec.col, m.rec.row, fp.w, fp.h);
  m.group.position.set(center.x, 0, center.z);
  m.group.rotation.y = newRot * Math.PI / 2;
  selectModule(m);
  saveProject(false);
  renderSheet();
  updateHUD();
  sfx.click();
}

/* ══════════ COLOCACIÓN ══════════ */
function startPlacing(type) {
  const def = MODULES[type];
  if (!def) return;
  exitPlacing();
  closeSheet();
  const built = createModuleModel(type);
  if (!built) return;
  const ghost = built.group;
  const originalMats = new Set();
  ghost.visible = false;
  ghost.traverse((o) => {
    if (o.isMesh && o.material) {
      originalMats.add(o.material);
      o.material = ghostMat;
      o.castShadow = false;
      o.receiveShadow = false;
    }
    if (o.isPointLight) o.visible = false;
  });
  scene.add(ghost);
  placing = {
    type, rot: 0, ghost, col: null, row: null, valid: false,
    originalMats, justPlaced: false,
  };
  selectedId = null;
  selHighlight.visible = false;
  ghostHighlight.visible = false;
  world.grid.visible = true;
  $('placement-bar').classList.remove('hidden');
  $('pb-icon').textContent = def.icon;
  $('pb-name').textContent = def.name;
  $('pb-confirm').disabled = true;
  updatePlacementBar();
  syncChrome();
  sfx.click();
}

function moduleCost(type) {
  const def = MODULES[type];
  const scenario = currentScenario();
  return moduleMaterialCost(
    type,
    def.kind === 'nft' ? { plants: def.plants } : {},
    scenario.params.materialFactor || 1,
  );
}

function updatePlacementBar() {
  if (!placing) return;
  const def = MODULES[placing.type];
  const cost = moduleCost(placing.type);
  const confirm = $('pb-confirm');
  confirm.disabled = !placing.valid;
  if (placing.justPlaced) {
    $('pb-hint').textContent = '✓ Colocado · tocá otra celda o cancelá';
  } else if (placing.col === null) {
    $('pb-hint').textContent = `${fmtMoney(cost)} · tocá una celda del piso`;
  } else if (!placing.valid) {
    $('pb-hint').textContent = '❌ No entra o está ocupado';
  } else {
    $('pb-hint').textContent = `✓ ${fmtMoney(cost)} · confirmá con COLOCAR`;
  }
}

function setGhostCell(col, row) {
  if (!placing) return;
  const fp = footprint(placing.type, placing.rot);
  placing.col = col;
  placing.row = row;
  placing.justPlaced = false;
  placing.valid = areaFree(col, row, fp.w, fp.h);
  const center = moduleCenter(col, row, fp.w, fp.h);
  placing.ghost.position.set(center.x, 0, center.z);
  placing.ghost.rotation.y = placing.rot * Math.PI / 2;
  placing.ghost.visible = true;
  ghostHighlight.position.set(center.x, 0, center.z);
  ghostHighlight.scale.set(fp.w * TILE - 0.06, 1, fp.h * TILE - 0.06);
  ghostHighlight.visible = true;
  const color = placing.valid ? 0x4ade80 : 0xf87171;
  ghostHighlight.userData.plane.material.color.setHex(color);
  ghostHighlight.userData.border.material.color.setHex(color);
  ghostMat.color.setHex(color);
  updatePlacementBar();
  sfx.blip();
}

function rotateGhost() {
  if (!placing) return;
  placing.rot = placing.rot ? 0 : 1;
  if (placing.col !== null) setGhostCell(placing.col, placing.row);
  else sfx.click();
}

function confirmPlacement() {
  if (!placing || !placing.valid) return;
  const scenario = currentScenario();
  const def = MODULES[placing.type];
  const data = def.kind === 'nft'
    ? { crop: scenario.params.defaultCrop || 'lettuce', plants: def.plants }
    : {};
  const rec = {
    id: project.nextModuleId++,
    type: placing.type,
    col: placing.col,
    row: placing.row,
    rot: placing.rot,
    data,
  };
  scenario.modules.push(rec);
  const m = placeRuntime(rec);
  if (!m) return;
  ghostMat.color.setHex(0x4ade80);
  placing.ghost.visible = false;
  ghostHighlight.visible = false;
  placing.col = null;
  placing.row = null;
  placing.valid = false;
  placing.justPlaced = true;
  updatePlacementBar();
  saveProject(false);
  updateHUD();
  sfx.build();
  toast(`${def.icon} <b>${def.name}</b> agregado · ${fmtMoney(moduleCost(placing.type))}`);

  if (def.kind === 'nft') {
    const summary = currentSummary();
    if (!summary.reservoirs && !hintReservoirShown) {
      hintReservoirShown = true;
      setTimeout(() => toast('💡 Falta el kit de reservorio: bomba, tanque y solución nutritiva.', 'warn'), 900);
    }
  }
}

function exitPlacing() {
  if (!placing) return;
  scene.remove(placing.ghost);
  placing.ghost.traverse((o) => { if (o.isMesh) o.geometry?.dispose(); });
  for (const mat of placing.originalMats) {
    mat?.map?.dispose?.();
    mat?.dispose?.();
  }
  placing = null;
  ghostHighlight.visible = false;
  world.grid.visible = false;
  $('placement-bar').classList.add('hidden');
  ghostMat.color.setHex(0x4ade80);
  syncChrome();
}

/* ══════════ SELECCIÓN ══════════ */
function selectModule(m) {
  selectedId = m.rec.id;
  const fp = m.fp;
  const center = moduleCenter(m.rec.col, m.rec.row, fp.w, fp.h);
  selHighlight.position.set(center.x, 0, center.z);
  selHighlight.scale.set(fp.w * TILE - 0.08, 1, fp.h * TILE - 0.08);
  selHighlight.visible = true;
  sfx.blip();
}

function openModuleSheet(m) {
  selectModule(m);
  activeSheet = 'module';
  deleteArmed = null;
  resetArmed = false;
  renderSheet();
  showSheet();
}

function selectedModule() {
  return modules.find((m) => m.rec.id === selectedId) || null;
}

/* ══════════ TOUCH / CÁMARA ══════════ */
const pointers = new Map();
let drag = null;
let pinch = null;

function bindTouch() {
  const el = renderer.domElement;
  el.addEventListener('pointerdown', (e) => {
    if (screen !== 'playing') return;
    unlockAudio();
    el.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      drag = {
        startX: e.clientX, startY: e.clientY,
        lastX: e.clientX, lastY: e.clientY,
        t: performance.now(), moved: false,
      };
      pinch = null;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: camZoom };
      drag = null;
    }
  });
  el.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1 && drag) {
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 7) drag.moved = true;
      if (drag.moved) panBy(dx, dy);
    } else if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      camZoom = clamp(pinch.zoom * (d / pinch.dist), MIN_ZOOM, MAX_ZOOM);
      updateCamera();
    }
  });
  const endPointer = (e) => {
    if (!pointers.has(e.pointerId)) return;
    const wasTap = pointers.size === 1 && drag && !drag.moved
      && (performance.now() - drag.t) < 600;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) {
      if (wasTap) handleTap(e.clientX, e.clientY);
      drag = null;
    } else if (pointers.size === 1) {
      const p = [...pointers.values()][0];
      drag = { startX: p.x, startY: p.y, lastX: p.x, lastY: p.y, t: performance.now(), moved: true };
    }
  };
  el.addEventListener('pointerup', endPointer);
  el.addEventListener('pointercancel', endPointer);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('wheel', (e) => {
    if (screen !== 'playing') return;
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.08 : 0.93);
  }, { passive: false });
}

function pickNdc(clientX, clientY, out) {
  const rect = renderer.domElement.getBoundingClientRect();
  out.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  out.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  return out;
}

function handleTap(clientX, clientY) {
  pickNdc(clientX, clientY, pointerNdc);
  raycaster.setFromCamera(pointerNdc, camera);
  if (placing) {
    const hit = raycaster.ray.intersectPlane(floorPlane, tempVec);
    if (hit) {
      const tile = worldToTile(tempVec.x, tempVec.z);
      setGhostCell(tile.col, tile.row);
    }
    return;
  }
  const hits = raycaster.intersectObjects(modules.map((m) => m.group), true);
  if (hits.length) {
    let obj = hits[0].object;
    while (obj && obj.userData.moduleId === undefined) obj = obj.parent;
    if (obj) {
      const m = modules.find((x) => x.rec.id === obj.userData.moduleId);
      if (m) {
        openModuleSheet(m);
        return;
      }
    }
  }
  selectedId = null;
  selHighlight.visible = false;
  if (activeSheet) closeSheet();
}

/* ══════════ HOJAS ══════════ */
function showSheet() {
  $('sheet').classList.remove('hidden');
  $('sheet-scrim').classList.remove('hidden');
  $('sheet-body').scrollTop = 0;
  document.querySelectorAll('#bottom-nav button').forEach((b) => {
    b.classList.toggle('active', b.dataset.nav === activeSheet);
  });
  syncChrome();
}

function closeSheet() {
  const wasModule = activeSheet === 'module';
  activeSheet = null;
  deleteArmed = null;
  resetArmed = false;
  $('sheet').classList.add('hidden');
  $('sheet-scrim').classList.add('hidden');
  document.querySelectorAll('#bottom-nav button').forEach((b) => b.classList.remove('active'));
  if (wasModule) {
    selectedId = null;
    selHighlight.visible = false;
  }
  syncChrome();
}

function openSheet(name) {
  if (placing) exitPlacing();
  if (activeSheet === name) { closeSheet(); return; }
  activeSheet = name;
  selectedId = null;
  selHighlight.visible = false;
  deleteArmed = null;
  resetArmed = false;
  renderSheet();
  showSheet();
  sfx.click();
}

function renderSheet() {
  if (!activeSheet) return;
  const scenario = currentScenario();
  if (!scenario) { closeSheet(); return; }

  if (activeSheet === 'module') {
    const m = selectedModule();
    if (!m) { closeSheet(); return; }
    $('sheet-title').textContent = `${MODULES[m.rec.type].icon} ${MODULES[m.rec.type].name}`;
    $('sheet-body').innerHTML = moduleSheetHTML(m, scenario, deleteArmed);
    return;
  }

  $('sheet-title').textContent = SHEET_TITLES[activeSheet] || '';
  const summary = currentSummary();
  const records = currentRecords();

  if (activeSheet === 'build') {
    const counts = scenarioCounts(scenario, project.activeId, modules);
    $('sheet-body').innerHTML = buildSheetHTML({ scenario, summary, counts });
  } else if (activeSheet === 'materials') {
    const bom = consolidatedBOM(scenario.params, records);
    $('sheet-body').innerHTML = materialsSheetHTML({ scenario, summary, bom });
  } else if (activeSheet === 'production') {
    const crop = scenario.params.defaultCrop || 'lettuce';
    const increments = [
      moduleIncrement(summary, scenario.params, records, 'nft12', crop),
      moduleIncrement(summary, scenario.params, records, 'nft6', crop),
    ];
    $('sheet-body').innerHTML = productionSheetHTML({ scenario, summary, increments });
  } else if (activeSheet === 'systems') {
    const scenarios = project.scenarios.map((s) => ({
      scenario: s,
      summary: summaryFor(s, project.activeId, modules),
      counts: scenarioCounts(s, project.activeId, modules),
      active: s.id === project.activeId,
    }));
    const expansion = expansionFor(
      summary, scenario.params, records, expandType, scaleUnits, scenario.params.defaultCrop,
    );
    $('sheet-body').innerHTML = systemsSheetHTML({
      scenarios, activeId: project.activeId, scaleUnits, expandType, expansion, deleteScenarioArmed,
    });
  } else if (activeSheet === 'economy') {
    $('sheet-body').innerHTML = economySheetHTML({ scenario, summary });
  } else if (activeSheet === 'menu') {
    $('sheet-body').innerHTML = menuSheetHTML({ scenario, resetArmed });
  }
}

/* ══════════ ACCIONES DE LAS HOJAS ══════════ */
const PARAM_SPECS = {
  materialFactor: { step: 0.05, min: 0.5, max: 2.5 },
  discardPct: { step: 1, min: 0, max: 40 },
  laborHoursWeek: { step: 1, min: 0, max: 80 },
  laborRate: { step: 1, min: 0, max: 80 },
  electricityPrice: { step: 0.01, min: 0, max: 1 },
  waterPrice: { step: 0.1, min: 0, max: 20 },
  waterLitersPlantDay: { step: 0.1, min: 0, max: 20 },
  nutrientCostPlantMonth: { step: 0.005, min: 0, max: 1 },
  contingencyPct: { step: 1, min: 0, max: 40 },
  depreciationYears: { step: 1, min: 1, max: 20 },
};
const CROP_SPECS = {
  priceKg: { step: 0.1, min: 0.1, max: 30 },
  yieldG: { step: 10, min: 30, max: 1000 },
  cycleDays: { step: 1, min: 7, max: 180 },
};

function adjustParam(key, dir) {
  const spec = PARAM_SPECS[key];
  if (!spec) return;
  const params = currentScenario().params;
  const value = clamp(+(Number(params[key]) + spec.step * dir).toFixed(4), spec.min, spec.max);
  params[key] = value;
  saveProject(false);
  updateHUD();
  renderSheet();
  sfx.click();
}

function adjustCropParam(cropId, key, dir) {
  const spec = CROP_SPECS[key];
  const params = currentScenario().params;
  if (!spec || !params.crops[cropId]) return;
  const crop = params.crops[cropId];
  const value = clamp(+(Number(crop[key]) + spec.step * dir).toFixed(4), spec.min, spec.max);
  crop[key] = value;
  saveProject(false);
  updateHUD();
  renderSheet();
  sfx.click();
}

function applyCropToAll(cropId) {
  const scenario = currentScenario();
  if (!CROPS[cropId]) return;
  scenario.params.defaultCrop = cropId;
  let count = 0;
  for (const m of modules) {
    if (MODULES[m.rec.type]?.kind !== 'nft') continue;
    m.rec.data.crop = cropId;
    applyPlants(m);
    count++;
  }
  saveProject(false);
  updateHUD();
  renderSheet();
  sfx.click();
  toast(`🌿 ${CROPS[cropId].name} aplicado a ${count} ${count === 1 ? 'caño' : 'caños'}`);
}

function changeModuleCrop(cropId) {
  const m = selectedModule();
  if (!m || MODULES[m.rec.type]?.kind !== 'nft' || !CROPS[cropId]) return;
  m.rec.data.crop = cropId;
  currentScenario().params.defaultCrop = cropId;
  applyPlants(m);
  saveProject(false);
  updateHUD();
  renderSheet();
  sfx.plant();
}

function changeModulePlants(dir) {
  const m = selectedModule();
  if (!m) return;
  const def = MODULES[m.rec.type];
  if (!def || def.kind !== 'nft') return;
  const current = m.rec.data.plants;
  const step = def.plantStep || 5;
  const value = clamp(
    Math.round(current + dir * step),
    def.plantMin || 1,
    def.plantMax || def.plants,
  );
  if (value === current) return;
  m.rec.data.plants = value;
  applyPlants(m);
  saveProject(false);
  updateHUD();
  renderSheet();
  sfx.click();
}

function handleSheetAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const d = button.dataset;
  const scenario = currentScenario();

  switch (d.action) {
    case 'start-build':
      startPlacing(d.type);
      break;
    case 'toggle-greenhouse':
      scenario.params.includeGreenhouse = !scenario.params.includeGreenhouse;
      saveProject(false);
      updateHUD();
      renderSheet();
      sfx.click();
      break;
    case 'param':
      adjustParam(d.param, Number(d.dir));
      break;
    case 'crop-param':
      adjustCropParam(d.crop, d.key, Number(d.dir));
      break;
    case 'crop-all':
      applyCropToAll(d.crop);
      break;
    case 'module-crop':
      changeModuleCrop(d.crop);
      break;
    case 'module-crop-all':
    case 'apply-crop-all': {
      const m = selectedModule();
      if (m) applyCropToAll(m.rec.data.crop);
      break;
    }
    case 'module-plants':
      changeModulePlants(Number(d.dir));
      break;
    case 'rotate-module':
      rotateSelected();
      break;
    case 'delete-module':
      if (deleteArmed !== selectedId) {
        deleteArmed = selectedId;
        renderSheet();
        toast('Tocá otra vez para confirmar la eliminación', 'warn');
        sfx.error();
      } else {
        removeModule(selectedId);
      }
      break;
    case 'switch-scenario':
      if (d.id) switchScenario(d.id);
      break;
    case 'duplicate-scenario':
      duplicateScenario(d.id);
      break;
    case 'delete-scenario':
      if (project.scenarios.length <= 1) {
        toast('Necesitás al menos un sistema', 'warn');
      } else if (deleteScenarioArmed !== d.id) {
        deleteScenarioArmed = d.id;
        renderSheet();
        toast('Tocá otra vez para eliminar este sistema', 'warn');
      } else {
        deleteScenario(d.id);
      }
      break;
    case 'new-scenario':
      addScenario();
      break;
    case 'scale':
      scaleUnits = clamp(scaleUnits + Number(d.dir), 1, 50);
      renderSheet();
      sfx.click();
      break;
    case 'expand-type':
      if (d.type === 'nft12' || d.type === 'nft6') {
        expandType = d.type;
        renderSheet();
        sfx.click();
      }
      break;
    case 'rename-scenario': {
      const name = window.prompt('Nombre del sistema:', scenario.name);
      if (name && name.trim()) {
        scenario.name = name.trim().slice(0, 40);
        saveProject(false);
        updateHUD();
        renderSheet();
        toast('✏️ Sistema renombrado');
      }
      break;
    }
    case 'save-now':
      saveProject(true);
      break;
    case 'export-json':
      exportProjectJSON();
      break;
    case 'export-csv':
      exportMaterialsCSV();
      break;
    case 'open-help':
      openHelp();
      break;
    case 'go-systems':
      openSheet('systems');
      break;
    case 'reset-project':
      if (!resetArmed) {
        resetArmed = true;
        renderSheet();
        toast('⚠️ Esto borra todos los sistemas guardados. Tocá otra vez.', 'warn');
        sfx.error();
      } else {
        resetAll();
      }
      break;
    default:
      break;
  }
}

/* ══════════ EXPORTAR ══════════ */
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function projectSlug() {
  const name = currentScenario()?.name || 'proyecto';
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'proyecto';
}

function exportProjectJSON() {
  downloadFile(`hidroplan-${projectSlug()}.json`, JSON.stringify(JSON.parse(serializeProject()), null, 2), 'application/json');
  toast('⬇️ Proyecto exportado como .json');
  sfx.cash();
}

function csvCell(value) {
  const text = String(value ?? '').replace(/;/g, ',').replace(/\n/g, ' ');
  return `"${text.replace(/"/g, '""')}"`;
}

function exportMaterialsCSV() {
  const scenario = currentScenario();
  const bom = consolidatedBOM(scenario.params, currentRecords());
  const lines = [
    ['Categoría', 'Material', 'Especificación', 'Cantidad', 'Unidad', 'Costo unitario USD', 'Subtotal USD'],
    ...bom.rows.map((r) => [r.cat, r.name, r.spec || '', r.qty, r.unit, r.unitCost.toFixed(2), r.subtotal.toFixed(2)]),
    ['', '', '', '', '', 'TOTAL', bom.total.toFixed(2)],
    ['', '', '', '', '', 'Sistema', scenario.name],
  ];
  const csv = '\uFEFF' + lines.map((row) => row.map(csvCell).join(';')).join('\r\n');
  downloadFile(`materiales-${projectSlug()}.csv`, csv, 'text/csv;charset=utf-8');
  toast('⬇️ Lista de materiales exportada');
  sfx.cash();
}

/* ══════════ PANTALLA DE INICIO ══════════ */
function clearTitleShowcase() {
  for (const group of titleModels) {
    scene.remove(group);
    disposeGroup(group);
  }
  titleModels = [];
}

function buildTitleShowcase() {
  clearTitleShowcase();
  const add = (type, col, row, rot = 0, crop = 'lettuce') => {
    const def = MODULES[type];
    const built = createModuleModel(type);
    if (!built) return;
    const fp = rot % 2 ? { w: def.h, h: def.w } : { w: def.w, h: def.h };
    const center = moduleCenter(col, row, fp.w, fp.h);
    built.group.position.set(center.x, 0, center.z);
    built.group.rotation.y = rot * Math.PI / 2;
    if (def.kind === 'nft' && built.setPlants) {
      built.setPlants(CROPS[crop] || CROPS.lettuce, def.plants);
    }
    scene.add(built.group);
    titleModels.push(built.group);
  };
  const crops = ['lettuce', 'basil', 'arugula', 'kale'];
  let i = 0;
  for (const row of [2, 5, 8, 11]) {
    add('nft12', 0, row, 0, crops[i++ % crops.length]);
    add('nft12', 12, row, 0, crops[i++ % crops.length]);
  }
  add('reservoir', 18, 13);
  add('nursery', 1, 14);
  add('bench', 4, 14);
  add('crate', 21, 13);
  add('planter', 23, 13);
  add('sign', 0, 0);
}

function renderTitle() {
  screen = 'title';
  document.body.classList.add('at-title');
  $('title-screen').classList.remove('hidden');
  $('topbar').classList.add('hidden');
  $('bottom-nav').classList.add('hidden');
  $('zoom-controls').classList.add('hidden');
  $('empty-hint').classList.add('hidden');
  $('placement-bar').classList.add('hidden');
  activeSheet = null;
  selectedId = null;
  selHighlight.visible = false;
  camTarget.set(0, 0, 2);
  camZoom = titleZoom();
  updateCamera();
  updateContinueButton();
}

function showGame(openBuild = false) {
  screen = 'playing';
  clearTitleShowcase();
  document.body.classList.remove('at-title');
  $('title-screen').classList.add('hidden');
  $('topbar').classList.remove('hidden');
  $('bottom-nav').classList.remove('hidden');
  selectedId = null;
  selHighlight.visible = false;
  camTarget.set(0, 0, 0);
  camZoom = gameZoom();
  updateCamera();
  updateHUD();
  if (openBuild) openSheet('build');
  else syncChrome();
}

function freshProject() {
  const scenario = newScenario('Sistema 1');
  return { activeId: scenario.id, scenarios: [scenario], nextModuleId: 1 };
}

function startNewProject(skipConfirm = false) {
  if (!skipConfirm && !newArmed && localStorage.getItem(SAVE_KEY)) {
    newArmed = true;
    toast('⚠️ Ya hay un proyecto guardado. Tocá <b>NUEVO PROYECTO</b> otra vez para empezar de cero.', 'warn');
    setTimeout(() => { newArmed = false; }, 4200);
    return;
  }
  newArmed = false;
  clearTitleShowcase();
  project = freshProject();
  hintReservoirShown = false;
  scaleUnits = 1;
  loadScenarioRuntime(currentScenario());
  showGame(true);
  saveProject(false);
  sfx.success();
  toast('🧪 Proyecto nuevo: presupuestá los módulos y mirá los números.');
}

function continueProject() {
  if (!loadProject()) {
    toast('No hay un proyecto guardado en este teléfono', 'warn');
    updateContinueButton();
    return;
  }
  hintReservoirShown = false;
  scaleUnits = 1;
  showGame(false);
  sfx.success();
  toast('💾 Proyecto cargado');
}

function resetAll() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* sin almacenamiento */ }
  project = freshProject();
  hintReservoirShown = false;
  scaleUnits = 1;
  deleteScenarioArmed = null;
  loadScenarioRuntime(currentScenario());
  saveProject(false);
  closeSheet();
  updateContinueButton();
  openSheet('build');
  toast('🧪 Todos los sistemas fueron borrados');
  sfx.success();
}

/* ══════════ HUD / CHROME ══════════ */
function updateHUD() {
  if (!project.scenarios.length) return;
  const scenario = currentScenario();
  if (!scenario) return;
  const summary = currentSummary();
  $('capex').textContent = fmtMoney(summary.capex);
  const pipeText = summary.pipes === 1 ? '1 caño' : `${summary.pipes} caños`;
  const plantText = summary.plants === 1 ? '1 planta' : `${summary.plants} plantas`;
  $('project-line').textContent = `${scenario.name} · ${pipeText} · ${plantText}`;
  syncChrome();
}

function syncChrome() {
  const playing = screen === 'playing';
  const sheetOpen = !!activeSheet;
  $('empty-hint').classList.toggle('hidden', !(playing && modules.length === 0 && !placing && !sheetOpen));
  $('zoom-controls').classList.toggle('hidden', !(playing && !placing && !sheetOpen));
  document.body.classList.toggle('is-placing', !!placing);
}

/* ══════════ AYUDA / PANTALLA COMPLETA ══════════ */
function openHelp() {
  closeSheet();
  $('help-modal').classList.remove('hidden');
  sfx.click();
}
function closeHelp() {
  $('help-modal').classList.add('hidden');
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
  } catch (e) { /* el navegador puede bloquearlo */ }
}

/* ══════════ BIND DE UI ══════════ */
function bindUI() {
  $('sheet-body').addEventListener('click', handleSheetAction);
  $('sheet-close').addEventListener('click', () => { closeSheet(); sfx.click(); });
  $('sheet-scrim').addEventListener('click', closeSheet);

  document.querySelectorAll('#bottom-nav button').forEach((button) => {
    button.addEventListener('click', () => {
      unlockAudio();
      openSheet(button.dataset.nav);
    });
  });

  $('btn-new').addEventListener('click', () => { unlockAudio(); startNewProject(false); });
  $('btn-continue').addEventListener('click', () => { unlockAudio(); continueProject(); });
  $('btn-help-title').addEventListener('click', openHelp);
  $('btn-help-close').addEventListener('click', () => { closeHelp(); sfx.click(); });
  $('help-modal').addEventListener('click', (event) => {
    if (event.target === $('help-modal')) closeHelp();
  });

  $('btn-menu').addEventListener('click', () => openSheet('menu'));
  $('btn-fullscreen').addEventListener('click', toggleFullscreen);
  $('zoom-in').addEventListener('click', () => { zoomBy(1.18); sfx.click(); });
  $('zoom-out').addEventListener('click', () => { zoomBy(0.85); sfx.click(); });

  $('pb-rotate').addEventListener('click', () => { rotateGhost(); sfx.click(); });
  $('pb-confirm').addEventListener('click', confirmPlacement);
  $('pb-cancel').addEventListener('click', () => { exitPlacing(); sfx.click(); });

  document.addEventListener('pointerdown', unlockAudio, { once: true });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!$('help-modal').classList.contains('hidden')) closeHelp();
    else if (placing) exitPlacing();
    else if (activeSheet) closeSheet();
  });
}

/* ══════════ LOOP ══════════ */
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

/* ══════════ HOOKS DE PRUEBA ══════════ */
window.__hidro = {
  project: () => project,
  scenario: () => currentScenario(),
  summary: () => currentSummary(),
  records: () => currentRecords(),
  modules: () => modules.map((m) => ({ ...m.rec, data: { ...m.rec.data } })),
  screen: () => screen,
  sheet: () => activeSheet,
  renderer: () => renderer,
  camera: () => camera,
  scene: () => scene,
  world: () => world,
  place: (type, col, row, rot = 0, data = null) => {
    const def = MODULES[type];
    if (!def) return null;
    const fp = footprint(type, rot);
    if (!areaFree(col, row, fp.w, fp.h)) return null;
    const rec = {
      id: project.nextModuleId++, type, col, row, rot,
      data: data || (def.kind === 'nft'
        ? { crop: currentScenario().params.defaultCrop || 'lettuce', plants: def.plants }
        : {}),
    };
    currentScenario().modules.push(rec);
    placeRuntime(rec);
    saveProject(false);
    updateHUD();
    return { ...rec, data: { ...rec.data } };
  },
  remove: (id) => removeModule(id),
  setCrop: (cropId) => applyCropToAll(cropId),
  setParam: (key, value) => {
    currentScenario().params[key] = value;
    saveProject(false);
    updateHUD();
    if (activeSheet) renderSheet();
  },
  switchScenario: (id) => switchScenario(id),
  addScenario: () => addScenario(),
  duplicateScenario: (id) => duplicateScenario(id),
  scale: (n) => {
    scaleUnits = clamp(Number(n) || 1, 1, 50);
    if (activeSheet === 'systems') renderSheet();
  },
  openSheet: (name) => openSheet(name),
  closeSheet: () => closeSheet(),
  startPlacing: (type) => startPlacing(type),
  confirm: () => confirmPlacement(),
  exitPlacing: () => exitPlacing(),
};

init();


