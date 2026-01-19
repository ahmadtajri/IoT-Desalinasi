import axios from 'axios';

// Gunakan environment variable untuk production (Vercel)
// Fallback ke localhost untuk development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 second timeout
});

// Log API URL saat development (untuk debugging)
if (import.meta.env.DEV) {
    console.log('[API] Base URL:', API_BASE_URL);
}

export default api;
