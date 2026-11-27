// Puro: revisión editorial del libro entero (hallazgos con su arreglo, informe por capítulo) sobre el HTML del texto.
// Test: node plugins/herramientas/herramientas.test.ts
import { scenes } from "../../../src/tree.ts";
import type { Node } from "../../../src/tree.ts";
import { lint } from "../linter-estilo/reglas.ts";
import { muletillas, repeticiones } from "../repeticiones/reglas.ts";
import { EN, ES, otros, repetidas } from "./reglas.ts";
import type { Categoria, Regla } from "./reglas.ts";
import { idiomaDe, revisarEscena } from "./narracion.ts";
import { L, enIngles } from "../_comun/idioma.ts";
export type { Categoria } from "./reglas.ts";

// ---------- Texto <-> HTML ----------
// Un bloque es el texto de un párrafo, título o elemento de lista; recuerda de qué trozo del HTML sale cada carácter.
export interface Bloque { texto: string; partes: { tok: number; ini: number; len: number }[]; escena: number } // escena: cuántos cambios de escena hay antes
const dec = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const cod = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/ /g, "&nbsp;");
const trocear = (html: string) => html.split(/(<[^>]+>)/);

export function bloques(html = ""): Bloque[] {
  const out: Bloque[] = [];
  let escena = 0;
  let b: Bloque = { texto: "", partes: [], escena };
  const cerrar = () => { if (b.texto.trim()) out.push(b); b = { texto: "", partes: [], escena }; };
  trocear(html).forEach((t, tok) => {
    if (t.startsWith("<")) {
      if (/^<hr\b/i.test(t)) { cerrar(); b.escena = ++escena; return; }
      if (/^<\/?(p|h[1-6]|li|blockquote|ul|ol|div|pre|table|tr|td|th)\b/i.test(t)) cerrar();
      else if (/^<br\b/i.test(t)) { b.partes.push({ tok: -1, ini: b.texto.length, len: 1 }); b.texto += "\n"; }
    } else if (t) { const s = dec(t); b.partes.push({ tok, ini: b.texto.length, len: s.length }); b.texto += s; }
  });
  cerrar();
  return out;
}

// Cambia [from, to) del bloque `n` por `rep`, conservando negritas, cursivas y notas.
export function aplicar(html: string, n: number, from: number, to: number, rep: string): string {
  const toks = trocear(html);
  let puesto = false;
  for (const p of bloques(html)[n]?.partes ?? []) {
    const fin = p.ini + p.len;
    if (p.tok < 0 || fin <= from || p.ini >= Math.max(to, from + 1)) continue;
    const s = dec(toks[p.tok]);
    toks[p.tok] = cod(s.slice(0, Math.max(0, from - p.ini)) + (puesto ? "" : rep) + s.slice(Math.max(0, to - p.ini)));
    puesto = true;
  }
  return toks.join("");
}

// ---------- Reglas ----------
export const categorias = (): [Categoria, string][] => [["orto", L("Ortotipografía", "Typography")], ["gramatica", L("Gramática", "Grammar")], ["estilo", L("Estilo", "Style")], ["narrativa", L("Narrativa y diálogo", "Narrative and dialogue")], ["repeticion", L("Repeticiones", "Repetitions")]];
// Palabra o frase completa (\b no entiende tildes).
const w = (s: string) => new RegExp(`(?<![\\p{L}])(?:${s})(?![\\p{L}])`, "giu");
const VERBOS = "dijo|dije|preguntó|pregunté|respondió|respondí|contestó|contesté|susurró|murmuró|gritó|exclamó|replicó|añadió|insistió|explicó|ordenó|pidió|repuso|musitó|afirmó|comentó";
const CUANTOS = "(?=\\s+(?:muchos|muchas|varios|varias|unos|unas|pocos|pocas|demasiados|demasiadas|dos|tres|cuatro|cinco)(?![\\p{L}]))";
const caso = (orig: string, r: string) => (/^\p{Lu}/u.test(orig) ? r[0].toUpperCase() + r.slice(1) : r);
const cambia = (r: string) => (m: RegExpMatchArray) => caso(m[0], r);

