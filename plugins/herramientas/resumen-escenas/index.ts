import { scenes, update } from "../../../src/tree";
import { plain } from "../_comun/texto";
import type { ToolPlugin } from "../types";
import { resumir } from "./resumen";

export const resumenEscenas: ToolPlugin = {
  id: "resumen-escenas",
  name: "Resumen de escenas",
  actions: [{
    label: "Rellenar sinopsis vacías del corcho",
    run(host) {
      const vacias = scenes(host.project.book).filter(({ scene }) => !scene.summary?.trim() && plain(scene.content));
      if (!vacias.length) return host.notify("No hay sinopsis vacías con texto.");
      host.setProject((p) => ({ ...p, book: vacias.reduce((b, { scene }) => update(b, scene.id, (n) => ({ ...n, summary: resumir(plain(n.content)) })), p.book) }));
      host.notify(`${vacias.length} sinopsis rellenadas (solo las vacías)`);
    },
  }],
};
