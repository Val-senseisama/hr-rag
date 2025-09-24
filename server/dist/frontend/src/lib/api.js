"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const STORAGE_KEY = 'valtech_tokens';
function getTokens() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
}
function setTokens(tokens) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}
function clearTokens() {
    localStorage.removeItem(STORAGE_KEY);
}
async function request(input, init = {}) {
    const tokens = getTokens();
    const headers = new Headers(init.headers || {});
    headers.set('Content-Type', 'application/json');
    if (tokens?.access)
        headers.set('x-access-token', tokens.access);
    if (tokens?.refresh)
        headers.set('x-refresh-token', tokens.refresh);
    const res = await fetch(input, { ...init, headers });
    if (res.status === 401 && tokens?.refresh) {
        // Attempt one refresh by calling login/refresh if you expose one. For now, just clear.
        clearTokens();
    }
    return res;
}
exports.api = {
    async login(email, password) {
        const res = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        if (!res.ok)
            throw new Error('Login failed');
        const data = await res.json();
        const tokens = { access: data.tokens.access, refresh: data.tokens.refresh };
        setTokens(tokens);
        return data;
    },
    async register(name, email, password) {
        const res = await request('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
        if (!res.ok)
            throw new Error('Register failed');
        const data = await res.json();
        const tokens = { access: data.tokens.access, refresh: data.tokens.refresh };
        setTokens(tokens);
        return data;
    },
    async me() {
        const res = await request('/api/users/me');
        if (!res.ok)
            throw new Error('Unauthorized');
        return res.json();
    },
    async listDocuments(companyId, page = 1, limit = 30) {
        const res = await request(`/api/companies/${companyId}/documents?page=${page}&limit=${limit}`);
        if (!res.ok)
            throw new Error('Failed to fetch documents');
        return res.json();
    },
    async listCompanies(userId, page = 1, limit = 30) {
        const res = await request(`/api/users/${userId}/companies?page=${page}&limit=${limit}`);
        if (!res.ok)
            throw new Error('Failed to fetch companies');
        return res.json();
    },
    getTokens,
    setTokens,
    clearTokens,
};
