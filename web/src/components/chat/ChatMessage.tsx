import { cn } from '@/lib/utils'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn(
      "flex w-full gap-4 p-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      {/* AI Avatar */}
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
            "prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 text-sm",
            isUser ? "text-zinc-100" : "text-zinc-200"
        )}>
          {message.content}
        </div>
      </div>

       {/* User Avatar (Hidden as per design, but keeping structure if needed, or just remove) */}
       {isUser && (
         <div className="hidden h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow-sm bg-background">
           U
         </div>
       )}
    </div>
  )
}
