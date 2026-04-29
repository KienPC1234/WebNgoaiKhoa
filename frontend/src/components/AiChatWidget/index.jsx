import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Send, X, Bot, Sparkles, Trash2, Maximize2, Minimize2, Square, ArrowDown, User, Zap } from 'lucide-react'
import { Card } from '@/components/ui/core'
import { cn } from '@/lib/utils'
import { createAiActionEngine } from '@/lib/ai-navigation/actionEngine'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const CHAT_STORAGE_KEY = 'fpt_edu_ai_chat_history'
const CHAT_OPEN_STORAGE_KEY = 'fpt_edu_ai_chat_open'
const CHAT_MIN_STORAGE_KEY = 'fpt_edu_ai_chat_minimized'
const MAX_MESSAGES = 15
const MAX_SERVER_HISTORY_MESSAGES = 8
const STREAM_UI_THROTTLE_MS = 45

const TABLE_SEPARATOR_CELL_REGEX = /^:?-{3,}:?$/
const HTML_BREAK_REGEX = /<br\s*\/?\s*>/gi

const normalizeMarkdownText = (value = '') =>
  String(value)
    .replace(HTML_BREAK_REGEX, '\n')
    .replace(/&nbsp;/gi, ' ')
    .trim()

// Replace bare internal paths like /phanmon/van?tab=the-le with markdown links
const linkifyInternalPaths = (line = '') => {
  if (!line || typeof line !== 'string') return line

  // Handle HTML-escaped code tags: &lt;code&gt;/path&lt;/code&gt;
  line = line.replace(/&lt;code&gt;((?:\/|\.\.|\.\/|\?|#)[^&<\s`]+)&lt;\/code&gt;/gi, (_, p) => `[${p}](${p})`)

  // Handle raw HTML code tags: <code>/path</code>
  line = line.replace(/<code>((?:\/|\.\.|\.\/|\?|#)[^<\s`]+)<\/code>/gi, (_, p) => `[${p}](${p})`)

  // General replacement for bare paths preceded by start or whitespace or '(' or '>' (covers cases after tags and parentheses)
  return line.replace(/(^|[\s(>])(\/(?:[^\s`<>\)\]]+))/g, (m, prefix, path) => {
    let trailing = ''
    if (/[.,;:!?]$/.test(path)) {
      trailing = path.slice(-1)
      path = path.slice(0, -1)
    }
    return `${prefix}[${path}](${path})${trailing}`
  })
}

const splitTableCells = (line = '') => {
  const normalized = String(line).trim().replace(/^\|/, '').replace(/\|$/, '')
  if (!normalized.length) return []
  return normalized.split('|').map((cell) => cell.trim())
}

const parseTableBlock = (lines, startIndex) => {
  if (startIndex + 1 >= lines.length) return null

  const headerLine = lines[startIndex]
  const separatorLine = lines[startIndex + 1]

  if (!headerLine.includes('|') || !separatorLine.includes('|')) return null

  const headerCells = splitTableCells(headerLine)
  const separatorCells = splitTableCells(separatorLine)
  if (!headerCells.length || headerCells.length !== separatorCells.length) return null

  const separatorValid = separatorCells.every((cell) => TABLE_SEPARATOR_CELL_REGEX.test(cell))
  if (!separatorValid) return null

  const alignments = separatorCells.map((cell) => {
    const trimmed = cell.trim()
    if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center'
    if (trimmed.endsWith(':')) return 'right'
    if (trimmed.startsWith(':')) return 'left'
    return 'left'
  })

  const rows = []
  let index = startIndex + 2

  while (index < lines.length) {
    const current = lines[index]
    if (!current.trim() || !current.includes('|')) break

    const rowCells = splitTableCells(current)
    if (!rowCells.length) break
    rows.push(rowCells)
    index += 1
  }

  return {
    segment: {
      type: 'table',
      header: headerCells,
      alignments,
      rows,
    },
    nextIndex: index,
  }
}

const parseTabSeparatedBlock = (lines, startIndex) => {
  const rows = []
  let index = startIndex

  while (index < lines.length) {
    const current = lines[index]
    if (!current.trim() || !current.includes('\t')) break

    const rowCells = current.split(/\t+/).map((cell) => cell.trim())
    if (rowCells.length < 2) break
    rows.push(rowCells)
    index += 1
  }

  if (rows.length < 2) return null

  const columnCount = Math.max(...rows.map((row) => row.length))

  return {
    segment: {
      type: 'table',
      header: null,
      alignments: Array.from({ length: columnCount }, () => 'left'),
      rows,
    },
    nextIndex: index,
  }
}

const parseMarkdownSegments = (content = '') => {
  const lines = String(content).replace(/\r\n/g, '\n').split('\n')
  const segments = []
  const mdBuffer = []
  let insideFence = false

  const flushMarkdown = () => {
    const markdown = mdBuffer.join('\n').trim()
    if (markdown.length > 0) segments.push({ type: 'markdown', content: markdown })
    mdBuffer.length = 0
  }

  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (line.trim().startsWith('```')) {
      insideFence = !insideFence
      mdBuffer.push(line)
      index += 1
      continue
    }

    if (!insideFence) {
      const tableBlock = parseTableBlock(lines, index)
      if (tableBlock) {
        flushMarkdown()
        segments.push(tableBlock.segment)
        index = tableBlock.nextIndex
        continue
      }

      const tabSeparatedBlock = parseTabSeparatedBlock(lines, index)
      if (tabSeparatedBlock) {
        flushMarkdown()
        segments.push(tabSeparatedBlock.segment)
        index = tabSeparatedBlock.nextIndex
        continue
      }
    }

    mdBuffer.push(!insideFence ? linkifyInternalPaths(line) : line)
    index += 1
  }

  flushMarkdown()
  return segments
}

const INTERNAL_LINK_PREFIXES = ['/', '?', '#', './', '../']

const isInternalHref = (href = '') => {
  const value = String(href).trim()
  if (!value) return false

  if (INTERNAL_LINK_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    return true
  }

  if (typeof window === 'undefined') return false

  try {
    const url = new URL(value, window.location.origin)
    return url.origin === window.location.origin && (url.protocol === 'http:' || url.protocol === 'https:')
  } catch {
    return false
  }
}

const toInternalRoute = (href = '') => {
  const value = String(href).trim()
  if (!value) return '/'

  if (INTERNAL_LINK_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    return value
  }

  if (typeof window === 'undefined') return value

  try {
    const url = new URL(value, window.location.origin)
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return value
  }
}

const createMarkdownComponents = (navigate) => ({
  a: ({ href, children, ...props }) => {
    const value = String(href || '').trim()
    const isInternal = isInternalHref(value)

    const handleClick = (event) => {
      if (!isInternal) return
      if (event.defaultPrevented) return
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      navigate(toInternalRoute(value))
    }

    return (
      <a
        {...props}
        href={value || '#'}
        onClick={handleClick}
        className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 transition-colors hover:text-blue-900"
        target={isInternal ? undefined : '_blank'}
        rel={isInternal ? undefined : 'noopener noreferrer'}
      >
        {children}
      </a>
    )
  },
  strong: ({ children, ...props }) => {
    const singleText = Array.isArray(children) && children.length === 1 && typeof children[0] === 'string' ? children[0] : null
    if (singleText) {
      const value = String(singleText).trim()
      if (isInternalHref(value)) {
        const handleClick = (event) => {
          if (event.defaultPrevented) return
          if (event.button !== 0) return
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          navigate(toInternalRoute(value))
        }

        return (
          <strong {...props}>
            <a
              href={value || '#'}
              onClick={handleClick}
              className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 transition-colors hover:text-blue-900"
            >
              {value}
            </a>
          </strong>
        )
      }
    }
    return <strong {...props}>{children}</strong>
  },
  em: ({ children, ...props }) => {
    const singleText = Array.isArray(children) && children.length === 1 && typeof children[0] === 'string' ? children[0] : null
    if (singleText) {
      const value = String(singleText).trim()
      if (isInternalHref(value)) {
        const handleClick = (event) => {
          if (event.defaultPrevented) return
          if (event.button !== 0) return
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          navigate(toInternalRoute(value))
        }

        return (
          <em {...props}>
            <a
              href={value || '#'}
              onClick={handleClick}
              className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 transition-colors hover:text-blue-900"
            >
              {value}
            </a>
          </em>
        )
      }
    }
    return <em {...props}>{children}</em>
  },
  ul: ({ ...props }) => <ul {...props} className="list-disc pl-5" />,
  ol: ({ ...props }) => <ol {...props} className="list-decimal pl-5" />,
  code: ({ inline, className, children, ...props }) => {
    const raw = Array.isArray(children) ? children.join('') : String(children ?? '')
    const text = String(raw).replace(/\n/g, '').trim()

    // If the code content is a single internal path, render it as a clickable internal link
    if (text && isInternalHref(text)) {
      const value = text
      const handleClick = (event) => {
        if (event.defaultPrevented) return
        if (event.button !== 0) return
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        navigate(toInternalRoute(value))
      }

      return (
        <a
          {...props}
          href={value || '#'}
          onClick={handleClick}
          className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 transition-colors hover:text-blue-900"
        >
          {value}
        </a>
      )
    }

    return inline ? (
      <code {...props} className={cn('rounded bg-slate-100/90 px-1.5 py-0.5 text-[0.92em] font-semibold text-slate-700', className)}>
        {children}
      </code>
    ) : (
      <code {...props} className={cn('block rounded-xl bg-slate-900/95 p-3 text-[0.92em] text-slate-100', className)}>
        {children}
      </code>
    )
  },
})

const MarkdownTable = ({ header = [], rows = [], alignments = [], markdownComponents, isMobile = false }) => {
  const [expanded, setExpanded] = useState(false)

  if (isMobile && !expanded) {
    const cols = (header && header.length) || (rows && rows[0] && rows[0].length) || 0
    return (
      <div className="ai-chat-table-wrap">
        <div className="p-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Bảng — {cols} cột</div>
            <button onClick={() => setExpanded(true)} className="text-sm font-bold text-blue-600">Xem</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ai-chat-table-wrap">
      <table className="ai-chat-table">
              {Array.isArray(header) && header.length > 0 && (
          <thead>
            <tr>
              {header.map((cell, index) => (
                <th key={`h-${index}`} style={{ textAlign: alignments[index] || 'left' }}>
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={markdownComponents}
                  >
                          {normalizeMarkdownText(linkifyInternalPaths(cell))}
                  </ReactMarkdown>
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`r-${rowIndex}`}>
              {(Array.isArray(header) && header.length > 0 ? header : row).map((_, colIndex) => (
                <td key={`c-${rowIndex}-${colIndex}`} style={{ textAlign: alignments[colIndex] || 'left' }}>
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={markdownComponents}
                  >
                          {normalizeMarkdownText(linkifyInternalPaths(row[colIndex] ?? ''))}
                  </ReactMarkdown>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const MarkdownMessage = ({ content, role, navigate, isMobile = false }) => {
  const segments = useMemo(() => parseMarkdownSegments(content), [content])
  const markdownComponents = useMemo(() => createMarkdownComponents(navigate), [navigate])

  return (
    <div className={cn('ai-chat-markdown break-words', role === 'user' ? 'ai-chat-markdown-user' : 'ai-chat-markdown-assistant')}>
      {segments.map((segment, index) => {
        if (segment.type === 'table') {
          return <MarkdownTable key={`table-${index}`} header={segment.header} rows={segment.rows} alignments={segment.alignments} markdownComponents={markdownComponents} isMobile={isMobile} />
        }

        return (
          <ReactMarkdown
            key={`md-${index}`}
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={markdownComponents}
          >
            {normalizeMarkdownText(segment.content)}
          </ReactMarkdown>
        )
      })}
    </div>
  )
}

const DEFAULT_WELCOME = { 
  role: 'assistant', 
  content: 'Chào bạn! Tôi là trợ lý AI của **Tổ xã hội**. Tôi có thể giúp bạn tìm hiểu về các hoạt động ngoại khóa, hướng dẫn gửi bài cho ấn phẩm **Nhái Bén**, hoặc giải đáp các thắc mắc về câu lạc bộ.' 
}

const TOOL_REASON_MESSAGES = {
  path_not_whitelisted: 'Mình không thể mở trang ngoài phạm vi website đã cho phép.',
  target_not_found: 'Mình chưa tìm thấy đúng phần tử trên trang để cuộn hoặc làm nổi bật.',
  target_missing: 'Yêu cầu thao tác chưa có vị trí cụ thể.',
  no_result: 'Mình chưa tìm thấy nội dung phù hợp trong sitemap.',
  no_knowledge_result: 'Mình chưa tìm thấy nội dung phù hợp trong AI knowledge.',
  query_missing: 'Yêu cầu tìm kiếm chưa có từ khóa cụ thể.',
}

const buildActionFeedback = (results = []) => {
  if (!Array.isArray(results) || results.length === 0) return ''

  const successSummaries = results
    .filter((item) => item?.ok && typeof item?.actionSummary === 'string' && item.actionSummary.trim().length > 0)
    .map((item) => item.actionSummary.trim())

  if (successSummaries.length > 0) {
    return successSummaries.slice(0, 2).join(' ')
  }

  const firstFailure = results.find((item) => item?.ok === false)
  if (!firstFailure) return ''

  return TOOL_REASON_MESSAGES[firstFailure.reason] || 'Mình đã thử thao tác nhưng chưa hoàn tất được. Bạn nói rõ thêm một chút nhé.'
}

const hasTextContent = (value) => typeof value === 'string' && value.trim().length > 0

const dropEmptyAssistantMessages = (items = []) =>
  items.filter((msg) => !(msg?.role === 'assistant' && !hasTextContent(msg?.content)))

export const AiChatWidget = ({ pendingOpen = false, onPendingOpenHandled }) => {
  const navigate = useNavigate()
  const actionEngine = useMemo(() => createAiActionEngine({ navigate }), [navigate])
  const location = useLocation()
  const prevPathRef = useRef(location?.pathname || '')
  const [isOpen, setIsOpen] = useState(() => localStorage.getItem(CHAT_OPEN_STORAGE_KEY) === '1')
  const [isMinimized, setIsMinimized] = useState(() => localStorage.getItem(CHAT_MIN_STORAGE_KEY) === '1')
  const [input, setInput] = useState('')
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches)
  
  // Load initial messages from localStorage
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {
      console.warn('Failed to load chat history:', e)
    }
    return [DEFAULT_WELCOME]
  })

  // Persistence effect
  useEffect(() => {
    const limitedMessages = dropEmptyAssistantMessages(messages).slice(-MAX_MESSAGES)
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(limitedMessages))
  }, [messages])

  const visibleMessages = useMemo(
    () => dropEmptyAssistantMessages(messages),
    [messages]
  )

  useEffect(() => {
    localStorage.setItem(CHAT_OPEN_STORAGE_KEY, isOpen ? '1' : '0')
  }, [isOpen])

  useEffect(() => {
    localStorage.setItem(CHAT_MIN_STORAGE_KEY, isMinimized ? '1' : '0')
  }, [isMinimized])

  const [isTyping, setIsTyping] = useState(false)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const [abortController, setAbortController] = useState(null)
  const scrollRef = useRef(null)
  const scrollRafRef = useRef(0)
  const floatingBottom = 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)'

  const isFullscreen = isMobile && !isMinimized

  const quickSuggestions = [
    "Thể lệ Nhái Bén là gì?",
    "Gửi bài dự thi nhái bén"
  ]

  useEffect(() => {
    const handleToggle = () => setIsOpen(true)
    window.addEventListener('toggle-ai-chat', handleToggle)
    return () => window.removeEventListener('toggle-ai-chat', handleToggle)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const m = window.matchMedia('(max-width: 640px)')
    const handleChange = (e) => setIsMobile(e?.matches ?? m.matches)
    try {
      m.addEventListener('change', handleChange)
    } catch {
      m.addListener(handleChange)
    }
    // initial set
    setIsMobile(m.matches)
    return () => {
      try {
        m.removeEventListener('change', handleChange)
      } catch {
        m.removeListener(handleChange)
      }
    }
  }, [])

  useEffect(() => {
    // Auto-minimize chat on mobile when route changes
    if (!isMobile) {
      prevPathRef.current = location?.pathname || ''
      return
    }
    const prev = prevPathRef.current || ''
    const curr = location?.pathname || ''
    if (prev && prev !== curr && isOpen && !isMinimized) {
      setIsMinimized(true)
    }
    prevPathRef.current = curr
  }, [location?.pathname, isMobile, isOpen, isMinimized])

  useEffect(() => {
    if (!pendingOpen) return
    setIsOpen(true)
    setIsMinimized(false)
    onPendingOpenHandled?.()
  }, [pendingOpen, onPendingOpenHandled])

  useEffect(() => {
    return () => {
      if (scrollRafRef.current) {
        window.cancelAnimationFrame(scrollRafRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current && !showScrollDown) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [messages, isTyping, showScrollDown])

  // Mark global presence so pages can avoid double-mounting the widget
  useEffect(() => {
    try {
      window.__AI_WIDGET_PRESENT = true
    } catch (e) {}
    return () => {
      try {
        delete window.__AI_WIDGET_PRESENT
      } catch (e) {}
    }
  }, [])

  const handleScroll = () => {
    if (!scrollRef.current || scrollRafRef.current) return

    scrollRafRef.current = window.requestAnimationFrame(() => {
      if (!scrollRef.current) {
        scrollRafRef.current = 0
        return
      }

      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
      setShowScrollDown(!isAtBottom)
      scrollRafRef.current = 0
    })
  }

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth'
    })
  }

  const clearChat = () => {
    if (abortController) abortController.abort()
    const resetState = [DEFAULT_WELCOME]
    setMessages(resetState)
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(resetState))
    setIsTyping(false)
  }

  const handleStop = () => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      setIsTyping(false)
    }
  }

  const handleSend = async (text = input) => {
    const messageToSend = text.trim()
    if (!messageToSend) return

    const recentServerHistory = dropEmptyAssistantMessages(messages)
      .filter((item) => item?.role === 'user' || item?.role === 'assistant')
      .slice(-MAX_SERVER_HISTORY_MESSAGES)
      .map((item) => ({
        role: item.role,
        content: String(item.content || '').trim().slice(0, 1200),
      }))
      .filter((item) => item.content.length > 0)

    if (abortController) abortController.abort()
    const controller = new AbortController()
    setAbortController(controller)

    const userMessage = { role: 'user', content: messageToSend }
    setMessages(prev => [...prev.slice(-(MAX_MESSAGES - 1)), userMessage])
    setInput('')
    setIsTyping(true)
    setShowScrollDown(false)

    try {
      const response = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: messageToSend,
          history: recentServerHistory,
          model: "gpt-oss:120b-cloud",
          enable_tools: true,
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `HTTP ${response.status}`)
      }

      if (!response.body) throw new Error('Không nhận được phản hồi từ server')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      let rawBuffer = ''
      let toolCalls = []
      let lastUiUpdateAt = 0

      const applyAssistantContent = (force = false) => {
        const now = Date.now()
        if (!force && now - lastUiUpdateAt < STREAM_UI_THROTTLE_MS) return
        lastUiUpdateAt = now

        setMessages(prev => {
          if (!prev.length) return prev
          const newMessages = [...prev]
          newMessages[newMessages.length - 1] = { role: 'assistant', content: assistantContent }
          return newMessages
        })
      }
      
      setMessages(prev => [...prev.slice(-(MAX_MESSAGES - 1)), { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        rawBuffer += decoder.decode(value, { stream: true })

        const lines = rawBuffer.split('\n')
        rawBuffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          let data
          try {
            data = JSON.parse(trimmed)
          } catch {
            continue
          }

          if (data.type === 'chunk' && typeof data.text === 'string') {
            assistantContent += data.text
          }

          if (data.type === 'meta') {
            if (typeof data.assistant_text === 'string' && data.assistant_text.length > 0) {
              assistantContent = data.assistant_text
            }
            if (Array.isArray(data.tool_calls)) {
              toolCalls = data.tool_calls
            }
          }

          if (data.type === 'chunk' || data.type === 'meta') {
            applyAssistantContent(false)
          }
        }
      }

      applyAssistantContent(true)

      if (!hasTextContent(assistantContent)) {
        setMessages(prev => {
          if (!prev.length) return prev
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant' && !hasTextContent(last?.content)) {
            return prev.slice(0, -1)
          }
          return prev
        })
      }

      if (toolCalls.length > 0) {
        const toolResults = await actionEngine.executeToolCalls(toolCalls, { userQuery: messageToSend })

        // On mobile: if any tool result performed navigation or highlighted an element, auto-minimize
        try {
          if (isMobile && isOpen && !isMinimized) {
            const navHighlightNames = new Set(['navigate_to_page', 'search_content', 'compute_selector_for_text', 'open_and_focus', 'scroll_to_target', 'highlight_target'])
            const shouldAutoMinimize = Array.isArray(toolResults) && toolResults.some((res) => {
              if (!res) return false
              if (res.ok === false) return false
              if (res.action && navHighlightNames.has(res.action)) return true
              if (res.name && navHighlightNames.has(res.name)) return true
              if (res.path) return true
              if (res.element) return true
              return false
            })
            if (shouldAutoMinimize) setIsMinimized(true)
          }
        } catch (e) {
          // ignore any detection errors
        }

        const actionFeedback = buildActionFeedback(toolResults)

        if (actionFeedback) {
          setMessages(prev => [...prev.slice(-(MAX_MESSAGES - 1)), { role: 'assistant', content: actionFeedback }])
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setMessages(prev => {
          const cleaned = [...prev]
          const last = cleaned[cleaned.length - 1]
          if (last?.role === 'assistant' && !hasTextContent(last?.content)) {
            cleaned.pop()
          }
          return [...cleaned.slice(-(MAX_MESSAGES - 1)), { role: 'system', content: '_Đã dừng tạo phản hồi._' }]
        })
      } else {
        console.error('AI Chat Error:', error)
        setMessages(prev => [...prev.slice(-(MAX_MESSAGES - 1)), { role: 'assistant', content: '**Lỗi kết nối:** Không thể kết nối tới server AI. Vui lòng đảm bảo backend đang chạy.' }])
      }
    } finally {
      setIsTyping(false)
      setAbortController(null)
    }
  }

  if (!isOpen) return (
    <div className="fixed right-3 z-[140] sm:right-4 md:right-6" style={{ bottom: floatingBottom }}>
      <button
        onClick={() => setIsOpen(true)}
        className="tap-target group relative flex h-14 w-14 items-center justify-center rounded-[1.15rem] border border-white/65 bg-gradient-to-br from-fpt-orange via-orange-500 to-amber-500 p-0 text-white shadow-[0_24px_52px_-16px_rgba(242,112,36,0.75)] ring-4 ring-orange-200/60 transition-all duration-300 hover:scale-110 hover:shadow-[0_30px_64px_-14px_rgba(242,112,36,0.95)] hover:ring-orange-300/80 active:scale-95 sm:h-16 sm:w-16 sm:rounded-[1.25rem]"
        aria-label="Mở trợ lý AI"
      >
        <span className="pointer-events-none absolute -inset-1 rounded-[1.35rem] border border-orange-200/75" />
        <span className="pointer-events-none absolute -inset-3 rounded-[1.8rem] bg-orange-400/30 blur-md animate-pulse" />
        <span className="pointer-events-none absolute -inset-5 hidden rounded-[2rem] border border-orange-300/40 sm:block animate-ping" />

        <Sparkles size={30} className="relative z-10 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />

        <span className="pointer-events-none absolute -right-1 -top-1 rounded-full bg-fpt-blue px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white shadow-[0_8px_18px_-8px_rgba(29,42,87,0.8)]">
          AI
        </span>

        <span className="pointer-events-none absolute -left-[7.8rem] top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-orange-100 bg-white px-4 py-2 text-[11px] font-black text-fpt-orange shadow-[0_20px_36px_-18px_rgba(15,23,42,0.45)] transition-all duration-300 group-hover:-translate-x-1 lg:block">
          Chat với AI
        </span>
      </button>
    </div>
  )

  return (
    <div className={cn(
      'fixed z-[120] flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
      isFullscreen ? 'inset-0' : (isMobile ? 'left-0 right-0 px-3' : 'right-3 sm:right-4 md:right-6'),
      isMinimized
        ? 'h-16 w-[min(82vw,320px)]'
        : isFullscreen
          ? 'h-full w-full'
          : 'h-[min(80dvh,700px)] w-[min(calc(100vw-1.5rem),440px)]',
      isFullscreen ? 'ai-chat-fullscreen ai-chat-compact' : (isMobile && 'ai-chat-compact')
    )} style={isFullscreen ? undefined : { bottom: floatingBottom }}>
      <Card className={cn('h-full flex flex-col overflow-hidden border-0 bg-white p-0 shadow-[0_40px_100px_-30px_rgba(15,23,42,0.4)] ring-1 ring-black/[0.03]', isFullscreen ? 'rounded-none' : 'rounded-[2rem]')}>
        {/* Modern Header */}
        <div className={cn(
          'relative flex shrink-0 items-center justify-between transition-all',
          isFullscreen ? 'px-5' : (isMobile ? 'px-4' : 'px-5'),
          isMinimized
            ? 'h-full bg-gradient-to-r from-fpt-blue to-[#2a3b75]'
            : (isFullscreen ? 'h-16 bg-gradient-to-br from-fpt-blue via-[#23336a] to-fpt-blue border-b border-white/10' : (isMobile ? 'h-14 bg-gradient-to-br from-fpt-blue via-[#23336a] to-fpt-blue border-b border-white/10' : 'h-24 bg-gradient-to-br from-fpt-blue via-[#23336a] to-fpt-blue border-b border-white/10'))
        )}>
          {/* Header BG decoration */}
          {!isMinimized && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-fpt-orange blur-3xl animate-pulse" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.16)_0,transparent_35%),linear-gradient(145deg,rgba(255,255,255,0.08)_0,transparent_70%)]" />
            </div>
          )}

          <div className="relative z-10 flex items-center gap-4">
            <div className={cn(
              "relative rounded-2xl flex items-center justify-center transition-all",
              isMinimized ? "h-10 w-10 bg-white/10" : (isMobile ? "h-9 w-9 bg-white/20 backdrop-blur-md border border-white/20" : "h-12 w-12 bg-white/20 backdrop-blur-md border border-white/20")
            )}>
              <Bot size={isMinimized ? (isMobile ? 16 : 20) : (isMobile ? 20 : 24)} className="text-white" />
              <span className="absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-fpt-blue bg-green-400" />
            </div>
            <div className="flex flex-col">
              <span className={cn(
                "font-bold leading-none tracking-tight text-white",
                (isMinimized || isMobile) ? "text-sm" : "text-lg"
              )}>
                FPT Education AI
              </span>
              {!isMinimized && (
                <span className="mt-1.5 text-[11px] font-bold text-blue-200/80 uppercase tracking-widest">
                  Online & Intelligent
                </span>
              )}
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-1.5">
            {!isMinimized && (
              <button
                onClick={clearChat}
                className={cn(
                  'group flex items-center justify-center rounded-xl bg-white/10 text-white/70 transition-all hover:bg-white/20 hover:text-white',
                  isMobile ? 'h-8 w-8' : 'h-9 w-9'
                )}
                title="Làm mới"
                aria-label="Làm mới cuộc trò chuyện"
              >
                <Trash2 size={16} className="group-hover:rotate-12 transition-transform" />
              </button>
            )}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className={cn(
                'group flex items-center justify-center rounded-xl bg-white/10 text-white/70 transition-all hover:bg-white/20 hover:text-white',
                isMobile ? 'h-8 w-8' : 'h-9 w-9'
              )}
              aria-label={isMinimized ? 'Phóng to' : 'Thu nhỏ'}
            >
              {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className={cn(
                'group flex items-center justify-center rounded-xl bg-white/10 text-white/70 transition-all hover:bg-red-500 hover:text-white',
                isMobile ? 'h-8 w-8' : 'h-9 w-9'
              )}
              aria-label="Đóng trợ lý AI"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        
        {!isMinimized && (
          <>
            {/* Messages Area */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              role="log"
              aria-live="polite"
              aria-atomic="false"
              className={cn('relative flex-1 overflow-y-auto bg-slate-50/50 custom-scrollbar', isFullscreen ? 'p-5 space-y-4' : (isMobile ? 'p-3 space-y-2' : 'p-5 space-y-6'))}
            >
              {visibleMessages.map((msg, i) => (
                <div key={i} className={cn(
                  'flex gap-3 animate-fadeIn',
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}>
                  {/* Avatar */}
                  <div className={cn(
                    "flex shrink-0 items-center justify-center rounded-xl shadow-sm",
                    isMobile ? 'h-6 w-6' : 'h-8 w-8',
                    msg.role === 'user'
                      ? 'bg-fpt-orange text-white'
                      : msg.role === 'system'
                        ? 'hidden'
                        : 'bg-fpt-blue text-white'
                  )}>
                    {msg.role === 'user' ? <User size={isMobile ? 14 : 16} /> : <Zap size={isMobile ? 14 : 16} />}
                  </div>

                  <div className={cn(
                    'flex flex-col gap-1.5',
                    isMobile ? 'max-w-[92%]' : 'max-w-[82%]',
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  )}>
                    <div className={cn(
                      'relative shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] transition-all',
                      isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-3 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'rounded-2xl rounded-tr-none bg-gradient-to-br from-fpt-orange to-orange-600 font-medium text-white shadow-orange-100'
                        : msg.role === 'system'
                          ? 'rounded-full bg-slate-200/80 px-5 py-1.5 text-[10px] font-bold text-slate-500 shadow-none'
                          : 'rounded-2xl rounded-tl-none border border-slate-100 bg-white font-medium text-slate-700'
                    )}>
                      <MarkdownMessage content={msg.content} role={msg.role} navigate={navigate} isMobile={isMobile} />
                    </div>
                    <span className={cn('font-bold uppercase tracking-wider text-slate-400 px-1', isMobile ? 'text-[8px]' : 'text-[9px]')}>
                      {msg.role === 'user' ? 'Sinh viên' : msg.role === 'assistant' ? 'AI Assistant' : ''}
                    </span>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex gap-3 animate-pulse">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-fpt-blue text-white">
                    <Zap size={16} />
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-blue-50 bg-white px-4 py-3 shadow-sm">
                    <div className="flex gap-1.5">
                      <span className="w-1.5 h-1.5 bg-fpt-orange rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-fpt-orange rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-fpt-orange rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}

              {showScrollDown && (
                <button 
                  onClick={scrollToBottom}
                  className="absolute bottom-5 right-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-fpt-blue text-white shadow-xl hover:scale-110 transition-all animate-bounce"
                >
                  <ArrowDown size={18} />
                </button>
              )}
            </div>

            {/* Input Area */}
            <div className={cn('bg-white border-t border-slate-100', isFullscreen ? 'p-4' : (isMobile ? 'p-3' : 'p-5'))}>
              {messages.length === 1 && (
                <div className="mb-4 flex flex-wrap gap-2 animate-fadeInUp">
                  {quickSuggestions.map((text, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(text)}
                      className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600 transition-all hover:bg-orange-50 hover:border-orange-200 hover:text-fpt-orange"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative flex items-center gap-3">
                <div className="relative flex-1 group">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSend()
                    }}
                    placeholder="Viết nội dung cần hỗ trợ..."
                    className={cn('w-full rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold outline-none transition-all focus:border-fpt-orange/30 focus:bg-white focus:ring-4 focus:ring-orange-500/5 group-hover:border-slate-300', isFullscreen ? 'px-5 py-4' : (isMobile ? 'px-4 py-3' : 'px-5 py-4'))}
                  />
                  {!input.trim() && !isTyping && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Sparkles size={16} className="text-slate-300" />
                    </div>
                  )}
                </div>
                
                {isTyping ? (
                  <button
                    onClick={handleStop}
                    className={cn('group flex shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500 transition-all hover:bg-red-500 hover:text-white', isMobile ? 'h-10 w-10' : 'h-12 w-12')}
                  >
                    <Square size={isMobile ? 16 : 18} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim()}
                    className={cn('group flex shrink-0 items-center justify-center rounded-2xl bg-fpt-blue text-white shadow-lg shadow-blue-100 transition-all hover:bg-fpt-orange hover:shadow-orange-100 disabled:opacity-40 disabled:shadow-none', isMobile ? 'h-10 w-10' : 'h-12 w-12')}
                  >
                    <Send size={isMobile ? 16 : 18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </button>
                )}
              </div>
              
              <div className="mt-4 flex items-center justify-center gap-2 border-t border-slate-50 pt-3 opacity-40">
                <Zap size={10} className="text-fpt-orange" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Powered by FPT Global AI Integration
                </span>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
