import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Compass,
  GraduationCap,
  Sparkles,
  BarChart,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  Bell,
  X,
  Users,
  Calendar,
  BookOpen,
  Award,
  Heart,
  Menu,
  PanelRightClose,
  LogOut,
  MessageCircle,
  Trophy,
} from 'lucide-react'
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import NotificationButton from '@/components/NotificationButton'
import { cn } from '@/lib/utils'
import aiSitemap from '@/lib/aiSitemap.json'
import { roleHasPermission } from '@/lib/rolePolicy'

const AiChatWidget = lazy(() =>
  import('@/components/AiChatWidget').then((module) => ({
    default: module.AiChatWidget || module.default,
  }))
)

const introMenu = [
  {
    to: '/doingu/scale',
    title: 'Quy mô',
    subtitle: 'Sứ mệnh, quy mô và định hướng',
    icon: BarChart,
  },
  {
    to: '/doingu/staff',
    title: 'Đội ngũ',
    subtitle: 'Danh sách và hồ sơ giảng dạy',
    icon: Users,
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
    to: '/doingu/honors',
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

const subjectTextClasses = {
  'van': 'text-fpt-orange',
  'ktpl': 'text-emerald-600',
  'lich-su': 'text-amber-700',
  'dia-li': 'text-emerald-600',
  'vovinam': 'text-blue-700',
}

const subjectDescriptions = {
  'van': 'Sáng tác, cảm thụ và kỹ năng diễn đạt học thuật.',
  'ktpl': 'Kinh tế ứng dụng và hiểu biết pháp luật thực tiễn.',
  'lich-su': 'Tư duy dòng thời gian, sự kiện và phân tích tư liệu.',
  'dia-li': 'Dữ liệu không gian, bản đồ và góc nhìn toàn cầu.',
  'vovinam': 'Thể chất, kỷ luật và tinh thần võ đạo học đường.',
}

const subjectContent = [
  { label: 'Ấn phẩm học tập', slug: 'an-pham', icon: BookOpen },
  { label: 'Tài liệu tham khảo', slug: 'tai-lieu', icon: Compass },
  { label: 'Vinh danh năm học', slug: 'vinh-danh', icon: Award },
  { label: 'Cuộc thi', slug: 'cuoc-thi', icon: Award },
]

// use subject name itself as the link target (remove separate "Trang môn" entry)

const overflowMenu = [
  { to: '/events/upcoming', title: 'Sự kiện sắp tới', subtitle: 'Lịch workshop và hoạt động mới', icon: Calendar },
  { to: '/stories/inspiring', title: 'Truyền cảm hứng', subtitle: 'Câu chuyện và chia sẻ nổi bật', icon: Heart },
  { to: '/doingu/honors', title: 'Vinh danh năm học', subtitle: 'Danh sách cá nhân, tập thể tiêu biểu', icon: Award },
]

export const MainLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  // Single menu state: null | 'intro' | 'subjects' | 'more'
  const [openMenu, setOpenMenu] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSectionOpen, setMobileSectionOpen] = useState('intro')
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [isLowSpecDevice, setIsLowSpecDevice] = useState(false)
  const [isScrollPerfMode, setIsScrollPerfMode] = useState(false)
  const [pendingAiOpen, setPendingAiOpen] = useState(false)
  const [shouldMountAiWidget, setShouldMountAiWidget] = useState(false)
  const [authHoverOpen, setAuthHoverOpen] = useState(false)
  const [subjectHoverSlug, setSubjectHoverSlug] = useState(subjects[0]?.slug || 'van')
  const authCloseTimerRef = useRef(null)
  const navRef = useRef(null)
  const floatingBottom = 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)'
  const FLOATING_BOTTOM_OFFSET = 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)'

  const token = localStorage.getItem('token')
  let hasAdminPanel = false
  try {
    const rawUser = localStorage.getItem('user')
    if (rawUser) {
      const parsedUser = JSON.parse(rawUser)
      const role = parsedUser?.role
      hasAdminPanel = roleHasPermission(role, 'admin_panel')
    }
  } catch {
    hasAdminPanel = false
  }

  const isActive = (path) => location.pathname === path
  const activeSubject = location.pathname.startsWith('/phanmon')
  const activeIntro = ['/doingu/scale', '/doingu/staff', '/gioithieu/quy-mo', '/gioithieu/doi-ngu'].includes(location.pathname)
  const activeStories =
    location.pathname.startsWith('/doingu/honors') ||
    location.pathname.startsWith('/events') ||
    location.pathname.startsWith('/stories') ||
    location.pathname.startsWith('/news')

  useEffect(() => {
    const nav = typeof navigator !== 'undefined' ? navigator : null
    if (!nav) return

    const memory = Number(nav.deviceMemory || 0)
    const cores = Number(nav.hardwareConcurrency || 0)
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection
    const saveData = Boolean(connection?.saveData)
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    const lowMemory = memory > 0 && memory <= 4
    const lowCpu = cores > 0 && cores <= 4

    setIsLowSpecDevice(Boolean(lowMemory || lowCpu || saveData || prefersReducedMotion))
  }, [])

  useEffect(() => {
    let rafId = 0

    const handleScroll = () => {
      if (rafId) return
      rafId = window.requestAnimationFrame(() => {
        const nextShowValue = window.scrollY > 400
        setShowBackToTop((prev) => (prev === nextShowValue ? prev : nextShowValue))

        // Keep mode stable to avoid blur/shadow flashing while scrolling.
        // Use a small hysteresis window so the mode isn't toggled rapidly
        // when the scroll position hovers near the threshold.
        setIsScrollPerfMode((prev) => {
          const enableThreshold = 160
          const disableThreshold = 100
          const shouldEnable = Boolean(isLowSpecDevice && window.scrollY > (prev ? disableThreshold : enableThreshold))
          return prev === shouldEnable ? prev : shouldEnable
        })

        rafId = 0
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafId) window.cancelAnimationFrame(rafId)
    }
  }, [isLowSpecDevice])

  // Close dropdown when clicking outside the nav pill
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    // Notifications websocket is provided by NotificationsProvider.
    // MainLayout no longer manages its own WS to avoid creating multiple connections.
    return undefined
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
    setOpenMenu(null)
  }, [location.pathname])

  useEffect(() => {
    if (openMenu !== 'subjects') return
    const matched = subjects.find((subject) => location.pathname.startsWith(`/phanmon/${subject.slug}`))
    setSubjectHoverSlug(matched?.slug || subjects[0]?.slug || 'van')
  }, [openMenu, location.pathname])

  useEffect(() => {
    if (!mobileMenuOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    if (!mobileMenuOpen) return undefined
    const handleKey = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [mobileMenuOpen])

  useEffect(() => {
    try {
      if (localStorage.getItem('fpt_edu_ai_chat_open') === 'true') {
        setShouldMountAiWidget(true)
      }
    } catch (error) {
      // ignore storage read errors
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const handleOpenAiChat = () => {
    setShouldMountAiWidget(true)
    setPendingAiOpen(true)
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('toggle-ai-chat'))
    }, 0)
  }

  const handleNestedScroll = (event) => {
    const container = event.currentTarget
    if (container.scrollHeight <= container.clientHeight) return

    const isAtTop = container.scrollTop <= 0
    const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 1

    event.stopPropagation()

    if ((event.deltaY < 0 && isAtTop) || (event.deltaY > 0 && isAtBottom)) {
      event.preventDefault()
    }
  }

  const openAuth = () => {
    if (authCloseTimerRef.current) {
      clearTimeout(authCloseTimerRef.current)
      authCloseTimerRef.current = null
    }
    setAuthHoverOpen(true)
  }

  const scheduleCloseAuth = (delay = 250) => {
    if (authCloseTimerRef.current) clearTimeout(authCloseTimerRef.current)
    authCloseTimerRef.current = setTimeout(() => {
      setAuthHoverOpen(false)
      authCloseTimerRef.current = null
    }, delay)
  }

  const cancelCloseAuth = () => {
    if (authCloseTimerRef.current) {
      clearTimeout(authCloseTimerRef.current)
      authCloseTimerRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      if (authCloseTimerRef.current) {
        clearTimeout(authCloseTimerRef.current)
        authCloseTimerRef.current = null
      }
    }
  }, [])

  // width-sync logic removed to avoid unnecessary reflows

  return (
    <div className={cn('app-shell relative overflow-x-clip', isLowSpecDevice && 'low-spec-device', isScrollPerfMode && 'performance-scrolling')}>
      <header className={cn(
        'glass-nav top-0 z-[4000] overflow-visible sticky',
        isScrollPerfMode && 'bg-[#fffaf3]/95'
      )}>
        <div className="app-section cv-auto px-3 py-4 md:px-6 lg:px-8">
          <div ref={navRef} className={cn(
            'relative z-[4001] flex items-center justify-between gap-3 rounded-3xl border border-orange-100/90 bg-gradient-to-r from-[#fff3e2] via-[#fff7ee] to-[#fff3e2] px-5 py-3.5 md:px-6 lg:px-8',
            isScrollPerfMode
              ? 'shadow-[0_10px_30px_-24px_rgba(15,23,42,0.25)]'
              : 'shadow-[0_20px_52px_-38px_rgba(15,23,42,0.35)]'
          )}>
            <Link to="/" className="group flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-orange-100 bg-[#fff9f1] shadow-[0_14px_28px_-18px_rgba(242,112,36,0.85)] transition-transform group-hover:scale-105">
                <img src="/favicon.svg" alt="Logo Tổ xã hội" className="h-7 w-7 object-contain" />
              </div>
              <div className="space-y-0.5">
                <p className="font-display text-lg font-extrabold uppercase tracking-tight text-fpt-blue md:text-xl">Tổ xã hội FSC Hoà Lạc</p>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-fpt-orange md:text-[11px]">Deep learning with love</p>
              </div>
            </Link>

            <nav className="hidden min-w-0 flex-1 items-center gap-2 whitespace-nowrap px-2 2xl:flex">
              <NavItem to="/" label="Trang chủ" icon={Home} active={isActive('/')} />

              <DesktopMenu
                label="Giới thiệu"
                icon={Sparkles}
                menuKey="intro"
                openMenu={openMenu}
                onOpen={setOpenMenu}
                onClose={() => setOpenMenu(null)}
                active={activeIntro}
              >
                <div className="w-[min(360px,calc(100vw-2.5rem))] space-y-2 p-2">
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
                menuKey="subjects"
                openMenu={openMenu}
                onOpen={setOpenMenu}
                onClose={() => setOpenMenu(null)}
                active={activeSubject}
                align="center"
              >
                <SubjectNestedMenu
                  subjects={subjects}
                  subjectContent={subjectContent}
                  subjectTextClasses={subjectTextClasses}
                  activeSlug={subjectHoverSlug}
                  onHover={setSubjectHoverSlug}
                />
              </DesktopMenu>

              <NavItem to="/cuoc-thi" label="Cuộc thi" icon={Trophy} active={isActive('/cuoc-thi')} />

              <DesktopMenu
                label="Tin tức"
                icon={Menu}
                menuKey="more"
                openMenu={openMenu}
                onOpen={setOpenMenu}
                onClose={() => setOpenMenu(null)}
                active={activeStories}
                align="right"
                onPrimaryClick={() => navigate('/news')}
              >
                <div className="w-[min(380px,calc(100vw-2.5rem))] space-y-2 p-2">
                  {overflowMenu.map((item) => (
                    <SubMenuCard key={item.to} item={item} />
                  ))}
                </div>
              </DesktopMenu>
            </nav>

            <div className="flex shrink-0 items-center gap-2 md:gap-2.5">
              {token && hasAdminPanel && (
                <Link to="/admin/dashboard" className="btn-ghost hidden 2xl:inline-flex">
                  Admin
                </Link>
              )}

              {token ? (
                <>
                  <Link to="/profile" className="btn-ghost hidden 2xl:inline-flex">
                    Hồ sơ
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="hidden 2xl:inline-flex h-10 w-10 items-center justify-center rounded-xl border border-orange-100 bg-[#fff9f1] text-slate-700 transition-colors hover:bg-orange-50 hover:text-fpt-orange"
                    title="Đăng xuất"
                  >
                    <LogOut size={16} />
                  </button>
                </>
              ) : (
                <>
                  <div
                    className="relative hidden 2xl:inline-flex"
                    onMouseEnter={openAuth}
                    onMouseLeave={() => scheduleCloseAuth()}
                    onFocus={openAuth}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) scheduleCloseAuth()
                    }}
                  >
                    <Link to="/register" className="btn-primary whitespace-nowrap">
                      Đăng ký
                    </Link>
                    {authHoverOpen && (
                      <div
                        className="absolute top-full mt-3 right-0 z-[4002] pointer-events-auto animate-[fadeInMenu_180ms_ease-out]"
                        onMouseEnter={cancelCloseAuth}
                        onMouseLeave={() => scheduleCloseAuth()}
                      >
                        <div className="rounded-xl border border-transparent bg-transparent p-1 min-w-max pointer-events-auto shadow-sm">
                          <Link to={{ pathname: '/login', state: { from: location.pathname } }} className="btn-ghost block text-left px-4 py-2 whitespace-nowrap">
                            Đăng nhập
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={handleOpenAiChat}
                className="tap-target hidden 2xl:inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/90 px-4 py-2 text-[11px] font-black uppercase tracking-[0.11em] text-fpt-orange transition-all hover:bg-orange-50"
              >
                <Sparkles size={16} />
                AI Chat
              </button>

              <div className="hidden 2xl:inline-flex">
                <NotificationButton />
              </div>

              <button
                type="button"
                className="tap-target inline-flex h-11 w-11 items-center justify-center rounded-xl border border-orange-100 bg-[#fff9f1] text-slate-700 2xl:hidden"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
              >
                {mobileMenuOpen ? <PanelRightClose size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu moves to a fixed overlay below the header so it is always visible
            even when the page is scrolled. The overlay includes a backdrop that closes
            the menu when clicked. */}
      </header>

      {mobileMenuOpen && (
          <div
            key="mobile-menu-overlay"
            className="fixed inset-0 z-[4002] 2xl:hidden animate-[fadeInMenu_180ms_ease-out]"
          >
            <div className={cn('absolute inset-0 bg-black/30', isLowSpecDevice ? 'backdrop-blur-0' : 'backdrop-blur-sm')} onClick={() => setMobileMenuOpen(false)} />

            <div className="absolute inset-x-0 top-12 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain pb-6 animate-[slideInMenu_190ms_ease-out]">
              <div className="app-section custom-scrollbar">
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
                    onClick={() => setMobileMenuOpen(false)}
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
                    <div
                      className="custom-scrollbar max-h-[42dvh] overflow-y-auto overscroll-contain pr-1"
                      onWheel={handleNestedScroll}
                    >
                      {subjects.map((subject) => (
                        <div key={subject.slug} className="mb-2 rounded-xl border border-slate-100 bg-slate-50/80 p-2">
                          <p className="mb-1 px-2 text-[10px] font-black uppercase tracking-widest text-fpt-blue">
                            {subject.name}
                          </p>
                          {subjectContent.map((content) => (
                            <MobileLink
                              key={`${subject.slug}-${content.slug}`}
                              to={`/phanmon/${subject.slug}/${content.slug}`}
                              label={content.label}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </MobileSection>

                  <Link
                    to="/cuoc-thi"
                    className={cn(
                      'mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold',
                      isActive('/cuoc-thi') ? 'bg-orange-50 text-fpt-orange' : 'text-slate-600'
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Trophy size={16} />
                    Cuộc thi
                  </Link>

                  <MobileSection
                    title="Tin tức"
                    sectionKey="more"
                    openSection={mobileSectionOpen}
                    onToggle={setMobileSectionOpen}
                  >
                    <MobileLink to="/news" label="Tất cả tin tức" />
                    {overflowMenu.map((item) => (
                      <MobileLink key={item.to} to={item.to} label={item.title} />
                    ))}
                  </MobileSection>

                  <div className="mt-3 flex gap-2">
                    {token && hasAdminPanel && (
                      <Link to="/admin/dashboard" className="btn-ghost flex-1" onClick={() => setMobileMenuOpen(false)}>
                        Admin Panel
                      </Link>
                    )}

                    {token ? (
                      <>
                        <Link to="/profile" className="btn-ghost flex-1" onClick={() => setMobileMenuOpen(false)}>
                          Hồ sơ
                        </Link>
                        <button type="button" onClick={() => { handleLogout(); setMobileMenuOpen(false) }} className="btn-ghost">
                          <LogOut size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Link to={{ pathname: '/login', state: { from: location.pathname } }} className="btn-ghost flex-1" onClick={() => setMobileMenuOpen(false)}>
                              Đăng nhập
                            </Link>
                        <Link to="/register" className="btn-primary flex-1" onClick={() => setMobileMenuOpen(false)}>
                          Đăng ký
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className={cn(
        'mt-20 border-t border-slate-200/70 bg-white/60 py-14 backdrop-blur-sm',
        isScrollPerfMode && 'bg-white/90 backdrop-blur-0'
      )}>
        <div className="app-section">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-orange-100 bg-white">
                  <img src="/favicon.svg" alt="Logo Tổ xã hội" className="h-5 w-5 object-contain" />
                </div>
                <span className="font-display text-xl font-extrabold uppercase tracking-tight text-fpt-blue">Tổ xã hội FSC Hoà Lạc</span>
              </div>
              <p className="max-w-lg text-sm leading-relaxed text-slate-600">
                Nền tảng kết nối tri thức và phát triển kỹ năng toàn diện cho học sinh, sinh viên FPT Education.
              </p>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-fpt-orange">Deep learning with love</p>

              <a
                href="https://www.facebook.com/toxahoifschoolhoalac"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex max-w-md items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800">Tổ xã hội FSC Hoà Lạc</p>
                  <p className="text-xs text-slate-500">Theo dõi trên Facebook</p>
                </div>
              </a>
            </div>

            <div>
              <h4 className="mb-3 text-xs font-black uppercase tracking-widest text-fpt-blue">Khám phá</h4>
              <ul className="space-y-2 text-sm font-semibold text-slate-500">
                {aiSitemap && aiSitemap.slice(0, 6).map((item) => (
                  <li key={item.path}>
                    <Link to={item.path} className="hover:text-fpt-orange">{item.title}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-3 text-xs font-black uppercase tracking-widest text-fpt-blue">Phân môn</h4>
              <ul className="space-y-2 text-sm font-semibold text-slate-500">
                {subjects.map((s) => (
                  <li key={s.slug}>
                    <Link to={`/phanmon/${s.slug}`} className="hover:text-fpt-orange">{s.name}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-3 text-xs font-black uppercase tracking-widest text-fpt-blue">Hệ thống</h4>
              <ul className="space-y-2 text-sm font-semibold text-slate-500">
                <li><Link to={token ? '/profile' : { pathname: '/login', state: { from: location.pathname } }} className="hover:text-fpt-orange">{token ? 'Hồ sơ' : 'Đăng nhập'}</Link></li>
                <li><Link to="/dieu-khoan" className="hover:text-fpt-orange">Điều khoản sử dụng</Link></li>
                <li><Link to="/bao-mat" className="hover:text-fpt-orange">Chính sách bảo mật</Link></li>
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

      {!shouldMountAiWidget && (
        <div className="fixed right-3 z-[5000] sm:right-4 md:right-6" style={{ bottom: floatingBottom }}>
          <button
            type="button"
            onClick={handleOpenAiChat}
            className="tap-target group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-fpt-orange via-orange-500 to-amber-500 p-0 text-white shadow-[0_16px_48px_-12px_rgba(242,112,36,0.7)] transition-all duration-300 hover:scale-110 hover:shadow-[0_24px_64px_-8px_rgba(242,112,36,0.9)] active:scale-95 sm:h-16 sm:w-16"
            aria-label="Mở trợ lý AI"
          >
            {/* Breathing glow effect */}
            <span className="pointer-events-none absolute -inset-3 rounded-full bg-gradient-to-r from-orange-400 via-fpt-orange to-amber-400 opacity-40 blur-xl animate-[breathe_3s_ease-in-out_infinite]" />
            
            {/* Subtle ring */}
            <span className="pointer-events-none absolute -inset-1 rounded-full border border-white/20" />
            
            {/* Glass highlight */}
            <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/25 via-white/5 to-transparent" />

            {/* Icon */}
            <Sparkles
              size={26}
              className="relative z-10 drop-shadow-[0_2px_6px_rgba(0,0,0,0.2)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12 sm:h-7 sm:w-7"
              strokeWidth={2}
            />

            {/* Tooltip */}
            <span className="pointer-events-none absolute -left-[8rem] top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-xl bg-white/95 px-4 py-2 text-[11px] font-bold text-fpt-orange shadow-lg backdrop-blur-sm transition-all duration-200 group-hover:-translate-x-1 lg:block">
              Chat với AI
              <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rotate-45 bg-white/95" />
            </span>
          </button>
        </div>
      )}

      {shouldMountAiWidget && (
        <Suspense fallback={null}>
          <AiChatWidget pendingOpen={pendingAiOpen} onPendingOpenHandled={() => setPendingAiOpen(false)} />
        </Suspense>
      )}

      <div className="fixed left-3 z-[60] flex flex-col gap-4 sm:left-4 md:left-6" style={{ bottom: floatingBottom }}>
        {showBackToTop && (
          <button
            onClick={scrollToTop}
            className={cn(
              'group rounded-2xl border border-orange-100 bg-white/90 p-3 text-fpt-orange transition-all hover:bg-fpt-orange hover:text-white sm:p-4 animate-[fadeInMenu_160ms_ease-out]',
              isScrollPerfMode
                ? 'shadow-[0_10px_28px_-16px_rgba(242,112,36,0.25)] backdrop-blur-0'
                : 'shadow-[0_20px_40px_-12px_rgba(242,112,36,0.3)] backdrop-blur-md'
            )}
          >
            <ArrowUp size={22} className="transition-transform group-hover:-translate-y-1 sm:h-6 sm:w-6" />
          </button>
        )}
      </div>

      <style>{`@keyframes fadeInMenu { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } } @keyframes slideInMenu { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Toast toasts are rendered by NotificationsProvider via context; keep layout lean here. */}
    </div>
  )
}

const NavItem = ({ to, icon: Icon, label, active }) => (
  <Link
    to={to}
    className={cn(
      'tap-target relative shrink-0 flex items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.11em] transition-colors',
      active
        ? 'border-orange-200 bg-orange-100/80 text-fpt-orange'
        : 'border-orange-200 bg-transparent text-slate-600 hover:border-orange-200 hover:bg-orange-50/70 hover:text-fpt-orange'
    )}
  >
    <Icon size={16} />
    {label}
  </Link>
)

const MENU_CLOSE_DELAY_MS = 300

const DesktopMenu = ({ label, icon: Icon, menuKey, openMenu, onOpen, onClose, active, children, align = 'left', onPrimaryClick }) => {
  const closeTimerRef = useRef(null)

  const cancelScheduledClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const scheduleClose = () => {
    cancelScheduledClose()
    closeTimerRef.current = setTimeout(() => {
      onClose()
      closeTimerRef.current = null
    }, MENU_CLOSE_DELAY_MS)
  }

  useEffect(() => {
    return () => {
      cancelScheduledClose()
    }
  }, [])

  const handleDropdownWheel = (event) => {
    const container = event.currentTarget
    if (container.scrollHeight <= container.clientHeight) return

    const isAtTop = container.scrollTop <= 0
    const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 1

    event.stopPropagation()

    if ((event.deltaY < 0 && isAtTop) || (event.deltaY > 0 && isAtBottom)) {
      event.preventDefault()
    }
  }

  return (
  <div
    className="relative shrink-0"
    onMouseEnter={() => {
      cancelScheduledClose()
      onOpen(menuKey)
    }}
    onMouseLeave={scheduleClose}
    onFocusCapture={() => {
      cancelScheduledClose()
      onOpen(menuKey)
    }}
    onBlurCapture={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        scheduleClose()
      }
    }}
  >
    <button
      type="button"
      aria-expanded={openMenu === menuKey}
      aria-haspopup="menu"
      onClick={onPrimaryClick}
      className={cn(
        'tap-target flex items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.11em] transition-colors',
        onPrimaryClick && 'cursor-pointer',
        (active || openMenu === menuKey)
          ? 'border-orange-200 bg-orange-100/80 text-fpt-orange'
          : 'border-orange-200 bg-transparent text-slate-600 hover:border-orange-200 hover:bg-orange-50/70 hover:text-fpt-orange'
      )}
    >
      <Icon size={16} />
      {label}
      <ChevronDown size={14} className={cn('transition-transform', openMenu === menuKey && 'rotate-180')} />
    </button>

    {openMenu === menuKey && (
      <div
        onMouseEnter={cancelScheduledClose}
        onMouseLeave={scheduleClose}
        onWheel={handleDropdownWheel}
        className={cn(
          'custom-scrollbar absolute top-[calc(100%+12px)] z-[4002] max-h-[78vh] max-w-[calc(100vw-2rem)] overflow-x-auto overflow-y-auto overscroll-contain rounded-[1.4rem] border border-orange-100/90 bg-[#fffaf3] p-2 shadow-[0_32px_72px_-42px_rgba(15,23,42,0.7)] origin-top animate-[fadeInMenu_180ms_ease-out]',
          align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0'
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fpt-orange via-orange-300 to-fpt-blue" />
        <div className={cn(
          'absolute top-0 h-3 w-3 -translate-y-1/2 rotate-45 border-l border-t border-orange-100/90 bg-[#fffaf3]',
          align === 'right' ? 'right-8' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-8'
        )} />
        {children}
      </div>
    )}
  </div>
)
}

const SubjectNestedMenu = ({ subjects, subjectContent, subjectTextClasses, activeSlug, onHover }) => {
  const activeSubject = subjects.find((subject) => subject.slug === activeSlug) || subjects[0]

  return (
    <div className="w-[min(700px,calc(100vw-2.5rem))] p-3">
      <DropdownHeading
        title="Chuyên môn"
        subtitle="Chọn môn ở cột trái, nội dung chuyên biệt sẽ hiện ở cột phải"
      />

      <div className="mt-3 grid grid-cols-[220px_minmax(0,1fr)] gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-2">
          <div className="space-y-1">
            {subjects.map((subject) => {
              const isActive = subject.slug === activeSubject?.slug
              return (
                <Link
                  key={subject.slug}
                  to={`/phanmon/${subject.slug}`}
                  onMouseEnter={() => onHover(subject.slug)}
                  onFocus={() => onHover(subject.slug)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-wider transition-all',
                    isActive
                      ? 'border-orange-200 bg-orange-50 text-fpt-orange'
                      : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                  )}
                >
                  <span>{subject.name}</span>
                  <ChevronRight size={14} className={cn('transition-transform', isActive && 'translate-x-0.5')} />
                </Link>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3">
          <div className="mb-3 border-b border-slate-200 pb-2">
            <p className={cn(
              'text-[11px] font-black uppercase tracking-[0.16em]',
              subjectTextClasses[activeSubject?.slug] || 'text-fpt-blue'
            )}>
              {activeSubject?.name}
            </p>
            <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-500">
              {subjectDescriptions[activeSubject?.slug] || 'Kho nội dung theo môn học.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {subjectContent.map((content) => (
              <Link
                key={`${activeSubject?.slug}-${content.slug}`}
                to={`/phanmon/${activeSubject?.slug}/${content.slug}`}
                className="group flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50 hover:text-fpt-orange"
              >
                <content.icon size={14} className="text-slate-400 transition-colors group-hover:text-fpt-orange" />
                <span>{content.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const SubMenuCard = ({ item }) => (
  <Link
    to={item.to}
    className="group flex items-center gap-3 rounded-xl border border-transparent p-3 transition-all hover:-translate-y-0.5 hover:border-slate-200 hover:bg-slate-50"
  >
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-400 shadow-[0_10px_20px_-14px_rgba(15,23,42,0.6)] transition-colors group-hover:text-fpt-orange">
      <item.icon size={18} />
    </div>
    <div>
      <p className="text-[11px] font-black uppercase tracking-widest text-slate-700 group-hover:text-fpt-blue">{item.title}</p>
      <p className="text-[11px] text-slate-400">{item.subtitle}</p>
    </div>
  </Link>
)

const DropdownHeading = ({ title, subtitle }) => (
  <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2.5">
    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-fpt-orange">{title}</p>
    <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-500">{subtitle}</p>
  </div>
)

const MobileSection = ({ title, sectionKey, openSection, onToggle, children }) => (
  <div className="mt-2 rounded-xl border border-slate-100 bg-white p-2">
    <button
      type="button"
      className="tap-target flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs font-black uppercase tracking-widest text-slate-700"
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
