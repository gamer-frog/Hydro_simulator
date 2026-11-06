/* ═══════════════════════════════════════════════════════════
   HYDROHARVEST — datos técnicos y de simulación
   6 sistemas hidropónicos · cultivos · invernaderos · costos
   ═══════════════════════════════════════════════════════════ */
'use strict';

const DAY_LENGTH = 6;           // segundos reales por día de juego a 1x
const SAVE_KEY = 'hydroharvest_save_v2';
const WORKDAY_START = 6;        // reloj laboral 06:00 → 20:00
const WORKDAY_HOURS = 14;
const LABOR_RATE = 18;          // $/hora de mano de obra (referencia de presupuesto)
const WATER_COST_L = 0.012;     // $/litro de agua de red
const NUTRIENT_COST_L = 0.045;  // $/litro de solución preparada

const CROPS = [
  { id:'lettuce',    name:'Lechuga',           icon:'🥬', seedCost:5,  cycleWeeks:2, yieldKg:0.80, basePrice:7.0,  beds:['nft','dwc','ebb','tower','kratky'], ec:[1.1,2.0], leaf:0x79c94a, fruit:null      },
  { id:'spinach',    name:'Espinaca',          icon:'🍃', seedCost:7,  cycleWeeks:2, yieldKg:0.90, basePrice:8.0,  beds:['nft','dwc','kratky'],                 ec:[1.3,2.1], leaf:0x2f9448, fruit:null      },
  { id:'basil',      name:'Albahaca genovesa', icon:'🌿', seedCost:9,  cycleWeeks:3, yieldKg:0.60, basePrice:16.0, beds:['nft','dwc','ebb','tower','kratky'],   ec:[1.4,2.2], leaf:0x2e8b57, fruit:null      },
  { id:'tomato',     name:'Tomate',            icon:'🍅', seedCost:14, cycleWeeks:5, yieldKg:2.40, basePrice:7.5,  beds:['bucket'],                             ec:[2.0,3.2], leaf:0x3f9e4d, fruit:0xe8443a },
  { id:'pepper',     name:'Morrón',            icon:'🫑', seedCost:12, cycleWeeks:5, yieldKg:1.70, basePrice:9.0,  beds:['bucket','ebb'],                       ec:[1.8,3.0], leaf:0x3f9e4d, fruit:0xff8c1a },
  { id:'cucumber',   name:'Pepino',            icon:'🥒', seedCost:13, cycleWeeks:4, yieldKg:2.20, basePrice:5.5,  beds:['bucket'],                             ec:[1.7,2.8], leaf:0x4caf50, fruit:0x2f7d32 },
  { id:'strawberry', name:'Frutilla',          icon:'🍓', seedCost:16, cycleWeeks:6, yieldKg:1.50, basePrice:12.0, beds:['tower'],                               ec:[1.6,2.5], leaf:0x3f9e4d, fruit:0xff4d6d },
].map(c => ({ ...c, growDays: c.cycleWeeks * 7 }));
const cropById = id => CROPS.find(c => c.id === id);

