// Lógica pura (sin React/TipTap) del plugin «Fichas automáticas». Test: node plugins/herramientas/fichas-auto/detect.test.ts
export interface Named { id: string; name: string; type?: string }
export interface Ref { from: number; to: number; id: string }

const L = "\\p{L}\\d";
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// Apariciones de nombres de fichas en un texto (palabra completa; gana el nombre más largo).
export function findRefs(text: string, cards: Named[]): Ref[] {
  const names = cards.filter((c) => c.name.trim()).sort((a, b) => b.name.length - a.name.length);
  if (!names.length) return [];
  const re = new RegExp(`(?<![${L}])(${names.map((c) => esc(c.name.trim())).join("|")})(?![${L}])`, "giu");
  const byName = new Map(names.map((c) => [c.name.trim().toLowerCase(), c.id]));
  return [...text.matchAll(re)].map((m) => ({ from: m.index!, to: m.index! + m[0].length, id: byName.get(m[0].toLowerCase())! }));
}

// Fichas cuyo nombre (o alguna de sus palabras) empieza por lo que se está escribiendo. Solo con ≥2 letras.
export function suggest(prefix: string, cards: Named[], limit = 6): Named[] {
  const p = fold(prefix.trim());
  if (p.length < 2) return [];
  const hit = (c: Named) => fold(c.name).split(/\s+/).some((w) => w.startsWith(p)) || fold(c.name).startsWith(p);
  return cards.filter((c) => hit(c) && fold(c.name) !== p).slice(0, limit);
}

// Palabra (o nombre con espacios, "Elena Marín") que termina en el cursor y empieza con mayúscula.
export function prefixAt(before: string): { text: string; start: number } | null {
  const m = before.match(new RegExp(`(?<![${L}])(\\p{Lu}[${L}]*(?:\\s\\p{Lu}[${L}]*)*)$`, "u"));
  return m ? { text: m[1], start: before.length - m[1].length } : null;
}

const STOP = new Set(["ayer", "hoy", "mañana", "anoche", "después", "antes", "pronto", "quizá", "el", "la", "los", "las", "un", "una", "y", "o", "pero", "pues", "si", "no", "que", "como", "cuando", "mientras", "entonces", "luego", "ahora", "aquí", "allí", "ya", "yo", "tú", "él", "ella", "ellos", "nosotros", "esto", "eso", "esta", "este", "esa", "ese", "dios", "señor", "señora", "doña", "don", "mi", "su", "tu", "en", "de", "a", "por", "con", "sin", "al", "del", "se", "me", "te", "lo", "le", "es", "fue", "era", "hay", "sí", "tal", "cada", "todo", "nada", "algo", "nunca", "siempre", "también", "aunque", "porque", "sobre", "tras", "hasta", "desde", "hacia", "ante", "bajo", "durante", "según"]);

export interface Candidate { name: string; type: "Personaje" | "Lugar"; context: string }

// Nombres propios probables que aún no tienen ficha: secuencias de palabras con mayúscula que NO abren frase
// (o abren frase pero tienen 2+ palabras), no son palabras vacías y no coinciden con una ficha ni con `ignored`.
export function candidates(text: string, cards: Named[], ignored: Set<string> = new Set()): Candidate[] {
  const known = new Set(cards.map((c) => fold(c.name.trim())));
  const out = new Map<string, Candidate>();
  const re = new RegExp(`(?<![${L}])\\p{Lu}[${L}]{2,}(?:\\s\\p{Lu}[${L}]{2,})*(?![${L}])`, "gu");
  for (const m of text.matchAll(re)) {
    const before = text.slice(0, m.index!).trimEnd();
    const startsSentence = before === "" || /[.!?¿¡:…"«—–-]$/.test(before);
    const words = m[0].split(/\s+/);
    const n0 = words.length;
    while (words.length && STOP.has(fold(words[0]))) words.shift();
    // Al abrir frase la mayúscula es gramatical: solo cuenta un nombre de 2+ palabras.
    const real = startsSentence && words.length === n0 && n0 < 2 ? "" : words.join(" ");
    const key = fold(real);
    if (!real || STOP.has(key) || known.has(key) || ignored.has(key) || out.has(key)) continue;
    const prev = fold(before.split(/\s+/).pop() ?? "");
    const end = Math.min(text.length, m.index! + m[0].length + 60);
    out.set(key, {
      name: real,
      type: ["en", "hacia", "desde", "por", "entre", "cerca"].includes(prev) ? "Lugar" : "Personaje",
      context: text.slice(Math.max(0, m.index! - 60), end).trim(),
    });
  }
  return [...out.values()];
}
