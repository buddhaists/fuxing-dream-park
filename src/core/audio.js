// 程式即時合成的音樂與音效（Web Audio API，不使用任何音檔）。
// - 背景音樂：玩具音樂盒（原創三拍子搖籃曲，約 20 秒循環）
// - 互動音效：點擊、開啟資訊卡、門票蓋章、開始導航、抵達、小火車汽笛、摩天輪最高點
// - 設施環境音：旋轉木馬風琴、小火車行駛聲、噴泉水聲（依鏡頭距離調整音量）

const N = (m) => 440 * Math.pow(2, (m - 69) / 12);
const CH = {
  C: [48, 52, 55], G: [43, 47, 50], Am: [45, 48, 52], F: [41, 45, 48], Em: [40, 43, 47], Dm: [38, 41, 45],
};
// 每小節三拍：[旋律 [音高, 拍數]...], 和弦
const BOX_SONG = [
  [[[76, 1], [79, 1], [84, 1]], 'C'],
  [[[83, 2], [79, 1]], 'G'],
  [[[81, 1], [79, 1], [76, 1]], 'Am'],
  [[[79, 3]], 'C'],
  [[[77, 1], [81, 1], [84, 1]], 'F'],
  [[[83, 1], [81, 1], [79, 1]], 'G'],
  [[[76, 1], [74, 1], [76, 1]], 'C'],
  [[[74, 3]], 'G'],
  [[[76, 1], [79, 1], [84, 1]], 'C'],
  [[[86, 2], [84, 1]], 'Em'],
  [[[81, 1], [84, 1], [81, 1]], 'F'],
  [[[79, 3]], 'C'],
  [[[77, 1], [76, 1], [74, 1]], 'Dm'],
  [[[79, 1], [77, 1], [74, 1]], 'G'],
  [[[76, 1], [74, 1], [71, 1]], 'G'],
  [[[72, 3]], 'C'],
];
const WALTZ = [72, 76, 79, 79, 77, 76, 74, 77, 81, 81, 79, 77, 76, 79, 84, 83, 81, 79];
const WALTZ_BASS = ['C', 'F', 'G', 'C', 'F', 'G'];

