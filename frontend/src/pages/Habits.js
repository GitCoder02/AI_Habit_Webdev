import { useState, useEffect } from "react";
import { isSameDay } from "date-fns";
import Card from "../components/Card";
import api, { habitsApi } from "../api";
import { FaCheckCircle, FaEdit, FaTrash } from "react-icons/fa";
import Loader from "../components/Loader";
import Modal from "../components/Modal";

export default function Habits() {
  const categoryOptions = [
    "Health",
    "Fitness",
    "Mindfulness",
    "Learning",
    "Work",
    "Productivity",
    "Other",
    "Custom",
  ];

  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newHabit, setNewHabit] = useState("");
  const [newCategory, setNewCategory] = useState(categoryOptions[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // --- State for edit/delete ---
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editCustomCategory, setEditCustomCategory] = useState("");

  useEffect(() => {
    const fetchHabits = async () => {
      try {
        const res = await habitsApi.list();
        setHabits(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHabits();
  }, []);

  const handleAddHabit = async (e) => {
    e.preventDefault();
    if (!newHabit.trim()) return;

    // if custom selected, use customCategory value
    const category =
      newCategory === "Custom" && customCategory.trim()
        ? customCategory
        : newCategory;

    try {
      const res = await habitsApi.create({
        name: newHabit,
        description: newDescription,
        category,
      });
      setHabits([...habits, res.data]);
      setNewHabit("");
      setNewDescription("");
      setNewCategory(categoryOptions[0]);
      setCustomCategory("");
    } catch (err) {
      console.error(err);
      alert("Failed to add habit");
    }
  };

  const completeHabit = async (habit) => {
    try {
      const res = await api.put(`/habits/${habit._id}/complete`);
      setHabits(habits.map((h) => (h._id === habit._id ? res.data : h)));
    } catch (err) {
      console.error(err);
      alert("Failed to update habit");
    }
  };

  const handleEditHabit = async (e) => {
    e.preventDefault();
    if (!selectedHabit) return;

    const category =
      selectedHabit.category === "Custom" && editCustomCategory.trim()
        ? editCustomCategory
        : selectedHabit.category;

    try {
      const res = await habitsApi.update(selectedHabit._id, {
        ...selectedHabit,
        category,
      });
      setHabits(
        habits.map((h) => (h._id === selectedHabit._id ? res.data : h))
      );
      setIsEditing(false);
      setSelectedHabit(null);
      setEditCustomCategory("");
    } catch (err) {
      console.error(err);
      alert("Failed to update habit");
    }
  };

  const handleDeleteHabit = async () => {
    if (!selectedHabit) return;
    try {
      await habitsApi.remove(selectedHabit._id);
      setHabits(habits.filter((h) => h._id !== selectedHabit._id));
      setIsDeleting(false);
      setSelectedHabit(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete habit");
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="bg-light-gray-bg min-h-screen p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Your Habits</h1>
      <p className="text-gray-500 mb-4">
        Build consistency, one day at a time 🪴
      </p>

      {/* Add New Habit Form */}
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
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {newCategory === "Custom" && (
            <input
              type="text"
              placeholder="Enter custom category"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
            />
          )}
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
        {habits.map((habit) => {
          const isCompletedToday =
            habit.lastCompleted &&
            isSameDay(new Date(habit.lastCompleted), new Date());

          return (
            <Card
              key={habit._id}
              title={habit.name}
              className="hover:shadow-lg transition-shadow relative"
            >
              <p className="text-gray-700 mb-2">{habit.description}</p>
              <span className="inline-block bg-mint-green-100 text-mint-green text-xs px-2 py-1 rounded-full">
                {habit.category}
              </span>

              <div className="flex items-center space-x-2 mt-2">
                <span className="text-energetic-orange">🔥</span>
                <span className="font-bold text-mint-green">{habit.streak}</span>
                <span className="text-gray-500">Current</span>
                <span className="font-bold text-energetic-orange">
                  {habit.bestStreak}
                </span>
                <span className="text-gray-500">Best</span>
              </div>

              <button
                onClick={() => completeHabit(habit)}
                className={`px-4 py-2 rounded text-white w-full font-semibold transition-all mt-4 flex items-center justify-center space-x-2
                  ${
                    isCompletedToday
                      ? "bg-green-500 cursor-not-allowed"
                      : "bg-mint-green hover:bg-mint-green-600"
                  }`}
                disabled={isCompletedToday}
              >
                <FaCheckCircle />
                <span>
                  {isCompletedToday ? "Done for Today!" : "Complete"}
                </span>
              </button>

              {/* Edit & Delete Buttons */}
              <div className="flex justify-end space-x-2 mt-3">
                <button
                  onClick={() => {
                    setSelectedHabit(habit);
                    setIsEditing(true);
                    setEditCustomCategory("");
                  }}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => {
                    setSelectedHabit(habit);
                    setIsDeleting(true);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isEditing} onClose={() => setIsEditing(false)}>
        {selectedHabit && (
          <form onSubmit={handleEditHabit} className="space-y-3">
            <h2 className="text-xl font-bold">Edit Habit</h2>
            <input
              type="text"
              value={selectedHabit.name}
              onChange={(e) =>
                setSelectedHabit({ ...selectedHabit, name: e.target.value })
              }
              className="border border-subtle-gray p-2 w-full rounded"
            />
            <input
              type="text"
              value={selectedHabit.description}
              onChange={(e) =>
                setSelectedHabit({
                  ...selectedHabit,
                  description: e.target.value,
                })
              }
              className="border border-subtle-gray p-2 w-full rounded"
            />
            <select
              value={
                categoryOptions.includes(selectedHabit.category)
                  ? selectedHabit.category
                  : "Custom"
              }
              onChange={(e) => {
                const val = e.target.value;
                setSelectedHabit({
                  ...selectedHabit,
                  category: val,
                });
              }}
              className="border border-subtle-gray p-2 w-full rounded"
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {/* Custom category field in edit */}
            {(!categoryOptions.includes(selectedHabit.category) ||
              selectedHabit.category === "Custom") && (
              <input
                type="text"
                placeholder="Enter custom category"
                value={editCustomCategory}
                onChange={(e) => setEditCustomCategory(e.target.value)}
                className="border border-subtle-gray p-2 w-full rounded"
              />
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-mint-green text-white rounded hover:bg-mint-green-600"
              >
                Save
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleting} onClose={() => setIsDeleting(false)}>
        {selectedHabit && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800">
              Delete Habit "{selectedHabit.name}"?
            </h2>
            <p className="text-gray-600">
              This action cannot be undone. Are you sure?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsDeleting(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteHabit}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
