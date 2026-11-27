// Ejecuta todas las pruebas: cada archivo *.test.ts de src y plugins, y la de interfaz. Uso: npm test
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

const buscar = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? buscar(`${dir}/${e.name}`) : e.name.endsWith(".test.ts") ? [`${dir}/${e.name}`] : []));
const fallos = [...buscar("src"), ...buscar("plugins"), "scripts/ui.test.mjs"].filter((f) => spawnSync(process.execPath, [f], { stdio: "inherit", timeout: 180_000 }).status !== 0);
if (fallos.length) { console.error("Fallan:", fallos.join(", ")); process.exit(1); }
console.log("Todas las pruebas pasan.");
