// Crear proyecto nuevo: carpeta con el nombre del proyecto y, dentro, el archivo .shks. Test: node src/newProject.test.ts
import { newProject } from "./tree.ts";
import type { Project } from "./tree.ts";

// Nombre válido como carpeta/archivo en Windows, macOS y Linux. Vacío = no válido.
export const safeName = (s: string) => s.replace(/[\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "").slice(0, 100);

export async function createProject(title: string, parent: any): Promise<{ project: Project; handle: any } | string> {
  const name = safeName(title);
  if (!name) return "Escribe un nombre para el proyecto.";
  const dir = await parent.getDirectoryHandle(name, { create: true });
  const file = `${name}.shks`;
  try { await dir.getFileHandle(file); return `Ya existe «${name}/${file}» en esa carpeta.`; } catch {} // no existe: bien
  const base = newProject();
  const project: Project = { ...base, book: { ...base.book, title: title.trim() } };
  const handle = await dir.getFileHandle(file, { create: true });
  const w = await handle.createWritable();
  await w.write(JSON.stringify(project));
  await w.close();
  return { project, handle };
}
