// Genera latest.json (lo que consulta el actualizador firmado) a partir del instalador y su firma.
// Uso en CI: node scripts/latest-json.mjs v1.2.3
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const etiqueta = process.argv[2];
const carpeta = "src-tauri/target/release/bundle/nsis";
const exe = readdirSync(carpeta).find((f) => f.endsWith("-setup.exe"));
if (!etiqueta || !exe) throw new Error("falta la etiqueta o el instalador");
const url = `https://github.com/iamjuaness/Shakes/releases/download/${etiqueta}/${encodeURIComponent(exe)}`;
writeFileSync(`${carpeta}/latest.json`, JSON.stringify({
  version: etiqueta.replace(/^v/, ""),
  notes: "Ver CHANGELOG.md",
  pub_date: new Date().toISOString(),
  platforms: { "windows-x86_64": { signature: readFileSync(`${carpeta}/${exe}.sig`, "utf8"), url } },
}, null, 2));
console.log("latest.json listo");
