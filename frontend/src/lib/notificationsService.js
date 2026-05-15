import { apiClient } from '@/lib/apiClient'

export async function getNotifications() {
  try {
    const { data } = await apiClient.get('/notifications')
    return data || []
  } catch (e) {
    // If endpoint missing or unauthorized, return empty list
    return []
  }
}

export async function markNotificationAsRead(id) {
  try {
    await apiClient.post(`/notifications/${id}/mark-read`)
  } catch (e) {
    // ignore
  }
}

export async function markAllNotificationsRead() {
  try {
    await apiClient.post('/notifications/mark-all-read')
  } catch (e) {
    // ignore
  }
}

export default {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsRead,
}
