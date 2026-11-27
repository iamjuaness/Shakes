// Compone un libro en páginas (puro): el mismo resultado se ve en la vista previa y se escribe en el PDF.
// Rejilla de líneas fija (las páginas enfrentadas cuadran), párrafos justificados por ajuste total (se reparte el
// blanco mirando el párrafo entero), guiones, viudas y huérfanas, aperturas de capítulo, cabeceras, folios e índice.
import { parseBlocks } from "../export.ts";
import { conTexto, esContenedor, esObra, countWords } from "../tree.ts";
import type { Node } from "../tree.ts";
import type { Block, Run } from "../export.ts";
import { cortes } from "./silabas.ts";
import type { Cortar } from "./guiones.ts";
import { creditos, finales, rotulos } from "./preliminares.ts";
import type { Ajustes } from "./ajustes.ts";
import type { Estilo, Familia } from "./fuentes.ts";

// y = línea base desde arriba, en pt. `giro`: se lee de arriba abajo (lomo de la cubierta).
export interface Texto { x: number; y: number; s: string; f: Estilo; size: number; color?: string; giro?: boolean }
export interface Foto { src: string; x: number; y: number; w: number; h: number; marco?: { x: number; y: number; w: number; h: number } } // marco: recorte
export interface Rect { x: number; y: number; w: number; h: number; color: string; encima?: boolean } // encima: sobre las imágenes
export interface Pagina { textos: Texto[]; imagenes?: Foto[]; rects?: Rect[]; folio?: number; apertura?: boolean; sinAdornos?: boolean; capitulo?: string; obra?: string; pie?: Linea[][] }
export interface Maqueta { w: number; h: number; paginas: Pagina[]; faltan: string[]; sobran: number; lineas: number; palabras: number; pobres: number } // pobres: imágenes de poca resolución

export const PT = 72 / 25.4; // puntos por milímetro

// k: factor de cuerpo (versalitas, llamadas de nota); alza: cuánto sube, en cuerpos; nota: la nota ya compuesta
interface Trozo { s: string; f: Estilo; k: number; alza?: number; nota?: Linea[] }
interface Pieza { t: Trozo[]; w: number; fin: "espacio" | "guion" | "junto" | "salto" }
export interface Linea { textos: { x: number; s: string; f: Estilo; size: number; dy?: number }[]; notas?: Linea[][]; reglas?: { x: number; w: number; dy: number }[] }

