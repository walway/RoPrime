import { settingsT } from "../core/core.js";

export function t(key) {
  if (typeof key !== "string" || !key) return "";
  return settingsT(key);
}
