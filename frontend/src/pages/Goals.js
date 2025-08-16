// frontend/src/pages/Goals.js
import { useState, useEffect } from "react";
import Card from "../components/Card";
import api from "../api";

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");

  // Fetch user goals from backend
  const fetchGoals = async () => {
    try {
      const res = await api.get("/goals");
      setGoals(res.data);
    } catch (err) {
      console.error("Failed to fetch goals:", err);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const res = await api.post("/goals", { title, description, targetDate });
      setGoals([...goals, res.data]);
      setTitle(""); setDescription(""); setTargetDate("");
    } catch (err) {
      console.error("Failed to add goal:", err);
    }
  };

  const handleUpdateGoal = async (goalId, progress, isCompleted) => {
    try {
      const res = await api.put(`/goals/${goalId}`, { progress, isCompleted });
      setGoals(goals.map(g => (g._id === goalId ? res.data : g)));
    } catch (err) {
      console.error("Failed to update goal:", err);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Your Goals</h1>
      <p className="text-gray-500 mb-4">Set meaningful goals and track progress 🚀</p>

      {/* Add New Goal */}
      <Card title="Add New Goal">
        <form onSubmit={handleAddGoal} className="space-y-3">
          <input
            type="text"
            placeholder="Goal Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="border p-2 w-full rounded focus:ring-2 focus:ring-green-400 outline-none"
          />
          <input
            type="text"
            placeholder="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="border p-2 w-full rounded focus:ring-2 focus:ring-green-400 outline-none"
          />
          <input
            type="date"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            className="border p-2 w-full rounded focus:ring-2 focus:ring-green-400 outline-none"
          />
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded font-semibold transition-all"
          >
            Add Goal
          </button>
        </form>
      </Card>

      {/* Goal List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map(goal => (
          <Card key={goal._id} title={goal.title} className="hover:shadow-lg transition-shadow">
            <p className="text-gray-700 mb-2">{goal.description}</p>
            <p className="text-sm text-gray-500 mb-2">Target Date: {goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : "N/A"}</p>
            
            <input
              type="range"
              min="0"
              max="100"
              value={goal.progress}
              onChange={e => handleUpdateGoal(goal._id, Number(e.target.value), goal.isCompleted)}
              className="w-full mb-2 accent-green-500"
            />
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold">{goal.progress}%</span>
              <button
                className={`px-3 py-1 rounded font-semibold transition-all ${
                  goal.isCompleted
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                }`}
                onClick={() => handleUpdateGoal(goal._id, goal.progress, !goal.isCompleted)}
              >
                {goal.isCompleted ? "Completed" : "Mark Complete"}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}