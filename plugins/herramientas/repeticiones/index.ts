import type { ToolPlugin } from "../types";
import { decorar } from "../_comun/decorar";
import { muletillas, repeticiones } from "./reglas";

export const repeticionesTool: ToolPlugin = {
  id: "repeticiones",
  name: "Repeticiones y muletillas",
  extensions: () => [decorar("repeticiones", (t, previo) => [
    ...repeticiones(t, previo).map((r) => ({ from: r.from, to: r.to, class: "repe", title: `«${r.palabra}» ya salió hace ${r.distancia} palabras.` + (r.sugerencias.length ? ` Prueba: ${r.sugerencias.join(", ")}.` : "") })),
    ...muletillas(t).map((m) => ({ from: m.from, to: m.to, class: "muleti", title: `Muletilla: «${m.frase}». ¿Se puede quitar?` })),
  ])],
};
