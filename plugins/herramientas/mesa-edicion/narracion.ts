// Puro: punto de vista y tiempo verbal dentro de una escena, y la voz de cada personaje en los diálogos (es / en).
export interface Parte { narracion: string; dialogo: string; habla: string } // habla: la acotación («dijo Ana»)

// Separa lo que se dice de lo que se narra: raya (—Hola —dijo—.) o comillas.
export function separar(texto: string): Parte {
  if (/^\s*[—–]/.test(texto)) {
    const t = texto.replace(/^\s*[—–]/, "").split(/[—–]/);
    const narr = t.filter((_, i) => i % 2).join(" ");
    return { dialogo: t.filter((_, i) => !(i % 2)).join(" "), narracion: narr, habla: narr };
  }
  const dichos: string[] = [];
  const narracion = texto.replace(/«([^»]*)»|“([^”]*)”|"([^"]*)"/g, (_, a, b, c) => { dichos.push(a ?? b ?? c); return " "; });
  return { dialogo: dichos.join(" "), narracion, habla: dichos.length ? narracion : "" };
}

const w = (s: string) => new RegExp(`(?<![\\p{L}])(?:${s})(?![\\p{L}])`, "giu");
const cuenta = (t: string, re: RegExp) => (t.match(re) ?? []).length;
const TIEMPOS = {
  es: {
    pasado: w("era|eran|estaba|estaban|tenía|tenían|había|fue|fueron|dijo|dijeron|hizo|pudo|podía|quiso|quería|supo|sabía|vio|veía|sintió|iba|iban|estuvo|tuvo|parecía|\\p{L}{3,}(?:aba|aban|aron|ieron|ó)"),
    presente: w("es|son|está|están|tiene|tienen|hay|va|van|dice|dicen|hace|hacen|puede|pueden|quiere|quieren|sabe|saben|ve|ven|mira|miran|siente|sienten|piensa|piensan|llega|llegan|entra|entran|sale|salen|camina|abre|cierra|vuelve|parece|queda|sigue|estoy|soy|tengo|voy|veo"),
    primera: w("yo|me|mí|conmigo|mis?|nosotros|nuestr[oa]s?"),
    tercera: w("él|ella|ellos|ellas|sus?|se|les?"),
  },
  en: {
    pasado: w("was|were|had|said|did|went|saw|knew|felt|thought|came|took|got|made|\\p{L}{3,}ed"),
    presente: w("is|are|has|says|does|goes|sees|knows|feels|thinks|comes|takes|gets|makes|am|looks|walks|opens"),
    primera: w("I|me|my|mine|we|our|us"),
    tercera: w("he|she|they|his|her|their|him|them"),
  },
};
// verbos que solo puede contar quien está dentro de la cabeza del personaje
const INTERIOR = { es: "pensó|pensaba|sintió|sentía|se preguntó|recordó|recordaba|deseaba|deseó|temía|temió|sabía|notó|imaginó|supo", en: "thought|felt|wondered|remembered|wished|feared|knew|noticed|imagined|realized" };

export interface Aviso { bloque: number; from: number; to: number; regla: "tiempo" | "narrador" | "cabeza"; msg: string }
export const idiomaDe = (lang: string) => (/^es(-|$)/i.test(lang) ? "es" as const : /^en(-|$)/i.test(lang) ? "en" as const : null);

// Avisos de una escena (sus párrafos). `nombres`: personajes de las fichas, cada uno con sus apodos.
export function revisarEscena(parrafos: { texto: string; bloque: number }[], lang: string, nombres: string[][] = []): Aviso[] {
  const id = idiomaDe(lang);
  if (!id) return [];
  const R = TIEMPOS[id], es = id === "es", out: Aviso[] = [];
  const narr = parrafos.map((p) => ({ ...p, n: separar(p.texto).narracion }));
  const todo = narr.map((p) => p.n).join("\n");
  const pas = cuenta(todo, R.pasado), pre = cuenta(todo, R.presente);
  const base = pas + pre >= 6 ? (pas >= 3 * pre ? "pasado" : pre >= 3 * pas ? "presente" : null) : null;
  const uno = cuenta(todo, R.primera), tres = cuenta(todo, R.tercera);
  const entero = (p: { texto: string; bloque: number }) => ({ bloque: p.bloque, from: 0, to: Math.min(p.texto.length, 60) });
  for (const p of narr) {
    if (base) {
      const otro = base === "pasado" ? "presente" : "pasado";
      if (cuenta(p.n, R[otro]) >= 2 && !cuenta(p.n, R[base])) out.push({ ...entero(p), regla: "tiempo", msg: es ? `Salto de tiempo verbal: la escena se narra en ${base} y este párrafo en ${otro}.` : `Tense shift: the scene is told in the ${base === "pasado" ? "past" : "present"} and this paragraph is not.` });
    }
    // el resto de la escena, sin este párrafo, va en tercera
    if (tres >= 4 && uno - cuenta(p.n, R.primera) < tres * 0.15 && cuenta(p.n, R.primera) >= 2 && !cuenta(p.n, R.tercera))
      out.push({ ...entero(p), regla: "narrador", msg: es ? "Salto de narrador: la escena va en tercera persona y este párrafo en primera." : "Point of view shift: the scene is in third person and this paragraph in first." });
  }
  // Más de un personaje «por dentro» en la misma escena.
  const dentro = new Map<string, string>();
  for (const p of narr) for (const alias of nombres) {
    const quien = alias.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const m = p.n.match(new RegExp(`(?<![\\p{L}])(?:${quien})\\s+(?:(?:no|ya|se|le|lo|también)\\s+)?(?:${INTERIOR[id]})(?![\\p{L}])`, "iu"));
    if (!m || dentro.has(alias[0])) continue;
    if (dentro.size) {
      const i = p.texto.indexOf(m[0]);
      out.push({ bloque: p.bloque, from: Math.max(0, i), to: i < 0 ? Math.min(p.texto.length, 60) : i + m[0].length, regla: "cabeza", msg: es ? `Posible salto de punto de vista: en esta escena se conoce por dentro a ${[...dentro.keys()][0]} y a ${alias[0]}.` : `Possible head-hopping: this scene is inside both ${[...dentro.keys()][0]} and ${alias[0]}.` });
    }
    dentro.set(alias[0], m[0]);
  }
  return out;
}

