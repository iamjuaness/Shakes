// Crear proyecto nuevo: carpeta con el nombre del proyecto y, dentro, el archivo .shks. Test: node src/newProject.test.ts
import { newProject } from "./tree.ts";
import type { Project, Template, Tipo } from "./tree.ts";

// Nombre válido como carpeta/archivo en Windows, macOS y Linux. Vacío = no válido.
export const safeName = (s: string) => s.replace(/[\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "").slice(0, 100);

// `enCarpeta`: el .shks se crea directamente en `parent`, sin subcarpeta nueva.
export async function createProject(title: string, parent: any, tipo: Tipo = "book", tpl?: Template, enCarpeta = false): Promise<{ project: Project; handle: any } | string> {
  const name = safeName(title);
  if (!name) return "Escribe un nombre para el proyecto.";
  const dir = enCarpeta ? parent : await parent.getDirectoryHandle(name, { create: true });
  const file = `${name}.shks`;
  try { await dir.getFileHandle(file); return `Ya existe «${enCarpeta ? "" : name + "/"}${file}» en esa carpeta.`; } catch {} // no existe: bien
  const project: Project = newProject(tipo, title.trim(), tpl);
  const handle = await dir.getFileHandle(file, { create: true });
  const w = await handle.createWritable();
  await w.write(JSON.stringify(project));
  await w.close();
  return { project, handle };
}
