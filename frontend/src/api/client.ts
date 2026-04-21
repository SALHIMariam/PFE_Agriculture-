import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Intercepteur : rejeter silencieusement les 401 (session expirée ou pas encore connecté)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      return Promise.reject(error);
    }
    console.error("API error:", error.response?.status, error.message);
    return Promise.reject(error);
  }
);

export default api;
