import { defineConfig } from '@adonisjs/core/bodyparser'

export default defineConfig({
  allowedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  form: {
    enabled: true,
    limit: '1mb',
    queryString: {},
    convertEmptyStringsToNull: true,
    fields: {
      allow: [],
      deny: [],
    },
    files: {
      allow: [],
      deny: [],
    },
  },
  json: {
    enabled: true,
    limit: '1mb',
    strict: true,
    types: ['application/json', 'application/json-patch+json', 'application/vnd.api+json', 'application/csp-report'],
  },
  raw: {
    enabled: false,
    limit: '1mb',
    types: ['text/*'],
  },
  multipart: {
    enabled: true,
    autoProcess: true,
    processManually: [],
    limit: '20mb',
    maxFields: 1000,
    convertEmptyStringsToNull: true,
    fieldsLimit: '2mb',
    types: ['multipart/form-data'],
  },
})
