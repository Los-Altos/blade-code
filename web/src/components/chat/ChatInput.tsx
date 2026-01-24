import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Paperclip } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (!input.trim() || disabled) return
    onSend(input)
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  return (
    <div className="px-[100px] py-6 border-t border-border/40 bg-background">
      <div className="relative border border-zinc-800 rounded-lg shadow-sm bg-zinc-950/50 focus-within:ring-1 focus-within:ring-zinc-700 transition-all duration-200 flex flex-col min-h-[120px]">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type @ for files, / for commands..."
          className="flex-1 w-full resize-none border-0 bg-transparent py-4 px-4 focus-visible:ring-0 text-zinc-300 placeholder:text-zinc-600"
          disabled={disabled}
        />
        
        <div className="flex items-center justify-between p-3 mt-auto">
             <div className="flex items-center gap-2">
                 <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50">
                    <Paperclip className="h-4 w-4" />
                 </Button>
                 {/* Model Selector */}
                 <div className="text-xs text-zinc-500 px-2 py-1 rounded hover:bg-zinc-800/50 cursor-pointer transition-colors">
                    Claude 3.5 Sonnet
                 </div>
             </div>
             <Button 
                size="icon" 
                onClick={handleSend} 
                disabled={!input.trim() || disabled}
                className="h-8 w-8 bg-zinc-100 text-zinc-900 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600"
             >
                <Send className="h-4 w-4" />
             </Button>
        </div>
      </div>
      <div className="text-center text-xs text-zinc-600 mt-3 font-mono">
        Blade can make mistakes. Please check important information.
      </div>
    </div>
  )
}
