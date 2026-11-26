import { useState } from "react";
import { addChild, books, esObra, find, update, type Node } from "../../../src/tree";
import type { ToolHost, ToolPlugin } from "../types";

interface Beat { id: string; name: string; text: string }
interface Esc { id: string; title: string; goal: string; conflict: string; outcome: string; beat?: string; done?: boolean }
interface Datos { premisa: string; tema: string; final: string; ideas: { id: string; text: string }[]; beats: Beat[]; escenas: Esc[] }

const VACIO: Datos = { premisa: "", tema: "", final: "", ideas: [], beats: [], escenas: [] };
const PLANTILLAS: Record<string, string[]> = {
  "Tres actos": ["Planteamiento", "Detonante", "Primer giro", "Nudo: complicaciones", "Punto medio", "Segundo giro", "Clímax", "Desenlace"],
  "Save the Cat": ["Imagen inicial", "Tema", "Planteamiento", "Catalizador", "Debate", "Paso al acto 2", "Trama B", "Diversión y juegos", "Punto medio", "Los malos aprietan", "Todo está perdido", "Noche oscura del alma", "Paso al acto 3", "Final", "Imagen final"],
  "Viaje del héroe": ["Mundo ordinario", "Llamada a la aventura", "Rechazo", "Mentor", "Cruce del umbral", "Pruebas, aliados y enemigos", "Acercamiento", "Calvario", "Recompensa", "Camino de vuelta", "Resurrección", "Regreso con el elixir"],
};
const PREGUNTAS = ["¿Qué quiere el protagonista y qué se lo impide?", "¿Qué pasaría si el protagonista fallara por completo?", "¿Qué secreto cambia todo si sale a la luz?", "¿Quién se opone y por qué tiene razón desde su punto de vista?", "¿Qué decisión irreversible toma el protagonista?", "¿Qué pierde antes de ganar?"];
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
  const resumen = [e.goal && `Objetivo: ${e.goal}`, e.conflict && `Conflicto: ${e.conflict}`, e.outcome && `Desenlace: ${e.outcome}`].filter(Boolean).join("\n");
  return update(r4, esc.id, (n) => ({ ...n, title: e.title || n.title, summary: resumen }));
}

function Area({ v, set, ph, rows = 2 }: { v: string; set: (s: string) => void; ph: string; rows?: number }) {
  return <textarea rows={rows} value={v} placeholder={ph} aria-label={ph} onChange={(e) => set(e.target.value)} style={{ width: "100%", resize: "vertical", marginBottom: 6 }} />;
}

