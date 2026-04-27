import { RP_SIDEBAR_COMPACT_STYLE_ID, settingsState } from "./core.js";

const RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS = "roprime-leftnav-official-store";
const RP_LEFTNAV_PROFILE_LI_CLASS = "roprime-leftnav-profile";
const RP_SIDEBAR_PLUS_ITEM_ID = "roprime-sidebar-plus-item";
const RP_SIDEBAR_PLUS_BTN_CLASS = "roprime-sidebar-plus-btn";
const RP_SIDEBAR_PLUS_ICON_CLASS = "roprime-sidebar-plus-icon";
const RP_RBLX_PLUS_LOGO_URL =
    typeof chrome !== "undefined" && chrome.runtime && typeof chrome.runtime.getURL === "function"
        ? chrome.runtime.getURL("resources/RblxPlusLogo.webp")
        : "resources/RblxPlusLogo.webp";
const ROBLOX_LOCALE_SEGMENT_REGEX = /^[a-z]{2}(?:-[a-z]{2})?$/i;

const SIDEBAR_COMPACT_RAIL_PX = 72;
const SIDEBAR_COMPACT_ICON_PX = 48;

const SIDEBAR_COMPACT_CSS = `
body .no-gutter-ads.logged-in.left-nav-new-width {
  --left-nav-reserved-width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
}
.left-nav.fixed {
  width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
  box-sizing: border-box !important;
  overflow-x: clip !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
.left-nav.fixed::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
}
.left-nav.fixed .stroke-default.self-stretch,
.left-nav.fixed [class*="stroke-default"][class*="self-stretch"] {
  position: absolute !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  left: auto !important;
  width: 0 !important;
  min-width: 0 !important;
  max-width: none !important;
  height: 100% !important;
  min-height: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  flex: none !important;
  flex-shrink: 0 !important;
  align-self: stretch !important;
  opacity: 1 !important;
  visibility: visible !important;
  display: block !important;
  z-index: 40 !important;
  pointer-events: none !important;
  box-sizing: border-box !important;
  border: none !important;
  border-right: 1px solid var(--stroke-default, rgba(255, 255, 255, 0.16)) !important;
  background-color: transparent !important;
  background-image: none !important;
  overflow: visible !important;
}
.left-nav.fixed .simplebar-wrapper,
.left-nav.fixed .simplebar-mask,
.left-nav.fixed .simplebar-offset,
.left-nav.fixed .simplebar-content-wrapper,
.left-nav.fixed .simplebar-content {
  box-sizing: border-box !important;
  min-width: 0 !important;
  max-width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
  overflow-x: clip !important;
}
.left-nav.fixed .simplebar-content-wrapper {
  overflow-y: auto !important;
}
.left-nav.fixed .simplebar-track.simplebar-horizontal,
.left-nav.fixed .simplebar-scrollbar.simplebar-horizontal {
  display: none !important;
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
  height: 0 !important;
  min-height: 0 !important;
}
.left-nav.fixed.width-\\[288px\\],
.left-nav.fixed.width-\\[289px\\],
.left-nav.fixed .width-\\[288px\\],
.left-nav.fixed .width-\\[289px\\],
.left-nav.fixed [class~="width-[288px]"],
.left-nav.fixed [class~="width-[289px]"] {
  width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
  box-sizing: border-box !important;
}
.left-nav.fixed .width-\\[288px\\] {
  width: 100% !important;
  max-width: 250px !important; /* Limits size but allows it to shrink */
}
.left-nav.fixed .width-\\[288px\\] {
  overflow-x: hidden !important;
}
.left-nav.fixed ul,
.left-nav.fixed ol {
  box-sizing: border-box !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  align-items: center !important;
}
.left-nav.fixed div:has(> li) {
  box-sizing: border-box !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  align-items: center !important;
}
.left-nav.fixed li {
  box-sizing: border-box !important;
  width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  padding: 0 !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-grow: 0 !important;
  flex-shrink: 0 !important;
  flex-basis: auto !important;
  align-self: center !important;
  overflow: hidden !important;
}
.left-nav.fixed a[href] .truncate,
.left-nav.fixed a[href] [class*="line-clamp"],
.left-nav.fixed a[href] [class*="line-clamp-"],
.left-nav.fixed a[href] > span[class*="text-"]:not([class*="badge"]):not([class*="Badge"]),
.left-nav.fixed a[href] span[class*="font-body"],
.left-nav.fixed a[href] p[class*="text-"] {
  display: none !important;
}
.left-nav.fixed span.text-truncate-end.text-no-wrap,
.left-nav.fixed span[class*="text-truncate-end"][class*="text-no-wrap"] {
  display: none !important;
}
.left-nav.fixed span.flex.gap-xsmall.min-width-0.align-items-center,
.left-nav.fixed span.flex.gap-xsmall.min-width-0.items-center,
.left-nav.fixed span[class*="gap-xsmall"][class*="min-width-0"][class*="align-items-center"],
.left-nav.fixed span[class*="gap-xsmall"][class*="min-width-0"][class*="items-center"] {
  display: none !important;
}
.left-nav.fixed a[href] {
  box-sizing: border-box !important;
  width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  padding: 0 !important;
  margin: 0 !important;
  justify-content: center !important;
  align-items: center !important;
  gap: 0 !important;
  flex-shrink: 0 !important;
}
.left-nav.fixed a[href] svg,
.left-nav.fixed a[href] img {
  width: 26px !important;
  height: 26px !important;
  max-width: 26px !important;
  max-height: 26px !important;
}
.left-nav.fixed li:has(a[href*="premium" i]),
.left-nav.fixed a[href*="/premium" i],
.left-nav.fixed a[href*="premium" i],
.left-nav.fixed button[aria-label*="Premium" i],
.left-nav.fixed button[aria-label*="Get Premium" i],
.left-nav.fixed li:has(a[aria-label*="Official Store" i]),
.left-nav.fixed a[aria-label*="Official Store" i],
.left-nav.fixed a[title*="Official Store" i],
.left-nav.fixed a[href*="/sponsored" i],
.left-nav.fixed li:has(a[href*="/sponsored" i]) {
  display: none !important;
}
.left-nav.fixed li:has(button[aria-label*="Premium" i]) {
  display: none !important;
}
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} > span.size-1000 ~ span,
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} > span:not([class]) {
  display: none !important;
}
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} {
  box-sizing: border-box !important;
  width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  padding: 0 !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0 !important;
  flex-shrink: 0 !important;
  position: relative !important;
  overflow: hidden !important;
}
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} > div.absolute,
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} > div[class*="inset-"] {
  box-sizing: border-box !important;
  width: 100% !important;
  height: 100% !important;
  inset: 0 !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
}
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} > span.size-1000 {
  box-sizing: border-box !important;
  width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  flex: 0 0 ${SIDEBAR_COMPACT_ICON_PX}px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  margin: 0 !important;
  padding: 0 !important;
}
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} svg,
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} .icon-regular-building-store {
  width: 26px !important;
  height: 26px !important;
  max-width: 26px !important;
  max-height: 26px !important;
}
.left-nav.fixed li.${RP_LEFTNAV_PROFILE_LI_CLASS} a[href] {
  width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  overflow: hidden !important;
}
.left-nav.fixed li#${RP_SIDEBAR_PLUS_ITEM_ID} {
  margin-top: auto !important;
}
.left-nav.fixed button.${RP_SIDEBAR_PLUS_BTN_CLASS} {
  box-sizing: border-box !important;
  width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  margin: 0 !important;
  border-radius: 12px !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  background: #3a3d43 !important;
  cursor: pointer !important;
  overflow: hidden !important;
}
.left-nav.fixed button.${RP_SIDEBAR_PLUS_BTN_CLASS}:hover {
  filter: brightness(1.06) !important;
}
.left-nav.fixed button.${RP_SIDEBAR_PLUS_BTN_CLASS} .${RP_SIDEBAR_PLUS_ICON_CLASS} {
  width: 26px !important;
  height: 26px !important;
  max-width: 26px !important;
  max-height: 26px !important;
  object-fit: contain !important;
}
html.light-theme .left-nav.fixed button.${RP_SIDEBAR_PLUS_BTN_CLASS},
body.light-theme .left-nav.fixed button.${RP_SIDEBAR_PLUS_BTN_CLASS} {
  background: #e2e6ea !important;
  border-color: rgba(39, 43, 50, 0.16) !important;
}
html.dark-theme .left-nav.fixed button.${RP_SIDEBAR_PLUS_BTN_CLASS},
body.dark-theme .left-nav.fixed button.${RP_SIDEBAR_PLUS_BTN_CLASS} {
  background: #3a3d43 !important;
  border-color: rgba(255, 255, 255, 0.12) !important;
}
.left-nav.fixed li:has(a[href*="/messages" i]) {
  overflow: visible !important;
  position: relative !important;
  z-index: 80 !important;
}
.left-nav.fixed a[href*="/messages" i],
.left-nav.fixed a[href*="/messages" i]:hover,
.left-nav.fixed a[href*="/messages" i]:focus-visible,
.left-nav.fixed a[href*="/messages" i]:active {
  position: relative !important;
  overflow: visible !important;
  z-index: 1 !important;
  border-radius: var(--radius-medium, 10px) !important;
}
.left-nav.fixed a[href*="/messages" i] > div,
.left-nav.fixed a[href*="/messages" i] > div.absolute,
.left-nav.fixed a[href*="/messages" i] > div[class*="inset-"],
.left-nav.fixed a[href*="/messages" i] > span[class*="absolute"],
.left-nav.fixed a[href*="/messages" i] > span[class*="inset-"],
.left-nav.fixed a[href*="/messages" i] [class*="inset-"][class*="absolute"],
.left-nav.fixed a[href*="/messages" i]::before,
.left-nav.fixed a[href*="/messages" i]::after {
  border-radius: var(--radius-medium, 10px) !important;
}
.left-nav.fixed a[href*="/messages" i] > span.grow-0.shrink-0.basis-auto.icon.icon-regular-speech-bubble-align-center,
.left-nav.fixed a[href*="/messages" i] span.icon-regular-speech-bubble-align-center {
  position: relative !important;
  z-index: 1 !important;
}
.left-nav.fixed a[href*="/messages" i] span.fill.basis-auto.padding-x-small.flex.justify-end.items-center,
.left-nav.fixed a[href*="/messages" i] span.fill[class*="basis-auto"][class*="padding-x-small"][class*="justify-end"][class*="items-center"],
.left-nav.fixed a[href*="/messages" i] .foundation-web-badge,
.left-nav.fixed a[href*="/messages" i] [class*="foundation-web-badge"] {
  position: absolute !important;
  top: 4px !important;
  right: 4px !important;
  left: auto !important;
  bottom: auto !important;
  margin: 0 !important;
  z-index: 250 !important;
  transform: scale(0.9) !important;
  transform-origin: top right !important;
  pointer-events: none !important;
}
`.trim();

