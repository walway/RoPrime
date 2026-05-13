import { langList } from "../../.locales/lang-config.js";

// (Settings UI removed) - keep runtime/style constants only.
export const RP_SMALL_NEW_NAV_STYLE_ID = "roprime-small-new-nav-style";
export const RP_SIDEBAR_COMPACT_STYLE_ID = "roprime-sidebar-compact-style";
export const RP_FRIEND_STYLING_REIMAGNED_STYLE_ID =
	"roprime-friend-styling-reimagned-style";
export const RP_ALWAYS_SHOW_CLOSE_STYLE_ID = "roprime-always-show-close-style";
export const RP_RUNTIME_STYLE_ID = "roprime-runtime-style";
export const RP_PARAM_KEY = "roprime";
export const RP_DEFAULT_PAGE = "design";
export const RP_SUPPORTED_PAGES = new Set([
	"design",
	"settings",
	"info",
	"developer",
]);
export const RP_SETTINGS_KEY = "rpSettings";
export const RP_PROFILE_SETTINGS_ROOT_ID = "roprime-profile-settings-root";
/** Appended to /my/account settings links so Roblox account SPA tab state stays correct (e.g. #!/info). */
export const RP_ACCOUNT_URL_HASH_DEFAULT = "#!/info";
/** Set on `<html>` while RoPrime account settings URL is active — hides native chrome before mount. */
export const RP_ACCOUNT_SETTINGS_SHELL_CLASS = "roprime-account-settings-open";

/**
 * After reload/disable, `chrome.runtime.getURL` can throw even when `getURL` is a function.
 * Probe with a real call so stale content scripts stop touching extension APIs.
 */
export function isExtensionContextAlive() {
	try {
		if (
			typeof chrome === "undefined" ||
			typeof chrome.runtime?.getURL !== "function"
		)
			return false;
		chrome.runtime.getURL(".");
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
		return chrome.runtime.getURL(relativePath);
	} catch {
		return "";
	}
}

/** Merged per-locale `translation-keys.json` files under `.locales` for UI copy (from `settingsState.language`). */
/** @type {Record<string, string>} */
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
		return fetch(chrome.runtime.getURL(path), { cache: "no-store" });
	} catch (e) {
		return Promise.reject(e);
	}
}

async function buildSettingsUiStringMap(language) {
	const enRes = await fetchExtensionJson(".locales/en/translation-keys.json");
	if (!enRes.ok) throw new Error(`locales en: ${enRes.status}`);
	const en = await enRes.json();
	const loc = normalizeUiLocale(language);
	if (loc === "en") return { ...en };
	const curRes = await fetchExtensionJson(
		`.locales/${loc}/translation-keys.json`,
	);
	if (!curRes.ok) throw new Error(`locales ${loc}: ${curRes.status}`);
	const cur = await curRes.json();
	return { ...en, ...cur };
}

/** Load strings for `settingsState.language` (after `loadSettings()`). */
export async function loadSettingsUiStrings() {
	settingsUiStrings = await buildSettingsUiStringMap(settingsState.language);
}

export async function reloadSettingsUiStrings() {
	return loadSettingsUiStrings();
}

/** Localized UI string from `.locales` phrase keys (e.g. `Settings hero title`). */
export function settingsT(key) {
	const v = settingsUiStrings[key];
	if (typeof v === "string" && v.length > 0) return v;
	return key;
}

/** Toggle early shell class so native account layout stays hidden until our panel mounts. */
export function setAccountSettingsShellClass(active) {
	if (typeof document === "undefined" || !document.documentElement) return;
	document.documentElement.classList.toggle(
		RP_ACCOUNT_SETTINGS_SHELL_CLASS,
		active,
	);
}

