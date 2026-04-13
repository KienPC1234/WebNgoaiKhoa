import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileText, Send, Database, LogOut, Bell, User, Sparkles } from 'lucide-react'
import { cn } from '../components/UI'

export const AdminLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const menuItems = [
    { title: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { title: 'Quản lý Bài viết', path: '/admin/publications', icon: FileText },
    { title: 'Duyệt Bài thi', path: '/admin/submissions', icon: Send },
    { title: 'AI Knowledge', path: '/admin/ai-knowledge', icon: Database },
  ]

  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    // Simple logout logic
    navigate('/')
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
              <span className="text-lg font-black text-fpt-blue leading-none tracking-tight">ADMIN PANEL</span>
              <span className="text-[10px] font-bold text-fpt-orange uppercase tracking-widest">Ngoại khoá nhịp đập</span>
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
            {menuItems.find(item => isActive(item.path))?.title || 'Quản trị'}
          </h2>
          
          <div className="flex items-center gap-6">
            <button className="text-gray-400 hover:text-fpt-blue transition-colors relative">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-fpt-orange rounded-full"></span>
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-gray-800">Ban Tổ Chức</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Administrator</p>
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
