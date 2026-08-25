import { minimalEditor } from "prism-code-editor/setups";
import "prism-code-editor/languages/css";
import "prism-code-editor/prism/languages/css";
import { langList } from "../../i18n/i18n-config.js";
import {
  promptCustomCssCautionNotice,
  promptProfileEffectsSupportNotice,
} from "../alerts/alert.js";
import { showMaliciousPluginOverlay } from "../ui/overlay.js";
import { syncAccountSettingsMenuButton } from "../redirect/settingsButton.js";
import {
  buildPluginUrl,
  getCurrentrp,
  getActiveSidebarSize,
  getStorageApi,
  isExtensionContextAlive,
  isMyAccountPath,
  isPluginRoute,
  mergeStoredSettings,
  normalizeSearchBannedWords,
  normalizeSidebarSizeMode,
  reloadSettingsUiStrings,
  resetSettingsToDefaults,
  RP_DEFAULT_PAGE,
  RP_SETTINGS_KEY,
  saveSettings,
  serializeSettingsPayload,
  setAccountSettingsShellClass,
  settingsState,
  syncAccountSettingsLayoutInset,
} from "../core/core.js";
import { syncCustomCss } from "../features/customCss.js";
import { syncAllFeatures } from "../features/registry.js";
import { syncSearchBan } from "../features/searchBan.js";
import { updateDocumentTitle } from "../panel/pageChrome.js";
import { syncRoPrimeView } from "../panel/panel.js";
import { hydrateProfilePictureEffectAvatars } from "../profile/profileEffectAvatar.js";
import {
  getAllProfileEffectIds,
  getProfileEffectById,
  getProfileEffectShopEmbedSrc,
  PROFILE_EFFECTS,
  PROFILE_PICTURE_EFFECTS,
} from "../profile/profileEffectsCatalog.js";
import {
  equipSlotForKind,
  getRobloxUserId,
  isSupabaseProfileEffectsEnabled,
  normalizeEquippedEntry,
  registerProfileEffectEquip,
  registerProfileEffectPurchase,
  syncOwnedEffectsFromRegistry,
} from "../profile/profileEffectsRegistry.js";
import {
  discoverSidebarNavItems,
  hideSidebarItem,
  isSidebarItemHidden,
  resetSidebarItemsForMode,
  restoreSidebarItem,
} from "../sidebar/sidebarContent.js";
import { syncSidebarContent } from "../sidebar/sidebarContent.js";
import { sidebarItemLabelKey } from "../sidebar/sidebarItemLabels.js";
import { ADD_ICON_SVG, DELETE_ICON_SVG } from "../sidebar/sidebarIcons.js";
import { setHidden } from "../ui/visibility.js";
import { createToggle, setToggleChecked } from "../ui/toggle.js";
import {
  createMarkedSlider,
  setSliderDisabled,
  setSliderValue,
} from "../ui/slider.js";
import { t as accountSettingsPaneT } from "./roprimeAccountSettingsPage.js";
import {
  clearSettingsPageLayout,
  resolveSettingsMountHost,
} from "./settingsPageHost.js";
import { SETTINGS_CONFIG } from "./settingsConfig.js";
import {
  createSettingsNavIcon,
  SETTINGS_NAV_ICONS,
} from "./settingsNavIcons.js";
const extensionApi = globalThis.browser || globalThis.chrome;
const RP_DEBUG_UNLOCK = "debug";
const RP_SETTINGS_HOST_ID = "roprime-settings-host";
const RP_SETTINGS_PAGE_CLASS = "roprime-settings-page";

const SYNC_EXCLUDED_KEYS = [
  "ownedProfileEffects",
  "equippedProfileEffect",
  "equippedProfilePictureEffect",
  "equippedProfilePageEffect",
  "profileEffectsEquippedByUser",
  "customCss",
  "customCssCautionAccepted",
  "hideAgeBadgeEnabled",
];

const PROFILE_EFFECT_LAYOUTS = ["grid", "list", "wide"];

const SIDEBAR_SIZE_TITLE_KEYS = {
  full: "settings.appearance.sidebar.sizeFull",
  small: "settings.appearance.sidebar.sizeSmall",
  icon: "settings.appearance.sidebar.sizeIconOnly",
};

let cssEditor = null;
let cssEditorHost = null;
let cachedAuthUserId = null;
let registrySyncPromise = null;

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function appendSvgMarkup(parent, markup) {
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  const node = doc.documentElement;
  if (node && node.tagName.toLowerCase() !== "parsererror") {
    parent.appendChild(node);
  }
}

function setI18n(node, key) {
  if (key) {
    node._rpI18n = key;
    node.classList.add("roprime-i18n");
    node.textContent = accountSettingsPaneT(key);
  }
  return node;
}

function setI18nPlaceholder(node, key) {
  if (key) {
    node._rpI18nPlaceholder = key;
    node.classList.add("roprime-i18n");
    node.placeholder = accountSettingsPaneT(key);
  }
  return node;
}

function setI18nAria(node, key) {
  if (key) {
    node._rpI18nAria = key;
    node.classList.add("roprime-i18n");
    node.setAttribute("aria-label", accountSettingsPaneT(key));
  }
  return node;
}

function getSettingsHostRoot(node) {
  const host = document.getElementById(RP_SETTINGS_HOST_ID);
  if (host instanceof HTMLElement) return host;
  if (node instanceof HTMLElement) return node;
  return null;
}

function applyI18n(root) {
  root.querySelectorAll(".roprime-i18n").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (node._rpI18n) node.textContent = accountSettingsPaneT(node._rpI18n);
    if (
      node._rpI18nPlaceholder &&
      (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement)
    ) {
      node.placeholder = accountSettingsPaneT(node._rpI18nPlaceholder);
    }
    if (node._rpI18nAria) {
      node.setAttribute("aria-label", accountSettingsPaneT(node._rpI18nAria));
    }
  });
}

function getSettingKeyFromToggle(toggleEl) {
  if (!(toggleEl instanceof HTMLElement)) return null;
  for (const cls of toggleEl.classList) {
    if (cls.startsWith("roprime-setting--")) {
      return cls.slice("roprime-setting--".length);
    }
  }
  return null;
}

function querySettingToggle(root, key) {
  return root.querySelector(
    `.roprime-setting-toggle.roprime-setting--${key}`,
  );
}

function getSettingsPageKey(pageEl) {
  if (!(pageEl instanceof HTMLElement)) return "";
  for (const cls of pageEl.classList) {
    if (cls.startsWith("roprime-settings-page--")) {
      return cls.slice("roprime-settings-page--".length);
    }
  }
  return "";
}

function getNavPageKey(li) {
  if (!(li instanceof HTMLElement)) return "";
  for (const cls of li.classList) {
    if (cls.startsWith("roprime-nav-page--")) {
      return cls.slice("roprime-nav-page--".length);
    }
  }
  return "";
}

function setSidebarSizeModeClass(root, mode) {
  if (!(root instanceof HTMLElement)) return;
  for (const cls of [...root.classList]) {
    if (cls.startsWith("roprime-sidebar-size--")) root.classList.remove(cls);
  }
  root.classList.add(`roprime-sidebar-size--${mode}`);
}

function isDeveloperPageUnlocked() {
  return !!settingsState.developerPageUnlocked;
}

function createControlButton(textKey, attrs = {}) {
  const btn = el("button", "btn-control-md");
  btn.type = "button";
  setI18n(btn, textKey);
  for (const [key, value] of Object.entries(attrs)) {
    btn.setAttribute(key, value);
  }
  return btn;
}

function sidebarModeValues() {
  return { full: 0, small: 50, icon: 100 };
}

function sidebarModeForValue(raw) {
  const value = Number(raw);
  if (Number.isNaN(value)) return "full";
  if (value < 25) return "full";
  if (value < 75) return "small";
  return "icon";
}

function sidebarValueForMode(mode) {
  return sidebarModeValues()[mode] ?? sidebarModeValues().full;
}

function currentUiLanguageCode() {
  const s = String(settingsState.language || "en").toLowerCase();
  return s in langList ? s : "en";
}

function findNativeAccountBase() {
  const el = document.querySelector("#user-account > #react-user-account-base");
  return el instanceof HTMLElement ? el : null;
}

function setNativeAccountBaseHidden(hidden) {
  const native = findNativeAccountBase();
  if (!(native instanceof HTMLElement)) return;
  if (hidden) {
    if (!native.hasAttribute("data-roprime-native-hidden")) {
      native.setAttribute("data-roprime-native-hidden", "1");
      native.setAttribute(
        "data-roprime-native-prev-display",
        native.style.display || "",
      );
      native.style.display = "none";
    }
  } else if (native.getAttribute("data-roprime-native-hidden") === "1") {
    native.style.display =
      native.getAttribute("data-roprime-native-prev-display") || "";
    native.removeAttribute("data-roprime-native-hidden");
    native.removeAttribute("data-roprime-native-prev-display");
  }
}

function setSettingsHostVisible(visible) {
  const host = document.getElementById(RP_SETTINGS_HOST_ID);
  if (!(host instanceof HTMLElement)) return;
  host.classList.toggle("hidden", !visible);
  setNativeAccountBaseHidden(visible);
}

function ensureSettingsHost() {
  const userAccount = document.getElementById("user-account");
  if (!(userAccount instanceof HTMLElement)) return null;

  let host = document.getElementById(RP_SETTINGS_HOST_ID);
  if (host instanceof HTMLElement) return host;

  host = el("div");
  host.id = RP_SETTINGS_HOST_ID;
  host.className = "hidden roprime-settings-host";
  buildSettingsHostContent(host);
  userAccount.appendChild(host);
  return host;
}

