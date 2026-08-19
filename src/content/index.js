import {
  isExtensionContextInvalidatedError,
  loadSettings,
  loadSettingsUiStrings,
  RP_SETTINGS_KEY,
  reloadSettingsUiStrings,
  shouldRunRoPrimeOnCurrentPage,
  syncAccountSettingsLayoutInset,
} from "./core/core.js";
import { syncCustomCss } from "./features/customCss.js";
import { syncAccountSettingsMenuButton } from "./redirect/settingsButton.js";
import { initPluginsPanel } from "./panel/plugins.js";
import "./features/legacyBadges.js";
import "./roblox.com/info/roblox-badges.js";
import { syncHomeWelcomeModal } from "./alerts/welcome.js";
import {
  applyCommunityRename,
  applyMarketplaceRename,
  updateRenameLoop,
} from "./features/rename.js";
import {
  installSearchBanObserver,
  syncSearchBan,
} from "./features/searchBan.js";
import { installDomSyncScheduler } from "./panel/domSyncScheduler.js";
import { syncRoEliteView } from "./panel/panel.js";
import {
  installFriendCarouselEffects,
  syncFriendCarouselEffects,
} from "./profile/friendCarouselEffects.js";
import {
  installProfilePageEffectObserver,
  syncProfilePageEffect,
} from "./profile/profileEffectsDisplay.js";
import {
  installProfileRedesignObserver,
  syncProfileRedesign,
} from "./profile/profileRedesign.js";
import { normalizeEquippedProfileEffects } from "./settings/profileSettings.js";
import { syncProfileSettingsRoute } from "./settings/profileSettings.js";
import { syncSidebarContent } from "./sidebar/sidebarContent.js";
import {
  initFreeRobloxThemes,
  syncFreeRobloxTheme,
} from "./account/freeThemes.js";
import { syncRickRollEasterEgg } from "./memes/rickRoll.js";

const extensionApi = globalThis.browser || globalThis.chrome

function installStorageSyncListener() {
  if (!extensionApi?.storage?.onChanged) return;
  extensionApi.storage.onChanged.addListener((changes, area) => {
    try {
      if (area !== "local" || !changes[RP_SETTINGS_KEY]) return;
      loadSettings().finally(() => {
        void (async () => {
          try {
            if (normalizeEquippedProfileEffects()) {
              const { saveSettings } = await import("./core/core.js");
              saveSettings();
            }
            await reloadSettingsUiStrings();
            updateRenameLoop();
            syncRoEliteView();
            syncProfileSettingsRoute();
            syncAccountSettingsMenuButton();
            void syncProfilePageEffect();
            syncProfileRedesign();
            syncFriendCarouselEffects();
            syncCustomCss();
            syncAccountSettingsLayoutInset();
            syncSidebarContent({ force: true });
            syncSearchBan();
            syncFreeRobloxTheme();
            syncRickRollEasterEgg();
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
    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState

    window.history.pushState = function (...args) {
        const result = originalPushState.apply(this, args)
        window.dispatchEvent(new Event('roprime-location-change'))
        return result
    }

    window.history.replaceState = function (...args) {
        const result = originalReplaceState.apply(this, args)
        window.dispatchEvent(new Event('roprime-location-change'))
        return result
    }

  const handleRouteChange = () => {
    try {
      syncRoEliteView();
      syncHomeWelcomeModal();
      syncProfileSettingsRoute();
      syncAccountSettingsMenuButton();
      void syncProfilePageEffect();
      syncProfileRedesign();
      syncFriendCarouselEffects();
      syncCustomCss();
      syncAccountSettingsLayoutInset();
      syncSearchBan();
      syncFreeRobloxTheme();
      syncRickRollEasterEgg();
    } catch (e) {
      if (!isExtensionContextInvalidatedError(e)) throw e;
    }

  window.addEventListener("popstate", handleRouteChange);
  window.addEventListener("hashchange", handleRouteChange);
  window.addEventListener("roprime-location-change", handleRouteChange);
}

function bootstrap() {
    if (!shouldRunRoPrimeOnCurrentPage()) return

  installStorageSyncListener();
  loadSettings().finally(() => {
    void (async () => {
      try {
        if (normalizeEquippedProfileEffects()) {
          const { saveSettings } = await import("./core/core.js");
          saveSettings();
        }
        await loadSettingsUiStrings();
        installHistoryListeners();
        installSearchBanObserver();
        installProfilePageEffectObserver();
        installProfileRedesignObserver();
        installFriendCarouselEffects();
        installDomSyncScheduler();
        initPluginsPanel();
        if (shouldRunRoPrimeOnCurrentPage()) {
          updateRenameLoop();
        }
        syncRoEliteView();
        syncProfileSettingsRoute();
        syncAccountSettingsMenuButton();
        void syncProfilePageEffect();
        syncProfileRedesign();
        syncFriendCarouselEffects();
        syncCustomCss();
        syncAccountSettingsLayoutInset();
        syncSidebarContent({ force: true });
        syncSearchBan();
        void initFreeRobloxThemes();
        syncRickRollEasterEgg();
        if (shouldRunRoPrimeOnCurrentPage()) {
          applyCommunityRename(document.body);
          applyMarketplaceRename(document.body);
          syncHomeWelcomeModal();
        }
      } catch (e) {
        if (!isExtensionContextInvalidatedError(e)) throw e;
      }
    })();
  });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true })
} else {
    bootstrap()
}
