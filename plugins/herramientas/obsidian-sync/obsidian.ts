// Puro: una ficha como nota de Obsidian (frontmatter, relaciones con [[enlaces]] y escenas donde aparece).
interface C { id: string; type: string; name: string; notes: string; links?: { to: string; label: string }[] }

export const nombreArchivo = (name: string) => (name.replace(/[\\/:*?"<>|#^[\]]/g, "-").trim() || "Sin nombre") + ".md";

export function cardToMd(c: C, cards: C[], escenas: string[]): string {
  const rel = (c.links ?? []).flatMap((l) => { const o = cards.find((x) => x.id === l.to); return o ? [`- ${l.label}: [[${o.name}]]`] : []; });
  return [
    `---\ntipo: ${c.type}\nfuente: Shakes\n---`,
    `# ${c.name}`,
    c.notes.trim(),
    rel.length ? `## Relaciones\n${rel.join("\n")}` : "",
    escenas.length ? `## Aparece en\n${escenas.map((s) => `- ${s}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n") + "\n";
}
