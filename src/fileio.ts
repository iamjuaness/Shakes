// Entrada/salida de archivos de proyecto (.shks) con File System Access API y respaldo por <input>/descarga.
// Un solo sitio para abrir, leer y escribir: lo usan App y Welcome.
import { Project, normalize } from "./tree";

const w = window as any;
export const OPEN_TYPES = [{ description: "Proyecto Shakes", accept: { "application/json": [".shks", ".shakes"] } }]; // .shakes: extensión antigua, aún se abre
export const SAVE_TYPES = [{ description: "Proyecto Shakes", accept: { "application/json": [".shks"] } }];
export const canPick = () => !!w.showOpenFilePicker;
export const canSavePick = () => !!w.showSaveFilePicker;
export const canPickDir = () => !!w.showDirectoryPicker;

export function saveBlob(name: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const isAbort = (e: any) => e?.name === "AbortError";
export const readProject = async (file: File): Promise<Project> => normalize(JSON.parse(await file.text()));
export const readHandle = async (h: any): Promise<Project> => readProject(await h.getFile());

export async function writeProject(handle: any, project: Project): Promise<void> {
  const f = await handle.createWritable();
  await f.write(JSON.stringify(project));
  await f.close();
}

// Guardar como… con selector; sin File System Access API descarga el .shks y devuelve handle null.
export async function saveProjectAs(project: Project, suggested: string): Promise<{ handle: any | null } | null> {
  if (!canSavePick()) { saveBlob(`${suggested}.shks`, new Blob([JSON.stringify(project)], { type: "application/json" })); return { handle: null }; }
  try { return { handle: await w.showSaveFilePicker({ types: SAVE_TYPES, suggestedName: `${suggested}.shks` }) }; }
  catch (e) { if (isAbort(e)) return null; throw e; }
}

export interface Opened { project: Project; handle: any | null; name: string }

// Abrir…: null si se cancela; lanza si el archivo no es válido.
export async function pickProject(): Promise<Opened | null> {
  if (canPick()) {
    try {
      const [h] = await w.showOpenFilePicker({ types: OPEN_TYPES });
      return { project: await readHandle(h), handle: h, name: h.name };
    } catch (e) { if (isAbort(e)) return null; throw e; }
  }
  return new Promise((res, rej) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".shks,.shakes,.json";
    input.oncancel = () => res(null);
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return res(null);
      try { res({ project: await readProject(f), handle: null, name: f.name }); } catch (e) { rej(e); }
    };
    input.click();
  });
}
