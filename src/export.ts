// Exportadores. Los builders son puros (devuelven {ruta: contenido}); `zip` empaqueta con fflate cargado bajo demanda.
import type { Node } from "./tree.ts";
import { conTexto, esObra, level as LV, lineaMeta, scenes } from "./tree.ts";
import type { Ajustes } from "./maqueta/ajustes.ts";
import { finales, preliminares, rotulos } from "./maqueta/preliminares.ts";

export interface Run { t: string; b: boolean; i: boolean; nota?: string } // nota: texto de una nota al pie (t vacío)
export interface Imagen { src: string; w: number; h: number; ancho: number; alt: string } // w×h en píxeles; ancho en % de la caja
export interface Fila { cab: boolean; celdas: Run[][] }
export interface Block { tag: string; runs: Run[]; sp?: string; img?: Imagen; filas?: Fila[] } // sp: elemento de guion (data-sp) del párrafo

const dec = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Niveles de encabezado relativos a la raíz exportada: un libro empieza en 1; una saga o un universo, en 1 y sus libros en 2.
const lv = (n: Node, base: number) => Math.min(6, LV[n.kind] - base);

const atributo = (s: string, n: string) => dec(s.match(new RegExp(`(?:^|\\s)${n}="([^"]*)"`))?.[1] ?? "");
const descifrar = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

// HTML de dentro de un párrafo (o celda) -> tramos con estilo y notas al pie.
function tramos(html: string, mayus = false): Run[] {
  let b = false, i = false, parrafos = 0;
  const runs: Run[] = [];
  for (const tok of html.split(/(<[^>]+>)/)) {
    const tag = tok.match(/^<(\/?)(\w+)/);
    if (tag) {
      const on = !tag[1], n = tag[2].toLowerCase();
      if (n === "strong" || n === "b") b = on;
      else if (n === "em" || n === "i") i = on;
      else if (n === "br") runs.push({ t: "\n", b, i });
      else if (n === "p" && on && parrafos++) runs.push({ t: "\n", b, i }); // varios párrafos en una celda
      else if (n === "span" && on) { const nota = atributo(tok, "data-pie"); if (nota) runs.push({ t: "", b, i, nota: descifrar(nota) }); }
    } else if (tok) runs.push({ t: mayus ? dec(tok).toUpperCase() : dec(tok), b, i });
  }
  return runs;
}

