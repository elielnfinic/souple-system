import vine from '@vinejs/vine'

const CHANNELS = ['email', 'sms', 'telegram', 'push'] as const

/**
 * Update one or more notification preferences for the authenticated user.
 * Each entry specifies channel + type + enabled state.
 * Use type='*' to set the wildcard default for a channel.
 */
export const updatePreferencesValidator = vine.compile(
  vine.object({
    preferences: vine.array(
      vine.object({
        channel: vine.enum(CHANNELS),
        type: vine.string().trim().minLength(1).maxLength(100),
        enabled: vine.boolean(),
      })
    ).minLength(1),
  })
)

/**
 * Send a notification to a single user (admin endpoint).
 * channels is optional — omit to use the user's preferences.
 */
export const sendNotificationValidator = vine.compile(
  vine.object({
    userId: vine.number().positive(),
    type: vine.string().trim().minLength(1).maxLength(100),
    title: vine.string().trim().minLength(1).maxLength(255),
    body: vine.string().trim().minLength(1),
    channels: vine.array(vine.enum(CHANNELS)).optional(),
    organizationId: vine.number().positive().optional(),
    data: vine.record(vine.any()).optional(),
  })
)

/**
 * Broadcast a notification to multiple users (admin endpoint).
 */
export const broadcastValidator = vine.compile(
  vine.object({
    userIds: vine.array(vine.number().positive()).minLength(1),
    type: vine.string().trim().minLength(1).maxLength(100),
    title: vine.string().trim().minLength(1).maxLength(255),
    body: vine.string().trim().minLength(1),
    organizationId: vine.number().positive().optional(),
    data: vine.record(vine.any()).optional(),
  })
)

/**
 * Register a Web Push subscription for the authenticated user.
 */
export const pushSubscribeValidator = vine.compile(
  vine.object({
    endpoint: vine.string().trim().url().maxLength(2048),
    p256dhKey: vine.string().trim().minLength(10).maxLength(255),
    authKey: vine.string().trim().minLength(10).maxLength(255),
    userAgent: vine.string().trim().maxLength(255).optional(),
  })
)
