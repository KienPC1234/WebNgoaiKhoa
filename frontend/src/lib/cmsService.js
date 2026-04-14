import { apiClient } from '@/lib/apiClient'

export const cmsService = {
  getStats: async () => (await apiClient.get('/admin/stats')).data,
  getRecentSubmissions: async () => (await apiClient.get('/admin/submissions')).data,

  getPublications: async () => (await apiClient.get('/admin/publications')).data,
  getPublicationById: async (id) => (await apiClient.get(`/admin/publications/${id}`)).data,
  createPublication: async (payload) => (await apiClient.post('/admin/publications', payload)).data,
  updatePublication: async (id, payload) => (await apiClient.put(`/admin/publications/${id}`, payload)).data,
  deletePublication: async (id) => (await apiClient.delete(`/admin/publications/${id}`)).data,

  getEvents: async () => (await apiClient.get('/admin/events')).data,
  getUpcomingEvents: async () => (await apiClient.get('/admin/events/upcoming')).data,
  createEvent: async (payload) => (await apiClient.post('/admin/events', payload)).data,
  updateEvent: async (id, payload) => (await apiClient.put(`/admin/events/${id}`, payload)).data,
  deleteEvent: async (id) => (await apiClient.delete(`/admin/events/${id}`)).data,

  getStories: async () => (await apiClient.get('/admin/stories')).data,
  createStory: async (payload) => (await apiClient.post('/admin/stories', payload)).data,
  updateStory: async (id, payload) => (await apiClient.put(`/admin/stories/${id}`, payload)).data,
  deleteStory: async (id) => (await apiClient.delete(`/admin/stories/${id}`)).data,

  getSocialScale: async () => (await apiClient.get('/admin/social-scale')).data,
  updateSocialScale: async (payload) => (await apiClient.put('/admin/social-scale', payload)).data,
  getStaffProfiles: async () => (await apiClient.get('/admin/staff')).data,
  createStaffProfile: async (payload) => (await apiClient.post('/admin/staff', payload)).data,
  updateStaffProfile: async (id, payload) => (await apiClient.put(`/admin/staff/${id}`, payload)).data,
  deleteStaffProfile: async (id) => (await apiClient.delete(`/admin/staff/${id}`)).data,
}
