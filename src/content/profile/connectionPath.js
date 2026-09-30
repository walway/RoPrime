import { settingsState, settingsT, shouldRunRoPrimeOnCurrentPage } from '../core/core.js'
import { registerFeature } from '../features/registry.js'
import { getRobloxUserId } from './robloxUserId.js'
import { showRoPrimeContentOverlay } from '../ui/overlay.js'

export const USERS_TO_SCAN_BY_DEFAULT = [24941]

const BUTTON_ATTR = 'data-roprime-connection-path-btn'
const STYLE_ID = 'roprime-connection-path-style'
const DB_NAME = 'roprime-connection-path'
const DB_VERSION = 1
const FRIENDS_STORE = 'friends'
const PATH_STORE = 'paths'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const CONCURRENCY = 2
const REQUEST_GAP_MS = 350
const RATE_LIMIT_BACKOFF_MS = 2500
const BUTTON_LABEL = 'Connection Path'
const COUNTED_LABEL_TEMPLATE = '{$Amount} Connections'

// Make mirrors safe from cookies
const FRIEND_ENDPOINTS = [
    {
        name: 'roproxy',
        url: (id) => `https://friends.roproxy.com/v1/users/${id}/friends`,
        credentials: 'omit',
    },
    {
        name: 'rotunnel',
        url: (id) => `https://friends.rotunnel.com/v1/users/${id}/friends`,
        credentials: 'omit',
    },
    {
        name: 'roblox',
        url: (id) => `https://friends.roblox.com/v1/users/${id}/friends`,
        credentials: 'include',
    },
]

const THUMBNAILS_ENDPOINTS = [
    (ids) =>
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${ids}&size=150x150&format=Png&isCircular=false`,
]

let graphLibPromise = null
let defaultScanStarted = false
let endpointIndex = 0
let lastRequestAt = 0
let requestChain = Promise.resolve()

function t(key, fallback = '') {
    const value = settingsT(key)
    if (value && value !== key) return value
    return fallback || key
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.roprime-connection-path-dialog {
  width: min(960px, calc(100vw - 32px)) !important;
  max-width: min(960px, calc(100vw - 32px)) !important;
}
.roprime-connection-path-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 280px;
  width: 100%;
}
.roprime-connection-path-status {
  text-align: center;
  min-height: 1.4em;
}
.roprime-connection-path-spinner-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 0;
}
.roprime-connection-path-spinner-wrap[hidden] {
  display: none !important;
}
.roprime-connection-path-graph {
  width: 100%;
  height: min(560px, 62vh);
  border-radius: 12px;
  overflow: hidden;
  background: color-mix(in srgb, var(--color-surface-100) 88%, black);
}
.roprime-connection-path-graph canvas {
  width: 100% !important;
  height: 100% !important;
}
a[${BUTTON_ATTR}] .roprime-connection-path-btn-label {
  pointer-events: none;
}
.roprime-overlay-icon-img {
  width: 64px;
  height: 64px;
  object-fit: contain;
}
`.trim()
    ;(document.head || document.documentElement).appendChild(style)
}

function openDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = () => {
            const db = req.result
            if (!db.objectStoreNames.contains(FRIENDS_STORE)) {
                db.createObjectStore(FRIENDS_STORE, { keyPath: 'userId' })
            }
            if (!db.objectStoreNames.contains(PATH_STORE)) {
                db.createObjectStore(PATH_STORE, { keyPath: 'key' })
            }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error || new Error('idb_open_failed'))
    })
}

async function idbGet(storeName, key) {
    const db = await openDb()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly')
        const req = tx.objectStore(storeName).get(key)
        req.onsuccess = () => resolve(req.result || null)
        req.onerror = () => reject(req.error)
    })
}

async function idbPut(storeName, value) {
    const db = await openDb()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite')
        tx.objectStore(storeName).put(value)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}

function pathKey(fromId, toId) {
    const a = Number(fromId)
    const b = Number(toId)
    return a <= b ? `${a}_${b}` : `${b}_${a}`
}

function formatCount(n) {
    try {
        return Number(n).toLocaleString('en-US')
    } catch {
        return String(n)
    }
}

function getProfileUserIdFromLocation() {
    const path = globalThis.location.pathname || ''
    const match = path.match(/\/users\/(\d+)(?:\/|$)/i)
    if (!match) return null
    const id = Number(match[1])
    return Number.isFinite(id) && id > 0 ? id : null
}

