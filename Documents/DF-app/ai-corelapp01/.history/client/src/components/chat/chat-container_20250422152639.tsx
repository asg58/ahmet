import React, { useState, useEffect, useRef } from 'react'
// Workaround voor UUID import probleem
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'
import { socketClient, ChatMessage as ChatMessageType, StreamingResponse } from '@/lib/socket-client'

export interface ChatContainerProps {
  initialMessages?: ChatMessageType[]
  sessionId?: string
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  initialMessages = [],
  sessionId = uuidv4(),
}) => {
  const [messages, setMessages] = useState<ChatMessageType[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState({ connected: false })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Connect to WebSocket on component mount
  useEffect(() => {
    socketClient.connect(sessionId)
    
    // Register handlers
    const unsubscribeMessage = socketClient.onMessage(handleIncomingMessage)
    const unsubscribeConnection = socketClient.onConnectionChange(setConnectionStatus)
    
    // Also listen for the 'newMessage' event from the server
    socketClient.socketInstance?.on('newMessage', (message) => {
      console.log('Received newMessage event:', message);
      // Create a new assistant message
      const newAssistantMessage: ChatMessageType = {
        id: message.id || uuidv4(),
        role: 'assistant',
        content: message.content,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prevMessages => [...prevMessages, newAssistantMessage]);
      setIsLoading(false);
    });
    
    // Cleanup on unmount
    return () => {
      unsubscribeMessage()
      unsubscribeConnection()
      socketClient.socketInstance?.off('newMessage');
    }
  }, [sessionId])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Handle incoming streamed messages
  const handleIncomingMessage = (response: StreamingResponse) => {
    setMessages(prevMessages => {
      // Check if this is updating an existing message
      const messageIndex = prevMessages.findIndex(
        msg => msg.id === response.messageId
      )
      
      if (messageIndex >= 0) {
        // Update existing message
        const updatedMessages = [...prevMessages]
        updatedMessages[messageIndex] = {
          ...updatedMessages[messageIndex],
          content: response.content
        }
        
        // If message is complete, end loading state
        if (response.isComplete) {
          setIsLoading(false)
        }
        
        return updatedMessages
      } else {
        // Create new message
        const newMessage: ChatMessageType = {
          id: response.messageId,
          role: 'assistant',
          content: response.content,
          // Use ISO string format for consistent server/client rendering
          timestamp: new Date().toISOString()
        }
        
        // If message is complete, end loading state
        if (response.isComplete) {
          setIsLoading(false)
        }
        
        return [...prevMessages, newMessage]
      }
    })
  }

  // Handle sending a message
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Create a new message with ISO string timestamp
    const newUserMessage = {
      id: uuidv4(),
      role: 'user' as const,
      content: input,
      timestamp: new Date().toISOString()
    };
    
    // Update messages with new user message
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInput('');
    
    try {
      // Set loading state
      setIsLoading(true);
      
      // Scroll to bottom when message is sent
      scrollToBottom();
      
      // Send to server
      const response = await socketClient.sendMessage(newUserMessage.content, sessionId);
      
      // Handle response
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Connection status indicator */}
      {!connectionStatus.connected && (
        <div className="bg-red-500 text-white px-4 py-2 text-center">
          Niet verbonden met de server. Probeer later opnieuw.
        </div>
      )}
      
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Chat input */}
      <div className="p-4 border-t">
        <ChatInput 
          input={input} 
          setInput={setInput} 
          onSubmit={handleSubmit}
          isLoading={isLoading}
          placeholder="Type je bericht..."
        />
      </div>
    </div>
  )
}

export default ChatContainer 