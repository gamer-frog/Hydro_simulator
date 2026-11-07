// ══════════ HIDROPLAN · pantallas (HTML de las hojas) ══════════
import {
  CROPS, MODULES, MODULE_IDS, GREENHOUSE, bomFor, moduleMaterialCost,
} from './data.js';
import { fmtMoney, fmtNum, fmtQty, fmtPayback, plural } from './format.js';
import { availableCrops, countLabel, moduleIncrement } from './systems.js';

export const SHEET_TITLES = {
  build: '🏗️ Construir',
  materials: '🧾 Materiales',
  production: '🌱 Producción',
  systems: '🧪 Sistemas',
  economy: '💵 Economía',
  menu: '☰ Proyecto',
};

const pct = (v) => `${fmtNum(v, 0)} %`;
const unit = (u) => (u === 'global' ? '' : u);

function specBox(label, value, sub = '') {
  return `<div class="spec-box"><div class="spec-label">${label}</div>
    <div class="spec-value">${value}${sub ? ` <small>${sub}</small>` : ''}</div></div>`;
}

function paramRow(label, sub, value, action, attrs = '') {
  return `<div class="param-row">
    <div class="param-label">${label}<small>${sub}</small></div>
    <div class="stepper">
      <button data-action="${action}" ${attrs} data-dir="-1" aria-label="Restar">−</button>
      <span class="sv">${value}</span>
      <button data-action="${action}" ${attrs} data-dir="1" aria-label="Sumar">+</button>
    </div>
  </div>`;
}

function bomList(rows, total, labor, factor) {
  const body = rows.map((r) => `<div class="bom-row">
    <div class="bom-name">${r.name}${r.spec ? `<small>${r.spec}</small>` : ''}</div>
    <div class="bom-qty">${fmtQty(r.qty)} ${unit(r.unit)}</div>
    <div class="bom-cost">${fmtMoney(r.qty * r.unitCost)}</div>
  </div>`).join('');
  return `<div class="bom-box">${body}</div>
    <div class="bom-total">
      <div>Materiales<small>${factor !== 1 ? `factor de precios ${fmtNum(factor, 2)}×` : 'precios estimados'}</small></div>
      <div class="bt-num">${fmtMoney(total)}</div>
    </div>
    ${labor ? `<div class="bom-total"><div>Mano de obra<small>montaje estimado</small></div><div class="bt-num">${fmtMoney(labor)}</div></div>` : ''}`;
}

/* ══════════ CONSTRUIR ══════════ */
export function buildSheetHTML({ scenario, summary, counts }) {
  const factor = scenario.params.materialFactor || 1;
  const groups = [
    ['Caños NFT', ['nft12', 'nft6']],
    ['Sistema y equipos', ['reservoir', 'nursery', 'bench', 'led', 'fan']],
    ['Ambientación', ['planter', 'crate', 'sign']],
  ];
  let html = `<div class="hint-box"><b>Estás presupuestando, no gastando.</b> Colocá todos los módulos que quieras: la inversión y la producción se recalculan solas.</div>`;
  for (const [group, ids] of groups) {
    html += `<div class="section-title"><span>${group}</span></div><div class="build-grid">`;
    for (const id of ids) {
      const def = MODULES[id];
      const cost = moduleMaterialCost(id, { plants: def.plants }, factor);
      const placed = counts[id] || 0;
      html += `<button class="build-card" data-action="start-build" data-type="${id}">
        <div class="bc-icon">${def.icon}</div>
        <div class="bc-name">${def.name}</div>
        <div class="bc-desc">${def.desc}</div>
        <div class="bc-foot">
          <span class="bc-size">${def.w}×${def.h} m</span>
          ${def.kind === 'nft' ? `<span class="bc-plants">${def.plants} plantas</span>` : ''}
          <span class="bc-cost">${fmtMoney(cost)}</span>
        </div>
        ${placed ? `<div class="bc-placed">${placed} en el sistema</div>` : ''}
      </button>`;
    }
    html += `</div>`;
  }
  html += `<div class="section-title"><span>Resumen del sistema</span><span>${plural(summary.pipes, 'caño', 'caños')} · ${plural(summary.plants, 'planta', 'plantas')}</span></div>
    <div class="bom-total"><div>Inversión actual<small>materiales + mano de obra + invernadero</small></div><div class="bt-num">${fmtMoney(summary.capex)}</div></div>
    <div class="bom-footnote">Tocá un módulo ya colocado para cambiar su cultivo, densidad o ver su lista de materiales.</div>`;
  return html;
}

