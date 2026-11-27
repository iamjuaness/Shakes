// Puro: Markdown / texto de DOCX -> escenas. Un título (#, o estilo Título/Heading) abre una escena nueva.
export interface Bloque { h: boolean; t: string; n?: number; html?: string } // n = nivel del título (1 = el más alto); html: texto ya con formato
export type Tipo = "part" | "chapter" | "scene";
export interface Est { tipo: Tipo; titulo: string; html: string; hijos: Est[] }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const dec = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

export function mdBloques(md: string): Bloque[] {
  const out: Bloque[] = [];
  let par: string[] = [];
  const flush = () => { if (par.length) out.push({ h: false, t: par.join(" ") }); par = []; };
  for (const line of md.replace(/\r/g, "").split("\n")) {
    const h = line.match(/^#{1,6}\s+(.*)$/);
    if (h) { flush(); out.push({ h: true, t: h[1].trim(), n: line.indexOf(" ") }); }
    else if (!line.trim()) flush();
    else par.push(line.trim());
  }
  flush();
  return out;
}

const textos = (xml: string) => dec([...xml.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g)].map((x) => x[1]).join(""));
const marcado = (rpr: string, e: string) => new RegExp(`<w:${e}(?:\\s*/>| w:val="(?!0|false)[^"]*"\\s*/>)`).test(rpr);
// Notas al pie de word/footnotes.xml por número (sin los separadores).
const notasDe = (xml = "") => new Map([...xml.matchAll(/<w:footnote\b(?![^>]*w:type=)[^>]*w:id="(\d+)"[^>]*>([\s\S]*?)<\/w:footnote>/g)].map((m) => [m[1], textos(m[2]).trim()]));

// Un párrafo de Word con sus negritas, cursivas, saltos y notas. El texto borrado con control de cambios no cuenta.
function parrafoHtml(p: string, notas: Map<string, string>): string {
  const tramos: { s: string; b: boolean; i: boolean }[] = [];
  for (const [, r] of p.matchAll(/<w:r(?: [^>]*)?>([\s\S]*?)<\/w:r>/g)) {
    const rpr = r.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? "";
    const b = marcado(rpr, "b"), i = marcado(rpr, "i");
    for (const m of r.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>|<w:br\s*\/>|<w:footnoteReference [^>]*w:id="(\d+)"[^>]*\/>/g)) {
      const s = m[1] !== undefined ? esc(dec(m[1])) : m[2] !== undefined ? (notas.get(m[2]) ? `<span data-pie="${encodeURIComponent(notas.get(m[2])!)}"></span>` : "") : "<br>";
      const ult = tramos[tramos.length - 1];
      if (ult && ult.b === b && ult.i === i) ult.s += s;
      else if (s) tramos.push({ s, b, i });
    }
  }
  return tramos.map((x) => { const t = x.i ? `<em>${x.s}</em>` : x.s; return x.b ? `<strong>${t}</strong>` : t; }).join("").trim();
}

