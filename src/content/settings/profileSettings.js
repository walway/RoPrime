import { langList } from "../../../.locales/lang-config.js";
import { syncAccountSettingsMenuButton } from "../account/accountSettingsLink.js";
import {
	buildPluginUrl,
	getCurrentrp,
	isMyAccountPath,
	isPluginRoute,
	RP_DEFAULT_PAGE,
	RP_PROFILE_SETTINGS_ROOT_ID,
	reloadSettingsUiStrings,
	saveSettings,
	setAccountSettingsShellClass,
	settingsState,
	shouldRunRoPrimeOnCurrentPage,
} from "../core/core.js";
import { updateRenameLoop } from "../features/rename.js";
import {
	updateAccountHeader,
	updateDocumentTitle,
} from "../panel/pageChrome.js";
import { syncRoEliteView } from "../panel/panel.js";
import { syncSidebarContent } from "../sidebar/sidebarContent.js";
import {
	bindSidebarContentList,
	buildSidebarSizeControlHtml,
	refreshSidebarContentList,
} from "../sidebar/sidebarSettingsUi.js";
import {
	bindCustomCssControls,
	buildCustomCssHtml,
	syncCustomCssUi,
} from "./customCss.js";
import {
	bindCosmeticsControls,
	buildCosmeticsShopHtml,
	resizeCosmeticsPreviews,
	syncCosmeticsUi,
} from "./other.js";
import { t as accountSettingsPaneT } from "./roprimeAccountSettingsPage.js";
import { buildSettingsShell, wrapSettingsSection } from "./settingsShell.js";

const RP_DEBUG_UNLOCK = "debug";
const RP_SETTINGS_SIDE_RAIL_HIDDEN_CLASS = "roprime-settings-side-rail-hidden";

/** Roblox account secondary rail: flex width-[289px] height-full scroll-y */
function isRobloxAccountSideRail(el) {
	if (!(el instanceof HTMLElement)) return false;
	const cls = typeof el.className === "string" ? el.className : "";
	return (
		cls.includes("width-[289px]") &&
		cls.includes("height-full") &&
		cls.includes("scroll-y")
	);
}

function queryRobloxAccountSideRails() {
	const settingsRoot = document.getElementById(RP_PROFILE_SETTINGS_ROOT_ID);
	return Array.from(
		document.querySelectorAll(".width-\\[289px\\], [class~='width-[289px]']"),
	).filter(
		(el) =>
			el instanceof HTMLElement &&
			isRobloxAccountSideRail(el) &&
			!(settingsRoot instanceof HTMLElement && settingsRoot.contains(el)),
	);
}

function toggleSettingsSideRails(inner) {
	if (!(inner instanceof HTMLElement)) return;
	inner.classList.toggle("is-rail-collapsed");
	const collapsed = inner.classList.contains("is-rail-collapsed");
	document.documentElement.classList.toggle(
		RP_SETTINGS_SIDE_RAIL_HIDDEN_CLASS,
		collapsed,
	);

	for (const el of queryRobloxAccountSideRails()) {
		if (collapsed) {
			if (getComputedStyle(el).display === "none") continue;
			if (!el.dataset.rpSettingsRailPrevDisplay) {
				el.dataset.rpSettingsRailPrevDisplay = el.style.display || "";
			}
			el.style.display = "none";
			continue;
		}
		if (!el.dataset.rpSettingsRailPrevDisplay) continue;
		el.style.display = el.dataset.rpSettingsRailPrevDisplay || "";
		delete el.dataset.rpSettingsRailPrevDisplay;
	}
}

function currentUiLanguageCode() {
	const s = String(settingsState.language || "en").toLowerCase();
	return s in langList ? s : "en";
}

function syncLanguageMenuLabels(inner) {
	inner
		.querySelectorAll(".roprime-language-option[data-lang]")
		.forEach((node) => {
			if (!(node instanceof HTMLButtonElement)) return;
			const code = node.getAttribute("data-lang");
			if (!code) return;
			const label = langList[code];
			if (typeof label === "string") node.textContent = label;
		});
	const current = inner.querySelector("[data-roprime-lang-current]");
	if (current instanceof HTMLElement) {
		const code = currentUiLanguageCode();
		current.textContent =
			typeof langList[code] === "string" ? langList[code] : langList.en;
	}
}

function languageMenuOptionsHtml() {
	return Object.keys(langList)
		.map(
			(code) =>
				`<button type="button" class="roprime-language-option" data-lang="${code}"></button>`,
		)
		.join("");
}

function findMountHost() {
	const acc = document.getElementById("react-user-account-base");
	if (acc instanceof HTMLElement) {
		const inner =
			acc.querySelector(".content-container") ||
			acc.querySelector("#content-container") ||
			acc.querySelector(".account-content") ||
			acc;
		if (inner instanceof HTMLElement) return inner;
	}
	const main = document.querySelector("#container-main");
	if (main instanceof HTMLElement) return main;
	const root = document.getElementById("root");
	if (root instanceof HTMLElement) return root;
	return document.body;
}

