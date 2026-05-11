import { updateDocumentTitle } from "./pageChrome.js";
import { syncAlwaysShowCloseButton } from "./alwaysShowCloseButton.js";
import { updateFriendStylingReimagnedVisibility } from "./friendStylingReimagned.js";
import { syncOldNavigationBar } from "./oldNavigationBar.js";
import { updateSmallNewNavVisibility } from "./smallNewNav.js";
import { syncSidebarCompactDecorations, updateSidebarCompactVisibility } from "./sidebarCompact.js";

export function syncRoPrimeView() {
    // Feature toggles that apply globally.
    syncOldNavigationBar();
    updateSmallNewNavVisibility();
    updateSidebarCompactVisibility();
    syncSidebarCompactDecorations();
    syncAlwaysShowCloseButton();
    updateFriendStylingReimagnedVisibility();

    // Keep title in sync with Roblox when not on RoPrime route.
    updateDocumentTitle(false);
}

