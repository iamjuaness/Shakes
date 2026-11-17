// Ejecutar: node plugins/herramientas/fichas-auto/detect.test.ts
import assert from "node:assert/strict";
import { candidates, findRefs, prefixAt, suggest } from "./detect.ts";

const cards = [{ id: "1", name: "Elena Marín" }, { id: "2", name: "Elena Soto" }, { id: "3", name: "Madrid" }];

const refs = findRefs("Elena Marín vio Madrid. Madrileño no cuenta.", cards);
assert.deepEqual(refs.map((r) => r.id), ["1", "3"]);
assert.deepEqual(findRefs("nada", []), []);

assert.deepEqual(suggest("Ele", cards).map((c) => c.id), ["1", "2"], "varios parecidos");
assert.deepEqual(suggest("Marín", cards).map((c) => c.id), ["1"], "por apellido, sin acentos");
assert.deepEqual(suggest("E", cards), [], "mínimo 2 letras");
assert.deepEqual(suggest("Elena Marín", cards), [], "ya completo");

assert.deepEqual(prefixAt("Ayer vimos a Elena Ma"), { text: "Elena Ma", start: 13 });
assert.equal(prefixAt("ayer vimos a elena"), null);

const c = candidates("El viento llegó. Ayer Lucas viajó a Toledo y vio a Elena Marín. Pedro Gil rió. Luego, Ana.", cards);
assert.deepEqual(c.map((x) => x.name), ["Lucas", "Toledo", "Pedro Gil", "Ana"]);
assert.equal(c.find((x) => x.name === "Toledo")!.type, "character", "«a Toledo»: sin preposición de lugar");
assert.equal(candidates("Vivía en Sevilla.", [])[0].type, "place");
assert.deepEqual(candidates("Ayer Lucas rió.", [], new Set(["lucas"])), [], "ignorados");
assert.equal(findRefs("Vero llegó; Véronique rió.", [{ id: "v", name: "Véronique Dupont", alias: "Vero, Véronique" }]).length, 2, "apodos");
console.log("ok");
