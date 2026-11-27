import { useEffect, useMemo, useState } from "react";
import { confirmAsk } from "../../../src/dialog";
import { diccionario } from "../../../src/spell";
import { Cabecera, Campo, Lista } from "../_comun/formulario";
import { guardar as guardarArchivo } from "../_comun/guardar";
import type { ToolHost, ToolPlugin } from "../types";
import { type Base, leerBase } from "./base";
import { Escrito, Escritura } from "./escritura";
import { CLASES, type Clase, type Idioma, PRESETS, type Palabra, RASGOS, type Rasgo, cambiar, completarGramatica, dialectoAlAzar, flexiones, generar, glifo, lexicoCompleto, nuevoIdioma, palabraDe, sentidos, sonidos } from "./logica";
import { GRAMATICALES, claseDe, conGramatica, traducir } from "./traductor";

const EN_CLASE: Record<Clase, string> = { sustantivo: "noun", verbo: "verb", adjetivo: "adjective", pronombre: "pronoun", "partícula": "particle", otro: "other" };
const NOMBRE_RASGO: Record<Rasgo, [string, string]> = {
  plural: ["plural", "plural"], pasado: ["pasado", "past"], imperfecto: ["imperfecto", "imperfect"], futuro: ["futuro", "future"], condicional: ["condicional", "conditional"], subjuntivo: ["subjuntivo", "subjunctive"], gerundio: ["gerundio", "gerund"], participio: ["participio", "participle"],
  "1s": ["yo", "I"], "2s": ["tú", "you"], "3s": ["él/ella", "he/she"], "1p": ["nosotros", "we"], "2p": ["vosotros", "you all"], "3p": ["ellos", "they"],
};
const SECCIONES = ["sonidos", "diccionario", "gramatica", "traductor", "escritura", "dialectos", "cultura"] as const;
type Seccion = (typeof SECCIONES)[number];
const VISIBLES = 100;

// El diccionario del idioma del libro (el mismo del corrector); se lee una vez por idioma.
const bases = new Map<string, Promise<Base>>();
function useBase(lang: string) {
  const [estado, setEstado] = useState<{ lang: string; base?: Base; error?: boolean }>({ lang });
  useEffect(() => {
    let vivo = true;
    let p = bases.get(lang);
    if (!p) { p = diccionario(lang).then(([aff, dic]) => leerBase(aff, dic, lang)); p.catch(() => bases.delete(lang)); bases.set(lang, p); }
    setEstado({ lang });
    p.then((base) => vivo && setEstado({ lang, base }), () => vivo && setEstado({ lang, error: true }));
    return () => { vivo = false; };
  }, [lang]);
  return estado.lang === lang ? estado : ({ lang } as typeof estado);
}

