import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/AppStore'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { cn } from '@/lib/utils'

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

export function FilePreview() {
  const { toggleFilePreview } = useAppStore()

  // Mock diff content matching design
  const diffLines: DiffLine[] = [
    { type: 'unchanged', content: "import { clsx } from 'clsx'", oldLineNumber: 1, newLineNumber: 1 },
    { type: 'removed', content: "import { twMerge } from 'tailwind-merge'", oldLineNumber: 2 },
    { type: 'added', content: "import { twMerge, type ClassValue } from 'tailwind-merge'", newLineNumber: 2 },
    { type: 'unchanged', content: "", oldLineNumber: 3, newLineNumber: 3 },
    { type: 'removed', content: "export function cn(...inputs: ClassValue[]) {", oldLineNumber: 4 },
    { type: 'added', content: "export function cn(...inputs: (ClassValue | undefined)[]) {", newLineNumber: 4 },
    { type: 'unchanged', content: "  return twMerge(clsx(inputs))", oldLineNumber: 5, newLineNumber: 5 },
    { type: 'unchanged', content: "}", oldLineNumber: 6, newLineNumber: 6 },
  ]

  return (
    <div className="w-[55%] min-w-[400px] max-w-[800px] border-l bg-[#09090b] flex flex-col h-full shadow-xl shrink-0">
      <div className="flex items-center justify-between px-4 h-12 border-b border-zinc-800 shrink-0">
        <span className="font-normal text-[13px] text-zinc-400 font-mono">utils.ts</span>
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleFilePreview} 
            className="h-8 w-8 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col font-mono text-[12px]">
            {diffLines.map((line, index) => (
                <div 
                    key={index} 
                    className={cn(
                        "flex w-full min-h-[24px] items-center",
                        line.type === 'added' && "bg-[#143d20]",
                        line.type === 'removed' && "bg-[#3f1d1d]",
                    )}
                >
                    {/* Content */}
                    <div className="flex-1 px-4 py-0.5 whitespace-pre-wrap break-all">
                        <span className={cn(
                            "block",
                            line.type === 'added' && "text-[#86efac]",
                            line.type === 'removed' && "text-[#fca5a5]",
                            line.type === 'unchanged' && "text-zinc-400"
                        )}>
                            {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}
                            {line.content}
                        </span>
                    </div>
                </div>
            ))}
        </div>
      </ScrollArea>
    </div>
  )
}
