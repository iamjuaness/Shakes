// Puro: analiza una frase del idioma del libro (español o inglés), la reordena según la gramática del idioma
// inventado y la escribe con sus palabras y afijos. En otros idiomas traduce palabra por palabra.
// Es un análisis por reglas: acierta en frases sencillas; en las enrevesadas puede equivocarse de orden.
import type { Base } from "./base.ts";
import { type Clase, type Idioma, type Rasgo, afijar, buscar, cambiar, palabraDe } from "./logica.ts";
import { type Forma, IRREGULARES_EN, IRREGULARES_ES, verboEn, verboEs } from "./verbos.ts";

type Tipo = "det" | "pron" | "clit" | "prep" | "conj" | "adv" | "neg" | "preg" | "verbo" | "nombre" | "adj" | "propio" | "?";
export interface Ficha { texto: string; lema: string; tipo: Tipo; rasgos: Rasgo[]; verbo?: Forma | null; nominal?: string }

const mapa = (s: string) => new Map(s.split("|").flatMap((g) => { const w = g.split(" "); return w.map((x) => [x, w[0]] as [string, string]); }));
// cada grupo: «lema otras formas»; el orden decide cuando una forma está en varios
const CERRADAS: Record<"es" | "en", [Tipo, Map<string, string>][]> = {
  es: [
    ["neg", mapa("no")],
    ["det", mapa("el la los las|un una unos unas|este esta estos estas|ese esa esos esas|aquel aquella aquellos aquellas|mi mis|tu tus|su sus|nuestro nuestra nuestros nuestras|vuestro vuestra vuestros vuestras|algún alguno alguna algunos algunas|ningún ninguno ninguna|otro otra otros otras|todo toda todos todas|cada|mucho mucha muchos muchas|poco poca pocos pocas|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|cien|mil")],
    ["pron", mapa("yo|tú|él|ella|usted|nosotros nosotras|vosotros vosotras|ellos|ellas|ustedes|esto|eso|aquello|mí|ti|nadie|alguien|nada|algo")],
    ["clit", mapa("me|te|se|nos|os|lo|le les")],
    ["prep", mapa("a|ante|bajo|con|contra|de|desde|en|entre|hacia|hasta|para|por|según|sin|sobre|tras|durante")],
    ["conj", mapa("y e|o u|pero|porque|aunque|que|si|cuando|como|mientras|pues|sino|donde")],
    ["preg", mapa("qué|quién quiénes|cómo|dónde|cuándo|cuál cuáles|cuánto cuánta cuántos cuántas")],
    ["adv", mapa("sí|muy|más|menos|también|tampoco|ya|aún|todavía|siempre|nunca|jamás|aquí|allí|ahí|ahora|hoy|ayer|mañana|bien|mal|tan|tanto|entonces|luego|después|antes|pronto|tarde|cerca|lejos|quizá quizás|solo")],
  ],
  en: [
    ["neg", mapa("not never")],
    ["det", mapa("the|a an|this these|that those|my|your|his|her|its|our|their|some|any|no|every|each|all|many|few|other another|one|two|three|four|five|six|seven|eight|nine|ten")],
    ["pron", mapa("i|you|he|she|it|we|they|me|him|us|them|someone|nobody|something|nothing")],
    ["prep", mapa("to|of|in|on|at|with|without|for|from|by|about|under|over|between|into|through|against|after|before|during")],
    ["conj", mapa("and|or|but|because|although|if|when|while|than|so")],
    ["preg", mapa("what|who|how|where|why|which")],
    ["adv", mapa("very|too|also|now|today|yesterday|tomorrow|always|here|there|well|badly|then|soon|late|near|far|maybe|only|more|less")],
  ],
};
const PERSONA: Record<string, Rasgo> = { yo: "1s", "tú": "2s", "él": "3s", ella: "3s", usted: "3s", nosotros: "1p", vosotros: "2p", ellos: "3p", ellas: "3p", ustedes: "3p", i: "1s", you: "2s", he: "3s", she: "3s", it: "3s", we: "1p", they: "3p" };
const ADJETIVOS = new Set(("grande pequeño bueno malo nuevo viejo rojo negro blanco azul verde fuerte libre largo corto alto bajo oscuro claro joven antiguo feliz triste mejor peor primero último " +
  "big small good bad new old red black white blue green strong free long short high low dark bright young ancient happy sad better worse first last").split(" "));
