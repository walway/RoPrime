import {
	getExtensionResourceUrl,
	getStorageApi,
	isExtensionContextInvalidatedError,
} from "../core/core.js";

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
			if (changes[RP_HOME_WELCOME_DISMISSED_KEY]?.newValue === true)
				removeWelcomeIfPresent();
		} catch (e) {
			if (!isExtensionContextInvalidatedError(e)) throw e;
		}
	});
}

/** True for /home, /en-us/home, /de/home, etc. */
export function isRobloxHomePage() {
	const raw = window.location.pathname || "/";
	const p = raw.replace(/\/+$/, "") || "/";
	if (p === "/home") return true;
	const parts = p.split("/").filter(Boolean);
	return parts.length >= 1 && parts[parts.length - 1].toLowerCase() === "home";
}

function removeWelcomeIfPresent() {
	if (welcomeKeydownHandler) {
		document.removeEventListener("keydown", welcomeKeydownHandler, true);
		welcomeKeydownHandler = null;
	}
	document.getElementById(WELCOME_ROOT_ID)?.remove();
}

function getExtensionIconUrl() {
	return getExtensionResourceUrl("src/resources/roprime-icon.svg");
}

async function getRobloxViewer() {
	try {
		const authResponse = await fetch(
			"https://users.roblox.com/v1/users/authenticated",
			{
				credentials: "include",
			},
		);
		if (!authResponse.ok) return null;
		const authData = await authResponse.json();
		const userId = Number(authData?.id);
		if (!userId) return null;
		let avatarUrl = "";
		try {
			const thumbResponse = await fetch(
				`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`,
				{ credentials: "include" },
			);
			if (thumbResponse.ok) {
				const thumbData = await thumbResponse.json();
				avatarUrl = thumbData?.data?.[0]?.imageUrl || "";
			}
		} catch {
			avatarUrl = "";
		}
		return {
			id: userId,
			name: authData?.displayName || authData?.name || "there",
			avatarUrl,
		};
	} catch {
		return null;
	}
}

/** Prefer `document.body` once it exists (avoids missing modal when storage resolves before body). */
function appendWelcomeWhenBodyReady(root) {
	const mount = () => {
		const parent = document.body;
		if (parent) {
			parent.appendChild(root);
			return true;
		}
		return false;
	};
	if (mount()) return;

	const tryMount = () => {
		if (!isRobloxHomePage()) {
			mo.disconnect();
			document.removeEventListener("DOMContentLoaded", onDomReady);
			return;
		}
		if (mount()) {
			mo.disconnect();
			document.removeEventListener("DOMContentLoaded", onDomReady);
		}
	};

	const mo = new MutationObserver(() => tryMount());
	mo.observe(document.documentElement, { childList: true });

	function onDomReady() {
		tryMount();
	}
	document.addEventListener("DOMContentLoaded", onDomReady, { once: true });

	window.setTimeout(() => {
		mo.disconnect();
		document.removeEventListener("DOMContentLoaded", onDomReady);
		if (!isRobloxHomePage()) return;
		if (root.parentElement) return;
		(document.body || document.documentElement).appendChild(root);
	}, 8000);
}

