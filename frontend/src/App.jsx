import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { MainLayout } from './layouts/MainLayout'
import { AdminLayout } from './layouts/AdminLayout'
import { Home } from './pages/Home'
import { PhanMonVan } from './pages/PhanMonVan'
import { PhanMonKTPL } from './pages/PhanMonKTPL'
import { AdminLogin } from './pages/Admin/Login'
import { AdminDashboard } from './pages/Admin/Dashboard'
import { AdminPublications } from './pages/Admin/Publications'
import { AdminSubmissions } from './pages/Admin/Submissions'
import { AdminUsers } from './pages/Admin/Users'

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
          <Route path="phanmon/van" element={<PageWrapper><PhanMonVan /></PageWrapper>} />
          <Route path="phanmon/ktpl" element={<PageWrapper><PhanMonKTPL /></PageWrapper>} />
          <Route path="ngoaikhoa" element={<div className="text-center py-20 text-gray-500 font-black italic">Trang Ngoại khoá đang cập nhật...</div>} />
          <Route path="lienhe" element={<div className="text-center py-20 text-gray-500 font-black italic">Trang Liên hệ đang cập nhật...</div>} />
        </Route>
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<PageWrapper><AdminDashboard /></PageWrapper>} />
          <Route path="publications" element={<PageWrapper><AdminPublications /></PageWrapper>} />
          <Route path="submissions" element={<PageWrapper><AdminSubmissions /></PageWrapper>} />
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
  if (!token) return <Navigate to="/admin/login" replace />
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