/* ══════════ MÓDULO SELECCIONADO ══════════ */
export function moduleSheetHTML(m, scenario, deleteArmed) {
  const rec = m.rec;
  const def = MODULES[rec.type];
  const params = scenario.params;
  const factor = params.materialFactor || 1;
  const bom = bomFor(rec.type, rec.data);
  const mats = bom.reduce((s, r) => s + r.qty * r.unitCost, 0) * factor;
  const labor = (def.labor || 0) * factor;
  const cost = mats + labor;
  const isNft = def.kind === 'nft';

  let html = `<div class="module-hero">
    <div class="mh-icon">${def.icon}</div>
    <div class="mh-main"><div class="mh-name">${def.name}</div><div class="mh-desc">${def.desc}</div></div>
    <div class="mh-cost">${fmtMoney(cost)}</div>
  </div>`;

  html += `<div class="spec-grid">`;
  html += specBox('Huella', `${def.w} × ${def.h} m`);
  if (isNft) {
    html += specBox('Plantas', rec.data.plants, 'en este caño');
    html += specBox('Cultivo', CROPS[rec.data.crop]?.name || '—');
    html += specBox('Costo / planta', fmtMoney(cost / Math.max(1, rec.data.plants), 2));
  } else if (def.kind === 'system' && def.coverage) {
    html += specBox('Cobertura', `${fmtNum(def.coverage, 0)}`, 'plantas');
    html += specBox('Función', 'Bomba y solución');
  } else {
    html += specBox('Tipo', def.kind === 'support' ? 'Equipamiento' : 'Ambientación');
  }
  html += `</div>`;

  if (isNft) {
    const p = params.crops[rec.data.crop] || CROPS[rec.data.crop];
    const cycles = 30 / Math.max(1, p.cycleDays);
    const eff = rec.data.plants * (1 - params.discardPct / 100);
    const kg = eff * (p.yieldG / 1000) * cycles;
    const revenue = kg * p.priceKg;
    html += `<div class="section-title"><span>Cultivo del caño</span><span>${rec.data.plants} plantas</span></div>
      <div class="crop-tabs">${availableCrops(params).map((c) => `
        <button class="crop-tab ${rec.data.crop === c.id ? 'active' : ''}" data-action="module-crop" data-crop="${c.id}">
          <span class="ct-icon">${c.icon}</span>${c.name}
        </button>`).join('')}</div>
      <div class="crop-tabs" style="margin-top:7px">
        <button class="crop-tab" data-action="module-crop-all"><span class="ct-icon">↔️</span>Aplicar a todos los caños</button>
      </div>
      <div class="param-row" style="margin-top:8px">
        <div class="param-label">Densidad de plantines<small>canastillas cada 20 cm</small></div>
        <div class="stepper">
          <button data-action="module-plants" data-dir="-1">−</button>
          <span class="sv">${rec.data.plants}</span>
          <button data-action="module-plants" data-dir="1">+</button>
        </div>
      </div>
      <div class="result-grid">
        <div class="result-box green"><div class="rb-label">Producción estimada</div><div class="rb-value">${fmtNum(kg, 1)} kg</div><div class="rb-sub">por mes en régimen</div></div>
        <div class="result-box gold"><div class="rb-label">Ingreso estimado</div><div class="rb-value">${fmtMoney(revenue)}</div><div class="rb-sub">${fmtMoney(p.priceKg, 2)}/kg · ciclo ${p.cycleDays} días</div></div>
      </div>`;
  }

  html += `<div class="section-title"><span>Materiales y mano de obra</span><span>${bom.length} ítems</span></div>`;
  html += bomList(bom, mats, labor, factor);

  const canRotate = def.w !== def.h;
  html += `<div class="mini-actions">
    ${canRotate ? `<button class="mini-btn" data-action="rotate-module">↻ Rotar módulo</button>` : ''}
    ${isNft ? `<button class="mini-btn green" data-action="apply-crop-all">↔ Cultivo a todos</button>` : ''}
  </div>
  <button class="big-btn danger" data-action="delete-module" style="margin-top:10px">${deleteArmed ? '⚠️ CONFIRMAR ELIMINACIÓN' : '🗑 Eliminar del sistema'}</button>
  <div class="bom-footnote">Eliminar un módulo descuenta su costo y su producción del presupuesto.</div>`;
  return html;
}

