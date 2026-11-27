import { L, enIngles } from "../_comun/idioma";
import { useState } from "react";
import { addChild, books, esObra, find, update, type Node } from "../../../src/tree";
import type { ToolHost, ToolPlugin } from "../types";

interface Beat { id: string; name: string; text: string }
interface Esc { id: string; title: string; goal: string; conflict: string; outcome: string; beat?: string; done?: boolean }
interface Datos { premisa: string; tema: string; final: string; ideas: { id: string; text: string }[]; beats: Beat[]; escenas: Esc[] }

const VACIO: Datos = { premisa: "", tema: "", final: "", ideas: [], beats: [], escenas: [] };
const PLANTILLAS_ES: Record<string, string[]> = {
  "Tres actos": ["Planteamiento", "Detonante", "Primer giro", "Nudo: complicaciones", "Punto medio", "Segundo giro", "Clímax", "Desenlace"],
  "Save the Cat": ["Imagen inicial", "Tema", "Planteamiento", "Catalizador", "Debate", "Paso al acto 2", "Trama B", "Diversión y juegos", "Punto medio", "Los malos aprietan", "Todo está perdido", "Noche oscura del alma", "Paso al acto 3", "Final", "Imagen final"],
  "Viaje del héroe": ["Mundo ordinario", "Llamada a la aventura", "Rechazo", "Mentor", "Cruce del umbral", "Pruebas, aliados y enemigos", "Acercamiento", "Calvario", "Recompensa", "Camino de vuelta", "Resurrección", "Regreso con el elixir"],
};
const PLANTILLAS_EN: Record<string, string[]> = {
  "Three acts": ["Setup", "Inciting incident", "First turn", "Middle: complications", "Midpoint", "Second turn", "Climax", "Resolution"],
  "Save the Cat": ["Opening image", "Theme stated", "Setup", "Catalyst", "Debate", "Break into two", "B story", "Fun and games", "Midpoint", "Bad guys close in", "All is lost", "Dark night of the soul", "Break into three", "Finale", "Final image"],
  "Hero's journey": ["Ordinary world", "Call to adventure", "Refusal", "Mentor", "Crossing the threshold", "Tests, allies and enemies", "Approach", "Ordeal", "Reward", "The road back", "Resurrection", "Return with the elixir"],
};
const PREGUNTAS_EN = ["What does the protagonist want and what stands in the way?", "What would happen if the protagonist failed completely?", "Which secret changes everything if it comes out?", "Who opposes them, and why are they right from their own side?", "What irreversible decision does the protagonist make?", "What do they lose before they win?"];
const PREGUNTAS_ES = ["¿Qué quiere el protagonista y qué se lo impide?", "¿Qué pasaría si el protagonista fallara por completo?", "¿Qué secreto cambia todo si sale a la luz?", "¿Quién se opone y por qué tiene razón desde su punto de vista?", "¿Qué decisión irreversible toma el protagonista?", "¿Qué pierde antes de ganar?"];
const plantillas = () => (enIngles() ? PLANTILLAS_EN : PLANTILLAS_ES);
const preguntas = () => (enIngles() ? PREGUNTAS_EN : PREGUNTAS_ES);
const id = () => crypto.randomUUID();

// Añade `e` al final de la obra del ámbito: un capítulo en un libro (dentro de su última parte, si acaba en una)
// o una escena en un guion (dentro de su último acto). null si no cabe.
function agregarEscena(root: Node, scopeId: string, e: Esc): Node | null {
  const scope = find(root, scopeId);
  const obra = scope && (esObra(scope.kind) || scope.kind === "blank" ? scope : books(scope).pop());
  if (!obra) return null;
  const tipo = obra.kind === "script" ? "scene" : "chapter";
  const ult = obra.children[obra.children.length - 1];
  const padre = ult && (ult.kind === "part" || ult.kind === "act") ? ult : obra;
  const [r4, esc] = addChild(root, padre.id, tipo);
  if (!esc) return null;
  const resumen = [e.goal && `${L("Objetivo", "Goal")}: ${e.goal}`, e.conflict && `${L("Conflicto", "Conflict")}: ${e.conflict}`, e.outcome && `${L("Desenlace", "Outcome")}: ${e.outcome}`].filter(Boolean).join("\n");
  return update(r4, esc.id, (n) => ({ ...n, title: e.title || n.title, summary: resumen }));
}