/* ── Seis sistemas, con geometría, materiales y circuito de agua ── */
const BED_TYPES = {
  nft: {
    id:'nft', name:'Canaleta NFT', icon:'🥬', cost:120, plants:12, size:{w:2.6,d:1.5},
    crops:['lettuce','spinach','basil'],
    desc:'Película nutritiva fina y recirculante. 3 canaletas de 2,1 m con 4 sitios cada una.',
    layout:{
      unit:'canaleta', units:3, perUnit:4, total:12, spacingCm:50,
      distribution:'3 canaletas × 4 sitios', tubeLength:'2,10 m', tubeDiameter:'100 mm',
      rows:'A-frame a 3 alturas', areaM2:3.6,
      note:'Cada canaleta lleva 4 plantines a 50 cm. Las tres canaletas se escalonan en A para aprovechar luz y facilitar la cosecha.',
    },
    materials:[
      { name:'Canaleta PVC 100 mm × 2,1 m', qty:3, unit:'u', unitCost:14 },
      { name:'Estructura A-frame de acero', qty:1, unit:'juego', unitCost:30 },
      { name:'Bomba sumergible 800 L/h', qty:1, unit:'u', unitCost:18 },
      { name:'Tanque 60 L con tapa', qty:1, unit:'u', unitCost:14 },
      { name:'Timer analógico', qty:1, unit:'u', unitCost:6 },
      { name:'Kit de conexiones y mangueras', qty:1, unit:'kit', unitCost:10 },
    ],
    water:{
      tankL:60, pump:'Bomba 800 L/h', cycle:'Film continuo 24/7', return:'Retorno por gravedad',
      consumptionLDay:7, stages:[
        { label:'Red / lluvia', detail:'Ingreso con filtro de sedimentos' },
        { label:'Tanque 60 L', detail:'Solución A+B a pH 5,8–6,2' },
        { label:'Bomba', detail:'800 L/h, caudal continuo' },
        { label:'Filtro', detail:'Malla 120 mesh' },
        { label:'Colector', detail:'PVC 25 mm a las 3 canaletas' },
        { label:'Canaletas', detail:'Película de 3–5 mm sobre raíces' },
        { label:'Retorno', detail:'Gravedad al tanque' },
      ],
    },
    spec:{
      energy:0.35, water:0.80, growth:1.06, footprint:'2,6 × 1,5 m', areaM2:3.6,
      difficulty:'FÁCIL', laborHrsWeek:2.0,
      best:'Hoja verde y aromáticas',
      principle:'Una película fina de solución nutritiva rica en oxígeno corre sin parar por canaletas inclinadas. Las raíces quedan mitad en el film y mitad al aire: barato, rápido y el estándar de la industria para hojas verdes.',
      variants:['Canaleta A-frame', 'Canaletas de pared', 'Sistema de rieles'],
    },
    tasks:[
      { key:'flow',  label:'Revisar bomba y caudal de canaletas' },
      { key:'test',  label:'Medir pH y EC', auto:'test' },
      { key:'topup', label:'Rellenar tanque', auto:'topup' },
      { key:'roots', label:'Revisar raíces por algas' },
    ],
  },
  dwc: {
    id:'dwc', name:'Balsa DWC', icon:'🛶', cost:150, plants:12, size:{w:2.25,d:1.4},
    crops:['lettuce','spinach','basil'],
    desc:'Agua profunda con balsas sobre solución aireada. 12 sitios flotantes en 3 × 4.',
    layout:{
      unit:'balsa', units:1, perUnit:12, total:12, spacingCm:30,
      distribution:'1 balsa 3 × 4', tubeLength:'2,0 m', tubeDiameter:'—',
      rows:'3 filas × 4 columnas', areaM2:3.15,
      note:'Una única balsa de poliestireno con 12 canastillas a 30 × 25 cm. Las raíces cuelgan directo en el tanque y el aireador mantiene el oxígeno disuelto.',
    },
    materials:[
      { name:'Batea DWC 100 L', qty:1, unit:'u', unitCost:35 },
      { name:'Balsa EPS 2,0 × 1,0 m', qty:1, unit:'u', unitCost:22 },
      { name:'Blower 60 L/min', qty:1, unit:'u', unitCost:26 },
      { name:'Difusor de aire', qty:2, unit:'u', unitCost:5 },
      { name:'Canastilla + esponja', qty:12, unit:'u', unitCost:1 },
      { name:'Tanque de reserva 60 L', qty:1, unit:'u', unitCost:19 },
      { name:'Mangueras y válvulas', qty:1, unit:'kit', unitCost:10 },
      { name:'Solución nutritiva inicial', qty:1, unit:'kit', unitCost:16 },
    ],
    water:{
      tankL:100, pump:'Blower 60 L/min', cycle:'Aireación 24/7; recambio 20% semanal', return:'Sin retorno: tanque único',
      consumptionLDay:6, stages:[
        { label:'Red / lluvia', detail:'Llenado del tanque profundo' },
        { label:'Tanque 100 L', detail:'Solución estable, gran volumen' },
        { label:'Blower', detail:'Aire 24/7 por 2 difusores' },
        { label:'Balsas', detail:'Raíces suspendidas en agua' },
        { label:'Reposición', detail:'Relleno y recambio parcial' },
      ],
    },
    spec:{
      energy:0.28, water:1.15, growth:1.00, footprint:'2,25 × 1,4 m', areaM2:3.15,
      difficulty:'FÁCIL', laborHrsWeek:1.5,
      best:'Lechuga y hoja verde',
      principle:'Las raíces cuelgan directo en un tanque profundo oxigenado con difusores, mientras las plantas flotan en balsas de poliestireno. Muy estable y perdonador, pero gasta bastante volumen de agua.',
      variants:['Balsa flotante', 'Balde burbujeador', 'DWC recirculante'],
    },
    tasks:[
      { key:'air',   label:'Revisar bomba de aire y difusores' },
      { key:'test',  label:'Medir pH y EC', auto:'test' },
      { key:'topup', label:'Rellenar tanque', auto:'topup' },
      { key:'roots', label:'Revisar raíces y nivel de agua' },
    ],
  },
  ebb: {
    id:'ebb', name:'Bandeja Ebb & Flow', icon:'🌊', cost:180, plants:12, size:{w:2.6,d:1.5},
    crops:['lettuce','basil','pepper'],
    desc:'Inundación y drenaje con timer. 12 sitios en arcilla expandida sobre bandeja de 2,4 m.',
    layout:{
      unit:'bandeja', units:1, perUnit:12, total:12, spacingCm:30,
      distribution:'1 bandeja 3 × 4', tubeLength:'2,40 m', tubeDiameter:'—',
      rows:'3 filas × 4 columnas', areaM2:3.9,
      note:'Una bandeja de 2,4 × 1,2 m con 12 macetas de arcilla. El timer inunda y drena por gravedad; cada ciclo renueva oxígeno en la zona radicular.',
    },
    materials:[
      { name:'Bandeja 1,2 × 2,4 m', qty:1, unit:'u', unitCost:45 },
      { name:'Tanque 100 L', qty:1, unit:'u', unitCost:25 },
      { name:'Bomba 1.000 L/h', qty:1, unit:'u', unitCost:24 },
      { name:'Timer digital', qty:1, unit:'u', unitCost:12 },
      { name:'Arcilla expandida 50 L', qty:2, unit:'bolsa', unitCost:18 },
      { name:'Mesa de cultivo', qty:1, unit:'u', unitCost:24 },
      { name:'Kit desagüe y rebalse', qty:1, unit:'kit', unitCost:14 },
    ],
    water:{
      tankL:100, pump:'Bomba 1.000 L/h', cycle:'4 inundaciones por día', return:'Drenaje por gravedad',
      consumptionLDay:7, stages:[
        { label:'Red / lluvia', detail:'Llenado del tanque' },
        { label:'Tanque 100 L', detail:'Solución A+B' },
        { label:'Bomba + timer', detail:'Inunda 4 veces al día' },
        { label:'Bandeja', detail:'Nivel sube 5 cm y drena' },
        { label:'Arcilla', detail:'Retiene humedad y oxígeno' },
        { label:'Retorno', detail:'Desagüe por gravedad' },
      ],
    },
    spec:{
      energy:0.32, water:1.00, growth:1.04, footprint:'2,6 × 1,5 m', areaM2:3.9,
      difficulty:'MEDIA', laborHrsWeek:2.5,
      best:'Aromáticas, morrones y hojas',
      principle:'Un timer inunda la bandeja y después la drena de vuelta al tanque. Las raíces alternan entre empapadas y aireadas: oxígeno excelente, pero una falla de timer o desagüe no perdona.',
      variants:['Bandeja de inundación', 'Bandeja holandesa', 'Mesa ebb & flow'],
    },
    tasks:[
      { key:'timer', label:'Revisar timer de inundación y desagües' },
      { key:'test',  label:'Medir pH y EC', auto:'test' },
      { key:'topup', label:'Rellenar tanque', auto:'topup' },
      { key:'clean', label:'Limpiar desagües y residuos' },
    ],
  },
  bucket: {
    id:'bucket', name:'Bateas Holandesas', icon:'🍅', cost:200, plants:6, size:{w:2.45,d:1.2},
    crops:['tomato','pepper','cucumber'],
    desc:'Bateas con riego por goteo, drenaje y tutorado. 6 plantas de fruto a 35 cm.',
    layout:{
      unit:'batea', units:6, perUnit:1, total:6, spacingCm:35,
      distribution:'6 bateas en línea', tubeLength:'2,10 m', tubeDiameter:'—',
      rows:'1 fila de 6', areaM2:2.94,
      note:'Seis bateas de 20 L con sustrato de coco y perlita. Cada planta recibe un gotero y una guía de tutorado; el drenaje libre evita sales acumuladas.',
    },
    materials:[
      { name:'Batea 20 L', qty:6, unit:'u', unitCost:7 },
      { name:'Sustrato coco/perlita 50 L', qty:2, unit:'bolsa', unitCost:16 },
      { name:'Kit goteo 6 salidas', qty:1, unit:'kit', unitCost:22 },
      { name:'Bomba 800 L/h', qty:1, unit:'u', unitCost:18 },
      { name:'Timer digital', qty:1, unit:'u', unitCost:12 },
      { name:'Tanque 100 L', qty:1, unit:'u', unitCost:22 },
      { name:'Tutorado y rafia', qty:1, unit:'kit', unitCost:20 },
      { name:'Mangueras y conectores', qty:1, unit:'kit', unitCost:12 },
      { name:'Solución nutritiva inicial', qty:1, unit:'kit', unitCost:20 },
    ],
    water:{
      tankL:100, pump:'Bomba 800 L/h', cycle:'4–6 pulsos de goteo por día', return:'Drenaje libre a pérdida',
      consumptionLDay:9, stages:[
        { label:'Red / lluvia', detail:'Llenado del tanque' },
        { label:'Tanque 100 L', detail:'Solución para fruto, EC alta' },
        { label:'Bomba + timer', detail:'Pulsos de 4–6 minutos' },
        { label:'Goteros', detail:'Un emisor por batea' },
        { label:'Sustrato', detail:'Coco/perlita con drenaje' },
        { label:'Drenaje', detail:'A pérdida, control de sales' },
      ],
    },
    spec:{
      energy:0.42, water:1.00, growth:1.02, footprint:'2,45 × 1,2 m', areaM2:2.94,
      difficulty:'MEDIA', laborHrsWeek:4.0,
      best:'Tomate, morrón y pepino',
      principle:'Cada batea de coco/perlita recibe fertirriego por goteo preciso y drena libre. Las enredaderas de fruto consiguen soporte, aire y control: el estándar comercial para tomate.',
      variants:['Drenaje a pérdida', 'Batea recirculante', 'Batea Bato'],
    },
    tasks:[
      { key:'drip',  label:'Revisar goteros y caudal' },
      { key:'test',  label:'Medir pH y EC', auto:'test' },
      { key:'topup', label:'Rellenar tanque', auto:'topup' },
      { key:'drain', label:'Revisar drenaje y zona radicular' },
    ],
  },
  tower: {
    id:'tower', name:'Torre Aeropónica', icon:'🍓', cost:260, plants:24, size:{w:1.3,d:1.3},
    crops:['lettuce','strawberry','basil'],
    desc:'Torre vertical de 6 niveles y 24 sitios con raíces nebulizadas. Máximo rendimiento por m².',
    layout:{
      unit:'nivel', units:6, perUnit:4, total:24, spacingCm:30,
      distribution:'6 niveles × 4 sitios', tubeLength:'1,80 m', tubeDiameter:'160 mm',
      rows:'Columnas verticales', areaM2:1.69,
      note:'Seis niveles de cuatro sitios giran alrededor del tubo central. Las raíces cuelgan en una cámara oscura y reciben niebla cada pocos minutos: 24 plantas en solo 1,3 × 1,3 m.',
    },
    materials:[
      { name:'Torre vertical 24 sitios', qty:1, unit:'u', unitCost:95 },
      { name:'Bomba nebulizadora 60 psi', qty:1, unit:'u', unitCost:45 },
      { name:'Nebulizador + caño', qty:6, unit:'u', unitCost:4 },
      { name:'Timer cíclico', qty:1, unit:'u', unitCost:18 },
      { name:'Tanque 50 L', qty:1, unit:'u', unitCost:20 },
      { name:'Canastilla 3"', qty:24, unit:'u', unitCost:1.5 },
      { name:'Solución nutritiva inicial', qty:1, unit:'kit', unitCost:22 },
    ],
    water:{
      tankL:50, pump:'Bomba 60 psi', cycle:'Niebla 10 s cada 5 min', return:'Retorno presurizado al tanque',
      consumptionLDay:4, stages:[
        { label:'Red / lluvia', detail:'Tanque chico, alta rotación' },
        { label:'Tanque 50 L', detail:'Solución filtrada para niebla' },
        { label:'Bomba 60 psi', detail:'Presión para nebulizadores' },
        { label:'Filtro', detail:'Protege picos de niebla' },
        { label:'Nebulizadores', detail:'10 s cada 5 min' },
        { label:'Cámara radicular', detail:'Raíces suspendidas' },
        { label:'Retorno', detail:'Gravedad/presión al tanque' },
      ],
    },
    spec:{
      energy:0.90, water:0.70, growth:1.12, footprint:'1,3 × 1,3 m', areaM2:1.69,
      difficulty:'DIFÍCIL', laborHrsWeek:3.0,
      best:'Frutillas, lechuga y albahaca',
      principle:'Las raíces cuelgan en una cámara oscura y se nebulizan con solución nutritiva cada pocos minutos. Rendimiento enorme por metro cuadrado, pero los nebulizadores se tapan y un corte de energía daña el cultivo rápido.',
      variants:['Torre de nebulización', 'Torre vortex', 'Torre de macetas apiladas'],
    },
    tasks:[
      { key:'mist',  label:'Purgar nebulizadores y caños' },
      { key:'test',  label:'Medir pH y EC', auto:'test' },
      { key:'topup', label:'Rellenar tanque', auto:'topup' },
      { key:'pump',  label:'Revisar presión de la bomba' },
    ],
  },
  kratky: {
    id:'kratky', name:'Estante Kratky', icon:'🫙', cost:90, plants:9, size:{w:1.8,d:0.95},
    crops:['lettuce','spinach','basil'],
    desc:'Frascos pasivos, sin bombas ni electricidad. 9 sitios, lento pero casi gratis.',
    layout:{
      unit:'frasco', units:9, perUnit:1, total:9, spacingCm:30,
      distribution:'9 frascos (3 × 3)', tubeLength:'1,60 m', tubeDiameter:'—',
      rows:'3 filas × 3 columnas', areaM2:1.71,
      note:'Nueve frascos de 4 L sobre un estante de 1,8 × 0,95 m. Sin bomba ni timer: la solución baja a medida que la planta bebe y la cámara de aire queda para las raíces.',
    },
    materials:[
      { name:'Estante de madera 2 niveles', qty:1, unit:'u', unitCost:30 },
      { name:'Frasco ámbar 4 L', qty:9, unit:'u', unitCost:3.56 },
      { name:'Canastilla 3"', qty:9, unit:'u', unitCost:1 },
      { name:'Solución nutritiva concentrada', qty:1, unit:'kit', unitCost:12 },
      { name:'Etiquetas y kit de medición', qty:1, unit:'kit', unitCost:7 },
    ],
    water:{
      tankL:36, pump:'Sin bomba', cycle:'Solución estática; solo relleno', return:'No aplica',
      consumptionLDay:3, stages:[
        { label:'Preparación', detail:'Solución única por frasco' },
        { label:'Frasco 4 L', detail:'9 frascos ámbar' },
        { label:'Canastilla', detail:'Raíces en solución y aire' },
        { label:'Consumo', detail:'El nivel baja sin reposición' },
        { label:'Cámara de aire', detail:'Oxígeno para raíces' },
        { label:'Relleno', detail:'Solo si el nivel queda muy bajo' },
      ],
    },
    spec:{
      energy:0.00, water:1.30, growth:0.82, footprint:'1,8 × 0,95 m', areaM2:1.71,
      difficulty:'FÁCIL', laborHrsWeek:1.0,
      best:'Lechuga y aromáticas de bajo costo',
      principle:'Las plantas viven en una solución nutritiva quieta; las raíces la toman y la cámara de aire sobre el agua les da oxígeno. Cero bombas, cero electricidad: ideal para aprender, más lento para terminar.',
      variants:['Frasco Kratky', 'Tupper Kratky', 'Maceta pasiva por mecha'],
    },
    tasks:[
      { key:'refill', label:'Rellenar frascos con solución' },
      { key:'test',   label:'Medir pH y EC' },
      { key:'roots',  label:'Revisar raíces y cámara de aire' },
      { key:'algae',  label:'Limpiar algas y residuos' },
    ],
  },
};
const BED_IDS = Object.keys(BED_TYPES);

