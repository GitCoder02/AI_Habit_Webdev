// frontend/src/pages/Habits.js
import { useState, useEffect } from "react";
import Card from "../components/Card";
import api from "../api";
import { FaCheckCircle } from 'react-icons/fa';

export default function Habits() {
  const categoryOptions = ["Health", "Fitness", "Mindfulness", "Learning", "Work", "Other"];

  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newHabit, setNewHabit] = useState("");
  const [newCategory, setNewCategory] = useState(categoryOptions[0]);
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    const fetchHabits = async () => {
      try {
        const res = await api.get("/habits");
        setHabits(res.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchHabits();
  }, []);

  const handleAddHabit = async (e) => {
    e.preventDefault();
    if (!newHabit.trim()) return;

    try {
      const res = await api.post("/habits", {
        name: newHabit,
        description: newDescription,
        category: newCategory,
      });
      setHabits([...habits, res.data]);
      setNewHabit("");
      setNewDescription("");
      setNewCategory(categoryOptions[0]);
    } catch (err) {
      console.error(err);
      alert("Failed to add habit");
    }
  };

  const toggleHabit = async (habit) => {
    try {
      const res = await api.put(`/habits/${habit._id}`, {
        completedToday: !habit.completedToday
      });
      setHabits(habits.map((h) => (h._id === habit._id ? res.data : h)));
    } catch (err) {
      console.error(err);
      alert("Failed to update habit");
    }
  };


  if (loading) return <p className="p-6">Loading habits...</p>;

  return (
    <div className="bg-light-gray-bg min-h-screen p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Your Habits</h1>
      <p className="text-gray-500 mb-4">Build consistency, one day at a time 🪴</p>

      {/* Add New Habit */}
      <Card title="Add New Habit">
        <form onSubmit={handleAddHabit} className="space-y-3">
          <input
            type="text"
            placeholder="Habit name"
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
          />
          <input
            type="text"
            placeholder="Description"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
          >
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            type="submit"
            className="w-full bg-mint-green hover:bg-mint-green-600 text-white px-4 py-2 rounded font-semibold transition-all"
          >
            Add Habit
          </button>
        </form>
      </Card>

      {/* Habit List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {habits.map((habit) => (
          <Card
            key={habit._id}
            title={habit.name}
            className="hover:shadow-lg transition-shadow relative"
          >
            <p className="text-gray-700 mb-2">{habit.description}</p>
            <span className="inline-block bg-mint-green-100 text-mint-green text-xs px-2 py-1 rounded-full">{habit.category}</span>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-energetic-orange">🔥</span>
              <span className="font-bold text-mint-green">{habit.streak}</span>
              <span className="text-gray-500">Current</span>
              <span className="font-bold text-energetic-orange">{habit.bestStreak}</span>
              <span className="text-gray-500">Best</span>
            </div>
            <button
              onClick={() => toggleHabit(habit)}
              className={`px-4 py-2 rounded text-white w-full font-semibold transition-all mt-4 flex items-center justify-center space-x-2
                ${habit.completedToday 
                  ? "bg-subtle-gray cursor-not-allowed" 
                  : "bg-mint-green hover:bg-mint-green-600"}`
              }
              disabled={habit.completedToday}
            >
              <FaCheckCircle />
              <span>Complete</span>
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}