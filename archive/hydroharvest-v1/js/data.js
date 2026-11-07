// ══════════ HIDROPLAN · datos técnicos y económicos ══════════
// Catálogo de módulos NFT, materiales, supuestos de producción y cálculo de proyecto.
// Todos los precios son estimaciones orientativas en USD, editables desde la app.

export const CROPS = {
  lettuce: {
    name: 'Lechuga', icon: '🥬', cycleDays: 35, yieldG: 250, priceKg: 3.2, plantCost: 0.12,
    color: 0x86efac, dark: 0x16a34a, shape: 'rosette',
  },
  basil: {
    name: 'Albahaca', icon: '🌿', cycleDays: 45, yieldG: 120, priceKg: 9.0, plantCost: 0.15,
    color: 0x22c55e, dark: 0x15803d, shape: 'bush',
  },
  arugula: {
    name: 'Rúcula', icon: '🍃', cycleDays: 28, yieldG: 140, priceKg: 5.0, plantCost: 0.10,
    color: 0x4ade80, dark: 0x166534, shape: 'leafy',
  },
  kale: {
    name: 'Kale', icon: '🥦', cycleDays: 50, yieldG: 220, priceKg: 4.6, plantCost: 0.14,
    color: 0x16a34a, dark: 0x14532d, shape: 'rosette',
  },
};
export const CROP_IDS = Object.keys(CROPS);

