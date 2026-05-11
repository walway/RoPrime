import { RP_PARAM_KEY, buildRoPrimeSettingsFullUrl, isMyAccountPath, settingsT } from "./core.js";

const TAB_ENTRY_ATTR = "data-roprime-account-menu-entry";
const POP_ENTRY_ATTR = "data-roprime-account-popover-entry";
const DIVIDER_ATTR = "data-roprime-account-divider";

/** Sparse retries when Roblox mounts the account menu after paint. */
let accountMenuRetries = 0;

/** Throttled popover injection — no `document.body` MutationObserver (React caused endless mutations → flicker). */
let popoverPointerHandler = null;
let lastPopoverEnsureAt = 0;

function extensionIconUrl() {
    try {
        if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
            return chrome.runtime.getURL("resources/roprime-icon.png");
        }
    } catch {
        /* ignore */
    }
    return "";
}

function shouldInjectAccountLink() {
    if (!isMyAccountPath()) return false;
    if (new URLSearchParams(window.location.search).has(RP_PARAM_KEY)) return false;
    return true;
}

/** Account settings sidebar tab list only (inside `#react-user-account-base`). */
function getAccountPageMenuList() {
    const accountBase = document.getElementById("react-user-account-base");
    if (!(accountBase instanceof HTMLElement)) return null;
    return (
        accountBase.querySelector(".menu-vertical-container ul.menu-vertical[role='tablist']") ||
        accountBase.querySelector("ul.menu-vertical[role='tablist']")
    );
}

/** Roblox uses `ul.dropdown-menu#settings-popover-menu` with `li > a.rbx-menu-item` (menu mounts when opened). */
function getSettingsPopoverMenu() {
    const byId = document.getElementById("settings-popover-menu");
    if (byId instanceof HTMLElement) return byId;
    const ul = document.querySelector("ul#settings-popover-menu.dropdown-menu");
    if (ul instanceof HTMLElement) return ul;
    const alt = document.querySelector("ul.dropdown-menu#settings-popover-menu");
    return alt instanceof HTMLElement ? alt : null;
}

function removeInjectedEntries() {
    document.querySelectorAll(`[${TAB_ENTRY_ATTR}], [${POP_ENTRY_ATTR}]`).forEach((n) => n.remove());
    document.querySelectorAll(`li[${DIVIDER_ATTR}="1"]`).forEach((n) => n.remove());
}

function uninstallPopoverHooks() {
    if (popoverPointerHandler) {
        document.removeEventListener("pointerdown", popoverPointerHandler, true);
        popoverPointerHandler = null;
    }
    lastPopoverEnsureAt = 0;
}

function installPopoverHooks() {
    if (popoverPointerHandler) return;
    popoverPointerHandler = () => {
        if (!shouldInjectAccountLink()) return;
        const now = Date.now();
        if (now - lastPopoverEnsureAt < 450) return;
        lastPopoverEnsureAt = now;
        requestAnimationFrame(() => {
            ensurePopoverEntry();
            window.setTimeout(() => ensurePopoverEntry(), 90);
        });
    };
    document.addEventListener("pointerdown", popoverPointerHandler, true);
}

function navigateToRoPrimeSettings(e) {
    e.preventDefault();
    const targetUrl = buildRoPrimeSettingsFullUrl();
    if (new URLSearchParams(window.location.search).has(RP_PARAM_KEY)) {
        window.location.reload();
        return;
    }
    window.location.assign(targetUrl);
}

function buildVerticalTabLi() {
    const li = document.createElement("li");
    li.classList.add("menu-option");
    li.setAttribute("role", "tab");
    li.setAttribute(TAB_ENTRY_ATTR, "1");

    const a = document.createElement("a");
    a.href = buildRoPrimeSettingsFullUrl();
    a.classList.add("menu-option-content");
    a.style.cursor = "pointer";
    a.style.display = "flex";
    a.style.alignItems = "center";
    a.addEventListener("click", navigateToRoPrimeSettings);

    const icon = document.createElement("img");
    icon.src = extensionIconUrl();
    icon.alt = "";
    icon.style.width = "15px";
    icon.style.height = "15px";
    icon.style.marginRight = "5px";
    icon.style.verticalAlign = "middle";

    const span = document.createElement("span");
    span.classList.add("font-caption-header");
    span.textContent = settingsT("settings.hero.title");
    span.style.fontSize = "12px";

    a.append(icon, span);
    li.appendChild(a);
    return li;
}

