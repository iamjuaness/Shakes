// Fuentes de maquetación: métricas, interletraje (GPOS o kern) y ligaduras (GSUB). Las libres (OFL) llegan en WOFF 1:
// se pasan a TrueType para medir e incrustar. Una `Fuente` puede juntar varios archivos (latín, griego, cirílico…):
// cada carácter sale del primero que lo tenga.
// Courier es una de las 14 fuentes estándar de PDF: no se incrusta (manuscrito para editoriales).
import { unzlibSync } from "fflate";

export type Estilo = "r" | "i" | "b" | "bi";
export interface Datos { sfnt: Uint8Array; upm: number; caja: number[]; ascenso: number; descenso: number; angulo: number; avance: (g: number) => number }
export interface Glifo { p: number; g: number; kx: number; t: string } // p: archivo; kx: ajuste tras el glifo, en emes; t: texto original
export interface Fuente {
  ancho(s: string): number; // en emes (multiplicar por el cuerpo), con interletraje y ligaduras
  tiene(codigo: number): boolean;
  formar(s: string): Glifo[];
  capAlto: number; // altura de mayúscula, en emes
  partes: Datos[]; // vacío en Courier
  courier?: string; // nombre PDF de la fuente estándar
}
export type Familia = Record<Estilo, Fuente>;

export function woffASfnt(woff: Uint8Array): Uint8Array {
  const v = new DataView(woff.buffer, woff.byteOffset, woff.byteLength);
  if (v.getUint32(0) !== 0x774f4646) return woff; // ya es TrueType/OpenType
  const n = v.getUint16(12);
  const tablas = Array.from({ length: n }, (_, i) => {
    const p = 44 + i * 20;
    const off = v.getUint32(p + 4), comp = v.getUint32(p + 8), orig = v.getUint32(p + 12);
    const crudo = woff.subarray(off, off + comp);
    return { tag: v.getUint32(p), suma: v.getUint32(p + 16), data: comp < orig ? unzlibSync(crudo) : crudo };
  });
  const cab = 12 + n * 16;
  const out = new Uint8Array(cab + tablas.reduce((s, t) => s + ((t.data.length + 3) & ~3), 0));
  const o = new DataView(out.buffer);
  const pot = Math.floor(Math.log2(n));
  o.setUint32(0, v.getUint32(4)); o.setUint16(4, n); o.setUint16(6, 16 << pot); o.setUint16(8, pot); o.setUint16(10, n * 16 - (16 << pot));
  let pos = cab;
  tablas.forEach((t, i) => {
    const p = 12 + i * 16;
    o.setUint32(p, t.tag); o.setUint32(p + 4, t.suma); o.setUint32(p + 8, pos); o.setUint32(p + 12, t.data.length);
    out.set(t.data, pos);
    pos += (t.data.length + 3) & ~3;
  });
  return out;
}

function tablasDe(sfnt: Uint8Array) {
  const v = new DataView(sfnt.buffer, sfnt.byteOffset, sfnt.byteLength);
  const dir: Record<string, number> = {};
  for (let i = 0; i < v.getUint16(4); i++) {
    const p = 12 + i * 16;
    dir[String.fromCharCode(...sfnt.subarray(p, p + 4))] = v.getUint32(p + 8);
  }
  return { v, dir };
}

