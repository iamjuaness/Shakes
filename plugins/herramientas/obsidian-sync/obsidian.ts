// Puro: una ficha como nota de Obsidian (frontmatter, relaciones con [[enlaces]] y escenas donde aparece).
interface C { id: string; type: string; name: string; notes: string; age?: string; job?: string; origin?: string; virtues?: string; flaw?: string; backstory?: string; lie?: string; arc?: string; trait?: string; links?: { to: string; label: string }[] }

const TIPO: Record<string, string> = { character: "Personaje", place: "Lugar", object: "Objeto", faction: "Facción" };
export const nombreArchivo = (name: string) => (name.replace(/[\\/:*?"<>|#^[\]]/g, "-").trim() || "Sin nombre") + ".md";

const ficha = (c: C) => [
  [["Edad", c.age], ["Ocupación", c.job], ["Origen", c.origin]].filter(([, v]) => v).map(([k, v]) => `**${k}:** ${v}`).join("  \n"),
  ...([["Virtudes", c.virtues], ["Defecto central", c.flaw], ["Trasfondo", c.backstory], ["Mentira que se cree", c.lie], ["Arco de cambio", c.arc], ["Rasgo inspirador", c.trait]] as const).filter(([, v]) => v?.trim()).map(([k, v]) => `### ${k}\n${v!.trim()}`),
].filter(Boolean).join("\n\n");

export function cardToMd(c: C, cards: C[], escenas: string[]): string {
  const rel = (c.links ?? []).flatMap((l) => { const o = cards.find((x) => x.id === l.to); return o ? [`- ${l.label}: [[${o.name}]]`] : []; });
  return [
    `---\ntipo: ${TIPO[c.type] ?? c.type}\nfuente: Shakes\n---`,
    `# ${c.name}`,
    c.type === "character" ? ficha(c) : "",
    c.notes.trim(),
    rel.length ? `## Relaciones\n${rel.join("\n")}` : "",
    escenas.length ? `## Aparece en\n${escenas.map((s) => `- ${s}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n") + "\n";
}
