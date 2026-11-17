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
