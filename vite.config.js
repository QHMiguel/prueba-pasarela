import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";
import Components from 'unplugin-vue-components/vite';
import dotenv from 'dotenv';

dotenv.config();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vuetify({
      autoImport: true,
    }),
    Components({
      resolvers: [
        // PrimeVueResolver()
      ]
    })
  ],
  base: '/pasarela/',
  build: {
    outDir: 'dist',
  },
  server: {
    port: process.env.VUE_APP_PORT ? parseInt(process.env.VUE_APP_PORT) : 3000,
  },
  define: {
    'process.env': process.env
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
});
