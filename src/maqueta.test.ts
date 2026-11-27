// Ejecutar: node src/maqueta.test.ts
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { componer, revisar } from "./maqueta/componer.ts";
import { ajustesDe, preajuste } from "./maqueta/ajustes.ts";
import { COURIER, infoFuente, leerFuente } from "./maqueta/fuentes.ts";
import { conPatrones } from "./maqueta/guiones.ts";
import { cubierta } from "./maqueta/cubierta.ts";
import { toDocxFiles, toEpubFiles } from "./export.ts";
import { toLatex } from "./formatos.ts";
import type { Familia } from "./maqueta/fuentes.ts";
import { maquetaPdf } from "./maqueta/pdf.ts";
import { cortes } from "./maqueta/silabas.ts";
import { addChild, sampleBook, toMarkdown, update } from "./tree.ts";

const partir = (w: string) => [0, ...cortes(w), w.length].slice(0, -1).map((p, i, a) => w.slice(p, a[i + 1] ?? w.length)).join("-");
assert.equal(partir("carretera"), "ca-rre-tera");
assert.equal(partir("hombre"), "hom-bre");
assert.equal(partir("instante"), "ins-tante");
assert.equal(partir("muchacho"), "mu-cha-cho");
assert.equal(cortes("sol").length, 0);

const archivo = (e: string, s = "latin") => new Uint8Array(readFileSync(`node_modules/@fontsource/eb-garamond/files/eb-garamond-${s}-${e}.woff`));
const fuente = (e: string) => leerFuente(...["latin", "latin-ext", "greek", "cyrillic"].map((s) => archivo(e, s)));
const fam: Familia = { r: fuente("400-normal"), i: fuente("400-italic"), b: fuente("700-normal"), bi: fuente("700-italic") };
assert.ok([..."ñ—«łőαДж"].every((c) => fam.r.tiene(c.codePointAt(0)!)), "caracteres del español, centroeuropeos, griegos y cirílicos");
// interletraje y ligaduras
const suma = (s: string) => [...s].reduce((n, c) => n + fam.r.ancho(c), 0);
assert.ok(fam.r.ancho("AV") < suma("AV") - 0.02, "interletraje");
assert.ok(fam.r.formar("fi").length === 1 && fam.r.formar("fi")[0].t === "fi", "ligadura");
assert.deepEqual(fam.r.formar("aДa").map((g) => g.p), [0, 3, 0], "cada carácter sale del archivo que lo tiene");
assert.ok(fam.r.ancho("m") > fam.r.ancho("i"));

const frase = "La muchacha caminaba lentamente por la carretera interminable mientras el hombre recordaba aquellas conversaciones extraordinarias. ";
let b = sampleBook();
b = addChild(b, b.id)[0];
b = { ...b, title: "Mi novela", meta: { author: "Ana Pérez", year: "2026" } };
for (const c of b.children) b = update(b, c.id, (n) => ({ ...n, content: `<p>${frase.repeat(6)}</p><p>—Hola —dijo <em>ella</em>—.</p>`.repeat(12) + "<hr><p>Fin.</p>" }));

const a = ajustesDe({ dedicatoria: "Para Eva", agradecimientos: "Gracias." });
const m = componer(b, a, fam, "es");
const todo = (i: number) => m.paginas[i].textos.map((t) => t.s).join(" ");
const margenes = (i: number) => { const verso = i % 2 === 1; const izq = (verso ? a.ext : a.int) * 72 / 25.4; return [izq, izq + m.w - (a.int + a.ext) * 72 / 25.4]; };
m.paginas.forEach((p, i) => {
  const [izq, der] = margenes(i);
  for (const t of p.textos) {
    assert.ok(t.x >= izq - 0.1 && t.x + fam[t.f].ancho(t.s) * t.size <= der + 0.6, `página ${i + 1}: «${t.s}» fuera del margen`);
    assert.ok(t.y > 0 && t.y < m.h, `página ${i + 1}: «${t.s}» fuera de la hoja`);
  }
});
assert.equal(m.sobran, 0);
assert.equal(m.faltan.length, 0);
assert.equal(m.paginas.length % 2, 0, "número par de páginas");
assert.ok(todo(0).includes("Mi") && !todo(0).includes("Ana"), "anteportada");
assert.ok(todo(2).includes("Ana"), "portada en página derecha");
assert.ok(todo(3).includes("©"), "créditos al dorso");
const uno = m.paginas.findIndex((p) => p.folio === 1);
assert.equal(uno % 2, 0, "el capítulo 1 empieza en página derecha");
assert.equal(m.paginas[uno].apertura, true);
assert.ok(todo(uno).includes("CAPÍTULO"), "rótulo del capítulo");
assert.ok(!m.paginas[uno].textos.some((t) => t.s === "Ana Pérez"), "la apertura no lleva cabecera");
assert.ok(m.paginas[uno + 1].textos.some((t) => t.s === "Ana Pérez" && t.f === "i"), "cabecera en la página par");
assert.ok(m.paginas.some((p) => p.textos.some((t) => t.s === "Índice")));
assert.ok(m.paginas.some((p) => p.textos.some((t) => t.s.endsWith("-"))), "hay palabras partidas");
// viudas y huérfanas: ninguna página de texto corrido con una sola línea
for (const p of m.paginas) if (p.folio && !p.apertura && p.textos.length) assert.ok(new Set(p.textos.map((t) => Math.round(t.y))).size > 2);
// justificado: casi todas las líneas llegan al margen derecho
const p2 = m.paginas[uno + 1], [, der] = margenes(uno + 1);
const filas = new Map<number, number>();
for (const t of p2.textos) filas.set(t.y, Math.max(filas.get(t.y) ?? 0, t.x + fam[t.f].ancho(t.s) * t.size));
assert.ok([...filas.values()].filter((x) => Math.abs(x - der) < 0.6).length > filas.size * 0.6, "texto justificado");
assert.ok(revisar(m, { ...a, int: 5 }).avisos.some((x) => x.includes("interior")));

