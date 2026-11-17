// Plugins declarativos: un JSON, sin código ejecutable. Aportan temas, estructuras (como TEMPLATES) y plantillas de escena.
import type { Template } from "./tree.ts";

export interface ThemeDef { name: string; light?: Record<string, string>; dark?: Record<string, string> }
export interface SceneTpl { name: string; genre?: string; html: string }
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  themes: ThemeDef[];
  structures: Template[];
  sceneTemplates: SceneTpl[];
}
export interface PluginState { plugins: Plugin[]; theme: string | null } // theme = "idPlugin:índice"

// Variables CSS que un tema puede cambiar (las de :root en App.css).
export const THEME_VARS = ["--bg", "--surface", "--panel", "--text", "--muted", "--accent", "--accent-soft", "--on-accent", "--line", "--shadow", "--radius"];
// Solo colores/medidas: sin ";", "{", "url(" ni "expression".
const SAFE_VALUE = /^[#\w\s().,%/-]{1,80}$/;
// Solo etiquetas de texto, sin atributos; script/style se eliminan con su contenido.
const clean = (html: string) =>
  html
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(\/?)([a-z][a-z0-9]*)\b[^>]*>/gi, (_, c, t) => (/^(p|h[1-6]|em|strong|i|b|ul|ol|li|blockquote|br)$/i.test(t) ? `<${c}${t.toLowerCase()}>` : ""));

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);

function vars(raw: any): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of THEME_VARS) if (typeof raw?.[k] === "string" && SAFE_VALUE.test(raw[k]) && !/url|expression/i.test(raw[k])) out[k] = raw[k];
  return out;
}

// Valida y limpia un manifiesto. Devuelve el plugin o un mensaje de error.
export function parsePlugin(raw: any): Plugin | string {
  if (raw?.shakes !== 1) return 'Falta "shakes": 1 en el manifiesto.';
  const id = str(raw.id, 60);
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(id)) return '"id" inválido (minúsculas, números, . _ -).';
  const name = str(raw.name, 80);
  if (!name) return 'Falta "name".';
  const themes = arr(raw.themes).flatMap((t): ThemeDef[] => {
    const def = { name: str(t?.name, 60), light: vars(t?.light), dark: vars(t?.dark) };
    return def.name && (Object.keys(def.light).length || Object.keys(def.dark).length) ? [def] : [];
  });
  const structures = arr(raw.structures).flatMap((s): Template[] => {
    const parts = arr(s?.parts).map((p) => ({ title: str(p?.title, 120), chapters: arr(p?.chapters).map((c) => str(c, 120)).filter(Boolean) })).filter((p) => p.title);
    return str(s?.name, 60) && parts.length ? [{ name: str(s.name, 60), parts }] : [];
  });
  const sceneTemplates = arr(raw.sceneTemplates).flatMap((s): SceneTpl[] => {
    const html = typeof s?.html === "string" ? clean(s.html.slice(0, 20000)) : "";
    return str(s?.name, 60) && html ? [{ name: str(s.name, 60), genre: str(s.genre, 40) || undefined, html }] : [];
  });
  if (!themes.length && !structures.length && !sceneTemplates.length) return "El plugin no aporta temas, estructuras ni plantillas válidos.";
  return { id, name, version: str(raw.version, 20) || "0.0.0", description: str(raw.description, 300), themes, structures, sceneTemplates };
}

// Instala (o reemplaza por id) un plugin.
export function install(s: PluginState, p: Plugin): PluginState {
  return { ...s, plugins: [...s.plugins.filter((x) => x.id !== p.id), p] };
}

export function uninstall(s: PluginState, id: string): PluginState {
  return { plugins: s.plugins.filter((x) => x.id !== id), theme: s.theme?.startsWith(id + ":") ? null : s.theme };
}

export function activeTheme(s: PluginState): ThemeDef | undefined {
  if (!s.theme) return;
  const i = s.theme.lastIndexOf(":");
  return s.plugins.find((p) => p.id === s.theme!.slice(0, i))?.themes[Number(s.theme.slice(i + 1))];
}

const rule = (sel: string, v?: Record<string, string>) => (v && Object.keys(v).length ? `${sel}{${Object.entries(v).map(([k, x]) => `${k}:${x}`).join(";")}}` : "");

export const themeCss = (t?: ThemeDef) => (t ? rule(":root", t.light) + rule(':root[data-theme="dark"]', t.dark) : "");

export const allStructures = (s: PluginState): Template[] => s.plugins.flatMap((p) => p.structures);
export const allSceneTemplates = (s: PluginState): SceneTpl[] => s.plugins.flatMap((p) => p.sceneTemplates);