/* ── Invernaderos: planos, capacidad, costos y clima ── */
const GREENHOUSES = [
  {
    id:'tunel', name:'Túnel de madera', icon:'⛺', level:'INICIAL',
    dims:{ w:6, d:3, h:2.6 }, areaM2:18, capacityBeds:8,
    structure:'Madera tratada + arcos de acero', cover:'Film 150 µm',
    ventilation:'Laterales enrollables', climate:'Pasivo',
    waterTankL:500, powerKW:0.4, cost:950,
    bestFor:'Arranque familiar y hojas verdes',
    notes:'El más barato por m². Buen control de humedad, pero se calienta rápido y exige abrir laterales a media mañana.',
  },
  {
    id:'capilla', name:'Capilla a dos aguas', icon:'🏠', level:'INICIAL+',
    dims:{ w:8, d:4, h:3.2 }, areaM2:32, capacityBeds:14,
    structure:'Hierro galvanizado', cover:'Film 180 µm con anti-UV',
    ventilation:'Cenital + laterales', climate:'Pasivo mejorado',
    waterTankL:1000, powerKW:0.7, cost:1850,
    bestFor:'Hoja verde, aromáticas y semillero',
    notes:'La ventilación cenital evita el efecto invernadero extremo. Es el salto natural cuando el túnel queda chico.',
  },
  {
    id:'multitunel', name:'Multitúnel', icon:'🏕️', level:'COMERCIAL',
    dims:{ w:12, d:6, h:3.8 }, areaM2:72, capacityBeds:30,
    structure:'Acero galvanizado + tensores', cover:'Film 200 µm',
    ventilation:'Extractores + cenital', climate:'Semi-controlado',
    waterTankL:2500, powerKW:2.2, cost:4200,
    bestFor:'Producción comercial de hojas y frutos',
    notes:'Módulos repetibles y buen volumen de aire. Permite sectorizar riego y cosecha sin frenar el resto.',
  },
  {
    id:'nave', name:'Nave industrial', icon:'🏭', level:'ESCALA',
    dims:{ w:24, d:16, h:5.4 }, areaM2:384, capacityBeds:120,
    structure:'Hormigón + acero', cover:'Policarbonato alveolar',
    ventilation:'HVAC + extractores', climate:'Controlado',
    waterTankL:10000, powerKW:12, cost:21000,
    bestFor:'Volumen, packing y clientes mayoristas',
    notes:'Alta inversión y consumo, pero permite contratos grandes, trazabilidad y operación todo el año.',
  },
  {
    id:'container', name:'Container vertical', icon:'📦', level:'PREMIUM',
    dims:{ w:12, d:2.4, h:2.8 }, areaM2:28.8, capacityBeds:60,
    structure:'Container aislado + racks', cover:'Panel sándwich',
    ventilation:'HVAC + LED', climate:'Controlado 24/7',
    waterTankL:1500, powerKW:6.5, cost:9800,
    bestFor:'Torres, microgreens y producción urbana',
    notes:'Máxima densidad por m² y clima estable. El costo eléctrico manda: conviene comparar $/kg contra invernadero pasivo.',
  },
  {
    id:'modular', name:'Módulo plug & play', icon:'🧩', level:'COMERCIAL',
    dims:{ w:6, d:2.4, h:2.8 }, areaM2:14.4, capacityBeds:12,
    structure:'Perfilería de aluminio', cover:'Panel translúcido',
    ventilation:'Ventilación forzada', climate:'Semi-controlado',
    waterTankL:500, powerKW:1.8, cost:5200,
    bestFor:'Patios, terrazas y pilotos de negocio',
    notes:'Se instala en días y se amplía como LEGO. Ideal para validar un cliente antes de construir una nave.',
  },
];

