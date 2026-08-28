import { saveSettings, settingsState } from "../core/core.js";
import {
  getRobloxUserId,
  peekRobloxUserId,
} from "../profile/robloxUserId.js";
import { setHidden } from "../ui/visibility.js";

const ROBLOX_PLUS_MEMBERSHIP_API =
  "https://premiumfeatures.roblox.com/v1/users/{userId}/validate-membership";

const APP_THEME_HOST_ID = "roprime-app-theme-section";
const APP_THEME_ATTR = "data-roprime-app-theme";

export const ROBLOX_THEMES_CLASSES = [
  // Calm
  "polar-freeze-theme",
  "electric-lime-theme",
  "star-burst-theme",
  "cosmic-dust-theme",
  "super-charge-theme",
  "lava-glow-theme",
  "pixel-pop-theme",
  
  // Dynamic
  "nitro-frost-theme",
  "kinetic-energy-theme",
  "hyper-plum-theme",
  "nebula-drift-theme",
  "circuit-rush-theme",
  "inferno-blast-theme",
  "quantum-pulse-theme",
];

const DYNAMIC_THEMES = [
  {
    id: "",
    name: "Default",
    darkColor: "rgb(18, 18, 21)",
    lightColor: "rgb(255, 255, 255)",
  },
  {
    id: "cosmic-dust-theme",
    name: "Cosmic Dust",
    darkColor: "rgb(102, 37, 208)",
    lightColor: "rgb(203, 183, 253)",
  },
  {
    id: "polar-freeze-theme",
    name: "Polar Freeze",
    darkColor: "rgb(6, 86, 132)",
    lightColor: "rgb(108, 209, 237)",
  },
  {
    id: "super-charge-theme",
    name: "Super Charge",
    darkColor: "rgb(4, 93, 74)",
    lightColor: "rgb(129, 216, 135)",
  },
  {
    id: "electric-lime-theme",
    name: "Electric Lime",
    darkColor: "rgb(69, 89, 3)",
    lightColor: "rgb(180, 209, 89)",
  },
  {
    id: "lava-glow-theme",
    name: "Lava Glow",
    darkColor: "rgb(167, 24, 17)",
    lightColor: "rgb(251, 178, 169)",
  },
  {
    id: "star-burst-theme",
    name: "Star Burst",
    darkColor: "rgb(165, 9, 79)",
    lightColor: "rgb(251, 173, 198)",
  },
  {
    id: "pixel-pop-theme",
    name: "Pixel Pop",
    darkColor: "rgb(142, 31, 142)",
    lightColor: "rgb(247, 172, 244)",
  },
];

const CALM_THEMES = [
  {
    id: "",
    name: "Default",
    darkColor: "rgb(18, 18, 21)",
    lightColor: "rgb(255, 255, 255)",
  },
  {
    id: "nebula-drift-theme",
    name: "Nebula Drift",
    darkColor: "rgb(72, 11, 152)",
    lightColor: "rgb(221, 207, 254)",
  },
  {
    id: "nitro-frost-theme",
    name: "Nitro Frost",
    darkColor: "rgb(4, 59, 93)",
    lightColor: "rgb(152, 227, 244)",
  },
  {
    id: "circuit-rush-theme",
    name: "Circuit Rush",
    darkColor: "rgb(4, 62, 50)",
    lightColor: "rgb(173, 231, 177)",
  },
  {
    id: "kinetic-energy-theme",
    name: "Kinetic Energy",
    darkColor: "rgb(46, 60, 2)",
    lightColor: "rgb(202, 227, 136)",
  },
  {
    id: "inferno-blast-theme",
    name: "Inferno Blast",
    darkColor: "rgb(107, 15, 11)",
    lightColor: "rgb(254, 206, 200)",
  },
  {
    id: "hyper-plum-theme",
    name: "Hyper Plum",
    darkColor: "rgb(113, 4, 55)",
    lightColor: "rgb(251, 201, 216)",
  },
  {
    id: "quantum-pulse-theme",
    name: "Quantum Pulse",
    darkColor: "rgb(93, 14, 93)",
    lightColor: "rgb(251, 200, 248)",
  },
];

const TAB_SELECTED_CLASS =
  "bg-inverse-surface-0 content-inverse-emphasis relative clip group/interactable focus-visible:outline-focus disabled:outline-none cursor-pointer relative flex justify-center items-center radius-circle stroke-none padding-left-small padding-right-small height-600 text-label-small";
