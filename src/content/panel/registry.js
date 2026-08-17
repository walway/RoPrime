import { getExtensionResourceUrl } from '../core/core.js'

export const PLUGINS_REGISTRY_CDN_URL = 'https://cdn.jsdelivr.net/gh/walway/roprime-data@latest/v1/extensions.json'
const LOCAL_REGISTRY_PATH = 'src/strings/data/extensions.json'

let registryCache = null
let registryFetchPromise = null

function isMaliciousFlag(value) {
    if (typeof value === 'boolean') return value
    return (
        String(value || '')
            .trim()
            .toLowerCase() === 'true'
    )
}

function normalizePluginEntry(raw) {
    if (!raw || typeof raw !== 'object') return null
    const key = String(raw.key || '').trim()
    if (!key) return null

    const search = Array.isArray(raw.search)
        ? raw.search.map((entry) => String(entry || '').trim()).filter(Boolean)
        : [String(raw.title || key).trim()].filter(Boolean)

    return {
        key,
        title: String(raw.title || key).trim() || key,
        search,
        settingsPath: String(raw.settingsPath || '').trim(),
        malicious: isMaliciousFlag(raw.malicious),
        noToggle: Boolean(raw.noToggle),
    }
}

function parseRegistryJson(raw) {
    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.plugins) ? raw.plugins : null
    if (!list) return []
    return list.map(normalizePluginEntry).filter(Boolean)
}

async function fetchRegistryFromUrl(url) {
    if (!url) return null
    try {
        const response = await fetch(url, { cache: 'no-store' })
        if (!response.ok) return null
        const plugins = parseRegistryJson(await response.json())
        return plugins.length ? plugins : null
    } catch {
        return null
    }
}

async function fetchLocalRegistryFallback() {
    const localUrl = getExtensionResourceUrl(LOCAL_REGISTRY_PATH)
    if (!localUrl) return []

    const registry = await fetchRegistryFromUrl(localUrl)
    return registry || []
}

export async function fetchPluginsRegistry() {
    if (registryCache) return registryCache
    if (registryFetchPromise) return registryFetchPromise

    registryFetchPromise = (async () => {
        const cdnRegistry = await fetchRegistryFromUrl(PLUGINS_REGISTRY_CDN_URL)
        if (cdnRegistry) {
            registryCache = cdnRegistry
            return cdnRegistry
        }

        registryCache = await fetchLocalRegistryFallback()
        return registryCache
    })()

    try {
        return await registryFetchPromise
    } finally {
        registryFetchPromise = null
    }
}

export function invalidatePluginsRegistryCache() {
    registryCache = null
}
