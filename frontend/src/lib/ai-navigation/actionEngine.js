import { isWhitelistedPath, searchSitemap } from '@/lib/ai-navigation/sitemap'
import { findBestElementHint, normalizeCurrentRoute, resolveElementFromHint } from '@/lib/ai-navigation/elementRegistry'

const HIGHLIGHT_CLASS = 'ai-glow-highlight'
const activeHighlightTimers = new Map()
const API_URL = import.meta.env.VITE_API_URL || '/api'
const SCROLL_BLOCKS = new Set(['start', 'center', 'end', 'nearest'])
const TEXT_TARGET_MIN_SCORE = 20
const AUTO_HIGHLIGHT_MIN_CONFIDENCE = 0.62

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalize = (text = '') =>
  text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\bnop\b/g, 'gui')
    .replace(/\bdu\s+thi\b/g, 'bai thi')
    .trim()

const safeScrollBlock = (value) => (SCROLL_BLOCKS.has(value) ? value : 'start')

const toToolTarget = (value) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('text:') || trimmed.startsWith('anchor:') || trimmed.startsWith('#')) {
    return trimmed
  }
  return `anchor:${trimmed}`
}

const scorePhrase = (content = '', phrase = '') => {
  const normalizedContent = normalize(content)
  const normalizedPhrase = normalize(phrase)
  if (!normalizedPhrase) return 0

  let score = 0
  if (normalizedContent.includes(normalizedPhrase)) score += 120

  const tokens = Array.from(new Set(normalizedPhrase.split(/\s+/).filter(Boolean)))
  let matchedTokens = 0
  for (const token of tokens) {
    if (token.length < 2) continue
    if (normalizedContent.includes(token)) {
      matchedTokens += 1
      score += 9
    }
  }

  if (tokens.length > 0) {
    const coverage = matchedTokens / tokens.length
    score += Math.round(coverage * 30)
    if (matchedTokens >= 3) score += 10
  }

  return score
}

const textScoreToConfidence = (score = 0) => {
  if (!Number.isFinite(score) || score <= TEXT_TARGET_MIN_SCORE) return 0
  const normalized = (score - TEXT_TARGET_MIN_SCORE) / 140
  const bounded = Math.max(0, Math.min(1, normalized))
  return Math.max(0.25, Math.min(0.9, (bounded * 0.65) + 0.25))
}

const extractFocusPhrase = (query = '') => {
  const trimmed = query.trim()
  if (!trimmed) return ''

  const firstLine = trimmed.split('\n').map((line) => line.trim()).find(Boolean) || trimmed

  const quoteMatch = trimmed.match(/["“”']([^"“”']{2,120})["“”']/)
  if (quoteMatch?.[1]) return quoteMatch[1].trim()

  const headingMatch = firstLine.match(/(?:tieu\s*de|tiêu\s*đề|heading)\s+(.{2,120})$/i)
  if (headingMatch?.[1]) {
    return headingMatch[1]
      .replace(/^(la|là|ten|tên)\s+/i, '')
      .replace(/[.,;:!?]+$/g, '')
      .trim()
  }

  const cardMatch = trimmed.match(/card\s+(.+?)(?:\s+(?:tren|trên|o|ở)\s+trang|$)/i)
  if (cardMatch?.[1]) return cardMatch[1].trim()

  const elementMatch = trimmed.match(/(?:phan\s*tu|phần\s*tử|truong|trường|label|input|nut|nút|button)\s+(.+?)(?:\s+(?:trong|tren|trên|o|ở)\s+trang|$)/i)
  if (elementMatch?.[1]) {
    return elementMatch[1]
      .replace(/^(la|là|ten|tên)\s+/i, '')
      .trim()
  }

  return ''
}

const getPathname = (path = '') => {
  if (typeof path !== 'string') return ''
  const trimmed = path.trim()
  if (!trimmed) return ''
  return trimmed.split('?')[0] || trimmed
}

