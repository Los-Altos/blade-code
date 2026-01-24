import { create } from 'zustand'
import { api, type Session, type Message, type BusEvent } from '@/lib/api'

interface SessionState {
  sessions: Session[]
  currentSessionId: string | null
  messages: Message[]
  isLoading: boolean
  isStreaming: boolean
  error: string | null

  loadSessions: () => Promise<void>
  createSession: (directory: string) => Promise<Session>
  selectSession: (sessionId: string) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  abortSession: () => Promise<void>

  handleEvent: (event: BusEvent) => void
  clearError: () => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  isLoading: false,
  isStreaming: false,
  error: null,

  loadSessions: async () => {
    set({ isLoading: true, error: null })
    try {
      const sessions = await api.listSessions()
      set({ sessions, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  createSession: async (directory: string) => {
    set({ isLoading: true, error: null })
    try {
      const session = await api.createSession(directory)
      set((state) => ({
        sessions: [...state.sessions, session],
        currentSessionId: session.id,
        messages: [],
        isLoading: false,
      }))
      return session
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },

  selectSession: async (sessionId: string) => {
    set({ isLoading: true, error: null, currentSessionId: sessionId })
    try {
      const messages = await api.listMessages(sessionId)
      set({ messages, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  deleteSession: async (sessionId: string) => {
    try {
      await api.deleteSession(sessionId)
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== sessionId),
        currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
        messages: state.currentSessionId === sessionId ? [] : state.messages,
      }))
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  sendMessage: async (content: string) => {
    const { currentSessionId } = get()
    if (!currentSessionId) {
      set({ error: 'No session selected' })
      return
    }

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    }

    set((state) => ({
      messages: [...state.messages, userMessage],
      isStreaming: true,
      error: null,
    }))

    try {
      await api.sendMessage(currentSessionId, content)
    } catch (err) {
      set({ error: (err as Error).message, isStreaming: false })
    }
  },

  abortSession: async () => {
    const { currentSessionId } = get()
    if (!currentSessionId) return

    try {
      await api.abortSession(currentSessionId)
      set({ isStreaming: false })
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  handleEvent: (event: BusEvent) => {
    const { currentSessionId } = get()
    const props = event.properties as Record<string, unknown>
    const eventSessionId = props.sessionId as string | undefined

    switch (event.type) {
      case 'session.created': {
        const session = props.session as Session
        set((state) => ({
          sessions: [...state.sessions, session],
        }))
        break
      }

      case 'session.status': {
        const status = props.status as Session['status']
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === eventSessionId ? { ...s, status } : s
          ),
          isStreaming: eventSessionId === currentSessionId && status === 'running',
        }))
        break
      }

      case 'session.deleted': {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== eventSessionId),
          currentSessionId: state.currentSessionId === eventSessionId ? null : state.currentSessionId,
          messages: state.currentSessionId === eventSessionId ? [] : state.messages,
        }))
        break
      }

      case 'message.created':
      case 'message.updated': {
        if (eventSessionId !== currentSessionId) break
        const message = props.message as Message
        set((state) => {
          const existingIndex = state.messages.findIndex((m) => m.id === message.id)
          if (existingIndex >= 0) {
            const newMessages = [...state.messages]
            newMessages[existingIndex] = message
            return { messages: newMessages }
          }
          return { messages: [...state.messages, message] }
        })
        break
      }

      case 'message.delta': {
        if (eventSessionId !== currentSessionId) break
        const messageId = props.messageId as string
        const delta = props.delta as string
        set((state) => {
          const newMessages = state.messages.map((m) =>
            m.id === messageId ? { ...m, content: m.content + delta } : m
          )
          return { messages: newMessages }
        })
        break
      }

      case 'session.completed':
      case 'session.error': {
        if (eventSessionId === currentSessionId) {
          set({ isStreaming: false })
        }
        break
      }
    }
  },

  clearError: () => set({ error: null }),
}))
