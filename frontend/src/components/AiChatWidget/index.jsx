import { useState, useRef, useEffect } from 'react'
import { Send, X, Bot, Sparkles, Trash2, Maximize2, Minimize2, Square, ArrowDown } from 'lucide-react'
import { Card, cn } from '../UI'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const AiChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Chào bạn! Tôi là trợ lý AI của **Tổ xã hội**. Tôi có thể giúp bạn tìm hiểu về các hoạt động ngoại khóa, hướng dẫn gửi bài cho ấn phẩm **Nhái Bén**, hoặc giải đáp các thắc mắc về câu lạc bộ. \n\nBạn có thể hỏi tôi về: \n- Cách đăng ký tham gia CLB Văn học? \n- Thể lệ cuộc thi sáng tác mới nhất? \n- Lịch sinh hoạt các phân môn tuần này?' }
  ])
  const [isTyping, setIsTyping] = useState(false)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const [abortController, setAbortController] = useState(null)
  const scrollRef = useRef(null)

  const quickSuggestions = [
    "Thể lệ Nhái Bén là gì?",
    "Lịch học KTPL tuần này?",
    "Cách viết bài cho CLB Văn?",
    "Gửi bài dự thi ở đâu?"
  ]

  useEffect(() => {
    const handleToggle = () => setIsOpen(true)
    window.addEventListener('toggle-ai-chat', handleToggle)
    return () => window.removeEventListener('toggle-ai-chat', handleToggle)
  }, [])

  useEffect(() => {
    if (scrollRef.current && !showScrollDown) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [messages, isTyping, showScrollDown])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
    setShowScrollDown(!isAtBottom)
  }

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth'
    })
  }

  const clearChat = () => {
    if (abortController) abortController.abort()
    setMessages([messages[0]])
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

    if (abortController) abortController.abort()
    const controller = new AbortController()
    setAbortController(controller)

    const userMessage = { role: 'user', content: messageToSend }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)
    setShowScrollDown(false)

    try {
      const response = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: messageToSend,
          model: 'gpt-oss:120b-cloud'
        }),
        signal: controller.signal
      })

      if (!response.body) throw new Error('Không nhận được phản hồi từ server')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        assistantContent += chunk
        
        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1] = { role: 'assistant', content: assistantContent }
          return newMessages
        })
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setMessages(prev => [...prev, { role: 'system', content: '_Đã dừng tạo phản hồi._' }])
      } else {
        console.error('AI Chat Error:', error)
        setMessages(prev => [...prev, { role: 'assistant', content: '**Lỗi kết nối:** Không thể kết nối tới server AI. Vui lòng đảm bảo backend đang chạy.' }])
      }
    } finally {
      setIsTyping(false)
      setAbortController(null)
    }
  }

  if (!isOpen) return (
    <div className="fixed bottom-6 right-6 z-50">
      <button 
        onClick={() => setIsOpen(true)}
        className="group relative flex items-center justify-center rounded-2xl border border-white bg-fpt-orange p-4 text-white shadow-[0_16px_34px_-16px_rgba(242,112,36,0.85)] transition-all hover:scale-105 active:scale-95"
      >
        <Sparkles size={24} className="transition-transform group-hover:rotate-12" />
        <span className="pointer-events-none absolute -top-11 right-0 whitespace-nowrap rounded-lg border border-blue-100 bg-white px-3 py-1 text-[10px] font-black text-fpt-blue opacity-0 shadow-lg transition-all group-hover:opacity-100">
          HỎI AI NHÉ?
        </span>
      </button>
    </div>
  )

  return (
    <div className={cn(
      'fixed bottom-6 right-6 z-[70] flex flex-col transition-all duration-300 ease-out',
      isMinimized ? 'h-16 w-72' : 'h-[600px] w-[420px] max-h-[85vh] max-w-[92vw]'
    )}>
      <Card className="h-full flex flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-0 shadow-[0_24px_56px_-28px_rgba(15,23,42,0.45)]">
        {/* Header */}
        <div className="relative flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 text-slate-800">
          <div className="relative z-10 flex items-center gap-3">
            <div className="relative rounded-xl border border-blue-100 bg-blue-50 p-2">
              <Bot size={18} className="text-fpt-blue" />
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black leading-none tracking-tight text-fpt-blue">FPT AI Assistant</span>
              <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Cố vấn ngoại khóa</span>
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-1">
            <button onClick={clearChat} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700" title="Xóa hội thoại">
              <Trash2 size={15} />
            </button>
            <button onClick={() => setIsMinimized(!isMinimized)} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
              {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
            </button>
            <button onClick={() => setIsOpen(false)} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
              <X size={18} />
            </button>
          </div>
        </div>
        
        {!isMinimized && (
          <>
            {/* Messages */}
            <div 
              ref={scrollRef} 
              onScroll={handleScroll}
              className="relative flex-1 space-y-5 overflow-y-auto bg-slate-50/70 p-4 custom-scrollbar"
            >
              {messages.map((msg, i) => (
                <div key={i} className={cn(
                  'animate-fadeIn flex flex-col gap-1.5',
                  msg.role === 'user' ? "items-end" : msg.role === 'system' ? "items-center" : "items-start"
                )}>
                  <div className={cn(
                    'max-w-[86%] px-4 py-3 text-sm leading-relaxed shadow-sm transition-all',
                    msg.role === 'user' 
                      ? 'rounded-2xl rounded-br-md bg-fpt-orange font-semibold text-white' 
                      : msg.role === 'system'
                        ? 'rounded-full bg-slate-200 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500'
                        : 'rounded-2xl rounded-bl-md border border-slate-200 bg-white font-medium text-slate-700'
                  )}>
                    <div className="prose prose-sm prose-orange max-w-none break-words leading-relaxed font-medium">
                      <ReactMarkdown 
                        remarkPlugins={[remarkMath]} 
                        rehypePlugins={[rehypeKatex]}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  {msg.role !== 'system' && (
                    <span className="mx-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-300">
                      {msg.role === 'user' ? 'Sinh viên' : 'Hệ thống AI'}
                    </span>
                  )}
                </div>
              ))}
              
              {isTyping && (
                <div className="animate-pulse px-2 text-fpt-orange">
                  <div className="flex items-center gap-3 rounded-xl border border-orange-100 bg-orange-50 px-3 py-2">
                  <div className="flex gap-2">
                    <span className="w-2 h-2 bg-fpt-orange rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-fpt-orange rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 bg-fpt-orange rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] opacity-70">Đang phân tích...</span>
                  </div>
                </div>
              )}

              {showScrollDown && (
                <button 
                  onClick={scrollToBottom}
                  className="fixed bottom-28 right-10 z-20 rounded-xl border border-slate-200 bg-white p-2.5 text-fpt-blue shadow-lg transition-all hover:scale-105"
                >
                  <ArrowDown size={18} />
                </button>
              )}
            </div>

            {/* Input Area */}
            <div className="space-y-3 border-t border-slate-200 bg-white p-4">
              {/* Quick Suggestions */}
              {messages.length === 1 && (
                <div className="mb-1 flex flex-wrap gap-2 animate-fadeInUp">
                  {quickSuggestions.map((text, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(text)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-600 transition-all hover:border-fpt-blue hover:bg-blue-50 hover:text-fpt-blue"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative flex items-end gap-2.5">
                <div className="group relative flex-1">
                  <textarea 
                    rows="1"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder="Đặt câu hỏi cho AI..."
                    className="custom-scrollbar max-h-32 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none transition-all focus:border-fpt-orange/40 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
                
                {isTyping ? (
                  <button 
                    onClick={handleStop}
                    className="flex-shrink-0 rounded-xl bg-red-500 p-3 text-white transition-all hover:bg-red-600"
                  >
                    <Square size={18} fill="currentColor" />
                  </button>
                ) : (
                  <button 
                    onClick={() => handleSend()} 
                    disabled={!input.trim()}
                    className="flex-shrink-0 rounded-xl bg-fpt-blue p-3 text-white transition-all hover:bg-fpt-orange disabled:opacity-50"
                  >
                    <Send size={18} />
                  </button>
                )}
              </div>
              <div className="text-center">
                <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-300">
                  Mô hình gpt-oss:120b-cloud • FPT Education
                </span>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
