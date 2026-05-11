import { RP_PARAM_KEY, buildRoPrimeSettingsFullUrl, isMyAccountPath } from "./core.js";
import { t } from "./localesI18n.js";

const TAB_ENTRY_ATTR = "data-roprime-account-menu-entry";
const POP_ENTRY_ATTR = "data-roprime-account-popover-entry";

let observer = null;
let debounceId = 0;

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

function removeInjectedEntries() {
    document.querySelectorAll(`[${TAB_ENTRY_ATTR}], [${POP_ENTRY_ATTR}]`).forEach((n) => n.remove());
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
    span.textContent = t("settings.hero.title");
    span.style.fontSize = "12px";

    a.append(icon, span);
    li.appendChild(a);
    return li;
}

function ensureVerticalTabEntry() {
    const menuList = document.querySelector("ul.menu-vertical[role='tablist']");
    if (!(menuList instanceof HTMLElement)) return;

    let li = menuList.querySelector(`li[${TAB_ENTRY_ATTR}]`);
    if (li instanceof HTMLLIElement) {
        const label = li.querySelector(".font-caption-header");
        if (label instanceof HTMLElement) label.textContent = t("settings.hero.title");
        const link = li.querySelector("a");
        if (link instanceof HTMLAnchorElement) link.href = buildRoPrimeSettingsFullUrl();
        menuList.appendChild(li);
        return;
    }

    li = buildVerticalTabLi();
    menuList.appendChild(li);
}

function ensurePopoverEntry() {
    const popoverMenu = document.getElementById("settings-popover-menu");
    if (!(popoverMenu instanceof HTMLElement)) return;
    const existing = popoverMenu.querySelector(`[${POP_ENTRY_ATTR}]`);
    if (existing) {
        const link = existing.querySelector("a");
        const textNode = link?.lastChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            textNode.textContent = t("settings.hero.title");
        }
        if (link instanceof HTMLAnchorElement) link.href = buildRoPrimeSettingsFullUrl();
        popoverMenu.appendChild(existing);
        return;
    }

    const li = document.createElement("li");
    li.setAttribute(POP_ENTRY_ATTR, "1");

    const a = document.createElement("a");
    a.className = "rbx-menu-item";
    a.href = buildRoPrimeSettingsFullUrl();
    Object.assign(a.style, { display: "flex", alignItems: "center", gap: "8px" });
    a.addEventListener("click", navigateToRoPrimeSettings);

    const icon = document.createElement("img");
    icon.src = extensionIconUrl();
    icon.alt = "";
    Object.assign(icon.style, { width: "18px", height: "18px" });

    const text = document.createTextNode(t("settings.hero.title"));
    a.append(icon, text);
    li.appendChild(a);

    popoverMenu.appendChild(li);
}

function scheduleEnsureAccountLink() {
    window.clearTimeout(debounceId);
    const run = () => {
        if (!shouldInjectAccountLink()) {
            removeInjectedEntries();
            return;
        }
        ensureVerticalTabEntry();
        ensurePopoverEntry();
    };
    debounceId = window.setTimeout(run, 0);
}

function installObserver() {
    if (observer) return;
    const target = document.getElementById("react-user-account-base") || document.body;
    observer = new MutationObserver(() => {
        if (!isMyAccountPath()) return;
        scheduleEnsureAccountLink();
    });
    observer.observe(target, { childList: true, subtree: true });
}

/** Adds "RoPrime Settings" to the native /my/account sidebar (and header popover when present). */
export function syncAccountSettingsMenuButton() {
    if (typeof chrome === "undefined" || typeof chrome.runtime?.getURL !== "function") return;

    if (!shouldInjectAccountLink()) {
        removeInjectedEntries();
        return;
    }

    installObserver();
    ensureVerticalTabEntry();
    ensurePopoverEntry();
    scheduleEnsureAccountLink();
}
