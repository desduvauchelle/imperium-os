import React, { useState, useRef, useEffect } from 'react'
import { Button } from '../components/button.js'
import { CostTag } from '../components/cost-tag.js'
import { cn } from '../lib/utils.js'

// ============================================================================
// ChatView — Omni-Chat tab
// ============================================================================
// Layout:
//   - Left panel (thin): vertical thread list
//   - Right panel: scrollable chat log + input area with Task-ify button
// ============================================================================

// ─── Local types ─────────────────────────────────────────────────────────────

interface ChatThread {
  readonly id: string
  readonly title: string
  readonly preview: string
}

interface ChatMessageLocal {
  readonly id: string
  readonly sender: string
  readonly role: 'user' | 'assistant'
  readonly text: string
  readonly costUsd?: number | undefined
  readonly model?: string | undefined
  readonly timestamp: string
}

// ─── Stub data ───────────────────────────────────────────────────────────────

const STUB_THREADS: readonly ChatThread[] = [
  { id: 'thread-1', title: 'Project kickoff', preview: 'Start with auth module…' },
  { id: 'thread-2', title: 'Bug triage', preview: 'API returning 500 on login…' },
]

const STUB_MESSAGES: readonly ChatMessageLocal[] = [
  {
    id: 'm1',
    sender: 'You',
    role: 'user',
    text: 'Can you review the auth module and flag any issues?',
    timestamp: '10:02 AM',
  },
  {
    id: 'm2',
    sender: 'Claude',
    role: 'assistant',
    text: "Sure, I'll start reading the relevant files now.",
    timestamp: '10:02 AM',
    costUsd: 0.0012,
    model: 'claude-sonnet-4-6',
  },
  {
    id: 'm3',
    sender: 'You',
    role: 'user',
    text: 'Focus on token expiry handling.',
    timestamp: '10:03 AM',
  },
  {
    id: 'm4',
    sender: 'Claude',
    role: 'assistant',
    text: 'I found a potential issue — the refresh token is stored in localStorage which is accessible to any script on the page. Consider using an httpOnly cookie instead.',
    timestamp: '10:03 AM',
    costUsd: 0.0031,
    model: 'claude-sonnet-4-6',
  },
]

// ============================================================================
// Props
// ============================================================================

export interface ChatViewProps {
  readonly projectId: string
}

// ============================================================================
// Component
// ============================================================================

export function ChatView({ projectId: _projectId }: ChatViewProps) {
  const [threads] = useState<readonly ChatThread[]>(STUB_THREADS)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(STUB_THREADS[0]?.id ?? null)
  const [messages, setMessages] = useState<readonly ChatMessageLocal[]>(STUB_MESSAGES)
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const trimmed = inputText.trim()
    if (!trimmed) return
    setMessages((prev) => [
      ...prev,
      {
        id: `m${Date.now()}`,
        sender: 'You',
        role: 'user',
        text: trimmed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    setInputText('')
  }

  return (
    <div data-testid="chat-view" className="flex h-full min-h-0">

      {/* ── Left panel: thread list ───────────────────────────────────────── */}
      <div className="w-44 shrink-0 border-r flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b shrink-0">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Threads
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveThreadId(t.id)}
              className={cn(
                'w-full text-left px-3 py-2 border-b last:border-0 hover:bg-accent/50 transition-colors',
                activeThreadId === t.id && 'bg-accent/70',
              )}
              data-testid={`chat-thread-${t.id}`}
            >
              <p className="text-xs font-medium truncate">{t.title}</p>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{t.preview}</p>
            </button>
          ))}
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
            data-testid="chat-new-thread-btn"
            onClick={() => {}}
          >
            + New thread
          </button>
        </div>
      </div>

      {/* ── Right panel: chat log + input ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Chat log */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="flex items-start gap-2.5"
              data-testid="chat-message"
            >
              {/* Avatar circle */}
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                msg.role === 'assistant'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground',
              )}>
                {msg.sender.slice(0, 2).toUpperCase()}
              </div>

              {/* Message body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                  <span className="text-xs font-semibold">{msg.sender}</span>
                  <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
                  {msg.costUsd !== undefined && msg.model !== undefined && (
                    <CostTag
                      model={msg.model}
                      costUsd={msg.costUsd}
                      className="opacity-30 hover:opacity-90 transition-opacity text-[10px] h-4 px-1.5"
                    />
                  )}
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{msg.text}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t px-4 py-3">
          <div className="flex gap-2 items-end">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Message… (Shift+Enter for newline)"
              rows={2}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              data-testid="chat-input"
            />
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={handleSend}
                data-testid="chat-send-btn"
              >
                Send
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs"
                title="Convert selected message to a Kanban card"
                data-testid="chat-taskify-btn"
                onClick={() => {}}
              >
                Task-ify
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
