import {
  buildRoPrimeSettingsFullUrl,
  buildManifestExtensionIconUrl,
  getRobloxLocalePathPrefix,
  isAccountPage,
  isExtensionContextAlive,
} from "../core/core.js";
import { fetchExtensionIconUrl } from "../lib/cws-images.js";
import { runWhenIdle } from "../features/runWhenIdle.js";
import { showMaliciousPluginOverlay } from "../ui/overlay.js";
import { attachTooltip } from "../ui/tooltip.js";
import { appendParsedMarkup, createSvgIcon } from "../ui/dom.js";
import { fetchExtensionsRegistry } from "./registry.js";
import {
  createToggle,
  getToggleChecked,
  setToggleChecked,
} from "../ui/toggle.js";

const extensionApi = globalThis.browser || globalThis.chrome;

const PANEL_ID = "roprime-extensions-panel";
const OPEN_KEY = "roprimeExtensionsPanelOpen";
const MENU_ENTRY_ATTR = "data-roprime-account-extensions-entry";

const NON_STORE_INSTALL_TYPES = new Set(["development", "sideload", "other"]);

const EXTENSIONS_LOADING_MARKUP = `
<div class="flex width-full justify-center padding-y-small"><div class="foundation-web-progress-circle inline-flex items-center justify-center" role="progressbar" aria-label="Loading" style="width: 32px; height: 32px;"><svg width="32" height="32" viewBox="0 0 32 32" class="relative"><circle cx="16" cy="16" r="14.5" fill="none" stroke-width="3" style="stroke: var(--color-shift-200);"></circle><circle cx="16" cy="16" r="14.5" fill="none" stroke-width="3" stroke-dasharray="68.329640215578 22.776546738526" stroke-dashoffset="0" stroke-linecap="round" class="foundation-web-progress-circle-indeterminate" style="stroke: var(--fui-future-alpha-color-system-progress); transform-origin: 50% 50%;"></circle></svg></div></div>
`.trim();

let refreshSeq = 0;
let refreshInProgress = false;
let refreshRequested = false;
let menuHighlightObserver = null;
let menuHighlightIdlePending = false;
let panelHost = null;
const cwsIconUrlCache = new Map();
const cwsIconFetchPromises = new Map();

async function sendToBackground(message) {
  return await new Promise((resolve) => {
    try {
      if (!isExtensionContextAlive() || !extensionApi.runtime?.sendMessage) {
        return resolve(null);
      }
      extensionApi.runtime.sendMessage(message, (resp) => {
        resolve(resp ?? null);
      });
    } catch {
      resolve(null);
    }
  });
}

async function hasManagementPermission() {
  const resp = await sendToBackground({ type: "ROPRIME_MANAGEMENT_STATUS" });
  return Boolean(resp?.ok && resp?.granted);
}

function buildAccountUrl(suffixAfterMyAccount) {
  const prefix = getRobloxLocalePathPrefix();
  const suffix = String(suffixAfterMyAccount || "");
  return `${window.location.origin}${prefix}/my/account${suffix}`;
}

function buildSettingsUrl(entry) {
  if (entry.settingsPath === "__roprime__")
    return buildRoPrimeSettingsFullUrl();
  if (!entry.settingsPath) return "";
  return buildAccountUrl(entry.settingsPath);
}

function getHost() {
  const native = document.querySelector(
    "#react-user-account-base .tab-pane.active, #react-user-account-base .tab-pane",
  );
  if (
    native instanceof HTMLElement &&
    !native.closest("#roprime-settings-host")
  ) {
    return native;
  }
  return null;
}

function queryExtensionsMenuLink() {
  return (
    document.querySelector(`[${MENU_ENTRY_ATTR}="1"] a.menu-option-content`) ||
    document.querySelector(`[${MENU_ENTRY_ATTR}="1"] .menu-option-content`)
  );
}

function setExtensionsMenuActive(active) {
  const link = queryExtensionsMenuLink();
  if (!(link instanceof HTMLElement)) return;
  if (active) {
    if (!link.classList.contains("active")) link.classList.add("active");
    if (link.getAttribute("aria-current") !== "page") {
      link.setAttribute("aria-current", "page");
    }
  } else {
    if (link.classList.contains("active")) link.classList.remove("active");
    if (link.hasAttribute("aria-current")) {
      link.removeAttribute("aria-current");
    }
  }
}

