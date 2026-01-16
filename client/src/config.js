// API Configuration
// Change this to your server's IP when accessing from other devices on the network
// For local access: 'http://localhost:8000'
// For network access: 'http://192.168.1.14:8000'

const API_BASE_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : `http://${window.location.hostname}:8000`);

export default API_BASE_URL;
