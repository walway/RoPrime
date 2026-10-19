const HOST_CLASS = 'roprime-spoiler'
const CONTENT_CLASS = 'roprime-spoiler-content'
const CANVAS_CLASS = 'roprime-spoiler-canvas'
const STYLE_ID = 'roprime-spoiler-style'

/** @type {WeakMap<HTMLElement, { reveal: (clientX?: number, clientY?: number) => void, destroy: () => void, isRevealed: () => boolean, host: HTMLElement }>} */
const apiByHost = new WeakMap()

const SPOILER_CSS = `
.${HOST_CLASS} {
  position: relative;
  display: inline-block;
  max-width: 100%;
  min-height: 1.15em;
  vertical-align: middle;
  cursor: pointer;
  user-select: none;
  box-sizing: border-box;
}
.${HOST_CLASS}[data-length-masked="1"] {
  position: relative !important;
  display: inline-block !important;
  overflow: hidden !important;
  vertical-align: middle;
  /* Width/height come from --roprime-spoiler-w / --roprime-spoiler-h */
  width: var(--roprime-spoiler-w, 64px) !important;
  min-width: var(--roprime-spoiler-w, 64px) !important;
  max-width: min(100%, var(--roprime-spoiler-w, 64px)) !important;
  height: var(--roprime-spoiler-h, 1.2em) !important;
  min-height: var(--roprime-spoiler-h, 1.2em) !important;
}
.${HOST_CLASS}[data-length-masked="1"]:not([data-revealed="1"]):not([data-revealing="1"]) .${CONTENT_CLASS} {
  position: absolute !important;
  left: 0 !important;
  top: 0 !important;
  width: auto !important;
  max-width: none !important;
  height: auto !important;
  overflow: hidden !important;
  white-space: nowrap !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
.${HOST_CLASS}[data-length-masked="1"]:not([data-revealed="1"]):not([data-revealing="1"]) .${CONTENT_CLASS} .icon-robux-container,
.${HOST_CLASS}[data-length-masked="1"]:not([data-revealed="1"]):not([data-revealing="1"]) .${CONTENT_CLASS} .amount {
  white-space: nowrap !important;
}
.${HOST_CLASS}[data-spoiler-gap="1"]:not([data-revealed="1"]):not([data-revealing="1"]) {
  margin-inline-start: 0.4em;
}
.${HOST_CLASS}[data-revealed="1"] {
  cursor: inherit;
  user-select: auto;
  overflow: visible;
  width: auto !important;
  min-width: 0 !important;
  min-height: 0 !important;
  margin-inline-start: 0;
}
.${HOST_CLASS} .${CONTENT_CLASS} {
  display: inline-block;
  max-width: 100%;
  vertical-align: bottom;
  box-sizing: border-box;
}
.${HOST_CLASS}[data-spoiler-block="1"] {
  display: block !important;
  width: 100% !important;
  max-width: 100% !important;
  vertical-align: stretch;
}
.${HOST_CLASS}[data-spoiler-block="1"] .${CONTENT_CLASS} {
  display: block !important;
  width: 100% !important;
  max-width: 100% !important;
}
.${HOST_CLASS}[data-spoiler-block="1"] input,
.${HOST_CLASS}[data-spoiler-block="1"] .form-control,
.${HOST_CLASS}[data-spoiler-block="1"] .input-field {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}
.${HOST_CLASS}:not([data-revealed="1"]):not([data-revealing="1"]) .${CONTENT_CLASS} {
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
  text-shadow: none !important;
}
.${HOST_CLASS}:not([data-revealed="1"]):not([data-revealing="1"]) .${CONTENT_CLASS} * {
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
  border-color: transparent !important;
  caret-color: transparent !important;
}
.${HOST_CLASS}:not([data-revealed="1"]):not([data-revealing="1"]) .${CONTENT_CLASS} img,
.${HOST_CLASS}:not([data-revealed="1"]):not([data-revealing="1"]) .${CONTENT_CLASS} svg,
.${HOST_CLASS}:not([data-revealed="1"]):not([data-revealing="1"]) .${CONTENT_CLASS} [class*="icon"] {
  opacity: 0 !important;
}
.${HOST_CLASS}[data-revealing="1"] .${CONTENT_CLASS} {
  animation: roprime-spoiler-fade-in 420ms ease-out forwards;
  overflow: visible;
  white-space: inherit;
}
.${HOST_CLASS} canvas.${CANVAS_CLASS} {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
}
@keyframes roprime-spoiler-fade-in {
  from { opacity: 0.25; }
  to { opacity: 1; }
}
`.trim()

