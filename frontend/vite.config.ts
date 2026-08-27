import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 1420,
    strictPort: true,
    host: true,
    // Cargo writes target\debug\deps\*.exe while Vite's watcher scans the
    // project root; watching those files crashes the dev server with EBUSY
    // on Windows and HMR never needs Rust build artifacts anyway.
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  clearScreen: false,
})
