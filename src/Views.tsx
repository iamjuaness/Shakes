import { useRef, useState } from "react";
import type { PointerEvent } from "react";
import { Card, CardType, Node, Project, Style, analyze, chronological, countWords, dialogueShare, diffVersions, mentions, plainText, scenes, search, today, writtenOn } from "./tree";
import { ask, confirmAsk } from "./dialog";

// ---------- Línea de tiempo ----------
export function Timeline({ book, onSelect, onDate }: { book: Node; onSelect: (id: string) => void; onDate: (id: string, date: string) => void }) {
  const [chrono, setChrono] = useState(false);
  const list = scenes(book);
  const shown = chrono ? chronological(list) : list;
  return (
    <div className="panel">
      <div className="row">
        <button className={!chrono ? "on" : ""} onClick={() => setChrono(false)}>Narrativa</button>
        <button className={chrono ? "on" : ""} onClick={() => setChrono(true)}>Cronológica</button>
        <span className="muted">Cambia la fecha de cada escena aquí mismo. Las escenas sin fecha van al final.</span>
      </div>
      <ol className="timeline">
        {shown.map(({ scene, path }) => (
          <li key={scene.id} onClick={() => onSelect(scene.id)}>
            <div className="tl-row">
              <b>{scene.title}</b>
              <input type="date" aria-label={`Fecha de ${scene.title}`} value={scene.date ?? ""} onClick={(e) => e.stopPropagation()} onChange={(e) => onDate(scene.id, e.target.value)} />
            </div>
            <span className="muted">{path} · {countWords(scene.content)} palabras</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------- Mapa de relaciones (nodos arrastrables, relaciones con flecha) ----------
interface Drag { id: string; ox: number; oy: number; px: number; py: number; x: number; y: number }

export function RelationMap({ cards, onSelect, onMove }: { cards: Card[]; onSelect: (id: string) => void; onMove: (id: string, x: number, y: number) => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const R = 190, C = 250, r = 24;
  const base = (c: Card, i: number) => {
    if (c.x !== undefined && c.y !== undefined) return { x: c.x, y: c.y };
    const a = (2 * Math.PI * i) / cards.length - Math.PI / 2;
    return { x: C + R * Math.cos(a), y: C + R * Math.sin(a) };
  };
  const pos = new Map(cards.map((c, i) => [c.id, drag?.id === c.id ? { x: drag.x, y: drag.y } : base(c, i)]));
  const pt = (e: PointerEvent) => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };
  const clamp = (v: number) => Math.min(475, Math.max(25, v));
  if (!cards.length) return <p className="empty">Crea fichas y relaciónalas para ver el mapa.</p>;
  return (
    <>
      <p className="muted hint">Arrastra los nodos para ordenar el mapa. Clic para abrir la ficha.</p>
      <svg
        ref={svg}
        className="map"
        viewBox="0 0 500 500"
        onPointerMove={(e) => { if (drag) { const p = pt(e); setDrag({ ...drag, x: clamp(p.x + drag.ox), y: clamp(p.y + drag.oy) }); } }}
        onPointerUp={() => {
          if (!drag) return;
          if (Math.hypot(drag.x - (drag.px + drag.ox), drag.y - (drag.py + drag.oy)) > 4) onMove(drag.id, Math.round(drag.x), Math.round(drag.y));
          else onSelect(drag.id);
          setDrag(null);
        }}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0L10 5L0 10z" fill="var(--muted)" />
          </marker>
        </defs>
        {cards.flatMap((c) => (c.links ?? []).map((l, i) => {
          const a = pos.get(c.id)!, b = pos.get(l.to);
          if (!b) return null;
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          if (len < 2 * r) return null;
          const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
          return (
            <g key={c.id + l.to + i}>
              <line x1={a.x + ux * r} y1={a.y + uy * r} x2={b.x - ux * (r + 2)} y2={b.y - uy * (r + 2)} stroke="var(--muted)" markerEnd="url(#arrow)" />
              <text className="edge" x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} textAnchor="middle">{l.label}</text>
            </g>
          );
        }))}
        {cards.map((c) => {
          const p = pos.get(c.id)!;
          return (
            <g
              key={c.id}
              className="node"
              onPointerDown={(e) => {
                const s = pt(e);
                setDrag({ id: c.id, ox: p.x - s.x, oy: p.y - s.y, px: s.x, py: s.y, x: p.x, y: p.y });
                try { svg.current!.setPointerCapture(e.pointerId); } catch {} // sigue el arrastre fuera del nodo
              }}
            >
              <circle cx={p.x} cy={p.y} r={r} fill="var(--accent)" />
              <text className="name" x={p.x} y={p.y + r + 14} textAnchor="middle">{c.name}</text>
            </g>
          );
        })}
      </svg>
    </>
  );
}

// ---------- Estilo y progreso ----------
const level = (n: number) => (n < 40 ? "muy difícil" : n < 55 ? "algo difícil" : n < 65 ? "normal" : n < 80 ? "bastante fácil" : "muy fácil");

function Stats({ s, dialogue }: { s: Style; dialogue: number }) {
  const m: [string, string | number][] = [
    ["palabras", s.words], ["frases", s.sentences], ["palabras por frase", s.avgSentence], ["frase más larga", s.longest],
    ["adverbios en -mente", s.adverbs], ["diálogo", dialogue + " %"], [`legibilidad · ${level(s.readability)}`, s.readability],
  ];
  return (
    <>
      <div className="stats">{m.map(([l, v]) => <div className="stat" key={l}><b>{v}</b><span>{l}</span></div>)}</div>
      <p className="muted">Más repetidas (sin nombres de fichas)</p>
      <div className="chips">{s.top.map(([w, n]) => <span className="chip" key={w}>{w} · {n}</span>) || null}</div>
      {s.near.length > 0 && (
        <>
          <p className="muted">Repeticiones cercanas (misma palabra a menos de 25 palabras)</p>
          <div className="chips">{s.near.map(([w, n]) => <span className="chip warnchip" key={w}>{w} · {n}</span>)}</div>
        </>
      )}
    </>
  );
}

export function Analysis({ book, current, cards, project, onDailyGoal }: { book: Node; current?: Node; cards: Card[]; project: Project; onDailyGoal: () => void }) {
  const names = cards.map((c) => c.name);
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toLocaleDateString("sv"); });
  const max = Math.max(project.dailyGoal, 1, ...days.map((d) => writtenOn(project.log, d)));
  return (
    <div className="panel">
      <div className="row"><h3 style={{ margin: 0 }}>Progreso diario</h3><span className="spacer" /><button onClick={onDailyGoal}>{project.dailyGoal ? `Meta diaria: ${project.dailyGoal}` : "Fijar meta diaria"}</button></div>
      <div className="days">
        {days.filter((d) => d === today() || project.log[d]).map((d) => {
          const n = writtenOn(project.log, d);
          return (
            <div className="day" key={d}>
              <span className="muted">{d === today() ? "Hoy" : d}</span>
              <div className="bar"><i style={{ width: `${(n / max) * 100}%` }} className={project.dailyGoal && n >= project.dailyGoal ? "done" : ""} /></div>
              <span>{n}</span>
            </div>
          );
        })}
      </div>
      <h3>Libro completo</h3>
      <Stats s={analyze(plainText(book), names)} dialogue={dialogueShare(book)} />
      {current && current.kind !== "book" && (
        <>
          <h3>{current.title}</h3>
          <Stats s={analyze(plainText(current), names)} dialogue={dialogueShare(current)} />
        </>
      )}
    </div>
  );
}

// ---------- Versiones (con comparación contra el texto actual) ----------
export function Versions({ project, onSave, onRestore, onDelete }: {
  project: Project;
  onSave: (label: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="panel">
      <button onClick={async () => { const l = await ask("Nombre de la versión", new Date().toLocaleString()); if (l !== null) onSave(l); }}>Guardar versión</button>
      <ul className="versions">
        {project.versions.map((v) => {
          const d = open === v.id ? diffVersions(v.book, project.book) : null;
          return (
            <li key={v.id}>
              <div className="v-head">
                <span>{v.label || "Sin nombre"}{v.auto && <em className="muted"> · automática</em>}<span className="muted">{new Date(v.at).toLocaleString()}</span></span>
                <button onClick={() => setOpen(open === v.id ? null : v.id)}>{d ? "Ocultar" : "Comparar"}</button>
                <button onClick={async () => (await confirmAsk("¿Restaurar esta versión? Antes se guarda una copia del estado actual.")) && onRestore(v.id)}>Restaurar</button>
                <button aria-label="Eliminar versión" onClick={async () => (await confirmAsk("¿Eliminar esta versión?")) && onDelete(v.id)}>×</button>
              </div>
              {d && (
                <div className="diff">
                  <p>Frente al texto actual: <b>{d.wordDelta >= 0 ? "+" : ""}{d.wordDelta}</b> palabras</p>
                  {([["Cambiadas", d.changed], ["Añadidas después", d.added], ["Eliminadas después", d.removed]] as const).map(([l, list]) =>
                    list.length > 0 && <p key={l}><b>{l}:</b> {list.map((s) => s.scene.title).join(", ")}</p>)}
                  {!d.changed.length && !d.added.length && !d.removed.length && <p className="muted">Sin diferencias en las escenas.</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {!project.versions.length && <p className="muted">Sin versiones guardadas.</p>}
    </div>
  );
}

// ---------- Corcho ----------
export function Corkboard({ book, onSelect, onSummary }: { book: Node; onSelect: (id: string) => void; onSummary: (id: string, text: string) => void }) {
  const list = scenes(book);
  if (!list.length) return <p className="empty">Aún no hay escenas.</p>;
  return (
    <div className="cork">
      {list.map(({ scene, path }) => (
        <div className="note" key={scene.id}>
          <button className="linklike" onClick={() => onSelect(scene.id)}>{scene.title}</button>
          <span className="muted">{path}</span>
          <textarea aria-label={`Sinopsis de ${scene.title}`} placeholder="Sinopsis…" value={scene.summary ?? ""} onChange={(e) => onSummary(scene.id, e.target.value)} />
          <span className="muted">{countWords(scene.content)}{scene.goal ? ` / ${scene.goal}` : ""} palabras{scene.date ? ` · ${scene.date}` : ""}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Búsqueda global ----------
export function SearchPanel({ book, onOpen, onReplace }: { book: Node; onOpen: (id: string) => void; onReplace: (q: string, r: string) => void }) {
  const [q, setQ] = useState("");
  const [r, setR] = useState("");
  const hits = search(book, q);
  const total = hits.reduce((t, h) => t + h.count, 0);
  return (
    <div className="panel">
      <div className="row">
        <input type="text" autoFocus placeholder="Buscar en todo el libro…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
        <input type="text" placeholder="Reemplazar por…" value={r} onChange={(e) => setR(e.target.value)} style={{ flex: 1 }} />
        <button disabled={!total} onClick={() => onReplace(q, r)}>Reemplazar todo</button>
      </div>
      {q && <p className="muted">{total} coincidencias en {hits.length} escenas</p>}
      <ul className="hits">
        {hits.map((h) => (
          <li key={h.scene.id} onClick={() => onOpen(h.scene.id)}>
            <b>{h.scene.title}</b> <span className="chip">{h.count}</span>
            <div className="muted">{h.path}</div>
            <div>{h.snippet}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Ficha ----------
export function CardForm({ card, cards, book, onPatch, onDelete, onOpenScene, onBack }: {
  card: Card;
  cards: Card[];
  book: Node;
  onPatch: (p: Partial<Card>) => void;
  onDelete: () => void;
  onOpenScene: (id: string) => void;
  onBack?: () => void;
}) {
  const where = mentions(book, card.name, card.alias);
  return (
    <div className="card-form">
      <input aria-label="Nombre" value={card.name} onChange={(e) => onPatch({ name: e.target.value })} />
      <select aria-label="Tipo" value={card.type} onChange={(e) => onPatch({ type: e.target.value as CardType })}>
        {["Personaje", "Lugar", "Objeto", "Facción"].map((t) => <option key={t}>{t}</option>)}
      </select>
      <input aria-label="Apodos" placeholder="Apodos o nombres cortos, separados por comas (Vero, Véronique)" value={card.alias ?? ""} onChange={(e) => onPatch({ alias: e.target.value })} />
      <textarea placeholder="Notas…" value={card.notes} onChange={(e) => onPatch({ notes: e.target.value })} />
      <div className="links">
        <b>Relaciones</b>
        {(card.links ?? []).map((l, i) => (
          <div key={i} className="row">
            {cards.find((c) => c.id === l.to)?.name ?? "(borrada)"} — {l.label}
            <button aria-label="Quitar relación" onClick={() => onPatch({ links: (card.links ?? []).filter((_, j) => j !== i) })}>×</button>
          </div>
        ))}
        <select value="" aria-label="Relacionar con" onChange={async (e) => {
          const to = e.target.value;
          const label = to ? await ask("Tipo de relación (ej. hermano de, vive en)") : null;
          if (to && label) onPatch({ links: [...(card.links ?? []), { to, label }] });
        }}>
          <option value="">+ Relacionar con…</option>
          {cards.filter((c) => c.id !== card.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="links">
        <b>Aparece en</b>
        {where.length ? (
          <div className="chips">{where.map(({ scene }) => <button key={scene.id} className="chip" onClick={() => onOpenScene(scene.id)}>{scene.title}</button>)}</div>
        ) : <span className="muted">Ninguna escena menciona «{card.name}».</span>}
      </div>
      {onBack && <button onClick={onBack}>← Volver al mapa</button>}
      <button onClick={onDelete}>Eliminar ficha</button>
    </div>
  );
}
