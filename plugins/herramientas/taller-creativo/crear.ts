// Puro: generadores del Taller creativo (personaje, lugar, objeto, conflicto, giro, «¿y si…?», ejercicio, título).
// Todo sale de la historia: género, época y cultura del proyecto, y los personajes que ya existen ({A}, {B}).
// Test: node plugins/herramientas/herramientas.test.ts
import type { Card } from "../../../src/tree.ts";
import { EPOCAS, culturasDe, cultura, nombreCompleto, type Cultura, type Epoca, type Genero } from "../_comun/nombres.ts";
import * as D from "./datos.ts";

export interface Ctx { genero: D.GeneroHistoria; epoca: Epoca; cultura?: string; en: boolean; cards: Card[]; premisa?: string; rnd?: () => number }
type Rnd = () => number;
const r0 = (c: Ctx): Rnd => c.rnd ?? Math.random;
const pick = <T,>(a: readonly T[], r: Rnd) => a[Math.floor(r() * a.length)];
const lado = (s: string, en: boolean) => s.split("|")[en ? 1 : 0] ?? s;
const may = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Marcas de género gramatical del español ({o}, {a}, {lo}, {el}, {ella}).
export const conGenero = (s: string, g: "f" | "m") =>
  s.replace(/\{o\}/g, g === "f" ? "a" : "o").replace(/\{a\}/g, g === "f" ? "a" : "").replace(/\{lo\}/g, g === "f" ? "la" : "lo").replace(/\{el\}/g, g === "f" ? "la" : "el").replace(/\{ella\}/g, g === "f" ? "ella" : "él");

// Oficios: se adaptan las palabras antes de la primera preposición («programadora de…» -> «programador de…»).
const INVARIABLE = new Set(["soldado", "piloto", "policía", "guardabosques", "agente", "estudiante", "forense", "periodista", "contrabandista", "aprendiz", "escriba", "juglar", "bardo", "sufragista", "partera", "creadora", "minero", "médico", "músico"]);
const ESPECIAL: Record<string, [string, string]> = { actriz: ["actriz", "actor"], institutriz: ["institutriz", "preceptor"], sacerdotisa: ["sacerdotisa", "sacerdote"], princesa: ["princesa", "príncipe"], bruja: ["bruja", "brujo"], maga: ["maga", "mago"], hija: ["hija", "hijo"], niña: ["niña", "niño"], abuelo: ["abuela", "abuelo"], dragón: ["dragona", "dragón"], gato: ["gata", "gato"], partera: ["partera", "partero"], creadora: ["creadora", "creador"], minero: ["minera", "minero"], médico: ["médica", "médico"], músico: ["música", "músico"], monje: ["monja", "monje"], caballero: ["dama", "caballero"], sacerdote: ["sacerdotisa", "sacerdote"] };
function palabra(w: string, g: "f" | "m"): string {
  const e = ESPECIAL[w.toLowerCase()];
  if (e) return e[g === "f" ? 0 : 1];
  if (INVARIABLE.has(w.toLowerCase())) return w;
  if (g === "m") return w.replace(/dora$/, "dor").replace(/tora$/, "tor").replace(/ona$/, "ón").replace(/era$/, "ero").replace(/(?<!ist|ent|l)a$/, "o");
  return w.replace(/(d|t)or$/, "$1ora").replace(/ón$/, "ona").replace(/ero$/, "era").replace(/o$/, "a");
}
export function oficioEs(s: string, g: "f" | "m"): string {
  const ws = s.split(" ");
  const corte = ws.findIndex((w, i) => i > 0 && /^(de|del|sin|con|que|en|a|al)$/.test(w));
  return ws.map((w, i) => (corte < 0 || i < corte ? palabra(w, g) : w.replace(/^maga$/, g === "f" ? "maga" : "mago"))).join(" ");
}

export const mundoDe = (g: D.GeneroHistoria, e: Epoca): D.Mundo =>
  g === "fantasia" || e === "fantasia" ? "fantasia" : g === "scifi" || g === "distopia" || e === "futuro" ? "futuro" : e === "antigua" || e === "medieval" ? "antiguo" : e === "moderna" || e === "s19" ? "s19" : "actual";