// ---------- OpenType: cobertura, clases y listas de GPOS/GSUB ----------
// Índice de un glifo en una tabla de cobertura, o -1.
function cobertura(v: DataView, p: number): Map<number, number> {
  const out = new Map<number, number>();
  if (v.getUint16(p) === 1) for (let i = 0; i < v.getUint16(p + 2); i++) out.set(v.getUint16(p + 4 + i * 2), i);
  else for (let i = 0; i < v.getUint16(p + 2); i++) {
    const r = p + 4 + i * 6, a = v.getUint16(r), b = v.getUint16(r + 2), ini = v.getUint16(r + 4);
    for (let g = a; g <= b; g++) out.set(g, ini + g - a);
  }
  return out;
}
function clases(v: DataView, p: number): Map<number, number> {
  const out = new Map<number, number>();
  if (v.getUint16(p) === 1) { const a = v.getUint16(p + 2); for (let i = 0; i < v.getUint16(p + 4); i++) out.set(a + i, v.getUint16(p + 6 + i * 2)); }
  else for (let i = 0; i < v.getUint16(p + 2); i++) {
    const r = p + 4 + i * 6, a = v.getUint16(r), b = v.getUint16(r + 2), c = v.getUint16(r + 4);
    for (let g = a; g <= b; g++) out.set(g, c);
  }
  return out;
}
// Subtablas de las funciones con esa etiqueta, agrupadas por consulta (`lookup`), con las de extensión ya resueltas.
function consultas(v: DataView, base: number, etiquetas: string[], tipo: number, extension: number): number[][] {
  const funciones = base + v.getUint16(base + 6), lista = base + v.getUint16(base + 8);
  const indices = new Set<number>();
  for (let i = 0; i < v.getUint16(funciones); i++) {
    const r = funciones + 2 + i * 6;
    const tag = String.fromCharCode(v.getUint8(r), v.getUint8(r + 1), v.getUint8(r + 2), v.getUint8(r + 3));
    if (!etiquetas.includes(tag)) continue;
    const f = funciones + v.getUint16(r + 4);
    for (let j = 0; j < v.getUint16(f + 2); j++) indices.add(v.getUint16(f + 4 + j * 2));
  }
  return [...indices].sort((a, b) => a - b).map((i) => {
    const l = lista + v.getUint16(lista + 2 + i * 2), t = v.getUint16(l);
    return Array.from({ length: v.getUint16(l + 4) }, (_, k) => {
      const s = l + v.getUint16(l + 6 + k * 2);
      if (t === tipo) return s;
      return t === extension && v.getUint16(s + 2) === tipo ? s + v.getUint32(s + 4) : 0;
    }).filter(Boolean);
  }).filter((x) => x.length);
}

const bits = (n: number) => { let c = 0; for (; n; n >>= 1) c += n & 1; return c; };
// Interletraje entre dos glifos, en unidades de la fuente.
function interletraje(v: DataView, dir: Record<string, number>): (a: number, b: number) => number {
  const grupos = dir.GPOS ? consultas(v, dir.GPOS, ["kern"], 2, 9).map((subs) => subs.flatMap((s) => {
    const formato = v.getUint16(s), cub = cobertura(v, s + v.getUint16(s + 2)), f1 = v.getUint16(s + 4), f2 = v.getUint16(s + 6);
    if (!(f1 & 4)) return []; // solo el avance horizontal del primero
    const antes = bits(f1 & 3) * 2, t1 = bits(f1) * 2, t2 = bits(f2) * 2;
    if (formato === 1) {
      const conjuntos = new Map<number, Map<number, number>>();
      return [(a: number, b: number) => {
        const i = cub.get(a);
        if (i === undefined) return null;
        let m = conjuntos.get(i);
        if (!m) {
          const ps = s + v.getUint16(s + 10 + i * 2);
          m = new Map();
          for (let k = 0; k < v.getUint16(ps); k++) { const r = ps + 2 + k * (2 + t1 + t2); m.set(v.getUint16(r), v.getInt16(r + 2 + antes)); }
          conjuntos.set(i, m);
        }
        return m.get(b) ?? null;
      }];
    }
    const c1 = clases(v, s + v.getUint16(s + 8)), c2 = clases(v, s + v.getUint16(s + 10)), n2 = v.getUint16(s + 14);
    return [(a: number, b: number) => (cub.has(a) ? v.getInt16(s + 16 + ((c1.get(a) ?? 0) * n2 + (c2.get(b) ?? 0)) * (t1 + t2) + antes) : null)];
  })) : [];
  if (grupos.length) return (a, b) => grupos.reduce((total, subs) => {
    for (const f of subs) { const x = f(a, b); if (x !== null) return total + x; } // gana la primera subtabla que cubre el par
    return total;
  }, 0);
  const pares = new Map<number, number>(); // tabla «kern» antigua (formato 0)
  const k = dir.kern;
  if (k && v.getUint16(k) === 0) {
    let p = k + 4;
    for (let i = 0; i < v.getUint16(k + 2); i++, p += v.getUint16(p + 2)) {
      if (v.getUint16(p + 4) >> 8 !== 0) continue;
      for (let j = 0; j < v.getUint16(p + 6); j++) { const r = p + 14 + j * 6; pares.set(v.getUint16(r) * 65536 + v.getUint16(r + 2), v.getInt16(r + 4)); }
    }
  }
  return (a, b) => pares.get(a * 65536 + b) ?? 0;
}
// Ligaduras estándar (fi, fl, Th…): primer glifo -> [resto, glifo resultante], en el orden de preferencia de la fuente.
function ligaduras(v: DataView, dir: Record<string, number>): Map<number, { resto: number[]; g: number }[]> {
  const out = new Map<number, { resto: number[]; g: number }[]>();
  if (!dir.GSUB) return out;
  for (const subs of consultas(v, dir.GSUB, ["liga", "clig"], 4, 7)) for (const s of subs) {
    for (const [primero, i] of cobertura(v, s + v.getUint16(s + 2))) {
      const conjunto = s + v.getUint16(s + 6 + i * 2);
      for (let k = 0; k < v.getUint16(conjunto); k++) {
        const l = conjunto + v.getUint16(conjunto + 2 + k * 2), n = v.getUint16(l + 2);
        const lista = out.get(primero) ?? [];
        lista.push({ resto: Array.from({ length: n - 1 }, (_, j) => v.getUint16(l + 4 + j * 2)), g: v.getUint16(l) });
        out.set(primero, lista);
      }
    }
  }
  return out;
}