export const GRAMATICALES = new Set(Object.values(CERRADAS).flatMap((l) => l.flatMap(([, m]) => [...m.values()])));
export const conGramatica = (lang: string): "es" | "en" | null => (/^es(-|$)/i.test(lang) ? "es" : /^en(-|$)/i.test(lang) ? "en" : null);

const esVerbo = (base: Base, lang: "es" | "en") => (l: string) => {
  const f = base.banderas.get(l);
  if (!f) return false;
  // en el diccionario español los verbos llevan más reglas que las de plural y género
  return lang === "es" ? IRREGULARES_ES.has(l) || (/(ar|er|ir|ír)$/.test(l) && f.some((x) => !"SGNL".includes(x))) : IRREGULARES_EN.has(l) || f.includes("D") || f.includes("G");
};

// singular (y masculino, en adjetivos) de un sustantivo o adjetivo
function nominal(w: string, base: Base, lang: "es" | "en"): { lema: string; plural: boolean } | null {
  const verbo = esVerbo(base, lang);
  const irregulares: Record<string, string> = { men: "man", women: "woman", children: "child", people: "person", feet: "foot", teeth: "tooth", mice: "mouse" };
  if (lang === "en" && irregulares[w]) return { lema: irregulares[w], plural: true };
  if (w.endsWith("s")) {
    const sin = lang === "es" ? [w.slice(0, -1), w.slice(0, -2), `${w.slice(0, -3)}z`] : [w.slice(0, -1), w.slice(0, -2), `${w.slice(0, -3)}y`];
    for (const s of sin) {
      const tilde = lang === "es" ? s.replace(/([aeiou])([ns])$/, (_, v: string, c: string) => ({ a: "á", e: "é", i: "í", o: "ó", u: "ú" } as Record<string, string>)[v] + c) : s;
      const l = [s, tilde].find((x) => base.banderas.has(x));
      if (l) return { lema: masculino(l, base, lang), plural: true };
    }
  }
  // el diccionario español trae formas conjugadas sueltas, sin reglas («iremos», «está»): no son nombres
  const suelta = (x: string) => lang === "es" && !base.banderas.get(x)?.length && ![x, undefined].includes(verboEs(x, verbo)?.lema);
  if (base.banderas.has(w) && !suelta(w)) return { lema: masculino(w, base, lang), plural: false };
  const o = base.origen(w).find((x) => !verbo(x) && !suelta(x)); // un sustantivo no sale de un verbo
  return o ? { lema: o, plural: false } : null;
}
// «roja» es de «rojo» solo si es un adjetivo conocido: «casa» no viene de «caso»
const masculino = (w: string, base: Base, lang: string) => (lang === "es" && w.endsWith("a") && ADJETIVOS.has(`${w.slice(0, -1)}o`) && base.banderas.has(`${w.slice(0, -1)}o`) ? `${w.slice(0, -1)}o` : w);

