const CDN_HOST = "lh3.googleusercontent.com";
const SNIPPET_API = "https://chromewebstore.googleapis.com/v2/items";

export const EXTENSION_ID_RE = /^[a-p]{32}$/;

export function cleanCdnUrl(url) {
  if (!url) return "";
  const stripped = url.split("=")[0];
  const match = stripped.match(
    new RegExp(`https://${CDN_HOST}/[A-Za-z0-9_-]+`),
  );
  return match ? match[0] : stripped;
}

/** filter url to exclude tags */
export function normalizeIconUrl(url) {
  const base = cleanCdnUrl(url);
  if (!base) return "";
  if (/\d$/.test(base)) return base.slice(0, -1);
  return base;
}

export function withIconSize(iconUrl, sizeSuffix) {
  const clean = normalizeIconUrl(iconUrl);
  if (!clean) return "";
  return `${clean}=${sizeSuffix}`;
}

function extractManifest(text) {
  let start = text.indexOf('{"manifest_version"');
  if (start === -1) {
    const key = text.indexOf('"manifest_version"');
    if (key === -1) return null;
    start = text.lastIndexOf("{", key);
    if (start === -1) return null;
  }

  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function parseTitleSummary(text, manifestText) {
  let name = "";
  let description = "";

  if (manifestText) {
    try {
      const manifest = JSON.parse(manifestText);
      if (manifest.name && !String(manifest.name).startsWith("__MSG_")) {
        name = manifest.name;
      }
      if (
        manifest.description &&
        !String(manifest.description).startsWith("__MSG_")
      ) {
        description = manifest.description;
      }
    } catch {
      /* ignore */
    }
  }

  if (!name || !description) {
    const after = manifestText
      ? text.slice(text.indexOf(manifestText) + manifestText.length)
      : text;
    const match = after.match(
      /([\x20-\x7E]{2,120})"([\x20-\x7E]{2,500}?)\*[\|}]/,
    );
    if (match) {
      if (!name) name = match[1].trim();
      if (!description) {
        description = match[2].trim();
        if (/^\d[A-Za-z]/.test(description)) description = description.slice(1);
      }
    }
  }

  return { name, description };
}

export function parseSnippetResponse(buffer) {
  const text = new TextDecoder().decode(buffer);
  const idMatch = text.match(/([a-p]{32})/);
  const manifestText = extractManifest(text);
  const { name, description } = parseTitleSummary(text, manifestText);

  let version = "";
  if (manifestText) {
    try {
      version = JSON.parse(manifestText).version || "";
    } catch {
      /* ignore */
    }
  }

  const logoMatch =
    text.match(
      new RegExp(
        `(?:\\*[\\|}]|\\|)?(https://${CDN_HOST}/[A-Za-z0-9_-]+)\\d?(?=[\\x00-\\x1f]|\\d{1,3},)`,
      ),
    ) ||
    text.match(
      new RegExp(`(?:\\*[\\|}]|\\|)?(https://${CDN_HOST}/[A-Za-z0-9_-]+)`),
    );

  const userCountMatch =
    text.match(/(\d{1,3}(?:,\d{3})+)(?:\+|users|\x08)/i) ||
    text.match(/(\d{1,3}(?:,\d{3})+)/);

  return {
    id: idMatch?.[1] || "",
    name,
    description,
    version,
    logoUri: normalizeIconUrl(logoMatch?.[1] || logoMatch?.[0] || ""),
    userCount: userCountMatch?.[1] || "",
  };
}

export async function fetchItemSnippet(extensionId) {
  const id = String(extensionId || "").trim().toLowerCase();
  if (!EXTENSION_ID_RE.test(id)) {
    throw new Error(`Invalid extension ID: ${id}`);
  }

  const response = await fetch(`${SNIPPET_API}/${id}:fetchItemSnippet`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-protobuf",
      "X-HTTP-Method-Override": "GET",
      "Content-Length": "0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `fetchItemSnippet failed: ${response.status} ${response.statusText}`,
    );
  }

  const snippet = parseSnippetResponse(await response.arrayBuffer());
  if (!snippet.logoUri && !snippet.name) {
    throw new Error(`Extension "${id}" not found in the Chrome Web Store.`);
  }

  return snippet;
}

export async function fetchExtensionIconUrl(extensionId, sizeSuffix = "s48") {
  const snippet = await fetchItemSnippet(extensionId);
  return withIconSize(snippet.logoUri, sizeSuffix);
}
