// Textos de los paneles en el idioma de la interfaz: L("Guardar", "Save"). Se llama al pintar, no al cargar el módulo.
import { getLang } from "../../../src/i18n.ts";

export const enIngles = () => getLang() === "en";
export const L = (es: string, en: string) => (enIngles() ? en : es);