// ── Módulos construibles ─────────────────────────────────────────────
// w × h = huella en metros (1 celda = 1 m). `bom` = lista de materiales.
export const MODULES = {
  nft12: {
    name: 'Caño NFT 12 m', icon: '🌿', w: 12, h: 1, kind: 'nft',
    plants: 60, plantMin: 40, plantMax: 72, plantStep: 5,
    desc: 'PVC 110 mm · 60 plantas a 20 cm',
    note: 'Caño de 12 m con 60 bocas a 20 cm. Pendiente recomendada: 1–2 %.',
    bom: [
      { name: 'Caño PVC 110 mm', spec: '12 m', qty: 1, unit: 'u', unitCost: 58, cat: 'PVC' },
      { name: 'Tapones 110 mm', qty: 2, unit: 'u', unitCost: 2.8, cat: 'Conexiones' },
      { name: 'Codos 110 mm 90°', qty: 2, unit: 'u', unitCost: 3.4, cat: 'Conexiones' },
      { name: 'Soportes caballete', qty: 8, unit: 'u', unitCost: 2.5, cat: 'Estructura' },
      { name: 'Canastillas 50 mm', qty: (p) => p, unit: 'u', unitCost: 0.14, cat: 'Insumos' },
      { name: 'Manguera colectora 50 mm', qty: 2, unit: 'm', unitCost: 1.6, cat: 'PVC' },
      { name: 'Llave de paso 50 mm', qty: 1, unit: 'u', unitCost: 4.5, cat: 'Conexiones' },
      { name: 'Pegamento PVC', qty: 1, unit: 'kit', unitCost: 4, cat: 'Insumos' },
    ],
    labor: 12,
  },
  nft6: {
    name: 'Caño NFT 6 m', icon: '🌱', w: 6, h: 1, kind: 'nft',
    plants: 30, plantMin: 20, plantMax: 36, plantStep: 5,
    desc: 'PVC 110 mm · 30 plantas a 20 cm',
    note: 'Versión corta para espacios reducidos o pruebas piloto.',
    bom: [
      { name: 'Caño PVC 110 mm', spec: '6 m', qty: 1, unit: 'u', unitCost: 29, cat: 'PVC' },
      { name: 'Tapones 110 mm', qty: 2, unit: 'u', unitCost: 2.8, cat: 'Conexiones' },
      { name: 'Codos 110 mm 90°', qty: 2, unit: 'u', unitCost: 3.4, cat: 'Conexiones' },
      { name: 'Soportes caballete', qty: 4, unit: 'u', unitCost: 2.5, cat: 'Estructura' },
      { name: 'Canastillas 50 mm', qty: (p) => p, unit: 'u', unitCost: 0.14, cat: 'Insumos' },
      { name: 'Manguera colectora 50 mm', qty: 1, unit: 'm', unitCost: 1.6, cat: 'PVC' },
      { name: 'Llave de paso 50 mm', qty: 1, unit: 'u', unitCost: 4.5, cat: 'Conexiones' },
      { name: 'Pegamento PVC', qty: 1, unit: 'kit', unitCost: 4, cat: 'Insumos' },
    ],
    labor: 7,
  },
  reservoir: {
    name: 'Kit reservorio 1000 L', icon: '💧', w: 2, h: 2, kind: 'system',
    coverage: 600,
    desc: 'Tanque · bomba 3500 L/h · filtro · timer',
    note: 'Cobertura orientativa para 600 plantas. Verificá caudal, volumen y recambio según tu diseño.',
    bom: [
      { name: 'Tanque 1000 L', qty: 1, unit: 'u', unitCost: 95, cat: 'Hidráulica' },
      { name: 'Bomba sumergible 3500 L/h', qty: 1, unit: 'u', unitCost: 45, cat: 'Hidráulica' },
      { name: 'Filtro de anillas', qty: 1, unit: 'u', unitCost: 22, cat: 'Hidráulica' },
      { name: 'Temporizador digital', qty: 1, unit: 'u', unitCost: 12, cat: 'Eléctrico' },
      { name: 'Dosificador tipo venturi', qty: 1, unit: 'u', unitCost: 18, cat: 'Hidráulica' },
      { name: 'Flotador y valvulería', qty: 1, unit: 'u', unitCost: 25, cat: 'Hidráulica' },
      { name: 'Mangueras y colector 50 mm', qty: 10, unit: 'm', unitCost: 1.6, cat: 'PVC' },
    ],
    labor: 30,
  },
  nursery: {
    name: 'Mesa de almácigo', icon: '🪴', w: 2, h: 1, kind: 'support',
    desc: 'Bandejas y sustrato para plantines',
    note: 'Producción propia de plantines para programar los trasplantes.',
    bom: [
      { name: 'Mesa de acero 2 × 1 m', qty: 1, unit: 'u', unitCost: 55, cat: 'Estructura' },
      { name: 'Bandejas de germinación', qty: 6, unit: 'u', unitCost: 4.5, cat: 'Insumos' },
      { name: 'Sustrato de almácigo', qty: 2, unit: 'bolsa', unitCost: 10, cat: 'Insumos' },
      { name: 'Semillas y etiquetas', qty: 1, unit: 'kit', unitCost: 15, cat: 'Insumos' },
    ],
    labor: 12,
  },
  bench: {
    name: 'Mesa de trabajo', icon: '🔧', w: 2, h: 1, kind: 'support',
    desc: 'Armado, limpieza y mantenimiento',
    note: 'Espacio de trabajo para preparar solución, canastillas y herramientas.',
    bom: [
      { name: 'Mesa de trabajo 2 × 1 m', qty: 1, unit: 'u', unitCost: 70, cat: 'Estructura' },
      { name: 'Estante inferior', qty: 1, unit: 'u', unitCost: 22, cat: 'Estructura' },
      { name: 'Herramientas y bandejas', qty: 1, unit: 'kit', unitCost: 28, cat: 'Insumos' },
    ],
    labor: 10,
  },
  led: {
    name: 'Barra LED 2 m', icon: '💡', w: 2, h: 1, kind: 'support',
    desc: 'Espectro completo · apoyo lumínico',
    note: 'Barra de apoyo para días nublados o zonas de baja radiación.',
    bom: [
      { name: 'Barra LED espectro completo', qty: 1, unit: 'u', unitCost: 60, cat: 'Eléctrico' },
      { name: 'Estructura y colgantes', qty: 1, unit: 'kit', unitCost: 20, cat: 'Estructura' },
      { name: 'Cableado y timer', qty: 1, unit: 'kit', unitCost: 10, cat: 'Eléctrico' },
    ],
    labor: 10,
  },
  fan: {
    name: 'Extractor de aire', icon: '🌀', w: 1, h: 1, kind: 'support',
    desc: 'Renovación y control de humedad',
    note: 'Extracción para evitar condensación y exceso de humedad.',
    bom: [
      { name: 'Extractor 8"', qty: 1, unit: 'u', unitCost: 55, cat: 'Eléctrico' },
      { name: 'Instalación y rejilla', qty: 1, unit: 'u', unitCost: 15, cat: 'Eléctrico' },
    ],
    labor: 8,
  },
  planter: {
    name: 'Maceta decorativa', icon: '🌴', w: 1, h: 1, kind: 'decor',
    desc: 'Detalle de ambientación',
    bom: [
      { name: 'Maceta 20 L', qty: 1, unit: 'u', unitCost: 12, cat: 'Decoración' },
      { name: 'Sustrato y planta', qty: 1, unit: 'u', unitCost: 14, cat: 'Decoración' },
    ],
    labor: 0,
  },
  crate: {
    name: 'Cajón de cosecha', icon: '📦', w: 1, h: 1, kind: 'decor',
    desc: 'Cosecha y logística',
    bom: [
      { name: 'Cajón plástico apilable', qty: 1, unit: 'u', unitCost: 12, cat: 'Logística' },
    ],
    labor: 0,
  },
  sign: {
    name: 'Cartel del proyecto', icon: '🪧', w: 1, h: 1, kind: 'decor',
    desc: 'Identidad del invernadero',
    bom: [
      { name: 'Cartel + poste', qty: 1, unit: 'u', unitCost: 32, cat: 'Decoración' },
    ],
    labor: 3,
  },
};
export const MODULE_IDS = Object.keys(MODULES);

