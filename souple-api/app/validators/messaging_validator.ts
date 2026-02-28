import vine from '@vinejs/vine'

export const startConversationValidator = vine.compile(
  vine.object({
    booking_id: vine.number().optional(),
    trip_id: vine.number().optional(),
    target_user_id: vine.number().optional(),
    target_org_id: vine.number().optional(),
    type: vine.enum(['passenger_agency', 'passenger_driver', 'internal']),
  })
)

export const sendMessageValidator = vine.compile(
  vine.object({
    content: vine.string().trim().minLength(1).maxLength(2000),
    type: vine.enum(['text', 'image', 'system']).optional(),
  })
)

export const cannedResponseValidator = vine.compile(
  vine.object({
    category: vine.string().maxLength(50),
    text: vine.object({
      fr: vine.string(),
      en: vine.string().optional(),
      ln: vine.string().optional(),
      sw: vine.string().optional(),
    }),
    sort_order: vine.number().optional(),
    is_active: vine.boolean().optional(),
  })
)