/* Tarea semanal específica del cultivo */
function cropWeeklyTask(cropId, week, cycleWeeks) {
  const last = week >= cycleWeeks;
  switch (cropId) {
    case 'lettuce':    return week === 1 ? 'Ralear plantines al distanciamiento final' : last ? 'Cosechar, limpiar y sanitizar canaletas' : '';
    case 'spinach':    return week === 1 ? 'Ralear plantines al distanciamiento final' : last ? 'Cosechar y sanitizar canaletas' : '';
    case 'basil':      return week === 2 ? 'Pinzar puntas para que ramifique' : last ? 'Cosechar puntas y reiniciar el sistema' : '';
    case 'tomato':     return last ? 'Última cosecha y limpieza de bateas' : week >= 2 ? 'Podar chupones y hojas bajas' : '';
    case 'pepper':     return last ? 'Última cosecha y limpieza de bateas' : week >= 2 ? 'Tutorar tallos y podar' : '';
    case 'cucumber':   return last ? 'Última cosecha y limpieza de bateas' : week >= 2 ? 'Guiar guías en la espaldera' : '';
    case 'strawberry': return last ? 'Renovar coronas y sanitizar la torre' : week >= 2 ? 'Sacar estolones y hojas viejas' : '';
    default:           return '';
  }
}
function scheduleTasks(typeId, cropId, week) {
  const base = BED_TYPES[typeId].tasks.map(t => ({ key: t.key, label: t.label, auto: t.auto || null }));
  const crop = cropById(cropId);
  const extra = crop ? cropWeeklyTask(cropId, week, crop.cycleWeeks) : '';
  if (extra) base.push({ key: 'crop', label: extra, auto: null });
  return base;
}