// ── Invernadero base incluido en el proyecto ─────────────────────────
export const GREENHOUSE = {
  name: 'Invernadero base 24 × 16 m',
  area: 384,
  desc: 'Estructura galvanizada · film 150 µm · malla sombra · platea',
  bom: [
    { name: 'Estructura de acero galvanizado', qty: 384, unit: 'm²', unitCost: 9, cat: 'Estructura' },
    { name: 'Film polietileno 150 µm', qty: 420, unit: 'm²', unitCost: 3.5, cat: 'Cubierta' },
    { name: 'Malla sombra 50 %', qty: 180, unit: 'm²', unitCost: 2, cat: 'Cubierta' },
    { name: 'Platea de hormigón', qty: 384, unit: 'm²', unitCost: 2.5, cat: 'Obra civil' },
    { name: 'Puertas y herrajes', qty: 2, unit: 'u', unitCost: 75, cat: 'Aberturas' },
    { name: 'Mano de obra de montaje', qty: 1, unit: 'global', unitCost: 800, cat: 'Mano de obra' },
  ],
};

// ── Supuestos por defecto (editables en la app) ─────────────────────
export function defaultParams() {
  return {
    includeGreenhouse: true,
    materialFactor: 1,
    defaultCrop: 'lettuce',
    discardPct: 5,
    laborHoursWeek: 12,
    laborRate: 6,
    electricityPrice: 0.14,
    waterPrice: 1.2,
    waterLitersPlantDay: 0.9,
    nutrientCostPlantMonth: 0.06,
    depreciationYears: 8,
    contingencyPct: 8,
    crops: Object.fromEntries(CROP_IDS.map((id) => [id, {
      priceKg: CROPS[id].priceKg,
      yieldG: CROPS[id].yieldG,
      cycleDays: CROPS[id].cycleDays,
    }])),
  };
}

// ── Helpers de cálculo ───────────────────────────────────────────────
export function bomFor(type, data = {}) {
  const def = MODULES[type];
  if (!def) return [];
  const plants = Number(data?.plants ?? def.plants ?? 0);
  return def.bom.map((row) => ({
    ...row,
    qty: typeof row.qty === 'function' ? row.qty(plants) : row.qty,
  }));
}

export function moduleMaterialCost(type, data = {}, factor = 1) {
  const def = MODULES[type];
  if (!def) return 0;
  const mats = bomFor(type, data).reduce((s, row) => s + row.qty * row.unitCost, 0);
  return (mats + (def.labor || 0)) * factor;
}

export function greenhouseMaterialCost(factor = 1) {
  return GREENHOUSE.bom.reduce((s, row) => s + row.qty * row.unitCost, 0) * factor;
}

export function consolidatedBOM(params, modules) {
  const factor = params.materialFactor || 1;
  const map = new Map();
  const add = (row) => {
    const unitCost = row.unitCost * factor;
    const key = `${row.name}|${row.unit}|${unitCost.toFixed(4)}`;
    const cur = map.get(key);
    if (cur) cur.qty += row.qty;
    else map.set(key, { ...row, unitCost, qty: row.qty });
  };
  for (const m of modules) {
    if (MODULES[m.type]) bomFor(m.type, m.data).forEach(add);
  }
  if (params.includeGreenhouse) GREENHOUSE.bom.forEach(add);
  const rows = [...map.values()].sort((a, b) =>
    a.cat.localeCompare(b.cat, 'es') || a.name.localeCompare(b.name, 'es'));
  for (const r of rows) r.subtotal = r.qty * r.unitCost;
  const materialsTotal = rows.reduce((s, r) => s + r.subtotal, 0);
  const modulesLabor = modules.reduce((s, m) =>
    s + ((MODULES[m.type]?.labor || 0) * factor), 0);
  return { rows, materialsTotal, modulesLabor, total: materialsTotal + modulesLabor, factor };
}

