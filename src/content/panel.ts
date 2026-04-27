import { RP_TAB_ID, isAccountPage, isPluginRoute, settingsState } from "./core.js";
import { syncOldNavigationBar } from "./oldNavigationBar.js";
import { applyCommunityRename, applyExperiencesRename, applyMarketplaceRename } from "./rename.js";
import { updateFriendStylingReimagnedVisibility } from "./friendStylingReimagned.js";
import { syncHomeWelcomeModal } from "./welcome.js";
import { injectRoEliteTab, ensureAccountDivider } from "./accountTab.js";
import { updateSmallNewNavVisibility } from "./smallNewNav.js";
import { updateSidebarCompactVisibility, syncSidebarCompactDecorations } from "./sidebarCompact.js";
import { bindSettingsControls, refreshSettingsControls, updateStandaloneSettingsVisibility } from "./settingsPane.js";
import { updateAccountHeader, updateDocumentTitle, updateSidebarVisibility, updateTabState } from "./pageChrome.js";
import { injectRoPrimeDropdownItem } from "./dropdownMenu.js";

export function updateOldNavigationBarVisibility() {
    syncOldNavigationBar();
}

export function syncRoEliteView() {
    injectRoPrimeDropdownItem();
    updateOldNavigationBarVisibility();
    updateSmallNewNavVisibility();
    updateSidebarCompactVisibility();
    updateFriendStylingReimagnedVisibility();
    syncSidebarCompactDecorations();
    injectRoEliteTab(syncRoEliteView);
    ensureAccountDivider();

    const showPanel = isPluginRoute();
    updateAccountHeader(showPanel);
    updateDocumentTitle(showPanel);

    if (!isAccountPage()) return;
    const standalonePanel = updateStandaloneSettingsVisibility(showPanel);
    if (!(standalonePanel instanceof HTMLElement)) return;

    bindSettingsControls(
        standalonePanel,
        {
            updateOldNavigationBarVisibility,
            updateSmallNewNavVisibility,
            updateSidebarCompactVisibility,
            updateFriendStylingReimagnedVisibility,
        },
        syncRoEliteView,
    );
    refreshSettingsControls(standalonePanel);
    updateTabState(showPanel, RP_TAB_ID);
    updateSidebarVisibility(showPanel);

    if (settingsState.renameCommunitiesToGroups) applyCommunityRename(document.body);
    if (settingsState.renameExperiencesToGames) applyExperiencesRename(document.body);
    if (settingsState.renameMarketplaceToAvatarShop) applyMarketplaceRename(document.body);
    syncHomeWelcomeModal();
}
