import {
	isExtensionContextAlive,
	isExtensionContextInvalidatedError,
	normalizeSearchBannedWords,
	settingsState,
	shouldRunRoPrimeOnCurrentPage,
} from "../core/core.js";

export const RP_SEARCH_BAN_ERROR_ID = "roprime-search-ban-error";
export const RP_SEARCH_BAN_HIDE_STYLE_ID = "roprime-search-ban-hide-style";

const DISCOVER_ERROR_HTML = `
<div data-testid="error-container" class="discovery-error-container" data-roprime-search-ban-error="1">
  <div class="error-container-content">
    <img 
      data-testid="error-container-image" 
      class="error-container-content-image" 
      src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSJub25lIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHBhdGggc3Ryb2tlPSIjZjdmN2Y4IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMyIgZD0iTTQ3Ljc3NyAyNi4yMzhjLjk4OC0xLjY1IDMuNDU4LTEuNjUgNC40NDYgMGwyNi42OCA0NC41NWMuOTg3IDEuNjUtLjI0OCAzLjcxMi0yLjIyNCAzLjcxMkgyMy4zMjFjLTEuOTc2IDAtMy4yMTEtMi4wNjItMi4yMjMtMy43MTN6Ii8+PGNpcmNsZSBjeD0iNDkuOTI1IiBjeT0iNjIuMzUyIiByPSIyLjM3NSIgZmlsbD0iI2Y3ZjdmOCIvPjxwYXRoIHN0cm9rZT0iI2Y3ZjdmOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2Utd2lkdGg9IjMiIGQ9Ik00OS45MjUgNTQuMjVWNDMiLz48L3N2Zz4=" 
      alt="Error Icon"
    >
    <h2>Something went wrong</h2>
    <p class="error-container-content-subtext">You dont have access to this page</p>
  </div>
  <button 
    type="button" 
    data-testid="error-refresh-button" 
    class="foundation-web-button relative clip group/interactable focus-visible:outline-focus disabled:outline-none cursor-pointer relative flex items-center justify-center stroke-none padding-y-none select-none radius-medium text-label-medium height-1000 padding-x-medium bg-action-standard content-action-standard" 
    style="text-decoration: none;"
  >
    <div role="presentation" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div>
    <span class="flex items-center min-width-0 gap-small">
      <span class="padding-y-xsmall text-truncate-end text-no-wrap">
        <span>Retry</span>
      </span>
    </span>
  </button>
</div>
`;

let domObserver = null;

export function isDiscoverSearchPage() {
	const path = window.location.pathname || "";
	return /\/discover\/?$/i.test(path);
}

export function getDiscoverSearchKeyword() {
	const params = new URLSearchParams(window.location.search);
	for (const key of ["Keyword", "keyword"]) {
		const value = params.get(key);
		if (value == null || value === "") continue;
		try {
			return decodeURIComponent(String(value).replace(/\+/g, " ")).trim();
		} catch {
			return String(value).replace(/\+/g, " ").trim();
		}
	}
	return "";
}

export function isSearchBanActive() {
	if (!settingsState.searchBanEnabled) return false;
	return normalizeSearchBannedWords(settingsState.searchBannedWords).length > 0;
}

export function normalizeSearchKeyword(keyword) {
	let normalized = String(keyword || "").trim();
	if (
		normalized.length >= 2 &&
		((normalized.startsWith('"') && normalized.endsWith('"')) ||
			(normalized.startsWith("'") && normalized.endsWith("'")))
	) {
		normalized = normalized.slice(1, -1).trim();
	}
	return normalized.toLowerCase();
}

export function isKeywordSearchBanned(keyword) {
	if (!isSearchBanActive()) return false;
	const normalizedKeyword = normalizeSearchKeyword(keyword);
	if (!normalizedKeyword) return false;

	return normalizeSearchBannedWords(settingsState.searchBannedWords).some(
		(word) => {
			const bannedWord = normalizeSearchKeyword(word);
			if (!bannedWord) return false;
			return normalizedKeyword.includes(bannedWord);
		},
	);
}

