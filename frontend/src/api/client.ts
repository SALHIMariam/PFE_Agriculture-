import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (error.response?.status === 419 && config && !config._retriedAfterCsrf) {
      config._retriedAfterCsrf = true;
      await api.get("/sanctum/csrf-cookie");
      return api(config);
    }
    if (error.response?.status !== 401) {
      console.error("API error:", error.response?.status, error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
