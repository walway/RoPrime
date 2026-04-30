import { settingsState } from "./core.js";

export function updateTabState(showPanel, pluginTabId) {
    const pluginTab = document.getElementById(pluginTabId);
    if (!pluginTab) return;
    if (showPanel) pluginTab.classList.add("active");
    else pluginTab.classList.remove("active");
}

export function updateSidebarVisibility(hideSidebar) {
    const menu = document.querySelector(".menu-vertical");
    if (!(menu instanceof HTMLElement)) return;
    const sidebarHost = menu.closest(".menu-vertical-container") || menu.closest(".rbx-left-col") || menu.parentElement;
    if (!(sidebarHost instanceof HTMLElement)) return;
    sidebarHost.style.display = hideSidebar ? "none" : "";
}

export function updateAccountHeader(showPanel) {
    const pageRoot = document.getElementById("react-user-account-base");
    if (!(pageRoot instanceof HTMLElement)) return;
    const header = pageRoot.querySelector("h1");
    if (!(header instanceof HTMLElement)) return;

    if (!header.hasAttribute("data-roprime-original-display")) {
        header.setAttribute("data-roprime-original-display", header.style.display || "");
    }

    if (showPanel) {
        header.style.display = "none";
        return;
    }

    if (header.hasAttribute("data-roprime-original-display")) {
        header.style.display = header.getAttribute("data-roprime-original-display") || "";
    }
}

export function updateDocumentTitle(showPanel) {
    const root = document.documentElement;
    if (!(root instanceof HTMLElement)) return;
    if (!root.hasAttribute("data-roprime-original-title")) root.setAttribute("data-roprime-original-title", document.title || "");
    if (showPanel) document.title = settingsState.language === "ru" ? "Настройки RoPrime" : "RoPrime Settings";
    else document.title = root.getAttribute("data-roprime-original-title") || document.title;
}
