// Puro: palabras repetidas cerca (con sustitutos) y muletillas. Test: node plugins/herramientas/herramientas.test.ts
// Ventana según la palabra: las largas se notan más lejos (≥8 letras: 35 palabras, ≥6: 25, el resto: 12).
export const VENTANA = 25;
const ventana = (n: number) => (n >= 8 ? 35 : n >= 6 ? 25 : 12);
export const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// Palabras de función y verbos auxiliares/comodín: repetirlas es normal.
const IGNORAR = new Set(fold("para como pero esta este esto esos esas aquí allí tras ante bajo todo toda nada algo cada otro otra solo con una que más muy sin sus del los las por entonces también porque aunque cuando donde siempre después antes mientras todavía quizás ahora luego sobre entre desde hasta hacia durante según sino todos todas estos estas aquel aquella aquello aquellos mismo misma mismos mismas tanto tanta tantos tantas mucho mucha muchos muchas poco poca pocos pocas ellos ellas nosotros nosotras vosotros ustedes usted bien mal así tampoco además incluso apenas casi cuyo quien quienes cual cuales cuanto cuanta contra mediante pues aún aunque ser estar haber tener hacer poder deber querer era eran estaba estaban estuvo estuvieron había habían habrá hubo fue fueron será serán sería tiene tienen tenía tenían tuvo tuvieron hace hacen hacía hizo puede pueden podía podían pudo debe debía quiso quería dice dicen decía sabe sabía iba iban viene vino parece parecía sido siendo estado habido tenido hecho dado vez veces cosas parte tipo ningún ninguna ninguno alguna alguno algún otros otras uno unos unas esa ese eso nuestro nuestra vuestro mío mía tuyo suyo suya suyos suyas aquí ahí allá acá lejos cerca dentro fuera encima debajo delante detrás junto").split(" "));

export const SINONIMOS: Record<string, string[]> = {
  dijo: ["afirmó", "comentó", "susurró", "respondió"], dijeron: ["afirmaron", "comentaron", "respondieron"],
  miró: ["observó", "contempló", "vio"], caminó: ["avanzó", "anduvo", "recorrió"], grande: ["enorme", "amplio", "inmenso"],
  pequeño: ["diminuto", "menudo", "breve"], bonito: ["hermoso", "bello", "agradable"], cosa: ["objeto", "asunto", "algo concreto"],
  empezó: ["comenzó", "inició"], terminó: ["acabó", "concluyó"], bueno: ["agradable", "excelente", "noble"], malo: ["terrible", "pésimo", "cruel"],
  rápido: ["veloz", "ágil", "presuroso"], lento: ["pausado", "tardo", "calmo"], miedo: ["pavor", "temor", "espanto"], casa: ["hogar", "vivienda", "morada"],
  sonrió: ["rio", "esbozó una sonrisa"], entró: ["accedió", "penetró", "cruzó el umbral"], salió: ["abandonó", "partió", "se marchó"],
  pensó: ["reflexionó", "meditó", "supuso"], preguntó: ["inquirió", "quiso saber", "indagó"], gritó: ["exclamó", "vociferó", "bramó"],
  tomó: ["agarró", "cogió", "asió"], abrió: ["descorrió", "destapó"], cerró: ["entornó", "atrancó"], puerta: ["portón", "umbral", "entrada"],
  luz: ["claridad", "resplandor", "destello"], noche: ["oscuridad", "anochecer", "madrugada"], extraño: ["raro", "insólito", "peculiar"],
  feliz: ["dichoso", "contento", "radiante"], triste: ["afligido", "apenado", "abatido"], viejo: ["anciano", "antiguo", "gastado"],
  nuevo: ["reciente", "flamante", "inédito"], fuerte: ["robusto", "potente", "firme"], oscuro: ["sombrío", "tenebroso", "negro"],
};

export interface Repe { from: number; to: number; palabra: string; sugerencias: string[]; distancia: number }

const clave = (w: string) => { const f = fold(w); return f.length > 4 && f.endsWith("s") ? f.slice(0, -1) : f; }; // casa/casas = misma palabra

// `previo` = texto del párrafo anterior (la repetición también cuenta entre párrafos); solo se marca lo de `text`.
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
    if (d <= ventana(w.length) && m.index! >= off) out.push({ from: m.index! - off, to: m.index! - off + w.length, palabra: w.toLowerCase(), sugerencias: SINONIMOS[w.toLowerCase()] ?? [], distancia: d });
    last.set(k, i);
  }
  return out;
}

// Muletillas y comodines que casi siempre sobran en narración.
const MULETILLAS: [RegExp, string][] = [
  [/\bo sea\b/giu, "o sea"], [/\ben plan\b/giu, "en plan"], [/\bcomo que\b/giu, "como que"], [/\bdigamos\b/giu, "digamos"],
  [/\bpor así decirlo\b/giu, "por así decirlo"], [/\bde alguna (?:manera|forma)\b/giu, "de alguna manera"], [/\bde cierta (?:manera|forma)\b/giu, "de cierta manera"],
  [/\ben cierto modo\b/giu, "en cierto modo"], [/\bbásicamente\b/giu, "básicamente"], [/\bliteralmente\b/giu, "literalmente"],
  [/\bsimplemente\b/giu, "simplemente"], [/\brealmente\b/giu, "realmente"], [/\bverdaderamente\b/giu, "verdaderamente"],
  [/\bsinceramente\b/giu, "sinceramente"], [/\ben realidad\b/giu, "en realidad"], [/\bla verdad es que\b/giu, "la verdad es que"],
  [/\bpor lo visto\b/giu, "por lo visto"], [/\bde hecho\b/giu, "de hecho"], [/\bpor supuesto\b/giu, "por supuesto"],
  [/\bcomo si nada\b/giu, "como si nada"], [/\bun poco\b/giu, "un poco"], [/\bbastante\b/giu, "bastante"], [/\balgo así como\b/giu, "algo así como"],
];
export interface Muleti { from: number; to: number; frase: string }
export const muletillas = (text: string): Muleti[] =>
  MULETILLAS.flatMap(([re, frase]) => [...text.matchAll(re)].map((m) => ({ from: m.index!, to: m.index! + m[0].length, frase }))).sort((a, b) => a.from - b.from);
