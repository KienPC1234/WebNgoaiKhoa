import { apiClient } from '@/lib/apiClient'

export const cmsService = {
  getPushConfig: async () => (await apiClient.get('/auth/push/config')).data,

  getAdminOverview: async () => (await apiClient.get('/admin/overview')).data,
  getAuthOverview: async () => (await apiClient.get('/admin/auth/overview')).data,
  getRoles: async () => (await apiClient.get('/admin/roles')).data,
  createRole: async (payload) => (await apiClient.post('/admin/roles', payload)).data,
  updateRole: async (id, payload) => (await apiClient.put(`/admin/roles/${id}`, payload)).data,
  deleteRole: async (id) => (await apiClient.delete(`/admin/roles/${id}`)).data,
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
  uploadImage: async (file, context) => {
    const formData = new FormData()
    formData.append('file', file)
    const config = { headers: { 'Content-Type': 'multipart/form-data' } }
    if (context) config.params = { context }
    return (await apiClient.post('/admin/uploads/images', formData, config)).data
  },
  createPublication: async (payload, options = {}) => (await apiClient.post('/admin/publications', payload, {
    params: {
      send_email: options.sendEmail ?? true,
      send_webpush: options.sendWebpush ?? true,
    },
  })).data,
  generatePublicationShortDescription: async ({ title = '', subject = '', contentType = '', content = '', layoutMetadata = null }) => {
    const response = await apiClient.post(
      '/ai/publication/short-description',
      {
        title,
        subject,
        content_type: contentType,
        content,
        layout_metadata: layoutMetadata || {},
      },
      {
        timeout: 45000,
      }
    )

    return String(response?.data?.description || '').trim()
  },
  updatePublication: async (id, payload) => (await apiClient.put(`/admin/publications/${id}`, payload)).data,
  savePublicationDraft: async (id, payload) => (await apiClient.patch(`/admin/publications/${id}/draft`, payload)).data,
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
  saveEventDraft: async (id, payload) => (await apiClient.patch(`/admin/events/${id}/draft`, payload)).data,
  deleteEvent: async (id) => (await apiClient.delete(`/admin/events/${id}`)).data,
  getEventOccurrences: async (start, end) => {
    const normalizeIso = (v) => {
      if (!v) return v
      if (v instanceof Date) return v.toISOString().split('.')[0] + 'Z'
      if (typeof v === 'string') return v.replace(/\.\d{3}Z$/, 'Z')
      return v
    }
    const toEpochMs = (v) => {
      if (v == null) return null
      if (v instanceof Date) return v.getTime()
      if (typeof v === 'number') return v > 1e12 ? v : v * 1000
      if (typeof v === 'string') {
        const ms = Date.parse(v)
        return isNaN(ms) ? null : ms
      }
      return null
    }
    const toEpochSec = (v) => {
      const ms = toEpochMs(v)
      return ms == null ? null : Math.floor(ms / 1000)
    }

    const sIso = normalizeIso(start)
    const eIso = normalizeIso(end)

    const tryCall = async (sParam, eParam) => {
      return (await apiClient.get('/admin/events/occurrences', { params: { start: sParam, end: eParam } })).data
    }

    try {
      return await tryCall(sIso, eIso)
    } catch (err) {
      // if backend rejects ISO (422), try epoch seconds then epoch milliseconds
      if (!(err && err.response && err.response.status === 422)) throw err

      const sSec = toEpochSec(start)
      const eSec = toEpochSec(end)
      if (sSec != null && eSec != null) {
        try {
          return await tryCall(sSec, eSec)
        } catch (err2) {
          if (!(err2 && err2.response && err2.response.status === 422)) throw err2
        }
      }

      const sMs = toEpochMs(start)
      const eMs = toEpochMs(end)
      if (sMs != null && eMs != null) {
        return (await apiClient.get('/admin/events/occurrences', { params: { start: sMs, end: eMs } })).data
      }

      throw err
    }
  },
  importEventsCsv: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return (await apiClient.post('/admin/events/import/csv', formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data
  },
  exportEventsCsv: async (start, end) => {
    const normalizeIso = (v) => {
      if (!v) return v
      if (v instanceof Date) return v.toISOString().split('.')[0] + 'Z'
      if (typeof v === 'string') return v.replace(/\.\d{3}Z$/, 'Z')
      return v
    }
    const toEpochMs = (v) => {
      if (v == null) return null
      if (v instanceof Date) return v.getTime()
      if (typeof v === 'number') return v > 1e12 ? v : v * 1000
      if (typeof v === 'string') {
        const ms = Date.parse(v)
        return isNaN(ms) ? null : ms
      }
      return null
    }
    const toEpochSec = (v) => {
      const ms = toEpochMs(v)
      return ms == null ? null : Math.floor(ms / 1000)
    }

    const sIso = normalizeIso(start)
    const eIso = normalizeIso(end)

    const tryCall = async (sParam, eParam, opts = {}) => {
      return (await apiClient.get('/admin/events/export/csv', { params: { start: sParam, end: eParam }, responseType: 'blob', ...opts })).data
    }

    try {
      return await tryCall(sIso, eIso)
    } catch (err) {
      if (!(err && err.response && err.response.status === 422)) throw err

      const sSec = toEpochSec(start)
      const eSec = toEpochSec(end)
      if (sSec != null && eSec != null) {
        try {
          return await tryCall(sSec, eSec)
        } catch (err2) {
          if (!(err2 && err2.response && err2.response.status === 422)) throw err2
        }
      }

      const sMs = toEpochMs(start)
      const eMs = toEpochMs(end)
      if (sMs != null && eMs != null) {
        return (await apiClient.get('/admin/events/export/csv', { params: { start: sMs, end: eMs }, responseType: 'blob' })).data
      }

      throw err
    }
  },
  getEventAttachments: async (eventId) => (await apiClient.get(`/admin/events/${eventId}/attachments`)).data,
  createEventAttachment: async (eventId, payload) => (await apiClient.post(`/admin/events/${eventId}/attachments`, payload)).data,
  deleteEventAttachment: async (attachmentId) => (await apiClient.delete(`/admin/events/attachments/${attachmentId}`)).data,

  getStories: async () => (await apiClient.get('/admin/stories')).data,
  getStoryById: async (id) => (await apiClient.get(`/admin/stories/${id}`)).data,
  createStory: async (payload, options = {}) => (await apiClient.post('/admin/stories', payload, {
    params: {
      send_email: options.sendEmail ?? true,
      send_webpush: options.sendWebpush ?? true,
    },
  })).data,
  updateStory: async (id, payload) => (await apiClient.put(`/admin/stories/${id}`, payload)).data,
  saveStoryDraft: async (id, payload) => (await apiClient.patch(`/admin/stories/${id}/draft`, payload)).data,
  deleteStory: async (id) => (await apiClient.delete(`/admin/stories/${id}`)).data,

  getSocialScale: async () => (await apiClient.get('/admin/social-scale')).data,
  updateSocialScale: async (payload) => (await apiClient.put('/admin/social-scale', payload)).data,
  getStaffProfiles: async () => (await apiClient.get('/admin/staff')).data,
  reorderStaff: async (orderedItems) => (await apiClient.put('/admin/staff/reorder', orderedItems)).data,
  getStaffReactionsSummary: async () => (await apiClient.get('/admin/staff/reactions/summary')).data,
  getStaffReactions: async (staffId) => (await apiClient.get(`/admin/staff/${staffId}/reactions`)).data,
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

  // Media library API
  listMediaAssets: async (params = {}) => (await apiClient.get('/admin/media/assets', { params })).data,
  deleteMediaAsset: async (assetId) => (await apiClient.delete(`/admin/media/assets/${assetId}`)).data,
  uploadMediaAsset: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return (await apiClient.post('/admin/media/assets', formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data
  },

  sendNewsletter: async (payload) => (await apiClient.post('/admin/newsletter/send', payload)).data,

  getSiteTexts: async () => (await apiClient.get('/admin/homepage')).data,
  updateSiteTexts: async (payload) => (await apiClient.put('/admin/homepage', payload)).data,
  uploadHomepageVideo: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return (await apiClient.post('/admin/homepage/videos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data
  },
}
