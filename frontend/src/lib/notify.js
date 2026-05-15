import Swal from 'sweetalert2'

const toastBase = {
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2800,
  timerProgressBar: true,
  background: '#ffffff',
  color: '#334155',
  customClass: {
    popup: 'rounded-xl border border-slate-200 shadow-[0_18px_36px_-20px_rgba(15,23,42,0.6)]',
    title: 'text-sm font-semibold',
    timerProgressBar: 'bg-fpt-orange',
  },
}

export const extractErrorMessage = (error, fallback = 'Có lỗi xảy ra. Vui lòng thử lại.') => {
  // Treat cancellation/abort-like errors as non-actionable (return fallback)
  const isCancelLike = (e) => {
    if (!e) return false
    if (typeof e === 'string') {
      return /\b(cancel|canceled|cancelled|abort|aborted|err_canceled|cancelederror)\b/i.test(e)
    }
    const msg = String(e?.message || e?.code || e?.name || '')
    return /\b(cancel|canceled|cancelled|abort|aborted|err_canceled|cancelederror)\b/i.test(msg)
  }

  if (isCancelLike(error)) return fallback

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
export const toastError = (title) => {
  // Avoid showing toasts for cancellation/abort-like messages
  if (!title) return
  const s = typeof title === 'string' ? title : String(title)
  if (/\b(cancel|canceled|cancelled|abort|aborted|err_canceled|cancelederror)\b/i.test(s)) return
  return showToast('error', title)
}
export const toastInfo = (title) => {
  if (!title) return
  const s = typeof title === 'string' ? title : String(title)
  if (/\b(cancel|canceled|cancelled|abort|aborted|err_canceled|cancelederror)\b/i.test(s)) return
  return showToast('info', title)
}

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
    background: '#ffffff',
    color: '#334155',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    focusCancel: true,
    customClass: {
      popup: 'rounded-2xl border border-slate-200 shadow-[0_20px_46px_-24px_rgba(15,23,42,0.6)]',
      title: 'text-lg font-semibold text-slate-800',
      htmlContainer: 'text-sm text-slate-600',
      confirmButton: 'rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700',
      cancelButton: 'rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100',
    },
    buttonsStyling: false,
  })

  return result.isConfirmed
}