import React, { createContext, useContext, useState, useEffect } from 'react';
import { googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode'; // Fix import

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing session
        const storedToken = localStorage.getItem('authToken');
        if (storedToken) {
            try {
                // Decode token to check expiration/validity locally if needed
                // For now, we trust it and let the backend reject it if invalid
                const decoded = jwtDecode(storedToken);

                // Check if token is expired
                if (decoded.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    setUser(decoded); // Use decoded info or fetch user profile
                }
            } catch (error) {
                logout();
            }
        }
        setLoading(false);
    }, []);

    const login = (userData, token) => {
        setUser(userData);
        localStorage.setItem('authToken', token);
    };

    const logout = () => {
        googleLogout();
        setUser(null);
        localStorage.removeItem('authToken');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
