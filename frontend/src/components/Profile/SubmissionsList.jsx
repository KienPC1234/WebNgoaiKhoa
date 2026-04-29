import React from 'react'
import { Card } from '@/components/UI'

export default function SubmissionsList({ mySubmissions }) {
  return (
    <Card className="border border-orange-100/80 bg-white/95 p-6 shadow-[0_24px_54px_-42px_rgba(15,23,42,0.4)] md:p-8">
      <h2 className="mb-4 text-2xl font-black leading-tight text-fpt-blue">BÀI THI CỦA TÔI</h2>
      {(!mySubmissions || mySubmissions.length === 0) ? (
        <p className="text-gray-400 font-semibold">Bạn chưa có bài thi nào.</p>
      ) : (
        <div className="space-y-3">
          {mySubmissions.map((item) => (
            <div key={item.id} className="rounded-xl border border-orange-100/70 bg-[#fffaf3] p-4">
              <div className="flex justify-between items-center gap-4">
                <h3 className="font-black text-fpt-blue">{item.title}</h3>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                  item.status === 'approved' ? 'bg-green-100 text-green-700' : item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-fpt-orange'
                }`}>
                  {item.status === 'approved' ? 'Đã duyệt' : item.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2 line-clamp-3">{item.content}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
