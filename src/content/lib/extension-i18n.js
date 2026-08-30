export function parseMsgPlaceholder(value) {
  const str = String(value || "").trim();
  const match = str.match(/^__MSG_([^_]+)__$/);
  return match ? match[1] : "";
}

export function getMessageText(messages, key) {
  const entry = messages?.[key];
  if (!entry || typeof entry !== "object") return "";
  return String(entry.message || "").trim();
}

export async function fetchExtensionLocaleMessages(extensionId, locale) {
  const id = String(extensionId || "").trim();
  const loc = String(locale || "").trim();
  if (!id || !loc) return null;

  const url = `chrome-extension://${id}/_locales/${loc}/messages.json`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const data = await response.json();
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

export async function resolveLocalizedManifestStrings(
  extensionId,
  manifest,
  pageLang = "",
) {
  if (!manifest || typeof manifest !== "object") {
    return { name: "", description: "" };
  }

  const nameKey = parseMsgPlaceholder(manifest.name);
  const descKey = parseMsgPlaceholder(manifest.description);
  const defaultLocale =
    String(manifest.default_locale || "en").trim() || "en";
  const preferredLocale = String(pageLang || "").trim() || defaultLocale;

  let name = nameKey
    ? ""
    : String(manifest.name || manifest.short_name || "").trim();
  let description = descKey ? "" : String(manifest.description || "").trim();

  if (!nameKey && !descKey) {
    return { name, description };
  }

  const localeCandidates = [];
  if (preferredLocale) localeCandidates.push(preferredLocale);
  if (defaultLocale && defaultLocale !== preferredLocale) {
    localeCandidates.push(defaultLocale);
  }

  const messagesByLocale = await Promise.all(
    localeCandidates.map(async (locale) => ({
      locale,
      messages: await fetchExtensionLocaleMessages(extensionId, locale),
    })),
  );

  const resolveField = (key) => {
    if (!key) return "";
    for (const { messages } of messagesByLocale) {
      const value = getMessageText(messages, key);
      if (value) return value;
    }
    return "";
  };

  if (nameKey) name = resolveField(nameKey);
  if (descKey) description = resolveField(descKey);

  return { name, description };
}
