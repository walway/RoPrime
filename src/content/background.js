const extensionApi = globalThis.browser || globalThis.chrome;

function asLastErrorMessage() {
  try {
    const msg = extensionApi?.runtime?.lastError?.message;
    return msg ? String(msg) : "";
  } catch {
    return "";
  }
}

async function containsManagementPermission() {
  const has = await extensionApi.permissions.contains({
    permissions: ["management"],
  });
  return Boolean(has);
}

function normalizeExtensionItem(x) {
  const id = String(x?.id || "");
  return {
    id,
    name: String(x?.name || ""),
    enabled: Boolean(x?.enabled),
  };
}

function findBySearchTerms(items, searchTerms) {
  const terms = (Array.isArray(searchTerms) ? searchTerms : [searchTerms])
    .map((entry) => String(entry || "").trim().toLowerCase())
    .filter(Boolean);
  if (!terms.length) return null;

  for (const needle of terms) {
    const match =
      items.find((x) =>
        String(x?.name || "")
          .toLowerCase()
          .includes(needle),
      ) ||
      items.find((x) =>
        String(x?.shortName || "")
          .toLowerCase()
          .includes(needle),
      ) ||
      items.find((x) =>
        String(x?.description || "")
          .toLowerCase()
          .includes(needle),
      );
    if (match) return match;
  }
  return null;
}

function pickManifestIconPath(icons) {
  if (!icons || typeof icons !== "object") return "";
  const sizes = Object.keys(icons)
    .map((size) => Number.parseInt(String(size), 10))
    .filter((size) => Number.isFinite(size))
    .sort((a, b) => b - a);
  if (sizes.length) return String(icons[String(sizes[0])] || "");
  return String(icons["128"] || icons["64"] || icons["48"] || icons["32"] || "");
}

async function fetchExtensionManifestInfo(extensionId) {
  const id = String(extensionId || "").trim();
  if (!id) return { description: "", iconUrl: "" };

  const manifestUrl = `chrome-extension://${id}/manifest.json`;
  try {
    const response = await fetch(manifestUrl, { cache: "no-store" });
    if (response.ok) {
      const manifest = await response.json();
      const iconPath = pickManifestIconPath(manifest?.icons);
      const iconUrl = iconPath
        ? `chrome-extension://${id}/${String(iconPath).replace(/^\//, "")}`
        : "";
      return {
        description: String(manifest?.description || "").trim(),
        iconUrl,
      };
    }
  } catch {}

  return new Promise((resolve) => {
    extensionApi.management.get(id, (item) => {
      const lastErr = asLastErrorMessage();
      if (lastErr || !item) return resolve({ description: "", iconUrl: "" });

      const icons = Array.isArray(item.icons) ? item.icons : [];
      const icon128 =
        icons.find((entry) => Number(entry?.size) === 128) ||
        icons.slice().sort((a, b) => Number(b?.size || 0) - Number(a?.size || 0))[0];
      resolve({
        description: String(item.description || "").trim(),
        iconUrl: String(icon128?.url || "").trim(),
      });
    });
  });
}

function normalizeRegistryEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const key = String(entry.key || "").trim();
  if (!key) return null;
  const search = Array.isArray(entry.search)
    ? entry.search.map((value) => String(value || "").trim()).filter(Boolean)
    : [];
  return {
    key,
    title: String(entry.title || key).trim() || key,
    search,
    settingsPath: String(entry.settingsPath || "").trim(),
    malicious:
      entry.malicious === true ||
      String(entry.malicious || "").trim().toLowerCase() === "true",
    noToggle: Boolean(entry.noToggle),
  };
}

function isRobloxHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return host === "roblox.com" || host.endsWith(".roblox.com");
}

function isRobloxSender(sender) {
  try {
    const rawUrl =
      sender?.tab?.url ||
      sender?.url ||
      sender?.documentUrl ||
      sender?.origin ||
      "";
    if (!rawUrl) return false;
    const parsed = new URL(rawUrl);
    if (!/^https?:$/i.test(parsed.protocol)) return false;
    return isRobloxHost(parsed.hostname);
  } catch {
    return false;
  }
}

extensionApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isRobloxSender(sender)) {
    sendResponse({ ok: false, error: "forbidden_origin" });
    return false;
  }

  const type = message?.type;

  if (type === "ROPRIME_MANAGEMENT_STATUS") {
    containsManagementPermission()
      .then((granted) => sendResponse({ ok: true, granted }))
      .catch((err) =>
        sendResponse({ ok: false, error: String(err || "Unknown error") }),
      );
    return true;
  }

  if (type === "ROPRIME_REQUEST_MANAGEMENT") {
    extensionApi.permissions
      .request({ permissions: ["management"] })
      .then((granted) => sendResponse({ ok: true, granted }))
      .catch((err) =>
        sendResponse({
          ok: false,
          error: asLastErrorMessage() || String(err || ""),
        }),
      );
    return true;
  }

  if (type === "ROPRIME_GET_INSTALLED_EXTENSIONS") {
    containsManagementPermission()
      .then((granted) => {
        if (!granted)
          return sendResponse({
            ok: false,
            error: "missing_management_permission",
          });
        extensionApi.management.getAll((items) => {
          const lastErr = asLastErrorMessage();
          if (lastErr) return sendResponse({ ok: false, error: lastErr });
          sendResponse({ ok: true, items: items || [] });
        });
      })
      .catch((err) =>
        sendResponse({ ok: false, error: String(err || "Unknown error") }),
      );
    return true;
  }

  if (type === "ROPRIME_GET_WANTED_EXTENSIONS") {
    containsManagementPermission()
      .then(async (granted) => {
        if (!granted) {
          sendResponse({
            ok: false,
            error: "missing_management_permission",
          });
          return;
        }

        const registry = (Array.isArray(message?.registry) ? message.registry : [])
          .map(normalizeRegistryEntry)
          .filter(Boolean);

        extensionApi.management.getAll(async (items) => {
          const lastErr = asLastErrorMessage();
          if (lastErr) {
            sendResponse({ ok: false, error: lastErr });
            return;
          }

          const installed = items || [];
          const plugins = [];

          for (const entry of registry) {
            const match = findBySearchTerms(installed, entry.search);
            if (!match) continue;

            const base = normalizeExtensionItem(match);
            const manifestInfo = await fetchExtensionManifestInfo(base.id);
            plugins.push({
              ...entry,
              item: {
                ...base,
                description:
                  manifestInfo.description || String(match.description || ""),
                iconUrl: manifestInfo.iconUrl,
              },
            });
          }

          sendResponse({ ok: true, plugins });
        });
      })
      .catch((err) =>
        sendResponse({ ok: false, error: String(err || "Unknown error") }),
      );
    return true;
  }

  if (type === "ROPRIME_UNINSTALL_EXTENSION") {
    const id = String(message?.id || "");
    containsManagementPermission()
      .then((granted) => {
        if (!granted) {
          sendResponse({
            ok: false,
            error: "missing_management_permission",
          });
          return;
        }
        if (!id) {
          sendResponse({ ok: false, error: "missing_extension_id" });
          return;
        }
        extensionApi.management.uninstall(id, { showConfirmDialog: false }, () => {
          const lastErr = asLastErrorMessage();
          if (lastErr) return sendResponse({ ok: false, error: lastErr });
          sendResponse({ ok: true });
        });
      })
      .catch((err) =>
        sendResponse({ ok: false, error: String(err || "Unknown error") }),
      );
    return true;
  }

  if (type === "ROPRIME_SET_EXTENSION_ENABLED") {
    const id = String(message?.id || "");
    const enabled = Boolean(message?.enabled);
    containsManagementPermission()
      .then((granted) => {
        if (!granted)
          return sendResponse({
            ok: false,
            error: "missing_management_permission",
          });
        if (!id)
          return sendResponse({ ok: false, error: "missing_extension_id" });
        extensionApi.management.setEnabled(id, enabled, () => {
          const lastErr = asLastErrorMessage();
          if (lastErr) return sendResponse({ ok: false, error: lastErr });
          sendResponse({ ok: true });
        });
      })
      .catch((err) =>
        sendResponse({ ok: false, error: String(err || "Unknown error") }),
      );
    return true;
  }

  return false;
});