// Culturas de las que salen los nombres: la elegida, o las de la época (fantasía: inventadas y medievales).
export function culturasPara(c: Ctx): Cultura[] {
  const una = c.cultura && cultura(c.cultura);
  if (una) return [una];
  const m = mundoDe(c.genero, c.epoca);
  if (m === "fantasia") return [...culturasDe("fantasia"), ...culturasDe("medieval")];
  if (m === "futuro") return culturasDe("futuro");
  return culturasDe(c.epoca);
}

// {A}: el protagonista (la primera ficha de personaje); {B}: otro personaje. Si no hay, una referencia genérica.
function rellenar(s: string, c: Ctx, r: Rnd, g: "f" | "m" = "f"): string {
  const pj = c.cards.filter((x) => x.type === "character");
  const A = pj[0]?.name ?? (c.en ? "the protagonist" : "la protagonista");
  const otros = pj.slice(1);
  const B = otros.length ? pick(otros, r).name : c.en ? "someone close" : "alguien cercano";
  const t = s.replace(/\{A\}/g, A).replace(/\{B\}/g, B);
  return c.en ? t : conGenero(t, g);
}
const tx = (s: string, c: Ctx, r: Rnd, g: "f" | "m" = "f") => rellenar(lado(s, c.en), c, r, g);

export interface Personaje { card: Card; rol: D.Rol; preguntas: string[] }

// Personaje completo: nombre de la cultura y época, edad según su papel, oficio de su mundo, virtudes, defecto,
// herida -> mentira -> verdad (el arco), deseo, miedo, secreto, manía, voz, rasgo físico y su relación con el protagonista.
export function personaje(c: Ctx, rol: D.Rol, genero: Genero = "x"): Personaje {
  const r = r0(c);
  const cu = pick(culturasPara(c), r);
  const n = nombreCompleto(cu, genero, r, c.en);
  const g = n.genero;
  const T = (s: string) => tx(s, c, r, g);
  const [a0, a1] = c.genero === "juvenil" && (rol === "protagonista" || rol === "amor" || rol === "rival") ? [13, 18] : c.genero === "infantil" && rol === "protagonista" ? [7, 12] : D.EDAD[rol];
  const edad = a0 + Math.floor(r() * (a1 - a0 + 1));
  const oficios = [...D.OFICIOS[mundoDe(c.genero, c.epoca)], ...(D.OFICIO_GENERO[c.genero] ?? [])];
  const oficio = lado(pick(oficios, r), c.en);
  const v1 = pick(D.VIRTUDES, r);
  let v2 = pick(D.VIRTUDES, r);
  for (let i = 0; v2 === v1 && i < 5; i++) v2 = pick(D.VIRTUDES, r);
  const h = Math.floor(r() * D.HERIDAS.length);
  const mentira = T(D.MENTIRAS[h]), verdad = T(D.VERDADES[h]);
  const epoca = EPOCAS.find(([e]) => e === cu.epoca)!;
  const pj = c.cards.filter((x) => x.type === "character");
  const prot = rol !== "protagonista" ? pj[0] : undefined;
  const L = (es: string, en: string) => (c.en ? en : es);
  const notas = [
    `${L("Papel", "Role")}: ${lado(D.ROLES.find(([x]) => x === rol)![1], c.en)}. ${T(pick(D.PAPEL[rol], r))}`,
    `${L("Quiere", "Wants")}: ${T(pick(D.DESEOS, r))}.`,
    `${L("Necesita", "Needs")}: ${L("aceptar que", "to accept that")} ${verdad}.`,
    `${L("Miedo", "Fear")}: ${T(pick(D.MIEDOS, r))}.`,
    `${L("Secreto", "Secret")}: ${T(pick(D.SECRETOS, r))}.`,
    `${L("Voz", "Voice")}: ${T(pick(D.VOCES, r))}.`,
    `${L("Rasgo físico", "Physical trait")}: ${T(pick(D.RASGOS_FISICOS, r))}.`,
  ].join("\n");
  const preguntas = [
    L(`¿Qué haría ${n.nombre} si lograra lo que quiere a mitad de la historia?`, `What would ${n.nombre} do if they got what they want halfway through?`),
    L(`¿Qué escena obligaría a ${n.nombre} a enfrentarse a su miedo?`, `Which scene would force ${n.nombre} to face their fear?`),
    ...(c.premisa ? [L(`¿Cómo complica ${n.nombre} esta premisa: «${c.premisa}»?`, `How does ${n.nombre} complicate this premise: “${c.premisa}”?`)] : []),
  ];
  const card: Card = {
    id: crypto.randomUUID(), type: "character", name: n.completo, ...(n.completo !== n.nombre ? { alias: n.nombre } : {}),
    age: String(edad), job: c.en ? oficio : oficioEs(oficio, g), origin: `${cu.region} · ${c.en ? epoca[2] : epoca[1]}`,
    virtues: [T(v1), T(v2)].join(", "), flaw: T(pick(D.DEFECTOS, r)), backstory: may(T(D.HERIDAS[h])) + ".", lie: may(mentira) + ".",
    arc: L(`De creer que ${mentira} a aceptar que ${verdad}.`, `From believing ${mentira} to accepting ${verdad}.`), trait: may(T(pick(D.MANIAS, r))) + ".",
    notes: notas, ...(prot ? { links: [{ to: prot.id, label: T(D.VINCULO[rol]) }] } : {}),
  };
  return { card, rol, preguntas };
}

