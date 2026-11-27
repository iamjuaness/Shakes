// Disposición automática del mapa de relaciones y geometría de sus líneas curvas. Funciones puras y deterministas.
export interface Pt { x: number; y: number }

const GAP = 200; // longitud ideal de una relación
const MIN = 160; // distancia mínima entre dos fichas

// Cada grupo conectado se ordena por fuerzas y los grupos se colocan en filas; las fichas sueltas van al final, en rejilla.
export function layout(ids: string[], edges: [string, string][]): Map<string, Pt> {
  const next = new Map(ids.map((id) => [id, new Set<string>()]));
  for (const [a, b] of edges) if (a !== b && next.has(a) && next.has(b)) { next.get(a)!.add(b); next.get(b)!.add(a); }
  const seen = new Set<string>();
  const groups: string[][] = [];
  const byDegree = [...ids].sort((a, b) => next.get(b)!.size - next.get(a)!.size);
  for (const id of byDegree) {
    if (seen.has(id) || !next.get(id)!.size) continue;
    const g = [id];
    seen.add(id);
    for (let i = 0; i < g.length; i++) for (const n of next.get(g[i])!) if (!seen.has(n)) { seen.add(n); g.push(n); }
    groups.push(g);
  }
  groups.sort((a, b) => b.length - a.length);

  const out = new Map<string, Pt>();
  let x = 0, y = 0, rowH = 0;
  for (const g of groups) {
    const at = new Map(g.map((id, i) => [id, i]));
    const pairs = g.flatMap((id, i) => [...next.get(id)!].map((n) => [i, at.get(n)!] as [number, number]).filter(([a, b]) => a < b));
    const p = arrange(g.length, pairs);
    const minX = Math.min(...p.map((q) => q.x)), minY = Math.min(...p.map((q) => q.y));
    const w = Math.max(...p.map((q) => q.x)) - minX, h = Math.max(...p.map((q) => q.y)) - minY;
    if (x && x + w > 1200) { x = 0; y += rowH + GAP; rowH = 0; }
    g.forEach((id, i) => out.set(id, { x: Math.round(x + p[i].x - minX), y: Math.round(y + p[i].y - minY) }));
    x += w + GAP;
    rowH = Math.max(rowH, h);
  }
  if (groups.length) y += rowH + GAP;
  const loose = ids.filter((id) => !seen.has(id));
  const cols = Math.max(1, Math.ceil(Math.sqrt(loose.length * 2)));
  loose.forEach((id, i) => out.set(id, { x: (i % cols) * MIN, y: y + Math.floor(i / cols) * 100 }));
  return out;
}

// Prueba varios arranques y se queda con el que menos cruces y fichas pisadas tiene.
// shortcut: O(n²) por iteración; con cientos de fichas relacionadas habría que usar un Web Worker o Barnes-Hut.
function arrange(n: number, edges: [number, number][]): Pt[] {
  let best: Pt[] = [], score = Infinity;
  let seed = 1;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  for (let attempt = 0; attempt < (n > 60 ? 1 : 8); attempt++) {
    const slot = [...Array(n).keys()];
    if (attempt) for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [slot[i], slot[j]] = [slot[j], slot[i]]; }
    const p = slot.map((s) => ({ x: Math.cos((2 * Math.PI * s) / n) * GAP, y: Math.sin((2 * Math.PI * s) / n) * GAP }));
    for (let it = 0; it < 300; it++) {
      const d = p.map((q) => ({ x: -q.x * 0.02, y: -q.y * 0.02 })); // gravedad suave hacia el centro
      const push = (i: number, j: number, f: (dist: number) => number) => {
        const dx = p[i].x - p[j].x, dy = p[i].y - p[j].y, len = Math.hypot(dx, dy) || 1, k = f(len) / len;
        d[i].x += dx * k; d[i].y += dy * k; d[j].x -= dx * k; d[j].y -= dy * k;
      };
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) push(i, j, (l) => (GAP * GAP) / l);
      for (const [i, j] of edges) push(i, j, (l) => -(l * l) / GAP);
      const t = 60 * (1 - it / 300) + 1;
      p.forEach((q, i) => { const len = Math.hypot(d[i].x, d[i].y) || 1, s = Math.min(len, t) / len; q.x += d[i].x * s; q.y += d[i].y * s; });
    }
    separate(p);
    const s = penalty(p, edges);
    if (s < score) { score = s; best = p; }
  }
  return landscape(best);
}

