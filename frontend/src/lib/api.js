const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
let accessToken = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}

export async function apiRequest(path, { method = "GET", body, headers = {} } = {}) {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login") {
      clearAccessToken();
      window.dispatchEvent(new Event("edify:unauthorized"));
    }
    const error = new Error(payload.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.details = payload.details;
    throw error;
  }
  return payload;
}
