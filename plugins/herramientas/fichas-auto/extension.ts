// Extensión TipTap de «Fichas automáticas»: resalta nombres de fichas, sugiere mientras se escribe y detecta nombres nuevos.
import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Named, candidates, findRefs, fold, prefixAt, suggest } from "./detect.ts";

export interface SuggestState { items: Named[]; from: number; to: number; i: number; x: number; y: number }
// La extensión avisa a la interfaz (Overlay) por este bus; solo hay un editor activo a la vez.
export const bus = new EventTarget();
const emit = (type: string, detail: unknown) => bus.dispatchEvent(new CustomEvent(type, { detail }));

const key = new PluginKey<DecorationSet>("fichasAuto");
const asked = new Set<string>(); // nombres ya ofrecidos en esta sesión: no se vuelve a preguntar
export const rejectName = (name: string) => asked.add(fold(name));
export const refresh = (view: EditorView) => view.dispatch(view.state.tr.setMeta(key, true));

export const FichasAuto = Extension.create<{ getCards: () => Named[] }>({
  name: "fichasAuto",
  addOptions: () => ({ getCards: () => [] }),
  addProseMirrorPlugins() {
    const { getCards } = this.options;
    let sug: SuggestState | null = null;
    const show = (s: SuggestState | null) => { sug = s; emit("suggest", s); };

    const build = (doc: Parameters<typeof DecorationSet.create>[0]) => {
      const decos: Decoration[] = [];
      doc.descendants((node, pos) => {
        if (!node.isTextblock) return true;
        const text = node.textBetween(0, node.content.size, undefined, "￼");
        for (const r of findRefs(text, getCards())) decos.push(Decoration.inline(pos + 1 + r.from, pos + 1 + r.to, { class: "ficha-ref", "data-ficha": r.id }));
        return false;
      });
      return DecorationSet.create(doc, decos);
    };

    return [new Plugin({
      key,
      state: { init: (_, s) => build(s.doc), apply: (tr, old) => (tr.docChanged || tr.getMeta(key) ? build(tr.doc) : old) },
      props: {
        decorations: (s) => key.getState(s),
        handleClick: (_v, _p, e) => {
          const id = (e.target as HTMLElement).closest?.("[data-ficha]")?.getAttribute("data-ficha");
          if (id) emit("open", id);
          return false;
        },
        handleKeyDown: (view, e) => {
          if (!sug) return false;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            show({ ...sug, i: (sug.i + (e.key === "ArrowDown" ? 1 : sug.items.length - 1)) % sug.items.length });
            return true;
          }
          if (e.key === "Tab") {
            view.dispatch(view.state.tr.insertText(sug.items[sug.i].name, sug.from, sug.to));
            show(null);
            return true;
          }
          if (e.key === "Escape") { show(null); return true; }
          return false;
        },
      },
      view: () => ({
        update(view, prev) {
          const { selection: sel, doc } = view.state;
          if (doc.eq(prev.doc)) { if (!sel.eq(prev.selection)) show(null); return; }
          if (!sel.empty) return show(null);
          const before = sel.$from.parent.textBetween(0, sel.$from.parentOffset, undefined, "￼");
          const cards = getCards();
          const p = prefixAt(before);
          const items = p ? suggest(p.text, cards) : [];
          if (p && items.length) {
            const c = view.coordsAtPos(sel.from);
            return show({ items, from: sel.from - (before.length - p.start), to: sel.from, i: 0, x: c.right + 10, y: c.top });
          }
          show(null);
          // Nombre nuevo: solo al cerrar la palabra (espacio o puntuación) y si no se parece a una ficha existente.
          if (!/[\s.,;:!?)»"]$/.test(before)) return;
          const done = before.replace(/[\s.,;:!?)»"]+$/, "");
          const c = candidates(done, cards, asked).find((x) => done.endsWith(x.name) && !suggest(x.name, cards, 1).length);
          if (c) { rejectName(c.name); emit("new", c); }
        },
        destroy: () => show(null),
      }),
    })];
  },
});
