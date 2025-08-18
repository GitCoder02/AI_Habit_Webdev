import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <nav className="bg-white shadow-md p-4 flex justify-between items-center">
      <h1 className="font-bold text-xl text-gray-800">Habit Coach</h1>
      <div className="flex space-x-6">
        {token ? (
          <>
            <Link className="text-gray-700 hover:text-mint-green transition duration-300" to="/dashboard">Dashboard</Link>
            <Link className="text-gray-700 hover:text-mint-green transition duration-300" to="/habits">Habits</Link>
            <Link className="text-gray-700 hover:text-mint-green transition duration-300" to="/goals">Goals</Link>
            <Link className="text-gray-700 hover:text-mint-green transition duration-300" to="/calendar">Calendar</Link>
            <button onClick={handleLogout} className="text-red-500 hover:text-red-700 transition duration-300">Logout</button>
          </>
        ) : (
          <>
            <Link className="text-gray-700 hover:text-mint-green transition duration-300" to="/login">Login</Link>
            <Link className="text-gray-700 hover:text-mint-green transition duration-300" to="/signup">Signup</Link>
          </>
        )}
      </div>
    </nav>
  );
}