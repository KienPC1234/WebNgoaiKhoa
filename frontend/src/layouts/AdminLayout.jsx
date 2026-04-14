import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Send,
  Database,
  LogOut,
  Bell,
  User,
  Sparkles,
  Users2,
  CalendarDays,
  BookHeart,
  ChevronDown,
  FolderKanban,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/components/UI'

export const AdminLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const isCmsRoute =
    location.pathname.startsWith('/admin/cms') ||
    location.pathname.startsWith('/admin/stories') ||
    location.pathname.startsWith('/admin/nhanvat') ||
    location.pathname.startsWith('/admin/submissions')
  const [cmsOpen, setCmsOpen] = useState(isCmsRoute)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const menuItems = [
    { title: 'Bảng điều khiển', path: '/admin/dashboard', icon: LayoutDashboard },
    { title: 'Bài viết', path: '/admin/publications', icon: FileText },
    { title: 'Sự kiện', path: '/admin/events', icon: CalendarDays },
    { title: 'CMS Editor', path: '/admin/cms-editor', icon: Sparkles },
    { title: 'Người dùng', path: '/admin/users', icon: User },
    { title: 'Kho tri thức AI', path: '/admin/ai-knowledge', icon: Database },
  ]

  const cmsItems = [
    { title: 'Câu chuyện', path: '/admin/cms/stories', icon: BookHeart },
    { title: 'Nhân vật CMS', path: '/admin/cms/nhanvat', icon: Users2 },
    { title: 'Duyệt bài', path: '/admin/cms/submissions', icon: Send },
  ]

  const isActive = (path) => location.pathname === path

  const activeTitle = () => {
    if (location.pathname.startsWith('/admin/publications')) return 'Bài viết'
    if (location.pathname.startsWith('/admin/cms/stories')) return 'Câu chuyện'
    if (location.pathname.startsWith('/admin/cms/nhanvat')) return 'Nhân vật CMS'
    if (location.pathname.startsWith('/admin/cms/submissions')) return 'Duyệt bài'
    if (location.pathname.startsWith('/admin/cms')) return 'CMS nội dung'

    const matched = menuItems.find((item) => isActive(item.path))
    return matched?.title || 'Quản trị'
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-white/50 to-slate-50/70">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200/70 bg-white/95 backdrop-blur-xl shadow-[0_30px_80px_-45px_rgba(15,23,42,0.45)] transition-transform lg:static lg:translate-x-0',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="rounded-lg bg-fpt-orange p-1.5">
              <Sparkles className="text-white" size={20} />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg font-black leading-none tracking-tight text-fpt-blue">BẢNG QUẢN TRỊ</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-fpt-orange">Tổ xã hội</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-2 px-4">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileSidebarOpen(false)}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-black transition-all',
                isActive(item.path)
                  ? 'bg-fpt-blue text-white shadow-lg shadow-blue-100'
                  : 'text-slate-500 hover:bg-blue-50 hover:text-fpt-blue'
              )}
            >
              <item.icon size={20} className={cn('transition-colors', isActive(item.path) ? 'text-white' : 'text-slate-400 group-hover:text-fpt-blue')} />
              {item.title}
            </Link>
          ))}

          <div className="pt-2">
            <div
              className={cn(
                'group flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-black transition-all',
                isCmsRoute
                  ? 'bg-fpt-blue text-white shadow-lg shadow-blue-100'
                  : 'text-slate-500 hover:bg-blue-50 hover:text-fpt-blue'
              )}
            >
              <Link to="/admin/cms" onClick={() => setMobileSidebarOpen(false)} className="flex flex-1 items-center gap-3">
                <FolderKanban size={20} className={cn('transition-colors', isCmsRoute ? 'text-white' : 'text-slate-400 group-hover:text-fpt-blue')} />
                CMS nội dung
              </Link>
              <button
                type="button"
                onClick={() => setCmsOpen((prev) => !prev)}
                className="p-1 rounded-md hover:bg-black/5"
              >
                <ChevronDown size={18} className={cn('transition-transform', cmsOpen ? 'rotate-180' : '')} />
              </button>
            </div>

            {cmsOpen && (
              <div className="mt-2 ml-3 space-y-1 border-l border-blue-100 pl-2">
                {cmsItems.map((item) => {
                  const active = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-black transition-all',
                        active
                          ? 'bg-blue-50 text-fpt-blue'
                          : 'text-slate-500 hover:bg-blue-50 hover:text-fpt-blue'
                      )}
                    >
                      <item.icon size={16} />
                      {item.title}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </nav>

        <div className="border-t border-slate-100 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-black text-red-500 transition-all hover:bg-red-50"
          >
            <LogOut size={20} />
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
        <header className="relative z-10 flex h-20 items-center justify-between border-b border-slate-200/70 bg-white/80 px-5 shadow-sm backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 lg:hidden"
            >
              {mobileSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            <h2 className="font-display text-lg font-black uppercase tracking-tight text-fpt-blue md:text-xl">
              {activeTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <button className="relative text-slate-400 transition-colors hover:text-fpt-blue">
              <Bell size={20} />
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-fpt-orange"></span>
            </button>

            <div className="flex items-center gap-3 border-l border-slate-200 pl-4 md:pl-6">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-black text-slate-800">Ban Tổ Chức</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quản trị viên</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fpt-blue/5 text-fpt-blue">
                <User size={22} />
              </div>
            </div>
          </div>
        </header>

        <main className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto w-full max-w-[1440px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
