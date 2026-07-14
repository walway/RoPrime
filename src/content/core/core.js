import { langList } from "../../i18n/i18n-config";

const extensionApi = globalThis.browser || globalThis.chrome;

export const RP_SMALL_NEW_NAV_STYLE_ID = "roprime-small-new-nav-style";
export const RP_SIDEBAR_COMPACT_STYLE_ID = "roprime-sidebar-compact-style";
export const RP_FRIEND_STYLING_REIMAGNED_STYLE_ID =
  "roprime-friend-styling-reimagned-style";
export const RP_ALWAYS_SHOW_CLOSE_STYLE_ID = "roprime-always-show-close-style";
export const RP_CUSTOM_CSS_STYLE_ID = "roprime-custom-css-style";
export const RP_PARAM_KEY = "roprime";
export const RP_PARAM_KEY_NEW = "roprime-new";
export const RP_DEFAULT_PAGE = "design";
export const RP_SUPPORTED_PAGES = new Set([
  "design",
  "settings",
  "other",
  "info",
  "developer",
  "sidebar-content",
  "privacy",
]);
export const RP_SETTINGS_KEY = "rpSettings";
export const RP_SETTINGS_FLAT_INNER_ID = "rp-settings-flat-inner";
export const RP_SETTINGS_INNER_ID = RP_SETTINGS_FLAT_INNER_ID;

export const RP_ACCOUNT_URL_HASH_DEFAULT = "#!/info";

export const RP_ACCOUNT_SETTINGS_SHELL_CLASS = "roprime-account-settings-open";

export const ACCOUNT_SETTINGS_LEFT_INSET_BY_SIZE = {
  icon: 83,
  small: 200,
  full: 289,
};

const SIDEBAR_SIZE_MODES = ["full", "small", "icon"];

export function normalizeSidebarSizeMode(size) {
  const mode = String(size || "full").toLowerCase();
  return SIDEBAR_SIZE_MODES.includes(mode) ? mode : "full";
}

export function getActiveSidebarSize() {
  return normalizeSidebarSizeMode(settingsState.sidebarSize);
}

export function getAccountSettingsLeftInsetPx(size = getActiveSidebarSize()) {
  const mode = normalizeSidebarSizeMode(size);
  const sidebarWidth =
    ACCOUNT_SETTINGS_LEFT_INSET_BY_SIZE[mode] ??
    ACCOUNT_SETTINGS_LEFT_INSET_BY_SIZE.full;
  return sidebarWidth + 1;
}

function emptyHiddenSidebarMap() {
  return { full: [], small: [], icon: [] };
}

export function normalizeHiddenSidebarItemsBySize(stored) {
  if (
    stored?.hiddenSidebarItemsBySize &&
    typeof stored.hiddenSidebarItemsBySize === "object"
  ) {
    const next = emptyHiddenSidebarMap();
    for (const mode of SIDEBAR_SIZE_MODES) {
      const list = stored.hiddenSidebarItemsBySize[mode];
      next[mode] = Array.isArray(list)
        ? list.filter((id) => typeof id === "string" && id.trim())
        : [];
    }
    return next;
  }
  const legacy = Array.isArray(stored?.hiddenSidebarItems)
    ? stored.hiddenSidebarItems.filter(
        (id) => typeof id === "string" && id.trim(),
      )
    : [];
  return {
    full: [...legacy],
    small: [...legacy],
    icon: [...legacy],
  };
}

export function syncAccountSettingsLayoutInset() {
  if (typeof document === "undefined" || !document.documentElement) return;
  if (
    !document.documentElement.classList.contains(
      RP_ACCOUNT_SETTINGS_SHELL_CLASS,
    )
  ) {
    document.documentElement.style.removeProperty(
      "--roprime-settings-left-inset",
    );
    return;
  }
  const effectiveSize =
    settingsState.sidebarCollapseMenuEnabled &&
    settingsState.sidebarIconsOnlyEnabled
      ? "icon"
      : getActiveSidebarSize();
  document.documentElement.style.setProperty(
    "--roprime-settings-left-inset",
    `${getAccountSettingsLeftInsetPx(effectiveSize)}px`,
  );
}

export function isExtensionContextAlive() {
  try {
    if (typeof extensionApi?.runtime?.getURL !== "function") return false;
    extensionApi.runtime.getURL(".");
    return true;
  } catch {
    return false;
  }
}

export function isExtensionContextInvalidatedError(err) {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /extension context invalidated|context invalidated/i.test(msg);
}

export function getExtensionResourceUrl(relativePath) {
  try {
    if (!isExtensionContextAlive()) return "";
    return extensionApi.runtime.getURL(relativePath);
  } catch {
    return "";
  }
}