function leerParte(archivo: Uint8Array) {
  const sfnt = woffASfnt(archivo);
  const { v, dir } = tablasDe(sfnt);
  const head = dir.head, hhea = dir.hhea, hmtx = dir.hmtx, os2 = dir["OS/2"];
  const upm = v.getUint16(head + 18);
  const nMet = v.getUint16(hhea + 34);
  const avance = (g: number) => v.getUint16(hmtx + 4 * Math.min(g, nMet - 1));

  // cmap: se prefiere la tabla de formato 12; si no, la de formato 4 (plano básico).
  const cmap = dir.cmap;
  let f4 = 0, f12 = 0;
  for (let i = 0; i < v.getUint16(cmap + 2); i++) {
    const sub = cmap + v.getUint32(cmap + 4 + i * 8 + 4);
    const f = v.getUint16(sub);
    if (f === 4) f4 = sub; else if (f === 12) f12 = sub;
  }
  const glifos = new Map<number, number>();
  if (f12) {
    for (let i = 0; i < v.getUint32(f12 + 12); i++) {
      const p = f12 + 16 + i * 12, a = v.getUint32(p), b = v.getUint32(p + 4), g = v.getUint32(p + 8);
      for (let c = a; c <= b; c++) glifos.set(c, g + c - a);
    }
  } else if (f4) {
    const segs = v.getUint16(f4 + 6) / 2;
    const fin = f4 + 14, ini = fin + segs * 2 + 2, delta = ini + segs * 2, rango = delta + segs * 2;
    for (let s = 0; s < segs; s++) {
      const a = v.getUint16(ini + s * 2), b = v.getUint16(fin + s * 2), d = v.getUint16(delta + s * 2), r = v.getUint16(rango + s * 2);
      for (let c = a; c <= b && c !== 0xffff; c++) {
        let g = r ? v.getUint16(rango + s * 2 + r + (c - a) * 2) : c;
        if (!r || g) g = (g + d) & 0xffff;
        if (g) glifos.set(c, g);
      }
    }
  }
  return {
    glifo: (c: number) => glifos.get(c) ?? 0,
    capAlto: os2 && v.getUint16(os2) >= 2 ? v.getInt16(os2 + 88) / upm : 0.66,
    kern: interletraje(v, dir),
    ligas: ligaduras(v, dir),
    datos: {
      sfnt, upm, avance,
      caja: [36, 38, 40, 42].map((o) => v.getInt16(head + o)),
      ascenso: v.getInt16(hhea + 4), descenso: v.getInt16(hhea + 6),
      angulo: dir.post ? v.getInt32(dir.post + 4) / 65536 : 0,
    },
  };
}

