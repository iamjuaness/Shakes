// PDF de guion generado aquí, sin dependencias ni diálogo de impresión (que añadía fecha y URL del navegador).
// Courier 12 es una de las 14 fuentes estándar de PDF: no se incrusta. Texto en WinAnsi (español, francés, alemán…).
// Formato de industria: 10 caracteres por pulgada, 6 líneas por pulgada (1 página ≈ 1 minuto); márgenes 1" (izq. 1,5");
// portada sin número y número arriba a la derecha («2.») desde la segunda página. Test: node plugins/herramientas/herramientas.test.ts
import { scenes } from "../../../src/tree.ts";
import type { Node } from "../../../src/tree.ts";
import { MAYUS, fg, lineas, type Elem, type FormatoGuion, type Papel } from "./guion.ts";

const PT = 72, LH = 12, CW = 7.2; // puntos por pulgada, alto de línea, ancho de un carácter de Courier 12
const PAPEL: Record<Papel, [number, number]> = { letter: [612, 792], A4: [595.28, 841.89] };
const IZQ = 1.5 * PT, DER = PT, ARR = PT, ABA = PT;
// Sangría desde el margen izquierdo (pulgadas) y ancho máximo (caracteres) de cada elemento.
const SANGRIA: Record<Elem, [number, number]> = { heading: [0, 99], action: [0, 99], character: [2.3, 30], paren: [1.75, 20], dialogue: [1.1, 35], transition: [0, 99], caption: [0, 99], sfx: [0, 99], music: [0, 99] };
// Teatro: acotaciones sangradas y diálogo más ancho; cómic y radio, el diálogo algo más ancho que en cine.
const SANGRIA_F: Partial<Record<FormatoGuion, Partial<Record<Elem, [number, number]>>>> = {
  theatre: { action: [1.5, 45], dialogue: [0.8, 48], paren: [1.5, 30] },
  comic: { dialogue: [1.1, 40] },
  audio: { dialogue: [1.1, 40], action: [0.5, 55] },
};
const CURSIVA: Elem[] = ["caption", "music"]; // y la acotación en teatro
const ANTES: Record<Elem, number> = { heading: 2, action: 1, character: 1, paren: 0, dialogue: 0, transition: 1, caption: 1, sfx: 1, music: 1 }; // líneas en blanco antes

interface Trozo { t: string; b: boolean; i?: boolean }
type Linea = Trozo[];

// HTML seguro de una línea -> palabras con negrita y cursiva.
function palabras(h: string): Trozo[] {
  const out: Trozo[] = [];
  let b = false, i = false;
  for (const tok of h.split(/(<\/?(?:strong|b|em|i)>)|<[^>]+>/i)) {
    if (!tok) continue;
    const m = tok.match(/^<(\/?)(strong|b|em|i)>$/i);
    if (m) { if (/^(strong|b)$/i.test(m[2])) b = !m[1]; else i = !m[1]; continue; }
    const t = tok.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
    for (const w of t.split(/(\s+)/)) if (w) out.push({ t: w, b, i });
  }
  return out;
}

// Corta en líneas de `ancho` caracteres sin partir palabras (salvo las más largas que la línea).
function cortar(ws: Trozo[], ancho: number): Linea[] {
  const ls: Linea[] = [];
  let cur: Linea = [], n = 0;
  for (const w of ws) {
    if (/^\s+$/.test(w.t)) { if (n) { cur.push({ ...w, t: " " }); n++; } continue; }
    if (n && n + w.t.length > ancho) { while (cur.length && cur[cur.length - 1].t === " ") { cur.pop(); n--; } ls.push(cur); cur = []; n = 0; }
    let t = w.t;
    while (t.length > ancho) { ls.push([{ ...w, t: t.slice(0, ancho) }]); t = t.slice(ancho); }
    cur.push({ ...w, t }); n += t.length;
  }
  while (cur.length && cur[cur.length - 1].t === " ") cur.pop();
  if (cur.length) ls.push(cur);
  return ls;
}

const largo = (l: Linea) => l.reduce((n, x) => n + x.t.length, 0);

// WinAnsi: Latin-1 tal cual y las comillas, rayas y puntos suspensivos tipográficos en sus códigos; lo demás, «?».
const WIN: Record<string, number> = { "€": 0x80, "…": 0x85, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "–": 0x96, "—": 0x97 };
const ansi = (s: string) => [...s].map((c) => { const k = c.charCodeAt(0); const v = WIN[c] ?? (k < 256 ? k : 63); return v === 40 || v === 41 || v === 92 ? "\\" + String.fromCharCode(v) : String.fromCharCode(v); }).join("");

interface Bloque { e: Elem; ls: Linea[]; nombre?: string }

