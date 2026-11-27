// Puro: datos de las tramas y avisos de las abandonadas o sin resolver.
export const FASES = ["planteamiento", "giro", "climax", "resolucion"] as const;
export type Fase = (typeof FASES)[number];
export interface Trama { id: string; name: string; color: string; tipo?: "principal" | "subtrama"; desc?: string; chars?: string[] }
export interface Nota { texto?: string; fase?: Fase }
// `map`: capítulo -> ids de las tramas que avanzan en él. `notas`: clave «capítulo|trama».
export interface Datos { plots: Trama[]; map: Record<string, string[]>; notas?: Record<string, Nota> }

export const clave = (scene: string, plot: string) => `${scene}|${plot}`;

export function alternar(d: Datos, scene: string, plot: string): Datos {
  const cur = d.map[scene] ?? [];
  const notas = { ...d.notas };
  if (cur.includes(plot)) delete notas[clave(scene, plot)];
  return { ...d, notas, map: { ...d.map, [scene]: cur.includes(plot) ? cur.filter((x) => x !== plot) : [...cur, plot] } };
}

export function borrar(d: Datos, plot: string): Datos {
  return {
    plots: d.plots.filter((x) => x.id !== plot),
    map: Object.fromEntries(Object.entries(d.map).map(([k, v]) => [k, v.filter((x) => x !== plot)])),
    notas: Object.fromEntries(Object.entries(d.notas ?? {}).filter(([k]) => !k.endsWith("|" + plot))),
  };
}

// capítulos (por posición) en los que avanza la trama, con su fase
export const marcas = (d: Datos, plot: string, orden: string[]) =>
  orden.flatMap((s, i) => (d.map[s]?.includes(plot) ? [{ i, scene: s, ...d.notas?.[clave(s, plot)] }] : []));

export const HUECO = 3; // capítulos seguidos sin avanzar que merecen aviso
export type Aviso = { tipo: "vacia" } | { tipo: "sinResolver" } | { tipo: "tras" } | { tipo: "hueco"; de: number; a: number } | { tipo: "abandonada"; de: number };

export function revisar(m: { i: number; fase?: Fase }[], total: number): Aviso[] {
  if (!m.length) return [{ tipo: "vacia" }];
  const out: Aviso[] = m.slice(1).flatMap((x, k): Aviso[] => (x.i - m[k].i - 1 >= HUECO ? [{ tipo: "hueco", de: m[k].i + 1, a: x.i - 1 }] : []));
  const fin = m.findIndex((x) => x.fase === "resolucion");
  if (fin < 0) {
    out.push({ tipo: "sinResolver" });
    if (total - 1 - m[m.length - 1].i >= HUECO) out.push({ tipo: "abandonada", de: m[m.length - 1].i });
  } else if (fin < m.length - 1) out.push({ tipo: "tras" });
  return out;
}
