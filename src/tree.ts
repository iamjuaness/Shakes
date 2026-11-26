// Modelo del manuscrito: [universo ->] [saga ->] libro -> [partes ->] capítulos (con el texto).
// Un guion (plugin «Guion») es la otra obra posible: guion -> [actos ->] escenas (con el texto).
// La raíz del proyecto es una obra, o una saga/universo que agrupa obras (las fichas son compartidas por todas).
// "blank": raíz sin tipo (proyecto en blanco o raíz borrada): admite cualquier nivel como hijo directo.
import { getLang, t } from "./i18n.ts";
export type Kind = "blank" | "universe" | "saga" | "book" | "script" | "part" | "act" | "chapter" | "scene";

// Tipo de obra: decide cómo se llaman sus piezas (capítulo, poema, entrada, página…) y cómo se edita.
// Las de base "book" se escriben en prosa o verso; las de base "script", por elementos (plugin Guion).
export type Formato = "novel" | "short" | "poetry" | "essay" | "article" | "diary" | "letters" | "film" | "theatre" | "comic" | "audio";
export const FORMATOS: Record<Formato, { base: "book" | "script"; u: [string, string]; g: [string, string] }> = {
  novel: { base: "book", u: ["Capítulo", "Chapter"], g: ["Parte", "Part"] },
  short: { base: "book", u: ["Sección", "Section"], g: ["Parte", "Part"] },
  poetry: { base: "book", u: ["Poema", "Poem"], g: ["Sección", "Section"] },
  essay: { base: "book", u: ["Capítulo", "Chapter"], g: ["Parte", "Part"] },
  article: { base: "book", u: ["Artículo", "Article"], g: ["Serie", "Series"] },
  diary: { base: "book", u: ["Entrada", "Entry"], g: ["Cuaderno", "Notebook"] },
  letters: { base: "book", u: ["Carta", "Letter"], g: ["Parte", "Part"] },
  film: { base: "script", u: ["Escena", "Scene"], g: ["Acto", "Act"] },
  theatre: { base: "script", u: ["Escena", "Scene"], g: ["Acto", "Act"] },
  comic: { base: "script", u: ["Página", "Page"], g: ["Número", "Issue"] },
  audio: { base: "script", u: ["Escena", "Scene"], g: ["Episodio", "Episode"] },
};

// Datos editoriales de un libro (o saga/universo): salen en la portada de las exportaciones. formato: tipo de obra (libro o guion).
export interface Meta { author?: string; year?: string; blurb?: string; cover?: string; cw?: number; ch?: number; formato?: Formato } // cover = data URL de la imagen (cw×ch px)

export interface Node {
  id: string;
  kind: Kind;
  title: string;
  content?: string; // HTML del texto (solo capítulos y escenas)
  summary?: string; // sinopsis breve (corcho)
  goal?: number; // meta de palabras de la escena
  meta?: Meta; // solo universo/saga/libro/guion
  status?: Status; // estado del capítulo/escena (borrador/revisada/final)
  date?: string; // fecha en la línea de tiempo cronológica (texto libre; ordena lexicográficamente, usar ISO)
  children: Node[];
}

// Qué tipos de hijo admite cada nivel (el primero es el que crea «+»). Un libro tiene capítulos, sueltos o en partes;
// las escenas solo existen en los guiones. Un universo admite sagas, libros y guiones sueltos.
export const ACEPTA: Record<Kind, Kind[]> = {
  blank: ["chapter", "part", "book", "script", "saga", "universe"], universe: ["saga", "book", "script"], saga: ["book"],
  book: ["chapter", "part"], part: ["chapter"], script: ["scene", "act"], act: ["scene"], chapter: [], scene: [],
};
export const childKind = Object.fromEntries(Object.entries(ACEPTA).map(([k, v]) => [k, v[0] ?? null])) as Record<Kind, Kind | null>;
export const esContenedor = (k: Kind) => k === "universe" || k === "saga";
export const esObra = (k: Kind) => k === "book" || k === "script"; // tiene datos editoriales y se exporta sola
export const conTexto = (k: Kind) => k === "chapter" || k === "scene"; // donde se escribe

