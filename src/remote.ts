// Catálogo en GitHub: lista los JSON de plugins/ del repositorio y los lee sin descargar nada a disco.
// Todo manifiesto pasa por parsePlugin (sin código; solo datos validados). Test: node src/remote.test.ts
import { parsePlugin } from "./plugins.ts";
import type { Plugin } from "./plugins.ts";

export const REPO = "iamjuaness/Shakes";
export const BRANCH = "master";
const MAX = 150; // tope de manifiestos por consulta
const MAX_BYTES = 200_000;
const MAX_CODE = 1_000_000;

// Rutas de manifiestos dentro de plugins/{temas,estructuras,herramientas}.
export const pluginPaths = (tree: { path: string; type: string }[]): string[] =>
  tree.filter((t) => t.type === "blob" && /^plugins\/(temas|estructuras|herramientas)\/(.+\/)?[^/]+\.json$/.test(t.path)).map((t) => t.path).slice(0, MAX);

export async function fetchRemote(): Promise<Plugin[]> {
  type Got = Plugin | null;
  const r = await fetch(`https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`);
  if (!r.ok) throw new Error(r.status === 403 ? "límite de GitHub, prueba en un rato" : `GitHub respondió ${r.status}`);
  const paths = pluginPaths((await r.json()).tree ?? []);
  const got = await Promise.all(paths.map(async (p): Promise<Got> => {
    try {
      const x = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/${p}`);
      const t = await x.text();
      const pl = x.ok && t.length <= MAX_BYTES ? parsePlugin(JSON.parse(t)) : null;
      return pl && typeof pl !== "string" ? { ...pl, base: `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${p.replace(/\/[^/]+$/, "")}` } : null;
    } catch { return null; }
  }));
  return got.filter((p): p is Plugin => !!p);
}

// Baja el JS de un plugin con herramienta externa. Solo desde la carpeta del manifiesto en GitHub.
export async function fetchCode(base: string | undefined, main: string): Promise<string> {
  if (!base) throw new Error("sin conexión con GitHub");
  const r = await fetch(`${base}/${main}`);
  if (!r.ok) throw new Error(`GitHub respondió ${r.status}`);
  const code = await r.text();
  if (code.length > MAX_CODE) throw new Error("código demasiado grande");
  return code;
}
