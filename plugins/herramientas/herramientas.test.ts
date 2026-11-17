// Ejecutar: node plugins/herramientas/herramientas.test.ts  (lógica pura de las herramientas; fichas-auto tiene su propio test)
import assert from "node:assert/strict";
import { tipografia } from "./dialogo-auto/tipografia.ts";
import { lint } from "./linter-estilo/reglas.ts";
import { muletillas, repeticiones } from "./repeticiones/reglas.ts";
import { inconsistencias } from "./inconsistencias/reglas.ts";
import { familia } from "./arbol-genealogico/familia.ts";
import { docxBloques, estructura, mdBloques } from "./importar/importar.ts";
import { toFountain, toLatex } from "./exportar-extra/formatos.ts";
import { editorial } from "./manuscrito-editorial/editorial.ts";
import { generar } from "./generador-nombres/nombres.ts";
import { cardToMd, nombreArchivo } from "./obsidian-sync/obsidian.ts";
import { resumir } from "./resumen-escenas/resumen.ts";

// diálogo
assert.deepEqual(tipografia("", '"'), { borrar: 0, texto: "«" });
assert.deepEqual(tipografia("dijo «hola", '"'), { borrar: 0, texto: "»" });
assert.deepEqual(tipografia("a -", "-"), { borrar: 1, texto: "—" });
assert.equal(tipografia("hola", "x"), null);

// linter
const tipos = (t: string) => lint(t).map((x) => x.tipo).sort();
assert.deepEqual(tipos("Caminó lentamente. Fue robada por todos."), ["adverbio", "pasiva"]);
assert.ok(lint(Array(45).fill("palabra").join(" ") + ".").some((t) => t.tipo === "larga"));
// adverbios: sí en -mente reales, no en palabras que solo terminan igual
assert.deepEqual(tipos("Habló rápidamente y felizmente."), ["adverbio", "adverbio"]);
assert.deepEqual(tipos("Su mente era vehemente. Que no se aumente."), []);
// pasiva: hecho -> siempre; estado (es/era) solo con «por»
assert.deepEqual(tipos("La puerta fue abierta."), ["pasiva"]);
assert.deepEqual(tipos("Era un hombre cansado y estaba aburrido. Es sabido."), [], "adjetivos no son pasiva");
assert.deepEqual(tipos("El ladrón era perseguido por la policía."), ["pasiva"]);
assert.deepEqual(tipos("Fue escrita por ella y también fue hecha."), ["pasiva", "pasiva"]);
assert.deepEqual(tipos("Siempre había sido tranquila."), []);
// gramática
assert.deepEqual(tipos("Pienso de que vendrá."), ["gramatica"]);
assert.deepEqual(tipos("Me di cuenta que mentía."), ["gramatica"]);
assert.deepEqual(tipos("Quiso subir arriba."), ["gramatica"]);
assert.deepEqual(tipos("Pienso que vendrá."), []);
// tipografía
assert.deepEqual(tipos("Hola  mundo ."), ["tipografia", "tipografia"]);
assert.deepEqual(tipos("Espera... ¿sí?"), [], "los tres puntos están bien");
// inicios repetidos
assert.deepEqual(tipos("Él llegó. Él miró. Él calló. Ella rió."), ["inicio"]);
assert.deepEqual(tipos("Él llegó. Él miró. Ella calló."), []);

// repeticiones
const r = repeticiones("Dijo algo grande y luego dijo otra cosa.");
assert.deepEqual(r.map((x) => x.palabra), ["dijo"]);
assert.ok(r[0].sugerencias.length > 0 && r[0].distancia > 0);
assert.deepEqual(repeticiones("casa " + "x ".repeat(30) + "casa"), [], "fuera de ventana");
assert.deepEqual(repeticiones("La puerta crujió y otra puerta más lejos.").map((x) => x.palabra), ["puerta"]);
assert.deepEqual(repeticiones("Los zapatos y el zapato").map((x) => x.palabra), ["zapato"], "plural = singular");
assert.deepEqual(repeticiones("Vio a Marcos. Luego Marcos rió.").map((x) => x.palabra), [], "nombre propio a mitad de frase");
assert.deepEqual(repeticiones("la puerta cruje", "otra puerta cerrada").map((x) => x.palabra), ["puerta"], "entre párrafos");
assert.deepEqual(repeticiones("era un hombre que era alto y estaba cerca").map((x) => x.palabra), [], "auxiliares ignorados");
assert.deepEqual(muletillas("Es, o sea, básicamente un problema.").map((m) => m.frase), ["o sea", "básicamente"]);

