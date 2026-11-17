// Extensión TipTap que subraya tramos de texto calculados por una función pura (linter, repeticiones...).
import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface Span { from: number; to: number; class: string; title?: string }

export const decorar = (name: string, spans: (text: string, previo: string) => Span[]) =>
  Extension.create({
    name,
    addProseMirrorPlugins() {
      const key = new PluginKey<DecorationSet>(name);
      const build = (doc: PMNode) => {
        const decos: Decoration[] = [];
        let previo = ""; // texto del párrafo anterior: permite detectar repeticiones entre párrafos
        doc.descendants((node, pos) => {
          if (!node.isTextblock) return true;
          const text = node.textBetween(0, node.content.size, undefined, "￼");
          for (const s of spans(text, previo)) decos.push(Decoration.inline(pos + 1 + s.from, pos + 1 + s.to, { class: s.class, ...(s.title ? { title: s.title } : {}) }));
          previo = text;
          return false;
        });
        return DecorationSet.create(doc, decos);
      };
      return [new Plugin({ key, state: { init: (_, s) => build(s.doc), apply: (tr, old) => (tr.docChanged ? build(tr.doc) : old) }, props: { decorations: (s) => key.getState(s) } })];
    },
  });
