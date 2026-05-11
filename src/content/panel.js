import {
    RP_ALWAYS_SHOW_CLOSE_STYLE_ID,
    RP_FRIEND_STYLING_REIMAGNED_STYLE_ID,
    RP_PROFILE_SETTINGS_ROOT_ID,
    RP_RUNTIME_STYLE_ID,
    RP_SIDEBAR_COMPACT_STYLE_ID,
    RP_SMALL_NEW_NAV_STYLE_ID,
    isExtensionContextInvalidatedError,
    settingsState,
    shouldRunRoPrimeOnCurrentPage,
} from "./core.js";
import { syncOldNavigationBar } from "./oldNavigationBar.js";
import { applyCommunityRename, applyExperiencesRename, applyMarketplaceRename, stopRenameLoop } from "./rename.js";
import { updateFriendStylingReimagnedVisibility } from "./friendStylingReimagned.js";
import { syncHomeWelcomeModal } from "./welcome.js";
import { updateSmallNewNavVisibility } from "./smallNewNav.js";
import { updateSidebarCompactVisibility, syncSidebarCompactDecorations } from "./sidebarCompact.js";
import { syncAlwaysShowCloseButton } from "./alwaysShowCloseButton.js";
import { syncAccountSettingsMenuButton } from "./accountSettingsLink.js";

export function updateOldNavigationBarVisibility() {
    syncOldNavigationBar();
}

function cleanupBlockedRouteUi() {
    stopRenameLoop();
    document.getElementById(RP_PROFILE_SETTINGS_ROOT_ID)?.remove();
    document.getElementById(RP_RUNTIME_STYLE_ID)?.remove();
    document.getElementById(RP_SMALL_NEW_NAV_STYLE_ID)?.remove();
    document.getElementById(RP_SIDEBAR_COMPACT_STYLE_ID)?.remove();
    document.getElementById(RP_ALWAYS_SHOW_CLOSE_STYLE_ID)?.remove();
    document.getElementById(RP_FRIEND_STYLING_REIMAGNED_STYLE_ID)?.remove();
    document.getElementById("roprime-classic-left-nav-host")?.remove();
    document.getElementById("roprime-old-navbar-style")?.remove();
    document.getElementById("roprime-left-gray-frame")?.remove();
    document.getElementById("roprime-left-gray-frame-layout-style")?.remove();
    document.getElementById("roprime-custom-nav-menu-btn")?.remove();
    document.getElementById("roprime-nav-menu-slot")?.remove();
    document.documentElement.classList.remove(
        "roprime-classic-left-nav-on",
        "roprime-old-navigation-bar-collapsed",
        "roprime-old-navbar-active",
        "roprime-old-navbar-rail-expanded",
        "roprime-old-navbar-menu-open",
        "roprime-always-close-collapsed",
        "roprime-left-gray-frame-on",
    );
}

export function syncRoEliteView() {
    try {
        if (!shouldRunRoPrimeOnCurrentPage()) {
            cleanupBlockedRouteUi();
            return;
        }

        updateOldNavigationBarVisibility();
        updateSmallNewNavVisibility();
        updateSidebarCompactVisibility();
        syncAlwaysShowCloseButton();
        updateFriendStylingReimagnedVisibility();
        syncSidebarCompactDecorations();

        if (settingsState.renameCommunitiesToGroups) applyCommunityRename(document.body);
        if (settingsState.renameExperiencesToGames) applyExperiencesRename(document.body);
        if (settingsState.renameMarketplaceToAvatarShop) applyMarketplaceRename(document.body);
        syncHomeWelcomeModal();
        syncAccountSettingsMenuButton();
    } catch (e) {
        if (isExtensionContextInvalidatedError(e)) return;
        throw e;
    }
}
