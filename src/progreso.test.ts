import assert from "node:assert/strict";
import { modoDe, pasos, siguiente } from "./progreso.ts";
import { addChild, newProject, update } from "./tree.ts";

let p = newProject("book", "Mi libro", undefined, "es");
assert.equal(siguiente(pasos(p, p.book))!.id, "datos");
p = { ...p, book: { ...p.book, meta: { author: "Ana" } }, cards: [{ id: "a", type: "character", name: "Ana", notes: "" }] };
assert.equal(siguiente(pasos(p, p.book))!.id, "estructura");
while (p.book.children.length < 3) p = { ...p, book: addChild(p.book, p.book.id)[0] };
assert.equal(siguiente(pasos(p, p.book))!.id, "escribir");
p = { ...p, goal: 3, book: update(p.book, p.book.children[0].id, (n) => ({ ...n, content: "<p>una dos tres</p>" })) };
const revisar = siguiente(pasos(p, p.book))!;
assert.deepEqual([revisar.id, revisar.n, revisar.de], ["revisar", 0, 3]);
p = { ...p, book: { ...p.book, children: p.book.children.map((c) => ({ ...c, status: "final" as const })) }, ext: { maqueta: { [p.book.id]: {} }, publicacion: { [p.book.id]: {} } } };
assert.equal(siguiente(pasos(p, p.book)), undefined);
assert.equal(modoDe("layout"), "publicar");
assert.equal(modoDe("plugins"), undefined);
console.log("progreso ok");
