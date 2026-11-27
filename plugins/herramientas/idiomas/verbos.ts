// Puro: de una forma verbal española o inglesa a su infinitivo, tiempo y persona.
import type { Rasgo } from "./logica.ts";

export interface Forma { lema: string; tiempo?: Rasgo; personas: Rasgo[] }
type EsVerbo = (lema: string) => boolean;

const P: Rasgo[] = ["1s", "2s", "3s", "1p", "2p", "3p"];
const lista = (s: string) => s.split(" ");
// terminaciones por persona: [-ar, -er, -ir]
const TIEMPOS: [Rasgo | undefined, string, string, string][] = [
  [undefined, "o as a amos áis an", "o es e emos éis en", "o es e imos ís en"], // presente
  ["pasado", "é aste ó amos asteis aron", "í iste ió imos isteis ieron", "í iste ió imos isteis ieron"],
  ["imperfecto", "aba abas aba ábamos abais aban", "ía ías ía íamos íais ían", "ía ías ía íamos íais ían"],
  ["subjuntivo", "e es e emos éis en", "a as a amos áis an", "a as a amos áis an"],
];
const FUTURO = lista("é ás á emos éis án"), CONDICIONAL = lista("ía ías ía íamos íais ían");

// formas irregulares de los verbos más usados
const IRREGULARES = new Map<string, Forma>();
const alta = (forma: string, lema: string, tiempo: Rasgo | undefined, persona: Rasgo) => {
  const y = IRREGULARES.get(forma);
  if (!y) IRREGULARES.set(forma, { lema, tiempo, personas: [persona] });
  else if (y.lema === lema && y.tiempo === tiempo) y.personas.push(persona);
};
const tabla = (lema: string, tiempo: Rasgo | undefined, formas: string) => lista(formas).forEach((f, k) => alta(f, lema, tiempo, P[k]));
tabla("ser", undefined, "soy eres es somos sois son"); tabla("ser", "pasado", "fui fuiste fue fuimos fuisteis fueron"); tabla("ser", "imperfecto", "era eras era éramos erais eran"); tabla("ser", "subjuntivo", "sea seas sea seamos seáis sean");
tabla("estar", undefined, "estoy estás está estamos estáis están"); tabla("estar", "subjuntivo", "esté estés esté estemos estéis estén");
tabla("ir", undefined, "voy vas va vamos vais van"); tabla("ir", "imperfecto", "iba ibas iba íbamos ibais iban"); tabla("ir", "subjuntivo", "vaya vayas vaya vayamos vayáis vayan");
tabla("haber", undefined, "he has ha hemos habéis han"); tabla("haber", "subjuntivo", "haya hayas haya hayamos hayáis hayan"); alta("hay", "haber", undefined, "3s");
tabla("ver", undefined, "veo ves ve vemos veis ven"); tabla("ver", "pasado", "vi viste vio vimos visteis vieron"); tabla("ver", "imperfecto", "veía veías veía veíamos veíais veían");
tabla("dar", undefined, "doy das da damos dais dan"); tabla("dar", "pasado", "di diste dio dimos disteis dieron");
tabla("oír", undefined, "oigo oyes oye oímos oís oyen");
tabla("tener", undefined, "tengo tienes tiene tenemos tenéis tienen"); tabla("venir", undefined, "vengo vienes viene venimos venís vienen");
tabla("poder", undefined, "puedo puedes puede podemos podéis pueden"); tabla("querer", undefined, "quiero quieres quiere queremos queréis quieren"); tabla("decir", undefined, "digo dices dice decimos decís dicen");
for (const [l, r] of Object.entries({ tener: "teng", hacer: "hag", decir: "dig", venir: "veng", poner: "pong", salir: "salg", traer: "traig", caer: "caig", oír: "oig" })) tabla(l, "subjuntivo", `${r}a ${r}as ${r}a ${r}amos ${r}áis ${r}an`);
for (const [l, yo] of Object.entries({ hacer: "hago", poner: "pongo", salir: "salgo", traer: "traigo", caer: "caigo", saber: "sé" })) alta(yo, l, undefined, "1s");
for (const [l, raiz] of Object.entries({ tener: "tuv", hacer: "hic", decir: "dij", poder: "pud", querer: "quis", venir: "vin", saber: "sup", poner: "pus", estar: "estuv", traer: "traj", haber: "hub", andar: "anduv" })) {
  tabla(l, "pasado", `${raiz}e ${raiz}iste ${raiz === "hic" ? "hizo" : `${raiz}o`} ${raiz}imos ${raiz}isteis ${raiz}${raiz.endsWith("j") ? "eron" : "ieron"}`);
}
for (const [l, raiz] of Object.entries({ tener: "tendr", hacer: "har", decir: "dir", poder: "podr", querer: "querr", venir: "vendr", saber: "sabr", poner: "pondr", salir: "saldr", haber: "habr", valer: "valdr" })) {
  FUTURO.forEach((e, k) => alta(raiz + e, l, "futuro", P[k]));
  CONDICIONAL.forEach((e, k) => alta(raiz + e, l, "condicional", P[k]));
}

// infinitivos con formas irregulares: son verbos aunque el diccionario no les ponga reglas
export const IRREGULARES_ES = new Set([...IRREGULARES.values()].map((f) => f.lema));

