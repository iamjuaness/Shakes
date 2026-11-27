// Puro: sonidos, generación de palabras, léxico completo, afijos, cambios de sonido (dialectos) y letras.
export const CLASES = ["sustantivo", "verbo", "adjetivo", "pronombre", "partícula", "otro"] as const;
export type Clase = (typeof CLASES)[number];
export const RASGOS = ["plural", "pasado", "imperfecto", "futuro", "condicional", "subjuntivo", "gerundio", "participio", "1s", "2s", "3s", "1p", "2p", "3p"] as const;
export type Rasgo = (typeof RASGOS)[number];
export interface Palabra { id: string; palabra: string; significado: string; clase: Clase; nota?: string } // significado: sinónimos separados por comas
export interface Afijo { id: string; nombre: string; tipo: "prefijo" | "sufijo"; forma: string; clase: Clase; rasgo?: Rasgo }
export interface Dialecto { id: string; nombre: string; reglas: string } // una regla por línea: «k > ch / _i»
export interface Idioma {
  id: string; nombre: string; hablantes?: string; historia?: string; semilla?: number;
  consonantes: string; vocales: string; // sonidos separados por espacios; los primeros salen más
  silabas: string; // patrones separados por espacios: C, V, letras fijas y (opcional)
  prohibidas: string; minimo: number; maximo: number; pronunciacion?: string; escritura?: string;
  orden: string; adjetivo: "antes" | "después"; gramatica?: string; articulos?: boolean; negacion?: "antes" | "después";
  afijos: Afijo[]; lexico: Palabra[]; // lexico: palabras fijadas por el autor; mandan sobre las generadas
  dialectos?: Dialecto[]; glifos?: Record<string, string>; direccion?: "ltr" | "rtl"; // glifos: sonido -> trazo SVG en 100×100
}

export const PRESETS: Record<string, Pick<Idioma, "consonantes" | "vocales" | "silabas" | "prohibidas" | "minimo" | "maximo">> = {
  "clásico": { consonantes: "r s l n t v k m d y h z q g p j gh rh", vocales: "a e i o y u ā ē ō ae", silabas: "CV CV CVC V", prohibidas: "qy yy", minimo: 2, maximo: 3 },
  "suave": { consonantes: "l n r m s th v f d h w", vocales: "a e i o ia ie ae", silabas: "CV CV V CVl CVn", prohibidas: "lr rl", minimo: 2, maximo: 4 },
  "áspero": { consonantes: "k g r t z d kh gr b n sh", vocales: "a o u", silabas: "CVC CV CVC", prohibidas: "kk gg", minimo: 1, maximo: 2 },
  "fluido": { consonantes: "m n k t s h p w y r", vocales: "a i u e o", silabas: "CV CV CV V", prohibidas: "", minimo: 2, maximo: 4 },
};

export const nuevoIdioma = (id: string, nombre: string): Idioma => ({ id, nombre, ...PRESETS["clásico"], orden: "SOV", adjetivo: "después", articulos: false, negacion: "antes", afijos: [], lexico: [] });

export const trozos = (s: string) => s.split(/[\s,]+/).filter(Boolean);
export type Azar = () => number;
// azar repetible a partir de un texto: la misma palabra sale siempre igual
export function azarDe(texto: string): Azar {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const elige = <T,>(l: T[], r: Azar, sesgo = 1) => l[Math.min(l.length - 1, Math.floor(r() ** sesgo * l.length))];

function maquina(i: Idioma) {
  const c = trozos(i.consonantes), v = trozos(i.vocales), patrones = trozos(i.silabas), no = trozos(i.prohibidas);
  const min = Math.max(1, i.minimo || 1), max = Math.max(min, i.maximo || min);
  const vale = !!v.length && !!patrones.length;
  const silaba = (p: string, r: Azar) => p.replace(/\(([^)]*)\)/g, (_, x) => (r() < 0.5 ? x : "")).replace(/[CV]/g, (t) => elige(t === "C" ? c : v, r, 1.5) ?? "");
  const intento = (n: number, r: Azar) => {
    let w = "";
    for (let k = 0; k < n; k++) w += silaba(elige(patrones, r), r);
    return w && !no.some((x) => w.includes(x)) && !/(.)\1\1/.test(w) ? w : "";
  };
  return { vale, min, max, intento };
}

