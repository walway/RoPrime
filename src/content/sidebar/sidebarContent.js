import {
	getActiveSidebarSize,
	normalizeSidebarSizeMode,
	saveSettings,
	settingsState,
} from "../core/core.js";
import {
	syncSidebarCompactDecorations,
	updateSidebarCompactVisibility,
} from "./sidebarCompact.js";
import { attachMuiRipple, bindMuiRipplesIn } from "../ui/muiRipple.js";
import {
	createRoPrimeNavMenuButton,
	setCollapseButtonIcon,
} from "../ui/components/collapse.js";
import { updateSmallNewNavVisibility } from "./smallNewNav.js";

const RP_SIDEBAR_CONTENT_STYLE_ID = "roprime-sidebar-content-hide-style";
const RP_MENU_ICON_BOUND_ATTR = "data-roprime-menu-icon-bound";
const RP_SIDEBAR_COLLAPSE_ENABLED_CLASS = "roprime-sidebar-collapse-menu-enabled";
const NATIVE_HEADER_MENU_BUTTON_SELECTOR =
	"#header-menu-icon.rbx-nav-collapse button.menu-button:not([data-roprime-nav-menu-button]), .container-fluid .rbx-navbar-header #header-menu-icon.rbx-nav-collapse button.menu-button:not([data-roprime-nav-menu-button])";
const ROPRIME_HEADER_MENU_BUTTON_SELECTOR =
	"#header-menu-icon.rbx-nav-collapse button[data-roprime-nav-menu-button], .container-fluid .rbx-navbar-header #header-menu-icon.rbx-nav-collapse button[data-roprime-nav-menu-button]";
/** @type {WeakMap<HTMLButtonElement, HTMLButtonElement>} */
const originalNavMenuButtons = new WeakMap();
/** @type {MutationObserver | null} */
let headerMenuIconObserver = null;

/** @typedef {'full' | 'small' | 'icon'} SidebarSizeMode */

/** @typedef {{ id: string, label: string, find: (nav: HTMLElement) => Element | null, conditional?: boolean, sizes?: SidebarSizeMode[] }} SidebarNavItemDef */

/** Which sidebar modes include each item in the configure UI. */
const SIDEBAR_ITEM_AVAILABLE_SIZES = {
	"profile-with-avatar": ["full", "small", "icon"],
	home: ["full", "small", "icon"],
	"profile-no-avatar": ["full", "small", "icon"],
	"roblox-plus": ["full", "small", "icon"],
	favorites: ["full", "small"],
	"roblox-plus-ad": ["full", "small"],
	"game-events": ["full", "small"],
};

/** @type {SidebarNavItemDef[]} */
export const SIDEBAR_NAV_ITEM_DEFS = [
	{
		id: "profile-with-avatar",
		label: "Profile",
		find: findProfileWithAvatar,
	},
	{
		id: "home",
		label: "Home",
		find: findHomeLink,
	},
	{
		id: "profile-no-avatar",
		label: "Profile",
		find: findProfileWithoutAvatar,
	},
	{
		id: "roblox-plus",
		label: "Roblox Plus",
		find: findRobloxPlusLink,
	},
	{
		id: "favorites",
		label: "Favorites",
		find: findFavoritesItem,
		conditional: true,
	},
	{
		id: "roblox-plus-ad",
		label: "Roblox Plus Ad",
		find: findRobloxPlusAdItem,
		conditional: true,
	},
	{
		id: "game-events",
		label: "Game Events",
		find: findGameEventsItem,
		conditional: true,
	},
];

let lastSidebarSyncKey = "";
let lastHideStyleCss = "";
/** @type {MutationObserver | null} */
let sidebarNavObserver = null;
let sidebarNavDebounce = 0;

function getLeftNav() {
	const nav = document.querySelector(".left-nav.fixed");
	return nav instanceof HTMLElement ? nav : null;
}

function normalizePath(href) {
	const raw = String(href || "").trim();
	if (!raw) return "";
	const path = raw.replace(/^https?:\/\/[^/]+/i, "");
	return path.split("?")[0].split("#")[0] || "/";
}

function pathMatches(path, pattern) {
	return pattern.test(path);
}

function hideTarget(el) {
	if (el instanceof HTMLLIElement) return el;
	return el.closest("li") || el;
}

