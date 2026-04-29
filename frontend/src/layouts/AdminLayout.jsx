import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Send,
  Database,
  CalendarDays,
  Sparkles,
  Award,
  LogOut,
  Bell,
  User,
  Shield,
  Users2,
  ChevronDown,
  FolderKanban,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/components/UI'
import NotificationButton from '@/components/NotificationButton'
import { roleHasPermission } from '@/lib/rolePolicy'

export const AdminLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  let currentUser = null
  try {
    currentUser = JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    currentUser = null
  }
  const currentRole = currentUser?.role || ''
  const isSuperAdmin = roleHasPermission(currentRole, 'admin')
  const canManageWebsite = isSuperAdmin || roleHasPermission(currentRole, 'content_manage')
  const canReviewSubmissions = isSuperAdmin || roleHasPermission(currentRole, 'submission_review')
  const isCmsRoute =
    location.pathname.startsWith('/admin/cms-editor') ||
    location.pathname.startsWith('/admin/doingu') ||
    location.pathname.startsWith('/admin/submissions') ||
    location.pathname.startsWith('/admin/publications')
  const isPublicationsRoute = location.pathname.startsWith('/admin/publications')
  const [publicationsOpen, setPublicationsOpen] = useState(isPublicationsRoute)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const menuItems = [
    { title: 'Bảng điều khiển', path: '/admin/dashboard', icon: LayoutDashboard },
    ...(canManageWebsite ? [
      { title: 'Sự kiện', path: '/admin/events', icon: CalendarDays },
    ] : []),
    ...(isSuperAdmin ? [
      { title: 'Người dùng', path: '/admin/users', icon: User },
      { title: 'Phân quyền hệ thống', path: '/admin/auth-overview', icon: Shield },
      { title: 'Kho tri thức AI', path: '/admin/ai-knowledge', icon: Database },
    ] : []),
  ]

  const subjectItems = [
    { title: 'Ngữ văn', path: '/admin/publications?subject=van' },
    { title: 'KTPL', path: '/admin/publications?subject=ktpl' },
    { title: 'Lịch sử', path: '/admin/publications?subject=lich-su' },
    { title: 'Địa lí', path: '/admin/publications?subject=dia-li' },
    { title: 'Vovinam', path: '/admin/publications?subject=vovinam' },
    { title: 'Câu chuyện', path: '/admin/publications?entity=story' },
  ]

  const cmsItems = [
    ...(canManageWebsite ? [{ title: 'Tất cả bài viết', path: '/admin/publications', icon: FileText }] : []),
    ...(canManageWebsite ? [{ title: 'Vinh danh', path: '/admin/vinh-danh', icon: Award }] : []),
    ...(canManageWebsite ? [{ title: 'Đội ngũ', path: '/admin/doingu', icon: Users2 }] : []),
    ...(canReviewSubmissions ? [{ title: 'Duyệt bài', path: '/admin/submissions', icon: Send }] : []),
    ...(canManageWebsite ? [{ title: 'CMS Editor', path: '/admin/cms-editor', icon: Sparkles }] : []),
  ]

  const isActive = (path) => location.pathname === path

  const activeTitle = () => {
    if (location.pathname.startsWith('/admin/publications')) return 'Nội dung tổng hợp'
    if (location.pathname.startsWith('/admin/events')) return 'Sự kiện'
    if (location.pathname.startsWith('/admin/cms-editor')) return 'CMS Editor'
    if (location.pathname.startsWith('/admin/doingu')) return 'Đội ngũ'
    if (location.pathname.startsWith('/admin/submissions')) return 'Duyệt bài'
    if (location.pathname.startsWith('/admin/auth-overview')) return 'Phân quyền hệ thống'

    const matched = menuItems.find((item) => isActive(item.path))
    return matched?.title || 'Quản trị'
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="border-b border-slate-100 px-6 py-5">
          <Link to="/" className="flex items-center gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700">
              <Shield size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-none tracking-tight text-slate-900">Admin Panel</span>
              <span className="text-[11px] font-medium text-slate-500">WebNgoaiKhoa</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-2 px-3 py-4">
          <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">Menu chính</p>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileSidebarOpen(false)}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive(item.path)
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <item.icon size={18} className={cn('transition-colors', isActive(item.path) ? 'text-white' : 'text-slate-400 group-hover:text-slate-700')} />
              {item.title}
            </Link>
          ))}

          {cmsItems.length > 0 && (
            <div className="pt-3">
              <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">Nội dung CMS</p>
              <div className="ml-3 mt-2 space-y-1 border-l border-slate-200 pl-2">
                {cmsItems.map((item) => {
                  if (item.path === '/admin/publications') {
                    const parentActive = location.pathname.startsWith('/admin/publications')
                    return (
                      <div key={item.path} className="space-y-1">
                        <div
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { navigate(item.path); setMobileSidebarOpen(false); } }}
                          onClick={() => { navigate(item.path); setMobileSidebarOpen(false); }}
                          className={cn('group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer', parentActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon size={18} />
                            {item.title}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setPublicationsOpen((p) => !p); }}
                            className="rounded-md p-1 hover:bg-black/5"
                            aria-expanded={publicationsOpen}
                            aria-controls="admin-publications-dropdown"
                          >
                            <ChevronDown size={18} className={cn('transition-transform', publicationsOpen ? 'rotate-180' : '')} />
                          </button>
                        </div>

                        {publicationsOpen && (
                          <div id="admin-publications-dropdown" className="ml-3 mt-1 space-y-1">
                            {subjectItems.map((s) => {
                              const params = new URLSearchParams(location.search)
                              const keyVal = s.path.split('=')[1]
                              const active = location.pathname === '/admin/publications' && (params.get('subject') === keyVal || params.get('entity') === keyVal)
                              return (
                                <Link key={s.path} to={s.path} onClick={() => setMobileSidebarOpen(false)} className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors', active ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900')}>
                                  <div className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-fpt-orange' : 'bg-slate-300')} />
                                  {s.title}
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  }

                  // Make Đội ngũ / Duyệt bài / CMS Editor larger to match other main menu items
                  const largeButtons = ['/admin/doingu', '/admin/submissions', '/admin/cms-editor', '/admin/vinh-danh']
                  if (largeButtons.includes(item.path)) {
                    const active = location.pathname === item.path
                    return (
                      <Link key={item.path} to={item.path} onClick={() => setMobileSidebarOpen(false)} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors', active ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900')}>
                        <item.icon size={18} />
                        {item.title}
                      </Link>
                    )
                  }

                  const active = location.pathname === item.path
                  return (
                    <Link key={item.path} to={item.path} onClick={() => setMobileSidebarOpen(false)} className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors', active ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900')}>
                      <item.icon size={16} />
                      {item.title}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut size={18} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {mobileSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/35 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Đóng menu"
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="relative z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen((prev) => !prev)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 lg:hidden"
            >
              {mobileSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            <h2 className="text-base font-semibold text-slate-900 md:text-lg">
              {activeTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <NotificationButton />

            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-800">Ban Tổ Chức</p>
                <p className="text-[11px] text-slate-500">Quản trị viên</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <User size={18} />
              </div>
            </div>
          </div>
        </header>

        <main className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto w-full max-w-[1440px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