function setExtensionsLoading(tiles) {
  if (!(tiles instanceof HTMLElement)) return;
  tiles.textContent = "";
  appendParsedMarkup(tiles, EXTENSIONS_LOADING_MARKUP);
}

function clearExtensionsTiles(tiles) {
  if (!(tiles instanceof HTMLElement)) return;
  tiles.textContent = "";
}

function appendExtensionIconImg(fallback, iconUrl) {
  if (!(fallback instanceof HTMLElement) || !iconUrl) return false;

  const img = document.createElement("img");
  img.alt = "";
  img.src = iconUrl;
  img.referrerPolicy = "no-referrer";
  img.addEventListener(
    "error",
    () => {
      img.remove();
    },
    { once: true },
  );
  fallback.appendChild(img);
  return true;
}

async function resolveCwsIconUrl(extensionId) {
  const id = String(extensionId || "")
    .trim()
    .toLowerCase();
  if (!id) return "";

  if (cwsIconUrlCache.has(id)) {
    return cwsIconUrlCache.get(id);
  }

  let pending = cwsIconFetchPromises.get(id);
  if (!pending) {
    pending = fetchExtensionIconUrl(id, "s48")
      .then((url) => {
        const iconUrl = String(url || "");
        cwsIconUrlCache.set(id, iconUrl);
        return iconUrl;
      })
      .catch(() => {
        cwsIconUrlCache.set(id, "");
        return "";
      })
      .finally(() => {
        cwsIconFetchPromises.delete(id);
      });
    cwsIconFetchPromises.set(id, pending);
  }

  return await pending;
}

function shouldUseRegistryIdForCwsIcon(installType, registryId) {
  const storeId = String(registryId || "").trim();
  if (!storeId) return false;
  return NON_STORE_INSTALL_TYPES.has(
    String(installType || "")
      .trim()
      .toLowerCase(),
  );
}

async function setExtensionIcon(
  iconHost,
  extensionId,
  iconPath = "",
  { registryId = "", installType = "" } = {},
) {
  const fallback = iconHost.querySelector(".roprime-ext-icon-fallback");
  if (!(fallback instanceof HTMLElement)) return;

  fallback.textContent = "";
  const id = String(extensionId || "").trim();
  if (!id) return;

  const cwsLookupId = shouldUseRegistryIdForCwsIcon(installType, registryId)
    ? String(registryId).trim()
    : id;
  const cwsIconUrl = await resolveCwsIconUrl(cwsLookupId);
  if (appendExtensionIconImg(fallback, cwsIconUrl)) return;

  appendExtensionIconImg(fallback, buildManifestExtensionIconUrl(id, iconPath));
}

function startMenuHighlightObserver() {
  if (menuHighlightObserver) return;
  const link = queryExtensionsMenuLink();
  if (!(link instanceof HTMLElement)) return;

  menuHighlightObserver = new MutationObserver(() => {
    if (!isOpen()) return;
    if (document.visibilityState === "hidden") return;
    if (menuHighlightIdlePending) return;
    menuHighlightIdlePending = true;
    runWhenIdle(() => {
      menuHighlightIdlePending = false;
      if (!isOpen()) return;
      setExtensionsMenuActive(true);
    }, 450);
  });
  menuHighlightObserver.observe(link, {
    attributes: true,
    attributeFilter: ["class", "aria-current"],
  });
}

function stopMenuHighlightObserver() {
  menuHighlightObserver?.disconnect();
  menuHighlightObserver = null;
  menuHighlightIdlePending = false;
}

async function scanForMaliciousExtensions() {
  const granted = await hasManagementPermission();
  if (!granted) return;

  const registry = await fetchExtensionsRegistry();
  await handleMaliciousExtensions(registry);
}

