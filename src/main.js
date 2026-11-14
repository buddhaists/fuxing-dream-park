import * as THREE from 'three';
import './style.css';
import data from './data/campus.json';
import ui from './data/ui.json';
import { buildGraph, findRoute, describeRoute } from './core/graph.js';
import { loadSettings, saveSettings, detectTier, hasWebGL } from './core/settings.js';
import { buildWorld } from './scene/world.js';
import { createRouteLayer } from './scene/routes.js';
import { createCameraRig, VIEWS } from './scene/cameraRig.js';
import { createPostFX } from './scene/postfx.js';
import { allMaterials } from './scene/kit.js';
import { createLabels } from './ui/labels.js';
import { createUI } from './ui/ui.js';

if (!hasWebGL()) {
  location.replace('text.html?nowebgl=1');
  throw new Error('WebGL unavailable');
}

const settings = loadSettings();
const graph = buildGraph(data.paths);
const byId = Object.fromEntries(data.facilities.map((f) => [f.id, f]));
let tier = settings.quality === 'auto' ? detectTier() : settings.quality;

// ── Renderer ──
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 400);
camera.position.set(...VIEWS.intro.pos);

const world = buildWorld(scene, data, graph, tier);
const routes = createRouteLayer(scene, graph);
const rig = createCameraRig(camera, canvas);
rig.controls.target.set(...VIEWS.intro.target);
const post = createPostFX(renderer, scene, camera);
const labels = createLabels(document.getElementById('labels'), data.facilities, world.facilityObjs, (id) => focus(id));

let usePost = false;
function applySettings() {
  saveSettings(settings);
  tier = settings.quality === 'auto' ? (tier === 'low' ? 'low' : detectTier()) : settings.quality;
  const high = tier === 'high';
  renderer.shadowMap.enabled = high;
  world.sun.castShadow = high;
  allMaterials().forEach((m) => (m.needsUpdate = true));
  scene.traverse((o) => o.material && !Array.isArray(o.material) && (o.material.needsUpdate = true));
  usePost = high && settings.tiltShift;
  document.body.classList.toggle('no-labels', !settings.labels);
  rig.setReduceMotion(settings.reduceMotion);
  resize();
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, tier === 'high' ? 2 : 1.25);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // 直式手機畫面拉遠一點，確保看得到全區
  camera.fov = w < h ? 44 : 32;
  camera.updateProjectionMatrix();
  post.resize(w, h, dpr);
}
window.addEventListener('resize', resize);

// ── 互動 ──
let a11yOn = false;
let selected = null;

function focus(id) {
  const f = byId[id];
  if (!f) return;
  if (rig.mode === 'ride') return;
  rig.cancelFollow();
  selected = id;
  labels.setActive(id);
  rig.focusFacility(f);
  view.openFacility(id);
}

function navigate(from, to, accessible, follow) {
  const fa = byId[from];
  const fb = byId[to];
  const route = findRoute(graph, fa.node, fb.node, { accessible });
  if (!route) return null;
  const curve = routes.show(route, accessible);
  labels.setActive(to);
  if (route.ids.length < 2) {
    rig.focusFacility(fb);
  } else if (follow && !settings.reduceMotion) {
    const start = route.points[0];
    rig.flyTo([start.x, start.y + 13, start.z + 14], [start.x, start.y, start.z], 1.2).then(() =>
      rig.followCurve(curve, route.length, () => rig.focusFacility(fb)),
    );
  } else {
    // 不跟隨：拉到可以看見整條路線的高度
    const xs = route.points.map((p) => p.x);
    const zs = route.points.map((p) => p.z);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
    // 面板在右側（桌機）或下方（手機），把路線推到可見區域
    const wide = window.innerWidth > 760;
    const ox = wide ? 6 + span * 0.35 : 0;
    const oz = wide ? 0 : 6 + span * 0.3;
    rig.flyTo([cx + ox, 20 + span * 1.2, cz + oz + 18 + span], [cx + ox, 0, cz + oz]);
  }
  return { route, steps: describeRoute(graph, route) };
}

