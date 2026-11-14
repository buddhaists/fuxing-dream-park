// 使用者設定（僅存於本機瀏覽器）與裝置能力偵測。
const KEY = 'fsps-dream-park-settings';

const defaults = {
  quality: 'auto',
  tiltShift: true,
  reduceMotion: false,
  labels: true,
  accessibleRoute: false,
  quizSeen: false,
  sound: true, // 總開關（右上角喇叭）
  music: true,
  sfx: true,
  ambient: true,
  autoplay: true,
  volume: 70,
};

export function loadSettings() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    saved = {};
  }
  const s = { ...defaults, ...saved };
  try {
    if (!('reduceMotion' in saved) && matchMedia('(prefers-reduced-motion: reduce)').matches) s.reduceMotion = true;
  } catch {}
  return s;
}

export function saveSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export function detectTier() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const weakCPU = (navigator.hardwareConcurrency || 4) <= 4;
  return coarse || small || weakCPU ? 'low' : 'high';
}

export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}