/** `<li class="rbx-divider thick-height" style="width: 100%;"></li>` (plus `data-roprime-account-divider` for cleanup). */
function createAccountMenuDividerLi() {
    const li = document.createElement("li");
    li.className = "rbx-divider thick-height";
    li.style.width = "100%";
    li.setAttribute(DIVIDER_ATTR, "1");
    return li;
}

function isThickRbxDividerLi(el) {
    return (
        el instanceof HTMLLIElement &&
        el.classList.contains("rbx-divider") &&
        el.classList.contains("thick-height")
    );
}

/** Native “Browser preferences” row — divider belongs directly under it (before extension tabs). */
function getBrowserPreferencesMenuTab(menuList) {
    const link =
        menuList.querySelector('.menu-option a[href*="browser-preferences"]') ||
        menuList.querySelector('.menu-option a[href*="browserpreferences"]');
    const li = link?.closest("li.menu-option");
    return li instanceof HTMLElement ? li : null;
}

/** Reuse an existing `li.rbx-divider` after the anchor when another extension already added one. */
function getOrCreatePluginDivider(menuList) {
    menuList.querySelector(`li[${DIVIDER_ATTR}="1"]`)?.remove();

    const natives = [...menuList.querySelectorAll("li.menu-option[role='tab']")].filter(
        (li) => !li.hasAttribute(TAB_ENTRY_ATTR),
    );
    const anchor =
        getBrowserPreferencesMenuTab(menuList) ||
        (natives.length ? natives[natives.length - 1] : null) ||
        menuList.querySelector("li.menu-option[role='tab']");
    if (!(anchor instanceof HTMLElement)) return null;

    const next = anchor.nextElementSibling;
    if (isThickRbxDividerLi(next)) {
        if (next.getAttribute(DIVIDER_ATTR) !== "1") {
            next.style.width = "100%";
        }
        return next;
    }

    const divider = createAccountMenuDividerLi();
    anchor.insertAdjacentElement("afterend", divider);
    return divider;
}

/** Back-to-back `li.rbx-divider.thick-height` (e.g. RoPrime + another extension) reads as a double rule. */
function collapseAdjacentRbxDividers(menuList) {
    let changed = true;
    while (changed) {
        changed = false;
        const kids = [...menuList.children];
        for (let i = 0; i < kids.length - 1; i++) {
            const a = kids[i];
            const b = kids[i + 1];
            if (!isThickRbxDividerLi(a) || !isThickRbxDividerLi(b)) continue;
            const aOurs = a.getAttribute(DIVIDER_ATTR) === "1";
            const bOurs = b.getAttribute(DIVIDER_ATTR) === "1";
            if (aOurs && bOurs) b.remove();
            else if (bOurs) b.remove();
            else if (aOurs) a.remove();
            else b.remove();
            changed = true;
            break;
        }
    }
}

/** After divider: last `li` wins so other extensions can load before RoPrime. */
function placeTabAfterDividerBlock(menuList, li, divider) {
    let insertAfter = /** @type {Element} */ (divider);
    let cur = divider.nextElementSibling;
    while (cur) {
        if (cur === li) {
            cur = cur.nextElementSibling;
            continue;
        }
        if (cur instanceof HTMLLIElement && !cur.classList.contains("rbx-divider")) {
            insertAfter = cur;
        }
        cur = cur.nextElementSibling;
    }
    if (insertAfter.nextElementSibling === li) return;
    if (li.parentElement) li.remove();
    insertAfter.insertAdjacentElement("afterend", li);
}

function ensureVerticalTabEntry() {
    const menuList = getAccountPageMenuList();
    if (!(menuList instanceof HTMLElement)) return false;

    let li = menuList.querySelector(`li[${TAB_ENTRY_ATTR}]`);
    const isNew = !(li instanceof HTMLLIElement);
    if (isNew) {
        li = buildVerticalTabLi();
    } else {
        const label = li.querySelector(".font-caption-header");
        if (label instanceof HTMLElement) label.textContent = settingsT("settings.hero.title");
        const link = li.querySelector("a");
        if (link instanceof HTMLAnchorElement) link.href = buildRoPrimeSettingsFullUrl();
    }

    const divider = getOrCreatePluginDivider(menuList);
    if (!(divider instanceof HTMLElement)) {
        if (menuList.lastElementChild !== li) menuList.appendChild(li);
        return true;
    }
    placeTabAfterDividerBlock(menuList, li, divider);
    collapseAdjacentRbxDividers(menuList);
    return true;
}

