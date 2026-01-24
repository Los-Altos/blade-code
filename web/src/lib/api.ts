const API_BASE = ''

export interface Session {
  id: string
  directory: string
  status: 'idle' | 'running' | 'error'
  createdAt: number
  updatedAt: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  toolCalls?: ToolCall[]
}

export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  result?: string
  status: 'pending' | 'running' | 'completed' | 'error'
}

export interface PermissionRequest {
  id: string
  sessionId: string
  toolName: string
  description: string
  metadata?: Record<string, unknown>
  createdAt: number
}

export interface Provider {
  id: string
  name: string
  models: string[]
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(error.error?.message || error.message || 'Request failed')
    }

    return response.json()
  }

  async health(): Promise<{ healthy: boolean; version: string }> {
    return this.request('/health')
  }

  async listSessions(directory?: string): Promise<Session[]> {
    const params = directory ? `?directory=${encodeURIComponent(directory)}` : ''
    const result = await this.request<{ sessions: Session[] }>(`/session${params}`)
    return result.sessions
  }

  async createSession(directory: string): Promise<Session> {
    const result = await this.request<{ session: Session }>('/session', {
      method: 'POST',
      body: JSON.stringify({ directory }),
    })
    return result.session
  }

  async getSession(sessionId: string): Promise<Session> {
    const result = await this.request<{ session: Session }>(`/session/${sessionId}`)
    return result.session
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.request(`/session/${sessionId}`, { method: 'DELETE' })
  }

  async listMessages(sessionId: string): Promise<Message[]> {
    const result = await this.request<{ messages: Message[] }>(`/session/${sessionId}/message`)
    return result.messages
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    await this.request(`/session/${sessionId}/message`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    })
  }

  async abortSession(sessionId: string): Promise<void> {
    await this.request(`/session/${sessionId}/abort`, { method: 'POST' })
  }

  async getConfig(): Promise<Record<string, unknown>> {
    const result = await this.request<{ config: Record<string, unknown> }>('/config')
    return result.config
  }

  async updateConfig(updates: Record<string, unknown>): Promise<void> {
    await this.request('/config', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    })
  }

  async listPermissions(): Promise<PermissionRequest[]> {
    const result = await this.request<{ permissions: PermissionRequest[] }>('/permission')
    return result.permissions
  }

  async respondPermission(permissionId: string, approved: boolean): Promise<void> {
    await this.request(`/permission/${permissionId}`, {
      method: 'POST',
      body: JSON.stringify({ approved }),
    })
  }

  async listProviders(): Promise<Provider[]> {
    const result = await this.request<{ providers: Provider[] }>('/provider')
    return result.providers
  }

  subscribeEvents(onEvent: (event: BusEvent) => void): () => void {
    const eventSource = new EventSource(`${this.baseUrl}/event`)
    
    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as BusEvent
        onEvent(event)
      } catch {
        console.error('Failed to parse SSE event:', e.data)
      }
    }

    eventSource.onerror = () => {
      console.error('SSE connection error')
    }

    return () => {
      eventSource.close()
    }
  }
}

export interface BusEvent {
  type: string
  properties: Record<string, unknown>
}

export const api = new ApiClient()
