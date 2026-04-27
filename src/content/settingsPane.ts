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

const FALLBACK_LANGUAGE_KEYS = {
    en: {
        "settings.hero.title": "RoPrime Settings",
        "settings.hero.subtitle": "Make Roblox things feel right again.",
        "settings.nav.design": "Design",
        "settings.nav.settings": "Settings",
        "settings.nav.info": "Info",
        "settings.search.placeholder": "Search settings...",
        "settings.rename.title": "Rename Roblox wording",
        "settings.rename.communities": "Communities -> Groups",
        "settings.rename.experiences": "Experiences -> Games",
        "settings.rename.marketplace": "Marketplace -> Avatar Shop",
        "settings.oldNav.title": "Old Navigation bar",
        "settings.oldNav.desc": "In development. Keep disabled unless you are testing it.",
        "settings.sidebar.title": "Sidebar size",
        "settings.sidebar.desc": "Drag freely, then release to snap to the nearest mode.",
        "settings.sidebar.full": "Full",
        "settings.sidebar.small": "Small",
        "settings.sidebar.icon": "Icon only",
        "settings.friend.title": "Friend styling reimagined",
        "settings.friend.desc": "Restyles the friends carousel with a dark glass card and animated presence ring glow.",
        "settings.language.title": "Language",
        "settings.language.desc": "Choose your RoPrime language.",
        "settings.language.en": "English",
        "settings.language.ru": "Russian",
        "settings.info.title": "RoPrime",
        "settings.info.text":
            "This extension adds an RoPrime settings panel on your Roblox Account page and can rename some modern Roblox wording back to classic terms.",
    },
    ru: {
        "settings.hero.title": "Настройки RoPrime",
        "settings.hero.subtitle": "Сделайте Roblox удобнее и привычнее.",
        "settings.nav.design": "Дизайн",
        "settings.nav.settings": "Настройки",
        "settings.nav.info": "Инфо",
        "settings.search.placeholder": "Поиск настроек...",
        "settings.rename.title": "Переименование терминов Roblox",
        "settings.rename.communities": "Communities -> Groups",
        "settings.rename.experiences": "Experiences -> Games",
        "settings.rename.marketplace": "Marketplace -> Avatar Shop",
        "settings.oldNav.title": "Старая панель навигации",
        "settings.oldNav.desc": "В разработке. Включайте только для тестов.",
        "settings.sidebar.title": "Размер боковой панели",
        "settings.sidebar.desc": "Перетяните ползунок и отпустите для выбора ближайшего режима.",
        "settings.sidebar.full": "Полный",
        "settings.sidebar.small": "Малый",
        "settings.sidebar.icon": "Только иконки",
        "settings.friend.title": "Новый стиль друзей",
        "settings.friend.desc": "Обновляет карусель друзей: темная карточка и анимированное свечение статуса.",
        "settings.language.title": "Язык",
        "settings.language.desc": "Выберите язык RoPrime.",
        "settings.language.en": "Английский",
        "settings.language.ru": "Русский",
        "settings.info.title": "RoPrime",
        "settings.info.text":
            "Это расширение добавляет панель настроек RoPrime на страницу аккаунта Roblox и может возвращать классические названия разделов.",
    },
};

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
                <div class="roprime-settings-nav" role="tablist" aria-label="RoPrime Settings sections">
                    <button class="roprime-settings-nav-btn" data-roprime-page="design" type="button" data-i18n="settings.nav.design"></button>
                    <button class="roprime-settings-nav-btn" data-roprime-page="settings" type="button" data-i18n="settings.nav.settings"></button>
                    <button class="roprime-settings-nav-btn" data-roprime-page="info" type="button" data-i18n="settings.nav.info"></button>
                </div>
                <div class="roprime-settings-main">
                    <section class="roprime-settings-section" data-roprime-section="design">
                        <div class="roprime-settings-search-wrap"><input id="roprime-settings-search" type="search" class="roprime-settings-search" data-i18n-placeholder="settings.search.placeholder" /></div>
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
                        <div class="roprime-toggle-row roprime-setting-card-spaced roprime-sidebar-size-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="settings.sidebar.title"></div><div class="roprime-toggle-desc" data-i18n="settings.sidebar.desc"></div></div><div class="roprime-sidebar-size-control"><div class="roprime-sidebar-size-rail"><input id="roprime-sidebar-size-slider" class="roprime-sidebar-size-slider" type="range" min="0" max="100" step="0.1" value="0" aria-label="Sidebar size" /><div class="roprime-sidebar-size-ticks"><button class="roprime-sidebar-size-tick" type="button" data-size-mode="full"><span data-i18n="settings.sidebar.full"></span></button><button class="roprime-sidebar-size-tick" type="button" data-size-mode="small"><span data-i18n="settings.sidebar.small"></span></button><button class="roprime-sidebar-size-tick" type="button" data-size-mode="icon"><span data-i18n="settings.sidebar.icon"></span></button></div></div></div></div>
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
        if (
            legacyDescription ||
            missingSidebarSizeSlider ||
            missingOldNavigationBarToggle ||
            missingFriendStylingReimagnedToggle
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
    const friendStylingReimagnedToggle = pane.querySelector("#roprime-toggle-friend-styling-reimagned");
    const searchInput = pane.querySelector("#roprime-settings-search");
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

        sidebarSizeSlider.addEventListener("input", () => {
            const mode = nearestModeForValue(sidebarSizeSlider.value);
            pane.setAttribute("data-roprime-sidebar-size-mode", mode);
            pane.querySelectorAll(".roprime-sidebar-size-tick").forEach((tick) => {
                if (!(tick instanceof HTMLButtonElement)) return;
                tick.classList.toggle("is-active", tick.dataset.sizeMode === mode);
            });
        });

        const commitNearestMode = () => {
            const mode = nearestModeForValue(sidebarSizeSlider.value);
            sidebarSizeSlider.value = String(modeValues[mode]);
            applySidebarMode(mode);
        };
        sidebarSizeSlider.addEventListener("change", commitNearestMode);
        sidebarSizeSlider.addEventListener("pointerup", commitNearestMode);
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
                applySidebarMode(mode);
            });
        });
    }
    if (searchInput instanceof HTMLInputElement) {
        searchInput.addEventListener("input", () => {
            const term = searchInput.value.trim().toLowerCase();
            const designSection = pane.querySelector('[data-roprime-section="design"]');
            if (!(designSection instanceof HTMLElement)) return;
            designSection.querySelectorAll(".roprime-toggle-row, .roprime-setting-card").forEach((item) => {
                if (!(item instanceof HTMLElement)) return;
                if (item.getAttribute("data-roprime-accordion") === "rename" && !term) {
                    item.style.display = "";
                    return;
                }
                item.style.display = !term || item.textContent?.toLowerCase().includes(term) ? "" : "none";
            });
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
    const sidebarSizeSlider = pane.querySelector("#roprime-sidebar-size-slider");
    const friendStylingReimagnedToggle = pane.querySelector("#roprime-toggle-friend-styling-reimagned");
    if (masterToggle instanceof HTMLInputElement) masterToggle.checked = !!settingsState.renameDropdownEnabled;
    if (communitiesToggle instanceof HTMLInputElement) communitiesToggle.checked = !!settingsState.renameCommunitiesToGroups;
    if (experiencesToggle instanceof HTMLInputElement) experiencesToggle.checked = !!settingsState.renameExperiencesToGames;
    if (marketplaceToggle instanceof HTMLInputElement)
        marketplaceToggle.checked = !!settingsState.renameMarketplaceToAvatarShop;
    if (oldNavigationBarToggle instanceof HTMLInputElement) oldNavigationBarToggle.checked = !!settingsState.oldNavigationBarEnabled;
    const sidebarSizeMode = settingsState.sidebarIconsOnlyEnabled
        ? "icon"
        : settingsState.smallNewNavigationBarEnabled
          ? "small"
          : "full";
    if (sidebarSizeSlider instanceof HTMLInputElement) {
        const valueByMode = { full: "0", small: "50", icon: "100" };
        sidebarSizeSlider.value = valueByMode[sidebarSizeMode];
    }
    pane.setAttribute("data-roprime-sidebar-size-mode", sidebarSizeMode);
    pane.querySelectorAll(".roprime-sidebar-size-tick").forEach((tick) => {
        if (!(tick instanceof HTMLButtonElement)) return;
        tick.classList.toggle("is-active", tick.dataset.sizeMode === sidebarSizeMode);
    });
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
    applyPaneTranslations(pane);
}