async function handleMaliciousExtensions(registry) {
  const maliciousEntries = registry.filter((entry) => entry.malicious);
  if (!maliciousEntries.length) {
    return { removedAny: false, uninstalledKeys: new Set() };
  }

  const resp = await sendToBackground({
    type: "ROPRIME_GET_WANTED_EXTENSIONS",
    registry: maliciousEntries,
    pageLang: document.documentElement.getAttribute("lang") || "",
  });
  if (!resp?.ok || !Array.isArray(resp.plugins)) {
    return { removedAny: false, uninstalledKeys: new Set() };
  }

  let removedAny = false;
  const uninstalledKeys = new Set();

  for (const plugin of resp.plugins) {
    const item = plugin?.item;
    if (!item?.id) continue;

    const pluginName = String(item.name || plugin.key || "Extension");
    const extensionId = String(item.id);

    const deleted = await showMaliciousPluginOverlay(pluginName, async () => {
      const uninstallResp = await sendToBackground({
        type: "ROPRIME_UNINSTALL_EXTENSION",
        id: extensionId,
        showConfirmDialog: true,
      });
      return Boolean(uninstallResp?.ok);
    });

    if (deleted) {
      removedAny = true;
      uninstalledKeys.add(String(plugin.key || ""));
    }
  }

  return { removedAny, uninstalledKeys };
}

function restoreHostChildren(host) {
  if (!(host instanceof HTMLElement)) return;
  host.querySelectorAll(":scope > *").forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    const prev = child.getAttribute("data-roprime-prev-display");
    if (prev !== null) {
      child.style.display = prev;
      child.removeAttribute("data-roprime-prev-display");
    } else if (child.style.display === "none") {
      child.style.display = "";
    }
  });
}

function hideHostChildren(host, panel) {
  host.querySelectorAll(":scope > *").forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    if (child === panel) return;
    if (!child.hasAttribute("data-roprime-prev-display")) {
      child.setAttribute(
        "data-roprime-prev-display",
        child.style.display || "",
      );
    }
    child.style.display = "none";
  });
}

function ensureExtensionsPanel(host) {
  let panel = document.getElementById(PANEL_ID);
  if (!(panel instanceof HTMLElement)) {
    panel = document.createElement("div");
    panel.id = PANEL_ID;
    const section = document.createElement("div");
    section.className = "setting-section";
    const header = document.createElement("div");
    header.className = "container-header";
    const h2 = document.createElement("h2");
    h2.className = "setting-section-header";
    h2.textContent = "Extensions";
    header.appendChild(h2);
    const tiles = document.createElement("div");
    tiles.className = "roprime-extensions-tiles";
    tiles.dataset.roprimeExtensionsTiles = "1";
    section.append(header, tiles);
    panel.appendChild(section);
    host.appendChild(panel);
  } else if (panel.parentElement !== host) {
    host.appendChild(panel);
  }
  const sectionHeader = panel.querySelector(".setting-section-header");
  if (
    sectionHeader instanceof HTMLElement &&
    !sectionHeader.dataset.roprimeTooltipBound
  ) {
    sectionHeader.dataset.roprimeTooltipBound = "1";
    attachTooltip(sectionHeader, { text: "Test", placement: "top" });
  }
  panel.style.display = "block";
  return panel;
}

function requestExtensionsRefresh(tiles) {
  refreshRequested = true;
  refreshSeq++;
  const mySeq = refreshSeq;
  if (refreshInProgress) return;

  refreshInProgress = true;
  (async () => {
    while (refreshRequested) {
      refreshRequested = false;
      const seqAtStart = refreshSeq;
      await refreshExtensionsTiles(tiles);
      if (refreshSeq !== seqAtStart) continue;
      if (seqAtStart !== mySeq) {
        // noop
      }
    }
    refreshInProgress = false;
  })();
}

