import axios from 'axios'
import { extractErrorMessage, toastError } from '@/lib/notify'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 20000,
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Ignore canceled requests (AbortController / axios cancel) — don't show a toast for these
    const isCanceled = error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError' || error?.message === 'canceled'
    if (isCanceled) {
      return Promise.reject(error)
    }

    const status = error?.response?.status
    if (status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      try { window.dispatchEvent(new Event('auth-changed')) } catch (e) { /* noop */ }
    } else {
      const message = extractErrorMessage(error, 'Không thể kết nối tới máy chủ.')
      toastError(message)
    }

    return Promise.reject(error)
  }
)