const pdf = maquetaPdf(m, fam, { titulo: b.title, autor: "Ana Pérez" });
const crudo = Buffer.from(pdf).toString("latin1");
assert.ok(crudo.startsWith("%PDF-1.6") && crudo.trimEnd().endsWith("%%EOF"));
assert.ok(crudo.includes("/FontFile2"), "fuente incrustada");
// la tabla de referencias apunta a cada objeto
const xref = +crudo.match(/startxref\n(\d+)/)![1];
const entradas = [...crudo.slice(xref).matchAll(/^(\d{10}) 00000 n /gm)];
entradas.forEach((e, i) => assert.ok(crudo.startsWith(`${i + 1} 0 obj`, +e[1])));
if (process.env.PDF_SALIDA) writeFileSync(process.env.PDF_SALIDA, pdf);

const conNombre = componer(update(b, b.children[0].id, (n) => ({ ...n, title: "Capítulo 1: La llegada" })), a, fam, "es");
const textos = conNombre.paginas.find((p) => p.folio === 1)!.textos.map((t) => t.s).join(" ");
assert.ok(textos.includes("CAPÍTULO") && textos.includes("La llegada") && !textos.includes("Capítulo 1:"), "sin número repetido");

// manuscrito para editoriales: Courier, doble espacio, cabecera «Apellido / TÍTULO / n»
const man = componer(b, preajuste(ajustesDe(), "manuscrito-a4"), COURIER, "es");
assert.ok(man.paginas[0].textos.some((t) => t.s.includes("palabras") || t.s === "palabras"));
assert.ok(man.paginas.some((p) => p.textos.some((t) => t.s.startsWith("Pérez / MI NOVELA / "))));
assert.equal(man.sobran, 0);
assert.equal(man.paginas[1].folio, 1, "sin páginas en blanco en el manuscrito");
assert.ok(man.paginas.every((p) => p.textos.length));
assert.ok(Buffer.from(maquetaPdf(man, COURIER, { titulo: "x" })).includes("/Courier"));
console.log("maqueta ok", m.paginas.length, "páginas");

