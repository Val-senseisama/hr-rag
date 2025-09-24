import Session from '../helpers/Session';

export type Tokens = { access: string; refresh: string };

function getTokens(): Tokens | null {
  return Session.get('valtech_tokens');
}

function setTokens(tokens: Tokens) {
  // Set in localStorage
  Session.set('valtech_tokens', tokens);
  // Set cookies for x-access-token and x-refresh-token
  Session.setCookie('x-access-token', tokens.access);
  Session.setCookie('x-refresh-token', tokens.refresh);
}

function clearTokens() {
  Session.remove('valtech_tokens');
  Session.setCookie('x-access-token', '');
  Session.setCookie('x-refresh-token', '');
}

const baseUrl = import.meta.env.VITE_API_URL;

async function request(input: RequestInfo, init: RequestInit = {}) {
  const tokens = getTokens();
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  
  // Get tokens from cookies as fallback
  const accessToken = tokens?.access || Session.getCookie('x-access-token');
  const refreshToken = tokens?.refresh || Session.getCookie('x-refresh-token');
  
  if (accessToken) headers.set('x-access-token', accessToken);
  if (refreshToken) headers.set('x-refresh-token', refreshToken);

  const res = await fetch(input, { ...init, headers });
  if (res.status === 401 && refreshToken) {
    // Attempt one refresh by calling login/refresh if you expose one. For now, just clear.
    clearTokens();
  }
  return res;
}

export const api = {
  async login(email: string, password: string) {
    const res = await request(`${baseUrl}/api/auth/login`, { method: 'POST', body: JSON.stringify({ email, password }) });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    const tokens: Tokens = { access: data.tokens.access, refresh: data.tokens.refresh };
    setTokens(tokens);
    return data;
  },
  async register(name: string, email: string, password: string) {
    const res = await request(`${baseUrl}/api/auth/register`, { method: 'POST', body: JSON.stringify({ name, email, password }) });
    if (!res.ok) throw new Error('Register failed');
    const data = await res.json();
    const tokens: Tokens = { access: data.tokens.access, refresh: data.tokens.refresh };
    setTokens(tokens);
    return data;
  },
  async me() {
    const res = await request(`${baseUrl}/api/users/me`);
    if (!res.ok) throw new Error('Unauthorized');
    return res.json();
  },
  async listDocuments(companyId: string, page=1, limit=30) {
    const res = await request(`${baseUrl}/api/companies/${companyId}/documents?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },
  async listCompanies(userId: string, page=1, limit=30) {
    const res = await request(`${baseUrl}/api/users/${userId}/companies?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch companies');
    return res.json();
  },
  async forgotPassword(email: string) {
    const res = await request(`${baseUrl}/api/auth/forgot-password`, { method: 'POST', body: JSON.stringify({ email }) });
    if (!res.ok) throw new Error('Failed to send reset code');
    return res.json();
  },
  async resetPassword(email: string, code: string, newPassword: string) {
    const res = await request(`${baseUrl}/api/auth/reset-password`, { method: 'POST', body: JSON.stringify({ email, code, newPassword }) });
    if (!res.ok) throw new Error('Reset failed');
    return res.json();
  },
  async joinCompanyByToken(token: string) {
    const res = await request(`${baseUrl}/api/companies/join-by-token`, { method: 'POST', body: JSON.stringify({ token }) });
    if (!res.ok) throw new Error('Failed to join company');
    return res.json();
  },
  async getCompanyMembers(companyId: string) {
    const res = await request(`${baseUrl}/api/companies/${companyId}/members`);
    if (!res.ok) throw new Error('Failed to fetch members');
    return res.json();
  },
  async removeMemberFromCompany(companyId: string, userId: string) {
    const res = await request(`${baseUrl}/api/companies/${companyId}/members/${userId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove member');
    return res.json();
  },
  async updateMemberPermissions(companyId: string, userId: string, permissions: { read?: boolean; create?: boolean; update?: boolean; delete?: boolean }) {
    const res = await request(`${baseUrl}/api/companies/${companyId}/members/${userId}/permissions`, { 
      method: 'PATCH', 
      body: JSON.stringify(permissions) 
    });
    if (!res.ok) throw new Error('Failed to update permissions');
    return res.json();
  },
  getTokens,
  setTokens,
  clearTokens,
};


