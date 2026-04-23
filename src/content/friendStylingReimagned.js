import { RP_FRIEND_STYLING_REIMAGNED_STYLE_ID, settingsState } from "./core.js";

const FRIEND_STYLING_REIMAGNED_CSS = `
.friend-carousel-container {
    margin-bottom: 18px !important;
    overflow: visible !important;
    border-radius: 16px !important;
    background: linear-gradient(to bottom, #393b41 0%, #2f3136 100%) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.26) !important;
}

.friend-carousel-container .react-friends-carousel-container {
    padding: 12px 12px 10px 12px !important;
}

.friend-carousel-container .friends-carousel-container,
.friend-carousel-container .friends-carousel-list-container-not-full,
.friend-carousel-container .friends-carousel-list-container {
    overflow: visible !important;
    position: relative !important;
}

.friend-carousel-container .container-header.people-list-header {
    margin-bottom: 8px !important;
}

.friend-carousel-container .container-header.people-list-header h2 {
    margin: 0 !important;
}

.friend-carousel-container .avatar-card-image {
    position: relative !important;
    border-radius: 9999px !important;
    overflow: visible !important;
}

.friend-carousel-container .avatar-card-image::before {
    content: "";
    position: absolute;
    inset: -2px;
    border-radius: 9999px;
    background: linear-gradient(to bottom, #edf0f4 0%, #c9ced6 58%, #8c929d 100%);
    box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.1),
        0 0 8px rgba(219, 227, 240, 0.18);
    z-index: 0;
}

.friend-carousel-container .avatar-card-image::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 9999px;
    background: #070b10;
    z-index: 1;
}

.friend-carousel-container .avatar-card-image img {
    position: relative !important;
    border-radius: 9999px !important;
    z-index: 2 !important;
}

.friend-carousel-container .online .icon-online,
.friend-carousel-container .icon-online {
    position: relative !important;
    z-index: 4 !important;
}

.friend-carousel-container .game .icon-game,
.friend-carousel-container .icon-game {
    position: relative !important;
    z-index: 4 !important;
}
.friend-carousel-container .studio .icon-studio,
.friend-carousel-container .icon-studio {
    position: relative !important;
    z-index: 4 !important;
}

.friend-carousel-container .rologic-presence-offline .avatar-card-image::before {
    background: linear-gradient(to bottom, #edf0f4 0%, #c9ced6 58%, #8c929d 100%) !important;
    box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.1),
        0 0 8px rgba(219, 227, 240, 0.18) !important;
}

.friend-carousel-container .rologic-presence-online .avatar-card-image::before {
    background: linear-gradient(to bottom, #90dcff 0%, #4ab3ff 55%, #245dff 100%) !important;
    box-shadow:
        0 0 0 1px rgba(102, 189, 255, 0.52),
        0 0 10px rgba(74, 179, 255, 0.5),
        0 0 22px rgba(36, 93, 255, 0.42) !important;
}

.friend-carousel-container .rologic-presence-game .avatar-card-image::before {
    background: linear-gradient(to bottom, #a2ffbf 0%, #49ee7d 55%, #179a3f 100%) !important;
    box-shadow:
        0 0 0 1px rgba(73, 238, 125, 0.52),
        0 0 10px rgba(73, 238, 125, 0.46),
        0 0 22px rgba(23, 154, 63, 0.36) !important;
}

.friend-carousel-container .rologic-presence-studio .avatar-card-image::before {
    background: linear-gradient(to bottom, #ffd89d 0%, #ffaf4f 55%, #df7419 100%) !important;
    box-shadow:
        0 0 0 1px rgba(255, 175, 79, 0.5),
        0 0 10px rgba(255, 175, 79, 0.45),
        0 0 22px rgba(223, 116, 25, 0.36) !important;
}
`.trim();

const GLOW_TILE_SELECTOR = ".friends-carousel-tile";
const FRIEND_CAROUSEL_SELECTOR = ".friend-carousel-container";
const GLOW_PRESENCE_CLASSES = [
    "rologic-presence-offline",
    "rologic-presence-online",
    "rologic-presence-game",
    "rologic-presence-studio",
];

