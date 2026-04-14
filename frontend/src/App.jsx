import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { MainLayout } from '@/layouts/MainLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Home } from '@/pages/Home'
import { PhanMonVan } from '@/pages/PhanMonVan'
import { PhanMonKTPL } from '@/pages/PhanMonKTPL'
import { PhanMonLichSu } from '@/pages/PhanMonLichSu'
import { PhanMonDiaLi } from '@/pages/PhanMonDiaLi'
import { PhanMonVovinam } from '@/pages/PhanMonVovinam'
import { GioiThieuQuyMo } from '@/pages/GioiThieuQuyMo'
import { GioiThieuDoiNgu } from '@/pages/GioiThieuDoiNgu'
import { EventsUpcoming } from '@/pages/EventsUpcoming'
import { StoriesInspiring } from '@/pages/StoriesInspiring'
import { SubjectContentHub } from '@/pages/SubjectContentHub'
import { HonorsYearly } from '@/pages/HonorsYearly'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Profile } from '@/pages/Profile'
import { VerifyEmail } from '@/pages/VerifyEmail'
import { AdminDashboard } from '@/pages/Admin/Dashboard'
import { AdminNhanVatCMS } from '@/pages/Admin/NhanVatCMS'
import { AdminPublications } from '@/pages/Admin/Publications'
import { AdminEvents } from '@/pages/Admin/Events'
import { AdminStories } from '@/pages/Admin/Stories'
import { AdminSubmissions } from '@/pages/Admin/Submissions'
import { AdminUsers } from '@/pages/Admin/Users'

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

          <Route path="nhanvat/scale" element={<PageWrapper><GioiThieuQuyMo /></PageWrapper>} />
          <Route path="nhanvat/staff" element={<PageWrapper><GioiThieuDoiNgu /></PageWrapper>} />
          <Route path="events/upcoming" element={<PageWrapper><EventsUpcoming /></PageWrapper>} />
          <Route path="stories/inspiring" element={<PageWrapper><StoriesInspiring /></PageWrapper>} />
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
          <Route path="events" element={<PageWrapper><AdminEvents /></PageWrapper>} />
          <Route path="cms" element={<Navigate to="/admin/cms/stories" replace />} />
          <Route path="cms/stories" element={<PageWrapper><AdminStories /></PageWrapper>} />
          <Route path="cms/nhanvat" element={<PageWrapper><AdminNhanVatCMS /></PageWrapper>} />
          <Route path="cms/submissions" element={<PageWrapper><AdminSubmissions /></PageWrapper>} />
          <Route path="stories" element={<Navigate to="/admin/cms/stories" replace />} />
          <Route path="nhanvat" element={<Navigate to="/admin/cms/nhanvat" replace />} />
          <Route path="submissions" element={<Navigate to="/admin/cms/submissions" replace />} />
          <Route path="users" element={<PageWrapper><AdminUsers /></PageWrapper>} />
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
      <AnimatedRoutes />
    </BrowserRouter>
  )
}

export default App
