import { ask } from "../../../src/dialog";
import { imprimir } from "../_comun/guardar";
import type { ToolPlugin } from "../types";
import { editorial } from "./editorial";

export const manuscritoEditorial: ToolPlugin = {
  id: "manuscrito-editorial",
  name: "Manuscrito para editoriales",
  actions: [{
    label: "Manuscrito estándar (PDF)…",
    exporta: true,
    async run(host) {
      const autor = await ask("Nombre del autor (portada y cabecera)", host.scope.meta?.author ?? "");
      if (autor) imprimir(editorial(host.scope, autor));
    },
  }],
};
