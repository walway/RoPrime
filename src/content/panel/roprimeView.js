import { syncAlwaysShowCloseButton } from "../navigation/alwaysShowCloseButton.js";
import { updateFriendStylingReimagnedVisibility } from "../navigation/friendStylingReimagned.js";
import { syncOldNavigationBar } from "../navigation/oldNavigationBar.js";
import {
	syncSidebarCompactDecorations,
	updateSidebarCompactVisibility,
} from "../sidebar/sidebarCompact.js";
import { updateSmallNewNavVisibility } from "../sidebar/smallNewNav.js";
import { updateDocumentTitle } from "./pageChrome.js";

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
