// Almacén del navegador en IndexedDB (sin el tope de ~5 MB de localStorage). Guarda el proyecto y el handle del archivo abierto.
import { revivir } from "./tauriFs";
const open = () =>
  new Promise<IDBDatabase>((res, rej) => {
    const r = indexedDB.open("shakes", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await open();
  return new Promise((res, rej) => {
    const r = db.transaction("kv").objectStore("kv").get(key);
    r.onsuccess = () => res(revivir(r.result)); // handles de escritorio guardados como datos -> vivos
    r.onerror = () => rej(r.error);
  });
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction("kv", "readwrite");
    t.objectStore("kv").put(value, key);
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}

// Proyectos recientes: nombre + handle del archivo (para reabrirlos desde la pantalla de inicio). Máx. 8, el último primero.
export interface Recent { name: string; handle: any; at: number }
export const recentList = async (): Promise<Recent[]> => (await idbGet<Recent[]>("recent").catch(() => undefined)) ?? [];
export async function recentAdd(handle: any): Promise<void> {
  if (!handle?.name) return; // sin handle (descarga) no se puede reabrir
  const keep: Recent[] = [];
  for (const r of await recentList()) if (!(await r.handle.isSameEntry?.(handle).catch(() => false))) keep.push(r);
  await idbSet("recent", [{ name: handle.name, handle, at: Date.now() }, ...keep].slice(0, 8)).catch(() => {});
}
export const recentRemove = async (r: Recent) => idbSet("recent", (await recentList()).filter((x) => x.name !== r.name || x.at !== r.at)).catch(() => {});
