'use client'

import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import ChatContainer from '@/components/chat/chat-container'

export default function ChatPage() {
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
          <Link 
            href="/chat"
            className="px-3 py-1 text-sm text-gray-600 border rounded-md hover:bg-gray-50"
          >
            Nieuwe Chat
          </Link>
          <button className="px-3 py-1 text-sm text-gray-600 border rounded-md hover:bg-gray-50">
            Opties
          </button>
        </div>
      </header>
      
      {/* Chat Container - Using the real WebSocket implementation */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        <div className="h-full max-w-4xl mx-auto">
          <ChatContainer 
            initialMessages={[
              {
                id: '1',
                role: 'assistant',
                content: 'Hallo! Ik ben je CorelDRAW en Blender AI-assistent. Hoe kan ik je vandaag helpen?',
                timestamp: new Date(),
              }
            ]}
          />
        </div>
      </div>
      
      <div className="p-2 border-t bg-white">
        <p className="text-xs text-center text-gray-500">
          De AI-agent verwerkt je berichten lokaal via Ollama LLM-modellen voor privacy
        </p>
      </div>
    </div>
  )
} 