// Exportadores. Los builders son puros (devuelven {ruta: contenido}); `zip` empaqueta con fflate cargado bajo demanda.
import type { Kind, Node } from "./tree.ts";
import { lineaMeta } from "./tree.ts";

interface Run { t: string; b: boolean; i: boolean }
interface Block { tag: string; runs: Run[] }

const dec = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Niveles de encabezado relativos a la raíz exportada: un libro empieza en 1; una saga o un universo, en 1 y sus libros en 2.
const LV: Record<Kind, number> = { blank: 0, universe: 1, saga: 2, book: 3, part: 4, chapter: 5, scene: 6 };
const lv = (n: Node, base: number) => Math.min(6, LV[n.kind] - base);

// HTML de TipTap -> bloques con tramos negrita/cursiva.
export function parseBlocks(html = ""): Block[] {
  return [...html.matchAll(/<(p|h[1-6]|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => {
    let b = false, i = false;
    const runs: Run[] = [];
    for (const tok of m[2].split(/(<[^>]+>)/)) {
      const tag = tok.match(/^<(\/?)(\w+)/);
      if (tag) {
        const on = !tag[1], n = tag[2].toLowerCase();
        if (n === "strong" || n === "b") b = on;
        else if (n === "em" || n === "i") i = on;
        else if (n === "br") runs.push({ t: "\n", b, i });
      } else if (tok) runs.push({ t: dec(tok), b, i });
    }
    return { tag: m[1].toLowerCase(), runs };
  });
}

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

const head = (tag: string, escena: number) => Math.min(6, +tag[1] + escena); // h1 dentro de una escena (nivel 4) -> encabezado 5

// ---------- DOCX ----------
const runXml = (r: Run) =>
  r.t === "\n" ? "<w:r><w:br/></w:r>" : `<w:r><w:rPr>${r.b ? "<w:b/>" : ""}${r.i ? "<w:i/>" : ""}</w:rPr><w:t xml:space="preserve">${xml(r.t)}</w:t></w:r>`;
const para = (style: string | null, runs: Run[], extra = "") =>
  `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ""}${extra}</w:pPr>${runs.map(runXml).join("")}</w:p>`;

function docxBody(n: Node, base = LV[n.kind] - 1): string {
  const own = para(`Heading${lv(n, base)}`, [{ t: n.title, b: false, i: false }]);
  const text = n.kind === "scene"
    ? parseBlocks(n.content).map((b) =>
        /^h\d$/.test(b.tag) ? para(`Heading${head(b.tag, lv(n, base))}`, b.runs)
        : b.tag === "li" ? para(null, [{ t: "• ", b: false, i: false }, ...b.runs])
        : b.tag === "blockquote" ? para(null, b.runs, '<w:ind w:left="720"/>')
        : para(null, b.runs)).join("")
    : "";
  return own + docxMeta(n) + text + n.children.map((c) => docxBody(c, base)).join("");
}

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:sz w:val="24"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="320" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>${[1, 2, 3, 4, 5, 6].map((l) =>
  `<w:style w:type="paragraph" w:styleId="Heading${l}"><w:name w:val="heading ${l}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="${l < 3 ? 360 : 200}" w:after="120"/><w:outlineLvl w:val="${l - 1}"/></w:pPr><w:rPr><w:b/><w:sz w:val="${Math.max(24, 44 - l * 5)}"/></w:rPr></w:style>`).join("")}<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;

export function toDocxFiles(book: Node): Record<string, string | Uint8Array> {
  const rel = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const cover = coverOf(book);
  return {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${cover ? `<Default Extension="${cover.ext}" ContentType="image/${cover.mime}"/>` : ""}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="word/document.xml"/></Relationships>`,
    "word/_rels/document.xml.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/styles" Target="styles.xml"/>${cover ? `<Relationship Id="rIdCover" Type="${rel}/image" Target="media/portada.${cover.ext}"/>` : ""}</Relationships>`,
    "word/styles.xml": styles,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W} xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${docxCover(cover)}${docxBody(book)}</w:body></w:document>`,
    ...(cover ? { [`word/media/portada.${cover.ext}`]: cover.data } : {}),
  };
}

// ---------- XHTML (EPUB y PDF) ----------
const inline = (runs: Run[]) =>
  runs.map((r) => {
    const t = r.t === "\n" ? "<br/>" : xml(r.t);
    return r.b && r.t !== "\n" ? `<strong>${r.i ? `<em>${t}</em>` : t}</strong>` : r.i && r.t !== "\n" ? `<em>${t}</em>` : t;
  }).join("");

export function xhtmlBody(n: Node, base = LV[n.kind] - 1): string {
  const h = `<h${lv(n, base)}>${xml(n.title)}</h${lv(n, base)}>`;
  const text = n.kind === "scene"
    ? parseBlocks(n.content).map((b) =>
        /^h\d$/.test(b.tag) ? `<h${head(b.tag, lv(n, base))}>${inline(b.runs)}</h${head(b.tag, lv(n, base))}>`
        : b.tag === "li" ? `<p>• ${inline(b.runs)}</p>`
        : b.tag === "blockquote" ? `<blockquote><p>${inline(b.runs)}</p></blockquote>`
        : `<p>${inline(b.runs)}</p>`).join("")
    : "";
  return h + fichaXhtml(n) + text + n.children.map((c) => xhtmlBody(c, base)).join("");
}

const page = (title: string, body: string) =>
  `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="es"><head><meta charset="utf-8"/><title>${xml(title)}</title></head><body>${body}</body></html>`;

// ---------- EPUB ----------
export function toEpubFiles(book: Node): Record<string, string | Uint8Array> {
  const secs = book.children.length ? book.children : [book];
  const cover = coverOf(book);
  const meta = book.meta ?? {};
  const files: Record<string, string | Uint8Array> = {
    mimetype: "application/epub+zip",
    "META-INF/container.xml": `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
  };
  secs.forEach((s, i) => (files[`OEBPS/s${i + 1}.xhtml`] = page(s.title, s === book ? xhtmlBody(book) : `${i === 0 ? `<h1>${xml(book.title)}</h1>` : ""}${xhtmlBody(s, LV[book.kind] - 1)}`)));
  if (cover) {
    files[`OEBPS/cover.${cover.ext}`] = cover.data;
    files["OEBPS/cover.xhtml"] = page(book.title, `<div style="text-align:center"><img src="cover.${cover.ext}" alt="Portada" style="max-width:100%;max-height:100%"/></div>`);
  }
  files["OEBPS/nav.xhtml"] = page("Índice", `<nav epub:type="toc"><h1>Índice</h1><ol>${secs.map((s, i) => `<li><a href="s${i + 1}.xhtml">${xml(s.title)}</a></li>`).join("")}</ol></nav>`);
  files["OEBPS/content.opf"] = `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">urn:uuid:${book.id}</dc:identifier><dc:title>${xml(book.title)}</dc:title><dc:language>es</dc:language>${meta.author ? `<dc:creator>${xml(meta.author)}</dc:creator>` : ""}${meta.blurb ? `<dc:description>${xml(meta.blurb)}</dc:description>` : ""}${meta.year ? `<dc:date>${xml(meta.year)}</dc:date>` : ""}<meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>${cover ? `<item id="cover-image" href="cover.${cover.ext}" media-type="image/${cover.mime}" properties="cover-image"/><item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>` : ""}${secs.map((_, i) => `<item id="s${i + 1}" href="s${i + 1}.xhtml" media-type="application/xhtml+xml"/>`).join("")}</manifest><spine>${cover ? '<itemref idref="cover"/>' : ""}${secs.map((_, i) => `<itemref idref="s${i + 1}"/>`).join("")}</spine></package>`;
  return files;
}

// ---------- PDF (diálogo de impresión del sistema) ----------
export const printHtml = (book: Node) =>
  `<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>${xml(book.title)}</title><style>
body{font:12pt/1.6 Georgia,serif;margin:0}h1{text-align:center;margin:30vh 0 0;font-size:30pt}h2{page-break-before:always;font-size:20pt}h3{margin-top:2em;font-size:15pt}h4{text-align:center;margin:1.5em 0;font-size:0}h4::before{content:"* * *";font-size:12pt;font-weight:normal}p{margin:0 0 .8em;text-align:justify;text-indent:1.2em}blockquote{margin:1em 2em}.portada{page-break-after:always;text-align:center}.portada img{max-width:100%;max-height:95vh}.ficha{text-align:center;font-style:italic}.ficha p{text-indent:0;text-align:center}
</style></head><body>${coverOf(book) ? `<div class="portada"><img src="${coverOf(book)!.url}" alt="Portada"/></div>` : ""}${xhtmlBody(book)}</body></html>`;

export async function zip(files: Record<string, string | Uint8Array>): Promise<Uint8Array> {
  const { zipSync, strToU8 } = await import("fflate");
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(files)) out[k] = typeof v !== "string" ? v : k === "mimetype" ? [strToU8(v), { level: 0 }] : strToU8(v); // el EPUB exige mimetype sin comprimir y primero
  return zipSync(out);
}
