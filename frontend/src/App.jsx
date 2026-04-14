import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { lazy, Suspense, useEffect } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { AdminPostDesigner } from '@/pages/Admin/PostDesigner'

const lazyNamed = (importer, name) =>
  lazy(() => importer().then((module) => ({ default: module[name] })))

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
const AdminEvents = lazyNamed(() => import('@/pages/Admin/Events'), 'AdminEvents')
const AdminStories = lazyNamed(() => import('@/pages/Admin/Stories'), 'AdminStories')
const AdminSubmissions = lazyNamed(() => import('@/pages/Admin/Submissions'), 'AdminSubmissions')
const AdminUsers = lazyNamed(() => import('@/pages/Admin/Users'), 'AdminUsers')
const AdminCMSEditorFramework = lazyNamed(() => import('@/pages/Admin/CMSEditorFramework'), 'AdminCMSEditorFramework')

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

const RouteLoading = () => (
  <div className="min-h-[45vh] flex items-center justify-center">
    <div className="surface px-6 py-4 text-xs font-black uppercase tracking-widest text-fpt-blue">
      Đang tải trang...
    </div>
  </div>
)

const AnimatedRoutes = () => {
  const location = useLocation()
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<PageWrapper><Home /></PageWrapper>} />

          <Route path="nhanvat/scale" element={<PageWrapper><GioiThieuQuyMo /></PageWrapper>} />
          <Route path="nhanvat/staff" element={<PageWrapper><GioiThieuDoiNgu /></PageWrapper>} />
          <Route path="events/upcoming" element={<PageWrapper><EventsUpcoming /></PageWrapper>} />
          <Route path="stories/inspiring" element={<PageWrapper><StoriesInspiring /></PageWrapper>} />
          <Route path="stories/inspiring/:storyId" element={<PageWrapper><StoryDetail /></PageWrapper>} />
          <Route path="posts/:postId" element={<PageWrapper><PublicPostDetail /></PageWrapper>} />
          <Route path="nhanvat/honors" element={<PageWrapper><HonorsYearly /></PageWrapper>} />

          <Route path="phanmon/van" element={<PageWrapper><PhanMonVan /></PageWrapper>} />
          <Route path="phanmon/ktpl" element={<PageWrapper><PhanMonKTPL /></PageWrapper>} />
          <Route path="phanmon/lich-su" element={<PageWrapper><PhanMonLichSu /></PageWrapper>} />
          <Route path="phanmon/dia-li" element={<PageWrapper><PhanMonDiaLi /></PageWrapper>} />
          <Route path="phanmon/vovinam" element={<PageWrapper><PhanMonVovinam /></PageWrapper>} />

          <Route path="phanmon/:subject/:contentType" element={<PageWrapper><SubjectContentHub /></PageWrapper>} />

          <Route path="gioithieu/quy-mo" element={<PageWrapper><GioiThieuQuyMo /></PageWrapper>} />
          <Route path="gioithieu/doi-ngu" element={<PageWrapper><GioiThieuDoiNgu /></PageWrapper>} />

          <Route path="gioithieu/*" element={<Navigate to="/nhanvat/scale" replace />} />
          <Route path="sukien/*" element={<Navigate to="/events/upcoming" replace />} />
          <Route path="cau-chuyen/*" element={<Navigate to="/stories/inspiring" replace />} />
          <Route path="nhanvat/*" element={<Navigate to="/nhanvat/scale" replace />} />
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
          <Route path="publications" element={<PageWrapper><AdminPublications /></PageWrapper>} />
          <Route path="publications/new" element={<PageWrapper><AdminPostDesigner /></PageWrapper>} />
          <Route path="publications/:publicationId/edit" element={<PageWrapper><AdminPostDesigner /></PageWrapper>} />
          <Route path="events" element={<PageWrapper><AdminEvents /></PageWrapper>} />
          <Route path="cms" element={<Navigate to="/admin/cms/stories" replace />} />
          <Route path="cms/stories" element={<PageWrapper><AdminStories /></PageWrapper>} />
          <Route path="cms/nhanvat" element={<PageWrapper><AdminNhanVatCMS /></PageWrapper>} />
          <Route path="cms/submissions" element={<PageWrapper><AdminSubmissions /></PageWrapper>} />
          <Route path="stories" element={<Navigate to="/admin/cms/stories" replace />} />
          <Route path="nhanvat" element={<Navigate to="/admin/cms/nhanvat" replace />} />
          <Route path="submissions" element={<Navigate to="/admin/cms/submissions" replace />} />
          <Route path="users" element={<PageWrapper><AdminUsers /></PageWrapper>} />
          <Route path="cms-editor" element={<PageWrapper><AdminCMSEditorFramework /></PageWrapper>} />
          <Route path="ai-knowledge" element={<div className="text-center py-20 text-gray-500 font-black italic">Tính năng AI Knowledge đang phát triển...</div>} />
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

  if (!token || role !== 'admin') return <Navigate to="/login" replace />
  return children
}

const UserProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return children
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
      <Suspense fallback={<RouteLoading />}>
        <AnimatedRoutes />
      </Suspense>
    </BrowserRouter>
  )
}

export default App
