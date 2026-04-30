(() => {
  // src/content/core.ts
  var RP_TAB_ID = "roprime-settings-tab";
  var RP_PANEL_CLASS = "roprime-settings-wrapper";
  var RP_PANE_ID = "roprime-settings-pane";
  var RP_STANDALONE_ID = "roprime-standalone-settings";
  var RP_SMALL_NEW_NAV_STYLE_ID = "roprime-small-new-nav-style";
  var RP_SIDEBAR_COMPACT_STYLE_ID = "roprime-sidebar-compact-style";
  var RP_FRIEND_STYLING_REIMAGNED_STYLE_ID = "roprime-friend-styling-reimagned-style";
  var RP_ALWAYS_SHOW_CLOSE_STYLE_ID = "roprime-always-show-close-style";
  var RP_RUNTIME_STYLE_ID = "roprime-runtime-style";
  var RP_PARAM_KEY = "roprime";
  var RP_DEFAULT_PAGE = "design";
  var RP_SUPPORTED_PAGES = new Set(["design", "settings", "info", "developer"]);
  var RP_SETTINGS_KEY = "rpSettings";
  function normalizeBlockedExecutionPages(value) {
    if (!Array.isArray(value))
      return [];
    const seen = new Set();
    return value.map((entry) => typeof entry === "string" ? entry.trim() : "").filter(Boolean).filter((entry) => {
      const key = entry.toLowerCase();
      if (seen.has(key))
        return false;
      seen.add(key);
      return true;
    });
  }
  var RP_DEFAULT_SETTINGS = {
    language: "en",
    renameDropdownEnabled: true,
    renameDropdownRestore: {
      renameCommunitiesToGroups: true,
      renameExperiencesToGames: true,
      renameMarketplaceToAvatarShop: true
    },
    oldNavigationBarEnabled: false,
    smallNewNavigationBarEnabled: false,
    sidebarIconsOnlyEnabled: false,
    friendStylingReimagnedEnabled: true,
    developerPageUnlocked: false,
    blockedExecutionPages: []
  };
  var syncIntervalId = null;
  var renameIntervalId = null;
  var settingsState = { ...RP_DEFAULT_SETTINGS };
  function setSyncIntervalId(value) {
    syncIntervalId = value;
  }
  function setRenameIntervalId(value) {
    renameIntervalId = value;
  }
  function getStorageApi() {
    return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local ? chrome.storage.local : null;
  }
  function loadSettings() {
    const storage = getStorageApi();
    if (!storage)
      return Promise.resolve();
    return new Promise((resolve) => {
      storage.get([RP_SETTINGS_KEY], (result) => {
        const stored = result?.[RP_SETTINGS_KEY];
        if (stored && typeof stored === "object") {
          Object.assign(settingsState, RP_DEFAULT_SETTINGS, stored);
          settingsState.blockedExecutionPages = normalizeBlockedExecutionPages(stored.blockedExecutionPages);
          settingsState.developerPageUnlocked = !!stored.developerPageUnlocked;
          if (stored.oldNavigationBarEnabled === undefined) {
            if (stored.classicLeftNavEnabled != null) {
              settingsState.oldNavigationBarEnabled = !!stored.classicLeftNavEnabled;
            } else if (stored.leftGrayFrameEnabled != null) {
              settingsState.oldNavigationBarEnabled = !!stored.leftGrayFrameEnabled;
            }
          }
          delete settingsState.classicLeftNavEnabled;
          delete settingsState.leftGrayFrameEnabled;
        }
        resolve();
      });
    });
  }
  function saveSettings() {
    const storage = getStorageApi();
    if (!storage)
      return;
    storage.set({
      [RP_SETTINGS_KEY]: {
        renameDropdownEnabled: settingsState.renameDropdownEnabled,
        renameDropdownRestore: settingsState.renameDropdownRestore,
        language: settingsState.language,
        renameCommunitiesToGroups: settingsState.renameCommunitiesToGroups,
        renameExperiencesToGames: settingsState.renameExperiencesToGames,
        renameMarketplaceToAvatarShop: settingsState.renameMarketplaceToAvatarShop,
        oldNavigationBarEnabled: settingsState.oldNavigationBarEnabled,
        smallNewNavigationBarEnabled: settingsState.smallNewNavigationBarEnabled,
        sidebarIconsOnlyEnabled: settingsState.sidebarIconsOnlyEnabled,
        friendStylingReimagnedEnabled: settingsState.friendStylingReimagnedEnabled,
        developerPageUnlocked: !!settingsState.developerPageUnlocked,
        blockedExecutionPages: normalizeBlockedExecutionPages(settingsState.blockedExecutionPages)
      }
    });
  }
  function isAccountPage() {
    const path = window.location.pathname;
    return /^\/(?:[a-z]{2,3}(?:-[a-z0-9]{2,8})?\/)?my\/account(?:\/|$)/i.test(path);
  }
  function isPluginRoute() {
    const params = new URLSearchParams(window.location.search);
    const route = (params.get(RP_PARAM_KEY) || "").toLowerCase();
    return RP_SUPPORTED_PAGES.has(route);
  }
  function isForeignAccountPluginRoute() {
    if (!isAccountPage())
      return false;
    const params = new URLSearchParams(window.location.search);
    if (params.has(RP_PARAM_KEY))
      return !isPluginRoute();
    return Array.from(params.keys()).length > 0;
  }
  function isCurrentPageBlockedByUser() {
    const rules = normalizeBlockedExecutionPages(settingsState.blockedExecutionPages);
    if (!rules.length)
      return false;
    const href = window.location.href.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const pathWithSearch = `${path}${search}`;
    const pathWithSearchAndHash = `${path}${search}${hash}`;
    return rules.some((rule) => {
      const normalizedRule = rule.toLowerCase();
      return href.includes(normalizedRule) || path === normalizedRule || search === normalizedRule || pathWithSearch === normalizedRule || pathWithSearchAndHash === normalizedRule || pathWithSearch.includes(normalizedRule) || pathWithSearchAndHash.includes(normalizedRule);
    });
  }
  function shouldRunRoPrimeOnCurrentPage() {
    return !isForeignAccountPluginRoute() && !isCurrentPageBlockedByUser();
  }
  function getCurrentrp() {
    const params = new URLSearchParams(window.location.search);
    const route = (params.get(RP_PARAM_KEY) || "").toLowerCase();
    if (RP_SUPPORTED_PAGES.has(route))
      return route;
    return null;
  }
  function buildPluginUrl(page = RP_DEFAULT_PAGE) {
    const url = new URL(window.location.href);
    url.searchParams.set(RP_PARAM_KEY, page);
    return `${url.pathname}${url.search}`;
  }

  // src/content/rename.ts
  function renameCommunityText(text) {
    return text.replace(/\bCommunities\b/g, "Groups").replace(/\bcommunities\b/g, "groups").replace(/\bCommunity\b/g, "Group").replace(/\bcommunity\b/g, "group");
  }
  function renameGroupsBackText(text) {
    return text.replace(/\bGroups\b/g, "Communities").replace(/\bgroups\b/g, "communities").replace(/\bGroup\b/g, "Community").replace(/\bgroup\b/g, "community");
  }
  function renameExperiencesText(text) {
    return text.replace(/\bExperiences\b/g, "Games").replace(/\bexperiences\b/g, "games").replace(/\bExperience\b/g, "Game").replace(/\bexperience\b/g, "game");
  }
  function renameGamesBackText(text) {
    return text.replace(/\bGames\b/g, "Experiences").replace(/\bgames\b/g, "experiences").replace(/\bGame\b/g, "Experience").replace(/\bgame\b/g, "experience");
  }
  function renameMarketplaceText(text) {
    return text.replace(/\bMarketplace\b/g, "Catalog").replace(/\bmarketplace\b/g, "catalog");
  }
  function renameAvatarShopBackText(text) {
    return text.replace(/\bCatalog\b/g, "Marketplace").replace(/\bcatalog\b/g, "marketplace");
  }
  function shouldSkipNode(node) {
    if (!(node.parentElement instanceof HTMLElement))
      return true;
    const tag = node.parentElement.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEXTAREA")
      return true;
    if (node.parentElement.closest(`#${RP_PANE_ID}`))
      return true;
    if (node.parentElement.closest(`#${RP_STANDALONE_ID}`))
      return true;
    return false;
  }
  function applyTextTransform(rootNode, transform, shouldApply = true) {
    if (!shouldApply)
      return;
    if (!(rootNode instanceof Node))
      return;
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT);
    let currentNode = walker.nextNode();
    while (currentNode) {
      if (!shouldSkipNode(currentNode) && typeof currentNode.nodeValue === "string") {
        const original = currentNode.nodeValue;
        const renamed = transform(original);
        if (renamed !== original)
          currentNode.nodeValue = renamed;
      }
      currentNode = walker.nextNode();
    }
  }
  function applyMarketplaceRename(rootNode) {
    applyTextTransform(rootNode, renameMarketplaceText, settingsState.renameMarketplaceToAvatarShop);
  }
  function applyAvatarShopBackRename(rootNode) {
    applyTextTransform(rootNode, renameAvatarShopBackText, true);
  }
  function applyCommunityRename(rootNode) {
    applyTextTransform(rootNode, renameCommunityText, settingsState.renameCommunitiesToGroups);
  }
  function applyGroupsBackRename(rootNode) {
    applyTextTransform(rootNode, renameGroupsBackText, true);
  }
  function applyExperiencesRename(rootNode) {
    applyTextTransform(rootNode, renameExperiencesText, settingsState.renameExperiencesToGames);
  }
  function applyGamesBackRename(rootNode) {
    applyTextTransform(rootNode, renameGamesBackText, true);
  }
  function updateRenameLoop() {
    if (settingsState.renameDropdownEnabled && (settingsState.renameCommunitiesToGroups || settingsState.renameExperiencesToGames || settingsState.renameMarketplaceToAvatarShop)) {
      if (renameIntervalId === null) {
        setRenameIntervalId(window.setInterval(() => {
          applyCommunityRename(document.body);
          applyExperiencesRename(document.body);
          applyMarketplaceRename(document.body);
        }, 1500));
      }
      return;
    }
    if (renameIntervalId !== null) {
      window.clearInterval(renameIntervalId);
      setRenameIntervalId(null);
    }
  }
  function stopRenameLoop() {
    if (renameIntervalId !== null) {
      window.clearInterval(renameIntervalId);
      setRenameIntervalId(null);
    }
  }

  // src/content/oldNavigationBar.ts
  var HOST_ID = "roprime-classic-left-nav-host";
  var COLLAPSED_CLASS = "roprime-old-navigation-bar-collapsed";
  function stripLegacyInjections() {
    document.getElementById("roprime-left-gray-frame")?.remove();
    document.getElementById("roprime-left-gray-frame-layout-style")?.remove();
    document.documentElement.classList.remove("roprime-left-gray-frame-on");
    document.getElementById("roprime-old-navbar-style")?.remove();
    document.getElementById("roprime-old-navbar-host")?.remove();
    document.documentElement.classList.remove("roprime-old-navbar-active", "roprime-old-navbar-rail-expanded", "roprime-old-navbar-menu-open");
    const slot = document.getElementById("roprime-nav-menu-slot");
    if (slot) {
      const native = slot.querySelector("button.menu-button.btn-navigation-nav-menu-md");
      const parent = slot.parentElement;
      if (native instanceof HTMLButtonElement && parent) {
        native.classList.remove("roprime-native-nav-menu-hidden");
        parent.insertBefore(native, slot);
      }
      slot.remove();
    }
    document.querySelectorAll("button.roprime-native-nav-menu-hidden").forEach((b) => b.classList.remove("roprime-native-nav-menu-hidden"));
    document.getElementById("roprime-custom-nav-menu-btn")?.remove();
  }
  function shouldMountOldNavigationBar() {
    if (!document.body)
      return false;
    const path = window.location.pathname || "";
    if (/\/login\b/i.test(path) || /^\/(?:[a-z]{2,3}(?:-[a-z0-9]{2,8})?\/)?newlogin\b/i.test(path))
      return false;
    return true;
  }
  function scrapeProfile() {
    const nav = document.querySelector(".left-nav.fixed");
    if (!nav)
      return { href: `${window.location.origin}/my/account`, avatar: "", name: "Profile" };
    let profileLink = null;
    for (const a of nav.querySelectorAll("a[href]")) {
      if (!(a instanceof HTMLAnchorElement))
        continue;
      const pathOnly = (a.getAttribute("href") || "").replace(/^https?:\/\/[^/]+/i, "");
      if (!/\/users\/\d+/i.test(pathOnly) && !/\/my\/account\b/i.test(pathOnly))
        continue;
      if (!a.querySelector("img"))
        continue;
      profileLink = a;
      break;
    }
    if (!profileLink)
      return { href: `${window.location.origin}/my/account`, avatar: "", name: "Profile" };
    const img = profileLink.querySelector("img");
    const avatar = img instanceof HTMLImageElement ? img.src || "" : "";
    let name = "Profile";
    const nameSpan = profileLink.querySelector("span[class*='font-body'], span[class*='text-'], span.text-truncate-end, p[class*='text-']");
    if (nameSpan?.textContent?.trim())
      name = nameSpan.textContent.trim();
    const href = profileLink.getAttribute("href") || "/my/account";
    const abs = /^https?:/i.test(href) ? href : `${window.location.origin}${href.startsWith("/") ? "" : "/"}${href}`;
    return { href: abs, avatar, name };
  }
  function scrapeMessagesBadge() {
    const nav = document.querySelector(".left-nav.fixed");
    if (!nav)
      return null;
    const link = nav.querySelector('a[href*="/messages" i]');
    if (!(link instanceof HTMLAnchorElement))
      return null;
    const badgeLike = link.querySelector("[class*='badge' i], [class*='Badge'], [class*='notification' i], [data-testid*='badge' i]");
    if (badgeLike?.textContent) {
      const n = badgeLike.textContent.replace(/\D/g, "");
      if (n)
        return n.length > 3 ? "99+" : n;
    }
    for (const el of link.querySelectorAll("span, div")) {
      const t = el.textContent?.trim() || "";
      if (/^\d{1,3}$/.test(t))
        return t;
    }
    const label = link.getAttribute("aria-label") || "";
    const m = label.match(/(\d+)\s*(unread|new)?/i);
    if (m)
      return m[1];
    return null;
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  }
  function bindNativeMenuButtonToggle() {
    const root = document.documentElement;
    if (!root || root.getAttribute("data-roprime-old-nav-menu-bound") === "1")
      return;
    root.setAttribute("data-roprime-old-nav-menu-bound", "1");
    const handler = (event) => {
      const target = event.target;
      if (!(target instanceof Element))
        return;
      const btn = target.closest("button.menu-button.btn-navigation-nav-menu-md");
      if (!btn)
        return;
      root.classList.toggle(COLLAPSED_CLASS);
    };
    document.addEventListener("click", handler, true);
  }
  var ICON = {
    home: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/></svg>`,
    user: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M6 20v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1"/></svg>`,
    message: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M8 10h8"/><path d="M8 13h5"/></svg>`,
    connect: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20v-1a4 4 0 0 1 4-4h2"/><path d="M17 11.5A4 4 0 0 1 21 15v1"/></svg>`,
    avatar: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="19.5" rx="5" ry="1.75"/><circle cx="12" cy="8.5" r="3.25"/><path d="M7.5 18.5v-.5a4.5 4.5 0 0 1 9 0v.5"/></svg>`,
    inventory: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"/><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 11h16"/></svg>`,
    trade: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5l5 5"/><path d="M5 5v5h5"/><path d="M19 19l-5-5"/><path d="M19 19v-5h-5"/></svg>`,
    communities: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="2.5"/><circle cx="15" cy="7" r="2"/><circle cx="17" cy="13" r="2"/><path d="M3 20v-1a3 3 0 0 1 3-3h1"/><path d="M21 20v-1a3 3 0 0 0-3-3h-1"/><path d="M12 11c-1.5 0-3 1-3 3v2h6v-2c0-2-1.5-3-3-3z"/></svg>`,
    blog: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M8 11h8"/><path d="M8 15h5"/></svg>`,
    store: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M3 5h2l1 12a2 2 0 0 0 2 1.5h9a2 2 0 0 0 2-1.5L21 9H7"/><path d="M16 5l-2-2h-4"/></svg>`,
    gift: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 8V20"/><path d="M3 12h18"/><path d="M12 8a3 3 0 0 0 3-3c0 1.5-1.5 2-3 2S9 6.5 9 5a3 3 0 0 0 3 3z"/></svg>`
  };
  var ORIGIN = () => window.location.origin;
  var PRIMARY_LINKS = [
    { label: "Home", path: "/home", icon: "home" },
    { label: "Profile", path: "/my/account", icon: "user" },
    { label: "Messages", path: "/messages", icon: "message" },
    { label: "Connect", path: "/friends", icon: "connect" },
    { label: "Avatar", path: "/my/avatar", icon: "avatar" },
    { label: "Inventory", path: "/my/inventory", icon: "inventory" },
    { label: "Trade", path: "/trade", icon: "trade" },
    { label: "Communities", path: "/groups", icon: "communities" },
    { label: "Blog", path: "https://blog.roblox.com/", icon: "blog", newTab: true, extIcon: true },
    { label: "Official Store", path: "/catalog", icon: "store", extIcon: true },
    { label: "Buy Gift Cards", path: "/upgrades/giftcards", icon: "gift", extIcon: true }
  ];
  function linkRow(item, messagesBadge) {
    const isAbsolute = /^https?:/i.test(item.path);
    const href = isAbsolute ? item.path : `${ORIGIN()}${item.path}`;
    const target = item.newTab ? ' target="_blank" rel="noopener noreferrer"' : "";
    let cls = "roprime-cln-link";
    if (item.extIcon)
      cls += " roprime-cln-link--ext-icon";
    if (item.newTab)
      cls += " roprime-cln-link--new-tab";
    const wrapCls = item.extIcon ? "roprime-cln-icon-wrap roprime-cln-icon-wrap--external" : "roprime-cln-icon-wrap";
    const icon = ICON[item.icon] || ICON.home;
    let tail = "";
    if (item.path === "/messages" && messagesBadge) {
      tail = `<span class="roprime-cln-badge" aria-label="${esc(messagesBadge)} unread">${esc(messagesBadge)}</span>`;
    }
    return `<li><a class="${cls}" href="${esc(href)}"${target}><span class="${wrapCls}">${icon}</span><span class="roprime-cln-label">${esc(item.label)}</span>${tail}</a></li>`;
  }
  function buildNavHtml(profileHref, avatarUrl, displayName) {
    const links = PRIMARY_LINKS.map((item) => item.path === "/groups" ? { ...item, label: settingsState.renameCommunitiesToGroups ? "Groups" : "Communities" } : item);
    const badge = scrapeMessagesBadge();
    const primary = links.map((item) => linkRow(item, badge)).join("");
    const avatar = avatarUrl ? `<img class="roprime-cln-avatar" src="${esc(avatarUrl)}" alt="" width="36" height="36" />` : `<span class="roprime-cln-avatar roprime-cln-avatar--ph" aria-hidden="true"></span>`;
    return `
<nav class="roprime-classic-left-nav" aria-label="RoPrime navigation">
  <header class="roprime-cln-top">
    <a class="roprime-cln-profile" href="${esc(profileHref)}">
      ${avatar}
      <span class="roprime-cln-name">${esc(displayName)}</span>
    </a>
    <div class="roprime-cln-divider" role="separator"></div>
  </header>
  <div class="roprime-cln-scroll">
    <ul class="roprime-cln-list">${primary}</ul>
    <a class="roprime-cln-premium" href="${esc(`${ORIGIN()}/premium/membership`)}">Get Premium</a>
  </div>
</nav>`.trim();
  }
  function renderInto(host) {
    const { href, avatar, name } = scrapeProfile();
    host.innerHTML = buildNavHtml(href, avatar, name);
  }
  function syncOldNavigationBar() {
    stripLegacyInjections();
    const root = document.documentElement;
    root.classList.remove("roprime-classic-left-nav-on");
    if (!settingsState.oldNavigationBarEnabled) {
      document.getElementById(HOST_ID)?.remove();
      root.classList.remove(COLLAPSED_CLASS);
      try {
        delete window.__oldRobloxOldNavigationBar;
      } catch {}
      return;
    }
    if (!shouldMountOldNavigationBar()) {
      document.getElementById(HOST_ID)?.remove();
      root.classList.remove(COLLAPSED_CLASS);
      return;
    }
    root.classList.add("roprime-classic-left-nav-on");
    bindNativeMenuButtonToggle();
    let host = document.getElementById(HOST_ID);
    if (!(host instanceof HTMLElement)) {
      host = document.createElement("div");
      host.id = HOST_ID;
      host.className = "roprime-classic-left-nav-host";
      host.setAttribute("data-roelite", "old-navigation-bar");
      (document.body || document.documentElement).appendChild(host);
    }
    renderInto(host);
    try {
      window.__oldRobloxOldNavigationBar = host;
    } catch {}
    if (!host.dataset.rpConsoleLogged) {
      host.dataset.rpConsoleLogged = "1";
      console.log("[RoPrime] Old Navigation bar:", host, "| window.__oldRobloxOldNavigationBar");
    }
  }

  // src/content/friendStylingReimagned.ts
  var FRIEND_STYLING_REIMAGNED_CSS = `
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
  var GLOW_TILE_SELECTOR = ".friends-carousel-tile";
  var FRIEND_CAROUSEL_SELECTOR = ".friend-carousel-container";
  var GLOW_PRESENCE_CLASSES = [
    "rologic-presence-offline",
    "rologic-presence-online",
    "rologic-presence-game",
    "rologic-presence-studio"
  ];
  var friendStylingObserver = null;
  var friendStylingRafId = null;
  function getPresenceClass(tile) {
    const presenceIcon = tile.querySelector('[data-testid="presence-icon"]');
    if (!(presenceIcon instanceof HTMLElement))
      return "rologic-presence-offline";
    const presenceText = [presenceIcon.getAttribute("class"), presenceIcon.getAttribute("title"), presenceIcon.ariaLabel].filter(Boolean).join(" ").toLowerCase();
    if (presenceText.includes("studio"))
      return "rologic-presence-studio";
    if (presenceText.includes("game") || presenceText.includes("playing"))
      return "rologic-presence-game";
    if (presenceText.includes("online"))
      return "rologic-presence-online";
    return "rologic-presence-offline";
  }
  function applyFriendPresenceClasses() {
    document.querySelectorAll(GLOW_TILE_SELECTOR).forEach((tile) => {
      if (!(tile instanceof HTMLElement))
        return;
      const nextPresenceClass = getPresenceClass(tile);
      if (tile.dataset.rpPresenceClass === nextPresenceClass)
        return;
      tile.classList.remove(...GLOW_PRESENCE_CLASSES);
      tile.classList.add(nextPresenceClass);
      tile.dataset.rpPresenceClass = nextPresenceClass;
    });
  }
  function scheduleFriendPresenceRefresh() {
    if (friendStylingRafId !== null)
      return;
    friendStylingRafId = window.requestAnimationFrame(() => {
      friendStylingRafId = null;
      if (!settingsState.friendStylingReimagnedEnabled)
        return;
      applyFriendPresenceClasses();
    });
  }
  function startFriendStylingObserver() {
    if (friendStylingObserver instanceof MutationObserver)
      return;
    if (!(document.body instanceof HTMLBodyElement))
      return;
    friendStylingObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (!(mutation.target instanceof Element))
          continue;
        if (mutation.target.closest(FRIEND_CAROUSEL_SELECTOR) || Array.from(mutation.addedNodes).some((node) => node instanceof Element && (node.matches(FRIEND_CAROUSEL_SELECTOR) || !!node.querySelector(GLOW_TILE_SELECTOR)))) {
          scheduleFriendPresenceRefresh();
          return;
        }
      }
    });
    friendStylingObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "title", "aria-label"]
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
  function updateFriendStylingReimagnedVisibility() {
    const existingStyle = document.getElementById(RP_FRIEND_STYLING_REIMAGNED_STYLE_ID);
    if (!settingsState.friendStylingReimagnedEnabled) {
      stopFriendStylingObserver();
      if (existingStyle instanceof HTMLStyleElement)
        existingStyle.remove();
      document.querySelectorAll(GLOW_TILE_SELECTOR).forEach((tile) => {
        if (!(tile instanceof HTMLElement))
          return;
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
  }

  // src/content/welcome.ts
  var RP_HOME_WELCOME_DISMISSED_KEY = "rpHomeWelcomeDismissed";
  var WELCOME_ROOT_ID = "roprime-home-welcome-root";
  var welcomeKeydownHandler = null;
  var storageDismissListenerAttached = false;
  function attachDismissStorageListener() {
    if (storageDismissListenerAttached)
      return;
    if (typeof chrome === "undefined" || !chrome.storage?.onChanged)
      return;
    storageDismissListenerAttached = true;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local")
        return;
      if (changes[RP_HOME_WELCOME_DISMISSED_KEY]?.newValue === true)
        removeWelcomeIfPresent();
    });
  }
  function isRobloxHomePage() {
    const raw = window.location.pathname || "/";
    const p = raw.replace(/\/+$/, "") || "/";
    if (p === "/home")
      return true;
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
  function appendWelcomeWhenBodyReady(root) {
    const mount = () => {
      const parent = document.body;
      if (parent) {
        parent.appendChild(root);
        return true;
      }
      return false;
    };
    if (mount())
      return;
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
      if (!isRobloxHomePage())
        return;
      if (root.parentElement)
        return;
      (document.body || document.documentElement).appendChild(root);
    }, 8000);
  }
  function showWelcomeModal() {
    if (document.getElementById(WELCOME_ROOT_ID))
      return;
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
      if (e.key === "Escape")
        dismiss();
    };
    document.addEventListener("keydown", welcomeKeydownHandler, true);
    appendWelcomeWhenBodyReady(root);
  }
  function syncHomeWelcomeModal() {
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
        if (!isRobloxHomePage())
          return;
        showWelcomeModal();
        return;
      }
      if (!isRobloxHomePage())
        return;
      const dismissed = result?.[RP_HOME_WELCOME_DISMISSED_KEY];
      if (dismissed === true) {
        removeWelcomeIfPresent();
        return;
      }
      showWelcomeModal();
    });
  }

  // src/content/accountTab.ts
  function getRobloxAccountMenu() {
    const root = document.getElementById("react-user-account-base");
    if (!(root instanceof HTMLElement))
      return null;
    const menus = Array.from(root.querySelectorAll(".menu-vertical"));
    const menu = menus.find((m) => m.querySelector('.menu-option a[href*="browser-preferences"], .menu-option a[href*="browserpreferences"]'));
    return menu instanceof HTMLElement ? menu : null;
  }
  function getIconUrl() {
    try {
      if (typeof chrome !== "undefined" && chrome.runtime && typeof chrome.runtime.getURL === "function") {
        return chrome.runtime.getURL("resources/roprime-icon.png");
      }
    } catch {
      return "resources/roprime-icon.png";
    }
    return "resources/roprime-icon.png";
  }
  function injectRoEliteTab(onNavigate) {
    if (!isAccountPage())
      return;
    const menu = getRobloxAccountMenu();
    if (!menu || document.getElementById(RP_TAB_ID))
      return;
    const iconUrl = getIconUrl();
    const settingsLabel = settingsState.language === "ru" ? "Настройки RoPrime" : "RoPrime Settings";
    const li = document.createElement("li");
    li.id = RP_TAB_ID;
    li.className = "menu-option";
    li.setAttribute("role", "tab");
    li.innerHTML = `<a class="menu-option-content" href="#"><img class="roprime-menu-icon" src="${iconUrl}" alt="" width="15" height="15" /><span class="menu-text">${settingsLabel}</span></a>`;
    li.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function")
        event.stopImmediatePropagation();
      const nextUrl = buildPluginUrl(RP_DEFAULT_PAGE);
      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (currentUrl !== nextUrl)
        window.history.pushState({ oldRobloxSettings: true }, "", nextUrl);
      if (typeof onNavigate === "function")
        onNavigate();
    }, true);
    const insertAfter = menu.querySelector('.menu-option a[href*="browser-preferences"]')?.closest(".menu-option") || menu.querySelector('.menu-option a[href*="browserpreferences"]')?.closest(".menu-option") || null;
    if (insertAfter instanceof HTMLElement)
      insertAfter.insertAdjacentElement("afterend", li);
    else
      menu.appendChild(li);
  }
  function ensureAccountDivider() {
    if (!isAccountPage())
      return;
    const menu = getRobloxAccountMenu();
    if (!(menu instanceof HTMLElement))
      return;
    const oldRobloxTab = document.getElementById(RP_TAB_ID);
    if (!(oldRobloxTab instanceof HTMLElement))
      return;
    const existingDividers = Array.from(menu.querySelectorAll(".roprime-divider"));
    const divider = existingDividers[0] instanceof HTMLElement ? existingDividers[0] : null;
    existingDividers.slice(1).forEach((el) => el.remove());
    const browserPreferencesItem = menu.querySelector('.menu-option a[href*="browser-preferences"]')?.closest(".menu-option") || menu.querySelector('.menu-option a[href*="browserpreferences"]')?.closest(".menu-option") || null;
    const desiredAnchor = browserPreferencesItem instanceof HTMLElement ? browserPreferencesItem : oldRobloxTab;
    const desiredPosition = desiredAnchor === oldRobloxTab ? "beforebegin" : "afterend";
    const activeDivider = divider || (() => {
      const el = document.createElement("li");
      el.className = "rbx-divider thick-height";
      el.classList.add("roprime-divider");
      return el;
    })();
    const currentAnchor = activeDivider.previousElementSibling === desiredAnchor || activeDivider.nextElementSibling === desiredAnchor ? desiredAnchor : null;
    if (!currentAnchor)
      desiredAnchor.insertAdjacentElement(desiredPosition, activeDivider);
  }
  function removeRoPrimeAccountUi() {
    document.getElementById(RP_TAB_ID)?.remove();
    document.querySelectorAll(".roprime-divider").forEach((divider) => divider.remove());
  }

  // src/content/smallNewNav.ts
  function updateSmallNewNavVisibility() {
    const existingStyle = document.getElementById(RP_SMALL_NEW_NAV_STYLE_ID);
    if (!settingsState.smallNewNavigationBarEnabled) {
      if (existingStyle instanceof HTMLStyleElement)
        existingStyle.remove();
      return;
    }
    if (existingStyle instanceof HTMLStyleElement)
      return;
    const style = document.createElement("style");
    style.id = RP_SMALL_NEW_NAV_STYLE_ID;
    style.textContent = [
      '.width-\\[288px\\], .width-\\[289px\\], [class~="width-[288px]"], [class~="width-[289px]"] { width: 200px !important; min-width: 0 !important; max-width: 200px !important; }'
    ].join(`
`);
    document.documentElement.appendChild(style);
  }

  // src/content/sidebarCompact.ts
  var RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS = "roprime-leftnav-official-store";
  var RP_LEFTNAV_PROFILE_LI_CLASS = "roprime-leftnav-profile";
  var RP_SIDEBAR_PLUS_ITEM_ID = "roprime-sidebar-plus-item";
  var RP_SIDEBAR_PLUS_BTN_CLASS = "roprime-sidebar-plus-btn";
  var RP_SIDEBAR_PLUS_ICON_CLASS = "roprime-sidebar-plus-icon";
  var RP_RBLX_PLUS_LOGO_URL = typeof chrome !== "undefined" && chrome.runtime && typeof chrome.runtime.getURL === "function" ? chrome.runtime.getURL("resources/RblxPlusLogo.webp") : "resources/RblxPlusLogo.webp";
  var ROBLOX_LOCALE_SEGMENT_REGEX = /^[a-z]{2}(?:-[a-z]{2})?$/i;
  var SIDEBAR_COMPACT_RAIL_PX = 72;
  var SIDEBAR_COMPACT_ICON_PX = 48;
  var SIDEBAR_COMPACT_CSS = `
body .no-gutter-ads.logged-in.left-nav-new-width {
  --left-nav-reserved-width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
}
.left-nav.fixed {
  width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
  box-sizing: border-box !important;
  overflow-x: clip !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
.left-nav.fixed::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
}
.left-nav.fixed .stroke-default.self-stretch,
.left-nav.fixed [class*="stroke-default"][class*="self-stretch"] {
  position: absolute !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  left: auto !important;
  width: 0 !important;
  min-width: 0 !important;
  max-width: none !important;
  height: 100% !important;
  min-height: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  flex: none !important;
  flex-shrink: 0 !important;
  align-self: stretch !important;
  opacity: 1 !important;
  visibility: visible !important;
  display: block !important;
  z-index: 40 !important;
  pointer-events: none !important;
  box-sizing: border-box !important;
  border: none !important;
  border-right: 1px solid var(--stroke-default, rgba(255, 255, 255, 0.16)) !important;
  background-color: transparent !important;
  background-image: none !important;
  overflow: visible !important;
}
.left-nav.fixed .simplebar-wrapper,
.left-nav.fixed .simplebar-mask,
.left-nav.fixed .simplebar-offset,
.left-nav.fixed .simplebar-content-wrapper,
.left-nav.fixed .simplebar-content {
  box-sizing: border-box !important;
  min-width: 0 !important;
  max-width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
  overflow-x: clip !important;
}
.left-nav.fixed .simplebar-content-wrapper {
  overflow-y: auto !important;
}
.left-nav.fixed .simplebar-track.simplebar-horizontal,
.left-nav.fixed .simplebar-scrollbar.simplebar-horizontal {
  display: none !important;
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
  height: 0 !important;
  min-height: 0 !important;
}
.left-nav.fixed.width-\\[288px\\],
.left-nav.fixed.width-\\[289px\\],
.left-nav.fixed .width-\\[288px\\],
.left-nav.fixed .width-\\[289px\\],
.left-nav.fixed [class~="width-[288px]"],
.left-nav.fixed [class~="width-[289px]"] {
  width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
  box-sizing: border-box !important;
}
.left-nav.fixed .width-\\[288px\\] {
  width: 100% !important;
  max-width: 250px !important; /* Limits size but allows it to shrink */
}
.left-nav.fixed .width-\\[288px\\] {
  overflow-x: hidden !important;
}
.left-nav.fixed ul,
.left-nav.fixed ol {
  box-sizing: border-box !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  align-items: center !important;
}
.left-nav.fixed div:has(> li) {
  box-sizing: border-box !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  align-items: center !important;
}
.left-nav.fixed li {
  box-sizing: border-box !important;
  width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  padding: 0 !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-grow: 0 !important;
  flex-shrink: 0 !important;
  flex-basis: auto !important;
  align-self: center !important;
  overflow: hidden !important;
}
.left-nav.fixed a[href] .truncate,
.left-nav.fixed a[href] [class*="line-clamp"],
.left-nav.fixed a[href] [class*="line-clamp-"],
.left-nav.fixed a[href] > span[class*="text-"]:not([class*="badge"]):not([class*="Badge"]),
.left-nav.fixed a[href] span[class*="font-body"],
.left-nav.fixed a[href] p[class*="text-"] {
  display: none !important;
}
.left-nav.fixed span.text-truncate-end.text-no-wrap,
.left-nav.fixed span[class*="text-truncate-end"][class*="text-no-wrap"] {
  display: none !important;
}
.left-nav.fixed span.flex.gap-xsmall.min-width-0.align-items-center,
.left-nav.fixed span.flex.gap-xsmall.min-width-0.items-center,
.left-nav.fixed span[class*="gap-xsmall"][class*="min-width-0"][class*="align-items-center"],
.left-nav.fixed span[class*="gap-xsmall"][class*="min-width-0"][class*="items-center"] {
  display: none !important;
}
.left-nav.fixed a[href] {
  box-sizing: border-box !important;
  width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  padding: 0 !important;
  margin: 0 !important;
  justify-content: center !important;
  align-items: center !important;
  gap: 0 !important;
  flex-shrink: 0 !important;
}
.left-nav.fixed a[href] svg,
.left-nav.fixed a[href] img {
  width: 26px !important;
  height: 26px !important;
  max-width: 26px !important;
  max-height: 26px !important;
}
.left-nav.fixed li:has(a[href*="premium" i]),
.left-nav.fixed a[href*="/premium" i],
.left-nav.fixed a[href*="premium" i],
.left-nav.fixed button[aria-label*="Premium" i],
.left-nav.fixed button[aria-label*="Get Premium" i],
.left-nav.fixed li:has(a[aria-label*="Official Store" i]),
.left-nav.fixed a[aria-label*="Official Store" i],
.left-nav.fixed a[title*="Official Store" i],
.left-nav.fixed a[href*="/sponsored" i],
.left-nav.fixed li:has(a[href*="/sponsored" i]) {
  display: none !important;
}
.left-nav.fixed li:has(button[aria-label*="Premium" i]) {
  display: none !important;
}
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} > span.size-1000 ~ span,
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} > span:not([class]) {
  display: none !important;
}
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} {
  box-sizing: border-box !important;
  width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  padding: 0 !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0 !important;
  flex-shrink: 0 !important;
  position: relative !important;
  overflow: hidden !important;
}
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} > div.absolute,
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} > div[class*="inset-"] {
  box-sizing: border-box !important;
  width: 100% !important;
  height: 100% !important;
  inset: 0 !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
}
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} > span.size-1000 {
  box-sizing: border-box !important;
  width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  flex: 0 0 ${SIDEBAR_COMPACT_ICON_PX}px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  margin: 0 !important;
  padding: 0 !important;
}
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} svg,
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} .icon-regular-building-store {
  width: 26px !important;
  height: 26px !important;
  max-width: 26px !important;
  max-height: 26px !important;
}
.left-nav.fixed li.${RP_LEFTNAV_PROFILE_LI_CLASS} a[href] {
  width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  overflow: hidden !important;
}
.left-nav.fixed li#${RP_SIDEBAR_PLUS_ITEM_ID} {
  margin-top: auto !important;
}
.left-nav.fixed button.${RP_SIDEBAR_PLUS_BTN_CLASS} {
  box-sizing: border-box !important;
  width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  margin: 0 !important;
  border-radius: 12px !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  background: #3a3d43 !important;
  cursor: pointer !important;
  overflow: hidden !important;
}
.left-nav.fixed button.${RP_SIDEBAR_PLUS_BTN_CLASS}:hover {
  filter: brightness(1.06) !important;
}
.left-nav.fixed button.${RP_SIDEBAR_PLUS_BTN_CLASS} .${RP_SIDEBAR_PLUS_ICON_CLASS} {
  width: 26px !important;
  height: 26px !important;
  max-width: 26px !important;
  max-height: 26px !important;
  object-fit: contain !important;
}
html.light-theme .left-nav.fixed button.${RP_SIDEBAR_PLUS_BTN_CLASS},
body.light-theme .left-nav.fixed button.${RP_SIDEBAR_PLUS_BTN_CLASS} {
  background: #e2e6ea !important;
  border-color: rgba(39, 43, 50, 0.16) !important;
}
html.dark-theme .left-nav.fixed button.${RP_SIDEBAR_PLUS_BTN_CLASS},
body.dark-theme .left-nav.fixed button.${RP_SIDEBAR_PLUS_BTN_CLASS} {
  background: #3a3d43 !important;
  border-color: rgba(255, 255, 255, 0.12) !important;
}
.left-nav.fixed li:has(a[href*="/messages" i]) {
  overflow: visible !important;
  position: relative !important;
  z-index: 80 !important;
}
.left-nav.fixed a[href*="/messages" i],
.left-nav.fixed a[href*="/messages" i]:hover,
.left-nav.fixed a[href*="/messages" i]:focus-visible,
.left-nav.fixed a[href*="/messages" i]:active {
  position: relative !important;
  overflow: visible !important;
  z-index: 1 !important;
  border-radius: var(--radius-medium, 10px) !important;
}
.left-nav.fixed a[href*="/messages" i] > div,
.left-nav.fixed a[href*="/messages" i] > div.absolute,
.left-nav.fixed a[href*="/messages" i] > div[class*="inset-"],
.left-nav.fixed a[href*="/messages" i] > span[class*="absolute"],
.left-nav.fixed a[href*="/messages" i] > span[class*="inset-"],
.left-nav.fixed a[href*="/messages" i] [class*="inset-"][class*="absolute"],
.left-nav.fixed a[href*="/messages" i]::before,
.left-nav.fixed a[href*="/messages" i]::after {
  border-radius: var(--radius-medium, 10px) !important;
}
.left-nav.fixed a[href*="/messages" i] > span.grow-0.shrink-0.basis-auto.icon.icon-regular-speech-bubble-align-center,
.left-nav.fixed a[href*="/messages" i] span.icon-regular-speech-bubble-align-center {
  position: relative !important;
  z-index: 1 !important;
}
.left-nav.fixed a[href*="/messages" i] span.fill.basis-auto.padding-x-small.flex.justify-end.items-center,
.left-nav.fixed a[href*="/messages" i] span.fill[class*="basis-auto"][class*="padding-x-small"][class*="justify-end"][class*="items-center"],
.left-nav.fixed a[href*="/messages" i] .foundation-web-badge,
.left-nav.fixed a[href*="/messages" i] [class*="foundation-web-badge"] {
  position: absolute !important;
  top: 4px !important;
  right: 4px !important;
  left: auto !important;
  bottom: auto !important;
  margin: 0 !important;
  z-index: 250 !important;
  transform: scale(0.9) !important;
  transform-origin: top right !important;
  pointer-events: none !important;
}
`.trim();
  function tagOfficialStoreLeftNavButton() {
    const nav = document.querySelector(".left-nav.fixed");
    if (!(nav instanceof HTMLElement))
      return;
    const icon = nav.querySelector("button .icon-regular-building-store");
    const btn = icon instanceof Element ? icon.closest("button") : null;
    if (!(btn instanceof HTMLButtonElement))
      return;
    if (settingsState.sidebarIconsOnlyEnabled)
      btn.classList.add(RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS);
    else
      btn.classList.remove(RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS);
  }
  function tagProfileLeftNavItem() {
    const clearProfileClass = () => {
      document.querySelectorAll(`.left-nav.fixed li.${RP_LEFTNAV_PROFILE_LI_CLASS}`).forEach((el) => {
        el.classList.remove(RP_LEFTNAV_PROFILE_LI_CLASS);
      });
    };
    if (!settingsState.sidebarIconsOnlyEnabled) {
      clearProfileClass();
      return;
    }
    const nav = document.querySelector(".left-nav.fixed");
    if (!(nav instanceof HTMLElement)) {
      clearProfileClass();
      return;
    }
    let matched = null;
    for (const li of nav.querySelectorAll("li")) {
      const a = li.querySelector("a[href]");
      if (!(a instanceof HTMLAnchorElement))
        continue;
      const href = a.getAttribute("href") || "";
      const pathOnly = href.replace(/^https?:\/\/[^/]+/i, "");
      const looksLikeProfile = /\/users\/\d+/i.test(pathOnly) || /\/my\/account\b/i.test(pathOnly) || /\/my\/profile\b/i.test(pathOnly);
      if (!looksLikeProfile)
        continue;
      if (!a.querySelector("img"))
        continue;
      matched = li;
      break;
    }
    for (const li of nav.querySelectorAll("li")) {
      if (li === matched)
        li.classList.add(RP_LEFTNAV_PROFILE_LI_CLASS);
      else
        li.classList.remove(RP_LEFTNAV_PROFILE_LI_CLASS);
    }
  }
  function getPremiumMembershipUrl() {
    const origin = window.location.origin || "https://www.roblox.com";
    const pathParts = (window.location.pathname || "/").split("/").filter(Boolean);
    const localeSegment = pathParts[0];
    const localizedPath = localeSegment && ROBLOX_LOCALE_SEGMENT_REGEX.test(localeSegment) ? `/${localeSegment}/premium/membership` : "/premium/membership";
    return `${origin}${localizedPath}`;
  }
  function syncSidebarCompactBottomButton() {
    const nav = document.querySelector(".left-nav.fixed");
    if (!(nav instanceof HTMLElement))
      return;
    const existing = nav.querySelector(`#${RP_SIDEBAR_PLUS_ITEM_ID}`);
    if (!settingsState.sidebarIconsOnlyEnabled) {
      if (existing instanceof HTMLElement)
        existing.remove();
      return;
    }
    const listCandidates = Array.from(nav.querySelectorAll("ul, ol")).filter((list) => list.querySelector("li"));
    const hostList = listCandidates[listCandidates.length - 1];
    if (!(hostList instanceof HTMLElement))
      return;
    let item = existing;
    if (!(item instanceof HTMLLIElement)) {
      item = document.createElement("li");
      item.id = RP_SIDEBAR_PLUS_ITEM_ID;
      const button = document.createElement("button");
      button.type = "button";
      button.className = RP_SIDEBAR_PLUS_BTN_CLASS;
      button.setAttribute("aria-label", "RblxPlus");
      button.addEventListener("click", () => {
        window.location.assign(getPremiumMembershipUrl());
      });
      const icon = document.createElement("img");
      icon.className = RP_SIDEBAR_PLUS_ICON_CLASS;
      icon.src = RP_RBLX_PLUS_LOGO_URL;
      icon.alt = "RblxPlus";
      button.appendChild(icon);
      item.appendChild(button);
    }
    if (item.parentElement !== hostList)
      hostList.appendChild(item);
  }
  function updateSidebarCompactVisibility() {
    const existingStyle = document.getElementById(RP_SIDEBAR_COMPACT_STYLE_ID);
    if (!settingsState.sidebarIconsOnlyEnabled) {
      if (existingStyle instanceof HTMLStyleElement)
        existingStyle.remove();
      return;
    }
    let style = existingStyle;
    if (!(style instanceof HTMLStyleElement)) {
      style = document.createElement("style");
      style.id = RP_SIDEBAR_COMPACT_STYLE_ID;
    }
    style.textContent = SIDEBAR_COMPACT_CSS;
    document.documentElement.appendChild(style);
  }
  function syncSidebarCompactDecorations() {
    tagOfficialStoreLeftNavButton();
    tagProfileLeftNavItem();
    syncSidebarCompactBottomButton();
  }

  var FALLBACK_LANGUAGE_KEYS = {
    en: {
      "settings.hero.title": "RoPrime Settings",
      "settings.hero.subtitle": "Make Roblox things feel right again.",
      "settings.nav.design": "Design",
      "settings.nav.settings": "Settings",
      "settings.nav.info": "Info",
      "settings.nav.developer": "Developer",
      "settings.search.placeholder": "Search settings...",
      "settings.search.minLength": "Please type at least 2 characters",
      "settings.search.developerLocked": "Developer page unlocked. It is highly recommended not to use it because it is mostly useless.",
      "settings.rename.title": "Rename Roblox wording",
      "settings.rename.communities": "Communities -> Groups",
      "settings.rename.experiences": "Experiences -> Games",
      "settings.rename.marketplace": "Marketplace -> Catalog",
      "settings.oldNav.title": "Old Navigation bar",
      "settings.oldNav.desc": "In development. Keep disabled unless you are testing it.",
      "settings.sidebar.title": "Sidebar size",
      "settings.sidebar.desc": "Drag freely, then release to snap to the nearest mode.",
      "settings.sidebar.full": "Full",
      "settings.sidebar.small": "Small",
      "settings.sidebar.icon": "Icon only",
      "settings.friend.title": "Friend styling reimagined",
      "settings.friend.desc": "Restyles the friends carousel with a dark glass card and animated presence ring glow.",
      "settings.language.title": "Language",
      "settings.language.desc": "Choose your RoPrime language.",
      "settings.language.en": "English",
      "settings.language.ru": "Russian",
      "settings.info.title": "RoPrime",
      "settings.info.text": "This extension adds an RoPrime settings panel on your Roblox Account page and can rename some modern Roblox wording back to classic terms.",
      "settings.developer.title": "Developer tools",
      "settings.developer.desc": "This page is hidden by default. It is highly recommended not to use it because it is mostly useless.",
      "settings.developer.blocked.title": "Blocked execution pages",
      "settings.developer.blocked.desc": "Add one URL fragment or exact page match per line. RoPrime will stop executing on any matching page.",
      "settings.developer.blocked.placeholder": "/my/account?rovalra=info",
      "settings.developer.blocked.save": "Save blocked pages"
    },
    ru: {
      "settings.hero.title": "Настройки RoPrime",
      "settings.hero.subtitle": "Сделайте Roblox удобнее и привычнее.",
      "settings.nav.design": "Дизайн",
      "settings.nav.settings": "Настройки",
      "settings.nav.info": "Инфо",
      "settings.nav.developer": "Developer",
      "settings.search.placeholder": "Поиск настроек...",
      "settings.search.minLength": "Введите минимум 2 символа",
      "settings.search.developerLocked": "Страница Developer разблокирована. Настоятельно не рекомендуется ее использовать, потому что она почти бесполезна.",
      "settings.rename.title": "Переименование терминов Roblox",
      "settings.rename.communities": "Communities -> Groups",
      "settings.rename.experiences": "Experiences -> Games",
      "settings.rename.marketplace": "Marketplace -> Catalog",
      "settings.oldNav.title": "Старая панель навигации",
      "settings.oldNav.desc": "В разработке. Включайте только для тестов.",
      "settings.sidebar.title": "Размер боковой панели",
      "settings.sidebar.desc": "Перетяните ползунок и отпустите для выбора ближайшего режима.",
      "settings.sidebar.full": "Полный",
      "settings.sidebar.small": "Малый",
      "settings.sidebar.icon": "Только иконки",
      "settings.friend.title": "Новый стиль друзей",
      "settings.friend.desc": "Обновляет карусель друзей: темная карточка и анимированное свечение статуса.",
      "settings.language.title": "Язык",
      "settings.language.desc": "Выберите язык RoPrime.",
      "settings.language.en": "Английский",
      "settings.language.ru": "Русский",
      "settings.info.title": "RoPrime",
      "settings.info.text": "Это расширение добавляет панель настроек RoPrime на страницу аккаунта Roblox и может возвращать классические названия разделов.",
      "settings.developer.title": "Developer tools",
      "settings.developer.desc": "Эта страница скрыта по умолчанию. Настоятельно не рекомендуется ее использовать, потому что она почти бесполезна.",
      "settings.developer.blocked.title": "Страницы с отключенным выполнением",
      "settings.developer.blocked.desc": "Добавьте по одной части URL или точному совпадению страницы на строку. На совпадающих страницах RoPrime не будет ничего выполнять.",
      "settings.developer.blocked.placeholder": "/my/account?rovalra=info",
      "settings.developer.blocked.save": "Сохранить список страниц"
    }
  };
  var RP_DEBUG_UNLOCK_VALUE = "debug";
  var languageKeysCache = null;
  var languageKeysPromise = null;
  function getLanguageCode() {
    return settingsState.language === "ru" ? "ru" : "en";
  }
  function getLanguageLabel(langCode) {
    const dict = languageKeysCache?.[getLanguageCode()] || FALLBACK_LANGUAGE_KEYS[getLanguageCode()];
    if (langCode === "ru")
      return dict["settings.language.ru"];
    return dict["settings.language.en"];
  }
  async function ensureLanguageKeys() {
    if (languageKeysCache)
      return languageKeysCache;
    if (languageKeysPromise)
      return languageKeysPromise;
    languageKeysPromise = (async () => {
      try {
        if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
          const url = chrome.runtime.getURL("language-keys.json");
          const response = await fetch(url, { cache: "no-store" });
          if (response.ok) {
            const data = await response.json();
            if (data && typeof data === "object") {
              languageKeysCache = data;
              return languageKeysCache;
            }
          }
        }
      } catch {}
      languageKeysCache = FALLBACK_LANGUAGE_KEYS;
      return languageKeysCache;
    })();
    return languageKeysPromise;
  }
  function t(key) {
    const dict = languageKeysCache?.[getLanguageCode()] || FALLBACK_LANGUAGE_KEYS[getLanguageCode()];
    return dict?.[key] || FALLBACK_LANGUAGE_KEYS.en[key] || key;
  }
  function getBlockedExecutionPagesValue() {
    if (!Array.isArray(settingsState.blockedExecutionPages))
      return "";
    return settingsState.blockedExecutionPages.join("\n");
  }
  function parseBlockedExecutionPages(value) {
    if (typeof value !== "string")
      return [];
    const seen = new Set();
    return value.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean).filter((entry) => {
      const key = entry.toLowerCase();
      if (seen.has(key))
        return false;
      seen.add(key);
      return true;
    });
  }
  function isDeveloperPageUnlocked() {
    return !!settingsState.developerPageUnlocked;
  }
  function escapeForRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function getLevenshteinDistance(a, b) {
    if (!a.length)
      return b.length;
    if (!b.length)
      return a.length;
    const matrix = Array.from({ length: b.length + 1 }, (_, row) => Array.from({ length: a.length + 1 }, (_2, col) => row === 0 ? col : col === 0 ? row : 0));
    for (let row = 1;row <= b.length; row += 1) {
      for (let col = 1;col <= a.length; col += 1) {
        const indicator = a[col - 1] === b[row - 1] ? 0 : 1;
        matrix[row][col] = Math.min(matrix[row][col - 1] + 1, matrix[row - 1][col] + 1, matrix[row - 1][col - 1] + indicator);
      }
    }
    return matrix[b.length][a.length];
  }
  function isSearchMatch(text, query) {
    const normalized = text.toLowerCase().trim();
    const queryNoSpaces = query.replace(/\s+/g, "");
    if (!normalized)
      return false;
    if (normalized.includes(query))
      return true;
    if (normalized.replace(/\s+/g, "").includes(queryNoSpaces))
      return true;
    const words = normalized.split(/\s+/).filter(Boolean);
    const threshold = query.length > 5 ? 2 : 1;
    return words.some((word) => getLevenshteinDistance(query, word) <= threshold);
  }
  function clearSearchHighlights(root) {
    if (!(root instanceof Element))
      return;
    root.querySelectorAll("[data-roprime-search-highlight]").forEach((element) => {
      if (!(element instanceof HTMLElement))
        return;
      const original = element.dataset.roprimeSearchOriginalText;
      if (typeof original === "string") {
        element.textContent = original;
      }
      delete element.dataset.roprimeSearchOriginalText;
      delete element.dataset.roprimeSearchHighlight;
    });
  }
  function applySearchHighlights(root, term) {
    if (!(root instanceof Element))
      return;
    if (!term) {
      clearSearchHighlights(root);
      return;
    }
    const matcher = new RegExp(`(${escapeForRegex(term)})`, "gi");
    const highlightTargets = [
      ".roprime-setting-title",
      ".roprime-setting-desc",
      ".roprime-toggle-title",
      ".roprime-toggle-desc",
      ".roprime-sidebar-size-tick span",
      ".roprime-info-title",
      ".roprime-info-text",
      ".roprime-language-option",
      "[data-roprime-lang-current]"
    ];
    root.querySelectorAll(highlightTargets.join(", ")).forEach((element) => {
      if (!(element instanceof HTMLElement))
        return;
      const sourceText = element.dataset.roprimeSearchOriginalText ?? element.textContent ?? "";
      element.dataset.roprimeSearchOriginalText = sourceText;
      const highlighted = sourceText.replace(matcher, '<mark class="roprime-search-mark">$1</mark>');
      element.innerHTML = highlighted;
      element.dataset.roprimeSearchHighlight = "1";
    });
  }
  async function applyPaneTranslations(pane) {
    await ensureLanguageKeys();
    pane.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key)
        return;
      el.textContent = t(key);
    });
    pane.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (!key)
        return;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.placeholder = t(key);
      }
    });
    const current = pane.querySelector("[data-roprime-lang-current]");
    if (current instanceof HTMLElement)
      current.textContent = getLanguageLabel(getLanguageCode());
  }
  function buildSettingsPaneMarkup() {
    return `
        <div class="${RP_PANEL_CLASS}">
            <div class="roprime-settings-hero"><h2 data-i18n="settings.hero.title"></h2><p data-i18n="settings.hero.subtitle"></p></div>
            <div class="roprime-settings-layout">
                <div class="roprime-settings-sidebar">
                    <div class="roprime-settings-search-wrap" data-roprime-shared-search-wrap><input id="roprime-settings-search" type="search" class="roprime-settings-search" data-i18n-placeholder="settings.search.placeholder" /></div>
                    <div class="roprime-settings-nav" role="tablist" aria-label="RoPrime Settings sections">
                        <button class="roprime-settings-nav-btn" data-roprime-page="design" type="button" data-i18n="settings.nav.design"></button>
                        <button class="roprime-settings-nav-btn" data-roprime-page="settings" type="button" data-i18n="settings.nav.settings"></button>
                        <button class="roprime-settings-nav-btn" data-roprime-page="info" type="button" data-i18n="settings.nav.info"></button>
                        <button class="roprime-settings-nav-btn" data-roprime-page="developer" type="button" data-i18n="settings.nav.developer" hidden></button>
                    </div>
                </div>
                <div class="roprime-settings-main">
                    <div class="roprime-search-hint" data-roprime-search-hint data-i18n="settings.search.minLength"></div>
                    <div class="roprime-search-hint" data-roprime-developer-unlock-message data-i18n="settings.search.developerLocked" style="display:none;"></div>
                    <section class="roprime-settings-section" data-roprime-section="design">
                        <div class="roprime-setting-card roprime-accordion" data-roprime-accordion="rename">
                            <div class="roprime-accordion-header" role="button" tabindex="0" aria-expanded="false">
                                <div class="roprime-setting-copy"><div class="roprime-setting-title" data-i18n="settings.rename.title"></div></div>
                                <label class="roprime-switch roprime-accordion-master-switch" for="roprime-toggle-rename-master"><input id="roprime-toggle-rename-master" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label>
                                <span class="roprime-accordion-chevron" aria-hidden="true"></span>
                            </div>
                            <div class="roprime-accordion-body" hidden>
                                <div class="roprime-toggle-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="settings.rename.communities"></div></div><label class="roprime-switch" for="roprime-toggle-rename-communities"><input id="roprime-toggle-rename-communities" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                                <div class="roprime-toggle-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="settings.rename.experiences"></div></div><label class="roprime-switch" for="roprime-toggle-rename-experiences"><input id="roprime-toggle-rename-experiences" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                                <div class="roprime-toggle-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="settings.rename.marketplace"></div></div><label class="roprime-switch" for="roprime-toggle-rename-marketplace"><input id="roprime-toggle-rename-marketplace" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                            </div>
                        </div>
                        <div class="roprime-toggle-row roprime-setting-card-spaced"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="settings.oldNav.title"></div><div class="roprime-toggle-desc" data-i18n="settings.oldNav.desc"></div></div><label class="roprime-switch" for="roprime-toggle-old-navigation-bar"><input id="roprime-toggle-old-navigation-bar" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                        <div class="roprime-toggle-row roprime-setting-card-spaced roprime-sidebar-size-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="settings.sidebar.title"></div><div class="roprime-toggle-desc" data-i18n="settings.sidebar.desc"></div></div><div class="roprime-sidebar-size-control"><div class="roprime-sidebar-size-box"><div class="roprime-sidebar-size-rail"><input id="roprime-sidebar-size-slider" class="roprime-sidebar-size-slider" type="range" min="0" max="100" step="0.1" value="0" aria-label="Sidebar size" /></div><div class="roprime-sidebar-size-ticks"><button class="roprime-sidebar-size-tick" type="button" data-size-mode="full"><span data-i18n="settings.sidebar.full"></span></button><button class="roprime-sidebar-size-tick" type="button" data-size-mode="small"><span data-i18n="settings.sidebar.small"></span></button><button class="roprime-sidebar-size-tick" type="button" data-size-mode="icon"><span data-i18n="settings.sidebar.icon"></span></button></div></div></div></div>
                        <div class="roprime-toggle-row roprime-setting-card-spaced"><div class="roprime-toggle-copy"><div class="roprime-toggle-title" data-i18n="settings.friend.title"></div><div class="roprime-toggle-desc" data-i18n="settings.friend.desc"></div></div><label class="roprime-switch" for="roprime-toggle-friend-styling-reimagned"><input id="roprime-toggle-friend-styling-reimagned" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                    </section>
                    <section class="roprime-settings-section" data-roprime-section="settings">
                        <div class="roprime-setting-card">
                            <div class="roprime-setting-copy">
                                <div class="roprime-setting-title" data-i18n="settings.language.title"></div>
                                <div class="roprime-setting-desc" data-i18n="settings.language.desc"></div>
                            </div>
                            <div class="roprime-language-dropdown" data-roprime-language-dropdown>
                                <button type="button" class="roprime-language-trigger"><span data-roprime-lang-current></span><span class="roprime-language-chevron" aria-hidden="true"></span></button>
                                <div class="roprime-language-menu" hidden>
                                    <button type="button" class="roprime-language-option" data-lang="en" data-i18n="settings.language.en"></button>
                                    <button type="button" class="roprime-language-option" data-lang="ru" data-i18n="settings.language.ru"></button>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section class="roprime-settings-section" data-roprime-section="info"><div class="roprime-info-card"><div class="roprime-info-title" data-i18n="settings.info.title"></div><div class="roprime-info-text" data-i18n="settings.info.text"></div></div></section>
                    <section class="roprime-settings-section" data-roprime-section="developer" hidden>
                        <div class="roprime-setting-card">
                            <div class="roprime-setting-copy">
                                <div class="roprime-setting-title" data-i18n="settings.developer.title"></div>
                                <div class="roprime-setting-desc" data-i18n="settings.developer.desc"></div>
                            </div>
                        </div>
                        <div class="roprime-setting-card roprime-setting-card-spaced">
                            <div class="roprime-setting-copy">
                                <div class="roprime-setting-title" data-i18n="settings.developer.blocked.title"></div>
                                <div class="roprime-setting-desc" data-i18n="settings.developer.blocked.desc"></div>
                            </div>
                            <textarea id="roprime-developer-blocked-pages" class="roprime-settings-search" rows="6" spellcheck="false" data-i18n-placeholder="settings.developer.blocked.placeholder"></textarea>
                            <div style="margin-top:12px;">
                                <button type="button" class="btn-secondary-md" id="roprime-save-blocked-pages" data-i18n="settings.developer.blocked.save"></button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>`;
  }
  function ensureStandaloneSettingsView() {
    const accountBase = document.getElementById("react-user-account-base");
    if (!(accountBase instanceof HTMLElement))
      return null;
    let standalone = accountBase.querySelector(`#${RP_STANDALONE_ID}`);
    if (!standalone) {
      standalone = document.createElement("div");
      standalone.id = RP_STANDALONE_ID;
      standalone.innerHTML = buildSettingsPaneMarkup();
      accountBase.appendChild(standalone);
    } else {
      const legacyDescription = standalone.querySelector('[data-roprime-accordion="rename"] .roprime-setting-desc');
      const missingSidebarSizeSlider = !standalone.querySelector("#roprime-sidebar-size-slider");
      const missingOldNavigationBarToggle = !standalone.querySelector("#roprime-toggle-old-navigation-bar");
      const missingFriendStylingReimagnedToggle = !standalone.querySelector("#roprime-toggle-friend-styling-reimagned");
      const missingDeveloperSection = !standalone.querySelector('[data-roprime-section="developer"]');
      if (legacyDescription || missingSidebarSizeSlider || missingOldNavigationBarToggle || missingFriendStylingReimagnedToggle || missingDeveloperSection) {
        standalone.innerHTML = buildSettingsPaneMarkup();
        standalone.removeAttribute("data-roprime-controls-bound");
        standalone.removeAttribute("data-roprime-design-toggles-bound");
      }
    }
    applyPaneTranslations(standalone);
    return standalone;
  }
  function updateStandaloneSettingsVisibility(showPanel) {
    const accountBase = document.getElementById("react-user-account-base");
    if (!(accountBase instanceof HTMLElement))
      return null;
    const elementsToToggle = [
      accountBase.querySelector(".tab-content.rbx-tab-content"),
      accountBase.querySelector(".tab-content"),
      accountBase.querySelector("#settings-container"),
      accountBase.querySelector("#mobile-navigation-dropdown")
    ];
    elementsToToggle.forEach((element) => {
      if (!(element instanceof HTMLElement))
        return;
      if (showPanel) {
        element.setAttribute("data-roprime-hidden-by-panel", "1");
        element.style.display = "none";
        return;
      }
      if (element.getAttribute("data-roprime-hidden-by-panel") !== "1")
        return;
      element.style.display = "";
      element.removeAttribute("data-roprime-hidden-by-panel");
    });
    const standalone = ensureStandaloneSettingsView();
    if (!(standalone instanceof HTMLElement))
      return null;
    standalone.style.display = showPanel ? "block" : "none";
    return standalone;
  }
  function bindIndependentDesignToggles(pane, actions, onNavigate) {
    if (pane.getAttribute("data-roprime-design-toggles-bound") === "1")
      return;
    const oldNavigationBarToggle = pane.querySelector("#roprime-toggle-old-navigation-bar");
    const sidebarSizeSlider = pane.querySelector("#roprime-sidebar-size-slider");
    const friendStylingReimagnedToggle = pane.querySelector("#roprime-toggle-friend-styling-reimagned");
    const searchInput = pane.querySelector("#roprime-settings-search");
    const blockedPagesTextarea = pane.querySelector("#roprime-developer-blocked-pages");
    const saveBlockedPagesButton = pane.querySelector("#roprime-save-blocked-pages");
    if (oldNavigationBarToggle instanceof HTMLInputElement) {
      oldNavigationBarToggle.addEventListener("change", () => {
        settingsState.oldNavigationBarEnabled = oldNavigationBarToggle.checked;
        saveSettings();
        actions.updateOldNavigationBarVisibility();
      });
    }
    if (sidebarSizeSlider instanceof HTMLInputElement) {
      const modeValues = { full: 0, small: 50, icon: 100 };
      const nearestModeForValue = (raw) => {
        const value = Number(raw);
        if (Number.isNaN(value))
          return "full";
        if (value < 25)
          return "full";
        if (value < 75)
          return "small";
        return "icon";
      };
      const applySidebarMode = (mode) => {
        settingsState.smallNewNavigationBarEnabled = mode === "small";
        settingsState.sidebarIconsOnlyEnabled = mode === "icon";
        saveSettings();
        actions.updateSmallNewNavVisibility();
        actions.updateSidebarCompactVisibility();
        pane.setAttribute("data-roprime-sidebar-size-mode", mode);
        pane.querySelectorAll(".roprime-sidebar-size-tick").forEach((tick) => {
          if (!(tick instanceof HTMLButtonElement))
            return;
          tick.classList.toggle("is-active", tick.dataset.sizeMode === mode);
        });
      };
      const setSidebarModeVisual = (mode) => {
        pane.setAttribute("data-roprime-sidebar-size-mode", mode);
        pane.querySelectorAll(".roprime-sidebar-size-tick").forEach((tick) => {
          if (!(tick instanceof HTMLButtonElement))
            return;
          tick.classList.toggle("is-active", tick.dataset.sizeMode === mode);
        });
      };
      const commitNearestMode = () => {
        const mode = nearestModeForValue(sidebarSizeSlider.value);
        sidebarSizeSlider.value = String(modeValues[mode]);
        applySidebarMode(mode);
        sidebarSizeSlider.removeAttribute("data-roprime-dragging");
      };
      const commitIfDragging = () => {
        if (sidebarSizeSlider.getAttribute("data-roprime-dragging") !== "1")
          return;
        commitNearestMode();
      };
      sidebarSizeSlider.addEventListener("input", () => {
        sidebarSizeSlider.setAttribute("data-roprime-dragging", "1");
        setSidebarModeVisual(nearestModeForValue(sidebarSizeSlider.value));
      });
      sidebarSizeSlider.addEventListener("change", commitNearestMode);
      sidebarSizeSlider.addEventListener("pointerdown", () => {
        sidebarSizeSlider.setAttribute("data-roprime-dragging", "1");
      });
      sidebarSizeSlider.addEventListener("pointerup", commitNearestMode);
      sidebarSizeSlider.addEventListener("pointercancel", commitIfDragging);
      sidebarSizeSlider.addEventListener("blur", commitIfDragging);
      document.addEventListener("pointerup", commitIfDragging);
      sidebarSizeSlider.addEventListener("keyup", (event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home" || event.key === "End") {
          commitNearestMode();
        }
      });
      pane.querySelectorAll(".roprime-sidebar-size-tick").forEach((tick) => {
        if (!(tick instanceof HTMLButtonElement))
          return;
        tick.addEventListener("click", () => {
          const mode = tick.dataset.sizeMode || "full";
          const nextValue = modeValues[mode] ?? modeValues.full;
          sidebarSizeSlider.value = String(nextValue);
          sidebarSizeSlider.removeAttribute("data-roprime-dragging");
          applySidebarMode(mode);
        });
      });
    }
    if (searchInput instanceof HTMLInputElement) {
      const unlockDeveloperPage = () => {
        if (isDeveloperPageUnlocked())
          return;
        settingsState.developerPageUnlocked = true;
        saveSettings();
        pane.setAttribute("data-roprime-developer-unlock-message-visible", "1");
      };
      const enterSearchMode = () => {
        const isSearchMode = pane.getAttribute("data-roprime-search-mode") === "1";
        const currentPage = getCurrentrp() || RP_DEFAULT_PAGE;
        const sourcePage = currentPage === "info" || currentPage === "developer" ? RP_DEFAULT_PAGE : currentPage;
        pane.setAttribute("data-roprime-search-source-page", sourcePage);
        if (!isSearchMode) {
          searchInput.value = "";
        }
        pane.setAttribute("data-roprime-search-mode", "1");
        refreshSettingsControls(pane);
      };
      searchInput.addEventListener("focus", enterSearchMode);
      searchInput.addEventListener("click", enterSearchMode);
      searchInput.addEventListener("input", () => {
        if (pane.getAttribute("data-roprime-search-mode") !== "1")
          return;
        if (searchInput.value.trim().toLowerCase() === RP_DEBUG_UNLOCK_VALUE) {
          unlockDeveloperPage();
        }
        refreshSettingsControls(pane);
      });
    }
    if (blockedPagesTextarea instanceof HTMLTextAreaElement) {
      blockedPagesTextarea.addEventListener("keydown", (event) => event.stopPropagation());
      blockedPagesTextarea.addEventListener("input", () => {
        if (saveBlockedPagesButton instanceof HTMLButtonElement)
          saveBlockedPagesButton.disabled = false;
      });
    }
    if (saveBlockedPagesButton instanceof HTMLButtonElement && blockedPagesTextarea instanceof HTMLTextAreaElement) {
      saveBlockedPagesButton.addEventListener("click", () => {
        settingsState.blockedExecutionPages = parseBlockedExecutionPages(blockedPagesTextarea.value);
        saveSettings();
        saveBlockedPagesButton.disabled = true;
      });
    }
    const languageDropdown = pane.querySelector("[data-roprime-language-dropdown]");
    const languageMenu = languageDropdown?.querySelector(".roprime-language-menu");
    const languageTrigger = languageDropdown?.querySelector(".roprime-language-trigger");
    if (languageDropdown instanceof HTMLElement && languageMenu instanceof HTMLElement && languageTrigger instanceof HTMLButtonElement) {
      languageTrigger.addEventListener("click", () => {
        const next = !languageDropdown.classList.contains("is-open");
        languageDropdown.classList.toggle("is-open", next);
        languageMenu.hidden = !next;
      });
      languageMenu.querySelectorAll(".roprime-language-option").forEach((option) => {
        if (!(option instanceof HTMLButtonElement))
          return;
        option.addEventListener("click", () => {
          const next = option.dataset.lang === "ru" ? "ru" : "en";
          settingsState.language = next;
          saveSettings();
          languageDropdown.classList.remove("is-open");
          languageMenu.hidden = true;
          applyPaneTranslations(pane);
        });
      });
      document.addEventListener("click", (event) => {
        if (!(event.target instanceof Element))
          return;
        if (languageDropdown.contains(event.target))
          return;
        languageDropdown.classList.remove("is-open");
        languageMenu.hidden = true;
      });
    }
    if (friendStylingReimagnedToggle instanceof HTMLInputElement) {
      friendStylingReimagnedToggle.addEventListener("change", () => {
        settingsState.friendStylingReimagnedEnabled = friendStylingReimagnedToggle.checked;
        saveSettings();
        actions.updateFriendStylingReimagnedVisibility();
      });
    }
    pane.querySelectorAll(".roprime-settings-nav-btn").forEach((button) => {
      if (!(button instanceof HTMLButtonElement))
        return;
      button.addEventListener("click", () => {
        if (button.dataset.roprimePage === "developer" && !isDeveloperPageUnlocked())
          return;
        pane.removeAttribute("data-roprime-search-mode");
        pane.removeAttribute("data-roprime-search-source-page");
        const searchBox = pane.querySelector("#roprime-settings-search");
        if (searchBox instanceof HTMLInputElement)
          searchBox.value = "";
        const nextPage = button.dataset.roprimePage || RP_DEFAULT_PAGE;
        const nextUrl = buildPluginUrl(nextPage);
        const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (currentUrl !== nextUrl)
          window.history.pushState({ oldRobloxSettings: true }, "", nextUrl);
        onNavigate();
      });
    });
    pane.setAttribute("data-roprime-design-toggles-bound", "1");
  }
  function bindSettingsControls(pane, actions, onNavigate) {
    bindIndependentDesignToggles(pane, actions, onNavigate);
    if (pane.getAttribute("data-roprime-controls-bound") === "1")
      return;
    const accordion = pane.querySelector('[data-roprime-accordion="rename"]');
    const accordionHeader = accordion?.querySelector(".roprime-accordion-header");
    const accordionBody = accordion?.querySelector(".roprime-accordion-body");
    const masterToggle = pane.querySelector("#roprime-toggle-rename-master");
    const communitiesToggle = pane.querySelector("#roprime-toggle-rename-communities");
    const experiencesToggle = pane.querySelector("#roprime-toggle-rename-experiences");
    const marketplaceToggle = pane.querySelector("#roprime-toggle-rename-marketplace");
    if (!(accordion instanceof HTMLElement))
      return;
    if (!(accordionHeader instanceof HTMLElement))
      return;
    if (!(accordionBody instanceof HTMLElement))
      return;
    if (!(masterToggle instanceof HTMLInputElement))
      return;
    if (!(communitiesToggle instanceof HTMLInputElement))
      return;
    if (!(experiencesToggle instanceof HTMLInputElement))
      return;
    if (!(marketplaceToggle instanceof HTMLInputElement))
      return;
    const syncAccordionA11y = () => {
      const isOpen = accordion.classList.contains("is-open");
      accordionHeader.setAttribute("aria-expanded", String(isOpen));
      accordionBody.setAttribute("aria-hidden", String(!isOpen));
    };
    const animateAccordion = (open) => {
      const currentHeight = accordionBody.scrollHeight;
      accordionBody.style.maxHeight = `${currentHeight}px`;
      if (open) {
        accordion.classList.add("is-open");
        requestAnimationFrame(() => {
          accordionBody.style.maxHeight = `${accordionBody.scrollHeight}px`;
        });
      } else {
        requestAnimationFrame(() => {
          accordion.classList.remove("is-open");
          accordionBody.style.maxHeight = "0px";
        });
      }
      syncAccordionA11y();
    };
    const toggleAccordion = () => animateAccordion(!accordion.classList.contains("is-open"));
    const openAccordion = () => {
      if (!accordion.classList.contains("is-open"))
        animateAccordion(true);
    };
    const closeAccordion = () => {
      if (accordion.classList.contains("is-open"))
        animateAccordion(false);
    };
    masterToggle.addEventListener("pointerdown", (event) => event.stopPropagation());
    masterToggle.addEventListener("click", (event) => event.stopPropagation());
    masterToggle.closest("label")?.addEventListener("pointerdown", (event) => event.stopPropagation());
    masterToggle.closest("label")?.addEventListener("click", (event) => event.stopPropagation());
    accordionHeader.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".roprime-accordion-master-switch"))
        return;
      toggleAccordion();
    });
    accordionHeader.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ")
        return;
      const target = event.target;
      if (target instanceof Element && target.closest(".roprime-accordion-master-switch"))
        return;
      event.preventDefault();
      toggleAccordion();
    });
    const applyRenameUiEnabledState = () => {
      const enabled = !!settingsState.renameDropdownEnabled;
      masterToggle.checked = enabled;
      communitiesToggle.checked = !!settingsState.renameCommunitiesToGroups;
      experiencesToggle.checked = !!settingsState.renameExperiencesToGames;
      marketplaceToggle.checked = !!settingsState.renameMarketplaceToAvatarShop;
      accordion.classList.toggle("is-renames-disabled", !enabled);
    };
    masterToggle.addEventListener("change", () => {
      const enable = !!masterToggle.checked;
      settingsState.renameDropdownEnabled = enable;
      saveSettings();
      updateRenameLoop();
      applyRenameUiEnabledState();
      if (!enable) {
        closeAccordion();
        if (settingsState.renameCommunitiesToGroups)
          applyGroupsBackRename(document.body);
        if (settingsState.renameExperiencesToGames)
          applyGamesBackRename(document.body);
        if (settingsState.renameMarketplaceToAvatarShop)
          applyAvatarShopBackRename(document.body);
        return;
      }
      openAccordion();
      if (settingsState.renameCommunitiesToGroups)
        applyCommunityRename(document.body);
      if (settingsState.renameExperiencesToGames)
        applyExperiencesRename(document.body);
      if (settingsState.renameMarketplaceToAvatarShop)
        applyMarketplaceRename(document.body);
    });
    communitiesToggle.addEventListener("change", () => {
      if (!settingsState.renameDropdownEnabled) {
        settingsState.renameDropdownEnabled = true;
        masterToggle.checked = true;
      }
      const wasEnabled = !!settingsState.renameCommunitiesToGroups;
      settingsState.renameCommunitiesToGroups = communitiesToggle.checked;
      saveSettings();
      updateRenameLoop();
      if (settingsState.renameCommunitiesToGroups) {
        applyCommunityRename(document.body);
        openAccordion();
      } else if (wasEnabled) {
        applyGroupsBackRename(document.body);
      }
      applyRenameUiEnabledState();
    });
    experiencesToggle.addEventListener("change", () => {
      if (!settingsState.renameDropdownEnabled) {
        settingsState.renameDropdownEnabled = true;
        masterToggle.checked = true;
      }
      const wasEnabled = !!settingsState.renameExperiencesToGames;
      settingsState.renameExperiencesToGames = experiencesToggle.checked;
      saveSettings();
      updateRenameLoop();
      if (settingsState.renameExperiencesToGames) {
        applyExperiencesRename(document.body);
        openAccordion();
      } else if (wasEnabled) {
        applyGamesBackRename(document.body);
      }
      applyRenameUiEnabledState();
    });
    marketplaceToggle.addEventListener("change", () => {
      if (!settingsState.renameDropdownEnabled) {
        settingsState.renameDropdownEnabled = true;
        masterToggle.checked = true;
      }
      const wasEnabled = !!settingsState.renameMarketplaceToAvatarShop;
      settingsState.renameMarketplaceToAvatarShop = marketplaceToggle.checked;
      saveSettings();
      updateRenameLoop();
      if (settingsState.renameMarketplaceToAvatarShop) {
        applyMarketplaceRename(document.body);
        openAccordion();
      } else if (wasEnabled) {
        applyAvatarShopBackRename(document.body);
      }
      applyRenameUiEnabledState();
    });
    accordionBody.hidden = false;
    accordionBody.style.maxHeight = accordion.classList.contains("is-open") ? `${accordionBody.scrollHeight}px` : "0px";
    syncAccordionA11y();
    applyRenameUiEnabledState();
    pane.setAttribute("data-roprime-controls-bound", "1");
  }
  async function refreshSettingsControls(pane) {
    await applyPaneTranslations(pane);
    const masterToggle = pane.querySelector("#roprime-toggle-rename-master");
    const communitiesToggle = pane.querySelector("#roprime-toggle-rename-communities");
    const experiencesToggle = pane.querySelector("#roprime-toggle-rename-experiences");
    const marketplaceToggle = pane.querySelector("#roprime-toggle-rename-marketplace");
    const oldNavigationBarToggle = pane.querySelector("#roprime-toggle-old-navigation-bar");
    const sidebarSizeSlider = pane.querySelector("#roprime-sidebar-size-slider");
    const friendStylingReimagnedToggle = pane.querySelector("#roprime-toggle-friend-styling-reimagned");
    const developerNavButton = pane.querySelector('.roprime-settings-nav-btn[data-roprime-page="developer"]');
    const blockedPagesTextarea = pane.querySelector("#roprime-developer-blocked-pages");
    const saveBlockedPagesButton = pane.querySelector("#roprime-save-blocked-pages");
    if (masterToggle instanceof HTMLInputElement)
      masterToggle.checked = !!settingsState.renameDropdownEnabled;
    if (communitiesToggle instanceof HTMLInputElement)
      communitiesToggle.checked = !!settingsState.renameCommunitiesToGroups;
    if (experiencesToggle instanceof HTMLInputElement)
      experiencesToggle.checked = !!settingsState.renameExperiencesToGames;
    if (marketplaceToggle instanceof HTMLInputElement)
      marketplaceToggle.checked = !!settingsState.renameMarketplaceToAvatarShop;
    if (oldNavigationBarToggle instanceof HTMLInputElement)
      oldNavigationBarToggle.checked = !!settingsState.oldNavigationBarEnabled;
    const sidebarSizeMode = settingsState.sidebarIconsOnlyEnabled ? "icon" : settingsState.smallNewNavigationBarEnabled ? "small" : "full";
    const isSidebarSizeDragging = sidebarSizeSlider instanceof HTMLInputElement && sidebarSizeSlider.getAttribute("data-roprime-dragging") === "1";
    if (sidebarSizeSlider instanceof HTMLInputElement) {
      const valueByMode = { full: "0", small: "50", icon: "100" };
      if (!isSidebarSizeDragging) {
        sidebarSizeSlider.value = valueByMode[sidebarSizeMode];
      }
    }
    if (!isSidebarSizeDragging) {
      pane.setAttribute("data-roprime-sidebar-size-mode", sidebarSizeMode);
      pane.querySelectorAll(".roprime-sidebar-size-tick").forEach((tick) => {
        if (!(tick instanceof HTMLButtonElement))
          return;
        tick.classList.toggle("is-active", tick.dataset.sizeMode === sidebarSizeMode);
      });
    }
    if (friendStylingReimagnedToggle instanceof HTMLInputElement)
      friendStylingReimagnedToggle.checked = !!settingsState.friendStylingReimagnedEnabled;
    if (developerNavButton instanceof HTMLButtonElement) {
      developerNavButton.hidden = !isDeveloperPageUnlocked();
    }
    if (blockedPagesTextarea instanceof HTMLTextAreaElement) {
      const nextValue = getBlockedExecutionPagesValue();
      if (blockedPagesTextarea.value !== nextValue)
        blockedPagesTextarea.value = nextValue;
    }
    if (saveBlockedPagesButton instanceof HTMLButtonElement)
      saveBlockedPagesButton.disabled = true;
    const accordion = pane.querySelector('[data-roprime-accordion="rename"]');
    if (accordion instanceof HTMLElement) {
      accordion.classList.toggle("is-renames-disabled", !settingsState.renameDropdownEnabled);
    }
    const activePage = getCurrentrp() || RP_DEFAULT_PAGE;
    const isSearchMode = pane.getAttribute("data-roprime-search-mode") === "1";
    const searchSourcePage = pane.getAttribute("data-roprime-search-source-page") || RP_DEFAULT_PAGE;
    pane.classList.toggle("is-search-mode", isSearchMode);
    pane.querySelectorAll(".roprime-settings-nav-btn").forEach((button) => {
      if (!(button instanceof HTMLButtonElement))
        return;
      if (button.dataset.roprimePage === "developer" && !isDeveloperPageUnlocked())
        return;
      const isActive = !isSearchMode && button.dataset.roprimePage === activePage;
      button.classList.toggle("is-active", isActive);
    });
    const searchInput = pane.querySelector("#roprime-settings-search");
    const searchTerm = searchInput instanceof HTMLInputElement ? searchInput.value.trim().toLowerCase() : "";
    const hasSearchTerm = searchTerm.length >= 2;
    const showSearchHint = isSearchMode && searchTerm.length > 0 && searchTerm.length < 2;
    const searchHint = pane.querySelector("[data-roprime-search-hint]");
    if (searchHint instanceof HTMLElement) {
      searchHint.style.display = showSearchHint ? "block" : "none";
    }
    const developerUnlockMessage = pane.querySelector("[data-roprime-developer-unlock-message]");
    if (developerUnlockMessage instanceof HTMLElement) {
      const showUnlockMessage = pane.getAttribute("data-roprime-developer-unlock-message-visible") === "1";
      developerUnlockMessage.style.display = showUnlockMessage ? "block" : "none";
    }
    pane.querySelectorAll(".roprime-settings-section").forEach((section) => {
      if (!(section instanceof HTMLElement))
        return;
      const sectionKey = section.getAttribute("data-roprime-section") || "";
      if (sectionKey === "developer" && !isDeveloperPageUnlocked()) {
        section.hidden = true;
        section.style.display = "none";
        clearSearchHighlights(section);
        return;
      }
      section.hidden = false;
      if (isSearchMode) {
        if (showSearchHint) {
          section.style.display = "none";
          clearSearchHighlights(section);
          return;
        }
        if (!hasSearchTerm) {
          if (sectionKey === "info" || sectionKey === "developer") {
            section.style.display = "none";
            clearSearchHighlights(section);
            return;
          }
          section.querySelectorAll(".roprime-toggle-row, .roprime-setting-card, .roprime-info-card").forEach((item) => {
            if (!(item instanceof HTMLElement))
              return;
            item.style.display = "";
            clearSearchHighlights(item);
          });
          section.style.display = sectionKey === searchSourcePage ? "block" : "none";
          return;
        }
        if (sectionKey === "info" || sectionKey === "developer") {
          section.style.display = "none";
          clearSearchHighlights(section);
          return;
        }
        let hasVisibleItems = false;
        section.querySelectorAll(".roprime-toggle-row, .roprime-setting-card, .roprime-info-card").forEach((item) => {
          if (!(item instanceof HTMLElement))
            return;
          const itemText = item.textContent || "";
          const isMatch = hasSearchTerm && isSearchMatch(itemText, searchTerm);
          item.style.display = isMatch ? "" : "none";
          if (isMatch) {
            hasVisibleItems = true;
            applySearchHighlights(item, searchTerm);
          } else {
            clearSearchHighlights(item);
          }
        });
        section.style.display = hasVisibleItems ? "block" : "none";
        return;
      }
      section.querySelectorAll(".roprime-toggle-row, .roprime-setting-card").forEach((item) => {
        if (!(item instanceof HTMLElement))
          return;
        item.style.display = "";
        clearSearchHighlights(item);
      });
      section.querySelectorAll(".roprime-info-card").forEach((item) => {
        if (!(item instanceof HTMLElement))
          return;
        item.style.display = "";
        clearSearchHighlights(item);
      });
      section.style.display = sectionKey === activePage && !(sectionKey === "developer" && !isDeveloperPageUnlocked()) ? "block" : "none";
    });
    const sharedSearchWrap = pane.querySelector("[data-roprime-shared-search-wrap]");
    if (sharedSearchWrap instanceof HTMLElement) {
      sharedSearchWrap.style.display = "";
    }
    if (searchInput instanceof HTMLInputElement && !isSearchMode && searchInput.value) {
      searchInput.value = "";
      pane.querySelectorAll(".roprime-settings-section .roprime-toggle-row, .roprime-settings-section .roprime-setting-card, .roprime-settings-section .roprime-info-card").forEach((item) => {
        if (!(item instanceof HTMLElement))
          return;
        item.style.display = "";
      });
    }
  }

  // src/content/pageChrome.ts
  function updateTabState(showPanel, pluginTabId) {
    const pluginTab = document.getElementById(pluginTabId);
    if (!pluginTab)
      return;
    if (showPanel)
      pluginTab.classList.add("active");
    else
      pluginTab.classList.remove("active");
  }
  function updateSidebarVisibility(hideSidebar) {
    const menu = document.querySelector(".menu-vertical");
    if (!(menu instanceof HTMLElement))
      return;
    const sidebarHost = menu.closest(".menu-vertical-container") || menu.closest(".rbx-left-col") || menu.parentElement;
    if (!(sidebarHost instanceof HTMLElement))
      return;
    sidebarHost.style.display = hideSidebar ? "none" : "";
  }
  function updateAccountHeader(showPanel) {
    const pageRoot = document.getElementById("react-user-account-base");
    if (!(pageRoot instanceof HTMLElement))
      return;
    const header = pageRoot.querySelector("h1");
    if (!(header instanceof HTMLElement))
      return;
    if (!header.hasAttribute("data-roprime-original-display")) {
      header.setAttribute("data-roprime-original-display", header.style.display || "");
    }
    if (showPanel) {
      header.style.display = "none";
      return;
    }
    if (header.hasAttribute("data-roprime-original-display")) {
      header.style.display = header.getAttribute("data-roprime-original-display") || "";
    }
  }
  function updateDocumentTitle(showPanel) {
    const root = document.documentElement;
    if (!(root instanceof HTMLElement))
      return;
    if (!root.hasAttribute("data-roprime-original-title"))
      root.setAttribute("data-roprime-original-title", document.title || "");
    if (showPanel)
      document.title = settingsState.language === "ru" ? "Настройки RoPrime" : "RoPrime Settings";
    else
      document.title = root.getAttribute("data-roprime-original-title") || document.title;
  }

  // src/content/dropdownMenu.ts
  var RP_DROPDOWN_ITEM_CLASS = "roprime-dropdown-entry";
  var dropdownObserver = null;
  var injectQueued = false;
  function getRoPrimeSettingsUrl() {
    return `${window.location.origin}/my/account?roprime=design`;
  }
  function getIconUrl2() {
    try {
      const chromeApi = globalThis.chrome;
      if (chromeApi?.runtime?.getURL) {
        return chromeApi.runtime.getURL("resources/roprime-icon.png");
      }
    } catch {
      return "resources/roprime-icon.png";
    }
    return "resources/roprime-icon.png";
  }
  function injectRoPrimeDropdownItem() {
    if (!shouldRunRoPrimeOnCurrentPage()) {
      removeRoPrimeDropdownItems();
      return;
    }
    const menus = document.querySelectorAll("ul.dropdown-menu");
    if (!menus.length)
      return;
    const iconUrl = getIconUrl2();
    const settingsUrl = getRoPrimeSettingsUrl();
    const settingsLabel = settingsState.language === "ru" ? "Настройки RoPrime" : "RoPrime Settings";
    menus.forEach((menu) => {
      if (!(menu instanceof HTMLUListElement))
        return;
      if (menu.querySelector(`li.${RP_DROPDOWN_ITEM_CLASS}`))
        return;
      const li = document.createElement("li");
      li.className = RP_DROPDOWN_ITEM_CLASS;
      li.innerHTML = `<a class="rbx-menu-item" href="${settingsUrl}"><img src="${iconUrl}" alt="" width="14" height="14" style="margin-right:8px;vertical-align:middle;" /><span>${settingsLabel}</span></a>`;
      menu.insertAdjacentElement("afterbegin", li);
    });
  }
  function removeRoPrimeDropdownItems() {
    document.querySelectorAll(`li.${RP_DROPDOWN_ITEM_CLASS}`).forEach((item) => item.remove());
  }
  function queueDropdownInjection() {
    if (injectQueued)
      return;
    injectQueued = true;
    requestAnimationFrame(() => {
      injectQueued = false;
      injectRoPrimeDropdownItem();
    });
  }
  function startDropdownMenuInjection() {
    if (!shouldRunRoPrimeOnCurrentPage()) {
      stopDropdownMenuInjection();
      return;
    }
    injectRoPrimeDropdownItem();
    if (dropdownObserver || !(document.body instanceof HTMLBodyElement))
      return;
    dropdownObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          if (mutation.target instanceof Element && mutation.target.closest("ul.dropdown-menu")) {
            queueDropdownInjection();
            return;
          }
        }
        if (mutation.type !== "childList")
          continue;
        if (mutation.addedNodes.length || mutation.removedNodes.length) {
          queueDropdownInjection();
          return;
        }
      }
    });
    dropdownObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "aria-expanded"]
    });
    document.addEventListener("pointerdown", queueDropdownInjection, true);
    document.addEventListener("click", queueDropdownInjection, true);
    document.addEventListener("keydown", queueDropdownInjection, true);
  }
  function stopDropdownMenuInjection() {
    if (dropdownObserver instanceof MutationObserver) {
      dropdownObserver.disconnect();
      dropdownObserver = null;
    }
    document.removeEventListener("pointerdown", queueDropdownInjection, true);
    document.removeEventListener("click", queueDropdownInjection, true);
    document.removeEventListener("keydown", queueDropdownInjection, true);
    removeRoPrimeDropdownItems();
  }

  // src/content/panel.ts
  function updateOldNavigationBarVisibility() {
    syncOldNavigationBar();
  }
  function cleanupBlockedRouteUi() {
    stopRenameLoop();
    stopDropdownMenuInjection();
    removeRoPrimeAccountUi();
    document.getElementById(RP_STANDALONE_ID)?.remove();
    document.getElementById(RP_RUNTIME_STYLE_ID)?.remove();
    document.getElementById(RP_SMALL_NEW_NAV_STYLE_ID)?.remove();
    document.getElementById(RP_SIDEBAR_COMPACT_STYLE_ID)?.remove();
    document.getElementById(RP_ALWAYS_SHOW_CLOSE_STYLE_ID)?.remove();
    document.getElementById(RP_FRIEND_STYLING_REIMAGNED_STYLE_ID)?.remove();
    document.getElementById("roprime-classic-left-nav-host")?.remove();
    document.getElementById("roprime-old-navbar-style")?.remove();
    document.getElementById("roprime-left-gray-frame")?.remove();
    document.getElementById("roprime-left-gray-frame-layout-style")?.remove();
    document.getElementById("roprime-custom-nav-menu-btn")?.remove();
    document.getElementById("roprime-nav-menu-slot")?.remove();
    document.documentElement.classList.remove("roprime-classic-left-nav-on", "roprime-old-navigation-bar-collapsed", "roprime-old-navbar-active", "roprime-old-navbar-rail-expanded", "roprime-old-navbar-menu-open", "roprime-always-close-collapsed", "roprime-left-gray-frame-on");
    updateAccountHeader(false);
    updateDocumentTitle(false);
    updateSidebarVisibility(false);
  }
  function syncRoEliteView() {
    if (!shouldRunRoPrimeOnCurrentPage()) {
      cleanupBlockedRouteUi();
      return;
    }
    startDropdownMenuInjection();
    injectRoPrimeDropdownItem();
    updateOldNavigationBarVisibility();
    updateSmallNewNavVisibility();
    updateSidebarCompactVisibility();
    updateFriendStylingReimagnedVisibility();
    syncSidebarCompactDecorations();
    injectRoEliteTab(syncRoEliteView);
    ensureAccountDivider();
    const showPanel = isPluginRoute();
    updateAccountHeader(showPanel);
    updateDocumentTitle(showPanel);
    if (!isAccountPage())
      return;
    const standalonePanel = updateStandaloneSettingsVisibility(showPanel);
    if (!(standalonePanel instanceof HTMLElement))
      return;
    bindSettingsControls(standalonePanel, {
      updateOldNavigationBarVisibility,
      updateSmallNewNavVisibility,
      updateSidebarCompactVisibility,
      updateFriendStylingReimagnedVisibility
    }, syncRoEliteView);
    refreshSettingsControls(standalonePanel);
    updateTabState(showPanel, RP_TAB_ID);
    updateSidebarVisibility(showPanel);
    if (settingsState.renameCommunitiesToGroups)
      applyCommunityRename(document.body);
    if (settingsState.renameExperiencesToGames)
      applyExperiencesRename(document.body);
    if (settingsState.renameMarketplaceToAvatarShop)
      applyMarketplaceRename(document.body);
    syncHomeWelcomeModal();
  }

  // src/content/index.ts
  function installStorageSyncListener() {
    if (typeof chrome === "undefined" || !chrome.storage?.onChanged)
      return;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes[RP_SETTINGS_KEY])
        return;
      loadSettings().finally(() => {
        updateRenameLoop();
        syncRoEliteView();
      });
    });
  }
  function installHistoryListeners() {
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    window.history.pushState = function(...args) {
      const result = originalPushState.apply(this, args);
      window.dispatchEvent(new Event("roprime-location-change"));
      return result;
    };
    window.history.replaceState = function(...args) {
      const result = originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event("roprime-location-change"));
      return result;
    };
    const handleRouteChange = () => {
      syncRuntimeStylesheet();
      syncRoEliteView();
    };
    window.addEventListener("popstate", handleRouteChange);
    window.addEventListener("roprime-location-change", handleRouteChange);
  }
  function syncRuntimeStylesheet() {
    const existing = document.getElementById(RP_RUNTIME_STYLE_ID);
    if (!shouldRunRoPrimeOnCurrentPage()) {
      if (existing instanceof HTMLLinkElement)
        existing.remove();
      return;
    }
    if (existing instanceof HTMLLinkElement)
      return;
    if (typeof chrome === "undefined" || typeof chrome.runtime?.getURL !== "function")
      return;
    const link = document.createElement("link");
    link.id = RP_RUNTIME_STYLE_ID;
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("style.css");
    document.documentElement.appendChild(link);
  }
  function bootstrap() {
    installStorageSyncListener();
    syncRuntimeStylesheet();
    if (shouldRunRoPrimeOnCurrentPage()) {
      startDropdownMenuInjection();
      syncHomeWelcomeModal();
    }
    loadSettings().finally(() => {
      installHistoryListeners();
      syncRuntimeStylesheet();
      if (shouldRunRoPrimeOnCurrentPage()) {
        updateRenameLoop();
      }
      if (syncIntervalId === null) {
        setSyncIntervalId(window.setInterval(syncRoEliteView, 1200));
      }
      syncRoEliteView();
      if (shouldRunRoPrimeOnCurrentPage()) {
        applyCommunityRename(document.body);
        applyExperiencesRename(document.body);
        applyMarketplaceRename(document.body);
      }
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();

//# debugId=26EF08318C6A37E964756E2164756E21
