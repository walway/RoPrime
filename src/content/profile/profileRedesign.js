import { settingsState, shouldRunRoPrimeOnCurrentPage } from "../core/core.js";
import { debounce } from "../core/debounce.js";
import { isUserProfilePage } from "./profileEffectsDisplay.js";
import {
  ensureRoPrimeProfileTabLayout,
  findProfilePlatformHost,
  findRoPrimeProfileTabLayout,
  removeRoPrimeProfileTabContent,
  syncProfileAvatarRenderer,
} from "./profileAvatarRenderer.js";
import {
  removeProfileWearingCards,
  syncProfileWearingCards,
} from "./profileCurrentlyWearing.js";

export const RP_PROFILE_REDESIGN_STYLE_ID = "roprime-profile-redesign-style";

const BUBBLE_SELECTOR = ".rovalra-status-bubble";
const BUBBLE_LENGTH_VAR = "--rovalra-bubble-length";

const PROFILE_REDESIGN_CSS = `
.currently-wearing-avatar-with-background {
  display: none !important;
}

.currently-wearing-avatar-with-background + .profile-header-overlay {
  margin-top: calc(70px + (var(${BUBBLE_LENGTH_VAR}, 0) * 10px)) !important;
}

.profile-tabs {
  display: none !important;
}

.roprime-profile-tab-layout {
  display: flex;
  align-items: stretch;
  gap: 20px;
  width: 100%;
}

.roprime-profile-avatar-preview {
  width: 50%;
  max-width: 50%;
  flex: 0 0 50%;
  height: 420px;
  min-height: 420px;
  margin-bottom: 24px;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}
`;

let observer = null;
let observedRoot = null;

const scheduleBubbleSync = debounce(syncBubbleLength, 200);
const scheduleProfileShellSync = debounce(runProfileShellSync, 250);

function runProfileShellSync() {
  const layout = ensureRoPrimeProfileTabLayout();
  if (!layout) return;
  // Empty shells first; avatar/wearing fill in as they load.
  void syncProfileAvatarRenderer();
  void syncProfileWearingCards(layout);
  syncBubbleLength();
}

function countBubbleLines(element) {
  const view = element.ownerDocument?.defaultView;
  if (!view) return 0;

  const computed = view.getComputedStyle(element, null);
  const lineHeightValue = computed.getPropertyValue("line-height");
  let lineHeight = parseFloat(lineHeightValue);
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
    const fontSize = parseFloat(computed.getPropertyValue("font-size"));
    lineHeight = Number.isFinite(fontSize) ? fontSize * 1.2 : 16;
  }

  const height = element.getBoundingClientRect().height;
  if (height <= 0) return 0;

  return Math.max(1, Math.round(height / lineHeight));
}

function syncBubbleLength() {
  if (!settingsState.profileRedesignEnabled) {
    document.documentElement.style.removeProperty(BUBBLE_LENGTH_VAR);
    return;
  }

  const bubble = document.querySelector(BUBBLE_SELECTOR);
  if (!bubble) {
    document.documentElement.style.setProperty(BUBBLE_LENGTH_VAR, "0");
    return;
  }

  document.documentElement.style.setProperty(
    BUBBLE_LENGTH_VAR,
    String(countBubbleLines(bubble)),
  );
}

function removeProfileRedesignStyle() {
  document.getElementById(RP_PROFILE_REDESIGN_STYLE_ID)?.remove();
  document.documentElement.style.removeProperty(BUBBLE_LENGTH_VAR);
  removeRoPrimeProfileTabContent();
  removeProfileWearingCards();
}

function injectProfileRedesignStyle() {
  let style = document.getElementById(RP_PROFILE_REDESIGN_STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = RP_PROFILE_REDESIGN_STYLE_ID;
    document.documentElement.appendChild(style);
  }
  style.textContent = PROFILE_REDESIGN_CSS;
}

function mutationsNeedShellSync(mutations) {
  for (const mutation of mutations) {
    if (mutation.type !== "childList") continue;
    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue;
      // Ignore our own wearing/pager churn.
      if (
        node.matches?.(
          "[data-roprime-profile-tab-layout], [data-roprime-wearing-cards], .roprime-profile-avatar-preview, .pager-holder, .item-card, .thumbnail-loader, .avatar-loading-shimmer-overlay",
        ) ||
        node.querySelector?.(
          "[data-roprime-profile-tab-layout], [data-roprime-wearing-cards], .roprime-profile-avatar-preview",
        )
      ) {
        continue;
      }
      return true;
    }
    for (const node of mutation.removedNodes) {
      if (!(node instanceof Element)) continue;
      if (
        node.matches?.(
          "[data-roprime-profile-tab-layout], .profile-platform-container, .profile-header-overlay, .rovalra-status-bubble",
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

function onPlatformMutations(mutations) {
  const shell = findRoPrimeProfileTabLayout();
  const host = findProfilePlatformHost();
  if (!host) {
    scheduleProfileShellSync();
    return;
  }
  if (!shell || !document.querySelector(".profile-platform-container")?.contains(shell)) {
    scheduleProfileShellSync();
    return;
  }
  if (mutationsNeedShellSync(mutations)) {
    scheduleProfileShellSync();
  } else {
    scheduleBubbleSync();
  }
}

export function syncProfileRedesign() {
  if (
    !shouldRunRoPrimeOnCurrentPage() ||
    !isUserProfilePage() ||
    !settingsState.profileRedesignEnabled
  ) {
    disconnectObserver();
    return;
  }

  if (observer) {
    injectProfileRedesignStyle();
    attachObserverToHost();
    scheduleProfileShellSync();
    return;
  }

  connectObserver();
}

function disconnectObserver() {
  scheduleBubbleSync.cancel();
  scheduleProfileShellSync.cancel();
  observer?.disconnect();
  observer = null;
  observedRoot = null;
  removeProfileRedesignStyle();
}

function attachObserverToHost() {
  if (!observer) return;
  const host = findProfilePlatformHost() || document.body;
  if (!host || observedRoot === host) return;
  observer.disconnect();
  observedRoot = host;
  observer.observe(host, {
    childList: true,
    subtree: true,
  });
}

function connectObserver() {
  if (observer) return;

  observer = new MutationObserver(onPlatformMutations);

  if (!document.body) return;

  attachObserverToHost();
  injectProfileRedesignStyle();
  scheduleProfileShellSync();
}

function syncObserverForRoute() {
  syncProfileRedesign();
}

export function installProfileRedesignObserver() {
  if (installProfileRedesignObserver.installed) return;
  installProfileRedesignObserver.installed = true;

  const onRoute = () => {
    syncObserverForRoute();
  };

  window.addEventListener("roprime-location-change", onRoute);
  window.addEventListener("popstate", onRoute);

  if (document.body) syncObserverForRoute();
  else {
    document.addEventListener("DOMContentLoaded", syncObserverForRoute, {
      once: true,
    });
  }
}

import { registerFeature } from "../features/registry.js";
registerFeature(syncProfileRedesign);
