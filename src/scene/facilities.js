// 各遊樂設施的程式化低多邊形模型。每個 builder 回傳 Group，
// 需要動畫者在 group.userData.update(t, dt, motion) 中處理。
import * as THREE from 'three';
import { PALETTE as P, box, cyl, cone, ball, striped, sign, mat } from './kit.js';

function flag(color, h = 1.6) {
  const g = new THREE.Group();
  g.add(cyl(0.05, 0.05, h, 5, P.dark, 0, h / 2, 0));
  const f = box(0.7, 0.4, 0.04, color, 0.35, h - 0.25, 0);
  g.add(f);
  g.userData.update = (t, dt, motion) => {
    if (motion) f.rotation.y = Math.sin(t * 3 + g.id) * 0.35;
  };
  return g;
}

function roofPrism(w, h, d, color) {
  // 三角柱屋頂（3 段圓柱轉向）
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, d, 3), mat(color));
  m.rotation.x = Math.PI / 2;
  m.rotation.z = Math.PI / 2; // 尖端朝上
  m.scale.set(h / 1.5, 1, w / 1.732);
  const holder = new THREE.Group();
  holder.add(m);
  return holder;
}

// ── 入口售票亭＋拱門 ──────────────────────────────
function ticket(f) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    g.add(cyl(0.55, 0.65, 4.2, 8, s < 0 ? P.red : P.sky, s * 3.4, 2.1, 0));
    g.add(cone(0.8, 1.2, 8, P.yellow, s * 3.4, 4.8, 0));
    g.add(ball(0.22, P.white, s * 3.4, 5.5, 0));
  }
  g.add(box(7.6, 0.6, 0.8, P.wood, 0, 4.1, 0));
  const s = sign('復興夢想樂園', 5.2, 1.3, { bg: P.yellow });
  s.position.set(0, 4.95, 0.45);
  g.add(s);
  // 售票小屋
  const booth = new THREE.Group();
  booth.add(box(2.2, 1.9, 1.8, P.cream, 0, 0.95, 0));
  booth.add(box(1.4, 0.7, 0.1, P.window, 0, 1.3, 0.91));
  const roof = cone(1.9, 1.2, 4, P.red, 0, 2.5, 0);
  roof.rotation.y = Math.PI / 4;
  booth.add(roof);
  booth.add(box(2.4, 0.15, 0.5, P.white, 0, 0.95, 1.05));
  booth.position.set(-5.6, 0, 0.6);
  booth.rotation.y = 0.35;
  g.add(booth);
  // 氣球束
  const balloons = new THREE.Group();
  [P.red, P.yellow, P.sky, P.pink, P.mint].forEach((c, i) => {
    const a = (i / 5) * Math.PI * 2;
    balloons.add(ball(0.32, c, Math.cos(a) * 0.4, 3.6 + (i % 2) * 0.4, Math.sin(a) * 0.4, 1));
  });
  balloons.add(cyl(0.02, 0.02, 3.4, 4, P.white, 0, 1.7, 0));
  balloons.position.set(5.4, 0, 0.8);
  g.add(balloons);
  g.userData.update = (t, dt, motion) => {
    if (motion) balloons.position.y = Math.sin(t * 1.5) * 0.12;
  };
  g.userData.labelY = 6.6;
  return g;
}