// Rol sugerido: protagonista si no hay personajes; luego antagonista, mentor, aliado… según lo que falte.
export function rolSugerido(cards: Card[]): D.Rol {
  const n = cards.filter((x) => x.type === "character").length;
  return (["protagonista", "antagonista", "mentor", "aliado", "amor", "rival", "secundario"] as D.Rol[])[Math.min(n, 6)];
}

export function lugar(c: Ctx): Card {
  const r = r0(c);
  const cu = pick(culturasPara(c), r);
  const tipo = lado(pick(D.LUGARES[mundoDe(c.genero, c.epoca)], r), c.en);
  const nombre = cu.ap.length && cu.modo !== "inventado" ? pick(cu.ap, r) : nombreCompleto(cu, "x", r).nombre;
  const name = c.en ? `${nombre} ${tipo.replace(/\b\w/g, (x) => x.toUpperCase())}` : `${may(tipo)} de ${nombre}`;
  const notes = [`${c.en ? "A" : "Un lugar"} ${tx(pick(D.ATMOSFERAS, r), c, r)}.`, may(tx(pick(D.SENTIDOS, r), c, r)) + ".", `${c.en ? "Secret" : "Secreto"}: ${tx(pick(D.SECRETOS_LUGAR, r), c, r)}.`].join("\n");
  return { id: crypto.randomUUID(), type: "place", name, notes };
}

export function objeto(c: Ctx): Card {
  const r = r0(c);
  const o = lado(pick(D.OBJETOS, r), c.en), m = lado(pick(D.MATERIALES, r), c.en);
  return { id: crypto.randomUUID(), type: "object", name: may(c.en ? `${o} ${m}` : `${o} ${m}`), notes: `${c.en ? "History" : "Historia"}: ${tx(pick(D.HISTORIAS_OBJETO, r), c, r)}.` };
}

export type Idea = "conflicto" | "giro" | "chispa" | "ejercicio" | "titulo";
export function idea(c: Ctx, k: Idea): string {
  const r = r0(c);
  if (k === "titulo") return `${tx(pick(D.TITULOS_A, r), c, r)} ${tx(pick(D.TITULOS_B, r), c, r)}`;
  const t = { conflicto: D.CONFLICTOS, giro: D.GIROS, chispa: D.CHISPAS, ejercicio: D.EJERCICIOS }[k];
  return tx(pick(t, r), c, r);
}

// «Estoy atascado»: tres empujones distintos para seguir escribiendo ahora mismo.
export const atasco = (c: Ctx): string[] => [idea(c, "ejercicio"), idea(c, "conflicto"), idea(c, "chispa")];
