// Puro: compara atributos de la ficha (ojos, pelo, edad) con lo que dicen las escenas sobre ese personaje.
export interface Issue { card: string; scene: string; attr: string; ficha: string; escena: string }
interface C { id: string; name: string; notes: string }
interface S { id: string; title: string; text: string }

const ATTRS: [string, RegExp][] = [
  ["ojos", /ojos\s+(?:de color\s+)?(\p{L}+)/iu],
  ["pelo", /(?:pelo|cabello|cabellera)\s+(?:de color\s+)?(\p{L}+)/iu],
  ["edad", /(?:tiene|tenía|tenia|de)\s+(\d{1,3})\s+años/iu],
];
const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function inconsistencias(cards: C[], scenes: S[]): Issue[] {
  const out: Issue[] = [];
  for (const c of cards) {
    const ficha = ATTRS.flatMap(([a, re]) => { const m = c.notes.match(re); return m ? [[a, m[1]] as const] : []; });
    if (!ficha.length || !c.name.trim()) continue;
    const nameRe = new RegExp(`(?<![\\p{L}\\d])${c.name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\d])`, "iu");
    for (const s of scenes) {
      for (const sentence of s.text.split(/(?<=[.!?…])\s+/)) {
        if (!nameRe.test(sentence)) continue;
        for (const [a, v] of ficha) {
          const m = sentence.match(ATTRS.find(([x]) => x === a)![1]);
          if (m && norm(m[1]) !== norm(v)) out.push({ card: c.id, scene: s.id, attr: a, ficha: v, escena: m[1] });
        }
      }
    }
  }
  return out;
}