function isProfilePage() {
    return /\/users\/\d+(?:\/profile)?\/?(?:$|\?|#)/i.test(
        globalThis.location.pathname || '',
    )
}

async function loadForceGraph() {
    if (!graphLibPromise) {
        graphLibPromise = import('force-graph').then((mod) => mod.default || mod)
    }
    return graphLibPromise
}

function enqueueRequest(task) {
    const run = requestChain.then(async () => {
        const wait = Math.max(0, REQUEST_GAP_MS - (Date.now() - lastRequestAt))
        if (wait) await new Promise((r) => setTimeout(r, wait))
        lastRequestAt = Date.now()
        return task()
    })
    requestChain = run.then(
        () => undefined,
        () => undefined,
    )
    return run
}

function parseFriendsPayload(data) {
    const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
    return list
        .map((entry) => Number(entry?.id ?? entry))
        .filter((friendId) => Number.isFinite(friendId) && friendId > 0)
}

async function fetchFriends(userId, { onRateLimited } = {}) {
    const id = Number(userId)
    const cached = await idbGet(FRIENDS_STORE, id)
    if (
        cached &&
        Array.isArray(cached.friends) &&
        Date.now() - Number(cached.updatedAt || 0) < CACHE_TTL_MS
    ) {
        return cached.friends
    }

    let lastError = null
    for (let attempt = 0; attempt < FRIEND_ENDPOINTS.length * 2; attempt += 1) {
        const endpoint = FRIEND_ENDPOINTS[endpointIndex % FRIEND_ENDPOINTS.length]
        endpointIndex += 1
        try {
            const response = await enqueueRequest(() =>
                fetch(endpoint.url(id), {
                    credentials: endpoint.credentials,
                    cache: 'no-store',
                })
            )
            if (response.status === 429) {
                if (typeof onRateLimited === 'function') onRateLimited()
                await new Promise((r) => setTimeout(r, RATE_LIMIT_BACKOFF_MS))
                continue
            }
            if (response.status === 401 || response.status === 403) {
                continue
            }
            if (!response.ok) {
                lastError = new Error(`friends_http_${response.status}`)
                continue
            }
            const friends = parseFriendsPayload(await response.json())
            await idbPut(FRIENDS_STORE, {
                userId: id,
                friends,
                updatedAt: Date.now(),
            })
            return friends
        } catch (error) {
            lastError = error
        }
    }
    if (lastError) console.warn('RoPrime friends fetch failed', lastError)
    return []
}

async function runPool(items, worker, concurrency = CONCURRENCY) {
    const queue = [...items]
    const runners = Array.from(
        { length: Math.min(concurrency, Math.max(1, queue.length || 1)) },
        async () => {
            while (queue.length) {
                const item = queue.shift()
                if (item == null) return
                await worker(item)
            }
        },
    )
    await Promise.all(runners)
}

