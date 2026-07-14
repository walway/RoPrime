import {
  buildRoPrimeSettingsFullUrl,
  getRobloxLocalePathPrefix,
  isAccountPage,
  isExtensionContextAlive,
} from "../core/core.js";
import { runWhenIdle } from "../features/runWhenIdle.js";

const extensionApi = globalThis.browser || globalThis.chrome;

const PANEL_ID = "roprime-plugins-panel";
const OPEN_KEY = "roprimePluginsPanelOpen";

let refreshSeq = 0;
let refreshInProgress = false;
let refreshRequested = false;

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

function getHost() {
  return document.querySelector(".tab-pane");
}

function setPluginsMenuActive(active) {
  const menu =
    document.querySelector('ul[role="tablist"]') ||
    document.querySelector("ul.menu-vertical");
  if (menu instanceof HTMLElement && active) {
    menu.querySelectorAll("a.menu-option-content").forEach((link) => {
      if (!(link instanceof HTMLElement)) return;
      link.classList.remove("active");
      link.removeAttribute("aria-current");
    });
  }
  const link =
    document.querySelector(
      '[data-roprime-account-plugins-entry="1"] a.menu-option-content',
    ) ||
    document.querySelector(
      '[data-roprime-account-plugins-entry="1"] .menu-option-content',
    );
  if (!(link instanceof HTMLElement)) return;
  if (active) {
    link.classList.add("active");
    link.setAttribute("aria-current", "page");
  } else {
    link.classList.remove("active");
    link.removeAttribute("aria-current");
  }
}

