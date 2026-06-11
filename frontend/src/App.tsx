import { useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import './App.css'

interface Message {
  sender: 'user' | 'ai'
  text: string
  createdAt: string
}

const MAX_MESSAGE_LENGTH = 1000
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '')

const normalizeMessageText = (text: string) =>
  text
    .replace(/\s+(?=\d+\.\s+)/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const renderInlineText = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }

    return part
  })
}

const renderMessageText = (text: string) => {
  const lines = normalizeMessageText(text).split('\n')
  const blocks: ReactNode[] = []
  let listItems: ReactNode[] = []

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push(
        <ol key={`list-${blocks.length}`} className="message-list">
          {listItems}
        </ol>
      )
      listItems = []
    }
  }

  lines.forEach((line, index) => {
    const trimmedLine = line.trim()
    if (!trimmedLine) {
      flushList()
      return
    }

    const numberedItem = trimmedLine.match(/^\d+\.\s+(.*)$/)
    if (numberedItem) {
      listItems.push(
        <li key={`item-${index}`}>{renderInlineText(numberedItem[1])}</li>
      )
      return
    }

    flushList()
    blocks.push(<p key={`paragraph-${index}`}>{renderInlineText(trimmedLine)}</p>)
  })

  flushList()

  return blocks
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [inputWarning, setInputWarning] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const savedSessionId = localStorage.getItem('sessionId')
    if (savedSessionId) {
      setSessionId(savedSessionId)
      fetchHistory(savedSessionId)
    }
  }, [])

  const fetchHistory = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/chat/history/${id}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages)
      } else if (res.status === 404) {
        localStorage.removeItem('sessionId')
        setSessionId(null)
      } else {
        throw new Error('Sorry, chat history could not be loaded right now.')
      }
    } catch (err) {
      console.error('Failed to fetch history', err)
      setMessages([{
        sender: 'ai',
        text: err instanceof Error ? err.message : 'Sorry, chat history could not be loaded right now.',
        createdAt: new Date().toISOString()
      }])
    }
  }

  const handleInputChange = (value: string) => {
    if (value.length > MAX_MESSAGE_LENGTH) {
      setInputText(value.slice(0, MAX_MESSAGE_LENGTH))
      setInputWarning(`Messages are limited to ${MAX_MESSAGE_LENGTH} characters, so extra text was removed.`)
      return
    }

    setInputText(value)
    setInputWarning('')
  }

  const sendMessage = async () => {
    const trimmedMessage = inputText.trim()

    if (!trimmedMessage || isLoading) {
      if (!trimmedMessage) {
        setInputWarning('Please type a message before sending.')
      }
      return
    }

    const userMessage: Message = {
      sender: 'user',
      text: trimmedMessage,
      createdAt: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setInputWarning('')
    setIsLoading(true)

    try {
      const res = await fetch(`${API_BASE_URL}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: trimmedMessage,
          sessionId
        })
      })

      const data = await res.json().catch(() => ({
        error: 'Sorry, the server returned an unreadable response. Please try again.'
      }))

      if (res.ok) {
        const aiMessage: Message = {
          sender: 'ai',
          text: data.reply || 'Sorry, I could not generate a response. Please try again.',
          createdAt: new Date().toISOString()
        }
        setMessages(prev => [...prev, aiMessage])
        setSessionId(data.sessionId)
        localStorage.setItem('sessionId', data.sessionId)

        if (data.truncated) {
          setInputWarning(`Your message was shortened to ${data.maxLength || MAX_MESSAGE_LENGTH} characters before processing.`)
        }
      } else {
        throw new Error(data.error || 'Sorry, something went wrong. Please try again.')
      }
    } catch (err) {
      const errorMessage: Message = {
        sender: 'ai',
        text: err instanceof Error ? err.message : 'Sorry, the chat service is unavailable. Please try again.',
        createdAt: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="app">
      <div className="chat-container">
        <div className="chat-header">
          <h1>Spur Support</h1>
        </div>
        <div className="messages">
          {messages.length === 0 && (
            <div className="welcome">
              <p>Hi! How can I help you today?</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.sender}`}>
              <div className="message-content">{renderMessageText(msg.text)}</div>
            </div>
          ))}
          {isLoading && (
            <div className="message ai">
              <div className="message-content typing">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="input-area">
          <textarea
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isLoading}
            rows={1}
          />
          <button onClick={sendMessage} disabled={isLoading || !inputText.trim()}>
            Send
          </button>
        </div>
        {inputWarning && (
          <div className="input-warning" role="status">
            {inputWarning}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
