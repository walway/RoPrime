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

const RP_DEBUG_UNLOCK_VALUE = "debug";

let languageKeysCache = null;
let languageKeysPromise = null;

function getLanguageCode() {
    return settingsState.language === "ru" ? "ru" : "en";
}

function getLanguageLabel(langCode) {
    const dict = languageKeysCache?.[getLanguageCode()] || FALLBACK_LANGUAGE_KEYS[getLanguageCode()];
    if (langCode === "ru") return dict["settings.language.ru"];
    return dict["settings.language.en"];
}

async function ensureLanguageKeys() {
    if (languageKeysCache) return languageKeysCache;
    if (languageKeysPromise) return languageKeysPromise;
    languageKeysPromise = (async () => {
        try {
            if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
                const url = chrome.runtime.getURL("language-keys.json");
                const response = await fetch(url, { cache: "no-store" });
                if (response.ok) {
                    const data = await response.json();
                    if (data && typeof data === "object") {
                        languageKeysCache = data;
                        return languageKeysCache;
                    }
                }
            }
        } catch {
            // Fallback to bundled keys.
        }
        languageKeysCache = FALLBACK_LANGUAGE_KEYS;
        return languageKeysCache;
    })();
    return languageKeysPromise;
}

function t(key) {
    const dict = languageKeysCache?.[getLanguageCode()] || FALLBACK_LANGUAGE_KEYS[getLanguageCode()];
    return dict?.[key] || FALLBACK_LANGUAGE_KEYS.en[key] || key;
}

function getBlockedExecutionPagesValue() {
    if (!Array.isArray(settingsState.blockedExecutionPages)) return "";
    return settingsState.blockedExecutionPages.join("\n");
}

function parseBlockedExecutionPages(value) {
    if (typeof value !== "string") return [];
    const seen = new Set();
    return value
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean)
        .filter((entry) => {
            const key = entry.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function isDeveloperPageUnlocked() {
    return !!settingsState.developerPageUnlocked;
}

function escapeForRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getLevenshteinDistance(a, b) {
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const matrix = Array.from({ length: b.length + 1 }, (_, row) =>
        Array.from({ length: a.length + 1 }, (_, col) => (row === 0 ? col : col === 0 ? row : 0)),
    );
    for (let row = 1; row <= b.length; row += 1) {
        for (let col = 1; col <= a.length; col += 1) {
            const indicator = a[col - 1] === b[row - 1] ? 0 : 1;
            matrix[row][col] = Math.min(
                matrix[row][col - 1] + 1,
                matrix[row - 1][col] + 1,
                matrix[row - 1][col - 1] + indicator,
            );
        }
    }
    return matrix[b.length][a.length];
}

function isSearchMatch(text, query) {
    const normalized = text.toLowerCase().trim();
    const queryNoSpaces = query.replace(/\s+/g, "");
    if (!normalized) return false;
    if (normalized.includes(query)) return true;
    if (normalized.replace(/\s+/g, "").includes(queryNoSpaces)) return true;
    const words = normalized.split(/\s+/).filter(Boolean);
    const threshold = query.length > 5 ? 2 : 1;
    return words.some((word) => getLevenshteinDistance(query, word) <= threshold);
}

function clearSearchHighlights(root) {
    if (!(root instanceof Element)) return;
    root.querySelectorAll("[data-roprime-search-highlight]").forEach((element) => {
        if (!(element instanceof HTMLElement)) return;
        const original = element.dataset.roprimeSearchOriginalText;
        if (typeof original === "string") {
            element.textContent = original;
        }
        delete element.dataset.roprimeSearchOriginalText;
        delete element.dataset.roprimeSearchHighlight;
    });
}

function applySearchHighlights(root, term) {
    if (!(root instanceof Element)) return;
    if (!term) {
        clearSearchHighlights(root);
        return;
    }
    const matcher = new RegExp(`(${escapeForRegex(term)})`, "gi");
    const highlightTargets = [
        ".roprime-setting-title",
        ".roprime-setting-desc",
        ".roprime-toggle-title",
        ".roprime-toggle-desc",
        ".roprime-sidebar-size-tick span",
        ".roprime-info-title",
        ".roprime-info-text",
        ".roprime-language-option",
        "[data-roprime-lang-current]",
    ];
    root.querySelectorAll(highlightTargets.join(", ")).forEach((element) => {
        if (!(element instanceof HTMLElement)) return;
        const sourceText = element.dataset.roprimeSearchOriginalText ?? element.textContent ?? "";
        element.dataset.roprimeSearchOriginalText = sourceText;
        const highlighted = sourceText.replace(matcher, '<mark class="roprime-search-mark">$1</mark>');
        element.innerHTML = highlighted;
        element.dataset.roprimeSearchHighlight = "1";
    });
}

async function applyPaneTranslations(pane) {
    await ensureLanguageKeys();
    pane.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (!key) return;
        el.textContent = t(key);
    });
    pane.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (!key) return;
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            el.placeholder = t(key);
        }
    });
    const current = pane.querySelector("[data-roprime-lang-current]");
    if (current instanceof HTMLElement) current.textContent = getLanguageLabel(getLanguageCode());
}

