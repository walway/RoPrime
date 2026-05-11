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

/**
 * Rebuilt settings system using the provided screenshot as the template.
 * The CSS in `style.css` already targets these class names and produces the
 * exact layout (hero, sidebar, stacked nav, cards, toggles).
 */

const I18N = {
    en: {
        heroTitle: "RoPrime Settings",
        heroSubtitle: "Make Roblox things feel right again.",
        navDesign: "Design",
        navSettings: "Settings",
        navInfo: "Info",
        navDeveloper: "Developer",
        searchPlaceholder: "Search settings...",
        searchMinLength: "Please type at least 2 characters",
        renameTitle: "Rename Roblox wording",
        renameCommunities: "Communities -> Groups",
        renameExperiences: "Experiences -> Games",
        renameMarketplace: "Marketplace -> Catalog",
        oldNavTitle: "Old Navigation bar",
        oldNavDesc: "In development. Keep disabled unless you are testing it.",
        sidebarTitle: "Sidebar size",
        sidebarDesc: "Drag freely, then release to snap to the nearest mode.",
        sidebarFull: "Full",
        sidebarSmall: "Small",
        sidebarIcon: "Icon only",
        alwaysCloseTitle: "Always show close button",
        alwaysCloseDesc: "Forces Roblox’s sidebar close/menu button to always be visible.",
        friendTitle: "Friend styling reimagined",
        friendDesc: "Restyles the friends carousel with a dark glass card and animated presence ring glow.",
        languageTitle: "Language",
        languageDesc: "Choose your RoPrime language.",
        languageEn: "English",
        languageRu: "Russian",
        infoTitle: "RoPrime",
        infoText:
            "This extension adds an RoPrime settings panel on your Roblox Account page and can rename some modern Roblox wording back to classic terms.",
        devBlockedTitle: "Blocked execution pages",
        devBlockedDesc: "Add one URL fragment or exact page match per line.",
        devBlockedPlaceholder: "/my/account?rovalra=info",
        devBlockedSave: "Save blocked pages",
    },
    ru: {
        heroTitle: "Настройки RoPrime",
        heroSubtitle: "Сделайте Roblox удобнее и привычнее.",
        navDesign: "Дизайн",
        navSettings: "Настройки",
        navInfo: "Инфо",
        navDeveloper: "Developer",
        searchPlaceholder: "Поиск настроек...",
        searchMinLength: "Введите минимум 2 символа",
        renameTitle: "Переименование терминов Roblox",
        renameCommunities: "Communities -> Groups",
        renameExperiences: "Experiences -> Games",
        renameMarketplace: "Marketplace -> Catalog",
        oldNavTitle: "Старая панель навигации",
        oldNavDesc: "В разработке. Включайте только для тестов.",
        sidebarTitle: "Размер боковой панели",
        sidebarDesc: "Перетяните ползунок и отпустите для выбора ближайшего режима.",
        sidebarFull: "Полный",
        sidebarSmall: "Малый",
        sidebarIcon: "Только иконки",
        alwaysCloseTitle: "Всегда показывать кнопку закрытия",
        alwaysCloseDesc: "Всегда показывает кнопку закрытия/меню боковой панели Roblox.",
        friendTitle: "Новый стиль друзей",
        friendDesc: "Обновляет карусель друзей: темная карточка и анимированное свечение статуса.",
        languageTitle: "Язык",
        languageDesc: "Выберите язык RoPrime.",
        languageEn: "Английский",
        languageRu: "Русский",
        infoTitle: "RoPrime",
        infoText:
            "Это расширение добавляет панель настроек RoPrime на страницу аккаунта Roblox и может возвращать классические названия разделов.",
        devBlockedTitle: "Страницы с отключенным выполнением",
        devBlockedDesc: "Добавьте по одной части URL или точному совпадению страницы на строку.",
        devBlockedPlaceholder: "/my/account?rovalra=info",
        devBlockedSave: "Сохранить список страниц",
    },
};

const RP_DEBUG_UNLOCK_VALUE = "debug";

function langKey() {
    return settingsState.language === "ru" ? "ru" : "en";
}

