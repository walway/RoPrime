import { RP_DEFAULT_PAGE, RP_TAB_ID, buildPluginUrl, isAccountPage, settingsState } from "./core.js";

function getRobloxAccountMenu() {
    const root = document.getElementById("react-user-account-base");
    if (!(root instanceof HTMLElement)) return null;
    const menus = Array.from(root.querySelectorAll(".menu-vertical"));
    const menu = menus.find((m) =>
        m.querySelector('.menu-option a[href*="browser-preferences"], .menu-option a[href*="browserpreferences"]'),
    );
    return menu instanceof HTMLElement ? menu : null;
}

function getIconUrl() {
    try {
        if (typeof chrome !== "undefined" && chrome.runtime && typeof chrome.runtime.getURL === "function") {
            return chrome.runtime.getURL("resources/roprime-icon.png");
        }
    } catch {
        return "resources/roprime-icon.png";
    }
    return "resources/roprime-icon.png";
}

export function injectRoEliteTab(onNavigate) {
    if (!isAccountPage()) return;
    const menu = getRobloxAccountMenu();
    if (!menu || document.getElementById(RP_TAB_ID)) return;
    const iconUrl = getIconUrl();
    const settingsLabel = settingsState.language === "ru" ? "Настройки RoPrime" : "RoPrime Settings";

    const li = document.createElement("li");
    li.id = RP_TAB_ID;
    li.className = "menu-option";
    li.setAttribute("role", "tab");
    li.innerHTML = `<a class="menu-option-content" href="#"><img class="roprime-menu-icon" src="${iconUrl}" alt="" width="15" height="15" /><span class="menu-text">${settingsLabel}</span></a>`;
    li.addEventListener(
        "click",
        (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
            const nextUrl = buildPluginUrl(RP_DEFAULT_PAGE);
            const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            if (currentUrl !== nextUrl) window.history.pushState({ oldRobloxSettings: true }, "", nextUrl);
            if (typeof onNavigate === "function") onNavigate();
        },
        true,
    );

    const insertAfter =
        menu.querySelector('.menu-option a[href*="browser-preferences"]')?.closest(".menu-option") ||
        menu.querySelector('.menu-option a[href*="browserpreferences"]')?.closest(".menu-option") ||
        null;
    if (insertAfter instanceof HTMLElement) insertAfter.insertAdjacentElement("afterend", li);
    else menu.appendChild(li);
}

export function ensureAccountDivider() {
    if (!isAccountPage()) return;
    const menu = getRobloxAccountMenu();
    if (!(menu instanceof HTMLElement)) return;
    const oldRobloxTab = document.getElementById(RP_TAB_ID);
    if (!(oldRobloxTab instanceof HTMLElement)) return;
    const existingDividers = Array.from(menu.querySelectorAll(".roprime-divider"));
    const divider = existingDividers[0] instanceof HTMLElement ? existingDividers[0] : null;
    existingDividers.slice(1).forEach((el) => el.remove());
    const browserPreferencesItem =
        menu.querySelector('.menu-option a[href*="browser-preferences"]')?.closest(".menu-option") ||
        menu.querySelector('.menu-option a[href*="browserpreferences"]')?.closest(".menu-option") ||
        null;
    const desiredAnchor = browserPreferencesItem instanceof HTMLElement ? browserPreferencesItem : oldRobloxTab;
    const desiredPosition = desiredAnchor === oldRobloxTab ? "beforebegin" : "afterend";
    const activeDivider =
        divider ||
        (() => {
            const el = document.createElement("li");
            el.className = "rbx-divider thick-height";
            el.classList.add("roprime-divider");
            return el;
        })();
    const currentAnchor =
        activeDivider.previousElementSibling === desiredAnchor || activeDivider.nextElementSibling === desiredAnchor
            ? desiredAnchor
            : null;
    if (!currentAnchor) desiredAnchor.insertAdjacentElement(desiredPosition, activeDivider);
}

export function removeRoPrimeAccountUi() {
    document.getElementById(RP_TAB_ID)?.remove();
    document.querySelectorAll(".roprime-divider").forEach((divider) => divider.remove());
}
