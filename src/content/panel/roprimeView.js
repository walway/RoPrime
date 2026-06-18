import { syncAlwaysShowCloseButton } from "../navigation/alwaysShowCloseButton.js";
import { updateFriendStylingReimagnedVisibility } from "../navigation/friendStylingReimagned.js";
import { syncOldNavigationBar } from "../navigation/oldNavigationBar.js";
import {
	syncSidebarCompactDecorations,
	updateSidebarCompactVisibility,
} from "../sidebar/sidebarCompact.js";
import { syncHideAgeBadge } from "../sidebar/hideAgeBadge.js";
import { updateSmallNewNavVisibility } from "../sidebar/smallNewNav.js";
import { updateDocumentTitle } from "./pageChrome.js";

export function syncRoPrimeView() {
	syncOldNavigationBar();
	updateSmallNewNavVisibility();
	updateSidebarCompactVisibility();
	syncSidebarCompactDecorations();
	syncAlwaysShowCloseButton();
	updateFriendStylingReimagnedVisibility();
	syncHideAgeBadge();

	updateDocumentTitle(false);
}
