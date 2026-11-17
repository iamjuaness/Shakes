import type { ToolPlugin } from "../types";
import { decorar } from "../_comun/decorar";
import { lint } from "./reglas";

export const linterEstilo: ToolPlugin = {
  id: "linter-estilo",
  name: "Linter de estilo",
  extensions: () => [decorar("linterEstilo", (t) => lint(t).map((s) => ({ from: s.from, to: s.to, class: "lint-" + s.tipo, title: s.msg })))],
};
