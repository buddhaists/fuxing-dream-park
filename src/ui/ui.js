// 介面層：工具列、資訊卡、報到說明、導航面板、設定、門票問答。
// 所有文字來自 data/campus.json 與 data/ui.json。

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const $ = (sel) => document.querySelector(sel);

export function createUI({ data, ui, actions, settings }) {
  const panel = $('#panel');
  const panelBody = $('#panelBody');
  const modal = $('#modal');
  const modalBody = $('#modalBody');
  const toastEl = $('#toast');
  const byId = Object.fromEntries(data.facilities.map((f) => [f.id, f]));

  // ── 頂部標題與工具列 ──
  $('#title').innerHTML = `<strong>${esc(data.school.parkName)}</strong><small>${esc(data.school.subtitle)}</small>`;
  $('#textLink').textContent = ui.btnText;
  const tools = [
    ['home', ui.btnHome, () => actions.home()],
    ['quiz', ui.btnQuiz, () => openQuiz()],
    ['register', ui.btnRegister, () => openRegistration()],
    ['nav', ui.btnNav, () => openNav()],
    ['ride', ui.btnRide, () => actions.ride()],
    ['a11y', ui.btnA11y, () => actions.toggleA11y()],
    ['resources', ui.btnResources, () => openResources()],
    ['settings', ui.btnSettings, () => openSettings()],
  ];
  const bar = $('#toolbar');
  for (const [id, label, fn] of tools) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.tool = id;
    b.textContent = label;
    b.addEventListener('click', fn);
    bar.appendChild(b);
  }
  const isTouch = matchMedia('(pointer: coarse)').matches;
  $('#hint').textContent = isTouch ? ui.hintTouch : ui.hint;
  $('#legend').textContent = ui.a11yLegend;

  // ── 面板 ──
  let lastFocus = null;
  function openPanel(html, cls = '') {
    lastFocus = document.activeElement;
    panelBody.innerHTML = html;
    panel.className = `panel ${cls}`;
    panel.hidden = false;
    panel.querySelector('.panel-close')?.focus();
  }
  function closePanel() {
    if (panel.hidden) return;
    panel.hidden = true;
    actions.onPanelClose?.();
    lastFocus?.focus?.();
  }
  panel.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act;
    const arg = t.dataset.arg;
    if (act === 'close') closePanel();
    if (act === 'nav') openNav(arg);
    if (act === 'quiz') openQuiz();
    if (act === 'registration') openRegistration();
    if (act === 'ride') actions.ride();
    if (act === 'focus') actions.focus(arg);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!modal.hidden) closeModal();
      else closePanel();
    }
  });

  const closeBtn = `<button type="button" class="panel-close" data-act="close" aria-label="${esc(ui.close)}">✕</button>`;
  const actionBtn = { quiz: ui.cardQuiz, registration: ui.cardRegister, ride: ui.cardRide };

  function openFacility(id) {
    const f = byId[id];
    if (!f) return;
    const links = (f.links || []).map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">🔗 ${esc(l.label)}</a>`).join('');
    const extra = (f.actions || []).map((a) => `<button type="button" class="btn" data-act="${a}">${esc(actionBtn[a])}</button>`).join('');
    openPanel(`
      ${closeBtn}
      <div class="card-head" style="--accent:${esc(f.color)}">
        <span class="big-ico">${f.icon}</span>
        <div><h2>${esc(f.name)}</h2><p class="campus">${esc(f.campus)}</p></div>
      </div>
      <p>${esc(f.desc)}</p>
      <ul class="details">${f.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
      ${f.a11y ? `<p class="a11y-note">♿ ${esc(f.a11y)}</p>` : ''}
      ${links ? `<div class="links">${links}</div>` : ''}
      <div class="btns">
        ${f.id !== 'gate' ? `<button type="button" class="btn primary" data-act="nav" data-arg="${f.id}">${esc(ui.cardNavigate)}</button>` : ''}
        ${extra}
      </div>`);
  }

  function openRegistration() {
    const r = data.registration;
    const s = data.school;
    openPanel(`
      ${closeBtn}
      <h2>📝 ${esc(r.title)}</h2>
      <p>${esc(r.intro)}</p>
      ${r.methods
        .map(
          (m) => `<section class="method">
            <h3>${m.icon} ${esc(m.name)}</h3>
            <ol>${m.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
            <p class="deadline">⏰ ${esc(m.deadline)}</p>
            ${m.link ? `<a href="${esc(m.link.url)}" target="_blank" rel="noopener">🔗 ${esc(m.link.label)}</a>` : ''}
          </section>`,
        )
        .join('')}
      <p>👶 ${esc(r.eligibility)}</p>
      <p>📍 ${esc(s.address)}<br>☎️ ${esc(s.phone)}</p>
      <p class="notice">${esc(s.notice)}</p>
      <div class="btns"><button type="button" class="btn primary" data-act="nav" data-arg="academic">${esc(ui.cardNavigate)}（教務處）</button></div>`);
  }

  function openResources() {
    const list = data.school.resources || [];
    openPanel(`
      ${closeBtn}
      <h2>🌐 ${esc(ui.resourcesTitle)}</h2>
      <p>${esc(ui.resourcesIntro)}</p>
      ${list
        .map(
          (r) => `<section class="resource">
            <span class="big-ico">${r.icon}</span>
            <div>
              <h3>${esc(r.label)}</h3>
              <p>${esc(r.desc)}</p>
              <div class="btns">
                <a class="btn primary" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(ui.resourceOpen)}</a>
                ${r.facility && byId[r.facility] ? `<button type="button" class="btn" data-act="focus" data-arg="${esc(r.facility)}">${byId[r.facility].icon} ${esc(ui.resourceShow)}</button>` : ''}
              </div>
            </div>
          </section>`,
        )
        .join('')}`);
  }

  function facilityOptions(sel) {
    return data.facilities.map((f) => `<option value="${f.id}" ${f.id === sel ? 'selected' : ''}>${f.icon} ${esc(f.name)}｜${esc(f.campus)}</option>`).join('');
  }

  function openNav(toId = 'academic', fromId = 'gate') {
    openPanel(`
      ${closeBtn}
      <h2>🧭 ${esc(ui.navTitle)}</h2>
      <label class="field">${esc(ui.navFrom)}<select id="navFrom">${facilityOptions(fromId)}</select></label>
      <label class="field">${esc(ui.navTo)}<select id="navTo">${facilityOptions(toId)}</select></label>
      <label class="check"><input type="checkbox" id="navAcc" ${settings.accessibleRoute ? 'checked' : ''}> ♿ ${esc(ui.navAccessible)}</label>
      <label class="check"><input type="checkbox" id="navFollow" ${settings.reduceMotion ? '' : 'checked'}> 🎥 ${esc(ui.navFollow)}</label>
      <div class="btns"><button type="button" class="btn primary" id="navGo">${esc(ui.navGo)}</button></div>
      <div id="navResult" aria-live="polite"></div>`);
    const run = () => {
      const from = $('#navFrom').value;
      const to = $('#navTo').value;
      const acc = $('#navAcc').checked;
      settings.accessibleRoute = acc;
      actions.saveSettings();
      const res = actions.navigate(from, to, acc, $('#navFollow').checked);
      const out = $('#navResult');
      if (!res) {
        out.innerHTML = `<p class="warn">${esc(ui.navNone)}</p>`;
        return;
      }
      const msg = res.route.hasStairs
        ? `<p class="warn">⚠️ ${esc(ui.navStairsWarn)}</p>`
        : res.route.hasRamp
          ? `<p class="ok">♿ ${esc(ui.navAccessibleOk)}</p>`
          : '';
      out.innerHTML = `${msg}<h3>${esc(ui.navSteps)}</h3><ol class="steps">${res.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`;
    };
    $('#navGo').addEventListener('click', run);
    $('#navAcc').addEventListener('change', () => $('#navResult').innerHTML && run());
  }

  function openSettings() {
    openPanel(`
      ${closeBtn}
      <h2>⚙️ ${esc(ui.settingsTitle)}</h2>
      <fieldset class="field"><legend>${esc(ui.setQuality)}</legend>
        ${['auto', 'high', 'low']
          .map((q) => `<label class="check"><input type="radio" name="q" value="${q}" ${settings.quality === q ? 'checked' : ''}> ${esc(ui['quality' + q[0].toUpperCase() + q.slice(1)])}</label>`)
          .join('')}
      </fieldset>
      <label class="check"><input type="checkbox" id="setTilt" ${settings.tiltShift ? 'checked' : ''}> ${esc(ui.setTiltShift)}</label>
      <label class="check"><input type="checkbox" id="setMotion" ${settings.reduceMotion ? 'checked' : ''}> ${esc(ui.setMotion)}</label>
      <label class="check"><input type="checkbox" id="setLabels" ${settings.labels ? 'checked' : ''}> ${esc(ui.setLabels)}</label>
      <p><a href="text.html">📄 ${esc(ui.btnText)}</a></p>`);
    panelBody.querySelectorAll('input[name=q]').forEach((r) =>
      r.addEventListener('change', () => {
        settings.quality = r.value;
        actions.applySettings();
      }),
    );
    for (const [id, key] of [['setTilt', 'tiltShift'], ['setMotion', 'reduceMotion'], ['setLabels', 'labels']]) {
      $('#' + id).addEventListener('change', (e) => {
        settings[key] = e.target.checked;
        actions.applySettings();
      });
    }
  }

  // ── 門票問答（modal） ──
  function closeModal() {
    modal.hidden = true;
  }
  function openQuiz() {
    closePanel();
    const qz = data.quiz;
    const score = {};
    let i = -1;
    const render = () => {
      if (i < 0) {
        modalBody.innerHTML = `<div class="ticket-intro"><div class="ticket-ico">🎟️</div><h2>${esc(qz.title)}</h2><p>${esc(qz.intro)}</p>
          <div class="btns"><button type="button" class="btn primary" data-q="start">${esc(ui.quizNext)} ▶</button>
          <button type="button" class="btn" data-q="skip">${esc(ui.quizSkip)}</button></div></div>`;
      } else if (i < qz.questions.length) {
        const q = qz.questions[i];
        modalBody.innerHTML = `<p class="progress">${i + 1} / ${qz.questions.length}</p>
          <div class="bar"><span style="width:${((i + 1) / qz.questions.length) * 100}%"></span></div>
          <h2>${esc(q.q)}</h2>
          <div class="options">${q.options.map((o, k) => `<button type="button" class="opt" data-o="${k}">${esc(o.text)}</button>`).join('')}</div>`;
      } else {
        const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0]?.[0] || 'academic';
        const f = byId[best];
        modalBody.innerHTML = `<div class="ticket" style="--accent:${esc(f.color)}">
            <div class="ticket-l"><small>ADMIT ONE</small><strong>${esc(data.school.parkName)}</strong><span>${esc(qz.resultTitle)}</span></div>
            <div class="ticket-r"><small>${esc(qz.resultText)}</small><span class="big-ico">${f.icon}</span><strong>${esc(f.name)}</strong><span>${esc(f.campus)}</span></div>
          </div>
          <p>${esc(f.desc)}</p>
          <div class="btns"><button type="button" class="btn primary" data-q="go" data-arg="${f.id}">${esc(ui.quizGo)}</button>
          <button type="button" class="btn" data-q="retry">${esc(ui.quizRetry)}</button>
          <button type="button" class="btn" data-q="skip">${esc(ui.quizEnter)}</button></div>`;
      }
      modalBody.querySelector('button')?.focus();
    };
    modalBody.onclick = (e) => {
      const o = e.target.closest('[data-o]');
      if (o) {
        const opt = qz.questions[i].options[+o.dataset.o];
        for (const [k, v] of Object.entries(opt.score)) score[k] = (score[k] || 0) + v;
        i++;
        render();
        return;
      }
      const b = e.target.closest('[data-q]');
      if (!b) return;
      const q = b.dataset.q;
      if (q === 'start') { i = 0; render(); }
      if (q === 'retry') { for (const k in score) delete score[k]; i = 0; render(); }
      if (q === 'skip') closeModal();
      if (q === 'go') {
        closeModal();
        openNav(b.dataset.arg, 'gate');
        $('#navGo').click();
      }
    };
    render();
    modal.hidden = false;
  }

  let toastTimer = 0;
  function toast(msg, ms = 3500) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
  }

  function setToolActive(id, on) {
    bar.querySelector(`[data-tool="${id}"]`)?.classList.toggle('on', on);
  }

  return { openFacility, openRegistration, openNav, openSettings, openQuiz, openResources, closePanel, toast, setToolActive };
}
