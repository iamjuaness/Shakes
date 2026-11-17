// Puro: tramos con problemas de estilo en un párrafo, cada uno con alternativas (`sug`; "" = quitar). Test: node plugins/herramientas/herramientas.test.ts
import { conCaso, conjugar, fold, fuerte, sinonimos, sinonimosAdverbio } from "../_comun/sinonimos.ts";
import type { T } from "../_comun/sinonimos.ts";

export type TipoLint = "adverbio" | "larga" | "pasiva" | "gramatica" | "tipografia" | "inicio" | "vago";
export interface Tramo { from: number; to: number; tipo: TipoLint; msg?: string; sug?: string[] }
export const MAX_FRASE = 40;

const L = "\\p{L}";
const palabras = (s: string) => s.match(/[\p{L}\d']+/gu) ?? [];
const tramo = (m: RegExpMatchArray, tipo: TipoLint, msg: string, sug?: string[]): Tramo => ({ from: m.index!, to: m.index! + m[0].length, tipo, msg, ...(sug?.length ? { sug } : {}) });

// Adverbios en -mente. Se descartan palabras que solo terminan igual (vehemente, inclemente, aumente, alimente…):
// la raíz de un adverbio acaba en a/e/z/l/r/n (lenta-, breve-, feliz-, fácil-, mejor-, común-).
const NO_ADV = new Set(["vehemente", "inclemente", "demente", "clemente", "aumente", "alimente", "comente", "fomente", "tormente", "lamente", "cimente", "reclamente", "sustente"]);
function adverbios(text: string): Tramo[] {
  const out: Tramo[] = [];
  for (const m of text.matchAll(new RegExp(`(?<![${L}])(${L}{3,})mente(?![${L}])`, "gu"))) {
    if (NO_ADV.has(fold(m[0])) || !/[aezlrnáéíóú]$/iu.test(m[1]) || /[íu]$/iu.test(m[1])) continue;
    out.push(tramo(m, "adverbio", "Adverbio en -mente: córtalo, cámbialo por un verbo más preciso o usa una de estas formas.", sinonimosAdverbio(m[0])));
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
const ADJETIVOS = new Set(["cansad", "aburrid", "enfadad", "enojad", "contentad", "preocupad", "asustad", "sorprendid", "decidid", "conocid", "sabid", "querid", "perdid", "dormid", "callad", "cerrad", "abiert", "alegr", "limitad", "dedicad", "acostumbrad", "casad", "divertid", "ocupad", "obligad", "permitid", "prohibid", "parecid", "atrevid", "agradecid", "desconocid", "organizad", "dad"]);

// Participios regulares seguros de pasar a la forma «se + verbo»: todos los -ado, y estos -ido (su raíz es regular).
const IDO_ER = /^(?:vend|com|beb|tem|escond|respond|ofend|sorprend|aprend|comprend|ofrec|conoc|aparec|obedec|merec|establec|pertenec|perd|mov|entend|defend|encend|promet|cog|recog|ejerc|venc)$/;
const IDO_IR = /^(?:divid|recib|part|admit|permit|prohib|decid|compart|repart|suprim|cumpl|un|exig|dirig|sufr|sacud|invad|asist)$/;
const TIEMPO: Record<string, T> = { fue: "p3s", fueron: "p3p", era: "i3s", eran: "i3p", será: "f3s", serán: "f3p", sería: "c3s", serían: "c3p" };
// Participios irregulares (y -ido con cambio de raíz): raíz sin género/número -> [infinitivo, pretérito 3.ª sg., 3.ª pl., raíz del futuro si no es el infinitivo].
const IRR: Record<string, [string, string, string, string?]> = {
  hech: ["hacer", "hizo", "hicieron", "har"], dich: ["decir", "dijo", "dijeron", "dir"], escrit: ["escribir", "escribió", "escribieron"], vist: ["ver", "vio", "vieron"],
  puest: ["poner", "puso", "pusieron", "pondr"], abiert: ["abrir", "abrió", "abrieron"], cubiert: ["cubrir", "cubrió", "cubrieron"], rot: ["romper", "rompió", "rompieron"],
  vuelt: ["volver", "volvió", "volvieron"], resuelt: ["resolver", "resolvió", "resolvieron"], descubiert: ["descubrir", "descubrió", "descubrieron"], devuelt: ["devolver", "devolvió", "devolvieron"],
  impres: ["imprimir", "imprimió", "imprimieron"], previst: ["prever", "previó", "previeron"], compuest: ["componer", "compuso", "compusieron", "compondr"],
  supuest: ["suponer", "supuso", "supusieron", "supondr"], repuest: ["reponer", "repuso", "repusieron", "repondr"], dispuest: ["disponer", "dispuso", "dispusieron", "dispondr"],
  satisfech: ["satisfacer", "satisfizo", "satisficieron", "satisfar"],
  construid: ["construir", "construyó", "construyeron"], destruid: ["destruir", "destruyó", "destruyeron"], elegid: ["elegir", "eligió", "eligieron"],
  seguid: ["seguir", "siguió", "siguieron"], pedid: ["pedir", "pidió", "pidieron"], sentid: ["sentir", "sintió", "sintieron"], repetid: ["repetir", "repitió", "repitieron"],
  servid: ["servir", "sirvió", "sirvieron"], vestid: ["vestir", "vistió", "vistieron"], corregid: ["corregir", "corrigió", "corrigieron"],
  conseguid: ["conseguir", "consiguió", "consiguieron"], perseguid: ["perseguir", "persiguió", "persiguieron"], leid: ["leer", "leyó", "leyeron"],
  traid: ["traer", "trajo", "trajeron"], oid: ["oír", "oyó", "oyeron"], conducid: ["conducir", "condujo", "condujeron"], producid: ["producir", "produjo", "produjeron"],
  traducid: ["traducir", "tradujo", "tradujeron"], tenid: ["tener", "tuvo", "tuvieron", "tendr"], sabid: ["saber", "supo", "supieron", "sabr"], dad: ["dar", "dio", "dieron"],
  mantenid: ["mantener", "mantuvo", "mantuvieron", "mantendr"], obtenid: ["obtener", "obtuvo", "obtuvieron", "obtendr"], detenid: ["detener", "detuvo", "detuvieron", "detendr"],
  contenid: ["contener", "contuvo", "contuvieron", "contendr"], sostenid: ["sostener", "sostuvo", "sostuvieron", "sostendr"], querid: ["querer", "quiso", "quisieron", "querr"],
  podid: ["poder", "pudo", "pudieron", "podr"], venid: ["venir", "vino", "vinieron", "vendr"], caid: ["caer", "cayó", "cayeron"], dormid: ["dormir", "durmió", "durmieron"],
};
function conjIrr([inf, p3s, p3p, fut]: [string, string, string, string?], t: T): string | null {
  const stem = inf.slice(0, -2);
  const imp = /^(?:ver|prever)$/.test(inf) ? inf.slice(0, -1) + "ía" : stem + (inf.endsWith("ar") ? "aba" : "ía");
  switch (t) {
    case "p3s": return p3s;
    case "p3p": return p3p;
    case "i3s": return imp;
    case "i3p": return imp + "n";
    case "f3s": return (fut ?? inf) + "á";
    case "f3p": return (fut ?? inf) + "án";
    case "c3s": return (fut ?? inf) + "ía";
    case "c3p": return (fut ?? inf) + "ían";
    default: return null;
  }
}
const raiz = (part: string) => fold(part).replace(/[oa]s?$/, "");

function lemaParticipio(part: string): string | null {
  const f = part.toLowerCase().replace(/[oa]s?$/, "");
  if (f.endsWith("ad")) return f.slice(0, -2) + "ar";
  if (f.endsWith("id")) { const st = f.slice(0, -2); return IDO_ER.test(st) ? st + "er" : IDO_IR.test(st) ? st + "ir" : null; }
  return null;
}
// «La casa fue construida» -> «se construyó». Solo sin agente y con un verbo regular; si no, no se propone nada.
function activa(aux: string, part: string): string[] {
  const a = aux.toLowerCase();
  const irr = IRR[raiz(part)];
  const lema = irr ? irr[0] : lemaParticipio(part);
  if (!lema) return [];
  let r: string | null = null;
  if (a === "ha sido" || a === "han sido") r = `${a === "ha sido" ? "ha" : "han"} ${part.toLowerCase().replace(/[oa]s?$/, "o")}`; // «ha sido hecha» -> «se ha hecho»
  else if (TIEMPO[a]) r = irr ? conjIrr(irr, TIEMPO[a]) : conjugar(lema, TIEMPO[a]);
  return r ? [conCaso(aux, "se " + r)] : [];
}

function pasivas(text: string): Tramo[] {
  const out: Tramo[] = [];
  const re = new RegExp(`(?<![${L}])(${AUX_HECHO}|${AUX_ESTADO})(${ADV})\\s+(${PART})(?![${L}])`, "giu");
  for (const m of text.matchAll(re)) {
    const aux = fold(m[1]);
    const hecho = new RegExp(`^(?:${AUX_HECHO})$`, "iu").test(m[1]);
    const part = fold(m[3]);
    if (part.endsWith("ido") && m[1].toLowerCase() === "sido") continue;
    const resto = text.slice(m.index! + m[0].length, m.index! + m[0].length + 60);
    const agente = /^\s*(?:\p{L}+\s+){0,5}?por\s/iu.test(resto) || /^\s+por\s/iu.test(resto);
    const adj = [...ADJETIVOS].some((a) => part.startsWith(a));
    if (!hecho && !agente) continue; // estado: sin agente es casi siempre adjetivo
    if (hecho && !agente && adj && /^(?:es|era)/.test(aux)) continue;
    out.push(tramo(m, "pasiva", agente ? "Voz pasiva con agente: «X fue Vado por Y» → «Y Vó X». Pasa el agente a sujeto." : "Voz pasiva: usa una activa o la pasiva refleja («se construyó»).", agente || m[2] ? undefined : activa(m[1], m[3])));
  }
  return out;
}

// Errores gramaticales frecuentes (dequeísmo / queísmo) y pleonasmos: cada regla da su corrección.
const GRAMATICA: [RegExp, string, (m: string) => string[]][] = [
  [new RegExp(`(?<![${L}])(?:pienso|pensó|pensé|creo|creyó|creí|dijo|dije|digo|opino|opinó|supongo|supuso|sospecho|aseguró|aseguro|afirmó|afirmo|comentó|comenté|declaró|noto|notó|vi|vio|veo|sé|sabía|sabe|dudo|dudaba|parece|parecía|resulta|resultó|es evidente|es obvio|es seguro|es cierto|es verdad|es probable|es posible|es necesario|es importante)\\s+de\\s+que(?![${L}])`, "giu"), "Dequeísmo: sobra «de» («pienso que», no «pienso de que»).", (m) => [m.replace(/\s+de\s+que$/i, " que")]],
  [new RegExp(`(?<![${L}])(?:me|te|se|nos|os)\\s+(?:di|diste|dio|dimos|dieron|doy|das|da|damos|dan|daba|daban|daré|dará)\\s+cuenta\\s+que(?![${L}])`, "giu"), "Queísmo: «darse cuenta DE que».", (m) => [m.replace(/\s+que$/i, " de que")]],
  [new RegExp(`(?<![${L}])(?:me|te|se|nos|os)\\s+(?:alegr|olvid|acord|preocup|arrepent|enter|quej)\\p{L}*\\s+que(?![${L}])`, "giu"), "Posible queísmo: ¿falta «de» («me alegro DE que»)?", (m) => [m.replace(/\s+que$/i, " de que")]],
  [/(?<![\p{L}])subir\s+arriba(?![\p{L}])|(?<![\p{L}])bajar\s+abajo(?![\p{L}])|(?<![\p{L}])entrar\s+adentro(?![\p{L}])|(?<![\p{L}])salir\s+afuera(?![\p{L}])|(?<![\p{L}])volver\s+a\s+repetir(?![\p{L}])/giu, "Pleonasmo: la segunda palabra repite la idea.", (m) => [m.toLowerCase().startsWith("volver") ? "repetir" : m.split(/\s+/)[0]]],
  [/(?<![\p{L}])a nivel de(?![\p{L}])/giu, "Muletilla burocrática: «a nivel de».", () => ["en", "en el ámbito de", "respecto a"]],
];
function gramatica(text: string): Tramo[] {
  return GRAMATICA.flatMap(([re, msg, fix]) => [...text.matchAll(re)].map((m) => tramo(m, "gramatica", msg, fix(m[0]))));
}

// Espacios y signos mal puestos.
function tipografia(text: string): Tramo[] {
  const out: Tramo[] = [];
  const add = (re: RegExp, msg: string, fix: (m: string) => string[]) => { for (const m of text.matchAll(re)) out.push(tramo(m, "tipografia", msg, fix(m[0]))); };
  add(/(?<=\S)[ \t]{2,}(?=\S)/g, "Espacios dobles.", () => [" "]);
  add(/(?<=[\p{L}\d])\s+[,;:.!?](?![.\p{L}\d])/gu, "Espacio antes del signo de puntuación.", (m) => [m.trim()]);
  add(/,{2,}|;{2,}|(?<!\.)\.\.(?!\.)|¿¿|\?\?\?+|!!!+/g, "Signos repetidos (los puntos suspensivos son tres).", (m) => (m.startsWith(".") ? ["…", "."] : [m[0]]));
  return out;
}

// «muy + adjetivo» y «cosa»: palabras flojas con una alternativa más precisa.
function vagas(text: string): Tramo[] {
  const out: Tramo[] = [];
  for (const m of text.matchAll(new RegExp(`(?<![${L}])muy\\s+(${L}{4,})(?![${L}])`, "giu"))) {
    const f = fuerte(m[1]);
    if (f) out.push(tramo(m, "vago", `«muy ${m[1]}» se puede decir con una sola palabra más fuerte.`, [conCaso(m[0], f)]));
  }
  for (const m of text.matchAll(new RegExp(`(?<![${L}])cosas?(?![${L}])`, "giu"))) out.push(tramo(m, "vago", "«cosa» es vaga: nombra lo que es.", sinonimos(m[0])));
  return out;
}

// Frases > MAX_FRASE palabras (con propuestas para dividirlas) y tres o más frases seguidas que empiezan igual.
const PRON = new Set(["el", "ella", "ellos", "ellas", "la", "los", "las", "yo", "tu", "nosotros", "un", "una", "su", "sus", "mi", "mis", "se", "me", "te", "lo", "le", "no", "y", "pero"]);
const CONECTORES = ["Entonces", "Luego", "Poco después,", "Al rato,"];
const mayus = (s: string) => s[0].toUpperCase() + s.slice(1);
function dividir(t: string): string[] {
  const n = palabras(t).length;
  const cand: { i: number; len: number; resto: string }[] = [];
  for (const m of t.matchAll(/,\s+(y|e|pero|aunque|mientras|sino|así que|por eso|y entonces)\s+|;\s+/gi)) {
    const izq = t.slice(0, m.index!), der = t.slice(m.index! + m[0].length);
    if (palabras(izq).length < 6 || palabras(der).length < 6) continue;
    const con = m[1] && !/^(?:y|e)$/i.test(m[1]) ? mayus(m[1]) + " " : "";
    cand.push({ i: palabras(izq).length, len: 0, resto: izq.replace(/[,;:\s]+$/, "") + ". " + con + (con ? der : mayus(der)) });
  }
  return cand.sort((a, b) => Math.abs(a.i - n / 2) - Math.abs(b.i - n / 2)).slice(0, 3).map((c) => c.resto);
}
function frases(text: string): Tramo[] {
  const out: Tramo[] = [];
  const fr = [...text.matchAll(/[^.!?…]+[.!?…]*/g)].map((m) => {
    const lead = m[0].length - m[0].trimStart().length;
    return { from: m.index! + lead, to: m.index! + m[0].trimEnd().length, t: m[0].trim() };
  }).filter((f) => f.t.length);
  for (const f of fr) if (palabras(f.t).length > MAX_FRASE) out.push({ from: f.from, to: f.to, tipo: "larga", msg: `Frase de ${palabras(f.t).length} palabras: ¿dividirla?`, sug: dividir(f.t) });
  const ini = fr.map((f) => fold(palabras(f.t.replace(/^[—–\-«"¿¡\s]+/, ""))[0] ?? ""));
  for (let i = 2; i < fr.length; i++) {
    if (ini[i] && ini[i].length > 1 && ini[i] === ini[i - 1] && ini[i] === ini[i - 2]) {
      const w = palabras(fr[i].t)[0] ?? "";
      const lead = fr[i].t.search(/[\p{L}\d]/u);
      const resto = PRON.has(ini[i]) ? w.toLowerCase() : w;
      out.push({ from: fr[i].from + lead, to: fr[i].from + lead + w.length, tipo: "inicio", msg: "Tres frases seguidas empiezan igual: varía el arranque.", sug: CONECTORES.map((c) => `${c} ${resto}`) });
    }
  }
  return out;
}

export const lint = (text: string): Tramo[] => [...adverbios(text), ...pasivas(text), ...gramatica(text), ...tipografia(text), ...vagas(text), ...frases(text)].sort((a, b) => a.from - b.from);
