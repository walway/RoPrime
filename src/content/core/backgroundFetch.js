const extensionApi = globalThis.browser || globalThis.chrome

function decodeBodyBase64(bodyBase64) {
    const binary = atob(String(bodyBase64 || ''))
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    return bytes
}

// Proxy a fetch through the extension background so Firefox
// cannot block connect-src
export async function fetchViaBackground(
    url,
    {
        method = 'GET',
        credentials = 'omit',
        headers = { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    } = {},
) {
    if (!extensionApi?.runtime?.sendMessage) {
        throw new Error('extension_runtime_unavailable')
    }

    const response = await new Promise((resolve, reject) => {
        extensionApi.runtime.sendMessage(
            {
                type: 'ROPRIME_FETCH',
                url: String(url || ''),
                method,
                credentials,
                headers,
            },
            (resp) => {
                const lastError = extensionApi.runtime?.lastError?.message
                if (lastError) {
                    reject(new Error(lastError))
                    return
                }
                resolve(resp)
            },
        )
    })

    if (!response?.ok) {
        throw new Error(String(response?.error || 'background_fetch_failed'))
    }

    return {
        status: Number(response.status) || 0,
        statusText: String(response.statusText || ''),
        headers: response.headers && typeof response.headers === 'object' ? response.headers : {},
        bodyBytes: decodeBodyBase64(response.bodyBase64),
    }
}

export async function fetchTextViaBackground(url, options) {
    const response = await fetchViaBackground(url, options)
    if (response.status >= 400) {
        throw new Error(`background_fetch_http_${response.status}`)
    }
    return new TextDecoder('utf-8').decode(response.bodyBytes)
}

export async function fetchJsonViaBackground(url, options) {
    const text = await fetchTextViaBackground(url, options)
    return JSON.parse(text)
}

/** Background first (Firefox CSP-safe), then direct fetch fallback. */
export async function fetchTextPreferBackground(url, init = {}) {
    try {
        return await fetchTextViaBackground(url, {
            credentials: init.credentials === 'include' ? 'include' : 'omit',
            headers: init.headers,
        })
    } catch {
        /* fall through */
    }

    const response = await fetch(url, {
        cache: 'no-store',
        credentials: init.credentials ?? 'omit',
        headers: init.headers,
    })
    if (!response.ok) {
        throw new Error(`fetch_http_${response.status}`)
    }
    return response.text()
}

export async function fetchJsonPreferBackground(url, init = {}) {
    const href = String(url || '')
    const isExtensionResource = /^(chrome|moz|safari)-extension:\/\//i.test(href) ||
        href.startsWith('blob:') ||
        href.startsWith('data:')

    if (!isExtensionResource) {
        try {
            return await fetchJsonViaBackground(url, {
                credentials: init.credentials === 'include' ? 'include' : 'omit',
                headers: init.headers,
            })
        } catch {
            /* fall through */
        }
    }

    const response = await fetch(url, {
        cache: 'no-store',
        credentials: init.credentials ?? 'omit',
        headers: init.headers,
    })
    if (!response.ok) {
        throw new Error(`fetch_http_${response.status}`)
    }
    return response.json()
}
