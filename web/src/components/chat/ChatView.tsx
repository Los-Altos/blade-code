import { api } from '@/lib/api'
import { useSessionStore } from '@/store/SessionStore'
import { useEffect } from 'react'
import { ChatInput } from './ChatInput'
import { ChatList } from './ChatList'
import { StatusBar } from './StatusBar'
import { ThinkingBlock } from './ThinkingBlock'
import { TodoList } from './TodoList'

export function ChatView() {
  const {
    sessions,
    messages,
    currentSessionId,
    isStreaming,
    isLoading,
    error,
    loadSessions,
    sendMessage,
    abortSession,
    createSession,
    selectSession,
    handleEvent,
    clearError,
  } = useSessionStore()

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  useEffect(() => {
    const unsubscribe = api.subscribeEvents(handleEvent)
    return () => unsubscribe()
  }, [handleEvent])

  useEffect(() => {
    if (sessions.length > 0 && !currentSessionId) {
      selectSession(sessions[0].sessionId)
    }
  }, [sessions, currentSessionId, selectSession])

  const handleSend = async (content: string) => {
    if (!currentSessionId) {
      await createSession()
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
      <ThinkingBlock />
      <TodoList />
      <ChatInput
        onSend={handleSend}
        onAbort={handleAbort}
        disabled={isLoading}
        isStreaming={isStreaming}
      />
      <StatusBar />
    </div>
  )
}