/* ══════════ MATERIALES ══════════ */
export function materialsSheetHTML({ scenario, summary, bom }) {
  const params = scenario.params;
  const byCat = [];
  let cat = null;
  for (const r of bom.rows) {
    if (r.cat !== cat) { cat = r.cat; byCat.push({ cat, rows: [] }); }
    byCat[byCat.length - 1].rows.push(r);
  }
  const list = byCat.map((g) => `<div class="bom-cat">${g.cat}</div><div class="bom-box">
    ${g.rows.map((r) => `<div class="bom-row">
      <div class="bom-name">${r.name}${r.spec ? `<small>${r.spec}</small>` : ''}</div>
      <div class="bom-qty">${fmtQty(r.qty)} ${unit(r.unit)}</div>
      <div class="bom-cost">${fmtMoney(r.subtotal ?? r.qty * r.unitCost)}</div>
    </div>`).join('')}
  </div>`).join('');

  return `<div class="bom-summary">
    <div class="summary-card"><div class="sc-label">Presupuesto total</div><div class="sc-value">${fmtMoney(bom.total)}</div><div class="sc-sub">materiales + mano de obra</div></div>
    <div class="summary-card"><div class="sc-label">Inversión en módulos</div><div class="sc-value">${fmtMoney(summary.modulesCost)}</div><div class="sc-sub">${summary.pipes} caños · ${summary.plants} plantas</div></div>
  </div>
  <div class="toggle-row">
    <div class="tr-main"><div class="tr-name">Incluir invernadero base</div><div class="tr-sub">${GREENHOUSE.name} · ${GREENHOUSE.desc}</div></div>
    <button class="toggle ${params.includeGreenhouse ? 'on' : ''}" data-action="toggle-greenhouse" aria-label="Incluir invernadero"></button>
  </div>
  <div class="param-row">
    <div class="param-label">Factor de precios<small>ajustá todos los materiales a tu zona</small></div>
    <div class="stepper">
      <button data-action="param" data-param="materialFactor" data-dir="-1">−</button>
      <span class="sv">${fmtNum(params.materialFactor, 2)}×</span>
      <button data-action="param" data-param="materialFactor" data-dir="1">+</button>
    </div>
  </div>
  <div class="section-title"><span>Lista de materiales</span><span>${bom.rows.length} ítems</span></div>
  ${bom.rows.length ? list : `<div class="hint-box">Todavía no hay materiales: agregá caños NFT o activá el invernadero base.</div>`}
  <div class="bom-footnote">Precios orientativos en USD. La mano de obra de montaje de módulos (${fmtMoney(bom.modulesLabor)}) está sumada al total.</div>
  <button class="big-btn" data-action="export-csv" style="margin-top:10px">⬇️ Exportar lista de materiales (.csv)</button>`;
}

