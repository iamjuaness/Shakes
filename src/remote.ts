// Catálogo en GitHub: lista los JSON de plugins/ del repositorio y los lee sin descargar nada a disco.
// Todo manifiesto pasa por parsePlugin (sin código; solo datos validados). Test: node src/remote.test.ts
import { parsePlugin } from "./plugins.ts";
import type { Plugin } from "./plugins.ts";

export const REPO = "iamjuaness/Shakes";
export const BRANCH = "master";
const MAX = 150; // tope de manifiestos por consulta
const MAX_BYTES = 200_000;

// Rutas de manifiestos dentro de plugins/{temas,estructuras,herramientas}.
export const pluginPaths = (tree: { path: string; type: string }[]): string[] =>
  tree.filter((t) => t.type === "blob" && /^plugins\/(temas|estructuras|herramientas)\/(.+\/)?[^/]+\.json$/.test(t.path)).map((t) => t.path).slice(0, MAX);

export async function fetchRemote(): Promise<Plugin[]> {
  const r = await fetch(`https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`);
  if (!r.ok) throw new Error(r.status === 403 ? "límite de GitHub, prueba en un rato" : `GitHub respondió ${r.status}`);
  const paths = pluginPaths((await r.json()).tree ?? []);
  const got = await Promise.all(paths.map(async (p) => {
    try {
      const x = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/${p}`);
      const t = await x.text();
      return x.ok && t.length <= MAX_BYTES ? parsePlugin(JSON.parse(t)) : null;
    } catch { return null; }
  }));
  return got.filter((p): p is Plugin => !!p && typeof p !== "string");
}