async function refreshExtensionsTiles(tiles) {
  const seqAtCall = refreshSeq;
  setExtensionsLoading(tiles);

  const granted = await hasManagementPermission();
  if (seqAtCall !== refreshSeq) return;
  if (!granted) {
    clearExtensionsTiles(tiles);
    return;
  }

  const registry = await fetchExtensionsRegistry();
  if (seqAtCall !== refreshSeq) return;

  const maliciousResult = await handleMaliciousExtensions(registry);
  if (seqAtCall !== refreshSeq) return;

  const safeRegistry = registry.filter((entry) => {
    if (!entry.malicious) return true;
    return !maliciousResult.uninstalledKeys.has(String(entry.key || ""));
  });
  const resp = await sendToBackground({
    type: "ROPRIME_GET_WANTED_EXTENSIONS",
    registry: safeRegistry,
    pageLang: document.documentElement.getAttribute("lang") || "",
  });
  if (seqAtCall !== refreshSeq) return;
  if (!(tiles instanceof HTMLElement)) return;
  if (!resp?.ok || !Array.isArray(resp.plugins)) {
    clearExtensionsTiles(tiles);
    return;
  }

  clearExtensionsTiles(tiles);

  for (const plugin of resp.plugins) {
    if (seqAtCall !== refreshSeq) return;

    const item = plugin?.item;
    if (!item) continue;

    const title = String(item.name || plugin.key || "Extension");
    const description = String(item.description || "").trim();
    const settingsClass = String(plugin.class || "").trim();
    const settingsUrl = settingsClass ? "" : buildSettingsUrl(plugin);

    const tile = document.createElement("div");
    tile.className = "roprime-ext-tile";
    tile.setAttribute("data-installed", "1");

    const top = document.createElement("div");
    top.className = "roprime-ext-tile-top";

    const icon = document.createElement("div");
    icon.className = "roprime-ext-icon";

    const fallback = document.createElement("div");
    fallback.className = "roprime-ext-icon-fallback";
    icon.appendChild(fallback);
    void setExtensionIcon(
      icon,
      String(item.id || ""),
      String(item.iconPath || ""),
      {
        registryId: String(plugin.id || ""),
        installType: String(item.installType || ""),
      },
    );

    const meta = document.createElement("div");
    meta.className = "roprime-ext-tile-meta";

    const t = document.createElement("div");
    t.className = "roprime-ext-title";
    t.textContent = title;

    const s = document.createElement("div");
    s.className = "roprime-ext-sub";
    s.textContent = description;
    s.title = description;

    meta.append(t, s);
    top.append(icon, meta);

    const divider = document.createElement("div");
    divider.className = "roprime-ext-divider";

    const actions = document.createElement("div");
    actions.className = "roprime-ext-actions";

    const left = document.createElement("div");
    left.className = "roprime-ext-actions-left";

    const infoBtn = document.createElement("button");
    infoBtn.type = "button";
    infoBtn.className = "btn-control-md roprime-ext-btn roprime-ext-btn-ghost";
    infoBtn.setAttribute("aria-label", "Info");
    infoBtn.title = "Info";
    infoBtn.appendChild(
      createSvgIcon(
        [
          "M45 199h-6c-4.4 0-8 3.6-8 8v14h14c4.4 0 8-3.6 8-8v-6c0-4.5-3.6-8-8-8m6 14c0 3.3-2.7 6-6 6H33v-12c0-3.3 2.7-6 6-6h6c3.3 0 6 2.7 6 6z",
          "M47 209H37c-.6 0-1 .4-1 1 0 .5.4.9.9 1H47c.6 0 1-.4 1-1s-.4-1-1-1M47 205H37c-.6 0-1 .4-1 1 0 .5.4.9.9 1H47c.6 0 1-.4 1-1s-.4-1-1-1M42 213h-5c-.6 0-1 .4-1 1s.4 1 1 1h5c.6 0 1-.4 1-1s-.4-1-1-1",
        ],
        { viewBox: "31 199 22 22" },
      ),
    );
    infoBtn.addEventListener("click", () => {
      const enabledText = item.enabled ? "Enabled" : "Disabled";
      window.alert(
        `${title}\n\n${description}\n\nStatus: ${enabledText}\nID: ${String(item.id || "")}`,
      );
    });

    left.appendChild(infoBtn);

    const right = document.createElement("div");
    right.className = "roprime-ext-actions-right";

    const canToggle = !plugin.noToggle;
    if (canToggle) {
      const toggleWrap = createToggle({
        checked: Boolean(item.enabled),
        ariaLabel: `Toggle ${title}`,
      });

      const toggleButton = toggleWrap.querySelector("button.btn-toggle");
      if (toggleButton instanceof HTMLButtonElement) {
        toggleButton.addEventListener("click", async () => {
          if (toggleButton.disabled) return;
          const desired = toggleButton.getAttribute("aria-checked") !== "true";
          setToggleChecked(toggleWrap, desired);
          toggleButton.disabled = true;
          const resp2 = await sendToBackground({
            type: "ROPRIME_SET_EXTENSION_ENABLED",
            id: String(item.id || ""),
            enabled: desired,
          });
          if (!resp2?.ok) {
            setToggleChecked(toggleWrap, !desired);
          } else {
            item.enabled = desired;
          }
          toggleButton.disabled = false;
        });
      }

      right.appendChild(toggleWrap);
    }

    const settingsBtn = document.createElement("button");
    settingsBtn.type = "button";
    settingsBtn.className = settingsClass
      ? `btn-control-md roprime-ext-btn ${settingsClass}`
      : "btn-control-md roprime-ext-btn";
    settingsBtn.setAttribute("aria-label", "Settings");
    settingsBtn.title = "Settings";
    settingsBtn.appendChild(
      createSvgIcon(
        [
          "M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3z",
        ],
        {
          viewBox: "0 0 24 24",
          className:
            "MuiSvgIcon-root MuiSvgIcon-fontSizeMedium svg-icon css-o5v4k8",
        },
      ),
    );

    if (settingsClass) {
      settingsBtn.disabled = false;
    } else {
      settingsBtn.disabled = !settingsUrl;
      settingsBtn.addEventListener("click", () => {
        if (!settingsUrl) return;
        window.location.assign(settingsUrl);
      });
    }

    right.appendChild(settingsBtn);
    actions.append(left, right);

    tile.append(top, divider, actions);
    tiles.appendChild(tile);
  }
}