/* Granjas preset — "builds" iniciales con estrategias distintas */
const BUILDS = [
  {
    id:'leafy', name:'Máquina de Hojas', icon:'🥬', tag:'HOJA VERDE · ESTABLE', difficulty:'FÁCIL',
    blurb:'NFT + DWC + ebb & flow. Tres sistemas de hoja verde, dos ya brotando. Cultivos rápidos, perdonadores y con caja constante.',
    cash:2500, highlight:'3 sistemas de hoja',
    beds:[
      { type:'nft', crop:'lettuce', growth:0.55, x:-4.6, z:-2.4 },
      { type:'dwc', crop:'spinach', growth:0.30, x:-0.8, z:-2.4 },
      { type:'ebb', crop:null,      growth:0,    x:-4.6, z: 1.0 },
      { type:'nft', crop:null,      growth:0,    x:-0.8, z: 1.0 },
    ],
  },
  {
    id:'tomato', name:'Barón del Tomate', icon:'🍅', tag:'FRUTOS · ALTO VALOR', difficulty:'EQUILIBRADA',
    blurb:'Bateas holandesas para enredaderas pesadas, morrones en ebb & flow y un DWC de apoyo. Más kilos y plantas más sedientas.',
    cash:2300, highlight:'2 bateas + soporte',
    beds:[
      { type:'bucket', crop:'tomato',  growth:0.55, x:-4.6, z:-2.4 },
      { type:'bucket', crop:'pepper',  growth:0.22, x:-0.8, z:-2.4 },
      { type:'ebb',    crop:'pepper',  growth:0.30, x:-4.6, z: 1.0 },
      { type:'dwc',    crop:'lettuce', growth:0.20, x:-0.8, z: 1.0 },
    ],
  },
  {
    id:'tower', name:'Torre Apilada', icon:'🍓', tag:'VERTICAL · PREMIUM', difficulty:'EXPERTO',
    blurb:'Dos torres aeropónicas de frutillas, un estante Kratky pasivo y una línea NFT de albahaca. Precios premium y márgenes ajustados.',
    cash:2400, highlight:'2 torres + estante pasivo',
    beds:[
      { type:'tower',  crop:'strawberry', growth:0.38, x:-4.6, z:-2.4 },
      { type:'tower',  crop:'strawberry', growth:0.16, x:-0.8, z:-2.4 },
      { type:'kratky', crop:'basil',      growth:0.30, x:-4.6, z: 1.0 },
      { type:'nft',    crop:'basil',      growth:0.30, x:-0.8, z: 1.0 },
    ],
  },
  {
    id:'sandbox', name:'Cascarón Vacío', icon:'🏗️', tag:'SANDBOX · CONSTRUCCIÓN LIBRE', difficulty:'SANDBOX',
    blurb:'Un invernadero vacío ya pagado y capital extra. Sin camas ni reglas: diseñá la granja que realmente quieras.',
    cash:3500, highlight:'invernadero vacío',
    beds:[],
  },
];

