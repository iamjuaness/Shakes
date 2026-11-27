// Puro: el dossier de publicación en Markdown y la carta de presentación a partir de lo que rellena el autor.
import { enIngles } from "../_comun/idioma.ts";
export interface Dossier { genero?: string; publico?: string; logline?: string; sinopsisCorta?: string; sinopsisLarga?: string; contraportada?: string; bio?: string; comparables?: string; claves?: string; categorias?: string; destinatario?: string; carta?: string; hechos?: string[] }
type CampoDossier = { id: Exclude<keyof Dossier, "hechos" | "carta">; nombre: string; filas: number; ayuda: string; max?: number };
// nombre y ayuda en inglés, por campo
const EN: Record<CampoDossier["id"], [string, string]> = {
  genero: ["Genre", "crime, YA fantasy…"], publico: ["Audience", "adult, young adult, children"],
  logline: ["Logline", "Who, what they want, what stops them and what they stand to lose. One sentence."],
  sinopsisCorta: ["Short synopsis", "One paragraph, without spoiling the ending."], sinopsisLarga: ["Synopsis for publishers", "The whole plot, ending included."],
  contraportada: ["Back cover text", "Hook, protagonist, conflict and an open question."], bio: ["Author bio", "In third person."],
  comparables: ["Comparable books", "Two or three similar recent works."], claves: ["Keywords", "Seven phrases a reader would search, comma separated."],
  categorias: ["Store categories", "Fiction / Thriller / Psychological…"], destinatario: ["Publisher or agency", "Who the letter is for"],
};
export const campos = (): CampoDossier[] => (enIngles() ? CAMPOS.map((c) => ({ ...c, nombre: EN[c.id][0], ayuda: EN[c.id][1] })) : CAMPOS);
export const CAMPOS: CampoDossier[] = [
  { id: "genero", nombre: "Género", filas: 1, ayuda: "novela negra, fantasía juvenil…" },
  { id: "publico", nombre: "Público", filas: 1, ayuda: "adulto, juvenil, infantil" },
  { id: "logline", nombre: "Logline", filas: 2, ayuda: "Quién, qué quiere, qué se lo impide y qué pierde. Una frase.", max: 40 },
  { id: "sinopsisCorta", nombre: "Sinopsis corta", filas: 4, ayuda: "Un párrafo, sin destripar el final.", max: 150 },
  { id: "sinopsisLarga", nombre: "Sinopsis para editoriales", filas: 10, ayuda: "Toda la trama, final incluido.", max: 1000 },
  { id: "contraportada", nombre: "Texto de contraportada", filas: 6, ayuda: "Gancho, protagonista, conflicto y pregunta abierta.", max: 200 },
  { id: "bio", nombre: "Biografía del autor", filas: 4, ayuda: "En tercera persona.", max: 120 },
  { id: "comparables", nombre: "Libros comparables", filas: 2, ayuda: "Dos o tres obras recientes parecidas." },
  { id: "claves", nombre: "Palabras clave", filas: 2, ayuda: "Siete frases que buscaría un lector, separadas por comas." },
  { id: "categorias", nombre: "Categorías de tienda", filas: 2, ayuda: "Ficción / Thriller / Psicológico…" },
  { id: "destinatario", nombre: "Editorial o agencia destinataria", filas: 1, ayuda: "A quién va la carta" },
];
export const TAREAS = ["Texto corregido (Mesa de edición, las seis pasadas)", "Obra registrada en el registro de propiedad intelectual", "Portada final con lomo y contraportada", "PDF interior maquetado y revisado (pestaña Maquetar)", "EPUB probado en un lector", "ISBN conseguido", "Depósito legal (si tu país lo exige)", "Precio y canales de venta decididos", "Respuestas de los lectores cero"];
const TAREAS_EN = ["Text edited (Editing desk, all six passes)", "Work registered with the copyright office", "Final cover with spine and back", "Interior PDF typeset and reviewed (Layout tab)", "EPUB tested in a reader", "ISBN obtained", "Legal deposit (if your country requires it)", "Price and sales channels decided", "Beta readers' feedback"];
// La marca se guarda con el texto en español: así sirve en los dos idiomas.
export const tareaVisible = (t: string) => (enIngles() ? TAREAS_EN[TAREAS.indexOf(t)] ?? t : t);
export const contar = (t = "") => (t.trim() ? t.trim().split(/\s+/).length : 0);

export function carta(d: Dossier, titulo: string, autor: string, palabras: number): string {
  const redondo = Math.round(palabras / 1000) * 1000 || palabras;
  if (enIngles()) return [
    `Dear ${d.destinatario?.trim() || "[publisher]"} team,`,
    `I am submitting “${titulo}”, ${d.genero?.trim() || "[genre]"}${d.publico?.trim() ? ` for ${d.publico.trim()} readers` : ""}, ${redondo.toLocaleString("en")} words long.`,
    d.logline?.trim() || "[logline]",
    d.sinopsisCorta?.trim() || "[short synopsis]",
    d.comparables?.trim() ? `It may appeal to readers of ${d.comparables.trim()}.` : "",
    d.bio?.trim() || "[bio]",
    "I would be glad to send the full manuscript. Thank you for your time.",
    `Kind regards,\n${autor || "[name]"}`,
  ].filter(Boolean).join("\n\n");
  return [
    `Estimado equipo de ${d.destinatario?.trim() || "[editorial]"}:`,
    `Les presento «${titulo}», ${d.genero?.trim() || "[género]"}${d.publico?.trim() ? ` para público ${d.publico.trim()}` : ""}, de ${redondo.toLocaleString("es")} palabras.`,
    d.logline?.trim() || "[logline]",
    d.sinopsisCorta?.trim() || "[sinopsis corta]",
    d.comparables?.trim() ? `Puede interesar a lectores de ${d.comparables.trim()}.` : "",
    d.bio?.trim() || "[biografía]",
    "Quedo a su disposición para enviarles el manuscrito completo. Muchas gracias por su tiempo.",
    `Un cordial saludo,\n${autor || "[nombre]"}`,
  ].filter(Boolean).join("\n\n");
}

export const dossierMd = (d: Dossier, titulo: string, autor: string) =>
  [`# ${titulo}`, autor && `*${autor}*`, ...campos().filter((c) => c.id !== "destinatario" && d[c.id]?.trim()).map((c) => `## ${c.nombre}\n\n${d[c.id]!.trim()}`), d.carta?.trim() && `## ${enIngles() ? "Query letter" : "Carta de presentación"}\n\n${d.carta.trim()}`].filter(Boolean).join("\n\n") + "\n";
