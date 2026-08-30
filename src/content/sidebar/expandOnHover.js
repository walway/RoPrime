import { registerFeature } from "../features/registry.js";
import {
  RP_SIDEBAR_COMPACT_STYLE_ID,
  settingsState,
  shouldApplySidebarModifications,
  syncAccountSettingsLayoutInset,
} from "../core/core.js";
import {
  syncSidebarCompactDecorations,
  updateSidebarCompactVisibility,
} from "./sidebarCompact.js";
import { updateSmallNewNavVisibility } from "./smallNewNav.js";

const RP_EXPAND_ON_HOVER_ACTIVE_CLASS =
  "roprime-sidebar-expand-on-hover-active";
const RP_EXPAND_ON_HOVER_EXPANDED_CLASS =
  "roprime-sidebar-expand-on-hover-expanded";
const RP_EXPAND_ON_HOVER_EXPANDED_STYLE_ID =
  "roprime-sidebar-expand-on-hover-expanded-style";

const SIDEBAR_FULL_WIDTH_PX = 289;

let boundNav = null;
let hoverExpanded = false;
let navObserver = null;

const EXPANDED_SIDEBAR_CSS = `
body .no-gutter-ads.logged-in.left-nav-new-width {
  --left-nav-reserved-width: ${SIDEBAR_FULL_WIDTH_PX}px !important;
}
.rollercoaster-background {
  margin-left: ${SIDEBAR_FULL_WIDTH_PX}px !important;
}
.left-nav.fixed {
  width: ${SIDEBAR_FULL_WIDTH_PX}px !important;
  min-width: ${SIDEBAR_FULL_WIDTH_PX}px !important;
  max-width: ${SIDEBAR_FULL_WIDTH_PX}px !important;
}
.left-nav.fixed .simplebar-wrapper,
.left-nav.fixed .simplebar-mask,
.left-nav.fixed .simplebar-offset,
.left-nav.fixed .simplebar-content-wrapper,
.left-nav.fixed .simplebar-content {
  max-width: ${SIDEBAR_FULL_WIDTH_PX}px !important;
}
`;

function getLeftNav() {
  const nav = document.querySelector(".left-nav.fixed, .left-nav");
  return nav instanceof HTMLElement ? nav : null;
}

function setHoverExpanded(expanded) {
  if (hoverExpanded === expanded) return;
  hoverExpanded = expanded;
  document.documentElement.classList.toggle(
    RP_EXPAND_ON_HOVER_EXPANDED_CLASS,
    expanded,
  );

  const expandedStyle = document.getElementById(
    RP_EXPAND_ON_HOVER_EXPANDED_STYLE_ID,
  );
  if (expanded) {
    document.getElementById(RP_SIDEBAR_COMPACT_STYLE_ID)?.remove();
    let style = expandedStyle;
    if (!(style instanceof HTMLStyleElement)) {
      style = document.createElement("style");
      style.id = RP_EXPAND_ON_HOVER_EXPANDED_STYLE_ID;
      document.documentElement.appendChild(style);
    }
    style.textContent = EXPANDED_SIDEBAR_CSS;
  } else {
    expandedStyle?.remove();
    updateSidebarCompactVisibility();
    syncSidebarCompactDecorations();
  }

  syncAccountSettingsLayoutInset();
}

function onNavMouseEnter() {
  if (!settingsState.expandSidebarOnHoverEnabled) return;
  setHoverExpanded(true);
}

function onNavMouseLeave() {
  if (!settingsState.expandSidebarOnHoverEnabled) return;
  setHoverExpanded(false);
}

function unbindNavHover() {
  if (!(boundNav instanceof HTMLElement)) return;
  boundNav.removeEventListener("mouseenter", onNavMouseEnter);
  boundNav.removeEventListener("mouseleave", onNavMouseLeave);
  boundNav = null;
}

function bindNavHover(nav) {
  if (boundNav === nav) return;
  unbindNavHover();
  boundNav = nav;
  nav.addEventListener("mouseenter", onNavMouseEnter);
  nav.addEventListener("mouseleave", onNavMouseLeave);
}

function stopNavObserver() {
  navObserver?.disconnect();
  navObserver = null;
}

function ensureNavObserver() {
  if (navObserver) return;
  navObserver = new MutationObserver(() => {
    if (!settingsState.expandSidebarOnHoverEnabled) return;
    const nav = getLeftNav();
    if (nav instanceof HTMLElement) bindNavHover(nav);
  });
  navObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

function applyIconOnlySidebarState() {
  settingsState.sidebarSize = "icon";
  settingsState.sidebarIconsOnlyEnabled = true;
  settingsState.smallNewNavigationBarEnabled = false;
  updateSmallNewNavVisibility();
  if (!hoverExpanded) {
    updateSidebarCompactVisibility();
    syncSidebarCompactDecorations();
  }
}

function clearExpandOnHoverUi() {
  setHoverExpanded(false);
  unbindNavHover();
  stopNavObserver();
  document.documentElement.classList.remove(RP_EXPAND_ON_HOVER_ACTIVE_CLASS);
  document.getElementById(RP_EXPAND_ON_HOVER_EXPANDED_STYLE_ID)?.remove();
}

export function syncExpandSidebarOnHover() {
  const enabled =
    !!settingsState.expandSidebarOnHoverEnabled &&
    shouldApplySidebarModifications();

  document.documentElement.classList.toggle(
    RP_EXPAND_ON_HOVER_ACTIVE_CLASS,
    enabled,
  );

  if (!enabled) {
    clearExpandOnHoverUi();
    return;
  }

  applyIconOnlySidebarState();
  ensureNavObserver();

  const nav = getLeftNav();
  if (nav instanceof HTMLElement) bindNavHover(nav);
}

registerFeature(syncExpandSidebarOnHover);
