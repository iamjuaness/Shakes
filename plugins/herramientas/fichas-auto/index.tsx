import { L } from "../_comun/idioma";
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
      on<Candidate>("new", (c) => { setCand({ ...c, notes: L(`Aparece en: «…${c.context}…»`, `Appears in: “…${c.context}…”`) }); setType(c.type); }),
      on<string>("open", setOpenId),
    ];
    return () => off.forEach((f) => f());
  }, []);

  const close = () => { setCand(null); editor.commands.focus(); };
  const card = host.cards.find((c) => c.id === openId);
  return (
    <>
      {sug && (
        <ul className="fa-suggest" style={{ left: sug.x, top: sug.y }} role="listbox" aria-label={L("Fichas parecidas", "Similar cards")}>
          {sug.items.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === sug.i} className={i === sug.i ? "on" : ""}
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().insertContentAt({ from: sug.from, to: sug.to }, c.name).run(); }}>
              {c.name}<span className="muted">{c.type}</span>
            </li>
          ))}
          <li className="hint muted">{L("Tab completa · Esc cierra", "Tab completes · Esc closes")}</li>
        </ul>
      )}
      {/* Aviso discreto, sin robar el teclado: antes era una ventana modal que se quedaba con el Intro a mitad de frase. */}
      {cand && (
        <div className="fa-toast" role="status" onMouseDown={(e) => e.preventDefault()}>
          <span>{L("¿Ficha para", "Card for")} «<b>{cand.name}</b>»?</span>
          <select aria-label={L("Tipo", "Type")} value={type} onMouseDown={(e) => e.stopPropagation()} onChange={(e) => setType(e.target.value as CardType)}>{TYPES.map((k) => <option key={k} value={k}>{host.t(`type.${k}`)}</option>)}</select>
          <button className="on" onClick={() => { host.addCard({ id: crypto.randomUUID(), type, name: cand.name, notes: cand.notes }); close(); }}>{L("Crear", "Create")}</button>
          <button aria-label={L("Ahora no", "Not now")} onClick={close}>×</button>
        </div>
      )}
      {card && (
        <aside className="fa-panel" aria-label={L(`Ficha de ${card.name}`, `Card of ${card.name}`)}>
          <div className="row"><b style={{ flex: 1 }}>{L("Ficha", "Card")}</b><button aria-label={L("Cerrar ficha", "Close card")} onClick={() => setOpenId(null)}>×</button></div>
          <input aria-label={L("Nombre", "Name")} value={card.name} onChange={(e) => host.patchCard(card.id, { name: e.target.value })} />
          <select aria-label={L("Tipo", "Type")} value={card.type} onChange={(e) => host.patchCard(card.id, { type: e.target.value as CardType })}>{TYPES.map((k) => <option key={k} value={k}>{host.t(`type.${k}`)}</option>)}</select>
          <textarea aria-label={L("Notas", "Notes")} value={card.notes} onChange={(e) => host.patchCard(card.id, { notes: e.target.value })} />
          {(card.links ?? []).map((l, i) => <span key={i} className="muted">{l.label} → {host.cards.find((c: Card) => c.id === l.to)?.name ?? L("(borrada)", "(deleted)")}</span>)}
          <button onClick={() => host.openCard(card.id)}>{L("Abrir ficha completa", "Open full card")}</button>
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