function buildSettingsHostContent(host) {
  const heading = el("h1");
  heading.textContent = "RoPrime Settings";
  host.appendChild(heading);

  const settingsContainer = el("div");
  settingsContainer.id = "settings-container";

  const leftNav = el("div", "settings-left-navigation");

  const navList = el("ul", "menu-vertical");
  navList.setAttribute("role", "tablist");

  const searchItem = el("li", "menu-option roprime-settings-search-item");
  searchItem.id = "roprime-settings-search-item";
  searchItem.setAttribute("role", "tab");
  searchItem.appendChild(createSettingsNavIcon(SETTINGS_NAV_ICONS.search));
  const search = el("input");
  search.id = "roprime-settings-search";
  search.type = "search";
  search.className = "roprime-settings-search";
  setI18nPlaceholder(search, "settings.search.placeholder");
  search.autocomplete = "off";
  searchItem.appendChild(search);

  for (const [pageKey, pageCfg] of Object.entries(SETTINGS_CONFIG)) {
    if (pageCfg.nav === false) continue;
    const li = el("li", `menu-option roprime-nav-page roprime-nav-page--${pageKey}`);
    li.setAttribute("role", "tab");
    if (pageCfg.hide) setHidden(li, true);

    const link = el("a", "menu-option-content");
    link.href = buildPluginUrl(pageKey);
    const iconName = pageCfg.icon || SETTINGS_NAV_ICONS[pageKey];
    if (iconName) link.appendChild(createSettingsNavIcon(iconName));
    const label = el("span", "font-caption-header roprime-i18n");
    setI18n(label, pageCfg.title);
    link.appendChild(label);
    li.appendChild(link);
    navList.appendChild(li);
  }

  navList.insertBefore(searchItem, navList.firstChild);

  const tabContent = el("div", "tab-content rbx-tab-content");
  const tabPane = el("div", "tab-pane active");
  tabPane.setAttribute("role", "tabpanel");
  const containerV2 = el("div", "settings-container-v2");
  const header = el("div", "settings-v2-header");
  header.id = "rbx-account-info-settings-header";

  const pageTitle = el("h2");
  pageTitle.id = "roprime-page-title";
  header.appendChild(pageTitle);

  for (const pageKey of Object.keys(SETTINGS_CONFIG)) {
    const pageWrap = el("div", `${RP_SETTINGS_PAGE_CLASS} roprime-settings-page--${pageKey}`);
    setHidden(pageWrap, true);
    renderPageContent(pageWrap, pageKey);
    header.appendChild(pageWrap);
  }

  const searchHint = el("div", "roprime-search-hint roprime-i18n");
  searchHint.id = "roprime-search-hint";
  setI18n(searchHint, "settings.search.minLengthHint");

  const devHint = el("div", "roprime-search-hint roprime-i18n hidden");
  devHint.id = "roprime-developer-unlock-message";
  setI18n(devHint, "settings.search.developerUnlockedHint");

  containerV2.append(header, searchHint, devHint);
  tabPane.appendChild(containerV2);
  tabContent.appendChild(tabPane);

  leftNav.append(navList, tabContent);
  settingsContainer.appendChild(leftNav);
  host.appendChild(settingsContainer);
}

const SETTINGS_CARD_CLASS =
  "bg-surface-300 padding-large flex flex-col gap-medium";

function createSettingsCardShell() {
  return el("div", `${SETTINGS_CARD_CLASS} roprime-settings-card`);
}

function createSettingsCardHeaderSeparator() {
  const separator = el("div");
  separator.setAttribute("role", "separator");
  separator.setAttribute("data-orientation", "horizontal");
  separator.setAttribute("aria-orientation", "horizontal");
  separator.className = "stroke-default self-stretch";
  separator.style.cssText =
    "border-right-width: 0px; border-bottom-width: 0px; box-sizing: border-box; border-style: solid; height: 0px; border-top-width: var(--stroke-standard); border-left-width: 0px;";
  return separator;
}

function createSettingsCardHeaderRow(titleKey, trailing = null) {
  const headerRow = el("div", "flex justify-between items-center");
  const title = el("span", "text-title-large content-emphasis roprime-i18n");
  setI18n(title, titleKey);
  headerRow.appendChild(title);
  if (trailing) headerRow.appendChild(trailing);
  return headerRow;
}

function createSettingsCardDescription(descKey) {
  const desc = el("p", "text-body-large content-default roprime-i18n");
  if (descKey) setI18n(desc, descKey);
  return desc;
}

function createSettingsCard({ title, description, trailing, extraContent }) {
  const card = createSettingsCardShell();
  card.append(
    createSettingsCardHeaderRow(title, trailing),
    createSettingsCardHeaderSeparator(),
  );
  if (description) card.appendChild(createSettingsCardDescription(description));
  if (extraContent) card.appendChild(extraContent);
  return card;
}

function createSettingSection(innerContent) {
  const card = createSettingsCardShell();
  if (innerContent) card.appendChild(innerContent);
  return card;
}

function createToggleSection(item) {
  const toggle = createToggle({
    id: item.id || `roprime-toggle-${item.key}`,
    checked: !!settingsState[item.key],
    ariaLabel: accountSettingsPaneT(item.title),
  });
  toggle.classList.add("roprime-setting-toggle", `roprime-setting--${item.key}`);
  if (item.parent) {
    toggle.classList.add(
      "roprime-setting-child",
      `roprime-setting-child--${item.parent}`,
    );
    if (item.parent === "renameDropdownEnabled") {
      toggle.classList.add("roprime-rename-child");
    }
  }

  return createSettingsCard({
    title: item.title,
    description: item.description,
    trailing: toggle,
  });
}

function createSidebarInlineToggleRow(item) {
  const row = el(
    "div",
    `flex justify-between items-center roprime-sidebar-inline-toggle roprime-sidebar-inline-toggle--${item.key}`,
  );

  const copy = el("div", "flex flex-col gap-xsmall");
  const title = el("span", "text-title-large content-emphasis roprime-i18n");
  setI18n(title, item.title);
  copy.appendChild(title);
  if (item.description) {
    const desc = el("p", "text-body-large content-default roprime-i18n");
    setI18n(desc, item.description);
    copy.appendChild(desc);
  }

  const toggle = createToggle({
    id: item.id || `roprime-toggle-${item.key}`,
    checked: !!settingsState[item.key],
    ariaLabel: accountSettingsPaneT(item.title),
  });
  toggle.classList.add("roprime-setting-toggle", `roprime-setting--${item.key}`);

  row.append(copy, toggle);
  return row;
}

function buildSidebarSizeRow(item) {
  const sizeRow = el("div", "flex justify-between items-center gap-medium");
  const sizeCopy = el("div", "flex flex-col gap-xsmall");
  const sizeTitle = el("span", "text-title-large content-emphasis roprime-i18n");
  setI18n(sizeTitle, item.title || "settings.appearance.sidebar.sizeTitle");
  const sizeDesc = el("p", "text-body-large content-default roprime-i18n");
  setI18n(
    sizeDesc,
    item.description || "settings.appearance.sidebar.sizeDescription",
  );
  sizeCopy.append(sizeTitle, sizeDesc);

  const mv = sidebarModeValues();
  const slider = createMarkedSlider({
    id: "roprime-sidebar-size-slider",
    min: mv.full,
    max: mv.icon,
    step: 1,
    value: sidebarValueForMode(settingsState.sidebarSize || "full"),
    marks: [
      {
        value: mv.full,
        label: accountSettingsPaneT("settings.appearance.sidebar.sizeFull"),
      },
      {
        value: mv.small,
        label: accountSettingsPaneT("settings.appearance.sidebar.sizeSmall"),
      },
      {
        value: mv.icon,
        label: accountSettingsPaneT("settings.appearance.sidebar.sizeIconOnly"),
      },
    ],
    ariaLabel: accountSettingsPaneT(
      item.title || "settings.appearance.sidebar.sizeTitle",
    ),
  });
  slider.classList.add("roprime-sidebar-size-slider");

  const sliderWrap = el("div", "roprime-sidebar-size-slider-wrap");
  sliderWrap.appendChild(slider);
  sizeRow.append(sizeCopy, sliderWrap);
  return sizeRow;
}

function buildSidebarContentButtonRow(item) {
  const contentRow = el("div", "flex justify-between items-center gap-medium");
  const contentLabel = el("span", "text-title-large content-emphasis roprime-i18n");
  setI18n(
    contentLabel,
    item.title || "settings.appearance.sidebar.contentTitle",
  );
  const configureBtn = createControlButton(
    item.button || "settings.appearance.sidebar.configureContent",
  );
  configureBtn.classList.add(
    "roprime-sidebar-configure-btn",
    "roprime-open-sidebar-content",
  );
  contentRow.append(contentLabel, configureBtn);
  return contentRow;
}

function buildCardItem(item) {
  if (!item || typeof item !== "object") return null;
  if (item.type === "separator") return createSettingsCardHeaderSeparator();
  if (item.type === "sidebarSize") return buildSidebarSizeRow(item);
  if (item.type === "sidebarContent") return buildSidebarContentButtonRow(item);
  if (item.type === "toggle") return createSidebarInlineToggleRow(item);
  return null;
}

function buildConfigCard(cardCfg) {
  const card = createSettingsCardShell();
  if (cardCfg.id) card.classList.add(`roprime-${cardCfg.id}-panel`);
  if (cardCfg.title) {
    card.append(
      createSettingsCardHeaderRow(cardCfg.title),
      createSettingsCardHeaderSeparator(),
    );
  }
  for (const item of cardCfg.items || []) {
    const node = buildCardItem(item);
    if (node instanceof HTMLElement) card.appendChild(node);
  }
  if (cardCfg.id === "sidebar") {
    const warning = el("div", "roprime-sidebar-empty-warning hidden");
    const warningText = el("span", "text-body-medium content-default");
    setI18n(warningText, "settings.appearance.sidebar.emptyWarning");
    warning.appendChild(warningText);
    card.appendChild(warning);
  }
  return card;
}

