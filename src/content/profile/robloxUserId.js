let cachedAuthUserId = null;

function readUserDataMetaUserId() {
  const meta = document.head?.querySelector?.('meta[name="user-data"]') ||
    document.querySelector('meta[name="user-data"]');
  if (!(meta instanceof HTMLMetaElement)) return null;

  const raw =
    meta.getAttribute("data-userid") ||
    meta.dataset?.userid ||
    "";
  const userId = Number(String(raw).trim());
  if (!Number.isFinite(userId) || userId <= 0) return null;
  return userId;
}

export function peekRobloxUserId() {
  const userId = readUserDataMetaUserId();
  cachedAuthUserId = userId;
  return userId;
}

export function isRobloxAuthenticated() {
  return peekRobloxUserId() != null;
}

export function invalidateRobloxUserIdCache() {
  cachedAuthUserId = null;
}

/**
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<number | null>}
 */
export async function getRobloxUserId(options = {}) {
  const force = !!options.force;
  if (force) cachedAuthUserId = null;

  if (!force && cachedAuthUserId != null) return cachedAuthUserId;

  const userId = readUserDataMetaUserId();
  cachedAuthUserId = userId;
  return userId;
}
