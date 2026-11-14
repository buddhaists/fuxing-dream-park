// 低多邊形玩具小孩：方塊身體＋圓頭，附簡單動作（揮手、跳、跑、坐、看書、拋球）。
// 依設施類型把正在遊玩的孩子放進各遊樂設施。
import * as THREE from 'three';
import { mat, rng } from './kit.js';

const SKIN = ['#f6d2b0', '#e8b98f', '#c98f62', '#f1c7a1'];
const HAIR = ['#3b2a20', '#5a3a26', '#1f1b18', '#8a5a34', '#2c2018'];
const SHIRT = ['#e8775a', '#7fb6e6', '#f2c46d', '#9bc98a', '#f2a7b8', '#b58ad9', '#5aa6a0', '#ffffff'];
const PANTS = ['#4e6a9a', '#5b4636', '#3f5e5a', '#8a5a7a', '#6b6f80'];

// 共用幾何，節省記憶體
const G = {
  leg: new THREE.BoxGeometry(0.13, 0.4, 0.14).translate(0, -0.2, 0),
  body: new THREE.BoxGeometry(0.36, 0.42, 0.24),
  skirt: new THREE.CylinderGeometry(0.17, 0.26, 0.24, 6),
  arm: new THREE.BoxGeometry(0.1, 0.36, 0.1).translate(0, -0.18, 0),
  head: new THREE.IcosahedronGeometry(0.2, 1),
  hair: new THREE.IcosahedronGeometry(0.215, 1),
  eye: new THREE.BoxGeometry(0.04, 0.05, 0.02),
  ball: new THREE.IcosahedronGeometry(0.08, 0),
  book: new THREE.BoxGeometry(0.28, 0.2, 0.05),
  balloon: new THREE.IcosahedronGeometry(0.22, 1),
  string: new THREE.CylinderGeometry(0.008, 0.008, 1, 3).translate(0, 0.5, 0),
};

const r = rng(42);
const pick = (a) => a[Math.floor(r() * a.length)];

