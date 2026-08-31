import { resolveLocalizedManifestStrings } from "./lib/extension-i18n.js";

const extensionApi = globalThis.browser || globalThis.chrome;

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

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
    installType: String(x?.installType || "")
      .trim()
      .toLowerCase(),
  };
}

function findAllByKey(items, key) {
  const needle = String(key || "")
    .trim()
    .toLowerCase();
  if (!needle) return [];

  return items.filter(
    (x) =>
      String(x?.name || "")
        .toLowerCase()
        .includes(needle) ||
      String(x?.shortName || "")
        .toLowerCase()
        .includes(needle) ||
      String(x?.description || "")
        .toLowerCase()
        .includes(needle),
  );
}

function findByKey(items, key) {
  const matches = findAllByKey(items, key);
  return matches[0] || null;
}

function getManifestIconPath(manifest) {
  const icons = manifest?.icons;
  if (!icons || typeof icons !== "object") return "";
  if (icons["128"]) return String(icons["128"]).trim();
  const sizes = Object.keys(icons)
    .map((key) => Number(key))
    .filter((size) => Number.isFinite(size))
    .sort((a, b) => b - a);
  for (const size of sizes) {
    const path = String(icons[String(size)] || "").trim();
    if (path) return path;
  }
  return "";
}

async function fetchExtensionManifestInfo(extensionId, pageLang = "") {
  const id = String(extensionId || "").trim();
  if (!id) return { name: "", description: "", iconPath: "" };

  const manifestUrl = `chrome-extension://${id}/manifest.json`;
  try {
    const response = await fetch(manifestUrl, { cache: "no-store" });
    if (response.ok) {
      const manifest = await response.json();
      const localized = await resolveLocalizedManifestStrings(
        id,
        manifest,
        pageLang,
      );
      return {
        name:
          localized.name ||
          String(manifest?.name || manifest?.short_name || "").trim(),
        description:
          localized.description || String(manifest?.description || "").trim(),
        iconPath: getManifestIconPath(manifest),
      };
    }
  } catch {}

  return new Promise((resolve) => {
    extensionApi.management.get(id, (item) => {
      const lastErr = asLastErrorMessage();
      if (lastErr || !item) {
        return resolve({ name: "", description: "", iconPath: "" });
      }

      resolve({
        name: String(item.name || "").trim(),
        description: String(item.description || "").trim(),
        iconPath: "",
      });
    });
  });
}

function normalizeRegistryEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const key = String(entry.key || "").trim();
  if (!key) return null;
  return {
    key,
    id: String(entry.id || "").trim(),
    class: String(entry.class || "").trim(),
    settingsPath: String(entry.settingsPath || "").trim(),
    malicious:
      entry.malicious === true ||
      String(entry.malicious || "")
        .trim()
        .toLowerCase() === "true",
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

        const registry = (
          Array.isArray(message?.registry) ? message.registry : []
        )
          .map(normalizeRegistryEntry)
          .filter(Boolean);

        extensionApi.management.getAll((items) => {
          const lastErr = asLastErrorMessage();
          if (lastErr) {
            sendResponse({ ok: false, error: lastErr });
            return;
          }

          const installed = items || [];
          const pageLang = String(message?.pageLang || "").trim();

          Promise.all(
            registry.map(async (entry) => {
              const match = findByKey(installed, entry.key);
              if (!match) return null;

              const base = normalizeExtensionItem(match);
              const manifestInfo = await fetchExtensionManifestInfo(
                base.id,
                pageLang,
              );
              return {
                ...entry,
                item: {
                  ...base,
                  name: manifestInfo.name || base.name,
                  description:
                    manifestInfo.description || String(match.description || ""),
                  iconPath: manifestInfo.iconPath || "",
                },
              };
            }),
          )
            .then((results) => {
              sendResponse({
                ok: true,
                plugins: results.filter(Boolean),
              });
            })
            .catch((err) => {
              sendResponse({
                ok: false,
                error: String(err || "Unknown error"),
              });
            });
        });
      })
      .catch((err) =>
        sendResponse({ ok: false, error: String(err || "Unknown error") }),
      );
    return true;
  }

  if (type === "ROPRIME_GET_ROPRIME_INSTALLATIONS") {
    containsManagementPermission()
      .then((granted) => {
        if (!granted) {
          sendResponse({
            ok: false,
            error: "missing_management_permission",
          });
          return;
        }

        const registry = (
          Array.isArray(message?.registry) ? message.registry : []
        )
          .map(normalizeRegistryEntry)
          .filter(Boolean);

        extensionApi.management.getAll((items) => {
          const lastErr = asLastErrorMessage();
          if (lastErr) {
            sendResponse({ ok: false, error: lastErr });
            return;
          }

          const installed = items || [];
          const seen = new Set();
          const matches = [];

          for (const entry of registry) {
            for (const item of findAllByKey(installed, entry.key)) {
              const normalized = normalizeExtensionItem(item);
              if (!normalized.id || seen.has(normalized.id)) continue;
              seen.add(normalized.id);
              matches.push(normalized);
            }
          }

          sendResponse({ ok: true, items: matches });
        });
      })
      .catch((err) =>
        sendResponse({ ok: false, error: String(err || "Unknown error") }),
      );
    return true;
  }

  if (type === "ROPRIME_UNINSTALL_SELF") {
    containsManagementPermission()
      .then((granted) => {
        if (!granted) {
          sendResponse({
            ok: false,
            error: "missing_management_permission",
          });
          return;
        }

        const showConfirmDialog = message?.showConfirmDialog === true;
        extensionApi.management.uninstall(
          extensionApi.runtime.id,
          { showConfirmDialog },
          () => {
            const lastErr = asLastErrorMessage();
            if (lastErr) return sendResponse({ ok: false, error: lastErr });
            sendResponse({ ok: true });
          },
        );
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
        if (id === extensionApi.runtime.id) {
          sendResponse({ ok: false, error: "cannot_uninstall_self" });
          return;
        }
        const showConfirmDialog = message?.showConfirmDialog !== false;
        extensionApi.management.uninstall(id, { showConfirmDialog }, () => {
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

  if (type === "ROPRIME_FETCH") {
    const url = String(message?.url || "");
    const method = String(message?.method || "GET").toUpperCase();
    const headers =
      message?.headers && typeof message.headers === "object"
        ? message.headers
        : {};

    if (!url) {
      sendResponse({ ok: false, error: "missing_url" });
      return false;
    }

    fetch(url, {
      method,
      headers,
      credentials: message?.credentials === "omit" ? "omit" : "include",
    })
      .then(async (response) => {
        const buffer = await response.arrayBuffer();
        const responseHeaders = {};
        for (const [key, value] of response.headers.entries()) {
          responseHeaders[key] = value;
        }
        sendResponse({
          ok: true,
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          bodyBase64: arrayBufferToBase64(buffer),
        });
      })
      .catch((err) =>
        sendResponse({ ok: false, error: String(err || "fetch_failed") }),
      );
    return true;
  }

  return false;
});
