import { choose } from "../../../src/dialog";
import type { ToolPlugin } from "../types";
import { EPOCAS, culturasDe, generar, type Genero } from "../_comun/nombres";

// Elegir época, cultura y género; luego un nombre, que crea su ficha de personaje. Para un personaje completo
// (con edad, oficio, defecto, arco…) está el Taller creativo.
export const generadorNombres: ToolPlugin = {
  id: "generador-nombres",
  name: "Generador de nombres",
  actions: [{
    label: "Generar nombres…",
    async run(host) {
      const en = host.lang === "en";
      const e = await choose(en ? "Era:" : "Época:", EPOCAS.map(([, es, n]) => (en ? n : es)));
      if (e === null) return;
      const cs = culturasDe(EPOCAS[e][0]);
      const c = await choose(en ? "Culture:" : "Cultura:", cs.map((x) => (en ? x.en : x.es)));
      if (c === null) return;
      const gs: Genero[] = ["x", "f", "m"];
      const g = await choose(en ? "Gender:" : "Género:", en ? ["Any", "Female", "Male"] : ["Cualquiera", "Femenino", "Masculino"]);
      if (g === null) return;
      for (;;) { // «Otros» vuelve a sortear; elegir un nombre crea su ficha
        const names = generar(cs[c].id, 8, gs[g], Math.random, en);
        const i = await choose(en ? "Pick a name (creates its character card):" : "Elige un nombre (crea su ficha de personaje):", [...names, en ? "↻ Other names" : "↻ Otros nombres"]);
        if (i === null) return;
        if (i < names.length) {
          host.addCard({ id: crypto.randomUUID(), type: "character", name: names[i], notes: "", origin: `${en ? cs[c].en : cs[c].es}` });
          return host.notify(en ? `Card “${names[i]}” created` : `Ficha «${names[i]}» creada`);
        }
      }
    },
  }],
};
