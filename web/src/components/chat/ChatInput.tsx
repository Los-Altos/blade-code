import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { PermissionMode, useConfigStore } from '@/store/ConfigStore'
import { useSessionStore } from '@/store/SessionStore'
import { ChevronDown, Paperclip, Send, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface ChatInputProps {
  onSend: (message: string) => void
  onAbort?: () => void
  disabled?: boolean
  isStreaming?: boolean
}

const MODES: { value: PermissionMode; label: string }[] = [
  { value: PermissionMode.DEFAULT, label: 'Default' },
  { value: PermissionMode.AUTO_EDIT, label: 'Auto Edit' },
  { value: PermissionMode.PLAN, label: 'Plan' },
  { value: PermissionMode.SPEC, label: 'Spec' },
]

export function ChatInput({ onSend, onAbort, disabled, isStreaming }: ChatInputProps) {
  const [input, setInput] = useState("")
  const [modelOpen, setModelOpen] = useState(false)
  const [modeOpen, setModeOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const { currentModelId, configuredModels, loadModels, setCurrentModel, currentMode, setMode } = useConfigStore()
  const { setMaxContextTokens } = useSessionStore()

  useEffect(() => {
    loadModels()
  }, [loadModels])

  useEffect(() => {
    if (configuredModels.length === 0) return
    const modelInfo = configuredModels.find(m => m.id === currentModelId)
    if (modelInfo) {
      const hasConfiguredTokens = !!modelInfo.maxContextTokens
      const maxTokens = modelInfo.maxContextTokens || 128000
      setMaxContextTokens(maxTokens, !hasConfiguredTokens)
    }
  }, [currentModelId, configuredModels, setMaxContextTokens])

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

  const currentModelInfo = configuredModels.find(m => m.id === currentModelId)
  const displayModelName = currentModelInfo?.model || currentModelId || 'Select Model'
  const currentModeLabel = MODES.find(m => m.value === currentMode)?.label || 'Default'

  return (
    <div className="px-4 sm:px-8 lg:px-12 py-4 border-t border-border/40 bg-background">
      <div className="relative border border-zinc-800 rounded-lg shadow-sm bg-zinc-950/50 focus-within:border-zinc-600 focus-within:ring-1 focus-within:ring-zinc-600 transition-all duration-200 flex flex-col min-h-[120px]">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type @ for files, / for commands..."
          className="flex-1 w-full resize-none border-0 bg-transparent py-4 px-4 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none text-zinc-300 placeholder:text-zinc-600"
          disabled={disabled || isStreaming}
        />
        
        <div className="flex items-center justify-between p-3 mt-auto">
             <div className="flex items-center gap-2">
                 <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50">
                    <Paperclip className="h-4 w-4" />
                 </Button>
                 
                 {/* Model Selector */}
                 <Popover open={modelOpen} onOpenChange={setModelOpen}>
                   <PopoverTrigger asChild>
                     <button className="flex items-center gap-1 text-xs text-zinc-500 px-2 py-1 rounded hover:bg-zinc-800/50 cursor-pointer transition-colors">
                       {displayModelName}
                       <ChevronDown className="h-3 w-3" />
                     </button>
                   </PopoverTrigger>
                   <PopoverContent className="w-64 p-2" align="start">
                    <div className="max-h-72 overflow-y-auto">
                      {configuredModels.length === 0 ? (
                        <div className="text-xs text-zinc-500 px-2 py-2">No models configured</div>
                      ) : (
                        Object.entries(
                          configuredModels.reduce((acc, model) => {
                            const provider = model.provider || 'unknown'
                            if (!acc[provider]) acc[provider] = []
                            acc[provider].push(model)
                            return acc
                          }, {} as Record<string, typeof configuredModels>)
                        ).map(([provider, models]) => (
                          <div key={provider} className="mb-2">
                            <div className="text-xs text-zinc-500 px-2 py-1 capitalize">{provider.replace(/-/g, ' ')}</div>
                            {models.map((model) => (
                              <button
                                key={model.id}
                                className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-zinc-800 transition-colors ${
                                  model.id === currentModelId ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'
                                }`}
                                onClick={() => {
                                  setCurrentModel(model.id)
                                  setModelOpen(false)
                                }}
                              >
                                {model.model}
                              </button>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                 </Popover>

                 {/* Permission Mode Selector */}
                 <Popover open={modeOpen} onOpenChange={setModeOpen}>
                   <PopoverTrigger asChild>
                     <button className="flex items-center gap-1 text-xs text-zinc-500 px-2 py-1 rounded hover:bg-zinc-800/50 cursor-pointer transition-colors">
                       {currentModeLabel}
                       <ChevronDown className="h-3 w-3" />
                     </button>
                   </PopoverTrigger>
                   <PopoverContent className="w-40 p-1" align="start">
                     <div className="flex flex-col gap-0.5">
                       {MODES.map((mode) => (
                         <button
                           key={mode.value}
                           className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-zinc-800 transition-colors ${
                             currentMode === mode.value ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'
                           }`}
                           onClick={() => {
                             setMode(mode.value)
                             setModeOpen(false)
                           }}
                         >
                           {mode.label}
                         </button>
                       ))}
                     </div>
                   </PopoverContent>
                 </Popover>
             </div>
             {isStreaming ? (
               <Button 
                  size="icon" 
                  onClick={onAbort}
                  className="h-8 w-8 bg-red-500 text-white hover:bg-red-600"
               >
                  <Square className="h-3 w-3" />
               </Button>
             ) : (
               <Button 
                  size="icon" 
                  onClick={handleSend} 
                  disabled={!input.trim() || disabled}
                  className="h-8 w-8 bg-zinc-100 text-zinc-900 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600"
               >
                  <Send className="h-4 w-4" />
               </Button>
             )}
        </div>
      </div>
      <div className="text-center text-xs text-zinc-600 mt-3 font-mono">
        Blade can make mistakes. Please check important information.
      </div>
    </div>
  )
}