// HTML de TipTap -> bloques con tramos negrita/cursiva. <hr> (separador de escena dentro de un capítulo) es un bloque
// vacío "hr"; las imágenes ("img") y las tablas ("table") son bloques propios.
export function parseBlocks(html = ""): Block[] {
  return [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>|<img\b([^>]*)>|<(p|h[1-6]|li|blockquote)\b([^>]*)>([\s\S]*?)<\/\3>|<hr\b[^>]*>/gi)].map((m): Block => {
    if (m[1] !== undefined) {
      const filas = [...m[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((f) => {
        const celdas = [...f[1].matchAll(/<(t[dh])\b[^>]*>([\s\S]*?)<\/\1>/gi)];
        return { cab: celdas.length > 0 && celdas.every((c) => c[1].toLowerCase() === "th"), celdas: celdas.map((c) => tramos(c[2])) };
      });
      return { tag: "table", runs: [], filas: filas.filter((f) => f.celdas.length) };
    }
    if (m[2] !== undefined) {
      const n = (k: string, d: number) => Number(atributo(m[2], k)) || d;
      return { tag: "img", runs: [], img: { src: atributo(m[2], "src"), alt: atributo(m[2], "alt"), w: n("data-w", 600), h: n("data-h", 400), ancho: Math.min(100, n("data-ancho", 100)) } };
    }
    if (!m[3]) return { tag: "hr", runs: [] };
    const sp = m[4].match(/data-sp="([a-z]+)"/)?.[1];
    const runs = tramos(m[5], sp === "heading" || sp === "character" || sp === "transition");
    if (sp === "paren" && runs[0] && !runs[0].t.startsWith("(")) { runs.unshift({ t: "(", b: false, i: false }); runs.push({ t: ")", b: false, i: false }); }
    return { tag: m[3].toLowerCase(), runs, ...(sp ? { sp } : {}) };
  });
}

const bytesDe = (url: string) => Uint8Array.from(atob(url.slice(url.indexOf(",") + 1)), (c) => c.charCodeAt(0));

// Portada: la imagen de la raíz (JPEG/PNG en data URL) como bytes + tamaño, y la línea «de Autor · año» + sinopsis de cada libro.
interface Cover { ext: "jpg" | "png"; mime: "jpeg" | "png"; data: Uint8Array; w: number; h: number; url: string }
function coverOf(n: Node): Cover | null {
  const url = n.meta?.cover;
  const m = url?.match(/^data:image\/(jpeg|png);base64,(.+)$/);
  if (!url || !m) return null;
  return { ext: m[1] === "png" ? "png" : "jpg", mime: m[1] as "jpeg" | "png", data: Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0)), w: n.meta?.cw || 600, h: n.meta?.ch || 900, url };
}
const fichaXhtml = (n: Node) => {
  const l = lineaMeta(n.meta);
  return n.meta && (l || n.meta.blurb) ? `<div class="ficha">${l ? `<p>${xml(l)}</p>` : ""}${n.meta.blurb ? `<p>${xml(n.meta.blurb)}</p>` : ""}</div>` : "";
};
const docxMeta = (n: Node) => {
  const l = lineaMeta(n.meta);
  return (l ? para(null, [{ t: l, b: false, i: true }]) : "") + (n.meta?.blurb ? para(null, [{ t: n.meta.blurb, b: false, i: true }]) : "");
};
const docxCover = (c: Cover | null) => {
  if (!c) return "";
  const s = Math.min(1, 420 / c.w, 560 / c.h);
  const cx = Math.round(c.w * s * 9525), cy = Math.round(c.h * s * 9525);
  return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="Portada"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="portada.${c.ext}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdCover"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p><w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
};

const head = (tag: string, nivel: number) => Math.min(6, +tag[1] + nivel); // h1 dentro de un capítulo de nivel 3 -> encabezado 4
const SEP = "* * *";

// ---------- Guion ----------
// Formato de industria (Courier 12, sencillo; izquierda 1,5", resto 1"): sangrías desde el margen izquierdo, en twips
// (1" = 1440). Personaje a 3,8" del borde, diálogo a 2,6" y 3,5" de ancho, acotación a 3,25", transición a la derecha.
const SP_DOCX: Record<string, string> = {
  heading: '<w:keepNext/><w:spacing w:before="240" w:after="240"/>',
  action: '<w:spacing w:after="240"/>',
  character: '<w:keepNext/><w:spacing w:before="240" w:after="0"/><w:ind w:left="3312"/>',
  paren: '<w:keepNext/><w:spacing w:after="0"/><w:ind w:left="2520" w:right="3240"/>',
  dialogue: '<w:spacing w:after="240"/><w:ind w:left="1584" w:right="2016"/>',
  transition: '<w:spacing w:after="240"/><w:jc w:val="right"/>',
};
export type Papel = "A4" | "letter";
const SP_CSS = ".sp-heading,.sp-character,.sp-transition{text-transform:uppercase}.sp-character{margin:1em 0 0 2.3in;text-indent:0}.sp-paren{margin:0 0 0 1.75in;width:2in;text-indent:0}.sp-dialogue{margin:0 0 1em 1.1in;width:3.5in;text-indent:0}.sp-transition{text-align:right}.guion p{text-align:left;text-indent:0;margin:0 0 1em}.guion{font-family:'Courier Prime','Courier New',Courier,monospace}";

// ---------- DOCX ----------
// Notas al pie e imágenes del documento: se numeran según aparecen.
interface Docx { notas: string[]; imagenes: Imagen[]; paginar: boolean } // paginar: cada capítulo en página nueva
const runXml = (r: Run, d?: Docx) =>
  r.nota !== undefined ? (d ? `<w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:footnoteReference w:id="${d.notas.push(r.nota)}"/></w:r>` : "")
  : r.t === "\n" ? "<w:r><w:br/></w:r>" : `<w:r><w:rPr>${r.b ? "<w:b/>" : ""}${r.i ? "<w:i/>" : ""}</w:rPr><w:t xml:space="preserve">${xml(r.t)}</w:t></w:r>`;
