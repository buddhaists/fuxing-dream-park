// 鏡頭系統：限制範圍的軌道控制、平滑飛行、路線跟隨、摩天輪搭乘。
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const VIEWS = {
  intro: { pos: [0, 120, 150], target: [0, 0, 0] },
  overview: { pos: [0, 46, 58], target: [0, 0, 1] },
};

export function createCameraRig(camera, dom) {
  const controls = new OrbitControls(camera, dom);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 12;
  controls.maxDistance = 95;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = 1.2; // 不讓鏡頭低到看見地台底部
  controls.screenSpacePanning = false;
  controls.panSpeed = 0.8;
  controls.rotateSpeed = 0.7;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

  controls.addEventListener('change', () => {
    const t = controls.target;
    const r = Math.hypot(t.x, t.z);
    if (r > 26) {
      t.x *= 26 / r;
      t.z *= 26 / r;
    }
    t.y = THREE.MathUtils.clamp(t.y, 0, 8);
  });

  let tween = null;
  let mode = 'orbit'; // orbit | fly | follow | ride
  let follow = null;
  let ride = null;
  let reduceMotion = false;

  // 目前聚焦的設施中心（鏡頭目標點會為了避開面板而偏移，環境音要用真正的設施位置）
  let focusCenter = null;
  controls.addEventListener('start', () => (focusCenter = null));

  function flyTo(pos, target, duration = 1.6, center = null) {
    focusCenter = center;
    return new Promise((resolve) => {
      if (reduceMotion) duration = Math.min(duration, 0.35);
      tween = {
        p0: camera.position.clone(),
        t0: controls.target.clone(),
        p1: new THREE.Vector3(...pos),
        t1: new THREE.Vector3(...target),
        k: 0,
        d: duration,
        resolve,
      };
      mode = 'fly';
      controls.enabled = false;
    });
  }

  function focusFacility(f, height = 3) {
    const [x, z] = f.pos;
    const big = { castle: 1.75, ferris: 1.9, classroom: 1.5, tent: 1.35, ticket: 1.3 }[f.type] || 1;
    // 一律從南方（正面）斜上方看向設施，方向一致、不易迷失
    // 資訊面板會遮住畫面一側：桌機往右偏、手機往下偏，讓設施落在可見區域
    const wide = window.innerWidth > 760;
    const m = wide ? 1 : 1.5; // 直式手機視野窄，拉遠一些
    const ox = wide ? 5 * big : 0;
    const oz = wide ? 0 : 10 * big;
    return flyTo([x + ox + 2, (14 * big + height) * m, z + oz + 21 * big * m], [x + ox, height * 0.6, z + oz], 1.6, { x, z });
  }

  function followCurve(curve, length, onDone) {
    controls.enabled = false;
    mode = 'follow';
    follow = { curve, k: 0, speed: reduceMotion ? 1 : 1 / Math.max(3, length / 5.5), onDone };
  }

  function startRide(ferrisObj, onTop, onDone) {
    controls.enabled = false;
    mode = 'ride';
    const { gondolas, wheel } = ferrisObj.userData;
    // 選目前最低的車廂
    let best = gondolas[0];
    let low = Infinity;
    const wp = new THREE.Vector3();
    for (const g of gondolas) {
      g.getWorldPosition(wp);
      if (wp.y < low) {
        low = wp.y;
        best = g;
      }
    }
    ferrisObj.userData.riding = true;
    ferrisObj.userData.speed = (Math.PI * 2) / 30;
    ride = {
      obj: ferrisObj, gondola: best, start: wheel.rotation.z, paused: 0, toppedOut: false, onTop, onDone,
      look: new THREE.Vector3(-2, 0, 3), baseFov: camera.fov, fov: Math.max(camera.fov, 50),
    };
  }

  function stopRide() {
    if (!ride) return;
    camera.fov = ride.baseFov;
    camera.updateProjectionMatrix();
    ride.obj.userData.riding = false;
    ride.obj.userData.speed = 0.12;
    ride = null;
    mode = 'orbit';
    return flyTo(VIEWS.overview.pos, VIEWS.overview.target, 1.8);
  }

  const tmp = new THREE.Vector3();
  function update(dt) {
    if (mode === 'fly' && tween) {
      tween.k = Math.min(1, tween.k + dt / tween.d);
      const e = ease(tween.k);
      camera.position.lerpVectors(tween.p0, tween.p1, e);
      controls.target.lerpVectors(tween.t0, tween.t1, e);
      camera.lookAt(controls.target);
      if (tween.k >= 1) {
        const r = tween.resolve;
        tween = null;
        mode = 'orbit';
        controls.enabled = true;
        controls.update();
        r();
      }
      return;
    }
    if (mode === 'follow' && follow) {
      follow.k = Math.min(1, follow.k + dt * follow.speed);
      const p = follow.curve.getPointAt(ease(follow.k));
      tmp.set(p.x, p.y + 13, p.z + 14);
      camera.position.lerp(tmp, Math.min(1, dt * 3));
      controls.target.lerp(p, Math.min(1, dt * 4));
      camera.lookAt(controls.target);
      if (follow.k >= 1) {
        const cb = follow.onDone;
        follow = null;
        mode = 'orbit';
        controls.enabled = true;
        cb?.();
      }
      return;
    }
    if (mode === 'ride' && ride) {
      const { obj, gondola } = ride;
      const turned = obj.userData.wheel.rotation.z - ride.start;
      // 到最高點（轉半圈）暫停 3 秒
      if (!ride.toppedOut && turned >= Math.PI) {
        ride.toppedOut = true;
        ride.paused = 3.5;
        obj.userData.speed = 0;
        ride.onTop?.(true);
      }
      if (ride.paused > 0) {
        ride.paused -= dt;
        if (ride.paused <= 0) {
          obj.userData.speed = (Math.PI * 2) / 30;
          ride.onTop?.(false);
        }
      }
      gondola.getWorldPosition(tmp);
      // 誇張化高度：越往上越高，最高點約 30 單位，才看得到全區
      const lift = Math.max(0, tmp.y - 2) * 1.35;
      camera.position.set(tmp.x + 1, tmp.y + lift, tmp.z + 3 + lift * 0.4);
      camera.fov += (ride.fov - camera.fov) * Math.min(1, dt * 2);
      camera.updateProjectionMatrix();
      camera.lookAt(ride.look);
      if (turned >= Math.PI * 2) {
        const cb = ride.onDone;
        stopRide();
        cb?.();
      }
      return;
    }
    controls.update();
  }

  return {
    controls,
    flyTo,
    focusFacility,
    followCurve,
    startRide,
    stopRide,
    update,
    get mode() {
      return mode;
    },
    get focusCenter() {
      return focusCenter;
    },
    cancelFollow() {
      if (mode === 'follow') {
        follow = null;
        mode = 'orbit';
        controls.enabled = true;
      }
    },
    setReduceMotion(v) {
      reduceMotion = v;
    },
  };
}
