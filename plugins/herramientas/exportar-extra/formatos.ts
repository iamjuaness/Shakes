// Puro: Fountain y LaTeX a partir del libro. (HTML y PDF salen del exportador de la app.)
import type { Node } from "../../../src/tree.ts";
import { paras } from "../_comun/texto.ts";

export function toFountain(book: Node): string {
  const walk = (n: Node, d: number): string[] =>
    n.kind === "scene"
      ? [`.${n.title.toUpperCase()}`, ...paras(n.content)]
      : [`${"#".repeat(Math.min(d, 3))} ${n.title}`, ...n.children.flatMap((c) => walk(c, d + 1))];
  return [`Title: ${book.title}`, "Draft date: " + new Date().toLocaleDateString("sv"), "", ...book.children.flatMap((c) => walk(c, 1))].join("\n\n");
}

const tex = (s: string) => s.replace(/[\\&%$#_{}~^]/g, (c) => ({ "\\": "\\textbackslash{}", "~": "\\textasciitilde{}", "^": "\\textasciicircum{}" } as Record<string, string>)[c] ?? "\\" + c);

export function toLatex(book: Node): string {
  const walk = (n: Node): string[] =>
    n.kind === "scene" ? [`\\section*{${tex(n.title)}}`, ...paras(n.content).map(tex)]
      : [`\\${n.kind === "part" ? "part" : "chapter"}{${tex(n.title)}}`, ...n.children.flatMap(walk)];
  return ["\\documentclass[12pt]{book}", "\\usepackage[spanish]{babel}", "\\usepackage[utf8]{inputenc}", `\\title{${tex(book.title)}}`, "\\date{}", "\\begin{document}", "\\maketitle", "", ...book.children.flatMap(walk), "", "\\end{document}", ""].join("\n\n").replace(/\n{3,}/g, "\n\n");
}
