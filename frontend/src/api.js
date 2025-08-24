// frontend/src/api.js
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
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
      // optional: redirect to login
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// helper wrappers
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
  // CHANGED: use /complete endpoint (backend uses /:id/complete)
  toggle: (id) => api.put(`/habits/${id}/complete`),
  update: (id, payload) => api.put(`/habits/${id}`, payload),
  remove: (id) => api.delete(`/habits/${id}`),
};

export const googleApi = {
  authUrl: () => api.get("/google/auth-url"),
  fetchEvents: (params) => api.get("/google/events", { params }),
  createEvent: (payload) => api.post("/google/events", payload),
};

export const dashboardApi = {
  summary: () => api.get("/dashboard"),
};

/**
 * AI API: suggestions, peakHours, execute
 * - suggestions() returns axios response of GET /api/ai/suggestions
 * - peakHours() returns GET /api/ai/peak-hours
 * - execute(action) posts an action object to server to apply suggestion
 */
export const aiApi = {
  suggestions: () => api.get("/ai/suggestions"),
  peakHours: () => api.get("/ai/peak-hours"),
  /**
   * action: { action: "reschedule"|"reduce_frequency"|"create_microtask"|"suggest_block", payload: {...} }
   */
  execute: (action) => api.post("/ai/execute", { action }),
};

// Backwards-compatible helper functions (used elsewhere)
export async function fetchAISuggestions() {
  const res = await api.get("/ai/suggestions");
  return res.data;
}

export async function fetchAIPeakHours() {
  const res = await api.get("/ai/peak-hours");
  return res.data;
}

export default api;