const CUSTOM_BUILDERS = {
  sidebarContentBack: () => {
    const btn = createControlButton("settings.appearance.sidebar.contentBack");
    btn.classList.add("roprime-sidebar-content-back");
    return createSettingSection(btn);
  },
  sidebarContentList: () => {
    const panel = el("div", "roprime-sidebar-content-panel");
    const list = el("div", "roprime-sidebar-content-list");
    panel.appendChild(list);
    return createSettingSection(panel);
  },
  language: () => buildLanguageControl(),
  settingsSync: () => buildSettingsSyncPanel(),
  customCss: () => buildCustomCssBlock(),
  cosmeticsShop: () => {
    const shop = el("div", "roprime-cosmetics-shop");
    shop.id = "roprime-cosmetics-shop";
    setHidden(shop, true);
    buildCosmeticsShopInto(shop);
    return createSettingSection(shop);
  },
  searchBan: () => buildSearchBanPanel(),
  infoBlock: () =>
    createSettingsCard({
      title: "settings.info.title",
      description: "settings.info.body",
    }),
  developerBlock: () => {
    const wrap = el("div", "flex flex-col gap-medium roprime-developer-block");
    const title = el("span", "text-title-large content-emphasis roprime-i18n");
    setI18n(title, "settings.developer.title");
    const desc = el("p", "text-body-large content-default roprime-i18n");
    setI18n(desc, "settings.developer.description");
    const actions = el("div", "flex flex-wrap gap-small");
    const forceAlertBtn = createControlButton(
      "settings.developer.forceMaliciousAlert",
    );
    forceAlertBtn.classList.add("roprime-force-malicious-extension-alert");
    forceAlertBtn.addEventListener("click", () => {
      void showMaliciousPluginOverlay("{$Extension}", async () => true);
    });
    actions.appendChild(forceAlertBtn);
    wrap.append(title, desc, actions);
    return wrap;
  },
};

function renderPageContent(container, pageKey) {
  const page = SETTINGS_CONFIG[pageKey];
  if (!page) return;
  for (const item of page.items || []) {
    let node = null;
    if (item.type === "toggle") {
      node = createToggleSection(item);
    } else if (item.type === "card") {
      node = buildConfigCard(item);
    } else if (item.type === "panel" && CUSTOM_BUILDERS[item.id]) {
      node = CUSTOM_BUILDERS[item.id]();
    }
    if (!(node instanceof HTMLElement)) continue;
    if (item.hide) setHidden(node, true);
    container.appendChild(node);
  }
}

function buildLanguageControl() {
  const dropdown = el("div", "roprime-language-dropdown");
  const trigger = createControlButton("");
  trigger.classList.add("roprime-language-trigger");
  trigger.setAttribute("role", "combobox");
  const current = el("span", "roprime-language-current");
  const chevron = el("span", "roprime-language-chevron");
  chevron.setAttribute("aria-hidden", "true");
  trigger.append(current, chevron);

  const menu = el("div", "roprime-language-menu hidden");
  for (const code of Object.keys(langList)) {
    const option = createControlButton("");
    option.classList.add("roprime-language-option");
    option._rpLangCode = code;
    menu.appendChild(option);
  }
  dropdown.append(trigger, menu);

  return createSettingsCard({
    title: "settings.language.title",
    description: "settings.language.description",
    trailing: dropdown,
  });
}

function buildSettingsSyncPanel() {
  const body = el("div", "flex flex-col gap-medium roprime-settings-sync-panel");

  const actions = el("div", "flex flex-wrap gap-small");
  const copyBtn = createControlButton("settings.sync.copy");
  copyBtn.classList.add("roprime-settings-copy");
  const exportBtn = createControlButton("settings.sync.export");
  exportBtn.classList.add("roprime-settings-export");
  const importBtn = createControlButton("settings.sync.import");
  importBtn.classList.add("roprime-settings-import");
  const importInput = el("input");
  importInput.type = "file";
  importInput.accept = ".json,application/json,text/plain";
  importInput.classList.add("hidden", "roprime-settings-import-input");
  actions.append(copyBtn, exportBtn, importBtn, importInput);

  const previewWrap = el("div", "roprime-settings-preview-wrap");
  const preview = el("textarea");
  preview.classList.add("roprime-settings-preview");
  preview.spellcheck = false;
  previewWrap.appendChild(preview);

  const resetRow = el("div", "flex justify-between items-center gap-medium");
  const resetTitle = el("span", "text-title-large content-emphasis roprime-i18n");
  setI18n(resetTitle, "settings.sync.resetTitle");
  const resetBtn = createControlButton("settings.sync.resetButton");
  resetBtn.classList.add("roprime-settings-reset");
  resetRow.append(resetTitle, resetBtn);

  const status = el("p", "text-body-large content-default roprime-settings-sync-status hidden");

  body.append(actions, previewWrap, resetRow, status);

  return createSettingsCard({
    title: "settings.sync.title",
    description: "settings.sync.description",
    extraContent: body,
  });
}

function buildCustomCssBlock() {
  const wrap = el("div", "roprime-custom-css-editor-wrap");
  const placeholder = el("div", "roprime-custom-css-placeholder roprime-i18n");
  setI18n(placeholder, "settings.customCss.placeholder");
  placeholder.setAttribute("aria-hidden", "true");
  const host = el("div", "roprime-custom-css-editor-host");
  wrap.append(placeholder, host);

  return createSettingsCard({
    title: "settings.customCss.title",
    description: "settings.customCss.description",
    extraContent: wrap,
  });
}

function buildSearchBanPanel() {
  const body = el("div", "flex flex-col gap-medium roprime-search-ban-body hidden");

  const controls = el("div", "flex flex-wrap gap-small");
  const input = el("input");
  input.type = "text";
  input.classList.add("roprime-search-ban-input");
  setI18nPlaceholder(input, "settings.privacy.searchBan.inputPlaceholder");
  input.autocomplete = "off";
  input.spellcheck = false;
  const addBtn = createControlButton("settings.privacy.searchBan.addWord");
  addBtn.classList.add("roprime-search-ban-add");
  controls.append(input, addBtn);

  const list = el("div", "roprime-search-ban-list");
  body.append(controls, list);

  return createSettingsCard({
    title: "settings.privacy.searchBan.title",
    description: "settings.privacy.searchBan.description",
    extraContent: body,
  });
}

function buildCosmeticsShopInto(shop) {
  const toolbar = el("div", "roprime-profile-effects-toolbar");
  const search = el("input", "roprime-profile-effects-search roprime-i18n");
  search.type = "search";
  setI18nPlaceholder(search, "settings.profileEffects.searchPlaceholder");
  search.autocomplete = "off";

  const layoutWrap = el("div", "roprime-profile-effects-layout");
  const layoutButtons = el("div", "roprime-profile-effects-layout-buttons");
  layoutButtons.setAttribute("role", "group");
  setI18nAria(layoutButtons, "settings.profileEffects.layout");
  for (const view of PROFILE_EFFECT_LAYOUTS) {
    const btn = el("button", "roprime-profile-effects-layout-btn");
    btn.type = "button";
    btn._rpLayoutView = view;
    const titleKey =
      view === "grid"
        ? "settings.profileEffects.layoutGrid"
        : view === "list"
          ? "settings.profileEffects.layoutList"
          : "settings.profileEffects.layoutWide";
    setI18nAria(btn, titleKey);
    layoutButtons.appendChild(btn);
  }
  const indicator = el("div", "roprime-profile-effects-layout-indicator");
  for (const view of PROFILE_EFFECT_LAYOUTS) {
    const dot = el("span", "roprime-profile-effects-layout-indicator-dot");
    dot._rpLayoutView = view;
    dot.setAttribute("aria-hidden", "true");
    indicator.appendChild(dot);
  }
  layoutWrap.append(layoutButtons, indicator);
  toolbar.append(search, layoutWrap);
  shop.appendChild(toolbar);

  shop.appendChild(
    buildProfileEffectsSection(
      "settings.profileEffects.pictureTitle",
      "settings.profileEffects.pictureDescription",
      PROFILE_PICTURE_EFFECTS,
    ),
  );
  shop.appendChild(
    buildProfileEffectsSection(
      "settings.profileEffects.title",
      "settings.profileEffects.description",
      PROFILE_EFFECTS,
    ),
  );
}

function buildProfileEffectsSection(titleKey, descKey, effects) {
  const section = el("div", "roprime-cosmetics-shop-section");
  const h3 = el("h3", "roprime-settings-section-title roprime-i18n");
  setI18n(h3, titleKey);
  const p = el("p", "roprime-setting-desc roprime-i18n");
  setI18n(p, descKey);
  const grid = el("div", "roprime-profile-effects-grid");
  for (const effect of effects) {
    grid.appendChild(buildProfileEffectCard(effect));
  }
  section.append(h3, p, grid);
  return section;
}

function buildProfileEffectCard(effect) {
  const card = el("article", "roprime-profile-effect-card");
  card._rpEffectId = effect.id;
  card._rpEffectKind = effect.kind;

  const preview = el("div", "roprime-profile-effect-preview");
  if (effect.kind === "picture") {
    const avatarWrap = el("div", "roprime-profile-effect-avatar-wrap");
    avatarWrap.setAttribute("aria-hidden", "true");
    preview.appendChild(avatarWrap);
  }
  const lottie = el("div", "roprime-profile-effect-lottie");
  const iframe = document.createElement("iframe");
  iframe.src = getProfileEffectShopEmbedSrc(effect);
  iframe.title = effect.titleKey;
  iframe.loading = "lazy";
  iframe.setAttribute("allowtransparency", "true");
  iframe.style.background = "transparent";
  iframe.style.backgroundColor = "transparent";
  lottie.appendChild(iframe);
  preview.appendChild(lottie);

  const footer = el("div", "roprime-profile-effect-footer");
  const title = el("div", "roprime-profile-effect-title roprime-i18n");
  setI18n(title, effect.titleKey);
  const action = el("button", "btn-control-md roprime-profile-effect-action");
  action.type = "button";
  action._rpEffectId = effect.id;
  action._rpEffectAction = "equip";
  setI18n(action, "settings.profileEffects.equip");
  footer.append(title, action);
  card.append(preview, footer);
  return card;
}

function applySidebarMode(root, mode) {
  if (settingsState.sidebarCollapseMenuEnabled && mode !== "full")
    mode = "full";
  settingsState.sidebarSize = mode;
  settingsState.smallNewNavigationBarEnabled = mode === "small";
  settingsState.sidebarIconsOnlyEnabled = mode === "icon";
  saveSettings();
  setSidebarSizeModeClass(root, mode);
  syncAccountSettingsLayoutInset();
  syncRoPrimeView();
  syncSidebarContent({ force: true });
  refreshSidebarSizeWarnings(root);
  syncSidebarSliderFromState(root);
  if (getCurrentrp() === "sidebar-content") refreshSidebarContentList(root);
}

