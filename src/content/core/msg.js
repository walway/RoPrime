const extensionApi = globalThis.browser || globalThis.chrome

/**
 * Prefer the Promise form of sendMessage (Firefox). Mixing callback + Promise
 * can double-settle and drop structured-clone ArrayBuffer bodies.
 */
export function send(message) {
    return new Promise((resolve, reject) => {
        if (!extensionApi?.runtime?.sendMessage) {
            reject(new Error('extension_runtime_unavailable'))
            return
        }

        let settled = false
        const settle = (fn, value) => {
            if (settled) return
            settled = true
            fn(value)
        }

        try {
            // Firefox `browser.runtime.sendMessage` returns a Promise when no callback.
            if (globalThis.browser?.runtime?.sendMessage === extensionApi.runtime.sendMessage) {
                extensionApi.runtime.sendMessage(message).then(
                    (response) => settle(resolve, response),
                    (err) =>
                        settle(
                            reject,
                            err instanceof Error ? err : new Error(String(err || '')),
                        ),
                )
                return
            }

            extensionApi.runtime.sendMessage(message, (response) => {
                const lastError = extensionApi.runtime?.lastError?.message
                if (lastError) {
                    settle(reject, new Error(lastError))
                    return
                }
                settle(resolve, response)
            })
        } catch (err) {
            settle(reject, err instanceof Error ? err : new Error(String(err || '')))
        }
    })
}
