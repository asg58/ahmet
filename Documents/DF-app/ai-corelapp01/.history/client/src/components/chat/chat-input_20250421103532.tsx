import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ChatInputProps extends React.HTMLAttributes<HTMLFormElement> {
  isLoading: boolean
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  input: string
  setInput: (value: string) => void
  placeholder?: string
}

export function ChatInput({
  className,
  isLoading,
  onSubmit,
  input,
  setInput,
  placeholder = "Typ een bericht...",
  ...props
}: ChatInputProps) {
  return (
    <form 
      onSubmit={onSubmit} 
      className={cn("flex items-center space-x-2", className)}
      {...props}
    >
      <div className="relative flex-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isLoading}
        />
      </div>
      <Button
        type="submit"
        disabled={isLoading || !input.trim()}
        className={cn(
          "p-3 rounded-lg text-white",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
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
      </Button>
    </form>
  )
} 