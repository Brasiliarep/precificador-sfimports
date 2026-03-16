/**
 * API Utility for SF Imports
 * Centralizes security token management and provide a global fetch wrapper
 */

const API_AUTH_TOKEN = 'sf-imports-protected-2026';

/**
 * Global Fetch Wrapper
 * Automatically adds the X-Auth-Token to all requests starting with /api
 */
export const setupApiSecurity = () => {
    const { fetch: originalFetch } = window;

    window.fetch = async (...args) => {
        let [resource, config] = args;

        // Check if the request is to our API
        const isApiRequest = typeof resource === 'string' &&
            (resource.startsWith('/api') ||
                resource.startsWith('http://localhost:3002/api') ||
                resource.includes(':3002/api') ||
                resource.startsWith('http://localhost:3000/api') ||
                resource.includes(':3000/api'));

        if (isApiRequest) {
            config = config || {};
            // DO NOT mess with headers if body is FormData because the browser needs to set the exact boundary
            if (!(config.body instanceof FormData)) {
                config.headers = {
                    ...config.headers,
                    'X-Auth-Token': API_AUTH_TOKEN
                };
            }

        }

        return originalFetch(resource, config);
    };

    console.log('🛡️ API Security Wrapper initialized');
};

// Default export for easy usage
export default setupApiSecurity;