// Ortotipografía española (RAE). Las «seguras» pueden aplicarse en bloque.
const ORTO: Regla[] = [
  { id: "comillas", cat: "orto", re: /"([^"\n]+)"/g, msg: "En español se usan comillas latinas « ».", fix: (m) => `«${m[1]}»`, segura: true },
  { id: "suspensivos", cat: "orto", re: /(?<!\.)\.{3}(?!\.)/g, msg: "Puntos suspensivos como un solo signo (…).", fix: () => "…", segura: true },
  { id: "raya-inicio", cat: "orto", re: /^\s*(?:-{1,2}|–|—(?=\s))\s*(?=[\p{L}¿¡«])/gu, msg: "El diálogo se abre con raya (—) pegada a la primera palabra.", fix: () => "—", segura: true },
  { id: "acotacion-punto", cat: "orto", re: new RegExp(`(?<!\\.)\\.(?=\\s—(?:${VERBOS})(?![\\p{L}]))`, "giu"), msg: "Antes de una acotación con verbo de habla no va punto.", fix: () => "", segura: true },
  { id: "acotacion-mayus", cat: "orto", re: new RegExp(`(?<=\\S\\s?—)(?:${VERBOS.split("|").map((v) => v[0].toUpperCase() + v.slice(1)).join("|")})(?![\\p{L}])`, "gu"), msg: "El verbo de habla de una acotación va en minúscula.", fix: (m) => m[0].toLowerCase(), segura: true },
  { id: "comilla-punto", cat: "orto", re: /(?<!\.)([.,])»/g, msg: "El punto y la coma van después de las comillas de cierre.", fix: (m) => `»${m[1]}`, segura: true },
  { id: "falta-espacio", cat: "orto", re: /(?<=\p{L})([,;])(?=\p{L})/gu, msg: "Falta un espacio después del signo.", fix: (m) => `${m[1]} `, segura: true },
  { id: "falta-espacio-punto", cat: "orto", re: /(?<=\p{Ll}{2})\.(?=\p{Lu}\p{Ll})/gu, msg: "¿Falta un espacio después del punto?", fix: () => ". " },
  { id: "apertura", cat: "orto", re: /(?<=^|[.!?…]\s)[^¿¡.!?…\n]+[?!]/g, msg: "Falta el signo de apertura (¿ ¡)." },
];
const GRAMATICA: Regla[] = [
  { id: "habian", cat: "gramatica", re: new RegExp(`(?<![\\p{L}])habían${CUANTOS}`, "giu"), msg: "«Haber» impersonal va en singular: «había muchos».", fix: cambia("había") },
  { id: "hubieron", cat: "gramatica", re: new RegExp(`(?<![\\p{L}])hubieron${CUANTOS}`, "giu"), msg: "«Haber» impersonal va en singular: «hubo dos».", fix: cambia("hubo") },
  { id: "haber-si", cat: "gramatica", re: w("haber si"), msg: "Se escribe «a ver si».", fix: cambia("a ver si") },
  { id: "en-base-a", cat: "gramatica", re: w("en base a"), msg: "Mejor «a partir de» o «con base en».", fix: cambia("a partir de") },
  { id: "de-acuerdo-a", cat: "gramatica", re: w("de acuerdo a"), msg: "Lo recomendado es «de acuerdo con».", fix: cambia("de acuerdo con") },
  { id: "contra-mas", cat: "gramatica", re: w("contra más"), msg: "Lo correcto es «cuanto más».", fix: cambia("cuanto más") },
  { id: "redundancia", cat: "gramatica", re: w("pero sin embargo|mas sin embargo"), msg: "Dos conectores para lo mismo.", fix: cambia("sin embargo") },
  { id: "adverbio-posesivo", cat: "gramatica", re: w("(delante|detrás|encima|debajo|cerca) (mío|mía|tuyo|tuya)"), msg: "Con adverbios no va posesivo: «delante de mí».", fix: (m) => caso(m[0], `${m[1].toLowerCase()} de ${m[2].toLowerCase().startsWith("m") ? "mí" : "ti"}`) },
];
const CLICHES = "en un abrir y cerrar de ojos|frío como el hielo|blanco como la nieve|el corazón en un puño|silencio sepulcral|ni corto ni perezoso|a diestro y siniestro|como alma que lleva el diablo|la calma antes de la tormenta|con el alma en vilo|un sudor frío|un escalofrío recorrió su espalda|el tiempo se detuvo|un nudo en la garganta|brillaba por su ausencia|la gota que colmó el vaso|más vale tarde que nunca";
const NARRATIVA: Regla[] = [
  { id: "filtro", cat: "narrativa", re: w("(?:vio|veía|oyó|oía|sintió|sentía|notó|notaba|escuchó|observó|pensó|se dio cuenta de) que"), msg: "Verbo filtro: aleja al lector. Muestra directamente lo que percibe el personaje." },
  { id: "emocion", cat: "narrativa", re: w("(?:estaba|se sentía|se puso|parecía)(?: muy)? (?:triste|feliz|furios[oa]|enfadad[oa]|enojad[oa]|nervios[oa]|asustad[oa]|content[oa]|preocupad[oa]|emocionad[oa]|deprimid[oa]|ansios[oa]|aliviad[oa])"), msg: "Emoción contada: enséñala con un gesto, una acción o una frase." },
  { id: "empezo-a", cat: "narrativa", re: w("(?:empezó|comenzó|empezaba|comenzaba) a \\p{L}+(?:ar|er|ir)(?:se|le|lo|la)?"), msg: "«Empezó a…» suele sobrar: usa el verbo solo." },
  { id: "acotacion-recargada", cat: "narrativa", re: /(?<=—)(?:espetó|inquirió|masculló|farfulló|vociferó|sentenció|profirió|aseveró|manifestó)(?![\p{L}])/giu, msg: "Verbo de habla llamativo: «dijo» o una acción pasan inadvertidos." },
  { id: "acotacion-adverbio", cat: "narrativa", re: w(`(?:${VERBOS}) \\p{L}+mente`), msg: "Adverbio en la acotación: que el tono se note en las palabras." },
  { id: "gerundio", cat: "estilo", re: /,\s+(?:logrando|consiguiendo|provocando|causando|haciendo|obteniendo|resultando|terminando|acabando)(?![\p{L}])/giu, msg: "Gerundio de consecuencia o posterioridad (incorrecto): usa «y logró…» u otra frase." },
  { id: "cliche", cat: "estilo", re: w(CLICHES), msg: "Frase hecha: busca una imagen propia." },
];

