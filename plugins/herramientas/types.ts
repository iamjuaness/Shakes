// Contrato de una herramienta (plugin con código). Cada una vive en herramientas/<id>/ con su plugin.json,
// que se instala desde la pestaña Plugins (campo "tool": "<id>"). Los plugins sin código (temas, estructuras) son solo JSON.
import type { ComponentType } from "react";
import type { AnyExtension, Editor } from "@tiptap/react";
import type { Card, Project } from "../../src/tree";

export interface ToolHost {
  project: Project;
  cards: Card[];
  setProject: (f: (p: Project) => Project) => void;
  addCard: (c: Card) => void;
  patchCard: (id: string, patch: Partial<Card>) => void;
  openCard: (id: string) => void; // abre la ficha completa en la pestaña Fichas
  openScene: (id: string) => void;
  notify: (msg: string) => void; // mensaje en la barra de estado
}
export interface ToolPlugin {
  id: string;
  name: string;
  extensions?: (host: () => ToolHost) => AnyExtension[]; // se añaden al editor al abrir la escena
  refresh?: (editor: Editor) => void; // el host lo llama cuando cambian las fichas
  Overlay?: ComponentType<{ editor: Editor; host: ToolHost }>; // UI junto al editor (paneles, modales, listas)
  Panel?: ComponentType<{ host: ToolHost }>; // pestaña propia (con el nombre de la herramienta)
  actions?: { label: string; run: (host: ToolHost) => void | Promise<void> }[]; // botones del menú «Herramientas» de la cinta
}
