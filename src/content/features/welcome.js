import { getStorageApi, isExtensionContextInvalidatedError } from "../core/core.js";

export const RP_HOME_WELCOME_DISMISSED_KEY = "rpHomeWelcomeDismissed";

const WELCOME_ROOT_ID = "roprime-home-welcome-root";

let welcomeKeydownHandler = null;
let storageDismissListenerAttached = false;

function attachDismissStorageListener() {
	if (storageDismissListenerAttached) return;
	if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return;
	storageDismissListenerAttached = true;
	chrome.storage.onChanged.addListener((changes, area) => {
		try {
			if (area !== "local") return;
			if (changes[RP_HOME_WELCOME_DISMISSED_KEY]?.newValue === true) {
				removeWelcomeIfPresent();
			}
		} catch (error) {
			if (!isExtensionContextInvalidatedError(error)) throw error;
		}
	});
}

/** True for /home, /en-us/home, /de/home, etc. */
export function isRobloxHomePage() {
	const raw = window.location.pathname || "/";
	const normalized = raw.replace(/\/+$/, "") || "/";
	if (normalized === "/home") return true;
	const parts = normalized.split("/").filter(Boolean);
	return parts.length > 0 && parts[parts.length - 1].toLowerCase() === "home";
}

function removeWelcomeIfPresent() {
	if (welcomeKeydownHandler) {
		document.removeEventListener("keydown", welcomeKeydownHandler, true);
		welcomeKeydownHandler = null;
	}
	document.getElementById(WELCOME_ROOT_ID)?.remove();
}

/** Prefer `document.body` once it exists (avoids missing modal before body mount). */
function appendWelcomeWhenBodyReady(root) {
	const mount = () => {
		if (!document.body) return false;
		document.body.appendChild(root);
		return true;
	};
	if (mount()) return;

	const observer = new MutationObserver(() => {
		if (!isRobloxHomePage()) {
			observer.disconnect();
			return;
		}
		if (mount()) observer.disconnect();
	});
	observer.observe(document.documentElement, { childList: true, subtree: true });
}

function persistWelcomeDismissed() {
	try {
		const storage = getStorageApi();
		if (storage) storage.set({ [RP_HOME_WELCOME_DISMISSED_KEY]: true });
	} catch {
		/* ignore */
	}
}

function buildWelcomeMarkup() {
	return `
<div data-state="open" class="foundation-web-dialog-overlay padding-medium foundation-web-portal-zindex bg-common-backdrop" style="pointer-events: auto;" data-roprime-welcome-dismiss="backdrop">
  <div role="dialog" data-state="open" class="relative radius-large bg-surface-100 stroke-muted stroke-standard foundation-web-dialog-content shadow-transient-high" data-size="Medium" tabindex="-1" style="pointer-events: auto;">
    <div class="absolute foundation-web-dialog-close-container">
      <button type="button" class="foundation-web-close-affordance flex stroke-none bg-none cursor-pointer relative clip group/interactable focus-visible:outline-focus disabled:outline-none bg-over-media-100 padding-small radius-circle roprime-welcome-close" aria-label="Close">
        <div role="presentation" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div>
        <span role="presentation" class="grow-0 shrink-0 basis-auto icon icon-regular-x size-[var(--icon-size-medium)]"></span>
      </button>
    </div>
    <div class="padding-x-xlarge padding-top-xlarge padding-bottom-xlarge">
      <h2 id="roprime-welcome-title">Welcome to RoPrime!</h2>
      <p>Quick reminder - you can open RoPrime Settings by clicking the Gear icon at the right-top side of the Roblox website.</p>
      <p>We hope you will enjoy our extension and will rate us 5 stars on store.</p>
    </div>
    <div class="padding-x-xlarge padding-bottom-xlarge flex gap-medium justify-end">
      <button type="button" class="foundation-web-button relative clip group/interactable focus-visible:outline-focus disabled:outline-none cursor-pointer relative flex items-center justify-center stroke-none padding-y-none select-none radius-medium text-label-large height-1200 padding-x-medium bg-action-emphasis content-action-emphasis roprime-welcome-ok">
        <div role="presentation" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div>
        <span class="flex items-center min-width-0 gap-small">
          <span class="padding-y-xsmall text-truncate-end text-no-wrap">Let's go!</span>
        </span>
      </button>
    </div>
  </div>
</div>
`;
}

function showWelcomeModal() {
	if (document.getElementById(WELCOME_ROOT_ID)) return;

	const root = document.createElement("div");
	root.id = WELCOME_ROOT_ID;
	root.setAttribute("role", "dialog");
	root.setAttribute("aria-modal", "true");
	root.setAttribute("aria-labelledby", "roprime-welcome-title");
	root.innerHTML = buildWelcomeMarkup();

	const dismiss = () => {
		persistWelcomeDismissed();
		removeWelcomeIfPresent();
	};

	root.querySelector(".roprime-welcome-ok")?.addEventListener("click", dismiss);
	root.querySelector(".roprime-welcome-close")?.addEventListener("click", dismiss);
	root
		.querySelector("[data-roprime-welcome-dismiss='backdrop']")
		?.addEventListener("click", (event) => {
			if (event.target === event.currentTarget) dismiss();
		});

	welcomeKeydownHandler = (event) => {
		if (event.key === "Escape") dismiss();
	};
	document.addEventListener("keydown", welcomeKeydownHandler, true);

	appendWelcomeWhenBodyReady(root);
}

export function syncHomeWelcomeModal() {
	attachDismissStorageListener();
	if (!isRobloxHomePage()) {
		removeWelcomeIfPresent();
		return;
	}

	const storage = getStorageApi();
	if (!storage) {
		showWelcomeModal();
		return;
	}

	try {
		storage.get([RP_HOME_WELCOME_DISMISSED_KEY], (result) => {
			try {
				if (chrome.runtime?.lastError) {
					if (isRobloxHomePage()) showWelcomeModal();
					return;
				}
				if (!isRobloxHomePage()) return;
				if (result?.[RP_HOME_WELCOME_DISMISSED_KEY] === true) {
					removeWelcomeIfPresent();
					return;
				}
				showWelcomeModal();
			} catch {
				/* ignore */
			}
		});
	} catch {
		if (isRobloxHomePage()) showWelcomeModal();
	}
}
