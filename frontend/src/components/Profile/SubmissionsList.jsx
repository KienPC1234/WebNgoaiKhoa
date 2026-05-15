import React from 'react'
import { FileText, CheckCircle2, XCircle, Clock, Inbox, ChevronRight } from 'lucide-react'

const statusConfig = {
  approved: {
    label: 'Đã duyệt',
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-100',
    dot: 'bg-emerald-400',
  },
  rejected: {
    label: 'Từ chối',
    icon: XCircle,
    bg: 'bg-red-50',
    text: 'text-red-500',
    border: 'border-red-100',
    dot: 'bg-red-400',
  },
  pending: {
    label: 'Chờ duyệt',
    icon: Clock,
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-100',
    dot: 'bg-amber-400',
  },
}

const getStatus = (status) => {
  if (status === 'approved') return statusConfig.approved
  if (status === 'rejected') return statusConfig.rejected
  return statusConfig.pending
}

const formatDate = (value) => {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return ''
  }
}

export default function SubmissionsList({ mySubmissions }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
            <FileText size={14} className="text-white" />
          </div>
          Bài thi của tôi
        </h2>
        <p className="mt-1 text-xs text-gray-400 font-medium ml-10">Danh sách các bài thi đã gửi</p>
      </div>

      {/* List */}
      {!mySubmissions || mySubmissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 mb-3">
            <Inbox size={24} className="text-gray-300" />
          </div>
          <p className="text-sm font-bold text-gray-400">Chưa có bài thi nào</p>
          <p className="mt-1 text-xs text-gray-300">Các bài thi bạn gửi sẽ hiển thị ở đây</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {mySubmissions.map((item) => {
            const st = getStatus(item.status)
            const StatusIcon = st.icon

            return (
              <div
                key={item.id}
                className={`group relative overflow-hidden rounded-2xl border ${st.border} bg-white px-4 py-3.5 transition-all hover:shadow-md hover:shadow-gray-100/60 hover:-translate-y-px cursor-default`}
              >
                {/* Subtle left accent */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${st.dot} rounded-l-2xl`} />

                <div className="flex items-start gap-3 pl-2">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${st.bg}`}>
                    <StatusIcon size={14} className={st.text} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-black text-gray-800 leading-snug line-clamp-1">{item.title}</h3>
                      <span className={`shrink-0 inline-flex items-center gap-1 rounded-lg ${st.bg} px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${st.text}`}>
                        {st.label}
                      </span>
                    </div>

                    {item.content && (
                      <p className="mt-1 text-xs text-gray-400 line-clamp-2 leading-relaxed">{item.content}</p>
                    )}

                    {item.created_at && (
                      <p className="mt-1.5 text-[10px] text-gray-300 font-medium">
                        Gửi lúc {formatDate(item.created_at)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