function t(key) {
    return I18N[langKey()][key] ?? I18N.en[key] ?? key;
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

function isDeveloperPageUnlocked(pane) {
    if (settingsState.developerPageUnlocked) return true;
    return pane?.getAttribute("data-roprime-dev-unlocked") === "1";
}

function buildSettingsPaneMarkup() {
    return `
        <div class="${RP_PANEL_CLASS}">
            <div class="roprime-settings-hero">
                <h2 data-roprime-i18n="heroTitle"></h2>
                <p data-roprime-i18n="heroSubtitle"></p>
            </div>

            <div class="roprime-settings-layout">
                <div class="roprime-settings-sidebar">
                    <div class="roprime-settings-search-wrap">
                        <input id="roprime-settings-search" type="search" class="roprime-settings-search" />
                    </div>
                    <div class="roprime-settings-nav" role="tablist" aria-label="RoPrime Settings sections">
                        <button class="roprime-settings-nav-btn" data-roprime-page="design" type="button" data-roprime-i18n="navDesign"></button>
                        <button class="roprime-settings-nav-btn" data-roprime-page="settings" type="button" data-roprime-i18n="navSettings"></button>
                        <button class="roprime-settings-nav-btn" data-roprime-page="info" type="button" data-roprime-i18n="navInfo"></button>
                        <button class="roprime-settings-nav-btn" data-roprime-page="developer" type="button" data-roprime-i18n="navDeveloper"></button>
                    </div>
                </div>

                <div class="roprime-settings-main">
                    <div class="roprime-search-hint" data-roprime-search-hint></div>

                    <section class="roprime-settings-section" data-roprime-section="design">
                        <div class="roprime-setting-card roprime-accordion" data-roprime-accordion="rename">
                            <div class="roprime-accordion-header" role="button" tabindex="0" aria-expanded="false">
                                <div class="roprime-setting-copy">
                                    <div class="roprime-setting-title" data-roprime-i18n="renameTitle"></div>
                                </div>
                                <label class="roprime-switch roprime-accordion-master-switch" for="roprime-toggle-rename-master">
                                    <input id="roprime-toggle-rename-master" type="checkbox" />
                                    <span class="roprime-switch-slider" aria-hidden="true"></span>
                                </label>
                                <span class="roprime-accordion-chevron" aria-hidden="true"></span>
                            </div>
                            <div class="roprime-accordion-body" hidden>
                                <div class="roprime-toggle-row">
                                    <div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-roprime-i18n="renameCommunities"></div></div>
                                    <label class="roprime-switch" for="roprime-toggle-rename-communities"><input id="roprime-toggle-rename-communities" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label>
                                </div>
                                <div class="roprime-toggle-row">
                                    <div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-roprime-i18n="renameExperiences"></div></div>
                                    <label class="roprime-switch" for="roprime-toggle-rename-experiences"><input id="roprime-toggle-rename-experiences" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label>
                                </div>
                                <div class="roprime-toggle-row">
                                    <div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-roprime-i18n="renameMarketplace"></div></div>
                                    <label class="roprime-switch" for="roprime-toggle-rename-marketplace"><input id="roprime-toggle-rename-marketplace" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label>
                                </div>
                            </div>
                        </div>

                        <div class="roprime-toggle-row roprime-setting-card-spaced">
                            <div class="roprime-toggle-copy">
                                <div class="roprime-toggle-title" data-roprime-i18n="oldNavTitle"></div>
                                <div class="roprime-toggle-desc" data-roprime-i18n="oldNavDesc"></div>
                            </div>
                            <label class="roprime-switch" for="roprime-toggle-old-navigation-bar"><input id="roprime-toggle-old-navigation-bar" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label>
                        </div>

                        <div class="roprime-toggle-row roprime-setting-card-spaced roprime-sidebar-size-row">
                            <div class="roprime-toggle-copy">
                                <div class="roprime-toggle-title" data-roprime-i18n="sidebarTitle"></div>
                                <div class="roprime-toggle-desc" data-roprime-i18n="sidebarDesc"></div>
                            </div>
                            <div class="roprime-sidebar-size-control">
                                <div class="roprime-sidebar-size-box">
                                    <div class="roprime-sidebar-size-rail">
                                        <input id="roprime-sidebar-size-slider" class="roprime-sidebar-size-slider" type="range" min="0" max="100" step="0.1" value="0" aria-label="Sidebar size" />
                                    </div>
                                    <div class="roprime-sidebar-size-ticks">
                                        <button class="roprime-sidebar-size-tick" type="button" data-size-mode="full"><span data-roprime-i18n="sidebarFull"></span></button>
                                        <button class="roprime-sidebar-size-tick" type="button" data-size-mode="small"><span data-roprime-i18n="sidebarSmall"></span></button>
                                        <button class="roprime-sidebar-size-tick" type="button" data-size-mode="icon"><span data-roprime-i18n="sidebarIcon"></span></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="roprime-toggle-row roprime-setting-card-spaced">
                            <div class="roprime-toggle-copy">
                                <div class="roprime-toggle-title" data-roprime-i18n="alwaysCloseTitle"></div>
                                <div class="roprime-toggle-desc" data-roprime-i18n="alwaysCloseDesc"></div>
                            </div>
                            <label class="roprime-switch" for="roprime-toggle-always-show-close"><input id="roprime-toggle-always-show-close" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label>
                        </div>

                        <div class="roprime-toggle-row roprime-setting-card-spaced">
                            <div class="roprime-toggle-copy">
                                <div class="roprime-toggle-title" data-roprime-i18n="friendTitle"></div>
                                <div class="roprime-toggle-desc" data-roprime-i18n="friendDesc"></div>
                            </div>
                            <label class="roprime-switch" for="roprime-toggle-friend-styling-reimagned"><input id="roprime-toggle-friend-styling-reimagned" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label>
                        </div>
                    </section>

                    <section class="roprime-settings-section" data-roprime-section="settings">
                        <div class="roprime-setting-card">
                            <div class="roprime-setting-copy">
                                <div class="roprime-setting-title" data-roprime-i18n="languageTitle"></div>
                                <div class="roprime-setting-desc" data-roprime-i18n="languageDesc"></div>
                            </div>
                            <div class="roprime-language-dropdown" data-roprime-language-dropdown>
                                <button type="button" class="roprime-language-trigger"><span data-roprime-lang-current></span><span class="roprime-language-chevron" aria-hidden="true"></span></button>
                                <div class="roprime-language-menu" hidden>
                                    <button type="button" class="roprime-language-option" data-lang="en" data-roprime-i18n="languageEn"></button>
                                    <button type="button" class="roprime-language-option" data-lang="ru" data-roprime-i18n="languageRu"></button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section class="roprime-settings-section" data-roprime-section="info">
                        <div class="roprime-info-card">
                            <div class="roprime-info-title" data-roprime-i18n="infoTitle"></div>
                            <div class="roprime-info-text" data-roprime-i18n="infoText"></div>
                        </div>
                    </section>

                    <section class="roprime-settings-section" data-roprime-section="developer">
                        <div class="roprime-setting-card roprime-setting-card-spaced">
                            <div class="roprime-setting-copy">
                                <div class="roprime-setting-title" data-roprime-i18n="devBlockedTitle"></div>
                                <div class="roprime-setting-desc" data-roprime-i18n="devBlockedDesc"></div>
                            </div>
                            <textarea
                                id="roprime-developer-blocked-pages"
                                class="roprime-settings-search"
                                rows="6"
                                spellcheck="false"
                            ></textarea>
                            <div style="margin-top:12px;">
                                <button type="button" class="btn-secondary-md" id="roprime-save-blocked-pages"></button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>`;
}

function applyTranslations(root) {
    if (!(root instanceof HTMLElement)) return;
    root.querySelectorAll("[data-roprime-i18n]").forEach((el) => {
        const key = el.getAttribute("data-roprime-i18n") || "";
        el.textContent = t(key);
    });
    const search = root.querySelector("#roprime-settings-search");
    if (search instanceof HTMLInputElement) search.placeholder = t("searchPlaceholder");
    const hint = root.querySelector("[data-roprime-search-hint]");
    if (hint instanceof HTMLElement) hint.textContent = t("searchMinLength");

    const current = root.querySelector("[data-roprime-lang-current]");
    if (current instanceof HTMLElement) current.textContent = langKey() === "ru" ? t("languageRu") : t("languageEn");

    const blocked = root.querySelector("#roprime-developer-blocked-pages");
    if (blocked instanceof HTMLTextAreaElement) blocked.placeholder = t("devBlockedPlaceholder");
    const save = root.querySelector("#roprime-save-blocked-pages");
    if (save instanceof HTMLButtonElement) save.textContent = t("devBlockedSave");
}

function ensureStandaloneSettingsView() {
    const accountBase = document.getElementById("react-user-account-base");
    if (!(accountBase instanceof HTMLElement)) return null;
    let standalone = accountBase.querySelector(`#${RP_STANDALONE_ID}`);
    if (!(standalone instanceof HTMLElement)) {
        standalone = document.createElement("div");
        standalone.id = RP_STANDALONE_ID;
        standalone.innerHTML = buildSettingsPaneMarkup();
        accountBase.appendChild(standalone);
    }
    applyTranslations(standalone);
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

function setAccordionOpen(accordion, open) {
    const header = accordion.querySelector(".roprime-accordion-header");
    const body = accordion.querySelector(".roprime-accordion-body");
    if (!(header instanceof HTMLElement)) return;
    if (!(body instanceof HTMLElement)) return;
    accordion.classList.toggle("is-open", open);
    header.setAttribute("aria-expanded", String(open));
    body.hidden = false;
    body.style.maxHeight = open ? `${body.scrollHeight}px` : "0px";
}

export function bindSettingsControls(pane, actions, onNavigate) {
    if (!(pane instanceof HTMLElement)) return;
    if (pane.getAttribute("data-roprime-controls-bound") === "1") return;

    applyTranslations(pane);

    const accordion = pane.querySelector('[data-roprime-accordion="rename"]');
    const accordionHeader = accordion?.querySelector(".roprime-accordion-header");
    const masterToggle = pane.querySelector("#roprime-toggle-rename-master");
    const communitiesToggle = pane.querySelector("#roprime-toggle-rename-communities");
    const experiencesToggle = pane.querySelector("#roprime-toggle-rename-experiences");
    const marketplaceToggle = pane.querySelector("#roprime-toggle-rename-marketplace");

    const oldNavigationBarToggle = pane.querySelector("#roprime-toggle-old-navigation-bar");
    const sidebarSizeSlider = pane.querySelector("#roprime-sidebar-size-slider");
    const alwaysShowCloseToggle = pane.querySelector("#roprime-toggle-always-show-close");
    const friendStylingReimagnedToggle = pane.querySelector("#roprime-toggle-friend-styling-reimagned");

    const blockedPagesTextarea = pane.querySelector("#roprime-developer-blocked-pages");
    const saveBlockedPagesButton = pane.querySelector("#roprime-save-blocked-pages");

    const languageDropdown = pane.querySelector("[data-roprime-language-dropdown]");
    const languageMenu = languageDropdown?.querySelector(".roprime-language-menu");
    const languageTrigger = languageDropdown?.querySelector(".roprime-language-trigger");

    const applyRenameUiState = () => {
        if (masterToggle instanceof HTMLInputElement) masterToggle.checked = !!settingsState.renameDropdownEnabled;
        if (communitiesToggle instanceof HTMLInputElement)
            communitiesToggle.checked = !!settingsState.renameCommunitiesToGroups;
        if (experiencesToggle instanceof HTMLInputElement) experiencesToggle.checked = !!settingsState.renameExperiencesToGames;
        if (marketplaceToggle instanceof HTMLInputElement)
            marketplaceToggle.checked = !!settingsState.renameMarketplaceToAvatarShop;
        if (accordion instanceof HTMLElement) accordion.classList.toggle("is-renames-disabled", !settingsState.renameDropdownEnabled);
    };

    if (accordion instanceof HTMLElement && accordionHeader instanceof HTMLElement) {
        accordionHeader.addEventListener("click", (event) => {
            const target = event.target;
            if (target instanceof Element && target.closest(".roprime-accordion-master-switch")) return;
            setAccordionOpen(accordion, !accordion.classList.contains("is-open"));
        });
        setAccordionOpen(accordion, false);
    }

    if (masterToggle instanceof HTMLInputElement) {
        masterToggle.addEventListener("change", () => {
            const enable = !!masterToggle.checked;
            settingsState.renameDropdownEnabled = enable;
            saveSettings();
            updateRenameLoop();
            applyRenameUiState();

            if (!enable) {
                if (settingsState.renameCommunitiesToGroups) applyGroupsBackRename(document.body);
                if (settingsState.renameExperiencesToGames) applyGamesBackRename(document.body);
                if (settingsState.renameMarketplaceToAvatarShop) applyAvatarShopBackRename(document.body);
                return;
            }
            if (settingsState.renameCommunitiesToGroups) applyCommunityRename(document.body);
            if (settingsState.renameExperiencesToGames) applyExperiencesRename(document.body);
            if (settingsState.renameMarketplaceToAvatarShop) applyMarketplaceRename(document.body);
        });
    }

    const bindRenameToggle = (toggleEl, stateKey, applyFn, rollbackFn) => {
        if (!(toggleEl instanceof HTMLInputElement)) return;
        toggleEl.addEventListener("change", () => {
            if (!settingsState.renameDropdownEnabled) {
                settingsState.renameDropdownEnabled = true;
                if (masterToggle instanceof HTMLInputElement) masterToggle.checked = true;
            }
            const prev = !!settingsState[stateKey];
            settingsState[stateKey] = !!toggleEl.checked;
            saveSettings();
            updateRenameLoop();
            if (settingsState[stateKey]) applyFn(document.body);
            else if (prev) rollbackFn(document.body);
            applyRenameUiState();
        });
    };

    bindRenameToggle(communitiesToggle, "renameCommunitiesToGroups", applyCommunityRename, applyGroupsBackRename);
    bindRenameToggle(experiencesToggle, "renameExperiencesToGames", applyExperiencesRename, applyGamesBackRename);
    bindRenameToggle(marketplaceToggle, "renameMarketplaceToAvatarShop", applyMarketplaceRename, applyAvatarShopBackRename);

    if (oldNavigationBarToggle instanceof HTMLInputElement) {
        oldNavigationBarToggle.checked = !!settingsState.oldNavigationBarEnabled;
        oldNavigationBarToggle.addEventListener("change", () => {
            settingsState.oldNavigationBarEnabled = !!oldNavigationBarToggle.checked;
            saveSettings();
            actions.updateOldNavigationBarVisibility?.();
        });
    }

    if (alwaysShowCloseToggle instanceof HTMLInputElement) {
        alwaysShowCloseToggle.checked = !!settingsState.alwaysShowCloseButtonEnabled;
        alwaysShowCloseToggle.addEventListener("change", () => {
            settingsState.alwaysShowCloseButtonEnabled = !!alwaysShowCloseToggle.checked;
            saveSettings();
            actions.updateAlwaysShowCloseButtonVisibility?.();
        });
    }

    if (friendStylingReimagnedToggle instanceof HTMLInputElement) {
        friendStylingReimagnedToggle.checked = !!settingsState.friendStylingReimagnedEnabled;
        friendStylingReimagnedToggle.addEventListener("change", () => {
            settingsState.friendStylingReimagnedEnabled = !!friendStylingReimagnedToggle.checked;
            saveSettings();
            actions.updateFriendStylingReimagnedVisibility?.();
        });
    }

    if (sidebarSizeSlider instanceof HTMLInputElement) {
        const modeValues = { full: 0, small: 50, icon: 100 };
        const nearestMode = (raw) => {
            const value = Number(raw);
            if (Number.isNaN(value)) return "full";
            if (value < 25) return "full";
            if (value < 75) return "small";
            return "icon";
        };
        const applyMode = (mode) => {
            settingsState.smallNewNavigationBarEnabled = mode === "small";
            settingsState.sidebarIconsOnlyEnabled = mode === "icon";
            saveSettings();
            actions.updateSmallNewNavVisibility?.();
            actions.updateSidebarCompactVisibility?.();
            pane.setAttribute("data-roprime-sidebar-size-mode", mode);
            pane.querySelectorAll(".roprime-sidebar-size-tick").forEach((tick) => {
                if (!(tick instanceof HTMLButtonElement)) return;
                tick.classList.toggle("is-active", tick.dataset.sizeMode === mode);
            });
        };
        const commit = () => {
            const mode = nearestMode(sidebarSizeSlider.value);
            sidebarSizeSlider.value = String(modeValues[mode]);
            applyMode(mode);
        };
        sidebarSizeSlider.addEventListener("input", () => {
            pane.setAttribute("data-roprime-sidebar-size-mode", nearestMode(sidebarSizeSlider.value));
        });
        sidebarSizeSlider.addEventListener("change", commit);
        pane.querySelectorAll(".roprime-sidebar-size-tick").forEach((tick) => {
            if (!(tick instanceof HTMLButtonElement)) return;
            tick.addEventListener("click", () => {
                const mode = tick.dataset.sizeMode || "full";
                sidebarSizeSlider.value = String(modeValues[mode] ?? 0);
                applyMode(mode);
            });
        });
        // initial
        applyMode(settingsState.sidebarIconsOnlyEnabled ? "icon" : settingsState.smallNewNavigationBarEnabled ? "small" : "full");
    }

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
                applyTranslations(pane);
            });
        });
        document.addEventListener("click", (event) => {
            if (!(event.target instanceof Element)) return;
            if (languageDropdown.contains(event.target)) return;
            languageDropdown.classList.remove("is-open");
            languageMenu.hidden = true;
        });
    }

    if (blockedPagesTextarea instanceof HTMLTextAreaElement) {
        blockedPagesTextarea.value = getBlockedExecutionPagesValue();
        blockedPagesTextarea.addEventListener("keydown", (event) => event.stopPropagation());
        blockedPagesTextarea.addEventListener("input", () => {
            if (saveBlockedPagesButton instanceof HTMLButtonElement) saveBlockedPagesButton.disabled = false;
        });
    }
    if (saveBlockedPagesButton instanceof HTMLButtonElement && blockedPagesTextarea instanceof HTMLTextAreaElement) {
        saveBlockedPagesButton.disabled = true;
        saveBlockedPagesButton.addEventListener("click", () => {
            settingsState.blockedExecutionPages = parseBlockedExecutionPages(blockedPagesTextarea.value);
            saveSettings();
            saveBlockedPagesButton.disabled = true;
        });
    }

    // Navigation + search mode.
    const searchInput = pane.querySelector("#roprime-settings-search");
    if (searchInput instanceof HTMLInputElement) {
        searchInput.addEventListener("input", () => {
            const v = searchInput.value.trim().toLowerCase();
            if (v === RP_DEBUG_UNLOCK_VALUE) {
                settingsState.developerPageUnlocked = true;
                saveSettings();
                pane.setAttribute("data-roprime-dev-unlocked", "1");
            }
            void refreshSettingsControls(pane);
        });
        searchInput.addEventListener("focus", () => {
            pane.setAttribute("data-roprime-search-mode", "1");
            void refreshSettingsControls(pane);
        });
    }

    pane.querySelectorAll(".roprime-settings-nav-btn").forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) return;
        button.addEventListener("click", () => {
            const nextPage = button.dataset.roprimePage || RP_DEFAULT_PAGE;
            if (nextPage === "developer" && !isDeveloperPageUnlocked(pane)) return;
            pane.removeAttribute("data-roprime-search-mode");
            const nextUrl = buildPluginUrl(nextPage);
            const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            if (currentUrl !== nextUrl) window.history.pushState({ oldRobloxSettings: true }, "", nextUrl);
            onNavigate?.();
        });
    });

    applyRenameUiState();
    pane.setAttribute("data-roprime-controls-bound", "1");
}

