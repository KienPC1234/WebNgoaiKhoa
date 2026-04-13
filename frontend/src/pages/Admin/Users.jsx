import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, Button } from '../../components/UI'
import { User, Mail, Shield, Check, X, Search, Trash2, Edit, MoreVertical } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const AdminUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const token = localStorage.getItem('token')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsers(res.data)
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (user) => {
    try {
      await axios.put(`${API_URL}/admin/users/${user.id}`, {
        is_active: !user.is_active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchUsers()
    } catch (err) {
      alert('Lỗi khi cập nhật trạng thái người dùng')
    }
  }

  const filteredUsers = users.filter(user => 
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex justify-between items-center bg-white p-6 rounded-[32px] shadow-xl shadow-gray-100/50 border border-gray-50">
        <div className="relative w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo tên hoặc email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-fpt-orange/20 transition-all font-medium text-sm"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Tổng số người dùng</p>
            <p className="text-2xl font-black text-fpt-blue">{users.length}</p>
          </div>
          <div className="w-12 h-12 bg-fpt-blue/5 rounded-2xl flex items-center justify-center text-fpt-blue">
            <User size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-100 rounded-[32px] animate-pulse"></div>)
        ) : filteredUsers.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <User size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400 font-black uppercase tracking-widest">Không tìm thấy người dùng nào</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id} className="p-0 overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-500 rounded-[32px] group">
              <div className={cn("h-2 w-full bg-gradient-to-r", user.role === 'admin' ? "from-fpt-blue to-blue-400" : "from-fpt-orange to-orange-400")}></div>
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner", user.role === 'admin' ? "bg-blue-50 text-fpt-blue" : "bg-orange-50 text-fpt-orange")}>
                      <User size={28} />
                    </div>
                    <div>
                      <h3 className="font-black text-fpt-blue text-lg leading-tight group-hover:text-fpt-orange transition-colors">{user.full_name}</h3>
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
                        <Shield size={12} className={user.role === 'admin' ? "text-fpt-blue" : "text-fpt-orange"} />
                        {user.role}
                      </div>
                    </div>
                  </div>
                  <button className="text-gray-300 hover:text-gray-600 transition-colors p-1"><MoreVertical size={20} /></button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400"><Mail size={14} /></div>
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400"><Check size={14} /></div>
                    <span className="flex items-center gap-2">
                      Trạng thái: 
                      <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest", user.is_active ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
                        {user.is_active ? 'Đang hoạt động' : 'Đã khóa'}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-50 flex gap-3">
                  <Button 
                    onClick={() => handleToggleStatus(user)}
                    variant={user.is_active ? "outline" : "default"}
                    className={cn("flex-1 text-[10px] font-black border-none", user.is_active ? "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white" : "bg-green-50 text-green-600 hover:bg-green-600 hover:text-white")}
                  >
                    {user.is_active ? 'KHÓA TÀI KHOẢN' : 'KÍCH HOẠT'}
                  </Button>
                  <Button className="w-12 h-12 p-0 bg-gray-50 text-gray-400 hover:bg-fpt-blue hover:text-white border-none">
                    <Edit size={18} />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
