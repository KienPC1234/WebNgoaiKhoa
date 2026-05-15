import { Card } from './ui/core'

export const PostDetailSkeleton = () => {
  return (
    <div className="page-shell-public page-shell-post-detail bg-gray-50/50 min-h-screen">
      <section className="page-hero page-hero-caro page-hero-post-detail text-slate-700 animate-pulse">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="h-10 w-32 bg-white/50 rounded-full border border-orange-100" />
          <div className="space-y-3">
            <div className="h-12 w-3/4 bg-fpt-blue/10 rounded-2xl" />
            <div className="h-12 w-1/2 bg-fpt-blue/10 rounded-2xl" />
          </div>
          <div className="flex gap-4">
            <div className="h-4 w-24 bg-slate-200 rounded" />
            <div className="h-4 w-24 bg-slate-200 rounded" />
            <div className="h-4 w-24 bg-slate-200 rounded" />
          </div>
        </div>
      </section>

      <div className="mx-auto mt-8 w-full max-w-5xl space-y-8 px-4">
        <Card className="p-8 rounded-3xl border-none shadow-lg space-y-6 animate-pulse">
          <div className="space-y-4">
            <div className="h-6 w-full bg-slate-100 rounded" />
            <div className="h-6 w-11/12 bg-slate-100 rounded" />
            <div className="h-6 w-4/5 bg-slate-100 rounded" />
          </div>
          <div className="aspect-video w-full bg-slate-100 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-6 w-full bg-slate-100 rounded" />
            <div className="h-6 w-full bg-slate-100 rounded" />
            <div className="h-6 w-2/3 bg-slate-100 rounded" />
          </div>
        </Card>
      </div>
    </div>
  )
}
