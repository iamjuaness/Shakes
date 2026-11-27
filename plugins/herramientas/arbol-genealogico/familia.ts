// Puro: arma y coloca árboles genealógicos a partir de las relaciones de las fichas («padre de», «hijo de», «hermano de», «esposa de»…).
export interface Rel { from: string; to: string; label: string }
export interface Lazo { a: string; b: string; label: string }
export interface Familia {
  gen: Map<string, number>; // generación de cada persona (0 = la más antigua de su familia)
  padres: [string, string][]; // [padre o madre, hijo]
  abuelos: [string, string][]; // [abuelo, nieto] sin el padre intermedio
  parejas: Lazo[];
  parientes: Lazo[]; // hermanos y primos
  paradojas: [string, string][]; // [antepasado, descendiente] que cierran un bucle: no cuentan para las generaciones
  familias: string[][]; // grupos sin parentesco entre sí
}

const PADRE = /^(padre|madre|progenitora?|pap[áa]|mam[áa]|padrastro|madrastra) de(\s|$)/i;
const HIJO = /^(hij[oa]|hijastr[oa]) de(\s|$)/i;
const ABUELO = /^abuel[oa] de(\s|$)/i;
const NIETO = /^niet[oa] de(\s|$)/i;
const PAREJA = /^((espos[oa]|marido|mujer|pareja|c[óo]nyuge|novi[oa]) de|casad[oa] con)(\s|$)/i;
const PARIENTE = /^(herman[oa]|gemel[oa]|prim[oa]) de(\s|$)/i;

// unión de conjuntos: devuelve el representante de cada elemento
function grupos(ids: string[], pares: [string, string][]) {
  const up = new Map(ids.map((i) => [i, i]));
  const raiz = (i: string): string => (up.get(i) === i ? i : raiz(up.get(i)!));
  for (const [a, b] of pares) up.set(raiz(a), raiz(b));
  return new Map(ids.map((i) => [i, raiz(i)]));
}

// los progenitores de un mismo hijo, de dos en dos
const copadres = (padres: [string, string][]) => padres.flatMap(([p, h]) => padres.filter(([q, i]) => i === h && p < q).map(([q]): [string, string] => [p, q]));

