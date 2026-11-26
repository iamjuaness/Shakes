// Taller creativo: crea personajes completos de acuerdo a la historia (género, época, cultura y personajes que ya
// existen), lugares, objetos, conflictos, giros, «¿y si…?», títulos, ejercicios para cuando no sale nada y sprints.
// Los ajustes de la historia se guardan en project.ext.taller; todo lo creado son fichas normales.
import { useEffect, useState } from "react";
import { choose } from "../../../src/dialog";
import { totalWords, update, type Card } from "../../../src/tree";
import type { ToolHost, ToolPlugin } from "../types";
import { CULTURAS, EPOCAS, culturasDe, type Epoca, type Genero } from "../_comun/nombres";
import { GENEROS, ROLES, type GeneroHistoria, type Rol } from "./datos";
import { atasco, culturasPara, idea, lugar, objeto, personaje, rolSugerido, type Ctx, type Idea, type Personaje } from "./crear";

interface Ajustes { genero: GeneroHistoria; epoca: Epoca; cultura: string }
const DEF: Ajustes = { genero: "realista", epoca: "actual", cultura: "" };
const L = (h: ToolHost, es: string, en: string) => (h.lang === "en" ? en : es);
const lado = (s: string, h: ToolHost) => s.split("|")[h.lang === "en" ? 1 : 0];
const ajustes = (h: ToolHost): Ajustes => ({ ...DEF, ...h.project.ext?.taller });
// Lo generado va al libro: sale en el idioma de la obra (español si el libro está en español; si no, inglés).
const ctx = (h: ToolHost): Ctx => { const a = ajustes(h); return { genero: a.genero, epoca: a.epoca, cultura: a.cultura || undefined, en: !/^es(-|$)/i.test(h.bookLang ?? h.lang), cards: h.cards, premisa: h.project.ext?.borrador?.premisa?.trim() || undefined }; };

// Sprint: vive fuera del panel para seguir contando aunque se cambie de pestaña.
let sprint: { fin: number; desde: number } | null = null;
let aviso: ReturnType<typeof setTimeout> | undefined;

