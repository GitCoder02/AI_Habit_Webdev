import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./Calendar.css";

import Card from "../components/Card";
import api, { googleApi } from "../api";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import { format as dfnsFormat } from "date-fns";

const DragAndDropCalendar = withDragAndDrop(BigCalendar);

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

// Calm pastel palette (hex) — readable and modern.
const categoryColors = {
  Work: "#C7D2FE", // pastel indigo
  Learning: "#E9D5FF", // pastel purple
  Fitness: "#CFFAFE", // pastel teal
  Health: "#FBCFE8", // pastel pink
  Mindfulness: "#FEF3C7", // soft yellow
  Productivity: "#E6F4EA", // soft green
  Other: "#E5E7EB", // gray
  Google: "#FFD8A8", // energetic orange for Google events
  Custom: "#F3E8FF", // fallback pastel
};

// Helper: detect if a hex color is "light" so we can pick text color
function isLightHex(hex) {
  if (!hex) return false;
  const c = hex.replace("#", "");
  if (c.length !== 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // relative luminance
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 180; // threshold tuned for pastel palette
}

const AgendaEvent = ({ event }) => {
  return (
    <div className="custom-agenda-event">
      <div className="event-time">
        {format(event.start, "p")} - {format(event.end, "p")}
      </div>
      <div className="event-title">{event.title}</div>
    </div>
  );
};

export default function CalendarPage() {
  const { user, refetchUser } = useAuth();
  const userId = user?._id;

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState("month");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [slotSelection, setSlotSelection] = useState(null);

  // New event form
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    category: "Work",
    customCategory: "",
  });

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editEventData, setEditEventData] = useState(null);

  // Category options: 7 most-used + Custom
  const categoryOptions = [
    "Work",
    "Learning",
    "Fitness",
    "Health",
    "Mindfulness",
    "Productivity",
    "Other",
    "Custom",
  ];

  const [googleConnected, setGoogleConnected] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchAllEvents = async () => {
      setLoading(true);
      try {
        // 1) Fetch app-local events
        const localEventsRes = await api.get("/events");
        const localEvents = Array.isArray(localEventsRes.data) ? localEventsRes.data : [];

        // 2) Fetch Google events only if user connected
        let googleEvents = [];
        if (user?.isCalendarConnected) {
          try {
            const googleRes = await googleApi.fetchEvents(); // protected endpoint
            if (Array.isArray(googleRes.data) && googleRes.data.length > 0) {
              googleEvents = googleRes.data.map((ev) => {
                const start = new Date(ev.start?.dateTime || ev.start?.date || ev.start);
                const end = new Date(ev.end?.dateTime || ev.end?.date || ev.end);
                return {
                  _id: ev.id,
                  title: ev.summary || "Untitled",
                  description: ev.description || "",
                  start,
                  end,
                  category: "Google",
                  googleEventId: ev.id,
                  isDraggable: false,
                };
              });
            }
          } catch (gErr) {
            console.warn("Could not fetch Google events:", gErr);
            // keep going with local events
          }
        }

        // normalize local events (some may already be Date objects)
        const normalizedLocal = localEvents.map((ev) => ({
          ...ev,
          start: new Date(ev.start),
          end: new Date(ev.end),
        }));

        const merged = [...normalizedLocal, ...googleEvents];
        if (!mounted) return;
        setEvents(merged);
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAllEvents();
    return () => {
      mounted = false;
    };
  }, [userId, user?.isCalendarConnected]);

  useEffect(() => {
    // Check Google connection status on mount
    const checkGoogleStatus = async () => {
      try {
        const res = await googleApi.status(); // should call /api/google/status
        setGoogleConnected(res.data.connected);
      } catch {
        setGoogleConnected(false);
      }
    };
    checkGoogleStatus();
  }, [userId]);

  // Add this function for disconnecting Google Calendar
  const handleDisconnectGoogle = async () => {
    try {
      await googleApi.disconnect(); // your backend should revoke token
      setGoogleConnected(false);
      if (typeof refetchUser === "function") await refetchUser();
    } catch (err) {
      console.error("Failed to disconnect Google", err);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await googleApi.authUrl();
      const authWindow = window.open(res.data.url, "_blank", "width=700,height=700");

      // poll for window close and then refetch user and google status
      const timer = setInterval(async () => {
        if (!authWindow || authWindow.closed) {
          clearInterval(timer);
          if (typeof refetchUser === "function") await refetchUser();

          // Refresh googleConnected state
          try {
            const statusRes = await googleApi.status();
            setGoogleConnected(statusRes.data.connected);
          } catch {
            setGoogleConnected(false);
          }
        }
      }, 1000);
    } catch (err) {
      console.error("Failed to get Google Auth URL", err);
      alert("Could not connect to Google Calendar. Please try again.");
    }
  };

  // Calendar handlers
  const handleNavigate = useCallback((newDate) => setDate(newDate), []);
  const handleViewChange = useCallback((newView) => setView(newView), []);
  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent(event);
    setEditEventData({ ...event });
  }, []);
  const handleSelectSlot = useCallback((slotInfo) => setSlotSelection(slotInfo), []);

  const handleEventDrop = useCallback(
    async ({ event, start, end }) => {
      // prevent moving Google events
      if (event.category === "Google") return;

      const original = [...events];
      const updated = events.map((e) => (e._id === event._id ? { ...e, start, end } : e));
      setEvents(updated);
      try {
        await api.put(`/events/${event._id}`, { start, end });
      } catch (err) {
        console.error("Failed to update event time:", err);
        setEvents(original);
        alert("Could not save event changes. Check console for details.");
      }
    },
    [events]
  );

  const handleNewEventChange = (e) => {
    const { name, value } = e.target;
    setNewEvent((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title.trim() || !slotSelection) return;

    const category =
      newEvent.category === "Custom" && newEvent.customCategory?.trim()
        ? newEvent.customCategory.trim()
        : newEvent.category;

    const eventToCreate = {
      title: newEvent.title,
      description: newEvent.description,
      category,
      start: slotSelection.start,
      end: slotSelection.end,
    };

    try {
      const res = await api.post("/events", eventToCreate);
      const created = { ...res.data, start: new Date(res.data.start), end: new Date(res.data.end) };
      setEvents((prev) => [...prev, created]);
      setSlotSelection(null);
      setNewEvent({ title: "", description: "", category: "Work", customCategory: "" });
    } catch (err) {
      console.error("Failed to add event:", err);
      alert("Failed to add event.");
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    if (selectedEvent.category === "Google") {
      alert("Cannot delete Google Calendar events from here.");
      return;
    }

    try {
      await api.delete(`/events/${selectedEvent._id}`);
      setEvents((prev) => prev.filter((ev) => ev._id !== selectedEvent._id));
      setSelectedEvent(null);
    } catch (err) {
      console.error("Failed to delete event:", err);
      alert("Failed to delete event.");
    }
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditEventData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    if (!editEventData || !editEventData.title.trim()) return;

    // Prevent editing Google events
    if (editEventData.category === "Google") {
      alert("Google events can't be edited here.");
      return;
    }

    try {
      const payload = {
        title: editEventData.title,
        description: editEventData.description,
        category:
          editEventData.category === "Custom" && editEventData.customCategory
            ? editEventData.customCategory
            : editEventData.category,
        start: editEventData.start,
        end: editEventData.end,
      };
      const res = await api.put(`/events/${editEventData._id}`, payload);
      const updated = { ...res.data, start: new Date(res.data.start), end: new Date(res.data.end) };
      setEvents((prev) => prev.map((ev) => (ev._id === updated._id ? updated : ev)));
      setSelectedEvent(null);
      setIsEditing(false);
      setEditEventData(null);
    } catch (err) {
      console.error("Failed to update event:", err);
      alert("Failed to update event.");
    }
  };

  const closeModal = () => {
    setSelectedEvent(null);
    setIsEditing(false);
    setSlotSelection(null);
    setEditEventData(null);
  };

  // event style applied in calendar
  const eventPropGetter = (event) => {
    const hex = categoryColors[event.category] || categoryColors.Custom;
    const textColor = isLightHex(hex) ? "#111827" : "#FFFFFF"; // dark or white
    const style = {
      backgroundColor: hex,
      color: textColor,
      borderRadius: 6,
      border: "0px",
      display: "block",
      padding: "2px 6px",
      cursor: event.category === "Google" ? "not-allowed" : "pointer",
      boxShadow: "none",
      fontSize: "0.95rem",
    };
    return { style };
  };

  // Legend chips below calendar
  const Legend = () => {
    const keys = Object.keys(categoryColors).filter((k) => k !== "Custom"); // hide custom from chips; keep Google
    return (
      <div className="calendar-legend mt-4 flex flex-wrap gap-2 items-center">
        {keys.map((k) => {
          const hex = categoryColors[k] || categoryColors.Custom;
          const textColor = isLightHex(hex) ? "#111827" : "#fff";
          return (
            <div
              key={k}
              className="legend-chip inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: hex,
                color: textColor,
                border: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              <span className="legend-label">{k}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) return <Loader />;

  return (
    <div className="p-6 bg-light-gray-bg min-h-screen space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Smart Calendar</h1>
          <p className="text-gray-500">A modern view of your schedule.</p>
        </div>

        {googleConnected ? (
          <button
            onClick={handleDisconnectGoogle}
            className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition-colors"
            aria-label="Disconnect Google Calendar"
          >
            Disconnect Google Calendar
          </button>
        ) : (
          <button
            onClick={handleConnectGoogle}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
            aria-label="Connect Google Calendar"
          >
            Connect Google Calendar
          </button>
        )}
      </div>

      <Card>
        <DragAndDropCalendar
          localizer={localizer}
          events={events}
          style={{ height: "70vh" }}
          date={date}
          view={view}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          onSelectEvent={handleSelectEvent}
          selectable={true}
          onSelectSlot={handleSelectSlot}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventDrop}
          resizable
          eventPropGetter={eventPropGetter}
          components={{
            agenda: { event: AgendaEvent },
          }}
        />

        {/* Horizontal legend placed directly under calendar */}
        <div className="mt-3">
          <Legend />
        </div>
      </Card>

      {/* View / Edit Modal */}
      <Modal isOpen={!!selectedEvent} onClose={closeModal}>
        {selectedEvent && (
          isEditing ? (
            <form onSubmit={handleUpdateEvent} className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">Edit Event</h2>

              <div>
                <label className="text-sm font-semibold text-gray-600">Title</label>
                <input
                  type="text"
                  name="title"
                  value={editEventData.title}
                  onChange={handleEditFormChange}
                  className="mt-1 border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600">Description</label>
                <textarea
                  name="description"
                  value={editEventData.description}
                  onChange={handleEditFormChange}
                  className="mt-1 border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
                  rows="3"
                ></textarea>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600">Category</label>
                <select
                  name="category"
                  value={
                    categoryOptions.includes(editEventData.category)
                      ? editEventData.category
                      : "Custom"
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditEventData((prev) => ({ ...prev, category: val }));
                  }}
                  className="mt-1 border border-subtle-gray p-2 w-full rounded"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {/* custom field when needed */}
                {(editEventData.category === "Custom" || !categoryOptions.includes(editEventData.category)) && (
                  <input
                    type="text"
                    placeholder="Enter custom category"
                    value={editEventData.customCategory || (categoryOptions.includes(editEventData.category) ? "" : editEventData.category)}
                    onChange={(e) => setEditEventData((prev) => ({ ...prev, customCategory: e.target.value }))}
                    className="mt-2 border border-subtle-gray p-2 w-full rounded"
                  />
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold"
                  onClick={() => { setIsEditing(false); setEditEventData(selectedEvent); }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-mint-green hover:bg-mint-green-600 text-white font-semibold"
                  disabled={selectedEvent.category === "Google"}
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">{selectedEvent.title}</h2>
              <p className="text-gray-600">{selectedEvent.description || "No description provided."}</p>
              <p className="text-sm text-gray-500">
                <strong>Starts:</strong> {dfnsFormat(selectedEvent.start, "Pp")}
              </p>
              <p className="text-sm text-gray-500">
                <strong>Ends:</strong> {dfnsFormat(selectedEvent.end, "Pp")}
              </p>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold"
                  onClick={() => { setIsEditing(true); setEditEventData({ ...selectedEvent }); }}
                  disabled={selectedEvent.category === "Google"}
                >
                  Edit
                </button>
                <button
                  className="px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white font-semibold"
                  onClick={handleDeleteEvent}
                  disabled={selectedEvent.category === "Google"}
                >
                  Delete
                </button>
              </div>
            </div>
          )
        )}
      </Modal>

      {/* Create Event Modal */}
      <Modal isOpen={!!slotSelection} onClose={() => setSlotSelection(null)}>
        {slotSelection && (
          <form onSubmit={handleAddEvent} className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">Add New Event</h2>
            <p className="text-sm text-gray-500">For: {dfnsFormat(slotSelection.start, "PPPP, p")}</p>

            <input
              type="text"
              name="title"
              placeholder="Event Title"
              value={newEvent.title}
              onChange={handleNewEventChange}
              className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
            />

            <input
              type="text"
              name="description"
              placeholder="Description"
              value={newEvent.description}
              onChange={handleNewEventChange}
              className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
            />

            <select
              name="category"
              value={newEvent.category}
              onChange={(e) => setNewEvent((prev) => ({ ...prev, category: e.target.value }))}
              className="border border-subtle-gray p-2 w-full rounded"
            >
              {categoryOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {newEvent.category === "Custom" && (
              <input
                type="text"
                name="customCategory"
                placeholder="Enter custom category"
                value={newEvent.customCategory}
                onChange={handleNewEventChange}
                className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
              />
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold"
                onClick={() => setSlotSelection(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-mint-green hover:bg-mint-green-600 text-white font-semibold"
              >
                Add Event
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}