function tagOfficialStoreLeftNavButton() {
    const nav = document.querySelector(".left-nav.fixed");
    if (!(nav instanceof HTMLElement)) return;
    const icon = nav.querySelector("button .icon-regular-building-store");
    const btn = icon instanceof Element ? icon.closest("button") : null;
    if (!(btn instanceof HTMLButtonElement)) return;
    if (settingsState.sidebarIconsOnlyEnabled) btn.classList.add(RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS);
    else btn.classList.remove(RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS);
}

function tagProfileLeftNavItem() {
    const clearProfileClass = () => {
        document.querySelectorAll(`.left-nav.fixed li.${RP_LEFTNAV_PROFILE_LI_CLASS}`).forEach((el) => {
            el.classList.remove(RP_LEFTNAV_PROFILE_LI_CLASS);
        });
    };
    if (!settingsState.sidebarIconsOnlyEnabled) {
        clearProfileClass();
        return;
    }
    const nav = document.querySelector(".left-nav.fixed");
    if (!(nav instanceof HTMLElement)) {
        clearProfileClass();
        return;
    }

    let matched = null;
    for (const li of nav.querySelectorAll("li")) {
        const a = li.querySelector("a[href]");
        if (!(a instanceof HTMLAnchorElement)) continue;
        const href = a.getAttribute("href") || "";
        const pathOnly = href.replace(/^https?:\/\/[^/]+/i, "");
        const looksLikeProfile =
            /\/users\/\d+/i.test(pathOnly) || /\/my\/account\b/i.test(pathOnly) || /\/my\/profile\b/i.test(pathOnly);
        if (!looksLikeProfile) continue;
        if (!a.querySelector("img")) continue;
        matched = li;
        break;
    }

    for (const li of nav.querySelectorAll("li")) {
        if (li === matched) li.classList.add(RP_LEFTNAV_PROFILE_LI_CLASS);
        else li.classList.remove(RP_LEFTNAV_PROFILE_LI_CLASS);
    }
}

