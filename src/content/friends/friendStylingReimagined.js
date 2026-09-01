import {
  RP_FRIEND_STYLING_REIMAGNED_STYLE_ID,
  settingsState,
} from "../core/core.js";
import { appendParsedMarkup } from "../ui/dom.js";

const FRIEND_STYLING_REIMAGNED_CSS = `
.friend-carousel-container {
    margin-bottom: 18px !important;
    overflow: visible !important;
    border-radius: 16px !important;
    background: var(--color-surface-300) !important;
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
    background: var(--color-surface-300);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
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

.friend-carousel-container .rologic-presence-offline .avatar-card-image::before,
.friend-carousel-container .rologic-presence-online .avatar-card-image::before,
.friend-carousel-container .rologic-presence-game .avatar-card-image::before,
.friend-carousel-container .rologic-presence-studio .avatar-card-image::before {
    background: var(--color-surface-300) !important;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1) !important;
}
`.trim();

const PIP_WINDOW_CSS = `
:root {
  color-scheme: dark;
  font-family: "Builder Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
}

body {
  margin: 0;
  background: #111216;
  color: #f2f4f5;
}

.roprime-pip-root {
  padding: 16px;
}

.roprime-pip-header h1 {
  margin: 0 0 12px;
  font-size: 20px;
}

.roprime-pip-stats {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.roprime-pip-stat {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.08);
}

.roprime-pip-section {
  margin-bottom: 18px;
}

.roprime-pip-section h2 {
  margin: 0 0 8px;
  font-size: 14px;
  color: #b8bec8;
}

.roprime-pip-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.roprime-pip-friend {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
}

.roprime-pip-friend img {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  object-fit: cover;
}

.roprime-pip-friend-meta {
  min-width: 0;
}

.roprime-pip-friend-name {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.roprime-pip-friend-status {
  font-size: 12px;
  color: #aeb4bd;
}

.roprime-pip-empty {
  font-size: 13px;
  color: #aeb4bd;
}
`.trim();

const GLOW_TILE_SELECTOR = ".friends-carousel-tile";
const FRIEND_CAROUSEL_SELECTOR = ".friend-carousel-container";
const FRIENDS_PANEL_ID = "roprime-friends-reimagined-panel";
const GLOW_PRESENCE_CLASSES = [
  "rologic-presence-offline",
  "rologic-presence-online",
  "rologic-presence-game",
  "rologic-presence-studio",
];