function snapshotRenameRestore() {
	settingsState.renameDropdownRestore = {
		renameCommunitiesToGroups: !!settingsState.renameCommunitiesToGroups,
		renameExperiencesToGames: !!settingsState.renameExperiencesToGames,
		renameMarketplaceToAvatarShop:
			!!settingsState.renameMarketplaceToAvatarShop,
	};
}

function setNativeAccountChromeHidden(hidden) {
	const accountBase = document.getElementById("react-user-account-base");
	if (!(accountBase instanceof HTMLElement)) return;
	const selectors = [
		".tab-content.rbx-tab-content",
		".tab-content",
		"#settings-container",
		"#mobile-navigation-dropdown",
		".content-container",
		"#content-container",
		".menu-vertical",
		".menu-vertical-container",
		".container-footer",
		"#footer-container",
	];
	const hideEl = (el) => {
		if (!(el instanceof HTMLElement)) return;
		if (hidden) {
			if (!el.hasAttribute("data-roprime-hidden-native")) {
				el.setAttribute("data-roprime-hidden-native", "1");
				el.setAttribute("data-roprime-prehide-display", el.style.display || "");
				el.style.display = "none";
			}
		} else if (el.getAttribute("data-roprime-hidden-native") === "1") {
			el.style.display = el.getAttribute("data-roprime-prehide-display") || "";
			el.removeAttribute("data-roprime-hidden-native");
			el.removeAttribute("data-roprime-prehide-display");
		}
	};

	for (const sel of selectors) {
		hideEl(accountBase.querySelector(sel));
	}

	for (const sel of [".container-footer", "#footer-container"]) {
		hideEl(document.querySelector(sel));
	}
}

function applyI18n(root) {
	root.querySelectorAll("[data-i18n]").forEach((node) => {
		if (!(node instanceof HTMLElement)) return;
		const key = node.getAttribute("data-i18n");
		if (!key) return;
		node.textContent = accountSettingsPaneT(key);
	});
	root.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
		if (
			!(node instanceof HTMLInputElement) &&
			!(node instanceof HTMLTextAreaElement)
		)
			return;
		const key = node.getAttribute("data-i18n-placeholder");
		if (!key) return;
		node.placeholder = accountSettingsPaneT(key);
	});
	root.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
		if (!(node instanceof HTMLElement)) return;
		const key = node.getAttribute("data-i18n-aria-label");
		if (!key) return;
		node.setAttribute("aria-label", accountSettingsPaneT(key));
	});
}

function sidebarModeValues() {
	return { full: 0, small: 50, icon: 100 };
}

function nearestSidebarMode(raw) {
	const value = Number(raw);
	if (Number.isNaN(value)) return "full";
	if (value < 25) return "full";
	if (value < 75) return "small";
	return "icon";
}

function setSidebarModeVisual(inner, mode) {
	inner.setAttribute("data-roprime-sidebar-size-mode", mode);
	inner.querySelectorAll(".roprime-sidebar-size-tick").forEach((tick) => {
		if (!(tick instanceof HTMLButtonElement)) return;
		tick.classList.toggle("is-active", tick.dataset.sizeMode === mode);
	});
}

function applySidebarMode(inner, mode) {
	settingsState.sidebarSize = mode;
	settingsState.smallNewNavigationBarEnabled = mode === "small";
	settingsState.sidebarIconsOnlyEnabled = mode === "icon";
	saveSettings();
	setSidebarModeVisual(inner, mode);
	syncRoEliteView();
}

function syncSidebarSliderFromState(inner) {
	const mode = settingsState.sidebarSize || "full";
	const mv = sidebarModeValues();
	inner.querySelectorAll(".roprime-sidebar-size-slider").forEach((slider) => {
		if (!(slider instanceof HTMLInputElement)) return;
		slider.value = String(mv[mode] ?? mv.full);
	});
	setSidebarModeVisual(inner, mode);
}

function isDeveloperPageUnlocked() {
	return !!settingsState.developerPageUnlocked;
}

const PROFILE_SETTINGS_NAV = [
	{ page: "design", labelKey: "Nav tab design", titleKey: "Nav tab design" },
	{
		page: "settings",
		labelKey: "Nav tab settings",
		titleKey: "Nav tab settings",
	},
	{ page: "other", labelKey: "Nav tab other", titleKey: "Nav tab other" },
	{ page: "info", labelKey: "Nav tab info", titleKey: "Nav tab info" },
	{
		page: "developer",
		labelKey: "Nav tab developer",
		titleKey: "Nav tab developer",
		hidden: true,
	},
];

function syncTreeNavSelection(inner, activePage, isSearchMode) {
	inner.querySelectorAll("[data-roprime-tree-item]").forEach((item) => {
		if (!(item instanceof HTMLElement)) return;
		const page = item.getAttribute("data-roprime-tree-item") || "";
		const content = item.querySelector(".roprime-settings-tree-content");
		const isActive = !isSearchMode && page === activePage;
		item.setAttribute("aria-selected", isActive ? "true" : "false");
		if (content instanceof HTMLElement) {
			content.classList.toggle("Mui-selected", isActive);
			if (isActive) content.setAttribute("data-selected", "");
			else content.removeAttribute("data-selected");
		}
	});
}