function ensureStyles() {
    let style = document.getElementById(STYLE_ID)
    if (!(style instanceof HTMLStyleElement)) {
        style = document.createElement('style')
        style.id = STYLE_ID
        ;(document.head || document.documentElement).appendChild(style)
    }
    if (style.textContent !== SPOILER_CSS) style.textContent = SPOILER_CSS
}

function parseCssColor(color) {
    const el = document.createElement('span')
    el.style.color = color
    el.style.display = 'none'
    document.documentElement.appendChild(el)
    const computed = globalThis.getComputedStyle(el).color
    el.remove()
    const m = String(computed).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/i)
    if (!m) return null
    return {
        r: Number(m[1]),
        g: Number(m[2]),
        b: Number(m[3]),
        a: m[4] === undefined || m[4] === null ? 1 : Number(m[4]),
    }
}

function luminance(rgb) {
    return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255
}

function readParticleCssColor(source) {
    try {
        const rgb = parseCssColor(globalThis.getComputedStyle(source).color || '')
        if (rgb && rgb.a > 0.2 && (rgb.r + rgb.g + rgb.b) > 40) {
            return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
        }
    } catch {
        /* fall through */
    }
    try {
        const bg = parseCssColor(
            globalThis.getComputedStyle(document.body).backgroundColor || '#111',
        )
        if (bg && luminance(bg) < 0.5) return 'rgb(220, 220, 220)'
    } catch {
        /* ignore */
    }
    return 'rgb(60, 60, 60)'
}

function randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1))
}

/**
 * @param {HTMLElement} host
 * @param {HTMLElement} content
 * @param {boolean} enabled
 * @param {{ compact?: boolean, shortField?: boolean }} [opts]
 */
function applyLengthMask(host, content, enabled, opts = {}) {
    if (!enabled) return
    const natural = Math.ceil(
        content.getBoundingClientRect().width || content.offsetWidth || 0,
    )

    const parent = host.parentElement
    let parentW = 0
    try {
        parentW = parent
            ? Math.floor(
                parent.getBoundingClientRect().width || parent.clientWidth || 0,
            )
            : 0
    } catch {
        parentW = 0
    }

    const parentCap = parentW > 0 ? Math.max(24, parentW) : 280

    let decoy
    if (opts.compact) {
        const shortField = opts.shortField === true
        const absMax = Math.min(parentCap, shortField ? 112 : 88)
        const absMin = Math.min(absMax, shortField ? 72 : 52)
        decoy = randInt(absMin, absMax)
    } else {
        const maxW = Math.min(parentCap, Math.max(natural || 64, 48), 160)
        const lo = Math.max(
            40,
            Math.min(maxW, Math.floor((natural || 64) * (0.55 + Math.random() * 0.2))),
        )
        const hi = Math.max(
            lo + 4,
            Math.min(maxW, Math.ceil((natural || 64) * (0.9 + Math.random() * 0.25))),
        )
        decoy = Math.min(maxW, randInt(lo, hi))
    }

    const style = globalThis.getComputedStyle(content)
    const naturalH = Math.ceil(content.getBoundingClientRect().height || 0)
    const fontH = Math.ceil(Number.parseFloat(style.fontSize) || 0) || 0
    const lineH = Math.max(16, naturalH, fontH) + randInt(0, 2)

    host.dataset.lengthMasked = '1'
    host.style.setProperty('--roprime-spoiler-w', `${decoy}px`)
    host.style.setProperty('--roprime-spoiler-h', `${lineH}px`)
    host.style.setProperty('display', 'inline-block', 'important')
    host.style.setProperty('box-sizing', 'border-box', 'important')
    host.style.setProperty('width', `${decoy}px`, 'important')
    host.style.setProperty('min-width', `${decoy}px`, 'important')
    host.style.setProperty('max-width', `${decoy}px`, 'important')
    host.style.setProperty('height', `${lineH}px`, 'important')
    host.style.setProperty('min-height', `${lineH}px`, 'important')
    host.style.setProperty('overflow', 'hidden', 'important')

    content.style.setProperty('position', 'absolute', 'important')
    content.style.setProperty('left', '0', 'important')
    content.style.setProperty('top', '0', 'important')
    content.style.setProperty('visibility', 'hidden', 'important')
}

