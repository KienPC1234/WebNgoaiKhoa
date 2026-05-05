const RAW_SITEMAP = [
  {
    path: '/',
    title: 'Trang chủ',
    aliases: ['trang chủ', 'home', 'tổng quan'],
    keywords: ['ngoại khoá', 'ấn phẩm', 'nhái bén', 'sáng tác'],
    targets: [
      {
        key: 'home-latest-publications',
        label: 'Khu vực Ấn phẩm Nhái Bén',
        aliases: ['ấn phẩm', 'nhái bén', 'card bài viết', 'card trang chủ', 'kế hoạch ngoại khoá hè'],
      },
      {
        key: 'home-creative-board',
        label: 'Bảng tin sáng tác',
        aliases: ['bảng tin sáng tác', 'gửi bài ngay', 'sáng tác'],
      },
    ],
  },
  { path: '/doingu/scale', title: 'Quy mô', aliases: ['quy mô', 'giới thiệu', 'tổ xã hội'], keywords: ['sứ mệnh', 'định hướng'] },
  { path: '/doingu/staff', title: 'Đội ngũ', aliases: ['đội ngũ', 'giáo viên', 'staff'], keywords: ['nhân sự', 'giảng dạy'] },
  { path: '/events/upcoming', title: 'Sự kiện sắp tới', aliases: ['sự kiện', 'lịch sự kiện', 'workshop'], keywords: ['calendar', 'event'] },
  { path: '/stories/inspiring', title: 'Câu chuyện truyền cảm hứng', aliases: ['câu chuyện', 'truyền cảm hứng', 'stories'], keywords: ['story', 'inspiring'] },
  { path: '/doingu/honors', title: 'Vinh danh và giải thưởng', aliases: ['vinh danh', 'giải thưởng', 'honors'], keywords: ['award'] },
  { path: '/phanmon/van', title: 'Phân môn Ngữ văn', aliases: ['văn', 'ngữ văn', 'nhái bén'], keywords: ['ấn phẩm', 'sáng tác'] },
  { path: '/phanmon/ktpl', title: 'Phân môn Kinh tế pháp luật', aliases: ['ktpl', 'kinh tế', 'pháp luật'], keywords: ['law', 'economic'] },
  { path: '/phanmon/lich-su', title: 'Phân môn Lịch sử', aliases: ['lịch sử', 'history'], keywords: ['subject'] },
  { path: '/phanmon/dia-li', title: 'Phân môn Địa lí', aliases: ['địa lí', 'geography'], keywords: ['subject'] },
  { path: '/phanmon/vovinam', title: 'Phân môn Vovinam', aliases: ['vovinam', 'võ thuật'], keywords: ['subject'] },
  { path: '/phanmon/van/cuoc-thi', title: 'Cuộc thi - Ngữ văn', aliases: ['cuộc thi văn', 'cuoc thi van', 'thi văn'], keywords: ['cuộc thi', 'nhái bén'] },
  { path: '/phanmon/ktpl/cuoc-thi', title: 'Cuộc thi - Kinh tế pháp luật', aliases: ['cuộc thi ktpl', 'cuoc thi ktpl', 'thi ktpl'], keywords: ['cuộc thi'] },
  { path: '/phanmon/lich-su/cuoc-thi', title: 'Cuộc thi - Lịch sử', aliases: ['cuộc thi lịch sử', 'cuoc thi lich su', 'thi lịch sử'], keywords: ['cuộc thi', 'lịch sử'] },
  { path: '/phanmon/dia-li/cuoc-thi', title: 'Cuộc thi - Địa lí', aliases: ['cuộc thi địa lí', 'cuoc thi dia li', 'thi địa lí'], keywords: ['cuộc thi', 'địa lí'] },
  { path: '/phanmon/vovinam/cuoc-thi', title: 'Cuộc thi - Vovinam', aliases: ['cuộc thi vovinam', 'cuoc thi vovinam', 'thi vovinam'], keywords: ['cuộc thi', 'vovinam'] },
  { path: '/profile', title: 'Trang cá nhân', aliases: ['profile', 'tài khoản', 'cá nhân'], keywords: ['account'] },
  { path: '/login', title: 'Đăng nhập', aliases: ['đăng nhập', 'login'], keywords: ['auth'] },
  { path: '/register', title: 'Đăng ký', aliases: ['đăng ký', 'register'], keywords: ['auth'] },
  { path: '/admin/dashboard', title: 'Admin dashboard', aliases: ['admin', 'quản trị', 'dashboard'], keywords: ['cms'] },
]

