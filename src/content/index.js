import { syncAccountSettingsMenuButton } from "./account/accountSettingsLink.js";
import {
	isExtensionContextInvalidatedError,
	loadSettings,
	loadSettingsUiStrings,
	RP_SETTINGS_KEY,
	reloadSettingsUiStrings,
	setSyncIntervalId,
	shouldRunRoPrimeOnCurrentPage,
	syncIntervalId,
} from "./core/core.js";
import {
	applyCommunityRename,
	applyExperiencesRename,
	applyMarketplaceRename,
	updateRenameLoop,
} from "./features/rename.js";
import { syncHomeWelcomeModal } from "./features/welcome.js";
import {
	installFriendCarouselEffects,
	syncFriendCarouselEffects,
} from "./profile/friendCarouselEffects.js";
import {
	installProfilePageEffectObserver,
	syncProfilePageEffect,
} from "./profile/profileEffectsDisplay.js";
import { syncRoEliteView } from "./panel/panel.js";
import { normalizeEquippedProfileEffects } from "./settings/other.js";
import { syncProfileSettingsRoute } from "./settings/profileSettings.js";

function installStorageSyncListener() {
	if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return;
	chrome.storage.onChanged.addListener((changes, area) => {
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
						syncFriendCarouselEffects();
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
			syncRoEliteView();
			syncProfileSettingsRoute();
			syncAccountSettingsMenuButton();
			void syncProfilePageEffect();
			syncFriendCarouselEffects();
		} catch (e) {
			if (!isExtensionContextInvalidatedError(e)) throw e;
		}
	};

	window.addEventListener("popstate", handleRouteChange);
	window.addEventListener("roprime-location-change", handleRouteChange);
}

function bootstrap() {
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
				installProfilePageEffectObserver();
				installFriendCarouselEffects();
				if (syncIntervalId === null) {
					setSyncIntervalId(window.setInterval(syncRoEliteView, 1200));
				}
				if (shouldRunRoPrimeOnCurrentPage()) {
					updateRenameLoop();
				}
				syncRoEliteView();
				syncProfileSettingsRoute();
				syncAccountSettingsMenuButton();
				void syncProfilePageEffect();
				syncFriendCarouselEffects();
				if (shouldRunRoPrimeOnCurrentPage()) {
					applyCommunityRename(document.body);
					applyExperiencesRename(document.body);
					applyMarketplaceRename(document.body);
					syncHomeWelcomeModal();
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
