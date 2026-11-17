import { choose } from "../../../src/dialog";
import type { ToolPlugin } from "../types";
import { CULTURAS, generar } from "./nombres";

export const generadorNombres: ToolPlugin = {
  id: "generador-nombres",
  name: "Generador de nombres",
  actions: [{
    label: "Generar nombres…",
    async run(host) {
      const cultures = Object.keys(CULTURAS);
      const c = await choose("Cultura o época:", cultures);
      if (c === null) return;
      for (;;) { // «Otros» vuelve a sortear; elegir un nombre crea su ficha
        const names = generar(cultures[c], 8);
        const i = await choose("Elige un nombre (crea su ficha de personaje):", [...names, "↻ Otros nombres"]);
        if (i === null) return;
        if (i < names.length) {
          host.addCard({ id: crypto.randomUUID(), type: "Personaje", name: names[i], notes: "" });
          return host.notify(`Ficha «${names[i]}» creada`);
        }
      }
    },
  }],
};