function refreshLayoutAndNav(root) {
	const inner = root.querySelector("#rp-settings-inner");
	if (!(inner instanceof HTMLElement)) return;

	const activePage = getCurrentrp() || RP_DEFAULT_PAGE;
	const isSearchMode = inner.getAttribute("data-roprime-search-mode") === "1";
	const searchSourcePage =
		inner.getAttribute("data-roprime-search-source-page") || RP_DEFAULT_PAGE;
	const searchInput = inner.querySelector("#roprime-settings-search");
	const searchTerm =
		searchInput instanceof HTMLInputElement
			? searchInput.value.trim().toLowerCase()
			: "";
	const hasSearchTerm = searchTerm.length >= 2;
	const showSearchHint =
		isSearchMode && searchTerm.length > 0 && searchTerm.length < 2;
	const unlocked = isDeveloperPageUnlocked();

	inner.classList.toggle("is-search-mode", isSearchMode);

	const hint = inner.querySelector("[data-roprime-search-hint]");
	if (hint instanceof HTMLElement)
		hint.style.display = showSearchHint ? "block" : "none";

	syncTreeNavSelection(inner, activePage, isSearchMode);

	inner.querySelectorAll(".roprime-settings-nav-btn").forEach((button) => {
		if (!(button instanceof HTMLElement)) return;
		if (button.dataset.roprimePage === "developer" && !unlocked) return;
		button.classList.toggle(
			"is-active",
			!isSearchMode && button.dataset.roprimePage === activePage,
		);
	});

	const profileEffectsAlert = inner.querySelector(
		"[data-roprime-profile-effects-alert]",
	);
	if (profileEffectsAlert instanceof HTMLElement) {
		profileEffectsAlert.style.display = isSearchMode ? "none" : "";
		profileEffectsAlert.classList.toggle(
			"is-active",
			!isSearchMode && activePage === "other",
		);
	}

	const devTreeItem = inner.querySelector(
		'[data-roprime-tree-item="developer"]',
	);
	if (devTreeItem instanceof HTMLElement) {
		devTreeItem.hidden = !unlocked;
		devTreeItem.style.display = unlocked ? "" : "none";
	}
	const devLink = inner.querySelector(
		'.roprime-settings-nav-btn[data-roprime-page="developer"]',
	);
	if (devLink instanceof HTMLElement) {
		devLink.setAttribute("aria-hidden", unlocked ? "false" : "true");
	}

	inner.querySelectorAll(".roprime-settings-section").forEach((section) => {
		if (!(section instanceof HTMLElement)) return;
		const sectionKey = section.getAttribute("data-roprime-section") || "";
		if (sectionKey === "developer" && !unlocked) {
			section.hidden = true;
			section.style.display = "none";
			return;
		}
		section.hidden = false;
		if (isSearchMode) {
			if (showSearchHint) {
				section.style.display = "none";
				return;
			}
			if (!hasSearchTerm) {
				if (sectionKey === "info" || sectionKey === "developer") {
					section.style.display = "none";
					return;
				}
				section
					.querySelectorAll(
						".roprime-toggle-row, .roprime-setting-field, .roprime-accordion, .roprime-info-block, .roprime-profile-effect-card",
					)
					.forEach((item) => {
						if (item instanceof HTMLElement) item.style.display = "";
					});
				section.style.display =
					sectionKey === searchSourcePage ? "block" : "none";
				return;
			}
			if (sectionKey === "info" || sectionKey === "developer") {
				section.style.display = "none";
				return;
			}
			let hasVisibleItems = false;
			section
				.querySelectorAll(
					".roprime-toggle-row, .roprime-setting-field, .roprime-accordion, .roprime-info-block, .roprime-profile-effect-card",
				)
				.forEach((item) => {
					if (!(item instanceof HTMLElement)) return;
					const itemText = (item.textContent || "").toLowerCase();
					const isMatch = itemText.includes(searchTerm);
					item.style.display = isMatch ? "" : "none";
					if (isMatch) hasVisibleItems = true;
				});
			section.style.display = hasVisibleItems ? "block" : "none";
			return;
		}
		section
			.querySelectorAll(
				".roprime-toggle-row, .roprime-setting-field, .roprime-accordion, .roprime-info-block, .roprime-profile-effect-card",
			)
			.forEach((item) => {
				if (item instanceof HTMLElement) item.style.display = "";
			});
		const show =
			sectionKey === activePage && !(sectionKey === "developer" && !unlocked);
		section.style.display = show ? "block" : "none";
	});

	const sharedSearchWrap = inner.querySelector(
		"[data-roprime-shared-search-wrap]",
	);
	if (sharedSearchWrap instanceof HTMLElement)
		sharedSearchWrap.style.display = "";

	if (
		searchInput instanceof HTMLInputElement &&
		!isSearchMode &&
		searchInput.value
	) {
		searchInput.value = "";
		inner
			.querySelectorAll(
				".roprime-settings-section .roprime-toggle-row, .roprime-settings-section .roprime-setting-field, .roprime-settings-section .roprime-accordion, .roprime-settings-section .roprime-info-block, .roprime-settings-section .roprime-profile-effect-card",
			)
			.forEach((item) => {
				if (item instanceof HTMLElement) item.style.display = "";
			});
	}
}

