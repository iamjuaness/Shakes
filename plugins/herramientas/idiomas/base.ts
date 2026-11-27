// Puro: el idioma base (el del libro) leído de su diccionario Hunspell: todas sus palabras y cómo llegar de una
// forma flexionada («cantaban», «houses») a la palabra del diccionario.
export interface Base {
  lemas: string[]; // en orden alfabético
  banderas: Map<string, string[]>; // palabra -> banderas Hunspell
  origen: (forma: string) => string[]; // palabras del diccionario de las que puede venir una forma
}

interface Sufijo { bandera: string; quitar: string; poner: string; cond: RegExp }

export function leerBase(aff: string, dic: string, lang = "es"): Base {
  const modo = aff.match(/^FLAG\s+(\S+)/m)?.[1];
  const partir = (f = "") => (modo === "long" ? f.match(/../g) ?? [] : modo === "num" ? f.split(",").filter(Boolean) : [...f]);
  const banderas = new Map<string, string[]>();
  // en alemán los sustantivos van con mayúscula; en el resto, las mayúsculas son nombres propios y siglas
  const forma = /^de/i.test(lang) ? /^\p{L}[\p{L}'’-]*$/u : /^\p{Ll}[\p{Ll}\p{M}'’-]*$/u;
  for (const linea of dic.split("\n").slice(1)) {
    const [w, f] = linea.trim().split(/\s/)[0].split("/");
    if (!w || !forma.test(w)) continue;
    const k = w.toLowerCase();
    banderas.set(k, [...(banderas.get(k) ?? []), ...partir(f)]);
  }
  const sufijos = new Map<string, Sufijo[]>(); // por la terminación que añaden
  for (const linea of aff.split("\n")) {
    const p = linea.trim().split(/\s+/);
    if (p[0] !== "SFX" || p.length < 5) continue;
    const poner = p[3].split("/")[0].replace(/^0$/, ""), quitar = p[2].replace(/^0$/, "");
    let cond: RegExp;
    try { cond = new RegExp(`${p[4]}$`); } catch { continue; }
    const l = sufijos.get(poner) ?? [];
    l.push({ bandera: p[1], quitar, poner, cond });
    sufijos.set(poner, l);
  }
  const origen = (w: string) => {
    const out = banderas.has(w) ? [w] : [];
    for (let k = 1; k <= w.length; k++) {
      for (const s of sufijos.get(w.slice(k)) ?? []) {
        const base = w.slice(0, k) + s.quitar;
        if (base !== w && banderas.get(base)?.includes(s.bandera) && s.cond.test(base)) out.push(base);
      }
    }
    return [...new Set(out)];
  };
  return { lemas: [...banderas.keys()].sort(), banderas, origen };
}
