import { L } from "../_comun/idioma.ts";
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
      if (!vacias.length) return host.notify(L("No hay sinopsis vacías con texto.", "There are no empty synopses with text."));
      host.setProject((p) => ({ ...p, book: vacias.reduce((b, { scene }) => update(b, scene.id, (n) => ({ ...n, summary: resumir(plain(n.content)) })), p.book) }));
      host.notify(L(`${vacias.length} sinopsis rellenadas (solo las vacías)`, `${vacias.length} synopses filled (empty ones only)`));
    },
  }],
};
