import { syncAccountSettingsMenuButton } from "../account/accountSettingsLink.js";
import {
	isExtensionContextInvalidatedError,
	RP_ALWAYS_SHOW_CLOSE_STYLE_ID,
	RP_CUSTOM_CSS_STYLE_ID,
	RP_FRIEND_STYLING_REIMAGNED_STYLE_ID,
	RP_PROFILE_SETTINGS_ROOT_ID,
	RP_SIDEBAR_COMPACT_STYLE_ID,
	RP_SMALL_NEW_NAV_STYLE_ID,
	settingsState,
	shouldRunRoPrimeOnCurrentPage,
} from "../core/core.js";
import {
	applyCommunityRename,
	applyExperiencesRename,
	applyMarketplaceRename,
	stopRenameLoop,
} from "../features/rename.js";
import { syncCustomCss } from "../features/customCss.js";
import { syncHomeWelcomeModal } from "../features/welcome.js";
import { syncAlwaysShowCloseButton } from "../navigation/alwaysShowCloseButton.js";
import {
	stopRobloxNavDropdownButton,
	syncRobloxNavDropdownButton,
} from "../navigation/dropdownButton.js";
import { updateFriendStylingReimagnedVisibility } from "../navigation/friendStylingReimagned.js";
import { syncOldNavigationBar } from "../navigation/oldNavigationBar.js";
import { syncFriendCarouselEffects } from "../profile/friendCarouselEffects.js";
import {
	syncSidebarCompactDecorations,
	updateSidebarCompactVisibility,
} from "../sidebar/sidebarCompact.js";
import { syncSidebarContent } from "../sidebar/sidebarContent.js";
import { updateSmallNewNavVisibility } from "../sidebar/smallNewNav.js";

export function updateOldNavigationBarVisibility() {
	syncOldNavigationBar();
}

function cleanupBlockedRouteUi() {
	stopRenameLoop();
	stopRobloxNavDropdownButton();
	document.getElementById(RP_PROFILE_SETTINGS_ROOT_ID)?.remove();
	document.getElementById(RP_SMALL_NEW_NAV_STYLE_ID)?.remove();
	document.getElementById(RP_SIDEBAR_COMPACT_STYLE_ID)?.remove();
	document.getElementById(RP_ALWAYS_SHOW_CLOSE_STYLE_ID)?.remove();
	document.getElementById(RP_CUSTOM_CSS_STYLE_ID)?.remove();
	document.getElementById(RP_FRIEND_STYLING_REIMAGNED_STYLE_ID)?.remove();
	document.getElementById("roprime-sidebar-content-hide-style")?.remove();
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
		syncCustomCss();

		if (settingsState.renameCommunitiesToGroups)
			applyCommunityRename(document.body);
		if (settingsState.renameExperiencesToGames)
			applyExperiencesRename(document.body);
		if (settingsState.renameMarketplaceToAvatarShop)
			applyMarketplaceRename(document.body);
		syncHomeWelcomeModal();
		syncRobloxNavDropdownButton();
	} catch (e) {
		if (isExtensionContextInvalidatedError(e)) return;
		throw e;
	}
}
