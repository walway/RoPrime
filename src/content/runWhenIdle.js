export function runWhenIdle(callback, timeout = 0) {
	const fn = typeof callback === "function" ? callback : () => {};
	const safeTimeout = Number.isFinite(timeout) ? Math.max(0, timeout) : 0;

	if (typeof globalThis.requestIdleCallback === "function") {
		globalThis.requestIdleCallback(
			() => {
				try {
					fn();
				} catch {
					// ignore
				}
			},
			{ timeout: safeTimeout || 500 },
		);
		return;
	}

	globalThis.setTimeout(() => {
		try {
			fn();
		} catch {
			// ignore
		}
	}, safeTimeout);
}
