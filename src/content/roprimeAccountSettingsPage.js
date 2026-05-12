import { settingsT } from "./core.js";

/**
 * Resolves `data-i18n` / `data-i18n-placeholder` / `data-i18n-aria-label` values to copy from
 * `.locales` translation-keys.json files (phrase keys, no dots).
 */
export function t(key) {
    if (typeof key !== "string" || !key) return "";
    return settingsT(key);
}
