import { RP_ALWAYS_SHOW_CLOSE_STYLE_ID, settingsState } from "./core.js";

const RP_ALWAYS_CLOSE_COLLAPSED_CLASS = "roprime-always-close-collapsed";
const boundCloseButtons = new WeakSet();

function getAlwaysShowCloseCss() {
  const base = `
/* Always show Roblox sidebar close/menu control */
button.menu-button.btn-navigation-nav-menu-md {
  display: inline-flex !important;
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}

/* Keep top header items on one row: menu button -> Roblox logo -> page title */
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

/* Animate the visible 288px old-nav host when menu button toggles collapse class */
#roprime-classic-left-nav-host.roprime-classic-left-nav-host {
  top: 0 !important;
  margin-top: 0 !important;
  transition-property: transform, visibility !important;
  transition-duration: 100ms !important;
  transition-timing-function: var(--ease-standard-out, cubic-bezier(0.2, 0, 0, 1)) !important;
  transform: translateX(0) !important;
  visibility: visible !important;
  pointer-events: auto !important;
  will-change: transform;
}

html.${RP_ALWAYS_CLOSE_COLLAPSED_CLASS} #roprime-classic-left-nav-host,
body.${RP_ALWAYS_CLOSE_COLLAPSED_CLASS} #roprime-classic-left-nav-host,
html.roprime-old-navigation-bar-collapsed #roprime-classic-left-nav-host,
body.roprime-old-navigation-bar-collapsed #roprime-classic-left-nav-host {
  display: block !important;
  transform: translateX(-100%) !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

.content {
  padding-left: 2% !important;
}

@media (min-width: 1141px) {
  .no-gutter-ads.logged-in.left-nav-new-width {
    --left-nav-reserved-width: 0px !important;
  }
}

/* Keep Roblox brand in full logo mode */
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

/* Hide the compact "R" logo variant to prevent overlap */
a.nav-logo-link.navbar-brand span.icon-logo-r,
a.navbar-brand span.icon-logo-r,
.navbar-brand span.icon-logo-r {
  display: none !important;
}

`.trim();
  return base;
}

function forceCloseButtonInline() {
  // Some Roblox pages hide the button via inline styles / utility classes.
  // Setting these inline avoids fighting specificity, while keeping layout stable.
  const btn = document.querySelector("button.menu-button.btn-navigation-nav-menu-md");
  if (!(btn instanceof HTMLButtonElement)) return;
  // If Roblox sets `display:none` inline, undo it.
  if (btn.style.display === "none") btn.style.display = "inline-flex";
  btn.style.visibility = "visible";
  btn.style.opacity = "1";
  btn.style.pointerEvents = "auto";
  bindCloseButtonClick(btn);
}

function toggleOldNavHostCollapsed() {
  const root = document.documentElement;
  if (!root) return;
  const host = document.getElementById("roprime-classic-left-nav-host");
  if (host) root.classList.toggle(RP_ALWAYS_CLOSE_COLLAPSED_CLASS);

  const rails289 = Array.from(document.querySelectorAll(".width-\\[289px\\], [class~='width-[289px]']")).filter(
    (el) => el instanceof HTMLElement,
  );
  rails289.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    const hidden = getComputedStyle(el).display === "none";
    if (hidden) {
      el.style.display = el.dataset.rpPrevDisplay || "";
      delete el.dataset.rpPrevDisplay;
      return;
    }
    if (!el.dataset.rpPrevDisplay) el.dataset.rpPrevDisplay = el.style.display || "";
    el.style.display = "none";
  });
}

function bindCloseButtonClick(btn) {
  if (!(btn instanceof HTMLButtonElement)) return;
  if (boundCloseButtons.has(btn)) return;
  boundCloseButtons.add(btn);
  btn.addEventListener("click", toggleOldNavHostCollapsed, true);
}

function ensureObserver() {
  const root = document.documentElement;
  if (!root || root.getAttribute("data-roprime-always-close-observer") === "1") return;
  root.setAttribute("data-roprime-always-close-observer", "1");

  const obs = new MutationObserver(() => {
    if (!settingsState.alwaysShowCloseButtonEnabled) return;
    forceCloseButtonInline();
  });
  obs.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["style", "class"] });
}

export function syncAlwaysShowCloseButton() {
  const existingStyle = document.getElementById(RP_ALWAYS_SHOW_CLOSE_STYLE_ID);
  if (!settingsState.alwaysShowCloseButtonEnabled) {
    if (existingStyle instanceof HTMLStyleElement) existingStyle.remove();
    return;
  }
  ensureObserver();
  const css = getAlwaysShowCloseCss();
  if (existingStyle instanceof HTMLStyleElement) {
    if (existingStyle.textContent !== css) existingStyle.textContent = css;
    forceCloseButtonInline();
    return;
  }
  const style = document.createElement("style");
  style.id = RP_ALWAYS_SHOW_CLOSE_STYLE_ID;
  style.textContent = css;
  document.documentElement.appendChild(style);
  forceCloseButtonInline();
}

