import { settingsState } from "./core.js";

/** @type {Record<string, string>} */
let mergedMessages = {};

function normalizeLocale(raw) {
    const s = String(raw || "en").toLowerCase();
    if (s === "ru") return "ru";
    if (s === "bn") return "bn";
    return "en";
}

function fetchLocaleJson(path) {
    if (typeof chrome === "undefined" || typeof chrome.runtime?.getURL !== "function") {
        return Promise.reject(new Error("no extension runtime"));
    }
    return fetch(chrome.runtime.getURL(path));
}

/**
 * Loads English plus the active locale and merges (current overrides English).
 */
async function buildMerged(language) {
    const enRes = await fetchLocaleJson(".locales/en/translation-keys.json");
    if (!enRes.ok) throw new Error(`locales en: ${enRes.status}`);
    /** @type {Record<string, string>} */
    const en = await enRes.json();
    const loc = normalizeLocale(language);
    if (loc === "en") return { ...en };
    const curRes = await fetchLocaleJson(`.locales/${loc}/translation-keys.json`);
    if (!curRes.ok) throw new Error(`locales ${loc}: ${curRes.status}`);
    const cur = await curRes.json();
    return { ...en, ...cur };
}

export async function initLocaleMessages() {
    mergedMessages = await buildMerged(settingsState.language);
}

export async function reloadLocaleMessages() {
    mergedMessages = await buildMerged(settingsState.language);
}

/** @param {string} key */
export function t(key) {
    const v = mergedMessages[key];
    if (typeof v === "string" && v.length > 0) return v;
    return key;
}
