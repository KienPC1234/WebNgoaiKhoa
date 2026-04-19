import fs from 'node:fs/promises'
import path from 'node:path'
import { parse } from '@babel/parser'

const ROOT = process.cwd()
const PAGES_DIR = path.join(ROOT, 'src', 'pages')
const OUTPUT_PATH = path.join(ROOT, 'src', 'lib', 'ai-navigation', 'publicElementIndex.generated.json')

const ROUTE_BY_PAGE = {
  Home: '/',
  NhanVatScale: '/doingu/scale',
  NhanVatStaff: '/doingu/staff',
  EventsUpcoming: '/events/upcoming',
  StoriesInspiring: '/stories/inspiring',
  HonorsYearly: '/doingu/honors',
  PhanMonVan: '/phanmon/van',
  PhanMonKTPL: '/phanmon/ktpl',
  PhanMonLichSu: '/phanmon/lich-su',
  PhanMonDiaLi: '/phanmon/dia-li',
  PhanMonVovinam: '/phanmon/vovinam',
  Profile: '/profile',
  Login: '/login',
  Register: '/register',
}

const KNOWN_TAB_HINTS = [
  {
    route: '/phanmon/van?tab=sang-tac',
    kind: 'label',
    text: 'Họ và tên tác giả',
    source: 'manual-tab-hint',
  },
  {
    route: '/phanmon/van?tab=sang-tac',
    kind: 'label',
    text: 'Ho va Ten Tac Gia',
    source: 'manual-tab-hint',
  },
  {
    route: '/phanmon/van?tab=sang-tac',
    kind: 'label',
    text: 'Tên tác phẩm',
    source: 'manual-tab-hint',
  },
  {
    route: '/phanmon/van?tab=sang-tac',
    kind: 'label',
    text: 'Nội dung sáng tác',
    source: 'manual-tab-hint',
    priority: 20,
  },
  {
    route: '/phanmon/van?tab=sang-tac',
    kind: 'button',
    text: 'GỬI BÀI THI',
    source: 'manual-tab-hint',
  },
  {
    route: '/phanmon/van?tab=sang-tac',
    kind: 'button',
    text: 'Nộp bài dự thi',
    source: 'manual-tab-hint',
  },
]

const CODEY_TOKENS = [
  'classname',
  'onclick',
  'onchange',
  'setstate',
  'window.',
  'localstorage',
  '=>',
  'const ',
  'return ',
  'map(',
  'history.pushstate',
]

