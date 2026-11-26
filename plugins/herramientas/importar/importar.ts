// Puro: Markdown / texto de DOCX -> escenas. Un título (#, o estilo Título/Heading) abre una escena nueva.
export interface Bloque { h: boolean; t: string; n?: number } // n = nivel del título (1 = el más alto)
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

// `xml` = contenido de word/document.xml.
export function docxBloques(xml: string): Bloque[] {
  return [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map((m) => {
    const st = m[0].match(/<w:pStyle w:val="(?:Heading|Ttulo|Título|Title)(\d?)"/i);
    return { h: !!st, n: st ? Number(st[1]) || 1 : undefined, t: dec([...m[0].matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g)].map((x) => x[1]).join("")).trim() };
  }).filter((b) => b.t).map((b) => (b.h ? b : { h: false, t: b.t }));
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
    } else capitulo().html += `<p>${inline(b.t)}</p>`;
  }
  return raiz;
}
