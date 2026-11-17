import { useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { ACEPTA, Kind, Node } from "./tree";
import { ask, confirmAsk } from "./dialog";

interface Props {
  book: Node;
  selected: string;
  onSelect: (id: string) => void;
  onAdd: (id: string, kind?: Kind) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onMove: (id: string, targetId: string) => void;
  onShift: (id: string, dir: -1 | 1) => void;
}

// Árbol del manuscrito: arrastrar con ratón; con teclado ↑↓ navegar, ←→ plegar, F2 renombrar, Supr eliminar, Alt+↑↓ reordenar.
const NOM: Record<Kind, string> = { blank: "proyecto", universe: "universo", saga: "saga", book: "libro", part: "parte", chapter: "capítulo", scene: "escena" };

export default function Tree(p: Props) {
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setClosed((s) => { const n = new Set(s); if (!n.delete(id)) n.add(id); return n; });

  async function rename(n: Node) {
    const t = await ask("Nuevo título", n.title);
    if (t?.trim()) p.onRename(n.id, t.trim());
  }
  async function del(n: Node) {
    const raiz = n.id === p.book.id;
    if (await confirmAsk(raiz ? `¿Vaciar el proyecto? Se elimina "${n.title}" y todo su contenido; queda una raíz en blanco. Se guarda una copia antes.` : `¿Eliminar "${n.title}" y todo su contenido? Se guarda una copia antes.`)) p.onRemove(n.id);
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>, n: Node) {
    const el = e.currentTarget;
    const items = [...el.closest<HTMLElement>("[role=tree]")!.querySelectorAll<HTMLElement>(".item")];
    const go = (t?: HTMLElement | null) => { if (t) { t.focus(); t.click(); } };
    const parent = el.parentElement?.parentElement?.parentElement?.querySelector<HTMLElement>(":scope > .item");
    const k = e.key;
    if (e.altKey && (k === "ArrowUp" || k === "ArrowDown")) p.onShift(n.id, k === "ArrowUp" ? -1 : 1);
    else if (k === "ArrowDown") go(items[items.indexOf(el) + 1]);
    else if (k === "ArrowUp") go(items[items.indexOf(el) - 1]);
    else if (k === "ArrowRight") { if (n.children.length && closed.has(n.id)) toggle(n.id); else go(el.nextElementSibling?.querySelector<HTMLElement>(".item")); }
    else if (k === "ArrowLeft") { if (n.children.length && !closed.has(n.id)) toggle(n.id); else go(parent); }
    else if (k === "Enter" || k === " ") p.onSelect(n.id);
    else if (k === "F2") rename(n);
    else if (k === "Delete") del(n);
    else return;
    e.preventDefault();
  }

  const item = (n: Node, level: number): ReactNode => {
    const open = !closed.has(n.id);
    return (
      <li key={n.id} role="none">
        <div
          role="treeitem"
          aria-level={level}
          aria-selected={n.id === p.selected}
          aria-expanded={n.children.length ? open : undefined}
          tabIndex={n.id === p.selected ? 0 : -1}
          className={`item ${n.kind} ${n.id === p.selected ? "active" : ""}`}
          onClick={() => p.onSelect(n.id)}
          onKeyDown={(e) => onKey(e, n)}
          draggable={n.id !== p.book.id}
          onDragStart={(e) => e.dataTransfer.setData("text/plain", n.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); p.onMove(e.dataTransfer.getData("text/plain"), n.id); }}
        >
          {n.children.length ? (
            <button className={`caret ${open ? "open" : ""}`} tabIndex={-1} aria-label={open ? "Plegar" : "Desplegar"} onClick={(e) => { e.stopPropagation(); toggle(n.id); }} />
          ) : <span className="caret" />}
          <span className="label" onDoubleClick={() => rename(n)}>{n.title}</span>
          <span className="actions">
            {ACEPTA[n.kind].map((k, _i, a) => <button key={k} className={a.length > 1 ? "txt" : undefined} tabIndex={-1} title={`Añadir ${NOM[k]}`} aria-label={`Añadir ${NOM[k]}`} onClick={(e) => { e.stopPropagation(); p.onAdd(n.id, k); }}>{a.length > 1 ? `+${NOM[k]}` : "+"}</button>)}
            {<button tabIndex={-1} title="Eliminar" onClick={(e) => { e.stopPropagation(); del(n); }}>×</button>}
          </span>
        </div>
        {n.children.length > 0 && open && <ul role="group">{n.children.map((c) => item(c, level + 1))}</ul>}
      </li>
    );
  };

  return <ul className="tree" role="tree" aria-label="Manuscrito">{item(p.book, 1)}</ul>;
}
