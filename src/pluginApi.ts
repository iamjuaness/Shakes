// Contrato de una herramienta (plugin con código); lo define el núcleo (src) y los plugins lo importan vía plugins/herramientas/types.ts.
// Cada una vive en herramientas/<id>/ con su plugin.json,
// que se instala desde la pestaña Plugins (campo "tool": "<id>"). Los plugins sin código (temas, estructuras) son solo JSON.
import type { ComponentType } from "react";
import type { AnyExtension, Editor } from "@tiptap/react";
import type { Card, Node, Project } from "./tree";

export interface ToolHost {
  project: Project;
  scope: Node; // lo que se está exportando/mirando: el libro actual de una saga, o la raíz entera
  cards: Card[];
  setProject: (f: (p: Project) => Project) => void;
  addCard: (c: Card) => void;
  patchCard: (id: string, patch: Partial<Card>) => void;
  openCard: (id: string) => void; // abre la ficha completa en la pestaña Fichas
  openScene: (id: string) => void;
  notify: (msg: string) => void; // mensaje en la barra de estado
  t: (key: string, vars?: Record<string, string | number>) => string; // textos de la interfaz en el idioma activo (p. ej. «type.character»)
  lang: "es" | "en"; // idioma de la interfaz
  bookLang: string; // idioma en que está escrita la obra (BCP 47: "es", "fr", "pt-PT"…)
  current?: Node; // lo que está abierto en el editor
}
export interface ToolPlugin {
  id: string;
  name: string;
  extensions?: (host: () => ToolHost) => AnyExtension[]; // se añaden al editor al abrir la escena
  refresh?: (editor: Editor) => void; // el host lo llama cuando cambian las fichas
  Overlay?: ComponentType<{ editor: Editor; host: ToolHost }>; // UI junto al editor (paneles, modales, listas)
  Panel?: ComponentType<{ host: ToolHost }>; // pestaña propia (con el nombre de la herramienta)
  // `exporta`: la acción sale en Archivo › Exportar a; las demás, en el menú de la herramienta en la barra derecha.
  actions?: { label: string; exporta?: boolean; run: (host: ToolHost) => unknown }[];
  icon?: string; // trazo SVG en una caja de 24×24 para la barra derecha (si falta, uno genérico)
}
