// frontend/src/pages/Calendar.js
import { useState, useEffect } from "react";
import Card from "../components/Card";
import api from "../api";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";

// Define category colors based on the UI image
const categoryColors = {
  Work: "bg-pastel-blue",
  Learning: "bg-pastel-purple",
  Fitness: "bg-pastel-teal",
  Health: "bg-pastel-pink",
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
    <div className="p-6 bg-light-gray-bg min-h-screen space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Smart Calendar</h1>
      <p className="text-gray-500 mb-4">AI-powered time insights and energy optimization</p>
      
      <Card>
        {/* Week Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <span className="material-icons text-gray-500">calendar_today</span>
            <h3 className="text-gray-700">
              {format(startWeek, "MMM dd")} - {format(addDays(startWeek, 6), "MMM dd, yyyy")}
            </h3>
          </div>
          <div className="space-x-2">
            <button onClick={() => navigateWeek(-1)} className="px-3 py-1 rounded bg-subtle-gray hover:bg-gray-300">Previous</button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 rounded bg-mint-green text-white hover:bg-mint-green-600">Today</button>
            <button onClick={() => navigateWeek(1)} className="px-3 py-1 rounded bg-subtle-gray hover:bg-gray-300">Next</button>
          </div>
        </div>

        {/* Week Days */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {weekDays.map((day) => (
            <div 
              key={day}
              onClick={() => setSelectedDate(day)}
              className={`p-2 rounded cursor-pointer text-center
                ${isSameDay(day, new Date()) ? "bg-mint-green text-white" : "bg-white hover:bg-gray-100"}`}
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
            className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <input
            type="text"
            placeholder="Description"
            className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
          >
            {categoryOptions.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            type="submit"
            className="w-full bg-mint-green hover:bg-mint-green-600 text-white px-4 py-2 rounded font-semibold transition-all"
          >
            Add Event
          </button>
        </form>
      </Card>
      
      {/* Energy Insights */}
      <Card title="Energy Insights">
        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-3 rounded-md bg-energetic-orange text-white">
            <span className="material-icons text-2xl">schedule</span>
            <div>
                <h3 className="font-bold">Peak Hours</h3>
                <p className="text-sm">9 AM - 11 AM</p>
                <p className="text-xs">Schedule deep work here</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 rounded-md bg-mint-green text-white">
            <span className="material-icons text-2xl">insights</span>
            <div>
              <h3 className="font-bold">Focus Time</h3>
              <p className="text-sm">4.5 hours</p>
              <p className="text-xs">Today's planned focus</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 rounded-md bg-pastel-purple text-white">
            <span className="material-icons text-2xl">bolt</span>
            <div>
              <h3 className="font-bold">Break Reminder</h3>
              <p className="text-sm">Every 90 minutes</p>
              <p className="text-xs">Maintain productivity</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}