function syncSidebarSliderFromState(root) {
  const mode = settingsState.sidebarSize || "full";
  const locked = !!settingsState.sidebarCollapseMenuEnabled;
  const effectiveMode = locked ? "full" : mode;

  root.querySelectorAll(".roprime-sidebar-size-slider").forEach((slider) => {
      if (!(slider instanceof HTMLElement)) return;
      setSliderValue(slider, sidebarValueForMode(effectiveMode));
      setSliderDisabled(slider, locked);
    });

  setSidebarSizeModeClass(root, effectiveMode);
  refreshSidebarSizeWarnings(root);
}

function visibleSidebarItemsCount(sizeMode = getActiveSidebarSize()) {
  return discoverSidebarNavItems(sizeMode).filter(
    (item) => !isSidebarItemHidden(item.id, sizeMode),
  ).length;
}

function refreshSidebarSizeWarnings(root) {
  const mode = normalizeSidebarSizeMode(getActiveSidebarSize());
  const noVisibleItems = visibleSidebarItemsCount(mode) === 0;
  root.querySelectorAll(".roprime-sidebar-empty-warning").forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      setHidden(node, !noVisibleItems);
      node.setAttribute("aria-hidden", noVisibleItems ? "false" : "true");
    });
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
  row.classList.add(`roprime-sidebar-content-row--${item.id}`);
  const label = el("span", "roprime-sidebar-content-row-label");
  label.textContent = sidebarItemLabel(item);
  const btn = el(
    "button",
    isAdd ? "roprime-sidebar-content-add" : "roprime-sidebar-content-delete",
  );
  btn.type = "button";
  btn._rpSidebarItemId = item.id;
  btn._rpSidebarSize = mode;
  setI18nAria(
    btn,
    isAdd ? "settings.appearance.sidebar.contentRestoreItem" : "settings.appearance.sidebar.contentRemoveItem",
  );
  appendSvgMarkup(btn, isAdd ? ADD_ICON_SVG : DELETE_ICON_SVG);
  row.append(label, btn);
  return row;
}

function buildSidebarContentListInto(list) {
  list.textContent = "";
  const mode = normalizeSidebarSizeMode(getActiveSidebarSize());
  const items = discoverSidebarNavItems(mode);
  if (!items.length) {
    const empty = el("p", "roprime-sidebar-content-empty");
    setI18n(empty, "settings.appearance.sidebar.contentEmptyHint");
    list.appendChild(empty);
    return;
  }
  const visible = items.filter((item) => !isSidebarItemHidden(item.id, mode));
  const hidden = items.filter((item) => isSidebarItemHidden(item.id, mode));
  const section = el("div", "roprime-sidebar-content-size-section");
  section.classList.add(`roprime-sidebar-size-section--${mode}`);
  const h4 = el("h4", "roprime-sidebar-content-size-title roprime-i18n");
  setI18n(
    h4,
    SIDEBAR_SIZE_TITLE_KEYS[mode] || SIDEBAR_SIZE_TITLE_KEYS.full,
  );
  const rows = el("div", "roprime-sidebar-content-size-rows");
  for (const item of visible)
    rows.appendChild(buildSidebarContentRow(item, mode, false));
  if (hidden.length) {
    const divider = el("div", "roprime-sidebar-content-divider");
    divider.setAttribute("role", "separator");
    rows.appendChild(divider);
    for (const item of hidden)
      rows.appendChild(buildSidebarContentRow(item, mode, true));
  }
  section.append(h4, rows);
  list.appendChild(section);
}

function refreshSidebarContentList(root) {
  const list = root.querySelector(".roprime-sidebar-content-list");
  if (!(list instanceof HTMLElement)) return;
  buildSidebarContentListInto(list);
  bindSidebarContentList(root);
  refreshSidebarSizeWarnings(root);
}

function bindSidebarContentList(root) {
  const list = root.querySelector(".roprime-sidebar-content-list");
  if (!(list instanceof HTMLElement)) return;
  list.querySelectorAll(".roprime-sidebar-content-delete").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    if (btn.classList.contains("roprime-bound")) return;
    btn.classList.add("roprime-bound");
    btn.addEventListener("click", () => {
      const itemId = btn._rpSidebarItemId || "";
      const sizeMode = btn._rpSidebarSize || "full";
      if (!itemId || isSidebarItemHidden(itemId, sizeMode)) return;
      hideSidebarItem(itemId, sizeMode);
      refreshSidebarContentList(root);
    });
  });
  list.querySelectorAll(".roprime-sidebar-content-add").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    if (btn.classList.contains("roprime-bound")) return;
    btn.classList.add("roprime-bound");
    btn.addEventListener("click", () => {
      const itemId = btn._rpSidebarItemId || "";
      const sizeMode = btn._rpSidebarSize || "full";
      if (!itemId || !isSidebarItemHidden(itemId, sizeMode)) return;
      restoreSidebarItem(itemId, sizeMode);
      refreshSidebarContentList(root);
    });
  });
  root.querySelectorAll(".roprime-sidebar-reset").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    if (btn.classList.contains("roprime-bound")) return;
    btn.classList.add("roprime-bound");
    btn.addEventListener("click", () => {
      resetSidebarItemsForMode(getActiveSidebarSize());
      refreshSidebarContentList(root);
    });
  });
}

// --- Custom CSS editor ---

const CSS_LINE_HEIGHT_PX = 22;
const CSS_EDITOR_PADDING_PX = 16;
const CSS_MIN_LINES = 4;
const CSS_MAX_LINES = 18;

function destroyCssEditor() {
  cssEditor?.remove();
  cssEditor = null;
  cssEditorHost = null;
}

function getEditorWrap() {
  return cssEditorHost?.closest(".roprime-custom-css-editor-wrap");
}

function isCustomCssEditorLocked() {
  return !settingsState.customCssCautionAccepted;
}

function syncCustomCssPlaceholder(root) {
  const placeholder = root.querySelector(".roprime-custom-css-placeholder");
  if (!(placeholder instanceof HTMLElement)) return;
  const value = String(cssEditor?.value ?? settingsState.customCss ?? "");
  const empty = !value.trim();
  const focused = !!cssEditor?.focused;
  setHidden(placeholder, !empty || focused);
  placeholder.setAttribute("aria-hidden", empty && !focused ? "false" : "true");
}

function applyCustomCssEditorLock(root) {
  const locked = isCustomCssEditorLocked();
  const wrap = getEditorWrap();
  if (wrap instanceof HTMLElement) wrap.classList.toggle("is-locked", locked);
  if (cssEditor) {
    cssEditor.textarea.readOnly = locked;
    cssEditor.textarea.setAttribute("aria-readonly", locked ? "true" : "false");
  }
  syncCustomCssPlaceholder(root);
}

function applyEditorHeight(editor) {
  const host = cssEditorHost;
  const wrap = getEditorWrap();
  const shadow = host?.shadowRoot;
  const container = shadow?.querySelector(".prism-code-editor");
  if (!(container instanceof HTMLElement)) return;

  const lineCount = Math.max(1, editor.value.split("\n").length);
  const minH = CSS_MIN_LINES * CSS_LINE_HEIGHT_PX + CSS_EDITOR_PADDING_PX;
  const maxH = CSS_MAX_LINES * CSS_LINE_HEIGHT_PX + CSS_EDITOR_PADDING_PX;
  const contentH = lineCount * CSS_LINE_HEIGHT_PX + CSS_EDITOR_PADDING_PX;
  const editorH = Math.max(minH, contentH);

  const wrapScrollTop = wrap instanceof HTMLElement ? wrap.scrollTop : 0;
  const selStart = editor.textarea.selectionStart;
  const selEnd = editor.textarea.selectionEnd;

  container.style.height = `${editorH}px`;
  container.style.minHeight = `${minH}px`;
  container.style.overflow = "visible";
  container.style.overflowY = "visible";

  if (wrap instanceof HTMLElement) {
    wrap.style.maxHeight = `${maxH}px`;
    wrap.style.overflowY = contentH > maxH ? "auto" : "hidden";
    requestAnimationFrame(() => {
      wrap.scrollTop = wrapScrollTop;
      try {
        editor.textarea.setSelectionRange(selStart, selEnd);
      } catch {
        /* ignore */
      }
    });
  }
}

function configureEditorShadow(host) {
  const shadow = host.shadowRoot;
  const container = shadow?.querySelector(".prism-code-editor");
  if (!(shadow instanceof ShadowRoot) || !(container instanceof HTMLElement))
    return;

  let override = shadow.getElementById("roprime-pce-overrides");
  if (!override) {
    override = document.createElement("style");
    override.id = "roprime-pce-overrides";
    shadow.appendChild(override);
  }
  override.textContent = `
		:host { display: block; }
		.prism-code-editor {
			margin: 0;
			border-radius: 10px;
			overflow: visible !important;
			--pce-bg: var(--roprime-editor-bg, var(--color-surface-300));
			background: var(--roprime-editor-bg, var(--color-surface-300));
			--pce-cursor: #f97316;
		}
		.prism-code-editor, .prism-code-editor * { scrollbar-width: auto; }
		.active-line:after { display: none !important; border: none !important; background: transparent !important; }
		.active-line { --pce-bg-highlight: transparent; --pce-border-highlight: none; }
	`;
}