const para = (style: string | null, runs: Run[], extra = "", d?: Docx) =>
  `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ""}${extra}</w:pPr>${runs.map((r) => runXml(r, d)).join("")}</w:p>`;

const dibujo = (rid: string, id: number, cx: number, cy: number, alt: string) =>
  `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Imagen ${id}" descr="${xml(alt).replace(/"/g, "&quot;")}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="img${id}.jpg"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;

function docxTabla(filas: Fila[], d: Docx): string {
  const cols = Math.max(1, ...filas.map((f) => f.celdas.length));
  const borde = (n: string) => `<w:${n} w:val="single" w:sz="4" w:space="0" w:color="808080"/>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(borde).join("")}</w:tblBorders></w:tblPr><w:tblGrid>${`<w:gridCol w:w="${Math.floor(9000 / cols)}"/>`.repeat(cols)}</w:tblGrid>${filas.map((f) =>
    `<w:tr>${Array.from({ length: cols }, (_, c) => `<w:tc><w:tcPr><w:tcW w:w="${Math.floor(5000 / cols)}" w:type="pct"/></w:tcPr>${para(null, (f.celdas[c] ?? []).map((r) => (f.cab ? { ...r, b: true } : r)), '<w:spacing w:after="0"/>', d)}</w:tc>`).join("")}</w:tr>`).join("")}</w:tbl>${para(null, [])}`;
}

// El nombre de una escena (guion o proyecto antiguo) no se exporta: solo se separa de la anterior con «* * *».
function docxBody(n: Node, d: Docx, base = LV[n.kind] - 1, i = 0): string {
  const sep = para(null, [{ t: SEP, b: false, i: false }], '<w:jc w:val="center"/>');
  const own = n.kind !== "scene" ? para(`Heading${lv(n, base)}`, [{ t: n.title, b: false, i: false }], d.paginar && n.kind !== "book" ? "<w:pageBreakBefore/>" : "") : i > 0 ? sep : "";
  const text = conTexto(n.kind)
    ? parseBlocks(n.content).map((b) => {
        if (b.tag === "hr") return sep;
        if (b.filas) return docxTabla(b.filas, d);
        if (b.img) {
          if (!b.img.src.startsWith("data:image/jpeg;base64,")) return "";
          const n = d.imagenes.push(b.img), cx = Math.round(6 * 914400 * (b.img.ancho / 100));
          return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr>${dibujo(`rIdImg${n}`, n + 1, cx, Math.round((cx * b.img.h) / b.img.w), b.img.alt)}</w:p>`;
        }
        return b.sp && SP_DOCX[b.sp] ? para(null, b.runs, SP_DOCX[b.sp], d)
        : /^h\d$/.test(b.tag) ? para(`Heading${head(b.tag, lv(n, base))}`, b.runs, "", d)
        : b.tag === "li" ? para(null, [{ t: "• ", b: false, i: false }, ...b.runs], "", d)
        : b.tag === "blockquote" ? para(null, b.runs, '<w:ind w:left="720"/>', d)
        : para(null, b.runs, "", d);
      }).join("")
    : "";
  return own + docxMeta(n) + text + n.children.map((c, j) => docxBody(c, d, base, j)).join("");
}

