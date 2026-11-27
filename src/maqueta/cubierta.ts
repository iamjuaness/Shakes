// Cubierta completa para imprenta (puro): contraportada, lomo y portada en una sola hoja, con sangrado y el lomo
// calculado según las páginas del interior y el papel.
import type { Node } from "../tree.ts";
import { PT, componer } from "./componer.ts";
import type { Maqueta, Pagina } from "./componer.ts";
import { ajustesDe } from "./ajustes.ts";
import type { Ajustes } from "./ajustes.ts";
import type { Cortar } from "./guiones.ts";
import type { Estilo, Familia } from "./fuentes.ts";

export const GROSOR = { blanco: 0.0572, crema: 0.0635 }; // mm por página (impresión bajo demanda)
export const MIN_PAGINAS_LOMO = 80; // con menos, las imprentas no admiten texto en el lomo

export interface Cubierta { m: Maqueta; lomo: number; ancho: number; alto: number; guias: { x: number; y: number; w: number; h: number }[]; avisos: string[] } // medidas en mm; guías en pt

export function cubierta(obra: Node, a: Ajustes, familia: Familia, paginas: number, imagen?: { src: string; w: number; h: number }, lang = "es", cortar?: Cortar): Cubierta {
  const en = /^en/i.test(lang);
  const lomo = paginas * GROSOR[a.cubPapel];
  const ancho = 2 * a.cubSangrado + 2 * a.ancho + lomo, alto = a.alto + 2 * a.cubSangrado;
  const S = a.cubSangrado * PT, P = a.ancho * PT, H = a.alto * PT, L = lomo * PT, W = ancho * PT, AL = alto * PT;
  const xLomo = S + P, xPortada = xLomo + L;
  const margen = Math.max(9 * PT, P * 0.09);
  const pag: Pagina = { textos: [], rects: [{ x: 0, y: 0, w: W, h: AL, color: a.cubFondo }], imagenes: [] };
  const avisos: string[] = [];
  const faltan = new Set<string>();
  const poner = (s: string, x: number, y: number, size: number, f: Estilo = "r") => {
    for (const c of s) if (!familia[f].tiene(c.codePointAt(0)!)) faltan.add(c);
    pag.textos.push({ x, y, s, f, size, color: a.cubTexto });
  };
  // Texto centrado en una caja, encogido si hace falta, partido por palabras.
  const centrado = (texto: string, x: number, caja: number, y: number, size: number, f: Estilo = "r") => {
    const palabras = texto.split(/\s+/).filter(Boolean);
    const tam = Math.min(size, ...palabras.map((p) => caja / familia[f].ancho(p)));
    const lineas: string[] = [];
    for (const p of palabras) {
      const ult = lineas[lineas.length - 1];
      if (ult !== undefined && familia[f].ancho(`${ult} ${p}`) * tam <= caja) lineas[lineas.length - 1] = `${ult} ${p}`;
      else lineas.push(p);
    }
    lineas.forEach((l, i) => poner(l, x + (caja - familia[f].ancho(l) * tam) / 2, y + i * tam * 1.2, tam, f));
    return y + lineas.length * tam * 1.2;
  };

  // Portada: la imagen llena la cara (y el sangrado), recortada sin deformarse.
  if (imagen) {
    const marco = { x: xPortada, y: 0, w: P + S, h: AL };
    const k = Math.max(marco.w / imagen.w, marco.h / imagen.h);
    const w = imagen.w * k, h = imagen.h * k;
    pag.imagenes!.push({ src: imagen.src, x: marco.x + (marco.w - w) / 2, y: (AL - h) / 2, w, h, marco });
    if (imagen.w / (w / 72) < 250) avisos.push(en ? "The cover image is below 250 dpi: use a larger one." : "La imagen de portada no llega a 250 ppp: usa una más grande.");
  }
  if (a.cubTitulo) {
    const caja = P - 2 * margen;
    let y = centrado(obra.title, xPortada + margen, caja, S + H * 0.2, H * 0.075);
    if (a.subtitulo) centrado(a.subtitulo, xPortada + margen, caja, y + H * 0.02, H * 0.032, "i");
    if (obra.meta?.author) centrado(obra.meta.author, xPortada + margen, caja, S + H * 0.86, H * 0.04);
  }

  // Lomo: título y autor de arriba abajo, centrados en el grosor.
  if (paginas >= MIN_PAGINAS_LOMO) {
    const size = Math.min(L * 0.6, 14);
    const girado = (s: string, y: number, f: Estilo = "r") => pag.textos.push({ x: xLomo + L / 2 - (familia[f].capAlto * size) / 2, y, s, f, size, color: a.cubTexto, giro: true });
    girado(obra.title, S + H * 0.08);
    const autor = obra.meta?.author ?? "";
    const fin = S + H * 0.92 - familia.i.ancho(autor) * size;
    if (autor && fin > S + H * 0.1 + familia.r.ancho(obra.title) * size) girado(autor, fin, "i");
  } else avisos.push(en ? `Under ${MIN_PAGINAS_LOMO} pages the spine carries no text.` : `Con menos de ${MIN_PAGINAS_LOMO} páginas el lomo va sin texto.`);

  // Contraportada: texto de venta compuesto con las mismas reglas que el interior.
  const codigo = { w: 50.8 * PT, h: 30.5 * PT };
  const contra = (a.cubContra || obra.meta?.blurb || "").trim();
  if (contra) {
    const html = contra.split(/\n+/).map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`).join("");
    const caja = ajustesDe({ ...a, preajuste: "contra", ancho: a.ancho, alto: a.alto, sup: margen / PT, inf: margen / PT + (a.cubCodigo ? codigo.h / PT : 0), int: margen / PT, ext: margen / PT, capitular: false, versalitas: false, cabecera: "ninguna", folio: "ninguno", numerar: false, titulos: false, anteportada: false, portada: false, creditos: false, indice: false, imagen: false, par: false, capitulo: "seguido", hundido: 0, dedicatoria: "", epigrafe: "", agradecimientos: "", sobreAutor: "" });
    const texto = componer({ id: "contra", kind: "chapter", title: "", content: html, children: [] }, caja, familia, lang, cortar);
    for (const t of texto.paginas[0].textos) pag.textos.push({ ...t, x: t.x + S, y: t.y + S, color: a.cubTexto });
    texto.faltan.forEach((c) => faltan.add(c));
    if (texto.paginas.length > 1) avisos.push(en ? "The back cover text does not fit: shorten it." : "El texto de contraportada no cabe: acórtalo.");
  }
  if (a.cubCodigo) { // hueco blanco para el código de barras, abajo junto al lomo
    const x = xLomo - codigo.w - 6.4 * PT, y = S + H - codigo.h - 6.4 * PT;
    pag.rects!.push({ x, y, w: codigo.w, h: codigo.h, color: "#ffffff", encima: true });
    if (a.isbn) pag.textos.push({ x: x + 6, y: y + codigo.h - 8, s: `ISBN ${a.isbn}`, f: "r", size: 8, color: "#000000" });
  }
  if (a.fuente === "courier") avisos.push(en ? "Courier is not embedded: choose another font for the cover." : "Courier no se incrusta: elige otra fuente para la cubierta.");
  if (faltan.size) avisos.push((en ? "The font lacks: " : "La fuente no tiene: ") + [...faltan].join(" "));

  const guias = [
    { x: S, y: S, w: P, h: H }, { x: xLomo, y: S, w: L, h: H }, { x: xPortada, y: S, w: P, h: H },
  ];
  return { m: { w: W, h: AL, paginas: [pag], faltan: [...faltan], sobran: 0, lineas: 0, palabras: 0, pobres: 0 }, lomo, ancho, alto, guias, avisos };
}
