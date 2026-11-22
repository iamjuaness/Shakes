// Plugins de la app. `catalog` lista todos los manifiestos JSON de estas carpetas (se instalan desde la pestaña Plugins).
// Casi todas las herramientas son externas: su plugin.json lleva "main" (JS compilado con npm run plugins) y se cargan como
// extensiones (src/extTools.ts). `TOOLS` son solo las que van compiladas en la app (ortografía: necesita los diccionarios).
import { Plugin, parsePlugin } from "../src/plugins";
import type { ToolPlugin } from "./herramientas/types";
import { ortografiaEs, ortografiaEn } from "./herramientas/ortografia/index";

// El JS de las herramientas externas viaja en el catálogo para poder instalarlas sin conexión.
const codes = import.meta.glob("./**/*.js", { eager: true, query: "?raw", import: "default" }) as Record<string, string>;
export const catalog: Plugin[] = Object.entries(import.meta.glob("./**/*.json", { eager: true, import: "default" }))
  .map(([path, raw]) => {
    const p = parsePlugin(raw);
    const code = typeof p !== "string" && p.main ? codes[path.replace(/[^/]+$/, p.main)] : undefined;
    return typeof p !== "string" && code ? { ...p, code } : p;
  })
  .filter((p): p is Plugin => typeof p !== "string");

export const TOOLS: ToolPlugin[] = [ortografiaEs, ortografiaEn];

// Se instalan solos la primera vez que se abre Shakes; el resto lo elige el usuario en la pestaña Plugins.
export const ESSENTIAL = ["fichas-auto", "dialogo-auto", "repeticiones", "notas-margen", "importar", "exportar-extra", "estructura-vogler"];
