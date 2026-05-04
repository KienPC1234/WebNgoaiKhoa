import { useState, useEffect } from 'react'
import {
  ArrowRight,
  BookOpen,
  Calendar,
  ChevronRight,
  Send,
  Sparkles,
  Users,
  Heart,
  RefreshCw,
  ShieldCheck,
  Award,
  Sun,
} from 'lucide-react'
import { Button, Card } from '@/components/ui/core'
import { GridBackground, ShimmerButton, Spotlight } from '@/components/aceternity'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const toPlainText = (value) => (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
const toWebpCandidate = (url) => {
  if (!url || typeof url !== 'string') return undefined
  const [pathname, query = ''] = url.split('?')
  if (!pathname) return undefined
  const converted = pathname.replace(/\.(png|jpe?g)$/i, '.webp')
  if (converted === pathname) return undefined
  return `${converted}${query ? `?${query}` : ''}`
}

const featureCards = [
  {
    icon: Heart,
    title: 'Tôn',
    description: 'Tôn trọng — tôn trọng người khác, ý kiến và quy trình.',
    colorClass: 'from-[#f7f3ea] to-white border-amber-100 text-amber-700',
  },
  {
    icon: RefreshCw,
    title: 'Đổi',
    description: 'Đổi mới — khuyến khích sáng tạo và cải tiến liên tục.',
    colorClass: 'from-[#eef5ff] to-white border-blue-100 text-fpt-blue',
  },
  {
    icon: Users,
    title: 'Đồng',
    description: 'Đồng đội — làm việc hợp tác, hỗ trợ lẫn nhau.',
    colorClass: 'from-[#edf9f1] to-white border-emerald-100 text-emerald-700',
  },
  {
    icon: ShieldCheck,
    title: 'Chí',
    description: 'Chí công — công bằng, chính trực trong hành động.',
    colorClass: 'from-[#fff7f0] to-white border-orange-100 text-orange-700',
  },
  {
    icon: Award,
    title: 'Gương',
    description: 'Gương mẫu — hành xử làm tấm gương cho người khác noi theo.',
    colorClass: 'from-[#f0f6ff] to-white border-sky-100 text-sky-700',
  },
  {
    icon: Sun,
    title: 'Sáng',
    description: 'Sáng suốt — quyết định rõ ràng, minh bạch và có tầm nhìn.',
    colorClass: 'from-[#fffaf0] to-white border-yellow-100 text-yellow-700',
  },
]

const HeroStat = ({ value, label }) => (
  <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-[0_12px_28px_-20px_rgba(15,23,42,0.5)] backdrop-blur">
    <p className="text-2xl font-black text-fpt-blue md:text-3xl">{value}</p>
    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">{label}</p>
  </div>
)

export const Home = () => {
  const [latestPubs, setLatestPubs] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    const fetchLatest = async () => {
      setLoading(true)
      try {
        const response = await fetch(`${API_URL}/public/publications?sort=trending&limit=6`, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        setLatestPubs(Array.isArray(data) ? data.slice(0, 6) : [])
      } catch (error) {
        if (error?.name !== 'AbortError') {
          console.error('Error fetching latest pubs:', error)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchLatest()

    return () => controller.abort()
  }, [])

  return (
    <div className="space-y-28 pb-28">
      <section className="page-hero page-hero-caro min-h-[92vh] border-b border-orange-100 pb-16 pt-20 md:pt-24">
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute -right-44 -top-56 h-[780px] w-[780px] rounded-full bg-fpt-orange/15 blur-[130px]" />
          <div className="absolute -bottom-44 -left-32 h-[560px] w-[560px] rounded-full bg-fpt-blue/10 blur-[120px]" />
        </div>

        <GridBackground className="opacity-25" />
        <Spotlight className="opacity-80" />

        <div className="app-section relative z-10 grid grid-cols-1 items-center gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7" data-aos="fade-right">
            <h1 className="text-balance text-[52px] font-black uppercase text-fpt-blue sm:text-[72px] lg:text-[108px]">
              <span className="block leading-[0.9]">Nhịp đập</span>
              <span className="relative mt-6 inline-block leading-[0.9] italic text-fpt-orange sm:mt-7 lg:mt-8">
                Sáng tạo
                <svg className="absolute -bottom-5 left-0 h-7 w-full text-fpt-green/20" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M0 6 Q 25 0 50 6 T 100 6" stroke="currentColor" strokeWidth="10" fill="none" />
                </svg>
              </span>
            </h1>

            <p className="mt-8 max-w-2xl text-lg font-medium leading-relaxed text-slate-500 md:text-2xl">
              Nền tảng kết nối đam mê, khơi nguồn tri thức và lan tỏa tinh thần học tập chủ động cho cộng đồng học sinh FPT.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/phanmon/van/an-pham" className="tap-target">
                <ShimmerButton className="rounded-2xl px-8 py-4 text-sm md:px-10 md:py-5 md:text-base">
                  Khám phá ngay <ArrowRight size={18} />
                </ShimmerButton>
              </Link>
              <Link to="/stories/inspiring" className="tap-target">
                <Button className="tap-target rounded-2xl bg-fpt-blue px-8 py-4 text-sm font-black text-white shadow-xl shadow-blue-200 transition-all hover:-translate-y-1 md:px-10 md:py-5 md:text-base">
                  Câu chuyện truyền cảm hứng
                </Button>
              </Link>
            </div>

            <div className="mt-12 grid max-w-xl grid-cols-3 gap-3 border-t border-slate-200/70 pt-6">
              <HeroStat value="1,200+" label="Học sinh tham gia" />
              <HeroStat value="50+" label="Nội dung chọn lọc" />
              <HeroStat value="24/7" label="AI đồng hành" />
            </div>
          </div>

          <div className="relative lg:-mt-20 lg:col-span-5" data-aos="fade-left" data-aos-delay="120">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-[500px]">
              <div className="absolute right-0 top-2 h-full w-[88%] -rotate-3 rounded-[2.6rem] border border-slate-200 bg-slate-50" />
              <div className="group absolute right-4 -top-4 h-full w-[88%] rotate-2 overflow-hidden rounded-[2.6rem] border border-slate-100 bg-white p-4 shadow-[0_34px_60px_-45px_rgba(15,23,42,0.65)] transition-transform duration-700 hover:rotate-0">
                <div className="relative h-full w-full overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-slate-900 via-fpt-blue to-slate-800 px-8 pb-8 pt-18 text-white">
                  <div className="absolute left-[15%] top-4 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-slate-900/30 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/85">
                    <BookOpen size={12} /> Editorial Insight
                  </div>
                  <h3 className="text-3xl font-black leading-tight">Sáng tạo là hành trình tự do nhất của học sinh FPT.</h3>
                  <p className="mt-5 text-sm leading-relaxed text-white/80">
                    Mỗi bài viết là một góc nhìn độc đáo, mỗi dự án là một bước tiến của tinh thần học chủ động.
                  </p>

                  <div className="mt-8 space-y-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-white/80">
                      <span>Creative ranking</span>
                      <span>#01</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/20">
                      <div className="h-full w-[84%] rounded-full bg-fpt-orange" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -left-7 -top-8 flex h-24 w-24 flex-col items-center justify-center rounded-[1.6rem] bg-fpt-green text-white shadow-2xl shadow-fpt-green/35">
                <p className="text-3xl font-black leading-none">01</p>
                <p className="text-[8px] font-black uppercase tracking-widest">Ranking</p>
              </div>

              <div className="absolute -bottom-8 -right-8 flex h-32 w-32 flex-col items-center justify-center rounded-full bg-fpt-orange text-white shadow-2xl shadow-fpt-orange/35">
                <p className="text-3xl font-black italic leading-none">HOT</p>
                <p className="text-[8px] font-black uppercase tracking-widest">Sáng tác 2026</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="app-section cv-auto" data-ai-anchor="home-latest-publications">
        <div className="mb-14 flex flex-col items-start justify-between gap-8 md:flex-row md:items-end" data-aos="fade-up">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-fpt-orange">
              <Sparkles size={14} /> Lựa chọn biên tập
            </p>
            <h2 className="text-4xl font-black uppercase tracking-tight text-fpt-blue md:text-6xl">
              Ấn phẩm <span className="italic text-fpt-orange">Nổi Bật</span>
            </h2>
            <p className="mt-4 max-w-2xl text-base font-medium text-slate-500 md:text-lg">
              Tuyển chọn ấn phẩm nổi bật từ mọi phân môn — bài viết sáng tạo, sâu sắc và hữu ích cho hành trình học tập.
            </p>
          </div>

          <Link to="/phanmon/van/an-pham" className="tap-target inline-flex items-center gap-2 rounded-full bg-blue-50 px-6 py-3 text-xs font-black uppercase tracking-widest text-fpt-blue transition-all hover:gap-4 hover:bg-blue-100">
            Xem tất cả <ChevronRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            [1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-[440px] animate-pulse rounded-[2.2rem] bg-slate-100" />)
          ) : latestPubs.length === 0 ? (
            <div className="col-span-1 rounded-[2.2rem] border-2 border-dashed border-slate-200 bg-slate-50 py-20 text-center md:col-span-2 lg:col-span-3" data-aos="zoom-in">
              <Calendar size={58} className="mx-auto mb-5 text-slate-300" />
              <p className="text-lg font-black uppercase tracking-widest text-slate-400">Chưa có bản tin nào được cập nhật.</p>
            </div>
          ) : (
            latestPubs.map((pub, idx) => (
              <Card
                key={pub.id}
                data-aos="fade-up"
                data-aos-delay={idx * 100}
                data-ai-anchor={`home-latest-card-${pub.id}`}
                data-ai-card-title={pub.title}
                className="group flex h-full flex-col overflow-hidden rounded-[2.2rem] border border-slate-100 p-0 shadow-lg transition-all hover:-translate-y-2 hover:shadow-2xl"
              >
                <div className="relative h-56 overflow-hidden bg-slate-100">
                  {pub.image_url ? (
                    <img
                      src={pub.image_url}
                      srcSet={toWebpCandidate(pub.image_url) ? `${toWebpCandidate(pub.image_url)} 1x, ${pub.image_url} 1x` : undefined}
                      sizes="(max-width: 768px) 100vw, 33vw"
                      alt={pub.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                      <BookOpen size={78} className="opacity-25" />
                    </div>
                  )}

                  <div className="absolute left-5 top-5 rounded-xl bg-white/90 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-fpt-blue shadow-md backdrop-blur">
                    {pub.category === 'van' ? 'Văn học' : pub.category === 'ktpl' ? 'KTPL' : 'Nội dung mới'}
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-7">
                  <h3 className="line-clamp-2 text-2xl font-black leading-tight text-slate-800 transition-colors group-hover:text-fpt-orange">
                    {pub.title}
                  </h3>

                  <p className="mt-4 flex-1 text-sm font-medium leading-relaxed text-slate-500">
                    {`${toPlainText(pub.content).slice(0, 155)}...`}
                  </p>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                    <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <Calendar size={14} /> {new Date(pub.created_at).toLocaleDateString('vi-VN')}
                    </span>
                    <Link to={`/posts/${pub.id}`} className="tap-target flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-fpt-blue transition-colors group-hover:bg-fpt-orange group-hover:text-white">
                      <ArrowRight size={17} />
                    </Link>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      <section className="app-section cv-auto">
        <div className="mb-12 max-w-3xl" data-aos="fade-up">
          <h2 className="text-4xl font-black uppercase tracking-tight text-fpt-blue md:text-5xl">Giá trị cốt lõi</h2>
          <p className="mt-4 text-lg font-medium text-slate-500">
            Tôn - Đổi - Đồng - Chí - Gương - Sáng (Tôn trọng - Đổi mới - Đồng đội - Chí công - Gương mẫu - Sáng suốt).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {featureCards.map((feature, idx) => (
            <Card
              key={feature.title}
              data-aos="fade-up"
              data-aos-delay={idx * 100}
              className={cn(
                'rounded-[1.8rem] border bg-gradient-to-br p-7 transition-all hover:-translate-y-1 hover:shadow-xl',
                feature.colorClass
              )}
            >
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                <feature.icon size={20} />
              </div>
              <h3 className="text-2xl font-black leading-tight">{feature.title}</h3>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-500">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="app-section cv-auto" data-aos="zoom-in" data-ai-anchor="home-creative-board">
        <div className="relative overflow-hidden rounded-[3rem] bg-fpt-blue p-10 shadow-2xl md:p-16">
          <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-fpt-orange/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                <Users size={14} /> Community board
              </p>
              <h2 className="text-4xl font-black uppercase leading-tight text-white md:text-6xl">
                Bảng tin
                <br />
                <span className="text-fpt-orange">Sáng tác</span>
              </h2>
              <p className="mt-6 max-w-lg text-base font-medium leading-relaxed text-white/80 md:text-lg">
                Gửi tác phẩm, theo dõi bài nổi bật và kết nối với cộng đồng học sinh cùng tinh thần học thật, làm thật.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/20 bg-white/10 p-6 backdrop-blur md:p-8">
              <div className="space-y-4">
                <Link to="/phanmon/van/an-pham" className="tap-target flex items-center justify-between rounded-2xl bg-white/10 px-4 py-4 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-white/20">
                  Khám phá ấn phẩm mới
                  <ChevronRight size={16} />
                </Link>
                <Link to="/stories/inspiring" className="tap-target flex items-center justify-between rounded-2xl bg-white/10 px-4 py-4 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-white/20">
                  Xem câu chuyện nổi bật
                  <ChevronRight size={16} />
                </Link>
                <Link to="/events/upcoming" className="tap-target flex items-center justify-between rounded-2xl bg-white/10 px-4 py-4 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-white/20">
                  Lịch sự kiện sắp tới
                  <ChevronRight size={16} />
                </Link>
              </div>

              <Link to="/phanmon/van?tab=sang-tac" className="mt-6 block">
                <Button className="tap-target w-full rounded-2xl border-none bg-fpt-orange py-4 text-sm font-black uppercase tracking-widest text-white shadow-[0_18px_40px_-24px_rgba(242,112,36,0.95)] hover:bg-[#de631d]">
                  <Send size={17} /> Gửi bài ngay
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="app-section cv-auto" data-ai-anchor="home-submit-entry">
        <div className="rounded-[2rem] border border-orange-200 bg-gradient-to-r from-orange-50 via-white to-blue-50 p-6 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.45)] md:p-8">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-fpt-orange">Lối vào nhanh</p>
              <h3 className="mt-1 text-2xl font-black text-fpt-blue md:text-3xl">Nộp Bài Sáng Tác Nhái Bén</h3>
              <p className="mt-2 text-sm font-semibold text-slate-500 md:text-base">
                Đi thẳng tới tab Sáng tác để nộp bài, có thể đính kèm file PDF (tối đa 15MB).
              </p>
            </div>
            <Link to="/phanmon/van?tab=sang-tac">
              <Button className="tap-target rounded-2xl border-none bg-fpt-orange px-6 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-[#de631d]">
                <Send size={16} /> Mở trang nộp bài
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
