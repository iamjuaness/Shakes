// Puro: reglas que miran algo más que una palabra. Español: concordancia, concordancia sujeto-verbo, tildes
// diacríticas, leísmo y laísmo. Inglés y otros idiomas: reglas editoriales propias.
// Son heurísticas (no analizan la frase entera): por eso casi ninguna se aplica en bloque.
export type Categoria = "orto" | "gramatica" | "estilo" | "narrativa" | "repeticion";
export interface Regla { id: string; cat: Categoria; re: RegExp; msg: string; fix?: (m: RegExpMatchArray) => string | string[] | undefined; segura?: boolean; vale?: (m: RegExpMatchArray) => boolean }

const w = (s: string, despues = "") => new RegExp(`(?<![\\p{L}])(?:${s})(?![\\p{L}])${despues}`, "giu");
const caso = (orig: string, r: string) => (/^\p{Lu}/u.test(orig) ? r[0].toUpperCase() + r.slice(1) : r);
// Cambia una palabra dentro del tramo conservando la mayúscula inicial.
const palabra = (m: RegExpMatchArray, de: string, a: string) => m[0].replace(new RegExp(`(?<![\\p{L}])${de}(?![\\p{L}])`, "iu"), (x) => caso(x, a));

// ---------- Concordancia determinante + nombre ----------
const DET: Record<string, "ms" | "fs" | "mp" | "fp"> = {
  el: "ms", un: "ms", este: "ms", ese: "ms", aquel: "ms", del: "ms", ningún: "ms", algún: "ms",
  una: "fs", esta: "fs", esa: "fs", aquella: "fs", ninguna: "fs", alguna: "fs",
  unos: "mp", estos: "mp", esos: "mp", aquellos: "mp", algunos: "mp", muchos: "mp",
  unas: "fp", estas: "fp", esas: "fp", aquellas: "fp", algunas: "fp", muchas: "fp",
};
// «la», «los», «las» también son pronombres («la miraba»): solo se miran tras una preposición.
const TRAS_PREP: Record<string, "fs" | "mp" | "fp"> = { la: "fs", los: "mp", las: "fp" };
const MASC_A = /^(?:d[ií]a|mediod[ií]a|mapa|problema|sistema|tema|idioma|planeta|poema|clima|programa|fantasma|drama|dilema|esquema|diploma|enigma|lema|aroma|carisma|crucigrama|diagrama|fonema|panorama|pijama|síntoma|teorema|trauma|tranv[ií]a|sof[aá]|pap[aá]|poeta|atleta|colega|camarada|centinela|profeta|monarca|patriota|idiota|nómada|vig[ií]a|espía|recluta|\p{L}*ista|\p{L}*crata|\p{L}*cida|\p{L}*arca)s?$/u;
const FEM_O = /^(?:mano|foto|moto|radio|libido|nao|seo|modelo|testigo|soprano|polio|disco)s?$/;
// femeninos que piden «el/un» por empezar con /a/ tónica
const A_TONICA = /^(?:agua|alma|águila|hacha|aula|área|arma|hada|hambre|ala|ancla|asma|alba|ama|ave|acta|haba|habla|aspa|arpa|asa|ascua|haya|ánima|ánfora|África|Asia)$/iu;
const NO_NOMBRE = new Set("como cuando donde para hasta contra mientras ahora nada poco poca cierto solo sólo luego pero sino tampoco entre cada fuera cerca apenas además todavía aquella bajo según muy tanto dentro encima debajo detrás medio media cuanto cuanta todo toda todos todas dos primero primera mismo misma yo ella ellos ellas nosotros vosotros usted otro otra mañana cura curas guía guías radio cometa policía guardia testigo modelo orden frente".split(" "));

function generoDe(n: string): "ms" | "fs" | "mp" | "fp" | null {
  if (/(?:ci[oó]n|si[oó]n|dad|tad|tud|umbre)$/.test(n)) return "fs";
  if (/(?:ciones|siones|dades|tades|tudes|umbres)$/.test(n)) return "fp";
  const plural = /[oa]s$/.test(n), vocal = n[n.length - (plural ? 2 : 1)];
  if (vocal !== "o" && vocal !== "a") return null;
  let f = vocal === "a";
  if (f ? MASC_A.test(n) : FEM_O.test(n)) { if (/(?:ista|crata|cida|testigo|modelo|guardia|gu[ií]a|polic[ií]a|colega|espía|idiota|atleta|poeta)s?$/.test(n)) return null; f = !f; }
  return `${f ? "f" : "m"}${plural ? "p" : "s"}` as "ms";
}
function concuerda(det: string, nombre: string): boolean {
  const g = DET[det] ?? TRAS_PREP[det], n = nombre.toLowerCase();
  if (nombre[0] !== n[0] || n.length < 3 || NO_NOMBRE.has(n) || /mente$/.test(n)) return true;
  if (g === "ms" && A_TONICA.test(n)) return true;
  const x = generoDe(n);
  return !x || x === g;
}

