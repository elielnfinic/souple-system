import type Notification from '#models/notification'
import type User from '#models/user'

/**
 * Result returned by every channel's send() method.
 */
export interface ChannelSendResult {
  success: boolean
  externalId?: string
  error?: string
}

/**
 * All notification channels implement this interface.
 * Each channel must gracefully degrade when its env vars are not configured.
 */
export interface INotificationChannel {
  /** Channel name — must match the `channel` column value ('email' | 'sms' | 'telegram' | 'push') */
  name: string

  /** Attempt delivery and return a result. Never throw — always return { success: false, error } on failure. */
  send(notification: Notification, user: User): Promise<ChannelSendResult>
}
