import {
    RP_DEFAULT_PAGE,
    RP_PANEL_CLASS,
    RP_STANDALONE_ID,
    buildPluginUrl,
    getCurrentrp,
    saveSettings,
    settingsState,
} from "./core.js";
import {
    applyAvatarShopBackRename,
    applyCommunityRename,
    applyExperiencesRename,
    applyGamesBackRename,
    applyGroupsBackRename,
    applyMarketplaceRename,
    updateRenameLoop,
} from "./rename.js";

function buildSettingsPaneMarkup() {
    return `
        <div class="${RP_PANEL_CLASS}">
            <div class="roprime-settings-hero"><h2>RoPrime Settings</h2><p>Make Roblox things feel right again.</p></div>
            <div class="roprime-settings-layout">
                <div class="roprime-settings-nav" role="tablist" aria-label="RoPrime Settings sections">
                    <button class="roprime-settings-nav-btn" data-roprime-page="design" type="button">Design</button>
                    <button class="roprime-settings-nav-btn" data-roprime-page="info" type="button">Info</button>
                </div>
                <div class="roprime-settings-main">
                    <section class="roprime-settings-section" data-roprime-section="design">
                        <div class="roprime-setting-card roprime-accordion" data-roprime-accordion="rename">
                            <div class="roprime-accordion-header" role="button" tabindex="0" aria-expanded="false">
                                <div class="roprime-setting-copy"><div class="roprime-setting-title">Rename Roblox wording</div></div>
                                <label class="roprime-switch roprime-accordion-master-switch" for="roprime-toggle-rename-master"><input id="roprime-toggle-rename-master" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label>
                                <span class="roprime-accordion-chevron" aria-hidden="true"></span>
                            </div>
                            <div class="roprime-accordion-body" hidden>
                                <div class="roprime-toggle-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title">Communities → Groups</div></div><label class="roprime-switch" for="roprime-toggle-rename-communities"><input id="roprime-toggle-rename-communities" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                                <div class="roprime-toggle-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title">Experiences → Games</div></div><label class="roprime-switch" for="roprime-toggle-rename-experiences"><input id="roprime-toggle-rename-experiences" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                                <div class="roprime-toggle-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title">Marketplace → Avatar Shop</div></div><label class="roprime-switch" for="roprime-toggle-rename-marketplace"><input id="roprime-toggle-rename-marketplace" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                            </div>
                        </div>
                        <div class="roprime-toggle-row roprime-setting-card-spaced"><div class="roprime-toggle-copy"><div class="roprime-toggle-title">Old Navigation bar</div><div class="roprime-toggle-desc"(IN DEV, PLEASE DONT USE IT!!!)</div></div><label class="roprime-switch" for="roprime-toggle-old-navigation-bar"><input id="roprime-toggle-old-navigation-bar" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                        <div class="roprime-toggle-row roprime-setting-card-spaced"><div class="roprime-toggle-copy"><div class="roprime-toggle-title">Small new navigation bar</div><div class="roprime-toggle-desc">Narrows the new left nav column (overrides the default 288px width).</div></div><label class="roprime-switch" for="roprime-toggle-small-new-navbar"><input id="roprime-toggle-small-new-navbar" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                        <div class="roprime-toggle-row roprime-setting-card-spaced"><div class="roprime-toggle-copy"><div class="roprime-toggle-title">Icon-only left sidebar</div><div class="roprime-toggle-desc">Compact rail (~72px), 48px icon targets, stacks above the page, no sidebar scrolling; hides labels, Get Premium, and Official Store.</div></div><label class="roprime-switch" for="roprime-toggle-sidebar-compact"><input id="roprime-toggle-sidebar-compact" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                        <div class="roprime-toggle-row roprime-setting-card-spaced"><div class="roprime-toggle-copy"><div class="roprime-toggle-title">Friend styling reimagned</div><div class="roprime-toggle-desc">Restyles the friends carousel with a dark glass card and animated presence ring glow.</div></div><label class="roprime-switch" for="roprime-toggle-friend-styling-reimagned"><input id="roprime-toggle-friend-styling-reimagned" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                    </section>
                    <section class="roprime-settings-section" data-roprime-section="info"><div class="roprime-info-card"><div class="roprime-info-title">RoPrime</div><div class="roprime-info-text">This extension adds an RoPrime settings panel on your Roblox Account page and can rename some modern Roblox wording back to classic terms.</div></div></section>
                </div>
            </div>
        </div>`;
}