async function findConnectionPath(fromId, toId, { onProgress } = {}) {
    const start = Number(fromId)
    const goal = Number(toId)
    if (!Number.isFinite(start) || !Number.isFinite(goal)) {
        return { path: null, counted: 0 }
    }
    if (start === goal) {
        return { path: [start], counted: 1 }
    }

    const cached = await idbGet(PATH_STORE, pathKey(start, goal))
    if (cached?.path?.length) {
        return {
            path: cached.path.map(Number),
            counted: Number(cached.counted) || cached.path.length,
        }
    }

    const parentsA = new Map([[start, null]])
    const parentsB = new Map([[goal, null]])
    let frontierA = [start]
    let frontierB = [goal]
    let counted = 2
    let meeting = null
    let rateLimited = false

    const report = (extra = {}) => {
        if (typeof onProgress === 'function') {
            onProgress({ counted, rateLimited, ...extra })
        }
    }
    report({
        phase: t('settings.profile.connectionPath.status.counting', 'Counting...'),
    })

    const expand = async (frontier, parentsOwn, parentsOther) => {
        const next = []
        await runPool(frontier, async (userId) => {
            const friends = await fetchFriends(userId, {
                onRateLimited: () => {
                    rateLimited = true
                    report({
                        phase: t(
                            'settings.profile.connectionPath.status.rateLimited',
                            'Rate limited. Still going.',
                        ),
                    })
                },
            })
            for (const friendId of friends) {
                if (parentsOwn.has(friendId)) continue
                parentsOwn.set(friendId, userId)
                counted += 1
                next.push(friendId)
                if (parentsOther.has(friendId)) meeting = friendId
            }
        })
        report({
            phase: rateLimited
                ? t(
                    'settings.profile.connectionPath.status.rateLimited',
                    'Rate limited. Still going.',
                )
                : t(
                    'settings.profile.connectionPath.status.counted',
                    '{$Amount} Connections counted.',
                ).replace('{$Amount}', formatCount(counted)),
        })
        return next
    }

    const maxLayers = 8
    for (let layer = 0; layer < maxLayers && !meeting; layer += 1) {
        if (!frontierA.length || !frontierB.length) break
        if (frontierA.length <= frontierB.length) {
            frontierA = await expand(frontierA, parentsA, parentsB)
        } else {
            frontierB = await expand(frontierB, parentsB, parentsA)
        }
        if (meeting) break
        for (const id of frontierA) {
            if (parentsB.has(id)) {
                meeting = id
                break
            }
        }
        if (meeting) break
        for (const id of frontierB) {
            if (parentsA.has(id)) {
                meeting = id
                break
            }
        }
    }

    if (!meeting) {
        report({
            phase: t(
                'settings.profile.connectionPath.status.counted',
                '{$Amount} Connections counted.',
            ).replace('{$Amount}', formatCount(counted)),
            done: true,
            found: false,
        })
        return { path: null, counted }
    }

    const left = []
    let cur = meeting
    while (cur != null) {
        left.push(cur)
        cur = parentsA.get(cur)
    }
    left.reverse()

    const right = []
    cur = parentsB.get(meeting)
    while (cur != null) {
        right.push(cur)
        cur = parentsB.get(cur)
    }

    const path = [...left, ...right]
    await idbPut(PATH_STORE, {
        key: pathKey(start, goal),
        path,
        counted,
        updatedAt: Date.now(),
    })
    report({
        phase: t(
            'settings.profile.connectionPath.status.counted',
            '{$Amount} Connections counted.',
        ).replace('{$Amount}', formatCount(counted)),
        done: true,
        found: true,
        path,
    })
    return { path, counted }
}

async function fetchHeadshots(userIds) {
    const ids = [...new Set(userIds.map(Number).filter((id) => id > 0))]
    const map = new Map()
    if (!ids.length) return map

    const chunks = []
    for (let i = 0; i < ids.length; i += 100) {
        chunks.push(ids.slice(i, i + 100).join(','))
    }

    await Promise.all(
        chunks.map(async (chunk) => {
            for (const buildUrl of THUMBNAILS_ENDPOINTS) {
                try {
                    const response = await fetch(buildUrl(chunk), {
                        credentials: 'omit',
                        cache: 'force-cache',
                    })
                    if (!response.ok) continue
                    const data = await response.json()
                    for (const entry of data?.data || []) {
                        const id = Number(entry?.targetId)
                        const imageUrl = String(entry?.imageUrl || '').trim()
                        if (id && imageUrl) map.set(id, imageUrl)
                    }
                    return
                } catch {
                    /* try next mirror */
                }
            }
        }),
    )
    return map
}

function attachHeadshotImages(nodes, headshots, onPaint) {
    for (const node of nodes) {
        const userId = Number(node.userId ?? node.id)
        const url = headshots.get(userId)
        if (!url) continue
        const image = new Image()
        image.crossOrigin = 'anonymous'
        image.decoding = 'async'
        image.onload = () => {
            node.__img = image
            if (typeof onPaint === 'function') onPaint()
        }
        image.src = url
    }
}

function packFriendWeb(count, hubRadius = 28, gap = 6) {
    const friendRadius = 11
    const step = friendRadius * 2 + gap
    const golden = Math.PI * (3 - Math.sqrt(5))
    const spots = []
    for (let i = 0; i < count; i += 1) {
        const r = hubRadius + friendRadius + gap + step * Math.sqrt(i + 0.35)
        const angle = i * golden
        spots.push({
            x: Math.cos(angle) * r,
            y: Math.sin(angle) * r,
            r,
            angle,
        })
    }
    const extent = spots.reduce(
        (max, spot) => Math.max(max, spot.r + friendRadius),
        hubRadius,
    )
    return { spots, extent }
}

