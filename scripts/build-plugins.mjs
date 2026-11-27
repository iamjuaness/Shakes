// Compila las herramientas externas: cada plugins/herramientas/<id>/plugin.json con "main" genera ese .js (CommonJS).
// Se sube a GitHub junto al manifiesto y Shakes lo descarga al instalar. Uso: npm run plugins
import { rolldown } from "rolldown";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve("plugins/herramientas");
const srcDir = resolve("src");
// Lo que Shakes presta a los plugins (igual que MODS en src/extTools.ts); el resto se empaqueta dentro del plugin.
const SHAKES_MODULES = ["tree", "dialog", "i18n", "export", "spell"];
const EXTERNAL = [/^react(\/.*)?$/, /^@tiptap\/(react|pm\/state|pm\/view)$/, /^fflate$/];

const shakesSrc = {
  name: "shakes-src",
  resolveId(source, importer) {
    if (!importer || !source.startsWith(".")) return null;
    const rel = relative(srcDir, resolve(dirname(importer), source)).replace(/\\/g, "/").replace(/\.(tsx?|jsx?)$/, "");
    if (rel.startsWith("..") || rel.includes("/")) return null;
    if (!SHAKES_MODULES.includes(rel)) throw new Error(`${importer}: «src/${rel}» no está disponible para plugins (${SHAKES_MODULES.join(", ")})`);
    return { id: `shakes/${rel}`, external: true };
  },
};

for (const d of readdirSync(root, { withFileTypes: true })) {
  const manifest = join(root, d.name, "plugin.json");
  if (!d.isDirectory() || !existsSync(manifest)) continue;
  const { main } = JSON.parse(readFileSync(manifest, "utf8"));
  if (!main) continue;
  const input = ["index.tsx", "index.ts"].map((f) => join(root, d.name, f)).find(existsSync);
  if (!input) throw new Error(`${d.name}: falta index.tsx/index.ts`);
  const bundle = await rolldown({ input, platform: "browser", external: EXTERNAL, plugins: [shakesSrc], logLevel: "warn" });
  await bundle.write({ file: join(root, d.name, main), format: "cjs", minify: true });
  console.log(`${d.name} → ${main}`);
}
