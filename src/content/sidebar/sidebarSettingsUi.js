import {
  getActiveSidebarSize,
  normalizeSidebarSizeMode,
} from "../core/core.js";
import { t as accountSettingsPaneT } from "../settings/roprimeAccountSettingsPage.js";
import {
  discoverSidebarNavItems,
  hideSidebarItem,
  isSidebarItemHidden,
  resetSidebarItemsForMode,
  restoreSidebarItem,
} from "./sidebarContent.js";
import { sidebarItemLabelKey } from "./sidebarItemLabels.js";
import { ADD_ICON_SVG, DELETE_ICON_SVG } from "./sidebarIcons.js";
import { setHidden } from "../ui/visibility.js";

const SIDEBAR_SIZE_TITLE_KEYS = {
  full: "settings.appearance.sidebar.sizeFull",
  small: "settings.appearance.sidebar.sizeSmall",
  icon: "settings.appearance.sidebar.sizeIconOnly",
};

const SIDEBAR_SIZE_CONTROL_INNER =
  '<div class="roprime-sidebar-size-box"><div class="roprime-sidebar-size-rail"><input id="{{id}}" class="roprime-sidebar-size-slider" type="range" min="0" max="100" step="0.1" value="0" data-i18n-aria-label="settings.appearance.sidebar.sizeTitle" /></div><div class="roprime-sidebar-size-footer"><div class="roprime-sidebar-size-ticks"><button class="roprime-sidebar-size-tick" type="button" data-size-mode="full"><span data-i18n="settings.appearance.sidebar.sizeFull"></span></button><button class="roprime-sidebar-size-tick" type="button" data-size-mode="small"><span data-i18n="settings.appearance.sidebar.sizeSmall"></span></button><button class="roprime-sidebar-size-tick" type="button" data-size-mode="icon"><span data-i18n="settings.appearance.sidebar.sizeIconOnly"></span></button></div><button type="button" class="roprime-sidebar-configure-btn" data-roprime-open-sidebar-content data-i18n="settings.appearance.sidebar.configureContent"></button></div><div class="roprime-sidebar-size-warning" data-roprime-sidebar-empty-warning hidden><span class="roprime-sidebar-size-warning-text">No sidebar items visible.</span></div></div>';

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
  const key = sidebarItemLabelKey(item.id);
  const translated = accountSettingsPaneT(key);
  return translated && translated !== key ? translated : item.label;
}

function buildSidebarContentRowHtml(item, mode, sizeMode) {
  const label = sidebarItemLabel(item);
  const sizeAttr = ` data-roprime-sidebar-size="${sizeMode}"`;
  if (mode === "add") {
    return `<div class="roprime-sidebar-content-row is-removed-item" data-roprime-sidebar-content-row="${item.id}"><span class="roprime-sidebar-content-row-label">${label}</span><button type="button" class="roprime-sidebar-content-add" data-roprime-sidebar-add="${item.id}"${sizeAttr} data-i18n-aria-label="settings.appearance.sidebar.contentRestoreItem">${ADD_ICON_SVG}</button></div>`;
  }
  return `<div class="roprime-sidebar-content-row" data-roprime-sidebar-content-row="${item.id}"><span class="roprime-sidebar-content-row-label">${label}</span><button type="button" class="roprime-sidebar-content-delete" data-roprime-sidebar-delete="${item.id}"${sizeAttr} data-i18n-aria-label="settings.appearance.sidebar.contentRemoveItem">${DELETE_ICON_SVG}</button></div>`;
}

function buildSidebarContentSectionHtml(sizeMode) {
  const mode = normalizeSidebarSizeMode(sizeMode);
  const titleKey =
    SIDEBAR_SIZE_TITLE_KEYS[mode] || SIDEBAR_SIZE_TITLE_KEYS.full;
  const items = discoverSidebarNavItems(mode);
  if (!items.length) {
    return "";
  }
  const visible = items.filter((item) => !isSidebarItemHidden(item.id, mode));
  const hidden = items.filter((item) => isSidebarItemHidden(item.id, mode));
  const parts = visible.map((item) =>
    buildSidebarContentRowHtml(item, "remove", mode),
  );
  if (hidden.length) {
    parts.push(
      '<div class="roprime-sidebar-content-divider" role="separator"></div>',
    );
    parts.push(
      ...hidden.map((item) => buildSidebarContentRowHtml(item, "add", mode)),
    );
  }
  return `
		<div class="roprime-sidebar-content-size-section" data-roprime-sidebar-size-section="${mode}">
			<h4 class="roprime-sidebar-content-size-title" data-i18n="${titleKey}"></h4>
			<div class="roprime-sidebar-content-size-rows">${parts.join("")}</div>
		</div>`;
}

export function buildSidebarContentListHtml(sizeMode = getActiveSidebarSize()) {
  const section = buildSidebarContentSectionHtml(sizeMode);
  if (!section) {
    return `<p class="roprime-sidebar-content-empty" data-i18n="settings.appearance.sidebar.contentEmptyHint"></p>`;
  }
  return section;
}

export function refreshSidebarContentList(inner) {
  const list = inner.querySelector("[data-roprime-sidebar-content-list]");
  if (!(list instanceof HTMLElement)) return;
  list.innerHTML = buildSidebarContentListHtml();
  bindSidebarContentList(inner);
  refreshSidebarSizeWarnings(inner);
}

function visibleSidebarItemsCount(sizeMode = getActiveSidebarSize()) {
  return discoverSidebarNavItems(sizeMode).filter(
    (item) => !isSidebarItemHidden(item.id, sizeMode),
  ).length;
}

export function refreshSidebarSizeWarnings(inner) {
  const mode = normalizeSidebarSizeMode(getActiveSidebarSize());
  const noVisibleItems = visibleSidebarItemsCount(mode) === 0;
  inner
    .querySelectorAll(".roprime-sidebar-empty-warning")
    .forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      setHidden(node, !noVisibleItems);
      node.setAttribute("aria-hidden", noVisibleItems ? "false" : "true");
    });
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
      const sizeMode = btn.getAttribute("data-roprime-sidebar-size") || "full";
      if (!itemId || isSidebarItemHidden(itemId, sizeMode)) return;
      hideSidebarItem(itemId, sizeMode);
      refreshSidebarContentList(inner);
    });
  });
  list.querySelectorAll("[data-roprime-sidebar-add]").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    if (btn.getAttribute("data-roprime-sidebar-add-bound") === "1") return;
    btn.setAttribute("data-roprime-sidebar-add-bound", "1");
    btn.addEventListener("click", () => {
      const itemId = btn.getAttribute("data-roprime-sidebar-add") || "";
      const sizeMode = btn.getAttribute("data-roprime-sidebar-size") || "full";
      if (!itemId || !isSidebarItemHidden(itemId, sizeMode)) return;
      restoreSidebarItem(itemId, sizeMode);
      refreshSidebarContentList(inner);
    });
  });
  inner.querySelectorAll("[data-roprime-sidebar-reset]").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    if (btn.getAttribute("data-roprime-sidebar-reset-bound") === "1") return;
    btn.setAttribute("data-roprime-sidebar-reset-bound", "1");
    btn.addEventListener("click", () => {
      resetSidebarItemsForMode(getActiveSidebarSize());
      refreshSidebarContentList(inner);
    });
  });
  refreshSidebarSizeWarnings(inner);
}
