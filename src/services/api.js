import axios from "axios";

const API_ORIGIN = import.meta.env.VITE_API_URL || "http://localhost:8080";
const API_BASE = import.meta.env.DEV ? "/api" : `${API_ORIGIN}/api`;

const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const WRITE_METHODS = new Set(["post", "put", "patch", "delete"]);
const AUTH_PREFIX = "Bearer ";

const getCookieValue = (name) => {
  const cookie = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  return cookie.split("=").slice(1).join("=");
};

const normalizeToken = (rawToken) => {
  if (!rawToken) {
    return null;
  }

  let token = rawToken.trim();

  if (token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1);
  }

  if (token.startsWith(AUTH_PREFIX)) {
    token = token.slice(AUTH_PREFIX.length).trim();
  }

  return token || null;
};

const csrfClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Create an Axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
  xsrfCookieName: CSRF_COOKIE_NAME,
  xsrfHeaderName: "X-XSRF-TOKEN",
});

// Add a request interceptor to include JWT and CSRF tokens
api.interceptors.request.use(
  async (config) => {
    const token = normalizeToken(localStorage.getItem("JWT_TOKEN"));
    if (token) {
      config.headers.Authorization = `${AUTH_PREFIX}${token}`;
    }

    const method = (config.method || "get").toLowerCase();
    if (WRITE_METHODS.has(method)) {
      const csrfToken = getCookieValue(CSRF_COOKIE_NAME);

      // Ensure the CSRF cookie exists before sending write requests.
      if (!csrfToken) {
        try {
          await csrfClient.get("/csrf-token");
        } catch (error) {
          console.error("Failed to fetch CSRF token", error);
        }
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default api;