// inconsistencias
const cards = [{ id: "1", name: "Elena", notes: "Ojos azules. Tiene 30 años." }];
const sc = [{ id: "s", title: "Uno", text: "Elena abrió sus ojos verdes. Más tarde Elena, de 30 años, rió." }];
assert.deepEqual(inconsistencias(cards, sc).map((i) => [i.attr, i.escena]), [["ojos", "verdes"]]);

// genealogía
const f = familia([{ from: "a", to: "b", label: "padre de" }, { from: "c", to: "b", label: "madre de" }, { from: "d", to: "b", label: "hijo de" }, { from: "a", to: "c", label: "esposo de" }]);
assert.deepEqual([f.gen.get("a"), f.gen.get("c"), f.gen.get("b"), f.gen.get("d")], [0, 0, 1, 2], "pareja misma generación; «d hijo de b» queda bajo b");

// importar
const md = "Intro suelta\n\n# Alfa\n\nTexto **fuerte** y *suave*.\n\n## Beta\nOtra";
const imp = estructura(mdBloques(md), "x.md");
assert.deepEqual(imp.map((e) => [e.tipo, e.titulo]), [["scene", "x.md"], ["chapter", "Alfa"]], "2 niveles = capítulos y escenas");
assert.deepEqual(imp[1].hijos.map((e) => e.titulo), ["Escena 1", "Beta"], "texto del capítulo -> Escena 1, luego Beta");
assert.ok(imp[1].html === "" && imp[1].hijos[1].tipo === "scene");
const solo = estructura(mdBloques("# Uno\n\nHola **fuerte**\n\n# Dos\n\nAdios"), "x");
assert.deepEqual(solo.map((e) => [e.tipo, e.titulo, e.hijos[0].tipo, e.hijos[0].html.includes("<p>")]), [["chapter", "Uno", "scene", true], ["chapter", "Dos", "scene", true]], "solo capítulos: sin partes");
const tres = estructura(mdBloques("# L1\n## C1\n### E1\ntexto\n### E2\notro\n## C2\n### E3\nx\n# L2\n## C3\n### E4\ny"), "x");
assert.deepEqual(tres.map((p) => [p.tipo, p.hijos.map((c) => c.hijos.length)]), [["part", [2, 1]], ["part", [1]]]);
const kw = estructura(mdBloques("# Capítulo 1\n\n## Escena 1\nhola\n# Capítulo 2\ntexto suelto"), "x");
assert.deepEqual(kw.map((c) => [c.tipo, c.hijos.map((e) => e.titulo)]), [["chapter", ["Escena 1"]], ["chapter", ["Escena 1"]]], "palabras clave y texto suelto en capítulo -> Escena 1");
assert.deepEqual(docxBloques('<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Cap &amp; 1</w:t></w:r></w:p><w:p><w:r><w:t>Hola</w:t></w:r><w:r><w:t> mundo</w:t></w:r></w:p>'), [{ h: true, n: 1, t: "Cap & 1" }, { h: false, t: "Hola mundo" }]);

// formatos
const book: any = { id: "b", kind: "book", title: "Mi_libro & Co", children: [{ id: "p", kind: "part", title: "P1", children: [{ id: "c", kind: "chapter", title: "C1", children: [{ id: "s", kind: "scene", title: "Esc", content: "<p>Hola 50% listo.</p>", children: [] }] }] }] };
assert.ok(toFountain(book).includes(".ESC"));
assert.ok(toLatex(book).includes(String.raw`50\% listo`) && toLatex(book).includes(String.raw`Mi\_libro \& Co`));
const ed = editorial(book, "Ana Pérez");
assert.ok(ed.includes("Pérez / MI_LIBRO") && ed.includes("aprox. 100 palabras"));

// nombres
const n = generar("Nórdica", 5);
assert.equal(n.length, 5);
assert.equal(new Set(n).size, 5);
assert.deepEqual(generar("Marciana", 3), []);

// obsidian
assert.equal(nombreArchivo("A/B: C"), "A-B- C.md");
const md2 = cardToMd({ id: "1", type: "Personaje", name: "Elena", notes: "Hola", links: [{ to: "2", label: "hermana de" }] }, [{ id: "2", type: "Personaje", name: "Rosa", notes: "" } as any], ["Esc 1"]);
assert.ok(md2.includes("hermana de: [[Rosa]]") && md2.includes("- Esc 1") && md2.startsWith("---"));

// resumen
assert.equal(resumir("Uno. Dos. Tres."), "Uno. Dos.");
assert.ok(resumir("x".repeat(500)).length <= 200);
console.log("herramientas ok");
