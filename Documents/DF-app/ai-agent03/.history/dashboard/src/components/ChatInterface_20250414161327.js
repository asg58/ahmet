import React, { useState, useRef, useEffect } from 'react';
import { Button, Form, Spinner } from 'react-bootstrap';
import { FaMicrophone, FaStop, FaPaperPlane, FaCode } from 'react-icons/fa';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

function ChatInterface({ chatHistory, onSendMessage, connected }) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCode, setShowCode] = useState({});
  const chatEndRef = useRef(null);
  
  // Speech recognition setup
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();
  
  // Update message when transcript changes
  useEffect(() => {
    if (transcript) {
      setMessage(transcript);
    }
  }, [transcript]);
  
  // Scroll to bottom when chat history updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && connected) {
      onSendMessage(message.trim());
      setMessage('');
      resetTranscript();
    }
  };
  
  // Toggle voice recognition
  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true, language: 'nl-NL' });
    }
  };
  
  // Format code blocks in messages
  const formatMessage = (content) => {
    if (!content) return '';
    
    // Check if content has code blocks
    if (content.includes('```')) {
      const parts = content.split('```');
      return parts.map((part, index) => {
        // Even indexes are text, odd are code
        if (index % 2 === 0) {
          return <p key={index}>{part}</p>;
        } else {
          return (
            <div key={index} className="code-block">
              <pre><code>{part}</code></pre>
            </div>
          );
        }
      });
    }
    
    return <p>{content}</p>;
  };
  
  // Toggle code display for a message
  const toggleCodeDisplay = (index) => {
    setShowCode(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="chat-interface">
      <div className="chat-messages">
        {chatHistory.length === 0 ? (
          <div className="empty-chat">
            <p>Geen berichten. Stel een vraag aan de AI Blender Expert.</p>
          </div>
        ) : (
          chatHistory.map((msg, index) => (
            <div 
              key={index} 
              className={`chat-message ${msg.role === 'user' ? 'user-message' : 'agent-message'}`}
            >
              <div className="message-content">
                {formatMessage(msg.content)}
                
                {/* Toon code knop als er code in het bericht zit */}
                {msg.code && (
                  <div>
                    <Button 
                      variant="outline-secondary" 
                      size="sm" 
                      onClick={() => toggleCodeDisplay(index)}
                      className="code-toggle-btn"
                    >
                      <FaCode /> {showCode[index] ? 'Verberg code' : 'Toon code'}
                    </Button>
                    
                    {showCode[index] && (
                      <div className="code-block py-2 mt-2">
                        <pre><code>{msg.code}</code></pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="chat-message agent-message typing">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        
        <div ref={chatEndRef}></div>
      </div>

      <Form onSubmit={handleSubmit} className="message-form">
        <div className="input-group">
          {browserSupportsSpeechRecognition && (
            <Button 
              variant={listening ? "danger" : "outline-secondary"}
              onClick={toggleListening}
              disabled={!connected}
              className="mic-button"
            >
              {listening ? <FaStop /> : <FaMicrophone />}
            </Button>
          )}
          
          <Form.Control
            type="text"
            placeholder={connected ? "Vraag iets aan de AI Blender Expert..." : "Verbinding maken..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!connected}
          />
          
          <Button 
            variant="primary" 
            type="submit" 
            disabled={!message.trim() || !connected}
          >
            <FaPaperPlane />
          </Button>
        </div>
      </Form>
    </div>
  );
}

export default ChatInterface; 