function ensureCssEditor(root) {
  const host = root.querySelector(".roprime-custom-css-editor-host");
  if (!(host instanceof HTMLElement)) return;
  if (cssEditorHost === host && cssEditor) return;

  destroyCssEditor();
  cssEditorHost = host;
  let cautionPromptActive = false;

  async function ensureCustomCssCautionAccepted() {
    if (settingsState.customCssCautionAccepted) return true;
    if (cautionPromptActive) return false;
    cautionPromptActive = true;
    try {
      const accepted = await promptCustomCssCautionNotice();
      if (!accepted) return false;
      settingsState.customCssCautionAccepted = true;
      saveSettings();
      applyCustomCssEditorLock(root);
      return true;
    } finally {
      cautionPromptActive = false;
    }
  }

  cssEditor = minimalEditor(
    host,
    {
      theme: "github-dark-dimmed",
      language: "css",
      value: String(settingsState.customCss || ""),
      wordWrap: true,
      lineNumbers: false,
      insertSpaces: true,
      tabSize: 2,
      readOnly: isCustomCssEditorLocked(),
      onUpdate: (value, editor) => {
        if (isCustomCssEditorLocked()) return;
        settingsState.customCss = value;
        saveSettings();
        syncCustomCss();
        applyEditorHeight(editor);
        syncCustomCssPlaceholder(root);
      },
    },
    () => {
      host.classList.add("roprime-custom-css-editor-ready");
      if (!cssEditor) return;
      configureEditorShadow(host);
      applyEditorHeight(cssEditor);
      applyCustomCssEditorLock(root);
      cssEditor.textarea.addEventListener("focus", () => {
        void (async () => {
          if (settingsState.customCssCautionAccepted) {
            syncCustomCssPlaceholder(root);
            return;
          }
          const allowed = await ensureCustomCssCautionAccepted();
          if (!allowed) cssEditor?.textarea.blur();
          syncCustomCssPlaceholder(root);
        })();
      });
      cssEditor.textarea.addEventListener("blur", () =>
        syncCustomCssPlaceholder(root),
      );
    },
  );
}

function syncCustomCssUi(root) {
  ensureCssEditor(root);
  const value = String(settingsState.customCss || "");
  if (cssEditor && cssEditor.value !== value) {
    cssEditor.setOptions({ value });
    applyEditorHeight(cssEditor);
  }
  const placeholder = root.querySelector(".roprime-custom-css-placeholder");
  if (placeholder instanceof HTMLElement && !placeholder.textContent?.trim()) {
    placeholder.textContent = accountSettingsPaneT("settings.customCss.placeholder");
  }
  applyCustomCssEditorLock(root);
}

// --- Profile effects / cosmetics ---

function equippedFieldForKind(kind) {
  return kind === "picture"
    ? "equippedProfilePictureEffect"
    : "equippedProfilePageEffect";
}

function getEquippedEffectIdForKind(kind) {
  return String(settingsState[equippedFieldForKind(kind)] || "").trim();
}

function setEquippedEffectIdForKind(kind, effectId) {
  settingsState[equippedFieldForKind(kind)] = effectId ? String(effectId) : "";
}

function isEffectEquipped(effectId) {
  const effect = getProfileEffectById(effectId);
  if (!effect) return false;
  return getEquippedEffectIdForKind(effect.kind) === effectId;
}

function migrateLegacyEquippedProfileEffect() {
  const legacy = String(settingsState.equippedProfileEffect || "").trim();
  if (!legacy) return false;
  const hasPicture = !!getEquippedEffectIdForKind("picture");
  const hasProfile = !!getEquippedEffectIdForKind("profile");
  if (hasPicture && hasProfile) {
    settingsState.equippedProfileEffect = "";
    return true;
  }
  const effect = getProfileEffectById(legacy);
  if (!effect) {
    settingsState.equippedProfileEffect = "";
    return true;
  }
  if (!hasPicture && effect.kind === "picture")
    setEquippedEffectIdForKind("picture", legacy);
  if (!hasProfile && effect.kind === "profile")
    setEquippedEffectIdForKind("profile", legacy);
  settingsState.equippedProfileEffect = "";
  return true;
}

function migrateLegacyEquippedByUserMap() {
  if (
    !settingsState.profileEffectsEquippedByUser ||
    typeof settingsState.profileEffectsEquippedByUser !== "object"
  ) {
    settingsState.profileEffectsEquippedByUser = {};
    return false;
  }
  let changed = false;
  const next = {};
  for (const [userKey, entry] of Object.entries(
    settingsState.profileEffectsEquippedByUser,
  )) {
    if (!/^\d+$/.test(String(userKey))) continue;
    const normalized = normalizeEquippedEntry(entry);
    if (typeof entry === "string") {
      const effect = getProfileEffectById(normalized.picture);
      if (effect?.kind === "profile") {
        normalized.profile = normalized.picture;
        normalized.picture = "";
      }
      changed = true;
    }
    for (const slot of ["picture", "profile"]) {
      const id = normalized[slot];
      if (!id) continue;
      const effect = getProfileEffectById(id);
      if (!effect || effect.kind === slot) continue;
      const other = slot === "picture" ? "profile" : "picture";
      if (!normalized[other]) normalized[other] = id;
      normalized[slot] = "";
      changed = true;
    }
    if (normalized.picture || normalized.profile) next[userKey] = normalized;
    if (
      typeof entry === "object" &&
      entry &&
      (JSON.stringify(entry) !== JSON.stringify(normalized) ||
        (!normalized.picture && !normalized.profile))
    ) {
      changed = true;
    }
  }
  settingsState.profileEffectsEquippedByUser = next;
  return changed;
}

function normalizeEquippedForKind(kind) {
  migrateLegacyEquippedProfileEffect();
  const field = equippedFieldForKind(kind);
  const equipped = getEquippedEffectIdForKind(kind);
  if (!equipped) {
    settingsState[field] = "";
    return;
  }
  const effect = getProfileEffectById(equipped);
  if (!effect || effect.kind !== kind) settingsState[field] = "";
}

export function normalizeEquippedProfileEffects() {
  const migrated =
    migrateLegacyEquippedProfileEffect() || migrateLegacyEquippedByUserMap();
  normalizeEquippedForKind("picture");
  normalizeEquippedForKind("profile");
  return migrated;
}

function setEquippedForUser(userId, effectId, kind) {
  if (!userId) return;
  const key = String(userId);
  if (!settingsState.profileEffectsEquippedByUser) {
    settingsState.profileEffectsEquippedByUser = {};
  }
  const slot = equipSlotForKind(kind);
  const entry = normalizeEquippedEntry(
    settingsState.profileEffectsEquippedByUser[key],
  );
  if (effectId) entry[slot] = effectId;
  else entry[slot] = "";
  if (!entry.picture && !entry.profile) {
    delete settingsState.profileEffectsEquippedByUser[key];
  } else {
    settingsState.profileEffectsEquippedByUser[key] = entry;
  }
}

async function refreshAuthUserId() {
  cachedAuthUserId = await getRobloxUserId();
  return cachedAuthUserId;
}

async function grantAllProfileEffectsToCurrentUser() {
  const allEffectIds = getAllProfileEffectIds();
  if (!allEffectIds.length) return;
  settingsState.ownedProfileEffects = [...allEffectIds];
  if (!isSupabaseProfileEffectsEnabled()) return;
  const userId = await refreshAuthUserId();
  if (!userId) return;
  await Promise.allSettled(
    allEffectIds.map((effectId) =>
      registerProfileEffectPurchase(userId, effectId),
    ),
  );
}

async function ensureRegistryOwnershipSynced() {
  if (registrySyncPromise) return registrySyncPromise;
  registrySyncPromise = (async () => {
    const userId = await refreshAuthUserId();
    if (!userId) return;
    const merged = await syncOwnedEffectsFromRegistry(
      userId,
      settingsState.ownedProfileEffects,
    );
    const changed =
      JSON.stringify(merged) !==
      JSON.stringify(settingsState.ownedProfileEffects);
    settingsState.ownedProfileEffects = merged;
    const equipMigrated = normalizeEquippedProfileEffects();
    if (changed || equipMigrated) saveSettings();
  })();
  try {
    await registrySyncPromise;
  } finally {
    registrySyncPromise = null;
  }
}

function normalizeProfileEffectsLayoutView(layout) {
  return PROFILE_EFFECT_LAYOUTS.includes(layout) ? layout : "grid";
}

function applyProfileEffectsLayout(shop, layout) {
  const view = normalizeProfileEffectsLayoutView(layout);
  shop.querySelectorAll(".roprime-profile-effects-grid").forEach((grid) => {
      if (!(grid instanceof HTMLElement)) return;
      grid.classList.remove(
        "roprime-profile-effects-grid--list",
        "roprime-profile-effects-grid--wide",
      );
      if (view === "list")
        grid.classList.add("roprime-profile-effects-grid--list");
      if (view === "wide")
        grid.classList.add("roprime-profile-effects-grid--wide");
    });
  shop.querySelectorAll(".roprime-profile-effects-layout-btn").forEach((btn) => {
      if (!(btn instanceof HTMLButtonElement)) return;
      const active = btn._rpLayoutView === view;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  shop.querySelectorAll(".roprime-profile-effects-layout-indicator-dot").forEach((dot) => {
    if (!(dot instanceof HTMLElement)) return;
    dot.classList.toggle("is-active", dot._rpLayoutView === view);
  });
}

function filterProfileEffectsSearch(shop, query) {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  shop.querySelectorAll(".roprime-profile-effect-card").forEach((card) => {
    if (!(card instanceof HTMLElement)) return;
    const effectId = card._rpEffectId || "";
    const effect = getProfileEffectById(effectId);
    const title = effect
      ? accountSettingsPaneT(effect.titleKey).toLowerCase()
      : "";
    const hidden = !!q && !title.includes(q);
    setHidden(card, hidden);
    card.classList.toggle("roprime-profile-effect-card--hidden", hidden);
  });
}

function syncEffectButtons(shop) {
  if (!(shop instanceof HTMLElement)) return;
  shop.querySelectorAll(".roprime-profile-effect-action").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    const effectId = btn._rpEffectId || "";
    const equipped = isEffectEquipped(effectId);
    const card = btn.closest(".roprime-profile-effect-card");
    btn.disabled = false;
    btn.classList.toggle("roprime-profile-effect-action--equipped", equipped);
    if (equipped) {
      btn._rpEffectAction = "unequip";
      btn.textContent = accountSettingsPaneT("settings.profileEffects.unequip");
    } else {
      btn._rpEffectAction = "equip";
      btn.textContent = accountSettingsPaneT("settings.profileEffects.equip");
    }
    if (card instanceof HTMLElement) {
      card.classList.toggle("roprime-profile-effect-card--equipped", equipped);
    }
  });
}

