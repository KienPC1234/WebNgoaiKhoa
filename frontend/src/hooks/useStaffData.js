import { useEffect, useState } from 'react'
import { cmsService } from '@/lib/cmsService'
import { toastSuccess, showApiError } from '@/lib/notify'

export default function useStaffData() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(false)
  const [reordering, setReordering] = useState(false)

  const fetchStaff = async () => {
    setLoading(true)
    try {
      console.log('[useStaffData] fetching staff')
      const res = await cmsService.getStaffProfiles()
      setStaff(res || [])
    } catch (err) {
      console.error('Error fetching staff:', err)
      showApiError(err, 'Không tải được danh sách giáo viên')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStaff() }, [])

  const createStaff = async (payload) => {
    try {
      const res = await cmsService.createStaffProfile(payload)
      toastSuccess('Đã thêm hồ sơ giáo viên')
      await fetchStaff()
      return res
    } catch (err) {
      showApiError(err, 'Thêm hồ sơ thất bại')
      throw err
    }
  }

  const updateStaff = async (item) => {
    try {
      const res = await cmsService.updateStaffProfile(item.id, item)
      toastSuccess('Đã cập nhật hồ sơ')
      await fetchStaff()
      return res
    } catch (err) {
      showApiError(err, 'Cập nhật thất bại')
      throw err
    }
  }

  const deleteStaff = async (id) => {
    try {
      await cmsService.deleteStaffProfile(id)
      toastSuccess('Đã xóa hồ sơ')
      await fetchStaff()
    } catch (err) {
      showApiError(err, 'Xóa thất bại')
      throw err
    }
  }

  const uploadImage = async (file) => {
    try {
      const res = await cmsService.uploadImage(file, 'doingu')
      return res?.url || res
    } catch (err) {
      showApiError(err, 'Tải ảnh thất bại')
      throw err
    }
  }

  const reorderStaff = async (orderedItems = []) => {
    if (!orderedItems || orderedItems.length === 0) return

    // Optimistically update local list to preserve DOM elements and avoid a full refetch.
    const previous = staff
    const newItems = (orderedItems || []).map((item, idx) => ({ ...item, display_order: Number(idx + 1) }))
    setStaff(newItems)

    setReordering(true)
    try {
      console.log('[useStaffData] reorderStaff called, new order ids:', newItems.map(i => i.id))
      // Persist new order to backend using bulk endpoint (single request)
      await cmsService.reorderStaff(newItems)
      // No success toast — inline spinner indicates progress
    } catch (err) {
      console.error('Error reordering staff:', err)
      // Revert local state on failure
      setStaff(previous)
      showApiError(err, 'Sắp xếp hồ sơ thất bại')
      throw err
    } finally {
      setReordering(false)
    }
  }

  return { staff, loading, reordering, fetchStaff, createStaff, updateStaff, deleteStaff, uploadImage, reorderStaff }
}
