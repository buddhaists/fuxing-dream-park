// 組裝整座微縮園區：地台、步道網、設施、裝飾、燈光。
import * as THREE from 'three';
import { PALETTE as P, box, cyl, cone, ball, mat, rng } from './kit.js';
import { builders } from './facilities.js';
import { addKids } from './people.js';

export const BASE_R = 34;

function diorama(scene) {
  const g = new THREE.Group();
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(BASE_R, BASE_R, 0.5, 28), mat(P.grass));
  grass.position.y = -0.25;
  grass.receiveShadow = true;
  g.add(grass);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(BASE_R + 0.1, BASE_R - 0.6, 2.4, 28), mat(P.soil));
  soil.position.y = -1.7;
  g.add(soil);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(BASE_R + 1.2, BASE_R + 1.4, 0.9, 28), mat(P.wood));
  plinth.position.y = -3.3;
  g.add(plinth);
  scene.add(g);
}

// 步道：每段為貼地長條；階梯段畫成台階，坡道段為綠色並附扶手。
function buildPaths(graph) {
  const g = new THREE.Group();
  const W = 1.7;
  const v = (n) => new THREE.Vector3(n.x, n.y + 0.03, n.z);
  for (const n of Object.values(graph.nodes)) {
    const d = cyl(W / 2 + 0.05, W / 2 + 0.05, 0.06, 10, P.sand, n.x, n.y + 0.03, n.z);
    d.receiveShadow = true;
    g.add(d);
  }
  for (const e of graph.edges) {
    const a = v(graph.nodes[e.a]);
    const b = v(graph.nodes[e.b]);
    if (e.stairs) {
      const lo = a.y <= b.y ? a : b;
      const hi = a.y <= b.y ? b : a;
      const dir = hi.clone().sub(lo).setY(0);
      const len = dir.length();
      dir.normalize();
      const steps = 5;
      const ang = Math.atan2(dir.x, dir.z);
      for (let i = 0; i < steps; i++) {
        const h = ((i + 1) / steps) * (hi.y - lo.y);
        const s = box(W + 0.4, h, len / steps, P.stair, 0, h / 2, 0);
        const c = lo.clone().addScaledVector(dir, (len / steps) * (i + 0.5));
        s.position.set(c.x, h / 2, c.z);
        s.rotation.y = ang;
        g.add(s);
      }
      continue;
    }
    const len = a.distanceTo(b);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(W, 0.06, len), mat(e.ramp ? P.ramp : P.sand));
    strip.position.copy(a).add(b).multiplyScalar(0.5);
    strip.lookAt(b);
    strip.receiveShadow = true;
    g.add(strip);
    if (e.ramp) {
      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, len), mat(P.white));
        const off = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3(0, 1, 0)).normalize();
        rail.position.copy(a).add(b).multiplyScalar(0.5).addScaledVector(off, (side * W) / 2).add(new THREE.Vector3(0, 0.6, 0));
        rail.lookAt(rail.position.clone().add(new THREE.Vector3().subVectors(b, a)));
        g.add(rail);
      }
    }
  }
  return g;
}

function tree(r, x, z, s = 1) {
  const g = new THREE.Group();
  g.add(cyl(0.12 * s, 0.18 * s, 0.9 * s, 5, P.woodDark, 0, 0.45 * s, 0));
  const kind = r();
  const leaf = [P.grassDark, '#8cc06a', '#b5d77a', '#f2b56d'][Math.floor(r() * 4)];
  if (kind < 0.5) {
    g.add(cone(0.8 * s, 1.6 * s, 6, leaf, 0, 1.6 * s, 0));
    g.add(cone(0.6 * s, 1.2 * s, 6, leaf, 0, 2.3 * s, 0));
  } else {
    g.add(ball(0.85 * s, leaf, 0, 1.6 * s, 0));
  }
  g.position.set(x, 0, z);
  g.rotation.y = r() * 6;
  return g;
}

function lamp(x, z) {
  const g = new THREE.Group();
  g.add(cyl(0.06, 0.08, 2.2, 5, P.dark, 0, 1.1, 0));
  const bulb = ball(0.22, P.window, 0, 2.3, 0, 1);
  bulb.material = mat(P.window, { emissive: '#ffcf70' });
  g.add(bulb);
  g.position.set(x, 0, z);
  return g;
}

function bench(x, z, rot) {
  const g = new THREE.Group();
  g.add(box(1.4, 0.12, 0.45, P.wood, 0, 0.45, 0));
  g.add(box(1.4, 0.4, 0.1, P.wood, 0, 0.7, -0.2));
  for (const s of [-0.55, 0.55]) g.add(box(0.1, 0.45, 0.4, P.dark, s, 0.22, 0));
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

function cloud(r) {
  const g = new THREE.Group();
  const n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) g.add(ball(1 + r() * 0.8, P.white, i * 1.3 - n * 0.6, r() * 0.5, r() * 0.8));
  return g;
}