export interface Hallazgo { id: string; nodo: string; bloque: number; from: number; to: number; regla: string; cat: Categoria; msg: string; sug: string[]; segura: boolean; antes: string; texto: string; despues: string }
type Crudo = Pick<Hallazgo, "from" | "to" | "regla" | "cat" | "msg" | "sug" | "segura">;
const LINT_CAT: Record<string, Categoria> = { adverbio: "estilo", larga: "estilo", pasiva: "estilo", gramatica: "gramatica", tipografia: "orto", inicio: "estilo", vago: "estilo" };

const aplicarReglas = (t: string, reglas: Regla[]): Crudo[] => reglas.flatMap((r) => [...t.matchAll(r.re)].filter((m) => !r.vale || r.vale(m)).map((m) => ({ from: m.index!, to: m.index! + m[0].length, regla: r.id, cat: r.cat, msg: r.msg, sug: [r.fix?.(m) ?? []].flat(), segura: !!r.segura })));

function revisarBloque(t: string, lang: string): Crudo[] {
  const id = idiomaDe(lang);
  if (id !== "es") return [
    ...aplicarReglas(t, id === "en" ? EN : otros(lang)),
    ...repetidas(t).map((x) => ({ from: x.from, to: x.to, regla: "repeticion", cat: "repeticion" as const, msg: id === "en" ? `“${x.palabra}” repeats ${x.distancia} words later.` : `«${x.palabra}»: ${x.distancia}`, sug: [], segura: false })),
  ];
  const out = aplicarReglas(t, [...ORTO, ...GRAMATICA, ...ES, ...NARRATIVA]);
  for (const l of lint(t)) out.push({ from: l.from, to: l.to, regla: "lint-" + l.tipo, cat: LINT_CAT[l.tipo] ?? "estilo", msg: l.msg ?? "", sug: l.sug ?? [], segura: l.msg === "Espacios dobles." });
  for (const x of muletillas(t)) out.push({ from: x.from, to: x.to, regla: "muletilla", cat: "estilo", msg: `Muletilla: «${x.frase}».`, sug: x.sugerencias, segura: false });
  for (const x of repeticiones(t)) out.push({ from: x.from, to: x.to, regla: "repeticion", cat: "repeticion", msg: `«${x.palabra}» se repite a ${x.distancia} palabras.`, sug: x.sugerencias, segura: false });
  return out;
}

