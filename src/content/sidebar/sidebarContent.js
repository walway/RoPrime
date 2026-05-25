import { saveSettings, settingsState } from "../core/core.js";
import {
	syncSidebarCompactDecorations,
	updateSidebarCompactVisibility,
} from "./sidebarCompact.js";
import { MENU_OPEN_ICON_SVG } from "./sidebarIcons.js";
import { updateSmallNewNavVisibility } from "./smallNewNav.js";

const RP_SIDEBAR_CONTENT_STYLE_ID = "roprime-sidebar-content-hide-style";
const RP_MENU_ICON_BOUND_ATTR = "data-roprime-menu-icon-bound";
const ORIGINAL_MENU_ICON_CONTENT = new WeakMap();

/** @typedef {{ id: string, label: string, find: (nav: HTMLElement) => Element | null, conditional?: boolean }} SidebarNavItemDef */

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

export function getHiddenSidebarItemIds() {
	const raw = settingsState.hiddenSidebarItems;
	if (!Array.isArray(raw)) return [];
	return raw.filter((id) => typeof id === "string" && id.trim());
}

function setHiddenSidebarItemIds(ids) {
	settingsState.hiddenSidebarItems = [...new Set(ids)];
}

export function isSidebarItemHidden(itemId) {
	return getHiddenSidebarItemIds().includes(itemId);
}

export function hideSidebarItem(itemId) {
	if (!SIDEBAR_NAV_ITEM_DEFS.some((def) => def.id === itemId)) return;
	const next = getHiddenSidebarItemIds();
	if (!next.includes(itemId)) next.push(itemId);
	setHiddenSidebarItemIds(next);
	saveSettings();
	syncSidebarContent();
}

export function restoreSidebarItem(itemId) {
	setHiddenSidebarItemIds(
		getHiddenSidebarItemIds().filter((id) => id !== itemId),
	);
	saveSettings();
	syncSidebarContent();
}

/** Items to show in the configure UI (always-on + detected conditional). */
export function discoverSidebarNavItems() {
	const nav = getLeftNav();
	if (!nav) {
		return SIDEBAR_NAV_ITEM_DEFS.filter((def) => !def.conditional).map(
			(def) => ({
				...def,
				present: false,
			}),
		);
	}

	return SIDEBAR_NAV_ITEM_DEFS.map((def) => {
		const el = def.find(nav);
		return {
			...def,
			present: !!el,
		};
	}).filter((def) => def.present || !def.conditional);
}

function tagSidebarNavItems(nav) {
	for (const def of SIDEBAR_NAV_ITEM_DEFS) {
		const el = def.find(nav);
		document
			.querySelectorAll(`[data-roprime-sidebar-item="${def.id}"]`)
			.forEach((node) => {
				if (node instanceof HTMLElement)
					node.removeAttribute("data-roprime-sidebar-item");
			});
		if (el instanceof HTMLElement) {
			el.setAttribute("data-roprime-sidebar-item", def.id);
			applySidebarItemHideState(el, def.id);
		}
	}
}

const SIDEBAR_ITEM_HIDE_CSS =
	"display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important;transition:none!important;animation:none!important;";

function buildHideStyle() {
	const hidden = getHiddenSidebarItemIds();
	if (!hidden.length) return "";
	return hidden
		.map(
			(id) =>
				`.left-nav.fixed [data-roprime-sidebar-item="${id}"],.left-nav.fixed [data-roprime-sidebar-item="${id}"] *{${SIDEBAR_ITEM_HIDE_CSS}}`,
		)
		.join("\n");
}

function applySidebarItemHideState(el, itemId) {
	if (!(el instanceof HTMLElement)) return;
	const hidden = isSidebarItemHidden(itemId);
	if (hidden) {
		el.setAttribute("data-roprime-sidebar-hidden", "1");
		el.style.cssText = SIDEBAR_ITEM_HIDE_CSS;
		return;
	}
	el.removeAttribute("data-roprime-sidebar-hidden");
	el.style.cssText = "";
}

function updateSidebarHideStyle() {
	const existing = document.getElementById(RP_SIDEBAR_CONTENT_STYLE_ID);
	if (!getHiddenSidebarItemIds().length) {
		existing?.remove();
		return;
	}
	let style = existing;
	if (!(style instanceof HTMLStyleElement)) {
		style = document.createElement("style");
		style.id = RP_SIDEBAR_CONTENT_STYLE_ID;
		document.documentElement.appendChild(style);
	}
	style.textContent = buildHideStyle();
}

function restoreMenuIcons() {
	document.querySelectorAll("span.icon-nav-menu").forEach((span) => {
		if (!(span instanceof HTMLElement)) return;
		const original = ORIGINAL_MENU_ICON_CONTENT.get(span);
		if (original instanceof DocumentFragment) {
			span.replaceChildren(original.cloneNode(true));
			ORIGINAL_MENU_ICON_CONTENT.delete(span);
		}
		span.classList.remove("roprime-icon-nav-menu-replaced");
	});
}

function applyMenuOpenIcon() {
	document.querySelectorAll("span.icon-nav-menu").forEach((span) => {
		if (!(span instanceof HTMLElement)) return;
		if (!ORIGINAL_MENU_ICON_CONTENT.has(span)) {
			const original = document.createDocumentFragment();
			original.append(...Array.from(span.childNodes).map((node) => node.cloneNode(true)));
			ORIGINAL_MENU_ICON_CONTENT.set(span, original);
		}
		span.innerHTML = MENU_OPEN_ICON_SVG;
		span.classList.add("roprime-icon-nav-menu-replaced");
	});
}

function toggleFullToIconSidebar() {
	const next = settingsState.sidebarSize === "icon" ? "full" : "icon";
	settingsState.sidebarSize = next;
	settingsState.smallNewNavigationBarEnabled = false;
	settingsState.sidebarIconsOnlyEnabled = next === "icon";
	saveSettings();
	updateSmallNewNavVisibility();
	updateSidebarCompactVisibility();
	syncSidebarCompactDecorations();
	syncSidebarContent();
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
			const span = target.closest("span.icon-nav-menu");
			if (!(span instanceof HTMLElement)) return;
			if (!span.classList.contains("roprime-icon-nav-menu-replaced")) return;
			event.preventDefault();
			event.stopImmediatePropagation();
			toggleFullToIconSidebar();
		},
		true,
	);
}

export function syncSidebarCollapseMenuIcon() {
	bindCollapseMenuHandler();
	if (!settingsState.sidebarCollapseMenuEnabled) {
		restoreMenuIcons();
		return;
	}
	applyMenuOpenIcon();
}

export function syncSidebarContent() {
	const nav = getLeftNav();
	if (nav) tagSidebarNavItems(nav);
	updateSidebarHideStyle();
	syncSidebarCollapseMenuIcon();
}