function ensureStandaloneSettingsView() {
    const accountBase = document.getElementById("react-user-account-base");
    if (!(accountBase instanceof HTMLElement)) return null;
    let standalone = accountBase.querySelector(`#${RP_STANDALONE_ID}`);
    if (!standalone) {
        standalone = document.createElement("div");
        standalone.id = RP_STANDALONE_ID;
        standalone.innerHTML = buildSettingsPaneMarkup();
        accountBase.appendChild(standalone);
    } else {
        const legacyDescription = standalone.querySelector('[data-roprime-accordion="rename"] .roprime-setting-desc');
        const missingSmallNavToggle = !standalone.querySelector("#roprime-toggle-small-new-navbar");
        const missingSidebarCompactToggle = !standalone.querySelector("#roprime-toggle-sidebar-compact");
        const missingOldNavigationBarToggle = !standalone.querySelector("#roprime-toggle-old-navigation-bar");
        const missingFriendStylingReimagnedToggle = !standalone.querySelector("#roprime-toggle-friend-styling-reimagned");
        if (
            legacyDescription ||
            missingSmallNavToggle ||
            missingSidebarCompactToggle ||
            missingOldNavigationBarToggle ||
            missingFriendStylingReimagnedToggle
        ) {
            standalone.innerHTML = buildSettingsPaneMarkup();
            standalone.removeAttribute("data-roprime-controls-bound");
            standalone.removeAttribute("data-roprime-design-toggles-bound");
        }
    }
    return standalone;
}

export function updateStandaloneSettingsVisibility(showPanel) {
    const accountBase = document.getElementById("react-user-account-base");
    if (!(accountBase instanceof HTMLElement)) return null;
    const elementsToToggle = [
        accountBase.querySelector(".tab-content.rbx-tab-content"),
        accountBase.querySelector(".tab-content"),
        accountBase.querySelector("#settings-container"),
        accountBase.querySelector("#mobile-navigation-dropdown"),
    ];
    elementsToToggle.forEach((element) => {
        if (!(element instanceof HTMLElement)) return;
        if (showPanel) element.style.display = "none";
        else element.style.display = "";
    });
    const standalone = ensureStandaloneSettingsView();
    if (!(standalone instanceof HTMLElement)) return null;
    standalone.style.display = showPanel ? "block" : "none";
    return standalone;
}

function bindIndependentDesignToggles(pane, actions, onNavigate) {
    if (pane.getAttribute("data-roprime-design-toggles-bound") === "1") return;
    const oldNavigationBarToggle = pane.querySelector("#roprime-toggle-old-navigation-bar");
    const smallNewNavToggle = pane.querySelector("#roprime-toggle-small-new-navbar");
    const sidebarCompactToggle = pane.querySelector("#roprime-toggle-sidebar-compact");
    const friendStylingReimagnedToggle = pane.querySelector("#roprime-toggle-friend-styling-reimagned");
    if (oldNavigationBarToggle instanceof HTMLInputElement) {
        oldNavigationBarToggle.addEventListener("change", () => {
            settingsState.oldNavigationBarEnabled = oldNavigationBarToggle.checked;
            saveSettings();
            actions.updateOldNavigationBarVisibility();
        });
    }
    if (smallNewNavToggle instanceof HTMLInputElement) {
        smallNewNavToggle.addEventListener("change", () => {
            settingsState.smallNewNavigationBarEnabled = smallNewNavToggle.checked;
            saveSettings();
            actions.updateSmallNewNavVisibility();
        });
    }
    if (sidebarCompactToggle instanceof HTMLInputElement) {
        sidebarCompactToggle.addEventListener("change", () => {
            settingsState.sidebarIconsOnlyEnabled = sidebarCompactToggle.checked;
            saveSettings();
            actions.updateSidebarCompactVisibility();
        });
    }
    if (friendStylingReimagnedToggle instanceof HTMLInputElement) {
        friendStylingReimagnedToggle.addEventListener("change", () => {
            settingsState.friendStylingReimagnedEnabled = friendStylingReimagnedToggle.checked;
            saveSettings();
            actions.updateFriendStylingReimagnedVisibility();
        });
    }
    pane.querySelectorAll(".roprime-settings-nav-btn").forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) return;
        button.addEventListener("click", () => {
            const nextPage = button.dataset.roprimePage || RP_DEFAULT_PAGE;
            const nextUrl = buildPluginUrl(nextPage);
            const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            if (currentUrl !== nextUrl) window.history.pushState({ oldRobloxSettings: true }, "", nextUrl);
            onNavigate();
        });
    });
    pane.setAttribute("data-roprime-design-toggles-bound", "1");
}

