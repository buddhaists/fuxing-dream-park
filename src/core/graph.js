// 純邏輯的路網模組（不依賴 Three.js），3D 模式與純文字模式共用。

export function buildGraph(paths) {
  const nodes = {};
  for (const [id, n] of Object.entries(paths.nodes)) {
    const [x, z, y = 0] = n.p;
    nodes[id] = { id, x, y, z, label: n.label || null, edges: [] };
  }
  const edges = paths.edges.map(([a, b, flags = {}], i) => {
    const na = nodes[a];
    const nb = nodes[b];
    if (!na || !nb) throw new Error(`路網資料錯誤：找不到節點 ${a} 或 ${b}`);
    const len = Math.hypot(na.x - nb.x, na.z - nb.z, na.y - nb.y);
    const e = { i, a, b, len, stairs: !!flags.stairs, ramp: !!flags.ramp };
    na.edges.push(e);
    nb.edges.push(e);
    return e;
  });
  return { nodes, edges };
}

// Dijkstra 最短路徑；accessible=true 時排除階梯路段。
export function findRoute(graph, from, to, { accessible = false } = {}) {
  const { nodes } = graph;
  if (!nodes[from] || !nodes[to]) return null;
  const dist = { [from]: 0 };
  const prev = {};
  const done = new Set();
  const queue = new Set([from]);
  while (queue.size) {
    let cur = null;
    for (const id of queue) if (cur === null || dist[id] < dist[cur]) cur = id;
    queue.delete(cur);
    if (cur === to) break;
    done.add(cur);
    for (const e of nodes[cur].edges) {
      if (accessible && e.stairs) continue;
      const nxt = e.a === cur ? e.b : e.a;
      if (done.has(nxt)) continue;
      const d = dist[cur] + e.len;
      if (dist[nxt] === undefined || d < dist[nxt]) {
        dist[nxt] = d;
        prev[nxt] = { node: cur, edge: e };
        queue.add(nxt);
      }
    }
  }
  if (dist[to] === undefined) return null;
  const ids = [to];
  const usedEdges = [];
  let c = to;
  while (c !== from) {
    usedEdges.unshift(prev[c].edge);
    c = prev[c].node;
    ids.unshift(c);
  }
  return {
    ids,
    points: ids.map((id) => nodes[id]),
    length: dist[to],
    hasStairs: usedEdges.some((e) => e.stairs),
    hasRamp: usedEdges.some((e) => e.ramp),
    edges: usedEdges,
  };
}

// 把路線轉成文字步驟（只列出有名稱的節點，並標註階梯／坡道）。
export function describeRoute(graph, route) {
  if (!route) return [];
  const steps = [];
  route.ids.forEach((id, k) => {
    const n = graph.nodes[id];
    const e = route.edges[k - 1];
    let note = '';
    if (e?.stairs) note = '（走階梯）';
    if (e?.ramp) note = '（走無障礙坡道）';
    if (n.label) {
      const text = n.label + note;
      if (steps[steps.length - 1] !== text) steps.push(text);
    } else if (note && steps.length && !steps[steps.length - 1].endsWith(note)) {
      // 未命名節點：把階梯／坡道提示接在上一步後面
      steps[steps.length - 1] += note;
    }
  });
  return steps;
}
