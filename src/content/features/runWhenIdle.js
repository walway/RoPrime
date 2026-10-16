export function runWhenIdle(callback, timeout = 0) {
    const fn = typeof callback === 'function' ? callback : () => {}
    const safeTimeout = Number.isFinite(timeout) ? Math.max(0, timeout) : 0

    const ua = String(globalThis.navigator?.userAgent || '')
    const isFirefox = /firefox/i.test(ua) ||
        typeof globalThis.browser?.runtime?.getBrowserInfo === 'function'

    if (!isFirefox) {
        const win = typeof globalThis.window === 'object' && globalThis.window
            ? globalThis.window
            : typeof window === 'object' && window
            ? window
            : null
        if (win && typeof win.requestIdleCallback === 'function') {
            try {
                win.requestIdleCallback(
                    () => {
                        try {
                            fn()
                        } catch {
                            // ignore
                        }
                    },
                    { timeout: safeTimeout || 500 },
                )
                return
            } catch {
                /* fall through */
            }
        }
    }

    globalThis.setTimeout(() => {
        try {
            fn()
        } catch {
            // ignore
        }
    }, safeTimeout)
}