async function showWelcomeModal() {
	if (document.getElementById(WELCOME_ROOT_ID)) return;

	const root = document.createElement("div");
	root.id = WELCOME_ROOT_ID;
	root.setAttribute("role", "dialog");
	root.setAttribute("aria-modal", "true");
	root.setAttribute("aria-labelledby", "roprime-welcome-title");

	const iconSrc = getExtensionIconUrl();
	const viewer = await getRobloxViewer();
	const _viewerName = viewer?.name
		? String(viewer.name).replace(/[<>&"]/g, "")
		: "there";
	const _avatarSrc = viewer?.avatarUrl || iconSrc;
	root.innerHTML = `
	<div data-state="open" class="foundation-web-dialog-overlay padding-medium foundation-web-portal-zindex bg-common-backdrop" style="pointer-events: auto;">
  <div role="dialog" id="radix-0" aria-labelledby="radix-1" data-state="open" class="relative radius-large bg-surface-100 stroke-muted stroke-standard foundation-web-dialog-content shadow-transient-high" data-size="Medium" tabindex="-1" style="pointer-events: auto;">
    
    <!-- Close Button Container -->
    <div class="absolute foundation-web-dialog-close-container">
      <button type="button" class="foundation-web-close-affordance flex stroke-none bg-none cursor-pointer relative clip group/interactable focus-visible:outline-focus disabled:outline-none bg-over-media-100 padding-small radius-circle" aria-label="Close">
        <div role="presentation" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div>
        <span role="presentation" class="grow-0 shrink-0 basis-auto icon icon-regular-x size-[var(--icon-size-medium)]"></span>
      </button>
    </div>

    <!-- Modal Content Body -->
    <div class="padding-x-xlarge padding-top-xlarge padding-bottom-xlarge">
      <h2 id="radix-1">Welcome to RoPrime!</h2>
      <p>Quick reminder - you can open RoPrime Settings by clicking the Gear icon at the right-top side of the Roblox website.</p>
      <p>We hope you will enjoy our extension and will rate us 5 ⭐ on store ^_^</p>
    </div>

    <!-- Modal Footer Actions -->
    <div class="padding-x-xlarge padding-bottom-xlarge flex gap-medium justify-end">
      
      <!-- Cancel Button -->
      <a href="https://www.roblox.com/my/account?roprime=design#!/info" type="button" class="foundation-web-button relative clip group/interactable focus-visible:outline-focus disabled:outline-none cursor-pointer relative flex items-center justify-center stroke-none padding-y-none select-none radius-medium text-label-large height-1200 padding-x-medium bg-action-standard content-action-standard" style="text-decoration: none;">
        <div role="presentation" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div>
        <span class="flex items-center min-width-0 gap-small">
          <span class="padding-y-xsmall text-truncate-end text-no-wrap">Settings</span>
        </span>
      </button>

      <!-- Continue Link -->
      <button type="button" class="foundation-web-button relative clip group/interactable focus-visible:outline-focus disabled:outline-none cursor-pointer relative flex items-center justify-center stroke-none padding-y-none select-none radius-medium text-label-large height-1200 padding-x-medium bg-action-emphasis content-action-emphasis" style="text-decoration: none;">
        <div role="presentation" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div>
        <span class="flex items-center min-width-0 gap-small">
          <span class="padding-y-xsmall text-truncate-end text-no-wrap">Let's go!</span>
        </span>
      </a>

    </div>
  </div>
</div>

    `;

	const dismiss = () => {
		try {
			const storage = getStorageApi();
			if (storage) {
				storage.set({ [RP_HOME_WELCOME_DISMISSED_KEY]: true });
			}
		} catch {
			/* ignore */
		}
		removeWelcomeIfPresent();
	};

	root.querySelector(".roprime-welcome-ok")?.addEventListener("click", dismiss);
	root
		.querySelector(".roprime-welcome-close")
		?.addEventListener("click", dismiss);
	root
		.querySelector("[data-roprime-welcome-dismiss='backdrop']")
		?.addEventListener("click", dismiss);

	welcomeKeydownHandler = (e) => {
		if (e.key === "Escape") dismiss();
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
					if (!isRobloxHomePage()) return;
					showWelcomeModal();
					return;
				}
				if (!isRobloxHomePage()) return;
				const dismissed = result?.[RP_HOME_WELCOME_DISMISSED_KEY];
				if (dismissed === true) {
					removeWelcomeIfPresent();
					return;
				}
				showWelcomeModal();
			} catch {
				/* ignore */
			}
		});
	} catch {
		if (!isRobloxHomePage()) return;
		showWelcomeModal();
	}
}
