/* ═══════════════════════════════════════════════════════════
   HYDROHARVEST — static game data
   ═══════════════════════════════════════════════════════════ */
'use strict';

const DAY_LENGTH = 22;          // real seconds per in-game day at 1x speed
const SAVE_KEY = 'hydroharvest_save_v1';

const CROPS = [
  { id:'lettuce',    name:'Lettuce',      icon:'🥬', seedCost:5,  growDays:2.2, yieldKg:0.80, basePrice:7.0,  beds:['nft','tower'],  ec:[1.1,2.0], leaf:0x86d95c, fruit:null   },
  { id:'spinach',    name:'Spinach',      icon:'🍃', seedCost:7,  growDays:2.6, yieldKg:0.90, basePrice:8.0,  beds:['nft'],          ec:[1.3,2.1], leaf:0x35a854, fruit:null   },
  { id:'basil',      name:'Genovese Basil', icon:'🌿', seedCost:9, growDays:3.1, yieldKg:0.60, basePrice:22.0, beds:['nft','tower'],  ec:[1.4,2.2], leaf:0x2e8b57, fruit:null   },
  { id:'tomato',     name:'Tomato',       icon:'🍅', seedCost:14, growDays:5.0, yieldKg:2.40, basePrice:5.0,  beds:['bucket'],       ec:[2.0,3.2], leaf:0x3f9e4d, fruit:0xe8443a },
  { id:'pepper',     name:'Bell Pepper',  icon:'🫑', seedCost:12, growDays:4.6, yieldKg:1.70, basePrice:6.5,  beds:['bucket'],       ec:[1.8,3.0], leaf:0x3f9e4d, fruit:0xff8c1a },
  { id:'cucumber',   name:'Cucumber',     icon:'🥒', seedCost:13, growDays:5.4, yieldKg:2.20, basePrice:4.5,  beds:['bucket'],       ec:[1.7,2.8], leaf:0x4caf50, fruit:0x2f7d32 },
  { id:'strawberry', name:'Strawberry',   icon:'🍓', seedCost:16, growDays:6.0, yieldKg:1.50, basePrice:14.0, beds:['tower'],        ec:[1.6,2.5], leaf:0x3f9e4d, fruit:0xff4d6d },
];
const cropById = id => CROPS.find(c => c.id === id);

const BED_TYPES = {
  nft: {
    id:'nft', name:'NFT Channel Table', icon:'🥬', cost:120, plants:8,
    desc:'Nutrient film technique. 8 leafy greens on recirculating channels.',
    crops:['lettuce','spinach','basil'],
  },
  bucket: {
    id:'bucket', name:'Dutch Bucket Row', icon:'🍅', cost:200, plants:6,
    desc:'6 drip-fed buckets for heavy fruiting vines on trellis.',
    crops:['tomato','pepper','cucumber'],
  },
  tower: {
    id:'tower', name:'Vertical Tower', icon:'🍓', cost:260, plants:10,
    desc:'10-tier aeroponic tower. Lettuce & strawberries stacked tall.',
    crops:['lettuce','strawberry','basil'],
  },
};

const UPGRADES = [
  { id:'led',       name:'LED Grow Lights',   icon:'💡', maxLevel:1, costs:[400],        desc:'+30% growth rate around the clock. Bars glow at night. Adds $6/day electricity.' },
  { id:'autoDoser', name:'Auto-Doser 3000',   icon:'🤖', maxLevel:1, costs:[800],        desc:'Automatically balances pH, EC and refills the reservoir for every bed. $1.2/bed/day.' },
  { id:'hvac',      name:'Climate HVAC',      icon:'❄️', maxLevel:3, costs:[350,650,1100], desc:'Each level pulls greenhouse temperature toward 24°C and shields crops from heatwaves. Extra $3/day per level.' },
  { id:'shade',     name:'Shade Cloth',       icon:'⛱️', maxLevel:1, costs:[150],        desc:'Cuts solar load. Heat stress reduced by 40%, costs almost nothing to run.' },
  { id:'rain',      name:'Rainwater Harvester', icon:'🌧️', maxLevel:1, costs:[300],      desc:'Collects roof runoff — reservoir top-ups become 70% cheaper.' },
  { id:'reservoir', name:'Bigger Reservoirs', icon:'🛢️', maxLevel:1, costs:[450],        desc:'Beds hold +30 L each and drink slower. Fewer top-ups, happier roots.' },
  { id:'marketing', name:'Marketing Dept.',   icon:'📣', maxLevel:3, costs:[250,500,900], desc:'Brand your harvest: +8/15/25% on ALL sale prices and faster reputation gain.' },
];