// 檢查位置是否離步道與設施太近（避免樹種在路上）
function makeClearance(graph, facilities) {
  const segs = graph.edges.map((e) => [graph.nodes[e.a], graph.nodes[e.b]]);
  return (x, z, pad) => {
    for (const f of facilities) {
      const rad = { castle: 7.5, classroom: 7.5, ferris: 5, tent: 6, carousel: 4.8, train: 5.5, ticket: 7, fountain: 5.5 }[f.type] || 2.6;
      if (Math.hypot(x - f.pos[0], z - f.pos[1]) < rad + pad) return false;
    }
    for (const [a, b] of segs) {
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
      if (Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t)) < 1.3 + pad) return false;
    }
    return true;
  };
}

export function buildWorld(scene, data, graph, quality) {
  scene.background = new THREE.Color('#f6e3c6');
  scene.fog = new THREE.Fog('#f6e3c6', 90, 190);

  // 溫暖燈光
  const hemi = new THREE.HemisphereLight('#fff1d6', '#c99a6e', 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffd6a0', 2.4);
  sun.position.set(28, 42, 20);
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 5; sc.far = 120;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#ffb38a', 0.5);
  fill.position.set(-30, 20, -10);
  scene.add(fill);

  diorama(scene);
  scene.add(buildPaths(graph));

  const updaters = [];
  const facilityObjs = {};
  for (const f of data.facilities) {
    const build = builders[f.type];
    if (!build) continue;
    const obj = build(f);
    const kidsUpdate = addKids(f, obj); // 正在遊玩的孩子
    updaters.push((t, dt, motion) => kidsUpdate(t, motion));
    obj.position.set(f.pos[0], 0, f.pos[1]);
    obj.userData.facilityId = f.id;
    obj.traverse((o) => (o.userData.facilityId = f.id));
    scene.add(obj);
    facilityObjs[f.id] = obj;
    if (obj.userData.update) updaters.push(obj.userData.update);
  }

  // 裝飾
  const decor = new THREE.Group();
  const r = rng(7);
  const clear = makeClearance(graph, data.facilities);
  const treeCount = quality === 'low' ? 45 : 85;
  let placed = 0;
  for (let tries = 0; placed < treeCount && tries < 3000; tries++) {
    const a = r() * Math.PI * 2;
    const d = 6 + Math.sqrt(r()) * (BASE_R - 7.5);
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (!clear(x, z, 0.6)) continue;
    decor.add(tree(r, x, z, 0.8 + r() * 0.6));
    placed++;
  }
  // 園區外圍圍籬
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const x = Math.cos(a) * (BASE_R - 0.8);
    const z = Math.sin(a) * (BASE_R - 0.8);
    if (Math.abs(x) < 3 && z > 0) continue; // 校門開口
    decor.add(box(0.2, 0.9, 0.2, P.white, x, 0.45, z));
    const rail = box(0.12, 0.12, ((Math.PI * 2 * (BASE_R - 0.8)) / 72) * 1.02, P.white, x, 0.7, z);
    rail.rotation.y = -a;
    decor.add(rail);
  }
  // 沿主步道的路燈與長椅
  [[2, 16], [-2, 9], [2, 0], [-2, -3], [-6, 6], [6, 6], [-11, -2], [11, -2], [-4, 14], [4, 11]].forEach(([x, z]) => {
    if (clear(x, z, -0.2)) decor.add(lamp(x, z));
  });
  [[-3, 8.6, 0], [3, 8.6, 0], [-5.5, 4, Math.PI / 2], [5.5, 4, -Math.PI / 2]].forEach(([x, z, rr]) => decor.add(bench(x, z, rr)));
  // 花圃
  const flowerCols = [P.red, P.yellow, P.pink, P.purple, P.white];
  for (let i = 0; i < 120; i++) {
    const a = r() * Math.PI * 2;
    const d = 5.5 + r() * (BASE_R - 7);
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (!clear(x, z, 0)) continue;
    decor.add(ball(0.14, flowerCols[i % 5], x, 0.15, z));
  }
  scene.add(decor);

  // 雲朵
  const clouds = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const c = cloud(r);
    c.position.set(-45 + i * 18, 20 + r() * 6, -30 + r() * 40);
    clouds.add(c);
  }
  scene.add(clouds);
  updaters.push((t, dt, motion) => {
    if (!motion) return;
    clouds.children.forEach((c, i) => {
      c.position.x += dt * (0.6 + i * 0.1);
      if (c.position.x > 55) c.position.x = -55;
    });
  });

  // 陰影設定（低畫質時不投射）
  scene.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  clouds.traverse((o) => (o.castShadow = false));

  return {
    sun,
    facilityObjs,
    update(t, dt, motion) {
      for (const u of updaters) u(t, dt, motion);
    },
  };
}