export function kid(pose = 'stand', opts = {}) {
  const g = new THREE.Group();
  const skin = mat(pick(SKIN));
  const shirt = mat(opts.shirt || pick(SHIRT));
  const pants = mat(pick(PANTS));
  const hairM = mat(pick(HAIR));

  const legs = [-1, 1].map((s) => {
    const l = new THREE.Mesh(G.leg, pants);
    l.position.set(s * 0.08, 0.4, 0);
    g.add(l);
    return l;
  });
  const body = new THREE.Mesh(G.body, shirt);
  body.position.y = 0.61;
  g.add(body);
  if (r() < 0.4) {
    const sk = new THREE.Mesh(G.skirt, shirt);
    sk.position.y = 0.4;
    g.add(sk);
  }
  const arms = [-1, 1].map((s) => {
    const a = new THREE.Mesh(G.arm, shirt);
    a.position.set(s * 0.24, 0.8, 0);
    g.add(a);
    return a;
  });
  const head = new THREE.Mesh(G.head, skin);
  head.position.y = 1.02;
  g.add(head);
  const hair = new THREE.Mesh(G.hair, hairM);
  hair.position.set(0, 1.09, -0.035);
  hair.scale.set(1, 0.72, 1);
  g.add(hair);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(G.eye, mat('#2b211b'));
    e.position.set(s * 0.07, 1.03, 0.19);
    g.add(e);
  }

  // 手持道具
  let prop = null;
  if (pose === 'read') {
    prop = new THREE.Mesh(G.book, mat(pick(['#e8775a', '#7fb6e6', '#9bc98a'])));
    prop.position.set(0, 0.72, 0.28);
    prop.rotation.x = -0.5;
    g.add(prop);
  }
  if (opts.balloon) {
    const st = new THREE.Mesh(G.string, mat('#ffffff'));
    st.position.set(0.3, 0.5, 0);
    st.scale.y = 1.1;
    const b = new THREE.Mesh(G.balloon, mat(opts.balloon));
    b.position.set(0.3, 1.75, 0);
    g.add(st, b);
    prop = b;
  }
  const balls = [];
  if (pose === 'juggle') {
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(G.ball, mat(['#e8775a', '#f2c46d', '#7fb6e6'][i]));
      g.add(b);
      balls.push(b);
    }
  }

  const phase = r() * 10;
  const [lL, lR] = legs;
  const [aR, aL] = arms; // x<0 是孩子的右手（孩子面向 +z）

  function setStatic() {
    if (pose === 'sit' || pose === 'ride') {
      lL.rotation.x = lR.rotation.x = -1.45;
      g.userData.baseY = -0.38;
      aR.rotation.x = aL.rotation.x = -0.9;
    }
    if (pose === 'ride') {
      aR.rotation.x = aL.rotation.x = 0;
      aR.rotation.z = -2.7;
      aL.rotation.z = 2.7;
    }
    if (pose === 'read') aR.rotation.x = aL.rotation.x = -1.0;
    if (pose === 'juggle') aR.rotation.x = aL.rotation.x = -1.1;
    if (pose === 'wave') aR.rotation.z = -2.6;
    if (pose === 'cheer' || pose === 'jump') {
      aR.rotation.z = -2.7;
      aL.rotation.z = 2.7;
    }
  }
  setStatic();
  const baseY = () => g.userData.baseY ?? 0;
  g.position.y = baseY();

  g.userData.anim = (t, motion) => {
    if (!motion) return;
    const k = t + phase;
    switch (pose) {
      case 'wave':
        aR.rotation.z = -2.6 + Math.sin(k * 7) * 0.45;
        break;
      case 'jump': {
        const j = Math.abs(Math.sin(k * 4.5));
        g.position.y = baseY() + j * 0.4;
        lL.rotation.x = lR.rotation.x = -j * 0.5;
        break;
      }
      case 'ride':
      case 'cheer':
        aR.rotation.z = -2.7 + Math.sin(k * 6) * 0.3;
        aL.rotation.z = 2.7 - Math.sin(k * 6) * 0.3;
        break;
      case 'run': {
        const s = Math.sin(k * 11);
        lL.rotation.x = s * 0.7;
        lR.rotation.x = -s * 0.7;
        aL.rotation.x = -s * 0.7;
        aR.rotation.x = s * 0.7;
        g.position.y = baseY() + Math.abs(Math.cos(k * 11)) * 0.08;
        break;
      }
      case 'sit':
        // 坐著晃腳
        lL.rotation.x = -1.45 + Math.sin(k * 4) * 0.25;
        lR.rotation.x = -1.45 - Math.sin(k * 4) * 0.25;
        break;
      case 'read':
        head.rotation.x = 0.25 + Math.sin(k * 0.8) * 0.08;
        break;
      case 'juggle':
        balls.forEach((b, i) => {
          const p = (k * 1.4 + i / 3) % 1;
          b.position.set(Math.cos(p * Math.PI * 2) * 0.25, 1.35 + Math.sin(p * Math.PI) * 0.55, 0.3);
        });
        break;
      default:
        head.rotation.y = Math.sin(k * 0.7) * 0.4;
    }
    if (opts.balloon && prop) prop.position.x = 0.3 + Math.sin(k * 1.3) * 0.06;
  };
  // 拋球的靜態位置
  balls.forEach((b, i) => b.position.set((i - 1) * 0.2, 1.4 + i * 0.12, 0.3));
  return g;
}

// 在 group 中放一個孩子；回傳孩子以便再調整
function put(parent, list, pose, x, y, z, rotY = 0, scale = 1, opts) {
  const k = kid(pose, opts);
  k.position.x = x;
  k.position.z = z;
  k.position.y += y;
  k.userData.baseY = (k.userData.baseY ?? 0) + y;
  k.rotation.y = rotY;
  k.scale.setScalar(scale);
  parent.add(k);
  list.push(k);
  return k;
}

const FACE_CENTER = (x, z) => Math.atan2(-x, -z); // 面向設施中心

