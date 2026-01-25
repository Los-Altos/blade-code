import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/store/AppStore"
import { useConfigStore, type ModelConfig } from "@/store/ConfigStore"
import { ChevronDown, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { AddModelModal, type ModelFormData } from "./AddModelModal"
import { EditModelModal } from "./EditModelModal"

type TabValue = 'general' | 'models' | 'theme'

const PROVIDER_ICONS: Record<string, { bg: string; label: string }> = {
  'openai-compatible': { bg: '#10a37f', label: 'OA' },
  'anthropic': { bg: '#d97757', label: 'A' },
  'gemini': { bg: '#4285f4', label: 'G' },
  'azure-openai': { bg: '#0078d4', label: 'Az' },
  'copilot': { bg: '#6e40c9', label: 'CP' },
  'gpt-openai-platform': { bg: '#10a37f', label: 'GP' },
  'antigravity': { bg: '#8b5cf6', label: 'AG' },
}

export function SettingsModal() {
  const { isSettingsOpen, toggleSettings } = useAppStore()
  const { configuredModels, loadModels } = useConfigStore()
  const [activeTab, setActiveTab] = useState<TabValue>('models')
  const [addModelOpen, setAddModelOpen] = useState(false)
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null)

  const tabs: { value: TabValue; label: string }[] = [
    { value: 'general', label: 'General' },
    { value: 'models', label: 'Models' },
    { value: 'theme', label: 'Theme' },
  ]

  const groupedModels = configuredModels.reduce((acc, model) => {
    const provider = model.provider || 'unknown'
    if (!acc[provider]) {
      acc[provider] = []
    }
    acc[provider].push(model)
    return acc
  }, {} as Record<string, typeof configuredModels>)

  const handleSaveModel = async (formData: ModelFormData) => {
    try {
      const response = await fetch('/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: formData.bladeProvider,
          name: formData.name || formData.modelId,
          model: formData.modelId,
          baseUrl: formData.baseUrl || undefined,
          apiKey: formData.apiKey || undefined,
        }),
      })
      if (!response.ok) throw new Error('Failed to save model')
      await loadModels()
    } catch (err) {
      console.error('Failed to save model:', err)
    }
  }

  const handleDeleteModel = async (modelId: string) => {
    try {
      const response = await fetch(`/models/${modelId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete model')
      await loadModels()
    } catch (err) {
      console.error('Failed to delete model:', err)
    }
  }

  const handleUpdateModel = async (modelId: string, updates: Partial<ModelConfig>) => {
    try {
      const response = await fetch(`/models/${modelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!response.ok) throw new Error('Failed to update model')
      await loadModels()
    } catch (err) {
      console.error('Failed to update model:', err)
    }
  }

  const toggleProvider = (provider: string) => {
    setExpandedProvider(expandedProvider === provider ? null : provider)
  }

  return (
    <>
      <Dialog open={isSettingsOpen} onOpenChange={toggleSettings}>
        <DialogContent className="sm:max-w-[800px] h-[600px] p-0 overflow-hidden gap-0 bg-[#09090b] border-zinc-800 rounded-xl" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Settings</DialogTitle>
          <div className="flex h-full">
            <div className="w-[200px] h-full bg-[#18181b] p-6 flex flex-col gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm font-mono transition-colors",
                    activeTab === tab.value
                      ? "bg-[#27272a] text-[#E5E5E5] font-medium"
                      : "text-[#a1a1aa] hover:text-[#E5E5E5] hover:bg-[#27272a]/50"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 p-8 flex flex-col gap-6 overflow-hidden">
              <h2 className="text-lg font-semibold text-[#E5E5E5] font-mono">
                {tabs.find(t => t.value === activeTab)?.label}
              </h2>

              {activeTab === 'models' && (
                <div className="flex flex-col gap-6 flex-1 overflow-hidden">
                  <p className="text-[13px] text-[#a1a1aa] font-mono">
                    Configure API keys and model settings for different providers.
                  </p>

                  <div className="flex flex-col gap-2 overflow-y-auto flex-1">
                    {Object.entries(groupedModels).map(([provider, models]) => {
                      const iconInfo = PROVIDER_ICONS[provider] || { bg: '#71717a', label: '?' }
                      const isConnected = models.some(m => m.apiKey)
                      const isExpanded = expandedProvider === provider

                      return (
                        <div key={provider} className="w-full bg-[#18181b] rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleProvider(provider)}
                            className="w-full p-4 flex items-center justify-between hover:bg-[#1f1f23] transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold"
                                style={{ backgroundColor: iconInfo.bg }}
                              >
                                {iconInfo.label}
                              </div>
                              <div className="flex flex-col gap-0.5 text-left">
                                <span className="text-sm font-semibold text-[#E5E5E5] font-mono capitalize">
                                  {provider.replace(/-/g, ' ')}
                                </span>
                                <span className="text-xs text-[#71717a] font-mono">
                                  {models.length} model{models.length > 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className={cn(
                                "text-xs font-mono",
                                isConnected ? "text-[#16A34A]" : "text-[#71717a]"
                              )}>
                                {isConnected ? "● Connected" : "○ Not Connected"}
                              </span>
                              <ChevronDown className={cn(
                                "h-4 w-4 text-[#71717a] transition-transform",
                                isExpanded && "rotate-180"
                              )} />
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-zinc-800">
                              {models.map((model) => (
                                <div
                                  key={model.id}
                                  className="px-4 py-3 flex items-center justify-between hover:bg-[#1f1f23] group"
                                >
                                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                    <span className="text-sm text-[#E5E5E5] font-mono truncate">
                                      {model.model}
                                    </span>
                                    <span className="text-xs text-[#71717a] font-mono truncate">
                                      {model.baseUrl || 'Default URL'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => setEditingModel(model)}
                                      className="p-1.5 text-[#71717a] hover:text-[#E5E5E5] hover:bg-[#27272a] rounded transition-colors"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteModel(model.id)}
                                      className="p-1.5 text-[#71717a] hover:text-red-400 hover:bg-[#27272a] rounded transition-colors"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {Object.keys(groupedModels).length === 0 && (
                      <div className="text-center py-8 text-[#71717a] text-sm font-mono">
                        No models configured yet
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => setAddModelOpen(true)}
                    className="w-full py-3 rounded-md text-[#a1a1aa] text-[13px] font-mono hover:bg-[#18181b] transition-colors"
                  >
                    + Add New Model
                  </button>
                </div>
              )}

              {activeTab === 'general' && (
                <div className="text-sm text-[#a1a1aa] font-mono">
                  General settings will appear here.
                </div>
              )}

              {activeTab === 'theme' && (
                <div className="text-sm text-[#a1a1aa] font-mono">
                  Theme settings will appear here.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddModelModal 
        open={addModelOpen} 
        onOpenChange={setAddModelOpen}
        onSave={handleSaveModel}
      />

      <EditModelModal
        open={!!editingModel}
        onOpenChange={(open) => !open && setEditingModel(null)}
        model={editingModel}
        onSave={handleUpdateModel}
      />
    </>
  )
}
