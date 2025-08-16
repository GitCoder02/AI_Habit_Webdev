// frontend/src/pages/Calendar.js
import { useState, useEffect } from "react";
import Card from "../components/Card";
import api from "../api";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";

// Define category colors
const categoryColors = {
  Work: "bg-blue-300",
  Learning: "bg-purple-300",
  Fitness: "bg-green-300",
  Health: "bg-red-300",
  Mindfulness: "bg-yellow-300",
  Other: "bg-gray-300",
};

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Work");

  const categoryOptions = ["Work", "Learning", "Fitness", "Health", "Mindfulness", "Other"];

  const fetchEvents = async () => {
    try {
      const res = await api.get("/events");
      setEvents(res.data);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const res = await api.post("/events", {
        title,
        description,
        start: selectedDate,
        end: selectedDate,
        category,
      });
      setEvents([...events, res.data]);
      setTitle("");
      setDescription("");
      setCategory("Work");
    } catch (err) {
      console.error("Failed to add event:", err);
    }
  };

  const startWeek = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startWeek, i));

  const navigateWeek = (dir) => {
    setCurrentDate(addDays(currentDate, dir * 7));
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen space-y-6">
      <Card title="Smart Calendar">
        {/* Week Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <span className="material-icons text-gray-500">calendar_today</span>
            <h3 className="text-gray-700">
              {format(startWeek, "MMM dd")} - {format(addDays(startWeek, 6), "MMM dd, yyyy")}
            </h3>
          </div>
          <div className="space-x-2">
            <button onClick={() => navigateWeek(-1)} className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300">Previous</button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 rounded bg-green-500 text-white hover:bg-green-600">Today</button>
            <button onClick={() => navigateWeek(1)} className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300">Next</button>
          </div>
        </div>

        {/* Week Days */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {weekDays.map((day) => (
            <div 
              key={day}
              onClick={() => setSelectedDate(day)}
              className={`p-2 rounded cursor-pointer text-center
                ${isSameDay(day, new Date()) ? "bg-green-500 text-white" : "bg-gray-50 hover:bg-gray-100"}`}
            >
              <div className="font-bold">{format(day, "dd")}</div>
              <div className="text-sm">{format(day, "EEE")}</div>
            </div>
          ))}
        </div>

        {/* Events Display */}
        <div className="space-y-2">
          {events
            .filter(ev => isSameDay(new Date(ev.start), selectedDate))
            .map(ev => (
              <div key={ev._id} className={`p-2 rounded text-gray-800 ${categoryColors[ev.category] || "bg-gray-200"}`}>
                <div className="font-bold">{ev.title}</div>
                <div className="text-sm">{new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}</div>
                <div className="text-sm">{ev.description}</div>
                <div className="text-xs mt-1 font-semibold">{ev.category}</div>
              </div>
            ))
          }
        </div>

        {/* Add Event Form */}
        <form onSubmit={handleAddEvent} className="mt-4 space-y-2">
          <input
            type="text"
            placeholder="Event Title"
            className="border p-2 w-full rounded focus:ring-2 focus:ring-green-400 outline-none"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <input
            type="text"
            placeholder="Description"
            className="border p-2 w-full rounded focus:ring-2 focus:ring-green-400 outline-none"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="border p-2 w-full rounded focus:ring-2 focus:ring-green-400 outline-none"
          >
            {categoryOptions.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded font-semibold transition-all"
          >
            Add Event
          </button>
        </form>
      </Card>
    </div>
  );
}