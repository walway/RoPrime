const BR_TAG_RE = /<br\s*\/?>/gi;
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

export function shouldRenderRichText(text) {
  if (typeof text !== "string" || !text) return false;
  return (
    text.includes("\n") ||
    text.includes("[") ||
    /<br\s*\/?>/i.test(text)
  );
}

function sanitizeHref(href) {
  const value = String(href || "").trim();
  if (!value) return "";
  if (
    value.startsWith("/") ||
    value.startsWith("./") ||
    value.startsWith("../") ||
    value.startsWith("#")
  ) {
    return value;
  }
  if (/^https?:\/\//i.test(value)) return value;
  return "";
}

function appendTextWithLineBreaks(parent, text) {
  const lines = String(text || "").split("\n");
  lines.forEach((line, index) => {
    if (line) parent.appendChild(document.createTextNode(line));
    if (index < lines.length - 1) {
      parent.appendChild(document.createElement("br"));
    }
  });
}

function appendLink(parent, label, href) {
  const safeHref = sanitizeHref(href);
  if (!safeHref) {
    appendTextWithLineBreaks(parent, `[${label}](${href})`);
    return;
  }

  const link = document.createElement("a");
  link.className = "text-link";
  link.href = safeHref;
  link.textContent = label;
  if (/^https?:\/\//i.test(safeHref)) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
  parent.appendChild(link);
}

export function renderRichText(container, rawText) {
  if (!(container instanceof HTMLElement)) return;
  container.replaceChildren();

  const source = String(rawText || "").replace(BR_TAG_RE, "\n");
  if (!source) return;

  let lastIndex = 0;
  for (const match of source.matchAll(MARKDOWN_LINK_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      appendTextWithLineBreaks(container, source.slice(lastIndex, index));
    }
    appendLink(container, match[1], match[2]);
    lastIndex = index + match[0].length;
  }

  if (lastIndex < source.length) {
    appendTextWithLineBreaks(container, source.slice(lastIndex));
  }
}

export function applyPlainOrRichText(container, text) {
  if (!(container instanceof HTMLElement)) return;
  if (shouldRenderRichText(text)) {
    container.dataset.roprimeRichText = "1";
    renderRichText(container, text);
    return;
  }
  delete container.dataset.roprimeRichText;
  container.textContent = text;
}
