import {
    RP_PARAM_KEY,
    buildRoPrimeSettingsFullUrl,
    getExtensionResourceUrl,
    isExtensionContextAlive,
    isExtensionContextInvalidatedError,
    isMyAccountPath,
    settingsT,
    shouldRunRoPrimeOnCurrentPage,
} from "./core.js";

const TAB_ENTRY_ATTR = "data-roprime-account-menu-entry";
const POP_ENTRY_ATTR = "data-roprime-account-popover-entry";
const DIVIDER_ATTR = "data-roprime-account-divider";

/** Sparse retries when Roblox mounts the account menu after paint. */
let accountMenuRetries = 0;

/** RoValra-style: re-sync when `#settings-popover-menu` is (re)mounted or siblings change — other extensions often append after us. */
/** @type {MutationObserver | null} */
let gearMenuObserver = null;
let gearMenuDebounceTimer = 0;

function uninstallGearMenuObserver() {
    if (gearMenuObserver) {
        try {
            gearMenuObserver.disconnect();
        } catch {
            /* ignore */
        }
        gearMenuObserver = null;
    }
    if (gearMenuDebounceTimer) {
        window.clearTimeout(gearMenuDebounceTimer);
        gearMenuDebounceTimer = 0;
    }
}

function queueGearMenuPopoverReconcile() {
    if (!shouldInjectSettingsPopoverEntry()) return;
    window.clearTimeout(gearMenuDebounceTimer);
    gearMenuDebounceTimer = window.setTimeout(() => {
        gearMenuDebounceTimer = 0;
        injectSettingsPopoverRow();
    }, 60);
}

function installGearMenuObserver() {
    if (gearMenuObserver || !shouldInjectSettingsPopoverEntry()) return;
    if (!isExtensionContextAlive()) return;
    const root =
        document.getElementById("navigation-container") ||
        document.getElementById("navigation") ||
        document.getElementById("header") ||
        document.body;
    try {
        gearMenuObserver = new MutationObserver(() => queueGearMenuPopoverReconcile());
        gearMenuObserver.observe(root, { childList: true, subtree: true });
    } catch {
        gearMenuObserver = null;
    }
}

function extensionIconUrl() {
    return getExtensionResourceUrl("resources/roprime-icon.png");
}

/** Sidebar tab + divider on `/my/account` (including `?roprime=…` in-account settings). */
function shouldInjectVerticalAccountTab() {
    return isMyAccountPath() && shouldRunRoPrimeOnCurrentPage();
}

/** Header `#settings-popover-menu` — only when not on `/my/account`. */
function shouldInjectSettingsPopoverEntry() {
    return shouldRunRoPrimeOnCurrentPage() && !isMyAccountPath();
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

function removePopoverInjection() {
    uninstallGearMenuObserver();
    document.querySelectorAll(`li[${POP_ENTRY_ATTR}="1"]`).forEach((n) => n.remove());
}

function findNativeAccountSettingsLink(ul) {
    return (
        ul.querySelector('a.rbx-menu-item[href="/my/account"]') ||
        ul.querySelector('a.rbx-menu-item[href$="/my/account"]') ||
        ul.querySelector('a.rbx-menu-item[href*="/my/account"]')
    );
}

/**
 * Keep RoPrime directly **before** Roblox “Settings” (`/my/account`), same anchor as RoValra’s
 * `addPopoverButton` — so other extensions that `appendChild` still sit **below** us.
 * If that row is missing, pin to **first** `<li>` so we are not pushed to the bottom.
 */
function ensureRoPrimePopoverRowOrder(ul, li) {
    if (!(ul instanceof HTMLUListElement) || !(li instanceof HTMLLIElement) || !ul.contains(li)) return;
    const native = findNativeAccountSettingsLink(ul);
    const nativeLi = native?.closest("li");
    if (nativeLi instanceof HTMLLIElement && ul.contains(nativeLi) && nativeLi !== li) {
        if (nativeLi.previousElementSibling !== li) {
            nativeLi.insertAdjacentElement("beforebegin", li);
        }
        return;
    }
    if (ul.firstElementChild !== li) {
        ul.insertBefore(li, ul.firstElementChild);
    }
}

/** Plain `<li>` (no class) + `<a class="rbx-menu-item">` in `ul#settings-popover-menu`. */
function injectSettingsPopoverRow() {
    if (!isExtensionContextAlive()) return;
    if (!shouldInjectSettingsPopoverEntry()) {
        removePopoverInjection();
        return;
    }

    const ul = document.getElementById("settings-popover-menu");
    if (!(ul instanceof HTMLUListElement)) return;

    let li = ul.querySelector(`li[${POP_ENTRY_ATTR}="1"]`);
    if (!(li instanceof HTMLLIElement)) {
        const hrefNeedle = `?${RP_PARAM_KEY}=`;
        const foreignPrime = [...ul.querySelectorAll(`a.rbx-menu-item[href*="${hrefNeedle}"]`)].find((node) => {
            const row = node.closest("li");
            return row instanceof HTMLLIElement && !row.hasAttribute(POP_ENTRY_ATTR);
        });
        if (foreignPrime) return;

        li = document.createElement("li");
        li.setAttribute(POP_ENTRY_ATTR, "1");

        const a = document.createElement("a");
        a.className = "rbx-menu-item";
        a.href = buildRoPrimeSettingsFullUrl();
        a.textContent = settingsT("settings.hero.title");

        a.addEventListener("click", (e) => {
            e.preventDefault();
            if (window.location.search.includes(`${RP_PARAM_KEY}=`)) {
                window.location.reload();
            } else {
                window.location.href = buildRoPrimeSettingsFullUrl();
            }
        });

        li.appendChild(a);
        ul.appendChild(li);
    } else {
        const a = li.querySelector("a.rbx-menu-item");
        if (a instanceof HTMLAnchorElement) {
            a.href = buildRoPrimeSettingsFullUrl();
            const label = settingsT("settings.hero.title");
            if (a.textContent !== label) a.textContent = label;
        }
    }

    ensureRoPrimePopoverRowOrder(ul, li);
    installGearMenuObserver();
}

function removeVerticalAccountInjections() {
    document.querySelectorAll(`[${TAB_ENTRY_ATTR}]`).forEach((n) => n.remove());
    document.querySelectorAll(`li[${DIVIDER_ATTR}="1"]`).forEach((n) => n.remove());
}

function removeInjectedEntries() {
    removePopoverInjection();
    removeVerticalAccountInjections();
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

/** Vertical tab on `/my/account` + optional row in `#settings-popover-menu` off account. */
export function syncAccountSettingsMenuButton() {
    try {
        if (!isExtensionContextAlive()) {
            return;
        }

        if (!shouldRunRoPrimeOnCurrentPage()) {
            accountMenuRetries = 0;
            removeInjectedEntries();
            return;
        }

        if (isMyAccountPath()) {
            removePopoverInjection();
        } else {
            removeVerticalAccountInjections();
            injectSettingsPopoverRow();
        }

        let tabOk = true;
        if (shouldInjectVerticalAccountTab()) {
            tabOk = ensureVerticalTabEntry();
        } else {
            removeVerticalAccountInjections();
        }

        if (shouldInjectVerticalAccountTab() && !tabOk && accountMenuRetries < 6) {
            accountMenuRetries += 1;
            window.setTimeout(() => {
                if (!isExtensionContextAlive()) return;
                syncAccountSettingsMenuButton();
            }, 450);
        } else {
            accountMenuRetries = 0;
        }
    } catch (e) {
        if (isExtensionContextInvalidatedError(e)) {
            return;
        }
        throw e;
    }
}
