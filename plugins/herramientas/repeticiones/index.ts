import type { ToolPlugin } from "../types";
import { decorar } from "../_comun/decorar";
import { muletillas, repeticiones } from "./reglas";
import { enEspanol } from "../_comun/texto";

// Clic en una palabra subrayada: menú con sustitutos (o «Quitar» en las muletillas).
export const repeticionesTool: ToolPlugin = {
  id: "repeticiones",
  name: "Repeticiones y muletillas",
  extensions: (host) => !enEspanol(host()) ? [] : [decorar("repeticiones", (t, previo) => [
    ...repeticiones(t, previo).map((r) => ({ from: r.from, to: r.to, class: "repe", sug: r.sugerencias, learn: r.palabra, title: `«${r.palabra}» ya salió hace ${r.distancia} palabras.` + (r.sugerencias.length ? "" : " Sin sinónimo en el diccionario: añade el tuyo desde el menú, reformula o usa un pronombre.") })),
    ...muletillas(t).map((m) => ({ from: m.from, to: m.to, class: "muleti", sug: m.sugerencias, title: `Muletilla: «${m.frase}». Sustituye o quita.` })),
  ])],
};
