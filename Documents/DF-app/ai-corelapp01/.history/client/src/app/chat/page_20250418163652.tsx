'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

type MessageArray = Message[];

export default function ChatPage() {
  const [messages, setMessages] = useState<MessageArray>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hallo! Ik ben je CorelDRAW en Blender AI-assistent. Hoe kan ik je vandaag helpen?',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Mock function for sending messages to backend
  const sendMessage = async (content: string) => {
    setIsLoading(true)
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    
    setMessages((prev: MessageArray) => [...prev, userMessage])
    setInput('')
    
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    
    // Mock response
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: `Dit is een tijdelijke mock response. In de echte implementatie zou ik hier via websockets en Ollama modellen een antwoord geven en CorelDRAW of Blender aansturen. Je vroeg: "${content}"`,
      timestamp: new Date(),
    }
    
    setMessages((prev: MessageArray) => [...prev, assistantMessage])
    setIsLoading(false)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      sendMessage(input.trim())
    }
  }

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Functie om timestamp consistent weer te geven tussen server en client
  const formatTime = (date: Date) => {
    // Return alleen uren en minuten in 24-uurs format voor consistentie
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b">
        <Link href="/" className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-semibold">CorelDRAW AI Agent</span>
        </Link>
        <div className="flex items-center space-x-4">
          <button 
            className="px-3 py-1 text-sm text-gray-600 border rounded-md hover:bg-gray-50"
            onClick={() => setMessages([
              {
                id: '1',
                role: 'assistant',
                content: 'Hallo! Ik ben je CorelDRAW en Blender AI-assistent. Hoe kan ik je vandaag helpen?',
                timestamp: new Date(),
              },
            ])}
          >
            Nieuwe Chat
          </button>
          <button className="px-3 py-1 text-sm text-gray-600 border rounded-md hover:bg-gray-50">
            Opties
          </button>
        </div>
      </header>
      
      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          {messages.map((message: Message) => (
            <div 
              key={message.id} 
              className={`mb-4 p-4 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-blue-50 border border-blue-100 ml-auto' 
                  : 'bg-white border border-gray-200'
              } max-w-3xl ${message.role === 'user' ? 'ml-auto' : 'mr-auto'}`}
            >
              <div className="flex items-center mb-1">
                <div className={`w-6 h-6 rounded-full mr-2 flex items-center justify-center ${
                  message.role === 'user' ? 'bg-blue-500' : 'bg-gray-600'
                }`}>
                  {message.role === 'user' ? '👤' : '🤖'}
                </div>
                <span className="text-sm font-semibold">
                  {message.role === 'user' ? 'Jij' : 'AI Assistent'}
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  {formatTime(message.timestamp)}
                </span>
              </div>
              <div className="pl-8 whitespace-pre-wrap">
                {message.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Input */}
      <div className="p-4 border-t bg-white">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              placeholder="Typ een bericht..."
              className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              className={`p-3 text-white bg-blue-500 rounded-lg ${
                isLoading || !input.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
              }`}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-center text-gray-500">
            De AI-agent verwerkt je berichten lokaal via Ollama LLM-modellen voor privacy
          </p>
        </form>
      </div>
    </div>
  )
} 