/* ══════════ PRODUCCIÓN ══════════ */
export function productionSheetHTML({ scenario, summary, increments }) {
  const params = scenario.params;
  const crops = availableCrops(params);
  const main = params.defaultCrop || 'lettuce';
  const crop = crops.find((c) => c.id === main) || crops[0];
  const active = crops.filter((c) => summary.production.byCrop[c.id]?.pipes > 0);
  const byCrop = active.length ? active : [crop];

  return `<div class="result-grid">
    <div class="result-box green"><div class="rb-label">Plantas en el sistema</div><div class="rb-value">${fmtNum(summary.plants, 0)}</div><div class="rb-sub">${plural(summary.pipes, 'caño NFT', 'caños NFT')}</div></div>
    <div class="result-box"><div class="rb-label">Producción estimada</div><div class="rb-value">${fmtNum(summary.production.kgMonth, 1)} kg</div><div class="rb-sub">por mes en régimen</div></div>
    <div class="result-box"><div class="rb-label">Ingreso estimado</div><div class="rb-value">${fmtMoney(summary.revenue)}</div><div class="rb-sub">por mes · antes de costos</div></div>
    <div class="result-box"><div class="rb-label">Margen neto estimado</div><div class="rb-value">${fmtMoney(summary.margin)}</div><div class="rb-sub">${fmtPayback(summary.paybackMonths)} de repago</div></div>
  </div>

  <div class="section-title"><span>Cultivo principal</span><span>se aplica a los caños nuevos</span></div>
  <div class="crop-tabs">${crops.map((c) => `<button class="crop-tab ${c.id === main ? 'active' : ''}" data-action="crop-all" data-crop="${c.id}"><span class="ct-icon">${c.icon}</span>${c.name}</button>`).join('')}</div>
  <div class="hint-box" style="margin-top:7px">Al elegir un cultivo se aplica a <b>todos los caños</b>. Para mezclar cultivos, tocá un caño en el plano y cambialo ahí.</div>

  <div class="section-title"><span>Supuestos de ${crop.name}</span><span>editables</span></div>
  ${paramRow('Precio de venta', 'por kilo', `${fmtMoney(crop.priceKg, 2)}/kg`, 'crop-param', `data-crop="${crop.id}" data-key="priceKg"`)}
  ${paramRow('Rendimiento por planta', 'gramos por ciclo', `${fmtNum(crop.yieldG, 0)} g`, 'crop-param', `data-crop="${crop.id}" data-key="yieldG"`)}
  ${paramRow('Duración del ciclo', 'días de trasplante a cosecha', `${fmtNum(crop.cycleDays, 0)} días`, 'crop-param', `data-crop="${crop.id}" data-key="cycleDays"`)}
  ${paramRow('Descarte / merma', 'promedio del sistema', pct(params.discardPct), 'param', 'data-param="discardPct"')}

  <div class="section-title"><span>Producción por cultivo</span><span>por mes</span></div>
  <div class="crop-breakdown">${byCrop.map((c) => {
    const row = summary.production.byCrop[c.id] || { pipes: 0, plants: 0, kgMonth: 0, revenueMonth: 0 };
    return `<div class="crop-line"><div class="cl-icon">${c.icon}</div>
      <div class="cl-main"><div class="cl-name">${c.name}</div><div class="cl-sub">${plural(row.pipes, 'caño', 'caños')} · ${plural(row.plants, 'planta', 'plantas')}</div></div>
      <div class="cl-right">${fmtNum(row.kgMonth, 1)} kg<small>${fmtMoney(row.revenueMonth)}/mes</small></div>
    </div>`;
  }).join('')}</div>

  <div class="section-title"><span>Rendimiento por módulo</span><span>marginal</span></div>
  <div class="delta-list">${increments.map((d) => {
    const def = MODULES[d.type];
    return `<div class="delta-card">
      <div class="dc-head"><div><div class="dc-name">${def.icon} +1 ${def.name}</div><div class="dc-sub">${d.plants ? `+${fmtNum(d.plants, 0)} plantas` : 'sin plantas'} · ${fmtNum(d.kgMonth, 1)} kg/mes más</div></div><div class="dc-money">${fmtMoney(d.margin)}<small>margen neto/mes</small></div></div>
      <div class="dc-row"><span>Costo del módulo</span><b>${fmtMoney(d.capex)}</b></div>
      <div class="dc-row"><span>Ingreso adicional</span><b>${fmtMoney(d.revenue)}/mes</b></div>
      <div class="dc-row"><span>Repago del módulo</span><b>${fmtPayback(d.paybackMonths)}</b></div>
      <button class="mini-btn green" data-action="start-build" data-type="${d.type}" style="width:100%;margin-top:7px">Colocar otro en el plano</button>
    </div>`;
  }).join('')}</div>
  <div class="bom-footnote">El cálculo marginal usa el cultivo principal y los supuestos actuales. Repago = costo del módulo ÷ flujo mensual antes de amortización que agrega.</div>

  ${summary.warnings.length ? `<div class="warning-box"><b>Revisá el diseño:</b><ul>${summary.warnings.map((w) => `<li>${w}</li>`).join('')}</ul></div>` : ''}`;
}

