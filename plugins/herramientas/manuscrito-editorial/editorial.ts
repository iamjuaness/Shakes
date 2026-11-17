// Puro: manuscrito en formato estándar (Shunn): Courier 12 pt, doble espacio, márgenes de 1 pulgada, cabecera con paginación.
import type { Node } from "../../../src/tree.ts";
import { esc, paras } from "../_comun/texto.ts";

export function editorial(book: Node, autor: string): string {
  let words = 0;
  const walk = (n: Node, first: boolean): string => {
    if (n.kind === "scene") {
      const ps = paras(n.content);
      words += ps.join(" ").split(/\s+/).filter(Boolean).length;
      return (first ? "" : `<p class="sep">#</p>`) + ps.map((p) => `<p>${esc(p)}</p>`).join("");
    }
    const head = n.kind === "part" ? `<h1>${esc(n.title)}</h1>` : `<h2>${esc(n.title)}</h2>`;
    return head + n.children.map((c, i) => walk(c, i === 0 || n.kind !== "chapter")).join("");
  };
  const body = book.children.map((c) => walk(c, true)).join("");
  const apellido = autor.trim().split(/\s+/).pop() || "Autor";
  const corto = book.title.toUpperCase().slice(0, 30);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>${esc(book.title)}</title><style>
@page{margin:1in;@top-right{content:"${apellido.replace(/"/g, "")} / ${corto.replace(/"/g, "")} / " counter(page);font:12pt "Courier New",monospace}}
body{font:12pt/2 "Courier New",Courier,monospace;margin:0}
.portada{height:9in;page-break-after:always;line-height:1.5}.portada .esq{display:flex;justify-content:space-between}
.portada h1{margin:3in 0 0;text-align:center;font-size:12pt;text-transform:uppercase}.portada .por{text-align:center}
h1,h2{text-align:center;font-size:12pt;page-break-before:always;margin:2in 0 1em}p{margin:0;text-indent:.5in}.sep{text-indent:0;text-align:center}
</style></head><body><div class="portada"><div class="esq"><span>${esc(autor)}</span><span>aprox. ${Math.max(100, Math.round(words / 100) * 100)} palabras</span></div><h1>${esc(book.title)}</h1><p class="por" style="text-indent:0">por ${esc(autor)}</p></div>${body}</body></html>`;
}
