// auth.js
function jwtDecode(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decoding JWT:', error);
        return null;
    }
}

class AuthFramework {
    static instance = null;
    
    constructor(config) {
        if (AuthFramework.instance) {
            return AuthFramework.instance;
        }
        
        this.baseUrl = config.baseUrl;
        this.renewalInterval = null;
        this.tokenRenewalThreshold = 5 * 60; // 5 minutes before expiry
        this.listeners = new Set();
        this.requestQueue = [];
        this.isRefreshing = false;
        
        // Start token renewal if user is already authenticated
        if (this.isAuthenticated()) {
            this.startTokenRenewal();
        }
        
        AuthFramework.instance = this;
    }

    // Event handling methods
    addEventListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners(event) {
        this.listeners.forEach(listener => listener(event));
    }

    // Token management methods
    getToken() {
        const sessionToken = sessionStorage.getItem('token');
        if (sessionToken) return sessionToken;
        return localStorage.getItem('token');
    }

    getTokenContents() {
        const token = this.getToken();
        if (!token) return null;
        try {
            return jwtDecode(token);
        } catch {
            return null;
        }
    }

    isTokenExpired() {
        const token = this.getTokenContents();
        if (!token) return true;
        return token.exp * 1000 <= Date.now();
    }

    needsRenewal() {
        const token = this.getTokenContents();
        if (!token) return false;

        const expiryTime = token.exp * 1000;
        const currentTime = Date.now();
        return (expiryTime - currentTime) < (this.tokenRenewalThreshold * 1000);
    }

    getStorageType() {
        return sessionStorage.getItem('token') ? sessionStorage : localStorage;
    }

    saveToken(data, storage = sessionStorage) {
        storage.setItem('token', data.token);
        storage.setItem('tokenExpires', data.expires);
        storage.setItem('tokenIssued', data.issued);
        
        this.notifyListeners({ type: 'tokenUpdated', token: data.token });
    }

    clearToken() {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('tokenExpires');
        sessionStorage.removeItem('tokenIssued');
        localStorage.removeItem('token');
        localStorage.removeItem('tokenExpires');
        localStorage.removeItem('tokenIssued');
        
        this.notifyListeners({ type: 'logout' });
    }

    // Token renewal methods
    startTokenRenewal() {
        if (this.renewalInterval) {
            clearInterval(this.renewalInterval);
        }
        
        this.renewalInterval = setInterval(() => {
            this.checkAndRenewToken();
        }, 10000);
    }

    stopTokenRenewal() {
        if (this.renewalInterval) {
            clearInterval(this.renewalInterval);
            this.renewalInterval = null;
        }
    }

