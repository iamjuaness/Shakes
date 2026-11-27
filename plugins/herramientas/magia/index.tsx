import { useState } from "react";
import { Cabecera, Campo, Lista } from "../_comun/formulario";
import type { ToolHost, ToolPlugin } from "../types";
import { Aviso, Hechizo, Sistema, idea, nuevoSistema, revisar } from "./logica";

const SECCIONES = ["base", "reglas", "hechizos", "usuarios", "mundo"] as const;
type Seccion = (typeof SECCIONES)[number];

function Panel({ host }: { host: ToolHost }) {
  const es = host.lang === "es";
  const L = (a: string, b: string) => (es ? a : b);
  const [sel, setSel] = useState("");
  const [seccion, setSeccion] = useState<Seccion>("base");
  const sistemas: Sistema[] = host.project.ext?.magia ?? [];
  const s = sistemas.find((x) => x.id === sel) ?? sistemas[0];
  const guardar = (l: Sistema[]) => host.setProject((p) => ({ ...p, ext: { ...p.ext, magia: l } }));
  const poner = (patch: Partial<Sistema>) => guardar(sistemas.map((x) => (x.id === s!.id ? { ...x, ...patch } : x)));

  const cabecera = (
    <Cabecera items={sistemas} actual={s} onSelect={setSel} onChange={guardar} crear={(id, n) => nuevoSistema(id, n, "sencillo")}
      textos={{ nuevo: L("+ Sistema", "+ System"), pedir: L("Nombre del sistema de magia", "Magic system name"), borrar: L("Borrar sistema", "Delete system"), nombre: L("Nombre del sistema", "System name"), confirmar: (n) => L(`¿Borrar el sistema «${n}»?`, `Delete the system “${n}”?`) }} />
  );
  if (!s) return <div className="panel relato">{cabecera}<p className="empty">{L("Crea un sistema de magia: sencillo para definir lo esencial, o complejo con reglas, escuelas, rangos, hechizos y usuarios.", "Create a magic system: simple for the essentials, or complex with rules, schools, ranks, spells and users.")}</p></div>;

  const complejo = s.nivel === "complejo";
  const visible: Seccion = complejo ? seccion : "base";
  const titulos: Record<Seccion, string> = { base: L("Fundamentos", "Basics"), reglas: L("Reglas", "Rules"), hechizos: L("Escuelas y hechizos", "Schools and spells"), usuarios: L("Rangos y usuarios", "Ranks and users"), mundo: L("En el mundo", "In the world") };
  const avisos = revisar(s).map((a: Aviso) =>
    a.tipo === "sinFuente" ? L("No está claro de dónde sale la magia.", "It is unclear where the magic comes from.")
    : a.tipo === "sinCoste" ? L("Sin coste: ¿qué impide usarla siempre y para todo?", "No cost: what stops people using it always, for everything?")
    : a.tipo === "sinLimites" ? L("Sin límites: la magia podrá resolver cualquier conflicto.", "No limits: magic could solve any conflict.")
    : a.tipo === "sinReglas" ? L("Magia dura sin reglas escritas: el lector no podrá anticipar cómo se resuelven las cosas.", "Hard magic without written rules: readers cannot anticipate solutions.")
    : !("nombre" in a) ? L("Sin debilidades: cuesta imaginar cómo vencer a quien la usa.", "No weaknesses: hard to see how a user can be beaten.")
    : a.tipo === "hechizoSinCoste" ? L(`El hechizo «${a.nombre || "sin nombre"}» no tiene coste propio.`, `Spell “${a.nombre || "unnamed"}” has no cost.`)
    : L(`La escuela «${a.nombre}» no tiene hechizos.`, `School “${a.nombre}” has no spells.`));
  const campo = (k: "concepto" | "fuente" | "activacion" | "coste" | "limites" | "quien" | "debilidades" | "consecuencias" | "sociedad" | "historia", label: string, ayuda: string, filas = 2) =>
    <Campo label={label} placeholder={ayuda} filas={filas} value={s[k]} onChange={(v) => poner({ [k]: v })} />;
  const opciones = (l: { id: string; nombre: string }[]): [string, string][] => [["", "—"], ...l.map((x): [string, string] => [x.id, x.nombre || "—"])];
  const personajes = host.cards.filter((c) => c.type === "character").map((c) => ({ id: c.id, nombre: c.name }));

  return (
    <div className="panel relato">
      {cabecera}
      <div className="row">
        <label className="fld">{L("Complejidad", "Complexity")}
          <select value={s.nivel} onChange={(e) => poner({ nivel: e.target.value as Sistema["nivel"] })}><option value="sencillo">{L("Sencillo", "Simple")}</option><option value="complejo">{L("Complejo", "Complex")}</option></select>
        </label>
        <label className="fld">{L("Blanda", "Soft")}
          <input type="range" min={0} max={100} step={5} value={s.dureza} aria-label={L("Dureza", "Hardness")} onChange={(e) => poner({ dureza: Number(e.target.value) })} />
          {L("Dura", "Hard")} ({s.dureza})
        </label>
        <span className="spacer" />
        <button onClick={() => poner(idea(s, es))} title={L("Rellena solo los campos vacíos", "Fills only empty fields")}>{L("Idea al azar", "Random idea")}</button>
      </div>
      <p className="muted">{s.dureza >= 60 ? L("Con reglas claras: sirve para resolver conflictos, porque el lector entiende qué se puede y qué no.", "Clear rules: it can solve conflicts, because readers know what is possible.")
        : s.dureza <= 30 ? L("Misteriosa: da asombro y crea problemas; evita que resuelva el conflicto principal.", "Mysterious: it gives wonder and creates problems; avoid letting it solve the main conflict.")
        : L("Intermedia: explica lo que los personajes usan para resolver cosas y deja el resto en misterio.", "In between: explain what characters use to solve things and leave the rest mysterious.")}</p>

      {complejo && (
        <div className="row seg" role="tablist">
          {SECCIONES.map((x) => <button key={x} role="tab" aria-selected={x === visible} className={x === visible ? "on" : ""} onClick={() => setSeccion(x)}>{titulos[x]}</button>)}
        </div>
      )}
      {avisos.length > 0 && <ul className="avisos">{avisos.map((a, k) => <li key={k}>{a}</li>)}</ul>}

      {visible === "base" && (
        <>
          {campo("concepto", L("Idea en una frase", "One-line concept"), L("Quien sangra puede doblar el metal.", "Those who bleed can bend metal."))}
          <div className="columnas">
            {campo("fuente", L("Fuente", "Source"), L("¿De dónde sale el poder?", "Where does the power come from?"), 3)}
            {campo("activacion", L("Cómo se usa", "How it is used"), L("Gestos, palabras, objetos…", "Gestures, words, objects…"), 3)}
            {campo("coste", L("Coste", "Cost"), L("¿Qué se paga cada vez?", "What is paid each time?"), 3)}
            {campo("limites", L("Límites", "Limits"), L("¿Qué no puede hacer nunca?", "What can it never do?"), 3)}
            {campo("quien", L("Quién puede usarla", "Who can use it"), L("¿Se nace, se aprende, se compra?", "Born, learned, bought?"), 3)}
            {campo("debilidades", L("Debilidades", "Weaknesses"), L("¿Cómo se la contrarresta?", "How is it countered?"), 3)}
          </div>
        </>
      )}
      {visible === "reglas" && (
        <Lista items={s.reglas} onChange={(reglas) => poner({ reglas })} anadir={L("+ Regla", "+ Rule")} quitar={L("Quitar regla", "Remove rule")}
          nuevo={() => ({ id: crypto.randomUUID(), texto: "" })} columnas={[{ key: "texto", label: L("Regla que la magia nunca rompe", "Rule the magic never breaks") }]} />
      )}
      {visible === "hechizos" && (
        <>
          <h3>{L("Escuelas o ramas", "Schools or branches")}</h3>
          <Lista items={s.escuelas} onChange={(escuelas) => poner({ escuelas })} anadir={L("+ Escuela", "+ School")} quitar={L("Quitar escuela", "Remove school")}
            nuevo={() => ({ id: crypto.randomUUID(), nombre: "", descripcion: "" })} columnas={[{ key: "nombre", label: L("Nombre", "Name") }, { key: "descripcion", label: L("Qué domina", "What it controls") }]} />
          <h3>{L("Hechizos o habilidades", "Spells or abilities")}</h3>
          <Lista<Hechizo> items={s.hechizos} onChange={(hechizos) => poner({ hechizos })} anadir={L("+ Hechizo", "+ Spell")} quitar={L("Quitar hechizo", "Remove spell")}
            nuevo={() => ({ id: crypto.randomUUID(), nombre: "", escuela: "", rango: "", efecto: "", coste: "" })}
            columnas={[{ key: "nombre", label: L("Nombre", "Name") }, { key: "escuela", label: L("Escuela", "School"), opciones: opciones(s.escuelas) }, { key: "rango", label: L("Rango", "Rank"), opciones: opciones(s.rangos) }, { key: "efecto", label: L("Efecto", "Effect") }, { key: "coste", label: L("Coste", "Cost") }]} />
        </>
      )}
      {visible === "usuarios" && (
        <>
          <h3>{L("Rangos, de menor a mayor", "Ranks, lowest to highest")}</h3>
          <Lista items={s.rangos} onChange={(rangos) => poner({ rangos })} anadir={L("+ Rango", "+ Rank")} quitar={L("Quitar rango", "Remove rank")}
            nuevo={() => ({ id: crypto.randomUUID(), nombre: "", requisitos: "", capacidades: "" })} columnas={[{ key: "nombre", label: L("Nombre", "Name") }, { key: "requisitos", label: L("Cómo se alcanza", "How to reach it") }, { key: "capacidades", label: L("Qué permite", "What it allows") }]} />
          <h3>{L("Personajes que la usan", "Characters who use it")}</h3>
          {personajes.length ? (
            <Lista items={s.usuarios} onChange={(usuarios) => poner({ usuarios })} anadir={L("+ Usuario", "+ User")} quitar={L("Quitar usuario", "Remove user")}
              nuevo={() => ({ id: crypto.randomUUID(), card: personajes[0].id, escuela: "", rango: "", nota: "" })}
              columnas={[{ key: "card", label: L("Personaje", "Character"), opciones: opciones(personajes) }, { key: "escuela", label: L("Escuela", "School"), opciones: opciones(s.escuelas) }, { key: "rango", label: L("Rango", "Rank"), opciones: opciones(s.rangos) }, { key: "nota", label: L("Nota", "Note") }]} />
          ) : <p className="muted">{L("Crea fichas de personaje para asignarlas aquí.", "Create character cards to assign them here.")}</p>}
        </>
      )}
      {visible === "mundo" && (
        <>
          {campo("consecuencias", L("Consecuencias", "Consequences"), L("¿Qué pasa si se abusa o se falla?", "What happens on abuse or failure?"), 4)}
          {campo("sociedad", L("Sociedad, leyes y economía", "Society, law and economy"), L("¿Quién la controla, la prohíbe o se enriquece?", "Who controls, bans or profits from it?"), 4)}
          {campo("historia", L("Historia y mitos", "History and myths"), L("¿Cómo se descubrió? ¿Qué se cree que es falso?", "How was it found? What is wrongly believed?"), 4)}
        </>
      )}
    </div>
  );
}

export const magia: ToolPlugin = { id: "magia", name: "Sistemas de magia", Panel };
