import { useState, useEffect } from "react";
import Card from "../components/Card";
import api from "../api";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";

const categoryColors = {
  Work: "bg-pastel-blue",
  Learning: "bg-pastel-purple",
  Fitness: "bg-pastel-teal",
  Health: "bg-pastel-pink",
  Mindfulness: "bg-yellow-300",
  Other: "bg-gray-300",
  Google: "bg-orange-300",
};

export default function Calendar({ userId }) {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Work");
  const [googleConnected, setGoogleConnected] = useState(false);

  const categoryOptions = ["Work", "Learning", "Fitness", "Health", "Mindfulness", "Other"];

  // Fetch local events
  const fetchEvents = async () => {
    try {
      const res = await api.get("/events");
      setEvents(res.data);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    }
  };

  // Fetch Google events
  const fetchGoogleEvents = async () => {
    try {
      const res = await api.get(`/google/events?userId=${userId}`);
      if (res.data?.length > 0) {
        const googleEvents = res.data.map(ev => ({
          _id: ev.id,
          title: ev.summary || "Untitled",
          description: ev.description || "",
          start: ev.start.dateTime || ev.start.date,
          end: ev.end.dateTime || ev.end.date,
          category: "Google",
        }));

        setEvents(prev => [
          ...prev.filter(e => e.category !== "Google"),
          ...googleEvents
        ]);
      }
      setGoogleConnected(true);
    } catch (err) {
      console.error("Failed to fetch Google events:", err);
      setGoogleConnected(false);
    }
  };

  useEffect(() => {
    if (!userId) return; // Don't fetch if userId is missing
    fetchEvents();
    fetchGoogleEvents();
  }, [userId]);

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

  const handleConnectGoogle = async () => {
    if (!userId) {
      alert("User ID not found. Please log in again.");
      return;
    }

    try {
      const res = await api.get(`/google/auth-url?userId=${userId}`);
      const authWindow = window.open(res.data.url, "_blank", "width=500,height=600");

      const timer = setInterval(async () => {
        if (!authWindow || authWindow.closed) {
          clearInterval(timer);
          return;
        }

        try {
          const check = await api.get(`/google/events?userId=${userId}`);
          if (check.status === 200) {
            fetchGoogleEvents();
            clearInterval(timer);
            authWindow.close();
          }
        } catch {}
      }, 2000);
    } catch (err) {
      console.error("Failed to get Google auth URL:", err);
    }
  };

  const startWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startWeek, i));
  const navigateWeek = (dir) => setCurrentDate(addDays(currentDate, dir * 7));

  return (
    <div className="p-6 bg-light-gray-bg min-h-screen space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Smart Calendar</h1>
      <p className="text-gray-500 mb-4">AI-powered time insights and energy optimization</p>

      {!googleConnected && (
        <button
          onClick={handleConnectGoogle}
          className="mb-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Connect Google Calendar
        </button>
      )}

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
          {weekDays.map(day => (
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
                <div className="text-sm">{new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="text-sm">{ev.description}</div>
                <div className="text-xs mt-1 font-semibold">{ev.category}</div>
              </div>
            ))}
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
    </div>
  );
}