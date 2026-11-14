// 低多邊形「玩具積木」工具箱：共用材質與基本幾何。
import * as THREE from 'three';

export const PALETTE = {
  cream: '#fff4e0',
  sand: '#ecd9b4',
  wood: '#b98256',
  woodDark: '#8a5a3a',
  grass: '#9cc96b',
  grassDark: '#7fb05a',
  soil: '#a8754d',
  stone: '#e6d6bd',
  red: '#e8775a',
  coral: '#f29a7c',
  yellow: '#f2c46d',
  mint: '#9bc98a',
  sky: '#7fb6e6',
  teal: '#5aa6a0',
  pink: '#f2a7b8',
  purple: '#b58ad9',
  white: '#fffaf2',
  dark: '#5b4636',
  window: '#ffe9a8',
  water: '#8fd0e8',
  stair: '#e3a25c',
  ramp: '#7dc77a',
};

const cache = new Map();
export function mat(color, { emissive = null, opacity = 1, roughness = 0.85 } = {}) {
  const key = `${color}|${emissive}|${opacity}|${roughness}`;
  if (!cache.has(key)) {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: 0,
      flatShading: true,
      transparent: opacity < 1,
      opacity,
    });
    if (emissive) {
      m.emissive = new THREE.Color(emissive);
      m.emissiveIntensity = 0.6;
    }
    cache.set(key, m);
  }
  return cache.get(key);
}

export function allMaterials() {
  return [...cache.values()];
}

function place(mesh, x = 0, y = 0, z = 0) {
  mesh.position.set(x, y, z);
  return mesh;
}

export const box = (w, h, d, color, x, y, z) =>
  place(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color)), x, y, z);

export const cyl = (rt, rb, h, seg, color, x, y, z) =>
  place(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color)), x, y, z);

export const cone = (r, h, seg, color, x, y, z) =>
  place(new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(color)), x, y, z);

export const ball = (r, color, x, y, z, detail = 0) =>
  place(new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), mat(color)), x, y, z);

// 交錯條紋的圓錐/圓柱（帳篷、旋轉木馬頂棚）：以頂點色上色。
export function striped(geometry, colors, segments) {
  const g = geometry.toNonIndexed();
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    let ax = 0;
    let az = 0;
    for (let k = 0; k < 3; k++) {
      ax += pos.getX(i + k);
      az += pos.getZ(i + k);
    }
    const ang = (Math.atan2(az, ax) + Math.PI * 2) % (Math.PI * 2);
    const idx = Math.floor((ang / (Math.PI * 2)) * segments) % colors.length;
    c.set(colors[idx]);
    for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 });
  return new THREE.Mesh(g, m);
}

// 以 Canvas 繪製文字的招牌貼圖（程式產生，非外部檔）。
export function signTexture(text, { bg = PALETTE.cream, fg = PALETTE.dark, w = 512, h = 128 } = {}) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.fillStyle = fg;
  ctx.font = `bold ${Math.floor(h * 0.48)}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 4);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function sign(text, w, h, opts) {
  const m = new THREE.MeshStandardMaterial({ map: signTexture(text, opts), roughness: 0.9 });
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.15), [mat(PALETTE.wood), mat(PALETTE.wood), mat(PALETTE.wood), mat(PALETTE.wood), m, mat(PALETTE.wood)]);
}

// 簡單的可重現亂數（讓每次載入的樹木位置一樣）
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