// Libro con preliminares: el título ya sale en la portada, así que el cuerpo empieza por sus capítulos.
function docxLibro(book: Node, a: Ajustes, lang: string, d: Docx, conPortada: boolean): string {
  const centro = '<w:jc w:val="center"/>';
  const TAM: Record<string, string> = { titulo: '<w:sz w:val="56"/>', subtitulo: '<w:i/><w:sz w:val="32"/>', autor: '<w:sz w:val="32"/>', sello: "", cursiva: "<w:i/>", pequeno: '<w:sz w:val="18"/>' };
  let hojas = conPortada ? 0 : -1; // la primera hoja no necesita salto (tras la imagen ya hay uno)
  const salto = () => (++hojas > 0 ? "<w:pageBreakBefore/>" : "");
  const linea = (s: string, como = "", extra = "") => `<w:p><w:pPr>${extra}</w:pPr>${s ? `<w:r><w:rPr>${TAM[como] ?? ""}</w:rPr><w:t xml:space="preserve">${xml(s)}</w:t></w:r>` : ""}</w:p>`;
  const antes = preliminares(book, a, lang).map((p) =>
    p.lineas.map((l, k) => linea(l.s, l.como, (k ? "" : salto() + (p.id === "creditos" ? "" : '<w:spacing w:before="3600"/>')) + (p.id === "creditos" ? "" : centro))).join("")).join("");
  const L = rotulos(lang);
  const titulos = a.indice ? scenes(book).map((s) => s.scene).filter((s) => s !== book) : [];
  const indice = titulos.length ? linea(L.indice, "subtitulo", salto() + centro) + titulos.map((s) => linea(s.title)).join("") : "";
  const cuerpo = book.children.map((c, j) => docxBody(c, d, LV[book.kind] - 1, j)).join("");
  const despues = finales(a, lang).map((f) => para("Heading4", [{ t: f.titulo, b: false, i: false }], "<w:pageBreakBefore/>") + f.parrafos.map((t) => para(null, [{ t, b: false, i: false }])).join("")).join("");
  return antes + indice + cuerpo + despues;
}

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:sz w:val="24"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="320" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>${[1, 2, 3, 4, 5, 6].map((l) =>
  `<w:style w:type="paragraph" w:styleId="Heading${l}"><w:name w:val="heading ${l}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="${l < 3 ? 360 : 200}" w:after="120"/><w:outlineLvl w:val="${l - 1}"/></w:pPr><w:rPr><w:b/><w:sz w:val="${Math.max(24, 44 - l * 5)}"/></w:rPr></w:style>`).join("")}<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;

// Un guion sale en Courier 12 sencillo, con márgenes de guion, portada propia y número de página arriba a la derecha
// («2.») desde la segunda página; `papel`: Carta (EE. UU.) o A4 (Europa y Latinoamérica).
// `ajustes` (los de Maquetar): añade al libro los mismos preliminares y finales que el PDF.
export function toDocxFiles(book: Node, papel: Papel = "letter", ajustes?: Ajustes, lang = "es"): Record<string, string | Uint8Array> {
  const rel = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const cover = coverOf(book);
  const guion = book.kind === "script";
  const estilos = guion ? styles.replace('w:ascii="Georgia" w:hAnsi="Georgia"', 'w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"').replace('w:after="160" w:line="320"', 'w:after="0" w:line="240"') : styles;
  const portada = guion ? `<w:p><w:pPr><w:spacing w:before="4320"/><w:jc w:val="center"/></w:pPr><w:r><w:t xml:space="preserve">${xml(book.title.toUpperCase())}</w:t></w:r></w:p>${book.meta?.author ? `<w:p><w:pPr><w:spacing w:before="240"/><w:jc w:val="center"/></w:pPr><w:r><w:t xml:space="preserve">${xml(book.meta.author)}</w:t></w:r></w:p>` : ""}<w:p><w:r><w:br w:type="page"/></w:r></w:p>` : "";
  const [pw, ph] = papel === "A4" ? [11906, 16838] : [12240, 15840];
  const sect = guion ? `<w:sectPr><w:headerReference w:type="default" r:id="rIdHdr"/><w:pgSz w:w="${pw}" w:h="${ph}"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="2160" w:header="720" w:footer="720" w:gutter="0"/><w:titlePg/></w:sectPr>` : "";
  const header = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${W}><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>2</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r><w:r><w:t>.</w:t></w:r></w:p></w:hdr>`;
  const conPreliminares = !!ajustes && !guion && esObra(book.kind) && book.children.length > 0;
  const d: Docx = { notas: [], imagenes: [], paginar: conPreliminares };
  const cuerpo = guion ? portada + book.children.map((c, j) => docxBody(c, d, LV[book.kind] - 1, j)).join("") : conPreliminares ? docxLibro(book, ajustes!, lang, d, !!cover) : docxBody(book, d);
  const notas = d.notas.length ? `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:footnotes ${W}><w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote><w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>${d.notas.map((t, i) => `<w:footnote w:id="${i + 1}"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:footnoteRef/></w:r><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve"> ${xml(t)}</w:t></w:r></w:p></w:footnote>`).join("")}</w:footnotes>` : "";
  return {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${cover ? `<Default Extension="${cover.ext}" ContentType="image/${cover.mime}"/>` : ""}${d.imagenes.length && cover?.ext !== "jpg" ? '<Default Extension="jpg" ContentType="image/jpeg"/>' : ""}${notas ? '<Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>' : ""}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>${guion ? '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' : ""}</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="word/document.xml"/></Relationships>`,
    "word/_rels/document.xml.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/styles" Target="styles.xml"/>${cover ? `<Relationship Id="rIdCover" Type="${rel}/image" Target="media/portada.${cover.ext}"/>` : ""}${guion ? `<Relationship Id="rIdHdr" Type="${rel}/header" Target="header1.xml"/>` : ""}${notas ? `<Relationship Id="rIdNotas" Type="${rel}/footnotes" Target="footnotes.xml"/>` : ""}${d.imagenes.map((_, i) => `<Relationship Id="rIdImg${i + 1}" Type="${rel}/image" Target="media/img${i + 1}.jpg"/>`).join("")}</Relationships>`,
    "word/styles.xml": estilos,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W} xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${docxCover(cover)}${cuerpo}${sect}</w:body></w:document>`,
    ...(notas ? { "word/footnotes.xml": notas } : {}),
    ...Object.fromEntries(d.imagenes.map((m, i) => [`word/media/img${i + 1}.jpg`, bytesDe(m.src)])),
    ...(guion ? { "word/header1.xml": header } : {}),
    ...(cover ? { [`word/media/portada.${cover.ext}`]: cover.data } : {}),
  };
}