function computeParticleCount(host, content) {
    const hostRect = host.getBoundingClientRect()
    const contentRect = content.getBoundingClientRect()
    const width = Math.max(hostRect.width, contentRect.width, 40)
    const height = Math.max(hostRect.height, contentRect.height, 14)
    const area = width * height
    const jitter = 0.65 + Math.random() * 0.7
    if (host.dataset.lengthMasked === '1' || area < 4500) {
        return Math.max(70, Math.min(220, Math.round((area / 12) * jitter)))
    }
    return Math.max(120, Math.min(480, Math.round((area / 20) * jitter)))
}

/**
 * @param {number} x
 * @param {number} y
 */
function hash2(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
    return s - Math.floor(s)
}

function noise2(x, y) {
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const fx = x - x0
    const fy = y - y0
    const ux = fx * fx * (3 - 2 * fx)
    const uy = fy * fy * (3 - 2 * fy)
    const a = hash2(x0, y0)
    const b = hash2(x0 + 1, y0)
    const c = hash2(x0, y0 + 1)
    const d = hash2(x0 + 1, y0 + 1)
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

/**
 * @param {HTMLElement} host
 * @param {{ revealDuration?: number, maskLength?: boolean, gapBefore?: boolean, blockLayout?: boolean, compact?: boolean, shortField?: boolean }} [options]
 */
export function attachSpoiler(host, options = {}) {
    if (!(host instanceof HTMLElement)) return null
    ensureStyles()
    if (host.dataset.roprimeSpoilerAttached === '1') return apiByHost.get(host) || null
    host.dataset.roprimeSpoilerAttached = '1'
    host.classList.add(HOST_CLASS)
    host.setAttribute('role', 'button')
    host.setAttribute('tabindex', '0')
    host.setAttribute('aria-label', 'Hidden content. Click to reveal.')

    const colorProbe = host.firstElementChild instanceof HTMLElement ? host.firstElementChild : host
    const particleColor = readParticleCssColor(colorProbe)

    const content = document.createElement('span')
    content.className = CONTENT_CLASS
    while (host.firstChild) content.appendChild(host.firstChild)
    host.appendChild(content)

    applyLengthMask(host, content, options.maskLength === true, {
        compact: options.compact === true,
        shortField: options.shortField === true,
    })
    if (options.gapBefore === true) host.dataset.spoilerGap = '1'
    if (options.blockLayout === true) host.dataset.spoilerBlock = '1'

    const canvas = document.createElement('canvas')
    canvas.className = CANVAS_CLASS
    canvas.setAttribute('aria-hidden', 'true')
    host.appendChild(canvas)

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) {
        host.dataset.roprimeSpoilerAttached = '0'
        return null
    }

    const dpr = Math.max(1, Math.min(2, globalThis.devicePixelRatio || 1))
    const revealMs = options.revealDuration ?? 420
    const dot = Math.max(1.6, dpr * 1.15)

    let revealed = false
    let revealing = false
    let rafId = 0
    let W = 1
    let H = 1
    let time = 0
    let last = performance.now()
    /** @type {Array<{ x: number, y: number, life: number, seed: number }>} */
    let particles = []
    /** @type {ResizeObserver | null} */
    let resizeObserver = null

    function clearLengthMask() {
        host.removeAttribute('data-length-masked')
        for (
            const prop of [
                '--roprime-spoiler-w',
                '--roprime-spoiler-h',
                'display',
                'box-sizing',
                'width',
                'min-width',
                'max-width',
                'height',
                'min-height',
                'overflow',
            ]
        ) {
            host.style.removeProperty(prop)
        }
        for (
            const prop of ['position', 'left', 'top', 'visibility', 'width', 'max-width', 'overflow']
        ) {
            content.style.removeProperty(prop)
        }
    }

    function seedParticles() {
        const count = computeParticleCount(host, content)
        particles = []
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * W,
                y: Math.random() * H,
                life: Math.random(),
                seed: Math.random() * 100,
            })
        }
    }

    function resize() {
        const rect = host.getBoundingClientRect()
        W = Math.max(12, Math.ceil(rect.width))
        H = Math.max(14, Math.ceil(rect.height))
        canvas.width = Math.max(1, Math.floor(W * dpr))
        canvas.height = Math.max(1, Math.floor(H * dpr))
        canvas.style.width = `${W}px`
        canvas.style.height = `${H}px`
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        seedParticles()
    }

    function drawFrame(now) {
        if (revealed || !ctx) return
        const dt = Math.min(0.05, (now - last) / 1000)
        last = now
        time += dt

        ctx.clearRect(0, 0, W, H)
        ctx.fillStyle = particleColor

        for (const p of particles) {
            const nx = noise2(p.x * 0.045 + p.seed, time * 0.7 + p.seed)
            const ny = noise2(p.y * 0.045 - p.seed, time * 0.7 - p.seed)
            p.x += (nx - 0.5) * 28 * dt
            p.y += (ny - 0.5) * 28 * dt
            p.life += dt * 0.9

            if (p.x < -2) p.x = W + 2
            if (p.x > W + 2) p.x = -2
            if (p.y < -2) p.y = H + 2
            if (p.y > H + 2) p.y = -2

            const pulse = 0.35 + 0.55 * Math.abs(Math.sin(p.life * Math.PI))
            ctx.globalAlpha = pulse
            ctx.fillRect(p.x, p.y, dot, dot)
        }
        ctx.globalAlpha = 1

        if (!revealing) rafId = requestAnimationFrame(drawFrame)
    }

    function unwrapHost() {
        const parent = host.parentNode
        if (!parent) {
            host.remove()
            return
        }
        while (content.firstChild) parent.insertBefore(content.firstChild, host)
        host.remove()
    }

    function finishReveal() {
        if (revealed) return
        revealed = true
        revealing = false
        host.dataset.revealed = '1'
        host.removeAttribute('data-revealing')
        host.removeAttribute('role')
        host.removeAttribute('tabindex')
        host.removeAttribute('aria-label')
        clearLengthMask()
        if (rafId) cancelAnimationFrame(rafId)
        rafId = 0
        if (resizeObserver) {
            resizeObserver.disconnect()
            resizeObserver = null
        }
        canvas.remove()

        if (host.dataset.spoilerBlock === '1') {
            unwrapHost()
            apiByHost.delete(host)
        }
    }

    function reveal(clientX, clientY) {
        if (revealed || revealing) return
        revealing = true
        host.dataset.revealing = '1'
        clearLengthMask()
        if (rafId) cancelAnimationFrame(rafId)

        const originX = typeof clientX === 'number' ? clientX - host.getBoundingClientRect().left : W * 0.5
        const originY = typeof clientY === 'number' ? clientY - host.getBoundingClientRect().top : H * 0.5

        const start = performance.now()
        const burst = (now) => {
            if (!ctx) return finishReveal()
            const t = Math.min(1, (now - start) / revealMs)
            ctx.clearRect(0, 0, W, H)
            ctx.fillStyle = particleColor
            for (const p of particles) {
                const dx = p.x - originX
                const dy = p.y - originY
                const dist = Math.hypot(dx, dy) || 1
                p.x += (dx / dist) * t * 10
                p.y += (dy / dist) * t * 10
                ctx.globalAlpha = (1 - t) * 0.85
                ctx.fillRect(p.x, p.y, dot, dot)
            }
            ctx.globalAlpha = 1
            if (t < 1) rafId = requestAnimationFrame(burst)
            else finishReveal()
        }
        rafId = requestAnimationFrame(burst)
    }

    function destroy() {
        if (rafId) cancelAnimationFrame(rafId)
        rafId = 0
        if (resizeObserver) {
            resizeObserver.disconnect()
            resizeObserver = null
        }
        clearLengthMask()
        canvas.remove()
        unwrapHost()
        apiByHost.delete(host)
    }

    resize()
    rafId = requestAnimationFrame(drawFrame)
    if (typeof ResizeObserver === 'function') {
        resizeObserver = new ResizeObserver(() => {
            if (!revealed && !revealing) resize()
        })
        resizeObserver.observe(host)
    }

    const api = {
        reveal,
        destroy,
        isRevealed: () => revealed,
        host,
    }
    apiByHost.set(host, api)
    return api
}

export function isSpoilerHost(node) {
    return node instanceof HTMLElement && node.classList.contains(HOST_CLASS)
}

export function getSpoilerApi(host) {
    if (!(host instanceof HTMLElement)) return null
    return apiByHost.get(host) || null
}