// ── 夢想城堡（教務處） ──────────────────────────────
function castle(f) {
  const g = new THREE.Group();
  g.add(box(11, 0.8, 9, P.stone, 0, 0.4, 0));
  const top = 0.8;
  g.add(box(6.4, 3.6, 4.2, P.cream, 0, top + 1.8, -1));
  // 城垛
  for (let i = -3; i <= 3; i++) g.add(box(0.5, 0.5, 0.5, P.cream, i * 0.95, top + 3.85, 1.0));
  const towers = [
    [-3.4, 1.2], [3.4, 1.2], [-3.4, -3.2], [3.4, -3.2],
  ];
  const roofCols = [P.red, P.sky, P.sky, P.red];
  towers.forEach(([x, z], i) => {
    g.add(cyl(0.95, 1.05, 5, 8, P.white, x, top + 2.5, z));
    g.add(cone(1.3, 2.2, 8, roofCols[i], x, top + 6.1, z));
    g.add(box(0.35, 0.6, 0.1, P.window, x, top + 3.4, z + 0.98));
  });
  g.add(cyl(1.4, 1.5, 7, 8, P.yellow, 0, top + 3.5, -1.6));
  g.add(cone(1.9, 3, 8, P.red, 0, top + 8.5, -1.6));
  const fl = flag(P.yellow, 1.8);
  fl.position.set(0, top + 9.8, -1.6);
  g.add(fl);
  // 大門與窗
  g.add(box(1.6, 2.2, 0.2, P.woodDark, 0, top + 1.1, 1.15));
  const arch = cyl(0.8, 0.8, 0.2, 8, P.woodDark, 0, top + 2.2, 1.15);
  arch.rotation.x = Math.PI / 2;
  g.add(arch);
  for (const x of [-2, 2]) g.add(box(0.7, 0.9, 0.1, P.window, x, top + 2.4, 1.15));
  const s = sign('教務處', 2.4, 0.7, { bg: P.white });
  s.position.set(0, top + 3.3, 1.2);
  g.add(s);
  g.userData.update = (t, dt, m) => fl.userData.update(t, dt, m);
  g.userData.labelY = 11.5;
  return g;
}

// ── 小型服務站（各處室） ─────────────────────────────
function kiosk(f) {
  const g = new THREE.Group();
  const c = f.color || P.sky;
  g.add(box(2.6, 1.9, 2.2, P.cream, 0, 0.95, 0));
  g.add(box(2.6, 0.35, 2.2, c, 0, 0.18, 0));
  const roof = cone(2.2, 1.3, 4, c === '#ffffff' ? P.red : c, 0, 2.55, 0);
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  g.add(box(1.6, 0.8, 0.1, P.window, 0, 1.2, 1.11));
  g.add(box(2.8, 0.12, 0.6, c === '#ffffff' ? P.red : c, 0, 1.75, 1.3));
  // 頂端標誌球（急救站做成十字）
  if (f.id === 'health') {
    g.add(box(0.7, 0.22, 0.22, P.red, 0, 3.55, 0));
    g.add(box(0.22, 0.7, 0.22, P.red, 0, 3.55, 0));
  } else {
    g.add(ball(0.32, c === '#ffffff' ? P.red : c, 0, 3.5, 0, 1));
  }
  if (f.id === 'student') {
    const b = new THREE.Group();
    [P.red, P.yellow, P.sky].forEach((cc, i) => b.add(ball(0.28, cc, 1.4 + i * 0.3, 3 + i * 0.35, 0.8, 1)));
    g.add(b);
    g.userData.update = (t, dt, m) => {
      if (m) b.position.y = Math.sin(t * 2) * 0.1;
    };
  }
  g.userData.labelY = 4.4;
  return g;
}

