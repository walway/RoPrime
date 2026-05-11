import { settingsT } from "./core.js";

/**
 * Optional remap from `data-i18n` / `data-i18n-placeholder` / `data-i18n-aria-label` values to
 * keys in `.locales` translation-keys.json files. Entries are usually identity so the table documents
 * every string used by the account settings markup; the exported t() still resolves unknown attrs via fallback.
 */
export const LOCALE_PHRASE_KEY_BY_I18N = {
    "settings.hero.title": "settings.hero.title",
    "settings.hero.subtitle": "settings.hero.subtitle",
    "settings.search.placeholder": "settings.search.placeholder",
    "settings.nav.sectionsLabel": "settings.nav.sectionsLabel",
    "settings.nav.design": "settings.nav.design",
    "settings.nav.settings": "settings.nav.settings",
    "settings.nav.info": "settings.nav.info",
    "settings.nav.developer": "settings.nav.developer",
    "settings.search.minLength": "settings.search.minLength",
    "settings.search.developerLocked": "settings.search.developerLocked",
    "settings.rename.title": "settings.rename.title",
    "settings.rename.communities": "settings.rename.communities",
    "settings.rename.experiences": "settings.rename.experiences",
    "settings.rename.marketplace": "settings.rename.marketplace",
    "settings.oldNav.title": "settings.oldNav.title",
    "settings.oldNav.desc": "settings.oldNav.desc",
    "settings.sidebar.title": "settings.sidebar.title",
    "settings.sidebar.desc": "settings.sidebar.desc",
    "settings.sidebar.full": "settings.sidebar.full",
    "settings.sidebar.small": "settings.sidebar.small",
    "settings.sidebar.icon": "settings.sidebar.icon",
    "settings.sidebar.alwaysClose.title": "settings.sidebar.alwaysClose.title",
    "settings.sidebar.alwaysClose.desc": "settings.sidebar.alwaysClose.desc",
    "settings.friend.title": "settings.friend.title",
    "settings.friend.desc": "settings.friend.desc",
    "settings.language.title": "settings.language.title",
    "settings.language.desc": "settings.language.desc",
    "settings.language.en": "settings.language.en",
    "settings.language.ru": "settings.language.ru",
    "settings.info.title": "settings.info.title",
    "settings.info.text": "settings.info.text",
    "settings.developer.title": "settings.developer.title",
    "settings.developer.desc": "settings.developer.desc",
};

/**
 * Resolve a data-i18n / data-i18n-placeholder / data-i18n-aria-label attribute value to localized copy.
 * Uses LOCALE_PHRASE_KEY_BY_I18N when present; otherwise passes the attr through to settingsT from core.
 */
export function t(i18nAttr) {
    if (typeof i18nAttr !== "string" || !i18nAttr) return "";
    const phraseKey = LOCALE_PHRASE_KEY_BY_I18N[i18nAttr] ?? i18nAttr;
    return settingsT(phraseKey);
}
