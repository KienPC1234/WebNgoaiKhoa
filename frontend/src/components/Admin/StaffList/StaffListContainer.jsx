import React, { useState } from 'react'
import StaffToolbar from './StaffToolbar'
import StaffGrid from './StaffGrid'
import StaffTable from './StaffTable'
import StaffEditorModal from './StaffEditorModal'
import useStaffData from '@/hooks/useStaffData'
import { Card } from '@/components/UI'
// Chart and summary moved to Admin page

const emptyStaff = {
  full_name: '',
  title: '',
  bio: '',
  email: '',
  image_url: '',
  expertise: '',
  tier: '',
  display_order: 0,
  is_active: true,
}

const StaffListContainer = () => {
  const { staff, loading, reordering, fetchStaff, createStaff, updateStaff, deleteStaff, uploadImage, reorderStaff } = useStaffData()
  const [view, setView] = useState('grid')
  const [query, setQuery] = useState('')
  const [tierFilter, setTierFilter] = useState('')

  const filtered = (staff || []).filter((s) => {
    const q = (query || '').toLowerCase().trim()
    if (tierFilter && ((s.tier || '') !== tierFilter)) return false
    if (!q) return true
    return (s.full_name || '').toLowerCase().includes(q) || (s.title || '').toLowerCase().includes(q) || (s.expertise || '').toLowerCase().includes(q)
  })

  // Use modal for create; call `handleCreateOpen` to open create modal with an empty staff object.

  const [editingItem, setEditingItem] = useState(null)

  const handleEditOpen = (p) => {
    console.log('[StaffListContainer] open editor for id:', p?.id)
    // store a shallow copy so upstream list refreshes don't mutate the modal's object
    setEditingItem(p ? { ...p } : p)
  }

  const handleCreateOpen = () => {
    console.log('[StaffListContainer] open create modal')
    setEditingItem({ ...emptyStaff })
  }

  // reactions summary moved to Admin page; StaffListContainer focuses on staff CRUD

  const handleEditorClose = () => setEditingItem(null)

  const handleSaveFromModal = async (item) => {
    if (item.id) {
      await updateStaff(item)
    } else {
      await createStaff(item)
    }
    await fetchStaff()
  }

  return (
    <div>
      <Card className="p-6 rounded-3xl border border-gray-100 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-2xl font-black text-fpt-blue uppercase tracking-tight">Đội ngũ</h2>
        </div>

        <StaffToolbar view={view} setView={setView} query={query} setQuery={setQuery} onCreateToggle={handleCreateOpen} onRefresh={async () => { await fetchStaff() }} tierFilter={tierFilter} setTierFilter={setTierFilter} />

        {view === 'grid' ? (
          <StaffGrid staff={filtered} loading={loading} reordering={reordering} onEdit={handleEditOpen} onDelete={async (id) => await deleteStaff(id)} onReorder={reorderStaff} />
        ) : (
          <StaffTable staff={filtered} loading={loading} reordering={reordering} onUpdate={updateStaff} onDelete={async (id) => await deleteStaff(id)} onEdit={handleEditOpen} onReorder={reorderStaff} />
        )}

        <StaffEditorModal
          open={!!editingItem}
          item={editingItem}
          onClose={handleEditorClose}
          onSave={handleSaveFromModal}
          onDelete={async (id) => { await deleteStaff(id); handleEditorClose() }}
          onUploadImage={uploadImage}
        />
      </Card>
    </div>
  )
}

export default StaffListContainer
