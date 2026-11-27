// Puntos de corte con guion según el idioma. Español: reglas propias (silabas.ts). El resto: patrones de Liang
// (paquete `hyphen`), que se cargan solo para el idioma de la obra.
import { cortes } from "./silabas.ts";

export type Cortar = (palabra: string) => number[];

// Una entrada por idioma: Vite empaqueta cada juego de patrones aparte.
const PATRONES: Record<string, () => Promise<any>> = {
  "en-gb": () => import("hyphen/en-gb/index.js"), en: () => import("hyphen/en-us/index.js"),
  fr: () => import("hyphen/fr/index.js"), de: () => import("hyphen/de/index.js"), it: () => import("hyphen/it/index.js"),
  pt: () => import("hyphen/pt/index.js"), ca: () => import("hyphen/ca/index.js"), gl: () => import("hyphen/gl/index.js"),
  eu: () => import("hyphen/eu/index.js"), nl: () => import("hyphen/nl/index.js"), da: () => import("hyphen/da/index.js"),
  sv: () => import("hyphen/sv/index.js"), nb: () => import("hyphen/nb/index.js"), pl: () => import("hyphen/pl/index.js"),
  cs: () => import("hyphen/cs/index.js"), ru: () => import("hyphen/ru/index.js"), el: () => import("hyphen/el-monoton/index.js"),
  la: () => import("hyphen/la/index.js"),
};

const clave = (lang: string) => { const l = lang.toLowerCase(); return l === "en-gb" ? l : l.split("-")[0] === "no" ? "nb" : l.split("-")[0]; };
export const hayGuiones = (lang: string) => clave(lang) === "es" || clave(lang) in PATRONES;

// Función de cortes a partir del silabeador de `hyphen`: posiciones donde insertaría un guion blando.
export function conPatrones(silabear: (s: string, o?: object) => string): Cortar {
  return (palabra) => {
    const out: number[] = [];
    for (const m of palabra.matchAll(/\p{L}+/gu)) {
      if (m[0].length < 5) continue;
      let pos = 0;
      const trozos = String(silabear(m[0], { hyphenChar: "­", minWordLength: 5 })).split("­");
      for (const t of trozos.slice(0, -1)) {
        pos += t.length;
        if (pos >= 2 && m[0].length - pos >= 3) out.push(m.index! + pos);
      }
    }
    return out;
  };
}

// undefined: no hay patrones para ese idioma (no se parten palabras).
export async function cargarGuiones(lang: string): Promise<Cortar | undefined> {
  const k = clave(lang);
  if (k === "es") return cortes;
  if (!PATRONES[k]) return;
  const m = await PATRONES[k]();
  return conPatrones((m.default ?? m).hyphenateSync);
}