async function buildPathNeighborhood(path) {
    const pathIds = path.map(Number)
    const pathSet = new Set(pathIds)
    const friendsByHub = new Map()

    await Promise.all(
        pathIds.map(async (hubId) => {
            const friends = await fetchFriends(hubId)
            friendsByHub.set(
                hubId,
                friends.filter((fid) => !pathSet.has(fid)),
            )
        }),
    )

    const packs = pathIds.map((hubId) => {
        const satellites = friendsByHub.get(hubId) || []
        return {
            satellites,
            ...packFriendWeb(satellites.length),
        }
    })
    const PATH_GAP = Math.max(...packs.map((pack) => pack.extent), 80) * 2 + 160

    const nodes = []
    const links = []

    pathIds.forEach((id, index) => {
        const x = index * PATH_GAP
        nodes.push({
            id,
            userId: id,
            kind: 'path',
            index,
            x,
            y: 0,
            fx: x,
            fy: 0,
        })
    })

    for (let i = 0; i < pathIds.length - 1; i += 1) {
        links.push({
            source: pathIds[i],
            target: pathIds[i + 1],
            kind: 'path',
        })
    }

    pathIds.forEach((hubId, hubIndex) => {
        const { satellites, spots } = packs[hubIndex]
        const hubX = hubIndex * PATH_GAP
        const orbitIds = []

        satellites.forEach((friendId, friendIndex) => {
            const spot = spots[friendIndex]
            const nodeId = `orbit:${hubId}:${friendId}`
            orbitIds.push(nodeId)
            const x = hubX + spot.x
            const y = spot.y
            nodes.push({
                id: nodeId,
                userId: friendId,
                kind: 'friend',
                hub: hubId,
                x,
                y,
                fx: x,
                fy: y,
            })

            links.push({
                source: hubId,
                target: nodeId,
                kind: 'orbit',
            })
        })

        const neighborReach = 36
        for (let i = 0; i < spots.length; i += 1) {
            for (let j = i + 1; j < spots.length; j += 1) {
                const dx = spots[i].x - spots[j].x
                const dy = spots[i].y - spots[j].y
                if (dx * dx + dy * dy <= neighborReach * neighborReach) {
                    links.push({
                        source: orbitIds[i],
                        target: orbitIds[j],
                        kind: 'web',
                    })
                }
            }
        }
    })

    return { nodes, links, pathIds }
}

async function renderGraph(container, path) {
    if (!(container instanceof HTMLElement) || !path?.length) return
    container.textContent = ''
    const ForceGraph = await loadForceGraph()
    const { nodes, links, pathIds } = await buildPathNeighborhood(path)
    const headshots = await fetchHeadshots(nodes.map((node) => node.userId ?? node.id))

    const width = Math.max(container.clientWidth || 800, 320)
    const height = Math.max(container.clientHeight || 480, 280)

    const graph = ForceGraph()(container)
        .graphData({ nodes, links })
        .nodeId('id')
        .nodeLabel((node) => `User ${node.userId ?? node.id}`)
        .linkColor((link) => {
            if (link.kind === 'path') return 'rgba(0,162,255,0.95)'
            if (link.kind === 'web') return 'rgba(255,255,255,0.14)'
            return 'rgba(255,255,255,0.1)'
        })
        .linkWidth((link) => {
            if (link.kind === 'path') return 7
            if (link.kind === 'web') return 0.8
            return 0.55
        })
        .linkCurvature(0)
        .backgroundColor('rgba(0,0,0,0)')
        .width(width)
        .height(height)
        .cooldownTicks(0)
        .enableNodeDrag(false)
        .nodeCanvasObject((node, ctx, globalScale) => {
            const isPath = node.kind === 'path'
            const size = Math.max(
                isPath ? 24 : 10,
                (isPath ? 36 : 15) / Math.max(globalScale, 0.55),
            )
            ctx.save()
            ctx.beginPath()
            ctx.arc(node.x, node.y, size, 0, Math.PI * 2)
            ctx.closePath()
            ctx.fillStyle = isPath ? '#1f1f1f' : '#2f2f2f'
            ctx.fill()
            ctx.clip()
            if (node.__img) {
                ctx.drawImage(
                    node.__img,
                    node.x - size,
                    node.y - size,
                    size * 2,
                    size * 2,
                )
            }
            ctx.restore()
            ctx.beginPath()
            ctx.arc(node.x, node.y, size, 0, Math.PI * 2)
            const isEndpoint = isPath &&
                (node.index === 0 || node.index === pathIds.length - 1)
            ctx.strokeStyle = isEndpoint ? '#00a2ff' : isPath ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.22)'
            ctx.lineWidth = Math.max(
                isPath ? 2.2 : 1,
                (isPath ? 2.6 : 1.1) / Math.max(globalScale, 0.55),
            )
            ctx.stroke()
        })

    const chargeForce = graph.d3Force('charge')
    if (chargeForce && typeof chargeForce.strength === 'function') {
        chargeForce.strength(0)
    }
    const linkForce = graph.d3Force('link')
    if (linkForce && typeof linkForce.strength === 'function') {
        linkForce.strength(0)
    }
    const centerForce = graph.d3Force('center')
    if (centerForce) {
        graph.d3Force('center', null)
    }

    let paintQueued = false
    const paint = () => {
        if (paintQueued) return
        paintQueued = true
        requestAnimationFrame(() => {
            paintQueued = false
            try {
                graph.refresh()
            } catch {
                /* ignore */
            }
        })
    }
    attachHeadshotImages(nodes, headshots, paint)

    globalThis.setTimeout(() => {
        try {
            graph.zoomToFit(400, 64)
        } catch {
            /* ignore */
        }
    }, 80)
}

