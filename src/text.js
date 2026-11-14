// 純文字備用模式：同一份資料檔產生完整的文字版導覽（適合螢幕閱讀器、列印、舊裝置）。
import './style.css';
import data from './data/campus.json';
import ui from './data/ui.json';
import { buildGraph, findRoute, describeRoute } from './core/graph.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const graph = buildGraph(data.paths);
const s = data.school;
const r = data.registration;
const start = data.facilities.find((f) => f.id === 'gate');
const nowebgl = new URLSearchParams(location.search).has('nowebgl');

const routeHtml = data.facilities
  .filter((f) => f.id !== 'gate')
  .map((f) => {
    const normal = findRoute(graph, start.node, f.node);
    const acc = findRoute(graph, start.node, f.node, { accessible: true });
    const same = acc && normal && acc.ids.join() === normal.ids.join();
    return `<li><strong>${f.icon} ${esc(f.name)}（${esc(f.campus)}）</strong>
      <p>${esc(ui.textRouteNormal)}：${describeRoute(graph, normal).map(esc).join(' → ')}${normal?.hasStairs ? ' ⚠️ 含階梯' : ''}</p>
      ${same ? '<p>♿ 此路線全程無階梯。</p>' : `<p>♿ ${esc(ui.textRouteA11y)}：${describeRoute(graph, acc).map(esc).join(' → ')}</p>`}
    </li>`;
  })
  .join('');

document.getElementById('text-root').innerHTML = `
  ${nowebgl ? `<p class="notice-box">${esc(ui.noWebGL)}</p>` : ''}
  <header>
    <p><a href="index.html">🎡 ${esc(ui.textBack)}</a></p>
    <h1>${esc(s.parkName)}｜${esc(ui.textTitle)}</h1>
    <p>${esc(s.name)} ${esc(s.subtitle)}</p>
  </header>

  <nav aria-label="目錄"><ol>
    <li><a href="#reg">${esc(r.title)}</a></li>
    <li><a href="#fac">${esc(ui.textFacilities)}</a></li>
    <li><a href="#routes">${esc(ui.textRoutes)}</a></li>
    <li><a href="#quiz">${esc(ui.textQuiz)}</a></li>
    <li><a href="#resources">${esc(ui.textResources)}</a></li>
    <li><a href="#contact">${esc(ui.textContact)}</a></li>
  </ol></nav>

  <section id="reg"><h2>📝 ${esc(r.title)}</h2>
    <p>${esc(r.intro)}</p>
    ${r.methods.map((m) => `<h3>${m.icon} ${esc(m.name)}</h3><ol>${m.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol><p>⏰ ${esc(m.deadline)}</p>${m.link ? `<p><a href="${esc(m.link.url)}" target="_blank" rel="noopener">${esc(m.link.label)}</a></p>` : ''}`).join('')}
    <p>👶 ${esc(r.eligibility)}</p>
  </section>

  <section id="fac"><h2>🗺️ ${esc(ui.textFacilities)}</h2>
    <ul class="fac-list">${data.facilities.map((f) => `<li><h3>${f.icon} ${esc(f.name)} ＝ ${esc(f.campus)}</h3><p>${esc(f.desc)}</p><ul>${f.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>${f.a11y ? `<p>♿ ${esc(f.a11y)}</p>` : ''}${(f.links || []).map((l) => `<p><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a></p>`).join('')}</li>`).join('')}</ul>
  </section>

  <section id="routes"><h2>🧭 ${esc(ui.textRoutes)}</h2><ul class="fac-list">${routeHtml}</ul></section>

  <section id="quiz"><h2>🎟️ ${esc(ui.textQuiz)}</h2><p>${esc(data.quiz.intro)}</p>
    <ol>${data.quiz.questions.map((q) => `<li><p>${esc(q.q)}</p><ul>${q.options.map((o) => `<li>${esc(o.text)}</li>`).join('')}</ul></li>`).join('')}</ol>
  </section>

  <section id="resources"><h2>🌐 ${esc(ui.textResources)}</h2>
    <ul>${(s.resources || []).map((x) => `<li>${x.icon} <a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)}</a>：${esc(x.desc)}</li>`).join('')}</ul>
  </section>

  <section><h2>💡 ${esc(ui.textTips)}</h2><ul>${data.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></section>

  <section id="contact"><h2>☎️ ${esc(ui.textContact)}</h2>
    <p>${esc(s.name)}<br>📍 ${esc(s.address)}<br>☎️ ${esc(s.phone)}</p>
    <p><a href="${esc(s.website)}" target="_blank" rel="noopener">學校網站</a>｜<a href="${esc(s.admissionSite)}" target="_blank" rel="noopener">新生入學專區</a></p>
    <p class="notice">${esc(s.notice)}</p>
  </section>`;
