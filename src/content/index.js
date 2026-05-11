import {
    RP_RUNTIME_STYLE_ID,
    RP_SETTINGS_KEY,
    loadSettings,
    loadSettingsUiStrings,
    reloadSettingsUiStrings,
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
import { syncAccountSettingsMenuButton } from "./accountSettingsLink.js";
import { syncProfileSettingsRoute } from "./profileSettings.js";
import { syncRoEliteView } from "./panel.js";
import { syncHomeWelcomeModal } from "./welcome.js";

function installStorageSyncListener() {
    if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return;
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local" || !changes[RP_SETTINGS_KEY]) return;
        loadSettings().finally(() => {
            void (async () => {
                await reloadSettingsUiStrings();
                updateRenameLoop();
                syncRoEliteView();
                syncProfileSettingsRoute();
                syncAccountSettingsMenuButton();
            })();
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
        syncProfileSettingsRoute();
        syncAccountSettingsMenuButton();
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
    loadSettings().finally(() => {
        void (async () => {
            await loadSettingsUiStrings();
            installHistoryListeners();
            if (syncIntervalId === null) {
                setSyncIntervalId(window.setInterval(syncRoEliteView, 1200));
            }
            syncRuntimeStylesheet();
            if (shouldRunRoPrimeOnCurrentPage()) {
                updateRenameLoop();
            }
            syncRoEliteView();
            syncProfileSettingsRoute();
            syncAccountSettingsMenuButton();
            if (shouldRunRoPrimeOnCurrentPage()) {
                applyCommunityRename(document.body);
                applyExperiencesRename(document.body);
                applyMarketplaceRename(document.body);
                syncHomeWelcomeModal();
            }
        })();
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
    bootstrap();
}