export function familia(rels: Rel[]): Familia {
  const padres: [string, string][] = [], abuelos: [string, string][] = [], parejas: Lazo[] = [], parientes: Lazo[] = [];
  const nuevo = (l: [string, string][], a: string, b: string) => { if (!l.some(([x, y]) => x === a && y === b)) l.push([a, b]); };
  const lazo = (l: Lazo[], a: string, b: string, label: string) => { if (!l.some((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a))) l.push({ a, b, label }); };
  for (const r of rels) {
    const s = r.label.trim();
    if (r.from === r.to) continue;
    if (PADRE.test(s)) nuevo(padres, r.from, r.to);
    else if (HIJO.test(s)) nuevo(padres, r.to, r.from);
    else if (ABUELO.test(s)) nuevo(abuelos, r.from, r.to);
    else if (NIETO.test(s)) nuevo(abuelos, r.to, r.from);
    else if (PAREJA.test(s)) lazo(parejas, r.from, r.to, s);
    else if (PARIENTE.test(s)) lazo(parientes, r.from, r.to, s);
  }
  const lazos = [...parejas, ...parientes].map((l): [string, string] => [l.a, l.b]);
  const ids = [...new Set([...padres, ...abuelos, ...lazos].flat())];
  // Con viajes en el tiempo alguien puede ser su propio antepasado. Recorriendo la descendencia, el vínculo que
  // vuelve sobre su propia línea es la paradoja: se aparta de `padres`/`abuelos`.
  const sangre = [...padres, ...abuelos];
  const intento = (orden: string[]) => {
    const paradojas: [string, string][] = [];
    const visto = new Map<string, "abierto" | "cerrado">();
    const recorre = (i: string) => {
      visto.set(i, "abierto");
      for (const r of sangre.filter(([p]) => p === i)) {
        if (visto.get(r[1]) === "abierto") paradojas.push(r);
        else if (!visto.has(r[1])) recorre(r[1]);
      }
      visto.set(i, "cerrado");
    };
    for (const i of orden) if (!visto.has(i)) recorre(i);
    const sin = (l: [string, string][]) => l.filter((r) => !paradojas.includes(r));
    const rectos = [...sin(padres).map(([p, h]) => [p, h, 1] as const), ...sin(abuelos).map(([p, h]) => [p, h, 2] as const)];
    // parejas, hermanos y progenitores de un mismo hijo comparten generación, salvo que uno descienda del otro
    const mismo = new Map(ids.map((i) => [i, i]));
    const desciende = (de: string, a: string, ya = new Set<string>()): boolean =>
      rectos.some(([p, h]) => {
        const g = mismo.get(h)!;
        if (mismo.get(p) !== de || ya.has(g)) return false;
        ya.add(g);
        return g === a || desciende(g, a, ya);
      });
    for (const [a, b] of [...lazos, ...copadres(padres), ...hermanos]) {
      const ga = mismo.get(a)!, gb = mismo.get(b)!;
      if (ga === gb || desciende(ga, gb) || desciende(gb, ga)) continue;
      for (const [i, g] of mismo) if (g === gb) mismo.set(i, ga);
    }
    const bajan = rectos.map(([p, h, d]) => [mismo.get(p)!, mismo.get(h)!, d] as const);
    const nivel = new Map([...mismo.values()].map((g) => [g, 0]));
    for (let k = 0; k < nivel.size; k++) for (const [p, h, d] of bajan) nivel.set(h, Math.max(nivel.get(h)!, nivel.get(p)! + d));
    // quien no tiene antepasados baja hasta quedar justo encima de sus descendientes (suegros, por ejemplo)
    for (const g of nivel.keys()) {
      if (bajan.some(([, h]) => h === g)) continue;
      const hijos = bajan.filter(([p]) => p === g).map(([, h, d]) => nivel.get(h)! - d);
      if (hijos.length) nivel.set(g, Math.min(...hijos));
    }
    // cuanto menos parejas queden en generaciones distintas (sobre todo matrimonios) y más cortas las líneas, mejor
    const partidas = parejas.reduce((s, l) => s + (mismo.get(l.a) === mismo.get(l.b) ? 0 : /^(espos|marido|mujer|casad|c[óo]nyuge)/i.test(l.label) ? 30 : 15), 0);
    const estirado = bajan.reduce((s, [p, h, d]) => s + nivel.get(h)! - nivel.get(p)! - d, 0);
    return { paradojas, mismo, nivel, sin, coste: partidas + estirado + 10 * paradojas.length };
  };
  const hermanos = padres.flatMap(([p, h]) => padres.filter(([q, i]) => q === p && h < i).map(([, i]): [string, string] => [h, i]));
  // primero quienes no tienen padres; si hay bucles, se prueban otros órdenes (cada uno corta el bucle por otro sitio)
  const conHijos = ids.filter((i) => !sangre.some(([, h]) => h === i));
  let mejor = intento([...conHijos, ...ids]);
  let semilla = 1;
  const azar = () => (semilla = (semilla * 48271) % 2147483647);
  if (mejor.paradojas.length) for (let k = 0; k < 200; k++) {
    const otro = intento(ids.map((i) => [azar(), i] as const).sort((a, b) => a[0] - b[0]).map(([, i]) => i));
    if (otro.coste < mejor.coste) mejor = otro;
  }
  const { paradojas, mismo, nivel, sin } = mejor;
  const clan = grupos(ids, [...padres, ...abuelos, ...lazos]);
  const familias = [...new Set(clan.values())].map((c) => ids.filter((i) => clan.get(i) === c)).sort((a, b) => b.length - a.length);
  const gen = new Map<string, number>();
  for (const f of familias) {
    const min = Math.min(...f.map((i) => nivel.get(mismo.get(i)!)!));
    for (const i of f) gen.set(i, nivel.get(mismo.get(i)!)! - min);
  }
  return { gen, padres: sin(padres), abuelos: sin(abuelos), parejas, parientes, paradojas, familias };
}

export const PASO = 150; // entre personas de una pareja o grupo
export const FILA = 180; // entre generaciones
const HUECO = 60; // aire extra entre grupos de una misma fila
const ENTRE = 220; // entre familias distintas

export interface Marco { x: number; y: number; w: number; h: number; ids: string[] }

