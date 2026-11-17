// Plugins de la app. `catalog` lista todos los manifiestos JSON de estas carpetas (se instalan desde la pestaña Plugins).
// `TOOLS` es el código de las herramientas: un manifiesto con "tool": "<id>" activa la que tenga ese id.
import { Plugin, parsePlugin } from "../src/plugins";
import type { ToolPlugin } from "./herramientas/types";
import { fichasAuto } from "./herramientas/fichas-auto/index";
import { dialogoAuto } from "./herramientas/dialogo-auto/index";
import { repeticionesTool } from "./herramientas/repeticiones/index";
import { linterEstilo } from "./herramientas/linter-estilo/index";
import { notasMargen } from "./herramientas/notas-margen/index";
import { sesionPomodoro } from "./herramientas/sesion-pomodoro/index";
import { maquinaEscribir } from "./herramientas/maquina-escribir/index";
import { inconsistenciasTool } from "./herramientas/inconsistencias/index";
import { arcosPersonaje } from "./herramientas/arcos-personaje/index";
import { mapaLugares } from "./herramientas/mapa-lugares/index";
import { arbolGenealogico } from "./herramientas/arbol-genealogico/index";
import { calendario } from "./herramientas/calendario/index";
import { tramas } from "./herramientas/tramas/index";
import { generadorNombres } from "./herramientas/generador-nombres/index";
import { importar } from "./herramientas/importar/index";
import { exportarExtra } from "./herramientas/exportar-extra/index";
import { manuscritoEditorial } from "./herramientas/manuscrito-editorial/index";
import { obsidianSync } from "./herramientas/obsidian-sync/index";
import { resumenEscenas } from "./herramientas/resumen-escenas/index";
import { notasLaterales } from "./herramientas/notas-laterales/index";
import { ortografiaEs, ortografiaEn } from "./herramientas/ortografia/index";

export const catalog: Plugin[] = Object.values(import.meta.glob("./**/*.json", { eager: true, import: "default" }))
  .map((raw) => parsePlugin(raw))
  .filter((p): p is Plugin => typeof p !== "string");

export const TOOLS: ToolPlugin[] = [
  fichasAuto, dialogoAuto, repeticionesTool, linterEstilo, notasMargen, sesionPomodoro, maquinaEscribir,
  inconsistenciasTool, arcosPersonaje, mapaLugares, arbolGenealogico, calendario, tramas,
  generadorNombres, importar, exportarExtra, manuscritoEditorial, obsidianSync, resumenEscenas, notasLaterales,
  ortografiaEs, ortografiaEn,
];

// Se instalan solos la primera vez que se abre Shakes; el resto lo elige el usuario en la pestaña Plugins.
export const ESSENTIAL = ["fichas-auto", "dialogo-auto", "repeticiones", "notas-margen", "importar", "exportar-extra", "estructura-vogler"];