function Campos({ card, h }: { card: Card; h: ToolHost }) {
  const filas: [string, string | undefined][] = [
    [L(h, "Apodo", "Nickname"), card.alias], [L(h, "Edad", "Age"), card.age], [L(h, "Oficio", "Occupation"), card.job], [L(h, "Origen", "Origin"), card.origin],
    [L(h, "Virtudes", "Virtues"), card.virtues], [L(h, "Defecto", "Flaw"), card.flaw], [L(h, "Herida", "Wound"), card.backstory], [L(h, "Mentira", "Lie"), card.lie],
    [L(h, "Arco", "Arc"), card.arc], [L(h, "Manía", "Quirk"), card.trait],
  ];
  return (
    <div className="tc-ficha">
      <h3>{card.name}</h3>
      <dl>{filas.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <p className="tc-notas">{card.notes}</p>
    </div>
  );
}

function Panel({ host: h }: { host: ToolHost }) {
  const a = ajustes(h);
  const guardar = (p: Partial<Ajustes>) => h.setProject((pr) => ({ ...pr, ext: { ...pr.ext, taller: { ...DEF, ...pr.ext?.taller, ...p } } }));
  const [tab, setTab] = useState<"pj" | "lugar" | "objeto" | "ideas" | "atasco">("pj");
  const [rol, setRol] = useState<Rol>(() => rolSugerido(h.cards));
  const [gen, setGen] = useState<Genero>("x");
  const [pj, setPj] = useState<Personaje | null>(null);
  const [cosa, setCosa] = useState<Card | null>(null);
  const [ideas, setIdeas] = useState<string[]>([]);
  const [empujes, setEmpujes] = useState<string[]>(() => atasco(ctx(h)));
  const [, tic] = useState(0);
  useEffect(() => { const i = setInterval(() => sprint && tic((x) => x + 1), 1000); return () => clearInterval(i); }, []);
  const crear = (c: Card, abrir = false) => { h.addCard(c); h.notify(L(h, `Ficha «${c.name}» creada`, `Card “${c.name}” created`)); if (abrir) h.openCard(c.id); };
  const aSinopsis = (t: string) => {
    const cur = h.current;
    if (!cur) return h.notify(L(h, "Abre un capítulo o escena para añadirlo a su sinopsis.", "Open a chapter or scene to add it to its synopsis."));
    h.setProject((p) => ({ ...p, book: update(p.book, cur.id, (n) => ({ ...n, summary: [n.summary, t].filter(Boolean).join("\n") })) }));
    h.notify(L(h, `Añadido a la sinopsis de «${cur.title}»`, `Added to the synopsis of “${cur.title}”`));
  };
  const empezar = (min: number) => {
    sprint = { fin: Date.now() + min * 60_000, desde: totalWords(h.project.book) };
    clearTimeout(aviso);
    const notify = h.notify, fin = L(h, "⏱ Sprint terminado. Mira cuánto has escrito en el contador de hoy.", "⏱ Sprint over. Check today's word count.");
    aviso = setTimeout(() => { sprint = null; notify(fin); }, min * 60_000);
    tic((x) => x + 1);
  };
  const quedan = sprint ? Math.max(0, Math.round((sprint.fin - Date.now()) / 1000)) : 0;
  const culturas = a.cultura ? CULTURAS : culturasDe(a.epoca);
  const B = (id: typeof tab, es: string, en: string) => <button className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{L(h, es, en)}</button>;
  const IDEAS: [Idea, string, string][] = [["conflicto", "Conflicto", "Conflict"], ["giro", "Giro de trama", "Plot twist"], ["chispa", "¿Y si…?", "What if…?"], ["titulo", "Título", "Title"]];

  return (
    <div className="panel taller">
      <style>{CSS}</style>
      <div className="row tc-historia">
        <b>{L(h, "Tu historia", "Your story")}</b>
        <label>{L(h, "Género", "Genre")}<select value={a.genero} onChange={(e) => guardar({ genero: e.target.value as GeneroHistoria })}>{GENEROS.map(([id, t]) => <option key={id} value={id}>{lado(t, h)}</option>)}</select></label>
        <label>{L(h, "Época", "Era")}<select value={a.epoca} onChange={(e) => guardar({ epoca: e.target.value as Epoca, cultura: "" })}>{EPOCAS.map(([id, es, en]) => <option key={id} value={id}>{h.lang === "en" ? en : es}</option>)}</select></label>
        <label>{L(h, "Cultura", "Culture")}<select value={a.cultura} onChange={(e) => guardar({ cultura: e.target.value })}>
          <option value="">{L(h, "Varias (las de la época)", "Mixed (from the era)")}</option>
          {culturas.map((c) => <option key={c.id} value={c.id}>{h.lang === "en" ? c.en : c.es}</option>)}
        </select></label>
        <span className="muted">{L(h, `${culturasPara(ctx(h)).length} culturas para los nombres`, `${culturasPara(ctx(h)).length} cultures for names`)}</span>
      </div>
      <div className="row tc-tabs">{B("pj", "Personaje", "Character")}{B("lugar", "Lugar", "Place")}{B("objeto", "Objeto", "Object")}{B("ideas", "Ideas", "Ideas")}{B("atasco", "Estoy atascado", "I'm stuck")}</div>

      {tab === "pj" && <>
        <div className="row">
          <label>{L(h, "Papel", "Role")}<select value={rol} onChange={(e) => setRol(e.target.value as Rol)}>{ROLES.map(([id, t]) => <option key={id} value={id}>{lado(t, h)}</option>)}</select></label>
          <label>{L(h, "Género", "Gender")}<select value={gen} onChange={(e) => setGen(e.target.value as Genero)}><option value="x">{L(h, "Cualquiera", "Any")}</option><option value="f">{L(h, "Mujer", "Woman")}</option><option value="m">{L(h, "Hombre", "Man")}</option></select></label>
          <button className="on" onClick={() => setPj(personaje(ctx(h), rol, gen))}>{pj ? L(h, "↻ Otro", "↻ Another") : L(h, "Crear personaje", "Create character")}</button>
        </div>
        <p className="muted">{L(h, "Sale de tu historia: nombre de la cultura y época elegidas, oficio de ese mundo, herida, mentira y arco, y su relación con tu protagonista.", "Built from your story: a name from the chosen culture and era, a job from that world, wound, lie and arc, and how they relate to your protagonist.")}</p>
        {pj && <>
          <Campos card={pj.card} h={h} />
          <ul className="tc-preguntas">{pj.preguntas.map((q) => <li key={q}>{q}</li>)}</ul>
          <div className="row"><button className="on" onClick={() => { crear(pj.card); setPj(null); setRol(rolSugerido([...h.cards, pj.card])); }}>{L(h, "Guardar ficha", "Save card")}</button><button onClick={() => crear(pj.card, true)}>{L(h, "Guardar y abrir", "Save and open")}</button></div>
        </>}
      </>}

      {(tab === "lugar" || tab === "objeto") && <>
        <div className="row"><button className="on" onClick={() => setCosa(tab === "lugar" ? lugar(ctx(h)) : objeto(ctx(h)))}>{cosa ? L(h, "↻ Otro", "↻ Another") : tab === "lugar" ? L(h, "Crear lugar", "Create place") : L(h, "Crear objeto", "Create object")}</button></div>
        {cosa && cosa.type === (tab === "lugar" ? "place" : "object") && <>
          <div className="tc-ficha"><h3>{cosa.name}</h3><p className="tc-notas">{cosa.notes}</p></div>
          <div className="row"><button className="on" onClick={() => { crear(cosa); setCosa(null); }}>{L(h, "Guardar ficha", "Save card")}</button></div>
        </>}
      </>}

      {tab === "ideas" && <>
        <div className="row">{IDEAS.map(([k, es, en]) => <button key={k} onClick={() => setIdeas((l) => [idea(ctx(h), k), ...l].slice(0, 8))}>{L(h, es, en)}</button>)}</div>
        <p className="muted">{L(h, "Usan tus personajes. «→ Sinopsis» la guarda en la sinopsis del capítulo o escena abierta.", "They use your characters. “→ Synopsis” saves it in the open chapter's or scene's synopsis.")}</p>
        <ul className="tc-ideas">{ideas.map((t, i) => <li key={i + t}><span>{t}</span><button onClick={() => aSinopsis(t)}>{L(h, "→ Sinopsis", "→ Synopsis")}</button></li>)}</ul>
      </>}

      {tab === "atasco" && <>
        <p className="muted">{L(h, "Tres empujones para seguir ahora mismo. No hace falta que salga bien: hace falta que salga.", "Three nudges to keep going right now. It doesn't have to be good: it has to be written.")}</p>
        <ul className="tc-ideas">{empujes.map((t, i) => <li key={i + t}><span>{t}</span><button onClick={() => aSinopsis(t)}>{L(h, "→ Sinopsis", "→ Synopsis")}</button></li>)}</ul>
        <div className="row"><button onClick={() => setEmpujes(atasco(ctx(h)))}>{L(h, "↻ Otros", "↻ Others")}</button></div>
        <h4>{L(h, "Sprint", "Sprint")}</h4>
        {sprint ? (
          <p><b>{Math.floor(quedan / 60)}:{String(quedan % 60).padStart(2, "0")}</b> · {L(h, "palabras", "words")}: +{Math.max(0, totalWords(h.project.book) - sprint.desde)} <button onClick={() => { sprint = null; clearTimeout(aviso); tic((x) => x + 1); }}>{L(h, "Parar", "Stop")}</button></p>
        ) : (
          <div className="row">{[5, 10, 15, 25].map((m) => <button key={m} onClick={() => empezar(m)}>{m} min</button>)}<span className="muted">{L(h, "Escribe sin parar y sin corregir hasta que acabe.", "Write without stopping or editing until it ends.")}</span></div>
        )}
      </>}
    </div>
  );
}

const CSS = `.taller .row{flex-wrap:wrap;gap:8px;align-items:center}.taller label{display:flex;flex-direction:column;font-size:12px;gap:2px}
.tc-historia{padding:10px;border:1px solid var(--line);border-radius:var(--radius);background:var(--panel)}.tc-tabs{margin:12px 0}
.tc-ficha{border:1px solid var(--line);border-radius:var(--radius);padding:12px 16px;margin:12px 0;background:var(--surface)}.tc-ficha h3{margin:0 0 8px}
.tc-ficha dl{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;margin:0}.tc-ficha dt{font-size:11px;color:var(--muted)}.tc-ficha dd{margin:0}
.tc-notas{white-space:pre-line;margin:10px 0 0}.tc-preguntas{color:var(--muted);font-style:italic}
.tc-ideas{list-style:none;padding:0}.tc-ideas li{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line)}`;

export const tallerCreativo: ToolPlugin = {
  id: "taller-creativo",
  name: "Taller creativo",
  Panel,
  actions: [
    {
      label: "Personaje para esta historia",
      run(h) {
        const p = personaje(ctx(h), rolSugerido(h.cards));
        h.addCard(p.card);
        h.openCard(p.card.id);
        h.notify(L(h, `«${p.card.name}» creado como ${lado(ROLES.find(([x]) => x === p.rol)![1], h).toLowerCase()}`, `“${p.card.name}” created as ${lado(ROLES.find(([x]) => x === p.rol)![1], h).toLowerCase()}`));
      },
    },
    {
      label: "Estoy atascado…",
      async run(h) {
        await choose(L(h, "Prueba una de estas para seguir escribiendo:", "Try one of these to keep writing:"), atasco(ctx(h)));
      },
    },
  ],
};
