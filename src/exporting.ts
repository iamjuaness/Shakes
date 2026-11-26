// Exportar el libro (o la saga) a Markdown, Word, EPUB o PDF (imprimir). export.ts se carga bajo demanda (fflate).
import { Node, toMarkdown } from "./tree";
import { saveBlob } from "./fileio";

export type ExportKind = "md" | "docx" | "epub" | "pdf";

// `lang`: idioma de la obra; decide el papel de un guion en Word (Carta en EE. UU., A4 en el resto).
// Devuelve el nombre del archivo guardado; null si se canceló o si es PDF (lo guarda el diálogo de impresión).
export async function exportAs(kind: ExportKind, scope: Node, lang = ""): Promise<string | null> {
  if (kind === "md") return saveBlob(`${scope.title}.md`, new Blob([toMarkdown(scope)], { type: "text/markdown" }));
  const x = await import("./export");
  if (kind === "pdf") {
    const f = document.createElement("iframe");
    f.style.cssText = "position:fixed;width:0;height:0;border:0";
    f.srcdoc = x.printHtml(scope);
    f.onload = () => { f.contentWindow?.focus(); f.contentWindow?.print(); setTimeout(() => f.remove(), 60_000); };
    document.body.appendChild(f);
    return null;
  }
  const docx = kind === "docx";
  const papel = /^en(-US|-CA)?$|^es-US$/i.test(lang) ? "letter" : "A4";
  const data = await x.zip(docx ? x.toDocxFiles(scope, papel) : x.toEpubFiles(scope));
  return saveBlob(`${scope.title}.${kind}`, new Blob([data as BlobPart], { type: docx ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/epub+zip" }));
}
