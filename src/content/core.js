export const RP_TAB_ID = "roprime-settings-tab";
export const RP_PANEL_CLASS = "roprime-settings-wrapper";
export const RP_PANE_ID = "roprime-settings-pane";
export const RP_STANDALONE_ID = "roprime-standalone-settings";
export const RP_SMALL_NEW_NAV_STYLE_ID = "roprime-small-new-nav-style";
export const RP_SIDEBAR_COMPACT_STYLE_ID = "roprime-sidebar-compact-style";
export const RP_FRIEND_STYLING_REIMAGNED_STYLE_ID = "roprime-friend-styling-reimagned-style";
export const RP_ALWAYS_SHOW_CLOSE_STYLE_ID = "roprime-always-show-close-style";
export const RP_RUNTIME_STYLE_ID = "roprime-runtime-style";
export const RP_PARAM_KEY = "roprime";
export const RP_DEFAULT_PAGE = "design";
export const RP_SUPPORTED_PAGES = new Set(["design", "settings", "info", "developer"]);
export const RP_SETTINGS_KEY = "rpSettings";

function normalizeBlockedExecutionPages(value) {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    return value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean)
        .filter((entry) => {
            const key = entry.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

export const RP_DEFAULT_SETTINGS = {
    language: "en",
    renameDropdownEnabled: true,
    renameDropdownRestore: {
        renameCommunitiesToGroups: true,
        renameExperiencesToGames: true,
        renameMarketplaceToAvatarShop: true,
    },
    oldNavigationBarEnabled: false,
    smallNewNavigationBarEnabled: false,
    sidebarIconsOnlyEnabled: false,
    alwaysShowCloseButtonEnabled: false,
    friendStylingReimagnedEnabled: false,
    developerPageUnlocked: false,
    blockedExecutionPages: [],
};

export let isSyncing = false;
export let syncIntervalId = null;
export let renameIntervalId = null;
export const settingsState = { ...RP_DEFAULT_SETTINGS };

export function setIsSyncing(value) {
    isSyncing = value;
}

export function setSyncIntervalId(value) {
    syncIntervalId = value;
}

export function setRenameIntervalId(value) {
    renameIntervalId = value;
}

export function getStorageApi() {
    return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local
        ? chrome.storage.local
        : null;
}

export function loadSettings() {
    const storage = getStorageApi();
    if (!storage) return Promise.resolve();

    return new Promise((resolve) => {
        storage.get([RP_SETTINGS_KEY], (result) => {
            const stored = result?.[RP_SETTINGS_KEY];
            if (stored && typeof stored === "object") {
                Object.assign(settingsState, RP_DEFAULT_SETTINGS, stored);
                settingsState.blockedExecutionPages = normalizeBlockedExecutionPages(stored.blockedExecutionPages);
                settingsState.developerPageUnlocked = !!stored.developerPageUnlocked;
                if (stored.oldNavigationBarEnabled === undefined) {
                    if (stored.classicLeftNavEnabled != null) {
                        settingsState.oldNavigationBarEnabled = !!stored.classicLeftNavEnabled;
                    } else if (stored.leftGrayFrameEnabled != null) {
                        settingsState.oldNavigationBarEnabled = !!stored.leftGrayFrameEnabled;
                    }
                }
                delete settingsState.classicLeftNavEnabled;
                delete settingsState.leftGrayFrameEnabled;
            }
            resolve();
        });
    });
}

export function saveSettings() {
    const storage = getStorageApi();
    if (!storage) return;

    storage.set({
        [RP_SETTINGS_KEY]: {
            renameDropdownEnabled: settingsState.renameDropdownEnabled,
            renameDropdownRestore: settingsState.renameDropdownRestore,
            language: settingsState.language,
            renameCommunitiesToGroups: settingsState.renameCommunitiesToGroups,
            renameExperiencesToGames: settingsState.renameExperiencesToGames,
            renameMarketplaceToAvatarShop: settingsState.renameMarketplaceToAvatarShop,
            oldNavigationBarEnabled: settingsState.oldNavigationBarEnabled,
            smallNewNavigationBarEnabled: settingsState.smallNewNavigationBarEnabled,
            sidebarIconsOnlyEnabled: settingsState.sidebarIconsOnlyEnabled,
            alwaysShowCloseButtonEnabled: settingsState.alwaysShowCloseButtonEnabled,
            friendStylingReimagnedEnabled: settingsState.friendStylingReimagnedEnabled,
            developerPageUnlocked: !!settingsState.developerPageUnlocked,
            blockedExecutionPages: normalizeBlockedExecutionPages(settingsState.blockedExecutionPages),
        },
    });
}

export function isAccountPage() {
    const path = window.location.pathname;
    return /^\/(?:[a-z]{2,3}(?:-[a-z0-9]{2,8})?\/)?my\/account(?:\/|$)/i.test(path);
}

export function isPluginRoute() {
    const params = new URLSearchParams(window.location.search);
    const route = (params.get(RP_PARAM_KEY) || "").toLowerCase();
    return RP_SUPPORTED_PAGES.has(route);
}

export function isForeignAccountPluginRoute() {
    if (!isAccountPage()) return false;
    const params = new URLSearchParams(window.location.search);
    if (params.has(RP_PARAM_KEY)) return !isPluginRoute();
    return Array.from(params.keys()).length > 0;
}

export function isCurrentPageBlockedByUser() {
    const rules = normalizeBlockedExecutionPages(settingsState.blockedExecutionPages);
    if (!rules.length) return false;
    const href = window.location.href.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const pathWithSearch = `${path}${search}`;
    const pathWithSearchAndHash = `${path}${search}${hash}`;
    return rules.some((rule) => {
        const normalizedRule = rule.toLowerCase();
        return (
            href.includes(normalizedRule) ||
            path === normalizedRule ||
            search === normalizedRule ||
            pathWithSearch === normalizedRule ||
            pathWithSearchAndHash === normalizedRule ||
            pathWithSearch.includes(normalizedRule) ||
            pathWithSearchAndHash.includes(normalizedRule)
        );
    });
}

export function shouldRunRoPrimeOnCurrentPage() {
    return !isForeignAccountPluginRoute() && !isCurrentPageBlockedByUser();
}

export function getCurrentrp() {
    const params = new URLSearchParams(window.location.search);
    const route = (params.get(RP_PARAM_KEY) || "").toLowerCase();
    if (RP_SUPPORTED_PAGES.has(route)) return route;
    return null;
}

export function buildPluginUrl(page = RP_DEFAULT_PAGE) {
    const url = new URL(window.location.href);
    url.searchParams.set(RP_PARAM_KEY, page);
    return `${url.pathname}${url.search}`;
}
