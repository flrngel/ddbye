import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import requestsRoutes from './routes/requests.js';
import eventsRoutes from './routes/events.js';
import redraftRoutes from './routes/redraft.js';

const app = new Hono();

// CORS — respect CORS_ORIGIN env var, default to * only in development
const corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin && process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
  throw new Error('CORS_ORIGIN env var is required in non-development environments');
}
if (!corsOrigin) {
  console.warn('[security] CORS_ORIGIN not set — defaulting to * (development only)');
}
app.use('*', cors({ origin: corsOrigin ?? '*' }));

// Health check
app.get('/health', (c) => c.json({ ok: true }));

// Mount routes
app.route('/requests', requestsRoutes);
app.route('/requests', eventsRoutes);
app.route('/requests', redraftRoutes);

const port = parseInt(process.env.PORT || '3001', 10);

serve({ fetch: app.fetch, port }, () => {
  console.log(`DDBye API server running on http://localhost:${port}`);
});