/** Same flow as RoValra `addPopoverButton` (header `#settings-popover-menu`). See settingsbutton.js in RoValra. */
function getRoPrimeHrefNeedle() {
    return `?${RP_PARAM_KEY}=`;
}

function findNativeAccountMenuLink(popoverMenu) {
    return (
        popoverMenu.querySelector('a.rbx-menu-item[href="/my/account"]') ||
        popoverMenu.querySelector('a.rbx-menu-item[href$="/my/account"]') ||
        popoverMenu.querySelector('a.rbx-menu-item[href*="/my/account"]')
    );
}

function syncPopoverRowContent(li) {
    const link = li.querySelector("a");
    if (!(link instanceof HTMLAnchorElement)) return;
    link.href = buildRoPrimeSettingsFullUrl();
    link.className = "rbx-menu-item";
    Object.assign(link.style, { display: "flex", alignItems: "center", gap: "8px" });
    const label = settingsT("settings.hero.title");
    const textNode = [...link.childNodes].find((n) => n.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.textContent = label;
    else link.appendChild(document.createTextNode(label));
    const img = link.querySelector("img");
    if (img instanceof HTMLImageElement) {
        img.src = extensionIconUrl();
        Object.assign(img.style, { width: "18px", height: "18px" });
    }
}

function ensurePopoverEntry() {
    if (!isMyAccountPath()) return false;
    const popoverMenu = getSettingsPopoverMenu();
    if (!(popoverMenu instanceof HTMLElement)) return false;

    const hrefNeedle = getRoPrimeHrefNeedle();

    /** RoValra: `if (popoverMenu.querySelector('a[href*="?rovalra=info"]')) return` — avoid duplicate rows. */
    const existingRoPrimeLink = popoverMenu.querySelector(`a.rbx-menu-item[href*="${hrefNeedle}"]`);
    if (existingRoPrimeLink) {
        const dupLi = existingRoPrimeLink.closest("li");
        if (dupLi instanceof HTMLLIElement) {
            dupLi.setAttribute(POP_ENTRY_ATTR, "1");
            syncPopoverRowContent(dupLi);
            const nativeLink = findNativeAccountMenuLink(popoverMenu);
            const nativeLi = nativeLink?.parentElement;
            if (nativeLi instanceof HTMLElement && dupLi.parentElement === popoverMenu && nativeLi.previousElementSibling !== dupLi) {
                nativeLi.before(dupLi);
            }
        }
        return true;
    }

    const newButtonListItem = document.createElement("li");
    newButtonListItem.setAttribute(POP_ENTRY_ATTR, "1");

    const newButtonLink = document.createElement("a");
    newButtonLink.className = "rbx-menu-item";
    newButtonLink.href = buildRoPrimeSettingsFullUrl();
    Object.assign(newButtonLink.style, { display: "flex", alignItems: "center", gap: "8px" });
    newButtonLink.addEventListener("click", navigateToRoPrimeSettings);

    const logo = document.createElement("img");
    logo.src = extensionIconUrl();
    logo.alt = "";
    Object.assign(logo.style, { width: "18px", height: "18px" });

    const buttonText = document.createTextNode(settingsT("settings.hero.title"));
    newButtonLink.append(logo, buttonText);
    newButtonListItem.appendChild(newButtonLink);

    const nativeSettingsLink = findNativeAccountMenuLink(popoverMenu);
    if (nativeSettingsLink?.parentElement instanceof HTMLElement) {
        nativeSettingsLink.parentElement.before(newButtonListItem);
    } else {
        popoverMenu.prepend(newButtonListItem);
    }

    return true;
}

/** Adds RoPrime to the account vertical tabs (after divider, after other plugins) and wires popover injection on user input only. */
export function syncAccountSettingsMenuButton() {
    if (typeof chrome === "undefined" || typeof chrome.runtime?.getURL !== "function") return;

    if (!shouldInjectAccountLink()) {
        accountMenuRetries = 0;
        uninstallPopoverHooks();
        removeInjectedEntries();
        return;
    }

    installPopoverHooks();
    const tabOk = ensureVerticalTabEntry();
    ensurePopoverEntry();

    if (!tabOk && accountMenuRetries < 6) {
        accountMenuRetries += 1;
        window.setTimeout(() => {
            syncAccountSettingsMenuButton();
        }, 450);
    } else {
        accountMenuRetries = 0;
    }
}
