import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// 相對路徑 base：打包後可直接放到任何靜態主機（GitHub Pages、學校主機）子目錄
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 700, // three.js 本身約 550 kB（gzip 後約 145 kB）
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        text: resolve(__dirname, 'text.html'),
      },
    },
  },
});
