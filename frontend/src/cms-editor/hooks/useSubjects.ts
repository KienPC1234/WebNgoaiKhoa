import { useEffect, useState } from 'react'
import { cmsService } from '@/lib/cmsService'

export function useSubjects() {
  const [subjects, setSubjects] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const s = await cmsService.getPublicSubjects()
        if (!cancelled) setSubjects(Array.isArray(s) ? s : [])
      } catch (err) {
        console.error('Failed to load subjects', err)
        if (!cancelled) setSubjects([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  return { subjects, loading }
}

export default useSubjects
