// Almacén del navegador en IndexedDB (sin el tope de ~5 MB de localStorage). Guarda el proyecto y el handle del archivo abierto.
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
    r.onsuccess = () => res(r.result);
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
