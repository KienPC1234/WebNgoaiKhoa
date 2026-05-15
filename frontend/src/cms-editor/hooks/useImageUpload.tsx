import React, { useRef, useState } from 'react'
import { cmsService } from '@/lib/cmsService'
import { toastError, toastSuccess } from '@/lib/notify'

export function useImageUpload(onUrlChange?: (url: string) => void) {
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const [imageUploading, setImageUploading] = useState(false)

  const triggerImageFile = () => imageInputRef.current?.click()

  const handleImageFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event?.target?.files && event.target.files[0]
    if (!file) return

    // immediate preview
    const objectUrl = URL.createObjectURL(file)
    try {
      onUrlChange?.(objectUrl)
    } catch (err) {
      // ignore
    }

    setImageUploading(true)
    try {
      const res = await cmsService.uploadImage(file, 'cms-editor')
      const newUrl = res?.url || res?.image_url || res?.file_url
      if (newUrl) {
        onUrlChange?.(newUrl)
        toastSuccess('Ảnh đã tải lên và lưu liên kết thành công.')
      } else {
        toastSuccess('Ảnh hiển thị tạm thời trên trình duyệt.')
      }
    } catch (err) {
      toastError('Không thể tải ảnh lên — ảnh chỉ hiển thị tạm thời trên trình duyệt.')
    } finally {
      setImageUploading(false)
    }
  }

  return { imageInputRef, imageUploading, triggerImageFile, handleImageFile }
}

export default useImageUpload
