import * as React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CodeBlock } from "@/components/ui/code-block"
import { cn } from "@/lib/utils"
import ReactMarkdown from 'react-markdown'

export interface ChatMessageProps {
  message: {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
  }
}

// Define segment types
type TextSegment = {
  type: 'text'
  content: string
}

type CodeSegment = {
  type: 'code'
  language: string
  content: string
}

type ContentSegment = TextSegment | CodeSegment

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  
  // Format timestamp to prevent hydration errors
  const [timeString, setTimeString] = React.useState('');
  
  // Update time client-side only after hydration
  React.useEffect(() => {
    const date = new Date(message.timestamp);
    setTimeString(`${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`);
  }, [message.timestamp]);

  // Suppress hydration warning - we're handling this with useState + useEffect
  // @ts-ignore - Needed for React 18 hydration error suppression
  const suppressHydrationWarning = true;

  // Extract code blocks from markdown for special rendering
  const renderContent = (content: string) => {
    // Regular expression to find all code blocks
    const codeBlockRegex = /```([\w-]+)?\n([\s\S]*?)```/g

    // If there are no code blocks, render as markdown
    if (!content.match(codeBlockRegex)) {
      return (
        <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert">
          {content}
        </ReactMarkdown>
      )
    }

    // Split content into text and code blocks
    const segments: ContentSegment[] = []
    let lastIndex = 0
    let match

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          content: content.slice(lastIndex, match.index)
        })
      }

      // Add code block
      segments.push({
        type: 'code',
        language: match[1] || 'text',
        content: match[2].trim()
      })

      lastIndex = match.index + match[0].length
    }

    // Add remaining text after last code block
    if (lastIndex < content.length) {
      segments.push({
        type: 'text',
        content: content.slice(lastIndex)
      })
    }

    // Render segments
    return (
      <div className="space-y-4">
        {segments.map((segment, index) => (
          <React.Fragment key={index}>
            {segment.type === 'text' ? (
              <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert">
                {segment.content}
              </ReactMarkdown>
            ) : (
              <CodeBlock 
                code={segment.content} 
                language={segment.language}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    )
  }

  return (
    <Card className={cn(
      "mb-4",
      isUser 
        ? "bg-primary/10 border-primary/20 ml-auto" 
        : "bg-muted/50 mr-auto",
      "max-w-[80%] md:max-w-2xl"
    )}>
      <CardHeader className="p-4 pb-0 flex flex-row space-y-0 gap-2 items-start">
        <Avatar className={cn("h-8 w-8", 
          isUser ? "bg-primary" : "bg-primary/20"
        )}>
          <AvatarFallback>
            {isUser ? '👤' : '🤖'}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">
            {isUser ? 'Jij' : 'AI Assistent'}
          </span>
          <span 
            className="text-xs text-muted-foreground" 
            data-timestamp={message.timestamp.toString()}
            suppressHydrationWarning={suppressHydrationWarning}
          >
            {timeString}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {renderContent(message.content)}
      </CardContent>
    </Card>
  )
} 