// ── 故事旋轉木馬（圖書館） ───────────────────────────
function carousel(f) {
  const g = new THREE.Group();
  g.add(cyl(3.4, 3.6, 0.5, 12, P.cream, 0, 0.25, 0));
  g.add(cyl(3.3, 3.3, 0.1, 12, P.pink, 0, 0.55, 0));
  const spin = new THREE.Group();
  spin.position.y = 0.6;
  spin.add(cyl(0.35, 0.35, 3.6, 8, P.yellow, 0, 1.8, 0));
  const canopy = striped(new THREE.ConeGeometry(3.8, 1.7, 12), [P.pink, P.white], 12);
  canopy.position.y = 4.4;
  spin.add(canopy);
  spin.add(cyl(3.8, 3.8, 0.35, 12, P.purple, 0, 3.45, 0));
  spin.add(ball(0.35, P.yellow, 0, 5.4, 0, 1));
  const horses = [];
  const horseCols = [P.white, P.yellow, P.sky, P.coral, P.mint, P.purple];
  const bookCols = [P.red, P.sky, P.mint, P.yellow, P.purple, P.coral];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const h = new THREE.Group();
    h.add(cyl(0.05, 0.05, 3.2, 5, P.yellow, 0, 1.6, 0));
    const body = new THREE.Group();
    body.add(box(1.0, 0.5, 0.38, horseCols[i], 0, 0, 0));
    body.add(box(0.32, 0.55, 0.32, horseCols[i], 0.5, 0.35, 0));
    body.add(box(0.22, 0.4, 0.05, P.dark, 0.32, 0.35, 0));
    for (const lx of [-0.35, 0.35]) body.add(box(0.12, 0.45, 0.12, horseCols[i], lx, -0.4, 0));
    body.add(box(0.5, 0.12, 0.4, bookCols[i], -0.05, 0.31, 0)); // 背上的書
    body.position.y = 1.3;
    h.add(body);
    h.position.set(Math.cos(a) * 2.5, 0, Math.sin(a) * 2.5);
    h.rotation.y = -a;
    spin.add(h);
    horses.push(body);
  }
  g.add(spin);
  g.userData.update = (t, dt, motion) => {
    if (!motion) return;
    spin.rotation.y += dt * 0.5;
    horses.forEach((b, i) => (b.position.y = 1.3 + Math.sin(t * 2.4 + i * 1.3) * 0.25));
  };
  g.userData.labelY = 6.4;
  return g;
}

// ── 社團馬戲帳篷 ────────────────────────────────────
function tent(f) {
  const g = new THREE.Group();
  const wall = striped(new THREE.CylinderGeometry(4, 4.1, 2, 12, 1, true), [P.red, P.white], 12);
  wall.position.y = 1;
  wall.material.side = THREE.DoubleSide;
  g.add(wall);
  g.add(cyl(3.95, 3.95, 0.1, 12, P.sand, 0, 0.05, 0));
  const roof = striped(new THREE.ConeGeometry(4.6, 4, 12), [P.red, P.white], 12);
  roof.position.y = 4;
  g.add(roof);
  g.add(cyl(4.6, 4.6, 0.3, 12, P.yellow, 0, 2.05, 0));
  const fl = flag(P.yellow, 1.6);
  fl.position.y = 6;
  g.add(fl);
  // 入口布簾
  const door = box(1.8, 1.8, 0.3, P.dark, 0, 0.9, 3.95);
  g.add(door);
  const hood = cone(1.1, 0.6, 4, P.yellow, 0, 2.0, 4.0);
  hood.rotation.y = Math.PI / 4;
  g.add(hood);
  // 周圍小旗
  const pennants = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const p = flag([P.sky, P.yellow, P.mint][i % 3], 1.4);
    p.position.set(Math.cos(a) * 5.2, 0, Math.sin(a) * 5.2);
    g.add(p);
    pennants.push(p);
  }
  g.userData.update = (t, dt, m) => {
    fl.userData.update(t, dt, m);
    pennants.forEach((p) => p.userData.update(t, dt, m));
  };
  g.userData.labelY = 7.2;
  return g;
}

