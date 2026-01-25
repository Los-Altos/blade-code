import { cn } from '@/lib/utils'
import type { Message } from '@/lib/api'

export type { Message }

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="flex w-full justify-center p-2">
        <div className="text-xs text-zinc-500 bg-zinc-800/50 px-3 py-1 rounded-full">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex w-full gap-4 p-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded border border-green-600 bg-green-500 text-black font-bold text-sm shadow-sm">
          B
        </div>
      )}

      <div className={cn(
        "space-y-2 overflow-hidden max-w-[85%]",
        isUser ? "bg-zinc-800 rounded-lg px-4 py-3 border border-zinc-700/50" : ""
      )}>
        <div className={cn(
            "prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 text-sm whitespace-pre-wrap",
            isUser ? "text-zinc-100" : "text-zinc-200"
        )}>
          {message.content}
        </div>
      </div>

       {isUser && (
         <div className="hidden h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow-sm bg-background">
           U
         </div>
       )}
    </div>
  )
}