// ---------- XHTML (EPUB y PDF) ----------
// En el EPUB las notas van como ventanas emergentes al final del archivo y las imágenes como archivos; en el HTML de
// una sola página (sin `ctx`) las notas quedan entre corchetes y las imágenes incrustadas.
export interface Xhtml { nota: (texto: string) => string; imagen: (i: Imagen) => string }
const inline = (runs: Run[], ctx?: Xhtml) =>
  runs.map((r) => {
    if (r.nota !== undefined) return ctx ? ctx.nota(r.nota) : `<small> [${xml(r.nota)}]</small>`;
    const t = r.t === "\n" ? "<br/>" : xml(r.t);
    return r.b && r.t !== "\n" ? `<strong>${r.i ? `<em>${t}</em>` : t}</strong>` : r.i && r.t !== "\n" ? `<em>${t}</em>` : t;
  }).join("");

export function xhtmlBody(n: Node, base = LV[n.kind] - 1, i = 0, ctx?: Xhtml): string {
  const sep = `<p style="text-align:center;text-indent:0">${SEP}</p>`;
  const h = n.kind !== "scene" ? `<h${lv(n, base)}>${xml(n.title)}</h${lv(n, base)}>` : i > 0 ? sep : "";
  const text = conTexto(n.kind)
    ? parseBlocks(n.content).map((b) =>
        b.tag === "hr" ? sep
        : b.img ? `<div class="imagen"><img src="${xml(ctx ? ctx.imagen(b.img) : b.img.src)}" alt="${xml(b.img.alt).replace(/"/g, "&quot;")}" style="width:${b.img.ancho}%"/></div>`
        : b.filas ? `<table>${b.filas.map((f) => `<tr>${f.celdas.map((c) => `<${f.cab ? "th" : "td"}>${inline(c, ctx)}</${f.cab ? "th" : "td"}>`).join("")}</tr>`).join("")}</table>`
        : b.sp ? `<p class="sp-${b.sp}">${inline(b.runs, ctx)}</p>`
        : /^h\d$/.test(b.tag) ? `<h${head(b.tag, lv(n, base))}>${inline(b.runs, ctx)}</h${head(b.tag, lv(n, base))}>`
        : b.tag === "li" ? `<p>• ${inline(b.runs, ctx)}</p>`
        : b.tag === "blockquote" ? `<blockquote><p>${inline(b.runs, ctx)}</p></blockquote>`
        : `<p>${inline(b.runs, ctx)}</p>`).join("")
    : "";
  return h + fichaXhtml(n) + text + n.children.map((c, j) => xhtmlBody(c, base, j, ctx)).join("");
}

