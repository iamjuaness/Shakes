// Ejecutar: node src/export.test.ts
import assert from "node:assert/strict";
import { unzipSync, strFromU8 } from "fflate";
import { parseBlocks, printHtml, toDocxFiles, toEpubFiles, xhtmlBody, zip } from "./export.ts";
import { addChild, sampleBook, update } from "./tree.ts";

let b = sampleBook();
const sid = b.children[0].id;
b = update(b, sid, (n) => ({ ...n, content: "<h1>Título</h1><p>Hola <strong>fuerte</strong> &amp; <em>suave</em><br>fin</p><ul><li>uno</li></ul><blockquote><p>cita</p></blockquote>" }));

const blocks = parseBlocks(b.children[0].content);
assert.deepEqual(blocks.map((x) => x.tag), ["h1", "p", "li", "blockquote"]);
assert.equal(blocks[1].runs.some((r) => r.b && r.t === "fuerte"), true);
assert.equal(blocks[1].runs.some((r) => r.t === " & "), true, "entidades decodificadas");

const docx = toDocxFiles(b);
assert.equal(docx["word/document.xml"].includes("<w:b/></w:rPr><w:t xml:space=\"preserve\">fuerte"), true);
assert.equal(docx["word/document.xml"].includes("Heading4"), true, "h1 dentro del capítulo -> encabezado 4");
assert.deepEqual(parseBlocks("<p>a</p><hr><p>b</p>").map((x) => x.tag), ["p", "hr", "p"], "separador de escena");
assert.ok(xhtmlBody(update(b, sid, (n) => ({ ...n, content: "<p>a</p><hr><p>b</p>" }))).includes("* * *"), "<hr> -> * * *");
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
  assert.ok(tex.includes("\author{Ana Pérez}") && tex.includes("\\part{Mi historia}") && tex.includes("\\section{Capítulo 1}"), "LaTeX de saga: libros = partes");
  assert.ok(toLatex(libro).includes("\\chapter{Capítulo 1}"), "libro suelto: capítulos");
  assert.ok(toLatex({ ...libro, children: [{ ...libro.children[0], content: "<p>a</p><hr><p>b</p>" }] }).includes("\\begin{center}* * *\\end{center}"), "separador de escena en LaTeX");
  assert.ok(fo.includes("Author: Ana Pérez") && fo.includes("# Mi historia") && fo.includes("### Capítulo 1") && fo.includes("= Una historia & más"), "Fountain de saga");
  console.log("meta ok");
}

// ---- guion: formato de industria en Word y EPUB ----
{
  const g: any = { id: "g", kind: "script", title: "Faro", meta: { author: "Ana" }, children: [{ id: "s", kind: "scene", title: "E", children: [], content: '<p data-sp="heading">int. faro - noche</p><p>Ana <strong>grita</strong>.</p><p data-sp="character">Ana</p><p data-sp="paren">bajito</p><p data-sp="dialogue">Hola.</p><p data-sp="transition">corte a:</p>' }] };
  assert.deepEqual(parseBlocks(g.children[0].content).map((b) => b.sp ?? "-"), ["heading", "-", "character", "paren", "dialogue", "transition"]);
  const d = toDocxFiles(g, "A4");
  const doc = d["word/document.xml"] as string;
  assert.ok(doc.includes("INT. FARO - NOCHE") && doc.includes("CORTE A:"), "mayúsculas en encabezado y transición");
  assert.ok(doc.includes('<w:ind w:left="3312"/>') && doc.includes('w:left="1584" w:right="2016"'), "sangrías de personaje y diálogo");
  assert.ok(doc.includes(">(</w:t>") && doc.includes("bajito"), "acotación entre paréntesis");
  assert.ok(doc.includes('w:w="11906"') && doc.includes('w:left="2160"') && doc.includes("<w:titlePg/>"), "A4, margen izquierdo 1,5\", portada sin número");
  assert.ok((d["word/styles.xml"] as string).includes("Courier New") && (d["word/header1.xml"] as string).includes(" PAGE "), "Courier y número de página");
  assert.ok(Object.keys(unzipSync(await zip(d))).includes("word/header1.xml"));
  assert.ok(toDocxFiles(g)["word/document.xml"].includes('w:w="12240"'), "Carta por defecto");
  assert.ok(!(toDocxFiles(b)["word/document.xml"] as string).includes("sectPr"), "un libro no cambia");
  assert.ok((toEpubFiles(g)["OEBPS/s1.xhtml"] as string).includes('<p class="sp-character">ANA</p>'), "EPUB con clases de guion");
  console.log("guion export ok");
}
