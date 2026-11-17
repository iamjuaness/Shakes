import { printHtml } from "../../../src/export";
import { guardar } from "../_comun/guardar";
import type { ToolPlugin } from "../types";
import { toFountain, toLatex } from "./formatos";

export const exportarExtra: ToolPlugin = {
  id: "exportar-extra",
  name: "Exportar: Fountain, LaTeX, HTML",
  actions: [
    { label: "Exportar Fountain (.fountain)", run: (h) => guardar(`${h.scope.title}.fountain`, toFountain(h.scope), "text/plain") },
    { label: "Exportar LaTeX (.tex)", run: (h) => guardar(`${h.scope.title}.tex`, toLatex(h.scope), "application/x-tex") },
    { label: "Exportar HTML (.html)", run: (h) => guardar(`${h.scope.title}.html`, printHtml(h.scope), "text/html") },
  ],
};
