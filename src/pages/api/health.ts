import type { APIRoute } from 'astro';

/** NL: Health check voor Coolify/load balancers / EN: Liveness probe */
export const GET: APIRoute = () =>
  new Response(JSON.stringify({ ok: true, service: 'rijkdle' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Rijkdle': 'ok',
    },
  });
