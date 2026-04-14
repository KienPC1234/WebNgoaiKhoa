import { Link, Outlet, useLocation } from 'react-router-dom'
import { AiChatWidget } from '@/components/AiChatWidget'
import {
  Home,
  Compass,
  GraduationCap,
  Sparkles,
  ChevronDown,
  ArrowUp,
  Bell,
  X,
  UserCircle,
  Users,
  Calendar,
  BookOpen,
  Award,
  Heart,
  Menu,
  PanelRightClose,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, GridBackground, ShimmerButton, Spotlight } from '@/components/UI'

const introMenu = [
  {
    to: '/nhanvat/scale',
    title: 'Tổ xã hội - quy mô',
    subtitle: 'Sứ mệnh, quy mô và định hướng',
    icon: Users,
  },
  {
    to: '/nhanvat/staff',
    title: 'Đội ngũ giáo viên',
    subtitle: 'Danh sách và hồ sơ giảng dạy',
    icon: BookOpen,
  },
]

const storiesMenu = [
  {
    to: '/events/upcoming',
    title: 'Sự kiện sắp tới',
    subtitle: 'Lịch hoạt động và workshop mới nhất',
    icon: Calendar,
  },
  {
    to: '/stories/inspiring',
    title: 'Câu chuyện truyền cảm hứng',
    subtitle: 'Bài viết và chia sẻ nổi bật',
    icon: Heart,
  },
  {
    to: '/nhanvat/honors',
    title: 'Vinh danh & giải thưởng',
    subtitle: 'Danh sách cá nhân, tập thể tiêu biểu',
    icon: Award,
  },
]

const subjects = [
  { name: 'Ngữ văn', slug: 'van' },
  { name: 'Kinh tế pháp luật', slug: 'ktpl' },
  { name: 'Lịch sử', slug: 'lich-su' },
  { name: 'Địa lí', slug: 'dia-li' },
  { name: 'Vovinam', slug: 'vovinam' },
]

const subjectContent = [
  { label: 'Ấn phẩm học tập', slug: 'an-pham', icon: BookOpen },
  { label: 'Tài liệu tham khảo', slug: 'tai-lieu', icon: Compass },
  { label: 'Vinh danh năm học', slug: 'vinh-danh', icon: Award },
]