let settingsUiStrings = {};

function normalizeUiLocale(raw) {
  const s = String(raw || "en").toLowerCase();
  if (s in langList) return s;
  return "en";
}

function fetchExtensionJson(path) {
  try {
    if (!isExtensionContextAlive()) {
      return Promise.reject(new Error("no extension runtime"));
    }
    return fetch(extensionApi.runtime.getURL(path), { cache: "no-store" });
  } catch (e) {
    return Promise.reject(e);
  }
}

async function buildSettingsUiStringMap(language) {
  const enRes = await fetchExtensionJson(
    "src/strings/values/en/translation-keys.json",
  );
  if (!enRes.ok) throw new Error(`strings en: ${enRes.status}`);
  const en = await enRes.json();
  const loc = normalizeUiLocale(language);
  if (loc === "en") return { ...en };
  const curRes = await fetchExtensionJson(
    `src/strings/values/${loc}/translation-keys.json`,
  );
  if (!curRes.ok) return { ...en };
  const cur = await curRes.json();
  return { ...en, ...cur };
}

export async function loadSettingsUiStrings() {
  settingsUiStrings = await buildSettingsUiStringMap(settingsState.language);
}

export async function reloadSettingsUiStrings() {
  return loadSettingsUiStrings();
}

export function settingsT(key) {
  const v = settingsUiStrings[key];
  if (typeof v === "string" && v.length > 0) return v;
  return key;
}

export function setAccountSettingsShellClass(active) {
  if (typeof document === "undefined" || !document.documentElement) return;
  document.documentElement.classList.toggle(
    RP_ACCOUNT_SETTINGS_SHELL_CLASS,
    active,
  );
  syncAccountSettingsLayoutInset();
}

export function applyAccountSettingsShellFromUrl() {
  try {
    if (!isMyAccountPath() || !isOnRoPrimeSettingsPage()) return;
    setAccountSettingsShellClass(true);
  } catch {
    /* ignore */
  }
}

export const RP_DEFAULT_SETTINGS = {
  language: "en",
  renameDropdownEnabled: true,
  renameCommunitiesToGroups: true,
  renameMarketplaceToCatalog: true,
  oldNavigationBarEnabled: false,
  smallNewNavigationBarEnabled: false,
  sidebarIconsOnlyEnabled: false,
  alwaysShowCloseButtonEnabled: false,
  friendStylingReimagnedEnabled: false,
  hideAgeBadgeEnabled: false,
  developerPageUnlocked: false,
  sidebarSize: "full",
  sidebarCollapseMenuEnabled: false,
  hiddenSidebarItemsBySize: { full: [], small: [], icon: [] },
  customCss: "",
  customCssCautionAccepted: false,
  cosmeticsEnabled: false,
  profileEffectsLayoutView: "grid",
  ownedProfileEffects: [],

  equippedProfileEffect: "",
  equippedProfilePictureEffect: "",
  equippedProfilePageEffect: "",
  profileEffectsEquippedByUser: {},
  profileEffectsSupportNoticeAccepted: false,
  searchBanEnabled: false,
  searchBannedWords: [],
};

export let isSyncing = false;
export const settingsState = { ...RP_DEFAULT_SETTINGS };

export function setIsSyncing(value) {
  isSyncing = value;
}

export function getStorageApi() {
  try {
    if (typeof browser !== "undefined" && browser.storage?.local) {
      return browser.storage.local;
    }
    const chromeApi = globalThis.chrome;
    if (chromeApi?.storage?.local) {
      return chromeApi.storage.local;
    }
    return null;
  } catch {
    return null;
  }
}