const UPGRADES = [
  { id:'led',       name:'Luces LED de cultivo',   icon:'💡', maxLevel:1, costs:[400],         desc:'+30% de velocidad de crecimiento las 24 h. Las barras brillan sobre cada cama. Suma $6/día de electricidad.' },
  { id:'autoDoser', name:'Auto-Dosificador 3000',  icon:'🤖', maxLevel:1, costs:[800],         desc:'Equilibra pH, EC y nivel del tanque en cada cama, y tilda las tareas semanales de medición y relleno. $1,2/cama/día.' },
  { id:'hvac',      name:'Climatización HVAC',      icon:'❄️', maxLevel:3, costs:[350,650,1100], desc:'Cada nivel acerca la temperatura del invernadero a 24 °C y protege los cultivos de las olas de calor. +$3/día por nivel.' },
  { id:'shade',     name:'Media Sombra',           icon:'⛱️', maxLevel:1, costs:[150],         desc:'Baja la carga solar. Reduce el estrés por calor un 40% y casi no consume.' },
  { id:'rain',      name:'Colector de Lluvia',     icon:'🌧️', maxLevel:1, costs:[300],         desc:'Junta el agua del techo: rellenar los tanques cuesta 70% menos.' },
  { id:'reservoir', name:'Tanques Más Grandes',    icon:'🛢️', maxLevel:1, costs:[450],         desc:'Cada cama aguanta +30 L y consume más lento. Menos rellenos, raíces más felices.' },
  { id:'marketing', name:'Departamento de Marketing', icon:'📣', maxLevel:3, costs:[250,500,900], desc:'Poné tu marca en la cosecha: +8/15/25% en TODOS los precios de venta y reputación más rápida.' },
];

