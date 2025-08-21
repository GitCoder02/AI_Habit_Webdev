// frontend/src/pages/Goals.js
import { useState, useEffect } from "react";
import Card from "../components/Card";
import api from "../api";
import Loader from "../components/Loader"; // Import Loader

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true); // Add loading state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [milestones, setMilestones] = useState([
    { text: "Complete Python basics course", completed: true },
    { text: "Build a calculator app", completed: true },
    { text: "Learn about data structures", completed: false }
  ]);

  // Fetch user goals from backend
  const fetchGoals = async () => {
    try {
      const res = await api.get("/goals");
      setGoals(res.data);
    } catch (err) {
      console.error("Failed to fetch goals:", err);
    } finally {
      setLoading(false); // Stop loading
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

  const handleUpdateGoal = async (goal) => {
    try {
      // Increase progress by 10%, max 100
      const newProgress = Math.min(goal.progress + 10, 100);

      // Automatically mark as completed if progress reaches 100%
      const newIsCompleted = newProgress === 100;

      const res = await api.put(`/goals/${goal._id}`, {
        progress: newProgress,
        isCompleted: newIsCompleted,
      });

      setGoals(goals.map(g => (g._id === goal._id ? res.data : g)));
    } catch (err) {
      console.error("Failed to update goal:", err);
    }
  };

  if (loading) return <Loader />; // Show loader

  return (
    <div className="bg-light-gray-bg min-h-screen p-6 space-y-6">
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
            className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
          />
          <input
            type="text"
            placeholder="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
          />
          <input
            type="date"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
          />
          <button
            type="submit"
            className="w-full bg-mint-green hover:bg-mint-green-600 text-white px-4 py-2 rounded font-semibold transition-all"
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
            
            <div className="w-full h-2 bg-subtle-gray rounded-full overflow-hidden">
              <div 
                className="h-full bg-energetic-orange transition-all duration-500" 
                style={{ width: `${goal.progress}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center mt-2">
              <span className="text-sm font-semibold text-energetic-orange">{goal.progress}%</span>
              <button
                className={`px-3 py-1 rounded font-semibold transition-all ${
                  goal.progress === 100
                    ? "bg-subtle-gray cursor-not-allowed"
                    : "bg-mint-green hover:bg-mint-green-600 text-white"
                }`}
                onClick={() => handleUpdateGoal(goal)}
                disabled={goal.progress === 100}
              >
                {goal.progress === 100 ? "Completed" : `Done ${goal.progress}%`}
              </button>
            </div>

            {/* Recent Milestones */}
            <h3 className="text-sm font-semibold mt-4 mb-2">Recent Milestones</h3>
            <ul className="space-y-1">
              {milestones.map((milestone, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${milestone.completed ? 'bg-mint-green' : 'bg-subtle-gray'}`}></span>
                  <span className="text-sm text-gray-700">{milestone.text}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}