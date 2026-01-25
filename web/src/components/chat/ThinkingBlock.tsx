import { useSessionStore } from '@/store/SessionStore'
import { ChevronDown, ChevronRight, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ThinkingBlock() {
  const { currentThinkingContent, thinkingExpanded, toggleThinkingExpanded } = useSessionStore()

  if (!currentThinkingContent) return null

  const lines = currentThinkingContent.split('\n')
  const previewLines = lines.slice(0, 3).join('\n')
  const hasMore = lines.length > 3

  return (
    <div className="mx-4 mb-4 border border-purple-500/20 rounded-lg bg-purple-500/5 overflow-hidden">
      <button
        onClick={toggleThinkingExpanded}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-purple-400 hover:bg-purple-500/10 transition-colors"
      >
        <Brain className="h-4 w-4" />
        <span className="font-medium">Thinking</span>
        <span className="text-purple-500/60 text-xs">({lines.length} lines)</span>
        <div className="flex-1" />
        {thinkingExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      <div className={cn(
        'px-3 pb-3 text-sm text-purple-300/80 font-mono whitespace-pre-wrap overflow-hidden transition-all duration-200',
        thinkingExpanded ? 'max-h-[400px] overflow-y-auto' : 'max-h-20'
      )}>
        {thinkingExpanded ? currentThinkingContent : (
          <>
            {previewLines}
            {hasMore && <span className="text-purple-500/50">...</span>}
          </>
        )}
      </div>
    </div>
  )
}
