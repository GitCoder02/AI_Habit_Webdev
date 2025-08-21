import { useState, useEffect, useCallback } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US'; // Import the locale directly

import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

import "react-big-calendar/lib/css/react-big-calendar.css";
import './Calendar.css'; 

import Card from "../components/Card";
import api from "../api";
import Loader from "../components/Loader";
import Modal from "../components/Modal";

const DragAndDropCalendar = withDragAndDrop(BigCalendar);

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // This line is the fix
});

const categoryColors = {
  Work: "pastel-blue",
  Learning: "pastel-purple",
  Fitness: "pastel-teal",
  Health: "pastel-pink",
  Mindfulness: "yellow-300",
  Other: "gray-300",
  Google: "energetic-orange",
};

const AgendaEvent = ({ event }) => {
  return (
    <div className="custom-agenda-event">
      <div className="event-time">
        {format(event.start, 'p')} - {format(event.end, 'p')}
      </div>
      <div className="event-title">{event.title}</div>
    </div>
  );
};

export default function CalendarPage({ userId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [slotSelection, setSlotSelection] = useState(null);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', category: 'Work' });
  const [googleConnected, setGoogleConnected] = useState(false);
  const categoryOptions = ["Work", "Learning", "Fitness", "Health", "Mindfulness", "Other"];

  // --- NEW: State for the edit modal ---
  const [isEditing, setIsEditing] = useState(false);
  const [editEventData, setEditEventData] = useState(null);


  useEffect(() => {
    // ... useEffect remains the same
    if (!userId) return;

    const fetchAllEvents = async () => {
      try {
        const localEventsRes = await api.get("/events");
        const localEvents = localEventsRes.data;

        const googleEventsRes = await api.get(`/google/events?userId=${userId}`);
        let googleEvents = [];
        if (googleEventsRes.data?.length > 0) {
          googleEvents = googleEventsRes.data.map(ev => ({
            _id: ev.id,
            title: ev.summary || "Untitled",
            description: ev.description || "",
            start: new Date(ev.start.dateTime || ev.start.date),
            end: new Date(ev.end.dateTime || ev.end.date),
            category: "Google",
            isDraggable: false, 
          }));
          setGoogleConnected(true);
        }
        
        const allEvents = [...localEvents, ...googleEvents].map(event => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
        }));

        setEvents(allEvents);
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllEvents();
  }, [userId]);

  // --- Handlers ---
  const handleNavigate = useCallback((newDate) => setDate(newDate), [setDate]);
  const handleViewChange = useCallback((newView) => setView(newView), [setView]);
  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent(event);
    setEditEventData({ ...event }); // Pre-fill edit form data
  }, []);
  const handleSelectSlot = useCallback((slotInfo) => setSlotSelection(slotInfo), []);

  const handleEventDrop = useCallback(async ({ event, start, end }) => {
    // ... handleEventDrop remains the same
    if (event.category === 'Google') return;

    const originalEvents = [...events];
    const updatedEvents = events.map(e => 
      e._id === event._id ? { ...e, start, end } : e
    );
    setEvents(updatedEvents);

    try {
      await api.put(`/events/${event._id}`, { start, end });
    } catch (err) {
      console.error("Failed to update event time:", err.response);
      setEvents(originalEvents); 
      alert("Could not save the new time. Please check the console for details.");
    }
  }, [events, setEvents]);

  const handleNewEventChange = (e) => {
    const { name, value } = e.target;
    setNewEvent(prev => ({ ...prev, [name]: value }));
  };

  const handleAddEvent = async (e) => {
    // ... handleAddEvent remains the same
    e.preventDefault();
    if (!newEvent.title.trim() || !slotSelection) return;
    try {
      const eventToCreate = {
        ...newEvent,
        start: slotSelection.start,
        end: slotSelection.end,
      };
      const res = await api.post("/events", eventToCreate);
      setEvents([...events, { ...res.data, start: new Date(res.data.start), end: new Date(res.data.end) }]);
      setSlotSelection(null);
      setNewEvent({ title: '', description: '', category: 'Work' });
    } catch (err) {
      console.error("Failed to add event:", err);
    }
  };
  
  const handleDeleteEvent = async () => {
    // ... handleDeleteEvent remains the same
    if (!selectedEvent) return;
    try {
      if (selectedEvent.category === 'Google') {
        alert("Cannot delete Google Calendar events from here.");
        return;
      }
      await api.delete(`/events/${selectedEvent._id}`);
      setEvents(events.filter(event => event._id !== selectedEvent._id));
      setSelectedEvent(null);
    } catch (err) {
      console.error("Failed to delete event:", err);
      alert("Failed to delete event.");
    }
  };

  // --- NEW: Handlers for the Edit Modal ---
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditEventData(prev => ({...prev, [name]: value}));
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    if (!editEventData || !editEventData.title.trim()) return;

    try {
      const res = await api.put(`/events/${editEventData._id}`, editEventData);
      setEvents(events.map(event => event._id === editEventData._id ? { ...res.data, start: new Date(res.data.start), end: new Date(res.data.end) } : event));
      
      // Close and reset modal
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

  const eventPropGetter = (event) => {
    // ... eventPropGetter remains the same
    const backgroundColor = categoryColors[event.category] || 'gray-300';
    const style = {
      backgroundColor: `var(--color-${backgroundColor})`,
      borderRadius: '5px',
      color: '#333',
      border: '0px',
      display: 'block',
      cursor: event.category === 'Google' ? 'not-allowed' : 'pointer',
    };
    return {
      style: style
    };
  };

  if (loading) return <Loader />;

  return (
    <div className="p-6 bg-light-gray-bg min-h-screen space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Smart Calendar</h1>
          <p className="text-gray-500">A modern view of your schedule.</p>
        </div>
      </div>

      <Card>
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
          components={{
            agenda: {
              event: AgendaEvent, // Use our custom component here
            },
          }}
        />
      </Card>

      {/* --- MODIFIED: Modal now handles both View and Edit states --- */}
      <Modal isOpen={!!selectedEvent} onClose={closeModal}>
        {selectedEvent && (
          isEditing ? (
            // EDIT VIEW
            <form onSubmit={handleUpdateEvent} className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">Edit Event</h2>
              <div>
                <label className="text-sm font-semibold text-gray-600">Title</label>
                <input
                  type="text" name="title"
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
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-mint-green hover:bg-mint-green-600 text-white font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            // DISPLAY VIEW
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">{selectedEvent.title}</h2>
              <p className="text-gray-600">{selectedEvent.description || 'No description provided.'}</p>
              <p className="text-sm text-gray-500">
                <strong>Starts:</strong> {format(selectedEvent.start, 'Pp')}
              </p>
              <p className="text-sm text-gray-500">
                <strong>Ends:</strong> {format(selectedEvent.end, 'Pp')}
              </p>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold"
                  onClick={() => setIsEditing(true)}
                  disabled={selectedEvent.category === 'Google'}
                >
                  Edit
                </button>
                <button
                  className="px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white font-semibold"
                  onClick={handleDeleteEvent}
                  disabled={selectedEvent.category === 'Google'}
                >
                  Delete
                </button>
              </div>
            </div>
          )
        )}
      </Modal>

      {/* ... (Create Event Modal remains the same) ... */}
      <Modal isOpen={!!slotSelection} onClose={() => setSlotSelection(null)}>
        {slotSelection && (
          <form onSubmit={handleAddEvent} className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">Add New Event</h2>
            <p className="text-sm text-gray-500">
              For: {format(slotSelection.start, 'PPPP, p')}
            </p>
            <input
              type="text" name="title" placeholder="Event Title"
              className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
              value={newEvent.title} onChange={handleNewEventChange} />
            <input
              type="text" name="description" placeholder="Description"
              className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
              value={newEvent.description} onChange={handleNewEventChange} />
            <select
              name="category" value={newEvent.category} onChange={handleNewEventChange}
              className="border border-subtle-gray p-2 w-full rounded focus:ring-2 focus:ring-mint-green outline-none"
            >
              {categoryOptions.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
            </select>
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