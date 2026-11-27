import { L } from "../_comun/idioma";
import { useEffect, useReducer, useState } from "react";
import { Mark } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { ask } from "../../../src/dialog";
import type { ToolPlugin } from "../types";

// Nota = marca sobre un tramo de texto; viaja en el HTML como <span data-nota="…"> (las exportaciones la ignoran).
const Nota = Mark.create({
  name: "nota",
  inclusive: false,
  addAttributes: () => ({ text: { default: "" } }),
  parseHTML: () => [{ tag: "span[data-nota]", getAttrs: (el) => ({ text: (el as HTMLElement).getAttribute("data-nota") ?? "" }) }],
  renderHTML: ({ HTMLAttributes }) => ["span", { "data-nota": HTMLAttributes.text, class: "nota", title: HTMLAttributes.text }, 0],
});

interface Item { from: number; to: number; text: string; quote: string }

function notas(editor: Editor): Item[] {
  const out: Item[] = [];
  editor.state.doc.descendants((n, pos) => {
    const m = n.marks.find((x) => x.type.name === "nota");
    if (!m) return;
    const last = out[out.length - 1];
    if (last && last.to === pos && last.text === m.attrs.text) { last.to = pos + n.nodeSize; last.quote += n.text ?? ""; }
    else out.push({ from: pos, to: pos + n.nodeSize, text: m.attrs.text, quote: n.text ?? "" });
  });
  return out;
}

function Overlay({ editor }: { editor: Editor }) {
  const [, force] = useReducer((x) => x + 1, 0);
  const [sel, setSel] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const f = () => {
      force();
      const { from, to, empty } = editor.state.selection;
      if (empty) return setSel(null);
      const c = editor.view.coordsAtPos(to);
      setSel({ x: c.right + 8, y: c.top - 4 });
      void from;
    };
    editor.on("update", f);
    editor.on("selectionUpdate", f);
    return () => { editor.off("update", f); editor.off("selectionUpdate", f); };
  }, [editor]);
  const list = notas(editor);
  return (
    <>
      {sel && (
        <button className="nota-btn" style={{ left: sel.x, top: sel.y }} onMouseDown={async (e) => {
          e.preventDefault();
          const text = await ask(L("Nota al margen", "Margin note"));
          if (text) editor.chain().focus().setMark("nota", { text }).run();
        }}>＋ {L("Nota", "Note")}</button>
      )}
      {list.length > 0 && (
        <aside className="fa-panel" aria-label={L("Notas al margen", "Margin notes")}>
          <b>{L("Notas", "Notes")}</b>
          {list.map((n, i) => (
            <div key={i} className="nota-item">
              <span className="muted">«{n.quote.slice(0, 40)}»</span>
              <span>{n.text}</span>
              <button onClick={() => editor.chain().focus().setTextSelection({ from: n.from, to: n.to }).unsetMark("nota").run()}>{L("Quitar", "Remove")}</button>
            </div>
          ))}
        </aside>
      )}
    </>
  );
}

export const notasMargen: ToolPlugin = { id: "notas-margen", name: "Notas al margen", extensions: () => [Nota], Overlay };