function syncCosmeticsUi(root) {
  if (!(root instanceof HTMLElement)) return;
  const enabled = !!settingsState.cosmeticsEnabled;
  root.classList.toggle("roprime-cosmetics-enabled", enabled);

  const cosmeticsToggle = querySettingToggle(root, "cosmeticsEnabled");
  if (cosmeticsToggle) setToggleChecked(cosmeticsToggle, enabled);

  const shop = root.querySelector("#roprime-cosmetics-shop, .roprime-cosmetics-shop");
  if (!(shop instanceof HTMLElement)) return;
  setHidden(shop, !enabled);
  shop.setAttribute("aria-hidden", enabled ? "false" : "true");
  if (!enabled) return;

  applyProfileEffectsLayout(
    shop,
    settingsState.profileEffectsLayoutView || "grid",
  );
  const search = shop.querySelector(".roprime-profile-effects-search");
  if (search instanceof HTMLInputElement) {
    filterProfileEffectsSearch(shop, search.value);
  }
  void refreshAuthUserId().then(() => {
    normalizeEquippedProfileEffects();
    syncEffectButtons(shop);
  });
  void ensureRegistryOwnershipSynced().then(() => {
    normalizeEquippedProfileEffects();
    syncEffectButtons(shop);
  });
  void hydrateProfilePictureEffectAvatars(shop);
}

// --- Search ban ---

function buildSearchBanRow(word) {
  const row = el("div", "roprime-sidebar-content-row roprime-search-ban-row");
  row._rpSearchBanWord = word;
  const label = el("span", "roprime-sidebar-content-row-label");
  label.textContent = word;
  const btn = el("button", "roprime-sidebar-content-delete roprime-search-ban-remove");
  btn.type = "button";
  btn._rpSearchBanWord = word;
  setI18nAria(btn, "settings.privacy.searchBan.removeWord");
  appendSvgMarkup(btn, DELETE_ICON_SVG);
  row.append(label, btn);
  return row;
}

function buildSearchBanListInto(list) {
  list.textContent = "";
  const words = normalizeSearchBannedWords(settingsState.searchBannedWords);
  if (!words.length) {
    const empty = el("p", "roprime-sidebar-content-empty roprime-i18n");
    setI18n(empty, "settings.privacy.searchBan.emptyHint");
    list.appendChild(empty);
    return;
  }
  for (const word of words) list.appendChild(buildSearchBanRow(word));
}

function refreshSearchBanList(root) {
  const list = root.querySelector(".roprime-search-ban-list");
  if (!(list instanceof HTMLElement)) return;
  buildSearchBanListInto(list);
  bindSearchBanList(root);
}

function addSearchBannedWord(rawWord) {
  const word = String(rawWord || "").trim();
  if (!word) return false;
  const words = normalizeSearchBannedWords(settingsState.searchBannedWords);
  const normalized = word.toLowerCase();
  if (words.some((entry) => entry.toLowerCase() === normalized)) return false;
  settingsState.searchBannedWords = [...words, word];
  saveSettings();
  syncSearchBan();
  return true;
}

function removeSearchBannedWord(rawWord) {
  const word = String(rawWord || "").trim();
  if (!word) return;
  settingsState.searchBannedWords = normalizeSearchBannedWords(
    settingsState.searchBannedWords,
  ).filter((entry) => entry.toLowerCase() !== word.toLowerCase());
  saveSettings();
  syncSearchBan();
}

function syncSearchBanSettingsUi(root) {
  const enabled = !!settingsState.searchBanEnabled;
  const body = root.querySelector(".roprime-search-ban-body");
  if (body instanceof HTMLElement) {
    setHidden(body, !enabled);
    body.setAttribute("aria-hidden", enabled ? "false" : "true");
  }
}

function bindSearchBanList(root) {
  const list = root.querySelector(".roprime-search-ban-list");
  if (!(list instanceof HTMLElement)) return;
  list.querySelectorAll(".roprime-search-ban-remove").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    if (btn.classList.contains("roprime-bound")) return;
    btn.classList.add("roprime-bound");
    btn.addEventListener("click", () => {
      removeSearchBannedWord(btn._rpSearchBanWord || "");
      refreshSearchBanList(root);
    });
  });
}

function commitSearchBanInput(root) {
  const input = root.querySelector(".roprime-search-ban-input");
  if (!(input instanceof HTMLInputElement)) return;
  const added = addSearchBannedWord(input.value);
  if (added) {
    input.value = "";
    refreshSearchBanList(root);
  }
}

// --- Settings sync ---

function stripSyncExcludedKeys(payload) {
  for (const key of SYNC_EXCLUDED_KEYS) delete payload[key];
  return payload;
}

function getExtensionVersion() {
  try {
    if (!isExtensionContextAlive()) return "0.0.0";
    return extensionApi?.runtime?.getManifest?.()?.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function detectBrowserName() {
  const ua = navigator.userAgent || "";
  if (/firefox/i.test(ua)) return "firefox";
  if (/edg/i.test(ua)) return "edge";
  if (/chrome/i.test(ua)) return "chrome";
  return "unknown";
}

function stripUtf8Bom(text) {
  const raw = String(text || "");
  return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
}

function parseImportPayload(text) {
  const raw = stripUtf8Bom(text).trim();
  if (!raw) throw new Error("Empty file.");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("Invalid JSON.");
    parsed = JSON.parse(raw.slice(start, end + 1));
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("No importable settings object found.");
  }
  const candidates = [
    parsed,
    parsed.roprime,
    parsed.settings,
    parsed[RP_SETTINGS_KEY],
    parsed.data?.roprime,
  ].filter((item) => item && typeof item === "object" && !Array.isArray(item));
  const hasKnownKey = (obj) =>
    "language" in obj ||
    "renameDropdownEnabled" in obj ||
    "sidebarSize" in obj ||
    "oldNavigationBarEnabled" in obj ||
    "renameMarketplaceToCatalog" in obj;
  for (const candidate of candidates) {
    if (hasKnownKey(candidate)) return { ...candidate };
  }
  for (const candidate of candidates) return { ...candidate };
  throw new Error("No importable settings object found.");
}

async function storageSetCompat(storage, data) {
  try {
    const maybePromise = storage.set(data);
    if (maybePromise && typeof maybePromise.then === "function") {
      await maybePromise;
      return;
    }
  } catch {}
  await new Promise((resolve, reject) => {
    try {
      storage.set(data, () => {
        const runtimeError = extensionApi?.runtime?.lastError || null;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }
        resolve();
      });
    } catch (e) {
      reject(e);
    }
  });
}

function buildSettingsExportDocument() {
  return {
    about: { browser: detectBrowserName(), version: getExtensionVersion() },
    ...stripSyncExcludedKeys({ ...serializeSettingsPayload() }),
  };
}

function formatSettingsExportJson() {
  return `${JSON.stringify(buildSettingsExportDocument(), null, 2)}\n`;
}

function formatExportFilename() {
  const version = getExtensionVersion();
  const d = new Date();
  const date = d.toISOString().slice(0, 10);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `roprime-${version} ${date} ${h}_${m}_${s}.json`;
}

function setSyncStatus(root, message, isError = false) {
  const status = root.querySelector(".roprime-settings-sync-status");
  if (!(status instanceof HTMLElement)) return;
  if (!message) {
    setHidden(status, true);
    status.textContent = "";
    return;
  }
  setHidden(status, false);
  status.textContent = message;
  status.classList.toggle("is-error", isError);
}

function refreshSettingsSyncPreview(root) {
  const preview = root.querySelector(".roprime-settings-preview");
  if (!(preview instanceof HTMLTextAreaElement)) return;
  preview.value = formatSettingsExportJson();
}

async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const fallback = document.createElement("textarea");
    fallback.value = text;
    fallback.setAttribute("readonly", "");
    fallback.style.position = "fixed";
    fallback.style.left = "-9999px";
    document.body.appendChild(fallback);
    fallback.select();
    const copied = document.execCommand("copy");
    fallback.remove();
    return copied;
  }
}

async function copySettingsExport(root) {
  const preview = root.querySelector(".roprime-settings-preview");
  const text =
    preview instanceof HTMLTextAreaElement
      ? preview.value || formatSettingsExportJson()
      : formatSettingsExportJson();
  const copied = await copyTextToClipboard(text);
  setSyncStatus(
    root,
    copied
      ? accountSettingsPaneT("settings.sync.copied")
      : accountSettingsPaneT("settings.sync.copyFailed"),
    !copied,
  );
  window.setTimeout(() => setSyncStatus(root, ""), 2200);
}

