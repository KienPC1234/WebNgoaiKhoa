import { useState, useRef, useEffect } from 'react'
import { MessageSquare, Send, X, Bot, Sparkles, Trash2, Maximize2, Minimize2, Square, RefreshCcw, ArrowDown } from 'lucide-react'
import { Button, Card, cn } from '../UI'
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
        className="bg-fpt-orange text-white p-5 rounded-3xl shadow-2xl shadow-orange-300 hover:scale-110 active:scale-95 transition-all flex items-center justify-center border-4 border-white group relative"
      >
        <Sparkles size={28} className="animate-pulse group-hover:rotate-12" />
        <span className="absolute -top-12 right-0 bg-white text-fpt-blue text-[10px] font-black px-3 py-1.5 rounded-xl border border-blue-50 shadow-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap">
          HỎI AI NHÉ?
        </span>
      </button>
    </div>
  )

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-[70] transition-all duration-500 ease-in-out flex flex-col",
      isMinimized ? "h-16 w-64" : "h-[650px] w-[450px] max-w-[90vw] max-h-[85vh]"
    )}>
      <Card className="h-full flex flex-col p-0 overflow-hidden border border-gray-100 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.3)] rounded-[40px] bg-white">
        {/* Header */}
        <div className="bg-fpt-blue p-6 flex justify-between items-center text-white shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-full bg-white opacity-5 skew-x-12 translate-x-16"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md relative border border-white/10">
              <Bot size={22} className="text-fpt-orange" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 border-2 border-fpt-blue rounded-full" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-sm tracking-tight leading-none uppercase italic">FPT AI Assistant</span>
              <span className="text-[9px] font-bold opacity-60 uppercase tracking-[0.2em] mt-1.5">Cố vấn ngoại khóa thông minh</span>
            </div>
          </div>
          <div className="flex items-center gap-1 relative z-10">
            <button onClick={clearChat} className="p-2 hover:bg-white/10 rounded-xl transition-colors" title="Xóa hội thoại">
              <Trash2 size={16} />
            </button>
            <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X size={22} />
            </button>
          </div>
        </div>
        
        {!isMinimized && (
          <>
            {/* Messages */}
            <div 
              ref={scrollRef} 
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/30 custom-scrollbar relative"
            >
              {messages.map((msg, i) => (
                <div key={i} className={cn(
                  "flex flex-col gap-2 animate-fadeIn",
                  msg.role === 'user' ? "items-end" : msg.role === 'system' ? "items-center" : "items-start"
                )}>
                  <div className={cn(
                    "max-w-[85%] px-6 py-4 text-sm leading-relaxed shadow-sm transition-all",
                    msg.role === 'user' 
                      ? "bg-fpt-orange text-white rounded-[28px_28px_4px_28px] font-bold" 
                      : msg.role === 'system'
                        ? "bg-gray-200 text-gray-500 text-[10px] font-black py-2 rounded-full px-5 uppercase tracking-widest"
                        : "bg-white border border-gray-100 text-gray-800 rounded-[28px_28px_28px_4px] font-medium"
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
                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mx-3">
                      {msg.role === 'user' ? 'Sinh viên' : 'Hệ thống AI'}
                    </span>
                  )}
                </div>
              ))}
              
              {isTyping && (
                <div className="flex items-center gap-4 text-fpt-orange px-3 animate-pulse">
                  <div className="flex gap-2">
                    <span className="w-2 h-2 bg-fpt-orange rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-fpt-orange rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 bg-fpt-orange rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 italic">Đang phân tích...</span>
                </div>
              )}

              {showScrollDown && (
                <button 
                  onClick={scrollToBottom}
                  className="fixed bottom-32 right-12 bg-white text-fpt-blue p-3 rounded-2xl shadow-2xl border border-gray-100 hover:scale-110 transition-all z-20"
                >
                  <ArrowDown size={20} />
                </button>
              )}
            </div>

            {/* Input Area */}
            <div className="p-8 bg-white border-t border-gray-50 space-y-6">
              {/* Quick Suggestions */}
              {messages.length === 1 && (
                <div className="flex flex-wrap gap-2.5 mb-2 animate-fadeInUp">
                  {quickSuggestions.map((text, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(text)}
                      className="text-[9px] font-black text-fpt-blue bg-blue-50/50 px-4 py-2.5 rounded-xl border border-blue-100/30 hover:bg-fpt-blue hover:text-white transition-all uppercase tracking-widest shadow-sm"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative flex items-center gap-4">
                <div className="flex-1 relative group">
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
                    className="w-full text-sm font-bold border-2 border-gray-50 focus:border-fpt-orange/20 bg-gray-50 focus:bg-white rounded-[24px] px-6 py-5 outline-none transition-all resize-none max-h-32 custom-scrollbar shadow-inner"
                  />
                </div>
                
                {isTyping ? (
                  <button 
                    onClick={handleStop}
                    className="bg-red-500 text-white p-5 rounded-[24px] hover:bg-red-600 transition-all shadow-xl shadow-red-100 flex-shrink-0"
                  >
                    <Square size={22} fill="currentColor" />
                  </button>
                ) : (
                  <button 
                    onClick={() => handleSend()} 
                    disabled={!input.trim()}
                    className="bg-fpt-blue text-white p-5 rounded-[24px] hover:bg-fpt-orange transition-all shadow-2xl shadow-blue-100 disabled:opacity-50 disabled:grayscale hover:scale-105 active:scale-95 flex-shrink-0 border-none"
                  >
                    <Send size={22} />
                  </button>
                )}
              </div>
              <div className="text-center">
                <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em]">
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
