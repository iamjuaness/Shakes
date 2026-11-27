// Puntos de corte de una palabra en español (reglas de silabeo de la RAE; no se separan grupos de vocales).
const VOCAL = /[aeiouáéíóúü]/;
const PAR = /^(?:ch|ll|rr|[pbcfgk][lr]|[td]r|tl)$/; // dos letras que pasan juntas a la sílaba siguiente
const MIN_ANTES = 2, MIN_DESPUES = 3;

// Posiciones (índices dentro de `palabra`) donde puede partirse con guion.
export function cortes(palabra: string): number[] {
  const out: number[] = [];
  for (const m of palabra.matchAll(/\p{L}+/gu)) {
    const w = m[0].toLowerCase();
    const vocal = (i: number) => VOCAL.test(w[i]) || (w[i] === "y" && !VOCAL.test(w[i + 1] ?? ""));
    let ultima = -1; // última vocal vista
    for (let i = 0; i < w.length; i++) {
      if (!vocal(i)) continue;
      const cons = ultima < 0 ? "" : w.slice(ultima + 1, i);
      if (cons) {
        const par = cons.slice(-2);
        const p = i - (cons.length >= 2 && PAR.test(par) ? 2 : 1);
        if (p >= MIN_ANTES && w.length - p >= MIN_DESPUES) out.push(m.index! + p);
      }
      ultima = i;
    }
  }
  return out;
}
