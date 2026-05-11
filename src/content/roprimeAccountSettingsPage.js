import { isAccountPage, loadSettings, saveSettings, settingsState } from "./core.js";
import { langList, defaultLang } from "../../.locales/lang-config.js";

const ROUTE_KEY = "roprime";
const DEFAULT_TAB = "design";
const SUPPORTED_TABS = new Set(["design", "other", "settings", "info", "developer"]);

const IDS = {
    root: "roprime-settings-page-root",
    pane: "roprime-settings-pane",
};

function getTabFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const t = (params.get(ROUTE_KEY) || "").toLowerCase();
    return SUPPORTED_TABS.has(t) ? t : DEFAULT_TAB;
}

function isRoPrimeSettingsRoute() {
    if (!isAccountPage()) return false;
    const params = new URLSearchParams(window.location.search);
    return params.has(ROUTE_KEY);
}

function setUrlTab(tab) {
    const next = SUPPORTED_TABS.has(tab) ? tab : DEFAULT_TAB;
    const url = new URL(window.location.href);
    url.searchParams.set(ROUTE_KEY, next);
    history.pushState({ roprime: next }, "", url.pathname + url.search + url.hash);
}

let prevMainHTML = null;
let mounted = false;

// No hardcoded translation strings in JS.

const LOCALE_PHRASE_KEY_BY_I18N = {
    "settings.hero.title": "RoPrime Settings",
    "settings.hero.subtitle": "Hero subtitle",
    "settings.nav.design": "Design",
    "settings.nav.other": "Features",
    "settings.nav.settings": "Settings",
    "settings.nav.info": "Info",
    "settings.search.placeholder": "Search settings",
    "settings.rename.title": "Rename Roblox wording",
    "settings.rename.communities": "Communities -> Groups",
    "settings.rename.experiences": "Experiences -> Games",
    "settings.rename.marketplace": "Marketplace -> Catalog",
    "settings.oldNav.title": "Old Navigation bar",
    "settings.oldNav.desc": "Old Navigation bar description",
    "settings.sidebar.title": "Sidebar size",
    "settings.sidebar.desc": "Sidebar size description",
    "settings.sidebar.full": "Full",
    "settings.sidebar.small": "Small",
    "settings.sidebar.icon": "Icon only",
    "settings.sidebar.alwaysClose.title": "Always show close button",
    "settings.sidebar.alwaysClose.desc": "Always show close button description",
    "settings.friend.title": "Friend styling reimagined",
    "settings.friend.desc": "Friend styling description",
    "settings.language.title": "Language",
    "settings.language.desc": "Language description",
    "settings.info.text": "RoPrime info text",
    "settings.nav.developer": "Developer",
    "settings.search.developerLocked": "Developer page unlocked notification",
    "settings.developer.title": "Developer tools title",
    "settings.developer.desc": "Developer tools description",
    "settings.plugins.toggle.title": "Enable control panel for plugins",
    "settings.plugins.toggle.desc": "Enable plugins control panel description",
    "settings.beta": "BETA",
};

let localeCache = null; // { en: {...}, ru: {...}, bn: {...} }
let localePromise = null;

async function ensureLocaleCache() {
    if (localeCache) return localeCache;
    if (localePromise) return localePromise;
    localePromise = (async () => {
        const next = {};
        const loadOne = async (lang) => {
            try {
                if (typeof chrome === "undefined" || typeof chrome.runtime?.getURL !== "function") return null;
                const url = chrome.runtime.getURL(`.locales/${lang}/translation-keys.json`);
                const res = await fetch(url, { cache: "no-store" });
                if (!res.ok) return null;
                const json = await res.json();
                if (!json || typeof json !== "object") return null;
                return json;
            } catch {
                return null;
            }
        };
        next.en = (await loadOne("en")) || null;
        next.ru = (await loadOne("ru")) || null;
        next.bn = (await loadOne("bn")) || null;
        localeCache = next;
        return localeCache;
    })();
    return localePromise;
}

function getLanguageCode() {
    const lc = String(settingsState.language || "en").toLowerCase();
    if (lc === "ru") return "ru";
    if (lc === "bn") return "bn";
    return "en";
}