function Panel({ host }: { host: ToolHost }) {
  const d: Datos = { ...VACIO, ...host.project.ext?.borrador };
  const save = (n: Partial<Datos>) => host.setProject((p) => ({ ...p, ext: { ...p.ext, borrador: { ...VACIO, ...p.ext?.borrador, ...n } } }));
  const [idea, setIdea] = useState("");
  const [pista, setPista] = useState(PREGUNTAS[0]);
  const setBeat = (b: Beat, patch: Partial<Beat>) => save({ beats: d.beats.map((x) => (x.id === b.id ? { ...x, ...patch } : x)) });
  const setEsc = (e: Esc, patch: Partial<Esc>) => save({ escenas: d.escenas.map((x) => (x.id === e.id ? { ...x, ...patch } : x)) });
  const mover = <T,>(l: T[], i: number, dir: -1 | 1) => { const j = i + dir; if (j < 0 || j >= l.length) return l; const c = [...l]; [c[i], c[j]] = [c[j], c[i]]; return c; };
  const aEscena = (e: Esc) => {
    const r = agregarEscena(host.project.book, host.scope.id, e);
    if (!r) return host.notify("No se pudo añadir al manuscrito aquí");
    host.setProject((p) => ({ ...p, book: r }));
    setEsc(e, { done: true });
    host.notify(`«${e.title || "sin título"}» añadida al manuscrito`);
  };
  const pendientes = d.escenas.filter((e) => !e.done).length;

  return (
    <div className="panel">
      <h3>1 · Núcleo</h3>
      <Area v={d.premisa} set={(premisa) => save({ premisa })} ph="Premisa en una frase: alguien quiere X, pero Y se lo impide" />
      <Area v={d.tema} set={(tema) => save({ tema })} ph="Tema: lo que la historia dice sobre la vida" />
      <Area v={d.final} set={(final) => save({ final })} ph="Final soñado (aunque cambie después)" />

      <h3>2 · Lluvia de ideas</h3>
      <p className="muted">{pista} <button className="linklike" onClick={() => setPista(PREGUNTAS[(PREGUNTAS.indexOf(pista) + 1) % PREGUNTAS.length])}>otra pregunta</button></p>
      <div className="row">
        <input className="grow" value={idea} placeholder="Escribe una idea suelta y pulsa Enter" onChange={(e) => setIdea(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && idea.trim()) { save({ ideas: [...d.ideas, { id: id(), text: idea.trim() }] }); setIdea(""); } }} />
      </div>
      {d.ideas.map((i) => (
        <div key={i.id} className="row">
          <span style={{ flex: 1 }}>{i.text}</span>
          <button title="Convertir en escena del tablero" onClick={() => save({ ideas: d.ideas.filter((x) => x.id !== i.id), escenas: [...d.escenas, { id: id(), title: i.text, goal: "", conflict: "", outcome: "" }] })}>→ Escena</button>
          <button aria-label="Quitar idea" onClick={() => save({ ideas: d.ideas.filter((x) => x.id !== i.id) })}>×</button>
        </div>
      ))}

      <h3>3 · Estructura</h3>
      <div className="row">
        {Object.keys(PLANTILLAS).map((k) => (
          <button key={k} onClick={() => save({ beats: PLANTILLAS[k].map((name) => ({ id: id(), name, text: "" })) })}>{k}</button>
        ))}
        <button onClick={() => save({ beats: [...d.beats, { id: id(), name: "Nuevo beat", text: "" }] })}>+ Beat</button>
      </div>
      {!d.beats.length && <p className="muted">Elige una plantilla para empezar (reemplaza los beats actuales).</p>}
      {d.beats.map((b, i) => (
        <div key={b.id} style={{ marginBottom: 8 }}>
          <div className="row" style={{ marginBottom: 4 }}>
            <input className="grow" value={b.name} aria-label="Nombre del beat" onChange={(e) => setBeat(b, { name: e.target.value })} style={{ fontWeight: 650 }} />
            <button aria-label="Subir" onClick={() => save({ beats: mover(d.beats, i, -1) })}>↑</button>
            <button aria-label="Bajar" onClick={() => save({ beats: mover(d.beats, i, 1) })}>↓</button>
            <button title="Crear escena en el tablero a partir de este beat" onClick={() => save({ escenas: [...d.escenas, { id: id(), title: b.name, goal: b.text, conflict: "", outcome: "", beat: b.id }] })}>→ Escena</button>
            <button aria-label="Quitar beat" onClick={() => save({ beats: d.beats.filter((x) => x.id !== b.id) })}>×</button>
          </div>
          <Area v={b.text} set={(text) => setBeat(b, { text })} ph="¿Qué ocurre aquí?" />
        </div>
      ))}

      <h3>4 · Tablero de escenas {d.escenas.length > 0 && <span className="muted">({pendientes} sin pasar al manuscrito)</span>}</h3>
      <div className="row"><button onClick={() => save({ escenas: [...d.escenas, { id: id(), title: "", goal: "", conflict: "", outcome: "" }] })}>+ Escena</button></div>
      {d.escenas.map((e, i) => {
        const beat = d.beats.find((b) => b.id === e.beat);
        return (
          <div key={e.id} style={{ marginBottom: 12, opacity: e.done ? 0.55 : 1 }}>
            <div className="row" style={{ marginBottom: 4 }}>
              <input className="grow" value={e.title} placeholder="Título de la escena" aria-label="Título de la escena" onChange={(ev) => setEsc(e, { title: ev.target.value })} style={{ fontWeight: 650 }} />
              {beat && <span className="chip">{beat.name}</span>}
              <button aria-label="Subir" onClick={() => save({ escenas: mover(d.escenas, i, -1) })}>↑</button>
              <button aria-label="Bajar" onClick={() => save({ escenas: mover(d.escenas, i, 1) })}>↓</button>
              <button disabled={e.done} title="Crea el capítulo (o la escena, en un guion) en el manuscrito con esta sinopsis" onClick={() => aEscena(e)}>{e.done ? "Creada" : "Al manuscrito"}</button>
              <button aria-label="Quitar escena" onClick={() => save({ escenas: d.escenas.filter((x) => x.id !== e.id) })}>×</button>
            </div>
            <Area v={e.goal} set={(goal) => setEsc(e, { goal })} ph="Objetivo: ¿qué quiere el personaje en esta escena?" />
            <Area v={e.conflict} set={(conflict) => setEsc(e, { conflict })} ph="Conflicto: ¿qué se lo impide?" />
            <Area v={e.outcome} set={(outcome) => setEsc(e, { outcome })} ph="Desenlace: ¿cómo termina y qué cambia?" />
          </div>
        );
      })}
    </div>
  );
}

export const borrador: ToolPlugin = { id: "borrador", name: "Borrador de historia", Panel };
