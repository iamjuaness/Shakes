// Herramientas externas: plugins con `main` (JS CommonJS) que no vienen compiladas en la app, como las extensiones de VS Code.
// Reciben un `require` cerrado con lo que ofrece Shakes; lo demás va dentro de su propio bundle (npm run plugins).
import * as React from "react";
import * as jsx from "react/jsx-runtime";
import * as tiptapReact from "@tiptap/react";
import * as pmState from "@tiptap/pm/state";
import * as pmView from "@tiptap/pm/view";
import * as tree from "./tree";
import * as dialog from "./dialog";
import * as i18n from "./i18n";
import * as exporting from "./export";
import * as fflate from "fflate";
import { evalCjs } from "./cjs";
import type { Plugin } from "./plugins";
import type { ToolPlugin } from "./pluginApi";

// Si cambia esta lista, actualiza también SHAKES_MODULES en scripts/build-plugins.mjs.
const MODS: Record<string, unknown> = {
  react: React, "react/jsx-runtime": jsx, "@tiptap/react": tiptapReact, "@tiptap/pm/state": pmState, "@tiptap/pm/view": pmView,
  "shakes/tree": tree, "shakes/dialog": dialog, "shakes/i18n": i18n, "shakes/export": exporting, fflate,
};

const cache = new Map<string, ToolPlugin | null>(); // identidad estable: React no remonta el panel en cada render

// Evalúa el código del plugin. null si falla o si no exporta una herramienta con el id del manifiesto.
export function loadTool(p: Plugin): ToolPlugin | null {
  if (!p.code || !p.tool) return null;
  const key = `${p.id}@${p.version}:${p.code.length}`;
  if (cache.has(key)) return cache.get(key)!;
  let tool: ToolPlugin | null = null;
  try {
    const m = evalCjs(p.code, MODS);
    const c = m.default ?? Object.values(m).find((v: any) => v?.id);
    if (c?.id === p.tool) tool = c as ToolPlugin;
    else console.error(`Plugin ${p.id}: no exporta una herramienta con id «${p.tool}»`);
  } catch (e) { console.error(`Plugin ${p.id}:`, e); }
  cache.set(key, tool);
  return tool;
}
