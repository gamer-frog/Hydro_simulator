/* ═══════════════════════════════════════════════════════════
   HYDROHARVEST — 3D world (Three.js r147)
   Camera rig · greenhouse · beds · weather · day/night cycle
   ═══════════════════════════════════════════════════════════ */
'use strict';

const World = (() => {
  const GREENHOUSE = { w: 26, d: 16, wallH: 3.1, ridgeH: 5.4 };

  let renderer, scene, camera, sun, hemi, amb, canvasEl;
  let bedsGroup, propsGroup, rainPoints, cloudsGroup, selectionRing, ghostGroup;
  let sunTarget;
  const bedMeshes = new Map();   // bedId -> { group, plants[], status, led, fruit[] }
  const clockKeys = {};
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  // camera rig
  const cam = { target: new THREE.Vector3(0, 0, 0.4), theta: -0.55, elev: 0.78, dist: 15.5 };
  const CAM = { minDist: 6.5, maxDist: 34, minElev: 0.42, maxElev: 1.18 };

  // input
  let pointerDown = null, hoverNdc = null;
  let buildModeType = null, ghostValid = false;

  const tmpV = new THREE.Vector3();
  const skyDay = new THREE.Color(0x86c9ee), skyNight = new THREE.Color(0x060c1e), skyDusk = new THREE.Color(0xf0a05c);
  const fogDay = new THREE.Color(0x9fd4ee), fogNight = new THREE.Color(0x0a1226);

  function init(canvas, callbacks) {
    canvasEl = canvas;
    callbacks = callbacks || {};
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;

    scene = new THREE.Scene();
    scene.background = skyDay.clone();
    scene.fog = new THREE.Fog(fogDay.clone(), 55, 150);

    camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 400);

    // ── lights ──
    sun = new THREE.DirectionalLight(0xffffff, 1.25);
    sun.position.set(30, 42, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -22; sun.shadow.camera.right = 22;
    sun.shadow.camera.top = 22;   sun.shadow.camera.bottom = -22;
    sun.shadow.camera.far = 120;
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    sunTarget = new THREE.Object3D(); scene.add(sunTarget); sun.target = sunTarget;

    hemi = new THREE.HemisphereLight(0xcfeaff, 0x3d5a3a, 0.85); scene.add(hemi);
    amb = new THREE.AmbientLight(0xbcd8ff, 0.28); scene.add(amb);

    bedsGroup = new THREE.Group(); scene.add(bedsGroup);
    propsGroup = new THREE.Group(); scene.add(propsGroup);

    buildGround();
    buildGreenhouse();
    buildProps();
    buildTrees();
    buildClouds();
    buildRain();
    buildSelectionRing();

    bindInput(callbacks);
    window.addEventListener('resize', onResize);
    updateCamera(0);
  }

  /* ─────────── TEXTURES ─────────── */
  function concreteTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#b9b4a8'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${100 + Math.random() * 60},${100 + Math.random() * 60},${95 + Math.random() * 55},${0.16 + Math.random() * 0.2})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
    g.strokeStyle = 'rgba(60,58,52,.55)'; g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke();
      g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 4);
    return t;
  }
  function labelSprite(text, bg) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 128, 64);
    g.fillStyle = '#fff'; g.font = 'bold 34px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 64, 34);
    const t = new THREE.CanvasTexture(c);
    const m = new THREE.SpriteMaterial({ map: t, transparent: true });
    const s = new THREE.Sprite(m); s.scale.set(0.7, 0.35, 1);
    return s;
  }

  /* ─────────── GROUND & GREENHOUSE ─────────── */
  function buildGround() {
    const grass = new THREE.Mesh(new THREE.CircleGeometry(160, 40), new THREE.MeshLambertMaterial({ color: 0x3f7a3a }));
    grass.rotation.x = -Math.PI / 2; grass.position.y = -0.22; grass.receiveShadow = true;
    scene.add(grass);

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(GREENHOUSE.w, 0.24, GREENHOUSE.d),
      new THREE.MeshLambertMaterial({ map: concreteTexture() })
    );
    floor.position.y = -0.12; floor.receiveShadow = true;
    scene.add(floor);

    // subtle grow-bed area rug (walkway markings)
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(GREENHOUSE.w - 2, GREENHOUSE.d - 2), new THREE.MeshLambertMaterial({ color: 0xa8a496, transparent: true, opacity: 0.35 }));
    rug.rotation.x = -Math.PI / 2; rug.position.y = 0.005; rug.receiveShadow = true;
    scene.add(rug);
  }

  function buildGreenhouse() {
    const { w, d, wallH, ridgeH } = GREENHOUSE;
    const glass = new THREE.MeshLambertMaterial({ color: 0xd8f2ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xe9e6da, roughness: 0.5, metalness: 0.55 });
    const W = w / 2, D = d / 2;

    // walls (4 planes)
    const mkWall = (ww, hh) => new THREE.Mesh(new THREE.PlaneGeometry(ww, hh), glass);
    const south = mkWall(w, wallH); south.position.set(0, wallH / 2, D); scene.add(south);
    const north = mkWall(w, wallH); north.position.set(0, wallH / 2, -D); north.rotation.y = Math.PI; scene.add(north);
    const east = mkWall(d, wallH); east.position.set(W, wallH / 2, 0); east.rotation.y = -Math.PI / 2; scene.add(east);
    const west = mkWall(d, wallH); west.position.set(-W, wallH / 2, 0); west.rotation.y = Math.PI / 2; scene.add(west);

    // gable triangles (east & west ends)
    const tri = new THREE.Shape();
    tri.moveTo(-D, wallH); tri.lineTo(D, wallH); tri.lineTo(0, ridgeH); tri.closePath();
    const triGeo = new THREE.ShapeGeometry(tri);
    const endE = new THREE.Mesh(triGeo, glass); endE.rotation.y = -Math.PI / 2; endE.position.x = W; scene.add(endE);
    const endW = new THREE.Mesh(triGeo, glass); endW.rotation.y = Math.PI / 2; endW.position.x = -W; scene.add(endW);

    // roof planes
    const slopeLen = Math.hypot(D, ridgeH - wallH);
    const roofGeo = new THREE.PlaneGeometry(w, slopeLen);
    const roofAngle = Math.atan2(ridgeH - wallH, D);
    const roofS = new THREE.Mesh(roofGeo, glass);
    roofS.position.set(0, (wallH + ridgeH) / 2, D / 2); roofS.rotation.x = roofAngle - Math.PI / 2; scene.add(roofS);
    const roofN = new THREE.Mesh(roofGeo, glass);
    roofN.position.set(0, (wallH + ridgeH) / 2, -D / 2); roofN.rotation.x = -roofAngle + Math.PI / 2 + Math.PI; roofN.rotation.x = roofAngle + Math.PI / 2; scene.add(roofN);

    // ── frame beams ──
    const beam = (bw, bh, bd, x, y, z, rz) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), frameMat);
      b.position.set(x, y, z); if (rz) b.rotation.z = rz; b.castShadow = true; scene.add(b); return b;
    };
    const col = (x, z) => beam(0.22, wallH, 0.22, x, wallH / 2, z);
    // corner + intermediary columns
    [-W, -W / 2, 0, W / 2, W].forEach(x => { col(x, D); col(x, -D); });
    [-D, 0, D].forEach(z => { col(W, z); col(-W, z); });
    // wall-top plates
    beam(w, 0.24, 0.24, 0, wallH, D); beam(w, 0.24, 0.24, 0, wallH, -D);
    beam(0.24, 0.24, d, W, wallH, 0); beam(0.24, 0.24, d, -W, wallH, 0);
    // ridge beam
    beam(w + 0.4, 0.28, 0.28, 0, ridgeH, 0);
    // roof sloped beams (every 4 m)
    const slopeBeamLen = slopeLen + 0.3;
    [-W, -W / 2, 0, W / 2, W].forEach(x => {
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, slopeBeamLen), frameMat);
      b1.position.set(x, (wallH + ridgeH) / 2, D / 2); b1.rotation.x = -roofAngle; b1.castShadow = true; scene.add(b1);
      const b2 = b1.clone(); b2.position.set(x, (wallH + ridgeH) / 2, -D / 2); b2.rotation.x = roofAngle; scene.add(b2);
    });
    // gable end struts
    [W, -W].forEach(x => { beam(0.18, ridgeH - wallH + 0.2, 0.18, x, (ridgeH + wallH) / 2, 0); });

    // door (south, center)
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.5, 0.14), new THREE.MeshStandardMaterial({ color: 0x2c3a33, roughness: 0.6, metalness: 0.3 }));
    door.position.set(0, 1.25, D + 0.02); scene.add(door);
    const sign = labelSprite('HYDROHARVEST', '#123324'); sign.scale.set(3.1, 0.75, 1); sign.position.set(0, 2.95, D + 0.25); scene.add(sign);
  }

  /* ─────────── PROPS ─────────── */
  function buildProps() {
    const metal = new THREE.MeshStandardMaterial({ color: 0xcfd4cd, roughness: 0.35, metalness: 0.7 });
    // reservoir tank (horizontal cylinder, back-left)
    const tank = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 3.1, 20), new THREE.MeshLambertMaterial({ color: 0x2e86c1, transparent: true, opacity: 0.9 }));
    body.rotation.z = Math.PI / 2; body.castShadow = true; tank.add(body);
    const cap1 = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 0.18, 20), metal);
    cap1.rotation.z = Math.PI / 2; cap1.position.x = 1.55; tank.add(cap1);
    const cap2 = cap1.clone(); cap2.position.x = -1.55; tank.add(cap2);
    [[-1.1], [1.1]].forEach(([x]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.95, 1.4), metal); leg.position.set(x, -0.95, 0); tank.add(leg);
    });
    const tankLabel = labelSprite('H₂O  TANK', '#1b4f72'); tankLabel.position.set(0, 0.1, 1.0); tank.add(tankLabel);
    tank.position.set(-9.4, 1.9, -6.6);
    propsGroup.add(tank);

    // nutrient barrels A & B (back-right)
    const barrelCols = [0xc0392b, 0xf1c40f];
    [['A', -0.55, 0], ['B', 0.55, 1]].forEach(([t, x, i]) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.15, 14), new THREE.MeshLambertMaterial({ color: barrelCols[i] }));
      b.position.set(9.0 + x, 0.575, -6.8); b.castShadow = true; propsGroup.add(b);
      const s = labelSprite('NUTRIENT ' + t, i ? '#7d6608' : '#78281f'); s.position.set(9.0 + x, 0.75, -6.36); propsGroup.add(s);
    });

    // office corner: desk + laptop + stool (front-right)
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.09, 0.9), new THREE.MeshLambertMaterial({ color: 0x6e4f2a }));
    desk.position.set(9.6, 0.78, 6.4); desk.castShadow = true; propsGroup.add(desk);
    [[-0.85], [0.85]].forEach(([x]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.78, 0.8), new THREE.MeshLambertMaterial({ color: 0x54391d }));
      leg.position.set(9.6 + x, 0.39, 6.4); propsGroup.add(leg);
    });
    const laptop = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.32), new THREE.MeshStandardMaterial({ color: 0x222831, roughness: 0.3, metalness: 0.8 }));
    laptop.position.set(9.6, 0.86, 6.4); propsGroup.add(laptop);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 0.03), new THREE.MeshStandardMaterial({ color: 0x39d6e0, emissive: 0x1c8b95, emissiveIntensity: 0.9 }));
    screen.position.set(9.6, 1.0, 6.56); screen.rotation.x = -0.32; propsGroup.add(screen);
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.55, 12), new THREE.MeshLambertMaterial({ color: 0x3a4a41 }));
    stool.position.set(9.6, 0.275, 7.4); propsGroup.add(stool);

    // crate stack (west wall)
    const crateMat = new THREE.MeshLambertMaterial({ color: 0x8a6b3a });
    [[0, 0.42, 0], [0.05, 1.2, -0.04], [-0.03, 1.9, 0.05]].forEach(([x, y, z], i) => {
      const s = 0.95 - i * 0.18;
      const c = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.72, s), crateMat);
      c.position.set(-11.6 + x, y, 4.6 + z); c.rotation.y = i * 0.4; c.castShadow = true; propsGroup.add(c);
    });

    // hose coil (torus) near reservoir
    const hose = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 8, 20), new THREE.MeshLambertMaterial({ color: 0x1f6f3f }));
    hose.position.set(-9.4, 0.13, -4.6); hose.rotation.x = Math.PI / 2; propsGroup.add(hose);
  }

  function buildTrees() {
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5d4326 });
    const leafMats = [0x2f6b2f, 0x3c7a35, 0x27592b].map(c => new THREE.MeshLambertMaterial({ color: c }));
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 22 + Math.random() * 55;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) < GREENHOUSE.w && Math.abs(z) < GREENHOUSE.d) continue;
      const s = 0.8 + Math.random() * 1.4;
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.3 * s, 1.4 * s, 7), trunkMat);
      trunk.position.y = 0.7 * s; trunk.castShadow = true; t.add(trunk);
      const lm = leafMats[i % 3];
      const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.5 * s, 2.4 * s, 8), lm); c1.position.y = 1.4 * s + 1.1 * s; c1.castShadow = true; t.add(c1);
      const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.05 * s, 1.7 * s, 8), lm); c2.position.y = 1.4 * s + 2.35 * s; t.add(c2);
      t.position.set(x, -0.2, z); t.rotation.y = Math.random() * Math.PI;
      scene.add(t);
    }
  }

  function buildClouds() {
    cloudsGroup = new THREE.Group();
    const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, emissive: 0xffffff, emissiveIntensity: 0.25 });
    for (let i = 0; i < 7; i++) {
      const cloud = new THREE.Group();
      const n = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < n; j++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(1.6 + Math.random() * 1.6, 8, 6), cm);
        s.position.set(j * 2.1 - n, Math.random() * 0.7, Math.random() * 1.4 - 0.7);
        s.scale.y = 0.55; cloud.add(s);
      }
      cloud.position.set(Math.random() * 140 - 70, 17 + Math.random() * 7, Math.random() * 140 - 70);
      cloudsGroup.add(cloud);
    }
    scene.add(cloudsGroup);
  }

  function buildRain() {
    const N = 650;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 46;
      pos[i * 3 + 1] = Math.random() * 22;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 34;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xaed6f1, size: 0.16, transparent: true, opacity: 0.75 });
    rainPoints = new THREE.Points(geo, mat);
    rainPoints.visible = false;
    scene.add(rainPoints);
  }

  function buildSelectionRing() {
    selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(1.28, 1.52, 40),
      new THREE.MeshBasicMaterial({ color: 0x3ee08a, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    selectionRing.rotation.x = -Math.PI / 2; selectionRing.position.y = 0.03; selectionRing.visible = false;
    scene.add(selectionRing);
  }

  /* ─────────── BED MESHES ─────────── */
  const leafMats = {};
  function leafMat(color) {
    if (!leafMats[color]) leafMats[color] = new THREE.MeshLambertMaterial({ color });
    return leafMats[color];
  }

  function plantMound(crop, growth, rng) {
    const g = new THREE.Group();
    const s = 0.32 + growth * 0.85;
    const bumps = growth > 0.55 ? 4 : 3;
    for (let i = 0; i < bumps; i++) {
      const r = (0.16 + rng() * 0.075) * s;
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), leafMat(crop.leaf));
      const a = (i / bumps) * Math.PI * 2 + rng();
      m.position.set(Math.cos(a) * 0.16 * s, r * 0.75, Math.sin(a) * 0.16 * s);
      m.castShadow = true; g.add(m);
    }
    // crown sprout above
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.11 * s, 0.3 * s, 6), leafMat(crop.leaf));
    crown.position.y = 0.24 * s; g.add(crown);
    g.scale.setScalar(Math.max(0.22, growth));
    return g;
  }

  function fruitingPlant(crop, growth, rng) {
    const g = new THREE.Group();
    const stemH = 0.55 + growth * 1.15;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.036, stemH, 6), leafMat(0x4b7a3a));
    stem.position.y = stemH / 2; stem.castShadow = true; g.add(stem);
    // leaf clusters
    const clusters = 2 + Math.floor(growth * 3);
    for (let i = 0; i < clusters; i++) {
      const y = 0.35 + (i / clusters) * (stemH - 0.3);
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13 + rng() * 0.06, 0), leafMat(crop.leaf));
      leaf.position.set((rng() - 0.5) * 0.24, y, (rng() - 0.5) * 0.24);
      leaf.scale.y = 0.7; g.add(leaf);
    }
    const fruits = [];
    if (crop.fruit && growth > 0.68) {
      const n = 2 + Math.floor((growth - 0.68) * 9);
      for (let i = 0; i < Math.min(5, n); i++) {
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.075 + rng() * 0.02, 8, 6),
          new THREE.MeshLambertMaterial({ color: crop.fruit, emissive: crop.fruit, emissiveIntensity: 0.25 }));
        f.position.set((rng() - 0.5) * 0.4, 0.35 + rng() * (stemH - 0.35), (rng() - 0.5) * 0.4);
        f.castShadow = true; g.add(f); fruits.push(f);
      }
    }
    g.scale.setScalar(0.45 + growth * 0.62);
    return { group: g, fruits };
  }

  // deterministic pseudo-random per bed+plant
  function seeded(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

  function buildBedMesh(bed) {
    const g = new THREE.Group();
    const type = BED_TYPES[bed.type];
    const white = new THREE.MeshStandardMaterial({ color: 0xf2f0e9, roughness: 0.4, metalness: 0.15 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x39424d, roughness: 0.45, metalness: 0.6 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0xb9bdb2, roughness: 0.5, metalness: 0.6 });

    if (bed.type === 'nft') {
      // A-frame legs + 3 channels
      [[-0.95, -0.38], [0.95, -0.38], [-0.95, 0.38], [0.95, 0.38]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.78, 0.1), legMat);
        leg.position.set(x, 0.39, z); leg.castShadow = true; g.add(leg);
      });
      [-0.28, 0, 0.28].forEach(z => {
        const ch = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 0.24), white);
        ch.position.set(0, 0.82, z); ch.castShadow = true; g.add(ch);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.05, 0.28), darkMetal);
        cap.position.set(0, 0.745, z); g.add(cap);
      });
      // mini reservoir at end
      const res = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 1.0), new THREE.MeshLambertMaterial({ color: 0x2e86c1, transparent: true, opacity: 0.9 }));
      res.position.set(1.28, 0.21, 0); g.add(res);
    } else if (bed.type === 'bucket') {
      // bench + 6 buckets + trellis
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.09, 1.05), legMat);
      bench.position.set(0, 0.72, 0); bench.castShadow = true; g.add(bench);
      [[-1.0], [1.0]].forEach(([x]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, 0.95), legMat);
        leg.position.set(x, 0.36, 0); g.add(leg);
      });
      for (let i = 0; i < 6; i++) {
        const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.32, 12), darkMetal);
        bucket.position.set(-0.85 + i * 0.34, 0.93, 0); bucket.castShadow = true; g.add(bucket);
      }
      // trellis posts
      [[-1.05], [1.05]].forEach(([x]) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.5, 8), legMat);
        post.position.set(x, 1.5, -0.45); g.add(post);
      });
      const rail = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.07, 0.07), legMat);
      rail.position.set(0, 2.22, -0.45); g.add(rail);
      [[-0.52], [0.35]].forEach(([x]) => {
        const drop = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 6), legMat);
        drop.position.set(x, 1.72, -0.45); g.add(drop);
      });
    } else if (bed.type === 'tower') {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.3, 14), darkMetal);
      base.position.y = 0.15; base.castShadow = true; g.add(base);
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 2.25, 14), white);
      column.position.y = 1.4; column.castShadow = true; g.add(column);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.12, 14), darkMetal);
      cap.position.y = 2.58; g.add(cap);
      const res = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.28, 14), new THREE.MeshLambertMaterial({ color: 0x2e86c1, transparent: true, opacity: 0.9 }));
      res.position.set(0.62, 0.2, 0); g.add(res);
    }

    // LED grow bar (hidden until upgrade owned)
    const led = new THREE.Mesh(new THREE.BoxGeometry(bed.type === 'tower' ? 1.1 : 2.0, 0.07, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x222a33, emissive: 0xcfe8ff, emissiveIntensity: 0.0, roughness: 0.4 }));
    led.position.set(0, bed.type === 'tower' ? 3.0 : 2.45, 0);
    led.visible = false; g.add(led);

    // status orb
    const status = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x3ee08a, emissive: 0x3ee08a, emissiveIntensity: 1.4 }));
    status.position.set(0, bed.type === 'tower' ? 2.85 : 2.62, 0); g.add(status);

    // plants
    const crop = bed.cropId ? cropById(bed.cropId) : null;
    const plants = [];
    const rng = seeded(hashCode(String(bed.id)) + 7);
    if (crop) {
      if (bed.type === 'nft') {
        const spots = [[-0.68, -0.28], [0, -0.28], [0.68, -0.28], [-0.68, 0], [0, 0], [0.68, 0], [-0.42, 0.28], [0.42, 0.28]];
        spots.forEach(([x, z]) => { const p = plantMound(crop, bed.growth, rng); p.position.set(x, 0.9, z); g.add(p); plants.push(p); });
      } else if (bed.type === 'bucket') {
        for (let i = 0; i < 6; i++) {
          const { group, fruits } = fruitingPlant(crop, bed.growth, rng);
          group.position.set(-0.85 + i * 0.34, 1.08, 0); g.add(group); plants.push(group);
        }
      } else if (bed.type === 'tower') {
        for (let i = 0; i < 10; i++) {
          const y = 0.55 + (i / 9) * 1.75;
          const a = i * 2.4;
          const p = plantMound(crop, bed.growth, rng);
          p.position.set(Math.cos(a) * 0.3, y, Math.sin(a) * 0.3);
          p.scale.multiplyScalar(0.72); g.add(p); plants.push(p);
        }
      }
    }

    g.position.set(bed.x, 0, bed.z);
    g.rotation.y = bed.rot || 0;
    g.traverse(o => { o.userData.bedId = bed.id; });
    return { group: g, plants, status, led };
  }

  function hashCode(str) { let h = 0; for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; } return Math.abs(h) + 1; }

  function setBedVisuals(beds) {
    const seen = new Set();
    for (const bed of beds) {
      seen.add(bed.id);
      const existing = bedMeshes.get(bed.id);
      const signature = JSON.stringify([bed.type, bed.cropId, Math.round((bed.growth || 0) * 24), Math.round(bed.health || 100)]);
      if (existing && existing.signature === signature) continue;
      if (existing) bedsGroup.remove(existing.group);
      const built = buildBedMesh(bed);
      bedsGroup.add(built.group);
      bedMeshes.set(bed.id, { ...built, signature });
    }
    for (const [id, rec] of bedMeshes) {
      if (!seen.has(id)) { bedsGroup.remove(rec.group); bedMeshes.delete(id); }
    }
  }

  function updateBedStatus(bed, ledOn) {
    const rec = bedMeshes.get(bed.id); if (!rec) return;
    // status orb color
    const bad = bed.water <= 0.5 || bed.health < 35;
    const warn = !bad && (bed.water < 10 || bed.health < 70 || Math.abs(bed.ph - 6.0) > 0.9 || Math.abs(bed.ec - ecMid(bed)) > 0.9);
    const col = bad ? 0xff5a4e : warn ? 0xffc44d : 0x3ee08a;
    rec.status.material.color.setHex(col); rec.status.material.emissive.setHex(col);
    // LED bars
    rec.led.visible = !!ledOn;
    rec.led.material.emissiveIntensity = ledOn ? 1.5 : 0;
    return rec;
  }
  function ecMid(bed) { const c = bed.cropId ? cropById(bed.cropId) : null; return c ? (c.ec[0] + c.ec[1]) / 2 : 1.8; }

  /* ─────────── GHOST / PLACEMENT ─────────── */
  function setGhost(bedType) {
    if (ghostGroup) { scene.remove(ghostGroup); ghostGroup = null; }
    buildModeType = bedType;
    if (!bedType) return;
    ghostGroup = new THREE.Group();
    const fp = new THREE.Mesh(new THREE.BoxGeometry(bedType === 'tower' ? 1.3 : 2.5, 0.06, bedType === 'tower' ? 1.3 : 1.4),
      new THREE.MeshBasicMaterial({ color: 0x3ee08a, transparent: true, opacity: 0.4, depthWrite: false }));
    fp.position.y = 0.05; ghostGroup.add(fp);
    const ring = new THREE.Mesh(new THREE.RingGeometry(bedType === 'tower' ? 0.85 : 1.35, bedType === 'tower' ? 1.0 : 1.55, 32),
      new THREE.MeshBasicMaterial({ color: 0x3ee08a, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; ghostGroup.add(ring);
    ghostGroup.visible = false;
    scene.add(ghostGroup);
  }

  function moveGhost(x, z, valid) {
    if (!ghostGroup) return;
    ghostGroup.position.set(x, 0, z);
    ghostGroup.visible = true;
    ghostValid = valid;
    ghostGroup.children.forEach(c => c.material.color.setHex(valid ? 0x3ee08a : 0xff6b5e));
  }
  function hideGhost() { if (ghostGroup) ghostGroup.visible = false; }

  /* ─────────── INPUT ─────────── */
  function bindInput(callbacks) {
    canvasEl.addEventListener('contextmenu', e => e.preventDefault());

    canvasEl.addEventListener('pointerdown', e => {
      pointerDown = { x: e.clientX, y: e.clientY, button: e.button, moved: false, theta: cam.theta, elev: cam.elev };
      canvasEl.setPointerCapture(e.pointerId);
    });

    canvasEl.addEventListener('pointermove', e => {
      hoverNdc = toNdc(e.clientX, e.clientY);
      if (pointerDown) {
        const dx = e.clientX - pointerDown.x, dy = e.clientY - pointerDown.y;
        if (Math.abs(dx) + Math.abs(dy) > 5) pointerDown.moved = true;
        if (pointerDown.moved) {
          if (pointerDown.button === 2 || pointerDown.button === 1) {
            cam.theta = pointerDown.theta - dx * 0.008;
            cam.elev = clamp(pointerDown.elev + dy * 0.005, CAM.minElev, CAM.maxElev);
          } else {
            // pan: move target along camera-relative ground axes
            const scale = cam.dist * 0.0016;
            const fwd = tmpV.set(Math.sin(cam.theta), 0, Math.cos(cam.theta)).normalize();
            const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
            cam.target.addScaledVector(right, -dx * scale);
            cam.target.addScaledVector(fwd, dy * scale);
            clampTarget();
          }
        }
      } else if (buildModeType) {
        const p = pickGround(e.clientX, e.clientY);
        if (p) callbacks.onGhostMove && callbacks.onGhostMove(p.x, p.z);
      } else {
        // hover cursor
        const hit = pickBed(e.clientX, e.clientY);
        canvasEl.style.cursor = hit ? 'pointer' : 'default';
      }
    });

    canvasEl.addEventListener('pointerup', e => {
      const wasDrag = pointerDown?.moved;
      const btn = pointerDown?.button;
      pointerDown = null;
      if (wasDrag) return;
      if (btn === 2) { callbacks.onCancelBuild && callbacks.onCancelBuild(); return; }
      if (btn !== 0) return;
      if (buildModeType) {
        const p = pickGround(e.clientX, e.clientY);
        if (p) callbacks.onPlace && callbacks.onPlace(p.x, p.z);
        return;
      }
      const hit = pickBed(e.clientX, e.clientY);
      callbacks.onSelect && callbacks.onSelect(hit);
    });

    canvasEl.addEventListener('pointerleave', () => { hoverNdc = null; hideGhost(); });
    canvasEl.addEventListener('wheel', e => {
      e.preventDefault();
      cam.dist = clamp(cam.dist * (1 + e.deltaY * 0.0011), CAM.minDist, CAM.maxDist);
    }, { passive: false });

    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'q', 'e'].includes(k)) clockKeys[k] = true;
    });
    window.addEventListener('keyup', e => { clockKeys[e.key.toLowerCase()] = false; });
  }

  function clampTarget() {
    cam.target.x = clamp(cam.target.x, -GREENHOUSE.w / 2 - 6, GREENHOUSE.w / 2 + 6);
    cam.target.z = clamp(cam.target.z, -GREENHOUSE.d / 2 - 6, GREENHOUSE.d / 2 + 6);
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const toNdc = (x, y) => new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);

  function pickBed(clientX, clientY) {
    raycaster.setFromCamera(toNdc(clientX, clientY), camera);
    const hits = raycaster.intersectObjects(bedsGroup.children, true);
    for (const h of hits) { if (h.object.userData.bedId) return h.object.userData.bedId; }
    return null;
  }
  function pickGround(clientX, clientY) {
    raycaster.setFromCamera(toNdc(clientX, clientY), camera);
    const p = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(groundPlane, p)) return { x: p.x, z: p.z };
    return null;
  }
  function screenPos(x, y, z) {
    tmpV.set(x, y, z).project(camera);
    return { x: (tmpV.x * 0.5 + 0.5) * window.innerWidth, y: (-tmpV.y * 0.5 + 0.5) * window.innerHeight };
  }

  function setSelected(bedId) {
    if (!bedId) { selectionRing.visible = false; return; }
    const rec = bedMeshes.get(bedId); if (!rec) { selectionRing.visible = false; return; }
    selectionRing.position.set(rec.group.position.x, 0.03, rec.group.position.z);
    selectionRing.visible = true;
  }

  /* ─────────── PER-FRAME UPDATE ─────────── */
  function updateCamera(dt) {
    // keyboard pan
    const panSpd = cam.dist * 0.85 * dt;
    const fwd = new THREE.Vector3(Math.sin(cam.theta), 0, Math.cos(cam.theta));
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
    if (clockKeys['w'] || clockKeys['arrowup']) cam.target.addScaledVector(fwd, -panSpd);
    if (clockKeys['s'] || clockKeys['arrowdown']) cam.target.addScaledVector(fwd, panSpd);
    if (clockKeys['a'] || clockKeys['arrowleft']) cam.target.addScaledVector(right, panSpd);
    if (clockKeys['d'] || clockKeys['arrowright']) cam.target.addScaledVector(right, -panSpd);
    if (clockKeys['q']) cam.theta += 1.5 * dt;
    if (clockKeys['e']) cam.theta -= 1.5 * dt;
    clampTarget();

    const y = Math.sin(cam.elev) * cam.dist;
    const horiz = Math.cos(cam.elev) * cam.dist;
    camera.position.set(
      cam.target.x + Math.sin(cam.theta) * horiz,
      cam.target.y + y,
      cam.target.z + Math.cos(cam.theta) * horiz
    );
    camera.lookAt(cam.target.x, cam.target.y + 0.6, cam.target.z);
  }

  function update(dt, elapsed, dayTime, weatherKey, ledOn) {
    updateCamera(dt);

    // ── sun / sky cycle ──
    // dayTime 0..1 → 00:00..24:00 ; sunrise ≈ 0.23, sunset ≈ 0.78
    const dayFrac = clamp((dayTime - 0.23) / 0.55, 0, 1);
    const elev = Math.sin(dayFrac * Math.PI);            // 0 at rise/set, 1 at noon
    const dayness = clamp(elev * 1.6, 0, 1);
    const duskness = clamp(1 - Math.abs(elev) * 3.2, 0, 1) * (elev > -0.08 ? 1 : 0);

    sun.position.set(Math.cos(dayFrac * Math.PI) * 55, Math.max(elev, 0.02) * 48 + 2, 24);
    sun.intensity = 0.06 + dayness * 1.25;
    sun.color.setHex(duskness > 0.45 ? 0xffc98a : 0xffffff);
    hemi.intensity = 0.16 + dayness * 0.75;
    amb.intensity = 0.1 + dayness * 0.22;

    const sky = skyNight.clone().lerp(skyDay, dayness).lerp(skyDusk, duskness * 0.45);
    scene.background.copy(sky);
    scene.fog.color.copy(fogNight.clone().lerp(fogDay, dayness));

    // weather dims the sun
    const w = WEATHERS[weatherKey] || WEATHERS.sunny;
    sun.intensity *= w.sun;
    hemi.intensity *= (0.7 + w.sun * 0.3);

    // ── clouds ──
    if (cloudsGroup) {
      cloudsGroup.children.forEach(c => {
        c.position.x += dt * 0.55;
        if (c.position.x > 85) c.position.x = -85;
      });
      const cloudOp = weatherKey === 'sunny' ? 0.55 : weatherKey === 'cloudy' ? 0.95 : 1.0;
      cloudsGroup.children.forEach(c => c.children.forEach(s => { s.material.opacity = cloudOp; }));
    }

    // ── rain ──
    if (rainPoints) {
      rainPoints.visible = !!w.rain;
      if (w.rain) {
        const attr = rainPoints.geometry.attributes.position;
        for (let i = 0; i < attr.count; i++) {
          let y = attr.getY(i) - dt * (weatherKey === 'storm' ? 26 : 17);
          if (y < 0) y = 20 + Math.random() * 2;
          attr.setY(i, y);
        }
        attr.needsUpdate = true;
      }
    }

    // ── bed sway & status ──
    const t = elapsed;
    bedMeshes.forEach((rec, id) => {
      rec.plants.forEach((p, i) => {
        p.rotation.z = Math.sin(t * 1.6 + i * 1.7 + id.length) * 0.045;
      });
      rec.status.material.emissiveIntensity = 1.15 + Math.sin(t * 3.1) * 0.45;
    });

    // selection ring spin
    if (selectionRing.visible) selectionRing.rotation.z = t * 0.8;

    renderer.render(scene, camera);
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  return {
    init, setBedVisuals, updateBedStatus, setGhost, moveGhost, hideGhost,
    pickGround, pickBed, setSelected, screenPos, update,
    isBuildMode: () => !!buildModeType,
    GREENHOUSE,
  };
})();
