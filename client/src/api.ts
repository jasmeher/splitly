let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;

const BASE_URL = 'http://localhost:5000/api/v1';

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

/**
 * Global API fetch wrapper.
 * Appends Authorization header, sets CORS credentials, and retries with rotated tokens on 401s.
 */
export const apiFetch = async (path: string, options: RequestInit = {}): Promise<any> => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  } as Record<string, string>;

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Vital to send and receive HttpOnly cookies
  };

  let response = await fetch(`${BASE_URL}${path}`, fetchOptions);

  // If request returns 401 Unauthorized (and isn't itself an auth check/refresh), try rotating token
  if (
    response.status === 401 &&
    path !== '/auth/login' &&
    path !== '/auth/register' &&
    path !== '/auth/refresh'
  ) {
    try {
      const newAccessToken = await refreshAccessToken();
      headers['Authorization'] = `Bearer ${newAccessToken}`;

      response = await fetch(`${BASE_URL}${path}`, {
        ...fetchOptions,
        headers,
      });
    } catch (refreshError) {
      setAccessToken(null);
      throw refreshError;
    }
  }

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch (e) {}
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  try {
    return await response.json();
  } catch (e) {
    return null;
  }
};

/**
 * Deduplicated access token refresh utility.
 * Spawns a single fetch call to rotate refresh token cookies on the backend.
 */
export const refreshAccessToken = async (): Promise<string> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Session expired');
      }

      const result = await response.json();
      const token = result.data.accessToken;
      setAccessToken(token);
      return token;
    } catch (error) {
      setAccessToken(null);
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};
