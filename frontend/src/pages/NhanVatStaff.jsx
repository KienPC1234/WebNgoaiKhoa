import { BookOpen, BadgeCheck, Mail, GraduationCap, Sparkles, Users } from 'lucide-react'

const staffSeeds = [
  { name: 'ThS. Nguyễn Minh Quân', group: 'management', role: 'Tổ trưởng Tổ xã hội', expertise: 'Quản trị chương trình liên môn', email: 'quan.nguyen@fpt.edu.vn' },
  { name: 'ThS. Trần Hải An', group: 'instructor', role: 'Phụ trách Ngữ văn', expertise: 'Văn học ứng dụng và hướng dẫn ấn phẩm', email: 'an.tran@fpt.edu.vn' },
  { name: 'ThS. Lê Hoàng Phúc', group: 'instructor', role: 'Phụ trách KTPL', expertise: 'Kinh tế số và pháp luật công dân', email: 'phuc.le@fpt.edu.vn' },
  { name: 'ThS. Phạm Thu Trang', group: 'instructor', role: 'Phụ trách Lịch sử - Địa lí', expertise: 'Học liệu số và dạy học dự án', email: 'trang.pham@fpt.edu.vn' },
]

const StaffCard = ({ person }) => (
  <article className="h-full flex flex-col rounded-lg border border-gray-100 bg-white p-2 md:p-2.5 shadow-sm shadow-gray-50 hover:-translate-y-0.5 transition-transform">
    <div className="w-7 h-7 md:w-8 md:h-8 rounded-md bg-blue-50 text-fpt-blue flex items-center justify-center mb-2 md:mb-3">
      <GraduationCap size={14} />
    </div>
    <h3 className="text-sm md:text-sm font-black text-fpt-blue leading-tight">{person.name}</h3>
    <p className="text-[9px] md:text-[9px] uppercase tracking-widest text-fpt-orange font-black mt-1">{person.role}</p>
    <p className="text-xs text-gray-600 mt-2 leading-tight flex-1">{person.expertise}</p>
    <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
      <Mail size={12} className="text-fpt-orange" />
      {person.email}
    </p>
  </article>
)

const StaffSection = ({ title, subtitle, members, icon, minCardWidth = 90, maxCardWidth = 100 }) => (
  <section className="container mx-auto px-4">
    <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-fpt-orange text-white px-3 py-2 text-sm font-black">
          {icon}
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-fpt-blue">{title}</h2>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>

    <div
      className="grid grid-cols-1 gap-6"
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${minCardWidth}px, ${maxCardWidth}px))` }}
    >
      {members.map((person) => (
        <StaffCard key={person.email} person={person} />
      ))}
    </div>
  </section>
)

export const NhanVatStaff = () => {
  const management = staffSeeds.filter((s) => s.group === 'management')
  const instructors = staffSeeds.filter((s) => s.group === 'instructor')

  return (
    <div className="space-y-16 pb-20">
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50/40 to-orange-50/30 px-4 pt-16 pb-14 border-b border-gray-100">
        <div className="app-section space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-fpt-orange text-white px-4 py-2 text-[11px] uppercase tracking-widest font-black">
            <Sparkles size={14} />
            Đội ngũ
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-fpt-blue italic leading-tight">
            Nhân sự <span className="text-fpt-orange not-italic">chuyên môn</span>
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-3xl">
            Trang giới thiệu đội ngũ nòng cốt của Tổ xã hội. Đây là bản nền để tích hợp dữ liệu hồ sơ thật,
            thành tích, lịch giảng dạy và bài viết chuyên môn.
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-gray-600 font-medium bg-white/80 rounded-xl px-4 py-2 border border-gray-100">
            <BadgeCheck size={16} className="text-fpt-blue" />
            Dữ liệu hiện tại là mẫu giao diện cho giai đoạn triển khai.
          </div>
        </div>
      </section>

      {/* Management Section */}
          <StaffSection
            title="Đội ngũ quản lý"
            subtitle="Ban lãnh đạo và phụ trách chương trình"
            members={management}
            icon={<Users size={16} />}
            minCardWidth={90}
            maxCardWidth={100}
          />

      {/* Instructors Section */}
          <StaffSection
            title="Đội ngũ giáo viên"
            subtitle="Giáo viên phụ trách các phân môn và chuyên đề"
            members={instructors}
            icon={<GraduationCap size={16} />}
            minCardWidth={90}
            maxCardWidth={100}
          />

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
