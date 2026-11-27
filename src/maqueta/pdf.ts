// Escribe el PDF de una maqueta, con las fuentes incrustadas. Se genera aquí (sin diálogo de impresión, que añadía
// fecha, título y dirección del navegador).
import { zlibSync } from "fflate";
import type { Maqueta } from "./componer.ts";
import type { Estilo, Familia, Glifo } from "./fuentes.ts";

const bytes = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff);
const hex = (n: number) => n.toString(16).padStart(4, "0");
// Texto de metadatos en UTF-16 (acentos y cualquier alfabeto).
const utf16 = (s: string) => "<FEFF" + Array.from({ length: s.length }, (_, i) => hex(s.charCodeAt(i))).join("") + ">";

const n2 = (x: number) => x.toFixed(2);
const rgb = (c = "#000000") => [1, 3, 5].map((i) => (parseInt(c.slice(i, i + 2), 16) / 255).toFixed(3)).join(" ");
const unicode = (s: string) => Array.from({ length: s.length }, (_, i) => hex(s.charCodeAt(i))).join("");
// JPEG: tamaño en píxeles y componentes, del marcador SOF.
function jpeg(data: Uint8Array) {
  for (let i = 2; i + 9 < data.length; i += 2 + ((data[i + 2] << 8) | data[i + 3])) {
    const marca = data[i + 1];
    if (marca >= 0xc0 && marca <= 0xc3) return { h: (data[i + 5] << 8) | data[i + 6], w: (data[i + 7] << 8) | data[i + 8], comps: data[i + 9] };
  }
  return null;
}

