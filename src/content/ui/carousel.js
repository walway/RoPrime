// Do not touch literally ANYTHING here

const FALLBACK_CLASSES = {
    collectionCarouselContainer: 'css-17g81zd-collectionCarouselContainer',
    carouselContainer: 'css-1jynqc0-carouselContainer',
    carouselGap12: 'css-1i465w8-carousel',
    carouselGap18: 'css-1rhwvi4-carousel',

    carouselItem: 'css-izzd58-carouselItem',
}

const ITEM_SIZE = {
    XSmall: {
        minItemWidth: 80,
        minItemCount: 3,
        maxItemCount: 20,
        fractionalItemAmount: 0.15,
    },
    Small: {
        minItemWidth: 150,
        minItemCount: 3,
        maxItemCount: 12,
        fractionalItemAmount: 0.15,
    },
    Medium: {
        minItemWidth: 233,
        minItemCount: 2,
        maxItemCount: 6,
        fractionalItemAmount: 0.15,
    },
    Large: {
        minItemWidth: 300,
        minItemCount: 1,
        maxItemCount: 4,
        fractionalItemAmount: 0.3,
    },
    XLarge: {
        minItemWidth: 300,
        minItemCount: 1,
        maxItemCount: 1,
        fractionalItemAmount: 0.1,
    },
}

const SIBLING_CAROUSEL_HOSTS = [
    '.profile-experiences',
    '.profile-communities',
    '.profile-favorite-experiences',
    '.profile-currently-wearing',
    '.react-friends-carousel-container',
]

function emotionCssText() {
    let out = ''
    for (const node of document.querySelectorAll('style[data-emotion]')) {
        out += node.textContent || ''
    }
    return out
}

function findEmotionClassBySuffix(suffix, fallback) {
    const css = emotionCssText()
    if (!css) return fallback
    const re = new RegExp(
        `\\.(css-[a-z0-9]+-${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?=[\\s.{,:]|$)`,
        'gi',
    )
    let match = re.exec(css)
    let last = ''
    while (match) {
        last = match[1]
        match = re.exec(css)
    }
    return last || fallback
}

