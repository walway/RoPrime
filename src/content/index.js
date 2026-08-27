import {
  isExtensionContextInvalidatedError,
  loadSettings,
  loadSettingsUiStrings,
  RP_SETTINGS_KEY,
  reloadSettingsUiStrings,
  shouldRunRoPrimeOnCurrentPage,
  syncAccountSettingsLayoutInset,
} from "./core/core.js";
import { syncAllFeatures } from "./features/registry.js";
import { syncAccountSettingsMenuButton } from "./redirect/settingsButton.js";
import { initExtensionsPanel } from "./panel/extensions.js";
import "./features/legacyBadges.js";
import "./roblox.com/info/roblox-badges.js";
import { syncHomeWelcomeModal } from "./alerts/welcome.js";
import {
  applyChartsRename,
  applyCommunityRename,
  applyExperiencesRename,
  applyMarketplaceRename,
  updateRenameLoop,
} from "./features/rename.js";
import { installSearchBanObserver } from "./features/searchBan.js";
import { installDomSyncScheduler } from "./panel/domSyncScheduler.js";
import "./panel/panel.js";
import { installFriendCarouselEffects } from "./profile/friendCarouselEffects.js";
import { installProfilePageEffectObserver } from "./profile/profileEffectsDisplay.js";
import { installProfileRedesignObserver } from "./profile/profileRedesign.js";
import { normalizeEquippedProfileEffects } from "./settings/profileSettings.js";
import { syncProfileSettingsRoute } from "./settings/profileSettings.js";
import "./sidebar/sidebarContent.js";
import { initFreeRobloxThemes } from "./account/freeThemes.js";
import "./home/hideExperiencesAds.js";
import "./features/customCss.js";
import "./features/moreRoundedCorners.js";
import "./features/searchBan.js";
import "./profile/friendCarouselEffects.js";
import "./profile/profileEffectsDisplay.js";
import "./memes/rickRoll.js";
import "./account/freeThemes.js";
import "./sidebar/robloxEvents.js";

const extensionApi = globalThis.browser || globalThis.chrome;

function runSyncPass() {
  syncAllFeatures();
  syncProfileSettingsRoute();
  syncAccountSettingsMenuButton();
  syncAccountSettingsLayoutInset();
  syncHomeWelcomeModal();
}

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
            runSyncPass();
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
      runSyncPass();
    } catch (e) {
      if (!isExtensionContextInvalidatedError(e)) throw e;
    }
  };

  window.addEventListener("popstate", handleRouteChange);
  window.addEventListener("hashchange", handleRouteChange);
  window.addEventListener("roprime-location-change", handleRouteChange);
}

function bootstrap() {
  if (!shouldRunRoPrimeOnCurrentPage()) return;

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
        initExtensionsPanel();
        if (shouldRunRoPrimeOnCurrentPage()) {
          updateRenameLoop();
        }
        runSyncPass();
        void initFreeRobloxThemes();
        if (shouldRunRoPrimeOnCurrentPage()) {
          applyCommunityRename(document.body);
          applyMarketplaceRename(document.body);
          applyChartsRename(document.body);
          applyExperiencesRename(document.body);
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