const TAB_IDLE_CLASS =
  "bg-shift-300 content-action-utility relative clip group/interactable focus-visible:outline-focus disabled:outline-none cursor-pointer relative flex justify-center items-center radius-circle stroke-none padding-left-small padding-right-small height-600 text-label-small";
const CARD_SELECTED_CLASS =
  "flex items-center gap-small width-full padding-medium radius-medium text-align-x-start stroke-standard cursor-pointer bg-shift-200 stroke-[var(--color-system-neutral)]";
const CARD_IDLE_CLASS =
  "flex items-center gap-small width-full padding-medium radius-medium text-align-x-start stroke-standard cursor-pointer bg-none stroke-emphasis";

let themeObserver = null;
let panelObserver = null;
let applyingTheme = false;
let initialized = false;
let initStarted = false;
let initPromise = null;
let plusMembership = null;
let activePalette = "dynamic";
let panelSyncFrame = 0;

function isBrowserPreferencesRoute() {
  const hash = (window.location.hash || "").toLowerCase();
  return (
    hash.includes("browser-preferences") || hash.includes("browserpreferences")
  );
}

function getSavedThemeClass() {
  const saved =
    typeof settingsState.robloxFreeThemeClass === "string"
      ? settingsState.robloxFreeThemeClass.trim()
      : "";
  if (saved && !ROBLOX_THEMES_CLASSES.includes(saved)) return "";
  return saved;
}

function paletteForTheme(themeClass) {
  if (CALM_THEMES.some((theme) => theme.id && theme.id === themeClass)) {
    return "calm";
  }
  return "dynamic";
}

function themesForPalette(palette) {
  return palette === "calm" ? CALM_THEMES : DYNAMIC_THEMES;
}

function isRobloxLightTheme(body = document.body) {
  return body instanceof HTMLBodyElement && body.classList.contains("light-theme");
}

function themeSwatchColor(theme, body = document.body) {
  return isRobloxLightTheme(body) ? theme.lightColor : theme.darkColor;
}

function stripThemeClasses(body = document.body) {
  if (!(body instanceof HTMLBodyElement)) return;
  for (const themeClass of ROBLOX_THEMES_CLASSES) {
    body.classList.remove(themeClass);
  }
}

function appendThemeClass(body, themeClass) {
  if (!(body instanceof HTMLBodyElement)) return;
  stripThemeClasses(body);
  if (themeClass) body.classList.add(themeClass);
}

async function hasRobloxPlusMembership(userId) {
  if (plusMembership != null) return plusMembership;
  const url = ROBLOX_PLUS_MEMBERSHIP_API.replace("{userId}", String(userId));
  try {
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
      plusMembership = false;
      return false;
    }
    const text = (await response.text()).trim().toLowerCase();
    plusMembership = text === "true";
    return plusMembership;
  } catch {
    plusMembership = false;
    return false;
  }
}

function canUseFreeThemes() {
  return plusMembership !== true;
}

function activateFreeThemes() {
  if (initialized) return;
  initialized = true;
  activePalette = paletteForTheme(getSavedThemeClass());
  applySavedThemeClass();
  installThemeObserver();
  injectThemePanel();
}

function teardownFreeThemes() {
  if (!initialized && !document.getElementById(APP_THEME_HOST_ID)) return;
  initialized = false;
  stopPanelObserver();
  document.getElementById(APP_THEME_HOST_ID)?.remove();
}

function persistThemeClass(themeClass) {
  const next = typeof themeClass === "string" ? themeClass : "";
  if (settingsState.robloxFreeThemeClass === next) return;
  settingsState.robloxFreeThemeClass = next;
  saveSettings();
}

function applySavedThemeClass() {
  if (!canUseFreeThemes()) return;
  const saved = getSavedThemeClass();
  const body = document.body;
  if (!(body instanceof HTMLBodyElement)) return;

  const hasSaved = saved ? body.classList.contains(saved) : true;
  const hasExtra = ROBLOX_THEMES_CLASSES.some(
    (themeClass) => themeClass !== saved && body.classList.contains(themeClass),
  );
  if (hasSaved && !hasExtra) return;

  applyingTheme = true;
  try {
    appendThemeClass(body, saved);
  } finally {
    applyingTheme = false;
  }
}

function selectTheme(themeClass) {
  persistThemeClass(themeClass);
  applySavedThemeClass();
  refreshThemePanelUi();
}

function createStateLayer() {
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.dataset.testid = "foundation-web-state-layer";
  layer.className =
    "absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none";
  return layer;
}

