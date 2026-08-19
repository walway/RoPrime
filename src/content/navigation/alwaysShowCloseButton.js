import {
  getSidebarMainMarginPx,
  isUserProfilePage,
  RP_ALWAYS_SHOW_CLOSE_STYLE_ID,
  settingsState,
  shouldApplySidebarModifications,
} from "../core/core.js";

const RP_ALWAYS_CLOSE_COLLAPSED_CLASS = "roprime-always-close-collapsed";
const RP_ALWAYS_CLOSE_PROFILE_ICON_CLASS = "roprime-always-close-profile-icon";
const RP_ALWAYS_CLOSE_PROFILE_SMALL_CLASS =
  "roprime-always-close-profile-small";
const RP_ALWAYS_CLOSE_PROFILE_FULL_CLASS = "roprime-always-close-profile-full";

const LEFT_NAV_UNUSED_CLASSES = ["large:visible", "large:[transform:unset]"];
const LEFT_NAV_VISIBLE_CLASS = "visible";
const LEFT_NAV_INVISIBLE_CLASS = "invisible";
const LEFT_NAV_HIDE_TRANSFORM_CLASS = "[transform:translateX(-100%)]";

const boundCloseButtons = new WeakSet();
let sidebarCollapsed = false;
let applyingLeftNavPanel = false;
let leftNavPanelObserver = null;
let observedLeftNavPanel = null;

function getLeftNavigationPanel() {
  const host = document.querySelector("#left-navigation-container");
  if (!(host instanceof HTMLElement)) return null;
  const panel = host.querySelector(":scope > div");
  return panel instanceof HTMLElement ? panel : null;
}

function desiredProfileMarginClass() {
  if (!isUserProfilePage()) return "";
  if (settingsState.sidebarIconsOnlyEnabled) {
    return RP_ALWAYS_CLOSE_PROFILE_ICON_CLASS;
  }
  if (settingsState.smallNewNavigationBarEnabled) {
    return RP_ALWAYS_CLOSE_PROFILE_SMALL_CLASS;
  }
  return RP_ALWAYS_CLOSE_PROFILE_FULL_CLASS;
}

function syncProfileMarginClasses() {
  const root = document.documentElement;
  if (!root) return;

  const next = desiredProfileMarginClass();
  const classes = [
    RP_ALWAYS_CLOSE_PROFILE_ICON_CLASS,
    RP_ALWAYS_CLOSE_PROFILE_SMALL_CLASS,
    RP_ALWAYS_CLOSE_PROFILE_FULL_CLASS,
  ];
  for (const cls of classes) {
    root.classList.toggle(cls, cls === next);
    document.body?.classList.toggle(cls, cls === next);
  }
}

function getAlwaysShowCloseCss() {
  const iconMargin = getSidebarMainMarginPx();
  const smallMargin = 200;

  return `
button.menu-button.btn-navigation-nav-menu-md {
  display: inline-flex !important;
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}

.navbar-header,
.rbx-header .rbx-navbar-header {
  display: flex !important;
  align-items: center !important;
}

button.menu-button.btn-navigation-nav-menu-md {
  order: 1 !important;
  flex: 0 0 auto !important;
}

a.nav-logo-link.navbar-brand,
a.navbar-brand,
.navbar-brand {
  order: 2 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  position: static !important;
  top: auto !important;
  left: auto !important;
  transform: none !important;
  margin: 0 8px !important;
  flex: 0 0 auto !important;
}

.font-header-2.nav-menu-title.text-header,
.nav-menu-title.font-header-2.text-header {
  order: 3 !important;
  margin-left: 0 !important;
}

html:root body#rbx-body .no-gutter-ads.logged-in.left-nav-new-width,
html:root body#rbx-body .left-nav-new-width,
html:root .left-nav-new-width {
  --left-nav-reserved-width: 0px !important;
}

a.nav-logo-link.navbar-brand span.icon-logo,
a.navbar-brand span.icon-logo,
.navbar-brand span.icon-logo {
  display: inline-block !important;
  position: static !important;
  top: auto !important;
  left: auto !important;
  transform: none !important;
  vertical-align: middle !important;
}

a.nav-logo-link.navbar-brand span.icon-logo-r,
a.navbar-brand span.icon-logo-r,
.navbar-brand span.icon-logo-r {
  display: none !important;
}
`.trim();
}

function leftNavMatchesDesiredState(panel, collapsed) {
  if (
    LEFT_NAV_UNUSED_CLASSES.some((token) => panel.classList.contains(token))
  ) {
    return false;
  }
  if (collapsed) {
    return (
      panel.classList.contains(LEFT_NAV_INVISIBLE_CLASS) &&
      !panel.classList.contains(LEFT_NAV_VISIBLE_CLASS) &&
      panel.classList.contains(LEFT_NAV_HIDE_TRANSFORM_CLASS)
    );
  }
  return (
    panel.classList.contains(LEFT_NAV_VISIBLE_CLASS) &&
    !panel.classList.contains(LEFT_NAV_INVISIBLE_CLASS) &&
    !panel.classList.contains(LEFT_NAV_HIDE_TRANSFORM_CLASS)
  );
}

function swapLeftNavVisibility(panel, collapsed) {
  panel.classList.remove(...LEFT_NAV_UNUSED_CLASSES);
  if (collapsed) {
    panel.classList.remove(LEFT_NAV_VISIBLE_CLASS);
    panel.classList.add(
      LEFT_NAV_INVISIBLE_CLASS,
      LEFT_NAV_HIDE_TRANSFORM_CLASS,
    );
    return;
  }
  panel.classList.remove(
    LEFT_NAV_INVISIBLE_CLASS,
    LEFT_NAV_HIDE_TRANSFORM_CLASS,
  );
  panel.classList.add(LEFT_NAV_VISIBLE_CLASS);
}

