class AuthSingleton {
    static instance = null;

    constructor(config) {
        if (AuthSingleton.instance) {
            return AuthSingleton.instance;
        }
        this.baseUrl = config.baseUrl;
        AuthSingleton.instance = this;
    }

    getToken() {
        const sessionToken = sessionStorage.getItem('token');
        if (sessionToken) return sessionToken;
        return localStorage.getItem('token');
    }

    getTokenContents() {
        const token = this.getToken();
        if (!token) return null;
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch {
            return null;
        }
    }

    isTokenExpired() {
        let expires;
        if (sessionStorage.getItem('token')) {
            expires = new Date(sessionStorage.getItem('tokenExpires'));
        } else {
            expires = new Date(localStorage.getItem('tokenExpires'));
        }
        return expires <= new Date();
    }

    saveToken(data, storage = sessionStorage) {
        storage.setItem('token', data.token);
        storage.setItem('tokenExpires', data.expires);
        storage.setItem('tokenIssued', data.issued);
    }

    clearToken() {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('tokenExpires');
        sessionStorage.removeItem('tokenIssued');
        localStorage.removeItem('token');
        localStorage.removeItem('tokenExpires');
        localStorage.removeItem('tokenIssued');
    }

    login(email, password, storage = sessionStorage) {
        return fetch(`${this.baseUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'WRONG_CREDENTIALS_ERROR') {
                throw new Error('Invalid credentials');
            }
            if (data.status === 'SUCCESS') {
                this.saveToken(data, storage);
                return data;
            }
            throw new Error('Login failed');
        });
    }

    register(email, password, username) {
        return fetch(`${this.baseUrl}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, username })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'FIELD_ERROR') {
                throw new Error(data.formFields[0].error);
            }
            if (data.status === 'SUCCESS') {
                this.saveToken(data, sessionStorage);
                return data;
            }
            throw new Error('Registration failed');
        });
    }

    signout() {
        const token = this.getToken();
        if (!token) {
            return Promise.resolve();
        }

        return fetch(`${this.baseUrl}/auth/signout`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        .finally(() => {
            this.clearToken();
        });
    }

    getUser() {
        const token = this.getToken();
        if (!token) return null;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                id: payload.userId,
                email: payload.email,
                username: payload.username
            };
        } catch {
            return null;
        }
    }

    isAuthenticated() {
        return this.getToken() && !this.isTokenExpired();
    }

    doRequest(url, options = {}) {
        const token = this.getToken();
        if (!token) {
          return Promise.reject(new Error('No token available'));
        }
      
        // Parse the JWT token to get exp and iat
        const parseJWT = (token) => {
          try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
              '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            ).join(''));
            return JSON.parse(jsonPayload);
          } catch (error) {
            console.error('Error parsing JWT:', error);
            return null;
          }
        };
      
        if (!options.headers) {
          options.headers = {};
        }
        options.headers.Authorization = `Bearer ${token}`;
      
        return fetch(url, options)
          .then(response => {
            let newToken = response.headers.get('Authorization');
            if (newToken) {
              newToken = newToken.split(' ')[1];
              const tokenPayload = parseJWT(newToken);
              if (tokenPayload) {
                this.saveToken({
                  token: newToken,
                  expires: tokenPayload.exp,
                  issued: tokenPayload.iat
                });
              }
            }
            return response;
          });
      }
}

export const auth = new AuthSingleton({
    baseUrl: import.meta.env.VITE_AUTH_URL
});