const page = (title: string, body: string, guion = false, lang = "es") =>
  `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${xml(lang)}"><head><meta charset="utf-8"/><title>${xml(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/>${guion ? `<style>${SP_CSS}</style>` : ""}</head><body${guion ? ' class="guion"' : ""}>${body}</body></html>`;
const EPUB_CSS = "body{font-family:serif;line-height:1.4}h1,h2,h3,h4,h5{text-align:center;margin:2em 0 1.2em;page-break-after:avoid}p{margin:0;text-indent:1.4em;text-align:justify;hyphens:auto;-webkit-hyphens:auto;orphans:2;widows:2}h1+p,h2+p,h3+p,h4+p,h5+p,blockquote p{text-indent:0}blockquote{margin:1em 2em}.ficha p{text-indent:0;text-align:center;font-style:italic}.imagen{text-align:center;margin:1em 0}.imagen img{max-width:100%}table{border-collapse:collapse;width:100%;margin:1em 0}td,th{border:1px solid #888;padding:.3em;text-align:left;vertical-align:top}aside p{text-indent:0;font-size:.9em}.pre{text-align:center;margin-top:25%}.pre p{text-indent:0;text-align:center}.titulo{font-size:2em}.subtitulo{font-size:1.3em;font-style:italic}.autor{font-size:1.3em;margin-top:2em}.sello{margin-top:4em}.cursiva{font-style:italic}.pequeno{font-size:.8em;text-align:left}.creditos p{text-align:left;min-height:1em}";