function Area({ v, set, ph, rows = 2 }: { v: string; set: (s: string) => void; ph: string; rows?: number }) {
  return <textarea rows={rows} value={v} placeholder={ph} aria-label={ph} onChange={(e) => set(e.target.value)} style={{ width: "100%", resize: "vertical", marginBottom: 6 }} />;
}

function Panel({ host }: { host: ToolHost }) {
  const d: Datos = { ...VACIO, ...host.project.ext?.borrador };
  const save = (n: Partial<Datos>) => host.setProject((p) => ({ ...p, ext: { ...p.ext, borrador: { ...VACIO, ...p.ext?.borrador, ...n } } }));
  const [idea, setIdea] = useState("");
  const [pista, setPista] = useState(0);
  const setBeat = (b: Beat, patch: Partial<Beat>) => save({ beats: d.beats.map((x) => (x.id === b.id ? { ...x, ...patch } : x)) });
  const setEsc = (e: Esc, patch: Partial<Esc>) => save({ escenas: d.escenas.map((x) => (x.id === e.id ? { ...x, ...patch } : x)) });
  const mover = <T,>(l: T[], i: number, dir: -1 | 1) => { const j = i + dir; if (j < 0 || j >= l.length) return l; const c = [...l]; [c[i], c[j]] = [c[j], c[i]]; return c; };
  const aEscena = (e: Esc) => {
    const r = agregarEscena(host.project.book, host.scope.id, e);
    if (!r) return host.notify(L("No se pudo añadir al manuscrito aquí", "Could not add it to the manuscript here"));
    host.setProject((p) => ({ ...p, book: r }));
    setEsc(e, { done: true });
    host.notify(L(`«${e.title || "sin título"}» añadida al manuscrito`, `“${e.title || "untitled"}” added to the manuscript`));
  };
  const pendientes = d.escenas.filter((e) => !e.done).length;

  return (
    <div className="panel">
      <h3>1 · {L("Núcleo", "Core")}</h3>
      <Area v={d.premisa} set={(premisa) => save({ premisa })} ph={L("Premisa en una frase: alguien quiere X, pero Y se lo impide", "One-sentence premise: someone wants X, but Y stands in the way")} />
      <Area v={d.tema} set={(tema) => save({ tema })} ph={L("Tema: lo que la historia dice sobre la vida", "Theme: what the story says about life")} />
      <Area v={d.final} set={(final) => save({ final })} ph={L("Final soñado (aunque cambie después)", "Dream ending (even if it changes later)")} />

      <h3>2 · {L("Lluvia de ideas", "Brainstorm")}</h3>
      <p className="muted">{preguntas()[pista]} <button className="linklike" onClick={() => setPista((pista + 1) % preguntas().length)}>{L("otra pregunta", "another question")}</button></p>
      <div className="row">
        <input className="grow" value={idea} placeholder={L("Escribe una idea suelta y pulsa Enter", "Type a loose idea and press Enter")} onChange={(e) => setIdea(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && idea.trim()) { save({ ideas: [...d.ideas, { id: id(), text: idea.trim() }] }); setIdea(""); } }} />
      </div>
      {d.ideas.map((i) => (
        <div key={i.id} className="row">
          <span style={{ flex: 1 }}>{i.text}</span>
          <button title={L("Convertir en escena del tablero", "Turn into a scene on the board")} onClick={() => save({ ideas: d.ideas.filter((x) => x.id !== i.id), escenas: [...d.escenas, { id: id(), title: i.text, goal: "", conflict: "", outcome: "" }] })}>{L("→ Escena", "→ Scene")}</button>
          <button aria-label={L("Quitar idea", "Remove idea")} onClick={() => save({ ideas: d.ideas.filter((x) => x.id !== i.id) })}>×</button>
        </div>
      ))}

      <h3>3 · {L("Estructura", "Structure")}</h3>
      <div className="row">
        {Object.keys(plantillas()).map((k) => (
          <button key={k} onClick={() => save({ beats: plantillas()[k].map((name) => ({ id: id(), name, text: "" })) })}>{k}</button>
        ))}
        <button onClick={() => save({ beats: [...d.beats, { id: id(), name: L("Nuevo beat", "New beat"), text: "" }] })}>+ Beat</button>
      </div>
      {!d.beats.length && <p className="muted">{L("Elige una plantilla para empezar (reemplaza los beats actuales).", "Pick a template to start (it replaces the current beats).")}</p>}
      {d.beats.map((b, i) => (
        <div key={b.id} style={{ marginBottom: 8 }}>
          <div className="row" style={{ marginBottom: 4 }}>
            <input className="grow" value={b.name} aria-label={L("Nombre del beat", "Beat name")} onChange={(e) => setBeat(b, { name: e.target.value })} style={{ fontWeight: 650 }} />
            <button aria-label={L("Subir", "Move up")} onClick={() => save({ beats: mover(d.beats, i, -1) })}>↑</button>
            <button aria-label={L("Bajar", "Move down")} onClick={() => save({ beats: mover(d.beats, i, 1) })}>↓</button>
            <button title={L("Crear escena en el tablero a partir de este beat", "Create a scene on the board from this beat")} onClick={() => save({ escenas: [...d.escenas, { id: id(), title: b.name, goal: b.text, conflict: "", outcome: "", beat: b.id }] })}>{L("→ Escena", "→ Scene")}</button>
            <button aria-label={L("Quitar beat", "Remove beat")} onClick={() => save({ beats: d.beats.filter((x) => x.id !== b.id) })}>×</button>
          </div>
          <Area v={b.text} set={(text) => setBeat(b, { text })} ph={L("¿Qué ocurre aquí?", "What happens here?")} />
        </div>
      ))}

      <h3>4 · {L("Tablero de escenas", "Scene board")} {d.escenas.length > 0 && <span className="muted">({pendientes} {L("sin pasar al manuscrito", "not yet in the manuscript")})</span>}</h3>
      <div className="row"><button onClick={() => save({ escenas: [...d.escenas, { id: id(), title: "", goal: "", conflict: "", outcome: "" }] })}>{L("+ Escena", "+ Scene")}</button></div>
      {d.escenas.map((e, i) => {
        const beat = d.beats.find((b) => b.id === e.beat);
        return (
          <div key={e.id} style={{ marginBottom: 12, opacity: e.done ? 0.55 : 1 }}>
            <div className="row" style={{ marginBottom: 4 }}>
              <input className="grow" value={e.title} placeholder={L("Título de la escena", "Scene title")} aria-label={L("Título de la escena", "Scene title")} onChange={(ev) => setEsc(e, { title: ev.target.value })} style={{ fontWeight: 650 }} />
              {beat && <span className="chip">{beat.name}</span>}
              <button aria-label={L("Subir", "Move up")} onClick={() => save({ escenas: mover(d.escenas, i, -1) })}>↑</button>
              <button aria-label={L("Bajar", "Move down")} onClick={() => save({ escenas: mover(d.escenas, i, 1) })}>↓</button>
              <button disabled={e.done} title={L("Crea el capítulo (o la escena, en un guion) en el manuscrito con esta sinopsis", "Creates the chapter (or scene, in a script) in the manuscript with this synopsis")} onClick={() => aEscena(e)}>{e.done ? L("Creada", "Created") : L("Al manuscrito", "To manuscript")}</button>
              <button aria-label={L("Quitar escena", "Remove scene")} onClick={() => save({ escenas: d.escenas.filter((x) => x.id !== e.id) })}>×</button>
            </div>
            <Area v={e.goal} set={(goal) => setEsc(e, { goal })} ph={L("Objetivo: ¿qué quiere el personaje en esta escena?", "Goal: what does the character want in this scene?")} />
            <Area v={e.conflict} set={(conflict) => setEsc(e, { conflict })} ph={L("Conflicto: ¿qué se lo impide?", "Conflict: what stands in the way?")} />
            <Area v={e.outcome} set={(outcome) => setEsc(e, { outcome })} ph={L("Desenlace: ¿cómo termina y qué cambia?", "Outcome: how does it end and what changes?")} />
          </div>
        );
      })}
    </div>
  );
}

export const borrador: ToolPlugin = { id: "borrador", name: "Borrador de historia", Panel };
