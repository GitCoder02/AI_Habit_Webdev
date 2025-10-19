// frontend/src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Loader from "./components/Loader";
import ChatCoach from "./components/ChatCoach";
import ChatButton from "./components/ChatButton";
//import TestPanel from "./components/TestPanel"; // ✅ ADD THIS
import { Suspense, lazy, useState } from "react";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Habits = lazy(() => import("./pages/Habits"));
const Goals = lazy(() => import("./pages/Goals"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const PrivateRoute = lazy(() => import("./components/PrivateRoute"));

function AppRoutes() {
  const { isAuthenticated, loading, user } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);

  if (loading) return <Loader />;

  return (
    <Router>
      {isAuthenticated && <Navbar />}
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path="/habits" element={
            <PrivateRoute>
              <Habits />
            </PrivateRoute>
          } />
          <Route path="/goals" element={
            <PrivateRoute>
              <Goals />
            </PrivateRoute>
          } />
          <Route path="/calendar" element={
            <PrivateRoute>
              <Calendar userId={user?._id || user?.id} />
            </PrivateRoute>
          } />

          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<div className="p-6">404 - Page Not Found</div>} />
        </Routes>
      </Suspense>

      {/* Chat Coach & Test Panel (only show when authenticated) */}
      {isAuthenticated && (
        <>
          <ChatButton onClick={() => setIsChatOpen(true)} />
          <ChatCoach isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
          {/*<TestPanel />*/} {/* ✅ ADD THIS */}
        </>
      )}
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}