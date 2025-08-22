// frontend/src/pages/Calendar.js
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
import api from "../api";
import Loader from "../components/Loader";
import Modal from "../components/Modal";

const DragAndDropCalendar = withDragAndDrop(BigCalendar);

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
  // Keep parity with previous code — it's fine to include timezone here
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

/* ===== Category palette (soft pastels) ===== */
const CATEGORY_COLORS = {
  Work: "#9FC9FF",       // pastel blue
  Learning: "#D9C7FF",   // lavender
  Fitness: "#BCEFC2",    // soft green
  Health: "#FFCECF",     // soft pink
  Mindfulness: "#FFECB3",// soft yellow
  Personal: "#FFD7A6",   // warm pastel
  Social: "#FFC0E6",     // soft rose
  Other: "#E6E9EE",      // neutral light
  Custom: "#E9ECEF",     // fallback neutral
  Google: "#FF922B",     // standout orange
};

/* text color: dark on pastels, white for Google if you prefer (we'll use dark for pastels and white for Google) */
const CATEGORY_TEXT = {
  Google: "#ffffff",
  default: "#0f172a",
};

const CATEGORY_OPTIONS = [
  "Work",
  "Learning",
  "Fitness",
  "Health",
  "Mindfulness",
  "Personal",
  "Social",
  "Other",
  "Custom",
];

/* ===== Custom Agenda Event Renderer (only affects Agenda view event rows) ===== */
const CustomAgendaEvent = ({ event }) => {
  const bg = event.googleEventId ? CATEGORY_COLORS.Google : (CATEGORY_COLORS[event.category] || CATEGORY_COLORS.Custom);
  const textColor = event.googleEventId ? CATEGORY_TEXT.Google : CATEGORY_TEXT.default;

  // Compact, slightly taller title and a short description line
  return (
    <div
      style={{
        backgroundColor: bg,
        color: textColor,
        padding: "10px 12px",
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        boxShadow: "0 6px 18px rgba(12,20,30,0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {event.title}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.95 }}>
          {format(event.start, "p")} — {format(event.end, "p")}
        </div>
      </div>
      {event.description && (
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.95, fontWeight: 400 }}>
          {event.description}
        </div>
      )}
    </div>
  );
};

