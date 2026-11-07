// ══════════ HIDROPLAN · sistemas y proyecciones ══════════
// Un "sistema" es un proyecto independiente: diseño en planta, cultivo y supuestos.
// Permite comparar varios sistemas y proyectar qué pasa al replicarlos o ampliarlos.
import { CROPS, CROP_IDS, MODULES, defaultParams, projectSummary } from './data.js';

export function newScenario(name = 'Sistema base', params = defaultParams()) {
  return {
    id: 's' + Math.random().toString(36).slice(2, 9),
    name,
    params,
    modules: [],
  };
}

export function cloneScenario(source, name) {
  const copy = JSON.parse(JSON.stringify(source));
  copy.id = 's' + Math.random().toString(36).slice(2, 9);
  copy.name = name || `${source.name} (copia)`;
  return copy;
}

export function recordsFor(s, activeId, runtimeModules) {
  if (!s) return [];
  if (s.id === activeId) return runtimeModules.map((m) => m.rec);
  return s.modules;
}

export function summaryFor(s, activeId, runtimeModules) {
  return projectSummary(s.params, recordsFor(s, activeId, runtimeModules));
}

export function scenarioCounts(s, activeId, runtimeModules) {
  const counts = {};
  for (const rec of recordsFor(s, activeId, runtimeModules)) {
    if (MODULES[rec.type]) counts[rec.type] = (counts[rec.type] || 0) + 1;
  }
  return counts;
}

export function countLabel(counts) {
  const parts = [];
  let extras = 0;
  for (const [type, n] of Object.entries(counts)) {
    if (!n) continue;
    if (type === 'nft12') parts.push(`${n}× caño 12 m`);
    else if (type === 'nft6') parts.push(`${n}× caño 6 m`);
    else extras += n;
  }
  if (extras) parts.push(`${extras} ${extras === 1 ? 'módulo auxiliar' : 'módulos auxiliares'}`);
  return parts.length ? parts.join(' · ') : 'Sin módulos todavía';
}

// Ampliar el sistema abierto con más caños, manteniendo invernadero y mano de obra.
export function expansionFor(summary, params, records, type, count, crop) {
  const def = MODULES[type];
  const n = Math.max(1, Math.round(count));
  if (!def) return null;
  const extra = Array.from({ length: n }, (_, i) => ({
    id: `virtual-${i}`, type, col: 0, row: 0, rot: 0,
    data: def.kind === 'nft'
      ? { crop: crop || params.defaultCrop || 'lettuce', plants: def.plants }
      : {},
  }));
  const after = projectSummary(params, [...records, ...extra]);

  // ¿Cuántos caños más hacen falta para cubrir los costos del sistema?
  let breakEvenExtra = 0;
  if (summary.margin < 0) {
    breakEvenExtra = null;
    for (let n2 = 1; n2 <= 60; n2++) {
      const extra2 = Array.from({ length: n2 }, (_, i) => ({
        id: `be-${i}`, type, col: 0, row: 0, rot: 0,
        data: { crop: crop || params.defaultCrop || 'lettuce', plants: def.plants },
      }));
      if (projectSummary(params, [...records, ...extra2]).margin >= 0) {
        breakEvenExtra = n2;
        break;
      }
    }
  }

  return {
    type, count: n, after,
    addedCapex: after.capex - summary.capex,
    addedPlants: after.plants - summary.plants,
    addedKg: after.production.kgMonth - summary.production.kgMonth,
    addedRevenue: after.revenue - summary.revenue,
    addedMargin: after.margin - summary.margin,
    totalMargin: after.margin,
    totalCapex: after.capex,
    totalPlants: after.plants,
    totalKg: after.production.kgMonth,
    totalRevenue: after.revenue,
    breakEvenExtra,
    addedCashMargin: after.cashMargin - summary.cashMargin,
    paybackMonths: after.cashMargin > 0 ? after.capex / after.cashMargin : Infinity,
  };
}

// Costo, ingresos y margen incremental de agregar un módulo al sistema actual.
export function moduleIncrement(baseSummary, params, records, type, crop) {
  const def = MODULES[type];
  if (!def) return null;
  const rec = {
    id: 'virtual', type, col: 0, row: 0, rot: 0,
    data: def.kind === 'nft'
      ? { crop: crop || params.defaultCrop || 'lettuce', plants: def.plants }
      : {},
  };
  const after = projectSummary(params, [...records, rec]);
  const capex = after.capex - baseSummary.capex;
  const revenue = after.revenue - baseSummary.revenue;
  const margin = after.margin - baseSummary.margin;
  const cashMargin = after.cashMargin - baseSummary.cashMargin;
  const kgMonth = after.production.kgMonth - baseSummary.production.kgMonth;
  return {
    type, capex, revenue, margin, cashMargin, kgMonth,
    plants: after.plants - baseSummary.plants,
    paybackMonths: cashMargin > 0 ? capex / cashMargin : Infinity,
    perKg: kgMonth > 0 ? revenue / kgMonth : 0,
  };
}

export function dominantCrop(records, fallback = 'lettuce') {
  const count = {};
  for (const rec of records) {
    if (MODULES[rec.type]?.kind !== 'nft') continue;
    const id = rec.data?.crop || fallback;
    count[id] = (count[id] || 0) + 1;
  }
  let best = fallback, max = 0;
  for (const id of CROP_IDS) {
    if ((count[id] || 0) > max) { max = count[id]; best = id; }
  }
  return best;
}

export function cropLine(cropId, params) {
  const base = CROPS[cropId];
  const p = params.crops?.[cropId] || base;
  return {
    id: cropId,
    name: base.name,
    icon: base.icon,
    priceKg: Number(p.priceKg) || 0,
    yieldG: Number(p.yieldG) || 0,
    cycleDays: Number(p.cycleDays) || 1,
    plantCost: base.plantCost,
  };
}

export function availableCrops(params) {
  return CROP_IDS.map((id) => cropLine(id, params));
}
