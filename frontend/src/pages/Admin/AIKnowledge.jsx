import { useEffect, useMemo, useState } from 'react'
import { Card, Button } from '@/components/UI'
import { cmsService } from '@/lib/cmsService'
import { confirmAction, showApiError, toastSuccess, toastInfo } from '@/lib/notify'
import { Database, UploadCloud, RefreshCw, FileText, Trash2, Search, ShieldCheck, AlertTriangle } from 'lucide-react'

const formatBytes = (value = 0) => {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

const ACCEPTED_TYPES = '.pdf,.txt,.md,.doc,.docx'

export const AdminAIKnowledge = () => {
  const [assets, setAssets] = useState([])
  const [overview, setOverview] = useState(null)
  const [knowledgeOverview, setKnowledgeOverview] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedFiles, setSelectedFiles] = useState([])

  const loadData = async () => {
    setLoading(true)
    try {
      const overviewPromise = typeof cmsService.getAdminOverview === 'function'
        ? cmsService.getAdminOverview()
        : Promise.resolve(null)

      const [assetData, overviewData, knowledgeOverviewData] = await Promise.all([
        cmsService.getAIKnowledgeAssets(),
        overviewPromise,
        cmsService.getAIKnowledgeOverview(),
      ])
      setAssets(assetData || [])
      setOverview(overviewData || null)
      setKnowledgeOverview(knowledgeOverviewData || null)
    } catch (error) {
      showApiError(error, 'Không thể tải dữ liệu kho tri thức AI.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredAssets = useMemo(() => {
    if (!searchTerm.trim()) return assets
    const keyword = searchTerm.toLowerCase().trim()
    return assets.filter((item) => {
      const bag = [item.file_name, item.file_type, item.uploaded_by].filter(Boolean).join(' ').toLowerCase()
      return bag.includes(keyword)
    })
  }, [assets, searchTerm])

  const onSelectFiles = (event) => {
    const files = Array.from(event.target.files || [])
    setSelectedFiles(files)
  }

  const handleUpload = async () => {
    if (!selectedFiles.length) {
      toastInfo('Vui lòng chọn ít nhất một file.')
      return
    }

    setUploading(true)
    try {
      const result = await cmsService.uploadAIKnowledgeFiles(selectedFiles)
      const uploadedCount = result?.uploaded?.length || 0
      const failedCount = result?.failed?.length || 0

      if (uploadedCount > 0) {
        toastSuccess(`Đã upload ${uploadedCount} file vào kho tri thức AI.`)
      }
      if (failedCount > 0) {
        toastInfo(`${failedCount} file lỗi khi xử lý. Vui lòng kiểm tra định dạng và nội dung file.`)
      }

      setSelectedFiles([])
      await loadData()
    } catch (error) {
      showApiError(error, 'Upload tài liệu thất bại.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (asset) => {
    const confirmed = await confirmAction({
      title: 'Xóa tài liệu khỏi kho tri thức?',
      text: `File ${asset.file_name} sẽ bị gỡ khỏi AI Knowledge.`,
      confirmButtonText: 'Xóa file',
    })
    if (!confirmed) return

    try {
      await cmsService.deleteAIKnowledgeAsset(asset.id)
      toastSuccess('Đã xóa file khỏi kho tri thức.')
      await loadData()
    } catch (error) {
      showApiError(error, 'Xóa tài liệu thất bại.')
    }
  }

  const handleResync = async () => {
    try {
      await cmsService.resyncAIKnowledge()
      toastSuccess('Đã đồng bộ lại kho tri thức AI.')
      await loadData()
    } catch (error) {
      showApiError(error, 'Không thể đồng bộ kho tri thức.')
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
              <Database size={16} className="text-slate-500" />
              AI Knowledge Admin
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Hỗ trợ upload PDF, TXT, MD, Word để AI truy xuất tri thức chính xác hơn.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatusBox label="AI status" value={overview?.ai_status || 'unknown'} tone={overview?.ai_status === 'ok' ? 'ok' : 'warn'} />
            <StatusBox label="Knowledge files" value={String(overview?.knowledge_assets || 0)} tone="info" />
            <StatusBox label="Vector docs" value={String(overview?.ai_documents || 0)} tone="info" />
            <StatusBox label="Pending review" value={String(overview?.stats?.pending_submissions || 0)} tone="warn" />
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-800">Tổng quan đồng bộ Vector DB</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            Last sync: {knowledgeOverview?.last_synced_at ? new Date(knowledgeOverview.last_synced_at).toLocaleString('vi-VN') : 'N/A'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          <MetaCell label="Total vector docs" value={String(knowledgeOverview?.documents_total ?? 0)} />
          <MetaCell label="Core docs (pub/story/event/sub)" value={String(knowledgeOverview?.documents_core ?? 0)} />
          <MetaCell label="Site static docs" value={String(knowledgeOverview?.source_counts?.site_static ?? 0)} />
          <MetaCell label="Uploaded chunks (vector docs)" value={String(knowledgeOverview?.documents_uploaded ?? 0)} />
          <MetaCell label="Knowledge files (uploaded)" value={String(knowledgeOverview?.knowledge_assets ?? 0)} />
          <MetaCell label="Publications" value={String(knowledgeOverview?.source_counts?.publication ?? 0)} />
          <MetaCell label="Stories" value={String(knowledgeOverview?.source_counts?.story ?? 0)} />
          <MetaCell label="Events" value={String(knowledgeOverview?.source_counts?.event ?? 0)} />
          <MetaCell label="Approved subs" value={String(knowledgeOverview?.source_counts?.submission ?? 0)} />
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Chú thích: <strong>Total vector docs</strong> là tổng số document đang lưu trong Chroma. <strong>Core docs</strong> = publications / stories / events / approved submissions. <strong>Site static</strong> là các mục tri thức tĩnh (intents/static entries). <strong>Uploaded chunks</strong> là số đoạn (chunks) được vector hoá từ file upload; <strong>Knowledge files</strong> là số file đã upload vào hệ thống.
        </p>
      </Card>

      <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <label className="mb-2 block text-xs font-medium text-slate-600">Chọn tài liệu tri thức</label>
            <input
              type="file"
              multiple
              accept={ACCEPTED_TYPES}
              onChange={onSelectFiles}
              className="w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-600"
            />
            <p className="mt-2 text-xs text-slate-500">Định dạng hỗ trợ: PDF, TXT, MD, DOC, DOCX</p>
            {selectedFiles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedFiles.map((file) => (
                  <span key={`${file.name}-${file.size}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                    {file.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-4 flex flex-col justify-end gap-3">
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full rounded-md border-none bg-slate-900 py-2.5 text-xs normal-case tracking-normal text-white hover:bg-slate-700"
            >
              <UploadCloud size={16} className="mr-2" />
              {uploading ? 'Đang upload...' : 'Upload vào AI Knowledge'}
            </Button>
            <Button
              onClick={handleResync}
              variant="outline"
              className="w-full rounded-md border border-slate-300 bg-white py-2.5 text-xs normal-case tracking-normal text-slate-700 hover:bg-slate-100"
            >
              <RefreshCw size={16} className="mr-2" /> Đồng bộ từ CMS
            </Button>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <FileText size={16} className="text-slate-500" /> Danh sách tài liệu tri thức
          </h3>
          <div className="relative w-full md:w-96">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm file theo tên hoặc loại..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-slate-400"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
            <p className="mt-3 text-sm text-slate-500">Đang tải kho tri thức...</p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 py-12 text-center">
            <FileText size={38} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">Chưa có tài liệu nào trong AI Knowledge</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAssets.map((asset) => (
              <div key={asset.id} className="grid items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-12">
                <div className="md:col-span-5 min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{asset.file_name}</p>
                  <p className="mt-1 text-xs text-slate-500">{asset.file_type}</p>
                </div>
                <div className="md:col-span-5 grid grid-cols-3 gap-2 text-center">
                  <MetaCell label="Size" value={formatBytes(asset.size_bytes)} />
                  <MetaCell label="Chunks" value={String(asset.chunks)} />
                  <MetaCell label="Uploader" value={asset.uploaded_by || 'admin'} />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button
                    onClick={() => handleDelete(asset)}
                    variant="danger"
                    className="h-9 w-9 rounded-md p-0"
                    title="Xóa tài liệu"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

const StatusBox = ({ label, value, tone = 'info' }) => {
  const toneClass = tone === 'ok'
    ? 'bg-emerald-50 text-emerald-700'
    : tone === 'warn'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-blue-50 text-blue-700'

  const Icon = tone === 'ok' ? ShieldCheck : AlertTriangle

  return (
    <div className={`rounded-lg px-3 py-2.5 ${toneClass}`}>
      <div className="flex items-center gap-2 text-[11px] font-medium">
        <Icon size={12} /> {label}
      </div>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  )
}

const MetaCell = ({ label, value }) => (
  <div className="rounded-md bg-slate-50 p-3 flex flex-col justify-between min-h-[64px]">
    <div className="text-[11px] text-slate-500 leading-tight">{label}</div>
    <div className="mt-1 text-lg font-semibold text-slate-900 leading-none">{value}</div>
  </div>
)