export function mergeStoredSettings(stored) {
  if (!stored || typeof stored !== "object") return;

  Object.assign(settingsState, RP_DEFAULT_SETTINGS, stored);
  if (stored.renameMarketplaceToCatalog === undefined) {
    if (stored.renameMarketplaceToAvatarShop != null) {
      settingsState.renameMarketplaceToCatalog =
        !!stored.renameMarketplaceToAvatarShop;
    }
  }
  delete settingsState.renameMarketplaceToAvatarShop;
  delete settingsState.renameExperiencesToGames;
  delete settingsState.renameDropdownRestore;
  delete settingsState.blockedExecutionPages;
  settingsState.developerPageUnlocked = !!stored.developerPageUnlocked;
  delete settingsState.enablePluginControlPanel;
  if (stored.oldNavigationBarEnabled === undefined) {
    if (stored.classicLeftNavEnabled != null) {
      settingsState.oldNavigationBarEnabled = !!stored.classicLeftNavEnabled;
    } else if (stored.leftGrayFrameEnabled != null) {
      settingsState.oldNavigationBarEnabled = !!stored.leftGrayFrameEnabled;
    }
  }
  delete settingsState.classicLeftNavEnabled;
  delete settingsState.leftGrayFrameEnabled;
  if (stored.sidebarSize === undefined) {
    settingsState.sidebarSize = stored.sidebarIconsOnlyEnabled
      ? "icon"
      : stored.smallNewNavigationBarEnabled
        ? "small"
        : "full";
  } else {
    settingsState.sidebarSize = String(
      stored.sidebarSize || "full",
    ).toLowerCase();
    if (!["full", "small", "icon"].includes(settingsState.sidebarSize)) {
      settingsState.sidebarSize = "full";
    }
  }
  settingsState.hiddenSidebarItemsBySize =
    normalizeHiddenSidebarItemsBySize(stored);
  delete settingsState.hiddenSidebarItems;
  settingsState.searchBanEnabled = !!stored.searchBanEnabled;
  settingsState.searchBannedWords = normalizeSearchBannedWords(
    stored.searchBannedWords,
  );
}

export function normalizeSearchBannedWords(words) {
  if (!Array.isArray(words)) return [];
  const seen = new Set();
  const next = [];
  for (const word of words) {
    if (typeof word !== "string") continue;
    const trimmed = word.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(trimmed);
  }
  return next;
}

export function resetSettingsToDefaults() {
  for (const key of Object.keys(settingsState)) {
    delete settingsState[key];
  }
  Object.assign(settingsState, { ...RP_DEFAULT_SETTINGS });
  saveSettings();
}

export function serializeSettingsPayload() {
  return {
    language: settingsState.language,
    renameDropdownEnabled: settingsState.renameDropdownEnabled,
    renameCommunitiesToGroups: settingsState.renameCommunitiesToGroups,
    renameMarketplaceToCatalog: settingsState.renameMarketplaceToCatalog,
    oldNavigationBarEnabled: settingsState.oldNavigationBarEnabled,
    smallNewNavigationBarEnabled: settingsState.smallNewNavigationBarEnabled,
    sidebarIconsOnlyEnabled: settingsState.sidebarIconsOnlyEnabled,
    alwaysShowCloseButtonEnabled: settingsState.alwaysShowCloseButtonEnabled,
    friendStylingReimagnedEnabled: settingsState.friendStylingReimagnedEnabled,
    hideAgeBadgeEnabled: !!settingsState.hideAgeBadgeEnabled,
    developerPageUnlocked: !!settingsState.developerPageUnlocked,
    sidebarSize: settingsState.sidebarSize || "full",
    sidebarCollapseMenuEnabled: !!settingsState.sidebarCollapseMenuEnabled,
    hiddenSidebarItemsBySize: normalizeHiddenSidebarItemsBySize({
      hiddenSidebarItemsBySize: settingsState.hiddenSidebarItemsBySize,
    }),
    customCss:
      typeof settingsState.customCss === "string"
        ? settingsState.customCss
        : "",
    customCssCautionAccepted: !!settingsState.customCssCautionAccepted,
    cosmeticsEnabled: !!settingsState.cosmeticsEnabled,
    profileEffectsLayoutView: ["grid", "list", "wide"].includes(
      settingsState.profileEffectsLayoutView,
    )
      ? settingsState.profileEffectsLayoutView
      : "grid",
    ownedProfileEffects: Array.isArray(settingsState.ownedProfileEffects)
      ? settingsState.ownedProfileEffects.filter(
          (id) => typeof id === "string" && id.trim(),
        )
      : [],
    equippedProfilePictureEffect:
      typeof settingsState.equippedProfilePictureEffect === "string"
        ? settingsState.equippedProfilePictureEffect.trim()
        : "",
    equippedProfilePageEffect:
      typeof settingsState.equippedProfilePageEffect === "string"
        ? settingsState.equippedProfilePageEffect.trim()
        : "",
    profileEffectsEquippedByUser:
      settingsState.profileEffectsEquippedByUser &&
      typeof settingsState.profileEffectsEquippedByUser === "object"
        ? settingsState.profileEffectsEquippedByUser
        : {},
    profileEffectsSupportNoticeAccepted:
      !!settingsState.profileEffectsSupportNoticeAccepted,
    searchBanEnabled: !!settingsState.searchBanEnabled,
    searchBannedWords: normalizeSearchBannedWords(
      settingsState.searchBannedWords,
    ),
  };
}

