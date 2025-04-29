import React from 'react'
import Head from 'next/head'
import ChatContainer from '@/components/chat/chat-container'

const ChatPage = () => {
  return (
    <>
      <Head>
        <title>CorelDRAW AI Assistant Chat</title>
        <meta name="description" content="Chat met de CorelDRAW AI Assistant" />
      </Head>
      
      <main className="flex flex-col h-screen bg-slate-50">
        <header className="bg-[#2C4F9E] text-white p-4 shadow-md">
          <h1 className="text-xl font-semibold">CorelDRAW AI Assistant</h1>
        </header>
        
        <div className="flex-1 container mx-auto max-w-4xl p-4">
          <div className="bg-white rounded-lg shadow-lg h-full border border-gray-200">
            <ChatContainer />
          </div>
        </div>
        
        <footer className="bg-gray-100 text-gray-600 text-sm p-3 text-center border-t">
          <p>© {new Date().getFullYear()} Corel Corporation. Alle rechten voorbehouden.</p>
        </footer>
      </main>
    </>
  )
}

export default ChatPage 