const cleanText = (input = '') =>
  String(input || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const looksLikeCode = (text = '') => {
  const normalized = String(text || '').toLowerCase()
  if (!normalized) return false
  if (/[{};$`]/.test(normalized)) return true
  if (CODEY_TOKENS.some((token) => normalized.includes(token))) return true
  return false
}

const shouldKeepText = (text = '') => {
  if (!text) return false
  if (text.length < 4) return false
  if (/^[0-9\W_]+$/.test(text)) return false
  if (looksLikeCode(text)) return false
  return true
}

const readPageFiles = async (dirPath) => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      if (entry.name === 'Admin') continue
      const nested = await readPageFiles(fullPath)
      files.push(...nested)
      continue
    }

    if (entry.isFile() && /\.(jsx|tsx)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }

  return files
}

const extractFromJSXAttributeValue = (valueNode) => {
  if (!valueNode) return ''
  if (valueNode.type === 'StringLiteral') return valueNode.value || ''
  if (valueNode.type === 'JSXExpressionContainer') {
    const expr = valueNode.expression
    if (!expr) return ''
    if (expr.type === 'StringLiteral') return expr.value || ''
    if (expr.type === 'TemplateLiteral' && expr.expressions.length === 0) {
      return expr.quasis.map((q) => q.value.cooked).join('')
    }
  }
  return ''
}

const walkNode = (node, collect) => {
  if (!node || typeof node !== 'object') return

  if (node.type === 'JSXElement') {
    const opening = node.openingElement
    const nameNode = opening.name
    let tagName = null
    if (nameNode.type === 'JSXIdentifier') tagName = nameNode.name
    else if (nameNode.type === 'JSXMemberExpression') {
      // e.g. Layout.Section — use last identifier
      let curr = nameNode
      while (curr && curr.type === 'JSXMemberExpression') {
        curr = curr.property
      }
      if (curr && curr.type === 'JSXIdentifier') tagName = curr.name
    }

    const kind = (tagName || '').toLowerCase()
    const attributes = {}
    for (const attr of opening.attributes || []) {
      if (attr.type !== 'JSXAttribute') continue
      const key = attr.name && attr.name.name
      const val = extractFromJSXAttributeValue(attr.value)
      if (key && val) attributes[key] = val
    }

    // collect textual content from children
    const texts = []
    for (const child of node.children || []) {
      if (!child) continue
      if (child.type === 'JSXText') {
        if (child.value && child.value.trim()) texts.push(child.value)
      } else if (child.type === 'JSXExpressionContainer') {
        const expr = child.expression
        if (expr && expr.type === 'StringLiteral') texts.push(expr.value)
        else if (expr && expr.type === 'TemplateLiteral' && expr.expressions.length === 0) {
          texts.push(expr.quasis.map((q) => q.value.cooked).join(''))
        }
      }
    }

    // prefer explicit attribute labels before children
    const candidatePhrases = []
    const preferAttrs = ['data-ai-card-title', 'data-ai-anchor', 'aria-label', 'placeholder', 'title', 'alt']
    for (const k of preferAttrs) {
      if (attributes[k]) candidatePhrases.push(attributes[k])
    }
    candidatePhrases.push(...texts)

    const combined = candidatePhrases.map(cleanText).filter(Boolean).join(' ').trim()
    const anchor = attributes['data-ai-anchor'] || attributes.id || ''

    if (combined && shouldKeepText(combined)) {
      collect.push({ tagName, kind: tagName, text: combined, anchor, attrs: attributes, loc: node.loc })
    }
  }

  // recurse
  for (const key of Object.keys(node)) {
    const child = node[key]
    if (Array.isArray(child)) {
      for (const item of child) walkNode(item, collect)
    } else if (child && typeof child === 'object') {
      walkNode(child, collect)
    }
  }
}

const dedupeEntries = (entries) => {
  const seen = new Set()
  const deduped = []

  for (const item of entries) {
    const key = `${item.route}::${(item.kind||'') }::${item.text.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(item)
  }

  return deduped
}

const generate = async () => {
  const pageFiles = await readPageFiles(PAGES_DIR)
  const discovered = []

  for (const filePath of pageFiles) {
    const source = await fs.readFile(filePath, 'utf-8')
    const name = path.basename(filePath).replace(/\.(jsx|tsx)$/i, '')
    const route = ROUTE_BY_PAGE[name]
    if (!route) continue

    let ast
    try {
      ast = parse(source, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy'],
      })
    } catch (err) {
      // fallback: skip parsing errors
      // console.error('parse error', filePath, err)
      continue
    }

    const collect = []
    walkNode(ast, collect)

    for (const item of collect) {
      discovered.push({
        route,
        kind: item.kind || 'text',
        text: item.text,
        source: path.relative(ROOT, filePath),
        anchor: item.anchor || null,
        componentPath: path.relative(ROOT, filePath),
        line: item.loc && item.loc.start ? item.loc.start.line : null,
      })
    }
  }

  const combined = dedupeEntries([...KNOWN_TAB_HINTS, ...discovered])

  const payload = {
    generatedAt: new Date().toISOString(),
    version: 2,
    total: combined.length,
    elements: combined,
  }

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')

  console.log(`[ai-index] generated ${combined.length} indexed public elements`)
}

generate().catch((error) => {
  console.error('[ai-index] failed:', error)
  process.exit(1)
})
