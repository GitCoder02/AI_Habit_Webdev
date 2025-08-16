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
    <div className="flex justify-center items-center h-screen">
      <form
        onSubmit={handleSignup}
        className="bg-white p-6 rounded shadow-md w-80 space-y-4"
      >
        <h2 className="text-lg font-bold">Signup</h2>
        <input
          type="text"
          placeholder="Name"                    // ✅ Added name input
          className="border p-2 w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email"
          className="border p-2 w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="border p-2 w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded w-full"
        >
          Signup
        </button>
      </form>
    </div>
  );
}