function exportSettingsFile() {
  const blob = new Blob([formatSettingsExportJson()], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = formatExportFilename();
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function importSettingsText(text) {
  const imported = parseImportPayload(text);
  stripSyncExcludedKeys(imported);
  const storage = getStorageApi();
  if (!storage) throw new Error("Storage API unavailable.");
  const preservedCustomCss = String(settingsState.customCss || "");
  const preservedCustomCssCaution = !!settingsState.customCssCautionAccepted;
  mergeStoredSettings(imported);
  settingsState.customCss = preservedCustomCss;
  settingsState.customCssCautionAccepted = preservedCustomCssCaution;
  const payload = serializeSettingsPayload();
  await storageSetCompat(storage, { [RP_SETTINGS_KEY]: payload });
  saveSettings();
}

async function importSettingsFile(file) {
  const text = await file.text();
  await importSettingsText(text);
}

async function resetAllSettingsFromSync(root) {
  resetSettingsToDefaults();
  syncAllFeatures();
  await reloadSettingsUiStrings();
  syncProfileSettingsRoute();
  refreshSettingsSyncPreview(root);
  const preview = root.querySelector(".roprime-settings-preview");
  if (preview instanceof HTMLTextAreaElement) return preview.value;
  return formatSettingsExportJson();
}

function syncLanguageMenuLabels(root) {
  root.querySelectorAll(".roprime-language-option").forEach((node) => {
      if (!(node instanceof HTMLButtonElement)) return;
      const code = node._rpLangCode;
      if (!code) return;
      const label = langList[code];
      if (typeof label === "string") node.textContent = label;
    });
  const current = root.querySelector(".roprime-language-current");
  if (current instanceof HTMLElement) {
    const code = currentUiLanguageCode();
    current.textContent =
      typeof langList[code] === "string" ? langList[code] : langList.en;
  }
}

function wireToggleElements(root) {
  root.querySelectorAll(".roprime-setting-toggle").forEach((toggleEl) => {
    if (toggleEl.classList.contains("roprime-bound")) return;
    toggleEl.classList.add("roprime-bound");
    const key = getSettingKeyFromToggle(toggleEl);
    if (!key) return;
    const button = toggleEl.querySelector("button.btn-toggle");
    if (!(button instanceof HTMLButtonElement)) return;
    button.addEventListener("click", () => {
      if (button.disabled) return;
      const checked = button.getAttribute("aria-checked") !== "true";
      setToggleChecked(toggleEl, checked);
      settingsState[key] = checked;
      saveSettings();
      syncAllFeatures();
      if (key === "renameDropdownEnabled") refreshSettingsUi(root);
      if (key === "sidebarCollapseMenuEnabled") {
        if (checked && settingsState.sidebarSize !== "full") {
          applySidebarMode(root, "full");
        } else {
          syncSidebarSliderFromState(root);
        }
      }
      if (key === "cosmeticsEnabled") {
        void (async () => {
          if (checked) await grantAllProfileEffectsToCurrentUser();
          syncCosmeticsUi(root);
        })();
      }
      if (key === "searchBanEnabled") syncSearchBanSettingsUi(root);
    });
  });
}

function bindOnce(root) {
  if (root.classList.contains("roprime-bound")) return;
  root.classList.add("roprime-bound");

  const enterSearchMode = () => {
    const isSearchMode = root.classList.contains("roprime-search-mode");
    const currentPage = getCurrentrp() || RP_DEFAULT_PAGE;
    const sourcePage =
      currentPage === "info" || currentPage === "developer"
        ? RP_DEFAULT_PAGE
        : currentPage;
    root._rpSearchSourcePage = sourcePage;
    if (!isSearchMode) {
      const si = root.querySelector("#roprime-settings-search");
      if (si instanceof HTMLInputElement) si.value = "";
    }
    root.classList.add("roprime-search-mode");
    refreshLayoutAndNav(root);
  };

  const unlockDeveloperPage = () => {
    if (isDeveloperPageUnlocked()) return;
    settingsState.developerPageUnlocked = true;
    saveSettings();
    root.classList.add("roprime-developer-unlock-visible");
    refreshLayoutAndNav(root);
  };

  const search = root.querySelector("#roprime-settings-search");
  if (search instanceof HTMLInputElement) {
    search.addEventListener("focus", enterSearchMode);
    search.addEventListener("click", (event) => {
      event.stopPropagation();
      enterSearchMode();
    });
    search.addEventListener("input", () => {
      if (!root.classList.contains("roprime-search-mode")) return;
      if (search.value.trim().toLowerCase() === RP_DEBUG_UNLOCK)
        unlockDeveloperPage();
      refreshLayoutAndNav(root);
    });
  }

  const searchItem = root.querySelector(
    "#roprime-settings-search-item, .roprime-settings-search-item",
  );
  if (searchItem instanceof HTMLElement) {
    searchItem.addEventListener("pointerdown", (event) => {
      if (event.target instanceof HTMLInputElement) return;
      enterSearchMode();
    });
  }

  const navigateToPage = (nextPage) => {
    root.classList.remove("roprime-search-mode");
    root._rpSearchSourcePage = undefined;
    const searchBox = root.querySelector("#roprime-settings-search");
    if (searchBox instanceof HTMLInputElement) searchBox.value = "";
    const nextUrl = buildPluginUrl(nextPage);
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentUrl !== nextUrl) window.history.pushState({}, "", nextUrl);
    window.dispatchEvent(new Event("roprime-location-change"));
  };

  root.querySelectorAll(".roprime-nav-page").forEach((li) => {
    if (!(li instanceof HTMLElement)) return;
    const link = li.querySelector("a");
    if (!(link instanceof HTMLAnchorElement)) return;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const page = getNavPageKey(li) || RP_DEFAULT_PAGE;
      if (page === "developer" && !isDeveloperPageUnlocked()) return;
      navigateToPage(page);
    });
  });

  wireToggleElements(root);

  root.querySelectorAll(".roprime-sidebar-size-slider").forEach((slider) => {
    if (!(slider instanceof HTMLElement)) return;
    if (slider.classList.contains("roprime-bound")) return;
    slider.classList.add("roprime-bound");

    const input = slider.querySelector("input[type='range']");
    if (!(input instanceof HTMLInputElement)) return;

    const commitNearest = () => {
      const mode = sidebarModeForValue(input.value);
      applySidebarMode(root, mode);
    };

    input.addEventListener("change", commitNearest);
    input.addEventListener("pointerup", commitNearest);
    input.addEventListener("pointercancel", commitNearest);
    input.addEventListener("blur", () => {
      if (document.activeElement !== input) commitNearest();
    });
  });

  const openSidebarContent = root.querySelector(".roprime-open-sidebar-content");
  if (openSidebarContent instanceof HTMLButtonElement) {
    openSidebarContent.addEventListener("click", () =>
      navigateToPage("sidebar-content"),
    );
  }

  const backSidebarContent = root.querySelector(".roprime-sidebar-content-back");
  if (backSidebarContent instanceof HTMLButtonElement) {
    backSidebarContent.addEventListener("click", () =>
      navigateToPage("design"),
    );
  }

  bindSidebarContentList(root);

  const languageDropdown = root.querySelector(".roprime-language-dropdown");
  const languageMenu = languageDropdown?.querySelector(".roprime-language-menu");
  const languageTrigger = languageDropdown?.querySelector(
    ".roprime-language-trigger",
  );
  if (
    languageDropdown instanceof HTMLElement &&
    languageMenu instanceof HTMLElement &&
    languageTrigger instanceof HTMLButtonElement
  ) {
    const closeLanguageMenu = () => {
      languageDropdown.classList.remove("is-open");
      setHidden(languageMenu, true);
    };
    languageTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const next = !languageDropdown.classList.contains("is-open");
      languageDropdown.classList.toggle("is-open", next);
      setHidden(languageMenu, !next);
    });
    languageMenu.querySelectorAll(".roprime-language-option").forEach((option) => {
        if (!(option instanceof HTMLButtonElement)) return;
        option.addEventListener("click", () => {
          void (async () => {
            const next = String(option._rpLangCode || "").toLowerCase();
            if (!(next in langList)) return;
            settingsState.language = next;
            saveSettings();
            await reloadSettingsUiStrings();
            closeLanguageMenu();
            refreshSettingsUi(root);
            syncAccountSettingsMenuButton();
          })();
        });
      });
    document.addEventListener("mousedown", (event) => {
      if (!(event.target instanceof Element)) return;
      if (!languageDropdown.classList.contains("is-open")) return;
      if (languageDropdown.contains(event.target)) return;
      closeLanguageMenu();
    });
  }

  const addBanBtn = root.querySelector(".roprime-search-ban-add");
  if (addBanBtn instanceof HTMLButtonElement) {
    addBanBtn.addEventListener("click", () => commitSearchBanInput(root));
  }
  const banInput = root.querySelector(".roprime-search-ban-input");
  if (banInput instanceof HTMLInputElement) {
    banInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      commitSearchBanInput(root);
    });
  }
  bindSearchBanList(root);

  refreshSettingsSyncPreview(root);
  const preview = root.querySelector(".roprime-settings-preview");
  let previewSaveTimer = 0;
  let previewLastSaved =
    preview instanceof HTMLTextAreaElement ? preview.value : "";

  root.querySelector(".roprime-settings-copy")?.addEventListener("click", () => {
      void copySettingsExport(root);
    });
  root.querySelector(".roprime-settings-export")?.addEventListener("click", () => {
      refreshSettingsSyncPreview(root);
      exportSettingsFile();
      setSyncStatus(root, accountSettingsPaneT("settings.sync.exported"));
      window.setTimeout(() => setSyncStatus(root, ""), 2200);
    });
  const importInput = root.querySelector(".roprime-settings-import-input");
  root.querySelector(".roprime-settings-import")?.addEventListener("click", () => {
      if (importInput instanceof HTMLInputElement) {
        importInput.value = "";
        importInput.click();
      }
    });
  importInput?.addEventListener("change", () => {
    const file =
      importInput instanceof HTMLInputElement ? importInput.files?.[0] : null;
    if (!file) return;
    void (async () => {
      try {
        await importSettingsFile(file);
        refreshSettingsSyncPreview(root);
        const nextPreview = root.querySelector(".roprime-settings-preview");
        if (nextPreview instanceof HTMLTextAreaElement) {
          previewLastSaved = nextPreview.value;
        }
        setSyncStatus(root, accountSettingsPaneT("settings.sync.imported"));
        window.setTimeout(() => setSyncStatus(root, ""), 2200);
      } catch {
        setSyncStatus(
          root,
          accountSettingsPaneT("settings.sync.importFailed"),
          true,
        );
      }
    })();
  });
  root.querySelector(".roprime-settings-reset")?.addEventListener("click", () => {
      void (async () => {
        try {
          previewLastSaved = await resetAllSettingsFromSync(root);
          setSyncStatus(root, accountSettingsPaneT("settings.sync.resetDone"));
          window.setTimeout(() => setSyncStatus(root, ""), 2200);
        } catch {
          setSyncStatus(
            root,
            accountSettingsPaneT("settings.sync.resetFailed"),
            true,
          );
        }
      })();
    });
  if (preview instanceof HTMLTextAreaElement) {
    preview.addEventListener("input", () => {
      window.clearTimeout(previewSaveTimer);
      previewSaveTimer = window.setTimeout(() => {
        const normalized = preview.value;
        if (normalized === previewLastSaved) return;
        if (!normalized.trim()) {
          void (async () => {
            try {
              previewLastSaved = await resetAllSettingsFromSync(root);
              setSyncStatus(
                root,
                accountSettingsPaneT("settings.sync.resetDone"),
              );
              window.setTimeout(() => setSyncStatus(root, ""), 2200);
            } catch {
              setSyncStatus(
                root,
                accountSettingsPaneT("settings.sync.resetFailed"),
                true,
              );
            }
          })();
          return;
        }
        void (async () => {
          try {
            await importSettingsText(normalized);
            previewLastSaved = normalized;
            setSyncStatus(root, accountSettingsPaneT("settings.sync.saved"));
            window.setTimeout(() => setSyncStatus(root, ""), 1600);
          } catch {
            setSyncStatus(
              root,
              accountSettingsPaneT("settings.sync.importFailed"),
              true,
            );
          }
        })();
      }, 500);
    });
  }

  const shop = root.querySelector("#roprime-cosmetics-shop, .roprime-cosmetics-shop");
  if (shop instanceof HTMLElement) {
    const effectSearch = shop.querySelector(".roprime-profile-effects-search");
    if (effectSearch instanceof HTMLInputElement) {
      effectSearch.addEventListener("input", () => {
        filterProfileEffectsSearch(shop, effectSearch.value);
      });
    }
    shop.querySelectorAll(".roprime-profile-effects-layout-btn").forEach((btn) => {
        if (!(btn instanceof HTMLButtonElement)) return;
        btn.addEventListener("click", () => {
          const layout = btn._rpLayoutView;
          if (!layout) return;
          settingsState.profileEffectsLayoutView =
            normalizeProfileEffectsLayoutView(layout);
          saveSettings();
          applyProfileEffectsLayout(
            shop,
            settingsState.profileEffectsLayoutView,
          );
        });
      });
    shop.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const btn = target.closest(".roprime-profile-effect-action");
      if (!(btn instanceof HTMLButtonElement)) return;
      const effectId = btn._rpEffectId;
      const action = btn._rpEffectAction;
      if (!effectId || !action) return;
      const effect = getProfileEffectById(effectId);
      if (!effect) return;
      if (action === "equip") {
        void (async () => {
          if (!settingsState.profileEffectsSupportNoticeAccepted) {
            const accepted = await promptProfileEffectsSupportNotice();
            if (!accepted) return;
            settingsState.profileEffectsSupportNoticeAccepted = true;
            saveSettings();
          }
          const userId = await refreshAuthUserId();
          let equipSaved = true;
          if (userId) {
            equipSaved = await registerProfileEffectEquip(
              userId,
              effectId,
              effect.kind,
            );
          }
          if (isSupabaseProfileEffectsEnabled() && !equipSaved) return;
          setEquippedEffectIdForKind(effect.kind, effectId);
          if (userId) setEquippedForUser(userId, effectId, effect.kind);
          saveSettings();
          syncCosmeticsUi(root);
        })();
        return;
      }
      if (action === "unequip") {
        void (async () => {
          const userId = await refreshAuthUserId();
          let equipSaved = true;
          if (userId) {
            equipSaved = await registerProfileEffectEquip(
              userId,
              "",
              effect.kind,
            );
          }
          if (isSupabaseProfileEffectsEnabled() && !equipSaved) return;
          if (getEquippedEffectIdForKind(effect.kind) === effectId) {
            setEquippedEffectIdForKind(effect.kind, "");
          }
          if (userId) setEquippedForUser(userId, "", effect.kind);
          saveSettings();
          syncCosmeticsUi(root);
        })();
      }
    });
  }
}