export function projectSummary(params, modules) {
  const factor = params.materialFactor || 1;
  const byKind = { nft: 0, system: 0, support: 0, decor: 0 };
  let modulesCost = 0;
  let pipes = 0;
  let plants = 0;
  let reservoirs = 0;
  let nursery = 0;
  let leds = 0;
  let fans = 0;

  for (const m of modules) {
    const def = MODULES[m.type];
    if (!def) continue;
    const plantsOnModule = def.kind === 'nft' ? Number(m.data?.plants ?? def.plants) : 0;
    byKind[def.kind] = (byKind[def.kind] || 0) + moduleMaterialCost(m.type, m.data, factor);
    modulesCost += moduleMaterialCost(m.type, m.data, factor);
    if (def.kind === 'nft') { pipes++; plants += plantsOnModule; }
    if (m.type === 'reservoir') reservoirs++;
    if (m.type === 'nursery') nursery++;
    if (m.type === 'led') leds++;
    if (m.type === 'fan') fans++;
  }

  const greenhouse = params.includeGreenhouse ? greenhouseMaterialCost(factor) : 0;
  const capex = modulesCost + greenhouse;

  // Producción por cultivo (estado estacionario mensual)
  const byCrop = {};
  for (const id of CROP_IDS) {
    byCrop[id] = { pipes: 0, plants: 0, kgMonth: 0, revenueMonth: 0, seedCostMonth: 0 };
  }
  for (const m of modules) {
    const def = MODULES[m.type];
    if (!def || def.kind !== 'nft') continue;
    const cropId = m.data?.crop || 'lettuce';
    const crop = CROPS[cropId];
    const p = params.crops[cropId] || crop;
    const n = Number(m.data?.plants ?? def.plants);
    const cyclesMonth = 30 / Math.max(1, p.cycleDays);
    const effective = n * (1 - params.discardPct / 100);
    const kg = effective * (p.yieldG / 1000) * cyclesMonth;
    byCrop[cropId].pipes++;
    byCrop[cropId].plants += n;
    byCrop[cropId].kgMonth += kg;
    byCrop[cropId].revenueMonth += kg * p.priceKg;
    byCrop[cropId].seedCostMonth += n * cyclesMonth * CROPS[cropId].plantCost;
  }
  const revenue = Object.values(byCrop).reduce((s, r) => s + r.revenueMonth, 0);
  const seedlings = Object.values(byCrop).reduce((s, r) => s + r.seedCostMonth, 0);
  const kgMonth = Object.values(byCrop).reduce((s, r) => s + r.kgMonth, 0);

  // OPEX mensual estimado
  const nutrients = plants * params.nutrientCostPlantMonth;
  const water = plants * params.waterLitersPlantDay * 30 / 1000 * params.waterPrice;
  const energyKwh = 30 + pipes * 6 + reservoirs * 45 + leds * 18 + fans * 12;
  const energy = energyKwh * params.electricityPrice;
  const labor = params.laborHoursWeek * 4.333 * params.laborRate;
  const depreciation = capex / Math.max(1, params.depreciationYears) / 12;
  const opexBase = nutrients + water + energy + labor + seedlings + depreciation;
  const contingency = opexBase * params.contingencyPct / 100;
  const opex = opexBase + contingency;
  const margin = revenue - opex;
  const cashMargin = margin + depreciation; // flujo operativo antes de amortizar
  const paybackMonths = cashMargin > 0 ? capex / cashMargin : Infinity;
  const coverage = reservoirs * (MODULES.reservoir.coverage || 0);

  const warnings = [];
  if (!pipes) warnings.push('Todavía no agregaste caños NFT.');
  if (pipes && !reservoirs) warnings.push('Falta un kit de reservorio: la bomba y la solución nutritiva son necesarias.');
  if (pipes && reservoirs && plants > coverage) {
    const need = Math.ceil(plants / (MODULES.reservoir.coverage || 600));
    warnings.push(`Los reservorios cubren ${coverage} plantas. Para ${plants} plantas necesitás ${need} kits.`);
  }
  if (pipes && !nursery) warnings.push('Sin mesa de almácigo dependés de comprar plantines afuera.');
  if (pipes && margin <= 0) warnings.push('Con estos supuestos el proyecto no cubre sus costos mensuales.');

  return {
    factor,
    capex,
    modulesCost,
    greenhouse,
    byKind,
    pipes,
    plants,
    reservoirs,
    nursery,
    coverage,
    production: { byCrop, revenueMonth: revenue, kgMonth, seedlings },
    opex: {
      nutrients, water, energy, energyKwh, labor, seedlings, depreciation,
      contingency, base: opexBase, total: opex,
    },
    revenue,
    margin,
    cashMargin,
    marginPct: revenue > 0 ? (margin / revenue) * 100 : 0,
    paybackMonths,
    costPerPlant: plants > 0 ? capex / plants : 0,
    investmentPerM2: capex / GREENHOUSE.area,
    warnings,
  };
}
