// Ejecutar: node src/plugins.test.ts
import assert from "node:assert/strict";
import { activeTheme, allSceneTemplates, allStructures, install, parsePlugin, themeCss, uninstall } from "./plugins.ts";

assert.equal(typeof parsePlugin({}), "string", "sin manifiesto válido");
assert.equal(typeof parsePlugin({ shakes: 1, id: "Mal Id", name: "x", themes: [] }), "string", "id inválido");
assert.equal(typeof parsePlugin({ shakes: 1, id: "vacio", name: "Vacío" }), "string", "sin aportes");

const p = parsePlugin({
  shakes: 1, id: "demo", name: "Demo",
  themes: [{ name: "Noche", dark: { "--bg": "#000", "--accent": "red; background:url(x)", "--evil": "#fff" }, light: { "--bg": "rgb(250, 250, 250)" } }],
  structures: [{ name: "Haiku", parts: [{ title: "Poema", chapters: ["Verso 1", "Verso 2"] }] }],
  sceneTemplates: [{ name: "Escena de terror", genre: "Terror", html: "<h2>Inicio</h2><script>alert(1)</script><p onclick=\"x\">Texto</p>" }],
});
assert.equal(typeof p, "object");
if (typeof p === "string") throw new Error(p);
assert.deepEqual(p.themes[0].dark, { "--bg": "#000" }, "descarta valor peligroso y variable desconocida");
assert.ok(!p.sceneTemplates[0].html.includes("script"), "sin scripts");
assert.ok(!p.sceneTemplates[0].html.includes("onclick"), "sin atributos");
assert.ok(p.sceneTemplates[0].html.includes("<h2>Inicio</h2>"));

let s = install({ plugins: [], theme: null }, p);
s = install(s, { ...p, version: "2" });
assert.equal(s.plugins.length, 1, "reinstalar reemplaza");
assert.equal(allStructures(s)[0].name, "Haiku");
assert.equal(allSceneTemplates(s).length, 1);

s = { ...s, theme: "demo:0" };
assert.equal(activeTheme(s)?.name, "Noche");
assert.equal(themeCss(activeTheme(s)), ':root{--bg:rgb(250, 250, 250)}:root[data-theme="dark"]{--bg:#000}');
assert.equal(themeCss(undefined), "");
assert.equal(uninstall(s, "demo").theme, null, "quitar el plugin desactiva su tema");

console.log("plugins ok");