// `cortar`: puntos de guion del idioma de la obra (cargarGuiones); sin él solo se parten palabras en español.
export function componer(obra: Node, a: Ajustes, familia: Familia, lang = "es", cortar?: Cortar): Maqueta {
  const en = /^en/i.test(lang), es = /^es/i.test(lang);
  const L = rotulos(lang);
  const W = a.ancho * PT, H = a.alto * PT;
  const ancho = W - (a.int + a.ext) * PT;
  const lead = a.interlinea;
  const N = Math.max(5, Math.floor((H - (a.sup + a.inf) * PT) / lead));
  const base = (k: number) => a.sup * PT + k * lead + a.cuerpo * 0.8;
  const manuscrito = a.cabecera === "manuscrito";
  const poesia = obra.meta?.formato === "poetry";
  const justificar = a.justificar && !poesia;
  const guiones = a.guiones && !poesia ? cortar ?? (es ? cortes : undefined) : undefined;
  const faltan = new Set<string>();
  let sobran = 0, pobres = 0, numNota = 0;
  const cuerpoNota = a.cuerpo * (manuscrito ? 1 : 0.8), leadNota = manuscrito ? lead : lead * 0.8;
  // Líneas de la rejilla que ocupan las notas al pie de una página (con su filete).
  const filasNotas = (notas: Linea[][]) => (notas.length ? Math.ceil((notas.reduce((s, n) => s + n.length, 0) * leadNota + lead * 0.6) / lead) : 0);

  const medir = (t: Trozo, size: number) => {
    for (const ch of t.s) if (!familia[t.f].tiene(ch.codePointAt(0)!)) faltan.add(ch);
    return familia[t.f].ancho(t.s) * size * t.k;
  };
  const pegar = (x: number, t: Trozo[], size: number, out: Linea["textos"]) => {
    for (const r of t) { if (r.s) out.push({ x, s: r.s, f: r.f, size: size * r.k, ...(r.alza ? { dy: -r.alza * size } : {}) }); x += medir(r, size); }
    return x;
  };

  // ---------- Párrafos ----------
  // Tramos con estilo -> piezas separables (palabras, o trozos de palabra si puede partirse).
  function piezas(trozos: Trozo[], size: number, partir?: Cortar): Pieza[] {
    const out: Pieza[] = [];
    let palabra: Trozo[] = [];
    const cerrar = (fin: Pieza["fin"]) => {
      if (!palabra.length) {
        if (fin === "salto") out.push({ t: [], w: 0, fin });
        return;
      }
      const txt = palabra.map((x) => x.s).join("");
      // cortes: tras raya o guion interno (sin añadir guion) y, en español, entre sílabas
      const pts = new Map<number, Pieza["fin"]>();
      for (const m of txt.matchAll(/(?<=\p{L}{2})[-—](?=\p{L}{2})/gu)) pts.set(m.index! + 1, "junto");
      if (partir) for (const p of partir(txt)) pts.set(p, "guion");
      let desde = 0;
      for (const [p, tipo] of [...[...pts].sort((x, y) => x[0] - y[0]), [txt.length, fin] as [number, Pieza["fin"]]]) {
        const t: Trozo[] = [];
        let pos = 0;
        for (const r of palabra) {
          const s = r.s.slice(Math.max(0, desde - pos), Math.max(0, p - pos));
          if (s) t.push({ ...r, s });
          pos += r.s.length;
        }
        out.push({ t, w: t.reduce((n, r) => n + medir(r, size), 0), fin: tipo });
        desde = p;
      }
      palabra = [];
    };
    for (const r of trozos) {
      if (r.s === "\n") { cerrar("salto"); continue; }
      for (const s of r.s.split(/([ \t\r\n]+)/)) {
        if (!s) continue;
        if (/^[ \t\r\n]+$/.test(s)) cerrar("espacio");
        else palabra.push({ ...r, s });
      }
    }
    cerrar("salto");
    return out;
  }

  // Reparte las piezas en líneas minimizando el blanco sobrante del párrafo entero.
  function romper(ps: Pieza[], anchoDe: (n: number) => number, size: number, just: boolean): Pieza[][] {
    const esp = familia.r.ancho(" ") * size, guion = familia.r.ancho("-") * size;
    const mejor: { coste: number; de: number; n: number }[] = [{ coste: 0, de: -1, n: 0 }]; // mejor[j]: las j primeras piezas ya repartidas
    for (let j = 1; j <= ps.length; j++) {
      const ult = ps[j - 1];
      const final = ult.fin === "salto";
      let w = 0, huecos = 0;
      let m = { coste: Infinity, de: j - 1, n: 0 };
      for (let i = j - 1; i >= 0; i--) {
        if (i < j - 1) {
          if (ps[i].fin === "salto") break;
          if (ps[i].fin === "espacio") huecos++;
        }
        w += ps[i].w;
        const prev = mejor[i];
        const avail = anchoDe(prev.n);
        const total = w + huecos * esp + (ult.fin === "guion" ? guion : 0);
        const encoger = just ? huecos * esp * 0.25 : 0;
        if (total - encoger > avail + 0.01 && i < j - 1) break;
        let c: number;
        if (total - encoger > avail + 0.01) c = 1e7;
        else if (final) c = 0;
        else if (just) c = huecos ? 100 * Math.abs((avail - total) / (total > avail ? encoger : huecos * esp * 0.5)) ** 3 : 2000 + (avail - total) * 100;
        else c = 1000 * ((avail - total) / avail) ** 2;
        if (ult.fin === "guion") c += 60 + (i > 0 && ps[i - 1].fin === "guion" ? 150 : 0);
        c += prev.coste;
        if (c < m.coste) m = { coste: c, de: i, n: prev.n + 1 };
      }
      mejor[j] = m;
    }
    const out: Pieza[][] = [];
    for (let j = ps.length; j > 0; j = mejor[j].de) out.unshift(ps.slice(mejor[j].de, j));
    return out;
  }

  interface OpPar { size?: number; sangria?: number; izq?: number; der?: number; alinear?: "just" | "izq" | "centro" | "der"; capitular?: boolean; versalitas?: boolean; caja?: number }
  function parrafo(trozos: Trozo[], o: OpPar = {}): Linea[] {
    const size = o.size ?? a.cuerpo, alinear = o.alinear ?? (justificar ? "just" : "izq");
    const izq = o.izq ?? 0, der = o.der ?? 0;
    let capi: { s: string; size: number; w: number } | null = null;
    let sangria = o.sangria ?? 0;
    if (o.capitular && /^\p{L}/u.test(trozos[0]?.s ?? "")) {
      const letra = [...trozos[0].s][0];
      const cap = familia.r.capAlto;
      const s = (2 * lead + cap * a.cuerpo) / cap; // tres líneas de alto
      capi = { s: letra, size: s, w: familia.r.ancho(letra) * s + a.cuerpo * 0.25 };
      trozos = [{ ...trozos[0], s: trozos[0].s.slice(letra.length) }, ...trozos.slice(1)];
      sangria = 0;
    }
    if (o.versalitas) {
      let quedan = 4; // primeras palabras en versalitas
      trozos = trozos.flatMap((r) => r.s.split(/(?<= )/).map((s) => {
        if (quedan <= 0) return { ...r, s };
        if (s.endsWith(" ") || s.length > 1) quedan--;
        return { ...r, s: s.toUpperCase(), k: 0.82 };
      }));
    }
    const sinCorte = alinear === "centro" || alinear === "der";
    const ps = piezas(trozos, size, sinCorte ? undefined : guiones);
    const hueco = (n: number) => (capi && n < 3 ? capi.w : 0);
    const anchoDe = (n: number) => (o.caja ?? ancho) - izq - der - hueco(n) - (n === 0 ? sangria : 0);
    const filas = romper(ps, anchoDe, size, alinear === "just");
    // Una capitular necesita tres líneas; si el párrafo es más corto, va sin ella.
    if (capi && filas.length < 3) return parrafo([{ ...trozos[0], s: capi.s + trozos[0].s }, ...trozos.slice(1)], { ...o, capitular: false });
    const esp = familia.r.ancho(" ") * size;
    return filas.map((fila, n) => {
      const ult = fila[fila.length - 1];
      const huecos = fila.slice(0, -1).filter((p) => p.fin === "espacio").length;
      // las palabras enteras, con los trozos seguidos del mismo estilo juntos: así se miden y así se escriben
      const palabras: Trozo[][] = [];
      let junta: Trozo[] = [];
      fila.forEach((p, k) => {
        junta.push(...p.t);
        const cierra = k === fila.length - 1;
        if (p.fin !== "espacio" && !cierra) return;
        if (cierra && p.fin === "guion") junta.push({ s: "-", f: p.t[p.t.length - 1]?.f ?? "r", k: 1 });
        // la palabra se puede copiar entera del PDF
        palabras.push(junta.reduce<Trozo[]>((u, r) => { const t = u[u.length - 1]; if (t && t.f === r.f && t.k === r.k && t.alza === r.alza) t.s += r.s; else u.push({ ...r }); return u; }, []));
        junta = [];
      });
      const natural = palabras.flat().reduce((s, r) => s + familia[r.f].ancho(r.s) * size * r.k, 0) + huecos * esp;
      const avail = anchoDe(n);
      if (natural - huecos * esp * 0.25 > avail + 0.5) sobran++;
      const justa = alinear === "just" && huecos > 0 && (ult.fin !== "salto" || natural > avail);
      const sep = justa ? esp + (avail - natural) / huecos : esp;
      let x = izq + hueco(n) + (n === 0 ? sangria : 0) + (alinear === "centro" ? (avail - natural) / 2 : alinear === "der" ? avail - natural : 0);
      const textos: Linea["textos"] = [];
      if (capi && n === 0) textos.push({ x: izq, s: capi.s, f: "r", size: capi.size, dy: 2 * lead });
      for (const p of palabras) x = pegar(x, p, size, textos) + sep;
      const notas = fila.flatMap((p) => p.t.flatMap((r) => (r.nota ? [r.nota] : [])));
      return { textos, ...(notas.length ? { notas } : {}) };
    });
  }
  const plano = (s: string, f: Estilo = "r"): Trozo[] => [{ s, f, k: 1 }];

  // ---------- Páginas ----------
  class Flujo {
    paginas: Pagina[] = [];
    fila = 0;
    obra = "";
    capitulo = "";
    get pag() { return this.paginas[this.paginas.length - 1]; }
    nueva(extra: Partial<Pagina> = {}) { this.paginas.push({ textos: [], obra: this.obra, capitulo: this.capitulo, ...extra }); this.fila = 0; }
    // Página derecha (impar): se rellena con una en blanco si toca.
    recto(extra: Partial<Pagina> = {}) { if (!manuscrito && this.paginas.length % 2) this.nueva({ sinAdornos: true }); this.nueva(extra); }
    get vacia() { return !this.pag || (!this.pag.textos.length && this.fila === 0); }
    get x0() { return ((this.paginas.length - 1) % 2 === 1 ? a.ext : a.int) * PT; } // margen izquierdo de la página
    poner(l: Linea) {
      const x0 = this.x0;
      for (const t of l.textos) this.pag.textos.push({ x: x0 + t.x, y: base(this.fila) + (t.dy ?? 0), s: t.s, f: t.f, size: t.size });
      for (const r of l.reglas ?? []) (this.pag.rects ??= []).push({ x: x0 + r.x, y: base(this.fila) + r.dy, w: r.w, h: 0.5, color: "#000000" });
      if (l.notas) (this.pag.pie ??= []).push(...l.notas);
      this.fila++;
    }
    // Cuántas líneas de `ls` caben desde aquí, contando el sitio que piden sus notas al pie.
    caben(ls: Linea[]) {
      let notas = this.pag.pie ?? [], k = 0;
      for (const l of ls) {
        const con = l.notas ? [...notas, ...l.notas] : notas;
        if (this.fila + k + 1 + filasNotas(con) > N) break;
        notas = con; k++;
      }
      return k;
    }
    // Un bloque que no se parte (fila de tabla, imagen).
    atomico(ls: Linea[]) {
      if (!this.pag) this.nueva();
      if (this.fila > 0 && this.caben(ls) < ls.length) this.nueva();
      ls.forEach((l) => this.poner(l));
    }
    blanco(n: number) { if (this.fila > 0) this.fila = Math.min(N, this.fila + n); }
    // Control de viudas y huérfanas: un párrafo no deja ni se lleva una sola línea. `junto`: líneas que deben caber detrás.
    bloque(ls: Linea[], junto = 0) {
      if (!this.pag) this.nueva();
      let resto = ls;
      while (resto.length) {
        const k = this.caben(resto);
        if (k === resto.length && this.fila + k + junto + filasNotas([...(this.pag.pie ?? []), ...resto.flatMap((l) => l.notas ?? [])]) <= N) { resto.forEach((l) => this.poner(l)); return; }
        let caben = junto ? 0 : k;
        if (!junto && resto.length - caben < 2) caben = resto.length - 2;
        // en una página vacía siempre avanza (una nota más larga que la página se queda con su línea)
        if (caben < 2) caben = this.fila === 0 ? Math.min(Math.max(1, k), resto.length) : 0;
        resto.slice(0, caben).forEach((l) => this.poner(l));
        resto = resto.slice(caben);
        if (resto.length) this.nueva();
      }
    }
  }

  const cuerpo = new Flujo();
  const indice: { titulo: string; folio: number; nivel: number }[] = [];
  let numCap = 0;

  const abrir = (titulo: string, rotulo: string, nivel: number) => {
    cuerpo.capitulo = titulo || rotulo; // sale en la cabecera si se eligió «título y capítulo»
    if (a.capitulo === "impar") cuerpo.recto({ apertura: true });
    else if (a.capitulo === "nueva" || !cuerpo.pag) cuerpo.nueva({ apertura: true });
    else { cuerpo.blanco(2); if (N - cuerpo.fila < 8) cuerpo.nueva({ apertura: true }); }
    if (cuerpo.fila === 0) cuerpo.fila = Math.min(a.hundido, N - 6);
    indice.push({ titulo: [rotulo, titulo].filter(Boolean).join(". "), folio: cuerpo.paginas.length, nivel });
    const centro: OpPar = { alinear: "centro" };
    if (rotulo) cuerpo.bloque(parrafo(plano(rotulo.toUpperCase()), { ...centro, size: manuscrito ? a.cuerpo : a.cuerpo * 0.9 }), 2);
    if (titulo) { if (rotulo && !manuscrito) cuerpo.blanco(1); cuerpo.bloque(parrafo(plano(titulo), { ...centro, size: manuscrito ? a.cuerpo : a.cuerpo * 1.55 }), 2); }
    cuerpo.blanco(manuscrito ? 1 : 3);
  };

  const separador = () => {
    cuerpo.blanco(1);
    cuerpo.bloque(parrafo(plano(a.separador), { alinear: "centro" }), 2);
    cuerpo.blanco(1);
  };

  const trozo = (r: Run, f?: Estilo): Trozo => {
    const estilo = f ?? ((r.b ? (r.i ? "bi" : "b") : r.i ? "i" : "r") as Estilo);
    if (r.nota === undefined) return { s: r.t, f: estilo, k: 1 };
    const n = String(++numNota);
    const nota = parrafo(plano(`${n}. ${r.nota}`), { size: cuerpoNota, alinear: justificar ? "just" : "izq" });
    return { s: n, f: "r", k: 0.62, alza: 0.36, nota };
  };

  // Imagen centrada, al ancho elegido (nunca más alta que la caja de texto).
  function ilustracion(i: NonNullable<Block["img"]>) {
    if (!i.src.startsWith("data:image/jpeg;base64,")) return;
    let w = (ancho * i.ancho) / 100, h = (w * i.h) / i.w;
    const max = (N - 2) * lead;
    if (h > max) { w *= max / h; h = max; }
    if (i.w / (w / 72) < 150) pobres++;
    if (!cuerpo.pag) cuerpo.nueva();
    cuerpo.blanco(1);
    const filas = Math.ceil(h / lead);
    if (cuerpo.fila > 0 && cuerpo.fila + filas + filasNotas(cuerpo.pag.pie ?? []) > N) cuerpo.nueva();
    (cuerpo.pag.imagenes ??= []).push({ src: i.src, x: cuerpo.x0 + (ancho - w) / 2, y: a.sup * PT + cuerpo.fila * lead, w, h });
    cuerpo.fila += filas;
    cuerpo.blanco(1);
  }

  // Tabla: columnas iguales y filetes horizontales (arriba, bajo la cabecera y al final). Una fila no se parte.
  function tabla(filas: NonNullable<Block["filas"]>) {
    const cols = Math.max(...filas.map((f) => f.celdas.length)), col = ancho / cols, margen = a.cuerpo * 0.3;
    const size = manuscrito ? a.cuerpo : a.cuerpo * 0.88;
    cuerpo.blanco(1);
    filas.forEach((fila, n) => {
      const celdas = fila.celdas.map((c) => parrafo(c.map((r) => trozo(r, fila.cab ? (r.i ? "bi" : "b") : undefined)), { size, alinear: "izq", caja: col - margen * 2 }));
      const lineas: Linea[] = Array.from({ length: Math.max(1, ...celdas.map((c) => c.length)) }, (_, j) => ({
        textos: celdas.flatMap((c, i) => (c[j]?.textos ?? []).map((t) => ({ ...t, x: t.x + i * col + margen }))),
        notas: celdas.flatMap((c) => c[j]?.notas ?? []),
      }));
      const filete = (dy: number) => ({ x: 0, w: ancho, dy });
      if (n === 0) lineas[0].reglas = [filete(-a.cuerpo * 0.95)];
      if (n === filas.length - 1 || (n === 0 && fila.cab)) (lineas[lineas.length - 1].reglas ??= []).push(filete(lead * 0.3));
      cuerpo.atomico(lineas);
    });
    cuerpo.blanco(1);
  }

  // Texto de un capítulo o escena. `abre`: es el comienzo (capitular y sin sangría).
  function texto(html: string | undefined, abre: boolean) {
    let primero = true, trasCorte = true;
    for (const b of parseBlocks(html)) {
      if (b.tag === "hr") { separador(); trasCorte = true; continue; }
      if (b.img) { ilustracion(b.img); trasCorte = true; continue; }
      if (b.filas) { if (b.filas.length) tabla(b.filas); trasCorte = true; continue; }
      if (!b.runs.some((r) => r.t.trim() || r.nota !== undefined)) { if (poesia) cuerpo.blanco(1); continue; }
      const trozos = b.runs.map((r) => trozo(r));
      if (/^h\d$/.test(b.tag)) {
        cuerpo.blanco(1);
        cuerpo.bloque(parrafo(trozos.map((r) => ({ ...r, f: "b" as Estilo })), { alinear: "centro", size: a.cuerpo * 1.1 }), 2);
        cuerpo.blanco(1);
        trasCorte = true;
        continue;
      }
      const sangria = a.sangria * a.cuerpo;
      if (b.tag === "blockquote") {
        cuerpo.blanco(1);
        cuerpo.bloque(parrafo(trozos, { izq: sangria * 1.5, der: sangria * 1.5, size: manuscrito ? a.cuerpo : a.cuerpo * 0.93 }));
        cuerpo.blanco(1);
        trasCorte = true;
        continue;
      }
      if (b.tag === "li") cuerpo.bloque(parrafo([{ s: "• ", f: "r", k: 1 }, ...trozos], { izq: sangria }));
      else {
        const apertura = abre && primero;
        cuerpo.bloque(parrafo(trozos, { sangria: poesia || (trasCorte && !manuscrito) ? 0 : sangria, capitular: apertura && a.capitular && !poesia, versalitas: apertura && a.versalitas && !poesia }));
        if (poesia) cuerpo.blanco(1);
      }
      primero = false;
      trasCorte = false;
    }
  }

  function recorrer(n: Node, i: number) {
    if (esObra(n.kind) && n !== obra) { // un libro dentro de una saga: su portadilla
      cuerpo.obra = n.title; cuerpo.capitulo = ""; numCap = 0; numNota = 0;
      cuerpo.recto({ sinAdornos: true });
      cuerpo.fila = Math.floor(N * 0.3);
      indice.push({ titulo: n.title, folio: cuerpo.paginas.length, nivel: 0 });
      cuerpo.bloque(parrafo(plano(n.title), { alinear: "centro", size: a.cuerpo * 1.9 }));
    } else if (n.kind === "part" || n.kind === "act") {
      cuerpo.capitulo = "";
      cuerpo.recto({ sinAdornos: true });
      cuerpo.fila = Math.floor(N * 0.3);
      indice.push({ titulo: n.title, folio: cuerpo.paginas.length, nivel: 0 });
      cuerpo.bloque(parrafo(plano(n.title.toUpperCase()), { alinear: "centro", size: a.cuerpo * 1.4 }));
    } else if (n.kind === "chapter") {
      numCap++;
      numNota = 0; // las notas se numeran por capítulo
      const rotulo = a.numerar && !poesia ? `${L.cap} ${numCap}` : "";
      // «Capítulo 1: La llegada» con numeración: el rótulo ya dice el número, no se repite.
      const titulo = rotulo ? n.title.trim().replace(/^(cap[ií]tulo|chapter)\s*(\d+|[ivxlc]+)(?![\p{L}\d])\s*[:.—–-]?\s*/iu, "") : n.title;
      abrir(a.titulos ? titulo : "", rotulo, 1);
      texto(n.content, true);
    } else if (n.kind === "scene") {
      if (!cuerpo.pag) cuerpo.nueva();
      if (i > 0) separador();
      texto(n.content, i === 0);
    } else if (conTexto(n.kind)) texto(n.content, true);
    n.children.forEach(recorrer);
  }
  cuerpo.obra = obra.title;
  if (esContenedor(obra.kind) || obra.kind === "blank" || esObra(obra.kind)) obra.children.forEach(recorrer);
  else recorrer(obra, 0); // se maqueta una sola parte o capítulo

  // Final: agradecimientos y sobre el autor.
  for (const f of finales(a, lang)) {
    cuerpo.capitulo = f.titulo;
    abrir(f.titulo, "", 1);
    f.parrafos.forEach((p, i) => cuerpo.bloque(parrafo(plano(p), { sangria: i ? a.sangria * a.cuerpo : 0 })));
  }
  if (!cuerpo.paginas.length) cuerpo.nueva();
  // Notas al pie: en la base de la caja de texto, bajo un filete corto.
  cuerpo.paginas.forEach((p, i) => {
    if (!p.pie?.length) return;
    const x0 = (i % 2 === 1 ? a.ext : a.int) * PT, lineas = p.pie.flat();
    const ini = a.sup * PT + N * lead - lineas.length * leadNota;
    (p.rects ??= []).push({ x: x0, y: ini - lead * 0.25, w: ancho * 0.25, h: 0.5, color: "#000000" });
    lineas.forEach((l, j) => { for (const t of l.textos) p.textos.push({ x: x0 + t.x, y: ini + j * leadNota + cuerpoNota * 0.85, s: t.s, f: t.f, size: t.size }); });
    delete p.pie;
  });

  // ---------- Preliminares ----------
  const pre = new Flujo();
  const autor = obra.meta?.author ?? "";
  const centrado = (t: string, o: OpPar = {}, f: Estilo = "r") => t.split("\n").forEach((x) => (x.trim() ? pre.bloque(parrafo(plano(x.trim(), f), { alinear: "centro", ...o })) : pre.blanco(1)));
  if (a.imagen && obra.meta?.cover?.startsWith("data:image/jpeg")) {
    const cw = obra.meta.cw || 600, ch = obra.meta.ch || 900, s = Math.min(W / cw, H / ch);
    pre.recto({ sinAdornos: true, imagenes: [{ src: obra.meta.cover, x: (W - cw * s) / 2, y: (H - ch * s) / 2, w: cw * s, h: ch * s }] });
  }
  const palabras = (function contar(n: Node): number { return countWords(n.content) + n.children.reduce((s, c) => s + contar(c), 0); })(obra);
  if (manuscrito && a.portada) {
    pre.recto({ sinAdornos: true });
    const aprox = `${en ? "approx." : "aprox."} ${Math.max(100, Math.round(palabras / 100) * 100).toLocaleString(lang)} ${L.palabras}`;
    pre.bloque(parrafo(plano(autor), { alinear: "izq" }));
    pre.fila = 0;
    pre.bloque(parrafo(plano(aprox), { alinear: "der" }));
    pre.fila = Math.floor(N * 0.4);
    centrado(obra.title.toUpperCase());
    if (autor) centrado(`${L.por} ${autor}`);
  } else {
    if (a.anteportada) { pre.recto({ sinAdornos: true }); pre.fila = Math.floor(N * 0.28); centrado(obra.title, { size: a.cuerpo * 1.4 }); }
    if (a.portada) {
      pre.recto({ sinAdornos: true });
      pre.fila = Math.floor(N * 0.2);
      centrado(obra.title, { size: a.cuerpo * 2.2 });
      if (a.subtitulo) { pre.blanco(1); centrado(a.subtitulo, { size: a.cuerpo * 1.2 }, "i"); }
      if (autor) { pre.blanco(3); centrado(autor, { size: a.cuerpo * 1.3 }); }
      if (a.editorial) { pre.fila = Math.max(pre.fila, N - 2); centrado(a.editorial); }
    }
    if (a.creditos) { // al dorso de la portada, al pie
      pre.nueva({ sinAdornos: true });
      const ls = creditos(obra, a, lang).flatMap((x) => (x.trim() ? parrafo(plano(x.trim()), { alinear: "izq", size: a.cuerpo * 0.82 }) : [{ textos: [] }]));
      pre.fila = Math.max(0, N - ls.length);
      pre.bloque(ls);
    }
  }
  if (a.dedicatoria.trim()) { pre.recto({ sinAdornos: true }); pre.fila = Math.floor(N * 0.25); centrado(a.dedicatoria.trim(), {}, "i"); }
  if (a.epigrafe.trim()) { pre.recto({ sinAdornos: true }); pre.fila = Math.floor(N * 0.25); a.epigrafe.trim().split("\n").forEach((x) => pre.bloque(parrafo(plano(x, "i"), { alinear: "der", izq: ancho * 0.25 }))); }
  if (a.indice && indice.length) {
    pre.recto({ sinAdornos: true });
    pre.fila = 2;
    centrado(L.indice, { size: a.cuerpo * 1.4 });
    pre.blanco(2);
    for (const e of indice) {
      const num = String(e.folio), wn = familia.r.ancho(num) * a.cuerpo;
      const ls = parrafo(plano(e.titulo, e.nivel ? "r" : "b"), { alinear: "izq", der: wn + a.cuerpo, izq: e.nivel ? a.cuerpo : 0 });
      ls[ls.length - 1].textos.push({ x: ancho - wn, s: num, f: "r", size: a.cuerpo });
      pre.bloque(ls);
    }
  }
  if (!manuscrito && pre.paginas.length % 2) pre.nueva({ sinAdornos: true }); // el texto empieza en página derecha
  cuerpo.paginas.forEach((p, i) => (p.folio = i + 1));
  const paginas = [...pre.paginas, ...cuerpo.paginas];
  if (a.par && paginas.length % 2) paginas.push({ textos: [], sinAdornos: true });

  // ---------- Cabeceras y folios ----------
  const apellido = autor.trim().split(/\s+/).pop() ?? "";
  paginas.forEach((p, i) => {
    if (p.sinAdornos || !p.folio || (!p.textos.length && !p.imagenes)) return;
    const verso = i % 2 === 1;
    const izq = (verso ? a.ext : a.int) * PT, size = manuscrito ? a.cuerpo : a.cuerpo * 0.85;
    const arriba = a.sup * PT * 0.6, abajo = H - a.inf * PT * 0.4;
    const poner = (s: string, y: number, donde: "centro" | "fuera" | "der", f: Estilo = "r") => {
      let t = s;
      while (t.length > 4 && familia[f].ancho(t) * size > ancho * 0.85) t = t.slice(0, -2).trimEnd() + "…";
      const w = medir({ s: t, f, k: 1 }, size);
      const x = donde === "centro" ? izq + (ancho - w) / 2 : donde === "der" || !verso ? izq + ancho - w : izq;
      p.textos.push({ x, y, s: t, f, size });
    };
    if (manuscrito) return poner([apellido, (p.obra ?? "").toUpperCase().slice(0, 30), String(p.folio)].filter(Boolean).join(" / "), a.sup * PT * 0.5, "der");
    const titulo = p.obra ?? obra.title;
    if (a.cabecera !== "ninguna" && !p.apertura) {
      const t = a.cabecera === "autor-titulo" ? (verso ? autor || titulo : titulo) : verso ? titulo : p.capitulo || titulo;
      poner(t, arriba, "centro", "i");
    }
    if (a.folio === "abajo" || (a.folio === "arriba" && p.apertura)) poner(String(p.folio), abajo, "centro");
    else if (a.folio === "arriba") poner(String(p.folio), arriba, "fuera");
  });

  return { w: W, h: H, paginas, faltan: [...faltan], sobran, lineas: N, palabras, pobres };
}

