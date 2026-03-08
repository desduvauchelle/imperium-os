import { contextBridge, ipcRenderer } from 'electron'
import type { IpcChannel, IpcHandlerMap } from '@imperium/shared-types'

const electronApi = {
	invoke: <C extends IpcChannel>(
		channel: C,
		payload: IpcHandlerMap[C]['request'],
	): Promise<IpcHandlerMap[C]['response']> => {
		return ipcRenderer.invoke(channel, payload)
	},

	on: <C extends IpcChannel>(
		channel: C,
		callback: (payload: IpcHandlerMap[C]['response']) => void,
	): (() => void) => {
		const subscription = (_event: Electron.IpcRendererEvent, ...args: any[]) =>
			callback(args[0] as IpcHandlerMap[C]['response'])
		ipcRenderer.on(channel, subscription)
		return () => {
			ipcRenderer.removeListener(channel, subscription)
		}
	},
}

contextBridge.exposeInMainWorld('electronApi', electronApi)