export async function refreshSettingsControls(pane) {
    if (!(pane instanceof HTMLElement)) return;
    applyTranslations(pane);

    const activePage = getCurrentrp() || RP_DEFAULT_PAGE;
    const isSearchMode = pane.getAttribute("data-roprime-search-mode") === "1";

    // nav active
    pane.querySelectorAll(".roprime-settings-nav-btn").forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) return;
        const page = button.dataset.roprimePage || "";
        const active = !isSearchMode && page === activePage;
        button.classList.toggle("is-active", active);
    });

    const searchInput = pane.querySelector("#roprime-settings-search");
    const term = searchInput instanceof HTMLInputElement ? searchInput.value.trim().toLowerCase() : "";
    const hint = pane.querySelector("[data-roprime-search-hint]");
    const showHint = isSearchMode && term.length > 0 && term.length < 2;
    if (hint instanceof HTMLElement) hint.style.display = showHint ? "block" : "none";

    pane.querySelectorAll(".roprime-settings-section").forEach((section) => {
        if (!(section instanceof HTMLElement)) return;
        const key = section.getAttribute("data-roprime-section") || "";
        if (key === "developer" && !isDeveloperPageUnlocked(pane)) {
            section.style.display = "none";
            return;
        }

        if (!isSearchMode) {
            section.style.display = key === activePage ? "block" : "none";
            section.querySelectorAll(".roprime-toggle-row, .roprime-setting-card, .roprime-info-card").forEach((item) => {
                if (!(item instanceof HTMLElement)) return;
                item.style.display = "";
            });
            return;
        }

        if (showHint) {
            section.style.display = "none";
            return;
        }

        if (term.length < 2) {
            section.style.display = key === (activePage || RP_DEFAULT_PAGE) ? "block" : "none";
            return;
        }

        let any = false;
        section.querySelectorAll(".roprime-toggle-row, .roprime-setting-card, .roprime-info-card").forEach((item) => {
            if (!(item instanceof HTMLElement)) return;
            const text = (item.textContent || "").toLowerCase();
            const match = text.includes(term);
            item.style.display = match ? "" : "none";
            if (match) any = true;
        });
        section.style.display = any ? "block" : "none";
    });

    const blocked = pane.querySelector("#roprime-developer-blocked-pages");
    if (blocked instanceof HTMLTextAreaElement) {
        const nextValue = getBlockedExecutionPagesValue();
        if (blocked.value !== nextValue) blocked.value = nextValue;
    }
}

