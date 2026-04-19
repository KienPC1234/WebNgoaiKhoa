import { Building2, Users, BookOpen, Award, Target, Sparkles } from 'lucide-react'

const StatCard = ({ icon: Icon, label, value, note }) => (
  <div className="rounded-3xl border border-gray-100 bg-white/80 backdrop-blur-sm p-6 shadow-lg shadow-gray-100">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-11 h-11 rounded-2xl bg-orange-50 text-fpt-orange flex items-center justify-center">
        <Icon size={20} />
      </div>
      <span className="text-[11px] uppercase tracking-widest font-black text-gray-500">{label}</span>
    </div>
    <p className="text-3xl font-black text-fpt-blue leading-none">{value}</p>
    <p className="text-sm text-gray-500 mt-2">{note}</p>
  </div>
)

export const NhanVatScale = () => {
  return (
    <div className="space-y-16 pb-20">
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50/40 to-orange-50/30 px-4 pt-16 pb-14 border-b border-gray-100">
        <div className="app-section grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-fpt-blue text-white px-4 py-2 text-[11px] uppercase tracking-widest font-black">
              <Sparkles size={14} />
              Tổ xã hội
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-fpt-blue italic leading-tight">
              Quy mô <span className="text-fpt-orange not-italic">Tổ xã hội</span>
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed max-w-2xl">
              Trang nền tảng tổng hợp quy mô nhân sự, định hướng phát triển và năng lực chuyên môn của Tổ xã hội.
              Nội dung chi tiết sẽ tiếp tục được cập nhật theo từng năm học.
            </p>
          </div>
          <div className="rounded-[40px] border border-blue-100 bg-white/80 p-8 shadow-2xl shadow-blue-100">
            <h3 className="text-sm uppercase tracking-widest font-black text-fpt-blue mb-5">Tổng quan nhanh</h3>
            <div className="space-y-3 text-sm text-gray-600 font-medium">
              <p className="flex items-center gap-2"><Target size={16} className="text-fpt-orange" /> Định hướng: Giáo dục xã hội tích hợp AI</p>
              <p className="flex items-center gap-2"><BookOpen size={16} className="text-fpt-orange" /> Phụ trách: Ngữ văn, KTPL, Lịch sử, Địa lí, Vovinam</p>
              <p className="flex items-center gap-2"><Award size={16} className="text-fpt-orange" /> Trọng tâm: học thuật, sự kiện, truyền cảm hứng</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard icon={Users} label="Nhân sự" value="20+" note="Giáo viên và cộng tác viên chuyên môn" />
          <StatCard icon={Building2} label="Đơn vị" value="05" note="Nhóm chuyên môn đang vận hành" />
          <StatCard icon={BookOpen} label="Học liệu" value="120+" note="Tài liệu, ấn phẩm và chuyên đề" />
          <StatCard icon={Award} label="Thành tích" value="30+" note="Hoạt động và danh hiệu nổi bật" />
        </div>
      </section>

      <section className="container mx-auto px-4">
        <div className="rounded-[36px] border border-orange-100 bg-gradient-to-r from-orange-50 to-white p-8 md:p-10">
          <h2 className="text-2xl md:text-3xl font-black text-fpt-blue">Khung nội dung sắp bổ sung</h2>
          <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 font-medium">
            <li>1. Cơ cấu tổ chức và sơ đồ vận hành theo năm học.</li>
            <li>2. Chỉ tiêu học thuật và hoạt động ngoại khóa theo phân môn.</li>
            <li>3. Hệ thống học liệu trọng điểm và lịch cập nhật.</li>
            <li>4. Bộ chỉ số chất lượng, báo cáo tiến độ theo học kỳ.</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
