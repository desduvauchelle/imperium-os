import type {
  AgentId,
  AgentState,
  AgentStateTransition,
  SuspensionContext,
  Timestamp,
} from '@imperium/shared-types'
import { createTimestamp } from '@imperium/shared-types'

// ============================================================================
// Agent State Machine
// ============================================================================

/** Valid state transitions map */
const VALID_TRANSITIONS: Readonly<Record<AgentState, readonly AgentState[]>> = {
  idle: ['running'],
  running: ['suspended', 'completed', 'error'],
  suspended: ['running', 'error'],
  completed: ['idle'],
  error: ['idle'],
} as const

/** Callback for state transitions */
export type TransitionCallback = (transition: AgentStateTransition) => void

export class AgentStateMachine {
  private _state: AgentState
  private readonly _agentId: AgentId
  private readonly _listeners: TransitionCallback[] = []
  private _suspension: SuspensionContext | null = null

  constructor(agentId: AgentId, initialState: AgentState = 'idle') {
    this._agentId = agentId
    this._state = initialState
  }

  get state(): AgentState {
    return this._state
  }

  get agentId(): AgentId {
    return this._agentId
  }

  get suspension(): SuspensionContext | null {
    return this._suspension
  }

  /** Register a callback for state transitions */
  onTransition(callback: TransitionCallback): () => void {
    this._listeners.push(callback)
    return () => {
      const idx = this._listeners.indexOf(callback)
      if (idx >= 0) this._listeners.splice(idx, 1)
    }
  }

  /** Check if a transition is valid from the current state */
  canTransitionTo(target: AgentState): boolean {
    const allowed = VALID_TRANSITIONS[this._state]
    return allowed.includes(target)
  }

  /** Transition to a new state, throwing on illegal transitions */
  transition(target: AgentState, suspension?: SuspensionContext): void {
    if (!this.canTransitionTo(target)) {
      throw new Error(
        `Illegal state transition: ${this._state} → ${target} (allowed: ${VALID_TRANSITIONS[this._state].join(', ')})`,
      )
    }

    const from = this._state
    this._state = target
    this._suspension = suspension ?? null

    const event: AgentStateTransition = {
      agentId: this._agentId,
      from,
      to: target,
      timestamp: createTimestamp(),
      ...(suspension ? { suspension } : {}),
    }

    for (const listener of this._listeners) {
      listener(event)
    }
  }

  /** Serialize the state machine for persistence */
  toSnapshot(): { agentId: string; state: AgentState; suspension: SuspensionContext | null } {
    return {
      agentId: this._agentId as string,
      state: this._state,
      suspension: this._suspension,
    }
  }

  /** Restore a state machine from a snapshot */
  static fromSnapshot(snapshot: {
    agentId: string
    state: AgentState
    suspension: SuspensionContext | null
  }): AgentStateMachine {
    const sm = new AgentStateMachine(snapshot.agentId as AgentId, snapshot.state)
    if (snapshot.suspension) {
      sm._suspension = snapshot.suspension
    }
    return sm
  }
}