let friendStylingObserver = null;
let friendStylingRafId = null;

function getPresenceClass(tile) {
    const presenceIcon = tile.querySelector('[data-testid="presence-icon"]');
    if (!(presenceIcon instanceof HTMLElement)) return "rologic-presence-offline";
    const presenceText = [presenceIcon.getAttribute("class"), presenceIcon.getAttribute("title"), presenceIcon.ariaLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
    if (presenceText.includes("studio")) return "rologic-presence-studio";
    if (presenceText.includes("game") || presenceText.includes("playing")) return "rologic-presence-game";
    if (presenceText.includes("online")) return "rologic-presence-online";
    return "rologic-presence-offline";
}

function applyFriendPresenceClasses() {
    document.querySelectorAll(GLOW_TILE_SELECTOR).forEach((tile) => {
        if (!(tile instanceof HTMLElement)) return;
        const nextPresenceClass = getPresenceClass(tile);
        if (tile.dataset.rpPresenceClass === nextPresenceClass) return;
        tile.classList.remove(...GLOW_PRESENCE_CLASSES);
        tile.classList.add(nextPresenceClass);
        tile.dataset.rpPresenceClass = nextPresenceClass;
    });
}

function scheduleFriendPresenceRefresh() {
    if (friendStylingRafId !== null) return;
    friendStylingRafId = window.requestAnimationFrame(() => {
        friendStylingRafId = null;
        if (!settingsState.friendStylingReimagnedEnabled) return;
        applyFriendPresenceClasses();
    });
}

function startFriendStylingObserver() {
    if (friendStylingObserver instanceof MutationObserver) return;
    if (!(document.body instanceof HTMLBodyElement)) return;
    friendStylingObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (!(mutation.target instanceof Element)) continue;
            if (
                mutation.target.closest(FRIEND_CAROUSEL_SELECTOR) ||
                Array.from(mutation.addedNodes).some(
                    (node) => node instanceof Element && (node.matches(FRIEND_CAROUSEL_SELECTOR) || !!node.querySelector(GLOW_TILE_SELECTOR)),
                )
            ) {
                scheduleFriendPresenceRefresh();
                return;
            }
        }
    });
    friendStylingObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "title", "aria-label"],
    });
}

function stopFriendStylingObserver() {
    if (friendStylingObserver instanceof MutationObserver) {
        friendStylingObserver.disconnect();
        friendStylingObserver = null;
    }
    if (friendStylingRafId !== null) {
        window.cancelAnimationFrame(friendStylingRafId);
        friendStylingRafId = null;
    }
}

export function updateFriendStylingReimagnedVisibility() {
    const existingStyle = document.getElementById(RP_FRIEND_STYLING_REIMAGNED_STYLE_ID);
    if (!settingsState.friendStylingReimagnedEnabled) {
        stopFriendStylingObserver();
        if (existingStyle instanceof HTMLStyleElement) existingStyle.remove();
        document.querySelectorAll(GLOW_TILE_SELECTOR).forEach((tile) => {
            if (!(tile instanceof HTMLElement)) return;
            tile.classList.remove(...GLOW_PRESENCE_CLASSES);
            delete tile.dataset.rpPresenceClass;
        });
        return;
    }

    let style = existingStyle;
    if (!(style instanceof HTMLStyleElement)) {
        style = document.createElement("style");
        style.id = RP_FRIEND_STYLING_REIMAGNED_STYLE_ID;
        style.textContent = FRIEND_STYLING_REIMAGNED_CSS;
        document.documentElement.appendChild(style);
    }

    if (style.textContent !== FRIEND_STYLING_REIMAGNED_CSS) style.textContent = FRIEND_STYLING_REIMAGNED_CSS;
    if (style.parentElement !== document.documentElement) document.documentElement.appendChild(style);
    startFriendStylingObserver();
    scheduleFriendPresenceRefresh();
}
