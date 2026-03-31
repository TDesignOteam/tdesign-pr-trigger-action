import { error, warning } from '@actions/core'

export class ActionError extends Error {
  constructor(message: string, public readonly context?: Record<string, unknown>) {
    super(message)
    this.name = 'ActionError'
  }
}

export function handleError(err: unknown, context?: string): never {
  if (err instanceof ActionError) {
    error(`[${context || 'Error'}] ${err.message}`)
    if (err.context) {
      error(`Context: ${JSON.stringify(err.context)}`)
    }
    throw err
  }

  if (err instanceof Error) {
    error(`[${context || 'Error'}] ${err.message}`)
    throw err
  }

  error(`[${context || 'Error'}] Unknown error: ${String(err)}`)
  throw new Error(String(err))
}

export function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string,
): Promise<T> {
  return fn().catch(err => handleError(err, context))
}

export function logWarning(message: string, context?: Record<string, unknown>): void {
  if (context) {
    warning(`${message} | Context: ${JSON.stringify(context)}`)
  }
  else {
    warning(message)
  }
}
