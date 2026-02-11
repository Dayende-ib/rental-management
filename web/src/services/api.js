import axios from "axios";
import { incrementLoading, decrementLoading } from "./loadingStore";

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use(
  (config) => {
    incrementLoading();

    const requestUrl = typeof config.url === "string" ? config.url : "";
    if (!requestUrl.startsWith("/auth") && !requestUrl.startsWith("/web")) {
      config.url = `/web${requestUrl}`;
    }

    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    decrementLoading();
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    decrementLoading();
    return response;
  },
  (error) => {
    decrementLoading();
    return Promise.reject(error);
  }
);

const toListResult = (payload, fallbackLimit = 20) => {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      meta: {
        page: 1,
        limit: fallbackLimit,
        total_items: payload.length,
        total_pages: 1,
      },
    };
  }

  if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
    const meta = payload.meta || {};
    return {
      items: payload.data,
      meta: {
        page: Number(meta.page || 1),
        limit: Number(meta.limit || fallbackLimit),
        total_items: Number(meta.total_items || payload.data.length || 0),
        total_pages: Number(meta.total_pages || 1),
      },
    };
  }

  return {
    items: [],
    meta: {
      page: 1,
      limit: fallbackLimit,
      total_items: 0,
      total_pages: 1,
    },
  };
};

api.getList = async (url, config = {}) => {
  const response = await api.get(url, config);
  const fallbackLimit = Number(config?.params?.limit || 20);
  return toListResult(response.data, fallbackLimit);
};

api.toListResult = toListResult;

export default api;
