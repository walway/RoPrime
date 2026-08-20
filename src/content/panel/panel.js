import {
  isExtensionContextInvalidatedError,
  RP_ALWAYS_SHOW_CLOSE_STYLE_ID,
  RP_CUSTOM_CSS_STYLE_ID,
  RP_FRIEND_STYLING_REIMAGNED_STYLE_ID,
  RP_SETTINGS_INNER_ID,
  RP_SIDEBAR_COMPACT_STYLE_ID,
  RP_SMALL_NEW_NAV_STYLE_ID,
  shouldRunRoPrimeOnCurrentPage,
} from "../core/core.js";
import { syncCustomCss } from "../features/customCss.js";
import { stopSearchBan, syncSearchBan } from "../features/searchBan.js";
import { stopRenameLoop } from "../features/rename.js";
import { syncAlwaysShowCloseButton } from "../navigation/alwaysShowCloseButton.js";
import {
  stopRobloxFoundationWebMenuButton,
  syncRobloxFoundationWebMenuButton,
} from "../redirect/smallDeviceDropdownButton.js";
import {
  stopRobloxNavDropdownButton,
  syncRobloxNavDropdownButton,
} from "../redirect/dropdownButton.js";
import { updateFriendStylingReimagnedVisibility } from "../friends/friendStylingReimagined.js";
import { syncOldNavigationBar } from "../navigation/oldNavigationBar.js";
import {
  syncSidebarCompactDecorations,
  updateSidebarCompactVisibility,
} from "../sidebar/sidebarCompact.js";
import { syncSidebarCollapseMenuIcon } from "../sidebar/sidebarContent.js";
import {
  syncHideAgeBadge,
  RP_HIDE_AGE_BADGE_STYLE_ID,
} from "../sidebar/hideAgeBadge.js";
import {
  syncHideExperiencesAds,
  HIDE_EXPERIENCES_ADS_ID,
} from "../home/hideExperiencesAds.js";
import { updateSmallNewNavVisibility } from "../sidebar/smallNewNav.js";
import { syncRickRollEasterEgg } from "../memes/rickRoll.js";

export function updateOldNavigationBarVisibility() {
  syncOldNavigationBar();
}

function cleanupBlockedRouteUi() {
  stopRenameLoop();
  stopRobloxNavDropdownButton();
  stopRobloxFoundationWebMenuButton();
  stopSearchBan();
  document.getElementById(RP_SETTINGS_INNER_ID)?.remove();
  document.getElementById(RP_SMALL_NEW_NAV_STYLE_ID)?.remove();
  document.getElementById(RP_SIDEBAR_COMPACT_STYLE_ID)?.remove();
  document.getElementById(RP_ALWAYS_SHOW_CLOSE_STYLE_ID)?.remove();
  document.getElementById(RP_CUSTOM_CSS_STYLE_ID)?.remove();
  document.getElementById(RP_FRIEND_STYLING_REIMAGNED_STYLE_ID)?.remove();
  document.getElementById(RP_HIDE_AGE_BADGE_STYLE_ID)?.remove();
  document.getElementById(HIDE_EXPERIENCES_ADS_ID)?.remove();
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
    syncSidebarCollapseMenuIcon();
    syncCustomCss();
    syncHideAgeBadge();
    syncHideExperiencesAds();
    syncRobloxNavDropdownButton();
    syncRobloxFoundationWebMenuButton();
    syncSearchBan();
    syncRickRollEasterEgg();
  } catch (e) {
    if (isExtensionContextInvalidatedError(e)) return;
    throw e;
  }
}