export function bindSettingsControls(pane, actions, onNavigate) {
    bindIndependentDesignToggles(pane, actions, onNavigate);
    if (pane.getAttribute("data-roprime-controls-bound") === "1") return;
    const accordion = pane.querySelector('[data-roprime-accordion="rename"]');
    const accordionHeader = accordion?.querySelector(".roprime-accordion-header");
    const accordionBody = accordion?.querySelector(".roprime-accordion-body");
    const masterToggle = pane.querySelector("#roprime-toggle-rename-master");
    const communitiesToggle = pane.querySelector("#roprime-toggle-rename-communities");
    const experiencesToggle = pane.querySelector("#roprime-toggle-rename-experiences");
    const marketplaceToggle = pane.querySelector("#roprime-toggle-rename-marketplace");
    if (!(accordion instanceof HTMLElement)) return;
    if (!(accordionHeader instanceof HTMLElement)) return;
    if (!(accordionBody instanceof HTMLElement)) return;
    if (!(masterToggle instanceof HTMLInputElement)) return;
    if (!(communitiesToggle instanceof HTMLInputElement)) return;
    if (!(experiencesToggle instanceof HTMLInputElement)) return;
    if (!(marketplaceToggle instanceof HTMLInputElement)) return;

    const syncAccordionA11y = () => {
        const isOpen = accordion.classList.contains("is-open");
        accordionHeader.setAttribute("aria-expanded", String(isOpen));
        accordionBody.setAttribute("aria-hidden", String(!isOpen));
    };
    const animateAccordion = (open) => {
        const currentHeight = accordionBody.scrollHeight;
        accordionBody.style.maxHeight = `${currentHeight}px`;
        if (open) {
            accordion.classList.add("is-open");
            requestAnimationFrame(() => {
                accordionBody.style.maxHeight = `${accordionBody.scrollHeight}px`;
            });
        } else {
            requestAnimationFrame(() => {
                accordion.classList.remove("is-open");
                accordionBody.style.maxHeight = "0px";
            });
        }
        syncAccordionA11y();
    };
    const toggleAccordion = () => animateAccordion(!accordion.classList.contains("is-open"));
    const openAccordion = () => {
        if (!accordion.classList.contains("is-open")) animateAccordion(true);
    };
    const closeAccordion = () => {
        if (accordion.classList.contains("is-open")) animateAccordion(false);
    };

    masterToggle.addEventListener("pointerdown", (event) => event.stopPropagation());
    masterToggle.addEventListener("click", (event) => event.stopPropagation());
    masterToggle.closest("label")?.addEventListener("pointerdown", (event) => event.stopPropagation());
    masterToggle.closest("label")?.addEventListener("click", (event) => event.stopPropagation());
    accordionHeader.addEventListener("click", (event) => {
        const target = event.target;
        if (target instanceof Element && target.closest(".roprime-accordion-master-switch")) return;
        toggleAccordion();
    });
    accordionHeader.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const target = event.target;
        if (target instanceof Element && target.closest(".roprime-accordion-master-switch")) return;
        event.preventDefault();
        toggleAccordion();
    });

    const applyRenameUiEnabledState = () => {
        const enabled = !!settingsState.renameDropdownEnabled;
        masterToggle.checked = enabled;
        communitiesToggle.checked = !!settingsState.renameCommunitiesToGroups;
        experiencesToggle.checked = !!settingsState.renameExperiencesToGames;
        marketplaceToggle.checked = !!settingsState.renameMarketplaceToAvatarShop;
        accordion.classList.toggle("is-renames-disabled", !enabled);
    };

    masterToggle.addEventListener("change", () => {
        const enable = !!masterToggle.checked;
        settingsState.renameDropdownEnabled = enable;
        saveSettings();
        updateRenameLoop();
        applyRenameUiEnabledState();
        if (!enable) {
            closeAccordion();
            if (settingsState.renameCommunitiesToGroups) applyGroupsBackRename(document.body);
            if (settingsState.renameExperiencesToGames) applyGamesBackRename(document.body);
            if (settingsState.renameMarketplaceToAvatarShop) applyAvatarShopBackRename(document.body);
            return;
        }
        openAccordion();
        if (settingsState.renameCommunitiesToGroups) applyCommunityRename(document.body);
        if (settingsState.renameExperiencesToGames) applyExperiencesRename(document.body);
        if (settingsState.renameMarketplaceToAvatarShop) applyMarketplaceRename(document.body);
    });

    communitiesToggle.addEventListener("change", () => {
        if (!settingsState.renameDropdownEnabled) {
            settingsState.renameDropdownEnabled = true;
            masterToggle.checked = true;
        }
        const wasEnabled = !!settingsState.renameCommunitiesToGroups;
        settingsState.renameCommunitiesToGroups = communitiesToggle.checked;
        saveSettings();
        updateRenameLoop();
        if (settingsState.renameCommunitiesToGroups) {
            applyCommunityRename(document.body);
            openAccordion();
        } else if (wasEnabled) {
            applyGroupsBackRename(document.body);
        }
        applyRenameUiEnabledState();
    });
    experiencesToggle.addEventListener("change", () => {
        if (!settingsState.renameDropdownEnabled) {
            settingsState.renameDropdownEnabled = true;
            masterToggle.checked = true;
        }
        const wasEnabled = !!settingsState.renameExperiencesToGames;
        settingsState.renameExperiencesToGames = experiencesToggle.checked;
        saveSettings();
        updateRenameLoop();
        if (settingsState.renameExperiencesToGames) {
            applyExperiencesRename(document.body);
            openAccordion();
        } else if (wasEnabled) {
            applyGamesBackRename(document.body);
        }
        applyRenameUiEnabledState();
    });
    marketplaceToggle.addEventListener("change", () => {
        if (!settingsState.renameDropdownEnabled) {
            settingsState.renameDropdownEnabled = true;
            masterToggle.checked = true;
        }
        const wasEnabled = !!settingsState.renameMarketplaceToAvatarShop;
        settingsState.renameMarketplaceToAvatarShop = marketplaceToggle.checked;
        saveSettings();
        updateRenameLoop();
        if (settingsState.renameMarketplaceToAvatarShop) {
            applyMarketplaceRename(document.body);
            openAccordion();
        } else if (wasEnabled) {
            applyAvatarShopBackRename(document.body);
        }
        applyRenameUiEnabledState();
    });
    accordionBody.hidden = false;
    accordionBody.style.maxHeight = accordion.classList.contains("is-open") ? `${accordionBody.scrollHeight}px` : "0px";
    syncAccordionA11y();
    applyRenameUiEnabledState();
    pane.setAttribute("data-roprime-controls-bound", "1");
}

