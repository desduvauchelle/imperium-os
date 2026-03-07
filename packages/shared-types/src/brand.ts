// ============================================================================
// Branded Types - Compile-time safety for IDs
// ============================================================================

declare const __brand: unique symbol

type Brand<T, B extends string> = T & { readonly [__brand]: B }

/** Branded string type for Project IDs */
export type ProjectId = Brand<string, 'ProjectId'>

/** Branded string type for User IDs */
export type UserId = Brand<string, 'UserId'>

/** Branded string type for Task IDs */
export type TaskId = Brand<string, 'TaskId'>

/** Branded string type for Agent IDs */
export type AgentId = Brand<string, 'AgentId'>

/** Branded string type for Session IDs */
export type SessionId = Brand<string, 'SessionId'>

/** Branded string type for Message IDs */
export type MessageId = Brand<string, 'MessageId'>

/** Branded string type for Notification IDs */
export type NotificationId = Brand<string, 'NotificationId'>

/** Branded string type for Memory Block IDs */
export type MemoryBlockId = Brand<string, 'MemoryBlockId'>

// ============================================================================
// Brand Constructors - Runtime ID creation
// ============================================================================

export function createProjectId(id: string): ProjectId {
	return id as ProjectId
}

export function createUserId(id: string): UserId {
	return id as UserId
}

export function createTaskId(id: string): TaskId {
	return id as TaskId
}

export function createAgentId(id: string): AgentId {
	return id as AgentId
}

export function createSessionId(id: string): SessionId {
	return id as SessionId
}

export function createMessageId(id: string): MessageId {
	return id as MessageId
}

export function createNotificationId(id: string): NotificationId {
	return id as NotificationId
}

export function createMemoryBlockId(id: string): MemoryBlockId {
	return id as MemoryBlockId
}

// ============================================================================
// Timestamp type
// ============================================================================

/** ISO 8601 timestamp string */
export type Timestamp = Brand<string, 'Timestamp'>

export function createTimestamp(date?: Date): Timestamp {
	return (date ?? new Date()).toISOString() as Timestamp
}