const rerankContentMatches = ({ matches = [], currentPath = '', preferCurrentPath = false, preferHome = false }) => {
  if (!Array.isArray(matches) || matches.length === 0) return []

  return [...matches]
    .map((item) => {
      const rawScore = Number.isFinite(Number(item?.score)) ? Number(item.score) : 0
      const path = item?.path || ''
      const pathname = getPathname(path)
      let bonus = 0

      if (pathname && currentPath && pathname === currentPath) bonus += 90
      if (preferCurrentPath && pathname && currentPath && currentPath.startsWith(pathname)) bonus += 35
      if (preferHome && pathname === '/') bonus += 45

      return {
        ...item,
        __agentAdjustedScore: rawScore + bonus,
      }
    })
    .sort((a, b) => (b.__agentAdjustedScore || 0) - (a.__agentAdjustedScore || 0))
}

const rerankSitemapMatches = ({ matches = [], currentPath = '', preferHome = false }) => {
  if (!Array.isArray(matches) || matches.length === 0) return []

  return [...matches]
    .map((item) => {
      const pathname = getPathname(item?.path || '')
      let bonus = 0
      if (pathname && currentPath && pathname === currentPath) bonus += 35
      if (preferHome && pathname === '/') bonus += 35
      return {
        ...item,
        __agentAdjustedScore: (Number(item?.score) || 0) + bonus,
      }
    })
    .sort((a, b) => (b.__agentAdjustedScore || 0) - (a.__agentAdjustedScore || 0))
}

const resolveTargetElement = (target) => {
  if (!target || typeof target !== 'string') return null

  const normalizedTarget = target.trim()
  if (!normalizedTarget) return null

  if (normalizedTarget.startsWith('text:')) {
    const phrase = normalizedTarget.slice(5).trim()
    const indexedHint = findBestElementHint(phrase, normalizeCurrentRoute())
    if (indexedHint) {
      const byHint = resolveElementFromHint(indexedHint)
      if (byHint) {
        return {
          element: byHint,
          confidence: 0.93,
          strategy: 'indexed_hint',
        }
      } else {
        try {
          // Telemetry/diagnostic: indexed hint existed but runtime resolution failed
          // Keep this lightweight (console) for now; will evolve to server telemetry.
          // eslint-disable-next-line no-console
          console.warn('AI: indexed hint found but resolution failed', indexedHint)
          try {
            fetch(`${API_URL}/ai/telemetry/element-resolution`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ts: new Date().toISOString(),
                hint: indexedHint,
                route: normalizeCurrentRoute(),
              }),
              keepalive: true,
            }).catch(() => {})
          } catch (e) {
            // ignore telemetry failures
          }
        } catch (e) {
          // ignore
        }
      }
    }

    const candidates = [
      ...document.querySelectorAll('[data-ai-card-title]'),
      ...document.querySelectorAll('h1,h2,h3,h4,p,a,button,article,.group,.card,label,input,textarea,select,[aria-label],[placeholder]'),
    ]

    let bestElement = null
    let bestScore = 0
    for (const node of candidates) {
      const value = (
        node.getAttribute?.('data-ai-card-title') ||
        node.getAttribute?.('aria-label') ||
        node.getAttribute?.('placeholder') ||
        node.getAttribute?.('title') ||
        (node.value != null ? String(node.value) : '') ||
        node.getAttribute?.('alt') ||
        node.textContent ||
        ''
      )
      const score = scorePhrase(value, phrase)
      if (score > bestScore) {
        bestScore = score
        bestElement = node
      }
    }

    if (bestElement && bestScore > TEXT_TARGET_MIN_SCORE) {
      return {
        element: bestElement,
        confidence: textScoreToConfidence(bestScore),
        strategy: 'text_fuzzy',
        score: bestScore,
      }
    }
  }

  if (normalizedTarget.startsWith('anchor:')) {
    const anchorKey = normalizedTarget.slice(7).trim()
    const escapedAnchor = window.CSS && typeof window.CSS.escape === 'function'
      ? window.CSS.escape(anchorKey)
      : anchorKey
    const byAnchor = document.querySelector(`[data-ai-anchor="${escapedAnchor}"]`)
    if (byAnchor) {
      return {
        element: byAnchor,
        confidence: 0.98,
        strategy: 'anchor',
      }
    }
  }

  if (normalizedTarget.startsWith('#')) {
    const bySelector = document.querySelector(normalizedTarget)
    if (bySelector) {
      return {
        element: bySelector,
        confidence: 0.95,
        strategy: 'selector',
      }
    }
  }

  const byId = document.getElementById(normalizedTarget)
  if (byId) {
    return {
      element: byId,
      confidence: 0.97,
      strategy: 'id',
    }
  }

  const escaped = window.CSS && typeof window.CSS.escape === 'function'
    ? window.CSS.escape(normalizedTarget)
    : normalizedTarget

  const byFallbackAnchor = document.querySelector(`[data-ai-anchor="${escaped}"]`)
  if (!byFallbackAnchor) return null

  return {
    element: byFallbackAnchor,
    confidence: 0.9,
    strategy: 'anchor_fallback',
  }
}

