// Exportar el libro (o la saga) a Markdown, Word, EPUB o PDF (imprimir). export.ts se carga bajo demanda (fflate).
import { Node, toMarkdown } from "./tree";
import { saveBlob } from "./fileio";

export type ExportKind = "md" | "docx" | "epub" | "pdf";

export async function exportAs(kind: ExportKind, scope: Node) {
  if (kind === "md") return saveBlob(`${scope.title}.md`, new Blob([toMarkdown(scope)], { type: "text/markdown" }));
  const x = await import("./export");
  if (kind === "pdf") {
    const f = document.createElement("iframe");
    f.style.cssText = "position:fixed;width:0;height:0;border:0";
    f.srcdoc = x.printHtml(scope);
    f.onload = () => { f.contentWindow?.focus(); f.contentWindow?.print(); setTimeout(() => f.remove(), 60_000); };
    return void document.body.appendChild(f);
  }
  const docx = kind === "docx";
  const data = await x.zip(docx ? x.toDocxFiles(scope) : x.toEpubFiles(scope));
  saveBlob(`${scope.title}.${kind}`, new Blob([data as BlobPart], { type: docx ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/epub+zip" }));
}
