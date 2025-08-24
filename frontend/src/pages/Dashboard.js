// frontend/src/pages/Dashboard.js
import Card from "../components/Card";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { eventsApi, goalsApi, habitsApi, aiApi } from "../api";
import Loader from "../components/Loader";
import SuggestionCard from "../components/SuggestionCard";
import { format } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [goals, setGoals] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState([]);

  // AI states
  const [suggestions, setSuggestions] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Load core data (habits/goals/events) once on mount / when user changes
  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [hRes, gRes, eRes] = await Promise.all([
          habitsApi.list(),
          goalsApi.list(),
          eventsApi.list(),
        ]);
        const habitsData = hRes?.data || [];
        const goalsData = gRes?.data || [];
        const eventsData = eRes?.data || [];

        setHabits(habitsData);
        setGoals(goalsData);
        setEvents(eventsData);

        // build 7-day event trend (old -> recent)
        const now = new Date();
        const days = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date(now);
          d.setDate(now.getDate() - (6 - i));
          const label = d.toLocaleDateString(undefined, { weekday: "short" });
          const count = (eventsData || []).filter((ev) => {
            const evDate = new Date(ev.start);
            return evDate.toDateString() === d.toDateString();
          }).length;
          return { day: label, events: count };
        });
        setTrendData(days);
      } catch (err) {
        console.error("Dashboard load failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user]);

  // fetch AI suggestions & peak hours separately (so dashboard loads fast)
  useEffect(() => {
    if (!user) return;

    const fetchAi = async () => {
      setAiLoading(true);
      try {
        // Fetch suggestions first
        const sRes = await aiApi.suggestions();
        const suggs = sRes?.data?.suggestions || [];
        setSuggestions(suggs);

        // Try fetching peak hours endpoint; if it doesn't exist or fails, derive from suggestions
        try {
          const pRes = await aiApi.peakHours();
          // Expected shapes: { blocks: [...] } or { peakHours: [...] } or { data: { blocks: [...] } }
          const blocks = pRes?.data?.blocks || pRes?.data?.peakHours || pRes?.data || [];
          if (Array.isArray(blocks) && blocks.length > 0) {
            setPeakHours(blocks);
          } else {
            // fallback derive from suggestions
            const focus = suggs.filter((s) => s.type === "focus");
            const derived = focus.map((f) => {
              // try meta or action payload
              const meta = f.meta || (f.actions && f.actions[0] && f.actions[0].payload) || {};
              // unify to { date/day, startHour, endHour }
              return {
                date: meta.date || meta.day || meta.dayString || f.meta?.day,
                startHour: meta.startHour ?? meta.startHour ?? (meta.start && new Date(meta.start).getHours()),
                endHour: meta.endHour ?? meta.endHour ?? (meta.end && new Date(meta.end).getHours()),
              };
            });
            setPeakHours(derived);
          }
        } catch (err) {
          // Peak-hours endpoint missing or failing — derive from suggestions
          const focus = suggs.filter((s) => s.type === "focus");
          const derived = focus.map((f) => {
            const meta = f.meta || (f.actions && f.actions[0] && f.actions[0].payload) || {};
            return {
              date: meta.date || meta.day || f.meta?.day,
              startHour: meta.startHour ?? (meta.start && new Date(meta.start).getHours()),
              endHour: meta.endHour ?? (meta.end && new Date(meta.end).getHours()),
            };
          });
          setPeakHours(derived);
        }
      } catch (err) {
        console.error("Failed to fetch AI data:", err);
        // leave suggestions empty
      } finally {
        setAiLoading(false);
      }
    };

    fetchAi();
  }, [user]);

  if (loading) return <Loader />;

  // derived metrics
  const completedToday = habits.filter(
    (h) => h.lastCompleted && new Date(h.lastCompleted).toDateString() === new Date().toDateString()
  ).length;
  const totalHabits = habits.length;
  const completedGoals = goals.filter((g) => g.isCompleted).length;
  const totalGoals = goals.length;
  const weeklyStreak = Math.max(...(habits.map((h) => h.streak || 0) || [0]), 0);

  // suggestion handlers
  const onDismiss = (sugg) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== sugg.id));
    // optionally call backend to mark dismissed
    // aiApi.dismiss({ suggestionId: sugg.id }).catch(()=>{})
  };

  const onAccept = async (sugg) => {
    const action = (sugg.actions && sugg.actions[0]) || null;
    if (!action) {
      setSuggestions((prev) => prev.filter((s) => s.id !== sugg.id));
      return;
    }
    try {
      // Attempt to execute action via backend; aiApi.execute should be implemented on your side
      await aiApi.execute(action);
      // Remove suggestion locally
      setSuggestions((prev) => prev.filter((s) => s.id !== sugg.id));
      // Refresh core data to reflect changes
      const [hRes, gRes, eRes] = await Promise.all([
        habitsApi.list(),
        goalsApi.list(),
        eventsApi.list(),
      ]);
      setHabits(hRes?.data || []);
      setGoals(gRes?.data || []);
      setEvents(eRes?.data || []);
    } catch (err) {
      console.error("Failed to execute action:", err);
      alert("Could not execute suggestion right now. Try again.");
    }
  };

  return (
    <div className="bg-light-gray-bg min-h-screen p-6 space-y-6">
      <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Good morning, {user?.name || "User"}! 👋</h1>
      <p className="text-gray-500 mb-6">Ready to make today productive and meaningful?</p>

      <Card accent="border-l-4 border-mint-green">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-mint-green-200 rounded-full flex items-center justify-center text-mint-green-800 text-xl">🤖</div>
          <p className="text-gray-700 font-medium">
            Here's your quick snapshot for today — insights are pulled from your real data.
          </p>
        </div>
      </Card>

      <Card title="Progress Overview">
        <div className="flex justify-around items-center text-center space-x-4">
          <div className="flex flex-col items-center">
            <div className="text-mint-green mb-1 font-bold text-2xl">{completedToday}/{totalHabits}</div>
            <span className="text-sm text-gray-600">Today's Habits</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-energetic-orange mb-1 font-bold text-2xl">{completedGoals}/{totalGoals}</div>
            <span className="text-sm text-gray-600">Completed Goals</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-energetic-orange mb-1 font-bold text-2xl">{weeklyStreak} days</div>
            <span className="text-sm text-gray-600">Top Streak</span>
          </div>
        </div>
      </Card>

      <div className="mb-6">
        <Card title="Weekly Events Trend">
          <div style={{ width: "100%", height: 250 }}>
            <ResponsiveContainer>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="events" stroke="#FF9F1C" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3">
            <strong>Suggested focus windows (next 7 days):</strong>
            <div className="flex flex-wrap gap-2 mt-2">
              {(!peakHours || peakHours.length === 0) && <span className="text-sm text-gray-500">No suggestions available.</span>}
              {peakHours.map((p, idx) => {
                // p might be { date, startHour, endHour } or { day, startHour, endHour }
                const dateVal = p.date || p.day || p.isoDate || null;
                const start = p.startHour ?? p.start ?? null;
                const end = p.endHour ?? p.end ?? (start !== null ? start + 2 : null);
                let displayDate = "Unknown date";
                try {
                  displayDate = dateVal ? format(new Date(dateVal), "EEE, MMM d") : `Day ${idx+1}`;
                } catch {
                  displayDate = String(dateVal || `Day ${idx+1}`);
                }
                return (
                  <div key={`${dateVal}-${start}-${idx}`} className="px-3 py-1 rounded bg-gray-50 text-sm text-gray-700">
                    {displayDate}: {start}:00 - {end}:00
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* AI Suggestions full width */}
      <div>
        <Card title="AI Suggestions">
          {aiLoading && (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-2/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          )}
          {!aiLoading && suggestions.length === 0 && (
            <div className="text-sm text-gray-500">No suggestions right now — great!</div>
          )}
          {!aiLoading && suggestions.length > 0 && (
            <div className="space-y-6">
              {["habit", "goal", "focus"].map((group) => {
                const filtered = suggestions.filter((s) => s.type === group);
                if (filtered.length === 0) return null;
                return (
                  <div key={group}>
                    <h2 className="text-lg font-bold text-gray-700 mb-2 capitalize">{group} Suggestions</h2>
                    <div className="grid grid-cols-1 gap-3">
                      {filtered.map((s) => (
                        <SuggestionCard
                          key={s.id}
                          suggestion={s}
                          onAccept={onAccept}
                          onDismiss={onDismiss}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}