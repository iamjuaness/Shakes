// Pruebas de la interfaz: monta la app en jsdom (Vite compila el TSX) y la usa como lo haría una persona.
// Ejecutar: node scripts/ui.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { createServer } from "vite";

// ---------- Navegador simulado ----------
const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: "http://localhost/", pretendToBeVisual: true });
const w = dom.window;
for (const k of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Element", "Node", "Text", "DocumentFragment", "MutationObserver", "Event", "EventTarget", "CustomEvent", "KeyboardEvent", "MouseEvent", "DOMParser", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "localStorage", "Range", "getSelection", "innerHeight", "innerWidth"])
  Object.defineProperty(globalThis, k, { configurable: true, writable: true, value: typeof w[k] === "function" && /^[a-z]/.test(k) ? w[k].bind(w) : w[k] });
// lo que jsdom no trae y usan la app o el editor
globalThis.matchMedia = w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.CSS = { escape: (s) => s };
w.Element.prototype.scrollIntoView = () => {};
w.Range.prototype.getClientRects = () => [];
w.Range.prototype.getBoundingClientRect = () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 });
w.document.elementFromPoint = () => null;
w.document.fonts = { add() {} };
globalThis.FontFace = class { async load() { return this; } };
globalThis.Worker = class { postMessage() {} terminate() {} };
const red = globalThis.fetch;
globalThis.fetch = async (url, o) => {
  const ruta = String(url).replace(/^\/@fs\//, "").replace(/^\//, "").split("?")[0];
  if (ruta.includes("node_modules")) return new Response(readFileSync(ruta));
  return red(url, o);
};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const errores = [];
const consola = console.error;
console.error = (...a) => { const t = a.map(String).join(" "); if (!/indexedDB|not wrapped in act|IndexedDB/i.test(t)) errores.push(t); };

const vite = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom", logLevel: "error" });
try {
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { act } = React;
  const cargar = (m) => vite.ssrLoadModule(m);
  const { default: App } = await cargar("/src/App.tsx");
  const { Welcome } = await cargar("/src/Welcome.tsx");
  const { saveSettings } = await cargar("/src/settings.ts");
  const tree = await cargar("/src/tree.ts");
  const { catalog } = await cargar("/plugins/index.ts");
  const { loadTool } = await cargar("/src/extTools.ts");

  saveSettings({ lang: "es" });
  const caja = document.getElementById("root");
  const esperar = (ms = 20) => act(() => new Promise((r) => setTimeout(r, ms)));
  const hasta = async (f, que) => { for (let i = 0; i < 150; i++) { const x = f(); if (x) return x; await esperar(); } assert.fail(`no apareció: ${que}\n${caja.textContent.slice(0, 600)}`); };
  const boton = (texto, en = document) => [...en.querySelectorAll("button")].find((b) => b.textContent.trim() === texto || b.getAttribute("aria-label") === texto);
  const pulsar = async (texto, en) => { const b = await hasta(() => boton(texto, en), `botón «${texto}»`); await act(async () => b.click()); await esperar(); };
  const ve = (texto) => hasta(() => caja.textContent.includes(texto), `texto «${texto}»`);

  // Pantalla de inicio
  let root = createRoot(caja);
  await act(async () => root.render(React.createElement(Welcome, { onOpen() {}, update: null, onUpdate() {} })));
  await ve("En blanco");
  await act(async () => root.unmount());

  // La app con un libro de dos capítulos
  let p = tree.newProject("book", "Mi novela", undefined, "es");
  p = { ...p, book: tree.addChild(p.book, p.book.id)[0], cards: [{ id: "a", type: "character", name: "Ana", notes: "" }] };
  p = { ...p, book: tree.update(p.book, p.book.children[0].id, (n) => ({ ...n, content: '<p>—Hola —dijo Ana—.</p><p>Ellos tiene miedo<span data-pie="una%20nota"></span>.</p><table><tbody><tr><td><p>celda</p></td></tr></tbody></table>' })) };
  p.last = p.book.children[0].id;
  root = createRoot(caja);
  await act(async () => root.render(React.createElement(App, { initial: p, handle: null, granted: false, onNew() {}, onClose() {}, update: null, onUpdate() {} })));

  // Recorrido de la primera vez
  await ve("Cuatro modos");
  await pulsar("Saltar");
  assert.ok(!caja.textContent.includes("Cuatro modos"), "el recorrido se cierra");

  // Editor: texto, nota al pie y tabla
  await hasta(() => document.querySelector(".ProseMirror"), "editor");
  assert.ok(document.querySelector('.ProseMirror span[data-pie]'), "la nota al pie se conserva");
  assert.ok(document.querySelector(".ProseMirror table td"), "la tabla se conserva");

  // Vista continua y dividida
  await pulsar("Vista continua");
  await hasta(() => document.querySelectorAll(".continua section").length === 2, "dos capítulos seguidos");
  await pulsar("Vista continua");
  await pulsar("Dividir");
  await hasta(() => document.querySelectorAll(".partida .ProseMirror").length === 2, "dos editores");
  await pulsar("Dividir");

  // Modos y pestañas
  await pulsar("◎ Guía");
  await ve("Siguiente paso");
  await pulsar("Publicar");
  await pulsar("Maquetar");
  await hasta(() => document.querySelector(".pliego .hoja text"), "vista previa maquetada");
  await pulsar("Cubierta");
  await hasta(() => boton("Guardar PDF de cubierta"), "cubierta");
  await pulsar("Editar");
  await pulsar("Cambios");
  await ve("Control de cambios");
  await pulsar("Mesa de edición");
  await ve("Informe editorial");
  await hasta(() => [...document.querySelectorAll(".mesa button")].find((b) => b.textContent.startsWith("Correcciones")), "correcciones");
  await act(async () => [...document.querySelectorAll(".mesa button")].find((b) => b.textContent.startsWith("Correcciones")).click());
  await ve("El sujeto es plural");
  await pulsar("Ellos tienen");
  await hasta(() => !caja.textContent.includes("El sujeto es plural"), "la corrección se aplica");
  await pulsar("Voces");
  await ve("Personaje");

  // Paleta de acciones
  await act(async () => window.dispatchEvent(new w.KeyboardEvent("keydown", { key: "k", ctrlKey: true })));
  await hasta(() => document.querySelector(".paleta"), "paleta");
  await act(async () => document.querySelector(".paleta [role=option]").click());

  // Inglés: pestañas y paneles de plugins
  await act(async () => saveSettings({ lang: "en" }));
  await pulsar("Edit");
  await pulsar("Editing desk");
  await ve("Editorial report");
  await act(async () => root.unmount());

  // Todos los plugins con panel se dibujan en los dos idiomas
  const host = (lang) => ({ project: p, scope: p.book, cards: p.cards, current: p.book.children[0], lang, bookLang: lang, setProject() {}, addCard() {}, patchCard() {}, openCard() {}, openScene() {}, notify() {}, t: (k) => k });
  let paneles = 0;
  for (const lang of ["es", "en"]) {
    await act(async () => saveSettings({ lang }));
    for (const c of catalog.filter((x) => x.code)) {
      const tool = loadTool(c);
      assert.ok(tool, `el plugin ${c.id} carga`);
      if (!tool.Panel) continue;
      const r = createRoot(caja);
      await act(async () => r.render(React.createElement(tool.Panel, { host: host(lang) })));
      assert.ok(caja.textContent.length > 0 || caja.querySelector("svg"), `${c.id} (${lang}) muestra algo`);
      await act(async () => r.unmount());
      paneles++;
    }
  }
  assert.ok(paneles >= 20, `paneles probados: ${paneles}`);
  assert.deepEqual(errores, [], "sin errores en consola");
  console.log(`interfaz ok (${paneles} paneles de plugins)`);
} catch (e) {
  consola(errores.slice(0, 8).join("\n"));
  consola(e);
  process.exitCode = 1;
} finally {
  await vite.close();
  setTimeout(() => process.exit(), 200); // los temporizadores de la app no deben dejar la prueba colgada
}
