// Exportar el libro (o la saga) a Markdown, Word, EPUB, PDF, HTML, LaTeX o Fountain. export.ts se carga bajo demanda (fflate).
// El PDF se genera aquí (libros: src/maqueta; guiones: formato de industria), sin pasar por el diálogo de impresión.
import { Node, toMarkdown } from "./tree";
import { saveBlob } from "./fileio";
import type { Ajustes } from "./maqueta/ajustes";

export type ExportKind = "md" | "docx" | "epub" | "pdf" | "html" | "tex" | "fountain";

export async function pdfDe(scope: Node, lang: string, ajustes?: Partial<Ajustes>): Promise<Uint8Array> {
  const papel = /^en(-US|-CA)?$|^es-US$/i.test(lang) ? "letter" : "A4";
  if (scope.kind === "script") return (await import("../plugins/herramientas/guion/pdf")).guionPdf(scope, papel, lang);
  const [{ ajustesDe }, { componer }, { maquetaPdf }, { cargarFamilia }] = await Promise.all([import("./maqueta/ajustes"), import("./maqueta/componer"), import("./maqueta/pdf"), import("./maqueta/cargar")]);
  const a = ajustesDe(ajustes);
  const [familia, cortar] = await Promise.all([cargarFamilia(a.fuente), (await import("./maqueta/guiones")).cargarGuiones(lang || "es")]);
  return maquetaPdf(componer(scope, a, familia, lang, cortar), familia, { titulo: scope.title, autor: scope.meta?.author });
}

// `lang`: idioma de la obra; decide el papel de un guion (Carta en EE. UU., A4 en el resto). `maqueta`: ajustes del PDF.
// Devuelve el nombre del archivo guardado; null si se canceló.
export async function exportAs(kind: ExportKind, scope: Node, lang = "", maqueta?: Partial<Ajustes>): Promise<string | null> {
  if (kind === "md") return saveBlob(`${scope.title}.md`, new Blob([toMarkdown(scope)], { type: "text/markdown" }));
  if (kind === "tex" || kind === "fountain") {
    const f = await import("./formatos");
    return saveBlob(`${scope.title}.${kind}`, new Blob([kind === "tex" ? f.toLatex(scope) : f.toFountain(scope)], { type: kind === "tex" ? "application/x-tex" : "text/plain" }));
  }
  if (kind === "pdf") return saveBlob(`${scope.title}.pdf`, new Blob([(await pdfDe(scope, lang, maqueta)) as BlobPart], { type: "application/pdf" }));
  const x = await import("./export");
  if (kind === "html") return saveBlob(`${scope.title}.html`, new Blob([x.printHtml(scope)], { type: "text/html" }));
  const docx = kind === "docx";
  const papel = /^en(-US|-CA)?$|^es-US$/i.test(lang) ? "letter" : "A4";
  const a = (await import("./maqueta/ajustes")).ajustesDe(maqueta); // Word y EPUB llevan los mismos preliminares que el PDF
  const data = await x.zip(docx ? x.toDocxFiles(scope, papel, a, lang || "es") : x.toEpubFiles(scope, lang || "es", a));
  return saveBlob(`${scope.title}.${kind}`, new Blob([data as BlobPart], { type: docx ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/epub+zip" }));
}
