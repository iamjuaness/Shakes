import { useDeferredValue, useMemo, useState } from "react";
import { namesOf, scenes, snapshot, update } from "../../../src/tree";
import type { Project } from "../../../src/tree";
import { confirmAsk } from "../../../src/dialog";
import type { ToolHost, ToolPlugin } from "../types";
import { L } from "../_comun/idioma";
import { aplicar, bloques, categorias, corregirSeguras, hallazgo, informe, pasadas, revisarLibro } from "./analisis";
import type { Categoria, Hallazgo } from "./analisis";
import { voces } from "./narracion";
import { URL_LOCAL, esLocal, revisarCon } from "./languagetool";

interface Datos { ignorados?: string[]; hechos?: string[]; notas?: Record<string, string>; lt?: string }
const POR_PAGINA = 30;
type Vista = "informe" | "correcciones" | "voces" | "gramatica" | "plan";

function Panel({ host }: { host: ToolHost }) {
  const datos: Datos = host.project.ext?.edicion ?? {};
  const guardar = (d: Partial<Datos>) => host.setProject((p) => ({ ...p, ext: { ...p.ext, edicion: { ...p.ext?.edicion, ...d } } }));
  const [vista, setVista] = useState<Vista>("informe");
  const [cat, setCat] = useState<Categoria | "">("");
  const [cap, setCap] = useState("");
  const [pag, setPag] = useState(0);
  const [lt, setLt] = useState<Hallazgo[]>([]); // lo que encontró LanguageTool en la última revisión
  const [ltEstado, setLtEstado] = useState("");
  const obra = useDeferredValue(host.scope);
  const personajes = useMemo(() => host.cards.filter((c) => c.type === "character").map(namesOf).filter((n) => n.length), [host.cards]);
  const propios = useMemo(() => revisarLibro(obra, host.bookLang, datos.ignorados, personajes), [obra, host.bookLang, datos.ignorados, personajes]);
  // Las de LanguageTool caducan cuando cambia el texto que señalaban.
  const vigentes = useMemo(() => {
    const texto = new Map(scenes(obra).map((s) => [s.scene.id, bloques(s.scene.content)]));
    return lt.filter((h) => !datos.ignorados?.includes(h.id) && texto.get(h.nodo)?.[h.bloque]?.texto.slice(h.from, h.to) === h.texto);
  }, [lt, obra, datos.ignorados]);
  const todos = useMemo(() => [...propios, ...vigentes], [propios, vigentes]);
  const caps = useMemo(() => informe(obra, todos), [obra, todos]);
  const habla = useMemo(() => (vista === "voces" ? voces(scenes(obra).flatMap((s) => bloques(s.scene.content).map((b) => b.texto)), personajes) : null), [vista, obra, personajes]);
  const lista = todos.filter((h) => (!cat || h.cat === cat) && (!cap || h.nodo === cap));
  const seguras = lista.filter((h) => h.segura && h.sug.length);
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const p = Math.min(pag, paginas - 1);
  const CATS = categorias();

  const cambiar = (pr: Project, nodo: string, f: (html: string) => string): Project => ({ ...pr, book: update(pr.book, nodo, (n) => ({ ...n, content: f(n.content ?? "") })) });
  const corregir = (h: Hallazgo, rep: string) => host.setProject((pr) => cambiar(pr, h.nodo, (html) => aplicar(html, h.bloque, h.from, h.to, rep)));
  async function todas() {
    const nodos = [...new Set(seguras.map((h) => h.nodo))];
    if (!(await confirmAsk(L(`Se aplicarán todas las correcciones ortotipográficas seguras de ${nodos.length} capítulo(s). Antes se guarda una copia en Versiones. ¿Continuar?`, `All safe typography fixes in ${nodos.length} chapter(s) will be applied. A copy is saved in Versions first. Continue?`)))) return;
    host.setProject((pr) => nodos.reduce((acc, id) => cambiar(acc, id, (html) => corregirSeguras(html, host.bookLang).html), snapshot(pr, L("Antes de corregir", "Before fixing"), true)));
    host.notify(L("Correcciones aplicadas. La copia anterior está en Versiones.", "Fixes applied. The previous copy is in Versions."));
  }
  const filtrar = (c: Categoria | "", id = "") => { setCat(c); setCap(id); setPag(0); setVista("correcciones"); };

  async function languageTool() {
    const url = datos.lt?.trim() || URL_LOCAL;
    if (!esLocal(url)) return setLtEstado(L("Solo se admiten direcciones de tu equipo (http://localhost…): el texto no sale de él.", "Only addresses on this computer are accepted (http://localhost…): your text never leaves it."));
    const hallados: Hallazgo[] = [];
    try {
      const lista = scenes(host.scope).map((s) => s.scene);
      for (const [i, s] of lista.entries()) {
        setLtEstado(L(`Revisando ${i + 1} de ${lista.length}…`, `Checking ${i + 1} of ${lista.length}…`));
        const textos = bloques(s.content).map((b) => b.texto);
        if (textos.length) for (const c of await revisarCon(url, textos, host.bookLang)) hallados.push(hallazgo(s.id, textos[c.bloque], c.bloque, { ...c, cat: "gramatica", segura: false }));
      }
      setLt(hallados);
      setLtEstado(L(`${hallados.length} avisos de LanguageTool, en Correcciones › Gramática.`, `${hallados.length} LanguageTool findings, under Corrections › Grammar.`));
    } catch {
      setLtEstado(L(`No responde en ${url}. Arráncalo y permite a Shakes consultarlo (ver abajo).`, `No answer at ${url}. Start it and allow Shakes to query it (see below).`));
    }
  }

  return (
    <div className="panel mesa">
      <div className="chips">
        {([["informe", L("Informe editorial", "Editorial report")], ["correcciones", `${L("Correcciones", "Corrections")} (${todos.length})`], ["voces", L("Voces", "Voices")], ["gramatica", L("Gramática a fondo", "Deep grammar")], ["plan", L("Plan de edición", "Editing plan")]] as const).map(([v, n]) => (
          <button key={v} className={vista === v ? "on" : ""} aria-pressed={vista === v} onClick={() => setVista(v)}>{n}</button>
        ))}
      </div>
      {!/^(es|en)(-|$)/i.test(host.bookLang) && <p className="muted">{L("En este idioma se revisan la puntuación y las repeticiones; las reglas completas son para español e inglés.", "In this language punctuation and repetitions are checked; the full rule set covers Spanish and English.")}</p>}

      {vista === "informe" && (
        <>
          <div className="stats">
            <div className="stat"><b>{caps.reduce((s, c) => s + c.palabras, 0)}</b><span>{L("palabras", "words")}</span></div>
            <div className="stat"><b>{caps.length}</b><span>{L("capítulos", "chapters")}</span></div>
            {CATS.map(([c, n]) => <button key={c} className="stat" onClick={() => filtrar(c)}><b>{todos.filter((h) => h.cat === c).length}</b><span>{n}</span></button>)}
          </div>
          <div className="tabla">
            <table>
              <thead><tr><th>{L("Capítulo", "Chapter")}</th><th>{L("Palabras", "Words")}</th><th title={L("Palabras por frase, de media", "Average words per sentence")}>{L("Frase", "Sentence")}</th><th title={L("Variación de la longitud de las frases: más alto, más variado", "Sentence length variation: higher is more varied")}>{L("Ritmo", "Rhythm")}</th><th>{L("Diálogo", "Dialogue")}</th><th title={L("Hallazgos de estilo por cada mil palabras", "Style findings per thousand words")}>{L("Estilo", "Style")} ‰</th><th title={L("Hallazgos de narrativa por cada mil palabras", "Narrative findings per thousand words")}>{L("Narrativa", "Narrative")} ‰</th></tr></thead>
              <tbody>{caps.map((c) => (
                <tr key={c.id}><td><button onClick={() => filtrar("", c.id)}>{c.titulo}</button></td><td>{c.palabras}</td><td>{c.frase}</td><td>{c.ritmo} %</td><td>{c.dialogo} %</td><td>{c.porMil.estilo}</td><td>{c.porMil.narrativa}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <h3>{L("Qué mirar", "What to look at")}</h3>
          {caps.some((c) => c.avisos.length) ? (
            <ul>{caps.filter((c) => c.avisos.length).map((c) => <li key={c.id}><button onClick={() => host.openScene(c.id)}>{c.titulo}</button> {c.avisos.join(" ")}</li>)}</ul>
          ) : <p className="muted">{L("Sin avisos de estructura ni de ritmo.", "No structure or pace warnings.")}</p>}
        </>
      )}

      {vista === "correcciones" && (
        <>
          <div className="row">
            <select aria-label={L("Tipo", "Type")} value={cat} onChange={(e) => { setCat(e.target.value as Categoria | ""); setPag(0); }}><option value="">{L("Todos los tipos", "All types")}</option>{CATS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
            <select aria-label={L("Capítulo", "Chapter")} value={cap} onChange={(e) => { setCap(e.target.value); setPag(0); }}><option value="">{L("Todo el libro", "Whole book")}</option>{caps.map((c) => <option key={c.id} value={c.id}>{c.titulo}</option>)}</select>
            <span className="spacer" />
            {seguras.length > 0 && <button className="on" onClick={todas}>{L(`Corregir ${seguras.length} seguras`, `Fix ${seguras.length} safe ones`)}</button>}
          </div>
          {!lista.length && <p className="muted">{L("Nada que revisar aquí.", "Nothing to review here.")}</p>}
          {lista.slice(p * POR_PAGINA, (p + 1) * POR_PAGINA).map((h, i) => (
            <div className="hallazgo" key={h.id + h.from + i}>
              <p>…{h.antes}<mark>{h.texto}</mark>{h.despues}…</p>
              <p className="muted">{h.msg} <i>{caps.find((c) => c.id === h.nodo)?.titulo}</i></p>
              <div className="chips">
                {h.sug.slice(0, 4).map((s) => <button key={s} onClick={() => corregir(h, s)}>{s.trim() ? s : s ? L("Dejar un espacio", "Single space") : L("Quitar", "Remove")}</button>)}
                <button onClick={() => host.openScene(h.nodo)}>{L("Ver en el texto", "Show in text")}</button>
                <button onClick={() => guardar({ ignorados: [...(datos.ignorados ?? []), h.id] })}>{L("Ignorar", "Ignore")}</button>
              </div>
            </div>
          ))}
          {paginas > 1 && <div className="row"><button disabled={!p} aria-label={L("Anteriores", "Previous")} onClick={() => setPag(p - 1)}>◀</button><span>{p + 1} / {paginas}</span><button disabled={p === paginas - 1} aria-label={L("Siguientes", "Next")} onClick={() => setPag(p + 1)}>▶</button></div>}
          {!!datos.ignorados?.length && <button onClick={() => guardar({ ignorados: [] })}>{L(`Volver a mostrar los ${datos.ignorados.length} ignorados`, `Show the ${datos.ignorados.length} ignored again`)}</button>}
        </>
      )}

      {habla && (
        <>
          <p className="muted">{L("Diálogos reunidos por personaje (los nombres salen de tus fichas). Se atribuyen por el nombre que acompaña a cada intervención.", "Dialogue gathered by character (names come from your cards). Lines are attributed by the name that goes with each one.")}</p>
          {!habla.voces.length ? <p>{L("No hay intervenciones atribuibles: crea fichas de personaje y nómbralos en las acotaciones.", "No attributable lines: create character cards and name them in dialogue tags.")}</p> : (
            <div className="tabla">
              <table>
                <thead><tr><th>{L("Personaje", "Character")}</th><th>{L("Intervenciones", "Lines")}</th><th>{L("Palabras", "Words")}</th><th>{L("Frase", "Sentence")}</th><th>¿?</th><th>¡!</th><th title={L("Palabras distintas entre las primeras 200", "Distinct words among the first 200")}>{L("Variedad", "Variety")}</th><th>{L("Palabras suyas", "Signature words")}</th></tr></thead>
                <tbody>{habla.voces.map((v) => <tr key={v.nombre}><td>{v.nombre}</td><td>{v.intervenciones}</td><td>{v.palabras}</td><td>{v.frase}</td><td>{v.preguntas} %</td><td>{v.exclamaciones} %</td><td>{v.variedad} %</td><td>{v.propias.join(", ")}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          {habla.parecidas.map(([a, b]) => <p key={a + b} className="warn">⚠ {L(`${a} y ${b} hablan casi igual: frases del mismo largo y las mismas palabras.`, `${a} and ${b} sound alike: same sentence length and the same words.`)}</p>)}
          {!!habla.sinAtribuir && <p className="muted">{L(`${habla.sinAtribuir} intervenciones sin atribuir.`, `${habla.sinAtribuir} lines not attributed.`)}</p>}
        </>
      )}

      {vista === "gramatica" && (
        <>
          <p>{L("Las reglas de Shakes buscan errores frecuentes. Para analizar la frase entera, conecta LanguageTool instalado en tu equipo: es gratuito y tu texto no sale de él.", "Shakes' rules catch frequent mistakes. For full sentence analysis, connect a LanguageTool installed on this computer: it is free and your text never leaves it.")}</p>
          <label className="campo">{L("Dirección", "Address")}<input type="url" value={datos.lt ?? ""} placeholder={URL_LOCAL} onChange={(e) => guardar({ lt: e.target.value })} /></label>
          <div className="row"><button className="on" onClick={languageTool}>{L("Revisar el libro", "Check the book")}</button>{ltEstado && <span role="status">{ltEstado}</span>}</div>
          <p className="muted">{L("Cómo arrancarlo: descarga LanguageTool (languagetool.org, necesita Java) y ejecuta en su carpeta:", "How to start it: download LanguageTool (languagetool.org, needs Java) and run in its folder:")}</p>
          <pre><code>java -cp languagetool-server.jar org.languagetool.server.HTTPServer --port 8081 --allow-origin "*"</code></pre>
        </>
      )}

      {vista === "plan" && pasadas().map((x) => {
        const nota = `${host.scope.id}:${x.id}`;
        const hechos = x.puntos.filter((_, i) => datos.hechos?.includes(`${nota}:${i}`)).length;
        return (
          <details key={x.id}>
            <summary><b>{x.nombre}</b> <span className="muted">{hechos} / {x.puntos.length}</span></summary>
            <p className="muted">{x.como}</p>
            {x.puntos.map((t, i) => (
              <label className="check" key={t}>
                <input type="checkbox" checked={datos.hechos?.includes(`${nota}:${i}`) ?? false} onChange={(e) => guardar({ hechos: e.target.checked ? [...(datos.hechos ?? []), `${nota}:${i}`] : (datos.hechos ?? []).filter((h) => h !== `${nota}:${i}`) })} />{t}
              </label>
            ))}
            <label className="campo">{L("Notas de esta pasada", "Notes for this pass")}
              <textarea rows={3} value={datos.notas?.[nota] ?? ""} onChange={(e) => guardar({ notas: { ...datos.notas, [nota]: e.target.value } })} />
            </label>
          </details>
        );
      })}
    </div>
  );
}

export const mesaEdicion: ToolPlugin = { id: "mesa-edicion", name: "Mesa de edición", Panel };