/* ══════════ SISTEMAS ══════════ */
export function systemsSheetHTML({ scenarios, activeId, scaleUnits, expandType, expansion, deleteScenarioArmed }) {
  const cards = scenarios.map(({ scenario, summary, counts, active }) => {
    return `<div class="scenario-card ${active ? 'active' : ''}">
      <div class="sc-head">
        <div class="sc-title-wrap"><div class="sc-name">${scenario.name}</div><div class="sc-counts">${countLabel(counts)}</div></div>
        ${active ? '<span class="sc-badge">ABIERTO</span>' : ''}
      </div>
      <div class="sc-metrics">
        <div><small>Inversión</small><b>${fmtMoney(summary.capex)}</b></div>
        <div><small>Plantas</small><b>${fmtNum(summary.plants, 0)}</b></div>
        <div><small>Ingreso/mes</small><b>${fmtMoney(summary.revenue)}</b></div>
        <div><small>Margen/mes</small><b class="${summary.margin < 0 ? 'neg' : ''}">${fmtMoney(summary.margin)}</b></div>
        <div><small>Repago</small><b>${fmtPayback(summary.paybackMonths)}</b></div>
        <div><small>Kg/mes</small><b>${fmtNum(summary.production.kgMonth, 1)}</b></div>
      </div>
      <div class="sc-actions">
        ${active ? '<button class="mini-btn" data-action="switch-scenario" data-id="" disabled>Abierto</button>' : `<button class="mini-btn green" data-action="switch-scenario" data-id="${scenario.id}">Abrir</button>`}
        <button class="mini-btn" data-action="duplicate-scenario" data-id="${scenario.id}">Duplicar</button>
        ${scenarios.length > 1 ? `<button class="mini-btn danger" data-action="delete-scenario" data-id="${scenario.id}">${deleteScenarioArmed === scenario.id ? 'Confirmar' : 'Eliminar'}</button>` : ''}
      </div>
    </div>`;
  }).join('');

  return `<div class="hint-box"><b>Cada sistema es un proyecto completo.</b> Abrí uno para editarlo en el plano, duplicalo para probar variantes y compará costo, producción y repago lado a lado.</div>

  <div class="scale-hero">
    <div class="scale-head"><div><div class="sh-label">AMPLIAR EL SISTEMA ABIERTO</div><div class="sh-title">+ ${scaleUnits} ${scaleUnits === 1 ? 'caño' : 'caños'}</div></div>
      <div class="stepper light">
        <button data-action="scale" data-dir="-1">−</button><span class="sv">${scaleUnits}</span><button data-action="scale" data-dir="1">+</button>
      </div>
    </div>
    <div class="seg-row">
      <button class="seg-btn ${expandType === 'nft12' ? 'active' : ''}" data-action="expand-type" data-type="nft12">Caño 12 m</button>
      <button class="seg-btn ${expandType === 'nft6' ? 'active' : ''}" data-action="expand-type" data-type="nft6">Caño 6 m</button>
    </div>
    <div class="scale-grid">
      <div><small>INVERSIÓN EXTRA</small><b>${fmtMoney(expansion.addedCapex)}</b></div>
      <div><small>PLANTAS TOTALES</small><b>${fmtNum(expansion.totalPlants, 0)}</b></div>
      <div><small>PRODUCCIÓN TOTAL</small><b>${fmtNum(expansion.totalKg, 1)} kg/mes</b></div>
      <div><small>INGRESO TOTAL</small><b>${fmtMoney(expansion.totalRevenue)}/mes</b></div>
      <div><small>MARGEN DEL SISTEMA</small><b class="${expansion.totalMargin < 0 ? 'neg-light' : ''}">${fmtMoney(expansion.totalMargin)}/mes</b></div>
      <div><small>REPAGO TOTAL</small><b>${fmtPayback(expansion.paybackMonths)}</b></div>
    </div>
    <div class="scale-note">Los caños nuevos se suman al <b>mismo invernadero y mano de obra</b>: el margen adicional estimado es ${fmtMoney(expansion.addedMargin)}/mes y el flujo antes de amortizar ${fmtMoney(expansion.addedCashMargin)}/mes. ${expansion.breakEvenExtra === 0 ? 'Con el sistema actual ya cubrís los costos.' : expansion.breakEvenExtra ? `Necesitás <b>+${expansion.breakEvenExtra} caños</b> de este tipo para cubrir los costos.` : 'Ni con 60 caños más se cubren los costos con estos supuestos.'} Verificá que entren físicamente y si hace falta más dedicación.</div>
  </div>

  <div class="section-title"><span>Comparar sistemas</span><span>${scenarios.length} ${scenarios.length === 1 ? 'sistema' : 'sistemas'}</span></div>
  <div class="scenario-list">${cards}</div>
  <button class="big-btn primary" data-action="new-scenario" style="margin-top:10px">➕ Nuevo sistema vacío</button>
  <div class="bom-footnote">Para comparar tecnologías o diseños distintos, creá un sistema nuevo y armá su plano. Los supuestos de cada sistema son independientes.</div>`;
}

