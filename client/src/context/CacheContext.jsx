
import React, { createContext, useContext, useState, useCallback } from 'react';

const CacheContext = createContext();

export function CacheProvider({ children }) {
    const [cache, setCacheState] = useState({});

    // Retrieve data from cache
    const getCache = useCallback((key) => {
        return cache[key];
    }, [cache]);

    // Save data to cache
    const setCache = useCallback((key, data) => {
        setCacheState(prev => ({
            ...prev,
            [key]: {
                data,
                timestamp: Date.now()
            }
        }));
    }, []);

    // Clear specific cache key
    const clearCache = useCallback((key) => {
        setCacheState(prev => {
            const newCache = { ...prev };
            delete newCache[key];
            return newCache;
        });
    }, []);

    // Clear all cache (useful for full reload/logout)
    const clearAllCache = useCallback(() => {
        setCacheState({});
    }, []);

    const value = {
        cache,
        getCache,
        setCache,
        clearCache,
        clearAllCache
    };

    return (
        <CacheContext.Provider value={value}>
            {children}
        </CacheContext.Provider>
    );
}

export function useCache() {
    const context = useContext(CacheContext);
    if (!context) {
        throw new Error('useCache must be used within a CacheProvider');
    }
    return context;
}