// ── 特色教學小火車 ───────────────────────────────────
function train(f) {
  const g = new THREE.Group();
  const R = 3.6;
  const track = new THREE.Mesh(new THREE.TorusGeometry(R, 0.14, 4, 32), mat(P.dark));
  track.rotation.x = Math.PI / 2;
  track.position.y = 0.12;
  g.add(track);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const s = box(0.25, 0.08, 0.9, P.woodDark, Math.cos(a) * R, 0.05, Math.sin(a) * R);
    s.rotation.y = -a;
    g.add(s);
  }
  g.add(cyl(2.4, 2.4, 0.15, 10, P.grassDark, 0, 0.08, 0));
  g.add(cone(0.9, 2, 6, P.grassDark, 0, 1.1, 0));
  // 月台
  const st = new THREE.Group();
  st.add(box(1.4, 0.3, 2.6, P.stone, 0, 0.15, 0));
  for (const z of [-1, 1]) st.add(cyl(0.07, 0.07, 1.8, 5, P.white, 0.4, 1.1, z));
  st.add(box(1.4, 0.15, 2.8, P.teal, 0.2, 2.05, 0));
  st.position.set(R + 1.3, 0, 0);
  g.add(st);

  const cars = [];
  const mk = (color, engine) => {
    const c = new THREE.Group();
    c.add(box(1.1, 0.7, 0.75, color, 0, 0.55, 0));
    for (const x of [-0.35, 0.35])
      for (const z of [-0.4, 0.4]) {
        const w = cyl(0.18, 0.18, 0.08, 8, P.dark, x, 0.25, z);
        w.rotation.x = Math.PI / 2;
        c.add(w);
      }
    if (engine) {
      c.add(box(0.5, 0.6, 0.75, P.red, -0.3, 1.15, 0));
      c.add(cyl(0.14, 0.18, 0.6, 6, P.dark, 0.35, 1.2, 0));
    } else {
      c.add(box(0.9, 0.3, 0.6, P.yellow, 0, 1.0, 0));
    }
    g.add(c);
    cars.push(c);
  };
  mk(P.teal, true);
  mk(P.sky, false);
  mk(P.coral, false);
  let ang = 0;
  g.userData.update = (t, dt, motion) => {
    if (motion) ang += dt * 0.45;
    cars.forEach((c, i) => {
      const a = ang - i * 0.36;
      c.position.set(Math.cos(a) * R, 0.15, Math.sin(a) * R);
      c.rotation.y = -a - Math.PI / 2;
    });
  };
  g.userData.update(0, 0, false);
  g.userData.labelY = 3.6;
  return g;
}

// ── 積木小屋村（一年級教室） ───────────────────────────
function classroom(f) {
  const g = new THREE.Group();
  // 平台中心相對 facility pos 往 -z 偏移 0.5
  g.add(box(12, 0.6, 8, P.stone, 0, 0.3, -0.5));
  const cols = [P.red, P.sky, P.mint];
  const roofs = [P.yellow, P.coral, P.purple];
  [-4, 0, 4].forEach((x, i) => {
    const y0 = 0.6;
    g.add(box(3, 2.4, 3, cols[i], x, y0 + 1.2, -1.5));
    const r = roofPrism(3.4, 1.4, 3.4, roofs[i]);
    r.position.set(x, y0 + 2.4 + 0.47, -1.5);
    g.add(r);
    g.add(box(0.9, 1.4, 0.1, P.white, x, y0 + 0.7, 0.01));
    for (const wx of [-0.9, 0.9]) g.add(box(0.6, 0.6, 0.1, P.window, x + wx, y0 + 1.6, 0.01));
    const s = sign(`1年${['甲', '乙', '丙'][i]}班`, 1.6, 0.45, { bg: P.white });
    s.position.set(x, y0 + 2.2, 0.06);
    g.add(s);
  });
  // 散落玩具積木
  const blocks = [];
  [[-5, 2, P.yellow], [-4.2, 2.4, P.sky], [5, 2.2, P.red], [4.3, 2.6, P.mint]].forEach(([x, z, c], i) => {
    const b = box(0.55, 0.55, 0.55, c, x, 0.88, z);
    b.rotation.y = i;
    g.add(b);
    blocks.push(b);
  });
  g.userData.labelY = 5;
  return g;
}

