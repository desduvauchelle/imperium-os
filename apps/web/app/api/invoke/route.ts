import type { NextRequest } from 'next/server'
import { invokeLocal } from '../../../lib/invoke-local'
import type { IpcChannel } from '@imperium/shared-types'

// POST /api/invoke — Master API endpoint
// Body: { channel: IpcChannel, payload: unknown }
// Response: { ok: true, data: unknown } | { ok: false, error: string }
export async function POST(req: NextRequest) {
	let channel: IpcChannel
	let payload: unknown

	try {
		const body = (await req.json()) as { channel: unknown; payload: unknown }
		channel = body.channel as IpcChannel
		payload = body.payload
	} catch {
		return Response.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
	}

	if (typeof channel !== 'string') {
		return Response.json({ ok: false, error: 'Missing channel' }, { status: 400 })
	}

	try {
		const data = await invokeLocal(channel, payload as never)
		return Response.json({ ok: true, data: data ?? null })
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		return Response.json({ ok: false, error: message }, { status: 500 })
	}
}
