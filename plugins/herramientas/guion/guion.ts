// Lógica pura del plugin Guion (sin React/TipTap). Test: node plugins/herramientas/herramientas.test.ts
// Cada párrafo de una escena lleva su elemento en data-sp; sin atributo es acción.
// Formato de industria: Courier 12 pt, interlineado sencillo (1 página ≈ 1 minuto), márgenes de 1" (izquierdo 1,5"
// por la encuadernación), sangrías desde el borde izquierdo de la página: personaje 3,8" (9,65 cm), diálogo 2,6"
// (6,6 cm, 35 caracteres de ancho), acotación 3,25" (8,26 cm), transición a la derecha.
// Teatro, cómic y radio/pódcast usan los mismos párrafos con otros elementos (viñeta, cartela, onomatopeya, música…).
import { conTexto, scenes } from "../../../src/tree.ts";
import type { Formato, Node } from "../../../src/tree.ts";

export type Elem = "heading" | "action" | "character" | "paren" | "dialogue" | "transition" | "caption" | "sfx" | "music";
export type FormatoGuion = "film" | "theatre" | "comic" | "audio";
export const fg = (f?: Formato): FormatoGuion => (f === "theatre" || f === "comic" || f === "audio" ? f : "film");
// Elementos de cada formato en el orden de Tab (Mayús+Tab al revés), como en los programas de guion.
const ELEMS: Record<FormatoGuion, Elem[]> = {
  film: ["action", "character", "dialogue", "paren", "transition", "heading"],
  theatre: ["action", "character", "dialogue", "paren", "heading"],
  comic: ["action", "character", "dialogue", "caption", "sfx", "heading"],
  audio: ["action", "character", "dialogue", "paren", "music", "heading"],
};
export const elementos = (f?: Formato) => ELEMS[fg(f)];
export const ELEMENTOS = ELEMS.film;
const TODOS: Elem[] = ["heading", "action", "character", "paren", "dialogue", "transition", "caption", "sfx", "music"];
export const NOMBRE: Record<Elem, string> = { heading: "Encabezado", action: "Acción", character: "Personaje", paren: "Acotación", dialogue: "Diálogo", transition: "Transición", caption: "Cartela", sfx: "Onomatopeya", music: "Música" };
export const NOMBRE_EN: Record<Elem, string> = { heading: "Scene heading", action: "Action", character: "Character", paren: "Parenthetical", dialogue: "Dialogue", transition: "Transition", caption: "Caption", sfx: "Sound effect", music: "Music" };
// Lo que cambia de nombre según el formato: [es, en].
const OTRO: Partial<Record<FormatoGuion, Partial<Record<Elem, [string, string]>>>> = {
  theatre: { heading: ["Escena / cuadro", "Scene"], action: ["Acotación", "Stage direction"], paren: ["Aparte", "Aside"] },
  comic: { heading: ["Viñeta", "Panel"], action: ["Descripción", "Description"] },
  audio: { heading: ["Segmento", "Segment"], action: ["Sonido", "Sound"], character: ["Voz", "Voice"] },
};
export const nombreElem = (e: Elem, f?: Formato, en = false) => OTRO[fg(f)]?.[e]?.[en ? 1 : 0] ?? (en ? NOMBRE_EN : NOMBRE)[e];
export const elem = (v: unknown): Elem => (TODOS.includes(v as Elem) ? (v as Elem) : "action");
export const MAYUS: Elem[] = ["heading", "character", "transition", "sfx"]; // siempre en mayúsculas

// Qué viene después al pulsar Intro.
const TRAS: Record<Elem, Elem> = { heading: "action", action: "action", character: "dialogue", paren: "dialogue", dialogue: "action", transition: "heading", caption: "action", sfx: "action", music: "action" };
const TRAS_COMIC: Partial<Record<Elem, Elem>> = { dialogue: "character", heading: "action", action: "character" };
export const siguiente = (e: Elem, f?: Formato) => (fg(f) === "comic" ? TRAS_COMIC[e] : undefined) ?? TRAS[e];
export const ciclo = (e: Elem, dir: 1 | -1, f?: Formato) => { const l = elementos(f); const i = Math.max(0, l.indexOf(e)); return l[(i + dir + l.length) % l.length]; };

// Reconoce el elemento por lo escrito: «INT. CASA - NOCHE», «CORTE A:», «fundido a negro», «(en voz baja)».
const ENCABEZADO = /^(INT|EXT|INT\.?\/EXT|I\/E|EST)[.\s]/i;
const TRANSICION = /^(corte|fundido|encadenado|disolvencia|barrido|cortinilla|cut|dissolve|smash cut|match cut|jump cut|fade|wipe)\b.*\b(a|to|in|out|negro|black)\b[:.]?$/i;
export function detectar(texto: string, actual: Elem, f?: Formato): Elem {
  const s = texto.trim();
  const g = fg(f);
  if (g === "comic" && /^(viñeta|panel)\s*\d*\b/i.test(s)) return "heading";
  if (g === "theatre" && /^(escena|cuadro|acto|scene|act)\s+[\dIVXLC]+\b/i.test(s)) return "heading";
  if (g === "audio" && /^(sfx|fx|sonido|sound)\s*:/i.test(s)) return "action";
  if (g === "audio" && /^(música|musica|music)\s*:/i.test(s)) return "music";
  if (g !== "film") return (actual === "dialogue" || actual === "character") && /^\(.*\)?$/.test(s) ? "paren" : actual;
  if (ENCABEZADO.test(s)) return "heading";
  if (/^[\p{Lu}\s.]+\s(A|TO):$/u.test(s) || TRANSICION.test(s)) return "transition";
  if ((actual === "dialogue" || actual === "character") && /^\(.*\)?$/.test(s)) return "paren";
  return actual;
}

