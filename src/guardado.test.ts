import assert from "node:assert/strict";
import { copiaEn, guardador, nombreCopia } from "./guardado.ts";
import { newProject } from "./tree.ts";

const disco = () => {
  const a = { texto: "", m: 100 };
  const h = {
    getFile: async () => ({ lastModified: a.m }),
    createWritable: async () => { let t = ""; return { write: async (x: string) => { t += x; }, close: async () => { a.texto = t; a.m++; } }; },
  };
  return { a, h };
};
const p = newProject("book", "Mi: libro", undefined, "es");

const { a, h } = disco();
const anotadas: unknown[] = [];
const g = guardador(h, undefined, (m) => anotadas.push(m));
// dos escrituras seguidas no se ven una a otra como cambio externo
assert.deepEqual(await Promise.all([g.guardar(p), g.guardar(p)]), [true, true]);
assert.deepEqual(anotadas, [101, 102]);
a.m = 500; a.texto = "otro equipo";
assert.equal(await g.guardar(p), false, "cambió fuera: no se pisa");
assert.equal(a.texto, "otro equipo");
assert.equal(await g.guardar(p, true), true);
assert.equal(await g.guardar(p), true, "tras forzar vuelve a la normalidad");

// al reabrir la app: la fecha de la sesión anterior no coincide
const d2 = disco();
assert.equal(await guardador(d2.h, Promise.resolve(7)).guardar(p), false);

assert.equal(nombreCopia("Mi: libro", "2026-11-27"), "Mi libro 2026-11-27.shks");
const escritos = new Map<string, ReturnType<typeof disco>>();
const dir = { getFileHandle: async (n: string) => { if (!escritos.has(n)) escritos.set(n, disco()); return escritos.get(n)!.h; } };
await copiaEn(dir, p, "2026-11-27");
await copiaEn(dir, p, "2026-11-27");
assert.equal(escritos.size, 1);
assert.match(escritos.get("Mi libro 2026-11-27.shks")!.a.texto, /"title":"Mi: libro"/);
console.log("guardado ok");
