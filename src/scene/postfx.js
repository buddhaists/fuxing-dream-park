// 移軸模糊（tilt-shift）後處理：畫面上下模糊、中央清晰，營造微縮模型感。
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { HorizontalTiltShiftShader } from 'three/addons/shaders/HorizontalTiltShiftShader.js';
import { VerticalTiltShiftShader } from 'three/addons/shaders/VerticalTiltShiftShader.js';

export function createPostFX(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const passes = [];
  for (let i = 0; i < 2; i++) {
    const h = new ShaderPass(HorizontalTiltShiftShader);
    const v = new ShaderPass(VerticalTiltShiftShader);
    h.uniforms.r.value = v.uniforms.r.value = 0.5; // 對焦帶位於畫面中央
    composer.addPass(h);
    composer.addPass(v);
    passes.push([h, v]);
  }
  composer.addPass(new OutputPass());

  let strength = 2.2;
  function resize(w, h, dpr) {
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    passes.forEach(([hp, vp], i) => {
      const s = strength * (i + 1) * 0.6;
      hp.uniforms.h.value = s / (w * dpr);
      vp.uniforms.v.value = s / (h * dpr);
    });
  }
  return {
    composer,
    resize,
    render() {
      composer.render();
    },
  };
}
