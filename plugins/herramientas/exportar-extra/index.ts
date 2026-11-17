import { printHtml } from "../../../src/export";
import { guardar } from "../_comun/guardar";
import type { ToolPlugin } from "../types";
import { toFountain, toLatex } from "./formatos";

export const exportarExtra: ToolPlugin = {
  id: "exportar-extra",
  name: "Exportar: Fountain, LaTeX, HTML",
  actions: [
    { label: "Exportar Fountain (.fountain)", run: (h) => guardar(`${h.project.book.title}.fountain`, toFountain(h.project.book), "text/plain") },
    { label: "Exportar LaTeX (.tex)", run: (h) => guardar(`${h.project.book.title}.tex`, toLatex(h.project.book), "application/x-tex") },
    { label: "Exportar HTML (.html)", run: (h) => guardar(`${h.project.book.title}.html`, printHtml(h.project.book), "text/html") },
  ],
};
