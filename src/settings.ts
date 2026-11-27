// Ajustes de la app (globales, no van en el .shks). Se guardan en IndexedDB (clave "settings"); la carpeta predeterminada
// de proyectos sigue en su clave "projectsDir" porque es un handle del sistema de archivos.
import { useSyncExternalStore } from "react";
import { Lang, detectLang, setLang } from "./i18n";
import { idbGet, idbSet } from "./store";

export interface Settings {
  lang: Lang;
  theme: "auto" | "light" | "dark";
  copyMinutes: number; // copia automática del proyecto; 0 = desactivada
  checkUpdates: boolean; // buscar versión nueva en GitHub al abrir
  spell: boolean; // corrector ortográfico en el idioma de la obra
  quiet: boolean; // escribir sin subrayados (ortografía, estilo, repeticiones): se revisa después
  fontSize: number; // px del texto del editor
  width: number; // ancho máximo de la columna de texto, en px
  tour: boolean; // el recorrido de la primera vez ya se vio
}

export const DEFAULTS: Settings = { lang: detectLang(), theme: "auto", copyMinutes: 10, checkUpdates: true, spell: true, quiet: false, fontSize: 19, width: 700, tour: false };

let cur: Settings = DEFAULTS;
const subs = new Set<() => void>();
const apply = (s: Settings) => { cur = s; setLang(s.lang); subs.forEach((f) => f()); };

export const getSettings = () => cur;
export async function loadSettings(): Promise<void> {
  try { apply({ ...DEFAULTS, ...((await idbGet<Partial<Settings>>("settings")) ?? {}) }); } catch { apply(DEFAULTS); }
}
export function saveSettings(patch: Partial<Settings>) {
  apply({ ...cur, ...patch });
  idbSet("settings", cur).catch(() => {});
}
export const useSettings = (): Settings => useSyncExternalStore((f) => { subs.add(f); return () => void subs.delete(f); }, getSettings);

export const getProjectsDir = () => idbGet<any>("projectsDir").catch(() => undefined);
export const setProjectsDir = (d: any) => idbSet("projectsDir", d).catch(() => {});

export const getBackupDir = () => idbGet<any>("backupDir").catch(() => undefined);
export const setBackupDir = (d: any) => idbSet("backupDir", d).catch(() => {});

export const prefersDark = () => matchMedia("(prefers-color-scheme: dark)").matches;
export const isDark = (s: Settings) => (s.theme === "auto" ? prefersDark() : s.theme === "dark");
