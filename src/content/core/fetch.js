import { send } from './msg.js'

const extensionApi = globalThis.browser || globalThis.chrome

let patched = false
let nativeFetch = null

export function isFirefox() {
    try {
        const ua = String(globalThis.navigator?.userAgent || '')
        if (/firefox/i.test(ua)) return true
        return typeof extensionApi?.runtime?.getBrowserInfo === 'function'
    } catch {
        return false
    }
}

export function headersToObject(headers) {
    const out = {}
    if (!headers) return out

    if (typeof headers.forEach === 'function') {
        try {
            headers.forEach((value, key) => {
                if (value == null || typeof value === 'function') return
                out[String(key)] = String(value)
            })
            return out
        } catch {
            /* fall through */
        }
    }

    if (Array.isArray(headers)) {
        for (const entry of headers) {
            if (Array.isArray(entry) && entry.length >= 2) {
                out[String(entry[0])] = String(entry[1])
            }
        }
        return out
    }

    if (typeof headers === 'object') {
        for (const key of Object.keys(headers)) {
            try {
                const value = headers[key]
                if (value == null || typeof value === 'function') continue
                if (typeof value === 'object') continue
                out[String(key)] = String(value)
            } catch {
                /* ignore */
            }
        }
    }
    return out
}

function resolveUrl(input) {
    if (typeof input === 'string') return input
    if (input && typeof input === 'object' && typeof input.url === 'string') {
        return input.url
    }
    return String(input || '')
}

function shouldUseBackground(url) {
    try {
        const parsed = new URL(url, String(globalThis.location?.href || 'https://www.roblox.com/'))
        if (/^(chrome|moz|safari)-extension:/i.test(parsed.protocol)) return false
        if (parsed.protocol === 'blob:' || parsed.protocol === 'data:') return false
        if (/^(?:[\w-]+\.)?githubusercontent\.com$/i.test(parsed.hostname)) return true
        if (/\.supabase\.co$/i.test(parsed.hostname)) return true
        if (isFirefox()) {
            const pageOrigin = String(globalThis.location?.origin || '')
            if (pageOrigin && parsed.origin === pageOrigin) return false
            return true
        }
        return false
    } catch {
        return isFirefox()
    }
}

/** undefined → omit (CDN mesh GETs break if cookies are forced). */
function resolveCredentials(credentials) {
    if (credentials === 'include' || credentials === 'same-origin') return 'include'
    return 'omit'
}

async function toArrayBuffer(body) {
    if (body == null || body === '') return null
    if (body instanceof ArrayBuffer) return body
    if (ArrayBuffer.isView(body)) {
        return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)
    }
    if (typeof Blob !== 'undefined' && body instanceof Blob) {
        return body.arrayBuffer()
    }
    if (typeof body === 'string') {
        return new TextEncoder().encode(body).buffer
    }
    if (body instanceof URLSearchParams) {
        return new TextEncoder().encode(body.toString()).buffer
    }
    return undefined
}

function decodeBase64ToArrayBuffer(body) {
    if (typeof body !== 'string' || !body) return null
    try {
        const binary = atob(body)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
        return bytes.buffer
    } catch {
        return null
    }
}

function asArrayBuffer(body) {
    if (body instanceof ArrayBuffer) return body
    if (ArrayBuffer.isView(body)) {
        return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)
    }
    const fromB64 = decodeBase64ToArrayBuffer(body)
    if (fromB64) return fromB64
    return new ArrayBuffer(0)
}

async function proxyBackground(url, init = {}) {
    const method = String(init.method || 'GET').toUpperCase()

    const credentials =
        init.credentials === 'include' || init.credentials === 'same-origin'
            ? 'include'
            : init.credentials === 'omit'
            ? 'omit'
            : resolveCredentials(init.credentials)
    const headers = headersToObject(init.headers)
    if (method === 'GET' || method === 'HEAD') {
        for (const key of Object.keys(headers)) {
            if (key.toLowerCase() === 'content-type') delete headers[key]
        }
    }

    let body = null
    if (init.body != null) {
        const encoded = await toArrayBuffer(init.body)
        if (encoded === undefined) throw new Error('unsupported_body')
        body = encoded
    }

    const response = await send({
        type: 'ROPRIME_FETCH',
        url: String(url || ''),
        method,
        credentials,
        headers,
        body,
    })

    if (!response?.ok) {
        throw new Error(String(response?.error || 'background_fetch_failed'))
    }

    let buffer = asArrayBuffer(response.body)

    if (!buffer.byteLength && response.bodyBase64) {
        buffer = asArrayBuffer(response.bodyBase64)
    }
    const status = Number(response.status) || 0
    if (status === 0) {
        throw new Error('background_fetch_bad_status')
    }

    const copy = buffer.byteLength ? buffer.slice(0) : new ArrayBuffer(0)
    return new Response(copy, {
        status,
        statusText: String(response.statusText || ''),
        headers: response.headers && typeof response.headers === 'object' ? response.headers : {},
    })
}

/** Always background-proxy (used by mesh assetFetch). */
export function backgroundFetch(input, init = {}) {
    return proxyBackground(resolveUrl(input), init || {})
}

/**
 * Central fetch. Firefox cross-origin → background (page connect-src CSP).
 * Binary bodies use structured clone (not base64) so meshes stay intact.
 */
export async function rpFetch(input, init = {}) {
    const url = resolveUrl(input)
    const request = typeof Request !== 'undefined' && input instanceof Request ? input : null

    const merged = {
        method: init.method || request?.method || 'GET',
        credentials: init.credentials !== undefined ? init.credentials : request?.credentials,
        headers: init.headers || request?.headers,
        body: init.body,
        cache: init.cache,
        redirect: init.redirect,
        signal: init.signal,
    }

    if (request && merged.body === undefined) {
        const method = String(merged.method || 'GET').toUpperCase()
        if (method !== 'GET' && method !== 'HEAD') {
            try {
                merged.body = await request.clone().arrayBuffer()
            } catch {
                /* ignore */
            }
        }
    }

    if (shouldUseBackground(url)) {

        return proxyBackground(url, merged)
    }

    const fetchImpl = nativeFetch || globalThis.fetch.bind(globalThis)
    return fetchImpl(input, init)
}

export function installFetchPatch() {
    if (patched || typeof globalThis.fetch !== 'function') return
    patched = true
    nativeFetch = globalThis.fetch.bind(globalThis)
    globalThis.fetch = (input, init) => rpFetch(input, init)
}
