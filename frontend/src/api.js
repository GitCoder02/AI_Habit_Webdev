// frontend/src/api.js
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  // not using cookies; token is attached manually from localStorage
});

// attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// global 401 handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      // let app handle redirect via AuthContext or window.location
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// helper wrappers (optional, but convenient)
export const authApi = {
  login: (data) => api.post("/auth/login", data),
  register: (data) => api.post("/auth/register", data),
  fetchMe: () => api.get("/me"),
};

export const eventsApi = {
  list: () => api.get("/events"),
  create: (payload) => api.post("/events", payload),
  update: (id, payload) => api.put(`/events/${id}`, payload),
  remove: (id) => api.delete(`/events/${id}`),
};

export const goalsApi = {
  list: () => api.get("/goals"),
  create: (payload) => api.post("/goals", payload),
  update: (id, payload) => api.put(`/goals/${id}`, payload),
  remove: (id) => api.delete(`/goals/${id}`),
};

export const habitsApi = {
  list: () => api.get("/habits"),
  create: (payload) => api.post("/habits", payload),
  toggle: (id) => api.put(`/habits/${id}/toggle`),
  update: (id, payload) => api.put(`/habits/${id}`, payload),
  remove: (id) => api.delete(`/habits/${id}`),
};

export default api;
