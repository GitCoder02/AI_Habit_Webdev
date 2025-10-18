// frontend/src/api.js
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api", // ✅ Has /api
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
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// helper wrappers - NO /api prefix (baseURL already has it)
export const authApi = {
  login: (data) => api.post("/auth/login", data),      // ✅ No /api prefix
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
 * AI API: suggestions, intelligentSuggestions, peakHours, execute
 */
export const aiApi = {
  // Original suggestions endpoint
  suggestions: () => api.get("/ai/suggestions"),
  
  // NEW: Phase 1 Intelligent Suggestions
  intelligentSuggestions: (refresh = false) => 
    api.get("/ai/intelligent-suggestions", { params: { refresh } }),
  
  peakHours: () => api.get("/ai/peak-hours"),
  execute: (action) => api.post("/ai/execute", { action }),
};

// Backwards-compatible helper functions
export async function fetchAISuggestions() {
  const res = await api.get("/ai/suggestions");
  return res.data;
}

export async function fetchAIPeakHours() {
  const res = await api.get("/ai/peak-hours");
  return res.data;
}

// NEW: Helper for intelligent suggestions
export async function fetchIntelligentSuggestions(refresh = false) {
  const res = await api.get("/ai/intelligent-suggestions", { params: { refresh } });
  return res.data;
}

export default api;
