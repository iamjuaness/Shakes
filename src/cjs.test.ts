// Ejecutar: node src/cjs.test.ts
import assert from "node:assert/strict";
import { evalCjs } from "./cjs.ts";

const m = evalCjs('const a = require("a"); exports.default = { id: "x", n: a.n + 1 };', { a: { n: 1 } });
assert.deepEqual(m.default, { id: "x", n: 2 });
assert.throws(() => evalCjs('require("fs")', {}), /módulo no disponible: fs/, "solo módulos permitidos");
assert.throws(() => evalCjs('require("toString")', {}), /módulo no disponible/, "sin heredados de Object");
assert.throws(() => evalCjs("syntax error here", {}), "código roto lanza");
console.log("cjs ok");
