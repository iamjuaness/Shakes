// Puro: resumen extractivo (primeras frases) para rellenar la sinopsis del corcho. No usa IA.
export function resumir(text: string, max = 200): string {
  const frases = text.replace(/\s+/g, " ").trim().match(/[^.!?…]+[.!?…]+/g) ?? [text.trim()];
  let out = "";
  for (const f of frases.slice(0, 2)) { if ((out + f).length > max && out) break; out += f.trim() + " "; }
  out = out.trim();
  return out.length > max ? out.slice(0, max - 1).trimEnd() + "…" : out;
}