// ---------- Voz de cada personaje ----------
export interface Voz { nombre: string; intervenciones: number; palabras: number; frase: number; preguntas: number; exclamaciones: number; variedad: number; propias: string[] }
const VACIAS = new Set("que de la el en y a los las un una por con para del se no lo le me te es mi tu su si al como pero más ya o este esta eso esto yo tú él ella muy the a an and of to in is it you i that he she we they this for on with not be was are have do but".split(" "));

// Intervenciones atribuidas por el nombre que aparece en la acotación (o en el párrafo, si es el único).
export function voces(parrafos: string[], nombres: string[][]): { voces: Voz[]; sinAtribuir: number; parecidas: [string, string][] } {
  const de = new Map<string, string[]>();
  let sin = 0;
  const hay = (t: string, alias: string[]) => alias.some((a) => new RegExp(`(?<![\\p{L}])${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "iu").test(t));
  for (const t of parrafos) {
    const p = separar(t);
    if (!p.dialogo.trim()) continue;
    // en la acotación manda el nombre que va junto al verbo; si no hay, el único nombrado en la narración
    const quienes = nombres.filter((a) => hay(p.habla.split(/[.;]/)[0], a));
    const q = quienes.length ? quienes : nombres.filter((a) => hay(p.narracion, a));
    if (q.length !== 1) { sin++; continue; }
    de.set(q[0][0], [...(de.get(q[0][0]) ?? []), p.dialogo]);
  }
  const palabrasDe = (s: string) => s.toLowerCase().match(/\p{L}+/gu) ?? [];
  const global = new Map<string, number>();
  let total = 0;
  for (const l of de.values()) for (const p of palabrasDe(l.join(" "))) { global.set(p, (global.get(p) ?? 0) + 1); total++; }
  const frecuencias = new Map<string, Map<string, number>>();
  const lista = [...de].map(([nombre, dichos]): Voz => {
    const todo = dichos.join(" "), ps = palabrasDe(todo), frec = new Map<string, number>();
    for (const p of ps) frec.set(p, (frec.get(p) ?? 0) + 1);
    frecuencias.set(nombre, frec);
    const frases = dichos.flatMap((d) => d.split(/[.!?…]+/)).filter((f) => palabrasDe(f).length).length || 1;
    // propias: las que usa mucho más de lo que se usan en el conjunto
    const propias = [...frec].filter(([p, n]) => n >= 2 && !VACIAS.has(p) && p.length > 2).map(([p, n]) => [p, n / ps.length - global.get(p)! / total] as const).filter(([, d]) => d > 0).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([p]) => p);
    const primeras = ps.slice(0, 200);
    return { nombre, intervenciones: dichos.length, palabras: ps.length, frase: Math.round((ps.length / frases) * 10) / 10, preguntas: Math.round((dichos.filter((d) => d.includes("?")).length / dichos.length) * 100), exclamaciones: Math.round((dichos.filter((d) => d.includes("!")).length / dichos.length) * 100), variedad: primeras.length ? Math.round((new Set(primeras).size / primeras.length) * 100) : 0, propias };
  }).sort((a, b) => b.palabras - a.palabras);
  // Dos voces se parecen si hablan con frases del mismo largo y con las mismas palabras, en parecida proporción.
  const coseno = (a: Map<string, number>, b: Map<string, number>) => {
    let p = 0, x = 0, y = 0;
    for (const [k, v] of a) { x += v * v; p += v * (b.get(k) ?? 0); }
    for (const v of b.values()) y += v * v;
    return p / Math.sqrt(x * y || 1);
  };
  const parecidas: [string, string][] = [];
  lista.forEach((a, i) => lista.slice(i + 1).forEach((b) => {
    if (a.palabras >= 60 && b.palabras >= 60 && Math.abs(a.frase - b.frase) < 1.5 && coseno(frecuencias.get(a.nombre)!, frecuencias.get(b.nombre)!) > 0.85) parecidas.push([a.nombre, b.nombre]);
  }));
  return { voces: lista, sinAtribuir: sin, parecidas };
}
