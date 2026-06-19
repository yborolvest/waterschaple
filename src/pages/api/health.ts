import type { APIRoute } from 'astro';

/** NL: Health check voor Coolify/load balancers / EN: Liveness probe */
export const GET: APIRoute = () =>
  new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
