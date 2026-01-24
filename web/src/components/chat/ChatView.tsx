import { useState } from 'react'
import { ChatList } from './ChatList'
import { ChatInput } from './ChatInput'
import { Message } from './ChatMessage'

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! How can I help you today?',
      timestamp: Date.now()
    }
  ])

  const handleSend = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, newMessage])
    
    // Simulate response
    setTimeout(() => {
        const responseMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: "I'm a demo bot. I can't really think yet!",
            timestamp: Date.now()
        }
        setMessages(prev => [...prev, responseMessage])
    }, 1000)
  }

  return (
    <div className="flex flex-col h-full">
      <ChatList messages={messages} />
      <ChatInput onSend={handleSend} />
    </div>
  )
}
