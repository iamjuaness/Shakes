import type { ToolPlugin } from "../types";
import { decorar } from "../_comun/decorar";
import { lint } from "./reglas";
import { enEspanol } from "../_comun/texto";

// Clic en un tramo subrayado: menú con alternativas (sinónimos, forma activa, división de frases, correcciones).
export const linterEstilo: ToolPlugin = {
  id: "linter-estilo",
  name: "Linter de estilo",
  extensions: (host) => !enEspanol(host()) ? [] : [decorar("linterEstilo", (t) => lint(t).map((s) => ({ from: s.from, to: s.to, class: "lint-" + s.tipo, title: s.msg, sug: s.sug })))],
};
