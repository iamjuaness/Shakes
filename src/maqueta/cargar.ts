// Carga (una sola vez) los archivos de fuente: los que trae la app y los que añade el usuario. Solo en el navegador.
import { COURIER, infoFuente, leerFuente, woffASfnt } from "./fuentes";
import type { Estilo, Familia } from "./fuentes";
import type { NombreFuente } from "./ajustes";
import { idbGet, idbSet } from "../store";

// Latín (con Europa central y del Este), y griego, cirílico y vietnamita donde la fuente los trae.
const urls = import.meta.glob("../../node_modules/@fontsource/{eb-garamond,crimson-text,libre-baskerville}/files/*-{latin,latin-ext,greek,cyrillic,vietnamese}-{400,700}-{normal,italic}.woff", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const SUBCONJUNTOS = ["latin", "latin-ext", "greek", "cyrillic", "vietnamese"];
const ARCHIVO: Record<Estilo, string> = { r: "400-normal", i: "400-italic", b: "700-normal", bi: "700-italic" };
const ESTILOS = Object.keys(ARCHIVO) as Estilo[];
const cache = new Map<NombreFuente, Promise<Familia>>();

// Fuentes del usuario: por nombre de familia, un archivo TrueType por estilo. Viven en la app (IndexedDB).
export type Propias = Record<string, Partial<Record<Estilo, Uint8Array>>>;
export const fuentesPropias = () => idbGet<Propias>("fuentes").then((x) => x ?? {}, (): Propias => ({}));

// Añade los .ttf elegidos. Devuelve las familias añadidas y los archivos rechazados (con el motivo).
export async function anadirFuentes(archivos: File[]) {
  const todas = await fuentesPropias();
  const familias = new Set<string>(), mal: { archivo: string; error: "formato" | "licencia" }[] = [];
  for (const f of archivos) {
    const datos = new Uint8Array(await f.arrayBuffer());
    const i = infoFuente(datos);
    if (i.error) { mal.push({ archivo: f.name, error: i.error }); continue; }
    todas[i.familia] = { ...todas[i.familia], [i.estilo]: woffASfnt(datos) };
    familias.add(i.familia);
    cache.delete(`propia:${i.familia}`);
  }
  await idbSet("fuentes", todas);
  return { familias: [...familias], mal };
}

// Archivos de cada estilo; un estilo que falte usa el normal.
async function archivos(nombre: NombreFuente): Promise<Record<Estilo, Uint8Array[]>> {
  let por: (e: Estilo) => Promise<Uint8Array[]>;
  if (nombre.startsWith("propia:")) {
    const f = (await fuentesPropias())[nombre.slice(7)];
    const base = f && (f.r ?? Object.values(f)[0]);
    if (!base) throw new Error(`fuente no instalada: ${nombre.slice(7)}`);
    por = async (e) => [f[e] ?? base];
  } else {
    por = (e) => Promise.all(SUBCONJUNTOS.flatMap((s) => urls[`../../node_modules/@fontsource/${nombre}/files/${nombre}-${s}-${ARCHIVO[e]}.woff`] ?? []).map(async (url) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`fuente ${nombre} ${e}: ${r.status}`);
      return new Uint8Array(await r.arrayBuffer());
    }));
  }
  return Object.fromEntries(await Promise.all(ESTILOS.map(async (e) => [e, await por(e)]))) as Record<Estilo, Uint8Array[]>;
}

// Nombre CSS de la vista previa: una familia por archivo, en el mismo orden en que se buscan los caracteres.
const css = (nombre: string) => nombre.replace(/[^\w-]/g, "_");
export const pilaCss = (nombre: NombreFuente, e: Estilo, partes: number) => Array.from({ length: partes }, (_, i) => `mq-${css(nombre)}-${e}-${i}`).join(", ");

// Además de las métricas, registra cada archivo como fuente del documento para la vista previa.
export function cargarFamilia(nombre: NombreFuente): Promise<Familia> {
  if (nombre === "courier") return Promise.resolve(COURIER);
  let p = cache.get(nombre);
  if (!p) {
    p = archivos(nombre).then(async (a) => Object.fromEntries(await Promise.all(ESTILOS.map(async (e) => {
      await Promise.all(a[e].map(async (datos, i) => document.fonts.add(await new FontFace(`mq-${css(nombre)}-${e}-${i}`, datos.slice().buffer as ArrayBuffer).load())));
      return [e, leerFuente(...a[e])] as const;
    }))) as Familia);
    p.catch(() => cache.delete(nombre));
    cache.set(nombre, p);
  }
  return p;
}
