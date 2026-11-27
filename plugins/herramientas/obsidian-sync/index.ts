import { mentions } from "../../../src/tree";
import type { ToolPlugin } from "../types";
import { cardToMd, nombreArchivo } from "./obsidian";

export const obsidianSync: ToolPlugin = {
  id: "obsidian-sync",
  name: "Sincronizar con Obsidian",
  actions: [{
    label: "Fichas a Obsidian (carpeta)…",
    exporta: true,
    async run(host) {
      const pick = (window as any).showDirectoryPicker;
      if (!pick) return host.notify("⚠ Este navegador no permite elegir carpetas.");
      try {
        const dir = await pick({ mode: "readwrite" });
        for (const c of host.cards) {
          const f = await (await dir.getFileHandle(nombreArchivo(c.name), { create: true })).createWritable();
          await f.write(cardToMd(c, host.cards, mentions(host.project.book, c.name, c.alias).map((m) => m.scene.title)));
          await f.close();
        }
        host.notify(`${host.cards.length} fichas escritas en «${dir.name}»`);
      } catch { /* el usuario canceló */ }
    },
  }],
};
