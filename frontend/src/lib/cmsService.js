import { apiClient } from '@/lib/apiClient'

export const cmsService = {
  getPushConfig: async () => (await apiClient.get('/auth/push/config')).data,

  getAdminOverview: async () => (await apiClient.get('/admin/overview')).data,
  getStats: async () => (await apiClient.get('/admin/stats')).data,
  getRecentSubmissions: async () => (await apiClient.get('/admin/submissions')).data,

  getPublications: async (params = {}) => (await apiClient.get('/admin/publications', { params })).data,
  getPublicationById: async (id) => (await apiClient.get(`/admin/publications/${id}`)).data,
  getPublicSubjects: async () => (await apiClient.get('/public/subjects')).data,
  uploadPublicationPdf: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return (await apiClient.post('/admin/publications/upload-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data
  },
  createPublication: async (payload, options = {}) => (await apiClient.post('/admin/publications', payload, {
    params: {
      send_email: options.sendEmail ?? true,
      send_webpush: options.sendWebpush ?? true,
    },
  })).data,
  updatePublication: async (id, payload) => (await apiClient.put(`/admin/publications/${id}`, payload)).data,
  deletePublication: async (id) => (await apiClient.delete(`/admin/publications/${id}`)).data,

  getEvents: async () => (await apiClient.get('/admin/events')).data,
  getEventById: async (id) => (await apiClient.get(`/admin/events/${id}`)).data,
  getUpcomingEvents: async () => (await apiClient.get('/admin/events/upcoming')).data,
  createEvent: async (payload, options = {}) => (await apiClient.post('/admin/events', payload, {
    params: {
      send_email: options.sendEmail ?? true,
      send_webpush: options.sendWebpush ?? true,
    },
  })).data,
  updateEvent: async (id, payload) => (await apiClient.put(`/admin/events/${id}`, payload)).data,
  deleteEvent: async (id) => (await apiClient.delete(`/admin/events/${id}`)).data,

  getStories: async () => (await apiClient.get('/admin/stories')).data,
  getStoryById: async (id) => (await apiClient.get(`/admin/stories/${id}`)).data,
  createStory: async (payload, options = {}) => (await apiClient.post('/admin/stories', payload, {
    params: {
      send_email: options.sendEmail ?? true,
      send_webpush: options.sendWebpush ?? true,
    },
  })).data,
  updateStory: async (id, payload) => (await apiClient.put(`/admin/stories/${id}`, payload)).data,
  deleteStory: async (id) => (await apiClient.delete(`/admin/stories/${id}`)).data,

  getSocialScale: async () => (await apiClient.get('/admin/social-scale')).data,
  updateSocialScale: async (payload) => (await apiClient.put('/admin/social-scale', payload)).data,
  getStaffProfiles: async () => (await apiClient.get('/admin/staff')).data,
  createStaffProfile: async (payload) => (await apiClient.post('/admin/staff', payload)).data,
  updateStaffProfile: async (id, payload) => (await apiClient.put(`/admin/staff/${id}`, payload)).data,
  deleteStaffProfile: async (id) => (await apiClient.delete(`/admin/staff/${id}`)).data,

  getAIKnowledgeAssets: async () => (await apiClient.get('/admin/ai-knowledge/assets')).data,
  getAIKnowledgeOverview: async () => (await apiClient.get('/admin/ai-knowledge/overview')).data,
  uploadAIKnowledgeFiles: async (files) => {
    const formData = new FormData()
    ;(files || []).forEach((file) => formData.append('files', file))
    return (await apiClient.post('/admin/ai-knowledge/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data
  },
  deleteAIKnowledgeAsset: async (assetId) => (await apiClient.delete(`/admin/ai-knowledge/assets/${assetId}`)).data,
  resyncAIKnowledge: async () => (await apiClient.post('/admin/ai-knowledge/resync')).data,

  sendNewsletter: async (payload) => (await apiClient.post('/admin/newsletter/send', payload)).data,
}