export function colocar(f: Familia) {
  const pos = new Map<string, { x: number; y: number }>();
  const marcos: Marco[] = [];
  let x0 = 0, y0 = 0, alto = 0;
  for (const ids of f.familias) {
    const p = arbol(f, ids);
    const minX = Math.min(...ids.map((i) => p.get(i)!)), w = Math.max(...ids.map((i) => p.get(i)!)) - minX;
    const h = Math.max(...ids.map((i) => f.gen.get(i)!)) * FILA;
    if (x0 && x0 + w > 1800) { x0 = 0; y0 += alto + ENTRE; alto = 0; }
    for (const i of ids) pos.set(i, { x: x0 + p.get(i)! - minX, y: y0 + f.gen.get(i)! * FILA });
    marcos.push({ x: x0 - 80, y: y0 - 75, w: w + 160, h: h + 150, ids });
    x0 += w + ENTRE;
    alto = Math.max(alto, h);
  }
  return { pos, marcos };
}

// Coordenada x de cada persona de una familia. Las parejas van juntas; en pasadas alternas los hijos se centran
// bajo sus padres y los padres sobre sus hijos, sin pisarse.
function arbol(f: Familia, ids: string[]): Map<string, number> {
  const juntos: [string, string][] = [...f.parejas.map((l): [string, string] => [l.a, l.b]), ...copadres([...f.padres, ...f.paradojas])]
    .filter(([a, b]) => ids.includes(a) && f.gen.get(a) === f.gen.get(b));
  const de = grupos(ids, juntos);
  const grado = (i: string) => juntos.filter((l) => l.includes(i)).length;
  const bloques = [...new Set(de.values())].map((g) => {
    const resto = ids.filter((i) => de.get(i) === g).sort((a, b) => grado(a) - grado(b));
    const cadena: string[] = []; // quien tiene dos parejas queda en medio
    const sigue = (i: string) => {
      if (cadena.includes(i)) return;
      cadena.push(i);
      for (const [a, b] of juntos) if (a === i || b === i) sigue(a === i ? b : a);
    };
    resto.forEach(sigue);
    return cadena;
  });
  const x = new Map<string, number>();
  const filas = [...new Set(ids.map((i) => f.gen.get(i)!))].sort((a, b) => a - b).map((g) => bloques.filter((b) => f.gen.get(b[0]) === g));
  for (const fila of filas) { let at = 0; for (const b of fila) { b.forEach((i) => { x.set(i, at); at += PASO; }); at += HUECO; } }
  const media = (v: number[]) => v.reduce((s, n) => s + n, 0) / v.length;
  const arriba: [string, string][] = [...f.padres, ...f.abuelos]; // [antepasado, descendiente]
  const pasada = (baja: boolean) => {
    for (const fila of baja ? filas : [...filas].reverse()) {
      const quiere = fila.map((b) => {
        const metas = b.flatMap((i, k) => {
          const otros = arriba.filter((r) => r[baja ? 1 : 0] === i).map((r) => x.get(r[baja ? 0 : 1])!);
          return otros.length ? [{ k, meta: media(otros) }] : [];
        });
        // dentro de la pareja, cada cual del lado de su propia familia
        if (baja && metas.length > 1 && metas[0].meta > metas[metas.length - 1].meta) {
          b.reverse();
          metas.forEach((m) => (m.k = b.length - 1 - m.k));
        }
        const centro = metas.length ? media(metas.map((m) => m.meta - (m.k - (b.length - 1) / 2) * PASO)) : media(b.map((i) => x.get(i)!));
        return { b, centro, ancho: (b.length - 1) * PASO };
      }).sort((p, q) => p.centro - q.centro);
      fila.splice(0, fila.length, ...quiere.map((q) => q.b));
      // regresión isotónica: lo más cerca posible de lo deseado, respetando el orden y la separación
      let borde = 0;
      const tramos: { suma: number; n: number; items: { b: string[]; borde: number }[] }[] = [];
      for (const q of quiere) {
        tramos.push({ suma: (q.centro - q.ancho / 2 - borde) * q.b.length, n: q.b.length, items: [{ b: q.b, borde }] });
        borde += q.ancho + PASO + HUECO;
        while (tramos.length > 1 && tramos[tramos.length - 2].suma / tramos[tramos.length - 2].n >= tramos[tramos.length - 1].suma / tramos[tramos.length - 1].n) {
          const u = tramos.pop()!, a = tramos[tramos.length - 1];
          a.suma += u.suma; a.n += u.n; a.items.push(...u.items);
        }
      }
      for (const t of tramos) for (const it of t.items) it.b.forEach((i, k) => x.set(i, Math.round(t.suma / t.n + it.borde + k * PASO)));
    }
  };
  for (let k = 0; k < 6; k++) { pasada(true); pasada(false); }
  return x;
}
