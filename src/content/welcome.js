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

async function getRobloxViewer() {
    try {
        const authResponse = await fetch("https://users.roblox.com/v1/users/authenticated", {
            credentials: "include",
        });
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
    const viewerName = viewer?.name ? String(viewer.name).replace(/[<>&"]/g, "") : "there";
    const avatarSrc = viewer?.avatarUrl || iconSrc;
    root.innerHTML = `
        <div class="roprime-welcome-backdrop" data-roprime-welcome-dismiss="backdrop"></div>
        <div class="roprime-welcome-frame">
            <div class="roprime-welcome-card">
                <button type="button" class="roprime-welcome-close" aria-label="Close welcome modal">&times;</button>
                <div class="roprime-welcome-header">
                    <img class="roprime-welcome-logo" src="${avatarSrc}" alt="" width="28" height="28" />
                    <h2 id="roprime-welcome-title" class="roprime-welcome-title">Welcome to RoPrime, ${viewerName}!</h2>
                </div>
                <p class="roprime-welcome-text">Thank you for installing RoPrime.</p>
                <p class="roprime-welcome-text">To change settings and explore all features:</p>
                <p class="roprime-welcome-step">Click the gear icon in the Roblox header, then open <strong>RoPrime Settings</strong>.</p>
                <div class="roprime-welcome-mock">
                    <div class="roprime-welcome-mock-header">
                        <span class="roprime-welcome-mock-bell">&#128276;</span>
                        <span class="roprime-welcome-mock-gear">&#9881;</span>
                    </div>
                    <div class="roprime-welcome-mock-menu">
                        <div class="roprime-welcome-mock-item is-active"><img src="${iconSrc}" alt="" width="16" height="16" />RoPrime Settings</div>
                        <div class="roprime-welcome-mock-item">Settings</div>
                        <div class="roprime-welcome-mock-item">Quick Sign In</div>
                        <div class="roprime-welcome-mock-item">Help &amp; Safety</div>
                        <div class="roprime-welcome-mock-item">Switch Accounts</div>
                        <div class="roprime-welcome-mock-item">Logout</div>
                    </div>
                </div>
                <p class="roprime-welcome-footnote">RoPrime is a free Roblox extension focused on quality-of-life improvements.</p>
                <div class="roprime-welcome-actions"><button type="button" class="roprime-welcome-ok">Got It!</button></div>
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
    root.querySelector(".roprime-welcome-close")?.addEventListener("click", dismiss);
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
