import React from 'react'
import Head from 'next/head'
import ChatContainer from '@/components/chat/chat-container'
import Layout from '@/components/ui/layout'

const ChatPage = () => {
  return (
    <>
      <Head>
        <title>CorelDRAW AI Assistant Chat</title>
        <meta name="description" content="Chat met de CorelDRAW AI Assistant" />
      </Head>
      
      <Layout title="CorelDRAW AI Assistant">
        <div className="container mx-auto max-w-4xl p-4">
          <div className="bg-white rounded-lg shadow-lg h-[calc(100vh-200px)] border border-gray-200">
            <ChatContainer />
          </div>
        </div>
      </Layout>
    </>
  )
}

export default ChatPage 