// Nombre de un tipo de nodo según el tipo de obra («Poema», «Entrada», «Página»…); sin formato, el genérico.
export function etiqueta(kind: Kind, formato?: Formato, mayus = true): string {
  const f = formato && FORMATOS[formato];
  const par = f && (conTexto(kind) ? f.u : kind === "part" || kind === "act" ? f.g : null);
  const s = par ? par[getLang() === "en" ? 1 : 0] : t(`kindT.${kind}`);
  return mayus ? s : s.toLowerCase();
}
export const formatoDe = (root: Node, id: string): Formato | undefined => { const o = bookOf(root, id); return o?.meta?.formato ?? (o?.kind === "script" ? "film" : o ? "novel" : undefined); };

// Un diario titula cada entrada con la fecha del día.
export function newNode(kind: Kind, n: number, formato?: Formato): Node {
  const title = formato === "diary" && conTexto(kind) ? new Date().toLocaleDateString(getLang(), { day: "numeric", month: "long", year: "numeric" }) : `${etiqueta(kind, formato)} ${n}`;
  return { id: crypto.randomUUID(), kind, title, content: conTexto(kind) ? "" : undefined, children: [] };
}

export function find(root: Node, id: string): Node | undefined {
  if (root.id === id) return root;
  for (const c of root.children) {
    const hit = find(c, id);
    if (hit) return hit;
  }
}

// Devuelve un árbol nuevo con el nodo `id` modificado por `fn` (inmutable, para React).
export function update(root: Node, id: string, fn: (n: Node) => Node): Node {
  if (root.id === id) return fn(root);
  return { ...root, children: root.children.map((c) => update(c, id, fn)) };
}

export function addChild(root: Node, parentId: string, want?: Kind): [Node, Node | null] {
  const parent = find(root, parentId);
  const kind = parent && (want && ACEPTA[parent.kind].includes(want) ? want : childKind[parent.kind]);
  if (!kind) return [root, null];
  const child = newNode(kind, parent.children.length + 1, formatoDe(root, parentId));
  return [update(root, parentId, (p) => ({ ...p, children: [...p.children, child] })), child];
}

export function remove(root: Node, id: string): Node {
  return { ...root, children: root.children.filter((c) => c.id !== id).map((c) => remove(c, id)) };
}

export function countWords(html = ""): number {
  const text = html.replace(/<[^>]+>/g, " ").trim();
  return text ? text.split(/\s+/).length : 0;
}

export function totalWords(n: Node): number {
  return countWords(n.content) + n.children.reduce((s, c) => s + totalWords(c), 0);
}

// Libro nuevo: un capítulo (o poema, entrada…) listo para escribir; las partes se añaden si se quieren.
export function sampleBook(formato?: Formato): Node {
  const book: Node = { ...newNode("book", 1), title: "Mi historia", ...(formato && formato !== "novel" ? { meta: { formato } } : {}) };
  return addChild(book, book.id)[0];
}

export function sampleScript(formato?: Formato): Node {
  const s: Node = { ...newNode("script", 1), title: t("kindT.script"), ...(formato && formato !== "film" ? { meta: { formato } } : {}) };
  return addChild(s, s.id)[0];
}

function insertBefore(root: Node, targetId: string, n: Node): Node {
  return { ...root, children: root.children.flatMap((c) => (c.id === targetId ? [n, c] : [insertBefore(c, targetId, n)])) };
}

// Mueve `id` sobre `targetId`: dentro si el destino acepta ese tipo de hijo, antes si es del mismo tipo; si no, no hace nada.
export function move(root: Node, id: string, targetId: string): Node {
  const node = find(root, id);
  const target = find(root, targetId);
  if (!node || !target || id === root.id || id === targetId || find(node, targetId)) return root;
  if (ACEPTA[target.kind].includes(node.kind)) {
    return update(remove(root, id), targetId, (t) => ({ ...t, children: [...t.children, node] }));
  }
  if (target.kind === node.kind) return insertBefore(remove(root, id), targetId, node);
  return root;
}

