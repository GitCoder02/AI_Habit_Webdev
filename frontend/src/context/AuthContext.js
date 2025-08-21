import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api, { authApi } from "../api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(true);

  // Using useCallback to prevent this function from being recreated on every render
  const fetchUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setUser(null);
      return;
    }
    try {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const res = await authApi.fetchMe();
      setUser(res.data);
    } catch (err) {
      console.error("Failed to fetch user:", err);
      // It's better to call the logout function here to ensure everything is cleared
      logout();
    } finally {
      setLoading(false);
    }
  }, [token]); // Dependency array ensures it's recreated only when the token changes

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = (newToken, userData) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common["Authorization"];
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        loading,
        refetchUser: fetchUser, // --- NEW: Expose the fetchUser function ---
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);