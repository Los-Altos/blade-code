import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/AppStore'

export function FilePreview() {
  const { toggleFilePreview } = useAppStore()

  return (
    <div className="w-[55%] min-w-[400px] max-w-[800px] border-l bg-[#09090b] flex flex-col h-full shadow-xl shrink-0">
      <div className="flex items-center justify-between px-4 h-12 border-b border-zinc-800 shrink-0">
        <span className="font-normal text-[13px] text-zinc-400 font-mono">File Preview</span>
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleFilePreview} 
            className="h-8 w-8 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-zinc-500">
          <div className="text-4xl mb-4">📄</div>
          <div className="text-sm">No file selected for preview</div>
        </div>
      </div>
    </div>
  )
}