const extractPhraseFromTarget = (target = '') => {
  if (typeof target !== 'string') return ''
  const trimmed = target.trim()
  if (!trimmed.startsWith('text:')) return ''
  return trimmed.slice(5).trim()
}

const focusForAccessibility = (element) => {
  if (!element) return

  const canFocus = typeof element.focus === 'function'
  if (!canFocus) return

  const hadTabIndex = element.hasAttribute('tabindex')
  if (!hadTabIndex) {
    element.setAttribute('tabindex', '-1')
  }

  element.focus({ preventScroll: true })

  if (!hadTabIndex) {
    window.setTimeout(() => {
      element.removeAttribute('tabindex')
    }, 900)
  }
}

const scrollToTarget = (target, block = 'start') => {
  const resolved = resolveTargetElement(target)
  if (!resolved?.element) return { ok: false, reason: 'target_not_found' }

  const { element } = resolved

  element.scrollIntoView({ behavior: 'smooth', block: safeScrollBlock(block) })
  focusForAccessibility(element)
  return {
    ok: true,
    element,
    confidence: Number.isFinite(resolved.confidence) ? resolved.confidence : 0,
    targetResolution: resolved,
    actionSummary: 'Đã cuộn đến vị trí bạn cần.',
  }
}

const highlightTarget = (target, durationMs = 2000, options = {}) => {
  const providedElement = options?.element || null
  const providedConfidence = Number.isFinite(options?.confidence) ? options.confidence : null
  const minConfidence = Number.isFinite(options?.minConfidence) ? options.minConfidence : 0

  const resolved = providedElement
    ? {
      element: providedElement,
      confidence: providedConfidence == null ? 1 : providedConfidence,
      strategy: 'provided',
    }
    : resolveTargetElement(target)

  if (!resolved?.element) return { ok: false, reason: 'target_not_found' }

  const confidence = Number.isFinite(resolved.confidence) ? resolved.confidence : 0
  if (confidence < minConfidence) {
    return {
      ok: false,
      reason: 'highlight_low_confidence',
      confidence,
      minConfidence,
      actionSummary: 'Đã cuộn đúng khu vực, nhưng chưa đủ chắc để tự khoanh viền phần tử.',
    }
  }

  const { element } = resolved

  const existingTimer = activeHighlightTimers.get(element)
  if (existingTimer) {
    window.clearTimeout(existingTimer)
  }

  element.classList.add(HIGHLIGHT_CLASS)
  const timer = window.setTimeout(() => {
    element.classList.remove(HIGHLIGHT_CLASS)
    activeHighlightTimers.delete(element)
  }, Math.max(500, durationMs))

  activeHighlightTimers.set(element, timer)
  return {
    ok: true,
    element,
    confidence,
    actionSummary: 'Đã làm nổi bật vị trí bằng viền sáng.',
  }
}

const waitForRoutePaint = () =>
  new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve)
    })
  })

const ensureScrollTop = () => {
  if (typeof window === 'undefined') return
  try {
    // Prefer original scrollTo if patched by navigateWithAi
    if (window.__AI_ORIG_SCROLL_TO && typeof window.__AI_ORIG_SCROLL_TO === 'function') {
      try {
        window.__AI_ORIG_SCROLL_TO({ top: 0, left: 0, behavior: 'smooth' })
        return
      } catch (e) {
        try { window.__AI_ORIG_SCROLL_TO(0, 0) } catch (e2) { /* ignore */ }
      }
    }

    if (typeof window.scrollTo === 'function') {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
        return
      } catch (e) {
        try { window.scrollTo(0, 0) } catch (e2) { /* ignore */ }
      }
    }
  } catch (e) {
    // ignore
  }
}