async function openConnectionPathOverlay(fromId, toId) {
    ensureStyles()

    const bodyHtml = `
<div class="roprime-connection-path-body">
  <div class="roprime-connection-path-spinner-wrap" data-roprime-cp-spinner>
    <span class="spinner spinner-sm spinner-block"></span>
  </div>
  <p class="text-body-medium content-default roprime-connection-path-status" data-roprime-cp-status>${
        t(
            'settings.profile.connectionPath.status.counting',
            'Counting...',
        )
    }</p>
  <div class="roprime-connection-path-graph" data-roprime-cp-graph hidden></div>
</div>
`.trim()

    let result = { path: null, counted: 0 }

    await showRoPrimeContentOverlay({
        heading: t(
            'settings.profile.connectionPath.overlayTitle',
            'Connection Path',
        ),
        bodyHtml,
        dialogClass: 'roprime-connection-path-dialog',
        onReady: async (root) => {
            const statusEl = root.querySelector('[data-roprime-cp-status]')
            const spinnerWrap = root.querySelector('[data-roprime-cp-spinner]')
            const graphEl = root.querySelector('[data-roprime-cp-graph]')

            result = await findConnectionPath(fromId, toId, {
                onProgress: ({ phase }) => {
                    if (statusEl instanceof HTMLElement && phase) {
                        statusEl.textContent = phase
                    }
                },
            })

            if (spinnerWrap instanceof HTMLElement) {
                spinnerWrap.hidden = true
                spinnerWrap.setAttribute('hidden', '')
            }

            if (result.counted != null) {
                updateButtonLabel(result.counted)
            }

            if (result.path?.length && graphEl instanceof HTMLElement) {
                graphEl.hidden = false
                if (statusEl instanceof HTMLElement) {
                    statusEl.textContent = t(
                        'settings.profile.connectionPath.status.counted',
                        '{$Amount} Connections counted.',
                    ).replace('{$Amount}', formatCount(result.counted))
                }
                try {
                    await renderGraph(graphEl, result.path)
                } catch (error) {
                    console.warn('RoPrime connection path graph failed', error)
                    if (statusEl instanceof HTMLElement) {
                        statusEl.textContent = t(
                            'settings.profile.connectionPath.status.graphFailed',
                            'Path found. Graph failed to render.',
                        )
                    }
                }
            } else if (statusEl instanceof HTMLElement) {
                statusEl.textContent = result.counted
                    ? t(
                        'settings.profile.connectionPath.status.noPath',
                        '{$Amount} Connections counted. No path found.',
                    ).replace('{$Amount}', formatCount(result.counted))
                    : t(
                        'settings.profile.connectionPath.status.notFound',
                        'No path found.',
                    )
            }
        },
    })

    return result
}

function buildButtonLabel(amount) {
    if (amount == null || !Number.isFinite(Number(amount))) return BUTTON_LABEL
    return t(
        'settings.profile.connectionPath.buttonCounted',
        COUNTED_LABEL_TEMPLATE,
    ).replace('{$Amount}', formatCount(amount))
}

async function getCachedPathCount(fromId, toId) {
    const cached = await idbGet(PATH_STORE, pathKey(fromId, toId))
    if (!cached) return null
    const counted = Number(cached.counted)
    if (Number.isFinite(counted) && counted > 0) return counted
    if (Array.isArray(cached.path) && cached.path.length) {
        return cached.path.length
    }
    return null
}

