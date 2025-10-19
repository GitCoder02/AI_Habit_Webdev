// frontend/src/components/Navbar.js
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const linkClass = ({ isActive }) =>
    `text-gray-700 hover:text-mint-green transition duration-200 ${
      isActive ? "text-energetic-orange font-semibold" : ""
    }`;

  return (
    <nav className="bg-white shadow-md p-4 flex justify-between items-center">
      <h1 className="font-bold text-xl text-gray-800">Habit Coach</h1>
      <div className="flex space-x-6 items-center">
        <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
        <NavLink to="/habits" className={linkClass}>Habits</NavLink>
        <NavLink to="/goals" className={linkClass}>Goals</NavLink>
        <NavLink to="/calendar" className={linkClass}>Calendar</NavLink>
        
        {/* Notification Bell */}
        <NotificationBell />
        
        <button 
          onClick={handleLogout} 
          className="text-red-500 hover:text-red-700 transition"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
