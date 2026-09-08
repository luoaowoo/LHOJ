import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const primaryHydro = process.env.VITE_HYDRO_PRIMARY ?? 'http://64.90.0.223:801';
const proxyOptions = {
  target: primaryHydro,
  changeOrigin: true,
  ws: true,
  configure(proxy) {
    proxy.on('proxyReq', (proxyReq) => {
      proxyReq.setHeader('Origin', primaryHydro);
      proxyReq.setHeader('Referer', `${primaryHydro}/`);
    });
  },
};
const nativeProxyOptions = {
  ...proxyOptions,
  rewrite: (path: string) => path.replace(/^\/hydro-native/, '') || '/',
};

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          mui: ['@mui/material', '@emotion/react', '@emotion/styled'],
          markdown: ['react-markdown'],
          router: ['react-router-dom'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': proxyOptions,
      '/hydro-native/': nativeProxyOptions,
    }
  }
});