function openPanel() {
  if (!isAccountPage()) return;
  const host = getHost();
  if (!(host instanceof HTMLElement)) return;

  sessionStorage.setItem(OPEN_KEY, "1");
  host.setAttribute("data-roprime-plugins-open", "1");
  setPluginsMenuActive(true);

  host.querySelectorAll(":scope > *").forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    if (child.id === PANEL_ID) return;
    if (!child.hasAttribute("data-roprime-prev-display")) {
      child.setAttribute(
        "data-roprime-prev-display",
        child.style.display || "",
      );
    }
    child.style.display = "none";
  });

  let panel = document.getElementById(PANEL_ID);
  if (!(panel instanceof HTMLElement)) {
    panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="setting-section">
        <div class="container-header">
          <h2 class="setting-section-header">Plugins</h2>
        </div>
          <div class="roprime-plugins-tiles" data-roprime-plugins-tiles="1"></div>
      </div>
    `.trim();
    host.appendChild(panel);
  } else if (panel.parentElement !== host) {
    host.appendChild(panel);
  }

  panel.style.display = "block";

  const btn = panel.querySelector('[data-roprime-plugins-grant="1"]');
  const tiles = panel.querySelector('[data-roprime-plugins-tiles="1"]');
  const permissionCard = btn?.closest(".roprime-setting-card");
  const refresh = async () => {
    const seqAtCall = refreshSeq;
    if (tiles instanceof HTMLElement) tiles.textContent = "";

    const granted = await hasManagementPermission();
    if (seqAtCall !== refreshSeq) return;

    if (!granted) {
      if (permissionCard instanceof HTMLElement)
        permissionCard.style.display = "";
      return;
    }

    const resp = await sendToBackground({
      type: "ROPRIME_GET_WANTED_EXTENSIONS",
    });
    if (seqAtCall !== refreshSeq) return;
    if (!(tiles instanceof HTMLElement)) return;
    if (permissionCard instanceof HTMLElement)
      permissionCard.style.display = "none";
    if (!resp?.ok) return;

    const wanted = [
      { key: "rovalra", title: "RoValra", item: resp.rovalra || null },
      { key: "roseal", title: "RoSeal", item: resp.roseal || null },
      { key: "robloxqol", title: "RoQol", item: resp.robloxqol || null },
      { key: "roprime", title: "RoPrime", item: resp.roprime || null },
    ];

    const settingsUrlByKey = {
      rovalra: buildAccountUrl("?rovalra=info#!/info"),
      roseal: buildAccountUrl("?roseal=features_home#!/info"),
      robloxqol: buildAccountUrl("?tab=robloxqol&option=General"),
      roprime: buildRoPrimeSettingsFullUrl(),
    };

    for (const { key, title, item } of wanted) {
      if (seqAtCall !== refreshSeq) return;
      const installed = Boolean(item);
      if (!installed) continue;

      const sub = String(item.name || title);
      const settingsUrl = settingsUrlByKey[key] || "";

      const tile = document.createElement("div");
      tile.className = "roprime-ext-tile";
      tile.setAttribute("data-installed", installed ? "1" : "0");

      const top = document.createElement("div");
      top.className = "roprime-ext-tile-top";

      const icon = document.createElement("div");
      icon.className = "roprime-ext-icon";

      const fallback = document.createElement("div");
      fallback.className = "roprime-ext-icon-fallback";
      icon.appendChild(fallback);
      fallback.style.display = "";

      const meta = document.createElement("div");
      meta.className = "roprime-ext-tile-meta";

      const t = document.createElement("div");
      t.className = "roprime-ext-title";
      t.textContent = title;

      const s = document.createElement("div");
      s.className = "roprime-ext-sub";
      s.textContent = sub;

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
      infoBtn.className =
        "btn-control-md roprime-ext-btn roprime-ext-btn-ghost";
      infoBtn.setAttribute("aria-label", "Info");
      infoBtn.title = "Info";
      infoBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="31 199 22 22" aria-hidden="true" focusable="false">
          <g id="messages-hover">
            <path d="M45 199h-6c-4.4 0-8 3.6-8 8v14h14c4.4 0 8-3.6 8-8v-6c0-4.5-3.6-8-8-8m6 14c0 3.3-2.7 6-6 6H33v-12c0-3.3 2.7-6 6-6h6c3.3 0 6 2.7 6 6z" class="st0"></path>
            <path d="M47 209H37c-.6 0-1 .4-1 1 0 .5.4.9.9 1H47c.6 0 1-.4 1-1s-.4-1-1-1M47 205H37c-.6 0-1 .4-1 1 0 .5.4.9.9 1H47c.6 0 1-.4 1-1s-.4-1-1-1M42 213h-5c-.6 0-1 .4-1 1s.4 1 1 1h5c.6 0 1-.4 1-1s-.4-1-1-1" class="st0"></path>
          </g>
        </svg>
      `.trim();
      infoBtn.addEventListener("click", () => {
        const enabledText = installed
          ? item.enabled
            ? "Enabled"
            : "Disabled"
          : "Not installed";
        const nameText = installed ? String(item.name || title) : title;
        const idText = installed ? String(item.id || "") : "";
        window.alert(
          `${nameText}\n\nStatus: ${enabledText}${idText ? `\nID: ${idText}` : ""}`,
        );
      });

      left.appendChild(infoBtn);

      const right = document.createElement("div");
      right.className = "roprime-ext-actions-right";

      const canToggle = key !== "roprime";
      let toggleWrap = null;
      if (canToggle) {
        toggleWrap = document.createElement("label");
        toggleWrap.className = "roprime-switch";
        toggleWrap.title = "Enable/Disable";

        const toggle = document.createElement("input");
        toggle.type = "checkbox";
        toggle.checked = Boolean(item.enabled);

        const slider = document.createElement("span");
        slider.className = "roprime-switch-slider";

        toggleWrap.append(toggle, slider);

        toggle.addEventListener("change", async () => {
          toggle.disabled = true;
          const desired = Boolean(toggle.checked);
          const resp2 = await sendToBackground({
            type: "ROPRIME_SET_EXTENSION_ENABLED",
            id: String(item.id || ""),
            enabled: desired,
          });
          if (!resp2?.ok) {
            toggle.checked = !desired;
          } else {
            item.enabled = desired;
          }
          toggle.disabled = false;
        });
      }

      const settingsBtn = document.createElement("button");
      settingsBtn.type = "button";
      settingsBtn.className = "btn-control-md roprime-ext-btn";
      settingsBtn.setAttribute("aria-label", "Settings");
      settingsBtn.title = "Settings";
      settingsBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="MuiSvgIcon-root MuiSvgIcon-fontSizeMedium MuiSvgIcon-root MuiSvgIcon-fontSizeMedium svg-icon css-o5v4k8" tabindex="-1" viewBox="0 0 24 24" style="width: 18px; height: 18px;"><path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3z"/></svg>
      `.trim();
      settingsBtn.disabled = !settingsUrl;
      settingsBtn.addEventListener("click", () => {
        if (!settingsUrl) return;
        window.location.assign(settingsUrl);
      });

      if (toggleWrap) right.appendChild(toggleWrap);
      right.appendChild(settingsBtn);
      actions.append(left, right);

      tile.append(top, divider, actions);
      tiles.appendChild(tile);
    }
  };

  if (btn instanceof HTMLElement && !btn.hasAttribute("data-roprime-bound")) {
    btn.setAttribute("data-roprime-bound", "1");

    const activate = async () => {
      if (btn.getAttribute("aria-disabled") === "true") return;
      btn.setAttribute("aria-disabled", "true");
      btn.setAttribute("data-disabled", "1");
      const resp = await sendToBackground({
        type: "ROPRIME_REQUEST_MANAGEMENT",
      });
      if (!resp?.ok || !resp?.granted) {
        btn.setAttribute("aria-disabled", "false");
        btn.removeAttribute("data-disabled");
        return;
      }
      await refresh();
    };

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      void activate();
    });
    btn.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      void activate();
    });
  }

  refreshRequested = true;
  refreshSeq++;
  const mySeq = refreshSeq;
  if (!refreshInProgress) {
    refreshInProgress = true;
    (async () => {
      while (refreshRequested) {
        refreshRequested = false;
        const seqAtStart = refreshSeq;
        await refresh();
        if (refreshSeq !== seqAtStart) continue;
        if (seqAtStart !== mySeq) {
          // noop
        }
      }
      refreshInProgress = false;
    })();
  }
}

function closePanel() {
  sessionStorage.removeItem(OPEN_KEY);
  const host = getHost();
  if (!(host instanceof HTMLElement)) return;
  host.removeAttribute("data-roprime-plugins-open");
  document.getElementById(PANEL_ID)?.remove();
  setPluginsMenuActive(false);

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

function isOpen() {
  return sessionStorage.getItem(OPEN_KEY) === "1";
}

function isPluginsHashRoute() {
  return (window.location.hash || "").toLowerCase() === "#!/plugins";
}

let bound = false;
export function initPluginsPanel() {
  if (bound) return;
  bound = true;

  window.addEventListener("roprime-open-plugins-panel", () => openPanel());

  let menuHighlightIdlePending = false;
  const observer = new MutationObserver(() => {
    if (!isOpen()) return;
    if (document.visibilityState === "hidden") return;
    if (menuHighlightIdlePending) return;
    menuHighlightIdlePending = true;
    runWhenIdle(() => {
      menuHighlightIdlePending = false;
      if (!isOpen()) return;
      setPluginsMenuActive(true);
    }, 450);
  });
  if (document.body instanceof HTMLBodyElement) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('[data-roprime-account-plugins-entry="1"]'))
        return;
      const menuLink = event.target.closest(
        'ul[role="tablist"] a.menu-option-content',
      );
      if (!menuLink) return;
      if (!isOpen()) return;
      closePanel();
    },
    true,
  );

  const onRoute = () => {
    if (!isAccountPage()) {
      if (isOpen()) closePanel();
      return;
    }
    if (isPluginsHashRoute() && !isOpen()) {
      openPanel();
      return;
    }
    if (isOpen()) {
      openPanel();
      return;
    }
    setPluginsMenuActive(false);
  };

  window.addEventListener("popstate", onRoute);
  window.addEventListener("roprime-location-change", onRoute);
  onRoute();
}
