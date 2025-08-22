// frontend/src/pages/Goals.js
import { useState, useEffect } from "react";
import Card from "../components/Card";
import api from "../api";
import Loader from "../components/Loader";
import Modal from "../components/Modal";

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Goal form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [category, setCategory] = useState("Personal Growth");
  const [customCategory, setCustomCategory] = useState("");
  const [status, setStatus] = useState("Planning");

  // Edit Modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editGoal, setEditGoal] = useState(null);

  // Delete Modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);

  // Category options
  const categoryOptions = [
    "Personal Growth",
    "Career",
    "Health",
    "Learning",
    "Finance",
    "Fitness",
    "Mindfulness",
    "Custom"
  ];

  // Status options
  const statusOptions = ["Planning", "Active", "Completed", "Paused"];

  // Fetch user goals
  const fetchGoals = async () => {
    try {
      const res = await api.get("/goals");
      setGoals(res.data);
    } catch (err) {
      console.error("Failed to fetch goals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  // Add Goal
  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalCategory = category === "Custom" ? customCategory || "Other" : category;

    try {
      const res = await api.post("/goals", { 
        title, 
        description, 
        targetDate, 
        category: finalCategory, 
        status 
      });
      setGoals([...goals, res.data]);
      // reset form
      setTitle(""); setDescription(""); setTargetDate("");
      setCategory("Personal Growth"); setCustomCategory("");
      setStatus("Planning");
    } catch (err) {
      console.error("Failed to add goal:", err);
    }
  };

  // Update progress button
  const handleUpdateProgress = async (goal) => {
    try {
      const newProgress = Math.min(goal.progress + 10, 100);
      const newIsCompleted = newProgress === 100;

      const res = await api.put(`/goals/${goal._id}`, {
        progress: newProgress,
        isCompleted: newIsCompleted,
      });

      setGoals(goals.map(g => (g._id === goal._id ? res.data : g)));
    } catch (err) {
      console.error("Failed to update progress:", err);
    }
  };

  // Open edit modal
  const openEditModal = (goal) => {
    setEditGoal({ ...goal });
    setIsEditOpen(true);
  };

  // Handle editing a goal
  const handleEditGoal = async (e) => {
    e.preventDefault();
    try {
      const finalCategory = editGoal.category === "Custom" && editGoal.customCategory
        ? editGoal.customCategory
        : editGoal.category;

      const res = await api.put(`/goals/${editGoal._id}`, { 
        ...editGoal, 
        category: finalCategory 
      });

      setGoals(goals.map(g => (g._id === editGoal._id ? res.data : g)));
      setIsEditOpen(false);
      setEditGoal(null);
    } catch (err) {
      console.error("Failed to edit goal:", err);
    }
  };

  // Delete goal (open modal)
  const confirmDeleteGoal = (goal) => {
    setGoalToDelete(goal);
    setIsDeleteOpen(true);
  };

  // Handle delete after confirmation
  const handleDeleteGoal = async () => {
    if (!goalToDelete) return;
    try {
      await api.delete(`/goals/${goalToDelete._id}`);
      setGoals(goals.filter((g) => g._id !== goalToDelete._id));
      setIsDeleteOpen(false);
      setGoalToDelete(null);
    } catch (err) {
      console.error("Failed to delete goal:", err);
    }
  };

  if (loading) return <Loader />;

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
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-subtle-gray p-2 w-full rounded"
          >
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {category === "Custom" && (
            <input
              type="text"
              placeholder="Enter custom category"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
            />
          )}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-subtle-gray p-2 w-full rounded"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
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
          <Card key={goal._id} title={goal.title} className="hover:shadow-lg transition-shadow relative">
            <p className="text-gray-700 mb-2">{goal.description}</p>
            <p className="text-sm text-gray-500">Target Date: {goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : "N/A"}</p>
            <p className="text-sm text-gray-500">Category: {goal.category}</p>
            <p className="text-sm text-gray-500 mb-2">Status: {goal.status}</p>

            {/* Progress bar */}
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
                onClick={() => handleUpdateProgress(goal)}
                disabled={goal.progress === 100}
              >
                {goal.progress === 100 ? "Completed" : `Done ${goal.progress}%`}
              </button>
            </div>

            {/* Edit + Delete buttons */}
            <div className="flex justify-end space-x-2 mt-4">
              <button
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded"
                onClick={() => openEditModal(goal)}
              >
                Edit
              </button>
              <button
                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded"
                onClick={() => confirmDeleteGoal(goal)}
              >
                Delete
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)}>
        {editGoal && (
          <form onSubmit={handleEditGoal} className="space-y-3">
            <h2 className="text-xl font-bold">Edit Goal</h2>
            <input
              type="text"
              value={editGoal.title}
              onChange={(e) => setEditGoal({ ...editGoal, title: e.target.value })}
              className="border border-subtle-gray p-2 w-full rounded"
            />
            <input
              type="text"
              value={editGoal.description}
              onChange={(e) => setEditGoal({ ...editGoal, description: e.target.value })}
              className="border border-subtle-gray p-2 w-full rounded"
            />
            <input
              type="date"
              value={editGoal.targetDate ? new Date(editGoal.targetDate).toISOString().substring(0, 10) : ""}
              onChange={(e) => setEditGoal({ ...editGoal, targetDate: e.target.value })}
              className="border border-subtle-gray p-2 w-full rounded"
            />
            <select
              value={editGoal.category}
              onChange={(e) => setEditGoal({ ...editGoal, category: e.target.value })}
              className="border border-subtle-gray p-2 w-full rounded"
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {editGoal.category === "Custom" && (
              <input
                type="text"
                placeholder="Enter custom category"
                value={editGoal.customCategory || ""}
                onChange={(e) => setEditGoal({ ...editGoal, customCategory: e.target.value })}
                className="border border-subtle-gray p-2 w-full rounded"
              />
            )}
            <select
              value={editGoal.status}
              onChange={(e) => setEditGoal({ ...editGoal, status: e.target.value })}
              className="border border-subtle-gray p-2 w-full rounded"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="flex justify-end space-x-2">
              <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-mint-green text-white rounded">Save</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)}>
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-red-600">Delete Goal</h2>
          <p>Are you sure you want to delete <strong>{goalToDelete?.title}</strong>? This action cannot be undone.</p>
          <div className="flex justify-end space-x-2">
            <button onClick={() => setIsDeleteOpen(false)} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
            <button onClick={handleDeleteGoal} className="px-4 py-2 bg-red-500 text-white rounded">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
