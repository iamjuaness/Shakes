import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { CARD_TYPES } from "../../../src/tree";
import type { Card, CardType } from "../../../src/tree";
import type { ToolHost, ToolPlugin } from "../types";
import type { Candidate } from "./detect.ts";
import { FichasAuto, SuggestState, bus, refresh } from "./extension.ts";

const TYPES: CardType[] = CARD_TYPES;
const on = <T,>(type: string, f: (d: T) => void) => {
  const h = (e: Event) => f((e as CustomEvent<T>).detail);
  bus.addEventListener(type, h);
  return () => bus.removeEventListener(type, h);
};

function Overlay({ editor, host }: { editor: Editor; host: ToolHost }) {
  const [sug, setSug] = useState<SuggestState | null>(null);
  const [cand, setCand] = useState<(Candidate & { notes: string }) | null>(null);
  const [type, setType] = useState<CardType>("character");
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => {
    const off = [
      on<SuggestState | null>("suggest", setSug),
      on<Candidate>("new", (c) => { setCand({ ...c, notes: `Aparece en: «…${c.context}…»` }); setType(c.type); }),
      on<string>("open", setOpenId),
    ];
    return () => off.forEach((f) => f());
  }, []);

  const close = () => { setCand(null); editor.commands.focus(); };
  const card = host.cards.find((c) => c.id === openId);
  return (
    <>
      {sug && (
        <ul className="fa-suggest" style={{ left: sug.x, top: sug.y }} role="listbox" aria-label="Fichas parecidas">
          {sug.items.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === sug.i} className={i === sug.i ? "on" : ""}
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().insertContentAt({ from: sug.from, to: sug.to }, c.name).run(); }}>
              {c.name}<span className="muted">{c.type}</span>
            </li>
          ))}
          <li className="hint muted">Tab completa · Esc cierra</li>
        </ul>
      )}
      {cand && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div className="dialog" role="dialog" aria-modal="true" onKeyDown={(e) => e.key === "Escape" && close()}>
            <p>¿Crear una ficha para «<b>{cand.name}</b>»?</p>
            <select aria-label="Tipo" value={type} onChange={(e) => setType(e.target.value as CardType)}>{TYPES.map((k) => <option key={k} value={k}>{host.t(`type.${k}`)}</option>)}</select>
            <textarea aria-label="Notas" rows={4} value={cand.notes} onChange={(e) => setCand({ ...cand, notes: e.target.value })} />
            <div className="row">
              <button autoFocus className="on" onClick={() => { host.addCard({ id: crypto.randomUUID(), type, name: cand.name, notes: cand.notes }); close(); }}>Crear ficha</button>
              <button onClick={close}>Ahora no</button>
            </div>
          </div>
        </div>
      )}
      {card && (
        <aside className="fa-panel" aria-label={`Ficha de ${card.name}`}>
          <div className="row"><b style={{ flex: 1 }}>Ficha</b><button aria-label="Cerrar ficha" onClick={() => setOpenId(null)}>×</button></div>
          <input aria-label="Nombre" value={card.name} onChange={(e) => host.patchCard(card.id, { name: e.target.value })} />
          <select aria-label="Tipo" value={card.type} onChange={(e) => host.patchCard(card.id, { type: e.target.value as CardType })}>{TYPES.map((k) => <option key={k} value={k}>{host.t(`type.${k}`)}</option>)}</select>
          <textarea aria-label="Notas" value={card.notes} onChange={(e) => host.patchCard(card.id, { notes: e.target.value })} />
          {(card.links ?? []).map((l, i) => <span key={i} className="muted">{l.label} → {host.cards.find((c: Card) => c.id === l.to)?.name ?? "(borrada)"}</span>)}
          <button onClick={() => host.openCard(card.id)}>Abrir ficha completa</button>
        </aside>
      )}
    </>
  );
}

export const fichasAuto: ToolPlugin = {
  id: "fichas-auto",
  name: "Fichas automáticas",
  extensions: (host) => [FichasAuto.configure({ getCards: () => host().cards })],
  refresh: (editor) => refresh(editor.view),
  Overlay,
};
