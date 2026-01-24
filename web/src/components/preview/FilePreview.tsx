import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/AppStore'
import { ScrollArea } from '@/components/ui/ScrollArea'

export function FilePreview() {
  const { toggleFilePreview } = useAppStore()

  // Mock file content
  const fileContent = `import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}`

  return (
    <div className="w-[500px] border-l bg-sidebar flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b h-[48px]">
        <h3 className="font-semibold">Files</h3>
        <Button variant="ghost" size="icon" onClick={toggleFilePreview}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4">
            <div className="text-sm font-medium mb-2">utils.ts</div>
            <pre className="p-4 rounded-lg bg-muted/50 text-xs overflow-x-auto font-mono">
                <code>{fileContent}</code>
            </pre>
        </div>
      </ScrollArea>
    </div>
  )
}
