import { RP_SETTINGS_KEY, loadSettings, setSyncIntervalId, syncIntervalId } from "./core.js";
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

    window.addEventListener("popstate", syncRoEliteView);
    window.addEventListener("roprime-location-change", syncRoEliteView);
}

function bootstrap() {
    installStorageSyncListener();
    startDropdownMenuInjection();
    syncHomeWelcomeModal();
    loadSettings().finally(() => {
        installHistoryListeners();
        updateRenameLoop();
        if (syncIntervalId === null) {
            setSyncIntervalId(window.setInterval(syncRoEliteView, 1200));
        }
        syncRoEliteView();
        applyCommunityRename(document.body);
        applyExperiencesRename(document.body);
        applyMarketplaceRename(document.body);
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
    bootstrap();
}