// Palabra nueva con los sonidos del idioma; "" si las reglas no permiten ninguna que no exista ya.
export function generar(i: Idioma, r: Azar = Math.random, usadas = new Set(i.lexico.map((p) => p.palabra)), corta = false): string {
  const m = maquina(i);
  if (!m.vale) return "";
  for (let k = 0; k < 300; k++) {
    // las palabras gramaticales son breves mientras quede alguna libre
    const w = m.intento(corta && k < 40 ? 1 : m.min + Math.floor(r() * (m.max - m.min + 1)), r);
    if (w && !usadas.has(w)) return w;
  }
  return "";
}

const norm = (s: string) => s.trim().toLowerCase();
export const sentidos = (p: Palabra) => p.significado.split(",").map(norm).filter(Boolean);
export const buscar = (i: Idioma, significado: string) => i.lexico.find((p) => sentidos(p).includes(norm(significado)));

export function palabraDe(i: Idioma, lema: string, breve = false, usadas: Set<string> = new Set(), m = maquina(i)): string {
  if (!m.vale) return "";
  const r = azarDe(`${i.id}|${i.semilla ?? 0}|${lema}`);
  // cuanto más larga la palabra de origen, más larga la inventada
  const base = breve ? 1 : lema.length <= 4 ? m.min : lema.length <= 8 ? m.min + Math.floor(r() * (m.max - m.min + 1)) : m.max;
  let ultima = "";
  for (let k = 0; k < 60; k++) {
    const w = m.intento(base + Math.floor(k / 12), r); // si no queda hueco, se alarga
    if (w) { ultima = w; if (!usadas.has(w)) return w; }
  }
  return ultima;
}

// El diccionario entero: una palabra para cada palabra del idioma base. No se guarda: se deduce del idioma
// (mismos sonidos y semilla = mismas palabras), salvo las que el autor haya fijado.
// `breves`: palabras gramaticales, de una sílaba si queda alguna libre.
export function lexicoCompleto(i: Idioma, lemas: string[], breves: Set<string> = new Set()): Map<string, string> {
  const m = maquina(i), out = new Map<string, string>(), usadas = new Set(i.lexico.map((p) => p.palabra));
  for (const p of i.lexico) for (const s of sentidos(p)) if (!out.has(s)) out.set(s, p.palabra);
  // las gramaticales eligen primero: son las que menos combinaciones tienen
  for (const lema of [...lemas.filter((l) => breves.has(l)), ...lemas.filter((l) => !breves.has(l))]) {
    if (out.has(lema)) continue;
    const w = palabraDe(i, lema, breves.has(lema), usadas, m);
    if (w) { out.set(lema, w); usadas.add(w); }
  }
  return out;
}

export const aplicar = (palabra: string, a: Afijo) => (a.tipo === "prefijo" ? a.forma.replace(/-/g, "") + palabra : palabra + a.forma.replace(/-/g, ""));
export const rasgoDe = (a: Afijo): Rasgo | undefined => a.rasgo ?? (/plural/i.test(a.nombre) ? "plural" : undefined);
export const afijar = (i: Idioma, palabra: string, rasgos: Rasgo[]) => rasgos.reduce((w, r) => { const a = i.afijos.find((x) => rasgoDe(x) === r && x.forma); return a ? aplicar(w, a) : w; }, palabra);
export const flexiones = (i: Idioma, palabra: string, clase: Clase) => i.afijos.filter((a) => a.clase === clase && a.forma).map((a) => ({ nombre: a.nombre, forma: aplicar(palabra, a) }));

// Crea los afijos de gramática que falten (no toca los que ya existen).
export function completarGramatica(i: Idioma, nombres: Record<Rasgo, string>, id: () => string): Afijo[] {
  const usadas = new Set(i.afijos.map((a) => a.forma.replace(/-/g, "")));
  const nuevos = RASGOS.filter((r) => !i.afijos.some((a) => rasgoDe(a) === r)).map((rasgo): Afijo => {
    const forma = generar(i, azarDe(`${i.id}|${i.semilla ?? 0}|afijo|${rasgo}`), usadas, true);
    usadas.add(forma);
    const prefijo = rasgo === "futuro" || rasgo === "condicional";
    return { id: id(), nombre: nombres[rasgo], rasgo, tipo: prefijo ? "prefijo" : "sufijo", forma: prefijo ? `${forma}-` : `-${forma}`, clase: rasgo === "plural" ? "sustantivo" : "verbo" };
  });
  return [...i.afijos, ...nuevos];
}