// 依設施類型安排孩子，回傳每幀更新函式
export function addKids(f, obj) {
  const kids = [];
  const extra = [];
  const ud = obj.userData;
  switch (f.type) {
    case 'ticket':
      put(obj, kids, 'jump', 1.8, 0, 2.6, 0.3, 1, { balloon: '#f2a7b8' });
      put(obj, kids, 'wave', -1.6, 0, 3.0, -0.2);
      put(obj, kids, 'stand', 4.2, 0, 2.2, -0.6, 1, { balloon: '#7fb6e6' });
      put(obj, kids, 'cheer', -4.2, 0, 2.4, 0.5);
      break;
    case 'castle':
      put(obj, kids, 'wave', -2.4, 0.8, 2.6, 0.2);
      put(obj, kids, 'cheer', 2.6, 0.8, 2.9, -0.3);
      put(obj, kids, 'jump', -1.8, 0, 6.8, 0.4);
      break;
    case 'kiosk':
      if (f.id === 'health') put(obj, kids, 'sit', 1.7, 0, 1.6, -0.4);
      else put(obj, kids, f.id === 'student' ? 'jump' : 'wave', 1.7, 0, 1.6, -0.5, 1, f.id === 'student' ? { balloon: '#f2c46d' } : undefined);
      break;
    case 'carousel':
      // 騎在木馬上（木馬朝 +x 方向）
      (ud.horses || []).forEach((h, i) => {
        if (i % 3 === 2) return;
        put(h, kids, i % 2 ? 'ride' : 'sit', -0.05, 0.34, 0, Math.PI / 2, 0.72);
      });
      put(obj, kids, 'wave', 3.9, 0, 2.4, 0.9);
      put(obj, kids, 'jump', -3.6, 0, 2.8, -0.6);
      break;
    case 'tent':
      put(obj, kids, 'juggle', 0, 0, 6.2, 0);
      put(obj, kids, 'jump', -1.9, 0, 5.4, 0.3);
      put(obj, kids, 'cheer', 1.9, 0, 5.5, -0.3);
      put(obj, kids, 'sit', 1.2, 0, 7.2, Math.PI + 0.3);
      break;
    case 'train':
      (ud.cars || []).slice(1).forEach((c) => put(c, kids, 'ride', 0, 1.04, 0, Math.PI / 2, 0.6));
      put(obj, kids, 'wave', 4.9, 0.3, 0.6, Math.PI / 2 + 0.6);
      put(obj, kids, 'jump', 1.2, 0.15, 0.9, 0.5);
      break;
    case 'classroom':
      put(obj, kids, 'sit', -4.6, 0.6, 2.9, 0.2);
      put(obj, kids, 'jump', 4.7, 0.6, 3.0, -0.3);
      put(obj, kids, 'wave', 0.4, 0.6, 2.2, 0);
      put(obj, kids, 'run', -2, 0.6, 2.4, Math.PI / 2);
      extra.push((t, m) => {
        if (!m) return;
        const k = kids[3];
        const a = t * 0.9;
        k.position.x = Math.cos(a) * 1.4 - 2;
        k.position.z = Math.sin(a) * 0.6 + 2.6;
        k.rotation.y = -a;
      });
      break;
    case 'ferris':
      put(obj, kids, 'cheer', 2.6, 0.4, 1.5, -0.4);
      put(obj, kids, 'wave', -2.4, 0.4, 1.5, 0.3);
      put(obj, kids, 'stand', 3.4, 0, 3.6, -0.8);
      break;
    case 'newsstand':
      put(obj, kids, 'read', 1.9, 0, 1.7, -0.4);
      put(obj, kids, 'sit', -1.7, 0, 1.9, 0.5);
      {
        const book = new THREE.Mesh(G.book, mat('#f2c46d'));
        book.position.set(0, 0.95, 0.32);
        book.rotation.x = -0.6;
        kids[1].add(book);
      }
      break;
    case 'fountain': {
      // 三個孩子繞著噴泉追逐
      const runners = [0, 1, 2].map(() => put(obj, kids, 'run', 0, 0.08, 0, 0));
      extra.push((t, m) => {
        const base = m ? t * 0.55 : 0;
        runners.forEach((k, i) => {
          const a = base + (i * Math.PI * 2) / 3;
          k.position.x = Math.cos(a) * 3.5;
          k.position.z = Math.sin(a) * 3.5;
          k.rotation.y = -a; // 沿切線方向跑
        });
      });
      put(obj, kids, 'sit', 2.35, 0.6, 0.8, FACE_CENTER(-2.35, -0.8));
      put(obj, kids, 'sit', -2.0, 0.6, 1.3, FACE_CENTER(2.0, -1.3));
      break;
    }
  }
  return (t, motion) => {
    for (const k of kids) k.userData.anim(t, motion);
    for (const e of extra) e(t, motion);
  };
}
