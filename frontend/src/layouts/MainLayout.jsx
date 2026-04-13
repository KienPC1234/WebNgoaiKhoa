import { Link, Outlet, useLocation } from 'react-router-dom'
import { AiChatWidget } from '../components/AiChatWidget'
import { Home, Compass, GraduationCap, Phone, Sparkles, ChevronDown, ArrowUp, Bell, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export const MainLayout = () => {
  const location = useLocation()
  const [showPhanMonDropdown, setShowPhanMonDropdown] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [notifications, setNotifications] = useState([])
  
  const isActive = (path) => location.pathname === path

  // Scroll to top listener
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // WebSocket Notifications
  useEffect(() => {
    const wsUrl = `ws://${window.location.hostname}:3002/ws/notifications`
    let ws = new WebSocket(wsUrl)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      const newNotif = { ...data, id: Date.now() }
      setNotifications(prev => [newNotif, ...prev])
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotif.id))
      }, 5000)
    }

    ws.onclose = () => {
      // Reconnect after 3 seconds
      setTimeout(() => {
        ws = new WebSocket(wsUrl)
      }, 3000)
    }

    return () => ws.close()
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          {/* Logo Section */}
          <Link to="/" className="flex items-center gap-2 group">
            <motion.div 
              whileHover={{ rotate: 12 }}
              className="bg-fpt-orange p-1.5 rounded-lg"
            >
              <Sparkles className="text-white" size={24} />
            </motion.div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-fpt-blue leading-none">NGOẠI KHOÁ</span>
              <span className="text-sm font-bold text-fpt-orange tracking-widest uppercase">Nhịp đập</span>
            </div>
          </Link>

          {/* Menu Items */}
          <nav className="hidden lg:flex items-center gap-8">
            <Link 
              to="/" 
              className={`flex items-center gap-1.5 font-bold transition-colors ${isActive('/') ? 'text-fpt-orange' : 'text-gray-600 hover:text-fpt-orange'}`}
            >
              <Home size={18} />
              Trang chủ
            </Link>
            
            <Link 
              to="/ngoaikhoa" 
              className={`flex items-center gap-1.5 font-bold transition-colors ${isActive('/ngoaikhoa') ? 'text-fpt-orange' : 'text-gray-600 hover:text-fpt-orange'}`}
            >
              <Compass size={18} />
              Ngoại khoá
            </Link>

            {/* Dropdown Phân các môn */}
            <div 
              className="relative group py-2"
              onMouseEnter={() => setShowPhanMonDropdown(true)}
              onMouseLeave={() => setShowPhanMonDropdown(false)}
            >
              <button className={`flex items-center gap-1.5 font-bold transition-colors ${location.pathname.startsWith('/phanmon') ? 'text-fpt-orange' : 'text-gray-600 hover:text-fpt-orange'}`}>
                <GraduationCap size={18} />
                Phân các môn
                <ChevronDown size={14} className={`transition-transform ${showPhanMonDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {showPhanMonDropdown && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 bg-white border border-gray-100 shadow-xl rounded-xl py-3 min-w-[220px] z-50"
                  >
                    <Link 
                      to="/phanmon/van" 
                      className="flex items-center gap-2 px-4 py-2 hover:bg-orange-50 hover:text-fpt-orange transition-colors font-semibold"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-fpt-orange"></span>
                      Phân môn Văn (Nhái Bén)
                    </Link>
                    <Link 
                      to="/phanmon/ktpl" 
                      className="flex items-center gap-2 px-4 py-2 hover:bg-orange-50 hover:text-fpt-orange transition-colors font-semibold"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-fpt-blue"></span>
                      Kinh tế Pháp luật
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link 
              to="/lienhe" 
              className={`flex items-center gap-1.5 font-bold transition-colors ${isActive('/lienhe') ? 'text-fpt-orange' : 'text-gray-600 hover:text-fpt-orange'}`}
            >
              <Phone size={18} />
              Liên hệ
            </Link>
          </nav>

          {/* Featured AI Button */}
          <div className="flex items-center gap-4">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-fpt-orange to-fpt-orange/80 text-white px-6 py-2.5 rounded-full font-black shadow-lg shadow-orange-200"
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-ai-chat'))}
            >
              <Sparkles size={18} />
              AI CHAT
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100 pt-16 pb-8">
        {/* ... footer content unchanged ... */}
        <div className="container mx-auto px-4 text-center">
           <div className="border-t border-gray-200 pt-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
            © 2026 NGOẠI KHOÁ NHỊP ĐẬP - POWERED BY FPT EDUCATION
          </div>
        </div>
      </footer>

      {/* Persistent AI Widget */}
      <AiChatWidget />

      {/* Back to Top */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={scrollToTop}
            className="fixed bottom-24 right-6 bg-fpt-blue text-white p-4 rounded-full shadow-2xl z-40 hover:bg-fpt-orange transition-colors"
          >
            <ArrowUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Real-time Notifications Toast */}
      <div className="fixed top-24 right-6 z-[60] flex flex-col gap-4 pointer-events-none">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className="pointer-events-auto bg-white border-l-4 border-fpt-orange shadow-2xl rounded-2xl p-4 min-w-[300px] max-w-sm flex gap-4 items-start"
            >
              <div className="bg-orange-50 p-2 rounded-xl text-fpt-orange">
                <Bell size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-black text-fpt-blue text-sm uppercase italic">{notif.title}</h4>
                <p className="text-xs text-gray-500 font-medium mt-1">{notif.message}</p>
              </div>
              <button onClick={() => removeNotification(notif.id)} className="text-gray-300 hover:text-gray-500">
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