// Encabezado completo: INT./EXT., lugar y momento («INT. CASA DE ANA - NOCHE»).
export const encabezadoOk = (t: string) => /^(INT|EXT|INT\.?\/EXT\.?|I\/E|EST)\.?\s+\S.*\s[-–—]\s*\S+/i.test(t.trim());

// Autocompletar personaje: el nombre conocido que empieza por lo escrito (los más usados primero). null si no hay o ya es uno.
export function completar(texto: string, nombres: string[]): string | null {
  const p = texto.trim().toUpperCase();
  if (!p || nombres.includes(p)) return null;
  return nombres.find((n) => n.startsWith(p)) ?? null;
}

const dec = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim();
// Solo negrita, cursiva y subrayado (nombres, lugares o sonidos importantes en la acción); el resto de etiquetas fuera.
const inlineSeguro = (h: string) => h.replace(/<(\/?)(strong|em|b|i|u)\b[^>]*>|<[^>]+>/gi, (_, c, tag) => (tag ? `<${c}${tag.toLowerCase()}>` : "")).replace(/&nbsp;/g, " ").trim();
export interface Linea { e: Elem; t: string; h: string } // t: texto plano; h: HTML seguro
export const lineas = (html = ""): Linea[] =>
  [...html.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi)].map((m) => ({ e: elem(m[1].match(/data-sp="([a-z]+)"/)?.[1]), t: dec(m[2]), h: inlineSeguro(m[2]) })).filter((l) => l.t);

// Quién habla en la escena: nombres de los elementos Personaje, sin extensiones («ANA (V.O.)» = ANA).
export const reparto = (html = "") => [...new Set(lineas(html).filter((l) => l.e === "character").map((l) => l.t.replace(/\s*\(.*\)\s*$/, "").toUpperCase()))];
export const encabezado = (html = "") => lineas(html).find((l) => l.e === "heading")?.t.toUpperCase();
// Personajes del guion por número de escenas en que hablan (para autocompletar).
export function personajes(obra: Node, extra: string[] = []): string[] {
  const c = new Map<string, number>();
  scenes(obra).forEach(({ scene }) => reparto(scene.content).forEach((p) => c.set(p, (c.get(p) ?? 0) + 1)));
  extra.map((x) => x.trim().toUpperCase()).filter(Boolean).forEach((p) => c.set(p, c.get(p) ?? 0));
  const nombre = (p: string) => p.length <= 30 && p.split(/\s+/).length <= 4; // una frase marcada como personaje por error no es un nombre («DR. LÓPEZ» sí)
  return [...c].filter(([p]) => nombre(p)).sort((a, b) => b[1] - a[1]).map(([p]) => p);
}

// Páginas aproximadas: 55 líneas por página; ancho en caracteres de Courier 12 (10 por pulgada) de cada elemento.
const ANCHO: Record<Elem, number> = { heading: 60, action: 60, character: 38, paren: 20, dialogue: 35, transition: 60, caption: 60, sfx: 60, music: 60 };
export function paginas(html = ""): number {
  const ls = lineas(html).reduce((n, l) => n + Math.ceil(l.t.length / ANCHO[l.e]) + (l.e === "character" || l.e === "paren" ? 0 : 1) + (l.e === "heading" ? 1 : 0), 0);
  return ls / 55;
}

// Papel: Carta en EE. UU. y Canadá; A4 en Europa y Latinoamérica.
export type Papel = "A4" | "letter";
export const papelPara = (lang = "") => (/^en(-US|-CA)?$|^es-US$/i.test(lang) ? "letter" : "A4") as Papel;

// Fountain (https://fountain.io): el formato de texto plano de los guionistas.
export function fountain(obra: Node): string {
  const out: string[] = [`Title: ${obra.title}`, ...(obra.meta?.author ? [`Author: ${obra.meta.author}`] : []), `Draft date: ${obra.meta?.year || new Date().toLocaleDateString("sv")}`, ""];
  const walk = (n: Node) => {
    if (n.kind === "act") out.push(`# ${n.title}`, "");
    if (conTexto(n.kind)) {
      for (const l of lineas(n.content)) {
        const T = l.t.toUpperCase();
        if (l.e === "heading") out.push(ENCABEZADO.test(l.t) ? T : "." + T, "");
        else if (l.e === "character") out.push(/\p{Ll}/u.test(l.t.replace(/\(.*\)/, "")) ? "@" + T : T);
        else if (l.e === "paren") out.push(l.t.startsWith("(") ? l.t : `(${l.t})`);
        else if (l.e === "dialogue") out.push(l.t, "");
        else if (l.e === "transition") out.push(/\s(A|TO):$/.test(T) ? T : "> " + T, "");
        else out.push(l.t, "");
      }
    }
    n.children.forEach(walk);
  };
  obra.children.forEach(walk);
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