function Panel({ host }: { host: ToolHost }) {
  const es = host.lang === "es";
  const L = (a: string, b: string) => (es ? a : b);
  const [sel, setSel] = useState("");
  const [seccion, setSeccion] = useState<Seccion>("sonidos");
  const [muestra, setMuestra] = useState<string[]>([]);
  const [filtro, setFiltro] = useState("");
  const [todo, setTodo] = useState(true);
  const [frase, setFrase] = useState("");
  const [dialecto, setDialecto] = useState("");
  const [ver, setVer] = useState("");
  const { base, error } = useBase(host.bookLang);
  const idiomas: Idioma[] = host.project.ext?.idiomas ?? [];
  const i = idiomas.find((x) => x.id === sel) ?? idiomas[0];
  const guardar = (l: Idioma[]) => host.setProject((p) => ({ ...p, ext: { ...p.ext, idiomas: l } }));
  const poner = (patch: Partial<Idioma>) => guardar(idiomas.map((x) => (x.id === i!.id ? { ...x, ...patch } : x)));
  const nombres = Object.fromEntries(RASGOS.map((r) => [r, NOMBRE_RASGO[r][es ? 0 : 1]])) as Record<Rasgo, string>;
  // gramática y letras que falten
  const completar = (x: Idioma): Idioma => ({ ...x, afijos: completarGramatica(x, nombres, () => crypto.randomUUID()), glifos: Object.fromEntries(sonidos(x).map((s) => [s, x.glifos?.[s] || glifo(x, s)])) });
  const idiomaBase = (() => { try { return new Intl.DisplayNames([host.lang], { type: "language" }).of(host.bookLang) ?? host.bookLang; } catch { return host.bookLang; } })();

  // El diccionario completo solo se calcula donde se usa: son decenas de miles de palabras.
  const firma = i ? JSON.stringify([i.id, i.semilla, i.consonantes, i.vocales, i.silabas, i.prohibidas, i.minimo, i.maximo, i.lexico.map((p) => [p.palabra, p.significado])]) : "";
  const usaLexico = seccion === "diccionario" || seccion === "traductor";
  const lexico = useMemo(() => (i && base && usaLexico ? lexicoCompleto(i, base.lemas, GRAMATICALES) : new Map<string, string>()), [firma, base, usaLexico]); // eslint-disable-line react-hooks/exhaustive-deps

  const clases = CLASES.map((c): [string, string] => [c, es ? c : EN_CLASE[c]]);
  const titulos: Record<Seccion, string> = { sonidos: L("Sonidos", "Sounds"), diccionario: L("Diccionario", "Dictionary"), gramatica: L("Gramática", "Grammar"), traductor: L("Traductor", "Translator"), escritura: L("Letras", "Letters"), dialectos: L("Dialectos", "Dialects"), cultura: L("Cultura", "Culture") };

  const cabecera = (
    <Cabecera items={idiomas} actual={i} onSelect={(id) => { setSel(id); setMuestra([]); setVer(""); setDialecto(""); }} onChange={guardar} crear={(id, n) => completar(nuevoIdioma(id, n))}
      textos={{ nuevo: L("+ Idioma", "+ Language"), pedir: L("Nombre del idioma", "Language name"), borrar: L("Borrar idioma", "Delete language"), nombre: L("Nombre del idioma", "Language name"), confirmar: (n) => L(`¿Borrar el idioma «${n}» con todas sus palabras y letras?`, `Delete the language “${n}” with all its words and letters?`) }} />
  );
  if (!i) return <div className="panel relato">{cabecera}<p className="empty">{L(`Crea un idioma completo a partir del idioma de tu libro (${idiomaBase}): sonidos, diccionario entero, gramática, letras, traductor y dialectos.`, `Create a complete language based on your book's language (${idiomaBase}): sounds, full dictionary, grammar, letters, translator and dialects.`)}</p></div>;

  const incompleto = RASGOS.some((r) => !i.afijos.some((a) => a.rasgo === r || (r === "plural" && /plural/i.test(a.nombre)))) || sonidos(i).some((s) => !i.glifos?.[s]);
  const anadir = (p: Palabra[]) => poner({ lexico: [...i.lexico, ...p] });
  const mias = i.lexico.filter((p) => !filtro || `${p.palabra} ${p.significado}`.toLowerCase().includes(filtro.toLowerCase()));
  const fijadas = new Set(i.lexico.flatMap(sentidos));
  const coincidencias: string[] = [];
  let total = 0;
  if (seccion === "diccionario" && todo) {
    const q = filtro.trim().toLowerCase();
    // primero la palabra exacta, luego las que contienen la búsqueda
    const exacta = lexico.has(q);
    if (exacta) coincidencias.push(q);
    for (const [lema, w] of lexico) {
      if (q && !(lema.includes(q) || w.includes(q))) continue;
      total++;
      if (coincidencias.length < VISIBLES && !(exacta && lema === q)) coincidencias.push(lema);
    }
  }
  const verLema = ver.trim().toLowerCase();
  const verPalabra = verLema ? i.lexico.find((p) => sentidos(p).includes(verLema))?.palabra ?? palabraDe(i, verLema, GRAMATICALES.has(verLema)) : "";
  const verClase: Clase = verLema && base ? claseDe(base, host.bookLang, verLema) : "sustantivo";
  const reglas = i.dialectos?.find((d) => d.id === dialecto)?.reglas;
  const t = seccion === "traductor" && frase.trim() ? traducir(i, frase, { lang: host.bookLang, base: base ?? null, lexico, nombres: new Set(host.cards.flatMap((c) => c.name.toLowerCase().split(/\s+/))), dialecto: reglas }) : null;
  const ejemplos = seccion === "dialectos" ? [...i.lexico.map((p) => p.palabra), ...["agua", "fuego", "noche", "madre", "camino", "espada", "corazón", "montaña", "estrella", "palabra"].map((l) => palabraDe(i, l))].filter(Boolean).slice(0, 12) : [];

  return (
    <div className="panel relato">
      {cabecera}
      <div className="row">
        <span className="muted">{L("Idioma base: ", "Base language: ")}{idiomaBase}{base ? L(` · ${base.lemas.length.toLocaleString()} palabras`, ` · ${base.lemas.length.toLocaleString()} words`) : error ? L(" · no se pudo cargar su diccionario (¿sin conexión?)", " · its dictionary could not be loaded (offline?)") : L(" · cargando diccionario…", " · loading dictionary…")}</span>
        <span className="spacer" />
        {incompleto && <button onClick={() => poner(completar(i))}>{L("Completar gramática y letras", "Complete grammar and letters")}</button>}
        <button onClick={async () => { if (await confirmAsk(L("¿Crear otras palabras, afijos y letras para este idioma? Tus palabras fijadas se conservan.", "Create new words, affixes and letters for this language? Your pinned words stay."))) poner(completar({ ...i, semilla: (i.semilla ?? 0) + 1, afijos: i.afijos.filter((a) => !a.rasgo), glifos: undefined })); }}>{L("Regenerar idioma", "Regenerate language")}</button>
      </div>
      <div className="row seg" role="tablist">
        {SECCIONES.map((s) => <button key={s} role="tab" aria-selected={s === seccion} className={s === seccion ? "on" : ""} onClick={() => { setSeccion(s); setFiltro(""); }}>{titulos[s]}</button>)}
      </div>

      {seccion === "sonidos" && (
        <>
          <div className="row">
            <span className="muted">{L("Partir de un estilo:", "Start from a style:")}</span>
            {Object.entries(PRESETS).map(([n, p]) => <button key={n} onClick={async () => { if (await confirmAsk(L(`¿Sustituir los sonidos por el estilo «${n}»? Cambian las palabras generadas; las fijadas se conservan.`, `Replace the sounds with the “${n}” style? Generated words change; pinned ones stay.`))) poner(p); }}>{n}</button>)}
          </div>
          <div className="columnas">
            <Campo label={L("Consonantes (separadas por espacios; las primeras salen más)", "Consonants (space separated; first ones are more frequent)")} value={i.consonantes} onChange={(v) => poner({ consonantes: v })} />
            <Campo label={L("Vocales", "Vowels")} value={i.vocales} onChange={(v) => poner({ vocales: v })} />
            <Campo label={L("Sílabas: C consonante, V vocal, (opcional)", "Syllables: C consonant, V vowel, (optional)")} value={i.silabas} onChange={(v) => poner({ silabas: v })} placeholder="CV CVC (C)V" />
            <Campo label={L("Combinaciones prohibidas", "Forbidden combinations")} value={i.prohibidas} onChange={(v) => poner({ prohibidas: v })} />
            <label className="campo">{L("Sílabas por palabra (mínimo y máximo)", "Syllables per word (min and max)")}
              <span className="row">{(["minimo", "maximo"] as const).map((k) => <input key={k} type="number" min={1} max={6} aria-label={k} value={i[k]} onChange={(e) => poner({ [k]: Math.min(6, Math.max(1, Number(e.target.value) || 1)) })} />)}</span>
            </label>
            <Campo label={L("Pronunciación y acento", "Pronunciation and stress")} value={i.pronunciacion} onChange={(v) => poner({ pronunciacion: v })} placeholder={L("ā = a larga; acento en la penúltima sílaba…", "ā = long a; stress on the second to last syllable…")} />
          </div>
          <p className="muted">{L("El diccionario sale de estos sonidos: si los cambias, cambian las palabras que no hayas fijado.", "The dictionary comes from these sounds: changing them changes every word you have not pinned.")}</p>
          <div className="row"><button onClick={() => setMuestra(Array.from({ length: 24 }, () => generar(i)).filter(Boolean))}>{L("Probar sonidos: generar palabras", "Test sounds: generate words")}</button></div>
          {muestra.length > 0 && <div className="chips">{muestra.map((w, k) => <span key={w + k} className="chip">{w}</span>)}</div>}
          {!generar(i, () => 0.5, new Set()) && <ul className="avisos"><li>{L("Hacen falta al menos una vocal y un patrón de sílaba válidos.", "You need at least one vowel and one valid syllable pattern.")}</li></ul>}
        </>
      )}

      {seccion === "diccionario" && (
        <>
          <div className="row">
            <button className={todo ? "on" : ""} aria-pressed={todo} onClick={() => setTodo(true)}>{L("Diccionario completo", "Full dictionary")} ({lexico.size.toLocaleString()})</button>
            <button className={!todo ? "on" : ""} aria-pressed={!todo} onClick={() => setTodo(false)}>{L("Mis palabras", "My words")} ({i.lexico.length})</button>
            <input aria-label={L("Buscar", "Search")} placeholder={L("Buscar en los dos idiomas…", "Search either language…")} value={filtro} onChange={(e) => setFiltro(e.target.value)} />
            <button disabled={!lexico.size} onClick={() => guardarArchivo(`${i.nombre}.md`, `# ${i.nombre}\n\n` + [...lexico].sort((a, b) => a[0].localeCompare(b[0])).map(([l, w]) => `- ${l}: **${w}**`).join("\n") + "\n", "text/markdown")}>{L("Exportar", "Export")}</button>
          </div>
          {todo ? (
            !base ? <p className="muted">{error ? L("Sin el diccionario base no hay lista; el traductor sigue creando palabras.", "Without the base dictionary there is no list; the translator still creates words.") : L("Cargando…", "Loading…")}</p> : (
              <>
                <div className="lista">
                  <table>
                    <thead><tr><th>{idiomaBase}</th><th>{i.nombre}</th><th>{L("Clase", "Class")}</th><th /></tr></thead>
                    <tbody>
                      {coincidencias.map((lema) => {
                        const c = claseDe(base, host.bookLang, lema);
                        return (
                          <tr key={lema}>
                            <td>{lema}</td><td><b>{lexico.get(lema)}</b></td><td className="muted">{es ? c : EN_CLASE[c]}</td>
                            <td>{fijadas.has(lema) ? <span className="muted">{L("fijada", "pinned")}</span> : <button onClick={() => { anadir([{ id: crypto.randomUUID(), palabra: lexico.get(lema)!, significado: lema, clase: c }]); setTodo(false); setFiltro(lema); }}>{L("Editar", "Edit")}</button>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {total > coincidencias.length && <p className="muted">{L(`Se muestran ${coincidencias.length} de ${total.toLocaleString()}: usa el buscador para encontrar cualquiera.`, `Showing ${coincidencias.length} of ${total.toLocaleString()}: use the search to find any word.`)}</p>}
              </>
            )
          ) : (
            <Lista<Palabra> items={mias} anadir={L("+ Palabra", "+ Word")} quitar={L("Quitar palabra", "Remove word")}
              // con un filtro puesto la tabla solo muestra parte: se mezcla con lo oculto
              onChange={(nuevas) => { const vistas = new Set(mias.map((p) => p.id)); const por = new Map(nuevas.map((p) => [p.id, p])); if (nuevas.length > mias.length) setFiltro(""); poner({ lexico: [...i.lexico.flatMap((p) => (vistas.has(p.id) ? por.get(p.id) ?? [] : [p])), ...nuevas.filter((p) => !vistas.has(p.id))] }); }}
              nuevo={() => ({ id: crypto.randomUUID(), palabra: generar(i), significado: "", clase: "sustantivo" })}
              columnas={[{ key: "palabra", label: L("Palabra", "Word") }, { key: "significado", label: L("Significado", "Meaning") }, { key: "clase", label: L("Clase", "Class"), opciones: clases }, { key: "nota", label: L("Nota", "Note") }]} />
          )}
        </>
      )}

      {seccion === "gramatica" && (
        <>
          <div className="columnas">
            <label className="campo">{L("Orden de la frase (sujeto, verbo, objeto)", "Word order (subject, verb, object)")}
              <select value={i.orden} onChange={(e) => poner({ orden: e.target.value })}>{["SVO", "SOV", "VSO", "VOS", "OVS", "OSV", "libre"].map((o) => <option key={o} value={o}>{o === "libre" ? L("Libre", "Free") : o}</option>)}</select>
            </label>
            <label className="campo">{L("El adjetivo va…", "The adjective goes…")}
              <select value={i.adjetivo} onChange={(e) => poner({ adjetivo: e.target.value as Idioma["adjetivo"] })}><option value="antes">{L("antes del nombre", "before the noun")}</option><option value="después">{L("después del nombre", "after the noun")}</option></select>
            </label>
            <label className="campo">{L("La negación va…", "Negation goes…")}
              <select value={i.negacion ?? "antes"} onChange={(e) => poner({ negacion: e.target.value as "antes" | "después" })}><option value="antes">{L("antes del verbo", "before the verb")}</option><option value="después">{L("después del verbo", "after the verb")}</option></select>
            </label>
            <label className="campo">{L("Artículos (el, un…)", "Articles (the, a…)")}
              <select value={i.articulos === false ? "no" : "si"} onChange={(e) => poner({ articulos: e.target.value === "si" })}><option value="si">{L("Existen", "Exist")}</option><option value="no">{L("No existen", "Do not exist")}</option></select>
            </label>
          </div>
          <h3>{L("Afijos: plural, tiempos y personas", "Affixes: plural, tenses and persons")}</h3>
          <Lista items={i.afijos.map((a) => ({ ...a, rasgo: (a.rasgo ?? "") as Rasgo }))} onChange={(l) => poner({ afijos: l.map((a) => ({ ...a, rasgo: a.rasgo || undefined })) })} anadir={L("+ Afijo", "+ Affix")} quitar={L("Quitar afijo", "Remove affix")}
            nuevo={() => ({ id: crypto.randomUUID(), nombre: "", tipo: "sufijo" as const, forma: "", clase: "sustantivo" as const, rasgo: "" as Rasgo })}
            columnas={[{ key: "nombre", label: L("Función", "Function") }, { key: "rasgo", label: L("El traductor lo usa para", "Translator uses it for"), opciones: [["", "—"], ...RASGOS.map((r): [string, string] => [r, nombres[r]])] }, { key: "tipo", label: L("Tipo", "Type"), opciones: [["sufijo", L("sufijo", "suffix")], ["prefijo", L("prefijo", "prefix")]] }, { key: "forma", label: L("Forma", "Form") }, { key: "clase", label: L("Se aplica a", "Applies to"), opciones: clases }]} />
          <h3>{L("Tabla de flexión", "Inflection table")}</h3>
          <input aria-label={L("Palabra", "Word")} placeholder={L(`Escribe una palabra (${idiomaBase})…`, `Type a word (${idiomaBase})…`)} value={ver} onChange={(e) => setVer(e.target.value)} />
          {verPalabra && (
            <div className="lista"><table><tbody>
              <tr><td>{verLema}</td><td><b>{verPalabra}</b></td></tr>
              {flexiones(i, verPalabra, verClase).map((f, k) => <tr key={k}><td>{f.nombre}</td><td><b>{f.forma}</b></td></tr>)}
            </tbody></table></div>
          )}
          <Campo label={L("Reglas y excepciones", "Rules and exceptions")} filas={5} value={i.gramatica} onChange={(v) => poner({ gramatica: v })} />
        </>
      )}

      {seccion === "traductor" && (
        <>
          <Campo label={L(`Texto en el idioma del libro (${idiomaBase})`, `Text in the book's language (${idiomaBase})`)} filas={4} value={frase} onChange={setFrase} />
          {!!i.dialectos?.length && (
            <label className="fld">{L("Dialecto", "Dialect")}
              <select value={dialecto} onChange={(e) => setDialecto(e.target.value)}><option value="">{L("Habla común", "Standard")}</option>{i.dialectos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}</select>
            </label>
          )}
          {t && (
            <>
              <p className="traduccion" lang="und">{t.texto}</p>
              {sonidos(i).some((s) => i.glifos?.[s]) && <Escrito i={i} texto={t.glosa.map((g) => g.palabra).join(" ")} />}
              <div className="glosa">{t.glosa.map((g, k) => <span key={k}><b>{g.palabra}</b><small>{g.origen}{g.rasgos.length ? ` · ${g.rasgos.map((r) => nombres[r]).join(", ")}` : ""}</small></span>)}</div>
            </>
          )}
          <p className="muted">{conGramatica(host.bookLang)
            ? L(`Conjuga, marca plurales y reordena la frase (${i.orden}). Se basa en reglas: en frases largas o enrevesadas revisa el orden.`, `Conjugates, marks plurals and reorders the sentence (${i.orden}). It is rule based: check the order in long or tangled sentences.`)
            : L("El orden y la conjugación automáticos solo existen para español e inglés; en este idioma se traduce palabra por palabra.", "Automatic reordering and conjugation exist for Spanish and English only; this language is translated word by word.")}</p>
        </>
      )}

      {seccion === "escritura" && (
        <>
          <Escritura key={i.id} i={i} poner={poner} es={es} />
          <Campo label={L("Notas sobre la escritura", "Notes on the script")} filas={3} value={i.escritura} onChange={(v) => poner({ escritura: v })} />
        </>
      )}

      {seccion === "dialectos" && (
        <>
          <p className="muted">{L("Cada línea es un cambio de sonido: «k > ch / _i» (k pasa a ch delante de i). En el contexto, # es borde de palabra, V vocal y C consonante; «> 0» borra.", "Each line is a sound change: “k > ch / _i” (k becomes ch before i). In the context, # is a word edge, V a vowel, C a consonant; “> 0” deletes.")}</p>
          <div className="row"><button onClick={() => poner({ dialectos: [...(i.dialectos ?? []), { id: crypto.randomUUID(), nombre: L(`Dialecto ${(i.dialectos?.length ?? 0) + 1}`, `Dialect ${(i.dialectos?.length ?? 0) + 1}`), reglas: dialectoAlAzar(i) }] })}>{L("+ Dialecto", "+ Dialect")}</button></div>
          <div className="columnas">
            {(i.dialectos ?? []).map((d) => {
              const cambiarD = (p: Partial<typeof d>) => poner({ dialectos: i.dialectos!.map((x) => (x.id === d.id ? { ...x, ...p } : x)) });
              return (
                <fieldset key={d.id} className="tarjeta-hito">
                  <legend>{d.nombre}</legend>
                  <input aria-label={L("Nombre del dialecto", "Dialect name")} value={d.nombre} onChange={(e) => cambiarD({ nombre: e.target.value })} />
                  <textarea rows={6} aria-label={L("Cambios de sonido", "Sound changes")} value={d.reglas} onChange={(e) => cambiarD({ reglas: e.target.value })} />
                  <div className="row">
                    <button onClick={() => cambiarD({ reglas: dialectoAlAzar(i) })}>{L("Al azar", "Random")}</button>
                    <button onClick={async () => { if (await confirmAsk(L(`¿Borrar «${d.nombre}»?`, `Delete “${d.nombre}”?`))) poner({ dialectos: i.dialectos!.filter((x) => x.id !== d.id) }); }}>{L("Borrar", "Delete")}</button>
                  </div>
                  <small className="muted">{ejemplos.map((w) => `${w} → ${cambiar(i, w, d.reglas)}`).join(" · ")}</small>
                </fieldset>
              );
            })}
          </div>
        </>
      )}

      {seccion === "cultura" && (
        <>
          <Campo label={L("Quién lo habla", "Who speaks it")} value={i.hablantes} onChange={(v) => poner({ hablantes: v })} />
          <Campo label={L("Historia y registros", "History and registers")} filas={8} value={i.historia} onChange={(v) => poner({ historia: v })} />
        </>
      )}
    </div>
  );
}

export const idiomas: ToolPlugin = { id: "idiomas", name: "Creador de idiomas", Panel };