function bindOnce(root) {
	if (root.getAttribute("data-roprime-profile-bound") === "1") return;
	root.setAttribute("data-roprime-profile-bound", "1");

	const inner = root.querySelector("#rp-settings-inner");
	if (!(inner instanceof HTMLElement)) return;

	const enterSearchMode = () => {
		const isSearchMode = inner.getAttribute("data-roprime-search-mode") === "1";
		const currentPage = getCurrentrp() || RP_DEFAULT_PAGE;
		const sourcePage =
			currentPage === "info" || currentPage === "developer"
				? RP_DEFAULT_PAGE
				: currentPage;
		inner.setAttribute("data-roprime-search-source-page", sourcePage);
		if (!isSearchMode) {
			const si = inner.querySelector("#roprime-settings-search");
			if (si instanceof HTMLInputElement) si.value = "";
		}
		inner.setAttribute("data-roprime-search-mode", "1");
		refreshLayoutAndNav(root);
	};

	const unlockDeveloperPage = () => {
		if (isDeveloperPageUnlocked()) return;
		settingsState.developerPageUnlocked = true;
		saveSettings();
		inner.setAttribute("data-roprime-developer-unlock-message-visible", "1");
		refreshLayoutAndNav(root);
	};

	const search = inner.querySelector("#roprime-settings-search");
	if (search instanceof HTMLInputElement) {
		search.addEventListener("focus", enterSearchMode);
		search.addEventListener("click", enterSearchMode);
		search.addEventListener("input", () => {
			if (inner.getAttribute("data-roprime-search-mode") !== "1") return;
			if (search.value.trim().toLowerCase() === RP_DEBUG_UNLOCK)
				unlockDeveloperPage();
			refreshLayoutAndNav(root);
		});
	}

	const navigateToPage = (nextPage) => {
		inner.removeAttribute("data-roprime-search-mode");
		inner.removeAttribute("data-roprime-search-source-page");
		const searchBox = inner.querySelector("#roprime-settings-search");
		if (searchBox instanceof HTMLInputElement) searchBox.value = "";
		const nextUrl = buildPluginUrl(nextPage);
		const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
		if (currentUrl !== nextUrl) window.history.pushState({}, "", nextUrl);
		window.dispatchEvent(new Event("roprime-location-change"));
	};

	inner.querySelectorAll(".roprime-settings-nav-btn").forEach((btn) => {
		if (!(btn instanceof HTMLElement)) return;
		btn.addEventListener("click", (event) => {
			event.preventDefault();
			if (btn.dataset.roprimePage === "developer" && !isDeveloperPageUnlocked())
				return;
			navigateToPage(btn.dataset.roprimePage || RP_DEFAULT_PAGE);
		});
	});

	inner.addEventListener("click", (event) => {
		const menuBtn = event.target.closest(".roprime-settings-menu-btn");
		if (!(menuBtn instanceof HTMLButtonElement)) return;
		event.preventDefault();
		event.stopPropagation();
		toggleSettingsSideRails(inner);
	});

	const profileEffectsAlert = inner.querySelector(
		"[data-roprime-profile-effects-alert]",
	);
	if (profileEffectsAlert instanceof HTMLAnchorElement) {
		profileEffectsAlert.href = buildPluginUrl("other");
		profileEffectsAlert.addEventListener("click", (event) => {
			event.preventDefault();
			navigateToPage("other");
		});
	}

	const renameMaster = inner.querySelector("#roprime-toggle-rename-master");
	if (renameMaster instanceof HTMLInputElement) {
		renameMaster.addEventListener("change", () => {
			settingsState.renameDropdownEnabled = renameMaster.checked;
			if (settingsState.renameDropdownEnabled) snapshotRenameRestore();
			saveSettings();
			updateRenameLoop();
			syncRoEliteView();
			refreshProfileSettingsUi(root);
		});
	}

	for (const { id, key } of [
		{
			id: "roprime-toggle-rename-communities",
			key: "renameCommunitiesToGroups",
		},
		{
			id: "roprime-toggle-rename-experiences",
			key: "renameExperiencesToGames",
		},
		{
			id: "roprime-toggle-rename-marketplace",
			key: "renameMarketplaceToAvatarShop",
		},
	]) {
		const el = inner.querySelector(`#${id}`);
		if (!(el instanceof HTMLInputElement)) continue;
		el.addEventListener("change", () => {
			settingsState[key] = el.checked;
			snapshotRenameRestore();
			saveSettings();
			updateRenameLoop();
			syncRoEliteView();
		});
	}

	const oldNav = inner.querySelector("#roprime-toggle-old-navigation-bar");
	if (oldNav instanceof HTMLInputElement) {
		oldNav.addEventListener("change", () => {
			settingsState.oldNavigationBarEnabled = oldNav.checked;
			saveSettings();
			syncRoEliteView();
		});
	}

	const alwaysClose = inner.querySelector("#roprime-toggle-always-show-close");
	if (alwaysClose instanceof HTMLInputElement) {
		alwaysClose.addEventListener("change", () => {
			settingsState.alwaysShowCloseButtonEnabled = alwaysClose.checked;
			saveSettings();
			syncRoEliteView();
		});
	}

	const friendStyle = inner.querySelector(
		"#roprime-toggle-friend-styling-reimagned",
	);
	if (friendStyle instanceof HTMLInputElement) {
		friendStyle.addEventListener("change", () => {
			settingsState.friendStylingReimagnedEnabled = friendStyle.checked;
			saveSettings();
			syncRoEliteView();
		});
	}

	const sidebarCollapse = inner.querySelector(
		"#roprime-toggle-sidebar-collapse-menu",
	);
	if (sidebarCollapse instanceof HTMLInputElement) {
		sidebarCollapse.addEventListener("change", () => {
			settingsState.sidebarCollapseMenuEnabled = sidebarCollapse.checked;
			saveSettings();
			syncSidebarContent();
		});
	}

	const openSidebarContent = inner.querySelector(
		"[data-roprime-open-sidebar-content]",
	);
	if (openSidebarContent instanceof HTMLButtonElement) {
		openSidebarContent.addEventListener("click", () => {
			const nextUrl = buildPluginUrl("sidebar-content");
			const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
			if (currentUrl !== nextUrl) window.history.pushState({}, "", nextUrl);
			window.dispatchEvent(new Event("roprime-location-change"));
		});
	}

	const backSidebarContent = inner.querySelector(
		"[data-roprime-sidebar-content-back]",
	);
	if (backSidebarContent instanceof HTMLButtonElement) {
		backSidebarContent.addEventListener("click", () => {
			const nextUrl = buildPluginUrl("design");
			const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
			if (currentUrl !== nextUrl) window.history.pushState({}, "", nextUrl);
			window.dispatchEvent(new Event("roprime-location-change"));
		});
	}

	bindSidebarContentList(inner);

	const mv = sidebarModeValues();
	inner.querySelectorAll(".roprime-sidebar-size-slider").forEach((slider) => {
		if (!(slider instanceof HTMLInputElement)) return;
		const rail = slider.closest(".roprime-sidebar-size-control");
		const commitNearest = () => {
			const mode = nearestSidebarMode(slider.value);
			slider.value = String(mv[mode] ?? mv.full);
			slider.removeAttribute("data-roprime-dragging");
			applySidebarMode(inner, mode);
		};
		slider.addEventListener("input", () => {
			slider.setAttribute("data-roprime-dragging", "1");
			setSidebarModeVisual(inner, nearestSidebarMode(slider.value));
		});
		slider.addEventListener("change", commitNearest);
		slider.addEventListener("pointerdown", () =>
			slider.setAttribute("data-roprime-dragging", "1"),
		);
		slider.addEventListener("pointerup", commitNearest);
		slider.addEventListener("pointercancel", commitNearest);
		slider.addEventListener("blur", () => {
			if (slider.getAttribute("data-roprime-dragging") === "1") commitNearest();
		});
		const ticksRoot = rail instanceof HTMLElement ? rail : inner;
		ticksRoot.querySelectorAll(".roprime-sidebar-size-tick").forEach((tick) => {
			if (!(tick instanceof HTMLButtonElement)) return;
			if (tick.getAttribute("data-roprime-sidebar-tick-bound") === "1") return;
			tick.setAttribute("data-roprime-sidebar-tick-bound", "1");
			tick.addEventListener("click", () => {
				const mode = tick.dataset.sizeMode || "full";
				inner.querySelectorAll(".roprime-sidebar-size-slider").forEach((s) => {
					if (s instanceof HTMLInputElement) {
						s.value = String(mv[mode] ?? mv.full);
						s.removeAttribute("data-roprime-dragging");
					}
				});
				applySidebarMode(inner, mode);
			});
		});
	});

	const languageDropdown = inner.querySelector(
		"[data-roprime-language-dropdown]",
	);
	const languageMenu = languageDropdown?.querySelector(
		".roprime-language-menu",
	);
	const languageTrigger = languageDropdown?.querySelector(
		".roprime-language-trigger",
	);
	if (
		languageDropdown instanceof HTMLElement &&
		languageMenu instanceof HTMLElement &&
		languageTrigger instanceof HTMLButtonElement
	) {
		const closeLanguageMenu = () => {
			languageDropdown.classList.remove("is-open");
			languageMenu.hidden = true;
		};
		languageTrigger.addEventListener("click", (e) => {
			e.stopPropagation();
			const next = !languageDropdown.classList.contains("is-open");
			languageDropdown.classList.toggle("is-open", next);
			languageMenu.hidden = !next;
		});
		languageTrigger.addEventListener("mousedown", (e) => e.stopPropagation());
		languageMenu.addEventListener("mousedown", (e) => e.stopPropagation());
		languageMenu
			.querySelectorAll(".roprime-language-option")
			.forEach((option) => {
				if (!(option instanceof HTMLButtonElement)) return;
				option.addEventListener("click", () => {
					void (async () => {
						const next = String(option.dataset.lang || "").toLowerCase();
						if (!(next in langList)) return;
						settingsState.language = next;
						saveSettings();
						await reloadSettingsUiStrings();
						closeLanguageMenu();
						applyI18n(root);
						refreshProfileSettingsUi(root);
						syncAccountSettingsMenuButton();
					})();
				});
			});
		document.addEventListener("mousedown", (event) => {
			if (!(event.target instanceof Element)) return;
			if (!languageDropdown.classList.contains("is-open")) return;
			if (languageDropdown.contains(event.target)) return;
			closeLanguageMenu();
		});
		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape") closeLanguageMenu();
		});
		clearLanguageControlSizing(inner);
	}

	const accordion = inner.querySelector('[data-roprime-accordion="rename"]');
	const accHeader = accordion?.querySelector(".roprime-accordion-header");
	const accBody = accordion?.querySelector(".roprime-accordion-body");
	if (
		accordion instanceof HTMLElement &&
		accHeader instanceof HTMLElement &&
		accBody instanceof HTMLElement
	) {
		const syncA11y = () => {
			const isOpen = accordion.classList.contains("is-open");
			accHeader.setAttribute("aria-expanded", String(isOpen));
			accBody.setAttribute("aria-hidden", String(!isOpen));
			accBody.toggleAttribute("hidden", !isOpen);
		};
		accHeader.addEventListener("click", (event) => {
			if (
				event.target instanceof Element &&
				(event.target.closest(".roprime-accordion-master-switch") ||
					event.target.closest(".roprime-settings-menu-btn"))
			)
				return;
			accordion.classList.toggle("is-open");
			syncA11y();
		});
		accHeader.addEventListener("keydown", (event) => {
			if (event.key !== "Enter" && event.key !== " ") return;
			if (
				event.target instanceof Element &&
				event.target.closest(".roprime-accordion-master-switch")
			)
				return;
			event.preventDefault();
			accordion.classList.toggle("is-open");
			syncA11y();
		});
		renameMaster
			?.closest("label")
			?.addEventListener("click", (e) => e.stopPropagation());
		syncA11y();
	}

	bindCustomCssControls(inner);
	bindCosmeticsControls(inner);
}

