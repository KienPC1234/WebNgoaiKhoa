import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { lazy, Suspense, useEffect, useState } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { AdminPostDesigner } from '@/pages/Admin/PostDesigner'
import { NotificationPermissionPrompt } from '@/components/NotificationPermissionPrompt'

const MissingLazyComponent = ({ componentName }) => (
  <div className="p-6 text-sm font-semibold text-red-600">
    Không tải được component: {componentName}
  </div>
)

const lazyNamed = (importer, name) =>
  lazy(() =>
    importer().then((module) => {
      const resolved = module?.[name] || module?.default
      if (resolved) {
        return { default: resolved }
      }

      console.error(`[App] Missing lazy export: ${name}`)
      return {
        default: () => <MissingLazyComponent componentName={name} />,
      }
    })
  )

const MainLayout = lazyNamed(() => import('@/layouts/MainLayout'), 'MainLayout')
const AdminLayout = lazyNamed(() => import('@/layouts/AdminLayout'), 'AdminLayout')

const Home = lazyNamed(() => import('@/pages/Home'), 'Home')
const PhanMonVan = lazyNamed(() => import('@/pages/PhanMonVan'), 'PhanMonVan')
const PhanMonKTPL = lazyNamed(() => import('@/pages/PhanMonKTPL'), 'PhanMonKTPL')
const PhanMonLichSu = lazyNamed(() => import('@/pages/PhanMonLichSu'), 'PhanMonLichSu')
const PhanMonDiaLi = lazyNamed(() => import('@/pages/PhanMonDiaLi'), 'PhanMonDiaLi')
const PhanMonVovinam = lazyNamed(() => import('@/pages/PhanMonVovinam'), 'PhanMonVovinam')
const GioiThieuQuyMo = lazyNamed(() => import('@/pages/GioiThieuQuyMo'), 'GioiThieuQuyMo')
const GioiThieuDoiNgu = lazyNamed(() => import('@/pages/GioiThieuDoiNgu'), 'GioiThieuDoiNgu')
const EventsUpcoming = lazyNamed(() => import('@/pages/EventsUpcoming'), 'EventsUpcoming')
const StoriesInspiring = lazyNamed(() => import('@/pages/StoriesInspiring'), 'StoriesInspiring')
const StoryDetail = lazyNamed(() => import('@/pages/StoryDetail'), 'StoryDetail')
const SubjectContentHub = lazyNamed(() => import('@/pages/SubjectContentHub'), 'SubjectContentHub')
const HonorsYearly = lazyNamed(() => import('@/pages/HonorsYearly'), 'HonorsYearly')
const PublicPostDetail = lazyNamed(() => import('@/pages/PublicPostDetail'), 'PublicPostDetail')
const Login = lazyNamed(() => import('@/pages/Login'), 'Login')
const Register = lazyNamed(() => import('@/pages/Register'), 'Register')
const Profile = lazyNamed(() => import('@/pages/Profile'), 'Profile')
const VerifyEmail = lazyNamed(() => import('@/pages/VerifyEmail'), 'VerifyEmail')

const AdminDashboard = lazyNamed(() => import('@/pages/Admin/Dashboard'), 'AdminDashboard')
const AdminNhanVatCMS = lazyNamed(() => import('@/pages/Admin/NhanVatCMS'), 'AdminNhanVatCMS')
const AdminPublications = lazyNamed(() => import('@/pages/Admin/Publications'), 'AdminPublications')
const AdminVinhDanh = lazyNamed(() => import('@/pages/Admin/VinhDanh'), 'AdminVinhDanh')
const AdminEvents = lazyNamed(() => import('@/pages/Admin/Events'), 'AdminEvents')
const AdminSubmissions = lazyNamed(() => import('@/pages/Admin/Submissions'), 'AdminSubmissions')
const AdminUsers = lazyNamed(() => import('@/pages/Admin/Users'), 'AdminUsers')
const AdminAIKnowledge = lazyNamed(() => import('@/pages/Admin/AIKnowledge'), 'AdminAIKnowledge')
const AdminCMSEditorFramework = lazyNamed(() => import('@/pages/Admin/CMSEditorFramework'), 'AdminCMSEditorFramework')
const AdminAuthOverview = lazyNamed(() => import('@/pages/Admin/AuthOverview'), 'AuthOverview')

