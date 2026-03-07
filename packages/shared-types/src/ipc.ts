// ============================================================================
// IPC Types (Electron Inter-Process Communication)
// ============================================================================

/** IPC channel names - typed to prevent string typos */
export type IpcChannel =
  | 'theme:get'
  | 'theme:set'
  | 'theme:changed'
  | 'project:list'
  | 'project:open'
  | 'project:close'
  | 'agent:start'
  | 'agent:stop'
  | 'agent:status'
  | 'agent:suspended'
  | 'notification:show'
  | 'notification:dismiss'
  | 'system:power-mode'
  | 'system:quit'

/** IPC message envelope */
export interface IpcMessage<T = unknown> {
  readonly channel: IpcChannel
  readonly payload: T
  readonly requestId: string
  readonly timestamp: number
}

/** IPC response envelope */
export interface IpcResponse<T = unknown> {
  readonly channel: IpcChannel
  readonly payload: T
  readonly requestId: string
  readonly success: boolean
  readonly error?: string | undefined
}

/** Type-safe IPC handler map - maps channels to their request/response types */
export interface IpcHandlerMap {
  'theme:get': { request: void; response: string }
  'theme:set': { request: { mode: string }; response: void }
  'theme:changed': { request: { mode: string }; response: void }
  'project:list': { request: void; response: readonly unknown[] }
  'project:open': { request: { id: string }; response: void }
  'project:close': { request: { id: string }; response: void }
  'agent:start': { request: { projectId: string; task: string }; response: { agentId: string } }
  'agent:stop': { request: { agentId: string }; response: void }
  'agent:status': { request: { agentId: string }; response: { state: string } }
  'agent:suspended': { request: { agentId: string; reason: string }; response: void }
  'notification:show': { request: { title: string; message: string }; response: void }
  'notification:dismiss': { request: { id: string }; response: void }
  'system:power-mode': { request: { enabled: boolean }; response: void }
  'system:quit': { request: void; response: void }
}