const GOALS = [
  { id:'first_plant',   name:'Primer Brote',              desc:'Plantá tu primer cultivo',                 reward:75,   check:s => s.stats.planted >= 1 },
  { id:'first_harvest', name:'Primera Cosecha',           desc:'Cosechá cualquier cultivo',                reward:100,  check:s => s.stats.harvests >= 1 },
  { id:'rev_1k',        name:'Primer $1K',                desc:'Facturá $1.000 en total',                  reward:150,  check:s => s.stats.revenue >= 1000 },
  { id:'systems_4',     name:'Coleccionista de Sistemas', desc:'Tené 4 sistemas hidropónicos distintos',   reward:300,  check:s => new Set(s.beds.map(b => b.type)).size >= 4 },
  { id:'tasks_20',      name:'Maestro de la Rutina',      desc:'Completá 20 tareas semanales de cuidado',  reward:250,  check:s => (s.stats.tasksDone || 0) >= 20 },
  { id:'contract_1',    name:'¡Pedido Arriba!',           desc:'Entregá tu primer pedido',                 reward:150,  check:s => s.stats.contractsDelivered >= 1 },
  { id:'auto_doser',    name:'Manos Libres',              desc:'Instalá el Auto-Dosificador 3000',         reward:250,  check:s => !!s.upgrades.autoDoser },
  { id:'harvests_25',   name:'Pulgar Verde',              desc:'Cosechá 25 camas de cultivo',              reward:400,  check:s => s.stats.harvests >= 25 },
  { id:'nw_10k',        name:'Cinco Cifras',              desc:'Llegá a $10.000 de patrimonio',            reward:400,  check:s => netWorth(s) >= 10000 },
  { id:'beds_10',       name:'Galpón Verde',              desc:'Tené 10 camas de cultivo',                 reward:600,  check:s => s.beds.length >= 10 },
  { id:'rep_4',         name:'Proveedor de Confianza',    desc:'Llegá a 4★ de reputación',                 reward:500,  check:s => s.reputation >= 4 },
  { id:'rev_10k',       name:'Club de los Diez Mil',      desc:'Facturá $10.000 en total',                 reward:750,  check:s => s.stats.revenue >= 10000 },
  { id:'nw_50k',        name:'Barón Hidropónico',         desc:'Llegá a $50.000 de patrimonio',            reward:2000, check:s => netWorth(s) >= 50000 },
];

