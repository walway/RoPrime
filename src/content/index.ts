import {
    isExtensionContextInvalidatedError,
    loadSettings,
    loadSettingsUiStrings,
    reloadSettingsUiStrings,
    RP_SETTINGS_KEY,
    shouldRunRoPrimeOnCurrentPage,
    syncAccountSettingsLayoutInset,
} from './core/core.ts'
import { syncAllFeatures } from './features/registry.ts'
import { syncAccountSettingsMenuButton } from './redirect/settingsButton.ts'
import { initExtensionsPanel } from './panel/extensions.ts'
import './features/legacyBadges.ts'
import './roblox.com/info/roblox-badges.ts'
import { syncHomeWelcomeModal } from './alerts/welcome.ts'
import { syncVersionUpdateAlert } from './alerts/versionAlert.ts'
import {
    applyChartsRename,
    applyCommunityRename,
    applyExperiencesRename,
    applyMarketplaceRename,
    updateRenameLoop,
} from './features/rename.ts'
import { installSearchBanObserver } from './features/searchBan.ts'
import { installDomSyncScheduler } from './panel/domSyncScheduler.ts'
import './panel/panel.ts'
import { installFriendCarouselEffects } from './profile/friendCarouselEffects.ts'
import { installProfilePageEffectObserver } from './profile/profileEffectsDisplay.ts'
import { installProfileRedesignObserver } from './profile/profileRedesign.ts'
import { normalizeEquippedProfileEffects } from './settings/profileSettings.ts'
import { syncProfileSettingsRoute } from './settings/profileSettings.ts'
import './sidebar/sidebarContent.ts'
import './sidebar/sidebarFullTouch.ts'
import { initFreeRobloxThemes } from './account/freeThemes.ts'
import './home/hideExperiencesAds.ts'
import './features/customCss.ts'
import './features/moreRoundedCorners.ts'
import './features/searchBan.ts'
import './profile/friendCarouselEffects.ts'
import './profile/profileEffectsDisplay.ts'
import './memes/rickRoll.ts'
import './account/freeThemes.ts'
import './sidebar/robloxEvents.ts'
import './profile/profileRedesign.ts'
import './account/classicIcon.ts'
import './inventory/menuOptions.ts'
import './ui/accountSwitcher.ts'
import './ui/loginPage.ts'

const extensionApi = globalThis.browser || globalThis.chrome

function runSyncPass() {
    syncAllFeatures()
    syncProfileSettingsRoute()
    syncAccountSettingsMenuButton()
    syncAccountSettingsLayoutInset()
    syncHomeWelcomeModal()
    syncVersionUpdateAlert()
}

function installStorageSyncListener() {
    if (!extensionApi?.storage?.onChanged) return
    extensionApi.storage.onChanged.addListener((changes, area) => {
        try {
            if (area !== 'local' || !changes[RP_SETTINGS_KEY]) return
            loadSettings().finally(() => {
                void (async () => {
                    try {
                        if (normalizeEquippedProfileEffects()) {
                            const { saveSettings } = await import('./core/core.ts')
                            saveSettings()
                        }
                        await reloadSettingsUiStrings()
                        runSyncPass()
                    } catch (e) {
                        if (!isExtensionContextInvalidatedError(e)) throw e
                    }
                })()
            })
        } catch (e) {
            if (!isExtensionContextInvalidatedError(e)) throw e
        }
    })
}

function installHistoryListeners() {
    const originalPushState = globalThis.history.pushState
    const originalReplaceState = globalThis.history.replaceState

    globalThis.history.pushState = function (...args) {
        const result = originalPushState.apply(this, args)
        globalThis.dispatchEvent(new Event('roprime-location-change'))
        return result
    }

    globalThis.history.replaceState = function (...args) {
        const result = originalReplaceState.apply(this, args)
        globalThis.dispatchEvent(new Event('roprime-location-change'))
        return result
    }

    const handleRouteChange = () => {
        try {
            runSyncPass()
        } catch (e) {
            if (!isExtensionContextInvalidatedError(e)) throw e
        }
    }

    globalThis.addEventListener('popstate', handleRouteChange)
    globalThis.addEventListener('hashchange', handleRouteChange)
    globalThis.addEventListener('roprime-location-change', handleRouteChange)
}

function bootstrap() {
    if (!shouldRunRoPrimeOnCurrentPage()) return

    installStorageSyncListener()
    loadSettings().finally(() => {
        void (async () => {
            try {
                if (normalizeEquippedProfileEffects()) {
                    const { saveSettings } = await import('./core/core.ts')
                    saveSettings()
                }
                await loadSettingsUiStrings()
                installHistoryListeners()
                installSearchBanObserver()
                installProfilePageEffectObserver()
                installProfileRedesignObserver()
                installFriendCarouselEffects()
                installDomSyncScheduler()
                initExtensionsPanel()
                if (shouldRunRoPrimeOnCurrentPage()) {
                    updateRenameLoop()
                }
                void initFreeRobloxThemes()
                runSyncPass()
                if (shouldRunRoPrimeOnCurrentPage()) {
                    applyCommunityRename(document.body)
                    applyMarketplaceRename(document.body)
                    applyChartsRename(document.body)
                    applyExperiencesRename(document.body)
                }
            } catch (e) {
                if (!isExtensionContextInvalidatedError(e)) throw e
            }
        })()
    })
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true })
} else {
    bootstrap()
}
