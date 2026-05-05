import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/apiClient'
import { Card } from '@/components/ui/core'
import { Sparkles, Users, Target, Shield, Award, BookOpen, Compass, GraduationCap, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export const GioiThieuQuyMo = () => {
  const [scale, setScale] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const fetchScale = async () => {
      try {
        const res = await apiClient.get('/public/doingu/scale', { signal: controller.signal })
        setScale(res.data)
      } catch (error) {
        if (error?.name !== 'AbortError') console.error('Error fetching scale:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchScale()
    return () => controller.abort()
  }, [])

  const stats = [
    { title: 'Giáo viên', count: scale?.staff_count ?? 0, icon: Users, accent: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', text: 'text-blue-600' },
    { title: 'Học sinh', count: scale?.student_count ?? 0, icon: GraduationCap, accent: 'from-fpt-orange to-orange-500', bg: 'bg-orange-50', text: 'text-fpt-orange' },
    { title: 'Dự án', count: scale?.projects_count ?? 0, icon: Target, accent: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { title: 'Giải thưởng', count: scale?.awards_count ?? 0, icon: Award, accent: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-600' },
  ]

  const subjects = (scale?.subjects_overview || '').split(',').map(s => s.trim()).filter(Boolean)

  return (
    <div className="page-shell-public">
      <section className="page-hero page-hero-caro">
        <div className="app-section relative z-10 mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/60 bg-white/70 px-4 py-1.5 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-fpt-orange animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-fpt-orange">Giới thiệu</span>
          </div>
          <h1 className="mt-6 text-balance text-4xl font-black uppercase leading-[0.92] text-fpt-blue sm:text-5xl md:text-6xl">
            {loading ? (
              <span className="inline-block h-12 w-80 animate-pulse rounded-xl bg-slate-200" />
            ) : (
              <>
                <span className="block">{scale?.hero_title?.split('&')[0] || 'Quy mô'}</span>
                <span className="mt-2 block bg-gradient-to-r from-fpt-orange to-orange-400 bg-clip-text text-transparent italic gradient-text-fix pt-2 md:pt-2">
                  {scale?.hero_title?.split('&')[1]?.trim() || 'Phát triển'}
                </span>
              </>
            )}
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-base font-medium leading-relaxed text-slate-600 md:text-lg">
            {loading ? (
              <span className="inline-block h-5 w-96 max-w-full animate-pulse rounded-lg bg-slate-200" />
            ) : (
              scale?.hero_subtitle || 'Deep learning with love'
            )}
          </p>
        </div>
      </section>

      <section className="app-section -mt-10 relative z-20">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <Card key={i} className="surface-strong p-6 text-center">
              <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.accent} text-white shadow-lg`}>
                <stat.icon size={24} />
              </div>
              {loading ? (
                <div className="mx-auto h-8 w-16 animate-pulse rounded-lg bg-slate-100" />
              ) : (
                <div className="text-3xl font-black text-slate-800">{stat.count.toLocaleString('vi-VN')}+</div>
              )}
              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{stat.title}</div>
            </Card>
          ))}
        </div>
      </section>

      <section className="app-section mt-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div className="space-y-6">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-fpt-orange">
                <Sparkles size={14} /> Sứ mệnh
              </p>
              <h2 className="text-3xl font-black uppercase text-fpt-blue md:text-4xl">Tầm nhìn & Sứ mệnh</h2>
            </div>

            <Card className="surface p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Compass size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">Tầm nhìn</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {scale?.vision || 'Phát triển năng lực công dân toàn cầu cho học sinh sinh viên.'}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="surface p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-fpt-orange">
                  <Target size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">Triết lý</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    Giáo dục đào tạo là việc tổ chức và quản lý việc tự học của người học. Định hướng: <span className="font-bold text-fpt-orange">"Trải nghiệm để trưởng thành"</span> — Tôn trọng cá nhân, đề cao sự tự lập và phát triển con người toàn diện.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="surface p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Shield size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">Giá trị cốt lõi</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    Tôn trọng — Đổi mới — Đồng đội — Chí công — Gương mẫu — Sáng suốt
                  </p>
                </div>
              </div>
            </Card>

            <Card className="surface p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                  <BookOpen size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">Đội ngũ</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {scale?.staff_hero || 'Hội tụ những chuyên gia giàu kinh nghiệm, không ngừng sáng tạo và truyền lửa đam mê cho thế hệ học sinh.'}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6 lg:sticky lg:top-28">
            <Card className="page-panel p-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-fpt-blue mb-4">Chương trình đào tạo</h3>
              <ul className="space-y-3">
                {[
                  'Chương trình chuẩn Bộ GD&ĐT',
                  'Tăng cường Tiếng Anh hướng chuẩn quốc tế',
                  'Công nghệ & Kỹ năng số (4.0)',
                  'Phát triển cá nhân qua hoạt động trải nghiệm',
                  'Mô hình nội trú rèn luyện tính tự lập',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fpt-orange" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>

            {subjects.length > 0 && (
              <Card className="page-panel p-6">
                <h3 className="text-sm font-black uppercase tracking-wider text-fpt-blue mb-4">Phân môn</h3>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((s, idx) => (
                    <span key={idx} className="rounded-full border border-orange-200/60 bg-orange-50/60 px-3 py-1.5 text-xs font-bold text-fpt-orange">
                      {s}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {scale?.roadmap && (
              <Card className="page-panel p-6">
                <h3 className="text-sm font-black uppercase tracking-wider text-fpt-blue mb-3">Lộ trình</h3>
                <p className="text-sm leading-relaxed text-slate-600">{scale.roadmap}</p>
              </Card>
            )}

            <Link to="/doingu/staff" className="group flex items-center justify-between rounded-2xl border border-orange-200/60 bg-gradient-to-r from-fpt-orange to-orange-500 p-5 text-white shadow-[0_18px_40px_-16px_rgba(242,112,36,0.6)] transition-all hover:shadow-[0_20px_46px_-16px_rgba(242,112,36,0.75)]">
              <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-80">Khám phá</p>
                <p className="mt-1 text-lg font-black">Đội ngũ giảng dạy</p>
              </div>
              <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      <div className="h-20" />
    </div>
  )
}
