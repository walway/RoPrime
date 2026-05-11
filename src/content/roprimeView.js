import { updateDocumentTitle } from "./pageChrome.js";
import { syncAlwaysShowCloseButton } from "./alwaysShowCloseButton.js";
import { updateFriendStylingReimagnedVisibility } from "./friendStylingReimagned.js";
import { syncOldNavigationBar } from "./oldNavigationBar.js";
import { syncAccountSettingsButtons } from "./accountSettingsButton.js";
import { initRoPrimeAccountSettingsPage } from "./roprimeAccountSettingsPage.js";
import { initPluginsPanel } from "./pluginsPanel.js";
import { updateSmallNewNavVisibility } from "./smallNewNav.js";
import { syncSidebarCompactDecorations, updateSidebarCompactVisibility } from "./sidebarCompact.js";

export function syncRoPrimeView() {
    syncAccountSettingsButtons();
    initRoPrimeAccountSettingsPage();
    initPluginsPanel();

    // Feature toggles that apply globally.
    syncOldNavigationBar();
    updateSmallNewNavVisibility();
    updateSidebarCompactVisibility();
    syncSidebarCompactDecorations();
    syncAlwaysShowCloseButton();
    updateFriendStylingReimagnedVisibility();

    // Keep title in sync with Roblox; RoPrime no longer mounts a settings page.
    updateDocumentTitle(false);
}

