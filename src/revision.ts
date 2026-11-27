// Control de cambios (puro): compara dos versiones del HTML de un capítulo y permite aceptar o rechazar cada cambio.
// Primero por bloques (párrafos, listas, tablas…) y, dentro de un párrafo retocado, palabra a palabra conservando
// negritas, cursivas y notas. Test: node src/revision.test.ts
import { scenes } from "./tree.ts";
import type { Node } from "./tree.ts";

const ETIQUETA = /<(\/?)([a-z][\w-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/gi;
const VACIAS = /^(br|hr|img)$/i;

// Elementos de primer nivel.
export function bloquesHtml(html: string): string[] {
  const out: string[] = [];
  let prof = 0, ini = 0;
  for (const m of html.matchAll(ETIQUETA)) {
    if (m[1]) { if (--prof === 0) out.push(html.slice(ini, m.index! + m[0].length)); continue; }
    if (VACIAS.test(m[2])) { if (!prof) out.push(m[0]); continue; }
    if (!prof++) ini = m.index!;
  }
  return out;
}

interface Ficha { t: string; m: string[] } // texto (o elemento suelto) y etiquetas de formato abiertas
export function fichas(html: string): Ficha[] {
  const out: Ficha[] = [];
  const pila: string[] = [];
  let desde = 0, nota = false;
  const texto = (s: string) => { for (const x of s.match(/&#?\w+;|\s+|[\p{L}\p{N}]+|[^\s\p{L}\p{N}&]|&/gu) ?? []) out.push({ t: x, m: [...pila] }); };
  for (const m of html.matchAll(ETIQUETA)) {
    texto(html.slice(desde, m.index));
    desde = m.index! + m[0].length;
    const cierra = !!m[1], nombre = m[2].toLowerCase();
    if (nombre === "span" && nota && cierra) { nota = false; continue; }
    if (nombre === "span" && !cierra && m[3].includes("data-pie")) { nota = true; out.push({ t: m[0] + "</span>", m: [...pila] }); continue; }
    if (VACIAS.test(nombre)) { out.push({ t: m[0], m: [...pila] }); continue; }
    if (cierra) pila.pop();
    else pila.push(m[0]);
  }
  texto(html.slice(desde));
  return out;
}

const nombreDe = (etiqueta: string) => etiqueta.match(/^<([\w-]+)/)![1];
function escribir(fs: Ficha[]): string {
  let out = "";
  let abiertas: string[] = [];
  const hasta = (n: number) => { while (abiertas.length > n) out += `</${nombreDe(abiertas.pop()!)}>`; };
  for (const f of fs) {
    let k = 0;
    while (k < abiertas.length && abiertas[k] === f.m[k]) k++;
    hasta(k);
    for (const e of f.m.slice(k)) { abiertas.push(e); out += e; }
    out += f.t;
  }
  hasta(0);
  return out;
}

// Tramos distintos entre dos listas (subsecuencia común más larga).
export function diferencias(a: string[], b: string[]): { a: [number, number]; b: [number, number] }[] {
  let ini = 0;
  while (ini < a.length && ini < b.length && a[ini] === b[ini]) ini++;
  let fa = a.length, fb = b.length;
  while (fa > ini && fb > ini && a[fa - 1] === b[fb - 1]) { fa--; fb--; }
  const n = fa - ini, m = fb - ini, an = m + 1;
  const L = new Uint32Array((n + 1) * an);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i * an + j] = a[ini + i] === b[ini + j] ? L[(i + 1) * an + j + 1] + 1 : Math.max(L[(i + 1) * an + j], L[i * an + j + 1]);
  const out: { a: [number, number]; b: [number, number] }[] = [];
  let i = 0, j = 0, di = 0, dj = 0;
  const cerrar = () => { if (i > di || j > dj) out.push({ a: [ini + di, ini + i], b: [ini + dj, ini + j] }); };
  while (i < n && j < m) {
    if (a[ini + i] === b[ini + j]) { cerrar(); i++; j++; di = i; dj = j; }
    else if (L[(i + 1) * an + j] >= L[i * an + j + 1]) i++;
    else j++;
  }
  i = n; j = m; cerrar();
  return out;
}

interface Alternativa<T> { id: number; antes: T; despues: T }
export type Pieza =
  | { fijo: string }
  | Alternativa<string>
  | { abre: string; cierra: string; trozos: (Ficha[] | Alternativa<Ficha[]>)[] };

const PARRAFO = /^(<(p|h[1-6]|blockquote)\b(?:"[^"]*"|'[^']*'|[^'">])*>)([\s\S]*)(<\/\2>)$/i;
const palabrasDe = (s: string) => new Set(s.replace(ETIQUETA, " ").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
// 0..1: cuánto se parecen dos párrafos por sus palabras.
function parecido(a: string, b: string): number {
  const x = palabrasDe(a), y = palabrasDe(b);
  if (!x.size || !y.size) return 0;
  let n = 0;
  for (const p of x) if (y.has(p)) n++;
  return (2 * n) / (x.size + y.size);
}

// `conservar`: bloques de «antes» que la otra versión no puede traer (p. ej. tablas e imágenes de un .docx importado):
// no se proponen como borrados.
export function comparar(antes: string, despues: string, conservar?: RegExp): Pieza[] {
  const A = bloquesHtml(antes), B = bloquesHtml(despues), out: Pieza[] = [];
  let id = 0, hecho = 0;
  const entero = (x: string, y: string) => out.push(conservar?.test(x) && !y ? { fijo: x } : { id: id++, antes: x, despues: y });
  const retocado = (x: string, y: string) => {
    const p = x.match(PARRAFO)!, q = y.match(PARRAFO)!;
    const fa = fichas(p[3]), fb = fichas(q[3]);
    const clave = (f: Ficha) => f.m.join("") + "\u0000" + f.t;
    const difs = diferencias(fa.map(clave), fb.map(clave)).reduce<ReturnType<typeof diferencias>>((u, d) => {
      const ult = u[u.length - 1]; // dos cambios separados solo por un espacio son uno
      if (ult && d.a[0] - ult.a[1] <= 1 && fa.slice(ult.a[1], d.a[0]).every((f) => /^\s+$/.test(f.t))) { ult.a[1] = d.a[1]; ult.b[1] = d.b[1]; }
      else u.push(d);
      return u;
    }, []);
    const trozos: (Ficha[] | Alternativa<Ficha[]>)[] = [];
    let i = 0;
    for (const d of difs) {
      trozos.push(fa.slice(i, d.a[0]), { id: id++, antes: fa.slice(...d.a), despues: fb.slice(...d.b) });
      i = d.a[1];
    }
    trozos.push(fa.slice(i));
    out.push({ abre: p[1], cierra: p[4], trozos });
  };
  for (const d of [...diferencias(A, B), { a: [A.length, A.length] as [number, number], b: [B.length, B.length] as [number, number] }]) {
    for (; hecho < d.a[0]; hecho++) out.push({ fijo: A[hecho] });
    // dentro del tramo se emparejan, en orden, los párrafos que son el mismo retocado
    let j = d.b[0];
    for (let i = d.a[0]; i < d.a[1]; i++) {
      const p = A[i].match(PARRAFO);
      let k = p ? j : d.b[1];
      while (k < d.b[1] && !(B[k].match(PARRAFO)?.[1] === p![1] && parecido(A[i], B[k]) > 0.35)) k++;
      if (k < d.b[1]) { for (; j < k; j++) entero("", B[j]); retocado(A[i], B[k]); j = k + 1; }
      else if (j < d.b[1] && d.a[1] - d.a[0] === 1 && d.b[1] - j === 1) { entero(A[i], B[j]); j++; } // un bloque por otro
      else entero(A[i], "");
    }
    for (; j < d.b[1]; j++) entero("", B[j]);
    hecho = d.a[1];
  }
  return out;
}

// HTML resultante eligiendo, en cada cambio, la versión de antes o la de después.
export function montar(piezas: Pieza[], despues: (id: number) => boolean): string {
  return piezas.map((p) => {
    if ("fijo" in p) return p.fijo;
    if ("id" in p) return despues(p.id) ? p.despues : p.antes;
    return p.abre + escribir(p.trozos.flatMap((t) => (Array.isArray(t) ? t : despues(t.id) ? t.despues : t.antes))) + p.cierra;
  }).join("");
}

// Resolver un cambio: aceptarlo lo pasa a «antes»; rechazarlo lo quita de «después». Los demás siguen pendientes.
// `ids` vacío = todos.
export const resolver = (piezas: Pieza[], acepta: boolean, id?: number) => ({
  antes: montar(piezas, (i) => acepta && (id === undefined || i === id)),
  despues: montar(piezas, (i) => acepta || (id !== undefined && i !== id)),
});

export interface Cambio { id: number; antes: string; despues: string; previo: string; siguiente: string }
const plano = (html: string) => html.replace(/<span\b[^>]*data-pie="([^"]*)"[^>]*><\/span>/g, (_, n) => { try { return `[${decodeURIComponent(n)}]`; } catch { return "[*]"; } })
  .replace(/<img\b[^>]*>/gi, "🖼 ").replace(/<hr\b[^>]*>/gi, "* * *").replace(/<\/(p|li|td|th)>/gi, " ").replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

// Los cambios con su texto y un poco de contexto, para mostrarlos.
export function cambios(piezas: Pieza[]): Cambio[] {
  return piezas.flatMap((p): Cambio[] => {
    if ("fijo" in p) return [];
    if ("id" in p) return [{ id: p.id, antes: plano(p.antes), despues: plano(p.despues), previo: "", siguiente: "" }];
    return p.trozos.flatMap((t, i) => (Array.isArray(t) ? [] : [{
      id: t.id, antes: plano(escribir(t.antes)), despues: plano(escribir(t.despues)),
      previo: plano(escribir(p.trozos[i - 1] as Ficha[])).slice(-60), siguiente: plano(escribir(p.trozos[i + 1] as Ficha[])).slice(0, 60),
    }]));
  });
}

// ---------- Sesión de revisión ----------
// `otro`: el texto con el que se compara, por capítulo. `entrante`: lo trae un lector (aceptar = incorporarlo); si no,
// es una versión anterior (aceptar = quedarse con lo actual).
export interface Revision { nombre: string; entrante: boolean; sinTablas?: boolean; otro: Record<string, string>; nuevos: { titulo: string; html: string }[] }

const normal = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
// Empareja los capítulos de la otra versión con los propios: por identificador, por título y, si coinciden en número,
// por orden.
export function abrirRevision(mio: Node, otro: Node, nombre: string, entrante: boolean, sinTablas = false): Revision {
  const mios = scenes(mio).map((s) => s.scene), suyos = scenes(otro).map((s) => s.scene);
  const par = new Map<string, Node>(), libres = new Set(suyos);
  const casar = (criterio: (a: Node, b: Node) => boolean) => {
    for (const a of mios) {
      if (par.has(a.id)) continue;
      const b = [...libres].find((x) => criterio(a, x));
      if (b) { par.set(a.id, b); libres.delete(b); }
    }
  };
  casar((a, b) => a.id === b.id);
  casar((a, b) => normal(a.title) === normal(b.title));
  if (mios.length === suyos.length) casar((a, b) => mios.indexOf(a) === suyos.indexOf(b));
  return {
    nombre, entrante, sinTablas, otro: Object.fromEntries([...par].map(([id, n]) => [id, n.content ?? ""])),
    nuevos: entrante ? [...libres].filter((n) => n.content).map((n) => ({ titulo: n.title, html: n.content! })) : [],
  };
}

// Cambios pendientes de un capítulo.
export function piezasDe(r: Revision, id: string, mio: string): Pieza[] {
  const otro = r.otro[id];
  if (otro === undefined) return [];
  // un .docx no trae imágenes y las tablas llegan como párrafos: no se proponen como borrados
  const conservar = r.sinTablas ? /^<(img|table)\b/i : undefined;
  return r.entrante ? comparar(mio, otro, conservar) : comparar(otro, mio);
}

// Aplica una decisión: devuelve el texto propio y el otro, ya actualizados.
export function decidir(r: Revision, piezas: Pieza[], acepta: boolean, id?: number): { mio: string; otro: string } {
  const x = resolver(piezas, acepta, id);
  return r.entrante ? { mio: x.antes, otro: x.despues } : { mio: x.despues, otro: x.antes };
}

// ---------- Comentarios ----------
export interface Comentario { id: string; cap: string; cita: string; texto: string; autor: string; fecha: string; hecho?: boolean }