export function refreshSettingsControls(pane) {
    const masterToggle = pane.querySelector("#roprime-toggle-rename-master");
    const communitiesToggle = pane.querySelector("#roprime-toggle-rename-communities");
    const experiencesToggle = pane.querySelector("#roprime-toggle-rename-experiences");
    const marketplaceToggle = pane.querySelector("#roprime-toggle-rename-marketplace");
    const oldNavigationBarToggle = pane.querySelector("#roprime-toggle-old-navigation-bar");
    const smallNewNavToggle = pane.querySelector("#roprime-toggle-small-new-navbar");
    const sidebarCompactToggle = pane.querySelector("#roprime-toggle-sidebar-compact");
    const friendStylingReimagnedToggle = pane.querySelector("#roprime-toggle-friend-styling-reimagned");
    if (masterToggle instanceof HTMLInputElement) masterToggle.checked = !!settingsState.renameDropdownEnabled;
    if (communitiesToggle instanceof HTMLInputElement) communitiesToggle.checked = !!settingsState.renameCommunitiesToGroups;
    if (experiencesToggle instanceof HTMLInputElement) experiencesToggle.checked = !!settingsState.renameExperiencesToGames;
    if (marketplaceToggle instanceof HTMLInputElement)
        marketplaceToggle.checked = !!settingsState.renameMarketplaceToAvatarShop;
    if (oldNavigationBarToggle instanceof HTMLInputElement) oldNavigationBarToggle.checked = !!settingsState.oldNavigationBarEnabled;
    if (smallNewNavToggle instanceof HTMLInputElement)
        smallNewNavToggle.checked = !!settingsState.smallNewNavigationBarEnabled;
    if (sidebarCompactToggle instanceof HTMLInputElement) sidebarCompactToggle.checked = !!settingsState.sidebarIconsOnlyEnabled;
    if (friendStylingReimagnedToggle instanceof HTMLInputElement)
        friendStylingReimagnedToggle.checked = !!settingsState.friendStylingReimagnedEnabled;
    const accordion = pane.querySelector('[data-roprime-accordion="rename"]');
    if (accordion instanceof HTMLElement) {
        accordion.classList.toggle("is-renames-disabled", !settingsState.renameDropdownEnabled);
    }
    const activePage = getCurrentrp() || RP_DEFAULT_PAGE;
    pane.querySelectorAll(".roprime-settings-nav-btn").forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) return;
        const isActive = button.dataset.roprimePage === activePage;
        button.classList.toggle("is-active", isActive);
    });
    pane.querySelectorAll(".roprime-settings-section").forEach((section) => {
        if (!(section instanceof HTMLElement)) return;
        const sectionKey = section.getAttribute("data-roprime-section") || "";
        section.style.display = sectionKey === activePage ? "block" : "none";
    });
}