function getPremiumMembershipUrl() {
    const origin = window.location.origin || "https://www.roblox.com";
    const pathParts = (window.location.pathname || "/").split("/").filter(Boolean);
    const localeSegment = pathParts[0];
    const localizedPath =
        localeSegment && ROBLOX_LOCALE_SEGMENT_REGEX.test(localeSegment)
            ? `/${localeSegment}/premium/membership`
            : "/premium/membership";
    return `${origin}${localizedPath}`;
}

function syncSidebarCompactBottomButton() {
    const nav = document.querySelector(".left-nav.fixed");
    if (!(nav instanceof HTMLElement)) return;
    const existing = nav.querySelector(`#${RP_SIDEBAR_PLUS_ITEM_ID}`);
    if (!settingsState.sidebarIconsOnlyEnabled) {
        if (existing instanceof HTMLElement) existing.remove();
        return;
    }
    const listCandidates = Array.from(nav.querySelectorAll("ul, ol")).filter((list) => list.querySelector("li"));
    const hostList = listCandidates[listCandidates.length - 1];
    if (!(hostList instanceof HTMLElement)) return;

    let item = existing;
    if (!(item instanceof HTMLLIElement)) {
        item = document.createElement("li");
        item.id = RP_SIDEBAR_PLUS_ITEM_ID;
        const button = document.createElement("button");
        button.type = "button";
        button.className = RP_SIDEBAR_PLUS_BTN_CLASS;
        button.setAttribute("aria-label", "RblxPlus");
        button.addEventListener("click", () => {
            window.location.assign(getPremiumMembershipUrl());
        });
        const icon = document.createElement("img");
        icon.className = RP_SIDEBAR_PLUS_ICON_CLASS;
        icon.src = RP_RBLX_PLUS_LOGO_URL;
        icon.alt = "RblxPlus";
        button.appendChild(icon);
        item.appendChild(button);
    }
    if (item.parentElement !== hostList) hostList.appendChild(item);
}

export function updateSidebarCompactVisibility() {
    const existingStyle = document.getElementById(RP_SIDEBAR_COMPACT_STYLE_ID);
    if (!settingsState.sidebarIconsOnlyEnabled) {
        if (existingStyle instanceof HTMLStyleElement) existingStyle.remove();
        return;
    }
    let style = existingStyle;
    if (!(style instanceof HTMLStyleElement)) {
        style = document.createElement("style");
        style.id = RP_SIDEBAR_COMPACT_STYLE_ID;
    }
    style.textContent = SIDEBAR_COMPACT_CSS;
    document.documentElement.appendChild(style);
}

export function syncSidebarCompactDecorations() {
    tagOfficialStoreLeftNavButton();
    tagProfileLeftNavItem();
    syncSidebarCompactBottomButton();
}