export const MainLayout = () => {
  const location = useLocation()
  const [showIntroDropdown, setShowIntroDropdown] = useState(false)
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false)
  const [showStoriesDropdown, setShowStoriesDropdown] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSectionOpen, setMobileSectionOpen] = useState('intro')
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [notifications, setNotifications] = useState([])

  const token = localStorage.getItem('token')

  const isActive = (path) => location.pathname === path
  const activeSubject = location.pathname.startsWith('/phanmon')
  const activeIntro = ['/nhanvat/scale', '/nhanvat/staff', '/gioithieu/quy-mo', '/gioithieu/doi-ngu'].includes(location.pathname)
  const activeStories =
    location.pathname.startsWith('/nhanvat/honors') ||
    location.pathname.startsWith('/events') ||
    location.pathname.startsWith('/stories')

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    let ws
    let reconnectTimeout
    let closedByApp = false
    let retryCount = 0
    const wsBase = import.meta.env.VITE_WS_URL || ''
    const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    const shouldConnectWs = Boolean(wsBase) || isLocalHost

    if (!shouldConnectWs) {
      return undefined
    }

    const connectWS = () => {
      if (closedByApp) return

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = wsBase
        ? `${wsBase.replace(/\/$/, '')}/notifications`
        : `${protocol}//${window.location.host}/ws/notifications`

      try {
        ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          retryCount = 0
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            const newNotif = { ...data, id: Date.now() }
            setNotifications(prev => [newNotif, ...prev])

            setTimeout(() => {
              setNotifications(prev => prev.filter(n => n.id !== newNotif.id))
            }, 8000)
          } catch (e) {
            console.error('Lỗi parse thông báo:', e)
          }
        }

        ws.onclose = () => {
          if (closedByApp) return
          const reconnectDelay = Math.min(15000, 2000 * (2 ** retryCount))
          retryCount += 1
          reconnectTimeout = setTimeout(connectWS, reconnectDelay)
        }

        ws.onerror = () => {
          // Browser already reports WebSocket handshake errors in DevTools.
          // Keep runtime console clean to avoid noisy logs for expected network failures.
        }
      } catch (e) {
        const reconnectDelay = Math.min(15000, 2000 * (2 ** retryCount))
        retryCount += 1
        reconnectTimeout = setTimeout(connectWS, reconnectDelay)
      }
    }

    connectWS()

    return () => {
      closedByApp = true
      if (ws) {
        ws.onclose = null
        ws.onerror = null
        ws.onmessage = null
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, 'Main layout unmount')
        }
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
    }
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="app-shell relative overflow-x-clip">
      <header className="glass-nav sticky top-0 z-[100] overflow-visible">
        <GridBackground className="opacity-30" />
        <Spotlight className="opacity-90" />
        <div className="app-section py-4">
          <div className="surface relative z-[101] flex items-center justify-between gap-3 px-4 py-3 md:px-5 lg:px-6">
            <Link to="/" className="group flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.06 }}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-orange-100 bg-white shadow-[0_14px_28px_-18px_rgba(242,112,36,0.85)]"
              >
                <img src="/favicon.svg" alt="Logo Tổ xã hội" className="h-7 w-7 object-contain" />
              </motion.div>
              <div className="space-y-0.5">
                <p className="font-display text-lg font-extrabold uppercase tracking-tight text-fpt-blue md:text-xl">Tổ xã hội</p>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-fpt-orange md:text-[11px]">Deep learning with love</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-3 xl:flex">
              <NavItem to="/" label="Trang chủ" icon={Home} active={isActive('/')} />

              <DesktopMenu
                label="Giới thiệu"
                icon={Sparkles}
                open={showIntroDropdown}
                onOpen={() => setShowIntroDropdown(true)}
                onClose={() => setShowIntroDropdown(false)}
                active={activeIntro}
              >
                <div className="min-w-[340px] space-y-2 p-2">
                  <DropdownHeading
                    title="Khối giới thiệu"
                    subtitle="Thông tin tổng quan về đội ngũ và định hướng phát triển"
                  />
                  {introMenu.map((item) => (
                    <SubMenuCard key={item.to} item={item} />
                  ))}
                </div>
              </DesktopMenu>

              <DesktopMenu
                label="Chuyên môn"
                icon={GraduationCap}
                open={showSubjectDropdown}
                onOpen={() => setShowSubjectDropdown(true)}
                onClose={() => setShowSubjectDropdown(false)}
                active={activeSubject}
              >
                <div className="min-w-[900px] p-3">
                  <DropdownHeading
                    title="Bản đồ chuyên môn"
                    subtitle="Chọn phân môn và loại nội dung để đi nhanh tới tài nguyên cần học"
                  />
                  <div className="mt-3 grid grid-cols-5 gap-3">
                    {subjects.map((subject) => (
                      <div key={subject.slug} className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white p-3 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.5)]">
                        <h5 className="mb-3 text-[11px] font-black uppercase tracking-widest text-fpt-blue">{subject.name}</h5>
                        <div className="space-y-2">
                          {subjectContent.map((content) => (
                            <Link
                              key={`${subject.slug}-${content.slug}`}
                              to={`/phanmon/${subject.slug}/${content.slug}`}
                              className="flex items-center gap-2 rounded-xl border border-transparent px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all hover:border-orange-100 hover:bg-orange-50/70 hover:text-fpt-orange"
                            >
                              <content.icon size={14} />
                              {content.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </DesktopMenu>

              <DesktopMenu
                label="Nhân vật & sự kiện"
                icon={UserCircle}
                open={showStoriesDropdown}
                onOpen={() => setShowStoriesDropdown(true)}
                onClose={() => setShowStoriesDropdown(false)}
                active={activeStories}
              >
                <div className="min-w-[380px] space-y-2 p-2">
                  <DropdownHeading
                    title="Nhân vật và sự kiện"
                    subtitle="Những câu chuyện, mốc hoạt động và gương mặt tiêu biểu"
                  />
                  {storiesMenu.map((item) => (
                    <SubMenuCard key={item.to} item={item} />
                  ))}
                </div>
              </DesktopMenu>
            </nav>

            <div className="flex items-center gap-2 md:gap-3">
              {token ? (
                <Link to="/profile" className="btn-ghost hidden lg:inline-flex">
                  Hồ sơ
                </Link>
              ) : (
                <>
                  <Link to="/login" className="btn-ghost hidden lg:inline-flex">
                    Đăng nhập
                  </Link>
                  <Link to="/register" className="btn-primary hidden lg:inline-flex">
                    Đăng ký
                  </Link>
                </>
              )}

              <ShimmerButton
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('toggle-ai-chat'))}
                className="hidden md:inline-flex"
              >
                <Sparkles size={16} />
                AI Chat
              </ShimmerButton>

              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 xl:hidden"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
              >
                {mobileMenuOpen ? <PanelRightClose size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="app-section xl:hidden"
            >
              <div className="surface mb-4 p-3">
                <div className="mb-2 flex items-center gap-3 rounded-xl border border-orange-100 bg-orange-50/60 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-orange-100">
                    <img src="/favicon.svg" alt="Logo Tổ xã hội" className="h-5 w-5 object-contain" />
                  </div>
                  <div>
                    <p className="font-display text-sm font-extrabold uppercase tracking-tight text-fpt-blue">Tổ xã hội</p>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-fpt-orange">Deep learning with love</p>
                  </div>
                </div>
                <Link
                  to="/"
                  className={cn(
                    'mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold',
                    isActive('/') ? 'bg-orange-50 text-fpt-orange' : 'text-slate-600'
                  )}
                >
                  <Home size={16} />
                  Trang chủ
                </Link>

                <MobileSection
                  title="Giới thiệu"
                  sectionKey="intro"
                  openSection={mobileSectionOpen}
                  onToggle={setMobileSectionOpen}
                >
                  {introMenu.map((item) => (
                    <MobileLink key={item.to} to={item.to} label={item.title} />
                  ))}
                </MobileSection>

                <MobileSection
                  title="Chuyên môn"
                  sectionKey="subjects"
                  openSection={mobileSectionOpen}
                  onToggle={setMobileSectionOpen}
                >
                  {subjects.map((subject) => (
                    <div key={subject.slug} className="mb-2 rounded-xl border border-slate-100 bg-slate-50/80 p-2">
                      <p className="mb-1 px-2 text-[10px] font-black uppercase tracking-widest text-fpt-blue">{subject.name}</p>
                      {subjectContent.map((content) => (
                        <MobileLink
                          key={`${subject.slug}-${content.slug}`}
                          to={`/phanmon/${subject.slug}/${content.slug}`}
                          label={content.label}
                        />
                      ))}
                    </div>
                  ))}
                </MobileSection>

                <MobileSection
                  title="Nhân vật & sự kiện"
                  sectionKey="stories"
                  openSection={mobileSectionOpen}
                  onToggle={setMobileSectionOpen}
                >
                  {storiesMenu.map((item) => (
                    <MobileLink key={item.to} to={item.to} label={item.title} />
                  ))}
                </MobileSection>

                <div className="mt-3 flex gap-2">
                  {token ? (
                    <Link to="/profile" className="btn-ghost flex-1">
                      Hồ sơ
                    </Link>
                  ) : (
                    <>
                      <Link to="/login" className="btn-ghost flex-1">
                        Đăng nhập
                      </Link>
                      <Link to="/register" className="btn-primary flex-1">
                        Đăng ký
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-20 border-t border-slate-200/70 bg-white/60 py-14 backdrop-blur-sm">
        <div className="app-section">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4 lg:col-span-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-orange-100 bg-white">
                  <img src="/favicon.svg" alt="Logo Tổ xã hội" className="h-5 w-5 object-contain" />
                </div>
                <span className="font-display text-xl font-extrabold uppercase tracking-tight text-fpt-blue">Tổ xã hội</span>
              </div>
              <p className="max-w-lg text-sm leading-relaxed text-slate-600">
                Nền tảng kết nối tri thức và phát triển kỹ năng toàn diện cho học sinh, sinh viên FPT Education.
              </p>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-fpt-orange">Deep learning with love</p>
            </div>

            <div>
              <h4 className="mb-3 text-xs font-black uppercase tracking-widest text-fpt-blue">Khám phá</h4>
              <ul className="space-y-2 text-sm font-semibold text-slate-500">
                <li><Link to="/phanmon/van" className="hover:text-fpt-orange">Phân môn Văn</Link></li>
                <li><Link to="/phanmon/ktpl" className="hover:text-fpt-orange">Kinh tế pháp luật</Link></li>
                <li><Link to="/events/upcoming" className="hover:text-fpt-orange">Sự kiện sắp tới</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-3 text-xs font-black uppercase tracking-widest text-fpt-blue">Hệ thống</h4>
              <ul className="space-y-2 text-sm font-semibold text-slate-500">
                <li><Link to={token ? '/profile' : '/login'} className="hover:text-fpt-orange">{token ? 'Hồ sơ' : 'Đăng nhập'}</Link></li>
                <li><a href="#" className="hover:text-fpt-orange">Điều khoản sử dụng</a></li>
                <li><a href="#" className="hover:text-fpt-orange">Chính sách bảo mật</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-slate-200/80 pt-7 text-center">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.35em] text-slate-400">
              © 2026 TỔ XÃ HỘI • FPT EDUCATION
            </p>
          </div>
        </div>
      </footer>

      <AiChatWidget />

      <div className="fixed bottom-6 left-6 z-[60] flex flex-col gap-4">
        <AnimatePresence>
          {showBackToTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              onClick={scrollToTop}
              className="group rounded-2xl border border-slate-100 bg-white p-4 text-fpt-blue shadow-2xl transition-all hover:bg-fpt-blue hover:text-white"
            >
              <ArrowUp size={24} className="group-hover:-translate-y-1 transition-transform" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-none fixed right-4 top-24 z-[100] flex flex-col gap-3 md:right-6">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className="glass-card pointer-events-auto flex min-w-[280px] max-w-sm items-start gap-4 rounded-2xl border-l-4 border-fpt-orange p-4"
            >
              <div className="rounded-xl bg-orange-500 p-2.5 text-white shadow-lg shadow-orange-100">
                <Bell size={20} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-black uppercase tracking-tight text-fpt-blue">{notif.title}</h4>
                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">{notif.message}</p>
              </div>
              <button onClick={() => removeNotification(notif.id)} className="p-1 text-slate-300 hover:text-red-500">
                <X size={18} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

const NavItem = ({ to, icon: Icon, label, active }) => (
  <Link
    to={to}
    className={cn(
      'relative flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest transition-colors',
      active ? 'bg-orange-50 text-fpt-orange' : 'text-slate-500 hover:text-fpt-orange'
    )}
  >
    <Icon size={16} />
    {label}
  </Link>
)

const DesktopMenu = ({ label, icon: Icon, open, onOpen, onClose, active, children }) => (
  <div className="relative" onMouseEnter={onOpen} onMouseLeave={onClose}>
    <button
      type="button"
      className={cn(
        'flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest transition-colors',
        active ? 'bg-orange-50 text-fpt-orange' : 'text-slate-500 hover:text-fpt-orange'
      )}
    >
      <Icon size={16} />
      {label}
      <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
    </button>

    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          className="absolute left-0 top-[calc(100%+10px)] z-50 rounded-3xl border border-slate-200/80 bg-white/96 p-1.5 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.65)] backdrop-blur-xl"
        >
          <div className="absolute left-8 top-0 h-3 w-3 -translate-y-1/2 rotate-45 border-l border-t border-slate-200/80 bg-white" />
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)

const SubMenuCard = ({ item }) => (
  <Link
    to={item.to}
    className="group flex items-center gap-3 rounded-2xl border border-transparent p-3 transition-all hover:-translate-y-0.5 hover:border-orange-100 hover:bg-orange-50/60"
  >
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm transition-colors group-hover:text-fpt-orange">
      <item.icon size={18} />
    </div>
    <div>
      <p className="text-[11px] font-black uppercase tracking-widest text-slate-700 group-hover:text-fpt-blue">{item.title}</p>
      <p className="text-[11px] text-slate-400">{item.subtitle}</p>
    </div>
  </Link>
)

const DropdownHeading = ({ title, subtitle }) => (
  <div className="rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3 py-3">
    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-fpt-orange">{title}</p>
    <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">{subtitle}</p>
  </div>
)

const MobileSection = ({ title, sectionKey, openSection, onToggle, children }) => (
  <div className="mt-2 rounded-xl border border-slate-100 bg-white p-2">
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs font-black uppercase tracking-widest text-slate-700"
      onClick={() => onToggle((prev) => (prev === sectionKey ? '' : sectionKey))}
    >
      {title}
      <ChevronDown size={14} className={cn('transition-transform', openSection === sectionKey && 'rotate-180')} />
    </button>

    {openSection === sectionKey && <div className="mt-1">{children}</div>}
  </div>
)

const MobileLink = ({ to, label }) => (
  <Link
    to={to}
    className="flex items-center gap-2 rounded-lg px-2 py-2 text-[11px] font-bold text-slate-500 transition-colors hover:bg-orange-50 hover:text-fpt-orange"
  >
    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
    {label}
  </Link>
)