// ---------- Español ----------
const VERBO3 = "es|está|tiene|quiere|sabe|puede|dijo|estaba|era|fue|había|tenía|quería|sabía|podía";
const PLURAL: Record<string, string> = { es: "son", está: "están", era: "eran", estaba: "estaban", fue: "fueron", tiene: "tienen", tenía: "tenían", va: "van", dijo: "dijeron", hace: "hacen", quiere: "quieren", puede: "pueden", sabe: "saben", había: "habían" };
// verbos cuyo complemento es la persona (lo/la): con «le» es leísmo salvo que siga otro complemento
const TRANSITIVOS = "vi|vio|veía|miré|miró|miraba|llamé|llamó|llamaba|saludé|saludó|abracé|abrazó|besé|besó|conocí|conoció|encontré|encontró|maté|mató|invité|invitó|visité|visitó|reconocí|reconoció|detuvo|arrestó|empujó|amaba|quería|esperé|esperó|acompañó|acompañé|despertó";
const DE_DECIR = "dije|dijo|decía|pregunté|preguntó|conté|contó|respondió|respondí|contestó|escribió|regaló|prometió";

export const ES: Regla[] = [
  { id: "concordancia", cat: "gramatica", re: new RegExp(`(?<![\\p{L}])(${Object.keys(DET).join("|")})\\s+(\\p{L}+)`, "giu"), msg: "Posible falta de concordancia de género o número entre el determinante y el nombre.", vale: (m) => !concuerda(m[1].toLowerCase(), m[2]) },
  { id: "concordancia-prep", cat: "gramatica", re: new RegExp(`(?<=(?<![\\p{L}])(?:de|en|con|por|para|sobre|desde|hasta)\\s)(la|los|las)\\s+(\\p{L}+)`, "giu"), msg: "Posible falta de concordancia de género o número entre el artículo y el nombre.", vale: (m) => !concuerda(m[1].toLowerCase(), m[2]) },
  { id: "sujeto-verbo", cat: "gramatica", re: w(`(ellos|ellas|ustedes)\\s+(?:no\\s+|ya\\s+|se\\s+)?(${Object.keys(PLURAL).join("|")})`), msg: "El sujeto es plural y el verbo singular.", fix: (m) => m[0].replace(new RegExp(`${m[2]}$`, "i"), PLURAL[m[2].toLowerCase()]) },
  { id: "tu-tilde", cat: "orto", re: w("tu", "(?=\\s+(?:no\\s+)?(?:eres|tienes|estás|quieres|sabes|puedes|vas|has|dices|haces|ves|crees|vienes|sigues)(?![\\p{L}]))"), msg: "Pronombre «tú» con tilde.", fix: (m) => caso(m[0], "tú"), segura: true },
  { id: "el-tilde", cat: "orto", re: w("el", `(?=\\s+(?:no\\s+|ya\\s+|se\\s+)?(?:${VERBO3})(?![\\p{L}]))`), msg: "Pronombre «él» con tilde.", fix: (m) => caso(m[0], "él") },
  { id: "mi-tilde", cat: "orto", re: w("(?:a|para|de|por|sin|sobre|contra|hacia) mi", "(?=\\s*(?:[.,;:!?…»]|$))"), msg: "Pronombre «mí» con tilde.", fix: (m) => m[0] .replace(/mi$/i, "mí"), segura: true },
  { id: "se-tilde", cat: "orto", re: w("(?:no|yo) (?:lo )?se", "(?=\\s*(?:[.,;:!?…»]|$)|\\s+(?:que|si|qué|cómo|dónde|cuándo|quién)(?![\\p{L}]))"), msg: "Del verbo saber: «sé».", fix: (m) => m[0].replace(/se$/i, "sé") },
  { id: "de-tilde", cat: "orto", re: w("que (?:me|te|le|nos|les) de", "(?=\\s+(?:un|una|el|la|algo|más|otra|otro)(?![\\p{L}]))"), msg: "Del verbo dar: «dé».", fix: (m) => m[0].replace(/de$/i, "dé") },
  { id: "si-tilde", cat: "orto", re: w("(?:claro que|que|porque) si", "(?=\\s*(?:[.,;:!…»]|$))"), msg: "Afirmación: «sí».", fix: (m) => m[0].replace(/si$/i, "sí") },
  { id: "te-tilde", cat: "orto", re: w("(?:taza|vaso|bolsa) de te"), msg: "La infusión es «té».", fix: (m) => m[0].replace(/te$/i, "té"), segura: true },
  { id: "esta-tilde", cat: "orto", re: w("esta", "(?=\\s+(?:muy|aquí|allí|ahí|bien|mal|en casa)(?![\\p{L}]))"), msg: "Del verbo estar: «está».", fix: (m) => caso(m[0], "está") },
  { id: "interrogativo", cat: "orto", re: /(?<=[¿¡])(que|como|donde|cuando|quien|cual|cuanto|cuanta|cuantos|cuantas)(?![\p{L}])/giu, msg: "En preguntas y exclamaciones lleva tilde.", fix: (m) => m[0].replace(/o(?=n|$)|[ea]/i, (v) => "óéá"["oea".indexOf(v.toLowerCase())] ?? v) },
  { id: "monosilabo", cat: "orto", re: w("fué|fuí|dió|dí|vió|ví|tí"), msg: "Los monosílabos no llevan tilde.", fix: (m) => m[0].replace(/[íóé]/i, (v) => ({ í: "i", ó: "o", é: "e" })[v.toLowerCase()]!), segura: true },
  { id: "mas-tilde", cat: "orto", re: w("mas"), msg: "Cantidad: «más». Sin tilde solo significa «pero».", fix: (m) => caso(m[0], "más") },
  { id: "leismo", cat: "gramatica", re: w(`(les?) (?:${TRANSITIVOS})`, "(?!\\s+(?:el|la|los|las|un|una|unos|unas|su|sus|que|algo|si)(?![\\p{L}]))"), msg: "Posible leísmo: con este verbo la persona es complemento directo (lo, la).", fix: (m) => (m[1].toLowerCase() === "le" ? ["lo", "la"] : ["los", "las"]).map((p) => palabra(m, m[1], p)) },
  { id: "laismo", cat: "gramatica", re: w(`(las?) (?:${DE_DECIR})`, "(?=\\s+(?:que|el|la|los|las|un|una|si|algo)(?![\\p{L}]))"), msg: "Posible laísmo: a quien se le dice algo es «le».", fix: (m) => palabra(m, m[1], m[1].toLowerCase() === "la" ? "le" : "les") },
];