function createTabButton(label, palette) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.roprimeThemePalette = palette;
  button.className =
    activePalette === palette ? TAB_SELECTED_CLASS : TAB_IDLE_CLASS;
  if (palette === "dynamic") {
    button.setAttribute("aria-pressed", String(activePalette === "dynamic"));
  }
  button.style.textDecoration = "none";
  button.appendChild(createStateLayer());
  const text = document.createElement("span");
  text.className = "padding-y-xsmall text-no-wrap text-truncate-end";
  text.textContent = label;
  button.appendChild(text);
  button.addEventListener("click", () => {
    activePalette = palette;
    refreshThemePanelUi();
  });
  return button;
}

function createThemeCard(theme) {
  const selected = getSavedThemeClass() === theme.id;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.testid = "app-theme-card";
  button.dataset.roprimeThemeId = theme.id;
  button.setAttribute("aria-pressed", String(selected));
  button.className = selected ? CARD_SELECTED_CLASS : CARD_IDLE_CLASS;

  const swatch = document.createElement("span");
  swatch.setAttribute("aria-hidden", "true");
  swatch.className = "shrink-0 size-800 radius-circle stroke-standard stroke-muted";
  swatch.style.backgroundColor = themeSwatchColor(theme);

  const name = document.createElement("span");
  name.className =
    "fill basis-0 min-width-0 text-no-wrap text-truncate-end text-body-medium content-default";
  name.textContent = theme.name;

  button.append(swatch, name);
  button.addEventListener("click", () => {
    selectTheme(theme.id);
  });
  return button;
}

function buildThemePanel() {
  const section = document.createElement("div");
  section.className = "setting-section";
  section.id = APP_THEME_HOST_ID;
  section.setAttribute(APP_THEME_ATTR, "1");

  const wrap = document.createElement("div");
  const inner = document.createElement("div");
  inner.className = "app-theme-section flex flex-col gap-large";
  inner.setAttribute(APP_THEME_ATTR, "1");

  const heading = document.createElement("div");
  heading.className = "flex flex-col gap-xsmall";

  const titleRow = document.createElement("div");
  titleRow.className = "flex items-center gap-small";
  const title = document.createElement("span");
  title.className = "text-title-medium content-emphasis";
  title.textContent = "App theme";
  const badge = document.createElement("div");
  badge.className =
    "foundation-web-badge flex items-center select-none gap-[var(--size-150)] radius-circle height-600 width-[fit-content] padding-x-small bg-shift-200 content-emphasis stroke-none";
  const badgeText = document.createElement("span");
  badgeText.className =
    "text-no-wrap text-truncate-split text-label-small padding-y-xsmall padding-x-xxsmall content-emphasis";
  badgeText.textContent = "New";
  badge.appendChild(badgeText);
  titleRow.append(title, badge);

  const description = document.createElement("p");
  description.className = "text-body-medium content-muted margin-none";
  description.textContent =
    "Choose a theme to customize your experience. Your selection is saved with RoPrime.";
  heading.append(titleRow, description);

  const tabs = document.createElement("div");
  tabs.className = "flex flex-wrap gap-small";
  tabs.setAttribute("role", "group");
  tabs.setAttribute("aria-label", "App theme");
  tabs.setAttribute("data-roprime-theme-tabs", "1");
  tabs.append(createTabButton("Dynamic", "dynamic"), createTabButton("Calm", "calm"));

  const grid = document.createElement("div");
  grid.className = "grid gap-medium [grid-template-columns:repeat(2,minmax(0,1fr))]";
  grid.setAttribute("data-roprime-theme-grid", "1");
  for (const theme of themesForPalette(activePalette)) {
    grid.appendChild(createThemeCard(theme));
  }

  inner.append(heading, tabs, grid);
  wrap.appendChild(inner);
  section.appendChild(wrap);
  return section;
}

function refreshThemePanelUi() {
  const host = document.getElementById(APP_THEME_HOST_ID);
  if (!(host instanceof HTMLElement)) return;

  host.querySelectorAll("[data-roprime-theme-palette]").forEach((node) => {
    if (!(node instanceof HTMLButtonElement)) return;
    const palette = node.getAttribute("data-roprime-theme-palette") || "dynamic";
    const selected = palette === activePalette;
    node.className = selected ? TAB_SELECTED_CLASS : TAB_IDLE_CLASS;
    if (palette === "dynamic") {
      node.setAttribute("aria-pressed", String(selected));
    } else {
      node.removeAttribute("aria-pressed");
    }
  });

  const grid = host.querySelector("[data-roprime-theme-grid]");
  if (!(grid instanceof HTMLElement)) return;
  grid.replaceChildren();
  for (const theme of themesForPalette(activePalette)) {
    grid.appendChild(createThemeCard(theme));
  }
}

