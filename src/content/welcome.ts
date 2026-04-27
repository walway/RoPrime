import { getStorageApi } from "./core.js";

export const RP_HOME_WELCOME_DISMISSED_KEY = "rpHomeWelcomeDismissed";

const WELCOME_ROOT_ID = "roprime-home-welcome-root";

let welcomeKeydownHandler = null;
let storageDismissListenerAttached = false;

function attachDismissStorageListener() {
    if (storageDismissListenerAttached) return;
    if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return;
    storageDismissListenerAttached = true;
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") return;
        if (changes[RP_HOME_WELCOME_DISMISSED_KEY]?.newValue === true) removeWelcomeIfPresent();
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
    try {
        if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
            return chrome.runtime.getURL("resources/roprime-icon.png");
        }
    } catch {
        return "";
    }
    return "";
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

function showWelcomeModal() {
    if (document.getElementById(WELCOME_ROOT_ID)) return;

    const root = document.createElement("div");
    root.id = WELCOME_ROOT_ID;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "roprime-welcome-title");

    const iconSrc = getExtensionIconUrl();
    root.innerHTML = `
        <div class="roprime-welcome-backdrop" data-roprime-welcome-dismiss="backdrop"></div>
        <div class="roprime-welcome-frame">
            <div class="roprime-welcome-card">
                <img class="roprime-welcome-logo" src="${iconSrc}" alt="" width="80" height="80" />
                <h2 id="roprime-welcome-title" class="roprime-welcome-title">RoPrime is installed</h2>
                <p class="roprime-welcome-text">You can change the look of RoPrime anytime from your Settings by clicking <strong>RoPrime Settings</strong>.</p>
                <button type="button" class="roprime-welcome-ok">Okay</button>
            </div>
        </div>
    `;

    const dismiss = () => {
        const storage = getStorageApi();
        if (storage) {
            storage.set({ [RP_HOME_WELCOME_DISMISSED_KEY]: true });
        }
        removeWelcomeIfPresent();
    };

    root.querySelector(".roprime-welcome-ok")?.addEventListener("click", dismiss);
    root.querySelector("[data-roprime-welcome-dismiss='backdrop']")?.addEventListener("click", dismiss);

    welcomeKeydownHandler = (e) => {
        if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", welcomeKeydownHandler, true);

    appendWelcomeWhenBodyReady(root);
}

/**
 * On Roblox home: show welcome until `rpHomeWelcomeDismissed === true` in chrome.storage.local
 * (missing/false = show — existing users without the key still see it once).
 */
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

    storage.get([RP_HOME_WELCOME_DISMISSED_KEY], (result) => {
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
    });
}
