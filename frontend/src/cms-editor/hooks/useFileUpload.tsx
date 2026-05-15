import React, { useRef, useState } from 'react'
import { cmsService } from '@/lib/cmsService'
import { toastError, toastSuccess } from '@/lib/notify'

export function useFileUpload(onUrlChange?: (url: string) => void) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [fileUploading, setFileUploading] = useState(false)

  const triggerFile = () => fileInputRef.current?.click()

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event?.target?.files && event.target.files[0]
    if (!file) return

    // immediate preview using object URL
    const objectUrl = URL.createObjectURL(file)
    try {
      onUrlChange?.(objectUrl)
    } catch (err) {
      // ignore
    }

    setFileUploading(true)
    try {
      const lower = (file.name || '').toLowerCase()
      if (!lower.endsWith('.pdf')) {
        toastError('Chỉ hỗ trợ file PDF cho tính năng tải tài liệu.')
        return
      }
      const res = await cmsService.uploadPublicationPdf(file)
      const newUrl = res?.url || res?.file_url || res?.url
      if (newUrl) {
        onUrlChange?.(newUrl)
        toastSuccess('Tài liệu đã tải lên và lưu liên kết thành công.')
      } else {
        toastSuccess('Tài liệu hiển thị tạm thời trên trình duyệt.')
      }
    } catch (err) {
      toastError('Không thể tải tài liệu lên.')
    } finally {
      setFileUploading(false)
    }
  }

  return { fileInputRef, fileUploading, handleFile, triggerFile }
}

export default useFileUpload