// Gira el grupo para que su eje largo quede horizontal, como la pantalla.
function landscape(p: Pt[]) {
  const cx = p.reduce((s, q) => s + q.x, 0) / p.length, cy = p.reduce((s, q) => s + q.y, 0) / p.length;
  let xx = 0, yy = 0, xy = 0;
  for (const q of p) { xx += (q.x - cx) ** 2; yy += (q.y - cy) ** 2; xy += (q.x - cx) * (q.y - cy); }
  const a = -Math.atan2(2 * xy, xx - yy) / 2, cos = Math.cos(a), sin = Math.sin(a);
  return p.map((q) => ({ x: (q.x - cx) * cos - (q.y - cy) * sin, y: (q.x - cx) * sin + (q.y - cy) * cos }));
}

function separate(p: Pt[]) {
  for (let it = 0; it < 100; it++) {
    let moved = false;
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) {
      const dx = p[j].x - p[i].x, dy = p[j].y - p[i].y, len = Math.hypot(dx, dy);
      if (len >= MIN) continue;
      const ux = len ? dx / len : 1, uy = len ? dy / len : 0, s = (MIN - len) / 2 + 0.5;
      p[i].x -= ux * s; p[i].y -= uy * s; p[j].x += ux * s; p[j].y += uy * s;
      moved = true;
    }
    if (!moved) return;
  }
}

export function crosses(a: Pt, b: Pt, c: Pt, d: Pt) {
  const side = (p: Pt, q: Pt, r: Pt) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0;
}

function penalty(p: Pt[], edges: [number, number][]) {
  let s = 0;
  edges.forEach(([a, b], i) => {
    const dx = p[b].x - p[a].x, dy = p[b].y - p[a].y, l2 = dx * dx + dy * dy || 1;
    s += Math.sqrt(l2) / 1000; // desempate: líneas cortas
    for (const [c, d] of edges.slice(i + 1)) if (a !== c && a !== d && b !== c && b !== d && crosses(p[a], p[b], p[c], p[d])) s += 10;
    p.forEach((q, k) => {
      if (k === a || k === b) return;
      const u = Math.max(0, Math.min(1, ((q.x - p[a].x) * dx + (q.y - p[a].y) * dy) / l2));
      if (Math.hypot(q.x - p[a].x - u * dx, q.y - p[a].y - u * dy) < 60) s += 15;
    });
  });
  return s;
}

// Curva de la relación `i` de las `n` que unen la misma pareja. `flip`: va en sentido contrario al de referencia,
// para que A→B y B→A se abran a lados distintos. `width`: ancho de la etiqueta más larga, para que no se tapen.
export function curve(a: Pt, b: Pt, i: number, n: number, flip: boolean, width: number, ra: number, rb = ra) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len < ra + rb) return null;
  const s = flip ? -1 : 1;
  const nx = (-(b.y - a.y) / len) * s, ny = ((b.x - a.x) / len) * s;
  const sep = Math.max(32, Math.min(width / Math.abs(nx), 18 / Math.abs(ny)));
  const off = n === 1 ? 22 : (i - (n - 1) / 2) * sep;
  const label = { x: (a.x + b.x) / 2 + nx * off, y: (a.y + b.y) / 2 + ny * off };
  const c = { x: (a.x + b.x) / 2 + nx * off * 2, y: (a.y + b.y) / 2 + ny * off * 2 };
  const toward = (p: Pt, d: number) => { const l = Math.hypot(c.x - p.x, c.y - p.y) || 1; return { x: p.x + ((c.x - p.x) / l) * d, y: p.y + ((c.y - p.y) / l) * d }; };
  const from = toward(a, ra), to = toward(b, rb + 3);
  return { path: `M${from.x} ${from.y}Q${c.x} ${c.y} ${to.x} ${to.y}`, label };
}