function t(key) {
    const lang = getLanguageCode();
    const phraseKey = LOCALE_PHRASE_KEY_BY_I18N[key];
    const localeDict = localeCache?.[lang];
    if (phraseKey && localeDict && typeof localeDict[phraseKey] === "string") {
        return localeDict[phraseKey];
    }
    return phraseKey || key;
}

function applyPaneTranslations(pane) {
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
    if (current instanceof HTMLElement) {
        const code = getLanguageCode();
        current.textContent = langList?.[code] || langList?.[defaultLang] || code;
    }

    pane.querySelectorAll(".roprime-language-option[data-lang]").forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        const code = String(el.getAttribute("data-lang") || "").toLowerCase();
        if (!code) return;
        el.textContent = langList?.[code] || code;
    });
}

function buildPaneMarkup() {
    return `
      <div class="roprime-settings-wrapper">
        <div class="roprime-settings-hero">
          <h2 data-i18n="settings.hero.title"></h2>
          <p data-i18n="settings.hero.subtitle"></p>
        </div>
        <div class="roprime-settings-layout">
          <div class="roprime-settings-sidebar">
            <div class="roprime-settings-search-wrap" data-roprime-shared-search-wrap>
              <input id="roprime-settings-search" type="search" class="roprime-settings-search" data-i18n-placeholder="settings.search.placeholder" />
            </div>
            <div class="roprime-settings-nav" role="tablist" aria-label="RoPrime Settings sections">
              <button class="roprime-settings-nav-btn" data-roprime-page="design" type="button" data-i18n="settings.nav.design"></button>
              <button class="roprime-settings-nav-btn" data-roprime-page="other" type="button"><span data-i18n="settings.nav.other"></span><span class="roprime-beta-badge" data-i18n="settings.beta"></span></button>
              <button class="roprime-settings-nav-btn" data-roprime-page="settings" type="button" data-i18n="settings.nav.settings"></button>
              <button class="roprime-settings-nav-btn" data-roprime-page="info" type="button" data-i18n="settings.nav.info"></button>
              <button class="roprime-settings-nav-btn" data-roprime-page="developer" type="button" data-i18n="settings.nav.developer" hidden></button>
            </div>
          </div>
          <div class="roprime-settings-main">
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
              <div class="roprime-toggle-row roprime-setting-card-spaced"><div class="roprime-toggle-copy"><div class="roprime-toggle-title"><span data-i18n="settings.oldNav.title"></span><span class="roprime-beta-badge" data-i18n="settings.beta"></span></div><div class="roprime-toggle-desc" data-i18n="settings.oldNav.desc"></div></div><label class="roprime-switch" for="roprime-toggle-old-navigation-bar"><input id="roprime-toggle-old-navigation-bar" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
              <div class="roprime-toggle-row roprime-setting-card-spaced roprime-sidebar-size-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="settings.sidebar.title"></div><div class="roprime-toggle-desc" data-i18n="settings.sidebar.desc"></div></div><div class="roprime-sidebar-size-control"><div class="roprime-sidebar-size-box"><div class="roprime-sidebar-size-rail"><input id="roprime-sidebar-size-slider" class="roprime-sidebar-size-slider" type="range" min="0" max="100" step="0.1" value="0" aria-label="Sidebar size" /></div><div class="roprime-sidebar-size-ticks"><button class="roprime-sidebar-size-tick" type="button" data-size-mode="full"><span data-i18n="settings.sidebar.full"></span></button><button class="roprime-sidebar-size-tick" type="button" data-size-mode="small"><span data-i18n="settings.sidebar.small"></span></button><button class="roprime-sidebar-size-tick" type="button" data-size-mode="icon"><span data-i18n="settings.sidebar.icon"></span></button></div></div></div></div>
              <div class="roprime-toggle-row roprime-setting-card-spaced"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="settings.sidebar.alwaysClose.title"></div><div class="roprime-toggle-desc" data-i18n="settings.sidebar.alwaysClose.desc"></div></div><label class="roprime-switch" for="roprime-toggle-always-show-close"><input id="roprime-toggle-always-show-close" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
              <div class="roprime-toggle-row roprime-setting-card-spaced"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="settings.friend.title"></div><div class="roprime-toggle-desc" data-i18n="settings.friend.desc"></div></div><label class="roprime-switch" for="roprime-toggle-friend-styling-reimagned"><input id="roprime-toggle-friend-styling-reimagned" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
            </section>
            <section class="roprime-settings-section" data-roprime-section="other">
              <div class="roprime-toggle-row roprime-setting-card-spaced">
                <div class="roprime-toggle-copy">
                  <div class="roprime-toggle-title">
                    <span data-i18n="settings.plugins.toggle.title"></span>
                    <span class="roprime-beta-badge" data-i18n="settings.beta"></span>
                  </div>
                  <div class="roprime-toggle-desc" data-i18n="settings.plugins.toggle.desc"></div>
                </div>
                <label class="roprime-switch" for="roprime-toggle-plugin-control-panel">
                  <input id="roprime-toggle-plugin-control-panel" type="checkbox" />
                  <span class="roprime-switch-slider" aria-hidden="true"></span>
                </label>
              </div>
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
                    <button type="button" class="roprime-language-option" data-lang="bn" data-i18n="settings.language.bn"></button>
                  </div>
                </div>
              </div>
            </section>
            <section class="roprime-settings-section" data-roprime-section="info">
              <div class="roprime-info-card">
                <div class="roprime-info-title" data-i18n="settings.info.title"></div>
                <div class="roprime-info-text" data-i18n="settings.info.text"></div>
              </div>
            </section>
            <section class="roprime-settings-section" data-roprime-section="developer" hidden>
              <div class="roprime-setting-card">
                <div class="roprime-setting-copy">
                  <div class="roprime-setting-title" data-i18n="settings.developer.title"></div>
                  <div class="roprime-setting-desc" data-i18n="settings.developer.desc"></div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    `.trim();
}

