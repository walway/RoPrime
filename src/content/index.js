import {
    RP_RUNTIME_STYLE_ID,
    RP_SETTINGS_KEY,
    getExtensionResourceUrl,
    isExtensionContextInvalidatedError,
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
        try {
            if (area !== "local" || !changes[RP_SETTINGS_KEY]) return;
            loadSettings().finally(() => {
                void (async () => {
                    try {
                        await reloadSettingsUiStrings();
                        updateRenameLoop();
                        syncRoEliteView();
                        syncProfileSettingsRoute();
                        syncAccountSettingsMenuButton();
                    } catch (e) {
                        if (!isExtensionContextInvalidatedError(e)) throw e;
                    }
                })();
            });
        } catch (e) {
            if (!isExtensionContextInvalidatedError(e)) throw e;
        }
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
        try {
            syncRuntimeStylesheet();
            syncRoEliteView();
            syncProfileSettingsRoute();
            syncAccountSettingsMenuButton();
        } catch (e) {
            if (!isExtensionContextInvalidatedError(e)) throw e;
        }
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
    const styleHref = getExtensionResourceUrl("style.css");
    if (!styleHref) return;
    const link = document.createElement("link");
    link.id = RP_RUNTIME_STYLE_ID;
    link.rel = "stylesheet";
    link.href = styleHref;
    document.documentElement.appendChild(link);
}

function bootstrap() {
    installStorageSyncListener();
    syncRuntimeStylesheet();
    loadSettings().finally(() => {
        void (async () => {
            try {
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
            } catch (e) {
                if (!isExtensionContextInvalidatedError(e)) throw e;
            }
        })();
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
    bootstrap();
}
