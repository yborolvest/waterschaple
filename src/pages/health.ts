import type { APIRoute } from 'astro';

/** NL: Liveness op /health (Coolify default) / EN: Liveness at /health */
export const GET: APIRoute = () =>
  new Response('ok', {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