/* ===== Main Calendar Page Component ===== */
export default function CalendarPage() {
  const { user, refetchUser } = useAuth();
  const userId = user?._id;

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState("month");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [slotSelection, setSlotSelection] = useState(null);

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    category: "Work",
    customCategory: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editEventData, setEditEventData] = useState(null);

  /* ===== Fetch events (local + Google if connected) ===== */
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchAllEvents = async () => {
      setLoading(true);
      try {
        const localEventsRes = await api.get("/events");
        const localEvents = localEventsRes.data || [];

        let googleEvents = [];
        if (user?.isCalendarConnected) {
          const googleEventsRes = await api.get(`/google/events?userId=${userId}`);
          if (googleEventsRes.data?.length > 0) {
            googleEvents = googleEventsRes.data.map(ev => ({
              _id: ev.id,
              title: ev.summary || "Untitled",
              description: ev.description || "",
              start: new Date(ev.start.dateTime || ev.start.date),
              end: new Date(ev.end.dateTime || ev.end.date),
              category: "Google",
              googleEventId: ev.id,
              isDraggable: false,
            }));
          }
        }

        const normalizedLocal = localEvents.map(ev => ({
          ...ev,
          start: new Date(ev.start),
          end: new Date(ev.end),
        }));

        setEvents([...normalizedLocal, ...googleEvents]);
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllEvents();
  }, [userId, user?.isCalendarConnected]);

  /* ===== Google connect handler (unchanged) ===== */
  const handleConnectGoogle = async () => {
    if (!userId) return;
    try {
      const res = await api.get(`/google/auth-url?userId=${userId}`);
      const authWindow = window.open(res.data.url, "_blank", "width=600,height=700");

      const timer = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(timer);
          refetchUser();
        }
      }, 1000);
    } catch (err) {
      console.error("Failed to get Google Auth URL", err);
      alert("Could not connect to Google Calendar. Please try again.");
    }
  };

  /* ===== Navigation / View handlers ===== */
  const handleNavigate = useCallback((newDate) => setDate(newDate), [setDate]);
  const handleViewChange = useCallback((newView) => setView(newView), [setView]);

  /* ===== Selection handlers ===== */
  const handleSelectEvent = useCallback((event) => {
    // Prepare event for editing: if category is a user-typed string (not in options and not Google),
    // show it as Custom with customCategory filled.
    let prepared = { ...event };
    if (prepared.category && !CATEGORY_OPTIONS.includes(prepared.category) && prepared.category !== "Google") {
      prepared = { ...prepared, customCategory: prepared.category, category: "Custom" };
    } else {
      prepared = { ...prepared, customCategory: prepared.customCategory || "" };
    }

    setSelectedEvent(prepared);
    setEditEventData({ ...prepared });
  }, []);

  const handleSelectSlot = useCallback((slotInfo) => {
    setNewEvent({ title: "", description: "", category: "Work", customCategory: "" });
    setSlotSelection(slotInfo);
  }, []);

  /* ===== Drag & drop (update times) ===== */
  const handleEventDrop = useCallback(async ({ event, start, end }) => {
    // Disallow moving Google events from the app
    if (event.googleEventId || event.category === "Google") return;

    const originalEvents = [...events];
    const updatedEvents = events.map(e => e._id === event._id ? { ...e, start, end } : e);
    setEvents(updatedEvents);

    try {
      await api.put(`/events/${event._id}`, { start, end });
    } catch (err) {
      console.error("Failed to update event time:", err);
      setEvents(originalEvents);
      alert("Could not save the new time. Please check the console for details.");
    }
  }, [events]);

  /* ===== Form handlers ===== */
  const handleNewEventChange = (e) => {
    const { name, value } = e.target;
    setNewEvent(prev => ({ ...prev, [name]: value }));
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title.trim() || !slotSelection) return;

    try {
      const chosenCategory = newEvent.category === "Custom" && newEvent.customCategory?.trim()
        ? newEvent.customCategory.trim()
        : newEvent.category;

      const payload = {
        title: newEvent.title.trim(),
        description: newEvent.description?.trim() || "",
        start: slotSelection.start,
        end: slotSelection.end,
        category: chosenCategory,
      };

      const res = await api.post("/events", payload);
      const created = { ...res.data, start: new Date(res.data.start), end: new Date(res.data.end) };
      setEvents(prev => [...prev, created]);

      setSlotSelection(null);
      setNewEvent({ title: "", description: "", category: "Work", customCategory: "" });
    } catch (err) {
      console.error("Failed to add event:", err);
      alert("Failed to add event. Check console for details.");
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    try {
      if (selectedEvent.googleEventId || selectedEvent.category === "Google") {
        alert("Cannot delete Google Calendar events from here.");
        return;
      }
      await api.delete(`/events/${selectedEvent._id}`);
      setEvents(prev => prev.filter(ev => ev._id !== selectedEvent._id));
      setSelectedEvent(null);
    } catch (err) {
      console.error("Failed to delete event:", err);
      alert("Failed to delete event.");
    }
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditEventData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    if (!editEventData || !editEventData.title.trim()) return;
    try {
      if (editEventData.googleEventId || editEventData.category === "Google") {
        alert("Cannot edit Google Calendar events here.");
        return;
      }

      const finalCategory = editEventData.category === "Custom" && editEventData.customCategory?.trim()
        ? editEventData.customCategory.trim()
        : editEventData.category;

      const payload = {
        title: editEventData.title.trim(),
        description: editEventData.description || '',
        start: editEventData.start,
        end: editEventData.end,
        category: finalCategory,
      };

      const res = await api.put(`/events/${editEventData._id}`, payload);
      const updatedEvent = { ...res.data, start: new Date(res.data.start), end: new Date(res.data.end) };
      setEvents(prev => prev.map(ev => ev._id === updatedEvent._id ? updatedEvent : ev));

      setSelectedEvent(null);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update event:", err);
      alert("Failed to update event.");
    }
  };

  const closeModal = () => {
    setSelectedEvent(null);
    setIsEditing(false);
  };

  /* ===== Event styling for react-big-calendar main views ===== */
  const eventPropGetter = (event) => {
    const bg = event.googleEventId ? CATEGORY_COLORS.Google : (CATEGORY_COLORS[event.category] || CATEGORY_COLORS.Custom);
    const textColor = event.googleEventId ? CATEGORY_TEXT.Google : CATEGORY_TEXT.default;

    const style = {
      backgroundColor: bg,
      color: textColor,
      borderRadius: "6px",
      border: "0",
      padding: "4px 6px",
      fontSize: "0.95rem",
      display: "block",
    };

    if (event.googleEventId || event.category === "Google") style.cursor = "not-allowed";

    return { style };
  };

  if (loading) return <Loader />;

  return (
    <div className="p-6 bg-light-gray-bg min-h-screen space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Smart Calendar</h1>
          <p className="text-gray-500">A modern view of your schedule.</p>
        </div>

        {!user?.isCalendarConnected && (
          <button
            onClick={handleConnectGoogle}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            Connect Google Calendar
          </button>
        )}
      </div>

      {/* Calendar card + calendar */}
      <Card>
        <div style={{ position: "relative" }}>
          <DragAndDropCalendar
            localizer={localizer}
            events={events}
            style={{ height: '70vh' }}
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
              agenda: {
                event: CustomAgendaEvent,
              },
            }}
          />
        </div>
      </Card>

      {/* Horizontal legend below calendar (clean strip) */}
      <div className="calendar-legend-horizontal" style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
        {Object.keys(CATEGORY_COLORS).map(cat => (
          <div key={cat} className="legend-item" style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            borderRadius: 999,
            background: "#fff",
            boxShadow: "0 6px 14px rgba(12,20,30,0.04)",
            margin: "4px"
          }}>
            <span style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              display: "inline-block",
              backgroundColor: CATEGORY_COLORS[cat]
            }} />
            <span style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>{cat}</span>
          </div>
        ))}
      </div>

      {/* ===== Selected Event Modal (view/edit) ===== */}
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
                  value={editEventData.description || ''}
                  onChange={handleEditFormChange}
                  className="mt-1 border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
                  rows="3"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600">Category</label>
                <select
                  name="category"
                  value={editEventData.category}
                  onChange={handleEditFormChange}
                  className="mt-1 border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
                  disabled={selectedEvent.googleEventId || selectedEvent.category === 'Google'}
                >
                  {CATEGORY_OPTIONS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>

                {editEventData.category === 'Custom' && (
                  <input
                    type="text"
                    name="customCategory"
                    placeholder="Enter custom category"
                    value={editEventData.customCategory || ''}
                    onChange={handleEditFormChange}
                    className="mt-2 border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
                    disabled={selectedEvent.googleEventId || selectedEvent.category === 'Google'}
                  />
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold"
                  onClick={() => { setIsEditing(false); }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-mint-green hover:bg-mint-green-600 text-white font-semibold"
                  disabled={selectedEvent.googleEventId || selectedEvent.category === 'Google'}
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">{selectedEvent.title}</h2>
              <p className="text-gray-600">{selectedEvent.description || 'No description provided.'}</p>
              <p className="text-sm text-gray-500"><strong>Starts:</strong> {format(selectedEvent.start, 'Pp')}</p>
              <p className="text-sm text-gray-500"><strong>Ends:</strong> {format(selectedEvent.end, 'Pp')}</p>
              <p className="text-sm text-gray-500"><strong>Category:</strong> {selectedEvent.category === 'Custom' ? (selectedEvent.customCategory || 'Custom') : selectedEvent.category}</p>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold"
                  onClick={() => setIsEditing(true)}
                  disabled={selectedEvent.googleEventId || selectedEvent.category === 'Google'}
                >
                  Edit
                </button>
                <button
                  className="px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white font-semibold"
                  onClick={handleDeleteEvent}
                  disabled={selectedEvent.googleEventId || selectedEvent.category === 'Google'}
                >
                  Delete
                </button>
              </div>
            </div>
          )
        )}
      </Modal>

      {/* ===== Add Event Modal (slotSelection) ===== */}
      <Modal isOpen={!!slotSelection} onClose={() => setSlotSelection(null)}>
        {slotSelection && (
          <form onSubmit={handleAddEvent} className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">Add New Event</h2>
            <p className="text-sm text-gray-500">For: {format(slotSelection.start, 'PPPP, p')}</p>

            <input
              type="text"
              name="title"
              placeholder="Event Title"
              className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
              value={newEvent.title}
              onChange={handleNewEventChange}
            />

            <input
              type="text"
              name="description"
              placeholder="Description"
              className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
              value={newEvent.description}
              onChange={handleNewEventChange}
            />

            <select
              name="category"
              value={newEvent.category}
              onChange={handleNewEventChange}
              className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
            >
              {CATEGORY_OPTIONS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>

            {newEvent.category === 'Custom' && (
              <input
                type="text"
                name="customCategory"
                placeholder="Enter custom category"
                value={newEvent.customCategory}
                onChange={handleNewEventChange}
                className="mt-2 border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
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
