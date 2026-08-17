import { shouldRunRoPrimeOnCurrentPage } from '../core/core.js'
import { debounce } from '../core/debounce.js'
import {
    layerIsCurrent,
    mountProfileEffectLayer,
    profileUserMayShowEffect,
    resolveEquippedEffectId,
} from './effectMount.js'
import { getProfileEffectById } from './profileEffectsCatalog.js'

const PICTURE_LAYER_ATTR = 'data-roprime-profile-picture-effect-layer'
const PICTURE_LAYER_ID = 'roprime-profile-page-effect-layer'
const PROFILE_LAYER_ATTR = 'data-roprime-profile-effect-layer'
const PROFILE_LAYER_ID = 'roprime-profile-page-profile-effect-layer'

let syncPromise = null
let observer = null
const PROFILE_SYNC_DEBOUNCE_MS = 400
const scheduleProfileSync = debounce(() => {
    void syncProfilePageEffect()
}, PROFILE_SYNC_DEBOUNCE_MS)

export function parseUserProfileIdFromLocation(loc = window.location) {
    const path = loc.pathname || ''
    const match = path.match(
        /^\/(?:[a-z]{2,3}(?:-[a-z0-9]{2,8})?\/)?users\/(\d+)\/profile(?:\/|$)/i,
    )
    if (!match) return null
    const userId = Number(match[1])
    return Number.isFinite(userId) && userId > 0 ? userId : null
}

export function isUserProfilePage(loc = window.location) {
    return parseUserProfileIdFromLocation(loc) != null
}

function removeProfileEffectLayers() {
    document.getElementById(PICTURE_LAYER_ID)?.remove()
    document.getElementById(PROFILE_LAYER_ID)?.remove()
}

function findAvatarHost() {
    return document.querySelector('.avatar.avatar-card-fullbody')
}

function findProfilePageEffectHost() {
    return document.querySelector('.user-profile-header.flex.flex-col.gap-large')
}

async function syncEquippedKindLayer(profileUserId, kind) {
    const layerId = kind === 'picture' ? PICTURE_LAYER_ID : PROFILE_LAYER_ID
    const layerAttr = kind === 'picture' ? PICTURE_LAYER_ATTR : PROFILE_LAYER_ATTR
    const layerClass = kind === 'picture'
        ? 'roprime-profile-page-effect-layer'
        : 'roprime-profile-page-profile-effect-layer'

    const effectId = await resolveEquippedEffectId(profileUserId, kind)
    if (!effectId || !(await profileUserMayShowEffect(profileUserId, effectId))) {
        document.getElementById(layerId)?.remove()
        return
    }

    const effect = getProfileEffectById(effectId)
    if (!effect || effect.kind !== kind) {
        document.getElementById(layerId)?.remove()
        return
    }

    const host = kind === 'picture' ? findAvatarHost() : findProfilePageEffectHost()
    if (!host) return

    if (layerIsCurrent(host, layerId, layerAttr, effect.id)) return

    document.getElementById(layerId)?.remove()
    mountProfileEffectLayer(host, effect, {
        layerId,
        layerClass,
        layerAttr,
    })
}

async function syncProfilePageEffectNow() {
    if (!shouldRunRoPrimeOnCurrentPage()) {
        removeProfileEffectLayers()
        return
    }

    const profileUserId = parseUserProfileIdFromLocation()
    if (!profileUserId) {
        removeProfileEffectLayers()
        return
    }

    await syncEquippedKindLayer(profileUserId, 'picture')
    await syncEquippedKindLayer(profileUserId, 'profile')
}

export function syncProfilePageEffect() {
    if (syncPromise) return syncPromise
    syncPromise = syncProfilePageEffectNow().finally(() => {
        syncPromise = null
    })
    return syncPromise
}

function disconnectProfileObserver() {
    scheduleProfileSync.cancel()
    observer?.disconnect()
    observer = null
    removeProfileEffectLayers()
}

function connectProfileObserver() {
    if (observer) return
    observer = new MutationObserver(() => {
        scheduleProfileSync()
    })
    if (!document.body) return
    observer.observe(document.body, { childList: true, subtree: true })
    void syncProfilePageEffect()
}

function syncProfileObserverForRoute() {
    if (!shouldRunRoPrimeOnCurrentPage() || !isUserProfilePage()) {
        disconnectProfileObserver()
        return
    }
    connectProfileObserver()
}

export function installProfilePageEffectObserver() {
    if (installProfilePageEffectObserver.installed) return
    installProfilePageEffectObserver.installed = true

    const onRoute = () => {
        syncProfileObserverForRoute()
    }
    window.addEventListener('roprime-location-change', onRoute)
    window.addEventListener('popstate', onRoute)

    if (document.body) syncProfileObserverForRoute()
    else {
        document.addEventListener('DOMContentLoaded', syncProfileObserverForRoute, {
            once: true,
        })
    }
}
