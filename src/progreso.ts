// Puro: en qué punto está el libro y cuál es el siguiente paso; y los cuatro modos que agrupan las pestañas.
// Test: node src/progreso.test.ts
import { scenes, totalWords } from "./tree.ts";
import type { Node, Project } from "./tree.ts";

export const MODOS = [
  { id: "planificar", tabs: ["cards", "map", "cork", "timeline"] },
  { id: "escribir", tabs: ["book", "search", "versions"] },
  { id: "editar", tabs: ["style", "review", "mesa-edicion"] },
  { id: "publicar", tabs: ["layout", "kit-publicacion"] },
] as const;
export type Modo = (typeof MODOS)[number]["id"];
export const modoDe = (tab: string): Modo | undefined => MODOS.find((m) => (m.tabs as readonly string[]).includes(tab))?.id;

export type PasoId = "datos" | "personajes" | "estructura" | "escribir" | "revisar" | "maquetar" | "publicar";
export interface Paso { id: PasoId; tab: string; hecho: boolean; n: number; de: number } // n de de: avance, para mostrarlo

export function pasos(p: Project, obra: Node): Paso[] {
  const caps = scenes(obra).map((s) => s.scene);
  const palabras = totalWords(obra);
  const meta = p.goal > 0 ? p.goal : 1000;
  const revisados = caps.filter((c) => c.status === "revised" || c.status === "final").length;
  const personajes = p.cards.filter((c) => c.type === "character").length;
  const paso = (id: PasoId, tab: string, n: number, de: number): Paso => ({ id, tab, n: Math.min(n, de), de, hecho: n >= de });
  return [
    paso("datos", "datos", Number(!!obra.meta?.author) + Number(!!obra.title.trim()), 2),
    paso("personajes", "cards", personajes, 1),
    paso("estructura", "cork", caps.length, 3),
    paso("escribir", "book", palabras, meta),
    paso("revisar", "mesa-edicion", revisados, Math.max(1, caps.length)),
    paso("maquetar", "layout", Number(!!p.ext?.maqueta?.[obra.id]), 1),
    paso("publicar", "kit-publicacion", Number(!!p.ext?.publicacion?.[obra.id]), 1),
  ];
}
export const siguiente = (lista: Paso[]) => lista.find((x) => !x.hecho);
