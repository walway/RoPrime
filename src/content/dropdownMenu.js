import { settingsState, shouldRunRoPrimeOnCurrentPage } from "./core.js";

const RP_DROPDOWN_ITEM_CLASS = "roprime-dropdown-entry";
let dropdownObserver = null;
let injectQueued = false;

function getRoPrimeSettingsUrl() {
    return `${window.location.origin}/my/account?roprime=design`;
}

function getIconUrl() {
    try {
        const chromeApi = globalThis?.chrome;
        if (chromeApi?.runtime?.getURL) {
            return chromeApi.runtime.getURL("resources/roprime-icon.png");
        }
    } catch {
        // Extension context can be invalidated during reload/update.
        return "resources/roprime-icon.png";
    }
    return "resources/roprime-icon.png";
}

export function injectRoPrimeDropdownItem() {
    if (!shouldRunRoPrimeOnCurrentPage()) {
        removeRoPrimeDropdownItems();
        return;
    }
    const menus = document.querySelectorAll("ul.dropdown-menu");
    if (!menus.length) return;

    const iconUrl = getIconUrl();
    const settingsUrl = getRoPrimeSettingsUrl();
    const settingsLabel = settingsState.language === "ru" ? "Настройки RoPrime" : "RoPrime Settings";

    menus.forEach((menu) => {
        if (!(menu instanceof HTMLUListElement)) return;
        if (menu.querySelector(`li.${RP_DROPDOWN_ITEM_CLASS}`)) return;

        const li = document.createElement("li");
        li.className = RP_DROPDOWN_ITEM_CLASS;
        li.innerHTML = `<a class="rbx-menu-item" href="${settingsUrl}"><img src="${iconUrl}" alt="" width="14" height="14" style="margin-right:8px;vertical-align:middle;" /><span>${settingsLabel}</span></a>`;
        menu.insertAdjacentElement("afterbegin", li);
    });
}

export function removeRoPrimeDropdownItems() {
    document.querySelectorAll(`li.${RP_DROPDOWN_ITEM_CLASS}`).forEach((item) => item.remove());
}

function queueDropdownInjection() {
    if (injectQueued) return;
    injectQueued = true;
    requestAnimationFrame(() => {
        injectQueued = false;
        injectRoPrimeDropdownItem();
    });
}

/**
 * Installs a mutation observer so dropdown entries are injected as soon as
 * Roblox adds dropdown menus to the DOM (instead of waiting for poll ticks).
 */
export function startDropdownMenuInjection() {
    if (!shouldRunRoPrimeOnCurrentPage()) {
        stopDropdownMenuInjection();
        return;
    }
    injectRoPrimeDropdownItem();
    if (dropdownObserver || !(document.body instanceof HTMLBodyElement)) return;

    dropdownObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === "attributes") {
                if (mutation.target instanceof Element && mutation.target.closest("ul.dropdown-menu")) {
                    queueDropdownInjection();
                    return;
                }
            }
            if (mutation.type !== "childList") continue;
            if (mutation.addedNodes.length || mutation.removedNodes.length) {
                queueDropdownInjection();
                return;
            }
        }
    });

    dropdownObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "aria-expanded"],
    });

    // Catch user opening dropdown immediately after hover/click/keyboard.
    document.addEventListener("pointerdown", queueDropdownInjection, true);
    document.addEventListener("click", queueDropdownInjection, true);
    document.addEventListener("keydown", queueDropdownInjection, true);
}

export function stopDropdownMenuInjection() {
    if (dropdownObserver instanceof MutationObserver) {
        dropdownObserver.disconnect();
        dropdownObserver = null;
    }
    document.removeEventListener("pointerdown", queueDropdownInjection, true);
    document.removeEventListener("click", queueDropdownInjection, true);
    document.removeEventListener("keydown", queueDropdownInjection, true);
    removeRoPrimeDropdownItems();
}
