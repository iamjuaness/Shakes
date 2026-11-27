import assert from "node:assert/strict";
import { abrirRevision, bloquesHtml, cambios, comparar, decidir, montar, piezasDe, resolver } from "./revision.ts";
import { docxBloques, docxComentarios, estructura } from "./importar.ts";
import { toDocxFiles } from "./export.ts";
import { addChild, sampleBook, update } from "./tree.ts";

assert.deepEqual(bloquesHtml('<p>a <em>b</em></p><hr><ul><li><p>c</p></li></ul><img alt="x>y" src="s">').length, 4);

const v1 = "<p>El gato negro <em>dormía</em> en la silla.</p><p>Nada pasaba.</p><p>Adiós.</p>";
const v2 = "<p>El perro <em>dormía</em> en la vieja silla.</p><p>Adiós.</p><p>Fin del cuento.</p>";
const p = comparar(v1, v2);
const cs = cambios(p);
assert.equal(cs.length, 4, JSON.stringify(cs));
assert.deepEqual([cs[0].antes, cs[0].despues], ["gato negro", "perro"]);
assert.equal(montar(p, () => true).replace(/<\/?em>/g, ""), v2.replace(/<\/?em>/g, ""));
assert.equal(montar(p, () => false), v1);
assert.ok(montar(p, () => true).includes("<em>dormía</em>"), "conserva la cursiva");

// aceptar uno: sale de la lista; rechazar uno: también, y vuelve el texto anterior
const a = resolver(p, true, cs[0].id);
assert.ok(a.antes.startsWith("<p>El perro ") && a.antes.includes("Nada pasaba") && a.despues === montar(p, () => true));
assert.equal(cambios(comparar(a.antes, a.despues)).length, 3);
const r = resolver(p, false, cs[0].id);
assert.ok(r.despues.startsWith("<p>El gato negro ") && r.antes === v1);
assert.equal(cambios(comparar(r.antes, r.despues)).length, 3);
assert.equal(cambios(comparar(resolver(p, true).antes, resolver(p, true).despues)).length, 0);

// cambios de formato y notas
const f = comparar("<p>uno dos</p>", '<p>uno <strong>dos</strong><span data-pie="n%3E"></span></p>');
assert.equal(montar(f, () => true), '<p>uno <strong>dos</strong><span data-pie="n%3E"></span></p>');
assert.ok(cambios(f)[0].despues.includes("[n>]"));
// tablas que la otra versión no trae
assert.equal(cambios(comparar("<p>a</p><table><tbody><tr><td><p>1</p></td></tr></tbody></table>", "<p>a</p>", /^<(img|table)/)).length, 0);

// sesión: el lector devuelve el libro; los capítulos se emparejan por título
let mio = sampleBook();
mio = addChild(mio, mio.id)[0];
const [c1, c2] = mio.children;
mio = update(update(mio, c1.id, (n) => ({ ...n, content: "<p>Era de noche.</p>" })), c2.id, (n) => ({ ...n, content: "<p>Amaneció.</p>" }));
const suyo = { ...mio, children: [{ ...mio.children[1], id: "otro", content: "<p>Amaneció tarde.</p>" }, { ...mio.children[0], content: "<p>Era de noche.</p>" }, { id: "n", kind: "chapter" as const, title: "Epílogo", content: "<p>Fin</p>", children: [] }] };
const s = abrirRevision(mio, suyo, "lector", true);
assert.equal(s.otro[c2.id], "<p>Amaneció tarde.</p>");
assert.deepEqual(s.nuevos.map((n) => n.titulo), ["Epílogo"]);
const piezas = piezasDe(s, c2.id, "<p>Amaneció.</p>");
assert.equal(decidir(s, piezas, true).mio, "<p>Amaneció tarde.</p>");
assert.equal(decidir(s, piezas, false).mio, "<p>Amaneció.</p>");
// contra una versión: aceptar conserva lo actual, rechazar recupera lo anterior
const ver = abrirRevision(mio, { ...mio, children: [{ ...mio.children[0], content: "<p>Era de día.</p>" }] }, "v", false);
const pv = piezasDe(ver, c1.id, "<p>Era de noche.</p>");
assert.equal(decidir(ver, pv, true).mio, "<p>Era de noche.</p>");
assert.equal(decidir(ver, pv, false).mio, "<p>Era de día.</p>");

// ida y vuelta por Word: mismo texto, formato y notas = sin cambios
const texto = '<p>Hola <strong>fuerte</strong> y <em>suave</em><span data-pie="una%20nota"></span>.</p><hr><p>Fin.</p>';
const libro = update(sampleBook(), "", (n) => n);
const l = update(libro, libro.children[0].id, (n) => ({ ...n, content: texto }));
const d = toDocxFiles(l);
const bloques = docxBloques(d["word/document.xml"] as string, d["word/footnotes.xml"] as string);
const vuelta = estructura(bloques, "x");
const html = (function buscar(es: typeof vuelta): string { return es.map((e) => e.html || buscar(e.hijos)).join(""); })(vuelta);
assert.equal(cambios(comparar(texto, html)).length, 0, html);

// comentarios de un .docx
const doc = '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Capítulo 1</w:t></w:r></w:p><w:p><w:r><w:t xml:space="preserve">Era </w:t></w:r><w:commentRangeStart w:id="3"/><w:r><w:t>de noche</w:t></w:r><w:commentRangeEnd w:id="3"/><w:r><w:t>.</w:t></w:r></w:p>';
const com = '<w:comments><w:comment w:id="3" w:author="Eva &amp; Co"><w:p><w:r><w:t>¿Seguro?</w:t></w:r></w:p></w:comment></w:comments>';
assert.deepEqual(docxComentarios(doc, com), [{ autor: "Eva & Co", texto: "¿Seguro?", cita: "de noche", capitulo: "Capítulo 1" }]);
console.log("revision ok");