// notas al pie, imágenes y tablas
{
  const jpg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
  const nota = (t: string) => `<span data-pie="${encodeURIComponent(t)}"></span>`;
  const html = `<p>Texto con nota${nota('Primera "nota" <al> pie.')} y otra${nota("Segunda.")} más.</p><img src="${jpg}" alt="Mapa" data-w="1200" data-h="600" data-ancho="80"><table><tbody><tr><th><p>Año</p></th><th><p>Hecho</p></th></tr><tr><td><p>1492</p></td><td><p>${frase}${nota("En tabla.")}</p></td></tr></tbody></table>` + `<p>${frase.repeat(4)}${nota(frase.repeat(2))}</p>`.repeat(14);
  const libro = update(b, b.children[0].id, (n) => ({ ...n, content: html }));
  const x = componer(libro, a, fam, "es");
  const abajo = (a.sup * 72) / 25.4 + x.lineas * a.interlinea + 3;
  for (const p of x.paginas.filter((q) => q.folio && !q.apertura)) for (const t of p.textos) assert.ok(t.y <= abajo || /^\d+$/.test(t.s), `nada invade el pie: ${t.s} ${t.y}`);
  const p1 = x.paginas.find((p) => p.folio === 1)!;
  const junto = (p: typeof p1) => p.textos.map((t) => t.s).join(" ");
  assert.ok(junto(p1).includes("Primera") && junto(p1).includes("Segunda."), "la nota está en la página de su llamada");
  assert.ok(p1.textos.some((t) => t.s === "1" && t.size < a.cuerpo * 0.7), "llamada en superíndice");
  const foto = x.paginas.flatMap((p) => p.imagenes ?? [])[0];
  assert.ok(Math.abs(foto.w / foto.h - 2) < 0.01 && foto.w < x.w, "imagen proporcionada");
  assert.ok(x.paginas.flatMap((p) => p.rects ?? []).length >= 5, "filetes de tabla y de notas");
  assert.ok(x.paginas.some((p) => junto(p).includes("1492")));
  assert.equal(x.pobres, 0);
  assert.equal(componer(update(b, b.children[0].id, (n) => ({ ...n, content: html.replace('data-w="1200"', 'data-w="60"') })), a, fam, "es").pobres, 1);
  const crudoX = Buffer.from(maquetaPdf(x, fam, { titulo: "x" })).toString("latin1");
  const { inflateSync } = await import("node:zlib");
  const dibujo = [...crudoX.matchAll(/\/Length (\d+) \/Filter \/FlateDecode  >>\nstream\n/g)].map((s) => inflateSync(Buffer.from(crudoX.substr(s.index! + s[0].length, +s[1]), "latin1")).toString("latin1")).join("");
  assert.ok(crudoX.includes("/DCTDecode") && dibujo.includes("/Im0 Do") && dibujo.includes(" re f"), "imagen y filetes en el PDF");
  assert.ok(/\[<[0-9a-f]+> -?[\d.]+ <[0-9a-f]+>/.test(dibujo), "interletraje en el PDF");
  if (process.env.PDF_SALIDA) writeFileSync(process.env.PDF_SALIDA.replace(".pdf", "-notas.pdf"), maquetaPdf(x, fam, { titulo: "x" }));

  // Word y EPUB: mismos preliminares que el PDF, notas, imagen y tabla
  const d = toDocxFiles(libro, "A4", a, "es");
  const doc = d["word/document.xml"] as string;
  assert.ok(doc.includes("Para Eva") && doc.includes("©") && doc.includes("Gracias."), "preliminares en Word");
  assert.ok(doc.includes('<w:footnoteReference w:id="1"/>') && (d["word/footnotes.xml"] as string).includes("Segunda."));
  assert.ok(d["word/media/img1.jpg"] instanceof Uint8Array && doc.includes("<w:tbl>"));
  const e = toEpubFiles(libro, "es", a);
  const todos = Object.entries(e).filter(([k]) => k.endsWith(".xhtml")).map(([, v]) => v as string).join("");
  assert.ok(todos.includes("Para Eva") && todos.includes("©") && todos.includes("Gracias."), "preliminares en EPUB");
  assert.ok(todos.includes('epub:type="footnote"') && todos.includes('<img src="img1.jpg"') && todos.includes("<table>") && e["OEBPS/img1.jpg"] instanceof Uint8Array);
  assert.ok(toMarkdown(libro).includes("^[Segunda.]") && toMarkdown(libro).includes("| Año | Hecho |"));
  assert.ok(toLatex(libro).includes("\\footnote{Segunda.}"));
}

// guiones en inglés con patrones
{
  const { createRequire } = await import("node:module");
  const en = conPatrones(createRequire(import.meta.url)("hyphen/en-us").hyphenateSync);
  assert.ok(en("beautiful").length > 0 && en("cat").length === 0);
  const txt = "Extraordinary international communications overwhelmingly characterised representative organisations everywhere. ".repeat(40);
  const x = componer(update(b, b.children[0].id, (n) => ({ ...n, content: `<p>${txt}</p>` })), a, fam, "en", en);
  assert.ok(x.paginas.some((p) => p.textos.some((t) => /[a-z]-$/.test(t.s))), "palabras inglesas partidas");
  assert.equal(x.sobran, 0);
}

// cubierta completa
{
  const grande = cubierta({ ...b, meta: { ...b.meta, blurb: "Una historia sobre el mar.\nY sobre la memoria." } }, ajustesDe({ isbn: "978-0" }), fam, 300);
  assert.ok(Math.abs(grande.lomo - 300 * 0.0635) < 1e-6 && Math.abs(grande.ancho - (6.4 + 279.4 + grande.lomo)) < 1e-6);
  const p = grande.m.paginas[0];
  assert.ok(p.textos.some((t) => t.giro && t.s === "Mi novela"), "lomo girado");
  assert.ok(p.textos.some((t) => t.s.includes("mar")), "contraportada");
  for (const t of p.textos) assert.ok(t.x >= 0 && t.x < grande.m.w && t.y > 0 && t.y < grande.m.h, t.s);
  assert.ok(!cubierta(b, ajustesDe(), fam, 40).m.paginas[0].textos.some((t) => t.giro), "lomo fino sin texto");
  if (process.env.PDF_SALIDA) writeFileSync(process.env.PDF_SALIDA.replace(".pdf", "-cubierta.pdf"), maquetaPdf(grande.m, fam, { titulo: "c" }));
}

// fuentes propias
assert.deepEqual(infoFuente(archivo("700-italic")), { familia: "EB Garamond", estilo: "bi", error: undefined });
assert.equal(infoFuente(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).error, "formato");
console.log("maqueta avanzada ok");
