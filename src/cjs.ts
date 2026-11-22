// Ejecuta un módulo CommonJS (el .js de un plugin) con un `require` cerrado: solo los módulos que da `mods`.
// Sin imports a propósito, para poder probarlo con node. Test: node src/cjs.test.ts
export function evalCjs(code: string, mods: Record<string, unknown>): Record<string, any> {
  const module = { exports: {} as Record<string, any> };
  const req = (id: string) => {
    if (!Object.prototype.hasOwnProperty.call(mods, id)) throw new Error(`módulo no disponible: ${id}`);
    return mods[id];
  };
  new Function("module", "exports", "require", code)(module, module.exports, req);
  return module.exports;
}
