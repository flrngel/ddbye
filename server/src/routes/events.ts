import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { getRequest } from '../db.js';
import { addListener } from '../sse.js';

const app = new Hono();

// GET /requests/:id/events
app.get('/:id/events', (c) => {
  const id = c.req.param('id');
  const req = getRequest(id);

  if (!req) {
    return c.text('not found', 404);
  }

  // If already terminal, emit immediately and close
  if (req.status === 'ready' || req.status === 'failed') {
    return streamSSE(c, async (stream) => {
      await stream.write(': ping\n\n');
      const eventName = req.status === 'ready' ? 'request.ready' : 'request.failed';
      const eventData: Record<string, unknown> = { id: req.id, status: req.status };
      if (req.status === 'failed') eventData.error = 'unknown failure';
      await stream.writeSSE({
        data: JSON.stringify(eventData),
        event: eventName,
        id: '1',
      });
    });
  }

  return streamSSE(c, async (stream) => {
    // Send ping comment
    await stream.write(': ping\n\n');

    let closed = false;

    const removeListener = addListener(id, (event, data, eventId) => {
      if (closed) return;
      stream.writeSSE({ data, event, id: String(eventId) }).catch(() => {
        closed = true;
      });

      // Close stream on terminal events
      if (event === 'request.ready' || event === 'request.failed') {
        setTimeout(() => {
          closed = true;
          stream.close();
        }, 100);
      }
    });

    stream.onAbort(() => {
      closed = true;
      removeListener();
    });

    // Keep stream alive — it will be closed by the listener on terminal event or client disconnect
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (closed) {
          clearInterval(interval);
          resolve();
        }
      }, 500);
    });
  });
});

export default app;