function toggleA11y(force) {
  a11yOn = force ?? !a11yOn;
  routes.setA11y(a11yOn);
  view.setToolActive('a11y', a11yOn);
  document.getElementById('legend').hidden = !a11yOn;
  if (a11yOn) rig.flyTo([0, 52, 46], [0, 0, -1]);
}

const rideOverlay = document.getElementById('rideOverlay');
function ride() {
  if (rig.mode === 'ride') return;
  view.closePanel();
  routes.clear();
  rig.cancelFollow();
  const f = byId.ferris;
  rig.focusFacility(f).then(() => {
    rideOverlay.hidden = false;
    document.body.classList.add('riding');
    view.setToolActive('ride', true);
    rig.startRide(
      world.facilityObjs.ferris,
      (top) => document.body.classList.toggle('topview', top),
      endRide,
    );
  });
}
function endRide() {
  rideOverlay.hidden = true;
  document.body.classList.remove('riding', 'topview');
  view.setToolActive('ride', false);
}
document.getElementById('rideExit').addEventListener('click', () => {
  rig.stopRide();
  endRide();
});
document.getElementById('rideExit').textContent = ui.rideExit;
document.getElementById('rideHint').textContent = ui.rideHint;

function home() {
  if (rig.mode === 'ride') {
    rig.stopRide();
    endRide();
  }
  rig.cancelFollow();
  routes.clear();
  labels.setActive(null);
  view.closePanel();
  rig.flyTo(VIEWS.overview.pos, VIEWS.overview.target);
}

const view = createUI({
  data,
  ui,
  settings,
  actions: {
    home,
    focus,
    navigate,
    ride,
    toggleA11y: () => toggleA11y(),
    applySettings,
    saveSettings: () => saveSettings(settings),
    onPanelClose: () => labels.setActive(null),
  },
});

// 點擊 3D 物件（拖曳不算點擊）
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let down = null;
canvas.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
  down = null;
  if (rig.mode === 'ride') return;
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(Object.values(world.facilityObjs), true)[0];
  const id = hit?.object.userData.facilityId;
  if (id) focus(id);
});

// ── 主迴圈＋自動降級 ──
const clock = new THREE.Clock();
let t = 0;
let fpsAcc = 0;
let fpsFrames = 0;
let fpsChecks = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  t += dt;
  const motion = !settings.reduceMotion;
  world.update(t, dt, motion);
  routes.update(t);
  rig.update(dt);
  if (usePost) post.render();
  else renderer.render(scene, camera);
  labels.update(camera, window.innerWidth, window.innerHeight);

  // 前幾秒偵測幀率，太低就自動切換省電畫質
  if (settings.quality === 'auto' && tier === 'high' && fpsChecks < 4 && t > 2) {
    fpsAcc += dt;
    fpsFrames++;
    if (fpsAcc > 2) {
      const fps = fpsFrames / fpsAcc;
      fpsAcc = fpsFrames = 0;
      fpsChecks++;
      if (fps < 28) {
        tier = 'low';
        applySettings();
        view.toast(ui.toastFallbackLow);
        fpsChecks = 99;
      }
    }
  }
  requestAnimationFrame(frame);
}

applySettings();
const loadingEl = document.getElementById('loading');
loadingEl.classList.add('done');
setTimeout(() => loadingEl.remove(), 800);
requestAnimationFrame(frame);

// 開場鏡頭：從高空推近，再開啟門票問答
rig.flyTo(VIEWS.overview.pos, VIEWS.overview.target, settings.reduceMotion ? 0.3 : 3.2).then(() => {
  if (!settings.quizSeen) {
    settings.quizSeen = true;
    saveSettings(settings);
    view.openQuiz();
  }
});

// 供除錯使用
window.__park = { rig, camera, world, scene };
