import {
    RP_RUNTIME_STYLE_ID,
    RP_SETTINGS_KEY,
    loadSettings,
    setSyncIntervalId,
    shouldRunRoPrimeOnCurrentPage,
    syncIntervalId,
} from "./core.js";
import {
    applyCommunityRename,
    applyExperiencesRename,
    applyMarketplaceRename,
    updateRenameLoop,
} from "./rename.js";
import { syncRoEliteView } from "./panel.js";
import { syncHomeWelcomeModal } from "./welcome.js";
import { startDropdownMenuInjection } from "./dropdownMenu.js";

function installStorageSyncListener() {
    if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return;
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local" || !changes[RP_SETTINGS_KEY]) return;
        loadSettings().finally(() => {
            updateRenameLoop();
            syncRoEliteView();
        });
    });
}

function installHistoryListeners() {
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
        const result = originalPushState.apply(this, args);
        window.dispatchEvent(new Event("roprime-location-change"));
        return result;
    };

    window.history.replaceState = function (...args) {
        const result = originalReplaceState.apply(this, args);
        window.dispatchEvent(new Event("roprime-location-change"));
        return result;
    };

    const handleRouteChange = () => {
        syncRuntimeStylesheet();
        syncRoEliteView();
    };

    window.addEventListener("popstate", handleRouteChange);
    window.addEventListener("roprime-location-change", handleRouteChange);
}

function syncRuntimeStylesheet() {
    const existing = document.getElementById(RP_RUNTIME_STYLE_ID);
    if (!shouldRunRoPrimeOnCurrentPage()) {
        if (existing instanceof HTMLLinkElement) existing.remove();
        return;
    }
    if (existing instanceof HTMLLinkElement) return;
    if (typeof chrome === "undefined" || typeof chrome.runtime?.getURL !== "function") return;
    const link = document.createElement("link");
    link.id = RP_RUNTIME_STYLE_ID;
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("style.css");
    document.documentElement.appendChild(link);
}

function bootstrap() {
    installStorageSyncListener();
    syncRuntimeStylesheet();
    if (shouldRunRoPrimeOnCurrentPage()) {
        startDropdownMenuInjection();
        syncHomeWelcomeModal();
    }
    loadSettings().finally(() => {
        installHistoryListeners();
        if (syncIntervalId === null) {
            setSyncIntervalId(window.setInterval(syncRoEliteView, 1200));
        }
        syncRuntimeStylesheet();
        if (shouldRunRoPrimeOnCurrentPage()) {
            updateRenameLoop();
        }
        syncRoEliteView();
        if (shouldRunRoPrimeOnCurrentPage()) {
            applyCommunityRename(document.body);
            applyExperiencesRename(document.body);
            applyMarketplaceRename(document.body);
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
    bootstrap();
}