function findProfileWithAvatar(nav) {
	for (const a of nav.querySelectorAll("a[href]")) {
		if (!(a instanceof HTMLAnchorElement)) continue;
		const path = normalizePath(a.getAttribute("href") || "");
		if (
			!pathMatches(path, /\/users\/\d+/i) &&
			!pathMatches(path, /\/users\/profile/i) &&
			!pathMatches(path, /\/my\/account/i) &&
			!pathMatches(path, /\/my\/profile/i)
		)
			continue;
		if (!a.querySelector("img")) continue;
		return hideTarget(a);
	}
	return null;
}

function findHomeLink(nav) {
	for (const a of nav.querySelectorAll("a[href]")) {
		if (!(a instanceof HTMLAnchorElement)) continue;
		const path = normalizePath(a.getAttribute("href") || a.href);
		if (path === "/home" || path.endsWith("/home")) return hideTarget(a);
	}
	return null;
}

function findProfileWithoutAvatar(nav) {
	for (const a of nav.querySelectorAll("a[href]")) {
		if (!(a instanceof HTMLAnchorElement)) continue;
		const path = normalizePath(a.getAttribute("href") || "");
		if (!pathMatches(path, /\/users\/profile/i)) continue;
		if (a.querySelector("img")) continue;
		return hideTarget(a);
	}
	return null;
}

function findRobloxPlusLink(nav) {
	const a = nav.querySelector('a[href*="/plus" i]');
	if (!(a instanceof HTMLAnchorElement)) return null;
	return hideTarget(a);
}

function findFavoritesItem(nav) {
	const ul = nav.querySelector("ul.flex.flex-col.gap-small");
	if (!(ul instanceof HTMLElement)) return null;
	const li = ul.querySelector("li.roseal-left-nav-item");
	return li instanceof HTMLElement ? li : null;
}

function findRobloxPlusAdItem(nav) {
	const li = nav.querySelector("li.padding-top-xsmall");
	return li instanceof HTMLElement ? li : null;
}

function findGameEventsItem(nav) {
	const container = nav.querySelector(
		"div.padding-x-large.padding-y-medium.flex.flex-col.gap-large",
	);
	if (!(container instanceof HTMLElement)) return null;
	const item = container.querySelector(
		"div.roseal-left-nav-item, [class*='roseal-left-nav-item']",
	);
	if (!(item instanceof HTMLElement)) return null;
	return hideTarget(item);
}

function defsForSidebarSize(sizeMode) {
	const mode = normalizeSidebarSizeMode(sizeMode);
	return SIDEBAR_NAV_ITEM_DEFS.filter((def) => {
		const sizes = SIDEBAR_ITEM_AVAILABLE_SIZES[def.id] || [
			"full",
			"small",
			"icon",
		];
		return sizes.includes(mode);
	});
}

function getHiddenMap() {
	if (
		!settingsState.hiddenSidebarItemsBySize ||
		typeof settingsState.hiddenSidebarItemsBySize !== "object"
	) {
		settingsState.hiddenSidebarItemsBySize = { full: [], small: [], icon: [] };
	}
	return settingsState.hiddenSidebarItemsBySize;
}

export function getHiddenSidebarItemIds(sizeMode = getActiveSidebarSize()) {
	const mode = normalizeSidebarSizeMode(sizeMode);
	const map = getHiddenMap();
	const raw = map[mode];
	if (!Array.isArray(raw)) return [];
	return raw.filter((id) => typeof id === "string" && id.trim());
}

function setHiddenSidebarItemIds(ids, sizeMode = getActiveSidebarSize()) {
	const mode = normalizeSidebarSizeMode(sizeMode);
	const map = getHiddenMap();
	map[mode] = [...new Set(ids)];
}

export function isSidebarItemHidden(itemId, sizeMode = getActiveSidebarSize()) {
	return getHiddenSidebarItemIds(sizeMode).includes(itemId);
}

export function hideSidebarItem(itemId, sizeMode = getActiveSidebarSize()) {
	const mode = normalizeSidebarSizeMode(sizeMode);
	if (!defsForSidebarSize(mode).some((def) => def.id === itemId)) return;
	const next = getHiddenSidebarItemIds(mode);
	if (!next.includes(itemId)) next.push(itemId);
	setHiddenSidebarItemIds(next, mode);
	saveSettings();
	syncSidebarContent({ force: true });
}

export function restoreSidebarItem(itemId, sizeMode = getActiveSidebarSize()) {
	const mode = normalizeSidebarSizeMode(sizeMode);
	setHiddenSidebarItemIds(
		getHiddenSidebarItemIds(mode).filter((id) => id !== itemId),
		mode,
	);
	saveSettings();
	syncSidebarContent({ force: true });
}

