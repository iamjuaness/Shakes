// Puro: qué hacer al teclear `typed` con `before` = texto del párrafo antes del cursor.
// `"` -> « » ; `--` -> raya (—). Devuelve cuántos caracteres previos borrar y qué insertar, o null.
export function tipografia(before: string, typed: string): { borrar: number; texto: string } | null {
  if (typed === '"') return { borrar: 0, texto: before === "" || /[\s(\[—¿¡]$/.test(before) ? "«" : "»" };
  if (typed === "-" && before.endsWith("-") && !before.endsWith("--")) return { borrar: 1, texto: "—" };
  return null;
}
