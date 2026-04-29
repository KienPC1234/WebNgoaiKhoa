import React from 'react'
import { Card, Button } from '@/components/UI'
import { Mail } from 'lucide-react'

const StaffCard = ({ person, onEdit, onDelete }) => {
  return (
    <Card className="p-0 border-none rounded-2xl overflow-hidden shadow">
      <div className="relative aspect-[4/5] bg-gray-100">
        {person.image_url ? (
          <img src={person.image_url} alt={person.full_name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
        )}
      </div>
      <div className="p-4">
        <h4 className="text-lg font-black text-gray-900">{person.full_name}</h4>
        <div className="flex items-center gap-3 mt-1">
          <div className="text-xs uppercase text-fpt-orange font-black">{person.title}</div>
        </div>
        {person.bio ? (
          <p className="text-sm text-gray-500 mt-2 line-clamp-3" dangerouslySetInnerHTML={{ __html: person.bio }} />
        ) : (
          <p className="text-sm text-gray-500 mt-2">{person.expertise}</p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="text-sm text-gray-500 flex items-center gap-2 min-w-0">
            <Mail size={14} className="flex-shrink-0" />
            <span className="truncate">{person.email}</span>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" className="px-3 py-1" onClick={() => onEdit && onEdit(person)}>Sửa</Button>
            <Button size="sm" variant="danger" className="px-3 py-1" onClick={() => onDelete && onDelete(person.id)}>Xóa</Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default StaffCard