// raíces con cambio de vocal («cuenta» de contar, «pide» de pedir) y «conozco»
function raices(r: string): string[] {
  const cambia = (de: string, a: string) => { const k = r.lastIndexOf(de); return k < 0 ? [] : [r.slice(0, k) + a + r.slice(k + de.length)]; };
  return [r, ...cambia("ue", "o"), ...cambia("ue", "u"), ...cambia("ie", "e"), ...cambia("ie", "i"), ...cambia("i", "e"), ...cambia("u", "o"), ...(r.endsWith("zc") ? [`${r.slice(0, -2)}c`] : []), ...(r.endsWith("qu") ? [`${r.slice(0, -2)}c`] : []), ...(r.endsWith("gu") ? [`${r.slice(0, -2)}g`] : []), ...(r.endsWith("c") ? [`${r.slice(0, -1)}z`] : [])];
}

export function verboEs(w: string, es: EsVerbo): Forma | null {
  if (/(ar|er|ir|ír)$/.test(w) && es(w)) return { lema: w, personas: [] };
  const irr = IRREGULARES.get(w);
  if (irr) return { ...irr, personas: [...irr.personas] };
  const personas = (l: string[], e: string) => l.flatMap((x, k) => (x === e ? [P[k]] : []));
  for (const [tiempo, finales] of [["futuro", FUTURO], ["condicional", CONDICIONAL]] as const) {
    for (const e of finales) if (w.endsWith(e) && /[aei]r$/.test(w.slice(0, -e.length)) && es(w.slice(0, -e.length))) return { lema: w.slice(0, -e.length), tiempo, personas: personas(finales, e) };
  }
  const otras: [RegExp, Rasgo, string[]][] = [[/ando$/, "gerundio", ["ar"]], [/(iendo|yendo)$/, "gerundio", ["er", "ir"]], [/ad[oa]s?$/, "participio", ["ar"]], [/id[oa]s?$/, "participio", ["er", "ir"]]];
  for (const [re, tiempo, clases] of otras) {
    if (!re.test(w)) continue;
    for (const r of raices(w.replace(re, ""))) for (const c of clases) if (es(r + c)) return { lema: r + c, tiempo, personas: [] };
  }
  for (const [tiempo, ...porClase] of TIEMPOS) {
    for (let c = 0; c < 3; c++) {
      const finales = lista(porClase[c]);
      // la terminación más larga primero («cantamos» antes que «cantamo» + s)
      for (const e of [...new Set(finales)].sort((a, b) => b.length - a.length)) {
        if (!w.endsWith(e) || w.length <= e.length) continue;
        for (const r of raices(w.slice(0, -e.length))) { const lema = r + ["ar", "er", "ir"][c]; if (es(lema)) return { lema, tiempo, personas: personas(finales, e) }; }
      }
    }
  }
  return null;
}

// «infinitivo pasado participio»
const IRREG_EN = "be was,were been|have had had|do did done|say said said|go went gone|get got gotten|make made made|know knew known|think thought thought|take took taken|see saw seen|come came come|give gave given|find found found|tell told told|become became become|leave left left|feel felt felt|bring brought brought|begin began begun|keep kept kept|hold held held|write wrote written|stand stood stood|hear heard heard|let let let|mean meant meant|meet met met|run ran run|pay paid paid|sit sat sat|speak spoke spoken|lie lay lain|lead led led|read read read|grow grew grown|lose lost lost|fall fell fallen|send sent sent|build built built|understand understood understood|draw drew drawn|break broke broken|spend spent spent|cut cut cut|rise rose risen|drive drove driven|buy bought bought|wear wore worn|choose chose chosen|eat ate eaten|drink drank drunk|sleep slept slept|die died died|fight fought fought|kill killed killed|win won won|sing sang sung|swim swam swum|fly flew flown|forget forgot forgotten";
export const IRREGULARES_EN = new Set(IRREG_EN.split("|").map((l) => l.split(" ")[0]));
const INGLES = new Map<string, Forma>();
for (const l of IRREG_EN.split("|")) {
  const [lema, pasado, part] = l.split(" ");
  if (part !== lema) INGLES.set(part, { lema, tiempo: "participio", personas: [] });
  for (const f of pasado.split(",")) if (f !== lema) INGLES.set(f, { lema, tiempo: "pasado", personas: [] });
}
for (const f of ["am", "is", "are"]) INGLES.set(f, { lema: "be", personas: f === "am" ? ["1s"] : f === "is" ? ["3s"] : [] });
INGLES.set("has", { lema: "have", personas: ["3s"] }); INGLES.set("does", { lema: "do", personas: ["3s"] });

export function verboEn(w: string, es: EsVerbo): Forma | null {
  const irr = INGLES.get(w);
  if (irr) return { ...irr, personas: [...irr.personas] };
  const bases = (r: string) => [r, `${r}e`, ...(/(.)\1$/.test(r) ? [r.slice(0, -1)] : []), ...(r.endsWith("i") ? [`${r.slice(0, -1)}y`] : [])];
  for (const [fin, tiempo] of [["ed", "pasado"], ["ing", "gerundio"]] as const) {
    if (!w.endsWith(fin)) continue;
    const lema = bases(w.slice(0, -fin.length)).find((b) => b.length > 1 && es(b));
    if (lema) return { lema, tiempo, personas: [] };
  }
  const s = w.endsWith("ies") ? [`${w.slice(0, -3)}y`] : w.endsWith("es") ? [w.slice(0, -1), w.slice(0, -2)] : w.endsWith("s") ? [w.slice(0, -1)] : [];
  const lema = s.find(es);
  if (lema) return { lema, personas: ["3s"] };
  return es(w) ? { lema: w, personas: [] } : null;
}