function ensureSkeleton() {
    const containerMain = document.querySelector("main.container-main");
    if (!(containerMain instanceof HTMLElement)) return null;

    const existing = document.getElementById(IDS.root);
    if (existing instanceof HTMLElement) return existing;

    if (prevMainHTML === null) {
        prevMainHTML = containerMain.innerHTML;
    }

    // Preserve theme wrapper if present.
    const roproThemeFrame = containerMain.querySelector("#roproThemeFrame");
    const preserved = roproThemeFrame instanceof HTMLElement ? roproThemeFrame.outerHTML : "";
    containerMain.innerHTML = preserved;

    const root = document.createElement("div");
    root.id = IDS.root;
    root.innerHTML = `<div id="${IDS.pane}">${buildPaneMarkup()}</div>`;
    containerMain.appendChild(root);
    return root;
}

function bindControls(root) {
    const pane = root.querySelector(`#${IDS.pane} .roprime-settings-wrapper`);
    if (!(pane instanceof HTMLElement)) return;
    if (pane.getAttribute("data-roprime-controls-bound") === "1") return;

    const accordion = pane.querySelector('[data-roprime-accordion="rename"]');
    const accordionHeader = accordion?.querySelector(".roprime-accordion-header");
    const accordionBody = accordion?.querySelector(".roprime-accordion-body");
    const masterToggle = pane.querySelector("#roprime-toggle-rename-master");
    const communitiesToggle = pane.querySelector("#roprime-toggle-rename-communities");
    const experiencesToggle = pane.querySelector("#roprime-toggle-rename-experiences");
    const marketplaceToggle = pane.querySelector("#roprime-toggle-rename-marketplace");
    const oldNavToggle = pane.querySelector("#roprime-toggle-old-navigation-bar");
    const alwaysCloseToggle = pane.querySelector("#roprime-toggle-always-show-close");
    const friendToggle = pane.querySelector("#roprime-toggle-friend-styling-reimagned");
    const sidebarSlider = pane.querySelector("#roprime-sidebar-size-slider");
    const pluginPanelToggle = pane.querySelector("#roprime-toggle-plugin-control-panel");

    const syncAccordionA11y = () => {
        if (!(accordion instanceof HTMLElement) || !(accordionHeader instanceof HTMLElement) || !(accordionBody instanceof HTMLElement)) return;
        const isOpen = accordion.classList.contains("is-open");
        accordionHeader.setAttribute("aria-expanded", String(isOpen));
        accordionBody.setAttribute("aria-hidden", String(!isOpen));
    };

    const animateAccordion = (open) => {
        if (!(accordion instanceof HTMLElement) || !(accordionBody instanceof HTMLElement)) return;
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

    if (accordionHeader instanceof HTMLElement) {
        accordionHeader.addEventListener("click", (event) => {
            const target = event.target;
            if (target instanceof Element && target.closest(".roprime-accordion-master-switch")) return;
            animateAccordion(!(accordion instanceof HTMLElement && accordion.classList.contains("is-open")));
        });
        accordionHeader.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            const target = event.target;
            if (target instanceof Element && target.closest(".roprime-accordion-master-switch")) return;
            event.preventDefault();
            animateAccordion(!(accordion instanceof HTMLElement && accordion.classList.contains("is-open")));
        });
    }

    const applyRenameUiEnabledState = () => {
        if (!(accordion instanceof HTMLElement)) return;
        const enabled = !!settingsState.renameDropdownEnabled;
        if (masterToggle instanceof HTMLInputElement) masterToggle.checked = enabled;
        if (communitiesToggle instanceof HTMLInputElement) communitiesToggle.checked = !!settingsState.renameCommunitiesToGroups;
        if (experiencesToggle instanceof HTMLInputElement) experiencesToggle.checked = !!settingsState.renameExperiencesToGames;
        if (marketplaceToggle instanceof HTMLInputElement) marketplaceToggle.checked = !!settingsState.renameMarketplaceToAvatarShop;
        accordion.classList.toggle("is-renames-disabled", !enabled);
    };

    if (masterToggle instanceof HTMLInputElement) {
        masterToggle.addEventListener("change", () => {
            settingsState.renameDropdownEnabled = !!masterToggle.checked;
            saveSettings();
            applyRenameUiEnabledState();
        });
    }
    if (communitiesToggle instanceof HTMLInputElement) {
        communitiesToggle.addEventListener("change", () => {
            settingsState.renameCommunitiesToGroups = !!communitiesToggle.checked;
            saveSettings();
            applyRenameUiEnabledState();
        });
    }
    if (experiencesToggle instanceof HTMLInputElement) {
        experiencesToggle.addEventListener("change", () => {
            settingsState.renameExperiencesToGames = !!experiencesToggle.checked;
            saveSettings();
            applyRenameUiEnabledState();
        });
    }
    if (marketplaceToggle instanceof HTMLInputElement) {
        marketplaceToggle.addEventListener("change", () => {
            settingsState.renameMarketplaceToAvatarShop = !!marketplaceToggle.checked;
            saveSettings();
            applyRenameUiEnabledState();
        });
    }
    if (oldNavToggle instanceof HTMLInputElement) {
        oldNavToggle.addEventListener("change", () => {
            settingsState.oldNavigationBarEnabled = !!oldNavToggle.checked;
            saveSettings();
        });
    }
    if (alwaysCloseToggle instanceof HTMLInputElement) {
        alwaysCloseToggle.addEventListener("change", () => {
            settingsState.alwaysShowCloseButtonEnabled = !!alwaysCloseToggle.checked;
            saveSettings();
        });
    }
    if (friendToggle instanceof HTMLInputElement) {
        friendToggle.addEventListener("change", () => {
            settingsState.friendStylingReimagnedEnabled = !!friendToggle.checked;
            saveSettings();
        });
    }

    if (pluginPanelToggle instanceof HTMLInputElement) {
        pluginPanelToggle.addEventListener("change", () => {
            settingsState.enablePluginControlPanel = !!pluginPanelToggle.checked;
            saveSettings();
        });
    }

    if (sidebarSlider instanceof HTMLInputElement) {
        const modeValues = { full: 0, small: 50, icon: 100 };
        const nearestModeForValue = (raw) => {
            const value = Number(raw);
            if (Number.isNaN(value)) return "full";
            if (value < 25) return "full";
            if (value < 75) return "small";
            return "icon";
        };
        const applySidebarMode = (mode) => {
            settingsState.sidebarSize = mode;
            settingsState.sidebarIconsOnlyEnabled = mode === "icon";
            settingsState.smallNewNavigationBarEnabled = mode === "small";
            saveSettings();
            pane.setAttribute("data-roprime-sidebar-size-mode", mode);
            pane.querySelectorAll(".roprime-sidebar-size-tick").forEach((tick) => {
                if (!(tick instanceof HTMLButtonElement)) return;
                tick.classList.toggle("is-active", tick.dataset.sizeMode === mode);
            });
        };
        const commitNearestMode = () => {
            const mode = nearestModeForValue(sidebarSlider.value);
            sidebarSlider.value = String(modeValues[mode]);
            applySidebarMode(mode);
            sidebarSlider.removeAttribute("data-roprime-dragging");
        };
        sidebarSlider.addEventListener("input", () => {
            sidebarSlider.setAttribute("data-roprime-dragging", "1");
            const mode = nearestModeForValue(sidebarSlider.value);
            pane.setAttribute("data-roprime-sidebar-size-mode", mode);
        });
        sidebarSlider.addEventListener("change", commitNearestMode);
        sidebarSlider.addEventListener("pointerup", commitNearestMode);

        pane.querySelectorAll(".roprime-sidebar-size-tick").forEach((tick) => {
            if (!(tick instanceof HTMLButtonElement)) return;
            tick.addEventListener("click", () => {
                const mode = tick.dataset.sizeMode || "full";
                sidebarSlider.value = String(modeValues[mode] ?? 0);
                applySidebarMode(mode);
            });
        });
    }

    const navButtons = pane.querySelectorAll(".roprime-settings-nav-btn");
    navButtons.forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) return;
        button.addEventListener("click", () => {
            const next = button.dataset.roprimePage || DEFAULT_TAB;
            if (next === "developer" && !settingsState.developerPageUnlocked) return;
            setUrlTab(next);
            refreshUi(root);
        });
    });

    const languageDropdown = pane.querySelector("[data-roprime-language-dropdown]");
    const languageMenu = languageDropdown?.querySelector(".roprime-language-menu");
    const languageTrigger = languageDropdown?.querySelector(".roprime-language-trigger");
    if (languageDropdown instanceof HTMLElement && languageMenu instanceof HTMLElement && languageTrigger instanceof HTMLButtonElement) {
        languageTrigger.addEventListener("click", () => {
            const next = !languageDropdown.classList.contains("is-open");
            languageDropdown.classList.toggle("is-open", next);
            languageMenu.hidden = !next;
        });
        languageMenu.querySelectorAll(".roprime-language-option").forEach((option) => {
            if (!(option instanceof HTMLButtonElement)) return;
            option.addEventListener("click", () => {
                const next = option.dataset.lang === "ru" ? "ru" : option.dataset.lang === "bn" ? "bn" : "en";
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

    // init accordion body for animation
    if (accordionBody instanceof HTMLElement) {
        accordionBody.hidden = false;
        accordionBody.style.maxHeight = accordion instanceof HTMLElement && accordion.classList.contains("is-open") ? `${accordionBody.scrollHeight}px` : "0px";
        syncAccordionA11y();
    }

    // Debug unlock via search field (type "debug")
    const searchInput = pane.querySelector("#roprime-settings-search");
    if (searchInput instanceof HTMLInputElement) {
        searchInput.addEventListener("input", () => {
            if (searchInput.value.trim().toLowerCase() !== "debug") return;
            if (settingsState.developerPageUnlocked) return;
            settingsState.developerPageUnlocked = true;
            saveSettings();
            pane.setAttribute("data-roprime-developer-unlock-message-visible", "1");
            refreshUi(root);
        });
    }

    pane.setAttribute("data-roprime-controls-bound", "1");
}

function refreshUi(root) {
    const pane = root.querySelector(`#${IDS.pane} .roprime-settings-wrapper`);
    if (!(pane instanceof HTMLElement)) return;

    applyPaneTranslations(pane);

    const activePage = getTabFromUrl();
    root.setAttribute("data-rp-last-tab", activePage);
    pane.querySelectorAll(".roprime-settings-nav-btn").forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) return;
        if (button.dataset.roprimePage === "developer") {
            button.hidden = !settingsState.developerPageUnlocked;
        }
        button.classList.toggle("is-active", button.dataset.roprimePage === activePage);
    });
    pane.querySelectorAll(".roprime-settings-section").forEach((section) => {
        if (!(section instanceof HTMLElement)) return;
        const key = section.getAttribute("data-roprime-section") || "";
        if (key === "developer" && !settingsState.developerPageUnlocked) {
            section.hidden = true;
            section.style.display = "none";
            return;
        }
        section.hidden = false;
        section.style.display = key === activePage ? "block" : "none";
    });

    const unlockMessage = pane.querySelector("[data-roprime-developer-unlock-message]");
    if (unlockMessage instanceof HTMLElement) {
        const visible = pane.getAttribute("data-roprime-developer-unlock-message-visible") === "1";
        unlockMessage.style.display = visible ? "block" : "none";
    }

    const masterToggle = pane.querySelector("#roprime-toggle-rename-master");
    const communitiesToggle = pane.querySelector("#roprime-toggle-rename-communities");
    const experiencesToggle = pane.querySelector("#roprime-toggle-rename-experiences");
    const marketplaceToggle = pane.querySelector("#roprime-toggle-rename-marketplace");
    const oldNavToggle = pane.querySelector("#roprime-toggle-old-navigation-bar");
    const alwaysCloseToggle = pane.querySelector("#roprime-toggle-always-show-close");
    const friendToggle = pane.querySelector("#roprime-toggle-friend-styling-reimagned");
    const pluginPanelToggle = pane.querySelector("#roprime-toggle-plugin-control-panel");
    if (masterToggle instanceof HTMLInputElement) masterToggle.checked = !!settingsState.renameDropdownEnabled;
    if (communitiesToggle instanceof HTMLInputElement) communitiesToggle.checked = !!settingsState.renameCommunitiesToGroups;
    if (experiencesToggle instanceof HTMLInputElement) experiencesToggle.checked = !!settingsState.renameExperiencesToGames;
    if (marketplaceToggle instanceof HTMLInputElement) marketplaceToggle.checked = !!settingsState.renameMarketplaceToAvatarShop;
    if (oldNavToggle instanceof HTMLInputElement) oldNavToggle.checked = !!settingsState.oldNavigationBarEnabled;
    if (alwaysCloseToggle instanceof HTMLInputElement) alwaysCloseToggle.checked = !!settingsState.alwaysShowCloseButtonEnabled;
    if (friendToggle instanceof HTMLInputElement) friendToggle.checked = !!settingsState.friendStylingReimagnedEnabled;
    if (pluginPanelToggle instanceof HTMLInputElement) pluginPanelToggle.checked = !!settingsState.enablePluginControlPanel;

    const sidebarSizeMode = settingsState.sidebarSize || (settingsState.sidebarIconsOnlyEnabled ? "icon" : "full");
    pane.setAttribute("data-roprime-sidebar-size-mode", sidebarSizeMode);
    const sidebarSlider = pane.querySelector("#roprime-sidebar-size-slider");
    if (sidebarSlider instanceof HTMLInputElement) {
        const valueByMode = { full: "0", small: "50", icon: "100" };
        if (sidebarSlider.getAttribute("data-roprime-dragging") !== "1") {
            sidebarSlider.value = valueByMode[sidebarSizeMode] || "0";
        }
    }
    pane.querySelectorAll(".roprime-sidebar-size-tick").forEach((tick) => {
        if (!(tick instanceof HTMLButtonElement)) return;
        tick.classList.toggle("is-active", tick.dataset.sizeMode === sidebarSizeMode);
    });

}

let bound = false;
function unmountIfNeeded() {
    if (!mounted) return;
    const containerMain = document.querySelector("main.container-main");
    if (!(containerMain instanceof HTMLElement)) return;
    if (prevMainHTML !== null) {
        containerMain.innerHTML = prevMainHTML;
    }
    mounted = false;
}

async function mountIfNeeded() {
    if (!isRoPrimeSettingsRoute()) {
        unmountIfNeeded();
        return;
    }
    const root = ensureSkeleton();
    if (!root) return;
    if (!mounted) {
        mounted = true;
        await loadSettings().catch(() => {});
        await ensureLocaleCache().catch(() => {});
        bindControls(root);
        refreshUi(root);
        return;
    }
    // Already mounted: only rerender if tab changed
    const currentTab = getTabFromUrl();
    const last = root.getAttribute("data-rp-last-tab");
    if (last !== currentTab) {
        root.setAttribute("data-rp-last-tab", currentTab);
        refreshUi(root);
    }
}

export function initRoPrimeAccountSettingsPage() {
    if (bound) return;
    bound = true;

    const handler = () => {
        mountIfNeeded().catch(() => {});
    };

    window.addEventListener("popstate", handler);
    window.addEventListener("hashchange", handler);
    window.addEventListener("roprime-location-change", handler);

    // initial
    handler();
}

