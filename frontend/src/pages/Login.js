import { useState } from "react";
import { authApi } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await authApi.login({ email, password });
      login(res.data.token, res.data.user);
      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      alert("Login failed! Please check your credentials.");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-light-gray-bg">
      <div className="w-full max-w-md p-6 bg-white rounded-xl shadow-lg space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">Welcome Back! 👋</h1>
        <p className="text-center text-gray-500">
          Log in to track your habits and boost your productivity.
        </p>

        <form className="space-y-4" onSubmit={handleLogin}>
          <div className="space-y-1">
            <label className="text-gray-600">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="border border-subtle-gray p-3 w-full rounded-md focus:ring-2 focus:ring-mint-green outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-gray-600">Password</label>
            <input
              type="password"
              placeholder="********"
              className="border border-subtle-gray p-3 w-full rounded-md focus:ring-2 focus:ring-mint-green outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-mint-green text-white p-3 rounded-md hover:bg-mint-green-600 font-semibold"
          >
            Log In
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm">
          Don't have an account? <a href="/signup" className="text-mint-green hover:underline">Sign Up</a>
        </p>
      </div>
    </div>
  );
}