function clearLanguageControlSizing(inner) {
	const wrap = inner.querySelector("[data-roprime-language-dropdown]");
	const trigger = inner.querySelector(".roprime-language-trigger");
	if (wrap instanceof HTMLElement) wrap.style.removeProperty("min-width");
	if (trigger instanceof HTMLElement) trigger.style.removeProperty("min-width");
}

function refreshProfileSettingsUi(root) {
	const inner = root.querySelector("#rp-settings-inner");
	if (!(inner instanceof HTMLElement)) return;

	applyI18n(root);

	clearLanguageControlSizing(inner);

	syncLanguageMenuLabels(inner);

	const renameMaster = inner.querySelector("#roprime-toggle-rename-master");
	if (renameMaster instanceof HTMLInputElement)
		renameMaster.checked = !!settingsState.renameDropdownEnabled;

	const communities = inner.querySelector("#roprime-toggle-rename-communities");
	if (communities instanceof HTMLInputElement)
		communities.checked = !!settingsState.renameCommunitiesToGroups;
	const experiences = inner.querySelector("#roprime-toggle-rename-experiences");
	if (experiences instanceof HTMLInputElement)
		experiences.checked = !!settingsState.renameExperiencesToGames;
	const marketplace = inner.querySelector("#roprime-toggle-rename-marketplace");
	if (marketplace instanceof HTMLInputElement)
		marketplace.checked = !!settingsState.renameMarketplaceToAvatarShop;

	const accordion = inner.querySelector('[data-roprime-accordion="rename"]');
	const accBody = accordion?.querySelector(".roprime-accordion-body");
	const accHeader = accordion?.querySelector(".roprime-accordion-header");
	if (accordion instanceof HTMLElement) {
		accordion.classList.toggle(
			"is-renames-disabled",
			!settingsState.renameDropdownEnabled,
		);
		// Expand/collapse is user-controlled via the accordion header, not tied to the master switch.
		const isOpen = accordion.classList.contains("is-open");
		if (accHeader instanceof HTMLElement) {
			accHeader.setAttribute("aria-expanded", String(isOpen));
		}
		if (accBody instanceof HTMLElement) {
			accBody.toggleAttribute("hidden", !isOpen);
			accBody.setAttribute("aria-hidden", String(!isOpen));
		}
	}

	const oldNav = inner.querySelector("#roprime-toggle-old-navigation-bar");
	if (oldNav instanceof HTMLInputElement)
		oldNav.checked = !!settingsState.oldNavigationBarEnabled;

	syncSidebarSliderFromState(inner);

	const alwaysClose = inner.querySelector("#roprime-toggle-always-show-close");
	if (alwaysClose instanceof HTMLInputElement)
		alwaysClose.checked = !!settingsState.alwaysShowCloseButtonEnabled;

	const friendStyle = inner.querySelector(
		"#roprime-toggle-friend-styling-reimagned",
	);
	if (friendStyle instanceof HTMLInputElement)
		friendStyle.checked = !!settingsState.friendStylingReimagnedEnabled;

	const sidebarCollapse = inner.querySelector(
		"#roprime-toggle-sidebar-collapse-menu",
	);
	if (sidebarCollapse instanceof HTMLInputElement)
		sidebarCollapse.checked = !!settingsState.sidebarCollapseMenuEnabled;

	const activePage = getCurrentrp() || RP_DEFAULT_PAGE;
	if (activePage === "sidebar-content") refreshSidebarContentList(inner);

	inner.querySelectorAll(".roprime-sidebar-size-tick span").forEach((span) => {
		if (!(span instanceof HTMLElement)) return;
		const key = span.getAttribute("data-i18n");
		if (key) span.textContent = accountSettingsPaneT(key);
	});

	const developerUnlockMessage = inner.querySelector(
		"[data-roprime-developer-unlock-message]",
	);
	if (developerUnlockMessage instanceof HTMLElement) {
		const showUnlockMessage =
			inner.getAttribute("data-roprime-developer-unlock-message-visible") ===
			"1";
		developerUnlockMessage.style.display = showUnlockMessage ? "block" : "none";
	}

	syncCustomCssUi(inner);
	syncCosmeticsUi(inner);

	refreshLayoutAndNav(root);

	syncCosmeticsUi(inner);
	const cosmeticsShop = inner.querySelector("[data-roprime-cosmetics-shop]");
	if (settingsState.cosmeticsEnabled && cosmeticsShop instanceof HTMLElement) {
		resizeCosmeticsPreviews(cosmeticsShop);
	}
}