export function persistSettingsPayload(payload = serializeSettingsPayload()) {
  const storage = getStorageApi();
  if (!storage) return Promise.resolve();

  return new Promise((resolve) => {
    try {
      storage.set({ [RP_SETTINGS_KEY]: payload }, () => resolve());
    } catch {
      resolve();
    }
  });
}

export function loadSettings() {
  const storage = getStorageApi();
  if (!storage) return Promise.resolve();

  return new Promise((resolve) => {
    try {
      storage.get([RP_SETTINGS_KEY], (result) => {
        try {
          const stored = result?.[RP_SETTINGS_KEY];
          if (stored && typeof stored === "object") {
            mergeStoredSettings(stored);
          }
        } catch {
          /* ignore */
        }
        resolve();
      });
    } catch {
      resolve();
    }
  });
}

export function saveSettings() {
  try {
    const storage = getStorageApi();
    if (!storage) return;

    storage.set({
      [RP_SETTINGS_KEY]: serializeSettingsPayload(),
    });
  } catch {
    /* ignore */
  }
}

export function isAccountPage() {
  const path = window.location.pathname || "";
  return /^\/(?:[a-z]{2,3}(?:-[a-z0-9]{2,8})?\/)?my\/(?:account|profile)(?:\/|$)/i.test(
    path,
  );
}

export function isMyAccountPath() {
  const path = window.location.pathname || "";
  return /^\/(?:[a-z]{2,3}(?:-[a-z0-9]{2,8})?\/)?my\/account(?:\/|$)/i.test(
    path,
  );
}

export function isNativeMyAccountHashRoute() {
  if (!isMyAccountPath()) return false;
  const search = window.location.search || "";
  if (search.length > 1) return false;
  const hash = window.location.hash || "";
  return hash.startsWith("#!/");
}

export function getRobloxLocalePathPrefix() {
  const path = window.location.pathname || "";
  const m = path.match(/^\/([a-z]{2,3}(?:-[a-z0-9]{2,8})?)\/my\//i);
  return m ? `/${m[1]}` : "";
}

export function buildRoPrimeSettingsFullUrl(
  page = RP_DEFAULT_PAGE,
  hashFragment = RP_ACCOUNT_URL_HASH_DEFAULT,
) {
  const slug =
    typeof page === "string" && page.trim() ? page.trim() : RP_DEFAULT_PAGE;
  const base = `${window.location.origin}${getRobloxLocalePathPrefix()}/my/account?${RP_PARAM_KEY_NEW}=${encodeURIComponent(slug)}`;
  const h =
    typeof hashFragment === "string" && hashFragment.trim()
      ? hashFragment.trim().startsWith("#")
        ? hashFragment.trim()
        : `#${hashFragment.trim()}`
      : "";
  return `${base}${h}`;
}

export function isPluginRoute() {
  if (!isMyAccountPath()) return false;
  const params = new URLSearchParams(window.location.search);
  const route = (params.get(RP_PARAM_KEY_NEW) || "").toLowerCase();
  return RP_SUPPORTED_PAGES.has(route);
}

export function isOnRoPrimeSettingsPage() {
  return isPluginRoute();
}

export function getLegacyRoPrimePageFromUrl() {
  if (!isMyAccountPath()) return null;
  const params = new URLSearchParams(window.location.search);
  if (params.has(RP_PARAM_KEY_NEW)) return null;
  const route = (params.get(RP_PARAM_KEY) || "").toLowerCase();
  return RP_SUPPORTED_PAGES.has(route) ? route : null;
}

export function isForeignAccountPluginRoute() {
  if (!isAccountPage()) return false;
  const params = new URLSearchParams(window.location.search);
  if (params.has(RP_PARAM_KEY_NEW)) return !isPluginRoute();
  if (params.has(RP_PARAM_KEY)) {
    const route = (params.get(RP_PARAM_KEY) || "").toLowerCase();
    return route !== "" && !RP_SUPPORTED_PAGES.has(route);
  }
  return Array.from(params.keys()).length > 0;
}

export function shouldRunRoPrimeOnCurrentPage() {
  return true;
}

export function getCurrentrp() {
  if (!isMyAccountPath()) return null;
  const params = new URLSearchParams(window.location.search);
  const route = (params.get(RP_PARAM_KEY_NEW) || "").toLowerCase();
  if (RP_SUPPORTED_PAGES.has(route)) return route;
  return null;
}

export function buildPluginUrl(page = RP_DEFAULT_PAGE) {
  const url = new URL(window.location.href);
  url.searchParams.delete(RP_PARAM_KEY);
  url.searchParams.set(RP_PARAM_KEY_NEW, page);
  return `${url.pathname}${url.search}${url.hash || ""}`;
}

applyAccountSettingsShellFromUrl();
