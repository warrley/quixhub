// Hand-authored OpenAPI spec, served at GET /api/docs. Not generated from the
// routes — update this alongside any route/schema change (see the
// quixhub-backend-module and quixhub-db-migration skills).
export const openapiDocument = {
  openapi: '3.0.3',
  info: { title: 'QuixHub API', version: '0.1.0' },
  servers: [{ url: '/api' }],
  paths: {
    '/health': { get: { summary: 'Health check', responses: { '200': { description: 'OK' } } } },

    '/auth/register': {
      post: {
        summary: 'Create an account (@ufc.br / @alu.ufc.br email required)',
        responses: { '201': { description: 'Created' }, '409': { description: 'Email already registered' } },
      },
    },
    '/auth/login': {
      post: { summary: 'Log in', responses: { '200': { description: 'OK' }, '401': { description: 'Invalid credentials' } } },
    },
    '/auth/logout': { post: { summary: 'Log out', responses: { '204': { description: 'No content' } } } },
    '/auth/me': {
      get: { summary: 'Current user', security: [{ cookieAuth: [] }], responses: { '200': { description: 'OK' } } },
    },

    '/disciplines': {
      get: { summary: 'List disciplines with aggregate rating/responses/materialsCount', responses: { '200': { description: 'OK' } } },
      post: { summary: 'Create discipline (admin)', security: [{ cookieAuth: [] }], responses: { '201': { description: 'Created' } } },
    },
    '/disciplines/{id}': {
      get: { summary: 'Get discipline by id', responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } } },
      patch: { summary: 'Update discipline (admin)', security: [{ cookieAuth: [] }], responses: { '200': { description: 'OK' } } },
    },

    '/materials': {
      get: {
        summary: 'List published materials for a discipline',
        parameters: [{ name: 'disciplineId', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        summary: 'Upload a material (multipart/form-data, field "file" + metadata fields; status: pending)',
        security: [{ cookieAuth: [] }],
        responses: { '201': { description: 'Created' } },
      },
    },
    '/materials/pending': {
      get: { summary: 'Moderation queue (admin)', security: [{ cookieAuth: [] }], responses: { '200': { description: 'OK' } } },
    },
    '/materials/{id}/download': {
      get: { summary: 'Download the file (streamed from local disk)', security: [{ cookieAuth: [] }], responses: { '200': { description: 'OK' } } },
    },
    '/materials/{id}/helpful': {
      post: { summary: 'Mark a material as helpful (idempotent per user)', security: [{ cookieAuth: [] }], responses: { '204': { description: 'No content' } } },
    },
    '/materials/{id}/approve': {
      post: { summary: 'Approve a pending material (admin)', security: [{ cookieAuth: [] }], responses: { '200': { description: 'OK' } } },
    },
    '/materials/{id}/reject': {
      post: { summary: 'Reject a pending material (admin)', security: [{ cookieAuth: [] }], responses: { '200': { description: 'OK' } } },
    },

    '/feedback': {
      post: {
        summary: 'Submit structured, anonymous discipline feedback (one per user per discipline; resubmitting updates it)',
        security: [{ cookieAuth: [] }],
        responses: { '201': { description: 'Created' } },
      },
    },
    '/feedback/{disciplineId}/stats': {
      get: { summary: 'Aggregated feedback stats for a discipline', responses: { '200': { description: 'OK' } } },
    },

    '/calendar': {
      get: {
        summary: 'List events in a date range',
        parameters: [
          { name: 'from', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
      post: { summary: 'Create a calendar event', security: [{ cookieAuth: [] }], responses: { '201': { description: 'Created' } } },
    },
    '/calendar/{id}/confirmation': {
      post: { summary: 'Confirm or unconfirm attendance', security: [{ cookieAuth: [] }], responses: { '204': { description: 'No content' } } },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'quixhub_token' },
    },
  },
} as const;
