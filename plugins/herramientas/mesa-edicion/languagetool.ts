// Gramática con un LanguageTool que el usuario tiene en su equipo (analiza la frase entera). El texto no sale de él:
// solo se admiten direcciones locales.
export const URL_LOCAL = "http://localhost:8081";
export const esLocal = (url: string) => {
  try { const u = new URL(url); return u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname); }
  catch { return false; }
};

export interface Coincidencia { bloque: number; from: number; to: number; regla: string; msg: string; sug: string[] }
const idioma = (l: string) => (/^en$/i.test(l) ? "en-US" : /^pt$/i.test(l) ? "pt-PT" : /^de$/i.test(l) ? "de-DE" : l);

// Las posiciones de la respuesta sobre el texto unido -> posiciones dentro de cada párrafo.
export function repartir(bloques: string[], matches: any[]): Coincidencia[] {
  const inicios: number[] = [];
  bloques.reduce((p, b) => (inicios.push(p), p + b.length + 2), 0);
  return matches.flatMap((m): Coincidencia[] => {
    let bloque = inicios.length - 1;
    while (bloque > 0 && inicios[bloque] > m.offset) bloque--;
    const from = m.offset - inicios[bloque], to = from + m.length;
    if (from < 0 || to > bloques[bloque].length) return [];
    return [{ bloque, from, to, regla: `lt-${m.rule?.id ?? "?"}`, msg: String(m.message ?? ""), sug: (m.replacements ?? []).slice(0, 4).map((r: any) => String(r.value)) }];
  });
}

export async function revisarCon(url: string, bloques: string[], lang: string): Promise<Coincidencia[]> {
  if (!esLocal(url)) throw new Error("local");
  const r = await fetch(`${url.replace(/\/+$/, "")}/v2/check`, { method: "POST", body: new URLSearchParams({ text: bloques.join("\n\n"), language: idioma(lang) }) });
  if (!r.ok) throw new Error(String(r.status));
  return repartir(bloques, (await r.json()).matches ?? []);
}
