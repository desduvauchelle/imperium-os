import React, { useState } from 'react'
import { Button } from './button.js'
import { cn } from '../lib/utils.js'

// ============================================================================
// KanbanCardDrawer — Expandable drawer shown below a Kanban card
// ============================================================================
// Contains two sections:
//   1. AI Progress — terminal-style log stream of agent actions
//   2. Thread — compact Human-AI chat for this specific task
// ============================================================================

export interface DrawerChatMessage {
  readonly author: 'human' | 'ai'
  readonly text: string
  readonly timestamp?: string | undefined
}

export interface KanbanCardDrawerProps {
  /** The task ID — used for data-testid scoping */
  readonly taskId: string
  /** Whether the drawer is visible */
  readonly isOpen: boolean
  /** AI progress log lines (append-only, newest at bottom) */
  readonly progressLogs?: readonly string[] | undefined
  /** Chat messages between human and AI */
  readonly chatMessages?: readonly DrawerChatMessage[] | undefined
  /** Called when user submits a chat message */
  readonly onSendMessage?: ((text: string) => void) | undefined
}

export function KanbanCardDrawer({
  taskId,
  isOpen,
  progressLogs = [],
  chatMessages = [],
  onSendMessage,
}: KanbanCardDrawerProps) {
  const [chatInput, setChatInput] = useState('')

  if (!isOpen) return null

  const handleSend = () => {
    const trimmed = chatInput.trim()
    if (!trimmed) return
    onSendMessage?.(trimmed)
    setChatInput('')
  }

  return (
    <div
      data-testid={`kanban-drawer-${taskId}`}
      className="border-t border-border bg-muted/20 rounded-b-lg"
    >
      {/* AI Progress section */}
      <div className="px-3 pt-3 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          AI Progress
        </p>
        <div className="bg-zinc-950 dark:bg-black rounded p-2 max-h-28 overflow-y-auto font-mono text-[11px] text-green-400 space-y-0.5">
          {progressLogs.length === 0 ? (
            <span className="text-zinc-600">No activity yet…</span>
          ) : (
            progressLogs.map((line, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: log lines are append-only
              <div key={i}>&gt; {line}</div>
            ))
          )}
        </div>
      </div>

      {/* Thread section */}
      <div className="px-3 pb-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Thread
        </p>
        <div className="space-y-1.5 max-h-32 overflow-y-auto mb-2">
          {chatMessages.length === 0 ? (
            <p className="text-xs text-muted-foreground/60">No messages yet.</p>
          ) : (
            chatMessages.map((msg, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: chat is append-only
              <div key={i} className={cn('flex items-start gap-1.5', msg.author === 'human' && 'flex-row-reverse')}>
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0',
                  msg.author === 'ai'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                )}>
                  {msg.author === 'ai' ? 'AI' : 'U'}
                </div>
                <p className={cn(
                  'text-xs rounded px-2 py-1 max-w-[80%]',
                  msg.author === 'ai' ? 'bg-muted' : 'bg-primary/10'
                )}>
                  {msg.text}
                </p>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-1">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
            placeholder="Reply to this task…"
            className="flex-1 h-7 text-xs rounded border border-input bg-background px-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            data-testid={`kanban-drawer-input-${taskId}`}
          />
          <Button
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleSend}
            data-testid={`kanban-drawer-send-${taskId}`}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
