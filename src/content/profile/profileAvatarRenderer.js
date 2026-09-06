import { getExtensionResourceUrl, parseUserProfileIdFromLocation } from "../core/core.js";

export const RP_PROFILE_TAB_LAYOUT_ATTR = "data-roprime-profile-tab-layout";
const RP_AVATAR_PREVIEW_ATTR = "data-roprime-avatar-preview";

let modulePromise = null;

function loadAvatarPreviewModule() {
  if (!modulePromise) {
    modulePromise = (async () => {
      const url = getExtensionResourceUrl("avatar-preview.js");
      if (!url) throw new Error("Missing avatar-preview.js URL");
      return import(url);
    })();
  }
  return modulePromise;
}

export function findProfilePlatformContainer() {
  const platform = document.querySelector(".profile-platform-container");
  return platform instanceof HTMLElement ? platform : null;
}

export function findProfilePlatformHost() {
  const platform = findProfilePlatformContainer();
  if (!platform) return null;
  const host = platform.querySelector(":scope > div");
  return host instanceof HTMLElement ? host : platform;
}

/** @deprecated Use findProfilePlatformHost */
export function findProfilePlatformInner() {
  return findProfilePlatformHost();
}

export function findRoPrimeProfileTabLayout() {
  return document.querySelector(`[${RP_PROFILE_TAB_LAYOUT_ATTR}]`);
}

/** @deprecated Prefer findRoPrimeProfileTabLayout */
export function findRoPrimeProfileTabContent() {
  return findRoPrimeProfileTabLayout();
}

export function ensureRoPrimeProfileTabLayout() {
  const platform = findProfilePlatformContainer();
  if (!platform) return null;

  const overlay = platform.querySelector(".profile-header-overlay");
  let layout = findRoPrimeProfileTabLayout();

  if (!(layout instanceof HTMLElement) || !platform.contains(layout)) {
    layout = document.createElement("div");
    layout.className = "roprime-profile-tab-layout padding-top-xxlarge";
    layout.setAttribute(RP_PROFILE_TAB_LAYOUT_ATTR, "1");
  } else {
    layout.classList.add("padding-top-xxlarge");
    layout.setAttribute(RP_PROFILE_TAB_LAYOUT_ATTR, "1");
  }

  if (overlay instanceof HTMLElement && platform.contains(overlay)) {
    if (overlay.nextElementSibling !== layout) {
      overlay.insertAdjacentElement("afterend", layout);
    }
  } else {
    const host = findProfilePlatformHost();
    if (host && layout.parentElement !== host) {
      host.appendChild(layout);
    } else if (!layout.parentElement) {
      platform.appendChild(layout);
    }
  }

  let preview = layout.querySelector(`[${RP_AVATAR_PREVIEW_ATTR}]`);
  if (!(preview instanceof HTMLElement)) {
    preview = document.createElement("div");
    preview.className =
      "roprime-profile-avatar-preview profile-avatar-background-empty-state";
    preview.setAttribute(RP_AVATAR_PREVIEW_ATTR, "1");
    layout.prepend(preview);
  }
  preview.style.setProperty(
    "--empty-state-image-light",
    'url("https://assetdelivery.roblox.com/v1/asset/?id=97634835410357")',
  );
  preview.style.setProperty(
    "--empty-state-image-dark",
    'url("https://assetdelivery.roblox.com/v1/asset/?id=76787651008882")',
  );

  return layout;
}

/** @deprecated Prefer ensureRoPrimeProfileTabLayout */
export function ensureRoPrimeProfileTabContent() {
  return ensureRoPrimeProfileTabLayout();
}

export function removeRoPrimeProfileTabContent() {
  document.querySelector(`[${RP_PROFILE_TAB_LAYOUT_ATTR}]`)?.remove();
  void (async () => {
    try {
      const mod = await loadAvatarPreviewModule();
      await mod.unmountAvatarPreview();
    } catch {
    }
  })();
  modulePromise = null;
}

export async function syncProfileAvatarRenderer() {
  const layout = ensureRoPrimeProfileTabLayout();
  if (!layout) return;

  const preview = layout.querySelector(`[${RP_AVATAR_PREVIEW_ATTR}]`);
  if (!(preview instanceof HTMLElement)) return;
  if (preview.dataset.roprimeAvatarMounted === "1") return;
  if (preview.dataset.roprimeAvatarMounting === "1") return;

  const userId = parseUserProfileIdFromLocation();
  if (!userId) return;

  preview.dataset.roprimeAvatarMounting = "1";
  try {
    const mod = await loadAvatarPreviewModule();
    const ok = await mod.mountAvatarPreview(preview, userId);
    if (ok) {
      preview.dataset.roprimeAvatarMounted = "1";
    } else {
      delete preview.dataset.roprimeAvatarMounting;
    }
  } catch (error) {
    console.warn("Profile avatar preview failed", error);
    delete preview.dataset.roprimeAvatarMounting;
  } finally {
    if (preview.dataset.roprimeAvatarMounted === "1") {
      delete preview.dataset.roprimeAvatarMounting;
    }
  }
}