function resolveCarouselContainerClass() {
    const css = emotionCssText()
    const preferred = FALLBACK_CLASSES.carouselContainer
    if (!css) return preferred
    if (css.includes(`.${preferred} .scroll-arrow`)) return preferred
    const re = /\.(css-[a-z0-9]+-carouselContainer)(?=[\s.{,:]|$)/gi
    let match = re.exec(css)
    let lastWithArrows = ''
    while (match) {
        if (css.includes(`.${match[1]} .scroll-arrow`)) {
            lastWithArrows = match[1]
        }
        match = re.exec(css)
    }
    return lastWithArrows || preferred
}

export function findLatestCarouselItemClass() {
    const css = emotionCssText()
    if (!css) return FALLBACK_CLASSES.carouselItem
    const re = /\.(css-[a-z0-9]+-carouselItem)(?=[\s.{,:]|$)/gi
    let match = re.exec(css)
    let last = ''
    while (match) {
        last = match[1]
        match = re.exec(css)
    }
    return last || FALLBACK_CLASSES.carouselItem
}

function itemClassFromElement(el) {
    if (!(el instanceof HTMLElement)) return null
    for (const className of el.classList) {
        if (/-carouselItem$/i.test(className)) return className
    }
    return null
}

export function findLiveCarouselItemClass(excludeRoot = null) {
    const pick = (host) => {
        if (!(host instanceof HTMLElement)) return null
        for (const el of host.querySelectorAll(
            '#collection-carousel-item, [id="collection-carousel-item"]',
        )) {
            if (excludeRoot && excludeRoot.contains(el)) continue
            const className = itemClassFromElement(el)
            if (className) return className
        }
        return null
    }

    for (const selector of SIBLING_CAROUSEL_HOSTS) {
        const found = pick(document.querySelector(selector))
        if (found) return found
    }

    for (const el of document.querySelectorAll(
        '#collection-carousel-item, [id="collection-carousel-item"]',
    )) {
        if (excludeRoot && excludeRoot.contains(el)) continue
        const className = itemClassFromElement(el)
        if (className) return className
    }
    return null
}

export function resolveItemClass(excludeRoot = null) {
    return (
        findLiveCarouselItemClass(excludeRoot) ||
        findLatestCarouselItemClass() ||
        FALLBACK_CLASSES.carouselItem
    )
}

function findCarouselTrackClass(columnGap) {
    const preferred =
        columnGap >= 18
            ? FALLBACK_CLASSES.carouselGap18
            : FALLBACK_CLASSES.carouselGap12
    const css = emotionCssText()
    if (!css) return preferred
    const re = /\.(css-[a-z0-9]+-carousel)(?![A-Za-z])/gi
    const gap = `${Number(columnGap) || 12}px`
    let match = re.exec(css)
    let latestWithGap = ''
    while (match) {
        const className = match[1]
        const bodyMatch = new RegExp(
            `\\.${className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`,
            'i',
        ).exec(css)
        const body = bodyMatch?.[1] || ''
        if (
            (/scroll-snap-type:\s*x/i.test(body) || /overflow-x/i.test(body)) &&
            body.includes(gap)
        ) {
            latestWithGap = className
        }
        match = re.exec(css)
    }
    return latestWithGap || preferred
}

function resolveColumnGap(containerWidth, layoutOverrides = {}) {
    if (Number.isFinite(Number(layoutOverrides.columnGap))) {
        return Number(layoutOverrides.columnGap)
    }
    if (!containerWidth) return 12
    if (containerWidth < 1024) return 12
    if (containerWidth < 1280) return 18
    return 24
}

export function resolveCarouselLayout(
    collectionItemSize = 'Small',
    containerWidth = 0,
    layoutOverrides = {},
) {
    const size = ITEM_SIZE[collectionItemSize] || ITEM_SIZE.Small
    const columnGap = resolveColumnGap(containerWidth, layoutOverrides)
    const sideMargin = Number(layoutOverrides.sideMargin) || 0
    const computedColumns =
        containerWidth >= 280
            ? Math.min(
                  Math.max(
                      size.minItemCount,
                      Math.floor(
                          (containerWidth - 2 * sideMargin + columnGap) /
                              (size.minItemWidth + columnGap),
                      ),
                  ),
                  size.maxItemCount,
              )
            : size.minItemCount
    const numColumns = Number.isFinite(Number(layoutOverrides.numColumns))
        ? Number(layoutOverrides.numColumns)
        : computedColumns
    const fractionalItemAmount = Number.isFinite(
        Number(layoutOverrides.fractionalItemAmount),
    )
        ? Number(layoutOverrides.fractionalItemAmount)
        : size.fractionalItemAmount
    return { numColumns, fractionalItemAmount, columnGap, sideMargin, size }
}

export function readCarouselItemWidth(itemClass, sampleEl = null) {
    if (sampleEl instanceof HTMLElement) {
        const rect = sampleEl.getBoundingClientRect().width
        if (rect > 1) return rect
        const computed = Number.parseFloat(getComputedStyle(sampleEl).width)
        if (Number.isFinite(computed) && computed > 1) return computed
    }
    const css = emotionCssText()
    if (itemClass && css) {
        const bodyMatch = new RegExp(
            `\\.${itemClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`,
            'i',
        ).exec(css)
        const widthMatch = bodyMatch?.[1]?.match(/width:\s*([\d.]+)px/i)
        if (widthMatch) {
            const w = Number(widthMatch[1])
            if (Number.isFinite(w) && w > 0) return w
        }
    }
    return 151.667
}

function measureCarouselWidth(shell, track, root) {
    const values = [
        track?.clientWidth,
        shell?.clientWidth,
        root?.clientWidth,
        root?.parentElement?.clientWidth,
    ]
    for (const value of values) {
        const width = Number(value) || 0
        if (width >= 280) return width
    }
    return 0
}

function buildScrollArrow(direction) {
    const arrow = document.createElement('div')
    arrow.dataset.testid = 'carousel-scroll-arrow'
    arrow.className = `scroll-arrow ${direction}`
    arrow.setAttribute('role', 'button')
    arrow.tabIndex = 0
    const icon = document.createElement('span')
    icon.dataset.testid = 'carousel-scroll-arrow-icon'
    icon.className =
        direction === 'prev'
            ? 'icon-chevron-heavy-left'
            : 'icon-chevron-heavy-right'
    arrow.appendChild(icon)
    return arrow
}

/**
 * @returns {{ root: HTMLElement, track: HTMLElement, shell: HTMLElement, refresh: () => void, destroy: () => void }}
 */
export function createEmotionCarousel({
    items = [],
    collectionItemSize = 'Small',
    columnGap: forcedGap,
    header = null,
    gapBetweenHeaderAndItems = 14,
    isHorizontalScrollEnabled = true,
    layoutOverrides = {},
} = {}) {
    const overrides = { ...layoutOverrides }
    if (forcedGap != null) overrides.columnGap = forcedGap

    const gapHint = Number(overrides.columnGap) || 12
    const collectionClass = findEmotionClassBySuffix(
        'collectionCarouselContainer',
        FALLBACK_CLASSES.collectionCarouselContainer,
    )
    const containerClass = resolveCarouselContainerClass()
    const trackClass = findCarouselTrackClass(gapHint)

    const root = document.createElement('div')
    root.className = collectionClass
    if (gapBetweenHeaderAndItems != null) {
        root.dataset.roprimeCarouselGap = String(gapBetweenHeaderAndItems)
    }

    if (header instanceof HTMLElement) root.appendChild(header)

    const shell = document.createElement('div')
    shell.className = containerClass

    const track = document.createElement('div')
    track.className = trackClass
    shell.appendChild(track)
    root.appendChild(shell)

    /** @type {HTMLElement[]} */
    const itemNodes = []

    const cssNow = emotionCssText()
    let itemClass =
        findLiveCarouselItemClass() ||
        (cssNow.includes(`.${FALLBACK_CLASSES.carouselItem}`)
            ? FALLBACK_CLASSES.carouselItem
            : findLatestCarouselItemClass())

    for (const child of items) {
        if (!(child instanceof HTMLElement)) continue
        const wrap = document.createElement('div')
        wrap.className = itemClass
        wrap.appendChild(child)
        track.appendChild(wrap)
        itemNodes.push(wrap)
    }

    let index = 0
    let scrolling = false
    let resizeObserver = null
    let emotionObserver = null
    let headObserver = null
    let raf = 0
    /** @type {HTMLElement | null} */
    let prevArrow = null
    /** @type {HTMLElement | null} */
    let nextArrow = null

    const applyItemClass = (nextClass) => {
        if (!nextClass || nextClass === itemClass) return false
        itemClass = nextClass
        for (const node of itemNodes) node.className = itemClass
        return true
    }

    const syncFromEmotion = () => {
        applyItemClass(resolveItemClass(root))
        const nextCollection = findEmotionClassBySuffix(
            'collectionCarouselContainer',
            FALLBACK_CLASSES.collectionCarouselContainer,
        )
        if (nextCollection && root.className !== nextCollection) {

            root.className = nextCollection
        }
        const nextContainer = resolveCarouselContainerClass()
        if (nextContainer && shell.className !== nextContainer) {
            shell.className = nextContainer
        }
        const nextTrack = findCarouselTrackClass(
            Number(overrides.columnGap) || gapHint,
        )
        if (nextTrack && track.className !== nextTrack) {
            track.className = nextTrack
        }
    }

    const state = () => {
        const width = measureCarouselWidth(shell, track, root)
        const layout = resolveCarouselLayout(
            collectionItemSize,
            width,
            overrides,
        )
        const count = itemNodes.length
        const itemWidth = readCarouselItemWidth(itemClass, itemNodes[0] || null)
        const gap = layout.columnGap || 0
        const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth)
        const hasOverflow = maxScroll > 1
        const allowArrows = isHorizontalScrollEnabled && hasOverflow
        const maxIndex = Math.max(0, count - layout.numColumns)
        const atStart = track.scrollLeft <= 1
        const atEnd = !hasOverflow || track.scrollLeft >= maxScroll - 1
        return {
            width,
            layout,
            count,
            allowArrows,
            itemWidth,
            gap,
            maxIndex,
            maxScroll,
            atStart,
            atEnd,
        }
    }

    const ensureArrow = (direction) => {
        if (direction === 'prev') {
            if (prevArrow?.isConnected) return prevArrow
            prevArrow = buildScrollArrow('prev')
            prevArrow.addEventListener('click', () => scrollBy(-1))
            prevArrow.addEventListener('keydown', (event) => {
                if (event.code === 'Enter' || event.code === 'Space') {
                    event.preventDefault()
                    event.stopPropagation()
                    scrollBy(-1)
                }
            })
            shell.insertBefore(prevArrow, track)
            return prevArrow
        }
        if (nextArrow?.isConnected) return nextArrow
        nextArrow = buildScrollArrow('next')
        nextArrow.addEventListener('click', () => scrollBy(1))
        nextArrow.addEventListener('keydown', (event) => {
            if (event.code === 'Enter' || event.code === 'Space') {
                event.preventDefault()
                event.stopPropagation()
                scrollBy(1)
            }
        })
        shell.appendChild(nextArrow)
        return nextArrow
    }

    const syncArrows = () => {
        const { allowArrows, atStart, atEnd } = state()
        const coarse =
            typeof matchMedia === 'function' &&
            matchMedia('(pointer: coarse) and (not (any-pointer: fine))')
                .matches

        const wantPrev = allowArrows && !coarse && !atStart
        const wantNext = allowArrows && !coarse && !atEnd

        if (!wantPrev) {
            prevArrow?.remove()
            prevArrow = null
        } else {
            ensureArrow('prev')
        }

        if (!wantNext) {
            nextArrow?.remove()
            nextArrow = null
        } else {
            ensureArrow('next')
        }
    }

    const scrollToIndex = (nextIndex) => {
        const { maxIndex, itemWidth, gap, maxScroll } = state()
        index = Math.min(Math.max(0, nextIndex), maxIndex)
        track.scrollLeft =
            index >= maxIndex && maxScroll > 0
                ? maxScroll
                : index * (itemWidth + gap)
        syncArrows()
    }

    const scrollBy = (pages) => {
        if (scrolling) return
        const { layout } = state()
        scrolling = true
        scrollToIndex(index + pages * Math.max(1, layout.numColumns))
        globalThis.setTimeout(() => {
            scrolling = false
            syncArrows()
        }, 500)
    }

    const refresh = () => {
        syncFromEmotion()
        const { maxIndex, itemWidth, gap } = state()
        const step = itemWidth + gap
        if (step > 0) {
            index = Math.min(
                Math.max(0, Math.round(track.scrollLeft / step)),
                maxIndex,
            )
        } else if (index > maxIndex) {
            index = maxIndex
        }
        syncArrows()
    }

    const scheduleRefresh = () => {
        if (raf) return
        raf = globalThis.requestAnimationFrame(() => {
            raf = 0
            refresh()
        })
    }

    const onScroll = () => {
        const { itemWidth, gap, maxIndex } = state()
        const step = itemWidth + gap
        if (step > 0 && !scrolling) {
            index = Math.min(
                Math.max(0, Math.round(track.scrollLeft / step)),
                maxIndex,
            )
        }
        syncArrows()
    }

    track.addEventListener('scroll', onScroll, { passive: true })

    if (typeof ResizeObserver === 'function') {
        resizeObserver = new ResizeObserver(() => scheduleRefresh())
        resizeObserver.observe(shell)
        resizeObserver.observe(track)
        if (root.parentElement) resizeObserver.observe(root.parentElement)
    }

    emotionObserver = new MutationObserver(() => scheduleRefresh())
    const observeEmotionStyles = () => {
        for (const style of document.querySelectorAll('style[data-emotion]')) {
            emotionObserver.observe(style, {
                childList: true,
                characterData: true,
                subtree: true,
            })
        }
    }
    observeEmotionStyles()
    headObserver = new MutationObserver((mutations) => {
        let sawStyle = false
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (
                    node instanceof HTMLStyleElement &&
                    node.hasAttribute('data-emotion')
                ) {
                    sawStyle = true
                }
            }
        }
        if (!sawStyle) return
        observeEmotionStyles()
        scheduleRefresh()
    })
    headObserver.observe(document.head || document.documentElement, {
        childList: true,
    })

    refresh()

    return {
        root,
        track,
        shell,
        refresh,
        destroy() {
            if (raf) globalThis.cancelAnimationFrame(raf)
            resizeObserver?.disconnect()
            emotionObserver?.disconnect()
            headObserver?.disconnect()
            track.removeEventListener('scroll', onScroll)
            prevArrow?.remove()
            nextArrow?.remove()
            prevArrow = null
            nextArrow = null
        },
    }
}
