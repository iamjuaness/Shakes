// Modelo del manuscrito: libro -> partes -> capítulos -> escenas.
export type Kind = "book" | "part" | "chapter" | "scene";

export interface Node {
  id: string;
  kind: Kind;
  title: string;
  content?: string; // HTML de la escena
  summary?: string; // sinopsis breve (corcho)
  goal?: number; // meta de palabras de la escena
  date?: string; // fecha en la línea de tiempo cronológica (texto libre; ordena lexicográficamente, usar ISO)
  children: Node[];
}

export const childKind: Record<Kind, Kind | null> = {
  book: "part",
  part: "chapter",
  chapter: "scene",
  scene: null,
};

const label: Record<Kind, string> = { book: "Libro", part: "Parte", chapter: "Capítulo", scene: "Escena" };

export function newNode(kind: Kind, n: number): Node {
  return { id: crypto.randomUUID(), kind, title: `${label[kind]} ${n}`, content: kind === "scene" ? "" : undefined, children: [] };
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

export function addChild(root: Node, parentId: string): [Node, Node | null] {
  const parent = find(root, parentId);
  const kind = parent && childKind[parent.kind];
  if (!kind) return [root, null];
  const child = newNode(kind, parent.children.length + 1);
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

export function sampleBook(): Node {
  const book = newNode("book", 1);
  book.title = "Mi historia";
  let [b, part] = addChild(book, book.id);
  let chap: Node | null;
  [b, chap] = addChild(b, part!.id);
  [b] = addChild(b, chap!.id);
  return b;
}

function insertBefore(root: Node, targetId: string, n: Node): Node {
  return { ...root, children: root.children.flatMap((c) => (c.id === targetId ? [n, c] : [insertBefore(c, targetId, n)])) };
}

// Mueve `id` sobre `targetId`: dentro si el destino acepta ese tipo de hijo, antes si es del mismo tipo; si no, no hace nada.
export function move(root: Node, id: string, targetId: string): Node {
  const node = find(root, id);
  const target = find(root, targetId);
  if (!node || !target || id === root.id || id === targetId || find(node, targetId)) return root;
  if (childKind[target.kind] === node.kind) {
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
    .replace(/<\/(p|li|ul|ol|blockquote)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const level: Record<Kind, number> = { book: 1, part: 2, chapter: 3, scene: 4 };

export function toMarkdown(n: Node): string {
  const own = `${"#".repeat(level[n.kind])} ${n.title}\n\n${n.kind === "scene" ? htmlToMd(n.content) + "\n\n" : ""}`;
  return own + n.children.map(toMarkdown).join("");
}

// Ficha del mundo (personaje, lugar...).
export type CardType = "Personaje" | "Lugar" | "Objeto" | "Facción";
export interface Link { to: string; label: string }
export interface Card { id: string; type: CardType; name: string; notes: string; links?: Link[]; x?: number; y?: number }
export interface Version { id: string; at: string; label: string; auto?: boolean; book: Node; cards: Card[] }
export interface DayLog { start: number; end: number }
export interface Project { book: Node; cards: Card[]; goal: number; versions: Version[]; log: Record<string, DayLog>; dailyGoal: number; ext?: Record<string, any> } // ext: datos de plugins, por id de herramienta

export const newProject = (): Project => ({ book: sampleBook(), cards: [], goal: 0, versions: [], log: {}, dailyGoal: 0 });

// Acepta proyectos guardados con el formato v0 (solo el libro).
export function normalize(raw: any): Project {
  if (raw?.kind === "book") return { ...newProject(), book: raw };
  if (raw?.book?.kind === "book") return { book: raw.book, cards: raw.cards ?? [], goal: raw.goal ?? 0, versions: raw.versions ?? [], log: raw.log ?? {}, dailyGoal: raw.dailyGoal ?? 0, ext: raw.ext ?? {} };
  return newProject();
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
  return { ...snapshot(p, "Antes de restaurar", true), book: v.book, cards: v.cards };
}

export interface Scene { scene: Node; path: string }

export function scenes(n: Node, path = ""): Scene[] {
  const here = n.kind === "book" ? "" : path ? `${path} › ${n.title}` : n.title;
  return n.kind === "scene" ? [{ scene: n, path }] : n.children.flatMap((c) => scenes(c, here));
}

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

export const plainText = (n: Node): string => [n.kind === "scene" ? (n.content ?? "").replace(/<\/(p|h\d|li)>/gi, ". ").replace(/<[^>]+>/g, " ") : "", ...n.children.map(plainText)].join(" ");

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
    n.kind === "scene"
      ? { ...n, content: (n.content ?? "").replace(/(<[^>]*>)|([^<]+)/g, (_, tag, text) => (tag ? tag : text.replace(re, () => (count++, r)))) }
      : { ...n, children: n.children.map(go) };
  return [go(book), count];
}

// Escenas donde aparece una ficha (por nombre, palabra completa).
export function mentions(book: Node, name: string): Scene[] {
  if (!name.trim()) return [];
  const re = new RegExp(`(?<![\\p{L}\\d])${esc(name.trim())}(?![\\p{L}\\d])`, "iu");
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

// Añade las partes de la plantilla al final del libro; cada capítulo con una escena vacía.
export function applyTemplate(book: Node, t: Template): Node {
  const parts = t.parts.map((p) => {
    const part = newNode("part", 0);
    part.title = p.title;
    part.children = p.chapters.map((title) => {
      const chapter = newNode("chapter", 0);
      chapter.title = title;
      chapter.children = [newNode("scene", 1)];
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
