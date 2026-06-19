#!/usr/bin/env node
/**
 * NL: Productie-start voor Coolify/Docker / EN: Production entry for Coolify/Docker
 */
process.env.HOST ??= '0.0.0.0';
process.env.PORT ??= '80';

console.log(`[rijkdle] Starting SSR server on ${process.env.HOST}:${process.env.PORT}`);

await import('../dist/server/entry.mjs');
