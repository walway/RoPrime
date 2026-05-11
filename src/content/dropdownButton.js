import {
    RP_PARAM_KEY,
    buildRoPrimeSettingsFullUrl,
    getExtensionResourceUrl,
    isExtensionContextAlive,
    isExtensionContextInvalidatedError,
    shouldRunRoPrimeOnCurrentPage,
} from "./core.js";

const RP_DROPDOWN_ITEM_CLASS = "roprime-dropdown-entry";

/** Fixed copy for nav dropdown rows — intentionally not wired to `settingsT` / locale files. */
const ROPRIME_DROPDOWN_SETTINGS_LABEL = "RoPrime Settings";

/** @type {HTMLLIElement | null} */
let rowTemplate = null;

/** @type {MutationObserver | null} */
let navObserver = null;
/** Roots already passed to `observe()` for the current observer instance. */
let observedNavRoots = new WeakSet();

/** Observers on individual `ul.dropdown-menu` instances so we can re-append after Roblox clears the list on close. */
const menuSurvivalObservers = new Set();

let pointerCaptureInstalled = false;
let clickDelegationInstalled = false;

let navFlushPending = false;

function queueInjectFromNavMutations() {
    if (navFlushPending) return;
    navFlushPending = true;
    queueMicrotask(() => {
        navFlushPending = false;
        try {
            injectRobloxDropdownEntries();
        } catch (e) {
            if (!isExtensionContextInvalidatedError(e)) throw e;
        }
    });
}

function ensureRowTemplate() {
    if (rowTemplate) return;
    const iconUrl = getExtensionResourceUrl("resources/roprime-icon.png");
    if (!iconUrl) return;

    const li = document.createElement("li");
    li.className = RP_DROPDOWN_ITEM_CLASS;

    const a = document.createElement("a");
    a.className = "rbx-menu-item";
    a.style.display = "inline-flex";
    a.style.alignItems = "center";
    a.style.gap = "8px";

    const img = document.createElement("img");
    img.src = iconUrl;
    img.alt = "";
    img.width = 14;
    img.height = 14;
    img.style.display = "block";
    img.style.flexShrink = "0";

    const span = document.createElement("span");
    span.textContent = ROPRIME_DROPDOWN_SETTINGS_LABEL;

    a.append(img, span);
    li.appendChild(a);
    rowTemplate = li;
}

function cloneRowForMenu() {
    ensureRowTemplate();
    if (!rowTemplate) return null;
    const li = /** @type {HTMLLIElement} */ (rowTemplate.cloneNode(true));
    const a = li.querySelector("a");
    if (a instanceof HTMLAnchorElement) {
        a.href = buildRoPrimeSettingsFullUrl();
    }
    return li;
}

function getNavigationObserverRoots() {
    /** @type {HTMLElement[]} */
    const out = [];
    for (const id of ["navigation-container", "navigation", "header"]) {
        const el = document.getElementById(id);
        if (el instanceof HTMLElement) out.push(el);
    }
    return out;
}

function ensureNavMutationObserver() {
    if (!shouldRunRoPrimeOnCurrentPage() || !isExtensionContextAlive()) return;
    if (!navObserver) {
        try {
            navObserver = new MutationObserver(() => queueInjectFromNavMutations());
        } catch {
            navObserver = null;
            return;
        }
    }
    for (const root of getNavigationObserverRoots()) {
        if (observedNavRoots.has(root)) continue;
        try {
            navObserver.observe(root, { childList: true, subtree: true });
            observedNavRoots.add(root);
        } catch {
            /* ignore */
        }
    }
}

function teardownNavMutationObserver() {
    if (navObserver) {
        try {
            navObserver.disconnect();
        } catch {
            /* ignore */
        }
        navObserver = null;
    }
    observedNavRoots = new WeakSet();
}

function disconnectAllMenuSurvivalObservers() {
    for (const obs of menuSurvivalObservers) {
        try {
            obs.disconnect();
        } catch {
            /* ignore */
        }
    }
    menuSurvivalObservers.clear();
    document.querySelectorAll("ul.dropdown-menu[data-roprime-dropdown-watch]").forEach((ul) => {
        ul.removeAttribute("data-roprime-dropdown-watch");
    });
}

function ensureMenuSurvivalObserver(menu) {
    if (!(menu instanceof HTMLUListElement)) return;
    if (menu.getAttribute("data-roprime-dropdown-watch") === "1") return;
    menu.setAttribute("data-roprime-dropdown-watch", "1");

    const obs = new MutationObserver(() => {
        if (!document.contains(menu)) {
            try {
                obs.disconnect();
            } catch {
                /* ignore */
            }
            menuSurvivalObservers.delete(obs);
            menu.removeAttribute("data-roprime-dropdown-watch");
            return;
        }
        injectIntoDropdownMenuIfMissing(menu);
    });
    menuSurvivalObservers.add(obs);
    try {
        obs.observe(menu, { childList: true });
    } catch {
        menuSurvivalObservers.delete(obs);
        menu.removeAttribute("data-roprime-dropdown-watch");
    }
}

