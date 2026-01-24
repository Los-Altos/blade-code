import { api } from '@/lib/api'
import { useSessionStore } from '@/store/SessionStore'
import { useEffect } from 'react'
import { ChatInput } from './ChatInput'
import { ChatList } from './ChatList'

export function ChatView() {
  const {
    messages,
    currentSessionId,
    isStreaming,
    isLoading,
    error,
    sendMessage,
    abortSession,
    createSession,
    handleEvent,
    clearError,
  } = useSessionStore()

  useEffect(() => {
    const unsubscribe = api.subscribeEvents(handleEvent)
    return () => unsubscribe()
  }, [handleEvent])

  useEffect(() => {
    if (!currentSessionId) {
      createSession(window.location.pathname || '/')
    }
  }, [currentSessionId, createSession])

  const handleSend = async (content: string) => {
    if (!currentSessionId) {
      await createSession(window.location.pathname || '/')
    }
    await sendMessage(content)
  }

  const handleAbort = () => {
    abortSession()
  }

  return (
    <div className="flex flex-col h-full">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300">
            ✕
          </button>
        </div>
      )}
      <ChatList messages={messages} isLoading={isLoading} />
      <ChatInput
        onSend={handleSend}
        onAbort={handleAbort}
        disabled={isLoading}
        isStreaming={isStreaming}
      />
    </div>
  )
}
