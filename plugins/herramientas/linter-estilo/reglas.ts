// Puro: tramos con problemas de estilo en un párrafo. Test: node plugins/herramientas/herramientas.test.ts
export type TipoLint = "adverbio" | "larga" | "pasiva" | "gramatica" | "tipografia" | "inicio";
export interface Tramo { from: number; to: number; tipo: TipoLint; msg?: string }
export const MAX_FRASE = 40;

const L = "\\p{L}";
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const palabras = (s: string) => s.match(/[\p{L}\d']+/gu) ?? [];

// Adverbios en -mente. Se descartan palabras que solo terminan igual (vehemente, inclemente, aumente, alimente…):
// la raíz de un adverbio acaba en a/e/z/l/r/n (lenta-, breve-, feliz-, fácil-, mejor-, común-).
const NO_ADV = new Set(["vehemente", "inclemente", "demente", "clemente", "aumente", "alimente", "comente", "fomente", "tormente", "lamente", "cimente", "reclamente", "lamente", "sustente"]);
function adverbios(text: string): Tramo[] {
  const out: Tramo[] = [];
  for (const m of text.matchAll(new RegExp(`(?<![${L}])(${L}{3,})mente(?![${L}])`, "gu"))) {
    if (NO_ADV.has(fold(m[0])) || !/[aezlrnáéíóú]$/iu.test(m[1]) || /[íu]$/iu.test(m[1])) continue;
    out.push({ from: m.index!, to: m.index! + m[0].length, tipo: "adverbio", msg: "Adverbio en -mente: ¿se puede cortar o sustituir por un verbo más preciso?" });
  }
  return out;
}

// Voz pasiva perifrástica ser + participio. Participios regulares (-ado/-ido) e irregulares.
// Con es/son/era/eran/ser/sea (estado, muy a menudo adjetivo: «era cansado») solo se marca si hay «por + agente»;
// con fue/fueron/será/sería/ha sido… (hecho, no estado) se marca siempre.
const PART = "(?:\\p{L}+(?:ad|id)[oa]s?|(?:hech|dich|escrit|vist|puest|abiert|cubiert|muert|rot|vuelt|resuelt|descubiert|devuelt|impres|previst|compuest|supuest|repuest|dispuest|satisfech)[oa]s?)";
const AUX_HECHO = "fue|fueron|fuese|fuesen|será|serán|sería|serían|ha sido|han sido|había sido|habían sido|hubo sido|habrá sido|habría sido|fuera|fueran|haya sido";
const AUX_ESTADO = "es|son|era|eran|ser|sea|sean|siendo|sido";
const ADV = "(?:\\s+(?:ya|no|también|nunca|siempre|casi|solo|sólo|finalmente|pronto|luego|\\p{L}+mente))?";
const ADJETIVOS = new Set(["cansad", "aburrid", "enfadad", "enojad", "contentad", "preocupad", "asustad", "sorprendid", "decidid", "conocid", "sabid", "querid", "perdid", "dormid", "callad", "cerrad", "abiert", "alegr", "limitad", "dedicad", "acostumbrad", "casad", "divertid", "ocupad", "obligad", "permitid", "prohibid", "prohibid", "parecid", "atrevid", "agradecid", "desconocid", "organizad", "dad"]);
function pasivas(text: string): Tramo[] {
  const out: Tramo[] = [];
  const re = new RegExp(`(?<![${L}])(${AUX_HECHO}|${AUX_ESTADO})${ADV}\\s+(${PART})(?![${L}])`, "giu");
  for (const m of text.matchAll(re)) {
    const aux = fold(m[1]);
    const hecho = new RegExp(`^(?:${AUX_HECHO})$`, "iu").test(m[1]);
    const part = fold(m[2]);
    if (part.endsWith("ido") && m[1].toLowerCase() === "sido") continue;
    const resto = text.slice(m.index! + m[0].length, m.index! + m[0].length + 60);
    const agente = /^\s*(?:\p{L}+\s+){0,5}?por\s/iu.test(resto) || /^\s+por\s/iu.test(resto);
    const adj = [...ADJETIVOS].some((a) => part.startsWith(a));
    if (!hecho && !agente) continue; // estado: sin agente es casi siempre adjetivo
    if (hecho && !agente && adj && /^(?:es|era)/.test(aux)) continue;
    out.push({ from: m.index!, to: m.index! + m[0].length, tipo: "pasiva", msg: agente ? "Voz pasiva con agente: «X fue Vado por Y» → «Y Vó X»." : "Voz pasiva: ¿mejor activa?" });
  }
  return out;
}

// Errores gramaticales frecuentes (dequeísmo / queísmo) y pleonasmos.
const GRAMATICA: [RegExp, string][] = [
  [new RegExp(`(?<![${L}])(?:pienso|pensó|pensé|pienso|creo|creyó|creí|dijo|dije|digo|opino|opinó|supongo|supuso|sospecho|aseguró|aseguro|afirmó|afirmo|comentó|comenté|declaró|noto|notó|vi|vio|veo|sé|sabía|sabe|dudo|dudaba|parece|parecía|resulta|resultó|es evidente|es obvio|es seguro|es cierto|es verdad|es probable|es posible|es necesario|es importante)\\s+de\\s+que(?![${L}])`, "giu"), "Dequeísmo: sobra «de» («pienso que», no «pienso de que»)."],
  [new RegExp(`(?<![${L}])(?:me|te|se|nos|os)\\s+(?:di|diste|dio|dimos|dieron|doy|das|da|damos|dan|daba|daban|daré|dará)\\s+cuenta\\s+que(?![${L}])`, "giu"), "Queísmo: «darse cuenta DE que»."],
  [new RegExp(`(?<![${L}])(?:me|te|se|nos|os)\\s+(?:alegr|olvid|acord|preocup|arrepent|enter|quej)\\p{L}*\\s+que(?![${L}])`, "giu"), "Posible queísmo: ¿falta «de» («me alegro DE que»)?"],
  [/(?<![\p{L}])subir\s+arriba(?![\p{L}])|(?<![\p{L}])bajar\s+abajo(?![\p{L}])|(?<![\p{L}])entrar\s+adentro(?![\p{L}])|(?<![\p{L}])salir\s+afuera(?![\p{L}])|(?<![\p{L}])volver\s+a\s+repetir(?![\p{L}])/giu, "Pleonasmo: la segunda palabra repite la idea."],
  [/(?<![\p{L}])a nivel de(?![\p{L}])/giu, "Muletilla burocrática: «a nivel de»."],
];
function gramatica(text: string): Tramo[] {
  return GRAMATICA.flatMap(([re, msg]) => [...text.matchAll(re)].map((m): Tramo => ({ from: m.index!, to: m.index! + m[0].length, tipo: "gramatica", msg })));
}

// Espacios y signos mal puestos.
function tipografia(text: string): Tramo[] {
  const out: Tramo[] = [];
  const add = (re: RegExp, msg: string) => { for (const m of text.matchAll(re)) out.push({ from: m.index!, to: m.index! + m[0].length, tipo: "tipografia", msg }); };
  add(/(?<=\S)[ \t]{2,}(?=\S)/g, "Espacios dobles.");
  add(/(?<=[\p{L}\d])\s+[,;:.!?](?![.\p{L}\d])/gu, "Espacio antes del signo de puntuación.");
  add(/,{2,}|;{2,}|(?<!\.)\.\.(?!\.)|¿¿|\?\?\?+|!!!+/g, "Signos repetidos (los puntos suspensivos son tres).");
  return out;
}

// Frases > MAX_FRASE palabras y tres o más frases seguidas que empiezan igual.
function frases(text: string): Tramo[] {
  const out: Tramo[] = [];
  const fr = [...text.matchAll(/[^.!?…]+[.!?…]*/g)].map((m) => {
    const lead = m[0].length - m[0].trimStart().length;
    return { from: m.index! + lead, to: m.index! + m[0].trimEnd().length, t: m[0].trim() };
  }).filter((f) => f.t.length);
  for (const f of fr) if (palabras(f.t).length > MAX_FRASE) out.push({ from: f.from, to: f.to, tipo: "larga", msg: `Frase de ${palabras(f.t).length} palabras: ¿dividirla?` });
  const ini = fr.map((f) => fold(palabras(f.t.replace(/^[—–\-«"¿¡\s]+/, ""))[0] ?? ""));
  for (let i = 2; i < fr.length; i++) {
    if (ini[i] && ini[i].length > 1 && ini[i] === ini[i - 1] && ini[i] === ini[i - 2]) out.push({ from: fr[i].from, to: fr[i].from + (palabras(fr[i].t)[0]?.length ?? 1), tipo: "inicio", msg: "Tres frases seguidas empiezan igual: varía el arranque." });
  }
  return out;
}

export const lint = (text: string): Tramo[] => [...adverbios(text), ...pasivas(text), ...gramatica(text), ...tipografia(text), ...frases(text)].sort((a, b) => a.from - b.from);
