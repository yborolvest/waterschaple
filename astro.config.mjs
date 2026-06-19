import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://rijkdle.nl',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [tailwind()],
  /** NL: 0.0.0.0 voor Docker/Coolify / EN: all interfaces in production (PORT env sets prod port) */
  server: {
    host: true,
    port: 4321,
  },
});