// ---------- Dialectos ----------
// «origen > destino / antes_después»; en el contexto: # = borde de palabra, V = vocal, C = consonante; destino 0 = nada.
export function cambiar(i: Idioma, palabra: string, reglas: string): string {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const grupo = (l: string[]) => `(?:${[...l].sort((a, b) => b.length - a.length).map(esc).join("|") || "(?!)"})`;
  const v = grupo(trozos(i.vocales)), c = grupo(trozos(i.consonantes));
  const ctx = (s: string, borde: string) => s.split("").map((x) => (x === "#" ? borde : x === "V" ? v : x === "C" ? c : esc(x))).join("");
  return reglas.split("\n").reduce((w, linea) => {
    const m = linea.match(/^\s*(\S+)\s*(?:>|→)\s*(\S+)\s*(?:\/\s*([^_\s]*)_([^_\s]*))?\s*$/);
    if (!m) return w;
    const origen = m[1] === "V" ? v : m[1] === "C" ? c : esc(m[1]);
    const re = new RegExp(`${m[3] ? `(?<=${ctx(m[3], "^")})` : ""}${origen}${m[4] ? `(?=${ctx(m[4], "$")})` : ""}`, "g");
    return w.replace(re, m[2] === "0" ? "" : m[2]) || w; // nunca deja una palabra vacía
  }, palabra);
}

const CAMBIOS = ["p > b / V_V", "t > d / V_V", "k > g / V_V", "s > h / _#", "k > ch / _i", "t > ts / _i", "a > o / _n", "e > i / _#", "o > u / _#", "V > 0 / C_#", "r > l", "th > t", "gh > g", "rh > r", "ā > a", "ē > ei", "ō > ou", "ae > e", "v > w", "h > 0 / #_", "n > m / _p", "d > r / V_V"];
// Entre 3 y 6 cambios que afecten a sonidos que el idioma tiene.
export function dialectoAlAzar(i: Idioma, r: Azar = Math.random): string {
  const hay = new Set([...trozos(i.consonantes), ...trozos(i.vocales), "V"]);
  const posibles = CAMBIOS.filter((x) => hay.has(x.split(" ")[0]));
  const n = Math.min(posibles.length, 3 + Math.floor(r() * 4));
  const out = new Set<string>();
  for (let k = 0; out.size < n && k < 500; k++) out.add(elige(posibles, r));
  return [...out].join("\n");
}

// ---------- Letras ----------
export const sonidos = (i: Idioma) => [...new Set([...trozos(i.vocales), ...trozos(i.consonantes)])];

// parte una palabra en los sonidos del idioma, empezando por los más largos
export function enSonidos(i: Idioma, palabra: string): string[] {
  const l = sonidos(i).sort((a, b) => b.length - a.length), out: string[] = [], w = palabra.toLowerCase();
  for (let k = 0; k < w.length;) { const s = l.find((x) => w.startsWith(x, k)) ?? w[k]; out.push(s); k += s.length; }
  return out;
}

// trazo de partida para un sonido: líneas y curvas entre puntos de una rejilla de 3×3
export function glifo(i: Idioma, sonido: string): string {
  const r = azarDe(`${i.id}|${i.semilla ?? 0}|letra|${sonido}`), p = [18, 50, 82];
  const punto = () => `${elige(p, r)} ${elige(p, r)}`;
  let antes = `${elige(p, r)} 18`, d = `M${antes}`;
  for (let k = 0, n = 2 + Math.floor(r() * 3); k < n; k++) {
    let q = punto();
    while (q === antes) q = punto();
    d += r() < 0.4 ? `Q${punto()} ${q}` : `L${q}`;
    antes = q;
  }
  return d;
}

export function alfabetoSvg(i: Idioma): string {
  const l = sonidos(i).filter((s) => i.glifos?.[s]), cols = 8, f = Math.max(1, Math.ceil(l.length / cols));
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols * 120} ${f * 140}" fill="none" stroke="#111" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${l.map((s, k) => `<g transform="translate(${(k % cols) * 120 + 10} ${Math.floor(k / cols) * 140 + 5})"><path d="${esc(i.glifos![s])}"/><text x="50" y="125" text-anchor="middle" font-family="serif" font-size="22" fill="#111" stroke="none">${esc(s)}</text></g>`).join("")}</svg>`;
}