export function createAudio(settings) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();

  // 匯流排：master → (music | sfx | ambient)
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.connect(ctx.destination);
  const master = ctx.createGain();
  master.connect(comp);
  const bus = (v) => {
    const g = ctx.createGain();
    g.gain.value = v;
    g.connect(master);
    return g;
  };
  const musicBus = bus(0.55);
  const sfxBus = bus(0.8);
  const ambBus = bus(0.7);

  // 音樂盒的微微回音
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.3;
  const fb = ctx.createGain();
  fb.gain.value = 0.22;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2600;
  delay.connect(lp).connect(fb).connect(delay);
  lp.connect(musicBus);
  const musicIn = ctx.createGain();
  musicIn.connect(musicBus);
  musicIn.connect(delay);

  function note(out, f, t, d, type = 'sine', v = 0.3, a = 0.005) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + d + 0.05);
  }
  function chime(out, m, t, v = 0.22, d = 1.6) {
    // 音樂盒音色：基音＋快速衰減的高泛音＋微失諧
    note(out, N(m), t, d, 'sine', v);
    note(out, N(m) * 2.005, t, d * 0.5, 'sine', v * 0.18);
    note(out, N(m) * 4, t, 0.25, 'sine', v * 0.12);
  }
  let noiseBuf = null;
  function noise() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  function burst(out, t, len, freq, v, type = 'bandpass', q = 1) {
    const s = ctx.createBufferSource();
    s.buffer = noise();
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f).connect(g).connect(out);
    s.start(t, Math.random());
    s.stop(t + len + 0.02);
  }

  // ── 前瞻排程器（避免 setTimeout 抖動） ──
  function sequencer(step) {
    let next = 0;
    let i = 0;
    let running = false;
    return {
      tick() {
        if (!running) return;
        while (next < ctx.currentTime + 0.35) {
          const dur = step(i, next);
          next += dur;
          i++;
        }
      },
      start() {
        if (running) return;
        running = true;
        next = ctx.currentTime + 0.08;
        i = 0;
      },
      stop() {
        running = false;
      },
      get running() {
        return running;
      },
    };
  }

  // 背景音樂：把歌曲展開成每拍事件
  const BEAT = 0.42;
  const musicSeq = sequencer((i, t) => {
    const totalBeats = BOX_SONG.length * 3 + 3; // 結尾留一小節空白
    const beat = i % totalBeats;
    const bar = Math.floor(beat / 3);
    const inBar = beat % 3;
    if (bar < BOX_SONG.length) {
      const [mel, chord] = BOX_SONG[bar];
      let acc = 0;
      for (const [m, len] of mel) {
        if (acc === inBar) chime(musicIn, m, t, 0.2, 1.2 + len * 0.4);
        acc += len;
      }
      const c = CH[chord];
      chime(musicIn, [c[0], c[2], c[1]][inBar] + 12, t, inBar === 0 ? 0.1 : 0.06, 1.1);
    }
    return BEAT;
  });

  // ── 環境音 ──
  const amb = {};
  function ambient(id) {
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(ambBus);
    amb[id] = { gain: g, level: 0 };
    return g;
  }
  // 旋轉木馬風琴（三拍子圓舞曲）
  const carOut = ambient('carousel');
  const carSeq = sequencer((i, t) => {
    const b = 0.34;
    const bar = Math.floor(i / 3) % WALTZ_BASS.length;
    const c = CH[WALTZ_BASS[bar]];
    if (i % 3 === 0) note(carOut, N(c[0]), t, 0.3, 'triangle', 0.2);
    else {
      note(carOut, N(c[1] + 12), t, 0.18, 'square', 0.04);
      note(carOut, N(c[2] + 12), t, 0.18, 'square', 0.04);
    }
    const m = WALTZ[i % WALTZ.length];
    note(carOut, N(m), t, b * 0.95, 'square', 0.05, 0.01);
    note(carOut, N(m), t, b * 0.95, 'triangle', 0.1, 0.01);
    return b;
  });
  // 小火車：嚓嚓行駛聲＋每隔一段時間鳴笛
  const trainOut = ambient('train');
  const trainSeq = sequencer((i, t) => {
    burst(trainOut, t, 0.12, i % 2 ? 900 : 1300, i % 4 === 0 ? 0.35 : 0.2, 'bandpass', 1.2);
    if (i % 48 === 0) whistle(trainOut, t + 0.1, 0.7);
    return 0.22;
  });
  // 噴泉：持續水聲＋隨機水滴
  const fountOut = ambient('fountain');
  let waterSrc = null;
  function startWater() {
    if (waterSrc) return;
    waterSrc = ctx.createBufferSource();
    waterSrc.buffer = noise();
    waterSrc.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1400;
    bp.Q.value = 0.5;
    const g = ctx.createGain();
    g.gain.value = 0.18;
    waterSrc.connect(bp).connect(g).connect(fountOut);
    waterSrc.start();
  }
  const dropSeq = sequencer((i, t) => {
    const f = 1500 + Math.random() * 1400;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.05);
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(g).connect(fountOut);
    o.start(t);
    o.stop(t + 0.1);
    return 0.12 + Math.random() * 0.35;
  });
  const ambSeqs = { carousel: [carSeq], train: [trainSeq], fountain: [dropSeq] };

  function whistle(out, t, v = 1) {
    [0, 0.45].forEach((st) =>
      [N(69), N(73), N(76)].forEach((f) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const flt = ctx.createBiquadFilter();
        const lfo = ctx.createOscillator();
        const lg = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.value = f;
        lfo.frequency.value = 6;
        lg.gain.value = 4;
        lfo.connect(lg).connect(o.frequency);
        flt.type = 'lowpass';
        flt.frequency.value = 1600;
        const s = t + st;
        g.gain.setValueAtTime(0, s);
        g.gain.linearRampToValueAtTime(0.06 * v, s + 0.04);
        g.gain.setValueAtTime(0.06 * v, s + 0.3);
        g.gain.exponentialRampToValueAtTime(0.0001, s + 0.42);
        o.connect(flt).connect(g).connect(out);
        o.start(s);
        lfo.start(s);
        o.stop(s + 0.45);
        lfo.stop(s + 0.45);
      }),
    );
  }

  // ── 互動音效 ──
  const SFX = {
    click(t) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(700, t);
      o.frequency.exponentialRampToValueAtTime(1400, t + 0.06);
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(g).connect(sfxBus);
      o.start(t);
      o.stop(t + 0.12);
    },
    panel(t) {
      note(sfxBus, N(84), t, 0.4, 'sine', 0.2);
      note(sfxBus, N(91), t + 0.09, 0.6, 'sine', 0.2);
    },
    stamp(t) {
      burst(sfxBus, t, 0.15, 1200, 0.5, 'lowpass', 0.7);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.2);
      g.gain.setValueAtTime(0.55, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g).connect(sfxBus);
      o.start(t);
      o.stop(t + 0.3);
      note(sfxBus, N(88), t + 0.18, 0.5, 'sine', 0.14);
    },
    nav(t) {
      [72, 76, 79, 84].forEach((m, i) => note(sfxBus, N(m), t + i * 0.08, 0.4, 'triangle', 0.22));
    },
    arrive(t) {
      note(sfxBus, N(88), t, 1.6, 'sine', 0.26);
      note(sfxBus, N(88) * 2.76, t, 0.6, 'sine', 0.05);
      note(sfxBus, N(95), t + 0.15, 1.4, 'sine', 0.18);
    },
    whistle(t) {
      whistle(sfxBus, t, 1);
    },
    top(t) {
      [79, 84, 88, 91, 96, 100, 103].forEach((m, i) => note(sfxBus, N(m), t + i * 0.06, 0.8, 'sine', 0.13));
    },
  };

  // ── 狀態與解鎖 ──
  let unlocked = false;
  const state = () => ({ on: settings.sound, music: settings.music, sfx: settings.sfx, amb: settings.ambient });

  function applyState() {
    const s = state();
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(s.on ? (settings.volume ?? 70) / 100 : 0, t, 0.08);
    if (s.on && s.music && unlocked) musicSeq.start();
    else musicSeq.stop();
    if (s.on && s.amb && unlocked) startWater();
  }

  function unlock() {
    if (unlocked && ctx.state === 'running') return;
    ctx.resume().then(() => {
      unlocked = ctx.state === 'running';
      applyState();
    });
  }
  // 進站自動播放：瀏覽器若阻擋，就在使用者第一次觸碰／按鍵時開始
  const gesture = () => {
    unlock();
    if (ctx.state === 'running') {
      ['pointerdown', 'keydown', 'touchend'].forEach((e) => window.removeEventListener(e, gesture, true));
    }
  };
  ['pointerdown', 'keydown', 'touchend'].forEach((e) => window.addEventListener(e, gesture, true));
  if (settings.sound && settings.autoplay) unlock();

  // 切到其他分頁時暫停，回來時繼續
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) ctx.suspend();
    else if (unlocked) ctx.resume();
  });

  // 排程器心跳
  setInterval(() => {
    if (ctx.state !== 'running') return;
    musicSeq.tick();
    for (const id in ambSeqs) ambSeqs[id].forEach((s) => s.tick());
  }, 60);

  return {
    get on() {
      return settings.sound;
    },
    get running() {
      return ctx.state === 'running';
    },
    applyState,
    unlock,
    play(name) {
      if (!settings.sound || !settings.sfx || !unlocked || !SFX[name]) return;
      SFX[name](ctx.currentTime + 0.01);
    },
    // levels: { carousel: 0..1, train: 0..1, fountain: 0..1 }
    setAmbient(levels) {
      const allow = settings.sound && settings.ambient && unlocked;
      let maxLv = 0;
      for (const id in amb) {
        const lv = allow ? levels[id] || 0 : 0;
        maxLv = Math.max(maxLv, id === 'fountain' ? lv * 0.3 : lv);
        if (Math.abs(lv - amb[id].level) > 0.01) {
          amb[id].gain.gain.setTargetAtTime(lv, ctx.currentTime, 0.25);
          amb[id].level = lv;
        }
        const seqs = ambSeqs[id];
        if (lv > 0.02) seqs.forEach((s) => s.start());
        else if (amb[id].level < 0.01) seqs.forEach((s) => s.stop());
      }
      // 靠近旋轉木馬／火車時，背景音樂自動降低，避免兩段音樂打架
      musicBus.gain.setTargetAtTime(0.55 * (1 - maxLv * 0.85), ctx.currentTime, 0.3);
    },
  };
}
