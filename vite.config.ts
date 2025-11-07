// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    plugins: [react()],
    base: '/', // change if you ever deploy under a subpath
    server: {
      port: 5173,
      strictPort: true,
      open: false,
      headers: { 'Cache-Control': 'no-store' }, // avoid caching during dev
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
    build: {
      target: ['es2020', 'chrome100', 'safari15', 'edge100', 'firefox102'],
      sourcemap: !isProd,
      outDir: 'dist',
      assetsDir: 'assets',
      cssMinify: true,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 900,
      assetsInlineLimit: 4096,
    },
    esbuild: {
      drop: isProd ? ['console', 'debugger'] : [],
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || 'dev'),
    },
  };
});
