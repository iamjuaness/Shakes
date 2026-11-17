// Ejecutar: node src/export.test.ts
import assert from "node:assert/strict";
import { unzipSync, strFromU8 } from "fflate";
import { parseBlocks, printHtml, toDocxFiles, toEpubFiles, xhtmlBody, zip } from "./export.ts";
import { addChild, sampleBook, update } from "./tree.ts";

let b = sampleBook();
const sid = b.children[0].children[0].children[0].id;
b = update(b, sid, (n) => ({ ...n, content: "<h1>Título</h1><p>Hola <strong>fuerte</strong> &amp; <em>suave</em><br>fin</p><ul><li>uno</li></ul><blockquote><p>cita</p></blockquote>" }));

const blocks = parseBlocks(b.children[0].children[0].children[0].content);
assert.deepEqual(blocks.map((x) => x.tag), ["h1", "p", "li", "blockquote"]);
assert.equal(blocks[1].runs.some((r) => r.b && r.t === "fuerte"), true);
assert.equal(blocks[1].runs.some((r) => r.t === " & "), true, "entidades decodificadas");

const docx = toDocxFiles(b);
assert.equal(docx["word/document.xml"].includes("<w:b/></w:rPr><w:t xml:space=\"preserve\">fuerte"), true);
assert.equal(docx["word/document.xml"].includes("Heading5"), true, "h1 de escena -> encabezado 5");
assert.equal(docx["word/document.xml"].includes("&amp;"), true, "XML escapado");

const epub = toEpubFiles(b);
assert.equal(Object.keys(epub)[0], "mimetype");
assert.equal(epub["OEBPS/s1.xhtml"].includes("<strong>fuerte</strong>"), true);
assert.equal(epub["OEBPS/s1.xhtml"].includes("<br/>"), true, "XHTML bien formado");

assert.equal(xhtmlBody(b).includes("<h1>Mi historia</h1>"), true);
assert.equal(printHtml(b).includes("<!doctype html>"), true);

// zip real: se puede abrir de vuelta y el mimetype va intacto
const back = unzipSync(await zip(epub));
assert.equal(strFromU8(back["mimetype"]), "application/epub+zip");
assert.equal(Object.keys(unzipSync(await zip(docx))).includes("word/document.xml"), true);
void addChild;
console.log("export ok");

// ---- metadatos y portada ----
{
  const { wrapIn, toMarkdown } = await import("./tree.ts");
  const { toFountain, toLatex } = await import("../plugins/herramientas/exportar-extra/formatos.ts");
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  let libro = sampleBook();
  libro = { ...libro, meta: { author: "Ana Pérez", year: "2024", blurb: "Una historia & más", cover: png, cw: 1, ch: 1 } };
  const saga = wrapIn(libro, "saga", "Trilogía");
  const sagaM = { ...saga, meta: { author: "Ana Pérez", blurb: "Tres libros", cover: png, cw: 1, ch: 1 } };
  const ep = toEpubFiles(sagaM);
  assert.ok(ep["OEBPS/cover.png"] instanceof Uint8Array, "portada como binario en el EPUB");
  assert.ok((ep["OEBPS/content.opf"] as string).includes("<dc:creator>Ana Pérez</dc:creator>") && (ep["OEBPS/content.opf"] as string).includes('properties="cover-image"'));
  assert.ok(Object.keys(unzipSync(await zip(ep))).includes("OEBPS/cover.png"), "el zip lleva la portada");
  const dx = toDocxFiles(sagaM);
  assert.ok(dx["word/media/portada.png"] instanceof Uint8Array && (dx["word/document.xml"] as string).includes("r:embed=\"rIdCover\""), "portada en Word");
  assert.ok((dx["word/document.xml"] as string).includes("de Ana Pérez · 2024"), "autor y año del libro dentro de la saga");
  assert.ok(printHtml(sagaM).includes('<img src="data:image/png'), "portada en PDF");
  assert.ok(xhtmlBody(saga).includes("Una historia &amp; más"), "sinopsis escapada");
  assert.ok(toMarkdown(saga).includes("*de Ana Pérez · 2024*") && toMarkdown(saga).includes("> Una historia & más"));
  const tex = toLatex(sagaM), fo = toFountain(sagaM);
  assert.ok(tex.includes("\author{Ana Pérez}") && tex.includes("\part{Mi historia}") && tex.includes("\chapter{Parte 1}") && tex.includes("\section{Capítulo 1}") && tex.includes("\subsection*{Escena 1}"), "LaTeX de saga: libros = partes");
  assert.ok(toLatex(libro).includes("\part{Parte 1}") && toLatex(libro).includes("\section*{Escena 1}"), "libro suelto como antes");
  assert.ok(fo.includes("Author: Ana Pérez") && fo.includes("# Mi historia") && fo.includes("## Parte 1") && fo.includes("= Una historia & más"), "Fountain de saga");
  console.log("meta ok");
}