/* ══════════ ECONOMÍA ══════════ */
export function economySheetHTML({ scenario, summary }) {
  const p = scenario.params;
  const o = summary.opex;
  const operatingCost = o.total - o.depreciation;
  return `<div class="econ-hero">
    <div class="eh-label">MARGEN NETO ESTIMADO</div>
    <div class="eh-value">${fmtMoney(summary.margin)}<small style="font-size:13px">/mes</small></div>
    <div class="eh-sub">Flujo operativo antes de amortizar: <b>${fmtMoney(summary.cashMargin)}/mes</b> · ${summary.paybackMonths && Number.isFinite(summary.paybackMonths) ? `repago de la inversión: <b>${fmtPayback(summary.paybackMonths)}</b>` : 'con estos supuestos no se recupera la inversión'}</div>
  </div>

  <div class="result-grid">
    <div class="result-box"><div class="rb-label">Inversión total</div><div class="rb-value">${fmtMoney(summary.capex)}</div><div class="rb-sub">módulos ${fmtMoney(summary.modulesCost)} + invernadero ${fmtMoney(summary.greenhouse)}</div></div>
    <div class="result-box"><div class="rb-label">Costo por planta</div><div class="rb-value">${fmtMoney(summary.costPerPlant, 1)}</div><div class="rb-sub">inversión ÷ plantas</div></div>
    <div class="result-box"><div class="rb-label">Inversión por m²</div><div class="rb-value">${fmtMoney(summary.investmentPerM2)}</div><div class="rb-sub">sobre ${GREENHOUSE.area} m²</div></div>
    <div class="result-box"><div class="rb-label">Producción mensual</div><div class="rb-value">${fmtNum(summary.production.kgMonth, 1)} kg</div><div class="rb-sub">${plural(summary.pipes, 'caño', 'caños')} · ${fmtNum(summary.plants, 0)} plantas</div></div>
  </div>

  <div class="section-title"><span>Ingresos y costos mensuales</span><span>estimación</span></div>
  <div class="econ-box">
    <div class="econ-row total"><span>Ingresos por venta</span><b>${fmtMoney(summary.revenue)}</b></div>
    <div class="econ-row"><span>Plantines / semillas</span><b>−${fmtMoney(o.seedlings)}</b></div>
    <div class="econ-row"><span>Nutrientes</span><b>−${fmtMoney(o.nutrients)}</b></div>
    <div class="econ-row"><span>Agua (${fmtNum(o.energyKwh ? summary.plants * p.waterLitersPlantDay * 30 / 1000 : 0, 1)} m³)</span><b>−${fmtMoney(o.water)}</b></div>
    <div class="econ-row"><span>Energía (${fmtNum(o.energyKwh, 0)} kWh)</span><b>−${fmtMoney(o.energy)}</b></div>
    <div class="econ-row"><span>Mano de obra (${fmtNum(p.laborHoursWeek, 0)} h/sem)</span><b>−${fmtMoney(o.labor)}</b></div>
    <div class="econ-row"><span>Imprevistos (${fmtNum(p.contingencyPct, 0)} %)</span><b>−${fmtMoney(o.contingency)}</b></div>
    <div class="econ-row total"><span>Costo operativo mensual</span><b>−${fmtMoney(operatingCost)}</b></div>
    <div class="econ-row total ${summary.cashMargin < 0 ? 'negative' : ''}"><span>Margen operativo</span><b>${fmtMoney(summary.cashMargin)}</b></div>
    <div class="econ-row"><span>Amortización (${fmtNum(p.depreciationYears, 0)} años)</span><b>−${fmtMoney(o.depreciation)}</b></div>
    <div class="econ-row total ${summary.margin < 0 ? 'negative' : ''}"><span>Margen neto mensual</span><b>${fmtMoney(summary.margin)}</b></div>
  </div>

  <div class="section-title"><span>Supuestos de costos</span><span>editables</span></div>
  ${paramRow('Mano de obra', 'horas por semana', `${fmtNum(p.laborHoursWeek, 0)} h`, 'param', 'data-param="laborHoursWeek"')}
  ${paramRow('Valor de la hora', 'por hora de trabajo', `${fmtMoney(p.laborRate, 0)}/h`, 'param', 'data-param="laborRate"')}
  ${paramRow('Energía', 'precio del kWh', `${fmtMoney(p.electricityPrice, 2)}/kWh`, 'param', 'data-param="electricityPrice"')}
  ${paramRow('Agua', 'precio del m³', `${fmtMoney(p.waterPrice, 2)}/m³`, 'param', 'data-param="waterPrice"')}
  ${paramRow('Consumo de agua', 'litros por planta y día', `${fmtNum(p.waterLitersPlantDay, 1)} L`, 'param', 'data-param="waterLitersPlantDay"')}
  ${paramRow('Nutrientes', 'por planta y mes', `${fmtMoney(p.nutrientCostPlantMonth, 3)}`, 'param', 'data-param="nutrientCostPlantMonth"')}
  ${paramRow('Imprevistos', 'sobre el costo mensual', pct(p.contingencyPct), 'param', 'data-param="contingencyPct"')}
  ${paramRow('Vida útil', 'años para amortizar la inversión', `${fmtNum(p.depreciationYears, 0)} años`, 'param', 'data-param="depreciationYears"')}

  ${summary.warnings.length ? `<div class="warning-box"><b>Revisá el diseño:</b><ul>${summary.warnings.map((w) => `<li>${w}</li>`).join('')}</ul></div>` : ''}
  <div class="disclaimer">Estimaciones orientativas para planificar. No reemplazan un presupuesto de proveedores ni un cálculo de ingeniería. Verificá caudal de bomba, pendientes, calidad del agua y precios de tu zona.</div>`;
}