function buildMarkup() {
	const designBody = `
                <div class="roprime-accordion" data-roprime-accordion="rename">
                    <div class="roprime-accordion-header" role="button" tabindex="0" aria-expanded="false">
                        <div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="Rename wording section title"></div></div>
                        <label class="roprime-switch roprime-accordion-master-switch" for="roprime-toggle-rename-master">
                            <input id="roprime-toggle-rename-master" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span>
                        </label>
                        <span class="roprime-accordion-chevron" aria-hidden="true"></span>
                    </div>
                    <div class="roprime-accordion-body" hidden>
                        <div class="roprime-toggle-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="Rename communities label"></div></div><label class="roprime-switch" for="roprime-toggle-rename-communities"><input id="roprime-toggle-rename-communities" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                        <div class="roprime-toggle-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="Rename experiences label"></div></div><label class="roprime-switch" for="roprime-toggle-rename-experiences"><input id="roprime-toggle-rename-experiences" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                        <div class="roprime-toggle-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="Rename marketplace label"></div></div><label class="roprime-switch" for="roprime-toggle-rename-marketplace"><input id="roprime-toggle-rename-marketplace" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                    </div>
                </div>
                <div class="roprime-toggle-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="Old navigation title"></div><div class="roprime-toggle-desc" data-i18n="Old navigation description"></div></div><label class="roprime-switch" for="roprime-toggle-old-navigation-bar"><input id="roprime-toggle-old-navigation-bar" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                <div class="roprime-toggle-row roprime-sidebar-size-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="Sidebar size title"></div><div class="roprime-toggle-desc" data-i18n="Sidebar size description"></div></div><div class="roprime-setting-control">${buildSidebarSizeControlHtml()}</div></div>
                <div class="roprime-toggle-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="Sidebar collapse menu title"></div><div class="roprime-toggle-desc" data-i18n="Sidebar collapse menu description"></div></div><label class="roprime-switch" for="roprime-toggle-sidebar-collapse-menu"><input id="roprime-toggle-sidebar-collapse-menu" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                <div class="roprime-toggle-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="Always show close title"></div><div class="roprime-toggle-desc" data-i18n="Always show close description"></div></div><label class="roprime-switch" for="roprime-toggle-always-show-close"><input id="roprime-toggle-always-show-close" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                <div class="roprime-toggle-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="Friend styling title"></div><div class="roprime-toggle-desc" data-i18n="Friend styling description"></div></div><label class="roprime-switch" for="roprime-toggle-friend-styling-reimagned"><input id="roprime-toggle-friend-styling-reimagned" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>`;

	const sidebarContentBody = `
                <button type="button" class="roprime-sidebar-content-back" data-roprime-sidebar-content-back data-i18n="Sidebar content back"></button>
                <div class="roprime-toggle-row roprime-sidebar-size-row">
                    <div class="roprime-toggle-copy">
                        <div class="roprime-toggle-title" data-i18n="Sidebar size title"></div>
                        <div class="roprime-toggle-desc" data-i18n="Sidebar size description"></div>
                    </div>
                    <div class="roprime-setting-control">${buildSidebarSizeControlHtml("roprime-sidebar-size-slider-config")}</div>
                </div>
                <div class="roprime-sidebar-content-panel">
                    <div class="roprime-setting-field-copy">
                        <div class="roprime-setting-title" data-i18n="Sidebar content list title"></div>
                        <div class="roprime-setting-desc" data-i18n="Sidebar content list description"></div>
                    </div>
                    <div class="roprime-sidebar-content-list" data-roprime-sidebar-content-list></div>
                </div>`;

	const settingsBody = `
                <div class="roprime-setting-field">
                    <div class="roprime-setting-field-copy">
                        <div class="roprime-setting-title" data-i18n="Language section title"></div>
                        <div class="roprime-setting-desc" data-i18n="Language section description"></div>
                    </div>
                    <div class="roprime-language-dropdown" data-roprime-language-dropdown>
                        <button type="button" class="roprime-language-trigger"><span data-roprime-lang-current></span><span class="roprime-language-chevron" aria-hidden="true"></span></button>
                        <div class="roprime-language-menu" hidden>
                            ${languageMenuOptionsHtml()}
                        </div>
                    </div>
                </div>`;

	const otherBody = `
                ${buildCustomCssHtml()}
                <div class="roprime-toggle-row">
                    <div class="roprime-toggle-copy">
                        <div class="roprime-toggle-title" data-i18n="Enable cosmetics title"></div>
                        <div class="roprime-toggle-desc" data-i18n="Enable cosmetics description"></div>
                    </div>
                    <label class="roprime-switch" for="roprime-toggle-cosmetics-enabled">
                        <input id="roprime-toggle-cosmetics-enabled" type="checkbox" />
                        <span class="roprime-switch-slider" aria-hidden="true"></span>
                    </label>
                </div>
                <div class="roprime-cosmetics-shop" data-roprime-cosmetics-shop hidden>
                    ${buildCosmeticsShopHtml()}
                </div>`;

	const infoBody = `
                <div class="roprime-info-block">
                    <div class="roprime-info-title" data-i18n="Info card title"></div>
                    <div class="roprime-info-text" data-i18n="Info card body"></div>
                </div>`;

	const developerBody = `
                <div class="roprime-setting-field-copy">
                    <div class="roprime-setting-title" data-i18n="Developer section title"></div>
                    <div class="roprime-setting-desc" data-i18n="Developer section description"></div>
                </div>`;

	const sectionsHtml = [
		wrapSettingsSection("design", "Nav tab design", designBody),
		wrapSettingsSection(
			"sidebar-content",
			"Sidebar content list title",
			sidebarContentBody,
		),
		wrapSettingsSection("settings", "Nav tab settings", settingsBody),
		wrapSettingsSection("other", "Nav tab other", otherBody),
		wrapSettingsSection("info", "Nav tab info", infoBody),
		wrapSettingsSection("developer", "Nav tab developer", developerBody, {
			hidden: true,
		}),
	].join("");

	return buildSettingsShell({
		navItems: PROFILE_SETTINGS_NAV,
		sectionsHtml,
		showProfileEffectsAlert: true,
	});
}

