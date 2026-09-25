import {
    isExtensionContextInvalidatedError,
    RP_ALWAYS_SHOW_CLOSE_STYLE_ID,
    RP_CUSTOM_CSS_STYLE_ID,
    RP_FRIEND_STYLING_REIMAGNED_STYLE_ID,
    RP_SETTINGS_INNER_ID,
    RP_SIDEBAR_COMPACT_STYLE_ID,
    RP_SMALL_NEW_NAV_STYLE_ID,
    shouldRunRoPrimeOnCurrentPage,
} from '../core/core.ts'
import { syncCustomCss } from '../features/customCss.ts'
import { stopSearchBan, syncSearchBan } from '../features/searchBan.ts'
import { stopRenameLoop } from '../features/rename.ts'
import { syncAlwaysShowCloseButton } from '../navigation/alwaysShowCloseButton.ts'
import {
    stopRobloxFoundationWebMenuButton,
    syncRobloxFoundationWebMenuButton,
} from '../redirect/smallDeviceDropdownButton.ts'
import { stopRobloxNavDropdownButton, syncRobloxNavDropdownButton } from '../redirect/dropdownButton.ts'
import { updateFriendStylingReimagnedVisibility } from '../friends/friendStylingReimagined.ts'
import { syncOldNavigationBar } from '../navigation/oldNavigationBar.ts'
import { syncSidebarCompactDecorations, updateSidebarCompactVisibility } from '../sidebar/sidebarCompact.ts'
import { syncExpandSidebarOnHover } from '../sidebar/expandOnHover.ts'
import { syncSidebarCollapseMenuIcon } from '../sidebar/sidebarContent.ts'
import { RP_HIDE_AGE_BADGE_STYLE_ID, syncHideAgeBadge } from '../sidebar/hideAgeBadge.ts'
import { HIDE_EXPERIENCES_ADS_ID, syncHideExperiencesAds } from '../home/hideExperiencesAds.ts'
import { updateSmallNewNavVisibility } from '../sidebar/smallNewNav.ts'
import { syncRickRollEasterEgg } from '../memes/rickRoll.ts'
import { removeRobloxEvents, syncRobloxEvents } from '../sidebar/robloxEvents.ts'
import { registerFeature } from '../features/registry.ts'

export function updateOldNavigationBarVisibility() {
    syncOldNavigationBar()
}

function cleanupBlockedRouteUi() {
    stopRenameLoop()
    stopRobloxNavDropdownButton()
    stopRobloxFoundationWebMenuButton()
    stopSearchBan()
    document.getElementById(RP_SETTINGS_INNER_ID)?.remove()
    document.getElementById(RP_SMALL_NEW_NAV_STYLE_ID)?.remove()
    document.getElementById(RP_SIDEBAR_COMPACT_STYLE_ID)?.remove()
    document.getElementById(RP_ALWAYS_SHOW_CLOSE_STYLE_ID)?.remove()
    document.getElementById(RP_CUSTOM_CSS_STYLE_ID)?.remove()
    document.getElementById(RP_FRIEND_STYLING_REIMAGNED_STYLE_ID)?.remove()
    document.getElementById(RP_HIDE_AGE_BADGE_STYLE_ID)?.remove()
    document.getElementById(HIDE_EXPERIENCES_ADS_ID)?.remove()
    document.getElementById('roprime-more-rounded-corners-style')?.remove()
    document.getElementById('roprime-sidebar-content-hide-style')?.remove()
    document.getElementById('roprime-classic-left-nav-host')?.remove()
    document.getElementById('roprime-hide-left-nav-for-old-nav')?.remove()
    document.getElementById('roprime-old-navbar-style')?.remove()
    document.getElementById('roprime-old-navbar-panel-style')?.remove()
    document.getElementById('roprime-left-gray-frame')?.remove()
    document.getElementById('roprime-left-gray-frame-layout-style')?.remove()
    document.getElementById('roprime-custom-nav-menu-btn')?.remove()
    document.getElementById('roprime-nav-menu-slot')?.remove()
    const oldNavContainer = document.getElementById('left-navigation-container')
    if (oldNavContainer?.classList.contains('roprime-old-navigation-bar')) {
        oldNavContainer.classList.remove('roprime-old-navigation-bar')
        oldNavContainer.replaceChildren()
    }
    document
        .getElementById('roprime-sidebar-expand-on-hover-expanded-style')
        ?.remove()
    document.getElementById('roprime-sidebar-full-touch-style')?.remove()
    document.documentElement.classList.remove(
        'roprime-sidebar-expand-on-hover-active',
        'roprime-sidebar-expand-on-hover-expanded',
    )
    removeRobloxEvents()
    document.documentElement.classList.remove(
        'roprime-classic-left-nav-on',
        'roprime-old-navigation-bar-collapsed',
        'roprime-old-navbar-active',
        'roprime-old-navbar-rail-expanded',
        'roprime-old-navbar-menu-open',
        'roprime-always-close-collapsed',
        'roprime-left-gray-frame-on',
    )
}

export function syncRoPrimeView() {
    try {
        if (!shouldRunRoPrimeOnCurrentPage()) {
            cleanupBlockedRouteUi()
            return
        }

        updateOldNavigationBarVisibility()
        updateSmallNewNavVisibility()
        syncExpandSidebarOnHover()
        updateSidebarCompactVisibility()
        syncAlwaysShowCloseButton()
        updateFriendStylingReimagnedVisibility()
        syncSidebarCompactDecorations()
        syncSidebarCollapseMenuIcon()
        syncCustomCss()
        syncHideAgeBadge()
        syncHideExperiencesAds()
        syncRobloxNavDropdownButton()
        syncRobloxFoundationWebMenuButton()
        syncSearchBan()
        syncRickRollEasterEgg()
        void syncRobloxEvents()
    } catch (e) {
        if (isExtensionContextInvalidatedError(e)) return
        throw e
    }
}

registerFeature(syncRoPrimeView)