function hideNativeAppThemeSections(container) {
  container.querySelectorAll(".app-theme-section").forEach((section) => {
    if (!(section instanceof HTMLElement)) return;
    if (section.getAttribute(APP_THEME_ATTR) === "1") return;
    const settingSection = section.closest(".setting-section");
    const target =
      settingSection instanceof HTMLElement ? settingSection : section;
    if (target.id === APP_THEME_HOST_ID) return;
    if (target.classList.contains("hidden") && target.style.display === "none") return;
    setHidden(target, true);
    target.classList.add("roprime-native-app-theme-hidden");
    target.style.display = "none";
  });
}

let injectingPanel = false;

function placeThemePanel(container, host) {
  if (container.lastElementChild !== host) {
    container.appendChild(host);
  }
}

function injectThemePanel() {
  if (injectingPanel) return;
  if (!canUseFreeThemes() || !isBrowserPreferencesRoute()) {
    stopPanelObserver();
    document.getElementById(APP_THEME_HOST_ID)?.remove();
    return;
  }

  const container = document.querySelector(
    "#react-user-account-base .settings-container-v2",
  );
  if (!(container instanceof HTMLElement)) {
    startPanelObserver();
    return;
  }

  injectingPanel = true;
  try {
    hideNativeAppThemeSections(container);

    let host = document.getElementById(APP_THEME_HOST_ID);
    if (!(host instanceof HTMLElement)) {
      activePalette = paletteForTheme(getSavedThemeClass());
      host = buildThemePanel();
      container.appendChild(host);
    } else if (host.parentElement !== container) {
      container.appendChild(host);
    }

    placeThemePanel(container, host);
    startPanelObserver();
  } finally {
    injectingPanel = false;
  }
}

function schedulePanelSync() {
  if (panelSyncFrame) return;
  panelSyncFrame = requestAnimationFrame(() => {
    panelSyncFrame = 0;
    injectThemePanel();
  });
}

function startPanelObserver() {
  const root = document.getElementById("react-user-account-base");
  if (panelObserver || !(root instanceof HTMLElement)) return;
  panelObserver = new MutationObserver(() => {
    if (injectingPanel) return;
    schedulePanelSync();
  });
  panelObserver.observe(root, { childList: true, subtree: true });
}

function stopPanelObserver() {
  if (panelSyncFrame) {
    cancelAnimationFrame(panelSyncFrame);
    panelSyncFrame = 0;
  }
  panelObserver?.disconnect();
  panelObserver = null;
}

function installThemeObserver() {
  if (themeObserver || !(document.body instanceof HTMLBodyElement)) return;
  let lastLight = isRobloxLightTheme();
  themeObserver = new MutationObserver(() => {
    if (applyingTheme) return;
    applySavedThemeClass();
    const nextLight = isRobloxLightTheme();
    if (nextLight !== lastLight) {
      lastLight = nextLight;
      refreshThemePanelUi();
    }
  });
  themeObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

export function syncFreeRobloxTheme() {
  if (!canUseFreeThemes()) {
    teardownFreeThemes();
    return;
  }

  applySavedThemeClass();

  if (!initStarted) {
    void ensureFreeThemesInitialized();
  }

  if (isBrowserPreferencesRoute()) {
    injectThemePanel();
    return;
  }

  stopPanelObserver();
  document.getElementById(APP_THEME_HOST_ID)?.remove();
}

async function verifyFreeThemesEligibility() {
  const userId = peekRobloxUserId() ?? (await getRobloxUserId());
  if (!userId) {
    teardownFreeThemes();
    return false;
  }

  if (plusMembership === true) {
    teardownFreeThemes();
    return false;
  }

  if (plusMembership === false) {
    return true;
  }

  const isPlus = await hasRobloxPlusMembership(userId);
  if (isPlus) {
    teardownFreeThemes();
    return false;
  }

  return true;
}

async function ensureFreeThemesInitialized() {
  if (initPromise) return initPromise;
  initStarted = true;

  initPromise = (async () => {
    if (!(document.body instanceof HTMLBodyElement)) return;

    if (plusMembership !== true) {
      activateFreeThemes();
      injectThemePanel();
    }

    const eligible = await verifyFreeThemesEligibility();
    if (!eligible) return;

    activateFreeThemes();
    injectThemePanel();
  })();

  return initPromise;
}

export async function initFreeRobloxThemes() {
  await ensureFreeThemesInitialized();
}

import { registerFeature } from '../features/registry.js';
registerFeature(syncFreeRobloxTheme);

