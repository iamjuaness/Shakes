// Ejecutar: node src/mapLayout.test.ts
import assert from "node:assert/strict";
import { crosses, curve, layout } from "./mapLayout.ts";

const ids = ["a", "b", "c", "d", "e", "f", "g", "suelta"];
const edges: [string, string][] = [["a", "b"], ["b", "a"], ["b", "c"], ["c", "d"], ["d", "a"], ["e", "f"], ["f", "g"], ["a", "borrada"]];
const p = layout(ids, edges);
assert.equal(p.size, ids.length);
for (const a of ids) for (const b of ids) if (a < b) assert.ok(Math.hypot(p.get(a)!.x - p.get(b)!.x, p.get(a)!.y - p.get(b)!.y) >= 99, `${a} y ${b} se pisan`);
// un ciclo se dibuja sin cruces
assert.ok(!crosses(p.get("a")!, p.get("b")!, p.get("c")!, p.get("d")!) && !crosses(p.get("b")!, p.get("c")!, p.get("d")!, p.get("a")!));
assert.ok(p.get("suelta")!.y > Math.max(...ids.slice(0, 7).map((i) => p.get(i)!.y)));
assert.deepEqual(layout(ids, edges), p); // determinista
assert.equal(layout([], []).size, 0);

// dos relaciones entre la misma pareja (en el mismo sentido o en contrarios) no comparten curva ni etiqueta
for (const b of [{ x: 300, y: 0 }, { x: 0, y: 300 }]) {
  const a = { x: 0, y: 0 };
  const uno = curve(a, b, 0, 2, false, 90, 24)!;
  for (const dos of [curve(a, b, 1, 2, false, 90, 24)!, curve(b, a, 1, 2, true, 90, 24)!]) {
    assert.ok(Math.abs(uno.label.x - dos.label.x) >= 89 || Math.abs(uno.label.y - dos.label.y) >= 17);
  }
}
assert.equal(curve({ x: 0, y: 0 }, { x: 10, y: 0 }, 0, 1, false, 90, 24), null);

console.log("mapLayout ok");
