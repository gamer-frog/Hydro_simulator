// ══════════ HIDROPLAN · mundo isométrico ══════════
// Escala: 1 celda = 1 metro. Invernadero base de 24 × 16 m.
import * as THREE from 'three';
import { MODULES } from './data.js';

export const TILE = 1;
export const COLS = 24;
export const ROWS = 16;
export const FLOOR_W = COLS * TILE;   // 24 m
export const FLOOR_D = ROWS * TILE;   // 16 m
const HALF_W = FLOOR_W / 2;
const HALF_D = FLOOR_D / 2;

export function tileCenter(col, row) {
  return { x: -HALF_W + (col + 0.5) * TILE, z: -HALF_D + (row + 0.5) * TILE };
}
export function moduleCenter(col, row, w, h) {
  return { x: -HALF_W + (col + w / 2) * TILE, z: -HALF_D + (row + h / 2) * TILE };
}
export function worldToTile(x, z) {
  return { col: Math.floor((x + HALF_W) / TILE), row: Math.floor((z + HALF_D) / TILE) };
}

/* ── texturas ─────────────────────────────────────────── */
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function grassTexture() {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4c8a4f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5200; i++) {
      g.fillStyle = ['#3f7a43', '#58995a', '#457f47', '#63a563'][i % 4];
      g.globalAlpha = 0.45;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2 + Math.random() * 2);
    }
    g.globalAlpha = 1;
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 30);
  return t;
}
function concreteTexture() {
  const t = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#b8c0b6'; g.fillRect(0, 0, w, h);
    // juntas cada 2 m (la textura abarca 4 × 4 m)
    g.strokeStyle = 'rgba(58, 78, 66, 0.28)'; g.lineWidth = 4;
    for (let i = 0; i <= 2; i++) {
      g.beginPath(); g.moveTo(i * w / 2, 0); g.lineTo(i * w / 2, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * h / 2); g.lineTo(w, i * h / 2); g.stroke();
    }
    for (let i = 0; i < 4200; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '36,54,44'},${Math.random() * 0.055})`;
      const s = 1 + Math.random() * 4;
      g.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(FLOOR_W / 4, FLOOR_D / 4);
  return t;
}
function pavingTexture() {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#cbc2ae'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(80,70,50,0.25)'; g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke();
    }
    for (let i = 0; i < 700; i++) {
      g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
      g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(9, 2);
  return t;
}
function projectSignTexture() {
  return canvasTex(1024, 320, (g, w, h) => {
    g.fillStyle = '#0d3b2e'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#4ade80'; g.lineWidth = 10; g.strokeRect(18, 18, w - 36, h - 36);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#d9f99d'; g.font = '800 122px system-ui, sans-serif';
    g.fillText('HIDROPLAN', w / 2, 128);
    g.fillStyle = '#4ade80'; g.font = '700 46px system-ui, sans-serif';
    g.fillText('INVERNADERO NFT · 384 m²', w / 2, 238);
  });
}
function signMeshTexture() {
  return canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = '#14532d'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#fbbf24'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#fef3c7'; g.font = '800 46px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('NFT', w / 2, 58);
    g.fillStyle = '#86efac'; g.font = '700 26px system-ui, sans-serif';
    g.fillText('HIDROPLAN', w / 2, 112);
  });
}

/* ── materiales base ─────────────────────────────────── */
const std = (color, roughness = 0.66, metalness = 0.05) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

/* ── plantas instanciadas para caños NFT ─────────────── */
const MAX_PLANTS = 72;
const plantDummy = new THREE.Object3D();
const plantColor = new THREE.Color();
const hash = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function makeNFTLine(length) {
  const g = new THREE.Group();
  const metal = std(0x64748b, 0.42, 0.55);
  const pipeMat = std(0xe8eef0, 0.3, 0.08);
  const dark = std(0x111827, 0.55, 0.1);

  // soportes: patas y travesaños (instanciados)
  const supportCount = Math.max(2, Math.round(length / 1.5) + 1);
  const legs = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.055, 0.68, 0.055), metal, supportCount * 2);
  const bars = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.07, 0.055, 0.52), metal, supportCount);
  legs.frustumCulled = false; bars.frustumCulled = false;
  for (let i = 0; i < supportCount; i++) {
    const x = -length / 2 + 0.35 + (length - 0.7) * (supportCount === 1 ? 0.5 : i / (supportCount - 1));
    plantDummy.position.set(x, 0.34, -0.2); plantDummy.rotation.set(0, 0, 0); plantDummy.scale.set(1, 1, 1);
    plantDummy.updateMatrix(); legs.setMatrixAt(i * 2, plantDummy.matrix);
    plantDummy.position.set(x, 0.34, 0.2);
    plantDummy.updateMatrix(); legs.setMatrixAt(i * 2 + 1, plantDummy.matrix);
    plantDummy.position.set(x, 0.68, 0);
    plantDummy.updateMatrix(); bars.setMatrixAt(i, plantDummy.matrix);
  }
  legs.castShadow = true; bars.castShadow = true;
  g.add(legs, bars);

  // caño principal
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, length, 18), pipeMat);
  pipe.rotation.z = Math.PI / 2;
  pipe.position.y = 0.82;
  pipe.castShadow = true; pipe.receiveShadow = true;
  g.add(pipe);

  // tapones
  const caps = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.175, 0.175, 0.06, 18), pipeMat, 2);
  caps.frustumCulled = false;
  plantDummy.rotation.set(0, 0, Math.PI / 2); plantDummy.scale.set(1, 1, 1);
  plantDummy.position.set(-length / 2 - 0.01, 0.82, 0); plantDummy.updateMatrix(); caps.setMatrixAt(0, plantDummy.matrix);
  plantDummy.position.set(length / 2 + 0.01, 0.82, 0); plantDummy.updateMatrix(); caps.setMatrixAt(1, plantDummy.matrix);
  caps.castShadow = true; g.add(caps);

  // franja oscura en la cara superior (bocas)
  const strip = new THREE.Mesh(new THREE.BoxGeometry(length - 0.1, 0.02, 0.11), dark);
  strip.position.y = 0.965; g.add(strip);

  // macetas, follaje y copa (instanciados)
  const pots = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.075, 0.06, 0.055, 8), std(0x0b1220, 0.7), MAX_PLANTS);
  const base = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.15, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72 }), MAX_PLANTS);
  const top = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.095, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.68 }), MAX_PLANTS);
  [pots, base, top].forEach((mesh) => {
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.userData.isPlants = true;
    mesh.count = 0;
    g.add(mesh);
  });
  pots.castShadow = false;

  const setPlants = (cropDef, count) => {
    const n = Math.max(0, Math.min(MAX_PLANTS, Math.floor(count || 0)));
    pots.count = base.count = top.count = n;
    if (!n || !cropDef) {
      [pots, base, top].forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true; });
      return;
    }
    const shape = cropDef.shape || 'rosette';
    const sx = shape === 'bush' ? 0.82 : shape === 'leafy' ? 1.08 : 1.15;
    const sy = shape === 'bush' ? 1.15 : 0.62;
    const cLight = new THREE.Color(cropDef.color);
    const cDark = new THREE.Color(cropDef.dark);
    for (let i = 0; i < n; i++) {
      const x = -length / 2 + 0.35 + (length - 0.7) * (n === 1 ? 0.5 : i / (n - 1));
      const r = hash(i * 3.1 + length);
      const jitter = (r - 0.5) * 0.05;
      plantDummy.rotation.set(0, r * Math.PI * 2, 0);
      plantDummy.scale.set(1, 1, 1);
      plantDummy.position.set(x, 0.99, jitter);
      plantDummy.updateMatrix(); pots.setMatrixAt(i, plantDummy.matrix);

      const s = 0.86 + hash(i * 7.7 + 2) * 0.3;
      plantDummy.position.set(x + (hash(i + 9) - 0.5) * 0.04, 1.01, jitter);
      plantDummy.scale.set(s * sx, s * sy, s * sx);
      plantDummy.updateMatrix(); base.setMatrixAt(i, plantDummy.matrix);
      plantColor.copy(cLight).lerp(cDark, hash(i * 11.3) * 0.35);
      base.setColorAt(i, plantColor);

      plantDummy.position.set(x, 1.08 + s * sy * 0.16, jitter);
      plantDummy.scale.set(s * 0.72, s * 0.7, s * 0.72);
      plantDummy.updateMatrix(); top.setMatrixAt(i, plantDummy.matrix);
      plantColor.copy(cDark).lerp(cLight, 0.15 + hash(i * 5.3) * 0.3);
      top.setColorAt(i, plantColor);
    }
    [pots, base, top].forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true; });
    if (base.instanceColor) base.instanceColor.needsUpdate = true;
    if (top.instanceColor) top.instanceColor.needsUpdate = true;
  };

  g.userData.setPlants = setPlants;
  return { group: g, height: 1.35, setPlants };
}

/* ── reservorio 1000 L ───────────────────────────────── */
function makeReservoir() {
  const g = new THREE.Group();
  const blue = std(0x1d6fb8, 0.32, 0.35);
  const blueDark = std(0x0d4f8b, 0.4, 0.3);
  const light = std(0xe2e8f0, 0.35, 0.2);
  const steel = std(0x64748b, 0.4, 0.6);
  const dark = std(0x1f2937, 0.55, 0.2);

  const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.12, 1.85), std(0x8a5a2b, 0.85));
  pallet.position.y = 0.06; pallet.castShadow = true; pallet.receiveShadow = true; g.add(pallet);

  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 1.45, 22), blue);
  tank.position.set(-0.18, 0.86, 0); tank.castShadow = true; tank.receiveShadow = true; g.add(tank);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.77, 0.77, 0.12, 22), light);
  lid.position.set(-0.18, 1.62, 0); lid.castShadow = true; g.add(lid);
  [-0.25, 0.25].forEach((y) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.735, 0.025, 8, 26), light);
    ring.rotation.x = Math.PI / 2; ring.position.set(-0.18, 1.35 + y * 0.4, 0); g.add(ring);
  });
  const gauge = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.62, 0.04), std(0x38bdf8, 0.25, 0.2));
  gauge.position.set(0.56, 0.82, 0.37); g.add(gauge);
  const gaugeFrame = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.75, 0.06), light);
  gaugeFrame.position.set(0.56, 0.82, 0.36); g.add(gaugeFrame);

  // bomba + filtro + timer
  const pump = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.38), steel);
  pump.position.set(0.62, 0.29, 0.5); pump.castShadow = true; g.add(pump);
  const filter = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.42, 12), dark);
  filter.position.set(0.62, 0.52, 0.5); filter.castShadow = true; g.add(filter);
  const timer = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.1), std(0xf8fafc, 0.4));
  timer.position.set(0.62, 0.78, 0.5); timer.castShadow = true; g.add(timer);
  // caño de retorno
  const ret = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.9, 8), blueDark);
  ret.position.set(0.38, 0.62, 0.1); ret.rotation.z = 0.28; g.add(ret);

  return { group: g, height: 1.8 };
}

/* ── mesa de almácigo ───────────────────────────────── */
function makeNursery() {
  const g = new THREE.Group();
  const metal = std(0x64748b, 0.42, 0.5);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.07, 0.82), std(0xd9e2d6, 0.6));
  top.position.y = 0.78; top.castShadow = true; top.receiveShadow = true; g.add(top);
  [[-0.8, -0.32], [0.8, -0.32], [-0.8, 0.32], [0.8, 0.32]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.78, 0.06), metal);
    leg.position.set(x, 0.39, z); leg.castShadow = true; g.add(leg);
  });
  const trayGeo = new THREE.BoxGeometry(0.38, 0.075, 0.62);
  const trayMat = std(0x1f2937, 0.75);
  const seedlingGeo = new THREE.IcosahedronGeometry(0.055, 0);
  const seedlingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
  for (let t = 0; t < 4; t++) {
    const tray = new THREE.Mesh(trayGeo, trayMat);
    tray.position.set(-0.66 + t * 0.44, 0.86, 0); tray.castShadow = true; g.add(tray);
    const n = 8;
    const inst = new THREE.InstancedMesh(seedlingGeo, seedlingMat, n);
    inst.frustumCulled = false;
    for (let i = 0; i < n; i++) {
      plantDummy.position.set(-0.82 + t * 0.44 + (i % 2) * 0.18, 0.94, -0.22 + Math.floor(i / 2) * 0.14);
      plantDummy.rotation.set(0, hash(i + t * 9) * Math.PI * 2, 0);
      plantDummy.scale.setScalar(0.7 + hash(i * 3 + t) * 0.4);
      plantDummy.updateMatrix();
      inst.setMatrixAt(i, plantDummy.matrix);
      plantColor.setHex(i % 3 ? 0x4ade80 : 0x22c55e);
      inst.setColorAt(i, plantColor);
    }
    g.add(inst);
  }
  return { group: g, height: 1.1 };
}

/* ── mesa de trabajo ────────────────────────────────── */
function makeWorkbench() {
  const g = new THREE.Group();
  const wood = std(0x9a6b3f, 0.75);
  const woodDark = std(0x6b4a2b, 0.8);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.09, 0.8), wood);
  top.position.y = 0.85; top.castShadow = true; top.receiveShadow = true; g.add(top);
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.05, 0.7), woodDark);
  shelf.position.y = 0.25; shelf.castShadow = true; g.add(shelf);
  [[-0.8, -0.32], [0.8, -0.32], [-0.8, 0.32], [0.8, 0.32]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.85, 0.07), woodDark);
    leg.position.set(x, 0.42, z); leg.castShadow = true; g.add(leg);
  });
  // herramientas y bidones
  [0x8b5cf6, 0xe07b28].forEach((c, i) => {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.28, 10), std(c, 0.4, 0.2));
    drum.position.set(-0.5 + i * 0.35, 1.03, -0.12); drum.castShadow = true; g.add(drum);
  });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.22), std(0x2563eb, 0.5));
  box.position.set(0.4, 0.97, 0.15); g.add(box);
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.3), std(0x8a5a2b, 0.8));
  crate.position.set(0.15, 0.14, 0.05); crate.castShadow = true; g.add(crate);
  return { group: g, height: 1.2 };
}

/* ── barra LED ───────────────────────────────────────── */
function makeLEDBar() {
  const g = new THREE.Group();
  const metal = std(0x334155, 0.4, 0.55);
  [-0.82, 0.82].forEach((x) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.85, 8), metal);
    post.position.set(x, 0.93, 0); post.castShadow = true; g.add(post);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 10), metal);
    foot.position.set(x, 0.03, 0); g.add(foot);
  });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.09, 0.18), std(0x111827, 0.4, 0.4));
  bar.position.set(0, 1.86, 0); bar.castShadow = true; g.add(bar);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 0.13),
    new THREE.MeshStandardMaterial({ color: 0xfff7c2, emissive: 0xffe99a, emissiveIntensity: 2.4, side: THREE.DoubleSide })
  );
  glow.rotation.x = Math.PI / 2; glow.position.set(0, 1.81, 0); g.add(glow);
  return { group: g, height: 2.0 };
}

/* ── extractor ──────────────────────────────────────── */
function makeFan() {
  const g = new THREE.Group();
  const metal = std(0x475569, 0.4, 0.55);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.06, 12), metal);
  base.position.y = 0.03; base.castShadow = true; g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.95, 8), metal);
  pole.position.y = 0.51; g.add(pole);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 16), std(0xdbeafe, 0.5, 0.2));
  body.rotation.x = Math.PI / 2; body.position.set(0, 1.1, 0); body.castShadow = true; g.add(body);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 10), metal);
  hub.rotation.x = Math.PI / 2; hub.position.set(0, 1.1, 0.01); g.add(hub);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.075, 0.012), std(0xe2e8f0, 0.4));
    blade.position.set(Math.cos(i * 2.1) * 0.13, 1.1 + Math.sin(i * 2.1) * 0.13, 0.1);
    blade.rotation.z = i * 2.1; g.add(blade);
  }
  const cage = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.018, 6, 24), metal);
  cage.position.set(0, 1.1, 0.1); g.add(cage);
  return { group: g, height: 1.5 };
}

/* ── maceta ─────────────────────────────────────────── */
function makePlanter() {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.19, 0.4, 12), std(0xb45309, 0.75));
  pot.position.y = 0.2; pot.castShadow = true; g.add(pot);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.05, 12), std(0x3f2a1a, 0.9));
  soil.position.y = 0.41; g.add(soil);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.6, 6), std(0x6b4a2b, 0.85));
  trunk.position.y = 0.68; g.add(trunk);
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.55, 5), std(i % 2 ? 0x2f9e44 : 0x1f7a33, 0.7));
    const a = (i / 5) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.14, 0.93, Math.sin(a) * 0.14);
    leaf.rotation.z = Math.cos(a) * 0.55; leaf.rotation.x = Math.sin(a) * 0.55;
    leaf.castShadow = true; g.add(leaf);
  }
  return { group: g, height: 1.4 };
}

/* ── cajón ──────────────────────────────────────────── */
function makeCrate() {
  const g = new THREE.Group();
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.44, 0.66), std(0x8a5a2b, 0.85));
  crate.position.y = 0.22; crate.castShadow = true; g.add(crate);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.05, 0.57), std(0x5c3a1a, 0.9));
  inner.position.y = 0.41; g.add(inner);
  [0xef4444, 0xf97316, 0x4ade80].forEach((c, i) => {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), std(c, 0.45));
    p.position.set(-0.16 + i * 0.16, 0.49, (i % 2) * 0.12 - 0.06); g.add(p);
  });
  return { group: g, height: 0.65 };
}

/* ── cartel ─────────────────────────────────────────── */
function makeSign() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ map: signMeshTexture(), side: THREE.DoubleSide });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.53), mat);
  board.position.y = 0.72; board.castShadow = true; g.add(board);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.58, 0.055), std(0x6b4a2b, 0.8));
  back.position.set(0, 0.72, -0.035); g.add(back);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.4), std(0x6b4a2b, 0.8));
  legs.position.y = 0.04; g.add(legs);
  return { group: g, height: 1.05 };
}

/* ── builders ───────────────────────────────────────── */
const BUILDERS = {
  nft12: () => makeNFTLine(MODULES.nft12.w),
  nft6: () => makeNFTLine(MODULES.nft6.w),
  reservoir: makeReservoir,
  nursery: makeNursery,
  bench: makeWorkbench,
  led: makeLEDBar,
  fan: makeFan,
  planter: makePlanter,
  crate: makeCrate,
  sign: makeSign,
};

export function createModuleModel(type) {
  const build = BUILDERS[type];
  if (!build) return null;
  const built = build();
  const { group, height = 1, setPlants = null } = built;
  group.userData.height = height;
  group.userData.setPlants = setPlants;
  group.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  return { group, height, setPlants };
}

/* ── resaltado de huella ────────────────────────────── */
export function makeFootprintHighlight(color = 0x4ade80) {
  const g = new THREE.Group();
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, depthWrite: false })
  );
  plane.rotation.x = -Math.PI / 2; plane.position.y = 0.035; g.add(plane);
  const border = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 })
  );
  border.rotation.x = -Math.PI / 2; border.position.y = 0.04; g.add(border);
  g.userData.plane = plane; g.userData.border = border;
  g.renderOrder = 5;
  return g;
}

/* ── patio decorativo ───────────────────────────────── */
function buildPatioSet() {
  const g = new THREE.Group();
  const wood = std(0x8a5a2b, 0.75);
  const metal = std(0x64748b, 0.4, 0.5);
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.08, 18), wood);
  table.position.y = 0.76; table.castShadow = true; table.receiveShadow = true; g.add(table);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.76, 10), metal);
  pole.position.y = 0.38; g.add(pole);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.08, 14), metal);
  foot.position.y = 0.04; g.add(foot);
  const umbPole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.2, 8), metal);
  umbPole.position.y = 1.4; g.add(umbPole);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.38, 12), std(0xe11d48, 0.7));
  canopy.position.y = 2.55; canopy.castShadow = true; g.add(canopy);
  for (let i = 0; i < 2; i++) {
    const chair = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.42), std(0xf59e0b, 0.7));
    seat.position.y = 0.44; seat.castShadow = true; chair.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.06), std(0xf59e0b, 0.7));
    back.position.set(0, 0.65, -0.19); chair.add(back);
    [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.44, 0.045), metal);
      leg.position.set(x, 0.22, z); chair.add(leg);
    });
    const a = i === 0 ? 0.6 : Math.PI + 0.6;
    chair.position.set(Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15);
    chair.rotation.y = -a + Math.PI / 2;
    g.add(chair);
  }
  return g;
}

/* ── mundo ──────────────────────────────────────────── */
export function buildWorld(scene) {
  const hemi = new THREE.HemisphereLight(0xdcf5ff, 0x3d6045, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d2, 2.3);
  sun.position.set(16, 24, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 80;
  sun.shadow.bias = -0.0005;
  sun.shadow.radius = 3;
  scene.add(sun); scene.add(sun.target);
  scene.add(new THREE.AmbientLight(0xffffff, 0.22));

  // terreno
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240),
    new THREE.MeshLambertMaterial({ map: grassTexture() })
  );
  grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; scene.add(grass);

  // patio delantero
  const patio = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 6.6),
    new THREE.MeshLambertMaterial({ map: pavingTexture() })
  );
  patio.rotation.x = -Math.PI / 2; patio.position.set(0, 0.01, HALF_D + 3.1);
  patio.receiveShadow = true; scene.add(patio);

  // platea + piso
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(FLOOR_W + 0.7, 0.34, FLOOR_D + 0.7),
    new THREE.MeshStandardMaterial({ color: 0x7f8c86, roughness: 0.9 })
  );
  slab.position.y = -0.17; slab.receiveShadow = true; slab.castShadow = true; scene.add(slab);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(FLOOR_W, FLOOR_D),
    new THREE.MeshLambertMaterial({ map: concreteTexture() })
  );
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.005; floor.receiveShadow = true; scene.add(floor);

  // grilla de colocación
  const gridPts = [];
  for (let c = 0; c <= COLS; c++) {
    const x = -HALF_W + c * TILE;
    gridPts.push(x, 0.02, -HALF_D, x, 0.02, HALF_D);
  }
  for (let r = 0; r <= ROWS; r++) {
    const z = -HALF_D + r * TILE;
    gridPts.push(-HALF_W, 0.02, z, HALF_W, 0.02, z);
  }
  const gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPts, 3));
  const grid = new THREE.LineSegments(
    gridGeo,
    new THREE.LineBasicMaterial({ color: 0x2f6b4c, transparent: true, opacity: 0.3 })
  );
  grid.visible = false; scene.add(grid);

  // plano invisible para tocar celdas
  const floorHit = new THREE.Mesh(
    new THREE.PlaneGeometry(FLOOR_W, FLOOR_D),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  floorHit.rotation.x = -Math.PI / 2; floorHit.position.y = 0.02; scene.add(floorHit);

  // paredes de corte: fondo e izquierda
  const frame = std(0x1d5b3c, 0.45, 0.35);
  const glass = new THREE.MeshLambertMaterial({
    color: 0xd8f4f8, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false,
  });
  const wallH = 2.9;
  const w1 = new THREE.Mesh(new THREE.PlaneGeometry(FLOOR_W + 0.7, wallH), glass);
  w1.position.set(0, wallH / 2, -HALF_D - 0.1); scene.add(w1);
  const w2 = new THREE.Mesh(new THREE.PlaneGeometry(FLOOR_D + 0.7, wallH), glass);
  w2.rotation.y = Math.PI / 2; w2.position.set(-HALF_W - 0.1, wallH / 2, 0); scene.add(w2);
  for (let x = -HALF_W; x <= HALF_W; x += 3) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, wallH, 0.08), frame);
    post.position.set(x, wallH / 2, -HALF_D - 0.1); post.castShadow = true; scene.add(post);
  }
  for (let z = -HALF_D; z <= HALF_D; z += 3) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, wallH, 0.08), frame);
    post.position.set(-HALF_W - 0.1, wallH / 2, z); post.castShadow = true; scene.add(post);
  }
  [[0, -HALF_D - 0.1, FLOOR_W + 0.7, 0.08], [-HALF_W - 0.1, 0, 0.08, FLOOR_D + 0.7]].forEach(([x, z, w, d]) => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), frame);
    beam.position.set(x, wallH, z); beam.castShadow = true; scene.add(beam);
  });
  // cartel del proyecto en la pared del fondo
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 2.5),
    new THREE.MeshBasicMaterial({ map: projectSignTexture() })
  );
  sign.position.set(3.6, 3.9, -HALF_D - 0.05); scene.add(sign);
  [-1, 1].forEach((s) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.4, 0.09), frame);
    leg.position.set(3.6 + s * 3.6, 2.55, -HALF_D - 0.15); scene.add(leg);
  });

  // bordes
  const curbMat = std(0x8a9a92, 0.85);
  const curb = new THREE.Mesh(new THREE.BoxGeometry(FLOOR_W + 0.7, 0.18, 0.18), curbMat);
  curb.position.set(0, 0.09, HALF_D + 0.28); scene.add(curb);
  [-1, 1].forEach((s) => {
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, FLOOR_D + 0.7), curbMat);
    c2.position.set(s * (HALF_W + 0.28), 0.09, 0); scene.add(c2);
  });

  // vegetación exterior
  let seed = 4242;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5b3a21 });
  for (let i = 0; i < 22; i++) {
    const a = rnd() * Math.PI * 2, r = 18 + rnd() * 40;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (z > HALF_D + 4 && Math.abs(x) < 14) continue;
    const h = 2.4 + rnd() * 2.4;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.29, h * 0.4, 6), trunkMat);
    trunk.position.set(x, h * 0.2, z); trunk.castShadow = true; scene.add(trunk);
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(1.1 + rnd() * 0.9, h, 7),
      new THREE.MeshLambertMaterial({ color: [0x2f6b33, 0x3a7d3e, 0x27592c][i % 3] })
    );
    crown.position.set(x, h * 0.4 + h * 0.42, z); crown.castShadow = true; scene.add(crown);
  }
  for (let i = 0; i < 10; i++) {
    const x = -13 + rnd() * 26, z = HALF_D + 5.4 + rnd() * 1.4;
    const r = 0.35 + rnd() * 0.35;
    const b = new THREE.Mesh(
      new THREE.IcosahedronGeometry(r, 0),
      new THREE.MeshLambertMaterial({ color: [0x2f7d3c, 0x3a8f47, 0x54a85c][i % 3] })
    );
    b.position.set(x, r * 0.7, z); b.castShadow = true; scene.add(b);
  }

  // mesa de patio (decoración fija)
  const patioSet = buildPatioSet();
  patioSet.position.set(-6.5, 0, HALF_D + 2.8);
  scene.add(patioSet);

  // luz diurna
  const dayColor = new THREE.Color(0x87c7e8);
  function updateDaylight(t) {
    const tt = THREE.MathUtils.clamp(t, 0, 1);
    const elev = Math.sin(Math.PI * tt);
    const az = Math.PI * (0.15 + tt * 0.75);
    sun.position.set(Math.cos(az) * 26, 10 + elev * 26, Math.sin(az) * 20 + 4);
    sun.intensity = 0.9 + 1.5 * elev;
    hemi.intensity = 0.75 + 0.4 * elev;
    const warm = new THREE.Color(0xffb37a), noon = new THREE.Color(0xfff3dc), dusk = new THREE.Color(0xff9a63);
    if (tt < 0.15) sun.color.copy(warm).lerp(noon, tt / 0.15);
    else if (tt > 0.85) sun.color.copy(noon).lerp(dusk, (tt - 0.85) / 0.15);
    else sun.color.copy(noon);
    return { elev };
  }

  return { hemi, sun, updateDaylight, floorHit, grid, floor, dayColor };
}
