const AUTH_CACHE_TTL_MS = 10 * 60 * 1000;

const AUTH_BACKOFF_MS = 60 * 1000;
const AUTH_ENDPOINT = "https://users.roblox.com/v1/users/authenticated";

let cachedAuthUserId = null;
let authCacheAt = 0;
let authBackoffUntil = 0;

let authFetchInFlight = null;

export function peekRobloxUserId() {
	return cachedAuthUserId;
}

export function invalidateRobloxUserIdCache() {
	cachedAuthUserId = null;
	authCacheAt = 0;
	authBackoffUntil = 0;
	authFetchInFlight = null;
}

export async function getRobloxUserId(options = {}) {
	const force = !!options.force;
	const now = Date.now();

	if (
		!force &&
		cachedAuthUserId != null &&
		now - authCacheAt < AUTH_CACHE_TTL_MS
	) {
		return cachedAuthUserId;
	}

	if (!force && now < authBackoffUntil) {
		return cachedAuthUserId ?? null;
	}

	if (authFetchInFlight) return authFetchInFlight;

	authFetchInFlight = (async () => {
		try {
			const response = await fetch(AUTH_ENDPOINT, {
				credentials: "include",
			});

			if (response.status === 429) {
				authBackoffUntil = Date.now() + AUTH_BACKOFF_MS;
				if (cachedAuthUserId == null) {
					console.warn("ERROR BLOCKED_BY_CLIENT BULLETIN 60");
				}
				return cachedAuthUserId;
			}

			if (!response.ok) {
				authBackoffUntil = Date.now() + AUTH_BACKOFF_MS;
				return cachedAuthUserId ?? null;
			}

			const data = await response.json();
			const userId = Number(data?.id);
			if (Number.isFinite(userId) && userId > 0) {
				cachedAuthUserId = userId;
				authCacheAt = Date.now();
				authBackoffUntil = 0;
				return userId;
			}

			return cachedAuthUserId ?? null;
		} catch {
			authBackoffUntil = Date.now() + AUTH_BACKOFF_MS;
			return cachedAuthUserId ?? null;
		} finally {
			authFetchInFlight = null;
		}
	})();

	return authFetchInFlight;
}