const fetchKnowledgeMatches = async (query, limit = 5) => {
  const url = `${API_URL}/ai/knowledge/search?query=${encodeURIComponent(query)}&n_results=${Math.max(1, limit)}`

  try {
    const response = await fetch(url, { method: 'GET' })
    if (!response.ok) return []
    const payload = await response.json()
    return Array.isArray(payload?.results) ? payload.results : []
  } catch {
    return []
  }
}

const fetchWebsiteContentMatches = async (query, limit = 8) => {
  const url = `${API_URL}/ai/navigation/search?query=${encodeURIComponent(query)}&n_results=${Math.max(1, limit)}`

  try {
    const response = await fetch(url, { method: 'GET' })
    if (!response.ok) return []
    const payload = await response.json()
    return Array.isArray(payload?.results) ? payload.results : []
  } catch {
    return []
  }
}

const stripHtml = (value = '') =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const shorten = (value = '', max = 140) => {
  const text = stripHtml(value)
  if (!text) return ''
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}...`
}

const normalizeCandidateTitle = (item = {}) => {
  const cleaned = shorten(item?.title || '', 90)
  if (cleaned) return cleaned
  return item?.path || 'Không rõ tiêu đề'
}

const buildCompactSuggestions = (candidates = [], maxItems = 2) => {
  if (!Array.isArray(candidates) || candidates.length === 0) return ''

  const seen = new Set()
  const labels = []

  for (const item of candidates) {
    const title = normalizeCandidateTitle(item)
    const path = item?.path || '/'
    const signature = `${title}::${path}`
    if (seen.has(signature)) continue
    seen.add(signature)
    labels.push(`${title} (${path})`)
    if (labels.length >= Math.max(1, maxItems)) break
  }

  return labels.length ? `Gợi ý: ${labels.join(' · ')}` : ''
}

const mapKnowledgeResultToRoute = (item) => {
  if (!item || typeof item !== 'object') return null

  if (item.source_type === 'publication' && item.source_id != null) {
    return { path: `/posts/${item.source_id}`, target: null, source: 'knowledge_publication' }
  }

  if (item.source_type === 'story' && item.source_id != null) {
    return { path: `/stories/inspiring/${item.source_id}`, target: null, source: 'knowledge_story' }
  }

  if (item.source_type === 'event') {
    return { path: '/events/upcoming', target: `text:${item.title || ''}`, source: 'knowledge_event' }
  }

  return null
}

const resolveSearchIntent = async (query, limit) => {
  const trimmedQuery = (query || '').trim()
  const normalizedQuery = normalize(trimmedQuery)
  const focusPhrase = extractFocusPhrase(trimmedQuery)
  const currentRoute = normalizeCurrentRoute()
  const currentPath = currentRoute.split('?')[0] || currentRoute
  const mentionsHome = /trang chu|trang chủ|home/.test(normalizedQuery)
  const localPhrase = focusPhrase || trimmedQuery
  const localHint = findBestElementHint(localPhrase, currentRoute)
  if (localHint?.route && isWhitelistedPath(localHint.route)) {
    return {
      path: localHint.route,
      target: `text:${localHint.text}`,
      targetLabel: localHint.text,
      source: 'local_element_index',
    }
  }

  if (focusPhrase && isWhitelistedPath(currentPath)) {
    return {
      path: currentRoute,
      target: `text:${focusPhrase}`,
      targetLabel: focusPhrase,
      source: 'current_route_phrase',
    }
  }

  const contentMatches = await fetchWebsiteContentMatches(trimmedQuery, Math.max(limit, 8))
  const rankedContentMatches = rerankContentMatches({
    matches: contentMatches,
    currentPath,
    preferCurrentPath: Boolean(focusPhrase),
    preferHome: mentionsHome,
  })
  if (rankedContentMatches.length > 0) {
    const bestContent = rankedContentMatches[0]
    if (bestContent?.path) {
      const path = mentionsHome && bestContent.home_path ? bestContent.home_path : bestContent.path
      const candidateTarget = mentionsHome && bestContent.home_target
        ? bestContent.home_target
        : bestContent.target

      return {
        path,
        target: toToolTarget(candidateTarget) || (focusPhrase ? `text:${focusPhrase}` : null),
        targetLabel: bestContent.title || null,
        candidates: rankedContentMatches.slice(0, Math.max(1, Math.min(3, limit))).map((item) => ({
          title: item?.title || item?.path || 'Không rõ tiêu đề',
          snippet: shorten(item?.snippet || ''),
          path: item?.path || '/',
        })),
        source: 'website_content_index',
      }
    }
  }

  if (mentionsHome) {
    const homeCandidates = searchSitemap(trimmedQuery, Math.max(limit, 5)).filter((item) => item.path === '/')
    const bestHome = homeCandidates[0]

    return {
      path: '/',
      target: focusPhrase ? `text:${focusPhrase}` : (bestHome?.target ? `anchor:${bestHome.target}` : 'anchor:home-latest-publications'),
      targetLabel: focusPhrase || bestHome?.targetLabel || 'khu vực liên quan trên Trang chủ',
      source: 'home_intent',
    }
  }

  const knowledgeMatches = await fetchKnowledgeMatches(trimmedQuery, limit)
  if (knowledgeMatches.length > 0) {
    const mapped = mapKnowledgeResultToRoute(knowledgeMatches[0])
    if (mapped) {
      return {
        ...mapped,
        target: mapped.target || (focusPhrase ? `text:${focusPhrase}` : null),
        targetLabel: knowledgeMatches[0].title || null,
        candidates: knowledgeMatches.slice(0, Math.max(1, Math.min(3, limit))).map((item) => {
          const mappedItem = mapKnowledgeResultToRoute(item)
          return {
            title: item?.title || 'Không rõ tiêu đề',
            snippet: shorten(item?.snippet || ''),
            path: mappedItem?.path || '/',
          }
        }),
      }
    }
  }

  const sitemapMatches = rerankSitemapMatches({
    matches: searchSitemap(trimmedQuery, limit),
    currentPath,
    preferHome: mentionsHome,
  })
  if (sitemapMatches.length > 0) {
    const best = sitemapMatches[0]
    return {
      path: best.path,
      target: best.target ? `anchor:${best.target}` : (focusPhrase ? `text:${focusPhrase}` : null),
      targetLabel: best.targetLabel || best.title,
      candidates: sitemapMatches.slice(0, Math.max(1, Math.min(3, limit))).map((item) => ({
        title: item?.title || item?.path || 'Không rõ tiêu đề',
        snippet: '',
        path: item?.path || '/',
      })),
      source: 'sitemap',
    }
  }

  return null
}

export const createAiActionEngine = ({ navigate }) => {
  const navigateWithAi = (path, options) => {
    try {
      if (typeof window !== 'undefined') {
        // signal App shell to skip its automatic scroll-to-top on route change
        // and temporarily guard global scroll APIs so external libs don't reset scroll
        window.__AI_SUPPRESS_SCROLL = true

        try {
          // clear any existing restore timer
          if (window.__AI_SUPPRESS_SCROLL_TIMER) {
            window.clearTimeout(window.__AI_SUPPRESS_SCROLL_TIMER)
          }

          if (!window.__AI_ORIG_SCROLL_TO) {
            window.__AI_ORIG_SCROLL_TO = window.scrollTo && window.scrollTo.bind(window)
          }
          if (!window.__AI_ORIG_SCROLL_BY) {
            window.__AI_ORIG_SCROLL_BY = window.scrollBy && window.scrollBy.bind(window)
          }

          // override global scroll APIs while suppression is active
          window.scrollTo = function (...args) {
            if (window.__AI_SUPPRESS_SCROLL) return
            if (typeof window.__AI_ORIG_SCROLL_TO === 'function') return window.__AI_ORIG_SCROLL_TO(...args)
            return undefined
          }
          window.scrollBy = function (...args) {
            if (window.__AI_SUPPRESS_SCROLL) return
            if (typeof window.__AI_ORIG_SCROLL_BY === 'function') return window.__AI_ORIG_SCROLL_BY(...args)
            return undefined
          }

          // restore after short delay to avoid long-lived overrides
          window.__AI_SUPPRESS_SCROLL_TIMER = window.setTimeout(() => {
            try {
              window.__AI_SUPPRESS_SCROLL = false
              if (window.__AI_ORIG_SCROLL_TO) window.scrollTo = window.__AI_ORIG_SCROLL_TO
              if (window.__AI_ORIG_SCROLL_BY) window.scrollBy = window.__AI_ORIG_SCROLL_BY
              try { delete window.__AI_SUPPRESS_SCROLL_TIMER } catch (e) {}
            } catch (e) {
              // ignore
            }
          }, 1600)
        } catch (e) {
          // ignore any errors patching globals
        }
      }
    } catch (e) {
      // ignore
    }

    if (options) return navigate(path, options)
    return navigate(path)
  }

  const handlers = {
    navigate_to_page: async (args = {}) => {
      const path = typeof args.path === 'string' ? args.path.trim() : ''
      if (!path || !isWhitelistedPath(path)) {
        return { ok: false, reason: 'path_not_whitelisted' }
      }

      navigateWithAi(path)
      await waitForRoutePaint()
      // If there's no specific element to highlight after navigation, ensure the page is scrolled to top
      try { ensureScrollTop() } catch (e) { /* ignore */ }
      return { ok: true, action: 'navigate_to_page', path, actionSummary: `Đã mở trang ${path}.` }
    },

    search_content: async (args = {}) => {
      const query = typeof args.query === 'string' ? args.query.trim() : ''
      const limit = toInt(args.limit, 5)
      if (!query) return { ok: false, reason: 'query_missing' }

      const resolved = await resolveSearchIntent(query, limit)
      if (!resolved?.path) return { ok: false, reason: 'no_result' }
      if (!isWhitelistedPath(resolved.path)) return { ok: false, reason: 'path_not_whitelisted' }

      navigateWithAi(resolved.path)
      await waitForRoutePaint()

      let followup = { ok: true }
      let followupWarning = ''
      if (resolved.target) {
        followup = scrollToTarget(resolved.target, 'center')
        if (followup.ok) {
          const autoHighlight = highlightTarget(resolved.target, 2200, {
            element: followup.element,
            confidence: followup.confidence,
            minConfidence: AUTO_HIGHLIGHT_MIN_CONFIDENCE,
          })
          if (!autoHighlight.ok && autoHighlight.reason === 'highlight_low_confidence') {
            followupWarning = 'Mình đã cuộn đến đúng khu vực, nhưng chưa đủ chắc để tự khoanh viền phần tử.'
          }
        } else {
          const phrase = extractPhraseFromTarget(resolved.target)
          const hinted = phrase ? findBestElementHint(phrase, normalizeCurrentRoute()) : null
          if (hinted?.route && hinted.route !== normalizeCurrentRoute() && isWhitelistedPath(hinted.route)) {
            navigateWithAi(hinted.route)
            await waitForRoutePaint()
            const retry = scrollToTarget(resolved.target, 'center')
            if (retry.ok) {
              const retryHighlight = highlightTarget(resolved.target, 2200, {
                element: retry.element,
                confidence: retry.confidence,
                minConfidence: AUTO_HIGHLIGHT_MIN_CONFIDENCE,
              })
              followupWarning = retryHighlight.ok
                ? 'Mình đã chuyển sang đúng mục liên quan và đánh dấu vị trí.'
                : 'Mình đã chuyển sang đúng mục liên quan và cuộn đến khu vực phù hợp, nhưng chưa đủ chắc để tự khoanh viền.'
            } else {
              followupWarning = 'Mình đã mở đúng trang, nhưng chưa xác định chắc vị trí phần tử để khoanh viền.'
            }
          } else {
            followupWarning = 'Mình đã mở đúng trang, nhưng chưa xác định chắc vị trí phần tử để khoanh viền.'
          }
        }
      }

      // If we didn't have a concrete element target or followup failed to locate one,
      // ensure the page is scrolled to top so the user lands at the top of the opened page.
      try {
        if (!resolved.target || (followup && followup.ok === false)) {
          ensureScrollTop()
        }
      } catch (e) {
        // ignore
      }

      const summaryParts = [`Đã tìm nội dung phù hợp và mở trang ${resolved.path}.`]
      if (resolved.targetLabel) {
        summaryParts[0] = `Đã mở: ${shorten(resolved.targetLabel, 90)} (${resolved.path}).`
      }
      if (Array.isArray(resolved.candidates) && resolved.candidates.length > 0) {
        const topSuggestions = resolved.targetLabel
          ? resolved.candidates.filter((item) => shorten(item?.title || '', 90) !== shorten(resolved.targetLabel, 90))
          : resolved.candidates
        const suggestionText = buildCompactSuggestions(topSuggestions, 2)
        if (suggestionText) {
          summaryParts.push(suggestionText)
        }
      }
      if (followupWarning) {
        summaryParts.push(followupWarning)
      }

      return {
        ok: true,
        action: 'search_content',
        query,
        best: {
          path: resolved.path,
          title: resolved.targetLabel || resolved.path,
          source: resolved.source,
          target: resolved.target,
        },
        actionSummary: summaryParts.join(' '),
      }
    },

    compute_selector_for_text: async (args = {}) => {
      const query = typeof args.query === 'string' ? args.query.trim() : ''
      const path = typeof args.path === 'string' ? args.path.trim() : ''
      const limit = toInt(args.limit, 3)
      if (!query) return { ok: false, reason: 'query_missing' }

      try {
        const resp = await fetch(`${API_URL}/ai/elements/compute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, path, limit }),
        })
        if (!resp.ok) return { ok: false, reason: 'backend_error' }
        const payload = await resp.json()
        if (!payload?.ok) return { ok: false, reason: 'no_result' }

        const target = payload.target
        const route = payload.route
        if (route && isWhitelistedPath(route) && normalizeCurrentRoute() !== route) {
          navigateWithAi(route)
          await waitForRoutePaint()
        }

        if (!target) return { ok: false, reason: 'no_target' }

        const scrolled = scrollToTarget(target, 'center')
        if (!scrolled.ok) {
          return { ok: false, reason: 'target_not_found', actionSummary: 'Không tìm thấy phần tử theo gợi ý.' }
        }

        const highlighted = highlightTarget(target, 2200, {
          element: scrolled.element,
          confidence: scrolled.confidence,
          minConfidence: AUTO_HIGHLIGHT_MIN_CONFIDENCE,
        })

        return {
          ok: highlighted.ok,
          element: scrolled.element,
          confidence: scrolled.confidence,
          action: 'compute_selector_for_text',
          actionSummary: highlighted.ok
            ? 'Đã xác định và làm nổi bật phần tử.'
            : 'Đã cuộn đến khu vực phù hợp nhưng chưa đủ chắc để khoanh viền.',
        }
      } catch (e) {
        return { ok: false, reason: 'tool_exec_error', message: e?.message || String(e) }
      }
    },

    scroll_to_target: async (args = {}) => {
      const target = typeof args.target === 'string' ? args.target.trim() : ''
      const block = safeScrollBlock(typeof args.block === 'string' ? args.block : 'start')
      if (!target) return { ok: false, reason: 'target_missing' }
      return scrollToTarget(target, block)
    },

    highlight_target: async (args = {}) => {
      const target = typeof args.target === 'string' ? args.target.trim() : ''
      const durationMs = toInt(args.duration_ms, 2000)
      if (!target) return { ok: false, reason: 'target_missing' }
      return highlightTarget(target, durationMs)
    },

    open_and_focus: async (args = {}) => {
      const path = typeof args.path === 'string' ? args.path.trim() : ''
      const target = typeof args.target === 'string' ? args.target.trim() : ''
      const block = typeof args.block === 'string' ? args.block : 'start'
      const durationMs = toInt(args.duration_ms, 2000)

      if (!path || !isWhitelistedPath(path)) {
        return { ok: false, reason: 'path_not_whitelisted' }
      }
      if (!target) {
        navigateWithAi(path)
        await waitForRoutePaint()
        try { ensureScrollTop() } catch (e) {}
        return {
          ok: true,
          action: 'open_and_focus',
          path,
          actionSummary: `Đã chuyển bạn đến trang ${path}.`,
        }
      }

      navigateWithAi(path)
      await waitForRoutePaint()

      const scrolled = scrollToTarget(target, block)
      if (!scrolled.ok) {
        const phrase = extractPhraseFromTarget(target)
        const hinted = phrase ? findBestElementHint(phrase, normalizeCurrentRoute()) : null
        if (hinted?.route && hinted.route !== normalizeCurrentRoute() && isWhitelistedPath(hinted.route)) {
          navigateWithAi(hinted.route)
          await waitForRoutePaint()

          const retriedScroll = scrollToTarget(target, block)
          if (retriedScroll.ok) {
            const retriedHighlight = highlightTarget(target, durationMs, {
              element: retriedScroll.element,
              confidence: retriedScroll.confidence,
              minConfidence: AUTO_HIGHLIGHT_MIN_CONFIDENCE,
            })
            if (!retriedHighlight.ok && retriedHighlight.reason === 'highlight_low_confidence') {
              return {
                ok: true,
                action: 'open_and_focus',
                path: hinted.route,
                target,
                actionSummary: `Đã mở đúng mục liên quan (${hinted.route}) và cuộn đến khu vực phù hợp, nhưng chưa đủ chắc để tự khoanh viền.`,
              }
            }
            return {
              ...retriedHighlight,
              actionSummary: `Đã mở đúng mục liên quan (${hinted.route}) và làm nổi bật vị trí cần tìm.`,
            }
          }
        }

        try { ensureScrollTop() } catch (e) {}
        return {
          ok: true,
          action: 'open_and_focus',
          path,
          target,
          actionSummary: `Đã chuyển bạn đến trang ${path}. Mình chưa xác định chắc phần tử để khoanh viền ngay.`,
        }
      }

      const highlighted = highlightTarget(target, durationMs, {
        element: scrolled.element,
        confidence: scrolled.confidence,
        minConfidence: AUTO_HIGHLIGHT_MIN_CONFIDENCE,
      })
      if (!highlighted.ok && highlighted.reason === 'highlight_low_confidence') {
        return {
          ok: true,
          action: 'open_and_focus',
          path,
          target,
          actionSummary: `Đã mở trang ${path} và cuộn đến khu vực phù hợp, nhưng chưa đủ chắc để tự khoanh viền phần tử.`,
        }
      }
      return {
        ...highlighted,
        actionSummary: `Đã mở trang ${path} và làm nổi bật đúng vị trí cần tìm.`,
      }
    },

    search_ai_knowledge: async (args = {}) => {
      const query = typeof args.query === 'string' ? args.query.trim() : ''
      const limit = toInt(args.limit, 5)
      if (!query) return { ok: false, reason: 'query_missing' }

      const results = await fetchKnowledgeMatches(query, limit)
      if (!results.length) {
        return {
          ok: false,
          reason: 'no_knowledge_result',
          actionSummary: 'Mình chưa tìm thấy kết quả phù hợp trong AI knowledge.',
        }
      }

      const top = results[0]
      return {
        ok: true,
        action: 'search_ai_knowledge',
        top,
        count: results.length,
        actionSummary: (() => {
          const mappedTop = mapKnowledgeResultToRoute(top)
          const topTitle = shorten(top?.title || '', 90) || 'Kết quả phù hợp'
          const topPath = mappedTop?.path || '/'
          const suggestionText = buildCompactSuggestions(
            results.slice(0, Math.max(1, Math.min(3, limit))).map((item) => {
              const mapped = mapKnowledgeResultToRoute(item)
              return {
                title: item?.title || '',
                path: mapped?.path || '/',
              }
            }),
            2
          )

          return [
            `Đã tra cứu AI knowledge: ${topTitle} (${topPath}).`,
            suggestionText,
          ].filter(Boolean).join(' ')
        })(),
      }
    },
  }

  const executeToolCalls = async (toolCalls = [], context = {}) => {
    const results = []
    const userQuery = typeof context.userQuery === 'string' ? context.userQuery : ''

    for (const call of toolCalls) {
      const name = call?.name
      const args = call?.args || {}

      const handler = handlers[name]

      if (!handler) {
        results.push({ ok: false, reason: 'unknown_tool', name })
        continue
      }

      try {
        const output = await handler(args)
        results.push({ name, ...output })
      } catch (error) {
        results.push({
          ok: false,
          name,
          reason: 'tool_execution_error',
          message: error?.message || 'unknown_error',
        })
      }
    }

    return results
  }

  return {
    executeToolCalls,
  }
}