const GOALS = [
  { id:'first_plant',   name:'First Sprout',       desc:'Plant your first crop',                reward:75,   check:s => s.stats.planted >= 1 },
  { id:'first_harvest', name:'First Harvest',      desc:'Harvest any crop',                     reward:100,  check:s => s.stats.harvests >= 1 },
  { id:'rev_1k',        name:'First $1K',          desc:'Earn $1,000 in total revenue',         reward:150,  check:s => s.stats.revenue >= 1000 },
  { id:'beds_4',        name:'Room to Grow',       desc:'Own 4 grow beds',                      reward:200,  check:s => s.beds.length >= 4 },
  { id:'contract_1',    name:'Order Up!',          desc:'Deliver your first contract',          reward:150,  check:s => s.stats.contractsDelivered >= 1 },
  { id:'auto_doser',    name:'Hands Off',          desc:'Install the Auto-Doser 3000',          reward:250,  check:s => !!s.upgrades.autoDoser },
  { id:'harvests_25',   name:'Green Thumb',        desc:'Harvest 25 beds worth of crops',       reward:400,  check:s => s.stats.harvests >= 25 },
  { id:'nw_10k',        name:'Five Figures',       desc:'Reach $10,000 net worth',              reward:400,  check:s => netWorth(s) >= 10000 },
  { id:'beds_8',        name:'Green Warehouse',    desc:'Own 8 grow beds',                      reward:500,  check:s => s.beds.length >= 8 },
  { id:'rep_4',         name:'Trusted Supplier',   desc:'Reach 4★ reputation',                  reward:500,  check:s => s.reputation >= 4 },
  { id:'rev_10k',       name:'Ten Grand Club',     desc:'Earn $10,000 in total revenue',        reward:750,  check:s => s.stats.revenue >= 10000 },
  { id:'nw_50k',        name:'Hydro Baron',        desc:'Reach $50,000 net worth',              reward:2000, check:s => netWorth(s) >= 50000 },
];

const WEATHERS = {
  sunny:   { icon:'☀️', label:'Sunny',      temp:27, sun:1.00, rain:false },
  cloudy:  { icon:'⛅', label:'Cloudy',     temp:24, sun:0.72, rain:false },
  rain:    { icon:'🌧️', label:'Rain',       temp:21, sun:0.45, rain:true  },
  heatwave:{ icon:'🥵', label:'Heatwave',   temp:36, sun:1.15, rain:false },
  storm:   { icon:'⛈️', label:'Storm',      temp:19, sun:0.30, rain:true  },
};
const WEATHER_WEIGHTS = [['sunny',44],['cloudy',26],['rain',13],['heatwave',11],['storm',6]];

function marketPrice(cropId, state) {
  return state.market[cropId]?.price ?? cropById(cropId).basePrice;
}
function sellPrice(cropId, state) {
  const bonus = 1 + [0, 0.08, 0.15, 0.25][state.upgrades.marketing || 0];
  return marketPrice(cropId, state) * bonus;
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
  const s = '$' + abs.toLocaleString('en-US');
  return sign ? (n >= 0 ? '+' + s : '−' + s) : (n < 0 ? '−' + s : s);
}
