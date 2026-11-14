// 導航路線與無障礙動線的 3D 疊加層。
import * as THREE from 'three';
import { PALETTE as P, mat } from './kit.js';

function emojiSprite(char, bg, size = 1.4) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.font = '72px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText(char, 64, 70);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  s.scale.set(size, size, 1);
  s.renderOrder = 10;
  return s;
}

export function createRouteLayer(scene, graph) {
  const routeGroup = new THREE.Group();
  const a11yGroup = new THREE.Group();
  scene.add(routeGroup, a11yGroup);
  a11yGroup.visible = false;

  // ── 無障礙動線圖層 ──
  const v = (n, lift) => new THREE.Vector3(n.x, n.y + lift, n.z);
  for (const e of graph.edges) {
    const a = v(graph.nodes[e.a], 0.12);
    const b = v(graph.nodes[e.b], 0.12);
    if (e.stairs) {
      a.y = b.y = Math.max(a.y, b.y) + 0.05;
    }
    const len = a.distanceTo(b);
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.05, len),
      mat(e.stairs ? P.stair : P.ramp, { emissive: e.stairs ? '#ff8a3d' : '#3fbf5a' }),
    );
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.lookAt(b);
    a11yGroup.add(m);
    if (e.ramp || e.stairs) {
      const icon = emojiSprite(e.ramp ? '♿' : '⚠', e.ramp ? '#3fa35a' : '#e07a2e', 1.5);
      icon.position.copy(a).add(b).multiplyScalar(0.5).add(new THREE.Vector3(0, 2, 0));
      a11yGroup.add(icon);
    }
  }

  // ── 導航路線 ──
  let curve = null;
  let arrows = [];
  let pin = null;

  function clear() {
    routeGroup.traverse((o) => o.geometry?.dispose());
    routeGroup.clear();
    curve = null;
    arrows = [];
    pin = null;
  }

  function show(route, accessible) {
    clear();
    if (!route) return null;
    const path = new THREE.CurvePath();
    const pts = route.points.map((n) => new THREE.Vector3(n.x, n.y + 0.3, n.z));
    for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
    curve = path;
    const color = accessible ? '#3fbf5a' : '#ff9a3d';
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(path, Math.max(16, Math.ceil(route.length * 3)), 0.22, 6, false),
      mat(color, { emissive: color }),
    );
    routeGroup.add(tube);
    const n = Math.max(4, Math.round(route.length / 4));
    for (let i = 0; i < n; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 6), mat(P.white, { emissive: '#ffffff' }));
      c.userData.k = i / n;
      routeGroup.add(c);
      arrows.push(c);
    }
    pin = new THREE.Group();
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), mat(P.red, { emissive: '#ff5a3a' }));
    head.position.y = 1.4;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1, 6), mat(P.red));
    tip.rotation.x = Math.PI;
    tip.position.y = 0.6;
    pin.add(head, tip);
    pin.position.copy(pts[pts.length - 1]);
    routeGroup.add(pin);
    return path;
  }

  const up = new THREE.Vector3(0, 1, 0);
  return {
    show,
    clear,
    setA11y(on) {
      a11yGroup.visible = on;
    },
    get curve() {
      return curve;
    },
    update(t) {
      if (!curve) return;
      for (const a of arrows) {
        const k = (a.userData.k + t * 0.08) % 1;
        a.position.copy(curve.getPointAt(k));
        a.position.y += 0.35;
        const tan = curve.getTangentAt(k);
        a.quaternion.setFromUnitVectors(up, tan);
      }
      if (pin) pin.children[0].position.y = 1.4 + Math.sin(t * 3) * 0.25;
    },
  };
}