function applyLeftNavPanelState(collapsed) {
  const panel = getLeftNavigationPanel();
  if (!panel) return;
  if (leftNavMatchesDesiredState(panel, collapsed)) {
    observeLeftNavPanel(panel);
    return;
  }
  applyingLeftNavPanel = true;
  try {
    swapLeftNavVisibility(panel, collapsed);
  } finally {
    applyingLeftNavPanel = false;
  }
  observeLeftNavPanel(panel);
}

function observeLeftNavPanel(panel) {
  if (observedLeftNavPanel === panel && leftNavPanelObserver) return;
  leftNavPanelObserver?.disconnect();
  observedLeftNavPanel = panel;
  leftNavPanelObserver = new MutationObserver(() => {
    if (applyingLeftNavPanel) return;
    if (
      !settingsState.alwaysShowCloseButtonEnabled ||
      !shouldApplySidebarModifications()
    ) {
      return;
    }
    applyLeftNavPanelState(sidebarCollapsed);
  });
  leftNavPanelObserver.observe(panel, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

function stopLeftNavPanelObserver() {
  leftNavPanelObserver?.disconnect();
  leftNavPanelObserver = null;
  observedLeftNavPanel = null;
}

function forceCloseButtonInline() {
  const btn = document.querySelector(
    "button.menu-button.btn-navigation-nav-menu-md",
  );
  if (!(btn instanceof HTMLButtonElement)) return;

  if (btn.style.display === "none") btn.style.display = "inline-flex";
  if (btn.style.visibility !== "visible") btn.style.visibility = "visible";
  if (btn.style.opacity !== "1") btn.style.opacity = "1";
  if (btn.style.pointerEvents !== "auto") btn.style.pointerEvents = "auto";
  bindCloseButtonClick(btn);
}

function toggleLeftNavCollapsed() {
  sidebarCollapsed = !sidebarCollapsed;
  document.documentElement.classList.toggle(
    RP_ALWAYS_CLOSE_COLLAPSED_CLASS,
    sidebarCollapsed,
  );
  document.body?.classList.toggle(
    RP_ALWAYS_CLOSE_COLLAPSED_CLASS,
    sidebarCollapsed,
  );
  applyLeftNavPanelState(sidebarCollapsed);
  requestAnimationFrame(() => applyLeftNavPanelState(sidebarCollapsed));
}

function onCloseButtonClick(event) {
  if (!settingsState.alwaysShowCloseButtonEnabled) return;
  if (settingsState.sidebarCollapseMenuEnabled) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  toggleLeftNavCollapsed();
}

function bindCloseButtonClick(btn) {
  if (!(btn instanceof HTMLButtonElement)) return;
  if (boundCloseButtons.has(btn)) return;
  boundCloseButtons.add(btn);
  btn.addEventListener("click", onCloseButtonClick, true);
}

function ensureObserver() {
  const root = document.documentElement;
  if (!root || root.getAttribute("data-roprime-always-close-observer") === "1")
    return;
  root.setAttribute("data-roprime-always-close-observer", "1");

  const obs = new MutationObserver(() => {
    if (applyingLeftNavPanel) return;
    if (
      !settingsState.alwaysShowCloseButtonEnabled ||
      !shouldApplySidebarModifications()
    ) {
      return;
    }
    forceCloseButtonInline();
    applyLeftNavPanelState(sidebarCollapsed);
  });
  obs.observe(document.documentElement, {
    subtree: true,
    childList: true,
  });
}

function clearAlwaysShowCloseState() {
  sidebarCollapsed = false;
  stopLeftNavPanelObserver();
  document.documentElement.classList.remove(
    RP_ALWAYS_CLOSE_COLLAPSED_CLASS,
    RP_ALWAYS_CLOSE_PROFILE_ICON_CLASS,
    RP_ALWAYS_CLOSE_PROFILE_SMALL_CLASS,
    RP_ALWAYS_CLOSE_PROFILE_FULL_CLASS,
  );
  document.body?.classList.remove(
    RP_ALWAYS_CLOSE_COLLAPSED_CLASS,
    RP_ALWAYS_CLOSE_PROFILE_ICON_CLASS,
    RP_ALWAYS_CLOSE_PROFILE_SMALL_CLASS,
    RP_ALWAYS_CLOSE_PROFILE_FULL_CLASS,
  );
}

export function syncAlwaysShowCloseButton() {
  const existingStyle = document.getElementById(RP_ALWAYS_SHOW_CLOSE_STYLE_ID);
  if (
    !settingsState.alwaysShowCloseButtonEnabled ||
    !shouldApplySidebarModifications()
  ) {
    if (existingStyle instanceof HTMLStyleElement) existingStyle.remove();
    clearAlwaysShowCloseState();
    return;
  }

  syncProfileMarginClasses();
  ensureObserver();
  const css = getAlwaysShowCloseCss();
  if (existingStyle instanceof HTMLStyleElement) {
    if (existingStyle.textContent !== css) existingStyle.textContent = css;
    forceCloseButtonInline();
    applyLeftNavPanelState(sidebarCollapsed);
    return;
  }
  const style = document.createElement("style");
  style.id = RP_ALWAYS_SHOW_CLOSE_STYLE_ID;
  style.textContent = css;
  document.documentElement.appendChild(style);
  forceCloseButtonInline();
  applyLeftNavPanelState(sidebarCollapsed);
}
