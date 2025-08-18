import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";

export default function Signup() {
  const [name, setName] = useState("");          // ✅ Added name state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/register", { name, email, password }); // ✅ include name

      // Auto-login after signup
      login(res.data.token, res.data.user);

      alert("Signup successful!");
      window.location.href = "/dashboard"; // redirect to dashboard
    } catch (err) {
      console.error(err);
      alert("Signup failed! Please try again.");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-light-gray-bg">
      <form
        onSubmit={handleSignup}
        className="bg-white p-6 rounded shadow-md w-80 space-y-4"
      >
        <h2 className="text-lg font-bold">Signup</h2>
        <input
          type="text"
          placeholder="Name"                    // ✅ Added name input
          className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email"
          className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          className="w-full bg-mint-green text-white px-4 py-2 rounded font-semibold hover:bg-mint-green-600"
        >
          Signup
        </button>
      </form>
    </div>
  );
}