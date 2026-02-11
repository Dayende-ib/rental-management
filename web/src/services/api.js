import axios from "axios";
import { incrementLoading, decrementLoading } from "./loadingStore";

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  incrementLoading();

  // Rediriger automatiquement vers /web pour tout ce qui n'est pas auth
  if (!config.url.startsWith('/auth')) {
    // S'assurer qu'on ne double pas le préfixe si déjà présent
    if (!config.url.startsWith('/web')) {
      config.url = `/web${config.url}`;
    }
  }

  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => {
  decrementLoading();
  return Promise.reject(error);
});

api.interceptors.response.use((response) => {
  decrementLoading();
  return response;
}, (error) => {
  decrementLoading();
  return Promise.reject(error);
});

export default api;

