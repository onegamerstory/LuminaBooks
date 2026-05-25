import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isElectron = process.env.ELECTRON === 'true';
    // Для production всегда используем относительные пути (нужно для Electron)
    const isProduction = mode === 'production';
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.ELECTRON': JSON.stringify(isElectron),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // В production всегда используем относительные пути для Electron
      base: isProduction ? './' : '/',
      build: {
        outDir: 'dist',
        emptyOutDir: true,
      },
    };
});
