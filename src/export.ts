// Exportadores. Los builders son puros (devuelven {ruta: contenido}); `zip` empaqueta con fflate cargado bajo demanda.
import type { Kind, Node } from "./tree.ts";

interface Run { t: string; b: boolean; i: boolean }
interface Block { tag: string; runs: Run[] }

const dec = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const level: Record<Kind, number> = { book: 1, part: 2, chapter: 3, scene: 4 };

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

const head = (tag: string) => Math.min(6, +tag[1] + 4); // h1 dentro de una escena (nivel 4) -> encabezado 5

// ---------- DOCX ----------
const runXml = (r: Run) =>
  r.t === "\n" ? "<w:r><w:br/></w:r>" : `<w:r><w:rPr>${r.b ? "<w:b/>" : ""}${r.i ? "<w:i/>" : ""}</w:rPr><w:t xml:space="preserve">${xml(r.t)}</w:t></w:r>`;
const para = (style: string | null, runs: Run[], extra = "") =>
  `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ""}${extra}</w:pPr>${runs.map(runXml).join("")}</w:p>`;

function docxBody(n: Node): string {
  const own = para(`Heading${level[n.kind]}`, [{ t: n.title, b: false, i: false }]);
  const text = n.kind === "scene"
    ? parseBlocks(n.content).map((b) =>
        /^h\d$/.test(b.tag) ? para(`Heading${head(b.tag)}`, b.runs)
        : b.tag === "li" ? para(null, [{ t: "• ", b: false, i: false }, ...b.runs])
        : b.tag === "blockquote" ? para(null, b.runs, '<w:ind w:left="720"/>')
        : para(null, b.runs)).join("")
    : "";
  return own + text + n.children.map(docxBody).join("");
}

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:sz w:val="24"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="320" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>${[1, 2, 3, 4, 5, 6].map((l) =>
  `<w:style w:type="paragraph" w:styleId="Heading${l}"><w:name w:val="heading ${l}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="${l < 3 ? 360 : 200}" w:after="120"/><w:outlineLvl w:val="${l - 1}"/></w:pPr><w:rPr><w:b/><w:sz w:val="${Math.max(24, 44 - l * 5)}"/></w:rPr></w:style>`).join("")}<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;

export function toDocxFiles(book: Node): Record<string, string> {
  const rel = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  return {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="word/document.xml"/></Relationships>`,
    "word/_rels/document.xml.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/styles" Target="styles.xml"/></Relationships>`,
    "word/styles.xml": styles,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${docxBody(book)}</w:body></w:document>`,
  };
}

// ---------- XHTML (EPUB y PDF) ----------
const inline = (runs: Run[]) =>
  runs.map((r) => {
    const t = r.t === "\n" ? "<br/>" : xml(r.t);
    return r.b && r.t !== "\n" ? `<strong>${r.i ? `<em>${t}</em>` : t}</strong>` : r.i && r.t !== "\n" ? `<em>${t}</em>` : t;
  }).join("");

export function xhtmlBody(n: Node): string {
  const h = `<h${level[n.kind]}>${xml(n.title)}</h${level[n.kind]}>`;
  const text = n.kind === "scene"
    ? parseBlocks(n.content).map((b) =>
        /^h\d$/.test(b.tag) ? `<h${head(b.tag)}>${inline(b.runs)}</h${head(b.tag)}>`
        : b.tag === "li" ? `<p>• ${inline(b.runs)}</p>`
        : b.tag === "blockquote" ? `<blockquote><p>${inline(b.runs)}</p></blockquote>`
        : `<p>${inline(b.runs)}</p>`).join("")
    : "";
  return h + text + n.children.map(xhtmlBody).join("");
}

const page = (title: string, body: string) =>
  `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="es"><head><meta charset="utf-8"/><title>${xml(title)}</title></head><body>${body}</body></html>`;

// ---------- EPUB ----------
export function toEpubFiles(book: Node): Record<string, string> {
  const secs = book.children.length ? book.children : [book];
  const files: Record<string, string> = {
    mimetype: "application/epub+zip",
    "META-INF/container.xml": `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
  };
  secs.forEach((s, i) => (files[`OEBPS/s${i + 1}.xhtml`] = page(s.title, s === book ? xhtmlBody(book) : `${i === 0 ? `<h1>${xml(book.title)}</h1>` : ""}${xhtmlBody(s)}`)));
  files["OEBPS/nav.xhtml"] = page("Índice", `<nav epub:type="toc"><h1>Índice</h1><ol>${secs.map((s, i) => `<li><a href="s${i + 1}.xhtml">${xml(s.title)}</a></li>`).join("")}</ol></nav>`);
  files["OEBPS/content.opf"] = `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">urn:uuid:${book.id}</dc:identifier><dc:title>${xml(book.title)}</dc:title><dc:language>es</dc:language><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>${secs.map((_, i) => `<item id="s${i + 1}" href="s${i + 1}.xhtml" media-type="application/xhtml+xml"/>`).join("")}</manifest><spine>${secs.map((_, i) => `<itemref idref="s${i + 1}"/>`).join("")}</spine></package>`;
  return files;
}

// ---------- PDF (diálogo de impresión del sistema) ----------
export const printHtml = (book: Node) =>
  `<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>${xml(book.title)}</title><style>
body{font:12pt/1.6 Georgia,serif;margin:0}h1{text-align:center;margin:30vh 0 0;font-size:30pt}h2{page-break-before:always;font-size:20pt}h3{margin-top:2em;font-size:15pt}h4{text-align:center;margin:1.5em 0;font-size:0}h4::before{content:"* * *";font-size:12pt;font-weight:normal}p{margin:0 0 .8em;text-align:justify;text-indent:1.2em}blockquote{margin:1em 2em}
</style></head><body>${xhtmlBody(book)}</body></html>`;

export async function zip(files: Record<string, string>): Promise<Uint8Array> {
  const { zipSync, strToU8 } = await import("fflate");
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(files)) out[k] = k === "mimetype" ? [strToU8(v), { level: 0 }] : strToU8(v); // el EPUB exige mimetype sin comprimir y primero
  return zipSync(out);
}
