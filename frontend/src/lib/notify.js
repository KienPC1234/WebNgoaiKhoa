import Swal from 'sweetalert2'

const toastBase = {
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2600,
  timerProgressBar: true,
}

export const extractErrorMessage = (error, fallback = 'Có lỗi xảy ra. Vui lòng thử lại.') => {
  const detail = error?.response?.data?.detail
  if (Array.isArray(detail)) {
    return detail.map((x) => x?.msg).filter(Boolean).join(', ') || fallback
  }
  if (typeof detail === 'string' && detail.trim()) return detail
  if (typeof error?.message === 'string' && error.message.trim()) return error.message
  return fallback
}

export const showToast = (icon = 'info', title = '') => Swal.fire({
  ...toastBase,
  icon,
  title,
})

export const toastSuccess = (title) => showToast('success', title)
export const toastError = (title) => showToast('error', title)
export const toastInfo = (title) => showToast('info', title)

export const showApiError = (error, fallback) => {
  const message = extractErrorMessage(error, fallback)
  return toastError(message)
}

export const confirmAction = async ({
  title = 'Bạn có chắc chắn?',
  text = 'Hành động này có thể không hoàn tác được.',
  confirmButtonText = 'Xác nhận',
  cancelButtonText = 'Hủy',
  icon = 'warning',
}) => {
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    focusCancel: true,
  })

  return result.isConfirmed
}