// Un hallazgo con su contexto. La identidad sale del texto, no de la posición: sigue ignorado aunque se escriba antes.
export function hallazgo(nodo: string, texto0: string, bloque: number, h: Crudo): Hallazgo {
  const antes = texto0.slice(Math.max(0, h.from - 45), h.from), texto = texto0.slice(h.from, h.to), despues = texto0.slice(h.to, h.to + 45);
  return { ...h, id: `${nodo}|${h.regla}|${antes.slice(-15)}|${texto.slice(0, 40)}`, nodo, bloque, antes, texto, despues };
}

// `personajes`: nombre y apodos de cada uno (para los saltos de punto de vista).
export function revisarLibro(obra: Node, lang = "es", ignorados: string[] = [], personajes: string[][] = []): Hallazgo[] {
  const no = new Set(ignorados), out: Hallazgo[] = [];
  for (const { scene } of scenes(obra)) {
    const bs = bloques(scene.content);
    const deEscena = [...new Set(bs.map((b) => b.escena))].flatMap((e) => revisarEscena(bs.flatMap((b, n) => (b.escena === e ? [{ texto: b.texto, bloque: n }] : [])), lang, personajes));
    bs.forEach((b, n) => {
      const crudos: Crudo[] = [...revisarBloque(b.texto, lang), ...deEscena.filter((a) => a.bloque === n).map((a) => ({ from: a.from, to: a.to, regla: a.regla, cat: "narrativa" as const, msg: a.msg, sug: [], segura: false }))];
      for (const h of crudos.sort((x, y) => x.from - y.from)) {
        const x = hallazgo(scene.id, b.texto, n, h);
        if (!no.has(x.id)) out.push(x);
      }
    });
  }
  return out;
}

// Aplica de una vez las correcciones seguras (de atrás hacia delante; repite por si una destapa otra).
export function corregirSeguras(html: string, lang = "es"): { html: string; n: number } {
  let n = 0;
  for (let vuelta = 0; vuelta < 3; vuelta++) {
    const hs = revisarLibro({ id: "x", kind: "chapter", title: "", content: html, children: [] }, lang).filter((h) => h.segura && h.sug.length);
    if (!hs.length) break;
    let libre = Infinity, bloque = -1;
    for (const h of hs.sort((a, b) => b.bloque - a.bloque || b.from - a.from)) {
      if (h.bloque !== bloque) { bloque = h.bloque; libre = Infinity; }
      if (h.to > libre) continue;
      html = aplicar(html, h.bloque, h.from, h.to, h.sug[0]);
      libre = h.from;
      n++;
    }
  }
  return { html, n };
}