function openPanel() {
  if (!isAccountPage()) return;
  const host = getHost();
  if (!(host instanceof HTMLElement)) return;

  sessionStorage.setItem(OPEN_KEY, "1");
  host.setAttribute("data-roprime-extensions-open", "1");
  setExtensionsMenuActive(true);
  startMenuHighlightObserver();

  const panel = ensureExtensionsPanel(host);
  panelHost = host;
  hideHostChildren(host, panel);

  const tiles = panel.querySelector('[data-roprime-extensions-tiles="1"]');
  if (!(tiles instanceof HTMLElement)) return;

  requestExtensionsRefresh(tiles);
}

function closePanel() {
  sessionStorage.removeItem(OPEN_KEY);
  refreshSeq++;
  refreshRequested = false;
  stopMenuHighlightObserver();

  const host = panelHost || getHost();
  panelHost = null;
  if (!(host instanceof HTMLElement)) {
    document.getElementById(PANEL_ID)?.remove();
    setExtensionsMenuActive(false);
    return;
  }

  host.removeAttribute("data-roprime-extensions-open");
  document.getElementById(PANEL_ID)?.remove();
  setExtensionsMenuActive(false);
  restoreHostChildren(host);
}

function isOpen() {
  return sessionStorage.getItem(OPEN_KEY) === "1";
}

function isExtensionsHashRoute() {
  const hash = (window.location.hash || "").toLowerCase();
  return hash === "#!/extensions" || hash === "#!/plugins";
}

let bound = false;
export function initExtensionsPanel() {
  if (bound) return;
  bound = true;

  window.addEventListener("roprime-open-extensions-panel", () => openPanel());

  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      if (!isOpen()) return;
      if (event.target.closest(`#${PANEL_ID}`)) return;
      if (event.target.closest(`[${MENU_ENTRY_ATTR}="1"]`)) return;
      const menuLink = event.target.closest(
        'ul[role="tablist"] a.menu-option-content',
      );
      if (!menuLink) return;
      closePanel();
    },
    true,
  );

  const onRoute = () => {
    if (!isAccountPage()) {
      if (isOpen()) closePanel();
      return;
    }
    if (isExtensionsHashRoute()) {
      if (!isOpen()) openPanel();
      return;
    }
    if (isOpen()) closePanel();
    setExtensionsMenuActive(false);
  };

  window.addEventListener("popstate", onRoute);
  window.addEventListener("hashchange", onRoute);
  window.addEventListener("roprime-location-change", onRoute);
  onRoute();
  void scanForMaliciousExtensions();
}