// ---------- Inglés ----------
const comun = (idioma: "en" | "otro"): Regla[] => {
  const en = idioma === "en";
  return [
    { id: "espacios", cat: "orto", re: /(?<=\S)[ \t]{2,}(?=\S)/g, msg: en ? "Double space." : "Double space.", fix: () => " ", segura: true },
    { id: "suspensivos", cat: "orto", re: /(?<!\.)\.{3}(?!\.)/g, msg: "Use the ellipsis character (…).", fix: () => "…", segura: true },
    { id: "puntuacion-repetida", cat: "orto", re: /,{2,}|;{2,}|\?{3,}|!{3,}|(?<!\.)\.\.(?!\.)/g, msg: "Repeated punctuation." },
    { id: "palabra-doble", cat: "gramatica", re: /(?<![\p{L}])(\p{L}{2,})\s+\1(?![\p{L}])/giu, msg: "Repeated word.", fix: (m) => m[1] },
  ];
};
const ING: Regla[] = [
  { id: "en-espacio-signo", cat: "orto", re: /(?<=[\p{L}\d])[ \t]+(?=[,;:.!?](?![.\p{L}\d]))/gu, msg: "No space before punctuation.", fix: () => "", segura: true },
  { id: "en-falta-espacio", cat: "orto", re: /(?<=\p{L})([,;])(?=\p{L})/gu, msg: "Missing space after punctuation.", fix: (m) => `${m[1]} `, segura: true },
  { id: "en-comillas", cat: "orto", re: /"([^"\n]+)"/g, msg: "Use curly quotes.", fix: (m) => `“${m[1]}”`, segura: true },
  { id: "en-raya", cat: "orto", re: /(?<=\p{L})(?: - |--)(?=\p{L})/gu, msg: "Use an em dash.", fix: () => "—" },
  { id: "en-of", cat: "gramatica", re: w("(could|should|would|must|might) of"), msg: "Write “have”, not “of”.", fix: (m) => `${m[1]} have` },
  { id: "en-its", cat: "gramatica", re: w("its", "(?=\\s+(?:a|an|the|not|been|going|just|so|too)(?![\\p{L}]))"), msg: "“It is” is written “it's”.", fix: (m) => caso(m[0], "it's") },
  { id: "en-your", cat: "gramatica", re: w("your", "(?=\\s+(?:welcome|going|a|an|the|not)(?![\\p{L}]))"), msg: "“You are” is written “you're”.", fix: (m) => caso(m[0], "you're") },
  { id: "en-than", cat: "gramatica", re: w("(?:more|less|better|worse|bigger|smaller|older|younger|rather) then"), msg: "Comparisons take “than”.", fix: (m) => m[0].replace(/then$/i, "than") },
  { id: "en-an", cat: "gramatica", re: w("a", "(?=\\s+(?!uni|use|usu|one|once|eu|ew)[aeiou]\\p{L}+)"), msg: "Use “an” before a vowel sound.", fix: (m) => caso(m[0], "an"), vale: (m) => m[0] === "a" || m.index === 0 || /[.!?]\s*$/.test(m.input!.slice(0, m.index)) },
  { id: "en-alot", cat: "gramatica", re: w("alot"), msg: "Two words: “a lot”.", fix: (m) => caso(m[0], "a lot"), segura: true },
  { id: "en-adverbio", cat: "estilo", re: /(?<![\p{L}])(?!only|early|family|reply|supply|apply|holy|ugly|lovely|lonely|friendly|belly|jelly|ally|fly|July|Italy)\p{L}{3,}ly(?![\p{L}])/giu, msg: "-ly adverb: would a stronger verb do?" },
  { id: "en-flojas", cat: "estilo", re: w("very|really|just|quite|rather|somehow|somewhat|basically|actually"), msg: "Filler word: try the sentence without it." },
  { id: "en-pasiva", cat: "estilo", re: w("(?:am|is|are|was|were|be|been|being) (?:\\p{L}+ed|known|seen|done|made|given|taken|found|written|told|held|left|put|built|born)"), msg: "Passive voice: who does the action?" },
  { id: "en-cliche", cat: "estilo", re: w("at the end of the day|cold as ice|white as a sheet|in the nick of time|heart skipped a beat|chill (?:ran )?down (?:her|his|my) spine|avoid like the plague|a deafening silence|time stood still|needle in a haystack"), msg: "Cliché: find your own image." },
  { id: "en-filtro", cat: "narrativa", re: w("(?:saw|heard|felt|noticed|realized|realised|watched|wondered|decided) (?:that|the|a|an|how)"), msg: "Filter verb: show what the character perceives." },
  { id: "en-emocion", cat: "narrativa", re: w("(?:was|were|felt|seemed|looked) (?:very )?(?:angry|sad|happy|nervous|scared|afraid|excited|worried|upset|furious|anxious|relieved)"), msg: "Told emotion: show it with an action or a line." },
  { id: "en-empezo", cat: "narrativa", re: w("(?:started|began|starts|begins) to \\p{L}+"), msg: "“Began to” is usually unnecessary." },
  { id: "en-acotacion", cat: "narrativa", re: w("(?:he|she|they|I) (?:exclaimed|opined|retorted|chortled|ejaculated|queried|proclaimed|interjected)"), msg: "Showy dialogue tag: “said” or an action disappears better." },
  { id: "en-acotacion-adverbio", cat: "narrativa", re: w("(?:said|asked|replied) \\p{L}+ly"), msg: "Adverb on a dialogue tag: let the words carry the tone." },
];
export const EN: Regla[] = [...comun("en"), ...ING];
// Otros idiomas: solo lo que vale en cualquiera (el francés sí lleva espacio ante ; : ! ?).
export const otros = (lang: string): Regla[] => [...comun("otro"), ...(/^fr/i.test(lang) ? [] : [{ id: "espacio-signo", cat: "orto" as const, re: /(?<=[\p{L}\d])[ \t]+(?=[,;:.!?](?![.\p{L}\d]))/gu, msg: "Space before punctuation.", fix: () => "", segura: true }])];

// Repeticiones cercanas para idiomas sin lista propia: palabras largas repetidas en pocas palabras.
const VACIAS = new Set("about after again because before between could every other should their there these thing think through under where which while would".split(" "));
export function repetidas(texto: string, largo = 6, ventana = 20): { from: number; to: number; palabra: string; distancia: number }[] {
  const out: ReturnType<typeof repetidas> = [], visto = new Map<string, number>();
  let i = 0;
  for (const m of texto.matchAll(/\p{L}+/gu)) {
    const p = m[0].toLowerCase();
    i++;
    if (p.length < largo || VACIAS.has(p) || m[0][0] !== p[0]) continue;
    const antes = visto.get(p);
    if (antes !== undefined && i - antes <= ventana) out.push({ from: m.index!, to: m.index! + m[0].length, palabra: p, distancia: i - antes });
    visto.set(p, i);
  }
  return out;
}
