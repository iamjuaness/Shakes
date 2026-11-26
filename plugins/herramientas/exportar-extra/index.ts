import { printHtml } from "../../../src/export";
import { guardar } from "../_comun/guardar";
import type { ToolPlugin } from "../types";
import { toFountain, toLatex } from "./formatos";

export const exportarExtra: ToolPlugin = {
  id: "exportar-extra",
  name: "Exportar: Fountain, LaTeX, HTML",
  actions: [
    // Un guion tiene su propio Fountain (plugin Guion), con los elementos de guion; este es para novelas.
    { label: "Exportar Fountain (.fountain)", run: (h) => (h.scope.kind === "script" ? h.notify("Para un guion usa «Exportar guion (Fountain)…».") : guardar(`${h.scope.title}.fountain`, toFountain(h.scope), "text/plain")) },
    { label: "Exportar LaTeX (.tex)", run: (h) => guardar(`${h.scope.title}.tex`, toLatex(h.scope), "application/x-tex") },
    { label: "Exportar HTML (.html)", run: (h) => guardar(`${h.scope.title}.html`, printHtml(h.scope), "text/html") },
  ],
};