const WEATHERS = {
  sunny:   { icon:'☀️', label:'Soleado',      temp:27, sun:1.00, rain:false },
  cloudy:  { icon:'⛅', label:'Nublado',      temp:24, sun:0.72, rain:false },
  rain:    { icon:'🌧️', label:'Lluvia',       temp:21, sun:0.45, rain:true  },
  heatwave:{ icon:'🥵', label:'Ola de calor', temp:36, sun:1.15, rain:false },
  storm:   { icon:'⛈️', label:'Tormenta',     temp:19, sun:0.30, rain:true  },
};
const WEATHER_WEIGHTS = [['sunny',44],['cloudy',26],['rain',13],['heatwave',11],['storm',6]];

function marketPrice(cropId, state) {
  return state.market[cropId]?.price ?? cropById(cropId).basePrice;
}
function sellPrice(cropId, state) {
  const mkt = 1 + [0, 0.08, 0.15, 0.25][state.upgrades.marketing || 0];
  const rep = 1 + Math.max(0, state.reputation - 3) * 0.025;
  return marketPrice(cropId, state) * mkt * rep;
}
function inventoryValue(state) {
  return CROPS.reduce((sum, c) => sum + (state.inventory[c.id] || 0) * marketPrice(c.id, state), 0);
}
function bedsValue(state) {
  return state.beds.reduce((sum, b) => sum + BED_TYPES[b.type].cost * 0.8, 0);
}
function netWorth(state) {
  return Math.round(state.cash + inventoryValue(state) + bedsValue(state));
}
function fmtMoney(n, sign) {
  const abs = Math.abs(Math.round(n));
  const s = '$' + abs.toLocaleString('es-AR');
  return sign ? (n >= 0 ? '+' + s : '−' + s) : (n < 0 ? '−' + s : s);
}
function fmtPrice(n) { return '$' + n.toFixed(2).replace('.', ','); }
function fmtNum(n, digits = 1) { return Number(n).toFixed(digits).replace('.', ','); }