function refreshLayoutAndNav(root) {
  const activePage = getCurrentrp() || RP_DEFAULT_PAGE;
  const pageDef = SETTINGS_CONFIG[activePage];
  const isSearchMode = root.classList.contains("roprime-search-mode");
  const searchSourcePage = root._rpSearchSourcePage || RP_DEFAULT_PAGE;
  const searchInput = root.querySelector("#roprime-settings-search");
  const searchTerm =
    searchInput instanceof HTMLInputElement
      ? searchInput.value.trim().toLowerCase()
      : "";
  const hasSearchTerm = searchTerm.length >= 2;
  const showSearchHint =
    isSearchMode && searchTerm.length > 0 && searchTerm.length < 2;
  const unlocked = isDeveloperPageUnlocked();

  root.classList.toggle("is-search-mode", isSearchMode);

  const hint = root.querySelector("#roprime-search-hint");
  setHidden(hint, !showSearchHint);

  const pageTitle = root.querySelector("#roprime-page-title");
  if (pageTitle instanceof HTMLElement) {
    const titleKey = pageDef?.title || "settings.nav.appearance";
    pageTitle.textContent = accountSettingsPaneT(titleKey);
  }

  root.querySelectorAll(".roprime-nav-page").forEach((li) => {
    if (!(li instanceof HTMLElement)) return;
    const page = getNavPageKey(li);
    if (page === "developer" && !unlocked) {
      setHidden(li, true);
      return;
    }
    setHidden(li, false);
    const link = li.querySelector("a");
    if (link instanceof HTMLElement) {
      link.classList.toggle("active", !isSearchMode && page === activePage);
      if (!isSearchMode && page === activePage) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    }
  });

  const devHint = root.querySelector("#roprime-developer-unlock-message");
  setHidden(
    devHint,
    !root.classList.contains("roprime-developer-unlock-visible"),
  );

  root.querySelectorAll(`.${RP_SETTINGS_PAGE_CLASS}`).forEach((pageEl) => {
    if (!(pageEl instanceof HTMLElement)) return;
    const pageKey = getSettingsPageKey(pageEl);
    if (pageKey === "developer" && !unlocked) {
      setHidden(pageEl, true);
      return;
    }
    if (isSearchMode) {
      if (showSearchHint) {
        setHidden(pageEl, true);
        return;
      }
      if (!hasSearchTerm) {
        setHidden(pageEl, pageKey !== searchSourcePage);
        pageEl.querySelectorAll(".roprime-settings-card").forEach((section) => {
            if (section instanceof HTMLElement) section.style.display = "";
          });
        return;
      }
      if (pageKey === "info" || pageKey === "developer") {
        setHidden(pageEl, true);
        return;
      }
      let hasVisible = false;
      pageEl.querySelectorAll(".roprime-settings-card").forEach((section) => {
          if (!(section instanceof HTMLElement)) return;
          const text = (section.textContent || "").toLowerCase();
          const match = text.includes(searchTerm);
          section.style.display = match ? "" : "none";
          if (match) hasVisible = true;
        });
      setHidden(pageEl, !hasVisible);
      return;
    }
    pageEl.querySelectorAll(".roprime-settings-card").forEach((section) => {
      if (section instanceof HTMLElement) section.style.display = "";
    });
    setHidden(pageEl, pageKey !== activePage);
  });

  if (
    searchInput instanceof HTMLInputElement &&
    !isSearchMode &&
    searchInput.value
  ) {
    searchInput.value = "";
  }
}

function refreshSettingsUi(root) {
  applyI18n(root);
  syncLanguageMenuLabels(root);

  root.querySelectorAll(".roprime-setting-toggle").forEach((toggleEl) => {
    const key = getSettingKeyFromToggle(toggleEl);
    if (!key) return;
    setToggleChecked(toggleEl, !!settingsState[key]);
  });

  root
    .querySelectorAll(".roprime-rename-child, .roprime-setting-child")
    .forEach((toggleEl) => {
      if (!(toggleEl instanceof HTMLElement)) return;
      let parentKey = null;
      for (const cls of toggleEl.classList) {
        if (cls.startsWith("roprime-setting-child--")) {
          parentKey = cls.slice("roprime-setting-child--".length);
          break;
        }
      }
      if (toggleEl.classList.contains("roprime-rename-child")) {
        parentKey = "renameDropdownEnabled";
      }
      if (!parentKey) return;
      const enabled = !!settingsState[parentKey];
      toggleEl.classList.toggle("is-renames-disabled", !enabled);
      toggleEl.classList.toggle("is-setting-child-disabled", !enabled);
      const button = toggleEl.querySelector("button.btn-toggle");
      if (button instanceof HTMLButtonElement) button.disabled = !enabled;
    });

  syncSidebarSliderFromState(root);

  const activePage = getCurrentrp() || RP_DEFAULT_PAGE;
  const onSidebarContentPage = activePage === "sidebar-content";
  root.querySelectorAll(".roprime-open-sidebar-content").forEach((btn) => {
      if (!(btn instanceof HTMLElement)) return;
      setHidden(btn, onSidebarContentPage);
    });
  if (onSidebarContentPage) refreshSidebarContentList(root);

  syncCustomCssUi(root);
  syncCosmeticsUi(root);
  syncSearchBanSettingsUi(root);
  refreshSearchBanList(root);
  refreshSettingsSyncPreview(root);
  refreshLayoutAndNav(root);
}

function teardownSettings() {
  setSettingsHostVisible(false);
  setAccountSettingsShellClass(false);
  syncAccountSettingsLayoutInset();
  clearSettingsPageLayout();
  destroyCssEditor();
}

export function showRoPrimeSettingsPanel() {
  const host = ensureSettingsHost();
  if (!(host instanceof HTMLElement)) return;

  setAccountSettingsShellClass(true);
  syncAccountSettingsLayoutInset();
  setSettingsHostVisible(true);
  updateDocumentTitle(true);

  if (!host.classList.contains("roprime-bound")) {
    bindOnce(host);
  }
  refreshSettingsUi(host);
}

export function openRoPrimeSettingsOnAccountPage(page = RP_DEFAULT_PAGE) {
  if (!isMyAccountPath()) return false;

  ensureSettingsHost();

  const nextUrl = buildPluginUrl(page);
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (currentUrl !== nextUrl) {
    window.history.pushState({}, "", nextUrl);
    window.dispatchEvent(new Event("roprime-location-change"));
  }

  showRoPrimeSettingsPanel();
  return true;
}

export function syncProfileSettingsRoute() {
  if (!isMyAccountPath()) {
    teardownSettings();
    updateDocumentTitle(false);
    return;
  }

  ensureSettingsHost();

  if (!isPluginRoute()) {
    teardownSettings();
    updateDocumentTitle(false);
    return;
  }

  resolveSettingsMountHost();

  const rpPage = getCurrentrp();
  if (rpPage === "developer" && !settingsState.developerPageUnlocked) {
    const nextUrl = buildPluginUrl(RP_DEFAULT_PAGE);
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentUrl !== nextUrl) {
      window.history.replaceState({}, "", nextUrl);
      window.dispatchEvent(new Event("roprime-location-change"));
    }
  }

  showRoPrimeSettingsPanel();
}