function findButtonHost() {
    const header = document.querySelector('.user-profile-header')
    if (!(header instanceof HTMLElement)) return null

    const exact = header.querySelector(':scope > .flex-nowrap.gap-small.flex') ||
        header.querySelector(':scope > .flex-nowrap .gap-small.flex') ||
        header.querySelector(':scope > .flex.flex-nowrap.gap-small') ||
        header.querySelector('.flex-nowrap.gap-small.flex')
    if (exact instanceof HTMLElement) return exact
    return null
}

function ensureButton() {
    ensureStyles()
    let button = document.querySelector(`a[${BUTTON_ATTR}]`)
    if (button instanceof HTMLAnchorElement) return button

    const host = findButtonHost()
    if (!(host instanceof HTMLElement)) return null

    button = document.createElement('a')
    button.setAttribute(BUTTON_ATTR, '1')
    button.setAttribute('aria-disabled', 'false')
    button.className =
        'relative clip group/interactable focus-visible:outline-focus disabled:outline-none cursor-pointer relative flex justify-center items-center radius-circle stroke-none padding-left-medium padding-right-medium height-800 text-label-medium bg-shift-300 content-action-utility'
    button.style.textDecoration = 'none'
    button.href = '#'
    button.innerHTML =
        `<div aria-hidden="true" data-testid="foundation-web-state-layer" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div><span class="padding-y-xsmall text-no-wrap text-truncate-end roprime-connection-path-btn-label">${BUTTON_LABEL}</span>`

    button.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        void (async () => {
            const profileId = getProfileUserIdFromLocation()
            const selfId = await getRobloxUserId()
            if (!profileId || !selfId || profileId === selfId) return
            const next = await openConnectionPathOverlay(selfId, profileId)
            if (next?.counted != null) updateButtonLabel(next.counted)
        })()
    })

    host.appendChild(button)
    return button
}

function updateButtonLabel(amount) {
    const button = document.querySelector(`a[${BUTTON_ATTR}]`)
    if (!(button instanceof HTMLElement)) return
    const label = button.querySelector('.roprime-connection-path-btn-label')
    if (label instanceof HTMLElement) {
        label.textContent = buildButtonLabel(amount)
    }
}

function removeButton() {
    document.querySelectorAll(`a[${BUTTON_ATTR}]`).forEach((node) => node.remove())
}

async function maybeAutoCount() {
    if (!settingsState.connectionPathEnabled) return
    if (!settingsState.connectionPathAutoCountEnabled) return
    if (!isProfilePage()) return

    const profileId = getProfileUserIdFromLocation()
    const selfId = await getRobloxUserId()
    if (!profileId || !selfId || profileId === selfId) return

    const cached = await getCachedPathCount(selfId, profileId)
    if (cached != null) {
        updateButtonLabel(cached)
        return
    }

    const label = document.querySelector(
        `a[${BUTTON_ATTR}] .roprime-connection-path-btn-label`,
    )
    if (label instanceof HTMLElement) {
        label.textContent = t(
            'settings.profile.connectionPath.status.counting',
            'Counting...',
        )
    }

    try {
        const result = await findConnectionPath(selfId, profileId)
        updateButtonLabel(result.counted)
    } catch {
        updateButtonLabel(null)
    }
}

async function warmDefaultUsers() {
    if (defaultScanStarted) return
    if (!settingsState.connectionPathEnabled) return
    defaultScanStarted = true
    const selfId = await getRobloxUserId()
    if (!selfId) {
        defaultScanStarted = false
        return
    }
    for (const targetId of USERS_TO_SCAN_BY_DEFAULT) {
        if (Number(targetId) === Number(selfId)) continue
        try {
            await findConnectionPath(selfId, targetId)
        } catch {
            /* ignore */
        }
    }
}

export function syncConnectionPath() {
    try {
        if (!shouldRunRoPrimeOnCurrentPage() || !settingsState.connectionPathEnabled) {
            removeButton()
            return
        }
        if (!isProfilePage()) {
            removeButton()
            void warmDefaultUsers()
            return
        }

        void (async () => {
            const profileId = getProfileUserIdFromLocation()
            const selfId = await getRobloxUserId()
            if (!profileId || !selfId || profileId === selfId) {
                removeButton()
                return
            }
            ensureButton()
            void maybeAutoCount()
            void warmDefaultUsers()
        })()
    } catch (error) {
        console.warn('RoPrime connection path sync failed', error)
    }
}

registerFeature(syncConnectionPath)
