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

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.toolCalls.map((tool) => (
              <div
                key={tool.id}
                className={cn(
                  "text-xs px-2 py-1 rounded border",
                  tool.status === 'completed' && "bg-green-500/10 border-green-500/20 text-green-400",
                  tool.status === 'running' && "bg-blue-500/10 border-blue-500/20 text-blue-400",
                  tool.status === 'error' && "bg-red-500/10 border-red-500/20 text-red-400",
                  tool.status === 'pending' && "bg-zinc-500/10 border-zinc-500/20 text-zinc-400"
                )}
              >
                <span className="font-mono">{tool.name}</span>
                {tool.status === 'running' && <span className="ml-2 animate-pulse">●</span>}
              </div>
            ))}
          </div>
        )}
      </div>

       {isUser && (
         <div className="hidden h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow-sm bg-background">
           U
         </div>
       )}
    </div>
  )
}