// ---------- EPUB ----------
export function toEpubFiles(book: Node, lang = "es", ajustes?: Ajustes): Record<string, string | Uint8Array> {
  const en = /^en/i.test(lang);
  const cover = coverOf(book);
  const meta = book.meta ?? {};
  const files: Record<string, string | Uint8Array> = {
    mimetype: "application/epub+zip",
    "META-INF/container.xml": `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
    "OEBPS/style.css": EPUB_CSS,
  };
  const guion = book.kind === "script";
  const conPreliminares = !!ajustes && !guion && esObra(book.kind) && book.children.length > 0;
  const imagenes: string[] = [];
  let notas: string[] = [], numero = 0; // las notas del archivo en curso
  const ctx: Xhtml = {
    nota: (t) => { const n = ++numero; notas.push(`<aside epub:type="footnote" id="n${n}"><p>${n}. ${xml(t)}</p></aside>`); return `<sup><a epub:type="noteref" href="#n${n}">${n}</a></sup>`; },
    imagen: (i) => {
      if (!i.src.startsWith("data:image/jpeg;base64,")) return i.src;
      const n = imagenes.push(`img${imagenes.length + 1}.jpg`);
      files[`OEBPS/img${n}.jpg`] = bytesDe(i.src);
      return `img${n}.jpg`;
    },
  };
  // Una sección (archivo) por capítulo: las partes y los libros de una saga tienen la suya, solo con su título.
  // `toc`: las que salen en el índice.
  const secs: { title: string; body: string; toc: boolean }[] = [];
  const seccion = (title: string, hacer: () => string) => { notas = []; const body = hacer(); secs.push({ title, body: body + notas.join(""), toc: true }); };
  const partir = (n: Node, k: number) => {
    const contenedor = !conTexto(n.kind) && n.children.length > 0;
    seccion(n.title, () => xhtmlBody(contenedor ? { ...n, children: [] } : n, LV[book.kind] - 1, k, ctx));
    if (contenedor) n.children.forEach(partir);
  };
  if (conPreliminares) for (const p of preliminares(book, ajustes!, lang))
    secs.push({ title: p.titulo, toc: false, body: `<section class="pre ${p.id}">${p.lineas.map((l) => `<p class="${l.como ?? ""}">${xml(l.s)}</p>`).join("")}</section>` });
  const primera = secs.length;
  if (book.children.length) book.children.forEach(partir);
  else seccion(book.title, () => xhtmlBody(book, undefined, 0, ctx));
  if (book.children.length && !conPreliminares) secs[primera].body = `<h1>${xml(book.title)}</h1>${secs[primera].body}`;
  if (conPreliminares) for (const f of finales(ajustes!, lang)) seccion(f.titulo, () => `<h2>${xml(f.titulo)}</h2>${f.parrafos.map((t) => `<p>${xml(t)}</p>`).join("")}`);
  secs.forEach((s, i) => (files[`OEBPS/s${i + 1}.xhtml`] = page(s.title, s.body, guion, lang)));
  if (cover) {
    files[`OEBPS/cover.${cover.ext}`] = cover.data;
    files["OEBPS/cover.xhtml"] = page(book.title, `<div style="text-align:center"><img src="cover.${cover.ext}" alt="Portada" style="max-width:100%;max-height:100%"/></div>`);
  }
  const indice = en ? "Contents" : "Índice";
  files["OEBPS/nav.xhtml"] = page(indice, `<nav epub:type="toc"><h1>${indice}</h1><ol>${secs.map((s, i) => (s.toc ? `<li><a href="s${i + 1}.xhtml">${xml(s.title)}</a></li>` : "")).join("")}</ol></nav>`, false, lang);
  files["OEBPS/content.opf"] = `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">urn:uuid:${book.id}</dc:identifier><dc:title>${xml(book.title)}</dc:title><dc:language>${xml(lang)}</dc:language>${meta.author ? `<dc:creator>${xml(meta.author)}</dc:creator>` : ""}${meta.blurb ? `<dc:description>${xml(meta.blurb)}</dc:description>` : ""}${meta.year ? `<dc:date>${xml(meta.year)}</dc:date>` : ""}<meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="style.css" media-type="text/css"/>${cover ? `<item id="cover-image" href="cover.${cover.ext}" media-type="image/${cover.mime}" properties="cover-image"/><item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>` : ""}${secs.map((_, i) => `<item id="s${i + 1}" href="s${i + 1}.xhtml" media-type="application/xhtml+xml"/>`).join("")}${imagenes.map((n, i) => `<item id="img${i + 1}" href="${n}" media-type="image/jpeg"/>`).join("")}</manifest><spine>${cover ? '<itemref idref="cover"/>' : ""}${secs.map((_, i) => `<itemref idref="s${i + 1}"/>`).join("")}</spine></package>`;
  return files;
}

// ---------- HTML (una sola página; el PDF lo genera src/maqueta) ----------
export const printHtml = (book: Node) =>
  `<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>${xml(book.title)}</title><style>
body{font:12pt/1.6 Georgia,serif;margin:0}.imagen{text-align:center}.imagen img{max-width:100%}table{border-collapse:collapse;width:100%}td,th{border:1px solid #888;padding:.3em}h1{text-align:center;margin:30vh 0 0;font-size:30pt}h2{page-break-before:always;font-size:20pt}h3{margin-top:2em;font-size:15pt}h4{text-align:center;margin:1.5em 0;font-size:0}h4::before{content:"* * *";font-size:12pt;font-weight:normal}p{margin:0 0 .8em;text-align:justify;text-indent:1.2em}blockquote{margin:1em 2em}.portada{page-break-after:always;text-align:center}.portada img{max-width:100%;max-height:95vh}.ficha{text-align:center;font-style:italic}.ficha p{text-indent:0;text-align:center}
${SP_CSS}
</style></head><body${book.kind === "script" ? ' class="guion"' : ""}>${coverOf(book) ? `<div class="portada"><img src="${coverOf(book)!.url}" alt="Portada"/></div>` : ""}${xhtmlBody(book)}</body></html>`;

export async function zip(files: Record<string, string | Uint8Array>): Promise<Uint8Array> {
  const { zipSync, strToU8 } = await import("fflate");
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(files)) out[k] = typeof v !== "string" ? v : k === "mimetype" ? [strToU8(v), { level: 0 }] : strToU8(v); // el EPUB exige mimetype sin comprimir y primero
  return zipSync(out);
}
