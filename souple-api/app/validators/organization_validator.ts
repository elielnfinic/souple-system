import vine from '@vinejs/vine'

export const createOrganizationValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(255),
    type: vine.enum(['agency', 'company', 'independent']),
    address: vine.string().trim().maxLength(500).optional(),
    city: vine.string().trim().maxLength(100),
    country: vine.string().trim().maxLength(50).optional(),
    phone: vine.string().trim().maxLength(20),
    email: vine.string().email().trim(),
    taxId: vine.string().trim().maxLength(100).optional(),
    isPublic: vine.boolean().optional(),
  })
)

export const updateOrganizationValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(255).optional(),
    address: vine.string().trim().maxLength(500).optional(),
    city: vine.string().trim().maxLength(100).optional(),
    phone: vine.string().trim().maxLength(20).optional(),
    email: vine.string().email().trim().optional(),
    taxId: vine.string().trim().maxLength(100).optional(),
    isPublic: vine.boolean().optional(),
    settings: vine.object({}).allowUnknownProperties().optional(),
  })
)

export const addMemberValidator = vine.compile(
  vine.object({
    userId: vine.number().positive(),
    role: vine.enum(['owner', 'manager', 'finance', 'ticketer', 'driver']),
  })
)

export const updateMemberRoleValidator = vine.compile(
  vine.object({
    role: vine.enum(['owner', 'manager', 'finance', 'ticketer', 'driver']),
  })
)
