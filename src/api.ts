// src/api.ts
const BASE = 'https://shriecom.in/appapis/shreefood/public/api';

export const getToken = () => localStorage.getItem('auth_token') || '';
export const getUser = () => {
  const u = localStorage.getItem('auth_user');
  return u ? JSON.parse(u) : null;
};

const authHeaders = () => ({
  'Authorization': `Bearer ${getToken()}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
});

// ✅ Generic <T> add kiya taaki apiGet/apiPost/apiPut/apiDelete
// specific response types return kar sakein (e.g. apiPost<LoginStepResponse>())
export const apiGet = async <T = any>(endpoint: string): Promise<T> => {
  const res = await fetch(`${BASE}${endpoint}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) {
    const message = data?.message || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(message);
  }
  return data as T;
};

export const apiPost = async <T = any>(endpoint: string, body: object): Promise<T> => {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  const data = await res.json(); // ✅ pehle JSON parse karo

  if (!res.ok) {
    // ✅ Server ka actual message error mein daal do
    const message =
      data?.errors?.[Object.keys(data?.errors || {})[0]]?.[0] || // validation errors
      data?.message ||                                            // general message
      `HTTP ${res.status}: ${res.statusText}`;                    // fallback
    throw new Error(message);
  }

  return data as T;
};

export const apiPut = async <T = any>(endpoint: string, body: object): Promise<T> => {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const message = data?.message || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(message);
  }
  return data as T;
};

export const apiDelete = async <T = any>(endpoint: string): Promise<T> => {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    const message = data?.message || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(message);
  }
  return data as T;
};