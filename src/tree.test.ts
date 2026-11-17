// Ejecutar: node src/tree.test.ts
import assert from "node:assert/strict";
import { TEMPLATES, applyTemplate, dialogueShare, diffVersions, logWords, mentions, replaceAll, search, shift, writtenOn, analyze, chronological, plainText, restore, scenes, snapshot, addChild, countWords, find, move, normalize, remove, sampleBook, toMarkdown, totalWords, update } from "./tree.ts";

const b = sampleBook();
const scene = b.children[0].children[0].children[0];
assert.equal(scene.kind, "scene");

const [b2, none] = addChild(b, scene.id);
assert.equal(none, null, "una escena no tiene hijos");
assert.equal(b2, b);

const b3 = update(b, scene.id, (n) => ({ ...n, content: "<p>Hola mundo</p><p>otra</p>" }));
assert.equal(totalWords(b3), 3);
assert.equal(totalWords(b), 0, "el original no muta");
assert.equal(countWords("<p></p>"), 0);

assert.equal(find(remove(b3, scene.id), scene.id), undefined);
// mover: escena a otro capítulo, y rechazo de mover a un descendiente
const [b4, ch2] = addChild(b, b.children[0].id);
const m = move(b4, scene.id, ch2!.id);
assert.equal(find(m, ch2!.id)!.children[0].id, scene.id);
assert.equal(m.children[0].children[0].children.length, 0, "salió del capítulo original");
assert.equal(move(b4, b4.children[0].id, scene.id), b4, "no entra en su descendiente");
assert.equal(move(b4, scene.id, b4.id), b4, "tipo incompatible");

assert.equal(toMarkdown(update(b, scene.id, (n) => ({ ...n, content: "<p>Hola <strong>mundo</strong></p>" }))).includes("Hola **mundo**"), true);
assert.equal(normalize(b).book, b, "formato v0");
// versiones
const p0 = normalize(b3);
const p1 = snapshot(p0, "v");
const edited = { ...p1, book: update(p1.book, scene.id, (n) => ({ ...n, content: "<p>x</p>" })) };
const back = restore(edited, p1.versions[0].id);
assert.equal(totalWords(back.book), 3, "restaura el texto");
assert.equal(back.versions.length, 2, "guarda el estado previo");

// cronología: sin fecha al final, narrativo estable
const [b5, c3] = addChild(b4, b4.children[0].id);
const [b6, s3] = addChild(b5, c3!.id);
const b7 = update(update(b6, s3!.id, (n) => ({ ...n, date: "2020-01-01" })), scene.id, (n) => ({ ...n, date: "2021-01-01" }));
const order = chronological(scenes(b7)).map((x) => x.scene.id);
assert.deepEqual(order, [s3!.id, scene.id]);

// estilo
const st = analyze("Caminaba lentamente. Caminaba despacio y con calma por el camino largo!");
assert.equal(st.sentences, 2);
assert.equal(st.adverbs, 1);
assert.equal(st.top[0][0], "caminaba");
assert.equal(plainText(update(b, scene.id, (n) => ({ ...n, content: "<p>a</p><p>b</p>" }))).includes("a. "), true);
// copias automáticas: se podan a 20, las manuales se conservan
let pp = snapshot(p0, "manual");
for (let i = 0; i < 25; i++) pp = snapshot(pp, "auto", true);
assert.equal(pp.versions.filter((v) => v.auto).length, 20);
assert.equal(pp.versions.filter((v) => !v.auto).length, 1);
// búsqueda / reemplazo (no toca etiquetas)
const sb = update(b, scene.id, (n) => ({ ...n, content: '<p class="p">Elena y elena</p><p>Elenas no</p>' }));
assert.equal(search(sb, "elena")[0].count, 3);
const [rb, nrep] = replaceAll(sb, "p", "X");
assert.equal(nrep, 0, "la p solo está en etiquetas/atributos");
assert.equal(find(rb, scene.id)!.content!.includes('<p class="p">'), true);
const [rb2, n2] = replaceAll(sb, "Elena", "Ana");
assert.equal(n2, 3);
assert.equal(find(rb2, scene.id)!.content, '<p class="p">Ana y Ana</p><p>Anas no</p>');
assert.equal(mentions(sb, "elena").length, 1, "palabra completa o plural no cuenta como otra escena");
assert.equal(mentions(sb, "Ele").length, 0);

// plantillas
const tb = applyTemplate(b, TEMPLATES[0]);
assert.equal(tb.children.length, b.children.length + 3);
assert.equal(scenes(tb).length, 1 + 8);

// reordenar con teclado
const [b8, ch9] = addChild(b, b.children[0].id);
const sh = shift(b8, ch9!.id, -1);
assert.equal(sh.children[0].children[0].id, ch9!.id);
assert.deepEqual(shift(sh, ch9!.id, -1), sh, "en el borde no cambia");

// diario
let lg = logWords({}, "2026-01-01", 100);
lg = logWords(lg, "2026-01-01", 160);
assert.equal(writtenOn(lg, "2026-01-01"), 60);
assert.equal(logWords(lg, "2026-01-01", 160), lg, "sin cambios, misma referencia");
assert.equal(writtenOn(logWords(lg, "2026-01-01", 50), "2026-01-01"), 0, "borrar no da negativos");

// comparar versiones
const d = diffVersions(b3, sb);
assert.equal(d.changed.length, 1);
assert.equal(d.removed.length, 0);
assert.equal(diffVersions(sb, remove(sb, scene.id)).removed.length, 1);

// estilo: nombres excluidos, diálogo, repetición cercana, legibilidad
const st2 = analyze("Elena miraba la ventana. Elena callaba, la ventana temblaba junto a la ventana.", ["Elena"]);
assert.equal(st2.top.some(([w]) => w === "elena"), false);
assert.equal(st2.near[0][0], "ventana");
assert.equal(st2.readability > 0 && st2.readability < 120, true);
const dl = update(b, scene.id, (n) => ({ ...n, content: "<p>—Hola amigo</p><p>Él sonrió despacio</p>" }));
assert.equal(dialogueShare(dl), 40);
console.log("tree ok");
