// Iconos de la barra de herramientas: trazos SVG en una caja de 24×24, por id de herramienta.
// Un plugin de terceros puede traer el suyo en `ToolPlugin.icon`.
export const TOOL_ICONS: Record<string, string> = {
  "arbol-genealogico": "M9 3h6v5H9zM3 16h6v5H3zM15 16h6v5h-6zM12 8v4M6 16v-4h12v4",
  "arcos-personaje": "M3 20c4 0 5-14 10-14 4 0 5 6 8 6M3 4v16h18",
  borrador: "M4 20l1-4L16 5l3 3L8 19zM14 7l3 3M12 20h8",
  calendario: "M4 5h16v16H4zM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2",
  "dialogo-auto": "M4 4h16v12H10l-5 4v-4H4zM8 10h8",
  "fichas-auto": "M3 5h18v14H3zM8.500 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5.500 16c.5-2 5.500-2 6 0M14 9h4M14 13h4",
  "generador-nombres": "M4 4h16v16H4zM7.500 8.500a1 1 0 1 0 2 0a1 1 0 1 0-2 0M11 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0M14.500 15.500a1 1 0 1 0 2 0a1 1 0 1 0-2 0",
  guion: "M3 10h18v10H3zM3 10l1-5 17 1.500M8 5.500l3 4.500M14 6l3 4",
  idiomas: "M3 5h10M8 3v2M11 5c-1 5-4 8-8 9M5.500 9c1 3 3 4.500 6 5.500M13 21l4-10 4 10M14.500 17.500h5",
  magia: "M4 20l11-11M13 7l4 4M6 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 13l.8 1.700 1.700.8-1.700.8-.8 1.700-.8-1.700-1.700-.8 1.700-.8z",
  inconsistencias: "M12 3l10 18H2zM12 10v5M12 17.500v.500",
  "linter-estilo": "M4 5h16M4 10h10M4 15h7M13 17l3 3 5-6",
  "manuscrito-editorial": "M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h7",
  "mapa-lugares": "M12 21c-4-5-7-8-7-12a7 7 0 0 1 14 0c0 4-3 7-7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  "maquina-escribir": "M7 9V3h10v6M3 9h18v11H3zM6.500 13h1M11.500 13h1M16.500 13h1M8 16.500h8",
  "notas-laterales": "M3 4h18v16H3zM14 4v16M16.500 9h2M16.500 13h2",
  "notas-margen": "M4 4h16v10l-6 6H4zM14 20v-6h6M8 9h8M8 13h3",
  "obsidian-sync": "M12 2l7 7-3 12-8 1-3-9zM12 2l-1 9 5 10M11 11l-6 2",
  repeticiones: "M17 3l4 4-4 4M3 11V9a2 2 0 0 1 2-2h16M7 21l-4-4 4-4M21 13v2a2 2 0 0 1-2 2H3",
  "resumen-escenas": "M3 4h8v7H3zM13 4h8v7h-8zM3 13h8v7H3zM14 15h6M14 18h4",
  "sesion-pomodoro": "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l3 2M9 2h6",
  "taller-creativo": "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.500 11c.5.5.5 1 .5 2h6c0-1 0-1.500.5-2A6 6 0 0 0 12 3z",
  tramas: "M3 6c6 0 6 12 12 12h6M3 18c6 0 6-12 12-12h6M3 12h18",
};

// pieza de puzzle: herramienta sin icono propio
export const GENERIC_ICON = "M4 8h4a2.500 2.500 0 1 1 5 0h4v4a2.500 2.500 0 1 1 0 5v4H4z";
