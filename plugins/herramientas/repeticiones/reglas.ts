// Puro: palabras repetidas cerca (con sustitutos) y muletillas. Test: node plugins/herramientas/herramientas.test.ts
import { fold, sinonimos } from "../_comun/sinonimos.ts";
export { muletillas } from "./muletillas.ts";
export type { Muleti } from "./muletillas.ts";
export { fold };

// Ventana según la palabra: las largas se notan más lejos (≥8 letras: 35 palabras, ≥6: 25, el resto: 12).
export const VENTANA = 25;
const ventana = (n: number) => (n >= 8 ? 35 : n >= 6 ? 25 : 12);

// Palabras de función y verbos auxiliares/comodín: repetirlas es normal.
const IGNORAR = new Set(fold("para como pero esta este esto esos esas aquí allí tras ante bajo todo toda nada algo cada otro otra solo con una que más muy sin sus del los las por entonces también porque aunque cuando donde siempre después antes mientras todavía quizás ahora luego sobre entre desde hasta hacia durante según sino todos todas estos estas aquel aquella aquello aquellos mismo misma mismos mismas tanto tanta tantos tantas mucho mucha muchos muchas poco poca pocos pocas ellos ellas nosotros nosotras vosotros ustedes usted bien mal así tampoco además incluso apenas casi cuyo quien quienes cual cuales cuanto cuanta contra mediante pues aún aunque ser estar haber tener hacer poder deber querer era eran estaba estaban estuvo estuvieron había habían habrá hubo fue fueron será serán sería tiene tienen tenía tenían tuvo tuvieron hace hacen hacía hizo puede pueden podía podían pudo debe debía quiso quería dice dicen decía sabe sabía iba iban viene vino parece parecía sido siendo estado habido tenido hecho dado vez veces cosas parte tipo ningún ninguna ninguno alguna alguno algún otros otras uno unos unas esa ese eso nuestro nuestra vuestro mío mía tuyo suyo suya suyos suyas aquí ahí allá acá lejos cerca dentro fuera encima debajo delante detrás junto").split(" "));

export interface Repe { from: number; to: number; palabra: string; sugerencias: string[]; distancia: number }

const clave = (w: string) => { const f = fold(w); return f.length > 4 && f.endsWith("s") ? f.slice(0, -1) : f; }; // casa/casas = misma palabra

// `previo` = texto del párrafo anterior (la repetición también cuenta entre párrafos); solo se marca lo de `text`.
// Los sustitutos salen del diccionario de sinónimos, con el mismo tiempo/género/número que la palabra.
export function repeticiones(text: string, previo = ""): Repe[] {
  const all = previo ? previo + "\n" + text : text;
  const off = all.length - text.length;
  const last = new Map<string, number>();
  const out: Repe[] = [];
  let i = 0;
  for (const m of all.matchAll(/[\p{L}']+/gu)) {
    const w = m[0];
    i++;
    if (w.length < 4) continue;
    const k = clave(w);
    if (IGNORAR.has(fold(w)) || IGNORAR.has(k)) continue;
    // Mayúscula a mitad de frase = nombre propio: repetirlo es normal.
    if (/^\p{Lu}/u.test(w) && !/(^|[.!?…¿¡:"«»—\n]\s*)$/.test(all.slice(0, m.index!))) continue;
    const d = i - (last.get(k) ?? -99);
    if (d <= ventana(w.length) && m.index! >= off) out.push({ from: m.index! - off, to: m.index! - off + w.length, palabra: w.toLowerCase(), sugerencias: sinonimos(w), distancia: d });
    last.set(k, i);
  }
  return out;
}