/** Items to show in the configure UI for a given sidebar size. */
export function discoverSidebarNavItems(sizeMode = getActiveSidebarSize()) {
	const nav = getLeftNav();
	const defs = defsForSidebarSize(sizeMode);

	if (!nav) {
		return defs
			.filter((def) => !def.conditional)
			.map((def) => ({
				...def,
				present: false,
				sizeMode: normalizeSidebarSizeMode(sizeMode),
			}));
	}

	return defs
		.map((def) => {
			const el = def.find(nav);
			return {
				...def,
				present: !!el,
				sizeMode: normalizeSidebarSizeMode(sizeMode),
			};
		})
		.filter((def) => def.present || !def.conditional);
}

function getSidebarSyncKey() {
	const mode = getActiveSidebarSize();
	const hidden = ["full", "small", "icon"]
		.map((m) => `${m}:${getHiddenSidebarItemIds(m).sort().join(",")}`)
		.join("|");
	return `${mode}|${hidden}|${!!settingsState.sidebarCollapseMenuEnabled}|${!!getLeftNav()}`;
}

function tagSidebarNavItems(nav) {
	const mode = getActiveSidebarSize();
	const tagged = new Set();

	for (const def of defsForSidebarSize(mode)) {
		const el = def.find(nav);
		if (!(el instanceof HTMLElement)) continue;
		tagged.add(el);
		if (el.getAttribute("data-roprime-sidebar-item") !== def.id) {
			el.setAttribute("data-roprime-sidebar-item", def.id);
		}
		applySidebarItemHideState(el, def.id, mode);
	}

	nav.querySelectorAll("[data-roprime-sidebar-item]").forEach((node) => {
		if (!(node instanceof HTMLElement)) return;
		if (!tagged.has(node)) {
			node.removeAttribute("data-roprime-sidebar-item");
			node.removeAttribute("data-roprime-sidebar-hidden");
			if (node.style.cssText) node.style.cssText = "";
		}
	});
}

const SIDEBAR_ITEM_HIDE_CSS =
	"display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important;transition:none!important;animation:none!important;";

function buildHideStyle() {
	const mode = getActiveSidebarSize();
	const hidden = getHiddenSidebarItemIds(mode);
	if (!hidden.length) return "";
	return hidden
		.map(
			(id) =>
				`.left-nav.fixed [data-roprime-sidebar-item="${id}"],.left-nav.fixed [data-roprime-sidebar-item="${id}"] *{${SIDEBAR_ITEM_HIDE_CSS}}`,
		)
		.join("\n");
}

function applySidebarItemHideState(
	el,
	itemId,
	sizeMode = getActiveSidebarSize(),
) {
	if (!(el instanceof HTMLElement)) return;
	const hidden = isSidebarItemHidden(itemId, sizeMode);
	const wasHidden = el.getAttribute("data-roprime-sidebar-hidden") === "1";
	if (hidden === wasHidden) return;
	if (hidden) {
		el.setAttribute("data-roprime-sidebar-hidden", "1");
		el.style.cssText = SIDEBAR_ITEM_HIDE_CSS;
		return;
	}
	el.removeAttribute("data-roprime-sidebar-hidden");
	el.style.cssText = "";
}

function updateSidebarHideStyle() {
	const css = buildHideStyle();
	if (css === lastHideStyleCss) return;
	lastHideStyleCss = css;

	const existing = document.getElementById(RP_SIDEBAR_CONTENT_STYLE_ID);
	if (!css) {
		existing?.remove();
		return;
	}
	let style = existing;
	if (!(style instanceof HTMLStyleElement)) {
		style = document.createElement("style");
		style.id = RP_SIDEBAR_CONTENT_STYLE_ID;
		document.documentElement.appendChild(style);
	}
	style.textContent = css;
}

function queryNativeHeaderMenuButtons() {
	return document.querySelectorAll(NATIVE_HEADER_MENU_BUTTON_SELECTOR);
}

function queryRoPrimeHeaderMenuButtons() {
	return document.querySelectorAll(ROPRIME_HEADER_MENU_BUTTON_SELECTOR);
}

function stopHeaderMenuIconObserver() {
	headerMenuIconObserver?.disconnect();
	headerMenuIconObserver = null;
}

function ensureHeaderMenuIconObserver() {
	if (!settingsState.sidebarCollapseMenuEnabled) {
		stopHeaderMenuIconObserver();
		return;
	}
	if (headerMenuIconObserver) return;
	try {
		headerMenuIconObserver = new MutationObserver(() => {
			applyNavbarMenuButton();
		});
		headerMenuIconObserver.observe(document.documentElement, {
			childList: true,
			subtree: true,
		});
	} catch {
		stopHeaderMenuIconObserver();
	}
}

