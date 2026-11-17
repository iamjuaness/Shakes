import { Extension } from "@tiptap/react";
import { Plugin } from "@tiptap/pm/state";
import type { ToolPlugin } from "../types";
import { tipografia } from "./tipografia";

const Dialogo = Extension.create({
  name: "dialogoAuto",
  addProseMirrorPlugins() {
    return [new Plugin({
      props: {
        handleTextInput(view, from, to, text) {
          const $f = view.state.doc.resolve(from);
          const before = $f.parent.textBetween(0, $f.parentOffset, undefined, "￼");
          const r = tipografia(before, text);
          if (!r) return false;
          view.dispatch(view.state.tr.insertText(r.texto, from - r.borrar, to));
          return true;
        },
      },
    })];
  },
});

export const dialogoAuto: ToolPlugin = { id: "dialogo-auto", name: "Diálogo y comillas", extensions: () => [Dialogo] };