// Revisión previa a imprenta (requisitos habituales de impresión bajo demanda, p. ej. KDP).
export function revisar(m: Maqueta, a: Ajustes, en = false): { avisos: string[]; lomoBlanco: number; lomoCrema: number } {
  const n = m.paginas.length;
  const intMin = n <= 150 ? 9.6 : n <= 300 ? 12.7 : n <= 500 ? 15.9 : n <= 700 ? 19.1 : 22.3;
  const avisos: string[] = [];
  const manuscrito = a.cabecera === "manuscrito";
  if (!manuscrito && a.int < intMin) avisos.push(en ? `Inner margin too small for ${n} pages: use at least ${intMin} mm.` : `Margen interior corto para ${n} páginas: usa al menos ${intMin} mm.`);
  if (!manuscrito && Math.min(a.sup, a.inf, a.ext) < 6.4) avisos.push(en ? "Outer margins under 6.4 mm may be trimmed." : "Márgenes exteriores de menos de 6,4 mm: la guillotina puede cortar el texto.");
  if (!manuscrito && n < 24) avisos.push(en ? "Print on demand usually requires at least 24 pages." : "La impresión bajo demanda suele exigir al menos 24 páginas.");
  if (n > 828) avisos.push(en ? "Over 828 pages: split the book." : "Más de 828 páginas: divide el libro.");
  if (a.fuente === "courier" && !manuscrito) avisos.push(en ? "Courier is not embedded: printers will reject the PDF." : "Courier no se incrusta: una imprenta rechazará el PDF.");
  if (m.pobres) avisos.push(en ? `${m.pobres} images are below 150 dpi at this size: they will print blurry.` : `${m.pobres} imágenes no llegan a 150 ppp a este tamaño: saldrán borrosas.`);
  if (m.sobran) avisos.push(en ? `${m.sobran} lines overflow the margin (a very long word).` : `${m.sobran} líneas se salen del margen (alguna palabra muy larga).`);
  if (m.faltan.length) avisos.push((en ? "The font lacks these characters (they will be blank): " : "La fuente no tiene estos caracteres (saldrán en blanco): ") + m.faltan.slice(0, 20).join(" "));
  return { avisos, lomoBlanco: n * 0.0572, lomoCrema: n * 0.0635 };
}