function restoreNavbarMenuButtons() {
	queryRoPrimeHeaderMenuButtons().forEach((replacement) => {
		if (!(replacement instanceof HTMLButtonElement)) return;
		const original = originalNavMenuButtons.get(replacement);
		if (original instanceof HTMLButtonElement) {
			replacement.replaceWith(original);
			originalNavMenuButtons.delete(replacement);
		}
	});
}

function applyNavbarMenuButton() {
	queryNativeHeaderMenuButtons().forEach((original) => {
		if (!(original instanceof HTMLButtonElement)) return;
		const replacement = createRoPrimeNavMenuButton(original, {
			collapsed: !!settingsState.sidebarIconsOnlyEnabled,
		});
		originalNavMenuButtons.set(replacement, original);
		original.replaceWith(replacement);
		attachMuiRipple(replacement);
	});
	bindMuiRipplesIn(document);
}

function toggleFullToIconSidebar() {
	const next = !settingsState.sidebarIconsOnlyEnabled;
	settingsState.sidebarIconsOnlyEnabled = next;
	settingsState.smallNewNavigationBarEnabled = false;
	updateSmallNewNavVisibility();
	updateSidebarCompactVisibility();
	syncSidebarCompactDecorations();
	syncSidebarContent({ force: true });
	queryRoPrimeHeaderMenuButtons().forEach((btn) => {
		if (btn instanceof HTMLButtonElement) setCollapseButtonIcon(btn, next);
	});
}

function bindCollapseMenuHandler() {
	const root = document.documentElement;
	if (root.getAttribute(RP_MENU_ICON_BOUND_ATTR) === "1") return;
	root.setAttribute(RP_MENU_ICON_BOUND_ATTR, "1");

	document.addEventListener(
		"click",
		(event) => {
			if (!settingsState.sidebarCollapseMenuEnabled) return;
			const target = event.target;
			if (!(target instanceof Element)) return;
			const menuBtn = target.closest(ROPRIME_HEADER_MENU_BUTTON_SELECTOR);
			if (!(menuBtn instanceof HTMLButtonElement)) return;
			event.preventDefault();
			event.stopImmediatePropagation();
			toggleFullToIconSidebar();
		},
		true,
	);
}

export function syncSidebarCollapseMenuIcon() {
	bindCollapseMenuHandler();
	document.documentElement.classList.toggle(
		RP_SIDEBAR_COLLAPSE_ENABLED_CLASS,
		!!settingsState.sidebarCollapseMenuEnabled,
	);
	document.body?.classList.toggle(
		RP_SIDEBAR_COLLAPSE_ENABLED_CLASS,
		!!settingsState.sidebarCollapseMenuEnabled,
	);
	if (!settingsState.sidebarCollapseMenuEnabled) {
		stopHeaderMenuIconObserver();
		restoreNavbarMenuButtons();
		return;
	}
	if (settingsState.sidebarSize !== "full") {
		settingsState.sidebarSize = "full";
		settingsState.smallNewNavigationBarEnabled = false;
		settingsState.sidebarIconsOnlyEnabled = false;
		saveSettings();
	}
	ensureHeaderMenuIconObserver();
	applyNavbarMenuButton();
}

function queueSidebarNavResync() {
	window.clearTimeout(sidebarNavDebounce);
	sidebarNavDebounce = window.setTimeout(() => {
		sidebarNavDebounce = 0;
		syncSidebarContent({ force: true });
	}, 120);
}

function ensureSidebarNavObserver() {
	const nav = getLeftNav();
	if (!nav) return;
	if (sidebarNavObserver) return;
	try {
		sidebarNavObserver = new MutationObserver(() => queueSidebarNavResync());
		sidebarNavObserver.observe(nav, { childList: true, subtree: true });
	} catch {
		sidebarNavObserver = null;
	}
}

/**
 * @param {{ force?: boolean }} [options]
 */
export function syncSidebarContent(options = {}) {
	const key = getSidebarSyncKey();
	if (!options.force && key === lastSidebarSyncKey) {
		syncSidebarCollapseMenuIcon();
		return;
	}
	lastSidebarSyncKey = key;

	const nav = getLeftNav();
	if (nav) {
		tagSidebarNavItems(nav);
		ensureSidebarNavObserver();
	}
	updateSidebarHideStyle();
	syncSidebarCollapseMenuIcon();
}