export function syncProfileSettingsRoute() {
	if (!isMyAccountPath()) {
		setAccountSettingsShellClass(false);
		setNativeAccountChromeHidden(false);
		document.getElementById(RP_PROFILE_SETTINGS_ROOT_ID)?.remove();
		updateDocumentTitle(false);
		updateAccountHeader(false);
		return;
	}

	if (!shouldRunRoPrimeOnCurrentPage() || !isPluginRoute()) {
		setAccountSettingsShellClass(false);
		setNativeAccountChromeHidden(false);
		document.getElementById(RP_PROFILE_SETTINGS_ROOT_ID)?.remove();
		updateDocumentTitle(false);
		updateAccountHeader(false);
		return;
	}

	const rpPage = getCurrentrp();
	if (rpPage === "developer" && !settingsState.developerPageUnlocked) {
		const nextUrl = buildPluginUrl(RP_DEFAULT_PAGE);
		const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
		if (currentUrl !== nextUrl) {
			window.history.replaceState({}, "", nextUrl);
			window.dispatchEvent(new Event("roprime-location-change"));
		}
	}

	setAccountSettingsShellClass(true);
	setNativeAccountChromeHidden(true);
	updateDocumentTitle(true);
	updateAccountHeader(true);

	let root = document.getElementById(RP_PROFILE_SETTINGS_ROOT_ID);
	if (!(root instanceof HTMLElement)) {
		root = document.createElement("div");
		root.id = RP_PROFILE_SETTINGS_ROOT_ID;
		root.className = "roprime-profile-settings-root";
		const acc = document.getElementById("react-user-account-base");
		if (acc instanceof HTMLElement) {
			acc.appendChild(root);
		} else {
			const host = findMountHost();
			host.insertBefore(root, host.firstChild);
		}
		root.innerHTML = buildMarkup();
		bindOnce(root);
	}

	refreshProfileSettingsUi(root);
}