// ── 鳥瞰摩天輪 ──────────────────────────────────────
function ferris(f) {
  const g = new THREE.Group();
  const H = 8.5;
  const R = 6;
  g.add(box(6, 0.4, 4, P.stone, 0, 0.2, 0));
  for (const z of [-1.1, 1.1])
    for (const s of [-1, 1]) {
      const leg = box(0.35, H + 0.6, 0.35, P.white, s * 2.1, H / 2, z);
      leg.rotation.z = s * 0.26;
      g.add(leg);
    }
  const axle = cyl(0.3, 0.3, 2.6, 8, P.yellow, 0, H, 0);
  axle.rotation.x = Math.PI / 2;
  g.add(axle);
  const wheel = new THREE.Group();
  wheel.position.y = H;
  for (const z of [-0.6, 0.6]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.14, 4, 24), mat(P.sky));
    ring.position.z = z;
    wheel.add(ring);
  }
  const N = 8;
  const gondolas = [];
  const gCols = [P.red, P.yellow, P.mint, P.pink, P.sky, P.coral, P.purple, P.teal];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    for (const z of [-0.6, 0.6]) {
      const sp = box(0.1, R, 0.1, P.white, Math.cos(a) * R / 2, Math.sin(a) * R / 2, z);
      sp.rotation.z = a - Math.PI / 2;
      wheel.add(sp);
    }
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
    const cab = new THREE.Group();
    cab.add(cyl(0.6, 0.55, 0.8, 6, gCols[i], 0, -0.8, 0));
    cab.add(cone(0.7, 0.4, 6, P.white, 0, -0.2, 0));
    cab.add(cyl(0.03, 0.03, 0.5, 4, P.dark, 0, 0.1, 0));
    pivot.add(cab);
    pivot.userData.base = a;
    wheel.add(pivot);
    gondolas.push(pivot);
  }
  g.add(wheel);
  g.userData.wheel = wheel;
  g.userData.gondolas = gondolas;
  g.userData.speed = 0.12;
  g.userData.update = (t, dt, motion) => {
    if (motion || g.userData.riding) wheel.rotation.z += dt * g.userData.speed;
    gondolas.forEach((p) => (p.rotation.z = -wheel.rotation.z));
  };
  g.userData.labelY = H + R + 1.5;
  return g;
}

// ── 文藝復興報攤 ────────────────────────────────────
function newsstand(f) {
  const g = new THREE.Group();
  g.add(box(2.6, 2, 1.8, P.teal, 0, 1, 0));
  g.add(box(2.2, 0.9, 0.1, P.window, 0, 1.25, 0.91));
  const aw = striped(new THREE.CylinderGeometry(1.6, 1.6, 0.1, 8), [P.red, P.white], 8);
  aw.scale.set(1, 1, 0.6);
  aw.position.set(0, 2.15, 0.6);
  g.add(aw);
  g.add(box(2.8, 0.25, 2, P.yellow, 0, 2.15, 0));
  // 書報堆
  [[-0.7, P.white], [0, P.yellow], [0.7, P.sky]].forEach(([x, c], i) =>
    g.add(box(0.55, 0.3 + i * 0.1, 0.4, c, x, 0.2 + i * 0.05, 1.3)),
  );
  const s = sign('文藝復興', 1.9, 0.5, { bg: P.white });
  s.position.set(0, 2.6, 0.5);
  g.add(s);
  g.userData.labelY = 3.6;
  return g;
}

// ── 許願噴泉廣場 ────────────────────────────────────
function fountain(f) {
  const g = new THREE.Group();
  g.add(cyl(5, 5, 0.08, 16, P.stone, 0, 0.04, 0));
  g.add(cyl(2.2, 2.4, 0.6, 12, P.white, 0, 0.3, 0));
  g.add(cyl(2.0, 2.0, 0.05, 12, P.water, 0, 0.55, 0));
  g.add(cyl(0.3, 0.4, 1.4, 8, P.white, 0, 1.2, 0));
  g.add(cyl(1.0, 0.4, 0.3, 10, P.white, 0, 1.9, 0));
  const spout = cone(0.35, 1.1, 8, P.water, 0, 2.5, 0);
  spout.material = mat(P.water, { opacity: 0.8 });
  g.add(spout);
  const drops = [];
  for (let i = 0; i < 6; i++) {
    const d = ball(0.12, P.water, 0, 2, 0);
    g.add(d);
    drops.push(d);
  }
  g.userData.update = (t, dt, motion) => {
    if (!motion) return;
    spout.scale.y = 1 + Math.sin(t * 4) * 0.15;
    drops.forEach((d, i) => {
      const k = (t * 0.8 + i / 6) % 1;
      const a = (i / 6) * Math.PI * 2;
      d.position.set(Math.cos(a) * k * 1.4, 2.1 + k * 0.8 - k * k * 1.6, Math.sin(a) * k * 1.4);
    });
  };
  g.userData.labelY = 3.6;
  return g;
}

export const builders = { ticket, castle, kiosk, carousel, tent, train, classroom, ferris, newsstand, fountain };