export function leerFuente(...archivos: Uint8Array[]): Fuente {
  const partes = archivos.map(leerParte);
  const de = (c: number) => Math.max(0, partes.findIndex((x) => x.glifo(c)));
  function formar(s: string): Glifo[] {
    const letras = [...s].map((t) => { const c = t.codePointAt(0)!, p = de(c); return { p, g: partes[p].glifo(c), kx: 0, t }; });
    const out: Glifo[] = [];
    for (let i = 0; i < letras.length; i++) {
      const x = letras[i];
      const liga = partes[x.p].ligas.get(x.g)?.find((l) => l.resto.every((g, j) => letras[i + 1 + j]?.p === x.p && letras[i + 1 + j].g === g));
      if (liga) {
        out.push({ p: x.p, g: liga.g, kx: 0, t: letras.slice(i, i + liga.resto.length + 1).map((l) => l.t).join("") });
        i += liga.resto.length;
      } else out.push(x);
    }
    for (let i = 0; i + 1 < out.length; i++) {
      const a = out[i], b = out[i + 1];
      if (a.p === b.p) a.kx = partes[a.p].kern(a.g, b.g) / partes[a.p].datos.upm;
    }
    return out;
  }
  const cache = new Map<string, number>(); // las palabras se repiten: se miden una vez
  return {
    formar, capAlto: partes[0].capAlto, partes: partes.map((x) => x.datos),
    tiene: (c) => partes.some((x) => x.glifo(c)),
    ancho: (s) => {
      let w = cache.get(s);
      if (w === undefined) {
        w = formar(s).reduce((n, x) => n + partes[x.p].datos.avance(x.g) / partes[x.p].datos.upm + x.kx, 0);
        if (cache.size > 50_000) cache.clear();
        cache.set(s, w);
      }
      return w;
    },
  };
}

// ---------- Fuentes propias ----------
export interface InfoFuente { familia: string; estilo: Estilo; error?: "formato" | "licencia" }
// Solo TrueType (.ttf, también dentro de WOFF 1) con permiso de incrustación.
export function infoFuente(archivo: Uint8Array): InfoFuente {
  const mal: InfoFuente = { familia: "", estilo: "r", error: "formato" };
  try {
    const { v, dir } = tablasDe(woffASfnt(archivo));
    const magia = new DataView(woffASfnt(archivo).buffer).getUint32(0);
    if ((magia !== 0x00010000 && magia !== 0x74727565) || !dir.glyf || !dir.cmap || !dir.hmtx || !dir["OS/2"] || !dir.name) return mal;
    const os2 = dir["OS/2"], n = dir.name;
    const sel = v.getUint16(os2 + 62);
    const estilo: Estilo = sel & 32 ? (sel & 1 ? "bi" : "b") : sel & 1 ? "i" : "r";
    let familia = "";
    for (let i = 0; i < v.getUint16(n + 2); i++) {
      const r = n + 6 + i * 12, plataforma = v.getUint16(r), id = v.getUint16(r + 6);
      if (id !== 1 && id !== 16) continue; // 16: familia tipográfica (si está, manda)
      const largo = v.getUint16(r + 8), ini = n + v.getUint16(n + 4) + v.getUint16(r + 10);
      let s = "";
      if (plataforma === 1) for (let k = 0; k < largo; k++) s += String.fromCharCode(v.getUint8(ini + k));
      else for (let k = 0; k + 1 < largo; k += 2) s += String.fromCharCode(v.getUint16(ini + k));
      if (s && (id === 16 || !familia)) familia = s;
      if (id === 16) break;
    }
    return { familia: familia || "Fuente", estilo, error: (v.getUint16(os2 + 8) & 15) === 2 ? "licencia" : undefined };
  } catch { return mal; }
}

// WinAnsi: Latin-1 tal cual y los signos tipográficos en sus códigos.
export const WIN: Record<string, number> = { "€": 0x80, "…": 0x85, "Œ": 0x8c, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "œ": 0x9c };
export const winAnsi = (codigo: number) => (codigo >= 32 && codigo < 127) || (codigo >= 160 && codigo < 256) ? codigo : WIN[String.fromCodePoint(codigo)] ?? 0;

const courierDe = (nombre: string): Fuente => ({ courier: nombre, partes: [], tiene: (c) => !!winAnsi(c), formar: (s) => [...s].map((t) => ({ p: 0, g: winAnsi(t.codePointAt(0)!) || 63, kx: 0, t })), capAlto: 0.56, ancho: (s) => [...s].length * 0.6 });
export const COURIER: Familia = { r: courierDe("Courier"), i: courierDe("Courier-Oblique"), b: courierDe("Courier-Bold"), bi: courierDe("Courier-BoldOblique") };