let friendStylingObserver = null;
let friendStylingRafId = null;
let friendsDataCache = null;
let friendsFetchInFlight = null;
let pipWindowRef = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getPresenceClass(tile) {
  const presenceIcon = tile.querySelector('[data-testid="presence-icon"]');
  if (!(presenceIcon instanceof HTMLElement)) return "rologic-presence-offline";
  const presenceText = [
    presenceIcon.getAttribute("class"),
    presenceIcon.getAttribute("title"),
    presenceIcon.ariaLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (presenceText.includes("studio")) return "rologic-presence-studio";
  if (presenceText.includes("game") || presenceText.includes("playing"))
    return "rologic-presence-game";
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

function buildFriendPreviewCard(friend) {
  const headshot = friend.headshotUrl
    ? `<img src="${escapeHtml(friend.headshotUrl)}" alt="" loading="lazy" />`
    : `<img src="" alt="" />`;
  return `
    <div class="roprime-friends-preview-card">
      ${headshot}
      <div class="roprime-friends-preview-meta">
        <div class="roprime-friends-preview-name">${escapeHtml(friend.displayName)}</div>
        <div class="roprime-friends-preview-status">${escapeHtml(friend.statusLabel)}</div>
      </div>
    </div>
  `.trim();
}

function buildPipFriendRow(friend) {
  const headshot = friend.headshotUrl
    ? `<img src="${escapeHtml(friend.headshotUrl)}" alt="" loading="lazy" />`
    : `<img src="" alt="" />`;
  return `
    <div class="roprime-pip-friend">
      ${headshot}
      <div class="roprime-pip-friend-meta">
        <div class="roprime-pip-friend-name">${escapeHtml(friend.displayName)}</div>
        <div class="roprime-pip-friend-status">${escapeHtml(friend.statusLabel)}</div>
      </div>
    </div>
  `.trim();
}

function buildPipSection(title, friends) {
  if (!friends.length) {
    return `
      <section class="roprime-pip-section">
        <h2>${escapeHtml(title)} (0)</h2>
        <div class="roprime-pip-empty">No friends in this section.</div>
      </section>
    `.trim();
  }

  return `
    <section class="roprime-pip-section">
      <h2>${escapeHtml(title)} (${friends.length})</h2>
      <div class="roprime-pip-list">
        ${friends.map((friend) => buildPipFriendRow(friend)).join("")}
      </div>
    </section>
  `.trim();
}

function buildPipMarkup(data) {
  const onlineCount = data.online.length;
  const offlineCount = data.offline.length;
  return `
    <div class="roprime-pip-root">
      <div class="roprime-pip-header">
        <h1>Friends</h1>
      </div>
      <div class="roprime-pip-stats">
        <span class="roprime-pip-stat">Online (${onlineCount})</span>
        <span class="roprime-pip-stat">Offline (${offlineCount})</span>
      </div>
      ${buildPipSection("Online", data.online)}
      ${buildPipSection("Offline", data.offline)}
    </div>
  `.trim();
}

function renderFriendsPanel(data) {
  const carousel = document.querySelector(FRIEND_CAROUSEL_SELECTOR);
  if (!(carousel instanceof HTMLElement)) return;

  let panel = document.getElementById(FRIENDS_PANEL_ID);
  if (!(panel instanceof HTMLElement)) {
    panel = document.createElement("div");
    panel.id = FRIENDS_PANEL_ID;
    panel.className = "roprime-friends-reimagined-panel";
    carousel.parentElement?.insertBefore(panel, carousel);
  }

  const previewFriends = data.friends.slice(0, 8);
  panel.textContent = "";
  appendParsedMarkup(
    panel,
    `
    <div class="roprime-friends-reimagined-header">
      <h2>Friends</h2>
      <button type="button" class="roprime-friends-pip-btn">Open Friends Window</button>
    </div>
    <div class="roprime-friends-reimagined-stats">
      <span class="roprime-friends-stat roprime-friends-stat-online">Online (${data.online.length})</span>
      <span class="roprime-friends-stat roprime-friends-stat-offline">Offline (${data.offline.length})</span>
    </div>
    <div class="roprime-friends-preview-list">
      ${previewFriends.map((friend) => buildFriendPreviewCard(friend)).join("")}
    </div>
  `.trim(),
  );

  panel
    .querySelector(".roprime-friends-pip-btn")
    ?.addEventListener("click", () => {
      void openFriendsPictureInPicture(data);
    });
}

async function openFriendsPictureInPicture(data) {
  if (!window.documentPictureInPicture?.requestWindow) return false;

  try {
    if (pipWindowRef && !pipWindowRef.closed) {
      pipWindowRef.close();
      pipWindowRef = null;
    }

    const pipWindow = await window.documentPictureInPicture.requestWindow({
      width: 360,
      height: 560,
    });
    pipWindowRef = pipWindow;

    const style = pipWindow.document.createElement("style");
    style.textContent = PIP_WINDOW_CSS;
    pipWindow.document.head.appendChild(style);
    pipWindow.document.body.textContent = "";
    appendParsedMarkup(pipWindow.document.body, buildPipMarkup(data));

    pipWindow.addEventListener("pagehide", () => {
      if (pipWindowRef === pipWindow) pipWindowRef = null;
    });
    return true;
  } catch {
    return false;
  }
}

async function refreshFriendsUi({ openPip = false } = {}) {
  if (!settingsState.friendStylingReimagnedEnabled) return;

  if (!friendsFetchInFlight) {
    friendsFetchInFlight = fetchCurrentUserFriends().finally(() => {
      friendsFetchInFlight = null;
    });
  }

  const data = await friendsFetchInFlight;
  if (!data || !settingsState.friendStylingReimagnedEnabled) return;

  friendsDataCache = data;
  renderFriendsPanel(data);
  if (openPip) {
    await openFriendsPictureInPicture(data);
  }
}

function removeFriendsPanel() {
  document.getElementById(FRIENDS_PANEL_ID)?.remove();
}

function closeFriendsPipWindow() {
  if (pipWindowRef && !pipWindowRef.closed) {
    pipWindowRef.close();
  }
  pipWindowRef = null;
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
          (node) =>
            node instanceof Element &&
            (node.matches(FRIEND_CAROUSEL_SELECTOR) ||
              !!node.querySelector(GLOW_TILE_SELECTOR)),
        )
      ) {
        scheduleFriendPresenceRefresh();
        void refreshFriendsUi();
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
  const existingStyle = document.getElementById(
    RP_FRIEND_STYLING_REIMAGNED_STYLE_ID,
  );
  if (!settingsState.friendStylingReimagnedEnabled) {
    stopFriendStylingObserver();
    removeFriendsPanel();
    closeFriendsPipWindow();
    friendsDataCache = null;
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

  if (style.textContent !== FRIEND_STYLING_REIMAGNED_CSS)
    style.textContent = FRIEND_STYLING_REIMAGNED_CSS;
  if (style.parentElement !== document.documentElement)
    document.documentElement.appendChild(style);
  startFriendStylingObserver();
  scheduleFriendPresenceRefresh();
  void refreshFriendsUi({ openPip: true });
}