function getDiscoverContentRoot() {
	const content = document.querySelector("#content.content");
	return content instanceof HTMLElement ? content : null;
}

function ensureSearchBanHideStyle(active) {
	document.getElementById(RP_SEARCH_BAN_HIDE_STYLE_ID)?.remove();
	if (!active) return;

	const style = document.createElement("style");
	style.id = RP_SEARCH_BAN_HIDE_STYLE_ID;
	style.textContent = "#game-search-web-app{display:none!important;}";
	document.documentElement.appendChild(style);
}

function removeSearchBanError() {
	document.getElementById(RP_SEARCH_BAN_ERROR_ID)?.remove();
	document
		.querySelector('[data-roprime-search-ban-error="1"]')
		?.remove();
}

function applySearchBanBlock() {
	const gameSearch = document.getElementById("game-search-web-app");
	if (gameSearch instanceof HTMLElement) {
		gameSearch.hidden = true;
		gameSearch.style.display = "none";
	}
	ensureSearchBanHideStyle(true);

	const contentRoot = getDiscoverContentRoot();
	if (!(contentRoot instanceof HTMLElement)) return;

	let error = document.getElementById(RP_SEARCH_BAN_ERROR_ID);
	if (!(error instanceof HTMLElement)) {
		error = contentRoot.querySelector('[data-roprime-search-ban-error="1"]');
	}
	if (error instanceof HTMLElement) return;

	contentRoot.insertAdjacentHTML("beforeend", DISCOVER_ERROR_HTML);
	const injected = contentRoot.querySelector('[data-roprime-search-ban-error="1"]');
	if (injected instanceof HTMLElement) {
		injected.id = RP_SEARCH_BAN_ERROR_ID;
	}
}

function clearSearchBanBlock() {
	ensureSearchBanHideStyle(false);

	const gameSearch = document.getElementById("game-search-web-app");
	if (gameSearch instanceof HTMLElement) {
		gameSearch.hidden = false;
		gameSearch.style.removeProperty("display");
	}

	removeSearchBanError();
}

function shouldBlockCurrentDiscoverSearch() {
	return (
		isDiscoverSearchPage() &&
		isKeywordSearchBanned(getDiscoverSearchKeyword())
	);
}

export function syncSearchBan() {
	if (
		!shouldRunRoPrimeOnCurrentPage() ||
		!isExtensionContextAlive() ||
		!isDiscoverSearchPage()
	) {
		stopSearchBanDomObserver();
		clearSearchBanBlock();
		return;
	}

	if (shouldBlockCurrentDiscoverSearch()) {
		applySearchBanBlock();
		return;
	}

	clearSearchBanBlock();
}

function ensureSearchBanDomObserver() {
	if (domObserver || !isExtensionContextAlive()) return;

	try {
		domObserver = new MutationObserver(() => {
			try {
				if (!isDiscoverSearchPage()) {
					stopSearchBanDomObserver();
					clearSearchBanBlock();
					return;
				}
				syncSearchBan();
			} catch (e) {
				if (!isExtensionContextInvalidatedError(e)) throw e;
			}
		});
		domObserver.observe(document.documentElement, {
			childList: true,
			subtree: true,
		});
	} catch {
		domObserver = null;
	}
}

function stopSearchBanDomObserver() {
	if (!domObserver) return;
	try {
		domObserver.disconnect();
	} catch {
		/* ignore */
	}
	domObserver = null;
}

export function stopSearchBan() {
	stopSearchBanDomObserver();
	clearSearchBanBlock();
}

export function installSearchBanObserver() {
	if (!isExtensionContextAlive()) return;

	const onRoute = () => {
		try {
			if (!shouldRunRoPrimeOnCurrentPage()) {
				stopSearchBan();
				return;
			}
			if (isDiscoverSearchPage()) {
				ensureSearchBanDomObserver();
				syncSearchBan();
				return;
			}
			stopSearchBanDomObserver();
			clearSearchBanBlock();
		} catch (e) {
			if (!isExtensionContextInvalidatedError(e)) throw e;
		}
	};

	window.addEventListener("roprime-location-change", onRoute);
	window.addEventListener("popstate", onRoute);
}