const ADMIN_PANEL_ROLES = new Set(['admin', 'website_manager', 'submission_judge'])
const WEBSITE_MANAGER_ROLES = new Set(['admin', 'website_manager'])
const SUBMISSION_REVIEW_ROLES = new Set(['admin', 'submission_judge'])

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
)


const AnimatedRoutes = () => {
  const location = useLocation()
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<PageWrapper><Home /></PageWrapper>} />

          <Route path="doingu/scale" element={<PageWrapper><GioiThieuQuyMo /></PageWrapper>} />
            <Route path="doingu/staff" element={<PageWrapper><GioiThieuDoiNgu /></PageWrapper>} />
          <Route path="events/upcoming" element={<PageWrapper><EventsUpcoming /></PageWrapper>} />
          <Route path="stories/inspiring" element={<PageWrapper><StoriesInspiring /></PageWrapper>} />
          <Route path="stories/inspiring/:storyId" element={<PageWrapper><StoryDetail /></PageWrapper>} />
          <Route path="posts/:postId" element={<PageWrapper><PublicPostDetail /></PageWrapper>} />
          <Route path="doingu/honors" element={<PageWrapper><HonorsYearly /></PageWrapper>} />

          <Route path="phanmon/van" element={<PageWrapper><PhanMonVan /></PageWrapper>} />
          <Route path="phanmon/ktpl" element={<PageWrapper><PhanMonKTPL /></PageWrapper>} />
          <Route path="phanmon/lich-su" element={<PageWrapper><PhanMonLichSu /></PageWrapper>} />
          <Route path="phanmon/dia-li" element={<PageWrapper><PhanMonDiaLi /></PageWrapper>} />
          <Route path="phanmon/vovinam" element={<PageWrapper><PhanMonVovinam /></PageWrapper>} />

          <Route path="phanmon/:subject/:contentType" element={<PageWrapper><SubjectContentHub /></PageWrapper>} />

          <Route path="gioithieu/quy-mo" element={<PageWrapper><GioiThieuQuyMo /></PageWrapper>} />
          <Route path="gioithieu/doi-ngu" element={<PageWrapper><GioiThieuDoiNgu /></PageWrapper>} />

          <Route path="gioithieu/*" element={<Navigate to="/doingu/scale" replace />} />
          <Route path="sukien/*" element={<Navigate to="/events/upcoming" replace />} />
          <Route path="cau-chuyen/*" element={<Navigate to="/stories/inspiring" replace />} />
          <Route path="doingu/*" element={<Navigate to="/doingu/scale" replace />} />
          <Route path="phanmon/*" element={<Navigate to="/phanmon/van/an-pham" replace />} />

          <Route path="ngoaikhoa" element={<div className="text-center py-32 text-gray-400 font-black italic uppercase tracking-widest animate-pulse">Trang Hoạt động ngoại khoá đang cập nhật...</div>} />
          <Route path="lienhe" element={<PageWrapper><EventsUpcoming /></PageWrapper>} />
        </Route>
        
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/profile" element={<UserProtectedRoute><Profile /></UserProtectedRoute>} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<PageWrapper><AdminDashboard /></PageWrapper>} />
          <Route path="publications" element={<RoleProtectedRoute allowedRoles={WEBSITE_MANAGER_ROLES}><PageWrapper><AdminPublications /></PageWrapper></RoleProtectedRoute>} />
          <Route path="vinh-danh" element={<RoleProtectedRoute allowedRoles={WEBSITE_MANAGER_ROLES}><PageWrapper><AdminVinhDanh /></PageWrapper></RoleProtectedRoute>} />
          <Route path="vinh-danh/:subject" element={<RoleProtectedRoute allowedRoles={WEBSITE_MANAGER_ROLES}><PageWrapper><AdminVinhDanh /></PageWrapper></RoleProtectedRoute>} />
          <Route path="events" element={<RoleProtectedRoute allowedRoles={WEBSITE_MANAGER_ROLES}><PageWrapper><AdminEvents /></PageWrapper></RoleProtectedRoute>} />
          <Route path="publications/new" element={<RoleProtectedRoute allowedRoles={WEBSITE_MANAGER_ROLES}><PageWrapper><AdminPostDesigner /></PageWrapper></RoleProtectedRoute>} />
          <Route path="publications/:publicationId/edit" element={<RoleProtectedRoute allowedRoles={WEBSITE_MANAGER_ROLES}><PageWrapper><AdminPostDesigner /></PageWrapper></RoleProtectedRoute>} />
          <Route path="cms/stories" element={<Navigate to="/admin/publications" replace />} />
          <Route path="cms/doingu" element={<RoleProtectedRoute allowedRoles={WEBSITE_MANAGER_ROLES}><PageWrapper><AdminNhanVatCMS /></PageWrapper></RoleProtectedRoute>} />
          <Route path="cms/submissions" element={<RoleProtectedRoute allowedRoles={SUBMISSION_REVIEW_ROLES}><PageWrapper><AdminSubmissions /></PageWrapper></RoleProtectedRoute>} />
          <Route path="cms-editor" element={<RoleProtectedRoute allowedRoles={WEBSITE_MANAGER_ROLES}><PageWrapper><AdminCMSEditorFramework /></PageWrapper></RoleProtectedRoute>} />
          <Route path="stories" element={<Navigate to="/admin/publications" replace />} />
          <Route path="doingu" element={<Navigate to="/admin/cms/doingu" replace />} />
          <Route path="submissions" element={<Navigate to="/admin/cms/submissions" replace />} />
          <Route path="users" element={<RoleProtectedRoute allowedRoles={new Set(['admin'])}><PageWrapper><AdminUsers /></PageWrapper></RoleProtectedRoute>} />
          <Route path="ai-knowledge" element={<RoleProtectedRoute allowedRoles={new Set(['admin'])}><PageWrapper><AdminAIKnowledge /></PageWrapper></RoleProtectedRoute>} />
          <Route path="auth-overview" element={<RoleProtectedRoute allowedRoles={new Set(['admin'])}><PageWrapper><AdminAuthOverview /></PageWrapper></RoleProtectedRoute>} />
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
      </Routes>
    </AnimatePresence>
  )
}

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token')

  let role = null
  try {
    const rawUser = localStorage.getItem('user')
    role = rawUser ? JSON.parse(rawUser)?.role : null
  } catch (e) {
    role = null
  }

  if (!token || !ADMIN_PANEL_ROLES.has(role)) return <Navigate to="/login" replace />
  return children
}