function isLikelyTopNavChromeTarget(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(
        target.closest("#navigation") ||
            target.closest("#navigation-container") ||
            target.closest("#header") ||
            target.closest(".rbx-navbar") ||
            target.closest("#rbx-navigation-account-button") ||
            target.closest('[id*="navigation-account"]'),
    );
}

function onPointerDownBeforeOpen(e) {
    if (!shouldRunRoPrimeOnCurrentPage() || !isExtensionContextAlive()) return;
    if (!isLikelyTopNavChromeTarget(e.target)) return;
    ensureNavMutationObserver();
    try {
        injectRobloxDropdownEntries();
    } catch (err) {
        if (!isExtensionContextInvalidatedError(err)) throw err;
    }
}

function onDelegatedRoPrimeDropdownClick(ev) {
    if (!shouldRunRoPrimeOnCurrentPage() || !isExtensionContextAlive()) return;
    if (!(ev.target instanceof Element)) return;
    const a = ev.target.closest(`li.${RP_DROPDOWN_ITEM_CLASS} > a.rbx-menu-item`);
    if (!(a instanceof HTMLAnchorElement)) return;
    const li = a.closest(`li.${RP_DROPDOWN_ITEM_CLASS}`);
    if (!(li instanceof HTMLElement)) return;
    if (!li.closest("ul.dropdown-menu")) return;

    ev.preventDefault();
    ev.stopPropagation();
    const settingsUrl = buildRoPrimeSettingsFullUrl();
    if (window.location.search.includes(`${RP_PARAM_KEY}=`)) window.location.reload();
    else window.location.assign(settingsUrl);
}

function removeRobloxDropdownEntries() {
    document.querySelectorAll(`li.${RP_DROPDOWN_ITEM_CLASS}`).forEach((n) => n.remove());
}

function injectIntoDropdownMenuIfMissing(menu) {
    if (!(menu instanceof HTMLUListElement)) return;
    if (!shouldRunRoPrimeOnCurrentPage() || !isExtensionContextAlive()) return;
    if (menu.querySelector(`li.${RP_DROPDOWN_ITEM_CLASS}`)) {
        ensureMenuSurvivalObserver(menu);
        return;
    }

    const hrefNeedle = `?${RP_PARAM_KEY}=`;
    const foreignPrime = [...menu.querySelectorAll(`a.rbx-menu-item[href*="${hrefNeedle}"]`)].find((node) => {
        const row = node.closest("li");
        return row instanceof HTMLLIElement && !row.classList.contains(RP_DROPDOWN_ITEM_CLASS);
    });
    if (foreignPrime) return;

    const li = cloneRowForMenu();
    if (!li) return;
    menu.insertAdjacentElement("afterbegin", li);
    ensureMenuSurvivalObserver(menu);
}

function injectRobloxDropdownEntries() {
    if (!shouldRunRoPrimeOnCurrentPage() || !isExtensionContextAlive()) {
        removeRobloxDropdownEntries();
        disconnectAllMenuSurvivalObservers();
        return;
    }
    if (!getExtensionResourceUrl("resources/roprime-icon.png")) return;

    const menus = document.querySelectorAll("ul.dropdown-menu");
    menus.forEach((menu) => {
        if (!(menu instanceof HTMLUListElement)) return;
        injectIntoDropdownMenuIfMissing(menu);
    });
}

export function syncRobloxNavDropdownButton() {
    try {
        if (!isExtensionContextAlive()) return;

        if (!shouldRunRoPrimeOnCurrentPage()) {
            stopRobloxNavDropdownButton();
            return;
        }

        if (!pointerCaptureInstalled) {
            document.addEventListener("pointerdown", onPointerDownBeforeOpen, true);
            pointerCaptureInstalled = true;
        }
        if (!clickDelegationInstalled) {
            document.addEventListener("click", onDelegatedRoPrimeDropdownClick, true);
            clickDelegationInstalled = true;
        }

        ensureNavMutationObserver();
        try {
            injectRobloxDropdownEntries();
        } catch (e) {
            if (!isExtensionContextInvalidatedError(e)) throw e;
        }
    } catch (e) {
        if (isExtensionContextInvalidatedError(e)) return;
        throw e;
    }
}

export function stopRobloxNavDropdownButton() {
    if (pointerCaptureInstalled) {
        document.removeEventListener("pointerdown", onPointerDownBeforeOpen, true);
        pointerCaptureInstalled = false;
    }
    if (clickDelegationInstalled) {
        document.removeEventListener("click", onDelegatedRoPrimeDropdownClick, true);
        clickDelegationInstalled = false;
    }
    navFlushPending = false;
    teardownNavMutationObserver();
    disconnectAllMenuSurvivalObservers();
    removeRobloxDropdownEntries();
    rowTemplate = null;
}