/* ══════════ MENÚ ══════════ */
export function menuSheetHTML({ scenario, resetArmed }) {
  return `<div class="module-hero">
    <div class="mh-icon">🧪</div>
    <div class="mh-main"><div class="mh-name">${scenario.name}</div><div class="mh-desc">Proyecto guardado en este teléfono</div></div>
  </div>
  <div class="section-title"><span>Proyecto</span></div>
  <button class="big-btn" data-action="rename-scenario">✏️ Renombrar sistema</button>
  <button class="big-btn" data-action="save-now">💾 Guardar ahora</button>
  <button class="big-btn" data-action="export-json">⬇️ Exportar proyecto (.json)</button>
  <button class="big-btn" data-action="open-help">❓ Cómo funciona</button>
  <div class="section-title"><span>Sistemas</span></div>
  <button class="big-btn" data-action="new-scenario">➕ Crear otro sistema</button>
  <button class="big-btn" data-action="go-systems">🧪 Comparar sistemas</button>
  <div class="section-title"><span>Zona de riesgo</span></div>
  <button class="big-btn danger" data-action="reset-project">${resetArmed ? '⚠️ CONFIRMAR: borrar todo' : '🗑 Borrar todos los sistemas'}</button>
  <div class="menu-version">HIDROPLAN · simulador de invernadero NFT<br>Los datos se guardan solo en este dispositivo. Exportá el .json para respaldarlos.</div>`;
}
