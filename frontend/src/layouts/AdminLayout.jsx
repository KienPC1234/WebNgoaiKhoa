import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileText, Send, Database, LogOut, Bell, User, Sparkles, Users2, CalendarDays, BookHeart, ChevronDown, FolderKanban } from 'lucide-react'
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

  const menuItems = [
    { title: 'Bảng điều khiển', path: '/admin/dashboard', icon: LayoutDashboard },
    { title: 'Bài viết', path: '/admin/publications', icon: FileText },
    { title: 'Sự kiện', path: '/admin/events', icon: CalendarDays },
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
    <div className="flex h-screen bg-gray-50/50">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-100 flex flex-col shadow-sm">
        <div className="p-8">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-fpt-orange p-1.5 rounded-lg">
              <Sparkles className="text-white" size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black text-fpt-blue leading-none tracking-tight">BẢNG QUẢN TRỊ</span>
              <span className="text-[10px] font-bold text-fpt-orange uppercase tracking-widest">Tổ xã hội</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black transition-all group",
                isActive(item.path)
                  ? "bg-fpt-blue text-white shadow-lg shadow-blue-100"
                  : "text-gray-500 hover:bg-blue-50 hover:text-fpt-blue"
              )}
            >
              <item.icon size={20} className={cn("transition-colors", isActive(item.path) ? "text-white" : "text-gray-400 group-hover:text-fpt-blue")} />
              {item.title}
            </Link>
          ))}

          <div className="pt-2">
            <div
              className={cn(
                'flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-black transition-all group',
                isCmsRoute
                  ? 'bg-fpt-blue text-white shadow-lg shadow-blue-100'
                  : 'text-gray-500 hover:bg-blue-50 hover:text-fpt-blue'
              )}
            >
              <Link to="/admin/cms" className="flex items-center gap-3 flex-1">
                <FolderKanban size={20} className={cn('transition-colors', isCmsRoute ? 'text-white' : 'text-gray-400 group-hover:text-fpt-blue')} />
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
              <div className="mt-2 ml-3 border-l border-blue-100 pl-2 space-y-1">
                {cmsItems.map((item) => {
                  const active = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-black transition-all',
                        active
                          ? 'bg-blue-50 text-fpt-blue'
                          : 'text-gray-500 hover:bg-blue-50 hover:text-fpt-blue'
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

        <div className="p-4 border-t border-gray-50">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-black text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut size={20} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 shadow-sm relative z-10">
          <h2 className="text-xl font-black text-fpt-blue italic uppercase tracking-tight">
            {activeTitle()}
          </h2>
          
          <div className="flex items-center gap-6">
            <button className="text-gray-400 hover:text-fpt-blue transition-colors relative">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-fpt-orange rounded-full"></span>
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-gray-800">Ban Tổ Chức</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quản trị viên</p>
              </div>
              <div className="w-10 h-10 bg-fpt-blue/5 rounded-full flex items-center justify-center text-fpt-blue">
                <User size={24} />
              </div>
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