/** If URL is already a RoPrime account tab, apply shell class before first paint (content script). */
export function applyAccountSettingsShellFromUrl() {
	try {
		if (!isMyAccountPath() || !isPluginRoute()) return;
		setAccountSettingsShellClass(true);
	} catch {
		/* ignore */
	}
}

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
	renameCommunitiesToGroups: true,
	renameExperiencesToGames: true,
	renameMarketplaceToAvatarShop: true,
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
	enablePluginControlPanel: false,
	sidebarSize: "full",
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
	try {
		return typeof chrome !== "undefined" && chrome.storage?.local
			? chrome.storage.local
			: null;
	} catch {
		return null;
	}
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
						Object.assign(settingsState, RP_DEFAULT_SETTINGS, stored);
						settingsState.blockedExecutionPages =
							normalizeBlockedExecutionPages(stored.blockedExecutionPages);
						settingsState.developerPageUnlocked =
							!!stored.developerPageUnlocked;
						if (stored.enablePluginControlPanel != null) {
							settingsState.enablePluginControlPanel =
								!!stored.enablePluginControlPanel;
						}
						if (stored.oldNavigationBarEnabled === undefined) {
							if (stored.classicLeftNavEnabled != null) {
								settingsState.oldNavigationBarEnabled =
									!!stored.classicLeftNavEnabled;
							} else if (stored.leftGrayFrameEnabled != null) {
								settingsState.oldNavigationBarEnabled =
									!!stored.leftGrayFrameEnabled;
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
							if (
								!["full", "small", "icon"].includes(settingsState.sidebarSize)
							) {
								settingsState.sidebarSize = "full";
							}
						}
						if (
							stored.renameDropdownRestore &&
							typeof stored.renameDropdownRestore === "object"
						) {
							if (stored.renameCommunitiesToGroups === undefined) {
								settingsState.renameCommunitiesToGroups =
									!!stored.renameDropdownRestore.renameCommunitiesToGroups;
							}
							if (stored.renameExperiencesToGames === undefined) {
								settingsState.renameExperiencesToGames =
									!!stored.renameDropdownRestore.renameExperiencesToGames;
							}
							if (stored.renameMarketplaceToAvatarShop === undefined) {
								settingsState.renameMarketplaceToAvatarShop =
									!!stored.renameDropdownRestore.renameMarketplaceToAvatarShop;
							}
						}
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
			[RP_SETTINGS_KEY]: {
				renameDropdownEnabled: settingsState.renameDropdownEnabled,
				renameDropdownRestore: settingsState.renameDropdownRestore,
				language: settingsState.language,
				renameCommunitiesToGroups: settingsState.renameCommunitiesToGroups,
				renameExperiencesToGames: settingsState.renameExperiencesToGames,
				renameMarketplaceToAvatarShop:
					settingsState.renameMarketplaceToAvatarShop,
				oldNavigationBarEnabled: settingsState.oldNavigationBarEnabled,
				smallNewNavigationBarEnabled:
					settingsState.smallNewNavigationBarEnabled,
				sidebarIconsOnlyEnabled: settingsState.sidebarIconsOnlyEnabled,
				alwaysShowCloseButtonEnabled:
					settingsState.alwaysShowCloseButtonEnabled,
				friendStylingReimagnedEnabled:
					settingsState.friendStylingReimagnedEnabled,
				developerPageUnlocked: !!settingsState.developerPageUnlocked,
				enablePluginControlPanel: !!settingsState.enablePluginControlPanel,
				sidebarSize: settingsState.sidebarSize || "full",
				blockedExecutionPages: normalizeBlockedExecutionPages(
					settingsState.blockedExecutionPages,
				),
			},
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

/** True only on /my/account (optional locale prefix), not /my/profile. */
export function isMyAccountPath() {
	const path = window.location.pathname || "";
	return /^\/(?:[a-z]{2,3}(?:-[a-z0-9]{2,8})?\/)?my\/account(?:\/|$)/i.test(
		path,
	);
}

/** Locale segment only when path is `/xx/my/...` or `/xx-yy/my/...`, never `/my/...` (avoids treating `my` as a locale). */
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
	const base = `${window.location.origin}${getRobloxLocalePathPrefix()}/my/account?${RP_PARAM_KEY}=${encodeURIComponent(slug)}`;
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
	const rules = normalizeBlockedExecutionPages(
		settingsState.blockedExecutionPages,
	);
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
	if (!isMyAccountPath()) return null;
	const params = new URLSearchParams(window.location.search);
	const route = (params.get(RP_PARAM_KEY) || "").toLowerCase();
	if (RP_SUPPORTED_PAGES.has(route)) return route;
	return null;
}

export function buildPluginUrl(page = RP_DEFAULT_PAGE) {
	const url = new URL(window.location.href);
	url.searchParams.set(RP_PARAM_KEY, page);
	return `${url.pathname}${url.search}${url.hash || ""}`;
}

applyAccountSettingsShellFromUrl();
