// Puro: Fountain y LaTeX a partir del libro, la saga o el universo. (HTML y PDF salen del exportador de la app.)
// Los niveles son relativos a la raíz exportada: un libro suelto empieza en partes; una saga, en libros; un universo, en sagas.
// Los metadatos (autor, año, sinopsis) salen en la portada; la imagen de portada no cabe en estos formatos de texto.
import { level, lineaMeta } from "../../../src/tree.ts";
import type { Node } from "../../../src/tree.ts";
import { paras } from "../_comun/texto.ts";

export function toFountain(root: Node): string {
  const rel = (n: Node) => level[n.kind] - level[root.kind];
  const walk = (n: Node): string[] =>
    n.kind === "scene"
      ? [`.${n.title.toUpperCase()}`, ...paras(n.content)]
      : [
          `${"#".repeat(Math.min(Math.max(rel(n), 1), 6))} ${n.title}`,
          ...(n.meta?.blurb ? [`= ${n.meta.blurb.replace(/\n+/g, " ")}`] : []),
          ...(n.meta && lineaMeta(n.meta) ? [`[[${lineaMeta(n.meta)}]]`] : []),
          ...n.children.flatMap(walk),
        ];
  const m = root.meta ?? {};
  return [
    `Title: ${root.title}`,
    ...(m.author ? [`Author: ${m.author}`] : []),
    "Draft date: " + (m.year || new Date().toLocaleDateString("sv")),
    ...(m.blurb ? [`Notes: ${m.blurb.replace(/\n+/g, " ")}`] : []),
    "",
    ...root.children.flatMap(walk),
  ].join("\n\n");
}

const tex = (s: string) => s.replace(/[\\&%$#_{}~^]/g, (c) => ({ "\\": "\\textbackslash{}", "~": "\\textasciitilde{}", "^": "\\textasciicircum{}" } as Record<string, string>)[c] ?? "\\" + c);
const SEC = ["part", "part", "chapter", "section", "subsection", "subsubsection"]; // índice = nivel relativo a la raíz

export function toLatex(root: Node): string {
  const rel = (n: Node) => Math.min(Math.max(level[n.kind] - level[root.kind], 1), 5);
  const walk = (n: Node): string[] =>
    n.kind === "scene" ? [`\\${SEC[rel(n)]}*{${tex(n.title)}}`, ...paras(n.content).map(tex)]
      : [`\\${SEC[rel(n)]}{${tex(n.title)}}`, ...(n.meta && (lineaMeta(n.meta) || n.meta.blurb) ? [`\\begin{quote}\\emph{${tex(lineaMeta(n.meta))}}${n.meta.blurb ? "\n\n" + tex(n.meta.blurb) : ""}\\end{quote}`] : []), ...n.children.flatMap(walk)];
  const m = root.meta ?? {};
  return [
    "\\documentclass[12pt]{book}", "\\usepackage[spanish]{babel}", "\\usepackage[utf8]{inputenc}",
    `\\title{${tex(root.title)}}`, ...(m.author ? [`\\author{${tex(m.author)}}`] : []), `\\date{${tex(m.year ?? "")}}`,
    "\\begin{document}", "\\maketitle",
    ...(m.blurb ? [`\\begin{quote}${tex(m.blurb)}\\end{quote}`] : []),
    "", ...root.children.flatMap(walk), "", "\\end{document}", "",
  ].join("\n\n").replace(/\n{3,}/g, "\n\n");
}
