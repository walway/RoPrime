import {
  getActiveSidebarSize,
  normalizeSidebarSizeMode,
} from "../core/core.js";
import { t as accountSettingsPaneT } from "../settings/translationsHook.js";
import { createControlButton } from "../ui/controlButton.js";
import {
  discoverSidebarNavItems,
  hideSidebarItem,
  isSidebarItemHidden,
  resetSidebarItemsForMode,
  restoreSidebarItem,
} from "./sidebarContent.js";
import { sidebarItemLabelKey } from "./sidebarItemLabels.js";

const SIDEBAR_SIZE_TITLE_KEYS = {
  full: "settings.appearance.sidebar.sizeFull",
  small: "settings.appearance.sidebar.sizeSmall",
  icon: "settings.appearance.sidebar.sizeIconOnly",
};

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function setI18n(node, key) {
  if (!key) return node;
  node._rpI18n = key;
  node.classList.add("roprime-i18n");
  node.textContent = accountSettingsPaneT(key);
  return node;
}

function setI18nAria(node, key) {
  if (!key) return;
  node.setAttribute("data-i18n-aria-label", key);
  node.setAttribute("aria-label", accountSettingsPaneT(key));
}

export function buildSidebarSizeControlHtml(
  sliderId = "roprime-sidebar-size-slider",
) {
  return `<div class="roprime-sidebar-size-control"><div class="roprime-sidebar-size-box"><div class="roprime-sidebar-size-rail"><input id="${sliderId}" class="roprime-sidebar-size-slider" type="range" min="0" max="100" step="0.1" value="0" data-i18n-aria-label="settings.appearance.sidebar.sizeTitle" /></div><div class="roprime-sidebar-size-footer"><div class="roprime-sidebar-size-ticks"><button class="roprime-sidebar-size-tick" type="button" data-size-mode="full"><span data-i18n="settings.appearance.sidebar.sizeFull"></span></button><button class="roprime-sidebar-size-tick" type="button" data-size-mode="small"><span data-i18n="settings.appearance.sidebar.sizeSmall"></span></button><button class="roprime-sidebar-size-tick" type="button" data-size-mode="icon"><span data-i18n="settings.appearance.sidebar.sizeIconOnly"></span></button></div><button type="button" class="roprime-sidebar-configure-btn" data-roprime-open-sidebar-content data-i18n="settings.appearance.sidebar.configureContent"></button></div></div></div>`;
}

function sidebarItemLabel(item) {
  const key = sidebarItemLabelKey(item.id);
  const translated = accountSettingsPaneT(key);
  return translated && translated !== key ? translated : item.label;
}

function buildSidebarContentRow(item, mode, isAdd) {
  const row = el(
    "div",
    isAdd
      ? "roprime-sidebar-content-row is-removed-item"
      : "roprime-sidebar-content-row",
  );
  row.dataset.roprimeSidebarContentRow = item.id;

  const label = el("span", "roprime-sidebar-content-row-label");
  label.textContent = sidebarItemLabel(item);

  const btn = createControlButton(null, {
    literalText: isAdd ? "Add" : "Delete",
  });
  btn.type = "button";
  btn.classList.add(
    "roprime-sidebar-content-action-btn",
    isAdd ? "roprime-sidebar-content-add" : "roprime-sidebar-content-delete",
  );
  if (isAdd) btn.dataset.roprimeSidebarAdd = item.id;
  else btn.dataset.roprimeSidebarDelete = item.id;
  btn.dataset.roprimeSidebarSize = mode;
  setI18nAria(
    btn,
    isAdd
      ? "settings.appearance.sidebar.contentRestoreItem"
      : "settings.appearance.sidebar.contentRemoveItem",
  );

  row.append(label, btn);
  return row;
}

function buildSidebarContentSection(sizeMode) {
  const mode = normalizeSidebarSizeMode(sizeMode);
  const titleKey =
    SIDEBAR_SIZE_TITLE_KEYS[mode] || SIDEBAR_SIZE_TITLE_KEYS.full;
  const items = discoverSidebarNavItems(mode);
  if (!items.length) return null;

  const visible = items.filter((item) => !isSidebarItemHidden(item.id, mode));
  const hidden = items.filter((item) => isSidebarItemHidden(item.id, mode));

  const section = el("div", "roprime-sidebar-content-size-section");
  section.dataset.roprimeSidebarSizeSection = mode;
  section.appendChild(
    setI18n(el("h4", "roprime-sidebar-content-size-title"), titleKey),
  );

  const rows = el("div", "roprime-sidebar-content-size-rows");
  for (const item of visible) rows.appendChild(buildSidebarContentRow(item, mode, false));
  if (hidden.length) {
    const divider = el("div", "roprime-sidebar-content-divider");
    divider.setAttribute("role", "separator");
    rows.appendChild(divider);
    for (const item of hidden) rows.appendChild(buildSidebarContentRow(item, mode, true));
  }
  section.appendChild(rows);
  return section;
}

function buildSidebarContentList(sizeMode = getActiveSidebarSize()) {
  const section = buildSidebarContentSection(sizeMode);
  if (!section) {
    const empty = el("p", "roprime-sidebar-content-empty");
    setI18n(empty, "settings.appearance.sidebar.contentEmptyHint");
    return empty;
  }
  return section;
}

export function refreshSidebarContentList(inner) {
  const list = inner.querySelector("[data-roprime-sidebar-content-list]");
  if (!(list instanceof HTMLElement)) return;
  list.textContent = "";
  list.appendChild(buildSidebarContentList());
  bindSidebarContentList(inner);
}

function bindSidebarContentList(inner) {
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
}
