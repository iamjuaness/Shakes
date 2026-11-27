// Escritorio (Tauri): sustituye la File System Access API del WebView por diálogos y archivos nativos. En el WebView
// esa API pedía permisos con aspecto de web («este sitio podrá…», «localhost») y abría los diálogos minimizados.
// Imita lo justo de la API (showOpenFilePicker, showSaveFilePicker, showDirectoryPicker y los handles), así App,
// Welcome y los plugins funcionan igual en el navegador y en escritorio. Los handles se guardan en IndexedDB como
// datos ({__tauri, path}) y `revivir` los reconstruye al leerlos.
import { open, save } from "@tauri-apps/plugin-dialog";
import { exists, mkdir, readDir, readFile, readTextFile, stat, writeFile, writeTextFile } from "@tauri-apps/plugin-fs";

export const enTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const nombre = (p: string) => p.split(/[\\/]/).pop() ?? p;
const unir = (dir: string, n: string) => dir.replace(/[\\/]+$/, "") + (dir.includes("\\") ? "\\" : "/") + n;
const abortar = () => new DOMException("Cancelado", "AbortError");
const noExiste = (n: string) => new DOMException(`No existe «${n}»`, "NotFoundError");

class ArchivoNativo {
  __tauri = "file" as const;
  kind = "file" as const;
  path: string;
  name: string;
  constructor(path: string) { this.path = path; this.name = nombre(path); }
  async getFile() {
    const p = this.path, name = this.name;
    const lastModified = await stat(p).then((i) => i.mtime?.getTime(), () => undefined); // para detectar cambios externos
    return { name, lastModified, text: () => readTextFile(p), arrayBuffer: async () => (await readFile(p)).buffer };
  }
  // Acumula lo escrito y lo vuelca al cerrar (texto o bytes, como un FileSystemWritableFileStream).
  async createWritable() {
    const partes: unknown[] = [];
    const p = this.path;
    return {
      write: async (d: unknown) => { partes.push(d); },
      close: async () => {
        if (partes.every((x) => typeof x === "string")) return writeTextFile(p, partes.join(""));
        const bufs = await Promise.all(partes.map((x) => new Blob([x as BlobPart]).arrayBuffer()));
        const out = new Uint8Array(bufs.reduce((n, b) => n + b.byteLength, 0));
        let i = 0;
        for (const b of bufs) { out.set(new Uint8Array(b), i); i += b.byteLength; }
        return writeFile(p, out);
      },
    };
  }
  async queryPermission() { return "granted"; } // el alcance lo da el diálogo (y persisted-scope lo recuerda)
  async requestPermission() { return "granted"; }
  async isSameEntry(o: { path?: string }) { return o?.path === this.path; }
}

class CarpetaNativa {
  __tauri = "dir" as const;
  kind = "directory" as const;
  path: string;
  name: string;
  constructor(path: string) { this.path = path; this.name = nombre(path); }
  async getDirectoryHandle(n: string, o?: { create?: boolean }) {
    const p = unir(this.path, n);
    if (!(await exists(p))) { if (!o?.create) throw noExiste(n); await mkdir(p, { recursive: true }); }
    return new CarpetaNativa(p);
  }
  async getFileHandle(n: string, o?: { create?: boolean }) {
    const p = unir(this.path, n);
    if (!(await exists(p))) { if (!o?.create) throw noExiste(n); await writeTextFile(p, ""); }
    return new ArchivoNativo(p);
  }
  async *values() {
    for (const e of await readDir(this.path)) yield e.isDirectory ? new CarpetaNativa(unir(this.path, e.name)) : new ArchivoNativo(unir(this.path, e.name));
  }
  async queryPermission() { return "granted"; }
  async requestPermission() { return "granted"; }
  async isSameEntry(o: { path?: string }) { return o?.path === this.path; }
}

// Handles guardados como datos (IndexedDB no clona métodos) -> objetos vivos. Recorre arrays y objetos hasta 2 niveles.
export function revivir<T>(v: T, prof = 0): T {
  if (!v || typeof v !== "object" || prof > 2) return v;
  const o = v as any;
  if (o.__tauri === "file") return new ArchivoNativo(o.path) as T;
  if (o.__tauri === "dir") return new CarpetaNativa(o.path) as T;
  if (Array.isArray(o)) return o.map((x) => revivir(x, prof + 1)) as T;
  if (Object.getPrototypeOf(o) !== Object.prototype) return v; // handles del navegador, Blob, etc.: tal cual
  return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, revivir(x, prof + 1)])) as T;
}

type Tipos = { description?: string; accept?: Record<string, string[]> }[];
const filtros = (types?: Tipos) => (types ?? []).map((t) => ({ name: t.description ?? "", extensions: Object.values(t.accept ?? {}).flat().map((e) => e.replace(/^\./, "")) }));
const inicio = (startIn: unknown) => (startIn && typeof startIn === "object" && "path" in startIn ? String((startIn as any).path) : undefined);

export function instalarArchivosNativos() {
  const w = window as any;
  w.showOpenFilePicker = async (o?: { types?: Tipos; startIn?: unknown }) => {
    const p = await open({ multiple: false, directory: false, filters: filtros(o?.types), defaultPath: inicio(o?.startIn) });
    if (!p || Array.isArray(p)) throw abortar();
    return [new ArchivoNativo(p)];
  };
  w.showSaveFilePicker = async (o?: { types?: Tipos; suggestedName?: string; startIn?: unknown }) => {
    const dir = inicio(o?.startIn);
    const p = await save({ filters: filtros(o?.types), defaultPath: dir && o?.suggestedName ? unir(dir, o.suggestedName) : o?.suggestedName });
    if (!p) throw abortar();
    return new ArchivoNativo(p);
  };
  w.showDirectoryPicker = async (o?: { startIn?: unknown }) => {
    // recursive: la carpeta elegida y todo lo que haya dentro quedan permitidos (crear la subcarpeta del proyecto, su .shks…).
    const p = await open({ directory: true, multiple: false, recursive: true, defaultPath: inicio(o?.startIn) });
    if (!p || Array.isArray(p)) throw abortar();
    return new CarpetaNativa(p);
  };
}
