import { HybridCMSEditorRoot } from '@/cms-editor'

export const AdminCMSEditorFramework = () => {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black text-fpt-blue uppercase tracking-tight">CMS Editor Framework</h2>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Hybrid rich text + layout builder, JSON versioned document model
        </p>
      </div>
      <HybridCMSEditorRoot />
    </div>
  )
}
