// frontend/src/components/PrivateRoute.js
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "./Loader";

export default function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <Loader />; // while we check token
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}