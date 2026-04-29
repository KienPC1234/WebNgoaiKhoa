import { cmsService } from './cmsService'

// Fallback permissions mapping (same as backend fallback)
const FALLBACK = {
  admin: ['admin', 'admin_panel', 'user_manage', 'auth_audit', 'ai_knowledge', 'content_manage', 'submission_review'],
  website_manager: ['admin_panel', 'content_manage'],
  submission_judge: ['admin_panel', 'submission_review'],
  teacher: ['public_user'],
  student: ['public_user'],
}

let cache = {
  permissions: FALLBACK,
  role_details: [],
  policy: {},
}

const STORAGE_KEY = 'authOverview'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    cache.permissions = parsed.permissions || FALLBACK
    cache.role_details = parsed.role_details || []
    cache.policy = parsed.policy || {}
  } catch (e) {
    // ignore
  }
}

// initialize from storage if available
if (typeof window !== 'undefined') loadFromStorage()

export async function refreshAuthOverview() {
  try {
    const res = await cmsService.getAuthOverview()
    const obj = {
      permissions: res.permissions || {},
      role_details: res.role_details || [],
      policy: res.policy || {},
    }
    cache = obj
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)) } catch (e) {}
    return cache
  } catch (err) {
    // on failure, keep existing cache
    throw err
  }
}

export function getPermissionsMap() {
  return cache.permissions || {}
}

export function getRoleDetails() {
  return cache.role_details || []
}

export function getRolesWithPermission(permission) {
  const out = new Set()
  const map = getPermissionsMap()
  for (const [slug, perms] of Object.entries(map || {})) {
    try {
      const list = Array.isArray(perms) ? perms : (typeof perms === 'string' ? JSON.parse(perms) : [])
      if (list.includes(permission) || list.includes('admin') || list.includes('all')) {
        out.add(slug)
      }
    } catch (e) {
      // ignore parsing errors
    }
  }
  // ensure fallback admin exists
  if (Object.keys(map || {}).length === 0) {
    for (const [k, v] of Object.entries(FALLBACK)) {
      if (v.includes(permission) || v.includes('admin') || v.includes('all')) out.add(k)
    }
  }
  return out
}

export function roleHasPermission(roleSlug, permission) {
  if (!roleSlug) return false
  const map = getPermissionsMap()
  const perms = map[roleSlug] || []
  if (Array.isArray(perms)) {
    if (perms.includes(permission) || perms.includes('admin') || perms.includes('all')) return true
  } else if (typeof perms === 'string') {
    try {
      const parsed = JSON.parse(perms)
      if (Array.isArray(parsed) && (parsed.includes(permission) || parsed.includes('admin') || parsed.includes('all'))) return true
    } catch (e) {}
  }
  // fallback mapping
  const fb = FALLBACK[roleSlug] || []
  return fb.includes(permission) || fb.includes('admin') || fb.includes('all')
}

export function getPolicy() {
  return cache.policy || {}
}

export default {
  refreshAuthOverview,
  getPermissionsMap,
  getRoleDetails,
  getRolesWithPermission,
  roleHasPermission,
  getPolicy,
}