const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token')

  let role = null
  try {
    const rawUser = localStorage.getItem('user')
    role = rawUser ? JSON.parse(rawUser)?.role : null
  } catch (e) {
    role = null
  }

  if (!token) return <Navigate to="/login" replace />
  if (!allowedRoles?.has(role)) return <Navigate to="/admin/dashboard" replace />
  return children
}

const UserProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return children
}

const TransitionOverlay = ({ active }) => (
  <div
    className={`pointer-events-none fixed inset-0 z-[90] transition-all duration-200 ${active ? 'opacity-100' : 'opacity-0'}`}
    aria-hidden="true"
  >
    <div className="absolute left-0 top-0 h-[2px] w-full overflow-hidden bg-transparent">
      <motion.div
        className="h-full w-2/5 bg-fpt-orange shadow-[0_0_8px_rgba(242,112,36,0.8)]"
        animate={{ x: ['-42%', '158%'] }}
        transition={{ duration: 0.62, ease: 'easeOut', repeat: Infinity }}
      />
    </div>
    <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px]" />
  </div>
)

const AppShell = () => {
  const location = useLocation()
  const [isRouteTransitioning, setIsRouteTransitioning] = useState(false)

  useEffect(() => {
    window.requestAnimationFrame(() => {
      try {
        if (typeof window !== 'undefined' && window.__AI_SUPPRESS_SCROLL) {
          // AI-initiated navigation requested to skip the automatic scroll-to-top
          try { delete window.__AI_SUPPRESS_SCROLL } catch (e) {}
          return
        }
      } catch (e) {
        // ignore
      }

      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
  }, [location.pathname, location.search])

  useEffect(() => {
    setIsRouteTransitioning(true)
    const timer = setTimeout(() => {
      setIsRouteTransitioning(false)
    }, 260)

    return () => clearTimeout(timer)
  }, [location.pathname])

  return (
    <div className="relative min-h-screen">
      <div className={`transition-opacity duration-200 ${isRouteTransitioning ? 'opacity-90' : 'opacity-100'}`}>
        <Suspense fallback={null}>
          <AnimatedRoutes />
        </Suspense>
      </div>
      <TransitionOverlay active={isRouteTransitioning} />
      <NotificationPermissionPrompt />
    </div>
  )
}

function App() {
  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      easing: 'ease-out-cubic',
    });
  }, []);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppShell />
    </BrowserRouter>
  )
}

export default App
