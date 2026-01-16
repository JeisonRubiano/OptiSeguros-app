import API_BASE_URL from '../config';

export const fetchWithAuth = async (endpoint, options = {}) => {
    const token = localStorage.getItem('authToken');

    // Ensure headers exist
    const optionsHeaders = options.headers || {};

    // Merge headers
    const headers = {
        'Content-Type': 'application/json',
        ...optionsHeaders,
    };

    if (token) {
        // Remove quotes if they exist (sometimes JSON.stringify adds them)
        const cleanToken = token.replace(/^"(.*)"$/, '$1');
        headers['Authorization'] = `Bearer ${cleanToken}`;
    }

    // Ensure endpoint starts with / if not present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    const response = await fetch(`${API_BASE_URL}${cleanEndpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        localStorage.removeItem('authToken');
        // Optional: Redirect to login. 
        // Using window.location is a hard redirect, but works for this level of abstraction.
        if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
        }
    }

    return response;
};
