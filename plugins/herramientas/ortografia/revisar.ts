// Lógica pura del corrector ortográfico (sin React/TipTap/nspell). Test: node plugins/herramientas/herramientas.test.ts
export interface Corrector { correct(w: string): boolean }
export interface Fallo { from: number; to: number; word: string }

const PALABRA = /[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu;

// Palabras sueltas de nombres y apodos de fichas (más las del usuario): nunca se marcan.
export const palabrasDe = (textos: string[]) => new Set(textos.flatMap((t) => t.match(PALABRA) ?? []).map((w) => w.toLowerCase()));

// Tramos con palabras que el diccionario no conoce. Se saltan: una letra, SIGLAS, y mayúsculas a mitad de frase (nombres propios).
export function fallos(text: string, dic: Corrector, conocidas: Set<string>): Fallo[] {
  const out: Fallo[] = [];
  for (const m of text.matchAll(PALABRA)) {
    const w = m[0].replace(/’/g, "'");
    if (w.length < 2 || (w === w.toUpperCase() && w !== w.toLowerCase())) continue;
    const lower = w.toLowerCase();
    if (conocidas.has(lower) || dic.correct(w) || dic.correct(lower)) continue;
    const capital = w[0] !== lower[0];
    if (capital && !/(^|[.!?¿¡…:"«»“”—–-])\s*$/.test(text.slice(0, m.index!))) continue; // nombre propio, no al abrir frase
    out.push({ from: m.index!, to: m.index! + m[0].length, word: w });
  }
  return out;
}
