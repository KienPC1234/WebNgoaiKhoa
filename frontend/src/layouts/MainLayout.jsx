import { Link, Outlet, useLocation } from 'react-router-dom'
import { AiChatWidget } from '@/components/AiChatWidget'
import { Home, Compass, GraduationCap, Sparkles, ChevronDown, ArrowUp, Bell, X, UserCircle, Users, Calendar, BookOpen, Award, Heart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export const MainLayout = () => {
  const location = useLocation()
  const [showPhanMonDropdown, setShowPhanMonDropdown] = useState(false)
  const [showChuyenMonDropdown, setShowChuyenMonDropdown] = useState(false)
  const [showNhanVatDropdown, setShowNhanVatDropdown] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [notifications, setNotifications] = useState([])

  const token = localStorage.getItem('token')

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
    let ws;
    let reconnectTimeout;
    const wsBase = import.meta.env.VITE_WS_URL || ''

    const connectWS = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = wsBase
        ? `${wsBase.replace(/\/$/, '')}/notifications`
        : `${protocol}//${window.location.host}/ws/notifications`

      try {
        ws = new WebSocket(wsUrl)

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            const newNotif = { ...data, id: Date.now() }
            setNotifications(prev => [newNotif, ...prev])

            setTimeout(() => {
              setNotifications(prev => prev.filter(n => n.id !== newNotif.id))
            }, 8000)
          } catch (e) {
            console.error("Lỗi parse thông báo:", e)
          }
        }

        ws.onclose = () => {
          reconnectTimeout = setTimeout(connectWS, 5000)
        }

        ws.onerror = (err) => {
          console.warn("WebSocket gặp lỗi kết nối.")
        }
      } catch (e) {
        console.error("Không thể khởi tạo WebSocket:", e)
      }
    }

    connectWS()

    return () => {
      if (ws) {
        ws.onclose = null // Prevent reconnect on unmount
        ws.close()
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="min-h-screen flex flex-col bg-transparent relative overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70 bg-[radial-gradient(circle_at_10%_10%,rgba(29,42,87,0.12),transparent_40%),radial-gradient(circle_at_90%_0%,rgba(242,112,36,0.12),transparent_35%),linear-gradient(180deg,#f8fbff_0%,#fffaf5_100%)]"></div>
      {/* Navigation Header */}
      <header className="glass-nav border-b border-white/70 shadow-[0_14px_40px_-28px_rgba(29,42,87,0.35)] transition-all duration-300">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center gap-4">
          {/* Logo Section */}
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <motion.div
              whileHover={{ rotate: 12, scale: 1.1 }}
              className="bg-fpt-orange p-2 rounded-xl shadow-lg shadow-orange-200"
            >
              <Sparkles className="text-white" size={24} />
            </motion.div>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-fpt-blue leading-none italic tracking-tighter whitespace-nowrap">TỔ XÃ HỘI</span>
              <span className="hidden xl:block text-[10px] font-black text-fpt-orange tracking-[0.3em] uppercase ml-0.5 whitespace-nowrap">Deep learning with love</span>
            </div>
          </Link>

          {/* Menu Items */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-8 flex-nowrap whitespace-nowrap bg-white/70 backdrop-blur px-4 xl:px-6 py-3 rounded-2xl border border-white/70 shadow-sm overflow-x-auto no-scrollbar">
            <NavLink to="/" icon={Home} label="Trang chủ" active={isActive('/')} />

            {/* Giới thiệu */}
            <div
              className="relative group py-2"
              onMouseEnter={() => setShowPhanMonDropdown(true)}
              onMouseLeave={() => setShowPhanMonDropdown(false)}
            >
              <button className={cn(
                "flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap",
                location.pathname.startsWith('/gioithieu') ? 'text-fpt-orange' : 'text-gray-500 hover:text-fpt-orange'
              )}>
                <Sparkles size={18} />
                Giới thiệu
                <ChevronDown size={14} className={cn("transition-transform duration-300", showPhanMonDropdown ? "rotate-180" : "")} />
              </button>

              <AnimatePresence>
                {showPhanMonDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    className="absolute top-full left-0 bg-white/95 backdrop-blur-xl border border-gray-100 shadow-2xl rounded-2xl py-4 min-w-[320px] z-50 overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fpt-orange to-fpt-blue"></div>
                    <div className="px-4 py-2 space-y-1">
                      <ul className="grid grid-cols-1 gap-2">
                        <li>
                          <Link to="/nhanvat/scale" className="flex items-center gap-3 p-3 rounded-xl hover:bg-orange-50/50 transition-all group/item">
                            <Users className="text-fpt-blue group-hover/item:scale-110 transition-transform" size={20} />
                            <div className="flex-1">
                              <div className="font-black text-[10px] uppercase tracking-widest text-gray-700 group-hover/item:text-fpt-orange">Tổ xã hội - quy mô</div>
                              <div className="text-[10px] text-gray-400 font-medium">Quy mô, sứ mệnh và phạm vi</div>
                            </div>
                          </Link>
                        </li>
                        <li>
                          <Link to="/nhanvat/staff" className="flex items-center gap-3 p-3 rounded-xl hover:bg-orange-50/50 transition-all group/item">
                            <BookOpen className="text-fpt-orange group-hover/item:scale-110 transition-transform" size={20} />
                            <div className="flex-1">
                              <div className="font-black text-[10px] uppercase tracking-widest text-gray-700 group-hover/item:text-fpt-orange">Đội ngũ giáo viên</div>
                              <div className="text-[10px] text-gray-400 font-medium">Giới thiệu đội ngũ giảng dạy</div>
                            </div>
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Chuyên môn - mega dropdown */}
            <div
              className="relative group py-2"
              onMouseEnter={() => setShowChuyenMonDropdown(true)}
              onMouseLeave={() => setShowChuyenMonDropdown(false)}
            >
              <button className={cn(
                "flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap",
                location.pathname.startsWith('/phanmon') ? 'text-fpt-orange' : 'text-gray-500 hover:text-fpt-orange'
              )}>
                <GraduationCap size={18} />
                Chuyên môn
                <ChevronDown size={14} className={cn("transition-transform duration-300", showChuyenMonDropdown ? "rotate-180" : "")} />
              </button>

              <AnimatePresence>
                {showChuyenMonDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    className="absolute top-full left-[-200px] bg-white/95 backdrop-blur-xl border border-gray-100 shadow-2xl rounded-2xl py-8 min-w-[1000px] z-50 overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fpt-orange to-fpt-blue"></div>
                    <div className="grid grid-cols-5 gap-8 px-8">
                      {[
                        { name: 'Ngữ Văn', path: 'van', color: 'fpt-orange' },
                        { name: 'Kinh tế pháp luật', path: 'ktpl', color: 'fpt-blue' },
                        { name: 'Lịch sử', path: 'lich-su', color: 'fpt-orange' },
                        { name: 'Địa lí', path: 'dia-li', color: 'fpt-blue' },
                        { name: 'Vovinam', path: 'vovinam', color: 'fpt-orange' },
                      ].map((mon) => (
                        <div key={mon.path} className="space-y-4">
                          <div className={`flex items-center gap-2 border-b border-${mon.path === 'ktpl' || mon.path === 'dia-li' ? 'blue' : 'orange'}-100 pb-2`}>
                            <div className={`w-1.5 h-4 bg-${mon.color} rounded-full`}></div>
                            <h5 className="text-[11px] font-black uppercase tracking-widest text-fpt-blue">{mon.name}</h5>
                          </div>
                          <ul className="space-y-3">
                            {[
                              { label: 'Ấn phẩm/sp học tập', sub: 'an-pham', icon: BookOpen },
                              { label: 'Tài liệu tham khảo', sub: 'tai-lieu', icon: Compass },
                              { label: 'Vinh danh năm học', sub: 'vinh-danh', icon: Award },
                            ].map((item) => (
                              <li key={item.sub}>
                                <Link to={`/phanmon/${mon.path}/${item.sub}`} className="flex items-center gap-2 group/sub">
                                  <item.icon size={14} className="text-gray-300 group-hover/sub:text-fpt-orange transition-colors" />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover/sub:text-fpt-orange transition-colors">{item.label}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Nhân vật & sự kiện */}
            <div
              className="relative group py-2"
              onMouseEnter={() => setShowNhanVatDropdown(true)}
              onMouseLeave={() => setShowNhanVatDropdown(false)}
            >
              <button className={cn(
                "flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap",
                (location.pathname.startsWith('/nhanvat') || location.pathname.startsWith('/events') || location.pathname.startsWith('/stories'))
                  ? 'text-fpt-orange'
                  : 'text-gray-500 hover:text-fpt-orange'
              )}>
                <UserCircle size={18} />
                Nhân vật & sự kiện
                <ChevronDown size={14} className={cn("transition-transform duration-300", showNhanVatDropdown ? "rotate-180" : "")} />
              </button>

              <AnimatePresence>
                {showNhanVatDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    className="absolute top-full left-0 bg-white/95 backdrop-blur-xl border border-gray-100 shadow-2xl rounded-2xl py-4 min-w-[320px] z-50 overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fpt-orange to-fpt-blue"></div>
                    <div className="px-4 py-2 space-y-1">
                      <ul className="grid grid-cols-1 gap-2">
                        <li>
                          <Link to="/events/upcoming" className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50/50 transition-all group/item">
                            <Calendar className="text-fpt-blue group-hover/item:scale-110 transition-transform" size={20} />
                            <div className="flex-1">
                              <div className="font-black text-[10px] uppercase tracking-widest text-gray-700 group-hover/item:text-fpt-orange">Sự kiện sắp tới</div>
                              <div className="text-[10px] text-gray-400 font-medium">Lịch hội thảo, workshop và hoạt động</div>
                            </div>
                          </Link>
                        </li>
                        <li>
                          <Link to="/stories/inspiring" className="flex items-center gap-3 p-3 rounded-xl hover:bg-orange-50/50 transition-all group/item">
                            <Heart className="text-red-400 group-hover/item:scale-110 transition-transform" size={20} />
                            <div className="flex-1">
                              <div className="font-black text-[10px] uppercase tracking-widest text-gray-700 group-hover/item:text-fpt-orange">Câu chuyện truyền cảm hứng</div>
                              <div className="text-[10px] text-gray-400 font-medium">Những chia sẻ và thành tựu nổi bật</div>
                            </div>
                          </Link>
                        </li>
                        <li>
                          <Link to="/nhanvat/honors" className="flex items-center gap-3 p-3 rounded-xl hover:bg-orange-50/50 transition-all group/item">
                            <Award className="text-fpt-orange group-hover/item:scale-110 transition-transform" size={20} />
                            <div className="flex-1">
                              <div className="font-black text-[10px] uppercase tracking-widest text-gray-700 group-hover/item:text-fpt-orange">Vinh danh & giải thưởng</div>
                              <div className="text-[10px] text-gray-400 font-medium">Danh sách học viên & tập thể xuất sắc</div>
                            </div>
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </nav>


          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {token ? (
              <Link to="/profile" className="hidden lg:flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-fpt-blue transition-colors uppercase tracking-widest border-r border-gray-200 pr-4 whitespace-nowrap">
                <UserCircle size={16} />
                Hồ sơ
              </Link>
            ) : (
              <div className="hidden lg:flex items-center gap-3 border-r border-gray-200 pr-4">
                <Link to="/login" className="flex items-center gap-2 text-[10px] font-black text-gray-500 hover:text-fpt-blue transition-colors uppercase tracking-widest whitespace-nowrap">
                  <UserCircle size={16} />
                  Đăng nhập
                </Link>
                <Link to="/register" className="text-[10px] font-black text-fpt-orange hover:text-orange-600 transition-colors uppercase tracking-widest whitespace-nowrap">
                  Đăng ký
                </Link>
              </div>
            )}
            {!token ? (
              <div className="flex lg:hidden items-center gap-2">
                <Link to="/login" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white text-fpt-blue border border-blue-100 whitespace-nowrap">
                  Đăng nhập
                </Link>
                <Link to="/register" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-fpt-orange text-white whitespace-nowrap">
                  Đăng ký
                </Link>
              </div>
            ) : (
              <Link to="/profile" className="flex lg:hidden px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white text-fpt-blue border border-blue-100 whitespace-nowrap">
                Hồ sơ
              </Link>
            )}
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 10px 20px -5px rgba(242,112,36,0.4)' }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 bg-fpt-orange text-white px-4 xl:px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-100 border-none whitespace-nowrap"
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-ai-chat'))}
            >
              <Sparkles size={18} className="animate-pulse" />
              AI CHAT
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white/50 backdrop-blur-sm border-t border-gray-100 pt-20 pb-10 mt-20 relative z-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2 space-y-6">
              <div className="flex items-center gap-2">
                <div className="bg-fpt-blue p-1.5 rounded-lg"><Sparkles className="text-white" size={20} /></div>
                <span className="text-xl font-black text-fpt-blue italic uppercase tracking-tighter">Tổ xã hội</span>
              </div>
              <p className="text-gray-500 font-medium leading-relaxed max-w-md">
                Nền tảng kết nối tri thức và phát triển kỹ năng toàn diện cho sinh viên FPT Education. Tích hợp trí tuệ nhân tạo thế hệ mới.
              </p>
            </div>
            <div className="space-y-6">
              <h4 className="font-black text-sm text-fpt-blue uppercase tracking-widest">Khám phá</h4>
              <ul className="space-y-4 text-sm font-bold text-gray-400">
                <li><Link to="/phanmon/van" className="hover:text-fpt-orange transition-colors uppercase tracking-widest text-[10px]">Phân môn Văn</Link></li>
                <li><Link to="/phanmon/ktpl" className="hover:text-fpt-orange transition-colors uppercase tracking-widest text-[10px]">Kinh tế Pháp luật</Link></li>
                <li><Link to="/ngoaikhoa" className="hover:text-fpt-orange transition-colors uppercase tracking-widest text-[10px]">Hoạt động ngoại khoá</Link></li>
              </ul>
            </div>
            <div className="space-y-6">
              <h4 className="font-black text-sm text-fpt-blue uppercase tracking-widest">Hệ thống</h4>
              <ul className="space-y-4 text-sm font-bold text-gray-400">
                <li><Link to={token ? "/profile" : "/login"} className="hover:text-fpt-orange transition-colors uppercase tracking-widest text-[10px]">{token ? 'Hồ sơ' : 'Đăng nhập'}</Link></li>
                <li><a href="#" className="hover:text-fpt-orange transition-colors uppercase tracking-widest text-[10px]">Điều khoản sử dụng</a></li>
                <li><a href="#" className="hover:text-fpt-orange transition-colors uppercase tracking-widest text-[10px]">Chính sách bảo mật</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-10 text-center">
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.4em]">
              © 2026 TỔ XÃ HỘI • FPT EDUCATION
            </p>
          </div>
        </div>
      </footer>

      {/* Persistent AI Widget */}
      <AiChatWidget />

      {/* Control Buttons Group - Fix Overlap */}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-4">
        <AnimatePresence>
          {showBackToTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              onClick={scrollToTop}
              className="bg-white text-fpt-blue p-4 rounded-2xl shadow-2xl border border-gray-100 hover:bg-fpt-blue hover:text-white transition-all group"
            >
              <ArrowUp size={24} className="group-hover:-translate-y-1 transition-transform" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Spacer for AI Widget Button which is also at bottom-right */}
        <div className="h-16 w-16"></div>
      </div>

      {/* Real-time Notifications Toast */}
      <div className="fixed top-24 right-6 z-[100] flex flex-col gap-4 pointer-events-none">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className="pointer-events-auto glass-card border-l-4 border-fpt-orange shadow-2xl rounded-2xl p-5 min-w-[320px] max-w-sm flex gap-4 items-start"
            >
              <div className="bg-orange-500 p-2.5 rounded-xl text-white shadow-lg shadow-orange-100">
                <Bell size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-black text-fpt-blue text-sm uppercase italic tracking-tighter">{notif.title}</h4>
                <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed">{notif.message}</p>
              </div>
              <button onClick={() => removeNotification(notif.id)} className="text-gray-300 hover:text-red-500 p-1">
                <X size={18} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

const NavLink = ({ to, icon: Icon, label, active }) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all relative group whitespace-nowrap",
      active ? 'text-fpt-orange' : 'text-gray-500 hover:text-fpt-orange'
    )}
  >
    <Icon size={18} />
    {label}
    <span className={cn(
      "absolute -bottom-2 left-0 h-0.5 bg-fpt-orange transition-all duration-300",
      active ? 'w-full' : 'w-0 group-hover:w-full'
    )}></span>
  </Link>
)

const DropdownLink = ({ to, color, label }) => (
  <Link
    to={to}
    className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50 transition-all group"
  >
    <span className={cn("w-2 h-2 rounded-full transition-transform group-hover:scale-150", color)}></span>
    <span className="font-black text-[10px] uppercase tracking-widest text-gray-600 group-hover:text-fpt-blue">{label}</span>
  </Link>
)

const cn = (...classes) => classes.filter(Boolean).join(' ')
