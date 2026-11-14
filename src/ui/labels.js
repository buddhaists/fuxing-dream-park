// 設施名稱標籤：HTML 按鈕投影到 3D 位置（可用鍵盤 Tab 操作、手機好點）。
import * as THREE from 'three';

export function createLabels(container, facilities, objs, onClick) {
  const items = facilities.map((f) => {
    const el = document.createElement('button');
    el.className = 'label';
    el.type = 'button';
    el.innerHTML = `<span class="ico">${f.icon}</span><span class="nm">${f.name}</span><span class="cp">${f.campus}</span>`;
    el.setAttribute('aria-label', `${f.name}：${f.campus}`);
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick(f.id);
    });
    container.appendChild(el);
    const y = objs[f.id]?.userData.labelY ?? 4;
    return { f, el, world: new THREE.Vector3(f.pos[0], y, f.pos[1]) };
  });

  const v = new THREE.Vector3();
  return {
    update(camera, w, h) {
      for (const it of items) {
        v.copy(it.world).project(camera);
        const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
        it.el.style.display = visible ? '' : 'none';
        if (!visible) continue;
        const x = (v.x * 0.5 + 0.5) * w;
        const y = (-v.y * 0.5 + 0.5) * h;
        it.el.style.transform = `translate(-50%,-100%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
        it.el.style.zIndex = String(1000 - Math.round(v.z * 1000));
      }
    },
    setActive(id) {
      items.forEach((it) => it.el.classList.toggle('active', it.f.id === id));
    },
  };
}