    async checkAndRenewToken() {
        if (!this.isAuthenticated() || !this.needsRenewal() || this.isRefreshing) {
            return;
        }

        try {
            this.isRefreshing = true;
            const response = await fetch(`${this.baseUrl}/auth/renew`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            const data = await response.json();

            if (data.status === 'SUCCESS') {
                this.saveToken(data, this.getStorageType());
                
                // Process any queued requests
                this.processQueue(null, data.token);
            } else {
                this.processQueue(new Error('Token renewal failed'));
                this.handleAuthError();
            }
        } catch (error) {
            this.processQueue(error);
            console.error('Token renewal failed:', error);
        } finally {
            this.isRefreshing = false;
        }
    }

    // Queue management for concurrent requests during token renewal
    addToQueue(request) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ request, resolve, reject });
        });
    }

    processQueue(error, token = null) {
        this.requestQueue.forEach(({ request, resolve, reject }) => {
            if (error) {
                reject(error);
            } else {
                resolve(this.executeRequest(request, token));
            }
        });
        this.requestQueue = [];
    }

    // Authentication methods
    async login(email, password, storage = sessionStorage) {
        try {
            const response = await fetch(`${this.baseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.status === 'WRONG_CREDENTIALS_ERROR') {
                throw new Error('Invalid credentials');
            }

            if (data.status === 'SUCCESS') {
                this.saveToken(data, storage);
                this.startTokenRenewal();
                this.notifyListeners({ type: 'login', user: data.user });
                return data;
            }

            throw new Error('Login failed');
        } catch (error) {
            this.notifyListeners({ type: 'error', error });
            throw error;
        }
    }

    async register(email, password, username) {
        try {
            const response = await fetch(`${this.baseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, username })
            });

            const data = await response.json();

            if (data.status === 'FIELD_ERROR') {
                throw new Error(data.formFields[0].error);
            }

            if (data.status === 'SUCCESS') {
                this.saveToken(data, sessionStorage);
                this.startTokenRenewal();
                this.notifyListeners({ type: 'register', user: data.user });
                return data;
            }

            throw new Error('Registration failed');
        } catch (error) {
            this.notifyListeners({ type: 'error', error });
            throw error;
        }
    }

    async signout() {
        const token = this.getToken();
        if (!token) {
            return Promise.resolve();
        }

        try {
            await fetch(`${this.baseUrl}/auth/signout`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
        } finally {
            this.stopTokenRenewal();
            this.clearToken();
        }
    }

    // User information methods
    getUser() {
        const token = this.getTokenContents();
        if (!token) return null;
        
        return {
            id: token.userId,
            email: token.email,
            username: token.username
        };
    }

    isAuthenticated() {
        return this.getToken() && !this.isTokenExpired();
    }

    // HTTP request handling
    async executeRequest(request, token = null) {
        const currentToken = token || this.getToken();
        if (!currentToken) {
            throw new Error('No authentication token available');
        }

        const headers = {
            ...request.headers,
            'Authorization': `Bearer ${currentToken}`
        };

        const response = await fetch(request.url, {
            ...request,
            headers
        });

        // Check for new token in response headers
        const newToken = response.headers.get('Authorization');
        if (newToken) {
            const tokenValue = newToken.split(' ')[1];
            const tokenData = {
                token: tokenValue,
                expires: this.getTokenContents(tokenValue).exp * 1000,
                issued: this.getTokenContents(tokenValue).iat * 1000
            };
            this.saveToken(tokenData);
        }

        return response;
    }

    async fetchUsername(userId) {
        try {
            const response = await this.doRequest(`${this.baseUrl}/auth/user/${userId}`);
            const data = await response.json();

            if (data.status === 'SUCCESS') {
                return data.username;
            }

            throw new Error(data.error || 'Failed to fetch username');
        } catch (error) {
            console.error('Error fetching username:', error);
            throw error;
        }
    }
    async doRequest(url, options = {}) {
        if (!this.isAuthenticated()) {
          throw new Error('Not authenticated');
        }
      
        options.headers = options.headers || {};
        
        const timestampedUrl = new URL(url);
        timestampedUrl.searchParams.set('_t', Date.now());
      
        try {
          if (this.isRefreshing) {
            return await this.addToQueue({ url: timestampedUrl.toString(), ...options });
          }
      
          if (this.needsRenewal()) {
            await this.checkAndRenewToken();
          }
      
          return await this.executeRequest({ url: timestampedUrl.toString(), ...options });
        } catch (error) {
          if (error.message === 'Token expired' || error.response?.status === 401) {
            this.handleAuthError();
          }
          throw error;
        }
      }

    handleAuthError() {
        this.stopTokenRenewal();
        this.clearToken();
        this.notifyListeners({ type: 'authError', message: 'Authentication failed' });
    }
}

// Create and export the singleton instance
export const auth = new AuthFramework({
    baseUrl: import.meta.env.VITE_AUTH_URL
});

// React Hook for using auth state
export const useAuth = () => {
    const [user, setUser] = React.useState(auth.getUser());
    const [isAuthenticated, setIsAuthenticated] = React.useState(auth.isAuthenticated());

    React.useEffect(() => {
        const unsubscribe = auth.addEventListener((event) => {
            switch (event.type) {
                case 'login':
                case 'register':
                case 'tokenUpdated':
                    setUser(auth.getUser());
                    setIsAuthenticated(true);
                    break;
                case 'logout':
                case 'authError':
                    setUser(null);
                    setIsAuthenticated(false);
                    break;
            }
        });

        return () => unsubscribe();
    }, []);

    return {
        user,
        isAuthenticated,
        login: auth.login.bind(auth),
        register: auth.register.bind(auth),
        signout: auth.signout.bind(auth),
        getToken: auth.getToken.bind(auth)
    };
};