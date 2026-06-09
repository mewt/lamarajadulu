import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

export default defineConfig({
  output: 'server',
  integrations: [vue()],
  vite: {
    server: {
      proxy: {
        '/api': 'http://localhost:3001'
      }
    }
  }
});
