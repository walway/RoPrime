import { t as accountSettingsPaneT } from "../settings/roprimeAccountSettingsPage.js";
import {
	discoverSidebarNavItems,
	hideSidebarItem,
	isSidebarItemHidden,
	restoreSidebarItem,
} from "./sidebarContent.js";
import { ADD_ICON_SVG, DELETE_ICON_SVG } from "./sidebarIcons.js";

const SIDEBAR_SIZE_CONTROL_INNER =
	'<div class="roprime-sidebar-size-box"><div class="roprime-sidebar-size-rail"><input id="{{id}}" class="roprime-sidebar-size-slider" type="range" min="0" max="100" step="0.1" value="0" data-i18n-aria-label="Sidebar size title" /></div><div class="roprime-sidebar-size-footer"><div class="roprime-sidebar-size-ticks"><button class="roprime-sidebar-size-tick" type="button" data-size-mode="full"><span data-i18n="Sidebar size full"></span></button><button class="roprime-sidebar-size-tick" type="button" data-size-mode="small"><span data-i18n="Sidebar size small"></span></button><button class="roprime-sidebar-size-tick" type="button" data-size-mode="icon"><span data-i18n="Sidebar size icon only"></span></button></div><button type="button" class="roprime-sidebar-configure-btn" data-roprime-open-sidebar-content data-i18n="Configure sidebar content"></button></div></div>';

export function buildSidebarSizeControlHtml(
	sliderId = "roprime-sidebar-size-slider",
) {
	const inner = SIDEBAR_SIZE_CONTROL_INNER.replace(
		/\{\{id\}\}/g,
		sliderId,
	).replace(/motion\.div/g, "div");
	return `<div class="roprime-sidebar-size-control">${inner}</div>`.replace(
		/motion\.div/g,
		"div",
	);
}

function sidebarItemLabel(item) {
	const key = `Sidebar item ${item.id} label`;
	const translated = accountSettingsPaneT(key);
	return translated && translated !== key ? translated : item.label;
}

function buildSidebarContentRowHtml(item, mode) {
	const label = sidebarItemLabel(item);
	if (mode === "add") {
		return `<div class="roprime-sidebar-content-row is-removed-item" data-roprime-sidebar-content-row="${item.id}"><span class="roprime-sidebar-content-row-label">${label}</span><button type="button" class="roprime-sidebar-content-add" data-roprime-sidebar-add="${item.id}" data-i18n-aria-label="Sidebar content restore item">${ADD_ICON_SVG}</button></div>`;
	}
	return `<div class="roprime-sidebar-content-row" data-roprime-sidebar-content-row="${item.id}"><span class="roprime-sidebar-content-row-label">${label}</span><button type="button" class="roprime-sidebar-content-delete" data-roprime-sidebar-delete="${item.id}" data-i18n-aria-label="Sidebar content remove item">${DELETE_ICON_SVG}</button></div>`;
}

export function buildSidebarContentListHtml() {
	const items = discoverSidebarNavItems();
	if (!items.length) {
		return `<p class="roprime-sidebar-content-empty" data-i18n="Sidebar content empty hint"></p>`;
	}
	const visible = items.filter((item) => !isSidebarItemHidden(item.id));
	const hidden = items.filter((item) => isSidebarItemHidden(item.id));
	const parts = visible.map((item) =>
		buildSidebarContentRowHtml(item, "remove"),
	);
	if (hidden.length) {
		parts.push(
			'<div class="roprime-sidebar-content-divider" role="separator"></div>',
		);
		parts.push(
			...hidden.map((item) => buildSidebarContentRowHtml(item, "add")),
		);
	}
	return parts.join("");
}

export function refreshSidebarContentList(inner) {
	const list = inner.querySelector("[data-roprime-sidebar-content-list]");
	if (!(list instanceof HTMLElement)) return;
	list.innerHTML = buildSidebarContentListHtml();
	bindSidebarContentList(inner);
}

export function bindSidebarContentList(inner) {
	const list = inner.querySelector("[data-roprime-sidebar-content-list]");
	if (!(list instanceof HTMLElement)) return;
	list.querySelectorAll("[data-roprime-sidebar-delete]").forEach((btn) => {
		if (!(btn instanceof HTMLButtonElement)) return;
		if (btn.getAttribute("data-roprime-sidebar-delete-bound") === "1") return;
		btn.setAttribute("data-roprime-sidebar-delete-bound", "1");
		btn.addEventListener("click", () => {
			const itemId = btn.getAttribute("data-roprime-sidebar-delete") || "";
			if (!itemId || isSidebarItemHidden(itemId)) return;
			hideSidebarItem(itemId);
			refreshSidebarContentList(inner);
		});
	});
	list.querySelectorAll("[data-roprime-sidebar-add]").forEach((btn) => {
		if (!(btn instanceof HTMLButtonElement)) return;
		if (btn.getAttribute("data-roprime-sidebar-add-bound") === "1") return;
		btn.setAttribute("data-roprime-sidebar-add-bound", "1");
		btn.addEventListener("click", () => {
			const itemId = btn.getAttribute("data-roprime-sidebar-add") || "";
			if (!itemId || !isSidebarItemHidden(itemId)) return;
			restoreSidebarItem(itemId);
			refreshSidebarContentList(inner);
		});
	});
}
