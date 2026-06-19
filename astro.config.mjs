import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [tailwind()],
  /** NL: 0.0.0.0 nodig voor Docker/Coolify / EN: listen on all interfaces in production */
  server: {
    host: true,
    port: 4321,
  },
});