function buildSettingsPaneMarkup() {
    return `
        <div class="${RP_PANEL_CLASS}">
            <div class="roprime-settings-hero"><h2 data-i18n="settings.hero.title"></h2><p data-i18n="settings.hero.subtitle"></p></div>
            <div class="roprime-settings-layout">
                <div class="roprime-settings-sidebar">
                    <div class="roprime-settings-search-wrap" data-roprime-shared-search-wrap><input id="roprime-settings-search" type="search" class="roprime-settings-search" data-i18n-placeholder="settings.search.placeholder" /></div>
                    <div class="roprime-settings-nav" role="tablist" aria-label="RoPrime Settings sections">
                        <button class="roprime-settings-nav-btn" data-roprime-page="design" type="button" data-i18n="settings.nav.design"></button>
                        <button class="roprime-settings-nav-btn" data-roprime-page="settings" type="button" data-i18n="settings.nav.settings"></button>
                        <button class="roprime-settings-nav-btn" data-roprime-page="info" type="button" data-i18n="settings.nav.info"></button>
                        <button class="roprime-settings-nav-btn" data-roprime-page="developer" type="button" data-i18n="settings.nav.developer" hidden></button>
                    </div>
                </div>
                <div class="roprime-settings-main">
                    <div class="roprime-search-hint" data-roprime-search-hint data-i18n="settings.search.minLength"></div>
                    <div class="roprime-search-hint" data-roprime-developer-unlock-message data-i18n="settings.search.developerLocked" style="display:none;"></div>
                    <section class="roprime-settings-section" data-roprime-section="design">
                        <div class="roprime-setting-card roprime-accordion" data-roprime-accordion="rename">
                            <div class="roprime-accordion-header" role="button" tabindex="0" aria-expanded="false">
                                <div class="roprime-setting-copy"><div class="roprime-setting-title" data-i18n="settings.rename.title"></div></div>
                                <label class="roprime-switch roprime-accordion-master-switch" for="roprime-toggle-rename-master"><input id="roprime-toggle-rename-master" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label>
                                <span class="roprime-accordion-chevron" aria-hidden="true"></span>
                            </div>
                            <div class="roprime-accordion-body" hidden>
                                <div class="roprime-toggle-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="settings.rename.communities"></div></div><label class="roprime-switch" for="roprime-toggle-rename-communities"><input id="roprime-toggle-rename-communities" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                                <div class="roprime-toggle-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="settings.rename.experiences"></div></div><label class="roprime-switch" for="roprime-toggle-rename-experiences"><input id="roprime-toggle-rename-experiences" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                                <div class="roprime-toggle-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="settings.rename.marketplace"></div></div><label class="roprime-switch" for="roprime-toggle-rename-marketplace"><input id="roprime-toggle-rename-marketplace" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                            </div>
                        </div>
                        <div class="roprime-toggle-row roprime-setting-card-spaced"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="settings.oldNav.title"></div><div class="roprime-toggle-desc" data-i18n="settings.oldNav.desc"></div></div><label class="roprime-switch" for="roprime-toggle-old-navigation-bar"><input id="roprime-toggle-old-navigation-bar" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                        <div class="roprime-toggle-row roprime-setting-card-spaced roprime-sidebar-size-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="settings.sidebar.title"></div><div class="roprime-toggle-desc" data-i18n="settings.sidebar.desc"></div></div><div class="roprime-sidebar-size-control"><div class="roprime-sidebar-size-box"><div class="roprime-sidebar-size-rail"><input id="roprime-sidebar-size-slider" class="roprime-sidebar-size-slider" type="range" min="0" max="100" step="0.1" value="0" aria-label="Sidebar size" /></div><div class="roprime-sidebar-size-ticks"><button class="roprime-sidebar-size-tick" type="button" data-size-mode="full"><span data-i18n="settings.sidebar.full"></span></button><button class="roprime-sidebar-size-tick" type="button" data-size-mode="small"><span data-i18n="settings.sidebar.small"></span></button><button class="roprime-sidebar-size-tick" type="button" data-size-mode="icon"><span data-i18n="settings.sidebar.icon"></span></button></div></div></div></div>
                        <div class="roprime-toggle-row roprime-setting-card-spaced"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="settings.sidebar.alwaysClose.title"></div><div class="roprime-toggle-desc" data-i18n="settings.sidebar.alwaysClose.desc"></div></div><label class="roprime-switch" for="roprime-toggle-always-show-close"><input id="roprime-toggle-always-show-close" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                        <div class="roprime-toggle-row roprime-setting-card-spaced"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="settings.friend.title"></div><div class="roprime-toggle-desc" data-i18n="settings.friend.desc"></div></div><label class="roprime-switch" for="roprime-toggle-friend-styling-reimagned"><input id="roprime-toggle-friend-styling-reimagned" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                    </section>
                    <section class="roprime-settings-section" data-roprime-section="settings">
                        <div class="roprime-setting-card">
                            <div class="roprime-setting-copy">
                                <div class="roprime-setting-title" data-i18n="settings.language.title"></div>
                                <div class="roprime-setting-desc" data-i18n="settings.language.desc"></div>
                            </div>
                            <div class="roprime-language-dropdown" data-roprime-language-dropdown>
                                <button type="button" class="roprime-language-trigger"><span data-roprime-lang-current></span><span class="roprime-language-chevron" aria-hidden="true"></span></button>
                                <div class="roprime-language-menu" hidden>
                                    <button type="button" class="roprime-language-option" data-lang="en" data-i18n="settings.language.en"></button>
                                    <button type="button" class="roprime-language-option" data-lang="ru" data-i18n="settings.language.ru"></button>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section class="roprime-settings-section" data-roprime-section="info"><div class="roprime-info-card"><div class="roprime-info-title" data-i18n="settings.info.title"></div><div class="roprime-info-text" data-i18n="settings.info.text"></div></div></section>
                    <section class="roprime-settings-section" data-roprime-section="developer" hidden>
                        <div class="roprime-setting-card">
                            <div class="roprime-setting-copy">
                                <div class="roprime-setting-title" data-i18n="settings.developer.title"></div>
                                <div class="roprime-setting-desc" data-i18n="settings.developer.desc"></div>
                            </div>
                        </div>
                        <div class="roprime-setting-card roprime-setting-card-spaced">
                            <div class="roprime-setting-copy">
                                <div class="roprime-setting-title" data-i18n="settings.developer.blocked.title"></div>
                                <div class="roprime-setting-desc" data-i18n="settings.developer.blocked.desc"></div>
                            </div>
                            <textarea
                                id="roprime-developer-blocked-pages"
                                class="roprime-settings-search"
                                rows="6"
                                spellcheck="false"
                                data-i18n-placeholder="settings.developer.blocked.placeholder"
                            ></textarea>
                            <div style="margin-top:12px;">
                                <button type="button" class="btn-secondary-md" id="roprime-save-blocked-pages" data-i18n="settings.developer.blocked.save"></button>
                            </div>
                        </div>
                    </section>
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
        const missingSidebarSizeSlider = !standalone.querySelector("#roprime-sidebar-size-slider");
        const missingOldNavigationBarToggle = !standalone.querySelector("#roprime-toggle-old-navigation-bar");
        const missingFriendStylingReimagnedToggle = !standalone.querySelector("#roprime-toggle-friend-styling-reimagned");
        const missingDeveloperSection = !standalone.querySelector('[data-roprime-section="developer"]');
        if (
            legacyDescription ||
            missingSidebarSizeSlider ||
            missingOldNavigationBarToggle ||
            missingFriendStylingReimagnedToggle ||
            missingDeveloperSection
        ) {
            standalone.innerHTML = buildSettingsPaneMarkup();
            standalone.removeAttribute("data-roprime-controls-bound");
            standalone.removeAttribute("data-roprime-design-toggles-bound");
        }
    }
    applyPaneTranslations(standalone);
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
        if (showPanel) {
            element.setAttribute("data-roprime-hidden-by-panel", "1");
            element.style.display = "none";
            return;
        }
        if (element.getAttribute("data-roprime-hidden-by-panel") !== "1") return;
        element.style.display = "";
        element.removeAttribute("data-roprime-hidden-by-panel");
    });
    const standalone = ensureStandaloneSettingsView();
    if (!(standalone instanceof HTMLElement)) return null;
    standalone.style.display = showPanel ? "block" : "none";
    return standalone;
}

function bindIndependentDesignToggles(pane, actions, onNavigate) {
    if (pane.getAttribute("data-roprime-design-toggles-bound") === "1") return;
    const oldNavigationBarToggle = pane.querySelector("#roprime-toggle-old-navigation-bar");
    const sidebarSizeSlider = pane.querySelector("#roprime-sidebar-size-slider");
    const alwaysShowCloseToggle = pane.querySelector("#roprime-toggle-always-show-close");
    const friendStylingReimagnedToggle = pane.querySelector("#roprime-toggle-friend-styling-reimagned");
    const searchInput = pane.querySelector("#roprime-settings-search");
    const blockedPagesTextarea = pane.querySelector("#roprime-developer-blocked-pages");
    const saveBlockedPagesButton = pane.querySelector("#roprime-save-blocked-pages");
    if (oldNavigationBarToggle instanceof HTMLInputElement) {
        oldNavigationBarToggle.addEventListener("change", () => {
            settingsState.oldNavigationBarEnabled = oldNavigationBarToggle.checked;
            saveSettings();
            actions.updateOldNavigationBarVisibility();
        });
    }
    if (sidebarSizeSlider instanceof HTMLInputElement) {
        const modeValues = { full: 0, small: 50, icon: 100 };
        const nearestModeForValue = (raw) => {
            const value = Number(raw);
            if (Number.isNaN(value)) return "full";
            if (value < 25) return "full";
            if (value < 75) return "small";
            return "icon";
        };
        const applySidebarMode = (mode) => {
            settingsState.smallNewNavigationBarEnabled = mode === "small";
            settingsState.sidebarIconsOnlyEnabled = mode === "icon";
            saveSettings();
            actions.updateSmallNewNavVisibility();
            actions.updateSidebarCompactVisibility();
            pane.setAttribute("data-roprime-sidebar-size-mode", mode);
            pane.querySelectorAll(".roprime-sidebar-size-tick").forEach((tick) => {
                if (!(tick instanceof HTMLButtonElement)) return;
                tick.classList.toggle("is-active", tick.dataset.sizeMode === mode);
            });
        };
        const setSidebarModeVisual = (mode) => {
            pane.setAttribute("data-roprime-sidebar-size-mode", mode);
            pane.querySelectorAll(".roprime-sidebar-size-tick").forEach((tick) => {
                if (!(tick instanceof HTMLButtonElement)) return;
                tick.classList.toggle("is-active", tick.dataset.sizeMode === mode);
            });
        };
        const commitNearestMode = () => {
            const mode = nearestModeForValue(sidebarSizeSlider.value);
            sidebarSizeSlider.value = String(modeValues[mode]);
            applySidebarMode(mode);
            sidebarSizeSlider.removeAttribute("data-roprime-dragging");
        };
        const commitIfDragging = () => {
            if (sidebarSizeSlider.getAttribute("data-roprime-dragging") !== "1") return;
            commitNearestMode();
        };
        sidebarSizeSlider.addEventListener("input", () => {
            sidebarSizeSlider.setAttribute("data-roprime-dragging", "1");
            setSidebarModeVisual(nearestModeForValue(sidebarSizeSlider.value));
        });
        sidebarSizeSlider.addEventListener("change", commitNearestMode);
        sidebarSizeSlider.addEventListener("pointerdown", () => {
            sidebarSizeSlider.setAttribute("data-roprime-dragging", "1");
        });
        sidebarSizeSlider.addEventListener("pointerup", commitNearestMode);
        sidebarSizeSlider.addEventListener("pointercancel", commitIfDragging);
        sidebarSizeSlider.addEventListener("blur", commitIfDragging);
        document.addEventListener("pointerup", commitIfDragging);
        sidebarSizeSlider.addEventListener("keyup", (event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home" || event.key === "End") {
                commitNearestMode();
            }
        });

        pane.querySelectorAll(".roprime-sidebar-size-tick").forEach((tick) => {
            if (!(tick instanceof HTMLButtonElement)) return;
            tick.addEventListener("click", () => {
                const mode = tick.dataset.sizeMode || "full";
                const nextValue = modeValues[mode] ?? modeValues.full;
                sidebarSizeSlider.value = String(nextValue);
                sidebarSizeSlider.removeAttribute("data-roprime-dragging");
                applySidebarMode(mode);
            });
        });
    }
    if (alwaysShowCloseToggle instanceof HTMLInputElement) {
        alwaysShowCloseToggle.addEventListener("change", () => {
            settingsState.alwaysShowCloseButtonEnabled = alwaysShowCloseToggle.checked;
            saveSettings();
            actions.updateAlwaysShowCloseButtonVisibility?.();
        });
    }
    if (searchInput instanceof HTMLInputElement) {
        const unlockDeveloperPage = () => {
            if (isDeveloperPageUnlocked()) return;
            settingsState.developerPageUnlocked = true;
            saveSettings();
            pane.setAttribute("data-roprime-developer-unlock-message-visible", "1");
        };
        const enterSearchMode = () => {
            const isSearchMode = pane.getAttribute("data-roprime-search-mode") === "1";
            const currentPage = getCurrentrp() || RP_DEFAULT_PAGE;
            const sourcePage =
                currentPage === "info" || currentPage === "developer" ? RP_DEFAULT_PAGE : currentPage;
            pane.setAttribute("data-roprime-search-source-page", sourcePage);
            if (!isSearchMode) {
                searchInput.value = "";
            }
            pane.setAttribute("data-roprime-search-mode", "1");
            refreshSettingsControls(pane);
        };
        searchInput.addEventListener("focus", enterSearchMode);
        searchInput.addEventListener("click", enterSearchMode);
        searchInput.addEventListener("input", () => {
            if (pane.getAttribute("data-roprime-search-mode") !== "1") return;
            if (searchInput.value.trim().toLowerCase() === RP_DEBUG_UNLOCK_VALUE) {
                unlockDeveloperPage();
            }
            refreshSettingsControls(pane);
        });
    }
    if (blockedPagesTextarea instanceof HTMLTextAreaElement) {
        blockedPagesTextarea.addEventListener("keydown", (event) => event.stopPropagation());
        blockedPagesTextarea.addEventListener("input", () => {
            if (saveBlockedPagesButton instanceof HTMLButtonElement) saveBlockedPagesButton.disabled = false;
        });
    }
    if (saveBlockedPagesButton instanceof HTMLButtonElement && blockedPagesTextarea instanceof HTMLTextAreaElement) {
        saveBlockedPagesButton.addEventListener("click", () => {
            settingsState.blockedExecutionPages = parseBlockedExecutionPages(blockedPagesTextarea.value);
            saveSettings();
            saveBlockedPagesButton.disabled = true;
        });
    }
    const languageDropdown = pane.querySelector("[data-roprime-language-dropdown]");
    const languageMenu = languageDropdown?.querySelector(".roprime-language-menu");
    const languageTrigger = languageDropdown?.querySelector(".roprime-language-trigger");
    if (
        languageDropdown instanceof HTMLElement &&
        languageMenu instanceof HTMLElement &&
        languageTrigger instanceof HTMLButtonElement
    ) {
        languageTrigger.addEventListener("click", () => {
            const next = !languageDropdown.classList.contains("is-open");
            languageDropdown.classList.toggle("is-open", next);
            languageMenu.hidden = !next;
        });
        languageMenu.querySelectorAll(".roprime-language-option").forEach((option) => {
            if (!(option instanceof HTMLButtonElement)) return;
            option.addEventListener("click", () => {
                const next = option.dataset.lang === "ru" ? "ru" : "en";
                settingsState.language = next;
                saveSettings();
                languageDropdown.classList.remove("is-open");
                languageMenu.hidden = true;
                applyPaneTranslations(pane);
            });
        });
        document.addEventListener("click", (event) => {
            if (!(event.target instanceof Element)) return;
            if (languageDropdown.contains(event.target)) return;
            languageDropdown.classList.remove("is-open");
            languageMenu.hidden = true;
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
            if (button.dataset.roprimePage === "developer" && !isDeveloperPageUnlocked()) return;
            pane.removeAttribute("data-roprime-search-mode");
            pane.removeAttribute("data-roprime-search-source-page");
            const searchBox = pane.querySelector("#roprime-settings-search");
            if (searchBox instanceof HTMLInputElement) searchBox.value = "";
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

export async function refreshSettingsControls(pane) {
    await applyPaneTranslations(pane);
    const masterToggle = pane.querySelector("#roprime-toggle-rename-master");
    const communitiesToggle = pane.querySelector("#roprime-toggle-rename-communities");
    const experiencesToggle = pane.querySelector("#roprime-toggle-rename-experiences");
    const marketplaceToggle = pane.querySelector("#roprime-toggle-rename-marketplace");
    const oldNavigationBarToggle = pane.querySelector("#roprime-toggle-old-navigation-bar");
    const sidebarSizeSlider = pane.querySelector("#roprime-sidebar-size-slider");
    const alwaysShowCloseToggle = pane.querySelector("#roprime-toggle-always-show-close");
    const friendStylingReimagnedToggle = pane.querySelector("#roprime-toggle-friend-styling-reimagned");
    const developerNavButton = pane.querySelector('.roprime-settings-nav-btn[data-roprime-page="developer"]');
    const blockedPagesTextarea = pane.querySelector("#roprime-developer-blocked-pages");
    const saveBlockedPagesButton = pane.querySelector("#roprime-save-blocked-pages");
    if (masterToggle instanceof HTMLInputElement) masterToggle.checked = !!settingsState.renameDropdownEnabled;
    if (communitiesToggle instanceof HTMLInputElement) communitiesToggle.checked = !!settingsState.renameCommunitiesToGroups;
    if (experiencesToggle instanceof HTMLInputElement) experiencesToggle.checked = !!settingsState.renameExperiencesToGames;
    if (marketplaceToggle instanceof HTMLInputElement)
        marketplaceToggle.checked = !!settingsState.renameMarketplaceToAvatarShop;
    if (oldNavigationBarToggle instanceof HTMLInputElement) oldNavigationBarToggle.checked = !!settingsState.oldNavigationBarEnabled;
    if (alwaysShowCloseToggle instanceof HTMLInputElement)
        alwaysShowCloseToggle.checked = !!settingsState.alwaysShowCloseButtonEnabled;
    const sidebarSizeMode = settingsState.sidebarIconsOnlyEnabled
        ? "icon"
        : settingsState.smallNewNavigationBarEnabled
          ? "small"
          : "full";
    const isSidebarSizeDragging =
        sidebarSizeSlider instanceof HTMLInputElement && sidebarSizeSlider.getAttribute("data-roprime-dragging") === "1";
    if (sidebarSizeSlider instanceof HTMLInputElement) {
        const valueByMode = { full: "0", small: "50", icon: "100" };
        if (!isSidebarSizeDragging) {
            sidebarSizeSlider.value = valueByMode[sidebarSizeMode];
        }
    }
    if (!isSidebarSizeDragging) {
        pane.setAttribute("data-roprime-sidebar-size-mode", sidebarSizeMode);
        pane.querySelectorAll(".roprime-sidebar-size-tick").forEach((tick) => {
            if (!(tick instanceof HTMLButtonElement)) return;
            tick.classList.toggle("is-active", tick.dataset.sizeMode === sidebarSizeMode);
        });
    }
    if (friendStylingReimagnedToggle instanceof HTMLInputElement)
        friendStylingReimagnedToggle.checked = !!settingsState.friendStylingReimagnedEnabled;
    if (developerNavButton instanceof HTMLButtonElement) {
        developerNavButton.hidden = !isDeveloperPageUnlocked();
    }
    if (blockedPagesTextarea instanceof HTMLTextAreaElement) {
        const nextValue = getBlockedExecutionPagesValue();
        if (blockedPagesTextarea.value !== nextValue) blockedPagesTextarea.value = nextValue;
    }
    if (saveBlockedPagesButton instanceof HTMLButtonElement) saveBlockedPagesButton.disabled = true;
    const accordion = pane.querySelector('[data-roprime-accordion="rename"]');
    if (accordion instanceof HTMLElement) {
        accordion.classList.toggle("is-renames-disabled", !settingsState.renameDropdownEnabled);
    }
    const activePage = getCurrentrp() || RP_DEFAULT_PAGE;
    const isSearchMode = pane.getAttribute("data-roprime-search-mode") === "1";
    const searchSourcePage = pane.getAttribute("data-roprime-search-source-page") || RP_DEFAULT_PAGE;
    pane.classList.toggle("is-search-mode", isSearchMode);
    pane.querySelectorAll(".roprime-settings-nav-btn").forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) return;
        if (button.dataset.roprimePage === "developer" && !isDeveloperPageUnlocked()) return;
        const isActive = !isSearchMode && button.dataset.roprimePage === activePage;
        button.classList.toggle("is-active", isActive);
    });
    const searchInput = pane.querySelector("#roprime-settings-search");
    const searchTerm = searchInput instanceof HTMLInputElement ? searchInput.value.trim().toLowerCase() : "";
    const hasSearchTerm = searchTerm.length >= 2;
    const showSearchHint = isSearchMode && searchTerm.length > 0 && searchTerm.length < 2;
    const searchHint = pane.querySelector("[data-roprime-search-hint]");
    if (searchHint instanceof HTMLElement) {
        searchHint.style.display = showSearchHint ? "block" : "none";
    }
    const developerUnlockMessage = pane.querySelector("[data-roprime-developer-unlock-message]");
    if (developerUnlockMessage instanceof HTMLElement) {
        const showUnlockMessage = pane.getAttribute("data-roprime-developer-unlock-message-visible") === "1";
        developerUnlockMessage.style.display = showUnlockMessage ? "block" : "none";
    }
    pane.querySelectorAll(".roprime-settings-section").forEach((section) => {
        if (!(section instanceof HTMLElement)) return;
        const sectionKey = section.getAttribute("data-roprime-section") || "";
        if (sectionKey === "developer" && !isDeveloperPageUnlocked()) {
            section.hidden = true;
            section.style.display = "none";
            clearSearchHighlights(section);
            return;
        }
        section.hidden = false;
        if (isSearchMode) {
            if (showSearchHint) {
                section.style.display = "none";
                clearSearchHighlights(section);
                return;
            }
            if (!hasSearchTerm) {
          if (sectionKey === "info" || sectionKey === "developer") {
                    section.style.display = "none";
                    clearSearchHighlights(section);
                    return;
                }
                section.querySelectorAll(".roprime-toggle-row, .roprime-setting-card, .roprime-info-card").forEach((item) => {
                    if (!(item instanceof HTMLElement)) return;
                    item.style.display = "";
                    clearSearchHighlights(item);
                });
                section.style.display = sectionKey === searchSourcePage ? "block" : "none";
                return;
            }
        if (sectionKey === "info" || sectionKey === "developer") {
                section.style.display = "none";
                clearSearchHighlights(section);
                return;
            }
            let hasVisibleItems = false;
            section.querySelectorAll(".roprime-toggle-row, .roprime-setting-card, .roprime-info-card").forEach((item) => {
                if (!(item instanceof HTMLElement)) return;
                const itemText = item.textContent || "";
                const isMatch = hasSearchTerm && isSearchMatch(itemText, searchTerm);
                item.style.display = isMatch ? "" : "none";
                if (isMatch) {
                    hasVisibleItems = true;
                    applySearchHighlights(item, searchTerm);
                } else {
                    clearSearchHighlights(item);
                }
            });
            section.style.display = hasVisibleItems ? "block" : "none";
            return;
        }
        section.querySelectorAll(".roprime-toggle-row, .roprime-setting-card").forEach((item) => {
            if (!(item instanceof HTMLElement)) return;
            item.style.display = "";
            clearSearchHighlights(item);
        });
        section.querySelectorAll(".roprime-info-card").forEach((item) => {
            if (!(item instanceof HTMLElement)) return;
            item.style.display = "";
            clearSearchHighlights(item);
        });
        section.style.display = sectionKey === activePage && !(sectionKey === "developer" && !isDeveloperPageUnlocked()) ? "block" : "none";
    });
    const sharedSearchWrap = pane.querySelector("[data-roprime-shared-search-wrap]");
    if (sharedSearchWrap instanceof HTMLElement) {
        sharedSearchWrap.style.display = "";
    }
    if (searchInput instanceof HTMLInputElement && !isSearchMode && searchInput.value) {
        searchInput.value = "";
        pane.querySelectorAll(
            ".roprime-settings-section .roprime-toggle-row, .roprime-settings-section .roprime-setting-card, .roprime-settings-section .roprime-info-card",
        ).forEach((item) => {
            if (!(item instanceof HTMLElement)) return;
            item.style.display = "";
        });
    }
}
