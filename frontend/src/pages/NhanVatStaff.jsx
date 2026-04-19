import { BookOpen, BadgeCheck, Mail, GraduationCap, Sparkles } from 'lucide-react'

const staffSeeds = [
  { name: 'ThS. Nguyễn Minh Quân', role: 'Tổ trưởng Tổ xã hội', expertise: 'Quản trị chương trình liên môn', email: 'quan.nguyen@fpt.edu.vn' },
  { name: 'ThS. Trần Hải An', role: 'Phụ trách Ngữ văn', expertise: 'Văn học ứng dụng và hướng dẫn ấn phẩm', email: 'an.tran@fpt.edu.vn' },
  { name: 'ThS. Lê Hoàng Phúc', role: 'Phụ trách KTPL', expertise: 'Kinh tế số và pháp luật công dân', email: 'phuc.le@fpt.edu.vn' },
  { name: 'ThS. Phạm Thu Trang', role: 'Phụ trách Lịch sử - Địa lí', expertise: 'Học liệu số và dạy học dự án', email: 'trang.pham@fpt.edu.vn' },
]

const StaffCard = ({ person }) => (
  <article className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-100 hover:-translate-y-1 transition-transform">
    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-fpt-blue flex items-center justify-center mb-5">
      <GraduationCap size={22} />
    </div>
    <h3 className="text-xl font-black text-fpt-blue leading-snug">{person.name}</h3>
    <p className="text-sm uppercase tracking-widest text-fpt-orange font-black mt-2">{person.role}</p>
    <p className="text-sm text-gray-600 mt-4 leading-relaxed">{person.expertise}</p>
    <p className="text-sm text-gray-500 mt-5 flex items-center gap-2">
      <Mail size={15} className="text-fpt-orange" />
      {person.email}
    </p>
  </article>
)

export const NhanVatStaff = () => {
  return (
    <div className="space-y-16 pb-20">
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50/40 to-orange-50/30 px-4 pt-16 pb-14 border-b border-gray-100">
        <div className="app-section space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-fpt-orange text-white px-4 py-2 text-[11px] uppercase tracking-widest font-black">
            <Sparkles size={14} />
            Đội ngũ giáo viên
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-fpt-blue italic leading-tight">
            Nhân sự <span className="text-fpt-orange not-italic">chuyên môn</span>
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-3xl">
            Trang giới thiệu đội ngũ giáo viên nòng cốt của Tổ xã hội. Đây là bản nền để tích hợp dữ liệu hồ sơ thật,
            thành tích, lịch giảng dạy và bài viết chuyên môn.
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-gray-600 font-medium bg-white/80 rounded-xl px-4 py-2 border border-gray-100">
            <BadgeCheck size={16} className="text-fpt-blue" />
            Dữ liệu hiện tại là mẫu giao diện cho giai đoạn triển khai.
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {staffSeeds.map((person) => (
            <StaffCard key={person.email} person={person} />
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4">
        <div className="rounded-[32px] border border-blue-100 bg-white p-8">
          <h2 className="text-2xl font-black text-fpt-blue flex items-center gap-2">
            <BookOpen size={22} className="text-fpt-orange" />
            Hạng mục sẽ cập nhật tiếp
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-gray-600 font-medium">
            <li>1. Hồ sơ chi tiết theo giáo viên và học phần phụ trách.</li>
            <li>2. Bộ lọc theo phân môn, học kỳ và năng lực chuyên sâu.</li>
            <li>3. Tích hợp lịch sự kiện/chuyên đề có giáo viên tham gia.</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
