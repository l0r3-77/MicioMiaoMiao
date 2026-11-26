import type { IncomingMessage, ServerResponse } from 'http';
import { createApiApp } from '../server/apiApp.ts';

const app = createApiApp();

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (typeof req.url === 'string' && req.url.startsWith('/api/index')) {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      const vpath = parsed.searchParams.get('__vpath');
      if (vpath !== null) {
        parsed.searchParams.delete('__vpath');
        const cleaned = vpath.replace(/^\/+/, '');
        const qs = parsed.searchParams.toString();
        req.url = `/api/${cleaned}${qs ? `?${qs}` : ''}`;
      }
    } catch {
      // keep existing req.url if URL parsing fails
    }
  }
  return app(req as unknown as Parameters<typeof app>[0], res as unknown as Parameters<typeof app>[1]);
}
