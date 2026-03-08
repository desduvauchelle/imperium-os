import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/card.js'
import { Button } from '../components/button.js'
import { Badge } from '../components/badge.js'

// ============================================================================
// GlobalConnectionsView — Discord and Telegram bot token management
// ============================================================================
// System-level view accessed from the sidebar "Global Connections" item.
// All state is local — backend wiring is deferred.
// ============================================================================

const INPUT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

function connectionStatus(token: string): 'connected' | 'not-configured' {
  return token.trim().length > 0 ? 'connected' : 'not-configured'
}

// ============================================================================
// Component
// ============================================================================

export function GlobalConnectionsView() {
  // ── Discord state ─────────────────────────────────────────────────────────
  const [discordToken, setDiscordToken] = useState('')
  const [discordWebhook, setDiscordWebhook] = useState('')
  const [discordSaved, setDiscordSaved] = useState(false)

  // ── Telegram state ────────────────────────────────────────────────────────
  const [telegramToken, setTelegramToken] = useState('')
  const [telegramChatId, setTelegramChatId] = useState('')
  const [telegramSaved, setTelegramSaved] = useState(false)

  const handleDiscordSave = () => {
    // Stub: would invoke('connections:save-discord', { token: discordToken, webhookUrl: discordWebhook })
    setDiscordSaved(true)
  }

  const handleTelegramSave = () => {
    // Stub: would invoke('connections:save-telegram', { token: telegramToken, chatId: telegramChatId })
    setTelegramSaved(true)
  }

  const discordStatus = connectionStatus(discordToken)
  const telegramStatus = connectionStatus(telegramToken)

  return (
    <div data-testid="global-connections-view" className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-semibold">Global Connections</h1>
        <p className="text-sm text-muted-foreground">
          Bot tokens for Discord and Telegram. Available to all projects.
        </p>
      </div>

      {/* ── Discord ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Discord</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Connect a Discord bot for project notifications and AI responses.
              </CardDescription>
            </div>
            <Badge
              variant={discordStatus === 'connected' ? 'default' : 'secondary'}
              data-testid="discord-status"
            >
              {discordStatus === 'connected' ? 'Connected' : 'Not configured'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Bot Token
            </label>
            <input
              type="password"
              placeholder="Discord bot token"
              value={discordToken}
              onChange={(e) => { setDiscordToken(e.target.value); setDiscordSaved(false) }}
              className={INPUT_CLASS}
              data-testid="discord-token-input"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Webhook URL
            </label>
            <input
              type="url"
              placeholder="https://discord.com/api/webhooks/…"
              value={discordWebhook}
              onChange={(e) => { setDiscordWebhook(e.target.value); setDiscordSaved(false) }}
              className={INPUT_CLASS}
              data-testid="discord-webhook-input"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleDiscordSave}
              data-testid="discord-save-btn"
            >
              Save
            </Button>
            {discordSaved && (
              <Badge variant="default" data-testid="discord-saved-badge">
                Saved
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Telegram ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Telegram</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Connect a Telegram bot for project notifications and AI responses.
              </CardDescription>
            </div>
            <Badge
              variant={telegramStatus === 'connected' ? 'default' : 'secondary'}
              data-testid="telegram-status"
            >
              {telegramStatus === 'connected' ? 'Connected' : 'Not configured'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Bot Token
            </label>
            <input
              type="password"
              placeholder="Telegram bot token (from @BotFather)"
              value={telegramToken}
              onChange={(e) => { setTelegramToken(e.target.value); setTelegramSaved(false) }}
              className={INPUT_CLASS}
              data-testid="telegram-token-input"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Default Chat ID
            </label>
            <input
              type="text"
              placeholder="-100123456789"
              value={telegramChatId}
              onChange={(e) => { setTelegramChatId(e.target.value); setTelegramSaved(false) }}
              className={INPUT_CLASS}
              data-testid="telegram-chatid-input"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleTelegramSave}
              data-testid="telegram-save-btn"
            >
              Save
            </Button>
            {telegramSaved && (
              <Badge variant="default" data-testid="telegram-saved-badge">
                Saved
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