export function htmlToMd(html = ""): string {
  return html
    .replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gis, (_, l, t) => `${"#".repeat(Math.min(6, +l + 4))} ${t}\n\n`)
    .replace(/<\/?(strong|b)>/gi, "**")
    .replace(/<\/?(em|i)>/gi, "*")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<br\s*\/?>/gi, "  \n")
    .replace(/<hr\s*\/?>/gi, "\n\n* * *\n\n")
    .replace(/<\/(p|li|ul|ol|blockquote)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const level: Record<Kind, number> = { blank: 0, universe: 1, saga: 2, book: 3, script: 3, part: 4, act: 4, chapter: 5, scene: 5 };

// «de Autor · 2024» y la sinopsis de un nodo con metadatos.
export const lineaMeta = (m?: Meta) => [m?.author && `de ${m.author}`, m?.year].filter(Boolean).join(" · ");

// El encabezado de la raíz es # y los demás bajan según su nivel; un libro suelto sigue empezando en #.
export function toMarkdown(n: Node, base = level[n.kind] - 1): string {
  const own = `${"#".repeat(Math.min(6, level[n.kind] - base))} ${n.title}\n\n${n.meta ? [lineaMeta(n.meta) && `*${lineaMeta(n.meta)}*`, n.meta.blurb && "> " + n.meta.blurb.replace(/\n+/g, " ")].filter(Boolean).join("\n\n") + "\n\n" : ""}${conTexto(n.kind) ? htmlToMd(n.content) + "\n\n" : ""}`;
  return own + n.children.map((c) => toMarkdown(c, base)).join("");
}

// Ficha del mundo (personaje, lugar...).
export type CardType = "character" | "place" | "object" | "faction";
export const CARD_TYPES: CardType[] = ["character", "place", "object", "faction"];
// Los proyectos antiguos guardaban el tipo en español: se migra al leer (normalize).
const OLD_TYPE: Record<string, CardType> = { Personaje: "character", Lugar: "place", Objeto: "object", "Facción": "faction" };
export const fixCards = (cs: any[] | undefined): Card[] => (cs ?? []).map((c) => (CARD_TYPES.includes(c?.type) ? c : { ...c, type: OLD_TYPE[c?.type] ?? "character" }));
export const STATUSES = ["draft", "revised", "final"] as const; // estado de una escena
export type Status = (typeof STATUSES)[number];
export interface Link { to: string; label: string }
// Ficha de personaje: además de nombre y apodos lleva los campos de CHAR_FIELDS (solo se muestran si type === "character").
export const CHAR_SHORT = ["age", "job", "origin"] as const; // una línea
export const CHAR_LONG = ["virtues", "flaw", "backstory", "lie", "arc", "trait"] as const; // varias líneas
export type CharField = (typeof CHAR_SHORT)[number] | (typeof CHAR_LONG)[number];
export interface Card extends Partial<Record<CharField, string>> { id: string; type: CardType; name: string; alias?: string; notes: string; links?: Link[]; x?: number; y?: number } // alias: apodos o nombres cortos separados por comas
export interface Version { id: string; at: string; label: string; auto?: boolean; book: Node; cards: Card[] }
export interface DayLog { start: number; end: number }
// ext: datos de plugins, por id de herramienta. lang: idioma en que está escrita la obra (corrector); last: lo último que se abrió.
export interface Project { book: Node; cards: Card[]; goal: number; versions: Version[]; log: Record<string, DayLog>; dailyGoal: number; ext?: Record<string, any>; lang?: string; last?: string }

export type Tipo = "blank" | "book" | "script" | "saga" | "universe";

// `tipo`: en blanco (raíz vacía), libro suelto, o saga/universo con un primer libro dentro; `tpl`: libro con esa estructura. `title` nombra la raíz (vacío = nombre por defecto).
// `formato`: tipo de obra (poemario, diario, teatro…); el de base guion crea un guion aunque `tipo` sea "book".
export function newProject(tipo: Tipo = "book", title = "", tpl?: Template, lang: string = getLang(), formato?: Formato): Project {
  let root: Node;
  if (formato && FORMATOS[formato].base === "script") tipo = "script";
  if (tipo === "blank") root = { id: crypto.randomUUID(), kind: "blank", title: title || "Proyecto", children: [] };
  else if (tipo === "script") root = { ...sampleScript(formato), ...(title ? { title } : {}) };
  else if (tpl) root = applyTemplate({ ...newNode("book", 1), title: title || "Mi historia" }, tpl);
  else root = sampleBook(formato);
  if (tipo === "blank" || tipo === "script" || tpl) { /* ya está */ }
  else if (tipo === "book") { if (title) root.title = title; }
  else { root.title = "Libro 1"; root = wrapIn(root, tipo as "saga" | "universe", title || (tipo === "saga" ? "Mi saga" : "Mi universo")); }
  return { book: root, cards: [], goal: 0, versions: [], log: {}, dailyGoal: 0, lang };
}

// Proyectos antiguos: los capítulos de los libros tenían escenas. Ahora el capítulo guarda el texto: sus escenas se
// funden en él, separadas con <hr> («* * *» al exportar). Devuelve el mismo nodo si no había nada que fundir.
const AVANCE: Record<Status, number> = { draft: 0, revised: 1, final: 2 };
function fundir(ch: Node): Node {
  const ss = ch.children.filter((c) => c.kind === "scene");
  if (!ss.length) return ch;
  const conLetra = (h?: string) => !!h && h.replace(/<[^>]+>/g, "").trim() !== "";
  const st = ss.map((s) => s.status).filter((x): x is Status => !!x).sort((a, b) => AVANCE[a] - AVANCE[b])[0]; // el menos avanzado
  const goal = ss.reduce((n, s) => n + (s.goal ?? 0), ch.goal ?? 0);
  return {
    ...ch,
    content: [ch.content, ...ss.map((s) => s.content)].filter(conLetra).join("<hr>"),
    summary: [ch.summary, ...ss.map((s) => s.summary)].filter((x) => x?.trim()).join("\n") || undefined,
    goal: goal || undefined, status: ch.status ?? st, date: ch.date ?? ss.find((s) => s.date)?.date,
    children: ch.children.filter((c) => c.kind !== "scene"),
  };
}
export function aCapitulos(n: Node, guion = false): Node {
  if (n.kind === "script") guion = true;
  if (n.kind === "chapter" && !guion) return fundir(n);
  const cs = n.children.map((c) => aCapitulos(c, guion));
  return cs.some((c, i) => c !== n.children[i]) ? { ...n, children: cs } : n;
}

// Acepta proyectos guardados con el formato v0 (solo el libro).
export function normalize(raw: any): Project {
  if (raw?.kind === "book") return normalize({ book: raw });
  if (!["blank", "book", "script", "saga", "universe"].includes(raw?.book?.kind)) return newProject();
  const p: Project = { book: raw.book, cards: fixCards(raw.cards), goal: raw.goal ?? 0, versions: (raw.versions ?? []).map((v: any) => ({ ...v, cards: fixCards(v.cards) })), log: raw.log ?? {}, dailyGoal: raw.dailyGoal ?? 0, ext: raw.ext ?? {}, lang: typeof raw.lang === "string" ? raw.lang : undefined, last: typeof raw.last === "string" ? raw.last : undefined };
  const b = aCapitulos(p.book);
  return b === p.book ? p : { ...snapshot(p, t("snap.beforeChapters"), true), book: b };
}

// Versiones: snapshots del libro y fichas (inmutables, así que se comparte estructura en memoria).
// shortcut: sin límite ni diff; al crecer el archivo, podar versiones antiguas o guardar diffs.
const MAX_AUTO = 20;

export function snapshot(p: Project, label: string, auto = false): Project {
  const v: Version = { id: crypto.randomUUID(), at: new Date().toISOString(), label, auto, book: p.book, cards: p.cards };
  // Las copias automáticas se podan (las manuales nunca) para que el archivo no crezca sin límite.
  let n = 0;
  const versions = [v, ...p.versions].filter((x) => !x.auto || ++n <= MAX_AUTO);
  return { ...p, versions };
}

export function restore(p: Project, id: string): Project {
  const v = p.versions.find((x) => x.id === id);
  if (!v) return p;
  return { ...snapshot(p, "Antes de restaurar", true), book: aCapitulos(v.book), cards: v.cards };
}

export interface Scene { scene: Node; path: string }

// Unidades de texto en orden de lectura: capítulos de un libro o escenas de un guion (el nombre viene de cuando todo eran escenas).
export function scenes(n: Node, path = "", raiz = true): Scene[] {
  const here = raiz && (esObra(n.kind) || esContenedor(n.kind)) ? "" : path ? `${path} › ${n.title}` : n.title; // el título de la raíz no va en la ruta
  return conTexto(n.kind) ? [{ scene: n, path }] : n.children.flatMap((c) => scenes(c, here, false));
}

export const firstScene = (n: Node): Node | undefined => (conTexto(n.kind) ? n : n.children.map(firstScene).find(Boolean));
export const books = (n: Node): Node[] => (esObra(n.kind) ? [n] : n.children.flatMap(books));
// Obra (libro o guion) que contiene (o es) el nodo `id`; undefined si cuelga de una saga sin libro.
export function bookOf(root: Node, id: string): Node | undefined {
  if (esObra(root.kind)) return find(root, id) ? root : undefined;
  return root.children.map((c) => bookOf(c, id)).find(Boolean);
}
// Convierte el proyecto en una saga/universo: la raíz actual pasa a ser su primer libro.
export const wrapIn = (root: Node, kind: "saga" | "universe", title: string): Node => ({ ...newNode(kind, 1), title, children: [root] });

// Orden cronológico: por fecha; sin fecha al final, conservando el orden narrativo (sort estable).
export function chronological(list: Scene[]): Scene[] {
  return [...list].sort((a, b) => {
    const x = a.scene.date, y = b.scene.date;
    return x && y ? (x < y ? -1 : x > y ? 1 : 0) : x ? -1 : y ? 1 : 0;
  });
}

const STOP = new Set(("para como pero porque cuando donde desde entre hasta sobre este esta esto estos estas aquel aquella aquello tenía había fue era son muy más también sino cada todo toda todos todas hacia sin con por los las del que una uno unos unas ese esa eso esos esas ellos ellas ella él nos les sus mis tus nuestro vuestro alguno alguna ninguno otro otra otros otras mismo misma así aún ahora antes después luego entonces siempre nunca todavía bien mal solo sola tan tanto cuanto quien quién cual cuál qué cómo dónde cuándo ser estar tener haber hacer poder decir ir ver dar saber querer llegar pasar deber poner parecer quedar creer hablar llevar dejar seguir encontrar llamar venir pensar salir volver tomar conocer vivir sentir tratar mirar contar empezar esperar buscar existir entrar trabajar escribir perder producir ocurrir entender pedir recibir recordar terminar permitir aparecer conseguir comenzar servir sacar necesitar mantener resultar leer caer cambiar presentar crear abrir considerar oír acabar convertir ganar formar traer partir morir aceptar realizar suponer comprender lograr explicar preguntar tocar reconocer estudiar alcanzar nacer dirigir correr utilizar pagar ayudar gustar jugar escuchar cumplir ofrecer descubrir levantar intentar the and that with have this from they were their there what when which").split(" "));

export interface Style { words: number; sentences: number; avgSentence: number; longest: number; adverbs: number; top: [string, number][]; near: [string, number][]; readability: number }

// Sílabas aproximadas en español: grupos de vocales; dos vocales fuertes o una débil acentuada hacen hiato.
function syllables(word: string): number {
  const strong = "aeoáéó", vow = "aeiouáéíóúü";
  let n = 0;
  for (let i = 0; i < word.length; i++) {
    const c = word[i];
    if (!vow.includes(c)) continue;
    const p = word[i - 1];
    if (!p || !vow.includes(p) || (strong.includes(p) && strong.includes(c)) || "íú".includes(c) || "íú".includes(p)) n++;
  }
  return Math.max(n, 1);
}

// `names`: nombres de fichas; se excluyen de "más repetidas" (los personajes siempre dominan).
export function analyze(text: string, names: string[] = []): Style {
  const words = text.toLowerCase().match(/[\p{L}']+/gu) ?? [];
  const sentences = text.split(/[.!?…]+/).map((x) => x.trim()).filter(Boolean).map((x) => (x.match(/[\p{L}']+/gu) ?? []).length);
  const skip = new Set(names.flatMap((n) => n.toLowerCase().match(/[\p{L}']+/gu) ?? []));
  const freq = new Map<string, number>();
  const near = new Map<string, number>();
  const last = new Map<string, number>();
  words.forEach((w, i) => {
    if (w.length <= 3 || STOP.has(w) || skip.has(w)) return;
    freq.set(w, (freq.get(w) ?? 0) + 1);
    // repetición cercana: misma palabra dentro de las 25 anteriores
    if (w.length > 4 && i - (last.get(w) ?? -99) <= 25) near.set(w, (near.get(w) ?? 0) + 1);
    last.set(w, i);
  });
  const syl = words.reduce((t, w) => t + syllables(w), 0);
  const top = (m: Map<string, number>, n: number) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n);
  const avg = sentences.length ? words.length / sentences.length : 0;
  return {
    words: words.length,
    sentences: sentences.length,
    avgSentence: Math.round(avg * 10) / 10,
    longest: Math.max(0, ...sentences),
    adverbs: words.filter((w) => w.length > 6 && w.endsWith("mente")).length,
    top: top(freq, 10),
    near: top(near, 6),
    // Szigriszt-Pazos (INFLESZ): 206.835 − 62.3·sílabas/palabra − palabras/frase. 0-100, más alto = más fácil.
    readability: words.length && avg ? Math.round(206.835 - 62.3 * (syl / words.length) - avg) : 0,
  };
}

export const plainText = (n: Node): string => [conTexto(n.kind) ? (n.content ?? "").replace(/<\/(p|h\d|li)>/gi, ". ").replace(/<[^>]+>/g, " ") : "", ...n.children.map(plainText)].join(" ");

// Porcentaje de palabras en párrafos de diálogo (empiezan por raya o comillas).
export function dialogueShare(n: Node): number {
  let dlg = 0, all = 0;
  for (const { scene } of scenes(n)) {
    for (const m of (scene.content ?? "").matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
      const t = m[1].replace(/<[^>]+>/g, "").trim();
      const c = countWords(t);
      all += c;
      if (/^[—–\-«“"]/.test(t)) dlg += c;
    }
  }
  return all ? Math.round((dlg / all) * 100) : 0;
}

// ---------- Búsqueda y reemplazo ----------
const esc = (q: string) => q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface Hit { scene: Node; path: string; snippet: string; count: number }

export function search(book: Node, q: string): Hit[] {
  if (!q.trim()) return [];
  const re = new RegExp(esc(q), "giu");
  return scenes(book).flatMap(({ scene, path }) => {
    const text = plainText(scene).replace(/\s+/g, " ");
    const all = [...text.matchAll(re)];
    if (!all.length) return [];
    const i = all[0].index!;
    return [{ scene, path, count: all.length, snippet: (i > 30 ? "…" : "") + text.slice(Math.max(0, i - 30), i + q.length + 50).trim() }];
  });
}

// Reemplaza solo en el texto, nunca dentro de etiquetas HTML. Devuelve [libro nuevo, nº de reemplazos].
export function replaceAll(book: Node, q: string, r: string): [Node, number] {
  if (!q) return [book, 0];
  const re = new RegExp(esc(q), "giu");
  let count = 0;
  const go = (n: Node): Node =>
    conTexto(n.kind)
      ? { ...n, content: (n.content ?? "").replace(/(<[^>]*>)|([^<]+)/g, (_, tag, text) => (tag ? tag : text.replace(re, () => (count++, r)))) }
      : { ...n, children: n.children.map(go) };
  return [go(book), count];
}

// Nombre + apodos de una ficha (separados por comas), sin vacíos ni repetidos.
export const namesOf = (c: { name: string; alias?: string }): string[] =>
  [...new Set([c.name, ...(c.alias ?? "").split(",")].map((s) => s.trim()).filter(Boolean))];

// Escenas donde aparece una ficha (por nombre o apodo, palabra completa).
export function mentions(book: Node, name: string, alias = ""): Scene[] {
  const names = namesOf({ name, alias });
  if (!names.length) return [];
  const re = new RegExp(`(?<![\\p{L}\\d])(?:${names.map(esc).join("|")})(?![\\p{L}\\d])`, "iu");
  return scenes(book).filter(({ scene }) => re.test(plainText(scene)));
}

// ---------- Estructura ----------
// Intercambia el nodo con su hermano anterior (-1) o siguiente (1): alternativa de teclado al arrastrar.
export function shift(root: Node, id: string, dir: -1 | 1): Node {
  const go = (n: Node): Node => {
    const i = n.children.findIndex((c) => c.id === id);
    if (i < 0) return { ...n, children: n.children.map(go) };
    const j = i + dir;
    if (j < 0 || j >= n.children.length) return n;
    const cs = [...n.children];
    [cs[i], cs[j]] = [cs[j], cs[i]];
    return { ...n, children: cs };
  };
  return go(root);
}

export interface Template { name: string; parts: { title: string; chapters: string[] }[] }

export const TEMPLATES: Template[] = [
  { name: "Tres actos", parts: [
    { title: "Acto I: Planteamiento", chapters: ["Mundo ordinario", "Incidente incitador", "Primer punto de giro"] },
    { title: "Acto II: Confrontación", chapters: ["Obstáculos", "Punto medio", "Todo está perdido"] },
    { title: "Acto III: Resolución", chapters: ["Clímax", "Desenlace"] } ] },
  { name: "Viaje del héroe", parts: [
    { title: "Partida", chapters: ["Mundo ordinario", "Llamada a la aventura", "Rechazo de la llamada", "Encuentro con el mentor", "Cruce del umbral"] },
    { title: "Iniciación", chapters: ["Pruebas, aliados y enemigos", "Acercamiento a la caverna", "Calvario", "Recompensa"] },
    { title: "Retorno", chapters: ["Camino de regreso", "Resurrección", "Regreso con el elixir"] } ] },
  { name: "Save the Cat", parts: [
    { title: "Acto I", chapters: ["Imagen de apertura", "Tema", "Planteamiento", "Catalizador", "Debate", "Paso al acto II"] },
    { title: "Acto II", chapters: ["Trama B", "Diversión y juegos", "Punto medio", "Los malos se acercan", "Todo está perdido", "Noche oscura del alma", "Paso al acto III"] },
    { title: "Acto III", chapters: ["Final", "Imagen final"] } ] },
  { name: "Siete puntos", parts: [
    { title: "Historia", chapters: ["Gancho", "Primer punto de giro", "Primera presión", "Punto medio", "Segunda presión", "Segundo punto de giro", "Resolución"] } ] },
  { name: "Fábula", parts: [{ title: "Fábula", chapters: ["Presentación", "Nudo", "Desenlace", "Moraleja"] }] },
  { name: "Cuento", parts: [{ title: "Cuento", chapters: ["Inicio", "Conflicto", "Clímax", "Final"] }] },
];

const TEMPLATES_EN: Template[] = [
  { name: "Three acts", parts: [
    { title: "Act I: Setup", chapters: ["Ordinary world", "Inciting incident", "First plot point"] },
    { title: "Act II: Confrontation", chapters: ["Obstacles", "Midpoint", "All is lost"] },
    { title: "Act III: Resolution", chapters: ["Climax", "Denouement"] } ] },
  { name: "Hero's journey", parts: [
    { title: "Departure", chapters: ["Ordinary world", "Call to adventure", "Refusal of the call", "Meeting the mentor", "Crossing the threshold"] },
    { title: "Initiation", chapters: ["Tests, allies and enemies", "Approach to the inmost cave", "Ordeal", "Reward"] },
    { title: "Return", chapters: ["The road back", "Resurrection", "Return with the elixir"] } ] },
  { name: "Save the Cat", parts: [
    { title: "Act I", chapters: ["Opening image", "Theme stated", "Set-up", "Catalyst", "Debate", "Break into two"] },
    { title: "Act II", chapters: ["B story", "Fun and games", "Midpoint", "Bad guys close in", "All is lost", "Dark night of the soul", "Break into three"] },
    { title: "Act III", chapters: ["Finale", "Final image"] } ] },
  { name: "Seven points", parts: [
    { title: "Story", chapters: ["Hook", "Plot turn 1", "Pinch 1", "Midpoint", "Pinch 2", "Plot turn 2", "Resolution"] } ] },
  { name: "Fable", parts: [{ title: "Fable", chapters: ["Introduction", "Knot", "Outcome", "Moral"] }] },
  { name: "Short story", parts: [{ title: "Short story", chapters: ["Beginning", "Conflict", "Climax", "Ending"] }] },
];
// Estructuras integradas en el idioma de la interfaz (mismo orden y número que TEMPLATES).
export const templates = (): Template[] => (getLang() === "en" ? TEMPLATES_EN : TEMPLATES);

// Añade las partes de la plantilla al final del libro; cada capítulo, vacío y listo para escribir.
export function applyTemplate(book: Node, t: Template): Node {
  const parts = t.parts.map((p) => {
    const part = newNode("part", 0);
    part.title = p.title;
    part.children = p.chapters.map((title) => {
      const chapter = newNode("chapter", 0);
      chapter.title = title;
      return chapter;
    });
    return part;
  });
  return { ...book, children: [...book.children, ...parts] };
}

// ---------- Progreso diario ----------
export const today = () => new Date().toLocaleDateString("sv"); // AAAA-MM-DD

// Registra las palabras totales del día: `start` la primera vez que se ve ese día, `end` siempre. Devuelve el mismo objeto si nada cambia.
export function logWords(log: Record<string, DayLog>, day: string, words: number): Record<string, DayLog> {
  const d = log[day];
  if (d && d.end === words) return log;
  return { ...log, [day]: { start: d?.start ?? words, end: words } };
}

export const writtenOn = (log: Record<string, DayLog>, day: string) => Math.max(0, (log[day]?.end ?? 0) - (log[day]?.start ?? 0));

// ---------- Comparar versiones ----------
export interface Diff { added: Scene[]; removed: Scene[]; changed: Scene[]; wordDelta: number }

// `old` es la versión guardada, `cur` el libro actual.
export function diffVersions(old: Node, cur: Node): Diff {
  const a = new Map(scenes(old).map((s) => [s.scene.id, s]));
  const b = new Map(scenes(cur).map((s) => [s.scene.id, s]));
  return {
    added: [...b].filter(([id]) => !a.has(id)).map(([, s]) => s),
    removed: [...a].filter(([id]) => !b.has(id)).map(([, s]) => s),
    changed: [...b].filter(([id, s]) => a.has(id) && (a.get(id)!.scene.content !== s.scene.content || a.get(id)!.scene.title !== s.scene.title)).map(([, s]) => s),
    wordDelta: totalWords(cur) - totalWords(old),
  };
}
