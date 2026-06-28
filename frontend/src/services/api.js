import axios from 'axios';

// Detect API URL:
// - Development (Vite dev server): http://localhost:3000/api (langsung ke backend)
// - Production: gunakan VITE_API_URL dari .env (misal: https://api.desalinasiac.cloud)
const getApiBaseUrl = () => {
    const { port } = window.location;

    // Development: Vite dev server ports
    const devPorts = ['5173', '5174', '5175'];
    if (devPorts.includes(port)) {
        return `http://localhost:3000/api`;
    }

    // Production: gunakan VITE_API_URL dari environment variable
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
        return `${apiUrl}/api`;
    }

    // Fallback jika VITE_API_URL tidak di-set
    return '/api';
};

const api = axios.create({
    baseURL: getApiBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 second timeout
});

// Add request interceptor to include JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('iot_access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.code === 'ECONNABORTED') {
            console.error('⏱️ Request Timeout:', error.config?.url);
            error.message = 'Request timeout - Backend mungkin tidak merespons';
        } else if (error.code === 'ERR_NETWORK') {
            console.error('🌐 Network Error:', error.config?.url);
            error.message = 'Tidak dapat terhubung ke backend. Pastikan backend sedang berjalan.';
        } else if (error.response) {
            console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} - Status: ${error.response.status}`, error.response.data);
        } else {
            console.error('❌ Unknown Error:', error.message);
        }
        return Promise.reject(error);
    }
);

export default api;