// ---------- Informe editorial ----------
export interface Capitulo { id: string; titulo: string; palabras: number; frase: number; ritmo: number; dialogo: number; porMil: Record<Categoria, number>; avisos: string[] }
export function informe(obra: Node, hallazgos: Hallazgo[]): Capitulo[] {
  const cuantas = (t: string) => (t.match(/[\p{L}\d]+/gu) ?? []).length;
  const caps = scenes(obra).map(({ scene, path }) => {
    const bs = bloques(scene.content).map((b) => b.texto);
    const largos = bs.flatMap((t) => t.split(/[.!?…]+/)).map(cuantas).filter(Boolean);
    const palabras = largos.reduce((s, x) => s + x, 0);
    const frase = largos.length ? palabras / largos.length : 0;
    const desv = largos.length ? Math.sqrt(largos.reduce((s, x) => s + (x - frase) ** 2, 0) / largos.length) : 0;
    const enDialogo = bs.filter((t) => /^\s*[—«"“-]/.test(t)).reduce((s, t) => s + cuantas(t), 0);
    const porMil = Object.fromEntries(categorias().map(([c]) => [c, palabras ? Math.round((hallazgos.filter((h) => h.nodo === scene.id && h.cat === c).length * 1000) / palabras) : 0])) as Record<Categoria, number>;
    return { id: scene.id, titulo: path ? `${path} › ${scene.title}` : scene.title, palabras, frase: Math.round(frase * 10) / 10, ritmo: frase ? Math.round((desv / frase) * 100) : 0, dialogo: palabras ? Math.round((enDialogo / palabras) * 100) : 0, porMil, avisos: [] as string[] };
  });
  const con = caps.filter((c) => c.palabras).map((c) => c.palabras).sort((a, b) => a - b);
  const mediana = con[Math.floor(con.length / 2)] ?? 0;
  for (const c of caps) {
    if (!c.palabras) { c.avisos.push(L("Vacío.", "Empty.")); continue; }
    if (con.length > 2 && c.palabras > mediana * 1.7) c.avisos.push(L(`Mucho más largo que el resto (mediana ${mediana}): ¿dividirlo o podarlo?`, `Much longer than the rest (median ${mediana}): split or trim?`));
    if (con.length > 2 && c.palabras < mediana * 0.4) c.avisos.push(L(`Mucho más corto que el resto (mediana ${mediana}): ¿le falta desarrollo?`, `Much shorter than the rest (median ${mediana}): underdeveloped?`));
    if (c.frase > 25) c.avisos.push(L("Frases muy largas de media: alterna con frases cortas.", "Long sentences on average: mix in short ones."));
    if (c.palabras > 200 && c.ritmo < 40) c.avisos.push(L("Ritmo monótono: las frases miden casi lo mismo.", "Flat rhythm: sentences are all about the same length."));
    if (c.palabras > 800 && c.dialogo < 5) c.avisos.push(L("Casi sin diálogo: ¿hay alguna escena que pueda mostrarse hablando?", "Hardly any dialogue: could a moment be shown through speech?"));
    if (c.dialogo > 75) c.avisos.push(L("Casi todo diálogo: asegura que se vea dónde están y qué hacen.", "Almost all dialogue: make sure we see where they are and what they do."));
    if (c.porMil.narrativa > 8) c.avisos.push(L("Se cuenta más de lo que se muestra.", "More telling than showing."));
    if (c.porMil.estilo > 40) c.avisos.push(L("Muchos problemas de estilo: dale una pasada línea a línea.", "Many style issues: give it a line edit."));
  }
  return caps;
}

// ---------- Plan de edición ----------
export interface Pasada { id: string; nombre: string; como: string; puntos: string[] }
export const pasadas = (): Pasada[] => (enIngles() ? PASADAS_EN : PASADAS);
export const PASADAS_EN: Pasada[] = [
  { id: "estructura", nombre: "1. Structure", como: "Read straight through without fixing sentences. Use Corkboard, Timeline and Plots.", puntos: ["The central conflict appears early", "Each act changes something for good", "No chapter could be cut without anyone noticing", "The climax answers the opening question", "No plot is left hanging"] },
  { id: "personajes", nombre: "2. Characters", como: "Go over the cards and the Character arcs.", puntos: ["Each protagonist wants something concrete", "Their decisions drive the story", "The arc shows in actions, not explanations", "Each voice is distinct in dialogue", "No contradictions in age, looks or past"] },
  { id: "escenas", nombre: "3. Scenes and pace", como: "Chapter by chapter, with the report at hand.", puntos: ["Each scene has a goal, a conflict and a change", "Start late, leave early", "Point of view does not jump within a scene", "Tension and breathing room alternate", "Each chapter ending pulls you on"] },
  { id: "linea", nombre: "4. Line by line", como: "Corrections: Style, Narrative and Repetitions. Use read aloud.", puntos: ["Filter verbs and told emotions reviewed", "Filler words and repetitions reviewed", "Needless adverbs and clichés removed", "Read aloud"] },
  { id: "correccion", nombre: "5. Copy-edit", como: "Corrections: Typography and Grammar, with spell check on.", puntos: ["Safe fixes applied", "Grammar reviewed", "Dialogue punctuated correctly", "No words underlined in red"] },
  { id: "pruebas", nombre: "6. Proofs", como: "Layout tab: read the PDF page by page.", puntos: ["Title page, copyright and contents are right", "No odd lines or nearly empty pages", "Margins suit the page count", "Printed proof reviewed"] },
];
export const PASADAS: Pasada[] = [
  { id: "estructura", nombre: "1. Estructura", como: "Lee de un tirón sin corregir frases. Usa Corcho, Línea y Tramas.", puntos: ["El conflicto central aparece pronto", "Cada acto cambia algo irreversible", "No hay capítulos que se puedan quitar sin que se note", "El clímax resuelve la pregunta del principio", "Ninguna trama queda abandonada"] },
  { id: "personajes", nombre: "2. Personajes", como: "Repasa las fichas y los Arcos de personaje.", puntos: ["Cada protagonista quiere algo concreto", "Sus decisiones mueven la historia", "El arco se ve en hechos, no en explicaciones", "Cada voz se distingue en el diálogo", "No hay contradicciones de edad, aspecto o pasado"] },
  { id: "escenas", nombre: "3. Escenas y ritmo", como: "Capítulo a capítulo, con el informe delante.", puntos: ["Cada escena tiene objetivo, conflicto y cambio", "Se entra tarde y se sale pronto", "El punto de vista no salta dentro de la escena", "Alternan tensión y respiro", "Cada final de capítulo invita a seguir"] },
  { id: "linea", nombre: "4. Línea a línea", como: "Correcciones: Estilo, Narrativa y Repeticiones. Usa la lectura en voz alta.", puntos: ["Revisados los verbos filtro y las emociones contadas", "Revisadas las muletillas y repeticiones", "Eliminados adverbios y frases hechas que no aportan", "Leído en voz alta"] },
  { id: "correccion", nombre: "5. Corrección ortotipográfica", como: "Correcciones: Ortotipografía y Gramática, con el corrector ortográfico activado.", puntos: ["Aplicadas las correcciones seguras", "Revisada la gramática", "Diálogos puntuados correctamente", "Sin palabras subrayadas en rojo"] },
  { id: "pruebas", nombre: "6. Pruebas de imprenta", como: "Pestaña Maquetar: lee el PDF página a página.", puntos: ["Portada, créditos e índice correctos", "Sin líneas raras ni páginas casi vacías", "Márgenes aptos para el número de páginas", "Prueba impresa revisada"] },
];
