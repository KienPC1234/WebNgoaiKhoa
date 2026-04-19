import indexData from '@/lib/ai-navigation/publicElementIndex.generated.json'

const normalize = (text = '') =>
  String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\bnop\b/g, 'gui')
    .replace(/\bdu\s+thi\b/g, 'bai thi')
    .replace(/\s+/g, ' ')
    .trim()

const scoreText = (candidate = '', query = '') => {
  const c = normalize(candidate)
  const q = normalize(query)
  if (!c || !q) return 0
  let score = 0

  // exact match should be heavily prioritized
  if (c === q) {
    score += 260
    return score
  }

  // substring match is good but weaker than exact
  if (c.includes(q)) score += 140

  const tokens = Array.from(new Set(q.split(' ').filter((token) => token.length >= 2)))
  let matchedTokens = 0
  for (const token of tokens) {
    if (c.includes(token)) {
      matchedTokens += 1
      score += 12
    }
  }

  if (tokens.length > 0) {
    const coverage = matchedTokens / tokens.length
    score += Math.round(coverage * 30)
    if (matchedTokens >= 3) score += 10
  }

  return score
}

const isCodeLikeText = (value = '') => {
  const text = String(value || '').toLowerCase()
  if (!text) return true
  if (/[{};$`]/.test(text)) return true
  if (text.includes('classname') || text.includes('onclick') || text.includes('=>') || text.includes('window.')) {
    return true
  }
  return false
}

const preprocessHintPhrase = (value = '') => {
  const source = String(value || '').trim()
  if (!source) return ''

  const firstLine = source.split('\n').map((line) => line.trim()).find(Boolean) || source
  const normalized = normalize(firstLine)
    .replace(/^(danh dau|khoanh vien|highlight|lam noi bat|chi cho toi|tim|tim giup|minh can|minh muon)\s+/g, '')
    .trim()

  const headingMatch = normalized.match(/(?:tieu de|heading)\s+(.{2,120})$/)
  if (headingMatch?.[1]) return headingMatch[1].trim()
  return normalized
}

export const normalizeCurrentRoute = () => `${window.location.pathname}${window.location.search || ''}`

const isRouteCompatible = (hintRoute = '', currentRoute = '') => {
  if (!hintRoute || !currentRoute) return false
  if (hintRoute === currentRoute) return true
  if (currentRoute.startsWith(hintRoute)) return true

  const hintPath = hintRoute.split('?')[0]
  const currentPath = currentRoute.split('?')[0]
  return hintPath === currentPath
}

export const findBestElementHint = (phrase = '', currentRoute = '') => {
  const elements = Array.isArray(indexData?.elements) ? indexData.elements : []
  if (!elements.length) return null

  const query = preprocessHintPhrase(phrase)
  if (!query) return null

  // Build augmented list including composed entries (adjacent text nodes merged)
  const generateComposedEntries = (items) => {
    const composed = []
    const groups = new Map()

    items.forEach((it, idx) => {
      const key = `${it.route}||${it.componentPath || ''}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push({ ...it, __idx: idx })
    })

    for (const [, group] of groups) {
      group.sort((a, b) => {
        const la = Number.isFinite(a.line) ? a.line : a.__idx
        const lb = Number.isFinite(b.line) ? b.line : b.__idx
        return la - lb
      })

      for (let i = 0; i < group.length; i++) {
        // combine up to 3 adjacent items
        for (let len = 2; len <= 3; len++) {
          if (i + len > group.length) break
          const slice = group.slice(i, i + len)
          const texts = slice.map((s) => String(s.text || '').trim()).filter(Boolean)
          if (texts.length < 2) continue
          const combinedText = texts.join(' ')
          if (combinedText.length > 180) continue

          // line proximity check when available
          const firstLine = slice[0].line
          const lastLine = slice[slice.length - 1].line
          if (Number.isFinite(firstLine) && Number.isFinite(lastLine) && Math.abs(lastLine - firstLine) > 8) continue

          // avoid code-like combinations
          if (isCodeLikeText(combinedText)) continue

          composed.push({
            route: slice[0].route,
            kind: slice[0].kind || 'heading',
            text: combinedText,
            source: 'composed',
            componentPath: slice[0].componentPath,
            line: Number.isFinite(slice[0].line) ? slice[0].line : null,
            composedParts: texts,
            priority: Math.max(...slice.map((s) => (typeof s.priority === 'number' ? s.priority : 0))) + 10,
          })
        }
      }
    }

    return composed
  }

  const augmented = [...elements, ...generateComposedEntries(elements)]

  let best = null
  let bestScore = 0

  for (const item of augmented) {
    if (isCodeLikeText(item?.text || '')) continue
    const itemTextNorm = normalize(item.text || '')

    // If item text exactly matches query and routes are compatible, return immediately
    if (itemTextNorm && itemTextNorm === normalize(query) && isRouteCompatible(item.route || '', currentRoute)) {
      return item
    }

    const routeBoost = isRouteCompatible(item.route || '', currentRoute) ? 40 : 0
    const sourceBoost = item.source === 'manual-tab-hint' ? 60 : 0
    const itemPriority = typeof item.priority === 'number' ? item.priority : 0

    const score = scoreText(item.text, query) + routeBoost + sourceBoost + itemPriority
    if (score > bestScore) {
      bestScore = score
      best = item
    }
  }

  // If we didn't find a good indexed match, fallback to runtime heading detection
  if (bestScore < 45) {
    try {
      const q = normalize(query)
      if (typeof window !== 'undefined' && (q.includes('tieu') || q.includes('title') || q.includes('heading'))) {
        const heading = document.querySelector('h1,h2,h3,h4')
        if (heading && heading.textContent && heading.textContent.trim()) {
          return {
            route: normalizeCurrentRoute(),
            kind: 'heading',
            text: heading.textContent.trim(),
            source: 'runtime-heading-fallback',
          }
        }
      }
    } catch (e) {
      // ignore
    }
    return null
  }
  return best
}

const findLabelByText = (text = '') => {
  const normalized = normalize(text)
  const labels = Array.from(document.querySelectorAll('label'))

  let best = null
  let bestScore = 0
  for (const label of labels) {
    const score = scoreText(label.textContent || '', normalized)
    if (score > bestScore) {
      bestScore = score
      best = label
    }
  }

  return bestScore >= 40 ? best : null
}

const resolveFieldFromLabel = (label) => {
  if (!label) return null

  const htmlFor = label.getAttribute('for')
  if (htmlFor) {
    const byFor = document.getElementById(htmlFor)
    if (byFor) return byFor
  }

  const wrapper = label.closest('div,section,article,form')
  if (!wrapper) return label

  return wrapper.querySelector('input,textarea,select,button,[role="button"]') || label
}

export const resolveElementFromHint = (hint) => {
  if (!hint || typeof hint !== 'object') return null

  if (hint.kind === 'label') {
    const label = findLabelByText(hint.text)
    return resolveFieldFromLabel(label)
  }

  const selectorsByKind = {
    heading: 'h1,h2,h3,h4',
    button: 'button,[role="button"],a',
  }

  const selector = selectorsByKind[hint.kind] || 'h1,h2,h3,h4,p,span,label,button,a'
  const nodes = Array.from(document.querySelectorAll(selector))

  let best = null
  let bestScore = 0
  for (const node of nodes) {
    const score = scoreText(node.textContent || '', hint.text || '')
    if (score > bestScore) {
      bestScore = score
      best = node
    }
  }

  return bestScore >= 40 ? best : null
}