const STOP_WORDS = new Set([
  'chi', 'chi?', 'cho', 'toi', 'toi?', 'toi.', 'o', 'ở', 'tren', 'trên', 'giup', 'giúp', 'minh', 'mình',
  'la', 'là', 'voi', 'với', 'va', 'và', 'the', 'thể', 'nao', 'nào', 'duoc', 'được', 'hay',
])

const normalize = (text = '') =>
  text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const normalizeForSearch = (text = '') =>
  normalize(text)
    .replace(/\bchu kien\b/g, 'su kien')
    .replace(/\bch(u|u )? kien\b/g, 'su kien')

export const AI_SITEMAP = RAW_SITEMAP.map((item) => ({
  ...item,
  normalizedPath: normalize(item.path),
  normalizedTitle: normalize(item.title),
  normalizedAliases: (item.aliases || []).map(normalize),
  normalizedKeywords: (item.keywords || []).map(normalize),
  normalizedTargets: (item.targets || []).map((target) => ({
    ...target,
    normalizedLabel: normalize(target.label),
    normalizedAliases: (target.aliases || []).map(normalize),
  })),
}))

const DYNAMIC_ROUTE_PATTERNS = [
  /^\/posts\/\d+$/,
  /^\/stories\/inspiring\/\d+$/,
  /^\/phanmon\/[^/]+\/[^/]+$/,
]

const normalizeRouteCandidate = (path = '') => {
  const raw = String(path || '').trim()
  if (!raw) return { full: '', pathname: '' }

  try {
    const parsed = raw.startsWith('http://') || raw.startsWith('https://')
      ? new URL(raw)
      : new URL(raw, 'https://ngoaikhoa.fptoj.com')
    return {
      full: `${parsed.pathname}${parsed.search || ''}`,
      pathname: parsed.pathname,
    }
  } catch {
    return {
      full: raw,
      pathname: raw.split('?')[0] || raw,
    }
  }
}

export const isWhitelistedPath = (path = '') => {
  const candidate = normalizeRouteCandidate(path)
  const normalizedPath = normalize(candidate.pathname)

  if (AI_SITEMAP.some((item) => item.normalizedPath === normalizedPath)) {
    return true
  }

  return DYNAMIC_ROUTE_PATTERNS.some((pattern) => pattern.test(candidate.pathname))
}

export const searchSitemap = (query = '', limit = 5) => {
  const normalizedQuery = normalizeForSearch(query)
  if (!normalizedQuery) return []

  const tokens = normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !STOP_WORDS.has(token))

  const asksForPosition = /vi tri|vị trí|card|section|muc|mục|o dau|ở đâu/.test(normalizedQuery)
  const asksForHome = /trang chu|trang chủ|home/.test(normalizedQuery)

  const scored = AI_SITEMAP.map((item) => {
    let score = 0
    let bestTarget = null
    let bestTargetScore = 0

    if (item.normalizedPath === normalizedQuery) score += 100
    if (item.normalizedTitle.includes(normalizedQuery)) score += 70

    if (item.normalizedAliases.some((alias) => alias.includes(normalizedQuery))) score += 85
    if (item.normalizedKeywords.some((keyword) => keyword.includes(normalizedQuery))) score += 45

    for (const token of tokens) {
      if (item.normalizedTitle.includes(token)) score += 7
      if (item.normalizedAliases.some((alias) => alias.includes(token))) score += 9
      if (item.normalizedKeywords.some((keyword) => keyword.includes(token))) score += 4
    }

    if (asksForHome && item.path === '/') score += 55
    if (asksForPosition && item.path === '/') score += 32

    for (const target of item.normalizedTargets) {
      let targetScore = 0
      if (target.normalizedLabel.includes(normalizedQuery)) targetScore += 95
      if (target.normalizedAliases.some((alias) => alias.includes(normalizedQuery))) targetScore += 90

      for (const token of tokens) {
        if (target.normalizedLabel.includes(token)) targetScore += 11
        if (target.normalizedAliases.some((alias) => alias.includes(token))) targetScore += 13
      }

      if (targetScore > bestTargetScore) {
        bestTargetScore = targetScore
        bestTarget = target
      }
    }

    score += Math.floor(bestTargetScore * 0.6)

    return {
      path: item.path,
      title: item.title,
      score,
      target: bestTarget?.key || null,
      targetLabel: bestTarget?.label || null,
    }
  })

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, limit))
}
