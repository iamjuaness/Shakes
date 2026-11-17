import { Extension } from "@tiptap/react";
import { Plugin } from "@tiptap/pm/state";
import type { ToolPlugin } from "../types";

// Mantiene la línea que se escribe en el centro de la pantalla.
const Maquina = Extension.create({
  name: "maquinaEscribir",
  addProseMirrorPlugins() {
    return [new Plugin({
      view: (view) => {
        const box = view.dom.closest(".editor") as HTMLElement | null;
        if (box) box.style.paddingBottom = "45vh"; // sitio para poder centrar la última línea
        return {
          update(v, prev) {
            if (!box || v.state.doc.eq(prev.doc)) return;
            const c = v.coordsAtPos(v.state.selection.head);
            const r = box.getBoundingClientRect();
            box.scrollTop += c.top - (r.top + r.height / 2);
          },
          destroy() { if (box) box.style.paddingBottom = ""; },
        };
      },
    })];
  },
});

export const maquinaEscribir: ToolPlugin = { id: "maquina-escribir", name: "Máquina de escribir", extensions: () => [Maquina] };
