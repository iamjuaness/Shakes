// Ejecutar: node src/remote.test.ts
import assert from "node:assert/strict";
import { pluginPaths } from "./remote.ts";

const b = (path: string, type = "blob") => ({ path, type });
assert.deepEqual(
  pluginPaths([b("plugins/temas/a.json"), b("plugins/herramientas/x/plugin.json"), b("plugins/estructuras/e.json"), b("plugins/index.ts"), b("package.json"), b("plugins/temas", "tree"), b("src/plugins/temas/z.json")]),
  ["plugins/temas/a.json", "plugins/herramientas/x/plugin.json", "plugins/estructuras/e.json"],
);
console.log("remote ok");
