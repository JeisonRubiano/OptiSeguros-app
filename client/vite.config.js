import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',  // Listen on all network interfaces
        port: 5173,
        strictPort: true,
        allowedHosts: ['192.168.1.10.nip.io'],
    }
})
