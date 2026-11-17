// Puro: arma generaciones a partir de las relaciones de las fichas («padre de», «hijo de», «hermano de», «esposa de»…).
export interface Rel { from: string; to: string; label: string }
export interface Familia { gen: Map<string, number>; padres: [string, string][]; parejas: [string, string][] }

const PADRE = /^(padre|madre|progenitor|progenitora|papá|mamá|abuel[oa]) de/i;
const HIJO = /^(hij[oa]|nieto|nieta) de/i;
const PAR = /^(espos[oa]|marido|mujer|pareja|cónyuge|herman[oa]|prim[oa]) de/i;

export function familia(rels: Rel[]): Familia {
  const padres: [string, string][] = [], parejas: [string, string][] = [];
  for (const r of rels) {
    if (PADRE.test(r.label.trim())) padres.push([r.from, r.to]);
    else if (HIJO.test(r.label.trim())) padres.push([r.to, r.from]);
    else if (PAR.test(r.label.trim())) parejas.push([r.from, r.to]);
  }
  const ids = new Set([...padres, ...parejas].flat());
  const gen = new Map([...ids].map((i) => [i, 0]));
  for (let k = 0; k <= ids.size; k++) { // relajación: un hijo está una generación bajo su padre; las parejas, en la misma
    for (const [p, h] of padres) gen.set(h, Math.max(gen.get(h)!, gen.get(p)! + 1));
    for (const [a, b] of parejas) { const m = Math.max(gen.get(a)!, gen.get(b)!); gen.set(a, m); gen.set(b, m); }
  }
  return { gen, padres, parejas };
}