export function analizar(oracion: string, base: Base, lang: "es" | "en", nombres: Set<string> = new Set()): Ficha[] {
  const verbo = esVerbo(base, lang);
  const palabras = [...oracion.matchAll(/\p{L}+(?:['’]\p{L}+)?/gu)].map((m) => m[0])
    .flatMap((w) => (lang === "es" && /^del$/i.test(w) ? ["de", "el"] : lang === "es" && /^al$/i.test(w) ? ["a", "el"] : [w]));
  const fichas: Ficha[] = palabras.map((texto, k) => {
    const w = texto.toLowerCase();
    const propio = texto[0] !== w[0] && (nombres.has(w) || (k > 0 ? true : !base.banderas.has(w) && !CERRADAS[lang].some(([, m]) => m.has(w)) && !verbo(w) && !nominal(w, base, lang)));
    if (propio) return { texto, lema: texto, tipo: "propio", rasgos: [] };
    const c = CERRADAS[lang].find(([, m]) => m.has(w));
    if (c) return { texto, lema: c[1].get(w)!, tipo: c[0], rasgos: [] };
    const v = lang === "es" ? verboEs(w, verbo) : verboEn(w, verbo);
    const n = nominal(w, base, lang);
    return { texto, lema: w, tipo: "?", rasgos: [], verbo: v, nominal: n?.lema, ...(n?.plural ? { rasgos: ["plural"] as Rasgo[] } : {}) };
  });
  // «la», «los»… delante de un verbo son pronombres, no artículos
  fichas.forEach((f, k) => {
    const s = fichas[k + 1];
    if (lang === "es" && /^(la|las|los)$/i.test(f.texto) && s?.verbo && !s.nominal) { f.tipo = "clit"; f.lema = "lo"; }
  });
  // ¿ya hay verbo en esta oración? («que», «cuando»… abren otra)
  const hayVerbo = (k: number) => {
    let a = k;
    while (a > 0 && fichas[a].tipo !== "conj") a--;
    const b = fichas.findIndex((x, j) => j > k && x.tipo === "conj");
    return fichas.slice(a, b < 0 ? undefined : b).some((x) => x.tipo === "verbo");
  };
  const comoVerbo = (f: Ficha) => { f.tipo = "verbo"; f.lema = f.verbo!.lema; f.rasgos = f.verbo!.tiempo ? [f.verbo!.tiempo] : []; };
  const comoNombre = (f: Ficha) => { f.tipo = ADJETIVOS.has(f.nominal ?? f.lema) ? "adj" : "nombre"; f.lema = f.nominal ?? f.lema; };
  // primero las que no dudan
  fichas.forEach((f, k) => { if (f.tipo !== "?") return; if (!f.verbo) comoNombre(f); else if (!f.nominal && !["det", "adj"].includes(fichas[k - 1]?.tipo)) comoVerbo(f); });
  fichas.forEach((f, k) => {
    if (f.tipo !== "?") return;
    const antes = fichas[k - 1];
    if (antes && (antes.tipo === "det" || antes.tipo === "adj")) return comoNombre(f);
    if (antes?.tipo === "prep") return f.verbo!.lema === f.texto.toLowerCase() && lang === "es" ? comoVerbo(f) : comoNombre(f); // «a matar», «de casa»
    if (antes && ["pron", "clit", "neg"].includes(antes.tipo)) return comoVerbo(f);
    if (antes?.tipo === "verbo" && (["gerundio", "participio"].includes(f.verbo!.tiempo ?? "") || f.verbo!.lema === f.texto.toLowerCase())) return comoVerbo(f); // «he comido», «puede ver»
    if (antes?.tipo === "verbo") return comoNombre(f);
    // tras el sujeto, una forma de un verbo irregular frecuente es casi siempre ese verbo («el sol salga»)
    if (antes && ["nombre", "propio"].includes(antes.tipo) && IRREGULARES_ES.has(f.verbo!.lema) && f.verbo!.lema !== f.texto.toLowerCase()) return comoVerbo(f);
    return hayVerbo(k) ? comoNombre(f) : comoVerbo(f);
  });
  return auxiliares(fichas, lang);
}

// «he comido», «voy a comer», «estaba comiendo», «will eat», «did not go»: queda un solo verbo con su tiempo
function auxiliares(f: Ficha[], lang: "es" | "en"): Ficha[] {
  const fuera = new Set<Ficha>();
  f.forEach((a, k) => {
    const w = a.texto.toLowerCase();
    const siguiente = f.slice(k + 1).find((x) => !["neg", "adv"].includes(x.tipo) && !(x.tipo === "prep" && (x.lema === "a" || x.lema === "to")));
    if (lang === "en" && /^(will|shall|would|did|do|does)$/.test(w) && siguiente?.verbo) {
      if (siguiente.tipo !== "verbo") { siguiente.tipo = "verbo"; siguiente.lema = siguiente.verbo.lema; siguiente.rasgos = []; }
      const t: Rasgo | null = /^(will|shall)$/.test(w) ? "futuro" : w === "would" ? "condicional" : w === "did" ? "pasado" : null;
      if (t) siguiente.rasgos = [t];
      siguiente.verbo = { ...siguiente.verbo!, personas: a.verbo?.personas ?? siguiente.verbo!.personas };
      fuera.add(a);
      return;
    }
    if (a.tipo !== "verbo" || !siguiente || siguiente.tipo !== "verbo" || !a.verbo) return;
    const haber = a.lema === (lang === "es" ? "haber" : "have") && siguiente.verbo?.tiempo && ["participio", "pasado"].includes(siguiente.verbo.tiempo);
    const estar = a.lema === (lang === "es" ? "estar" : "be") && siguiente.verbo?.tiempo === "gerundio";
    const irA = lang === "es" && a.lema === "ir" && f[k + 1]?.lema === "a" && siguiente.verbo?.lema === siguiente.texto.toLowerCase();
    if (!haber && !estar && !irA) return;
    siguiente.rasgos = irA ? ["futuro"] : estar ? [...(a.verbo.tiempo ? [a.verbo.tiempo] : []), "gerundio"] : [a.verbo.tiempo ?? "pasado"];
    siguiente.verbo = { ...siguiente.verbo!, personas: a.verbo.personas };
    fuera.add(a);
    if (irA) fuera.add(f[k + 1]);
  });
  return f.filter((x) => !fuera.has(x));
}

// Grupo nominal: determinantes, nombre y adjetivos en el orden del idioma inventado.
function grupos(f: Ficha[], i: Idioma, lang: "es" | "en"): Ficha[] {
  const out: Ficha[] = [];
  for (let k = 0; k < f.length;) {
    if (!["det", "adj", "nombre"].includes(f[k].tipo)) { out.push(f[k++]); continue; }
    const dets: Ficha[] = [], resto: Ficha[] = [];
    while (f[k]?.tipo === "det") dets.push(f[k++]);
    while (f[k] && (f[k].tipo === "adj" || f[k].tipo === "nombre")) resto.push(f[k++]);
    const nombres = resto.filter((x) => x.tipo === "nombre");
    const nucleo = lang === "es" ? nombres[0] ?? resto[0] : nombres[nombres.length - 1] ?? resto[resto.length - 1];
    const adjs = resto.filter((x) => x !== nucleo).map((x): Ficha => ({ ...x, tipo: "adj", rasgos: [] }));
    const cabeza = nucleo ? [{ ...nucleo, tipo: "nombre" as const }] : [];
    const articulo = (d: Ficha) => ["el", "un", "the", "a"].includes(d.lema);
    out.push(...dets.filter((d) => i.articulos !== false || !articulo(d)), ...(i.adjetivo === "antes" ? [...adjs, ...cabeza] : [...cabeza, ...adjs]));
  }
  return out;
}

// Una oración simple: [enlace] sujeto, verbo y complementos en el orden del idioma.
function clausula(f: Ficha[], i: Idioma, lang: "es" | "en"): Ficha[] {
  let k = 0;
  const enlace: Ficha[] = [];
  while (f[k] && (f[k].tipo === "conj" || f[k].tipo === "preg")) enlace.push(f[k++]);
  const resto = f.slice(k);
  let a = resto.findIndex((x) => x.tipo === "verbo");
  if (a < 0) return [...enlace, ...grupos(resto, i, lang)];
  while (a > 0 && ["neg", "clit"].includes(resto[a - 1].tipo)) a--;
  let b = a;
  while (resto[b] && (["neg", "clit", "verbo"].includes(resto[b].tipo))) b++;
  const bloque = resto.slice(a, b);
  const objetos = bloque.filter((x) => x.tipo === "clit" && x.lema !== "se"); // «te», «lo»: son complemento
  const negacion = [...bloque.filter((x) => x.tipo === "neg"), ...resto.slice(b).filter((x) => x.tipo === "neg")];
  const verbos = bloque.filter((x) => x.tipo === "verbo" || x.lema === "se");
  const sujeto = resto.slice(0, a);
  // persona del verbo: la del sujeto si la hay
  const pron = sujeto.find((x) => x.tipo === "pron" && PERSONA[x.lema]);
  const plural = sujeto.some((x) => x.rasgos.includes("plural"));
  for (const v of verbos) {
    if (v.tipo !== "verbo" || v.rasgos.includes("participio") || v.lema === v.texto.toLowerCase() && !v.verbo?.personas.length && v !== verbos[0]) continue;
    const posibles = v.verbo?.personas ?? [];
    const delSujeto: Rasgo | undefined = pron ? PERSONA[pron.lema] : sujeto.some((x) => x.tipo === "nombre" || x.tipo === "propio") ? (plural ? "3p" : "3s") : undefined;
    const persona = delSujeto ?? (posibles.includes("3s") ? "3s" : posibles[0]);
    if (persona) v.rasgos = [...v.rasgos, persona];
  }
  const V = i.negacion === "después" ? [...verbos, ...negacion] : [...negacion, ...verbos];
  const S = grupos(sujeto, i, lang), O = [...objetos, ...grupos(resto.slice(b).filter((x) => x.tipo !== "neg"), i, lang)];
  if (i.orden === "libre") return [...enlace, ...S, ...V, ...O];
  const partes: Record<string, Ficha[]> = { S, V, O };
  return [...enlace, ...[...i.orden].flatMap((x) => partes[x] ?? [])];
}

// corta en las conjunciones que abren otra oración (las que unen dos nombres se quedan dentro)
function clausulas(f: Ficha[]): Ficha[][] {
  const out: Ficha[][] = [[]];
  f.forEach((x, k) => {
    const actual = out[out.length - 1];
    if (x.tipo === "conj" && actual.some((y) => y.tipo === "verbo")) {
      const hasta = f.findIndex((y, j) => j > k && y.tipo === "conj");
      if (f.slice(k + 1, hasta < 0 ? undefined : hasta).some((y) => y.tipo === "verbo")) { out.push([x]); return; }
    }
    actual.push(x);
  });
  return out;
}

export interface Salida { palabra: string; origen: string; rasgos: Rasgo[] }
export interface Opciones { lang: string; base: Base | null; lexico: Map<string, string>; nombres?: Set<string>; dialecto?: string }

export function traducir(i: Idioma, texto: string, o: Opciones): { texto: string; glosa: Salida[] } {
  const lang = conGramatica(o.lang), glosa: Salida[] = [];
  const dicho = (w: string) => (o.dialecto ? cambiar(i, w, o.dialecto) : w);
  const inventada = (lema: string) => buscar(i, lema)?.palabra ?? o.lexico.get(lema) ?? palabraDe(i, lema, GRAMATICALES.has(lema));
  const escribir = (f: Ficha) => {
    const palabra = f.tipo === "propio" ? f.texto : dicho(afijar(i, inventada(f.lema), f.rasgos));
    glosa.push({ palabra, origen: f.tipo === "propio" ? f.texto : f.lema, rasgos: f.rasgos });
    return palabra;
  };
  const trozosTexto = texto.match(/[^.!?…,;:\n]+|[.!?…,;:\n]+/g) ?? [];
  let inicio = true;
  const out = trozosTexto.map((t) => {
    if (/^[.!?…,;:\n]+$/.test(t)) { if (/[.!?…\n]/.test(t)) inicio = true; return t; }
    let fichas: Ficha[];
    if (lang && o.base) fichas = clausulas(analizar(t, o.base, lang, o.nombres)).flatMap((c) => clausula(c, i, lang));
    else {
      fichas = [...t.matchAll(/\p{L}+/gu)].map((m, k) => {
        const w = m[0].toLowerCase(), propio = m[0][0] !== w[0] && (k > 0 || o.nombres?.has(w));
        return { texto: m[0], lema: propio ? m[0] : o.base?.origen(w)[0] ?? w, tipo: propio ? "propio" : "nombre", rasgos: [] };
      });
    }
    const frase = fichas.map(escribir).filter(Boolean).join(" ");
    const lead = t.match(/^\s*[¿¡"«“—-]*/)![0], cola = t.match(/["»”]*\s*$/)![0];
    const cap = inicio && frase ? frase[0].toUpperCase() + frase.slice(1) : frase;
    if (frase) inicio = false;
    return lead + cap + cola;
  });
  return { texto: out.join(""), glosa };
}

export const claseDe = (base: Base, lang: string, lema: string): Clase => {
  const g = conGramatica(lang);
  if (g) for (const [tipo, m] of CERRADAS[g]) if (m.has(lema)) return tipo === "pron" || tipo === "clit" ? "pronombre" : "partícula";
  if (g === "es" && esVerbo(base, g)(lema)) return "verbo";
  return ADJETIVOS.has(lema) ? "adjetivo" : g ? "sustantivo" : "otro";
};