// `xml` = contenido de word/document.xml; `notas` = word/footnotes.xml.
export function docxBloques(xml: string, notas?: string): Bloque[] {
  const pies = notasDe(notas);
  return [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map((m): Bloque => {
    const st = m[0].match(/<w:pStyle w:val="(?:Heading|Ttulo|Título|Title)(\d?)"/i);
    const t = textos(m[0]).trim();
    return st ? { h: true, n: Number(st[1]) || 1, t } : { h: false, t, html: parrafoHtml(m[0], pies) };
  }).filter((b) => b.t);
}

export interface ComentarioDocx { autor: string; texto: string; cita: string; capitulo: string }
// Comentarios de Word (word/comments.xml) con el texto señalado y el capítulo donde están.
export function docxComentarios(xml: string, comentarios = ""): ComentarioDocx[] {
  const lista = new Map([...comentarios.matchAll(/<w:comment\b([^>]*)>([\s\S]*?)<\/w:comment>/g)].map((m) => [m[1].match(/w:id="(\d+)"/)?.[1], { autor: dec(m[1].match(/w:author="([^"]*)"/)?.[1] ?? ""), texto: textos(m[2]).trim() }]));
  const out: ComentarioDocx[] = [];
  let capitulo = "";
  for (const [p] of xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    if (/<w:pStyle w:val="(?:Heading|Ttulo|Título|Title)\d?"/i.test(p)) { capitulo = textos(p).trim(); continue; }
    for (const m of p.matchAll(/<w:commentRangeStart [^>]*w:id="(\d+)"[^>]*\/>/g)) {
      const c = lista.get(m[1]);
      if (!c) continue;
      const resto = p.slice(m.index! + m[0].length), fin = resto.search(new RegExp(`<w:commentRangeEnd [^>]*w:id="${m[1]}"`));
      out.push({ ...c, cita: textos(fin < 0 ? resto : resto.slice(0, fin)).trim(), capitulo });
    }
  }
  return out;
}

const inline = (t: string) => esc(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");

const ORDEN: Tipo[] = ["part", "chapter", "scene"];
const PALABRA: [RegExp, Tipo][] = [[/^(parte|part)\b/i, "part"], [/^(cap[ií]tulo|cap\.|chapter)\b/i, "chapter"], [/^(escena|scene)\b/i, "scene"]];

// Qué es cada nivel de título: por la palabra («Parte», «Capítulo», «Escena») y, si no, por cuántos niveles hay:
// 1 nivel = capítulos; 2 = capítulos y escenas; 3+ = partes, capítulos y escenas. Las escenas no son nodos: son
// cambios de escena (<hr>) dentro del capítulo.
export function tiposPorNivel(bloques: Bloque[]): Map<number, Tipo> {
  const hs = bloques.filter((b) => b.h);
  const niveles = [...new Set(hs.map((b) => b.n ?? 1))].sort((a, b) => a - b);
  const out = new Map<number, Tipo>();
  for (const n of niveles) {
    const t = hs.find((b) => (b.n ?? 1) === n && PALABRA.some(([re]) => re.test(b.t)));
    if (t) out.set(n, PALABRA.find(([re]) => re.test(t.t))![1]);
  }
  niveles.forEach((n, i) => {
    if (out.has(n)) return;
    const prev = [...niveles.slice(0, i)].reverse().find((m) => out.has(m));
    const next = niveles.slice(i + 1).find((m) => out.has(m));
    const k = prev !== undefined ? ORDEN.indexOf(out.get(prev)!) + (i - niveles.indexOf(prev)) : next !== undefined ? ORDEN.indexOf(out.get(next)!) - (niveles.indexOf(next) - i) : (niveles.length === 1 ? 1 : niveles.length === 2 ? i + 1 : i);
    out.set(n, ORDEN[Math.min(2, Math.max(0, k))]);
  });
  return out;
}

// Arma el árbol del libro (partes y capítulos) con lo que el documento trae. El texto va en los capítulos: si una
// parte trae texto suelto se crea un «Capítulo 1» dentro. `titulo` nombra el texto anterior al primer título.
export function estructura(bloques: Bloque[], titulo: string): Est[] {
  const tipos = tiposPorNivel(bloques);
  const raiz: Est[] = [];
  const pila: Est[] = []; // camino abierto, de fuera adentro
  const rango = (t: Tipo) => ORDEN.indexOf(t);
  let cap: Est | null = null;
  const nuevo = (tipo: Tipo, t: string): Est => ({ tipo, titulo: t, html: "", hijos: [] });
  const capitulo = () => {
    if (cap) return cap;
    cap = nuevo("chapter", pila.length ? "Capítulo 1" : titulo);
    (pila.length ? pila[pila.length - 1].hijos : raiz).push(cap);
    return cap;
  };
  for (const b of bloques) {
    const tipo = b.h ? tipos.get(b.n ?? 1)! : null;
    if (tipo === "scene") { const c = capitulo(); if (c.html) c.html += "<hr>"; continue; }
    if (tipo) {
      const e = nuevo(tipo, b.t);
      while (pila.length && rango(pila[pila.length - 1].tipo) >= rango(e.tipo)) pila.pop();
      (pila.length ? pila[pila.length - 1].hijos : raiz).push(e);
      pila.push(e);
      cap = tipo === "chapter" ? e : null;
    } else if (/^(?:\*\s*){3}$/.test(b.t)) { const c = capitulo(); if (c.html) c.html += "<hr>"; }
    else capitulo().html += `<p>${b.html ?? inline(b.t)}</p>`;
  }
  return raiz;
}
