// Ejecutar: node src/newProject.test.ts
import assert from "node:assert/strict";
import { createProject, safeName } from "./newProject.ts";

assert.equal(safeName('  Mi: "novela"/1.  '), "Mi novela 1");
assert.equal(safeName("***"), "");

// Sistema de archivos simulado.
const files = new Map<string, string>();
const dirs = new Map<string, any>();
const parent = {
  getDirectoryHandle: async (n: string) => dirs.get(n) ?? (dirs.set(n, {
    getFileHandle: async (f: string, o?: any) => {
      const k = n + "/" + f;
      if (!files.has(k)) { if (!o?.create) throw new Error("NotFound"); files.set(k, ""); }
      return { name: f, createWritable: async () => ({ write: async (t: string) => files.set(k, t), close: async () => {} }) };
    },
  }), dirs.get(n)),
};
const r = await createProject("Mi novela", parent);
assert.ok(typeof r === "object");
assert.equal(JSON.parse(files.get("Mi novela/Mi novela.shks")!).book.title, "Mi novela");
assert.match(String(await createProject("Mi novela", parent)), /Ya existe/);
assert.match(String(await createProject("  ", parent)), /nombre/);
console.log("newProject ok");