export function guionPdf(obra: Node, papel: Papel = "letter", lang = "es"): Uint8Array {
  const [W, H] = PAPEL[papel];
  const ancho = Math.floor((W - IZQ - DER) / CW);
  const porPagina = Math.floor((H - ARR - ABA) / LH);
  const en = /^en/i.test(lang);
  const g = fg(obra.meta?.formato);
  const sangria = (e: Elem) => SANGRIA_F[g]?.[e] ?? SANGRIA[e];
  const MAS = en ? "(MORE)" : "(MÁS)", CONT = en ? " (CONT'D)" : " (CONT.)";

  // Bloques: cada línea de guion cortada según su elemento (mayúsculas donde toca).
  const bloques: Bloque[] = [];
  let personaje = "";
  for (const { scene } of scenes(obra)) {
    for (const l of lineas(scene.content)) {
      const [, w] = sangria(l.e);
      const mayus = MAYUS.includes(l.e);
      const cursiva = CURSIVA.includes(l.e) || (g === "theatre" && l.e === "action");
      let ws = palabras(l.e === "paren" && !l.t.startsWith("(") ? `(${l.h})` : l.h);
      if (mayus) ws = ws.map((x) => ({ ...x, t: x.t.toUpperCase() }));
      if (cursiva) ws = ws.map((x) => ({ ...x, i: true }));
      if (l.e === "sfx") ws = ws.map((x) => ({ ...x, b: true }));
      if (l.e === "character") personaje = l.t.toUpperCase().replace(/\s*\(.*\)\s*$/, "");
      bloques.push({ e: l.e, ls: cortar(ws, Math.min(w, ancho)), nombre: personaje });
    }
  }

  // Maquetación: páginas de líneas {e, l}. Un encabezado o un personaje no se quedan solos al pie;
  // un diálogo que no cabe se corta con (MÁS) y sigue en la página siguiente con «NOMBRE (CONT.)».
  type Fila = { e: Elem; l: Linea } | null;
  const paginas: Fila[][] = [[]];
  const pag = () => paginas[paginas.length - 1];
  const libre = () => porPagina - pag().length;
  const nueva = () => paginas.push([]);
  bloques.forEach((b, i) => {
    const sig = bloques[i + 1];
    const blanco = pag().length ? ANTES[b.e] : 0;
    const junto = (b.e === "heading" || b.e === "character" || b.e === "paren") && sig ? 1 : 0; // al menos 1 línea de lo que sigue
    if (blanco + Math.min(b.ls.length, 2) + junto > libre()) nueva();
    else for (let k = 0; k < blanco; k++) pag().push(null);
    let ls = b.ls;
    while (ls.length > libre()) {
      if (b.e === "dialogue" && libre() >= 3) {
        const cabe = libre() - 1;
        ls.slice(0, cabe).forEach((l) => pag().push({ e: b.e, l }));
        pag().push({ e: "character", l: [{ t: MAS, b: false }] });
        ls = ls.slice(cabe);
        nueva();
        pag().push({ e: "character", l: [{ t: (b.nombre ?? "") + CONT, b: false }] });
      } else {
        const cabe = Math.max(1, libre());
        ls.slice(0, cabe).forEach((l) => pag().push({ e: b.e, l }));
        ls = ls.slice(cabe);
        nueva();
      }
    }
    ls.forEach((l) => pag().push({ e: b.e, l }));
  });

  // Contenido de cada página como operadores de texto PDF.
  const texto = (x: number, y: number, l: Linea) => {
    let s = `BT 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`, f = "", run = "";
    const fin = () => { if (run) s += ` (${ansi(run)}) Tj`; run = ""; };
    for (const t of l) { const ff = `/F${1 + (t.b ? 1 : 0) + (t.i ? 2 : 0)}`; if (ff !== f) { fin(); s += ` ${ff} 12 Tf`; f = ff; } run += t.t; }
    fin();
    return s + " ET";
  };
  const centrado = (y: number, t: string) => texto((W - t.length * CW) / 2, y, [{ t, b: false }]);
  const portada = [centrado(H * 0.62, obra.title.toUpperCase()), ...(obra.meta?.author ? [centrado(H * 0.62 - 3 * LH, en ? "written by" : "de"), centrado(H * 0.62 - 5 * LH, obra.meta.author)] : [])].join("\n");
  const contenidos = [portada, ...paginas.filter((p, i) => p.length || i === 0).map((filas, i) => {
    const num = `${i + 2}.`;
    const ops = [texto(W - DER - num.length * CW, H - PT / 2, [{ t: num, b: false }])];
    filas.forEach((f, k) => {
      if (!f) return;
      const y = H - ARR - (k + 1) * LH + 3;
      const x = f.e === "transition" ? W - DER - largo(f.l) * CW : IZQ + sangria(f.e)[0] * PT;
      ops.push(texto(x, y, f.l));
    });
    return ops.join("\n");
  })];

  // Objetos PDF: 1 catálogo, 2 páginas, 3-6 fuentes, luego (página, contenido) por cada hoja.
  const objs: string[] = [];
  const n = contenidos.length;
  objs.push("<< /Type /Catalog /Pages 2 0 R >>");
  objs.push(`<< /Type /Pages /Count ${n} /Kids [${contenidos.map((_, i) => `${7 + i * 2} 0 R`).join(" ")}] >>`);
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>");
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>");
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Oblique /Encoding /WinAnsiEncoding >>");
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Courier-BoldOblique /Encoding /WinAnsiEncoding >>");
  contenidos.forEach((c, i) => {
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >> >> /Contents ${8 + i * 2} 0 R >>`);
    objs.push(`<< /Length ${c.length} >>\nstream\n${c}\nendstream`);
  });
  let out = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const pos: number[] = [];
  objs.forEach((o, i) => { pos.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${pos.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info << /Title (${ansi(obra.title)}) /Producer (Shakes) >> >>\nstartxref\n${xref}\n%%EOF\n`;
  return Uint8Array.from(out, (c) => c.charCodeAt(0)); // todo es de 1 byte (WinAnsi), así que largo = bytes
}
