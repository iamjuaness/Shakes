// Actualizaciones: consulta la última release de GitHub y la compara con la versión instalada. Sin dependencias de React.
// Test: node src/update.test.ts
import { REPO } from "./remote.ts";

export interface Update { version: string; notes: string; page: string; asset?: string }

const num = (v: string) => v.replace(/^v/i, "").split("-")[0].split(".").map((x) => parseInt(x, 10) || 0);
// > 0 si `a` es más nueva que `b` (semver simple: 1.10.0 > 1.9.9; ignora sufijos -beta).
export function compareVersions(a: string, b: string): number {
  const x = num(a), y = num(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
}

// Convierte la respuesta de /releases/latest; null si no es más nueva que `current` o es borrador/prerelease.
export function parseRelease(r: any, current: string): Update | null {
  if (!r || typeof r.tag_name !== "string" || r.draft || r.prerelease) return null;
  if (compareVersions(r.tag_name, current) <= 0) return null;
  const exe = (Array.isArray(r.assets) ? r.assets : []).find((a: any) => /\.exe$/i.test(a?.name) && /^https:\/\//.test(a?.browser_download_url));
  const page = typeof r.html_url === "string" && /^https:\/\/github\.com\//.test(r.html_url) ? r.html_url : `https://github.com/${REPO}/releases`;
  return { version: r.tag_name.replace(/^v/i, ""), notes: typeof r.body === "string" ? r.body : "", page, asset: exe?.browser_download_url };
}

export async function checkUpdate(current: string): Promise<Update | null> {
  const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } });
  if (r.status === 404) return null; // aún no hay releases
  if (!r.ok) throw new Error(r.status === 403 ? "límite de GitHub, prueba en un rato" : `GitHub ${r.status}`);
  return parseRelease(await r.json(), current);
}

// Abre el instalador (o la página de la release) con el navegador/sistema: en Tauri vía plugin opener, en la web con window.open.
export async function openUpdate(u: Update) {
  const url = u.asset ?? u.page;
  try {
    if ("__TAURI_INTERNALS__" in window) return await (await import("@tauri-apps/plugin-opener")).openUrl(url);
  } catch { /* cae al respaldo */ }
  window.open(url, "_blank", "noopener");
}