export function maquetaPdf(m: Maqueta, familia: Familia, info: { titulo: string; autor?: string }): Uint8Array {
  const objs: Uint8Array[][] = [];
  const reservar = () => objs.push([]);
  const definir = (id: number, cuerpo: string) => (objs[id - 1] = [bytes(cuerpo)]);
  const objeto = (cuerpo: string) => { const id = reservar(); definir(id, cuerpo); return id; };
  const flujo = (data: Uint8Array, extra = "", comprimir = true) => {
    const d = comprimir ? zlibSync(data) : data;
    const id = reservar();
    objs[id - 1] = [bytes(`<< /Length ${d.length}${comprimir ? " /Filter /FlateDecode" : ""} ${extra} >>\nstream\n`), d, bytes("\nendstream")];
    return id;
  };

  const catalogo = reservar(), raiz = reservar();

  // Texto ya formado (ligaduras e interletraje) y glifos que usa cada archivo de fuente (anchos y copia del texto).
  // Cada archivo es un recurso: estilo + número («r0», «r1»…).
  const usados = new Map<string, { e: Estilo; p: number; u: Map<number, string> }>();
  const formados = m.paginas.map((pag) => pag.textos.map((t) => {
    const glifos: Glifo[] = familia[t.f].formar(t.s);
    for (const g of glifos) {
      const clave = `${t.f}${g.p}`;
      let x = usados.get(clave);
      if (!x) usados.set(clave, (x = { e: t.f, p: g.p, u: new Map() }));
      x.u.set(g.g, g.t);
    }
    return glifos;
  }));
  const recursos: string[] = [];
  [...usados].forEach(([clave, { e, p, u }], n) => {
    const f = familia[e], d = f.partes[p];
    let id: number;
    if (!d) id = objeto(`<< /Type /Font /Subtype /Type1 /BaseFont /${f.courier} /Encoding /WinAnsiEncoding >>`);
    else {
      const k = 1000 / d.upm, nombre = `SHKS${String.fromCharCode(65 + Math.floor(n / 26), 65 + (n % 26))}AA+Libro-${clave}`;
      const archivo = flujo(d.sfnt, `/Length1 ${d.sfnt.length}`);
      const desc = objeto(`<< /Type /FontDescriptor /FontName /${nombre} /Flags ${4 + (d.angulo ? 64 : 0)} /FontBBox [${d.caja.map((v) => Math.round(v * k)).join(" ")}] /ItalicAngle ${d.angulo.toFixed(1)} /Ascent ${Math.round(d.ascenso * k)} /Descent ${Math.round(d.descenso * k)} /CapHeight ${Math.round(f.capAlto * 1000)} /StemV 80 /FontFile2 ${archivo} 0 R >>`);
      const gs = [...u.keys()].sort((a, b) => a - b);
      const cid = objeto(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${nombre} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${desc} 0 R /CIDToGIDMap /Identity /W [${gs.map((g) => `${g} [${Math.round(d.avance(g) * k)}]`).join(" ")}] >>`);
      const pares = gs.filter((g) => g).map((g) => `<${hex(g)}> <${unicode(u.get(g)!)}>`);
      let mapa = "/CIDInit /ProcSet findresource begin 12 dict begin begincmap /CMapName /Adobe-Identity-UCS def /CMapType 2 def 1 begincodespacerange <0000> <FFFF> endcodespacerange\n";
      for (let i = 0; i < pares.length; i += 100) { const g = pares.slice(i, i + 100); mapa += `${g.length} beginbfchar\n${g.join("\n")}\nendbfchar\n`; }
      const uni = flujo(bytes(mapa + "endcmap CMapName currentdict /CMap defineresource pop end end"));
      id = objeto(`<< /Type /Font /Subtype /Type0 /BaseFont /${nombre} /Encoding /Identity-H /DescendantFonts [${cid} 0 R] /ToUnicode ${uni} 0 R >>`);
    }
    recursos.push(`/${clave} ${id} 0 R`);
  });

  // Cada imagen se guarda una vez aunque se repita.
  const fotos = new Map<string, { nombre: string; id: number }>();
  for (const p of m.paginas) for (const i of p.imagenes ?? []) {
    const b64 = i.src.match(/^data:image\/jpeg;base64,(.+)$/)?.[1];
    if (!b64 || fotos.has(i.src)) continue;
    const data = bytes(atob(b64)), t = jpeg(data);
    if (t) fotos.set(i.src, { nombre: `Im${fotos.size}`, id: flujo(data, `/Type /XObject /Subtype /Image /Width ${t.w} /Height ${t.h} /ColorSpace /Device${t.comps === 1 ? "Gray" : "RGB"} /BitsPerComponent 8 /Filter /DCTDecode`, false) });
  }

  const paginas = m.paginas.map((p, n) => {
    const rects = (encima: boolean) => (p.rects ?? []).filter((r) => !!r.encima === encima)
      .map((r) => `${rgb(r.color)} rg ${n2(r.x)} ${n2(m.h - r.y - r.h)} ${n2(r.w)} ${n2(r.h)} re f\n`).join("");
    let c = rects(false);
    const usadas = new Set<{ nombre: string; id: number }>();
    for (const i of p.imagenes ?? []) {
      const f = fotos.get(i.src);
      if (!f) continue;
      usadas.add(f);
      const recorte = i.marco ? `${n2(i.marco.x)} ${n2(m.h - i.marco.y - i.marco.h)} ${n2(i.marco.w)} ${n2(i.marco.h)} re W n ` : "";
      c += `q ${recorte}${n2(i.w)} 0 0 ${n2(i.h)} ${n2(i.x)} ${n2(m.h - i.y - i.h)} cm /${f.nombre} Do Q\n`;
    }
    c += rects(true);
    c += "BT\n";
    let fuente = "", color = "";
    p.textos.forEach((t, k) => {
      const col = `${rgb(t.color)} rg`;
      if (col !== color) { c += col + "\n"; color = col; }
      c += t.giro ? `0 -1 1 0 ${n2(t.x)} ${n2(m.h - t.y)} Tm ` : `1 0 0 1 ${n2(t.x)} ${n2(m.h - t.y)} Tm `;
      // Un tramo por archivo de fuente; el interletraje va como ajuste dentro de TJ (milésimas, positivo = junta).
      const glifos = formados[n][k];
      for (let i = 0; i < glifos.length;) {
        const parte = glifos[i].p, ff = `/${t.f}${parte} ${n2(t.size)} Tf`;
        if (ff !== fuente) { c += ff + " "; fuente = ff; }
        let tj = "<";
        for (; i < glifos.length && glifos[i].p === parte; i++) {
          const g = glifos[i];
          tj += familia[t.f].courier ? g.g.toString(16).padStart(2, "0") : hex(g.g);
          if (g.kx) tj += `> ${+(-g.kx * 1000).toFixed(1)} <`;
        }
        c += `[${tj}>] TJ\n`;
      }
    });
    const contenido = flujo(bytes(c + "ET"));
    const caja = `[0 0 ${m.w.toFixed(2)} ${m.h.toFixed(2)}]`;
    return objeto(`<< /Type /Page /Parent ${raiz} 0 R /MediaBox ${caja} /TrimBox ${caja} /Resources << /Font << ${recursos.join(" ")} >>${usadas.size ? ` /XObject << ${[...usadas].map((f) => `/${f.nombre} ${f.id} 0 R`).join(" ")} >>` : ""} >> /Contents ${contenido} 0 R >>`);
  });
  definir(catalogo, `<< /Type /Catalog /Pages ${raiz} 0 R >>`);
  definir(raiz, `<< /Type /Pages /Count ${paginas.length} /Kids [${paginas.map((i) => `${i} 0 R`).join(" ")}] >>`);
  const meta = objeto(`<< /Title ${utf16(info.titulo)}${info.autor ? ` /Author ${utf16(info.autor)}` : ""} /Producer (Shakes) >>`);

  const partes: Uint8Array[] = [bytes("%PDF-1.6\n%\xE2\xE3\xCF\xD3\n")];
  let largo = partes[0].length;
  const pos: number[] = [];
  const meter = (b: Uint8Array) => { partes.push(b); largo += b.length; };
  objs.forEach((o, i) => { pos.push(largo); meter(bytes(`${i + 1} 0 obj\n`)); o.forEach(meter); meter(bytes("\nendobj\n")); });
  const xref = largo;
  meter(bytes(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${pos.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root ${catalogo} 0 R /Info ${meta} 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
  const out = new Uint8Array(largo);
  partes.reduce((p, b) => (out.set(b, p), p + b.length), 0);
  return out;
}
