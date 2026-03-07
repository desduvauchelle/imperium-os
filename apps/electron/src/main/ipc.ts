import type { IpcChannel, IpcHandlerMap } from '@imperium/shared-types'

// ============================================================================
// Type-Safe IPC Bridge
// ============================================================================

/**
 * Type-safe wrapper for ipcMain.handle.
 * To be used in the main process.
 */
export function createIpcHandler<C extends IpcChannel>(
  channel: C,
  handler: (payload: IpcHandlerMap[C]['request']) => Promise<IpcHandlerMap[C]['response']>,
): { channel: C; handler: typeof handler } {
  return { channel, handler }
}

/**
 * Type-safe IPC channels exposed to the renderer via contextBridge.
 */
export interface ElectronApi {
  invoke<C extends IpcChannel>(
    channel: C,
    payload: IpcHandlerMap[C]['request'],
  ): Promise<IpcHandlerMap[C]['response']>

  on<C extends IpcChannel>(
    channel: C,
    callback: (payload: IpcHandlerMap[C]['response']) => void,
  ): () => void
}

declare global {
  interface Window {
    electronApi: ElectronApi
  }
}
